// The servers the capture tool starts, and the checks before it starts them. It starts the same stand-in servers the browser
// tests use (tests/e2e_server.py, tests/e2e_fresh_server.py, tests/fake_services.py), each in a process group of its own, and
// stops exactly the groups it started, also when a capture fails or the tool is interrupted.
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/** The ports start at this base, plus PW_PORT_OFFSET. web/playwright.config.ts uses 8760 to 8800 (plus the offset). */
export const PORT_BASE = 8840;

export const portOffset = (): number => Number(process.env.PW_PORT_OFFSET) || 0;

/** The newest modification time of any file under a folder (0 when there is none). */
export function newestIn(folder: string): number {
  let newest = 0;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else newest = Math.max(newest, statSync(path).mtimeMs);
    }
  };
  if (existsSync(folder)) walk(folder);
  return newest;
}

/** Throws unless the built app is newer than its source: the tool captures the built app, never the source. */
export function requireFreshBuild(web: string): void {
  const built = join(web, "dist", "index.html");
  if (!existsSync(built)) throw new Error("There is no built app (web/dist). Run `npm --prefix web run build` first.");
  const source = newestIn(join(web, "src"));
  if (statSync(built).mtimeMs < source) {
    throw new Error("The built app (web/dist) is older than web/src. Run `npm --prefix web run build` first; the tool captures the built app.");
  }
}

/** The Python the project runs with, from uv (or COCKPIT_PYTHON), so each server is one process and not a wrapper around one. */
export function pythonFor(root: string): string {
  if (process.env.COCKPIT_PYTHON) return process.env.COCKPIT_PYTHON;
  const out = execFileSync("uv", ["run", "python", "-c", "import sys;print(sys.executable)"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return out.trim().split("\n").pop()!.trim();
}

interface Started {
  name: string;
  child: ChildProcess;
  exited: boolean;
}

export class Servers {
  private started: Started[] = [];
  private logs: number[] = [];
  private handlers: Array<() => void> = [];

  private readonly root: string;
  private readonly python: string;
  private readonly logFolder: string;

  constructor(root: string, python: string, logFolder: string) {
    this.root = root;
    this.python = python;
    this.logFolder = logFolder;
    mkdirSync(logFolder, { recursive: true });
    // Stop what was started when the tool is interrupted or ends any way at all.
    const stop = () => this.stopNow();
    process.once("exit", stop);
    for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
      const handler = () => {
        this.stopNow();
        process.exit(130);
      };
      process.once(signal, handler);
      this.handlers.push(() => process.off(signal, handler));
    }
  }

  /** Starts `python -m <module> <args>` from the repository's root and returns once `ready` answers. */
  async start(name: string, module: string, args: string[], ready: string, timeoutMs = 120_000, extraEnv: Record<string, string> = {}): Promise<void> {
    const log = openSync(join(this.logFolder, `${name}.log`), "w");
    this.logs.push(log);
    const child = spawn(this.python, ["-m", module, ...args], { cwd: this.root, detached: true, stdio: ["ignore", log, log], env: { ...process.env, ...extraEnv } });
    const record: Started = { name, child, exited: false };
    child.once("exit", () => {
      record.exited = true;
    });
    this.started.push(record);
    const stopAt = Date.now() + timeoutMs;
    while (Date.now() < stopAt) {
      if (record.exited) throw new Error(`${name} stopped while starting; see ${join(this.logFolder, `${name}.log`)}`);
      try {
        const answer = await fetch(ready);
        if (answer.ok) return;
      } catch {
        // Not listening yet.
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`${name} did not answer at ${ready} in time; see ${join(this.logFolder, `${name}.log`)}`);
  }

  /** Whether a server has stopped on its own (a capture that finds one dead says so, and does not go on). */
  exited(name: string): boolean {
    return this.started.find((s) => s.name === name)?.exited ?? false;
  }

  private signalGroup(record: Started, signal: NodeJS.Signals): void {
    if (record.exited || record.child.pid === undefined) return;
    try {
      // The process group the child leads: only what the child started, never anything by pattern.
      process.kill(-record.child.pid, signal);
    } catch {
      // Already gone.
    }
  }

  /** Ends every server started, politely first and then for certain. Safe to call again. */
  async stop(): Promise<void> {
    for (const record of this.started) this.signalGroup(record, "SIGTERM");
    const until = Date.now() + 8000;
    while (Date.now() < until && this.started.some((s) => !s.exited)) await new Promise((r) => setTimeout(r, 100));
    for (const record of this.started) this.signalGroup(record, "SIGKILL");
    this.release();
  }

  /** The same without waiting, for the moment the tool itself is ending. */
  private stopNow(): void {
    for (const record of this.started) this.signalGroup(record, "SIGKILL");
    this.release();
  }

  private release(): void {
    for (const off of this.handlers.splice(0)) off();
    for (const log of this.logs.splice(0)) {
      try {
        closeSync(log);
      } catch {
        // Closed already.
      }
    }
    this.started = this.started.map((s) => ({ ...s, exited: true }));
  }
}

/** A folder for a fresh server's state, named by its port, emptied before and after. */
export function stateFolder(port: number): string {
  const folder = join(tmpdir(), `cockpit-visual-${port}`);
  rmSync(folder, { recursive: true, force: true });
  return resolve(folder);
}

export function removeStateFolder(folder: string): void {
  rmSync(folder, { recursive: true, force: true });
}

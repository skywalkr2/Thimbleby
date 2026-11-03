// Which web servers a browser-test run needs. A run that names projects (`--project`, or PW_PROJECTS as a comma list)
// starts only the servers those projects reach, with the ones their dependencies reach; a run that names none starts all.
export type Selectable = { name: string; dependencies?: string[]; use?: { baseURL?: string } };
export type Grouped<T> = { group: number; server: T };

// The projects named on the command line (`--project a`, `--project=a`, `-p a`, wildcards allowed) or in PW_PROJECTS.
export function namedProjects(argv: string[], env: Record<string, string | undefined> = {}): string[] {
  const names: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project" || a === "-p") {
      for (let j = i + 1; j < argv.length && !argv[j].startsWith("-"); j++) names.push(argv[j]);
    } else if (a.startsWith("--project=")) names.push(a.slice("--project=".length));
  }
  if (!names.length && env.PW_PROJECTS) names.push(...env.PW_PROJECTS.split(",").map((s) => s.trim()).filter(Boolean));
  return names;
}

const matches = (pattern: string, name: string) =>
  new RegExp(`^${pattern.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`, "i").test(name);

// The project names a run covers: those named, and (always) every project they depend on.
export function selectedProjects(projects: Selectable[], named: string[]): Selectable[] {
  const chosen = new Map<string, Selectable>();
  const add = (p: Selectable) => {
    if (chosen.has(p.name)) return;
    chosen.set(p.name, p);
    for (const d of p.dependencies ?? []) {
      const dep = projects.find((q) => q.name === d);
      if (dep) add(dep);
    }
  };
  projects.filter((p) => named.some((n) => matches(n, p.name))).forEach(add);
  return [...chosen.values()];
}

// The servers to start: all of them when no project is named, else those whose group is the port of a chosen project.
export function selectServers<T>(servers: Grouped<T>[], projects: Selectable[], named: string[]): T[] {
  if (!named.length) return servers.map((s) => s.server);
  const ports = new Set(
    selectedProjects(projects, named).map((p) => Number(new URL(p.use?.baseURL ?? "http://127.0.0.1:0/").port)),
  );
  return servers.filter((s) => ports.has(s.group)).map((s) => s.server);
}

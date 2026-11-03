// The status chip's one state (design 7.1, 7.12): the worst thing going on, so the header says one word, with a dot that is a
// warning or a danger. In order: offline, work waiting for the network, a restart to finish, a connection that can't be read
// or is trying again (read from the connections themselves, as the Connections screen and Today show them), a backup needed,
// the assistant stopped or held up (so there is never an "all good" beside a stopped assistant), spend near a limit, otherwise live.
import type { S } from "../lib/api";
import type { Coverage } from "../lib/coverage";
import type { LiveState } from "../lib/live";

export type StatusKind =
  | "connecting"
  | "offline"
  | "network"
  | "restart"
  | "restarting"
  | "restart_failed"
  | "assistant_stopped"
  | "assistant_held"
  | "connection_failed"
  | "connection_signed_out"
  | "connection_retrying"
  | "backup"
  | "spend"
  | "live";
export type StatusTone = "ok" | "warn" | "danger";

/** How the connections stand: one that failed to be read is failed; one that found no network, or was not read within the
 * configured hours, is retrying; read ones, and ones not tried yet, are fine. A source whose account the person signed out of
 * is signed out (a warning); one whose sign-in was refused or ran out is failed. Neither is ever fine. */
export function connectionState(found: Coverage | null): "ok" | "retrying" | "failed" | "signed_out" {
  if (!found) return "ok";
  if (found.unread.some((u) => u.kind === "failed")) return "failed";
  // An account the person signed out of is not a failure: it says so, as a warning, until they sign in again.
  if (found.unread.some((u) => u.kind === "signed_out")) return "signed_out";
  if (found.unread.length > 0 || found.stale.length > 0) return "retrying";
  return "ok";
}

export function worstState(input: {
  live: LiveState;
  status: S["Status"] | undefined;
  /** The restart notice's phase (lib/restart): asking, waiting, stuck, refused, done or idle. */
  restartPhase: string;
  /** How the connections stand (`connectionState`); unknown counts as fine. */
  connections?: "ok" | "retrying" | "failed" | "signed_out";
  /** A problem the assistant's own state names that no other state here already says (a failing account, a failed or stuck run, a paused account): "bad" when it can't do its work, "warn" when work is held. */
  assistant?: "warn" | "bad";
}): StatusKind {
  if (input.live === "offline") return "offline";
  if (input.status?.network_wait) return "network";
  if (input.restartPhase === "waiting") return "restarting";
  // A restart waiting for the person's go is a warning; one that failed is the only restart state that is a danger.
  if (["stuck", "refused"].includes(input.restartPhase)) return "restart_failed";
  if (input.restartPhase === "asking" || input.status?.restart_needed) return "restart";
  if (input.assistant === "bad") return "assistant_stopped";
  if (input.connections === "failed") return "connection_failed";
  if (input.connections === "signed_out") return "connection_signed_out";
  if (input.assistant === "warn") return "assistant_held";
  if (input.connections === "retrying") return "connection_retrying";
  if (input.status?.backup.needs_attention) return "backup";
  if (input.status?.spend.warn) return "spend";
  if (input.live === "connecting") return "connecting";
  return "live";
}

/** The assistant's states the chip says itself (network and restarts are the chip's own kinds already). */
export const ASSISTANT_OWN: AliveKind[] = ["failing", "run_failed", "stuck", "loop_restarted", "paused", "not_set_up"];

/** What the assistant's own line says, worst first: a failing account or run (bad), then the states the chip knows that
 * hold work up (warn), otherwise fine. */
export type AliveKind = "fine" | "failing" | "run_failed" | "network" | "restarting" | "restart" | "restart_failed" | "paused" | "not_set_up" | "stuck" | "loop_restarted";
export type AliveTone = "ok" | "warn" | "bad";

export function aliveState(input: { status: S["Status"]; restartPhase: string }): { kind: AliveKind; tone: AliveTone } {
  const { status } = input;
  if (status.ai.state === "failing") return { kind: "failing", tone: "bad" };
  if (status.assistant.last_run_failed) return { kind: "run_failed", tone: "bad" };
  if (status.assistant.loop_stuck_since) return { kind: "stuck", tone: "bad" };
  if (["stuck", "refused"].includes(input.restartPhase)) return { kind: "restart_failed", tone: "bad" };
  if (status.network_wait) return { kind: "network", tone: "warn" };
  if (input.restartPhase === "waiting") return { kind: "restarting", tone: "warn" };
  if (input.restartPhase === "asking" || status.restart_needed) return { kind: "restart", tone: "warn" };
  if (status.assistant.loop_restarted_at) return { kind: "loop_restarted", tone: "warn" };
  if (status.assistant.paused.length) return { kind: "paused", tone: "warn" };
  if (status.ai.state === "not_set_up") return { kind: "not_set_up", tone: "warn" };
  return { kind: "fine", tone: "ok" };
}

/** Everything but "live"and "connecting" is something the person may want to act on. */
export const isWarn = (kind: StatusKind): boolean => kind !== "live" && kind !== "connecting";

/** The dot's state: a danger when nothing is being read or done (offline, a connection that failed, a restart that failed, the assistant stopped), a warning for the rest. */
export function toneOf(kind: StatusKind): StatusTone {
  if (kind === "offline" || kind === "connection_failed" || kind === "restart_failed" || kind === "assistant_stopped") return "danger";
  return isWarn(kind) ? "warn" : "ok";
}

/** Up to two capital letters from a name, for a monogram or an avatar. */
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/[\s·,-]+/)
    .filter((w) => /\p{L}/u.test(w));
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters
    .map((w) => ([...w].find((c) => /\p{L}/u.test(c)) ?? "").toUpperCase())
    .join("")
    .slice(0, 2);
}

/** A mark for each name in a list, no two the same: the two initials, else the first two letters of the first word, else that
 * with a number after it. So five sides in a narrow menu are told apart by their marks, not only by a tooltip. */
export function distinctMarks(names: string[]): string[] {
  const taken = new Set<string>();
  return names.map((name) => {
    const first = [...name.trim().split(/[\s·,-]+/).find((w) => /\p{L}/u.test(w)) ?? ""].filter((c) => /\p{L}/u.test(c));
    const tries = [initials(name), first.slice(0, 2).join("").toUpperCase(), first.slice(0, 3).join("").toUpperCase()].filter(Boolean);
    let mark = tries.find((m) => !taken.has(m));
    for (let n = 2; !mark; n++) {
      const numbered = `${tries[0] ?? "?"}${n}`;
      if (!taken.has(numbered)) mark = numbered;
    }
    taken.add(mark);
    return mark;
  });
}

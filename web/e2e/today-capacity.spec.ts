// Today's capacity (C47, C56; the UI/UX re-review of B-7, R3): on a fresh demo, six lines fit at 1280x720 with their
// meta on one line. It has a server of its own, because the acceptance scenario leaves lines of its own on Today that
// would take the room this check measures.
import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, hash = "") {
  await page.goto("?token=e2e-token");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  if (hash) {
    await page.evaluate((h) => {
      window.location.hash = h;
    }, hash);
  }
}

test.describe("Today's capacity", () => {

  test("one decision is one line: no item is on two Today lines, read from the demo through the API", async ({ page }) => {
    await signIn(page);
    type Line = { key: string; kind: string; changeset: string | null; op: number | null; count: number; deciding?: string[]; outcome: Record<string, number> };
    type Change = { state: string; changeset: { id: string; reviewed: boolean; ops: Array<{ index: number; op: string; status: string }> } | null };
    const lines: Line[] = await (await page.request.get("api/today/queue")).json();
    const changes: Change[] = await (await page.request.get("api/changes")).json();
    const ops = new Map(changes.filter((c) => c.changeset).map((c) => [c.changeset!.id, c.changeset!.ops]));
    // Where each decision is asked: its own line, under Decide.
    const asked = new Map<string, string>();
    for (const l of lines.filter((x) => (x.kind === "held" || x.kind === "who_is") && x.changeset && x.op !== null)) {
      const key = `${l.changeset}:${l.op}`;
      expect(asked.has(key), `${l.key} and ${asked.get(key)} ask the same thing`).toBe(false);
      asked.set(key, l.key);
    }
    expect(asked.size, "the demo holds at least one decision for the person").toBeGreaterThan(0);
    // What needs a look: a to-do, a question or a draft the assistant made, and what is held. Facts, sources and notes are
    // filed quietly, so a change of only those has no line.
    const needsLook = (o: { op: string; status: string }) => o.status === "held" || (o.status === "applied" && ["action.add", "question.add", "text.draft", "report.draft", "text.propose"].includes(o.op));
    // A review line counts what needs a look and nothing that is asked elsewhere, and says where the rest waits.
    for (const l of lines.filter((x) => x.kind === "review" && x.changeset)) {
      const mine = ops.get(l.changeset!) ?? [];
      const elsewhere = mine.filter((o) => asked.has(`${l.changeset}:${o.index}`));
      const counted = mine.filter((o) => needsLook(o) && !elsewhere.includes(o));
      if (counted.length > 0) expect(l.count, l.key).toBe(counted.length);
      expect([...(l.deciding ?? [])].sort(), l.key).toEqual(elsewhere.map((o) => asked.get(`${l.changeset}:${o.index}`)!).sort());
    }
    // A change whose only ops are asked elsewhere, or are filed quietly, has no review line at all.
    for (const c of changes.filter((x) => x.changeset && x.state === "review" && !x.changeset.reviewed)) {
      const live = c.changeset!.ops.filter(needsLook);
      if (live.length === 0) {
        // What was refused still has its line, so the work never waits without one.
        if (!c.changeset!.ops.some((o) => o.status === "refused")) {
          expect(lines.some((l) => l.kind === "review" && l.changeset === c.changeset!.id), c.changeset!.id).toBe(false);
        }
        continue;
      }
      if (live.every((o) => asked.has(`${c.changeset!.id}:${o.index}`))) {
        expect(lines.some((l) => l.kind === "review" && l.changeset === c.changeset!.id), c.changeset!.id).toBe(false);
      }
    }
  });
});

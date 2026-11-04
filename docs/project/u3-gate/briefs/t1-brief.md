# Batch T1: Tests that earn their place: the quick-edits race, then prune the browser tests that only cost time

## 1. Goal and why
The owner's rule (CLAUDE.md, 'A test earns its place'): remove any test that only costs time and gives nothing when it fails. First, find out whether the quick-edits failure is a real race that loses edits (the P0 X01 area) and fix it if so. Then go through the browser tests that are failing, slow or timing-patched, and keep each only if its failure would mean something a person would feel; remove the rest or reduce them to the behaviour they protect. The result: a full browser run that is green for real reasons and faster.
**The bar:** every line you own ends as the definition of done says; the screens you touch score at least 4.0 with no point under 3.5 and brand at least 4.0 on the reviewer's rubric when they are scored cold after you.

## 2. Where and the starting state
- Create your worktree from `cp1` at acfe689 or later: `cd /home/user/ProjectManagementAgent/.claude/worktrees/cp1 && git worktree add ../t1 -b t1 cp1 && ln -s ../../cp1/web/node_modules ../t1/web/node_modules`. Work only there. Read its `CLAUDE.md` first ("Writing a brief" and "Tracking and the order of a batch" say how your work is judged).
- Merged already, so build on it, never redo it: G1 and G1c (shared rows without an empty lead, filter bars hidden under 12 items, tables that hide empty columns, warning toasts, the Not here page, one way back, one couldn't-load card with Try again, form skeletons, the status popover). Check `web/src/ui/Row.tsx`, `web/src/ui/RecordsTable.tsx`, `web/src/lib/filterbar.ts` and the `LoadFailed` card exist before relying on them.

## 3. The exact list you own
The lines of `docs/project/u3-gate/items.md` (in your worktree) at these line numbers: **every [T1] and [END] line: 841, 842, 843, 1107, 1108, 1211, 1222, 1228, 1229, 1230, 1234, 1244, 1245, 1254, 1260**. Each names its picture, what is wrong and often the fix. Duplicate lines (two scorers saw the same thing) are fixed once and each gets its ending.
Order: (1) quick-edits three Resets (line 1104): reproduce with the saves forced close together; if edits can be lost, fix the cause with a unit test; if not, say why it failed. (2) The stale specs (END lines) and the timing-patched ones (J7 and the waits raised to 20-60 s, line 1231): for each, keep, reduce or remove under the rule, and say which and why in the report. (3) Go through web/e2e/ for specs that only check exact wording or pixel layout already covered by a unit test or a guard; list each with its run time, and remove or reduce it. Keep: data and trust, sides, outward acts, a11y and no sideways scroll, the nested base path, deploy checks, journeys' core path (reduce their wording checks), and every guard in web/src that enforces a CLAUDE.md rule. (4) The midnight fault (lines 841-843): if the journeys stay, give them one fixed clock (time-machine and Playwright's page clock, never faketime); if you reduce them so they no longer depend on the time of day, that closes it too. (5) The Quality arrow is a guard: use the shared chevron in Quality.tsx.\n
**Not yours:** Screen design changes; G4d's files work.
## 4. Inputs
- The pictures: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-inventory/` (named in each line) and, newer, `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1-final/` and `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1c-capture/` for screens G1 touched. Start from the newest picture of a screen.
- The mockups beside the build, for pages that have one: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-mockups/side-by-side/`.
- The rubric: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-score/rubric.md` sections 2 and 4b. The audit with code locations: `docs/project/u3-gate/audit-open-rows.md`.
## 5. The owner's decisions that apply
The owner's test rule in CLAUDE.md ('A test earns its place'). Never remove or loosen an invariant's guard, a P0's regression test, or a trust, applier, Undo or spending test. Moving the date in tests uses time-machine or a passed-in time, never faketime.
## 6. How to work
- Check each line in the picture and the code before fixing; a capture fault is fixed in `web/visual/inventory.ts`, `stages.ts` or `drive.ts`, not in the screen.
- Measure the boxes before changing CSS. Use the shared components; a shared rule that is still wrong goes to G1b (say so), never a local override.
- Words go in the wording sheet; no internal terms on screen. One test per fix, at the cheapest level that proves it. A design statement changed goes in the design text, a decision entry at the top of `docs/decisions.md` and `docs/design/CHANGES.md` section 342.
- Tick in your worktree's `items.md` as you go: `- [x]` plus `→ fixed: <test>`, or the other endings below. Update `docs/project/sweep-8ebf3cf-tracking.md` rows you finish.
## 7. Definition of done; nothing else ends the work
Every line you own ends as exactly one of `→ fixed: <test>`, `→ judged wrong: <evidence>`, `→ needs the owner: <choices>`, `→ belongs to <batch>: <why>`. "Left", "not done", "not checked" are not endings. Every check and capture below runs on the final code after your last change. If your context runs short, write `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/t1-handoff.md` (open lines, files changed, checks still due) and report "handing off". There is no time-box.
## 8. Checks, on the final code (`PW_PORT_OFFSET=2700`; each long command once, in the background, waited for)
- `npm --prefix web run build` (exit 0); Vitest for the files you touched; `uv run pytest -q -n0 <files>` for Python you touched; `uv run python -m engine.selfcheck`; `uv run ruff check .`; `uv run ruff format --check .`.
- The browser projects for your screens (run each touched spec's project while you work; at the end, one full browser run (npm --prefix web run e2e, in the background with a 2-hour timeout) and report its time before and after), after the build exits 0.
- Capture: `npm --prefix web run visual:capture -- --inventory --pages today --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/t1-capture`. Open every picture and say what each shows.
## 9. Who else is working, and where
G4d's work (a file records the person it came from) merges after you start; don't touch engine files for files or PersonFiles. Nothing else is running.
## 10. The report
"Items closed": every owned line copied exactly from `items.md` with its ending; each command's exit code; what each captured picture shows; claims judged wrong.
## 11. Never
Commit, push or message anyone; stop processes by pattern (`pkill -f`), even your own; delete any file or folder you didn't create (another helper's server folder under /tmp included); use any `PW_PORT_OFFSET` but your own (if your servers collide with another helper's, report it and wait); bare `git stash`; `timeout` around Playwright; faketime; weaken an assertion; add an allowlist entry; sleep loops.

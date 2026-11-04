# Batch G2a: Today, its review, Since yesterday, What changed, Handled for you, Stages, Search, Rules review

## 1. Goal and why
Two cold scorers and an audit found these screens below 4.0. This batch fixes every finding on them, so they reach 4.0 with no point under 3.5. Today is the home screen; it carries the most weight with the reviewer.
**The bar:** every line you own ends as the definition of done says; the screens you touch score at least 4.0 with no point under 3.5 and brand at least 4.0 on the reviewer's rubric when they are scored cold after you.

## 2. Where and the starting state
- Create your worktree from `cp1` at 7153ef0 or later: `cd /home/user/ProjectManagementAgent/.claude/worktrees/cp1 && git worktree add ../g2a -b g2a cp1 && ln -s ../../cp1/web/node_modules ../g2a/web/node_modules`. Work only there. Read its `CLAUDE.md` first ("Writing a brief" and "Tracking and the order of a batch" say how your work is judged).
- Merged already, so build on it, never redo it: G1 and G1c (shared rows without an empty lead, filter bars hidden under 12 items, tables that hide empty columns, warning toasts, the Not here page, one way back, one couldn't-load card with Try again, form skeletons, the status popover). Check `web/src/ui/Row.tsx`, `web/src/ui/RecordsTable.tsx`, `web/src/lib/filterbar.ts` and the `LoadFailed` card exist before relying on them.

## 3. The exact list you own
The lines of `docs/project/u3-gate/items.md` (in your worktree) at these line numbers: **23-28, 137-146, 157-161, 164-172, 175-182, 185-200, 203-211, 254-266, 849-856, 858-859, 861-873, 941-944 (only the lines tagged [G2] in those ranges)** and the audit lines X60 (line 749), X65 (752), X87 (787), VS07 (767), Y08-2 (795), X44 (746). Each names its picture, what is wrong and often the fix. Duplicate lines (two scorers saw the same thing) are fixed once and each gets its ending.
Known: Today at 390 splits the clash text into "an" / "d" with a stray "·"; one primary per viewport on Today; Today's review puts the details in one column with one action; What changed shows "Settings or code changed since the cockpit started; restart it to use them." as an item's body (find where that text becomes an item: a restart is a Today line in plain words, never an item with an internal term); What changed: Needs you first, one status pattern, no "With Reginald" chip on routine rows, time groups and "×N" for identical runs (VS07); Handled for you: its two help paragraphs go (tooltips or one line); Today's loading skeleton matches its real layout (Decide heading, Schedule row), no shift.

**Not yours:** Follow-ups, To-dos, Questions and the drawers (G2b); the Schedule (G3b); shared components in web/src/ui/ that still look wrong (G1b: write the line as "belongs to G1b" with what is wrong).
## 4. Inputs
- The pictures: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-inventory/` (named in each line) and, newer, `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1-final/` and `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1c-capture/` for screens G1 touched. Start from the newest picture of a screen.
- The mockups beside the build, for pages that have one: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-mockups/side-by-side/`.
- The rubric: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-score/rubric.md` sections 2 and 4b. The audit with code locations: `docs/project/u3-gate/audit-open-rows.md`.
## 5. The owner's decisions that apply
D9: search stays on the person's own records; an empty result says that mail and notes are not searched. D7: no new motion beyond short state transitions. The rest of D1-D10 (docs/decisions.md, section 326) don't touch these screens.
## 6. How to work
- Check each line in the picture and the code before fixing; a capture fault is fixed in `web/visual/inventory.ts`, `stages.ts` or `drive.ts`, not in the screen.
- Measure the boxes before changing CSS. Use the shared components; a shared rule that is still wrong goes to G1b (say so), never a local override.
- Words go in the wording sheet; no internal terms on screen. One test per fix, at the cheapest level that proves it. A design statement changed goes in the design text, a decision entry at the top of `docs/decisions.md` and `docs/design/CHANGES.md` section 329.
- Tick in your worktree's `items.md` as you go: `- [x]` plus `→ fixed: <test>`, or the other endings below. Update `docs/project/sweep-8ebf3cf-tracking.md` rows you finish.
## 7. Definition of done; nothing else ends the work
Every line you own ends as exactly one of `→ fixed: <test>`, `→ judged wrong: <evidence>`, `→ needs the owner: <choices>`, `→ belongs to <batch>: <why>`. "Left", "not done", "not checked" are not endings. Every check and capture below runs on the final code after your last change. If your context runs short, write `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g2a-handoff.md` (open lines, files changed, checks still due) and report "handing off". There is no time-box.
## 8. Checks, on the final code (`PW_PORT_OFFSET=500`; each long command once, in the background, waited for)
- `npm --prefix web run build` (exit 0); Vitest for the files you touched; `uv run pytest -q -n0 <files>` for Python you touched; `uv run python -m engine.selfcheck`; `uv run ruff check .`; `uv run ruff format --check .`.
- The browser projects for your screens (root, root-today, today-work, journeys (the ones whose specs cover these screens; check web/playwright.config.ts)), after the build exits 0.
- Capture: `npm --prefix web run visual:capture -- --inventory --pages today,today-review,since-yesterday,what-changed,handled-for-you,stages,search-results,rules-review --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g2a-capture`; also `npm --prefix web run visual:capture -- --pages today,today-states --with-states --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g2a-mockup` (no --inventory) for the side-by-sides. Open every picture and say what each shows.
## 9. Who else is working, and where
G3b in the g3 worktree (Schedule: don't touch web/src/components/Schedule* or the schedule entries of inventory.ts). G2b may start in its own worktree on Follow-ups, To-dos, Questions and the drawers: don't touch FollowUps*, OpenItems*, InlineAddTodo*, HandIn*, Ask*, Feedback*.
## 10. The report
"Items closed": every owned line copied exactly from `items.md` with its ending; each command's exit code; what each captured picture shows; claims judged wrong.
## 11. Never
Commit, push or message anyone; stop processes by pattern; bare `git stash`; `timeout` around Playwright; faketime; weaken an assertion; add an allowlist entry; sleep loops.

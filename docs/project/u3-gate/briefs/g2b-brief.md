# Batch G2b: Follow-ups and its tabs, To-dos, Questions, and the drawers (hand in, add a to-do, ask, feedback, edit details, a to-do's page)

## 1. Goal and why
Two cold scorers and an audit found these screens below 4.0. This batch fixes every finding on them so they reach 4.0 with no point under 3.5.
**The bar:** every line you own ends as the definition of done says; the screens you touch score at least 4.0 with no point under 3.5 and brand at least 4.0 on the reviewer's rubric when they are scored cold after you.

## 2. Where and the starting state
- Create your worktree from `cp1` at 7153ef0 or later: `cd /home/user/ProjectManagementAgent/.claude/worktrees/cp1 && git worktree add ../g2b -b g2b cp1 && ln -s ../../cp1/web/node_modules ../g2b/web/node_modules`. Work only there. Read its `CLAUDE.md` first ("Writing a brief" and "Tracking and the order of a batch" say how your work is judged).
- Merged already, so build on it, never redo it: G1 and G1c (shared rows without an empty lead, filter bars hidden under 12 items, tables that hide empty columns, warning toasts, the Not here page, one way back, one couldn't-load card with Try again, form skeletons, the status popover). Check `web/src/ui/Row.tsx`, `web/src/ui/RecordsTable.tsx`, `web/src/lib/filterbar.ts` and the `LoadFailed` card exist before relying on them.

## 3. The exact list you own
The lines of `docs/project/u3-gate/items.md` (in your worktree) at these line numbers: **60-65, 68-72, 75-79, 82-94, 97-104, 107-111, 114-119, 122-125, 128-134, 149-154, 214-219, 222-227, 230-243, 246-251, 874-878, 880-887 (only the lines tagged [G2] in those ranges)** and the audit lines VS09 (line 769), VS10 (770), VS05 (766), Y08-4 (797), Y08-6 (799), Y08-7 (800), Y08-9 (801), Y09-1 (802), Y09-5 to Y09-8 (804-807), Y09-10 (808), Y09-11 (809), Y09-13 (810). Each names its picture, what is wrong and often the fix. Duplicate lines (two scorers saw the same thing) are fixed once and each gets its ending.
Known: To-dos with many items are grouped with "Show N more" (no Done tab, D6); Follow-ups' filters and the message-style drawer (VS09); the clash's system line icon (VS05).

**Not yours:** Today, What changed, Since yesterday, Handled, Stages, Search and Rules review (G2a); the Schedule (G3b); shared components in web/src/ui/ that still look wrong (G1b).
## 4. Inputs
- The pictures: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-inventory/` (named in each line) and, newer, `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1-final/` and `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1c-capture/` for screens G1 touched. Start from the newest picture of a screen.
- The mockups beside the build, for pages that have one: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-mockups/side-by-side/`.
- The rubric: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-score/rubric.md` sections 2 and 4b. The audit with code locations: `docs/project/u3-gate/audit-open-rows.md`.
## 5. The owner's decisions that apply
D5: Follow-ups' Group by is three labelled buttons, not a dropdown. D6: no Done tab on To-dos; finished work is in What changed. D3: on a clash the first meeting is the row's button and the second is in its menu. D7: no new motion beyond short state transitions.
## 6. How to work
- Check each line in the picture and the code before fixing; a capture fault is fixed in `web/visual/inventory.ts`, `stages.ts` or `drive.ts`, not in the screen.
- Measure the boxes before changing CSS. Use the shared components; a shared rule that is still wrong goes to G1b (say so), never a local override.
- Words go in the wording sheet; no internal terms on screen. One test per fix, at the cheapest level that proves it. A design statement changed goes in the design text, a decision entry at the top of `docs/decisions.md` and `docs/design/CHANGES.md` section 333.
- Tick in your worktree's `items.md` as you go: `- [x]` plus `→ fixed: <test>`, or the other endings below. Update `docs/project/sweep-8ebf3cf-tracking.md` rows you finish.
## 7. Definition of done; nothing else ends the work
Every line you own ends as exactly one of `→ fixed: <test>`, `→ judged wrong: <evidence>`, `→ needs the owner: <choices>`, `→ belongs to <batch>: <why>`. "Left", "not done", "not checked" are not endings. Every check and capture below runs on the final code after your last change. If your context runs short, write `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g2b-handoff.md` (open lines, files changed, checks still due) and report "handing off". There is no time-box.
## 8. Checks, on the final code (`PW_PORT_OFFSET=700`; each long command once, in the background, waited for)
- `npm --prefix web run build` (exit 0); Vitest for the files you touched; `uv run pytest -q -n0 <files>` for Python you touched; `uv run python -m engine.selfcheck`; `uv run ruff check .`; `uv run ruff format --check .`.
- The browser projects for your screens (root, followups, open-items, todos (the ones whose specs cover these screens; check web/playwright.config.ts)), after the build exits 0.
- Capture: `npm --prefix web run visual:capture -- --inventory --pages followups,followups-later,followups-waiting,followups-by-project,followups-empty,todos,todos-many,questions,add-todo,hand-in,ask,feedback,todo-edit-details,todo-page --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g2b-capture`; also `npm --prefix web run visual:capture -- --pages todos,todos-states --with-states --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g2b-mockup` (no --inventory) for the side-by-sides. Open every picture and say what each shows.
## 9. Who else is working, and where
G2a in the g2a worktree (Today, What changed, Since yesterday, Handled, Stages, Search, Rules review: don't touch Today*, WhatChanged*, SinceYesterday*, Handled*, Stages*, SearchBox*, RuleReview*). G3b in the g3 worktree (Schedule).
## 10. The report
"Items closed": every owned line copied exactly from `items.md` with its ending; each command's exit code; what each captured picture shows; claims judged wrong.
## 11. Never
Commit, push or message anyone; stop processes by pattern; bare `git stash`; `timeout` around Playwright; faketime; weaken an assertion; add an allowlist entry; sleep loops.

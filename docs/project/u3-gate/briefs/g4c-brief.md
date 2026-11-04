# Batch G4c: The owner's three choices (D11 to D13) and the person page's last line

## 1. Goal and why
Build what the owner decided on 2026-11-04: compact Theme and Spacing controls in the person's menu, the Read by line always shown on a project's page, and the person mockup page's three missing parts. The person and person-states pages must then match their mockups at the 4.6 bar.
**The bar:** every line you own ends as the definition of done says; the screens you touch score at least 4.0 with no point under 3.5 and brand at least 4.0 on the reviewer's rubric when they are scored cold after you.

## 2. Where and the starting state
- Create your worktree from `cp1` at b665240 or later: `cd /home/user/ProjectManagementAgent/.claude/worktrees/cp1 && git worktree add ../g4c -b g4c cp1 && ln -s ../../cp1/web/node_modules ../g4c/web/node_modules`. Work only there. Read its `CLAUDE.md` first ("Writing a brief" and "Tracking and the order of a batch" say how your work is judged).
- Merged already, so build on it, never redo it: G1 and G1c (shared rows without an empty lead, filter bars hidden under 12 items, tables that hide empty columns, warning toasts, the Not here page, one way back, one couldn't-load card with Try again, form skeletons, the status popover). Check `web/src/ui/Row.tsx`, `web/src/ui/RecordsTable.tsx`, `web/src/lib/filterbar.ts` and the `LoadFailed` card exist before relying on them.

## 3. The exact list you own
The lines of `docs/project/u3-gate/items.md` (in your worktree) at these line numbers: **1213, 1215, 1220, 1221**. Each names its picture, what is wrong and often the fix. Duplicate lines (two scorers saw the same thing) are fixed once and each gets its ending.
D13's three parts: 'Draft a message' on a person's page opens the existing follow-up drafting for that person (find how Follow-ups drafts a message; no new AI task kind, no send: the person approves the exact content, as everywhere); a 'Files from <person>' card listing files whose source or record links that person (read what the files API already gives; if nothing links a file to a person, show the card only when there is one and say so in the report); the 'Everything with' and 'Files' tabs on the person page, next to the existing tabs. Line 1221 asks whether Add email and Add phone become one 'Add contact details': decide by the mockup (person.html on the reviewer's branch, captured in gate-mockups/side-by-side/person-*), and follow it.

**Not yours:** Everything else on the person page that G4a already fixed (don't rework it); shared parts in web/src/ui/ and the shell (G1d), except adding the segmented control's use in the menu.
## 4. Inputs
- The pictures: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-inventory/` (named in each line) and, newer, `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1-final/` and `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1c-capture/` for screens G1 touched. Start from the newest picture of a screen.
- The mockups beside the build, for pages that have one: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-mockups/side-by-side/`.
- The rubric: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-score/rubric.md` sections 2 and 4b. The audit with code locations: `docs/project/u3-gate/audit-open-rows.md`.
## 5. The owner's decisions that apply
D11: Theme (Day, Night, Auto) and Spacing (Comfortable, Compact) as two compact segmented controls in the person's menu, using the shared segmented control. D12: a project's page always shows which AI account reads it, as one quiet muted line. D13: build the three parts. D7: no new motion.
## 6. How to work
- Check each line in the picture and the code before fixing; a capture fault is fixed in `web/visual/inventory.ts`, `stages.ts` or `drive.ts`, not in the screen.
- Measure the boxes before changing CSS. Use the shared components; a shared rule that is still wrong goes to G1b (say so), never a local override.
- Words go in the wording sheet; no internal terms on screen. One test per fix, at the cheapest level that proves it. A design statement changed goes in the design text, a decision entry at the top of `docs/decisions.md` and `docs/design/CHANGES.md` section 337.
- Tick in your worktree's `items.md` as you go: `- [x]` plus `→ fixed: <test>`, or the other endings below. Update `docs/project/sweep-8ebf3cf-tracking.md` rows you finish.
## 7. Definition of done; nothing else ends the work
Every line you own ends as exactly one of `→ fixed: <test>`, `→ judged wrong: <evidence>`, `→ needs the owner: <choices>`, `→ belongs to <batch>: <why>`. "Left", "not done", "not checked" are not endings. Every check and capture below runs on the final code after your last change. If your context runs short, write `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g4c-handoff.md` (open lines, files changed, checks still due) and report "handing off". There is no time-box.
## 8. Checks, on the final code (`PW_PORT_OFFSET=1900`; each long command once, in the background, waited for)
- `npm --prefix web run build` (exit 0); Vitest for the files you touched; `uv run pytest -q -n0 <files>` for Python you touched; `uv run python -m engine.selfcheck`; `uv run ruff check .`; `uv run ruff format --check .`.
- The browser projects for your screens (people-records, layout, root-shell (check web/playwright.config.ts)), after the build exits 0.
- Capture: `npm --prefix web run visual:capture -- --inventory --pages person-page,person-new,person-long-name,user-menu,project-page --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g4c-capture`; also `npm --prefix web run visual:capture -- --pages person,person-states --with-states --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g4c-mockup` (no --inventory). Open every picture and say what each shows.
## 9. Who else is working, and where
G5a, G5b or G5c may be running in their own worktrees on Settings and Setup: don't touch Settings or setup components.
## 10. The report
"Items closed": every owned line copied exactly from `items.md` with its ending; each command's exit code; what each captured picture shows; claims judged wrong.
## 11. Never
Commit, push or message anyone; stop processes by pattern (`pkill -f`), even your own; delete any file or folder you didn't create (another helper's server folder under /tmp included); use any `PW_PORT_OFFSET` but your own (if your servers collide with another helper's, report it and wait); bare `git stash`; `timeout` around Playwright; faketime; weaken an assertion; add an allowlist entry; sleep loops.

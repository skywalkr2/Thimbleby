# Batch G5c: Setup: every step of the guide (welcome, you, work, AI, other AI, mail, promises, backup, people, done)

## 1. Goal and why
Setup is the first thing a person sees. Cold scorers found every step below 4.0. This batch fixes every finding on the setup steps so each reaches 4.0 with no point under 3.5, and the setup mockup pages (setup-ai, setup-mail, setup-states) match their mockups at the 4.6 bar.
**The bar:** every line you own ends as the definition of done says; the screens you touch score at least 4.0 with no point under 3.5 and brand at least 4.0 on the reviewer's rubric when they are scored cold after you.

## 2. Where and the starting state
- Create your worktree from `cp1` at 48b6164 or later: `cd /home/user/ProjectManagementAgent/.claude/worktrees/cp1 && git worktree add ../g5c -b g5c cp1 && ln -s ../../cp1/web/node_modules ../g5c/web/node_modules`. Work only there. Read its `CLAUDE.md` first ("Writing a brief" and "Tracking and the order of a batch" say how your work is judged).
- Merged already, so build on it, never redo it: G1 and G1c (shared rows without an empty lead, filter bars hidden under 12 items, tables that hide empty columns, warning toasts, the Not here page, one way back, one couldn't-load card with Try again, form skeletons, the status popover). Check `web/src/ui/Row.tsx`, `web/src/ui/RecordsTable.tsx`, `web/src/lib/filterbar.ts` and the `LoadFailed` card exist before relying on them.

## 3. The exact list you own
The lines of `docs/project/u3-gate/items.md` (in your worktree) at these line numbers: **654-659, 662-667, 670-676, 679-686, 689-695, 698-703, 706-711, 714-720, 723-728, 731-738, 945-967 (only lines tagged [G5])** and the audit lines X05 (line 742), X09 (743), X11 (744), X69 (753), X101 (754), Y01 (755), VC11 (761), VS01 (762), VS02 (763), VS03 (764), Y07-1 (788), Y07-2 (789), Y07-5 (790), Y07-8 (791), Y07-9 (792), Y07-10 (793), Y07-12 (794). Each names its picture, what is wrong and often the fix. Duplicate lines (two scorers saw the same thing) are fixed once and each gets its ending.
Known: brand moments on Welcome and Done (the mark, the display face for the headline, the promises' numerals, a finished state; brass never text); the setup-promises 'promises found' state needs readable mail in its capture workspace (add it to the capture stage); a known set of values is a list, never a text box (the folders while adding a connection, X101).

**Not yours:** Every settings-* screen (G5a and G5b); shared parts in web/src/ui/ and the shell (G1d: write the line as belongs to G1d with what is wrong).
## 4. Inputs
- The pictures: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-inventory/` (named in each line) and, newer, `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1-final/` and `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1c-capture/` for screens G1 touched. Start from the newest picture of a screen.
- The mockups beside the build, for pages that have one: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-mockups/side-by-side/`.
- The rubric: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-score/rubric.md` sections 2 and 4b. The audit with code locations: `docs/project/u3-gate/audit-open-rows.md`.
## 5. The owner's decisions that apply
D1: privacy is one scale everywhere (Open, Confidential, Private); Hand-in's Normal becomes Open; setup's mail questions become a plain yes or no that sets the level. Change the wording sheet, the screens and the design text (6.18, 7.13) together; rename no stored values (map words to values only). D2: the chosen AI card keeps the ring and tint with no check disc; record it as a difference (VC11, VS01). D7: the mark's own motion is G6's; add none here.
## 6. How to work
- Check each line in the picture and the code before fixing; a capture fault is fixed in `web/visual/inventory.ts`, `stages.ts` or `drive.ts`, not in the screen.
- Measure the boxes before changing CSS. Use the shared components; a shared rule that is still wrong goes to G1b (say so), never a local override.
- Words go in the wording sheet; no internal terms on screen. One test per fix, at the cheapest level that proves it. A design statement changed goes in the design text, a decision entry at the top of `docs/decisions.md` and `docs/design/CHANGES.md` section 335.
- Tick in your worktree's `items.md` as you go: `- [x]` plus `→ fixed: <test>`, or the other endings below. Update `docs/project/sweep-8ebf3cf-tracking.md` rows you finish.
## 7. Definition of done; nothing else ends the work
Every line you own ends as exactly one of `→ fixed: <test>`, `→ judged wrong: <evidence>`, `→ needs the owner: <choices>`, `→ belongs to <batch>: <why>`. "Left", "not done", "not checked" are not endings. Every check and capture below runs on the final code after your last change. If your context runs short, write `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g5c-handoff.md` (open lines, files changed, checks still due) and report "handing off". There is no time-box.
## 8. Checks, on the final code (`PW_PORT_OFFSET=1300`; each long command once, in the background, waited for)
- `npm --prefix web run build` (exit 0); Vitest for the files you touched; `uv run pytest -q -n0 <files>` for Python you touched; `uv run python -m engine.selfcheck`; `uv run ruff check .`; `uv run ruff format --check .`.
- The browser projects for your screens (setup, journeys-new-start, journeys, settings-setup-fixes, person-quality-setup-46 (check web/playwright.config.ts for the setup specs)), after the build exits 0.
- Capture: `npm --prefix web run visual:capture -- --inventory --pages setup-welcome,setup-you,setup-work,setup-ai,setup-ai-other,setup-mail,setup-promises,setup-backup,setup-people,setup-done --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g5c-capture`; also `npm --prefix web run visual:capture -- --pages setup-ai,setup-mail,setup-states --with-states --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g5c-mockup` (no --inventory). Open every picture and say what each shows.
## 9. Who else is working, and where
G4b in the g4b worktree with PW_PORT_OFFSET=500 (Projects, Files, Knowledge, Notes, Handover, Quality, the menus). Don't touch those screens or web/src/ui/.
## 10. The report
"Items closed": every owned line copied exactly from `items.md` with its ending; each command's exit code; what each captured picture shows; claims judged wrong.
## 11. Never
Commit, push or message anyone; stop processes by pattern (`pkill -f`), even your own; delete any file or folder you didn't create (another helper's server folder under /tmp included); use any `PW_PORT_OFFSET` but your own (if your servers collide with another helper's, report it and wait); bare `git stash`; `timeout` around Playwright; faketime; weaken an assertion; add an allowlist entry; sleep loops.

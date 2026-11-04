# Batch G4b: Projects and a project's page, Files, Knowledge, Notes, Handover, Quality, and the help, user and More menus

## 1. Goal and why
Cold scorers found these screens below 4.0. This batch fixes every finding on them so each reaches 4.0 with no point under 3.5, and the Quality mockup pages (quality, quality-states) match their mockups at the 4.6 bar.
**The bar:** every line you own ends as the definition of done says; the screens you touch score at least 4.0 with no point under 3.5 and brand at least 4.0 on the reviewer's rubric when they are scored cold after you.

## 2. Where and the starting state
- Create your worktree from `cp1` at 832b024 or later: `cd /home/user/ProjectManagementAgent/.claude/worktrees/cp1 && git worktree add ../g4b -b g4b cp1 && ln -s ../../cp1/web/node_modules ../g4b/web/node_modules`. Work only there. Read its `CLAUDE.md` first ("Writing a brief" and "Tracking and the order of a batch" say how your work is judged).
- Merged already, so build on it, never redo it: G1 and G1c (shared rows without an empty lead, filter bars hidden under 12 items, tables that hide empty columns, warning toasts, the Not here page, one way back, one couldn't-load card with Try again, form skeletons, the status popover). Check `web/src/ui/Row.tsx`, `web/src/ui/RecordsTable.tsx`, `web/src/lib/filterbar.ts` and the `LoadFailed` card exist before relying on them.

## 3. The exact list you own
The lines of `docs/project/u3-gate/items.md` (in your worktree) at these line numbers: **10-13, 16-20, 31-35, 38-41, 53-57, 356-360, 363-366, 369-373, 376-381, 384-388, 466-469, 472-478, 481-490, 493-497, 888, 890-902 (only lines tagged [G4] in those ranges), plus every other line tagged [G4] that is not in G4a's list (G4a owns 391-463, 903-906, 1159-1162: people, person, organizations)** and the audit lines X59 (line 748), VS14 (772), VS16 (773), Y11-20 (828). Each names its picture, what is wrong and often the fix. Duplicate lines (two scorers saw the same thing) are fixed once and each gets its ending.
Known: the Files drop zone and Knowledge's inline add rows (VS14); Handover's In sync pill, last sync time and Check now (VS16); Quality's next step for each figure and the clipped week (X59; the period stays a setting, D4); Handled by account (Y11-20); the More sheet's groups and its cut-off Help group. Compare quality and quality-states with their side-by-sides and close every difference.

**Not yours:** People, a person's page and Organizations (G4a); shared parts in web/src/ui/ and the shell (G1d: write the line as belongs to G1d with what is wrong).
## 4. Inputs
- The pictures: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-inventory/` (named in each line) and, newer, `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1-final/` and `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1c-capture/` for screens G1 touched. Start from the newest picture of a screen.
- The mockups beside the build, for pages that have one: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-mockups/side-by-side/`.
- The rubric: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-score/rubric.md` sections 2 and 4b. The audit with code locations: `docs/project/u3-gate/audit-open-rows.md`.
## 5. The owner's decisions that apply
D4: Quality's period stays a setting, no chooser on the page. D1: privacy words are one scale (Open, Confidential, Private) wherever a level shows. D7: no new motion beyond short state transitions.
## 6. How to work
- Check each line in the picture and the code before fixing; a capture fault is fixed in `web/visual/inventory.ts`, `stages.ts` or `drive.ts`, not in the screen.
- Measure the boxes before changing CSS. Use the shared components; a shared rule that is still wrong goes to G1b (say so), never a local override.
- Words go in the wording sheet; no internal terms on screen. One test per fix, at the cheapest level that proves it. A design statement changed goes in the design text, a decision entry at the top of `docs/decisions.md` and `docs/design/CHANGES.md` section 331.
- Tick in your worktree's `items.md` as you go: `- [x]` plus `→ fixed: <test>`, or the other endings below. Update `docs/project/sweep-8ebf3cf-tracking.md` rows you finish.
## 7. Definition of done; nothing else ends the work
Every line you own ends as exactly one of `→ fixed: <test>`, `→ judged wrong: <evidence>`, `→ needs the owner: <choices>`, `→ belongs to <batch>: <why>`. "Left", "not done", "not checked" are not endings. Every check and capture below runs on the final code after your last change. If your context runs short, write `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g4b-handoff.md` (open lines, files changed, checks still due) and report "handing off". There is no time-box.
## 8. Checks, on the final code (`PW_PORT_OFFSET=500`; each long command once, in the background, waited for)
- `npm --prefix web run build` (exit 0); Vitest for the files you touched; `uv run pytest -q -n0 <files>` for Python you touched; `uv run python -m engine.selfcheck`; `uv run ruff check .`; `uv run ruff format --check .`.
- The browser projects for your screens (people-records, root-tables, root-panes, layout, root (check web/playwright.config.ts for the specs that cover these screens)), after the build exits 0.
- Capture: `npm --prefix web run visual:capture -- --inventory --pages projects,project-page,project-missing,files,files-add,knowledge,notes,handover,quality,side-page,user-menu,help-menu,shortcuts,more-sheet --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g4b-capture`; also `npm --prefix web run visual:capture -- --pages quality,quality-states --with-states --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g4b-mockup` (no --inventory). Open every picture and say what each shows.
## 9. Who else is working, and where
G4a in the g4a worktree (People, a person's page, Organizations: don't touch People*, PersonPage*, Person*, Organization*). Shared parts belong to G1d: don't edit web/src/ui/.
## 10. The report
"Items closed": every owned line copied exactly from `items.md` with its ending; each command's exit code; what each captured picture shows; claims judged wrong.
## 11. Never
Commit, push or message anyone; stop processes by pattern; bare `git stash`; `timeout` around Playwright; faketime; weaken an assertion; add an allowlist entry; sleep loops.

# Batch G1d: The shared parts, second pass: everything the screen batches handed back

## 1. Goal and why
Each screen batch found faults in the parts every screen shares and handed them here. Fix each once, in web/src/ui/ or the shell, so every screen that uses it rises together.
**The bar:** every line you own ends as the definition of done says; the screens you touch score at least 4.0 with no point under 3.5 and brand at least 4.0 on the reviewer's rubric when they are scored cold after you.

## 2. Where and the starting state
- Create your worktree from `cp1` at f97feb1 or later: `cd /home/user/ProjectManagementAgent/.claude/worktrees/cp1 && git worktree add ../g1d -b g1d cp1 && ln -s ../../cp1/web/node_modules ../g1d/web/node_modules`. Work only there. Read its `CLAUDE.md` first ("Writing a brief" and "Tracking and the order of a batch" say how your work is judged).
- Merged already, so build on it, never redo it: G1 and G1c (shared rows without an empty lead, filter bars hidden under 12 items, tables that hide empty columns, warning toasts, the Not here page, one way back, one couldn't-load card with Try again, form skeletons, the status popover). Check `web/src/ui/Row.tsx`, `web/src/ui/RecordsTable.tsx`, `web/src/lib/filterbar.ts` and the `LoadFailed` card exist before relying on them.

## 3. The exact list you own
The lines of `docs/project/u3-gate/items.md` (in your worktree) at these line numbers: **1127, 1129-1131, 1133-1136, 1140, 1142, 1144-1147, 1150-1153, 1155, 1158, 1161, 1163-1167, 1170-1172, 1179-1181, 1184, 1186, 1192, 1195-1198, 1202-1203, 1209, 1214, 1237, and every other line in the file whose ending says 'belongs to G1d' (search for that phrase; there are about 26, spread over the screen sections: give each a final ending too)**. Each names its picture, what is wrong and often the fix. Duplicate lines (two scorers saw the same thing) are fixed once and each gets its ending.
The handed-back parts include: the drawer's title size and width and its footer padding; the disabled primary's look and where its reason sits; the toast wrapping its close and having no countdown; small text on Back and on pills; the Ask box's help line; card label sizes; the sheet's height and divider shadow; the CheckboxGroup panel's legend against its top edge; keyboard, note and flag icons in ui/Icon (Notes and Knowledge share an icon today); skeleton rows for files and notes; the PageHeader title gap; the side strip truncating at 1440; the table toolbar band and one-column header; the section-gap token; the status popover's bottom clip and Refresh under the fade; the offline bar's words when nothing loaded; skeletons that match their loaded page; the segmented control's selected state filling its segment; tabs on a phone (one scrolling row or a More menu, never two rows). Each line names its picture.

**Not yours:** Screen content (it belongs to the screen's batch: G2c, G3c, G4d or the end-of-round pass); the Schedule's and Today's own layouts.
## 4. Inputs
- The pictures: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-inventory/` (named in each line) and, newer, `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1-final/` and `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1c-capture/` for screens G1 touched. Start from the newest picture of a screen.
- The mockups beside the build, for pages that have one: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-mockups/side-by-side/`.
- The rubric: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-score/rubric.md` sections 2 and 4b. The audit with code locations: `docs/project/u3-gate/audit-open-rows.md`.
## 5. The owner's decisions that apply
D7: no new motion beyond short state transitions. D5: Follow-ups' Group by stays three labelled buttons. D11: the person's menu uses the shared segmented control.
## 6. How to work
- Check each line in the picture and the code before fixing; a capture fault is fixed in `web/visual/inventory.ts`, `stages.ts` or `drive.ts`, not in the screen.
- Measure the boxes before changing CSS. Use the shared components; a shared rule that is still wrong goes to G1b (say so), never a local override.
- Words go in the wording sheet; no internal terms on screen. One test per fix, at the cheapest level that proves it. A design statement changed goes in the design text, a decision entry at the top of `docs/decisions.md` and `docs/design/CHANGES.md` section 339.
- Tick in your worktree's `items.md` as you go: `- [x]` plus `→ fixed: <test>`, or the other endings below. Update `docs/project/sweep-8ebf3cf-tracking.md` rows you finish.
## 7. Definition of done; nothing else ends the work
Every line you own ends as exactly one of `→ fixed: <test>`, `→ judged wrong: <evidence>`, `→ needs the owner: <choices>`, `→ belongs to <batch>: <why>`. "Left", "not done", "not checked" are not endings. Every check and capture below runs on the final code after your last change. If your context runs short, write `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1d-handoff.md` (open lines, files changed, checks still due) and report "handing off". There is no time-box.
## 8. Checks, on the final code (`PW_PORT_OFFSET=2100`; each long command once, in the background, waited for)
- `npm --prefix web run build` (exit 0); Vitest for the files you touched; `uv run pytest -q -n0 <files>` for Python you touched; `uv run python -m engine.selfcheck`; `uv run ruff check .`; `uv run ruff format --check .`.
- The browser projects for your screens (layout, root-shell, root-a11y, people-records, root-settings (check web/playwright.config.ts; layout holds shared-rules and states-phone)), after the build exits 0.
- Capture: `npm --prefix web run visual:capture -- --inventory --pages today,followups,todos,people,person-page,projects,files,notes,knowledge,settings-ai,schedule-day,status-popover,user-menu,more-sheet,add-todo,hand-in --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1d-capture`. Open every picture and say what each shows.
## 9. Who else is working, and where
G5b in its own worktree (Settings part two, PW_PORT_OFFSET=1700): don't touch the Business, Connections, Lists, Files or Add-ons settings components.
## 10. The report
"Items closed": every owned line copied exactly from `items.md` with its ending; each command's exit code; what each captured picture shows; claims judged wrong.
## 11. Never
Commit, push or message anyone; stop processes by pattern (`pkill -f`), even your own; delete any file or folder you didn't create (another helper's server folder under /tmp included); use any `PW_PORT_OFFSET` but your own (if your servers collide with another helper's, report it and wait); bare `git stash`; `timeout` around Playwright; faketime; weaken an assertion; add an allowlist entry; sleep loops.

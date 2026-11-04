# Batch G5a: Settings, part one: You, AI and spending (with add an account and compare), Today, Backups, Appearance, Links, the Settings menu, Sign out, Advanced

## 1. Goal and why
Cold scorers found these Settings pages below 4.0. This batch fixes every finding on them so each reaches 4.0 with no point under 3.5.
**The bar:** every line you own ends as the definition of done says; the screens you touch score at least 4.0 with no point under 3.5 and brand at least 4.0 on the reviewer's rubric when they are scored cold after you.

## 2. Where and the starting state
- Create your worktree from `cp1` at 86547b5 or later: `cd /home/user/ProjectManagementAgent/.claude/worktrees/cp1 && git worktree add ../g5a -b g5a cp1 && ln -s ../../cp1/web/node_modules ../g5a/web/node_modules`. Work only there. Read its `CLAUDE.md` first ("Writing a brief" and "Tracking and the order of a batch" say how your work is judged).
- Merged already, so build on it, never redo it: G1 and G1c (shared rows without an empty lead, filter bars hidden under 12 items, tables that hide empty columns, warning toasts, the Not here page, one way back, one couldn't-load card with Try again, form skeletons, the status popover). Check `web/src/ui/Row.tsx`, `web/src/ui/RecordsTable.tsx`, `web/src/lib/filterbar.ts` and the `LoadFailed` card exist before relying on them.

## 3. The exact list you own
The lines of `docs/project/u3-gate/items.md` (in your worktree) at these line numbers: **527-530, 533-541, 544-549, 552-557, 560-565, 568-575, 605-609, 619-622, 625-628, 631-640, 643-651, 911-914, 931-935 (only lines tagged [G5])** and the audit lines VS17 (line 774), VP03 (777), Y10-F23 (813), Y10-F25 (814), Y10-F26 (815), Y10-F27 (816), Y10-F28 (817), Y10-F29 (818), Y10-F30 (819), Y10-F31 (820), Y10-F33 (821), Y10-F35 (823). Each names its picture, what is wrong and often the fix. Duplicate lines (two scorers saw the same thing) are fixed once and each gets its ending.
Known: the Settings phone shell's leftover 45px gap under the picker; stacked account rows on a phone (the checkbox and its line under the description, never a 100px column); Notices and Backups as one label-and-help grid with left-aligned actions, one primary and help cut to one sentence; the AI compare page needs accounts that have run so its table is reachable in the capture (add the stage); no developer sentences on screen.

**Not yours:** Business, Connections, Add a connection, Lists, Files, Add-ons and an add-on's page (G5b); every setup-* screen (G5c); shared parts in web/src/ui/ and the shell (G1d).
## 4. Inputs
- The pictures: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-inventory/` (named in each line) and, newer, `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1-final/` and `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1c-capture/` for screens G1 touched. Start from the newest picture of a screen.
- The mockups beside the build, for pages that have one: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-mockups/side-by-side/`.
- The rubric: `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-score/rubric.md` sections 2 and 4b. The audit with code locations: `docs/project/u3-gate/audit-open-rows.md`.
## 5. The owner's decisions that apply
D1: privacy words are one scale (Open, Confidential, Private) wherever a level shows (G5c changes the wording sheet; use its keys, don't add a second scale). D2: the chosen AI card keeps the ring and tint. D7: no new motion.
## 6. How to work
- Check each line in the picture and the code before fixing; a capture fault is fixed in `web/visual/inventory.ts`, `stages.ts` or `drive.ts`, not in the screen.
- Measure the boxes before changing CSS. Use the shared components; a shared rule that is still wrong goes to G1b (say so), never a local override.
- Words go in the wording sheet; no internal terms on screen. One test per fix, at the cheapest level that proves it. A design statement changed goes in the design text, a decision entry at the top of `docs/decisions.md` and `docs/design/CHANGES.md` section 336.
- Tick in your worktree's `items.md` as you go: `- [x]` plus `→ fixed: <test>`, or the other endings below. Update `docs/project/sweep-8ebf3cf-tracking.md` rows you finish.
## 7. Definition of done; nothing else ends the work
Every line you own ends as exactly one of `→ fixed: <test>`, `→ judged wrong: <evidence>`, `→ needs the owner: <choices>`, `→ belongs to <batch>: <why>`. "Left", "not done", "not checked" are not endings. Every check and capture below runs on the final code after your last change. If your context runs short, write `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g5a-handoff.md` (open lines, files changed, checks still due) and report "handing off". There is no time-box.
## 8. Checks, on the final code (`PW_PORT_OFFSET=1500`; each long command once, in the background, waited for)
- `npm --prefix web run build` (exit 0); Vitest for the files you touched; `uv run pytest -q -n0 <files>` for Python you touched; `uv run python -m engine.selfcheck`; `uv run ruff check .`; `uv run ruff format --check .`.
- The browser projects for your screens (root-settings, settings-setup-fixes, layout, root (check web/playwright.config.ts for the Settings specs)), after the build exits 0.
- Capture: `npm --prefix web run visual:capture -- --inventory --pages settings-you,settings-ai,settings-ai-add,settings-ai-compare,settings-today,settings-backups,settings-appearance,settings-links,settings-menu,settings-sign-out,settings-advanced --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g5a-capture`. Open every picture and say what each shows.
## 9. Who else is working, and where
G5c in the g5c worktree with PW_PORT_OFFSET=1300 (every setup step; it edits the wording sheet for D1 and the setup components). Don't touch setup components or web/src/ui/.
## 10. The report
"Items closed": every owned line copied exactly from `items.md` with its ending; each command's exit code; what each captured picture shows; claims judged wrong.
## 11. Never
Commit, push or message anyone; stop processes by pattern (`pkill -f`), even your own; delete any file or folder you didn't create (another helper's server folder under /tmp included); use any `PW_PORT_OFFSET` but your own (if your servers collide with another helper's, report it and wait); bare `git stash`; `timeout` around Playwright; faketime; weaken an assertion; add an allowlist entry; sleep loops.

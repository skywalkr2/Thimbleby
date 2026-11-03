# Audit of the open rows of the UI/UX tracking sheet, against `cp1` at c83736d

Read-only audit. Sheet: `docs/project/sweep-8ebf3cf-tracking.md`. Reviewer evidence: `origin/claude/sweet-einstein-s840wp`, `sweep-8ebf3cf/`.
Paths are relative to the repository root. `web/src/` is shortened to `src/`.

**How to read it**
- "Browser: exists" means the named test is in the spec file; none was run.
- A row marked **Done** has a named unit or Python test. Where its browser test is still unrun, the cell says so. That is the owner's gate to run, not work to do.
- Items I searched for and could not find in the code are marked **Not done (nothing found)**. I did not walk them in a browser, so the reviewer's re-check should confirm those.
- The sheet cites one file that does not exist: `SourceSides.test.tsx` (VS02). The chip tests are in `Sources.test.tsx` and `Walkthrough.test.tsx`. Every other cited test file exists.

## Part 1. The table

| Row (or Y-item) | Reviewer said | Code today (file:line) | Test | Verdict | Fix (files, change, test, size) |
|---|---|---|---|---|---|
| X04 | No restore button (S4) | Restore is a button on each copy, staged and swapped in at the next start (`src/components/BackupsPanel.tsx`, `RestoreLine.tsx`) | `tests/test_restore_in_app.py`, `BackupsPanel.test.tsx`, `RestoreLine.test.tsx`. Browser: exists (`settings-setup-fixes.spec.ts:167`, X98, X04), not run | Done | None. The browser run is the owner's gate |
| X05 | Trailing "/" accepted; with three inboxes the refusal doesn't say which (S4, S5) | Twin check is per account (`api/setup_routes.py:1185-1200`). The message names the found source's own label (`:1215`, wording `sources.refuse.same_folder`). A second account's sources are named by their account (X79) | `tests/test_source_folders_once.py:77,100,140` (slash, spaces). Browser `journeys-mail.spec.ts:477-489` exists | Done, untested (three-account wording) | Add a case with three accounts to `tests/test_source_folders_once.py` asserting the label names the account. S |
| X09 | A mailbox can be added two ways on one screen (S1) | The header button `sources.add` (`src/components/Sources.tsx:242`) and each account card's "Choose what to read" (`:263,307,335`) both open the same drawer | `Sources.test.tsx` (labels, cursor). No test for one entry point | Partly | Pick one entry. Keep the per-account one and make the header button open it for the chosen account. `Sources.tsx`, `ConnectionCard.tsx`. Test: `Sources.test.tsx`. M |
| X11 | Three vocabularies for privacy (S1) | "Allow / Not my private mail" (`wording/en.json:1237-1239`); "Open / Confidential / Private" (`:1327-1331`, `:2353`); Hand-in uses "Normal / Confidential / Private" (`:2179`) | None can pass: the words are undecided | Needs a decision | Choices below (D1). After the decision: `en.json`, `WelcomeAi.tsx`, `HandIn*.tsx`. Test: `WelcomeAi.test.tsx` plus a wording scan. M |
| X13 | Setup line said "6 of 7" beside 8 steps (S1) | The walkthrough and Today both count seven | `Walkthrough.test.tsx`. Browser: exists (`today-work.spec.ts` "setup's count is the seven steps"), not run | Done | None |
| X18 | Footer said "49 need you" under a person filter; side filter leaks at 390 and on Today (S2, S5) | Footer worked out from the rows; Today leak and long names fixed under X80 and X83 | `OpenItems.test.tsx`, `TodayAccounts.test.tsx`, `SideNames.test.tsx`. Browser: exists (`accounts.spec.ts:170`, `long-names.spec.ts`), not run | Done | Sheet is stale: it still says the side filter is "another helper's" |
| X19 | Redoing line not built; stray ".?" (S2, S3) | The ".?" is fixed (`changes.send_back_label_item`, `en.json:392`). Whole-task redo stays and says so (`changes.send_back_item_redo`, `:395`) | `Today.test.tsx` ("the note to send an item back…") | Deferred by the owner | `docs/decisions.md:1387`: "After the installers: redoing one sent-back item on its own. Until then the whole-task redo stays, and says so before it runs." Also `:1521` |
| X23 | ".," and the date said twice in the brief (S2) | `lib/title-dates.ts`, `BriefCard.tsx` | `BriefCard.test.tsx` ("a brief line says its day once…"). No browser test is named | Done | None |
| X26 | "Reginald is on it" toast stays when the answer shows (S2) | `Ask.tsx` clears the toast when the answer is on screen | `Ask.test.tsx` (same test as X25) | Done | None |
| X31 | Message style is a pattern editor with "Hi Ada," (S3) | `MessageStyle.tsx:1-8`: a live preview with a made-up name, the pattern behind "Edit the pattern", a button that inserts the first name (`:101`). Due-soon band fixed (X89) | `MessageStyle.test.tsx:17,28,48`; `FollowUps.test.tsx` | Done | Sheet is stale. Corrected text below |
| X43 | Empty columns show at rest and hide once a pane opens, so columns jump; "2 items need a place" unexplained (S3) | `ui/RecordsTable.tsx:60-66`: only the pane's squeeze hides columns (`standard`/`shown`). Nothing hides a column that is empty for every row. `Projects.tsx:135-144` | `Projects.test.tsx`, `TablesBesidePane.test.tsx` (nothing on empty columns) | Not done | In `RecordsTable.tsx`, hide a column when every row's cell renders empty, at rest and with the pane the same way. Add one line saying what "need a place" means (`Projects.tsx`, wording). Tests: `src/ui/RecordsTable.test.tsx`, `tables.spec.ts`. M. One fix serves X43, VS12, Y05 and Y11-21 |
| X44 | Work words on a personal-only workspace (S2) | Fixed for the screens that were named (schedule, timeline, stages, hand-over, quality, AI accounts) | `lib/wording.test.tsx`, `wording/wording.test.ts`. Browser: exists (`just-me.spec.ts` "the schedule, its timeline, stages, hand-over, quality and the AI accounts speak of their life"), not run | Partly | The sheet's own "left" is "any work word on a screen no one named". Add a scan: render each main screen on the just-me seed and fail on a list of work words. `just-me.spec.ts`. S |
| X45 | Timeline work words; 30-minute entries overlap and clip; no dragging (S2, S5) | Timeline words covered by X44. Entries have a minimum height (`schedule.spec.ts:241`: entries at least 28px) | `ScheduleLayouts.test.tsx`, `ScheduleViews.test.tsx`, `lib/calendar.test.ts`. Browser: exists (`schedule.spec.ts`, `accounts.spec.ts` VS06), not run | Done, except dragging: Deferred by the owner | `docs/decisions.md:2028-2032`: "dragging and making events on the grid come later"; also `:695` and design `07-ui.md:1166`. Sheet already says so |
| X48 | Undo takes about 2s; "indigo" sentence (S4) | The "indigo" sentence is gone. Undo's delay is the save queue | `quick-edits.spec.ts` (X75) covers loss, not the delay | Partly | The delay is the same cause as X64. Fix there. S, inside X64 |
| X53 | After sign-out the rows say Read and the header says All good (S4) | The header and rows now say signed out (`src/shell/status.ts`, `connection-words.ts`) | `shell/status.test.ts`, `StatusMenu.test.tsx`, `lib/connection-words.test.ts`. Browser: exists (`accounts.spec.ts:410`), not run | Done | None |
| X57 | "Signed in as … · Sign out" on one row (S4) | A card per account (`ConnectionCard.tsx:93,128,142,150`) | `ConnectionCard.test.tsx`. Browser: exists (`accounts.spec.ts:328` VS18), not run | Done | None |
| X59 | A next step for each figure; the period; "Counting from Oct 5 to Nov 2" over a last row "Nov 2 to Nov 8" (S3) | Next-step links exist for two figures only (`Quality.tsx:551,570`). No period chooser (the window is a setting, per `u3-differences/person-quality-setup.md`). Rows are whole Monday weeks (`engine/quality.py:109`, `Quality.tsx:462`), so the last row runs past the window's end | `Quality.test.tsx` | Partly | (a) A next step on each tile, or a recorded decision that only two have one. (b) Clip the last week's end to the window end in `engine/quality.py` or say "so far". (c) A period chooser needs a decision (D4). Tests: `Quality.test.tsx`, `tests/test_quality.py`. M |
| X60 | A skipped install dead-ends; Today still offers "Start the assistant… $0.09" (S4) | `engine/today_queue.py:880-896` makes the `first_go` line whenever runs wait, with no check of the AI account. `TodayEmpty.tsx:32` handles the empty state only | None for "no AI and a waiting go" | Not done | In `today_queue.py`, make no `first_go` line while the AI is not set up. The existing "choose an AI account" line stays. Test: `tests/test_first_go.py`. S |
| X63 | Missing person, `#records/foo/X1`, `#nonsense`, `#settings/nonsense` fall back silently (S3, S4) | A missing record says so with a title (`RecordPage.tsx:425-431,520`). `lib/views.ts:141-146` still returns "today" for `#nonsense` and "settings" for an unknown section | `lib/views.test.ts:30,120` assert the silent fallback | Partly | Add an "unknown page" view with "That page isn't here" and Back to Today. For an unknown Settings section, show a note on Settings. `lib/views.ts`, `App.tsx`, wording. Update `views.test.ts`; add a browser case. M |
| X64 | Toasts trail the saves ("Theme: Dark" while the page is Light) (S4) | Failure toasts are warnings in the places named. Eight sites still push a plain toast, so the check icon shows: `FollowUps.tsx:627,669,992`, `ReplyLine.tsx:50`, `HandToAssistant.tsx:35`, `Ask.tsx:406`, `BriefCard.tsx:455`, `AiAccounts.tsx:512`, `WelcomeAi.tsx:648` (`lib/toasts.tsx:22-23,274`). The lag is not measured | None for the lag | Partly | (a) Add `tone: "warn"` to those sites: S, and a test that fails on any `*_blocked` toast without a tone. (b) Measure the lag per CLAUDE.md, then fix the queue: M. Total M |
| X65 | Colon chain; no Today line while two unseen entries existed (S2) | Colon chain fixed (`SinceYesterday`) | `SinceYesterday.test.tsx`. The second claim was not reproduced | Partly | Needs the reviewer's exact steps. Until then: S, add a test that makes two unseen entries and expects the Today line |
| X66 | `cockpit.db` in the folder; window title; old folder ignored; upgrade path untested (S1, S2, S4) | Tab title `{workspace} · {app}` (`App.tsx:172`, `app.tab_title`, `en.json:2556`); `web/index.html:7`. `cockpit.db` is still the file name (`engine/backup.py:208`) | `src/App.test.tsx` (title) | Partly. The rename is Deferred to phase I | `CLAUDE.md`: "Until phase I renames them, the code and docs still say PM Cockpit and `cockpit`". `docs/decisions.md:1100`: "phase I's rename is split: the visible part now, the command and code later". Still open and not renamed: the upgrade path from an old-name folder. Add a test in phase I. M |
| X69 | The source's mail is not a link in the review list; "Send 2 to-dos / Date 2 new to-dos" lines before the review is accepted (S1, S2) | Intro text no longer repeats the screen. The two items the sheet lists as "left" have no code | `Walkthrough.test.tsx` ("Your promises intro…") | Partly | (a) Link the source mail in the review rows (`BatchDetail.tsx`, `ItemRow`). (b) The two count lines depend on X85's drafts. Tests: `BatchDetail.test.tsx`, `Today.test.tsx`. M |
| X101 | Drawer won't close; the generic drawer opens; the mail folder is a free-text box (S4) | Esc and Close at every step. When adding, `Sources.tsx:726-738`: `enabled: !adding`, so the folder list is only fetched when changing a source | `Sources.test.tsx`. Browser: exists (`settings-setup-fixes.spec.ts:231`), not run | Partly | Fetch an account's folders while adding (`api/setup_routes.py` folders route by account; `Sources.tsx`). Test: `Sources.test.tsx`, `tests/test_folder_chooser.py` or the folders route test. M |
| Y01 | Sides as plain boxes; "Set separately" like plain text; Continue in the body; phone gap; phone People (S1) | Sides are chips (`SourceSides.tsx`). Continue is in the footer. "Set them separately" is a quiet Button (`WalkthroughMail.tsx:178-182`). Phone gap and People layout: no change found | `Walkthrough.test.tsx:2250` (one Continue in the footer); `:2416` (the button) | Partly | Style "Set them separately" as a visible link-button (underline and chevron): `WalkthroughMail.module.css`, S. Phone People layout: `WalkthroughPeople.module.css`, S. Test: `Walkthrough.test.tsx` plus `first-day.spec.ts` at 390 |
| Y03 | Postponed layout items (S4) | Items are Y10's F21-F35 | See Y10 | Partly | See Y10 |
| Y04 | Quality is a wall of empty boxes; Compare says "Nothing measured" under a failure (S4) | Quality is one card, with a "Too early to tell" card for week one; a failed Compare says why | `Quality.test.tsx:589-593`; `AiCompare.test.tsx:210` | Done | Sheet is stale: it calls Quality "another helper's page" |
| Y05 | Remove and Add another under 24px; People table has empty columns (S3) | `PersonReach.module.css:6` uses `--hit-min`. Table: same cause as X43 | `People.test.tsx` (targets: none by name) | Partly | The columns: see X43. Add a size test for Remove. S |
| VC01 | Square tag column makes the left edge ragged (V2-V4) | Slot always 24px, mark after the words (built). Held-kind rows are drawn in `src/shell/HeldLines.tsx` with an empty slot | `ui/Row.test.tsx`, `Today.test.tsx`. Browser: exists (`shared-rules.spec.ts:172`), not run | Partly | Give each held kind an icon in the slot: `HeldLines.tsx`. Test: `HeldLines.test.tsx`. S |
| VC02 | PageHeader differs page to page (V3, V4) | Tabs and chips start on the content edge (built). The back link or crumb is chosen by each screen | `ui/PageHeader.test.tsx`; `shared-rules.spec.ts:153-157` exists | Partly | One `back` prop on `PageHeader` used by every record and settings page; remove the bare Back variants. Test: `PageHeader.test.tsx` plus a scan in `shared-rules.spec.ts`. M |
| VC07 | A warning shows a success check; toasts lag saves (V1, S4) | See X64 for the eight sites | None | Partly | Same as X64 (a). S |
| VC11 | AI "Something else" nests three levels (V1) | The AI choice cards are one row of three. `RadioCard` has no check disc, on purpose | `WelcomeAi.test.tsx` | Needs a decision | D2 |
| VS01 | Follow `setup-ai`: check disc, 3-step checklist (S1) | Cards, rail, key states, one Open style are built. No check disc; the steps are four to do, not to tick (`u3-differences/person-quality-setup.md`) | `WelcomeAi.test.tsx` | Needs a decision | D2 |
| VS02 | Sides are four plain boxes, not chips with "Set separately" (S1) | Chips: `SourceSides.tsx`. "Set separately" still a quiet button (`WalkthroughMail.tsx:178`) | `Sources.test.tsx`, `Walkthrough.test.tsx:2416`. The cited `SourceSides.test.tsx` does not exist | Partly | Same as Y01. S. Correct the cited test name on the sheet |
| VS03 | Folder chooser has no breadcrumb or New folder; mail step; rest of mockup (S1) | Chooser has both (`WelcomeBackup.tsx`). The mail step was compared (section 317). The rest was not compared | `WelcomeBackup.test.tsx`, `tests/test_folder_chooser.py`. Browser: exists (`settings-setup-fixes.spec.ts:30`), not run | Partly | Compare the remaining mockup parts (the job banner and People rows were seen built) and list differences in `u3-differences`. S |
| VS04 | Shortcuts dialog not opened (S4) | The Help menu offers it (`src/shell/Header.tsx:68`); `lib/keys.ts` | `acceptance.spec.ts` opens it (exists). No unit test | Done, untested | Add `Header.test.tsx` case: Help, Keyboard shortcuts, the dialog lists the keys. S |
| VS05 | Open both on the clash; greeting and brief card; short review title (S2) | Greeting, groups, inset review, Keep all built. Review title is still `queue.intake_review.title` with `{source}` (`en.json:4424`). The clash has one button and the second meeting in the menu | `Today.test.tsx`, `TodayRail.test.tsx`, `BatchDetail.test.tsx`. Browser: exists (`today-todos-46.spec.ts:113-139`), not run | Needs a decision | D3 (Open both). Not done and not decisions: a system-line icon (VC01) and the lowercase source in the review title (see Y09-1). S |
| VS07 | What changed: group by time, "×4", learning as a muted line, no ids (S3) | No time groups and no repeat collapse: the groups are per change (`WhatChanged.tsx:946-977`). Learning line exists (`WhatChangedLearning.test.tsx`) | `WhatChangedGroups.test.tsx` (not for time) | Not done | Group rows under day headings and fold identical consecutive runs into "×N". `WhatChanged.tsx`, `engine` route may need a day key. Test: `WhatChangedGroups.test.tsx`, `changed-rows.spec.ts`. M |
| VS08 | Handled: tabs with counts, a 280px search, "Group by" as a dropdown, one-line rows (S3) | Tabs with counts and a search exist. "Group by" is a labelled `SegmentedControl` of three (`Handled.tsx:131`) | `Handled.test.tsx:157,196,216` | Needs a decision | D5 (dropdown or labelled buttons). One-line rows: S |
| VS09 | Follow-ups: status tabs only, one Copy message, "You" as a link row, message style in a drawer (S3) | `FollowUps.tsx:245` tabs, then Group by (`:250-258`), the side filter, an inner Message/Table switch (`followups.view`, `en.json:1650`); style is inline | `FollowUps.test.tsx`, `MessageStyle.test.tsx` | Not done | Remove the inner Message/Table tabs (the table becomes a menu action); move the message style into a drawer; one Copy message. `FollowUps.tsx`, `MessageStyle.tsx`. Test: `FollowUps.test.tsx`. M |
| VS10 | Inline add row; one meta line; subtitle; footer hint (S2) | All built. The "by Friday" read is built too: `InlineAddTodo.tsx:2-39`, `lib/todo-phrase.ts`. No Done tab (no list of finished to-dos). No "Show N more" | `InlineAddTodo.test.tsx:118,132,144`, `OpenItems.test.tsx`. Browser: exists (`today-todos-46.spec.ts:34-96`; `states-phone.spec.ts:157`), not run | Partly (remove "by Friday" from the left list) | Done tab: needs a finished-to-dos list (API plus `OpenItems.tsx`): M, and a decision, D6. "Show N more": needs a setting, S |
| VS12 | Projects: hide columns that are empty for every row (S3) | Not built; see X43 | None | Not done | See X43 |
| VS14 | Files drop zone; Knowledge inline add rows (S2) | `Files.tsx:97` is `<EmptyState text=…>`; `ui/FileDrop.tsx` exists but is not used there. `Knowledge.tsx` has no inline add | None | Not done | Use `FileDrop` as the Files empty state (S). Knowledge: an inline add row per panel, like `InlineAddTodo`, with Undo (M). Tests: `Files.test.tsx`, `Knowledge.test.tsx`. Total M. Deferred in writing by the builder to a later step: `u3-differences/states-phone.md` |
| VS16 | Handover: "In sync" pill, last sync time, Check now (S3) | `Handover.tsx:65` is `<EmptyState text="Both copies match.">`. `HandoverView` has no last-checked time (`api/schemas.py:2760-2773`) | None | Not done | Add `last_checked` to `HandoverView` and a check-now route (`engine/handover.py`, `api/routes.py`), then pill, time and button in `Handover.tsx`. Run `uv run python -m api.openapi`. Tests: `tests/test_handover*.py`, `Handover.test.tsx`. M |
| VS17 | Label spacing inverted; "You / You / You" (S4) | Groups "About you / Assistant / Your data / More" (`Settings.tsx:93-96`, `en.json:1847-1850`); `.settings-nav-group` CSS (`styles.css:221-224`). Spacing not measured | `Settings.test.tsx:183`; `settings-walk.spec.ts:61` exists | Partly | Measure the gap above and below each group label in the browser, then fix the margin. `styles.css`. Test: a measured case in `settings-walk.spec.ts`. S |
| VP01 | Edges differ (V1, V2, V4) | Shared parts keep to the content edges. List footers inside panels and Settings' layout not re-walked | `PageHeader.test.tsx`. Browser: exists (`shared-rules.spec.ts:7,150`), not run | Partly | Add Settings and panel footers to the `shared-rules.spec.ts` edge check. S |
| VP02 | Square tags before titles (V2) | Tag column gone; Today's lines now have an icon or side colour (CHANGES 316). Held lines have an empty slot (see VC01) | `Row.test.tsx`. Browser: exists (`shared-rules.spec.ts:172`), not run | Partly | Same as VC01. S. The sheet's "Today's lines have an empty slot" is stale |
| VP03 | 12px sentence-case group labels (V1, V2) | `GroupLabel` is used in Today, sidebar, menus. Settings' own section labels still use plain headings (`styles.css:224`) | `ui/GroupLabel.test.tsx`. Browser: `guards.spec.ts:3` exists. A "no paragraph under 13px" test exists; the sheet quotes a name I did not find as a title | Partly | Use `GroupLabel` for Settings' section and nav labels. `Settings.tsx`, `styles.css`. Test: `Settings.test.tsx`. S |
| VP04 | Two filled buttons per viewport (V2) | Header and "+" are tonal. The setup walkthrough and dialogs were not walked | `Header.test.tsx`. Browser: exists (`shared-rules.spec.ts`), not run | Partly | Add the setup steps and the open dialogs to the one-filled-button count in `shared-rules.spec.ts`. S |
| VP05 | Connections is still a table under the accounts (V2, V4) | Connections is now a card per account with a state row (VS18, `ConnectionCard.tsx`) | `StateMark.test.tsx`, `Sources.test.tsx`, `ConnectionCard.test.tsx` | Done | Sheet is stale |
| VP06 | First-row ring always on; night elevation (V2) | Both built (CHANGES 312 and 313): `lib/input-mode.tsx`; `theme/brand.ts` | `theme/brand.test.ts`, `lib/input-mode.test.tsx`, `Today.test.tsx`. Browser: exists (`shared-rules.spec.ts:234`), not run | Done | Nothing is "In progress". Only the browser run remains |
| VP07 | No state sheets (V1-V4) | List screens have loading, couldn't load, offline, filtered-to-nothing. Left: Schedule, Connections, changed-elsewhere on a to-do's own edit, Knowledge's offline wording | `ui/states.test.tsx`, `ListStates.test.tsx`, `RecordPage.test.tsx`. Browser: exists (`states-phone.spec.ts:56-157`), not run | Partly | Add the four states to Schedule and Connections (`ScheduleViews.tsx`, `Sources.tsx`); a conflict note on a to-do's edit; Knowledge's offline line. Tests: `ListStates.test.tsx`, `states-phone.spec.ts`. M |
| VP08 | Phone shell (V1, V2, V4) | Built (tab bar, sheets, header search) | `shell/BottomBar.test.tsx`, `SideFilterSheet.test.tsx`, `Header.test.tsx`. Browser: exists (`states-phone.spec.ts:174-221`), not run | Done | None |
| VP09 | Motion not visible in captures | No motion spec or token set found beyond the toast and drawer | None | Not done | Decide the motion list first (D7). Then `tokens.css` durations, `prefers-reduced-motion`, one test. M |
| VP10 | Keyboard not exercised (V5) | Pieces exist: keys, listbox keys, row cursor, the Schedule arrows | `Select.test.tsx`; `schedule.spec.ts:186`; `shared-rules.spec.ts:234` | Partly | A whole-app keyboard walk: every main screen reachable and operable, with the cursor on the heading. New `web/e2e/keyboard.spec.ts`. M |
| VP11 | Sidebar clips names; chips clip at 390; email breaks mid-address (S5) | Names, chips and sheet fixed under X83. Emails wrap with `overflow-wrap: anywhere` on purpose (`PersonPage`) | `SideNames.test.tsx`, `SideFilterSheet.test.tsx`, `ui/states.test.tsx`. Browser: exists (`long-names.spec.ts:21-100`), not run | Done | The email wrap is intended; say so on the sheet |
| VP12 | Strip takes 3 rows, five identical icons at 1024 (V4) | Side filter is a button at 1100 and under; each side has its own mark (X83); Schedule shows weekdays below 1100 | `SideFilterSheet.test.tsx`, `ScheduleViews.test.tsx`. Browser: exists (`states-phone.spec.ts:247-260`, `long-names.spec.ts:100`), not run | Done | The sheet's "The Schedule's weekday view is another step's" is stale |
| VP13 | Small hit targets (V2, V3) | `--hit-min`, `--hit-icon` (`theme/tokens.css`) | Browser: exists (`states-phone.spec.ts:197`), not run | Done, untested at unit level | The sheet already holds it open until the browser test passes |
| VP14 | Mockups v2 then v3 (reviewer) | Not code | None | Not done | The reviewer's task. Nothing to build here |
| VP15 | No screenshot comparison in the build | `npm run visual:capture` exists; there is no comparison or threshold step in the checks | None | Partly | Add a baseline compare to CI for six screens. New `web/e2e/visual-baseline.spec.ts`. M, and a decision (D8) |
| VP16 | Pills only; tokens, mark, fonts, state colours (V1-V4) | Palette, Inter and Fraunces, mark follows theme, workspace colour (CHANGES 312). Left: mark and name from one product file (P101), app icon, component rules | `theme/brand.test.ts`, `Header.test.tsx`. Browser: exists (`brand.spec.ts:27-109`), not run | Partly. The app icon is Deferred to phase I | `CLAUDE.md`: phase I is "name and icons, nothing made-up shipped". The product file: S, `src/brand.ts`, test `brand.test.ts` |
| VP17 | No brand moments (V1-V3) | All-clear Today is built (`TodayAllClear.tsx`); serif step numerals; greeting. Not built: mark on Welcome and Done, the identity card, first-launch motion | `TodayAllClear.test.tsx`. Browser: none for the Welcome mark | Partly | Mark and a line on Welcome and Done: `WalkthroughWelcome.tsx`, `Walkthrough.tsx`; test `Walkthrough.test.tsx`. S. Identity card and motion depend on D7. M |
| X72 | Ids and ISO dates on screen (S2, S3) | One reader for lesson, note and change words. Source fixed at R5 (repeated edits make one follow-on) | `lib/read.test.ts`, `Notes.test.tsx`, `tests/test_follow_on.py`. Browser: exists (`data-and-trust.spec.ts` "the pages a row opens show nothing internal"), not run | Done | The sheet's "send the exact pane" is a request to the reviewer |
| X77 to X80, X82 to X85, X94 to X97, X99, X100, X102, X104 | Several-accounts and settings rows | Built as the sheet says | Units and Python tests as listed on the sheet. Browser: all named specs exist (`accounts.spec.ts`, `settings-setup-fixes.spec.ts`, `long-names.spec.ts`), not run | Done | None. Only the browser run |
| X78 (What changed) | Same invitation twice (S5) | Schedule and Today fixed. "What changed still lists each source's own record" (sheet) | `tests/test_several_accounts.py` | Partly | Merge twins in What changed's list, or say it is the other account's copy. `engine/changes view`, `WhatChanged.tsx`. S |
| X87 | Counts disagree (S2, S3, S1) | Fixed for to-dos, Today and setup. What changed "3 over 11" was not reproduced | `OpenItems.test.tsx`, `Today.test.tsx`, `tests/test_open_items.py`. Browser exists (`today-work.spec.ts`), not run | Partly | Needs the exact screen. Meanwhile add a test that What changed's chip counts equal its row counts. S |
| X13/X14/X23-X26/X30/X71/X73-X76/X86 to X93 | Fixed with named tests, browser not yet run | Built | Named test files exist; browsers exist | Done | None. Only the browser run |

### Y07 to Y11, item by item

| Row (or Y-item) | Reviewer said | Code today (file:line) | Test | Verdict | Fix (files, change, test, size) |
|---|---|---|---|---|---|
| Y07-1 | The AI step's wording: "The service is Another service."; "can't tell which account it is signed in to"; no line saying the key must be pasted again after a reload (S1 P2-5) | `welcome.ai.allow.unknown` still exists (`en.json:1236`); no "paste it again" line found | `WelcomeAi.test.tsx` | Not done (nothing found) | Reword the three lines; add the reload line. `en.json`, `WelcomeAi.tsx`. Test: `WelcomeAi.test.tsx`. S |
| Y07-2 | The mail step's layout (P2-3) | Continue in the footer (built). Restart line outside the card, "Who are they for?" and "Set them separately" not changed | `Walkthrough.test.tsx:2250` | Partly | See Y01. S |
| Y07-3 | The promises step repeats itself (P2-4) | Intro cut (X69) | `Walkthrough.test.tsx` ("Your promises intro no longer says what the screen's own text says") | Done | None |
| Y07-4 | Backups doesn't confirm (P2-9) | "First backup made." (`en.json:1715`) | `tests/test_first_backup.py`, `WelcomeBackup.test.tsx` | Done | `cockpit.db` inside the backup waits for phase I |
| Y07-5 | A bare tick isn't kept (P2-11) | No code or test found | None | Not done (nothing found) | Keep an unsaved tick across reload, as `lib/settings-pending.ts` does for Settings. `Walkthrough*.tsx`. Test: `Walkthrough.test.tsx`. S |
| Y07-6 | Window title and name (P2-1, P2-6 of S2) | Title `{workspace} · {app}` | `App.test.tsx` | Done | None |
| Y07-7 | "Reginald is reading: Your inbox…" capitals; contradicts "waits for you to start" (P2-2) | Lowercase fix in section 321 (sheet and `u3-differences`) | `Walkthrough.test.tsx` | Done | None |
| Y07-8 | "Next: Say who you are" against "You"; "What is your business called?" then "What is your business?"; the grouping question (P2-6) | `setup_line.next` (`en.json:3467`), `business_name` (`:3716`) and `about_unnamed` (`:6891`) both exist | None | Not done (nothing found) | Make the step names and next-lines match; reword the grouping question. `en.json`. Test: wording scan in `Walkthrough.test.tsx`. S |
| Y07-9 | The pill doesn't match Today; People lists names from mail before reading is on (P2-7) | No change found | None | Not done (nothing found) | Hide the mail names until reading starts, or say where they came from. `WalkthroughPeople.tsx`. S |
| Y07-10 | People: one-word name stored; unlabeled paste box; focus; phone wrap (P2-8) | "Maya" rule not changed (X03 passes on purpose per the sheet) | `Walkthrough.test.tsx` | Partly | Label the paste box; check the phone wrap. `WalkthroughPeople.tsx`, `.module.css`. S |
| Y07-11 | Today after the look-back: counts, raw date in a quote, a gap (P2-10) | Counts (X87), dates (X86) | `Today.test.tsx`, `title-dates.test.ts` | Done | None |
| Y07-12 | Welcome's "$2 a day" line before any account exists (P2-12) | `welcome.spend.*` (`AiSpendLine.tsx:107`) is in the AI step, after the choice. Not checked on the Welcome screen | None | Not done (nothing found) | Confirm on Welcome; hide the spend line until an account exists. `WalkthroughWelcome.tsx`. S |
| Y07-13 | The old-name folder beside a fresh setup is ignored (P1-11, moved to P2) | No change | None | Deferred (phase I) | `docs/decisions.md:1100`. Add the upgrade-path test in phase I |
| Y08-1 | Quality's empty boxes (S2 P2-13) | One card (`Quality.tsx`) | `Quality.test.tsx:589` | Done | None |
| Y08-2 | Search finds no mail, notes, or unadded people (P2-14) | Search covers "people, projects, to-dos, files and what was learned" (`SearchBox.tsx:2`) | `SearchBox.test.tsx` | Not done | Add mail and notes to the typed search route. `api` search route, `SearchBox.tsx`. Test: `tests/test_search*.py`. M. Needs D9 (is mail searchable) |
| Y08-3 | Week view: 30-minute entries overlap; now-line strikes text; columns squeeze with the pane (P2-15) | Entries at least 28px (`schedule.spec.ts:241`) | `ScheduleLayouts.test.tsx` | Partly | Check the now-line and the pane squeeze in a measured case. `schedule.spec.ts`. S |
| Y08-4 | Schedule wording: "Move this date…" vs "Move this event" vs "Moved that date."; Cancel doesn't confirm; "From your notes" vs "Added by you" (P2-16) | `en.json:6464,6470,6474` unchanged; `today.agenda.own` "From your notes" (`:2848`) vs `schedule.from_own` "Added by you" (`:2965`) | None | Not done | Make the two "own" strings one. Decide Cancel (Undo exists; the rule says reversible acts do not confirm). `en.json`. Test: wording scan. S |
| Y08-5 | Timeline dots unlabeled; a daily repeat gives about 70 dots (P2-17) | Timeline has icons by actor; dots not checked | `timeline.spec.ts` | Not done (nothing found) | Label each dot and fold a repeat into one band. `Timeline.tsx`. Test: `timeline.spec.ts`. M |
| Y08-6 | To-do rows: Mark done name; toast doesn't name the to-do; "· Personal"; "Promised to: No one in particular"; Learning box; "in 3 days" (P2-18) | Mark done is named for reminders (`ReminderLine.tsx:174`, `today.todo.done_named`). "No one in particular" still shown on a person's own to-do (`PromiseWhy.tsx:110`) | `Today.test.tsx` | Partly | Name the to-do in the toast; hide "Promised to" for the person's own to-do. `OpenItems.tsx`, `PromiseWhy.tsx`. Test: `OpenItems.test.tsx`. S |
| Y08-7 | Small items: "Look over" stays; Add word has no toast; Files chip on every row; one icon for Notes and Knowledge; Back floats alone; People columns (P2-19) | No change found except People columns (X43) | None | Not done (nothing found) | Six small fixes, one test each. M |
| Y08-8 | "Thimbleby" appears on no screen (P2-20) | The header shows the name (`Header.test.tsx:74`); the tab shows it | `Header.test.tsx`, `App.test.tsx` | Done | None |
| Y08-9 | The Ask pane says "the guide" (P2-21) | Not checked in code | None | Not done (nothing found) | Reword. `en.json`. S |
| Y09-1 | "Look over what was found in Your calendar" capital Y; "Needs you" chip repeats the section; skeleton rows 3.5s (S3) | `queue.intake_review.title` uses `{source}` as the label (`en.json:4424`) | None | Not done | Lowercase the label when it follows words, or phrase it "from your calendar". `BatchDetail` title, `lib`. S |
| Y09-2 | Sidebar names cut; business item scrolls the sidebar sideways | Fixed under X83 | `SideNames.test.tsx`; `long-names.spec.ts:81` exists | Done | None |
| Y09-3 | Phone: Quality headers break mid-word; Today's clash text cut | Weekly table is a list on a phone (`Quality.tsx:478`); X92 | `Quality.test.tsx`; `person-quality-setup-46.spec.ts:128` exists | Done | None |
| Y09-4 | "Copying was blocked" toast has a check | See X64 | None | Not done | See X64 (a) |
| Y09-5 | Follow-ups: "In this message" repeats; box cuts "Thanks!"; 32 bullets in one message; three filter rows | `followups.in_message` (`en.json:636`) exists; filter rows: see VS09 | None | Not done | Drop "In this message"; size the box to its text; cap the bullet list. `FollowUps.tsx`. Test: `FollowUps.test.tsx`. S-M |
| Y09-6 | Empty text "Nobody has one yet" without a link to People | `followups.empty` (`en.json:577`) unchanged | None | Not done | Add the link to People. `FollowUps.tsx`. S |
| Y09-7 | "Needs a date": help under its group; native date inputs | Dates are `DateField` now (VC05) | `ui/DateField.test.tsx`; `shared-rules.spec.ts:276` exists | Partly | Move the help above the group: `NeedsADate.tsx`. S |
| Y09-8 | Business page: "Read by 127.0.0.1:9455…"; "Details: Nothing filled in yet." | Host and port fixed (X93). `record.no_details` still "Nothing filled in yet." (`en.json:938`) | `ProjectKnows.test.tsx` | Partly | Hide the details line when empty, or give it a way to fill. `RecordPage.tsx`. S |
| Y09-9 | Settings menu: "You" twice; group titles look like links | "About you" group; `.settings-nav-group > h3` is muted text | `Settings.test.tsx:183` | Done | Spacing: VS17 |
| Y09-10 | Removing a business: "End them with it" | `settings.business.remove_end` (`en.json:1877`) unchanged | None | Not done | Reword both strings. `en.json`. S |
| Y09-11 | Quality: bare section titles; "Promises found 0" after the look-back found to-dos | One card; the figure's source not checked | `Quality.test.tsx` | Partly | Check the "found" count includes the look-back; add a test. `engine/quality.py`. S |
| Y09-12 | "Step 8 of 8" against "6 of 7 done" | Seven steps (`walkthrough.step_of`, `en.json:6940`, X13) | `Walkthrough.test.tsx` | Done | None |
| Y09-13 | Person page: "Activity" is a tab and a heading; "Their team's days off count too" with no team | `person.tab.activity` (`en.json:6984`); `daysoff.person.empty` (`:5544`) | None | Not done | Drop the heading; drop the clause when no team. `PersonPage.tsx`. S |
| Y09-14 | A raw ISO date inside an AI quote | Quotes read through the date reader (X72) | `lib/read.test.ts` | Done | None |
| Y10-F21 | Toasts and Undo trail by seconds | See X64 | None | Partly | X64 |
| Y10-F22 | Unknown pages redirect silently | See X63 | `views.test.ts:30,120` | Partly | X63 |
| Y10-F23 | Settings menu spacing; "You" three times | See VS17 | `Settings.test.tsx:183` | Partly | VS17 |
| Y10-F24 | Window title is the workspace name | `App.tsx:172` | `App.test.tsx` | Done | None |
| Y10-F25 | "Make one for me" and Save float after a key exists; "Where it is kept instead" unclear | `secret.where_instead` still exists (`en.json:1959`) | None | Not done (nothing found) | Hide both once a key is stored; reword. `SecretField`. S |
| Y10-F26 | Handover mentions a sync folder before one exists | `handover.intro` (`en.json:1079`): "the folder it syncs to", with no check for a configured folder | None | Not done | Use `handover.intro.just_me`-style text when no folder is set. `Handover.tsx`. S |
| Y10-F27 | Advanced uses jargon | Not found in the wording scan | None | Not done (nothing found) | Needs the reviewer's list of words. S |
| Y10-F28 | Disabled radios nearly invisible | `styles.css:83`: disabled is a sunken fill, never opacity; radios not measured | None | Not done (nothing found) | Measure the contrast of a disabled radio; add a rule. `styles.css`. S |
| Y10-F29 | No warning when ask-before is above the per-task limit; "$-5.00", "1e-7" | `-$5.00` fixed (X102: `lib/money.test.tsx`). No cross-check of the two limits (`engine/config/schema.py:987` has `confirm_above_usd` alone) | `tests/test_sweep8_settings.py` | Partly | Add the cross-field note in Settings and a validator note. `engine/config`, `Settings.tsx`. Test: `tests/test_sweep8_settings.py`. M |
| Y10-F30 | "Another command-line agent signed in as you" | The phrase is gone from `en.json` | None | Done, untested | Add a wording-scan case. S |
| Y10-F31 | Add folder step 2: a sentence as a label, two folds, two primaries | Labeled fields (X95). Folds not checked | `Sources.test.tsx` | Partly | Count filled buttons in that drawer; shorten the label. `Sources.tsx`. S |
| Y10-F32 | Long business names clip in the sidebar | X83 | `SideNames.test.tsx` | Done | None |
| Y10-F33 | "Show keyboard shortcuts" offered on a phone | `Header.tsx:68` has no pointer or width gate | None | Not done | Hide it on a coarse pointer. `Header.tsx`. Test: `Header.test.tsx`. S |
| Y10-F34 | An add-on takes three steps and two restarts, Installed and Available disagree | X104 fixed the pill and Details | `Addons.test.tsx` | Partly | Steps and restarts are the plugin API's. Needs a decision (D10) |
| Y10-F35 | Backup path wording | X100 and `welcome.backup.saved_drive` | `WelcomeBackup.test.tsx` | Partly | Show the folder name, not the full path, in Settings Backups. `BackupsPanel.tsx`. S |
| Y11-14 | Promises step repeats its paragraph | X69 | `Walkthrough.test.tsx` | Done | None |
| Y11-15 | What changed's counts (7) vs about 25 rows; three "Not yet checked" | X87 left | None | Partly | See X87. S |
| Y11-16 | A second sign-in with the same account is silent; "Who are they for?" for one account; "Where things stand"; no way to remove an account in setup | Same account replaces its tokens (`tests/test_sign_in_refused.py:32`) but says nothing | `test_sign_in_refused.py` | Partly | Say "Already signed in; refreshed". Remove-account in setup: `WalkthroughMail.tsx`. M |
| Y11-17 | Today's lines show no side label; follow-up draft names no mailbox | Side marks in the meta (CHANGES 316); draft names mailboxes (X85) | `Today.test.tsx`, `FollowUps.test.tsx` | Done | None |
| Y11-18 | Week crushes entries with the pane open; one entry covers another; three identical all-day "Due:" entries | Min heights and lanes built | `ScheduleLayouts.test.tsx` | Partly | Fold identical all-day entries. `lib/calendar.ts`. Test: `calendar.test.ts`. S |
| Y11-19 | The Add form doesn't say which calendar; the read-only page has a gap; "your calendar app" names no app | `acts.event.why.app_only` (`en.json:6469`) unchanged | None | Not done | Add a Calendar picker to the Add form. `ScheduleAdd`. M |
| Y11-20 | Handled for you isn't grouped by account | Groups are kind, reason, sender (`Handled.tsx:45`) | `Handled.test.tsx` | Not done | Add an "account" group. `engine/handled`, `Handled.tsx`. M |
| Y11-21 | Projects shows seven empty columns | See X43 | None | Not done | X43 |
| Y11-22 | People: "Harborview Co…" cut; no side tabs on a phone; own "How to reach" empty; targets under 24px | Targets fixed (Y05) | `People.test.tsx` | Partly | Ellipsis with a title; side sheet on a phone; an empty "How to reach" prompts. `People.tsx`. S-M |
| Y11-23 | A person's page repeats the sides | `person.sides` (`en.json:6944`) and the details | `PersonPage.test.tsx` | Not done | Drop one. S |
| Y11-24 | Side pages: a to-do twice; "Read by 127.0.0.1"; raw date in "Pick an owner" | Host fixed (X93); dates (X72) | `ProjectKnows.test.tsx` | Partly | Find the double listing; test it. S |
| Y11-25 | Connections' row buttons all read "More actions for Your inbox" | Account menu is named by the account (`ConnectionCard.tsx:150`); row menus named by their label (X79) | `ConnectionCard.test.tsx` | Done, untested | Add an accessible-name uniqueness case to `Sources.test.tsx`. S |
| Y11-26 | Business: "End them with it"; "25 people and items" vs 9; "You" twice; no gap before "Assistant" | See Y09-10, VS17 | None | Not done | Y09-10; the count: S |
| Y11-27 | Hand in asks "Where does it belong?" with ten flat options even from a side's page; Ask doesn't say it is limited to a side | `handin.project` (`en.json:2183`) | `HandIn.test.tsx` | Not done | Default to the page's side. `HandIn.tsx`. M |
| Y11-28 | At 1024 five identical grid icons; names clip at 1440 | X83 and VP12 | `SideNames.test.tsx` | Done | None |
| Y11-29 | The More sheet's icon squeezed at 390; Timeline has "Personal" over a row named "Personal" | Not checked | None | Not done (nothing found) | Two small CSS and label fixes. S |
| Y11 (sides leak etc.) | See X80 | | | Done | None |

## Part 2. Summary

### Counts by verdict
These count the rows of Part 1, the grouped rows once each, and the Y items.

| Verdict | Rows (Part 1, first table) | Y items (second table) |
|---|---|---|
| Done | 18 | 18 |
| Done, untested | 3 | 2 |
| Partly | 31 | 19 |
| Not done (includes "nothing found") | 9 | 28 |
| Deferred by the owner | 1 (X19) | 1 (Y07-13) |
| Needs a decision | 5 (X11, VC11, VS01, VS05, VS08) | 0 |

X45 counts as Done with dragging Deferred in writing; X66 and VP16 count as Partly with their phase I parts Deferred. Three grouped lines (the several-accounts rows, the "Fixed with named tests" row, and Y11's sides leak) count once each, so the table counts lines, not sheet rows.

The Y items marked "nothing found" were searched for in the code and wording, not walked in a browser.

### Rows whose sheet text is stale: paste these in
- **X18:** Fixed (`web/src/components/OpenItems.test.tsx`, `TodayAccounts.test.tsx`, `SideNames.test.tsx`; browser `web/e2e/accounts.spec.ts` X80, `long-names.spec.ts`, not yet run)
- **X31:** Fixed (`web/src/components/MessageStyle.test.tsx` "a live preview…", "the first name goes in with a button…"; `FollowUps.test.tsx`)
- **Y04:** Fixed (`web/src/components/Quality.test.tsx` "Too early to tell"; `AiCompare.test.tsx` failed measuring)
- **VP05:** Fixed (`web/src/components/ConnectionCard.test.tsx`, `Sources.test.tsx`, `StateMark.test.tsx`; Connections is a card per account)
- **VP06:** Fixed (`web/src/theme/brand.test.ts`, `web/src/lib/input-mode.test.tsx`, `Today.test.tsx`; browser `shared-rules.spec.ts`, not yet run)
- **VP11:** Fixed (`SideNames.test.tsx`, `SideFilterSheet.test.tsx`; browser `long-names.spec.ts`, not yet run). Emails wrap on purpose.
- **VP12:** Fixed (`SideFilterSheet.test.tsx`, `ScheduleViews.test.tsx`; browser `states-phone.spec.ts`, `long-names.spec.ts`, not yet run)
- **VP13, VP08:** Fixed (as built; browser `states-phone.spec.ts` not yet run)
- **X45:** Fixed except dragging, Deferred (`docs/decisions.md:2028-2032`)
- **VS10:** drop "by Friday" from the Left list (`InlineAddTodo.test.tsx`, `lib/todo-phrase.test.ts`). Left: a Done tab and "Show N more".
- **VP02 and VP05, VC01:** drop "Today's lines have an empty slot". Left: the held-kind rows only (`HeldLines.tsx`).
- **VS02:** replace `SourceSides.test.tsx` with `Sources.test.tsx`, `Walkthrough.test.tsx`.
- **X72, X77 to X80, X82 to X85, X94 to X97, X99, X100, X102, X104, X04, X13, X23, X25, X26, X30, X53, X57, X71, X73 to X76, X86 to X93:** nothing stale. Done in unit and Python tests; the only thing left is the owner's browser run.

### Work left, in batches
**Setup (about 3 days)**
- X09 one entry point (M)
- X11 one vocabulary after D1 (M)
- X69 link the source mail; the "Send 2 to-dos" lines (M)
- X101 folders while adding (M)
- Y01, VS02 "Set separately", phone People (S+S)
- VS03 compare the rest (S)
- Y07-1, 2, 5, 8, 9, 10, 12 (7 x S)
- X05 test (S)

**Today and work (about 5 days)**
- X60 hide Start while no AI (S)
- X64, VC07, Y09-4 warn tone (S), then measure and fix the lag (M)
- X63 unknown-page view (M)
- X65 test (S)
- X87 and X78 What changed counts and twins (S+S)
- VS07 time groups and "×N" (M)
- VS09 Follow-ups filters and style drawer (M)
- VS10 Done tab after D6 (M)
- VS05 system-line icon (S)
- X59 next steps and clipped week (M)
- Y08-2, 4, 6, 7, 9 (M+S+S+M+S)
- Y09-1, 5, 6, 7, 8, 10, 11, 13 (8 x S)
- X44 scan (S)

**Settings (about 2 days)**
- VS17 spacing (S), VP03 labels (S)
- Y10-F25, 26, 27, 28, 33, 35 (6 x S), F29 (M), F31 (S), F34 after D10

**Records (about 3 days)**
- X43, VS12, Y05, Y11-21 empty columns (M, once)
- VS14 Files drop zone (S) and Knowledge add rows (M)
- VS16 Handover pill, time, Check now (M)
- Y11-22, 23, 24 (3 x S)
- Y11-20 Handled by account (M)

**Schedule (about 1.5 days)**
- Y08-3, 5 (S+M)
- Y11-18, 19 (S+M)

**Shell and visual (about 4 days)**
- VC01 held lines icon (S)
- VC02 one Back or crumb (M)
- VP01, VP04 widen the edge and filled-button checks (S+S)
- VP07 Schedule and Connections states (M)
- VP09 motion (M, after D7), VP10 keyboard walk (M), VP15 baseline (M, after D8)
- VP16 product file (S), VP17 Welcome and Done marks (S)
- Phase I (not in these batches): `cockpit.db` and `.cockpit/` rename, the app icon, the upgrade test for an old-name folder

### Decisions needed
- **D1 (X11), privacy words.**
  - (a) One scale "Open / Confidential / Private" everywhere, with Hand-in's "Normal" becoming "Open", and setup's Allow / "Not my private mail" becoming a plain yes or no that sets the level.
  - (b) Keep two scales, one for an AI account and one for a record, and show them in different places only.
- **D2 (VC11, VS01), the check disc and "Done" checklist on the AI step.** (a) Add a disc to `RadioCard`. (b) Keep the ring and tint, as built, and edit the mockup. The builder chose (b).
- **D3 (VS05), "Open both" on a clash.** (a) Build a page that shows both meetings. (b) Keep the first meeting as the button and the second in the menu.
- **D4 (X59), a period chooser.** (a) Add it, with a comparison "against the 4 before". (b) Keep the setting `days`.
- **D5 (VS08), "Group by".** (a) A dropdown. (b) Keep three labelled buttons.
- **D6 (VS10), a Done tab.** (a) Build a list of finished to-dos. (b) Leave finished work to What changed.
- **D7 (VP09, VP17), motion.** Which things move: the mark at first launch and at the end of setup only, or more.
- **D8 (VP15), a screenshot baseline in CI.** (a) Six screens at two widths. (b) Keep captures manual.
- **D9 (Y08-2), search over mail and notes.** (a) Include them. (b) Keep search to the person's own records.
- **D10 (Y10-F34), an add-on's steps and restarts.** It is the plugin API's. (a) Ask for a no-restart install. (b) Keep it and say so on the page.

# Tracking: full sweep at `04ffc21e`

One row per master item in `README.md`. The host fills in **Status**, **Commit** and **Test**. The reviewer fills in **Checked** on the re-sweep.

**Status values:** To do · In progress · Fixed · Deferred (owner) · Won't fix (owner).
- "Deferred" and "Won't fix" need the owner's yes, recorded in `docs/project/`, with its file and date given in the Status column.
- A row is only closed when the reviewer writes ✓ in **Checked**.

Where **Done when** is blank, the README's Fix for that item is the bar: a browser test that reproduces the original problem and passes after the fix.

| ID | Sev | Area | Title | Sources | Done when | Status | Commit | Test | Checked |
|---|---|---|---|---|---|---|---|---|---|
| X01 | P0 | Data and trust | Quick changes are silently lost | T-P0-1, S-P0-1 | three edits within a second, on any settings page and on the side boxes, all persist after a reload (guard 4). | Fixed (X01's Settings-page loss didn't reproduce in 20 browser runs; the reproduced loss was in saves that read settings first) | b3d4e0a | Walkthrough.test.tsx (quick ticks), MessageStyle.test.tsx, e2e/quick-edits.spec.ts (guard) | |
| X02 | P0 | Data and trust | Setup can't be left while a step is missing | S-P0-3 | the skip-everything journey reloads Today three times and stays there. | Fixed (owner's yes, 2026-10-28: never a forced return) | 65eadc1 | tests/test_walkthrough.py, Walkthrough.test.tsx (#today), e2e/journeys.spec.ts | |
| X03 | P0 | Data and trust | "Paste a list" saves junk as people, and setup can't remove anyone | S-P0-2; also B-F41 and S-P2-15 | a test pastes those lines and gets two people with relations, and no junk. | Fixed (the add row and POST /people don't apply the rule yet) | 65eadc1 | tests/test_people_suggestions.py, Walkthrough.test.tsx | |
| X04 | P0 | Data and trust | Backups has no backup folder, no Back up now and no restore | T-P0-2, T-P2-9 | a journey sets a folder in Settings, backs up, restores, and sees the result on screen. | Fixed (restore to a moment is designed, not built, and the page says so) | 65eadc1 | tests/test_backups_view.py, BackupsPanel.test.tsx, Settings.test.tsx | |
| X05 | P0 | Data and trust | "Choose what to read" makes duplicate sources that multiply items | T-P1-13 | adding the same folder twice is refused, and a nonsense folder is refused with a plain reason. | Fixed (existing twins aren't merged; the folder box is still typed, see notes) | b3d4e0a | tests/test_source_folders_once.py, e2e/journeys-mail.spec.ts J2c | |
| X06 | P0 | Data and trust | An unsent to-do shows as "Sent today", and settles its own follow-up | D-P1-3 | a test makes a to-do for someone else and checks it is under To send only, until Mark sent moves it. | Fixed (design 6.33: an untold to-do is only to send; a promise is never to send) | b3d4e0a | tests/test_untold_todo_one_state.py | |
| X07 | P1 | Setup | "Your promises" says nothing was found when something was | S-P1-1, D-P2-19, S-P2-11, S-P2-12 |  | Fixed | 78f7758 | tests/test_first_promises.py, Walkthrough.test.tsx | |
| X08 | P1 | Setup | A mailbox, calendar or folder is added without a check, then fails with the wrong reason | S-P1-2, T-P1-14 |  | Fixed (an unreachable host is refused, not added: offline can't be told apart from a wrong name) | 78f7758 | tests/test_source_trial.py, Sources.test.tsx, Walkthrough.test.tsx | |
| X09 | P1 | Setup | "Another mail or calendar" and "Add a connection" read like an admin console | S-P1-3, S-P1-4, D-P1-23, T-P2-15, T-P2-11 |  | Fixed (existing connections keep their old names) | 78f7758 | Sources.test.tsx, Walkthrough.test.tsx | |
| X10 | P1 | Setup | The AI choices: broken wording, model names, dead-ends | S-P1-5, S-P1-6, S-P1-16, T-P1-6, T-P1-7, T-P1-10, D-P2-22, B-F46, T-P2-13, T-P2-14 |  | Fixed (the model picker stays under Settings › Advanced, as design 6.20 and 7.8 say) | 78f7758 | WelcomeAi.test.tsx (no model name guard) | |
| X11 | P1 | Setup | Privacy is asked twice, in three vocabularies | S-P1-7, T-P1-16 |  | Fixed (one vocabulary: Open, Confidential, Private) | 78f7758 | WelcomeAi.test.tsx, Sources.test.tsx | |
| X12 | P1 | Setup | A reload loses typed setup answers | S-P1-8, B-F40 |  | Fixed (a pasted AI key is never kept in the browser) | 65eadc1 | Walkthrough.test.tsx, WelcomeAi.test.tsx (reload tests) | |
| X13 | P1 | Setup | Getting back to setup, and its counts | S-P1-9, S-P1-10, S-P1-11, D-P2-1, S-P2-19, plus the Settings sweep's note "outside my area" |  | Fixed (the setup line is the way back; Open the setup guide stays on Settings › You) | 65eadc1 | SetupLine.test.tsx, tests/test_credential_expiry.py, tests/test_follow_up_lines.py | |
| X14 | P1 | Setup | Done and the setup checklist claim false things | S-P1-15, D-P1-15, B-F51, S-P2-12 |  | Fixed | 65eadc1 | tests/test_walkthrough.py, Walkthrough.test.tsx | |
| X15 | P1 | Setup | Business and job editing in setup | S-P1-12, S-P1-13, B-F41 |  | Fixed (ticking a project into a group didn't reproduce; guarded) | 78f7758 | Walkthrough.test.tsx | |
| X16 | P1 | Setup | Time zone | S-P1-14, T-P1-1, T-P2-2 | with the browser in UTC and the setting on Los Angeles, every screen shows the same time. | Fixed (every moment on the person's clock; a guard fails any screen that formats time itself) | 78f7758 | lib/clock-guard.test.ts, tests/test_api.py | |
| X17 | P1 | Setup | The AI is marked untested after a harmless change | T-P1-8 |  | Fixed | 65eadc1 | tests/test_provider_safety.py, tests/test_routes.py | |
| X18 | P1 | Today and reviews | The side filter has no effect | B-F01 | guard 4's side test passes. | To do | | | |
| X19 | P1 | Today and reviews | Reviews: rejected items stay, drafts aren't shown, and Undo leaves the list out of step | B-F04, B-F06, B-F08, B-F09, D-P1-26, D-P2-25 |  | To do | | | |
| X20 | P1 | Today and reviews | "Move them?" asks once per side, and only Today warns | B-F03, B-F14 |  | To do | | | |
| X21 | P1 | Today and reviews | Asked to identify the person's own mailbox name, once per email | D-P1-28, B-F05 |  | To do | | | |
| X22 | P1 | Today and reviews | A question line repeats itself and is recorded as a note | D-P1-8 |  | To do | | | |
| X23 | P1 | Today and reviews | The brief: counts, repeats, timing and the weekly message | D-P1-27, D-P2-26, B-F10 (part), B-F11, B-F13, B-F16, B-F17 |  | To do | | | |
| X24 | P1 | Today and reviews | The clash line | B-F10, D-P1-29 |  | To do | | | |
| X25 | P1 | Today and reviews | Today's count rises from the person's own actions, and counts disagree | B-F52, D-P2-27, B-F48 |  | To do | | | |
| X26 | P1 | Today and reviews | "Reginald is on it" while nothing runs | D-P1-12 |  | To do | | | |
| X27 | P1 | Today and reviews | The header search doesn't search, and the Ask pane squeezes Today | D-P1-2, D-P1-24, B-F25, D-P2-20 |  | To do | | | |
| X28 | P1 | Today and reviews | Came in rows don't open | B-F24 |  | To do | | | |
| X29 | P1 | What changed, Handled for you, Follow-ups | What changed is flooded, and shows wrong states | B-F18, B-F19, B-F22, B-F45 |  | To do | | | |
| X30 | P1 | What changed, Handled for you, Follow-ups | Handled for you contradicts itself | D-P1-19, B-F23, D-P2-8, B-F35, D-P2-7 |  | To do | | | |
| X31 | P1 | What changed, Handled for you, Follow-ups | Follow-ups lists the person's own to-dos, and its empty state is wrong | D-P1-20, D-P2-9, B-F36, B-F26 |  | To do | | | |
| X32 | P1 | What changed, Handled for you, Follow-ups | Outgoing messages use office wording and raw dates | D-P1-9 | guard 4 covers outward message text. | Fixed | 6620056 | e2e/internals.spec.ts | |
| X33 | P1 | To-dos and record pages | The to-do page and to-do editing | D-P1-7, D-P1-11, D-P2-10, B-F15, B-F27, B-F28 |  | To do | | | |
| X34 | P1 | To-dos and record pages | A long to-do fails with no reason | D-P1-10 |  | To do | | | |
| X35 | P1 | To-dos and record pages | Reassigning makes the other person "promise" it and queues a send | D-P1-21 |  | To do | | | |
| X36 | P1 | To-dos and record pages | Hand-added to-dos are missing from the Personal page | D-P1-6 |  | To do | | | |
| X37 | P1 | To-dos and record pages | Record pages show internal field names and raw values | D-P2-11, B-F29, B-F20 (part), B-F21 |  | Fixed (bookkeeping rows fold under Details in batch 6) | 6620056 | RecordPageReads.test.tsx, e2e/internals.spec.ts | |
| X38 | P1 | To-dos and record pages | Internal ids, JSON, raw dates and file names on screen | D-P1-1, B-F02, B-F07, B-F21, T-P1-25, D-P1-7 (dates), D-P1-18 (dates), plus `appendix/auto-checks.md` | guard 4's internals check is clean on every screen and message. | Fixed | 6620056 | e2e/internals.spec.ts, lib/internals-scan.test.ts | |
| X39 | P1 | To-dos and record pages | Notes can't be found | B-F43 |  | To do | | | |
| X40 | P1 | People, organizations, projects, business | People can't be given contact details or sides, and get work questions | D-P1-4, D-P1-5, B-F30, B-F49, B-F50 (part), D-P2-13, D-P2-14 |  | To do | | | |
| X41 | P1 | People, organizations, projects, business | The business has two pages | B-F31 |  | To do | | | |
| X42 | P1 | People, organizations, projects, business | No "Add a business" or "Add a job" in Settings, and removal is limited | B-F12, T-P1-18 |  | To do | | | |
| X43 | P1 | People, organizations, projects, business | The Projects screen and project form | D-P1-16, B-F32, B-F33, B-F34, B-F37, B-F38 |  | To do | | | |
| X44 | P1 | People, organizations, projects, business | Work words on a personal-only workspace | D-P1-30, D-P1-29 (part), B-F47 |  | To do | | | |
| X45 | P1 | Schedule, Files, Knowledge | The Schedule | D-P1-17, D-P1-18, B-F20, B-F44, D-P2-2, D-P2-4, D-P2-5, D-P2-6 |  | To do | 500d7b11 (part: move and cancel; the rest of the Schedule is open) | tests/test_own_event_changes.py, CalendarOwnEntry.test.tsx, ScheduleViews.test.tsx | |
| X46 | P1 | Schedule, Files, Knowledge | Files | D-P1-13, D-P1-14, B-F42 |  | To do | | | |
| X47 | P1 | Schedule, Files, Knowledge | Small changes need a restart, and the warning is alarming | D-P1-22, T-P2-4, D-P2-21 |  | To do | | | |
| X48 | P1 | Settings and admin screens | Appearance changes need a reload, and the theme is set in two places | T-P1-2, T-P2-7, T-P2-6 (part) |  | To do | | | |
| X49 | P1 | Settings and admin screens | Validation and save messages show raw values | T-P1-3, T-P1-4 |  | Fixed | 6620056 | tests/test_plain_errors.py, Settings.test.tsx | |
| X50 | P1 | Settings and admin screens | Reminder destinations dead-end | T-P1-5 |  | To do | | | |
| X51 | P1 | Settings and admin screens | Compare › Measure | T-P1-9 |  | To do | | | |
| X52 | P1 | Settings and admin screens | Add-ons: one add-on with three names, and no Remove | T-P1-11, T-P1-12, T-P2-16, T-P2-17 |  | To do | | | |
| X53 | P1 | Settings and admin screens | Sign out has no confirm, and stale states follow | T-P1-15 |  | To do | | | |
| X54 | P1 | Settings and admin screens | Quick links aren't where the page says | T-P1-17 |  | To do | | | |
| X55 | P1 | Settings and admin screens | Settings search misses the words beginners use | T-P1-19 |  | To do | | | |
| X56 | P1 | Settings and admin screens | The logo and accent colour need expert input | T-P1-20 |  | To do | | | |
| X57 | P1 | Settings and admin screens | Phone layout in Settings | T-P1-21, T-P2-26 |  | To do | | | |
| X58 | P1 | Settings and admin screens | The backup key and synced folder accept bad input | T-P1-23, T-P1-24, T-P2-10, T-P2-11, S-P2-14 |  | To do | | | |
| X59 | P1 | Settings and admin screens | "How Reginald is doing" points to a setting that doesn't exist, and is mostly empty | T-P1-22, D-P2-16 |  | To do | | | |
| X60 | P1 | Settings and admin screens | A skipped install dead-ends | T-P1-26, T-P2-28, D-P2-3, S-P2-18 |  | To do | | | |
| X61 | P1 | Settings and admin screens | Feedback and help | D-P1-25, T-P2-23 |  | To do | | | |
| X62 | P1 | Settings and admin screens | The user menu and the phone tabs | D-P2-23, D-P2-24 |  | To do | | | |
| X63 | P1 | Settings and admin screens | Pages with no way back, and silent fallbacks | T-P2-24, T-P2-25, D-P2-17, T-P2-1 |  | To do | | | |
| X64 | P1 | Settings and admin screens | Toasts stack and get in the way | T-P2-8, D-P2-14 (part), S-P2-17 |  | To do | | | |
| X65 | P1 | Settings and admin screens | "Since yesterday" and the "changed" line | D-P2-29, B-F39, plus the validate-82d24cc note H1 |  | To do | | | |
| Y01 | P2 | Polish | Setup polish | S-P2-1 to 11, 13, 16, 19; D-P2-1 |  | To do | | | |
| Y02 | P2 | Polish | Setup People polish | S-P2-15, B-F41 |  | To do | | | |
| Y03 | P2 | Polish | Settings polish | T-P2-3, 5, 9, 12, 13, 14, 18–22, 27; B-F50, B-F53 |  | To do | | | |
| Y04 | P2 | Polish | Empty states and small screens | D-P2-12, D-P2-15, D-P2-18, D-P2-28, T-P2-1 |  | To do | | | |
| Y05 | P2 | Polish | People page polish | D-P2-13, B-F49, B-F50 |  | To do | | | |
| Y06 | P2 | Polish | Restart and status wording | T-P2-4, D-P2-21, S-P2-18 |  | To do | | | |


## Visual review (visual/README.md)

One row per shared component (VC) and per screen (VS). Seen at `04ffc21e`. Fold each VS row into the batch touching its master X ids.

| ID | Sev | Area | Title | Sources | Done when | Status | Commit | Test | Checked |
|---|---|---|---|---|---|---|---|---|---|
| VC01 | Visual | Shared component | Row | V2-1, V2-14, V2-18, V2-27, V1-8, V3-1, V3-2 | Built in web/src/ui and used on every screen; shown in the style guide in both themes | Fixed (29 expandable lines take the same measures; moved onto Row in V2) | 555e322 | e2e/guards.spec.ts, layout.spec.ts | |
| VC02 | Visual | Shared component | PageHeader and filter bar | V2-3, V2-7, V2-9, V2-11, V2-24, V3-18, V3-20 | Built in web/src/ui and used on every screen; shown in the style guide in both themes | Fixed | 555e322 | e2e/guards.spec.ts | |
| VC03 | Visual | Shared component | Button | V1-2, V2-4, V2-15, V3-12, V3-17 | Built in web/src/ui and used on every screen; shown in the style guide in both themes | Fixed (row actions never filled) | 555e322 | e2e/guards.spec.ts (one primary per region) | |
| VC04 | Visual | Shared component | EmptyState | V2-12, V3-5, V3-9, V3-10, V3-15, V3-21, V3-32, V3-33, V1-19 | Built in web/src/ui and used on every screen; shown in the style guide in both themes | Fixed | 555e322 | e2e/guards.spec.ts | |
| VC05 | Visual | Shared component | FormField, Select, DateField, FileDrop, CheckboxGroup | V1-1, V1-4, V1-13, V1-17, V2-5, V2-16, V3-11, V3-23, V3-24, V3-25, V3-27 | Built in web/src/ui and used on every screen; shown in the style guide in both themes | To do | | | |
| VC06 | Visual | Shared component | The overlay family | V1-9, V1-11, V1-12, V1-24, V1-26, V1-27, V2-13, V2-23, V3-22 | Built in web/src/ui and used on every screen; shown in the style guide in both themes | To do | | | |
| VC07 | Visual | Shared component | Toast | V1-28, V2-26, V3-29 | Built in web/src/ui and used on every screen; shown in the style guide in both themes | To do | | | |
| VC08 | Visual | Shared component | Link and type tokens | V1-13, V1-14, V2-17, V2-25, V3-16, V3-31 | Built in web/src/ui and used on every screen; shown in the style guide in both themes | Fixed | 555e322 | e2e/guards.spec.ts (no text under 13px), theme/dayMode.test.ts | |
| VC09 | Visual | Shared component | Dark-mode accents and elevation | V1-25, V2-28, V3-30 | Built in web/src/ui and used on every screen; shown in the style guide in both themes | To do | | | |
| VC10 | Visual | Shared component | Record-page parts | V3-6, V3-7, V3-19 | Built in web/src/ui and used on every screen; shown in the style guide in both themes | To do | | | |
| VC11 | Visual | Shared component | RadioCard / choice card | V1-3, V1-4 | Built in web/src/ui and used on every screen; shown in the style guide in both themes | To do | | | |
| VC12 | Visual | Shared component | Wizard shell and StepFooter | V1-2, V1-5, V1-6, V1-20, V1-21 | Built in web/src/ui and used on every screen; shown in the style guide in both themes | To do | | | |
| VC13 | Visual | Shared component | Header status | V1-22, V1-23, V2-3 | Built in web/src/ui and used on every screen; shown in the style guide in both themes | To do | | | |
| VS01 | Visual | Setup: Your AI account | Follow the `setup-ai` mockup: three top cards, a 3-step checklist panel, privacy as two choice cards, the spend line as one row | V1-3, V1-4, V1-5 (masters X10, X11) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS02 | Visual | Setup: Mail and calendar | A provider list with one Connect per row. Sides as one chip group with "Set separately". Another mail as a modal with only the chosen kind's | V1-1, V1-15, V1-16, V1-17 (masters X01, X08, X09) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS03 | Visual | Setup: What it's for, Promises, Backups, People, Done | The warning banner under "A job". Promises as a list of sources plus a summary strip. A folder chooser with breadcrumbs and New folder. Peop | V1-7, V1-8, V1-18, V1-19, V1-20 (masters X03, X07, X14, X15, X58) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS04 | Visual | Header, menus, Ask, Hand in, feedback, shortcuts | A command-palette search with a fixed width. The user menu: profile, quality link, appearance. Shortcuts in two grouped columns with real ke | V1-9, V1-10, V1-11, V1-12, V1-24, V1-26 (masters X27, X61, X62) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS05 | Visual | Today | Follow the `today` mockup: group headers with counts, the opened line as an inset card with one primary and "Not right" links, the brief as  | V2-1, V2-2, V2-3, V2-4 (masters X18–X28) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS06 | Visual | Schedule | A 64px hour gutter with no clipped labels. Entries at least 28px tall. Opens scrolled to now. A now-dot. A two-row toolbar. Month cells whit | V2-6, V2-7, V2-13, V2-19, V2-20, V2-21, V2-22, V2-28 (masters X45) | Screen re-scores at least 3.5, no point below 3 | Fixed (built to the row and findings; no mockup, so the re-score is the main session's) | | web/src/components/ScheduleReview.test.tsx (two-row toolbar, no key sentence, keys in the shortcuts list), e2e/schedule.spec.ts ("keeps to the review", "month's cells are white") | |
| VS07 | Visual | What changed, Since yesterday | Group by time. Collapse identical runs ("×4"). Learning shown as a muted line in its row. No inner card in the pane | V2-8, V2-24 (masters X29, X65) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS08 | Visual | Handled for you | Tabs with counts, a 280px search with an icon, "Group by" as a dropdown, one-line rows | V2-11 (masters X30) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS09 | Visual | Follow-ups | The status tabs as the only tabs. One "Copy message". "You" as a link row. Message style in a drawer | V2-9 (masters X31) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS10 | Visual | To-dos and questions | Follow the `todos` mockup: a round checkbox, one meta line, an inline add row, filter chips, a sectioned menu with Drop in red, one editor a | V2-5, V2-10 (masters X33) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS11 | Visual | Stages | An EmptyState that says what a stage is | V2-12 (masters Y04) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS12 | Visual | Projects, a side's page, Add a project | Hide columns that are empty for every row. Size columns by content. Sides as group headers. Short drawer, with "More details" folded | V3-4, V3-5, V3-23 (masters X43) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS13 | Visual | People, person, organization and record pages | Follow the `person` mockup: PageHeader, overview tabs, a sticky details panel, a timeline, the composer at the bottom | V3-6, V3-7, V3-19, V3-20, V3-22, V3-34 (masters X37, X40, X41) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS14 | Visual | Files, Knowledge, Rules to look over | A drop-zone empty state. Knowledge as panels with inline add rows | V3-9, V3-10 (masters X39, X46) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS15 | Visual | How Reginald is doing | Follow the `quality` mockup: 4 stat tiles, a weekly table, a "mistakes to look at" list, your own count as a small card, empty sections in o | V3-8 (masters X59) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS16 | Visual | Handover | An EmptyState with an "In sync" pill, the last sync time and Check now | V3-15 (masters X63) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS17 | Visual | Settings shell and sections | A grouped Settings menu (You / Assistant / Your data / More), with add-on pages under Add-ons. Setting rows that stack on a phone. One synce | V3-3, V3-12, V3-13, V3-26, V3-27, V3-28, V3-32, V3-33 (masters X51, X54, X57, X58, Y03) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS18 | Visual | Settings › Connections | Follow the `connections` mockup: an account card with a status pill and a sources table. Adding is a two-step drawer | V3-1, V3-2, V3-11 (masters X09, X53) | Screen re-scores at least 3.5, no point below 3 | To do | | | |
| VS19 | Visual | Settings › Add-ons | Each card: name, publisher, one line, status pill, one action. Details in a disclosure | V3-14 (masters X52) | Screen re-scores at least 3.5, no point below 3 | To do | | | |

## Path to 4.6 (visual/PATH-TO-4.6.md)

Stage B items gate E13 (4.0); stage C items gate E14 (4.6). None block the current round.

| ID | Sev | Area | Title | Sources | Done when | Status | Commit | Test | Checked |
|---|---|---|---|---|---|---|---|---|---|
| VP01 | Visual B | Shared | One content grid | PATH-TO-4.6 §4 | Title, filters, primary, list, cards and setup footer share two edges via a content-max token | To do | | | |
| VP02 | Visual B | Shared | Row anatomy v2 | PATH-TO-4.6 §4 | Fixed lead slot, titles share one edge, two row heights, 2-line title clamp, owner only when not you, questions not tickable | To do | | | |
| VP03 | Visual B | Shared | Type scale v2 | PATH-TO-4.6 §4 | 24/16/15/13 steps, meta in text-muted, 11px uppercase group labels, 12px only for pills and column headers | To do | | | |
| VP04 | Visual B | Shared | Primary discipline | PATH-TO-4.6 §4 | At most one filled button per viewport; two secondary styles; Today's review folded by default | To do | | | |
| VP05 | Visual B | Shared | Status and state rows | PATH-TO-4.6 §4 | One dot-plus-word status; warn/danger rows with edge and tint; colour never alone; header status agrees with connections | To do | 500d7b11 (part: the header and logic; the look is V2's) | status.test.ts, StatusMenu.test.tsx, SyncPanel.test.tsx |  |
| VP06 | Visual B | Shared | Night elevation and focus | PATH-TO-4.6 §4 | Surface lifts off canvas by night; focus ring at least 3:1 on every surface incl. tinted rows | To do | | | |
| VP07 | Visual B | Shared | State sheet per screen | PATH-TO-4.6 §4 | First run, filtered empty, skeleton loading without shift, error, offline, conflict, 0/1/100+ for every inventory screen | To do | | | |
| VP08 | Visual B | Shared | Phone shell | PATH-TO-4.6 §4 | 56px tab bar with icons and active state, header icons, rows stack actions at 480px and under, filters in one sheet | To do | | | |
| VP09 | Visual C | Shared | Interaction and motion | PATH-TO-4.6 §4 | Hover, pressed, reveal, tick-and-undo, expand, overlay timings per PATH section 4, all via --dur-* tokens | To do | | | |
| VP10 | Visual C | Shared | Keyboard | PATH-TO-4.6 §4 | / j k x e Enter Esc work on every list; focus returns to the trigger; shown in tooltips and the ? sheet | To do | | | |
| VP11 | Visual C | Shared | Content resilience | PATH-TO-4.6 §4 | Long names, emails, paths, 40+ rows, 99+ counts, longer text; fixtures added to both fictional workspaces | To do | | | |
| VP12 | Visual C | Shared | In-between widths | PATH-TO-4.6 §4 | Checked at 1024 and 768; rail drops under 1100; menu folds under 900; no sideways scroll 360–1920 | To do | | | |
| VP13 | Visual C | Shared | Hit targets | PATH-TO-4.6 §4 | 24px visible / 44px touch, 32px desktop, 8px apart | To do | | | |
| VP14 | Visual B, C | Shared | Mockups v2 then v3 (reviewer) | PATH-TO-4.6 §4 | v2 re-scored cold at 4.0 or more with phone and state sheets; v3 at 4.6 with interaction recordings | To do | | | |
| VP15 | Visual C | Shared | Design QA in the build | PATH-TO-4.6 §4 | Before/after captures per UI batch; screenshot comparisons in CI on every inventory screen; style guide shows every state | To do | | | |

## Exit criteria (README section 3, plus visual E9–E12, then E13–E14 for the path to 4.6)

| # | Criterion | Status | Evidence | Checked |
|---|---|---|---|---|
| E1 | Every P0 (X01–X06) fixed, each with a browser test that fails before and passes after | To do | | |
| E2 | Every P1 (X07–X65) fixed, or deferred in writing by the owner | To do | | |
| E3 | P2 groups (Y01–Y06) fixed or moved to the backlog with the owner's OK | To do | | |
| E4 | Guards in CI on every screen in the inventory, at 1440 and 390, day and night: no internals; no sideways scroll, unnamed buttons or console errors; saves never race; Today once, no rise, side-correct; no work words on personal only | To do | | |
| E5 | Three journeys from a fresh install: A own life; B personal + job + business with one mailbox for two sides and a business added then removed; skip everything | To do | | |
| E6 | Fresh captures of every inventory screen, empty and with data, at 1440 and 390, day and night, with an index | To do | | |
| E7 | A hand-over listing every X and Y id with status, commit and test, and anything built differently, with why | To do | | |
| E8 | Reviewer re-sweep with the same four-area method: no P0, no new or reopened P1, and a coverage row for every inventory screen | To do | | |
| E9 | Every inventory screen re-scores at least 3.5 overall, no point below 3, day, night and phone (same 8-point rubric) | To do | | |
| E10 | VC01–VC13 built as shared components or tokens and used everywhere; the style guide shows each in both themes | To do | | |
| E11 | The six mockup screens built to their mockup (or an owner-approved variant), shown side by side in the hand-over | To do | | |
| E12 | Visual guards in CI: no native unstyled fieldset/select/date/time/file; no paragraph under 13px; no autofocus on page load; at most one solid primary per region; no empty leading column in a row | To do | | |
| E13 | Stage B: every inventory screen at least 4.0 overall, no point below 3.5, from day, night, phone and state-sheet captures; VP01–VP08 done; mockups v2 at 4.0 or more, built | To do | | |
| E14 | Stage C: every inventory screen at least 4.6 overall, no point below 4.3, by the PATH-TO-4.6 §6 method (fixed captures and recordings, two reviewers, lower counts, owner signs off); VP09–VP13 and VP15 done; mockups v3 built; CI screenshot comparisons pass | To do | | |

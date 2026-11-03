# States on every list screen and the phone shell against the 4.6 mockups (step 5)

Build: the `v5` work on commit 878fa73. Mockups: the `*-states` pages (`today-states`, `todos-states`, `person-states`, `quality-states`) and the
"Phone (VP08)" part of `m46.css` with the passes after it, in `reviews/ui-ux-2026-10/mockups-46/`. The capture tool was run once
(`today,todos,person,quality --with-states --sizes 390-day,1024-day`, 93 pictures, 39 side by side, in 426 s). Each line here comes from the
code and the named test; the two pictures looked at by eye (the to-dos at 390 and the to-dos offline at 390) show the new bar, the header
search icon, the side button and the banner as built. The capture's difference list was not worked through line by line.

Change log: section 319. Tracking rows: VP07, VP08, VP11, VP12, VP13, VC04, VC06, Y04 (VS14 not touched).

## Fixed

| Where | Difference found | What was done |
|---|---|---|
| every list screen | Loading was a skeleton of plain bars; a failure was an alert-iconed empty state, and People and Projects had none | One `ListState` (`web/src/ui/ListState.tsx`) on To-dos, Follow-ups, What changed, Handled, People, Projects, Files, Notes and Today's queue: skeleton rows with a lead circle at row height, `LoadFailed` with the reason and Try again, and a list that loaded stays readable when a refresh fails. Knowledge and a record's page already used `LoadFailed`; the record page now shows the server's detail too |
| every screen | No state for the app not reaching its server (the status chip and a Today line only) | `OfflineBanner` at the top of the content on every screen, from `lib/connection.tsx` (the event stream and the browser's online events): the words, when it last heard, "reconnects by itself", Try now; gone when the connection is back. A failed list under it says "The app can't reach its server." |
| To-dos add row, a person's form, a record's details | A failed save was a toast, or a note behind the form | `NotSaved`: "Not saved", the reason, "your change is kept here until it saves", Try again; the words stay in the box |
| a record's details | A field the person edited that was also changed elsewhere was kept silently | `ChangedElsewhere`: old → new and what they typed, Keep mine or Use the new one |
| every filter | "Nothing for …" with no way out | `FilteredEmpty`: the filter named and Clear filter (the side filter on Today, To-dos, Follow-ups, What changed, Handled, People, Files, Notes; the to-dos' own filters; People's organization; Handled's search) |
| Today | A failing account was a pill after the words | A state row (`Row state`, `StateMark`): the warning edge and tint, an icon and "Connection not read" |
| counts | Whole numbers in pills | "99+" in group labels, tabs, segmented choices and the menu; the exact number stays in the accessible name |
| the bottom bar | Today · Work · + · Search · More | Today · To-dos · tonal + · Schedule · More, 24px icons, the + at 48px with no raise; Search is a header icon on a phone |
| More | Records and Settings, Help, theme, spacing | Sections: the work screens, the saved items and Settings, Help, theme, spacing |
| the side filter | A strip, or a native-style list on a phone | One button in the page header ("Side: Northwind Clinic") and a sheet; also under 1100px, where the strip took several rows |
| hit targets | 24px floor, 32px icon buttons, 40px row buttons, 18px circles | `--hit-min` and `--hit-icon` (44px on a coarse pointer): buttons, icon buttons, the round check, check boxes and radios, the link button, the chip's remove; the drawn shapes keep their size |
| Settings at 1024 | The list of sections beside the page until 720px | Folds into the picker and the page takes the width under 1100px |
| rail rows | A constant of 3 | `ui.today.rail_rows` (1 to 10) read by both cards of the rail |
| the add row | A date had to go in the Add form | A date at the end of the title is found by rules, shown before Enter and droppable (the day is the server's reading) |
| times | The computer's locale, every 15 minutes | `ui.time_format` (`auto`, `12h`, `24h`) and `ui.time_step` (minutes) |
| setup key | Clicking the model list after a paste started a second check that replaced the list | A check runs only when the key text changed since the last one |
| setup mail | Continue in the body | Continue in the footer on the column's edge, shown once something is connected |

Specs that asserted the old behavior and were changed: `web/src/shell/BottomBar.test.tsx`, `web/src/shell/Header.test.tsx`,
`web/src/components/FollowUps.test.tsx` (the held-back message's alert), `web/src/components/Walkthrough.test.tsx` (the mail step's
Continue), `web/src/components/WelcomeAi.test.tsx` (a comment), `tests/test_settings_cut.py` (the count of basic settings, 18 → 21 and
19 → 22), and in the browser tests `web/e2e/shell.spec.ts`, `web/e2e/just-me.spec.ts`, `web/e2e/long-names.spec.ts`,
`web/e2e/journey-helpers.ts` and `web/e2e/acceptance.spec.ts` (the bar's tabs, the side filter's button and sheet, the mail
Continue).

## Left, with the reason

| Where | Difference | Why |
|---|---|---|
| Schedule, Connections | Their states (a failing account's card, the schedule's list on a phone) | Another helper's screens (`Schedule*`, `Sources*`, `SignIns*`, `AccountRow*`); `ScheduleCard.tsx` changed only to read `ui.today.rail_rows` (its import, one hook call and the constant's uses) |
| a to-do's own edit, Today's inline edits | Changed elsewhere shows old → new only on a record's details | The to-do edits (`EditAction`, `EditDetailsOfTodo`) reconcile through their own paths; each needs its own brief |
| other saves | A failed save is "Not saved" on the to-do add row, a person's form and a record's details; a tick, an answer or a rename still shows the toast with Try again | `useAct` now takes a failure handler (`onError`); each screen has to pass one |
| Knowledge | Offline wording on a failed read | Knowledge draws its own `LoadFailed` for two reads and keeps its message; the banner above it says the rest |
| Files | The drop zone and the one-line empty state (VS14) | A new component and a change to the Add dialog; not part of this step |
| Today's mockup | "Changed on your phone just now" for a to-do's due day | Needs the server to say what changed; the event stream says only which kinds of record |
| 18px circles | The ring is still drawn at 18px; the hit area is 44px | As the mockup; the area, not the drawing, is what a thumb meets |
| text links | Links inside a sentence are not 44px | They are text; only controls are raised |
| the Remove buttons | The 68×20 "Remove" buttons were not found one by one | They are raised by the global button rule, `button { min-height: var(--hit-min) }` (`styles.css`), unless a component sets its own `min-height` (two such were changed); the browser check will say if one is left |
| phone mockup details | Filter chips fading at the edge, the status pill's short form, the banner's wrap | Already in place from step 4 or unchanged; not re-measured |

## Not checked

- The browser tests (`web/e2e/states-phone.spec.ts`, added to the layout project) are written and have not been run. They drive a held
  read, a 500, offline, and a refused save on To-dos, Follow-ups, People and a record's page; at 390 they check the bar, the menu's
  place, the 44px targets, the sheet and the sideways scroll; at 1024 the side button, the settings picker and the header.
- The capture tool ran once. Four state drives failed because they looked for the old side strip, the Questions tab as a `tab` and the
  person form's Save button; `web/visual/pages.ts` is fixed for them (and the side filter's own sheet is now driven), and they have not been
  run again.
- The self-check passes; the full Python and web suites were not run (the batch rule). `tests/test_settings_cut.py::test_no_setting_on_a_page_names_a_browser`
  and `web/src/components/BusinessSides.test.tsx` (two tests) fail on `cp1` as well, before this step.

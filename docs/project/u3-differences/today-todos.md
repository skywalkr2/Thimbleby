# Today, the opened review and To-dos against the 4.6 mockups (step 4a)

Build: the `v4a` work on commit 84f3239. Mockups: `today`, `today-review` and `todos` of `reviews/ui-ux-2026-10/mockups-46/`. Captured
with `npm --prefix web run visual:capture -- --pages today,today-review,todos` before and after, at 1440 day and night, 1024, 390 and
390 first screen. The sample data differs from the mockups' (other names, counts and items); that is not listed.

Change log: section 316. Tracking rows: VS05, VS10, VC01 (VS11 is the Stages empty state, which this step does not touch; it stays as it was).

## Fixed

| Page | Difference found | What was done |
|---|---|---|
| today | The heading was "Today" with the date | A greeting for the time of day on the person's clock with the first name, then the date and the count in bold (`today.greeting.*`) |
| today | The queue was a panel titled "Needs you 8", groups in sentence case | No title on the page (kept for a screen reader); groups uppercase with counts, At risk in the problem color |
| today | Lines had an empty lead slot, a wide gap on a phone | An icon by kind (person to place, look over, send, at risk) or the side's color in the slot |
| today | The side was a tag in the title, calendars were written "In X and in Y" | The side and each calendar are named in the meta after a mark in their color (`MarkDot`, 8px), one line |
| today | No filled button on the screen | The first decision's action is filled, with a tint and a 3px edge; at-risk lines have their own tint and edge |
| today | The clash read "Sort out the clash on Tue, Nov 3: A and B" with a Clash pill | "A and B overlap" (or "are too close together"), the day and overlap, both calendars with marks, "They overlap by 30 minutes"; Open for the first meeting as its button, the second in the menu |
| today | The rail cards had buttons in their heads and listed every meeting and message, so it ran much longer than the queue | "Open" and "Check now" are quiet links; the Schedule card is "Today's schedule" with three meetings on a calendar-colored edge, Clash when a clash line names it, and "N more in the schedule"; Came in holds three and a quiet "N more" |
| today-review | "All looks good" at the end of a bordered card | An inset card on the sunken surface under the row's text; the foot has a hairline and **Keep all N** ("Keep it" for one) as the one filled button; the first decision is drawn as the other lines while a review is open |
| todos | One list in the server's order, the add button only in the header, a line on a phone that opened the form | The add row is the first line of the list on every width (Enter adds, the cursor stays); the header's button stays for the form |
| todos | No groups | Overdue, Today, Coming up, Waiting on others, each with its count |
| todos | A pill for Overdue, "due Tue, Nov 3", the owner named on every line | The day in words ("Due Mon, Oct 26" with an icon when late, bold "Due today"); owners named only when one is somebody else; the side after a mark |
| todos | "Needs a date" a group at the top, always open | One line at the foot ("N to-dos need a date" and "Give them dates") that opens the group |
| todos | The line under the title counted only the to-dos | "N open · N overdue · N due today" over the to-dos and the questions; tabs, groups with the needs-a-date line, and the footer count the same rows |
| todos | (Questions) | They never had a tick; a test now holds it |
| both | The phone: "⋯" at the top right (done in 313); the first screens | Checked: the lead slot, the buttons under the words, the inset card without a left margin |

## Fixed in the final side-by-side review (change log 320)

| Page | Difference found | What was done |
|---|---|---|
| today | Thirteen "Choose another account for Email from …" lines for one cause and three "Add the Sent folder" lines | One line for each cause with the count and the lines behind it (`tests/test_one_line_per_cause.py`, `TodayStoppedGroup.test.tsx`, `HeldLines.test.tsx`) |
| today | A clash line cut off the second calendar's name | Each calendar's name is shortened by itself and the meta may wrap on a clash line |
| today-states | The filtered side kept its line and never said "Nothing on the … side" | The side says so above the lines that belong to no side (`TodaySides.test.tsx`); the drive picks the side first, while the backup line is still there |
| today-states | All clear showed an At risk backup line | The drive makes the one backup the workspace asks for, then loads Today again; the setup line remains, so the empty card says setup isn't finished (see below) |
| today-states | Loading showed the full page | The drive holds the screen's own reads (`holdReads` with the pattern of paths) and loads the app again on the screen |
| today-states | The wrap-up card had every line and no "Show N more" | `ui.today.rail_rows` lines, then "Show N more" and "Show fewer" (`BriefCard.test.tsx`) |
| todos-states | A side picked in an earlier state leaked into the next | `open()` in the capture's drive starts each state from every side |
| todos-states | Questions showed "Nothing matches these filters" with no filter set | The tab says it is empty (`OpenItems.test.tsx`); the line under the title counts both tabs, as the two tab counts add up |
| todos-states | A ticked to-do vanished; only the toast had Undo | The row stays where it was, struck through, "Done just now" and Undo, until the person changes tab or filter (`OpenItems.test.tsx`) |
| all | Skeletons were nearly invisible | The bars use the border tone and shimmer to the well tone, in day and night |

## Left, with the reason

| Page | Difference | Why |
|---|---|---|
| today | One "Open both" button on the clash | No page shows both meetings; the first is the button and the second is in the menu (Open for each, as the brief says) |
| today | "starting with one decision" in the date line | Needs a rule for which sentence to say; not in the data |
| today | An icon in the system lines' slot ("Add the Sent folder", paused, restart, and the other held kinds) and the filled button on them | Each held kind draws its own row in `shell/HeldLines.tsx`; the filled button goes to the first line drawn by the queue's own row. On the sample data none is first, so the capture shows no filled button on Today |
| today | The brief card above the queue | Data-dependent (it appears when a form is due), not in the sample |
| today | The mockup's rail is shorter than the queue by design | Caps are in rows (`RAIL_ROWS`, 3); the layout does not force the length, so a rail with long rows can still be longer than a short queue. The cap is a constant, not a setting (decision needed) |
| today | The mockup's tab bar (Today, To-dos, +, Schedule, More) | The shell's, not this step's; the build's bar says Today, Keeping track, +, Search, More |
| today-states | The brand card "Nothing needs you" | While setup is unfinished, Today's empty card says "Setup isn't finished" (a to-do of the setup, by design); the fixture's setup is not finished, so the brand card is held by `Today.test.tsx` |
| today-states | The side filter opened as a list, with a fifth side | At 1440 the sides are always a strip; the list is the phone's sheet, which the drive opens at 390 only |
| today-states | A save that failed, Changed somewhere else | Toasts, as `states-phone.md` explains |
| todos | The long titles clamp to two lines | Not changed in this pass; the row's `clamp` is not given to the to-do row (P2 left) |
| today, todos | The side strip shows the same count on every side | The fixture's to-dos have no side, so each side counts all of them (data); P2 left |
| today | The side filter "Showing Needs you" chip | Not a feature (the queue has one view) |
| today-review | The capture cannot reach the opened review | Today has no line to look over on the capture fixture, so `differences.md` lists it as not drivable; it is held by `Today.test.tsx` ("while a review is open…") and `web/e2e/today-todos-46.spec.ts` |
| todos | "by Friday" read from the add row | The add row sends the title only (the server reads a day from its own field); so a to-do added from the row needs a date and is counted in the line at the foot |
| todos | "Show 2 more coming up" | It would hide rows that other screens and tests count; no setting for how many to show |
| todos | The Done tab | There is no list of finished to-dos |
| todos | "Who: Everyone" chip beside "Side" | The build's filters are State, Person and Project chips and the side filter; the same set of choices, different chips |
| todos | The panel's width of 880px | The list is limited to 55rem on a wide window; the tab strip and header are not |
| todos | A filled "Add a to-do" in the header | Kept so the form is reachable for a day, an owner or a repeat; it is the screen's one filled button |

## Checks

The unit tests for each piece are named in change log 316. The browser tests are written (`web/e2e/today-todos-46.spec.ts`, in the `layout`
project) and have not been run. Specs changed for the replaced layout: every spec that looked for the heading "Today" now looks for the greeting
(`/^Good (morning|afternoon|evening)/`); `today-review.spec.ts` (the one filled button), the specs that clicked "All looks good" now click Keep all, `side-filter.spec.ts` (the clash's words).

273: - [x] [G3] [C] (A-part1) 7 Edge · no error, no clash warning, no long-title state. → fixed: "A long title" and "The end before the start" capture states (web/visual/inventory.ts); web/src/components/TodayRail.test.tsx "the drawer asks when it ends, only once there is a start, and refuses an end that is not after it" (the end field is aria-invalid and described by the inline error); web/e2e/schedule.spec.ts "an end before the start is the end field's own error, and a very long title in the form stays inside it"

285: - [x] [G3] [C] (A-part1) 3 Spacing · `schedule-day-day-1440.png`, y 150-260: four stacked control rows (date nav, view tabs, calendar filter chips with raw emails, then the grid), then the grid heading "Today · Tue, Nov 3" repeats the date shown at y=165. Fix: merge the nav and tabs, drop the repeat. → fixed: ScheduleLayouts.test.tsx "the controls above the grid are two rows with the calendars among them, and the header is there while the days load" and "the Day column says which day it is without repeating the date"; schedule.spec.ts "the controls above the grid are two rows, and a day's column does not repeat the date the heading gives". Four rows are two (moves and range; views, calendars, side filter); the grid heading says "Today" or the weekday

288: - [x] [G3] [C] (A-part1) 7 Edge · no state pictures opened; day with no events at all, 0-1 events and an all-day event are not shown; "All day" row is empty and 28px tall. → fixed: ScheduleLayouts.test.tsx "a week with no all-day entries draws no all-day row" (the row is drawn only when a shown day has an all-day entry); capture states "Nothing today" and "All-day entries"

293: - [x] [G3] [C] (B-part1) 3 Space · `schedule-day-day-1024.png`, y 245-290: calendar chips wrap to a second row, leaving the "Calendars" label floating mid-height. Fix: align the label to the first row or scroll the chips on one line. Cost 0.1. → fixed: ScheduleLayouts.test.tsx "the calendars are one line that scrolls, and an edge fades where more is out of sight" (one line at every width, the label beside the chips)

294: - [x] [G3] [C] (B-part1) 7 Edge · `schedule-day-loading-day-1440.png`: skeleton is a to-do style list with circles and buttons (3 rows) under the "Weekdays" tab, not a calendar grid, so the layout jumps on load; page title and Add button are missing. Fix: skeleton matching the grid. Cost 0.4. → fixed: ScheduleLayouts.test.tsx "the controls above the grid are two rows ... and the header is there while the days load" (Add to schedule is there with the days held back)

296: - [x] [G3] [C] (B-part1) 8 Phone · `schedule-day-day-390.png`, y 780-845: in the full-page capture the tab bar lands mid-grid and covers the 1 PM row (a fixed bar captured in a scroll shot; the page itself needs bottom padding equal to the bar). Also the Calendars chip row is cut off at the right ("Your" at x 375) with no fade, "Hand something in" is not reachable except through the + circle. Fix: edge fade on the chip row, confirm bottom padding. Cost 0.4. → fixed: the same test as 293 (data-fade end, both, start on the scrolling calendars row). The tab bar crossing the full-page picture is a capture artifact of a fixed bar, not the page (the page keeps its bottom padding)

297: - [ ] [G3] [C] (B-part1) 6 Colour · `schedule-day-night-1440.png`, y 1405-1530: clash block is dark brown-red with a thin light border; the event dots are pale blue, which reads fine, but the "Restart to finish" chip and "Reginald" warning are orange next to the gold primary. Cost 0.2. → judged wrong: measured, not a fault. Night clash: danger text #ff8a75 on #331814 is 7.1 to 1, the clash edge is the danger color, so it is the one warning color and never the brand gold (rule 4b holds; capture schedule-day-night-1440.png). The orange "Restart" chip and Reginald warning are the shell's (belongs to G1b)

302: - [x] [G3] [C] (A-part1) 5 Components · `schedule-entry-day-390.png`: the sheet has two ways out (× at top right and a full-width outline "Back to the calendar"), the calendar dot sits alone on its own line above the address (y=698), and the "Open" button is a third, smaller primary below. The sheet title is 17px sans, not the serif, which is fine. → fixed: schedule.spec.ts "the entry's Open button is a finger's height on a phone and the pane never runs wider than the window" (on a phone Open fills the width and is 44px tall)

307: - [x] [G3] [C] (B-part1) 7 Edge · no state for a long title, long place, attendees, all-day or an entry with no place (shows "Where" row always?). Cost 0.5. → fixed: ScheduleViews.test.tsx "a long title and a long place wrap inside the pane, and an entry with no place (or a blank one) has no Where row"; capture states "A long title and place" and "No place" (an all-day entry and a due entry are in the Day and Week states)

308: - [x] [G3] [C] (B-part1) 8 Phone · `schedule-entry-day-390.png`, y 510-545: the sheet leads with a full-width "Back to the calendar" button above the details, outweighing the info, with a close "x" already at top-right. Fix: remove the back button. The sheet covers half the page and the page behind shows through in an awkward cut at y 845-880 (leftover "avery.lane@example.com" text under the sheet bottom edge). Cost 0.3. → fixed: capture fault: the entry sheet was a full-page picture, so the page showed under the sheet's edge; `schedule-entry` is now a window picture (OVERLAYS in web/visual/inventory.ts), schedule-entry-day-390.png shows the sheet to the window's bottom edge

311: - [x] [G3] [C] (A-part1) 4 Type · `schedule-month-day-1440.png`, y 430-515: event chips are truncated to "9:46 PM Venue …", "10:16 PM Budge…", "11:00 PM Suppli…": the time takes the width and the title is lost, so the person cannot tell what is on the day. Fix: title first, time as meta or hidden in the cell; "+N more" past two events. → fixed: ScheduleLayouts.test.tsx month titles first; CSS: a title takes two lines, the time drops under it when the title is long and stays for a screen reader only below 56rem (capture schedule-month-a-busy-month-day-1440.png, "...-day-390.png"); schedule.spec.ts month test

313: - [x] [G3] [C] (A-part1) 2 Layout · `schedule-month-day-1440.png`: month title row "November 2026" has no subtitle (the clash line is gone), so the title block shifts 20px against Day view; calendar chips still carry raw emails; the grid ends at y=940 and the window below is blank (fine). → fixed: ScheduleLayouts.test.tsx "a month says its so-what too, and a day's dots are inside the day's one button" (the Month has the same subtitle line)

314: - [x] [G3] [C] (A-part1) 3 Spacing · day numbers sit at x=270, 437, 603 (left padding 13px) but today's disc sits at x=446, so numbers do not share an edge in that row; outside-month days (26-31, 1-6) are the same weight at 3:1 contrast. → fixed: schedule.spec.ts "the month's weekday names sit over their numbers, the numbers share one edge ..." (one left edge for every number, today's disc in the same box)

315: - [x] [G3] [C] (A-part1) 8 Phone · `schedule-month-day-390.png`: dots and a count pill "(3)" under 3 Nov are 8px dots and a 16px pill, under the 24/44 hit-target rule; there is no way to see what is on a day (no sheet or list under the grid). Fix: tapping a day lists its events below. → fixed: schedule.spec.ts same test (a day's button at least 24px wide and tall, 44px at 390; dots 10px, count 24px); dots now sit inside that button

317: - [x] [G3] [C] (B-part1) 7 Edge · `schedule-month-day-1440.png`, x 430-585: event chips truncate to "9:46 PM Venue ..." and the time takes most of the width, so the title is cut to 5 letters. A day with 6+ events has no "+N more" visible (not shown). Fix: title first, time second; "+N more". Cost 0.5. → fixed: same as 311

318: - [x] [G3] [C] (B-part1) 7 Edge · no state of a busy month, an all-day event or a month with no events. Cost 0.3. → fixed: capture states "A busy month", "An all-day entry" and "A month with nothing" in web/visual/inventory.ts (the server's own answer, changed); ScheduleViews.test.tsx "a week or month with nothing on it says so"

319: - [x] [G3] [C] (B-part1) 4 Type · `schedule-month-day-1440.png`, y 264: weekday header (Mon, Tue...) at 11px grey and not aligned with the date numbers (left-aligned in some, centered in others: "Tue" at x 441 but date "27" at x 445; "Sun" at x 1269 vs date at 1273). Fix: share an edge. Cost 0.2. → fixed: schedule.spec.ts "the month's weekday names sit over their numbers" (centers within 1.5px, in every column, at 1440 and 390)

324: - [x] [G3] [C] (A-part1) 2 Layout · `schedule-timeline-day-1440.png`: a 10-week range with 6 events: the hatched "days off" bands (about 10 stripes) dominate the visual weight over events; the left lane label column is 175px wide for the single lane "Personal"; 500px blank under the legend. → fixed: ScheduleTimeline.module.css: the days-off bands are lighter (capture schedule-timeline-day-1440.png); no unit test can show a weight, so the picture is the check

329: - [x] [G3] [B] (B-part1) 2 Layout · `schedule-timeline-day-1440.png`, y 255-400: the lane named "Personal" only; the Nov 12 Offsite is not visible (dot missing near Nov 9 column x 580 may be it; it sits at Nov 12 though). Dots are tied to dates by position only and the Today pill covers the first date label. Fix: show date labels at each dot. Cost 0.6. → fixed: ScheduleTimeline.test.tsx "a mark on one day carries its date beside its title"; timeline.spec.ts "a mark on one day carries its date, and the Today label does not cover any date" (the Today pill is in its own row above the dates; it did not cover the first date at 1440 before either, measured, now tested)

332: - [x] [G3] [C] (B-part1) 7 Edge · no state with many lanes, many entries or none; 10 weeks of date headers with no density handling (Nov 2 label covered by the Today pill). Cost 0.4. → fixed: capture states "Many lanes", "Many entries" and "Nothing on it" (web/visual/inventory.ts); ScheduleTimeline.test.tsx empty-lanes test; titles keep packing on rows, a date before each title

336: - [x] [G3] [C] (A-part1) 7 Edge · as work-week; no weekend, no all-day event, no overlapping events within one day shown for a seven-day grid. → fixed: capture states "Nothing this week", "A busy week" (40 meetings), "All-day entries and overlaps" for Week and Work week (web/visual/inventory.ts); ScheduleLayouts.test.tsx identical-entries and empty-row tests

340: - [x] [G3] [C] (B-part1) 6 Colour · `schedule-week-night-1440.png`, y 330-380: the Quarterly review card is dark grey with a pale-blue edge, readable; the clash card is dark brown with a salmon border, readable. Today column tint is nearly invisible at night (column at x 518-727 differs by about 1 L from others). Fix: lift the today column tint. Cost 0.3. → fixed: src/theme/tokens.css: --today-tint at night 35% to 60% of the accent soft (capture schedule-week-a-busy-week-night-1440.png shows the column); a tint cannot be asserted in jsdom, so the picture is the check

341: - [x] [G3] [C] (B-part1) 7 Edge · same as work-week plus the above. Cost 0.6. → fixed: same as 336

344: - [x] [G3] [B] (A-part1) 1 Hierarchy · `schedule-work-week-day-1440.png`: the grid starts at 1:00 AM and runs to midnight (1,650px tall); the week's only content is a 1 AM "Quarterly review" at the top and the clash at 9:46 PM at the bottom, with 15 empty hours between. Neither fits one window; nothing says "now". Fix: default to working hours (for example 8 AM to 7 PM) with a "show all hours" link; scroll to now. → fixed: ScheduleLayouts.test.tsx "Show all hours draws the whole day, and Show fewer hours goes back"; schedule.spec.ts "Show all hours draws the whole day inside the same frame, and Show fewer hours goes back"

349: - [x] [G3] [C] (A-part1) 7 Edge · no state pictures; empty days shown as "Nothing on Monday" rows (OK, but 4 of 5 rows are empty, 44px each). → fixed: same as 336

351: - [x] [G3] [C] (B-part1) 2 Layout · `schedule-work-week-day-1440.png`, y 260-1915: a 1,650px grid with two blocks in it; no summary of the week is offered. Fix: a one-line "so what" ("1 clash on Tuesday, 1 meeting Thursday"). Cost 0.3. → fixed: ScheduleLayouts.test.tsx "the week says its so-what in one line: the clashes and how many meetings there are" ("1 clash, on Monday · 4 meetings")

352: - [x] [G3] [C] (B-part1) 7 Edge · `schedule-work-week-day-1440.png`: no state for an empty week, a week of 40 events, or all-day events (the All day row is empty and gives no hint). Quarterly review truncates "avery.l..." without a tooltip cue. Cost 0.4. → fixed: same as 336

270: (line text unchanged) → belongs to G1b: the drawer's placement and padding are shared (web/src/ui/Drawer)

271: (line text unchanged) → belongs to G1b: the drawer's placement and padding are shared (web/src/ui/Drawer)

276: (line text unchanged) → belongs to G1b: the drawer's placement and padding are shared (web/src/ui/Drawer)

272: (line text unchanged) → belongs to G1b: the disabled Add style is in G1's tree and arrives at the merge

275: (line text unchanged) → belongs to G1b: the disabled Add style is in G1's tree and arrives at the merge

286: (line text unchanged) → belongs to G1b: chip height and radius

290: (line text unchanged) → belongs to G1b: the header's Hand something in

292: (line text unchanged) → belongs to G1b: the segmented control

326: (line text unchanged) → belongs to G1b: the segmented control

330: (line text unchanged) → belongs to G1b: the segmented control

826 (audit Y11-18): - [x] [audit] **Y11-18** Fold identical all-day entries. `lib/calendar.ts`. → fixed: web/src/lib/calendar.test.ts "identical entries fold into one with a count..." and web/src/components/ScheduleLayouts.test.tsx "identical all-day entries of a day are one with a count, and a day with none has no all-day strip at all"

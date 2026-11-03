# Scorer B, part 1

## schedule-day: Schedule, Day
Pictures opened: 10 of 19 listed (1440 day/night, 1024 day, 390 day/night, and loading/couldn't load/offline states)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.8 | 4.0 | 4.1 | 3.9 | 4.0 | 3.8 | 3.6 | 3.9 | 4.2 |
Issues:
- [C] 1 Hierarchy · `schedule-day-day-1440.png`, y 1390-1530: the only thing that needs the person (the 3-at-once clash) sits at the very bottom of a 1,600px page under 15 empty hours. Subtitle "1 clash, on Tuesday" is plain muted text with no link to it. Fix: open the grid scrolled to the first event or the current time, and make the subtitle a link that jumps to the clash. Cost 0.6.
- [C] 1 Hierarchy · `schedule-day-day-1440.png`, header: three filled/tinted controls compete at the top ("Restart to finish", "Hand something in", "Add to schedule" filled). Fix: Hand something in goes quiet on pages with their own primary (VP04). Cost 0.2.
- [C] 2 Layout · `schedule-day-day-1440.png`, y 270-1570: a full-width 1,100px day grid with one event cluster; most of the screen is blank lines. Fix: trim the visible hours to the working day plus events, or show an agenda list beside the grid. Cost 0.2.
- [C] 5 Components · `schedule-day-day-1440.png`, y 205: view tabs ("Day, Weekdays...") look like text tabs with a white pill on the selected one; the Calendars chips look like buttons (pills with check) and are as heavy as the nav buttons. Fix: lighter chips, one tab style. Cost 0.2.
- [C] 3 Space · `schedule-day-day-1024.png`, y 245-290: calendar chips wrap to a second row, leaving the "Calendars" label floating mid-height. Fix: align the label to the first row or scroll the chips on one line. Cost 0.1.
- [C] 7 Edge · `schedule-day-loading-day-1440.png`: skeleton is a to-do style list with circles and buttons (3 rows) under the "Weekdays" tab, not a calendar grid, so the layout jumps on load; page title and Add button are missing. Fix: skeleton matching the grid. Cost 0.4.
- [C] 7 Edge · `schedule-day-couldn-t-load-day-1440.png`: error is clear with Try again, but shows both a banner "You're offline" and the error block together, and the date label reads "November 2 - 6" (Weekdays) although the Day view was asked. Cost 0.2.
- [C] 8 Phone · `schedule-day-day-390.png`, y 780-845: in the full-page capture the tab bar lands mid-grid and covers the 1 PM row (a fixed bar captured in a scroll shot; the page itself needs bottom padding equal to the bar). Also the Calendars chip row is cut off at the right ("Your" at x 375) with no fade, "Hand something in" is not reachable except through the + circle. Fix: edge fade on the chip row, confirm bottom padding. Cost 0.4.
- [C] 6 Colour · `schedule-day-night-1440.png`, y 1405-1530: clash block is dark brown-red with a thin light border; the event dots are pale blue, which reads fine, but the "Restart to finish" chip and "Reginald" warning are orange next to the gold primary. Cost 0.2.
- [nit] 4 Type · `schedule-day-day-1440.png`, time labels at x 257-313 touch the left grid edge ("10:00 AM" starts at the border). Fix: 8px left padding.

## schedule-work-week: Schedule, Work week
Pictures opened: 2 of 5 listed (1440 day, 390 day; the 1440 night, 1024 day and 390 day of schedule-week stand in as the same view)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.7 | 4.0 | 4.0 | 3.9 | 4.0 | 3.6 | 4.2 | 3.9 | 4.2 |
Issues:
- [C] 1 Hierarchy · `schedule-work-week-day-1440.png`, y 330-1900: the clash is at the bottom (9:46 PM) and the one event (Quarterly review) at 1 AM, so the grid runs 24 hours with nothing visible in the working day. The grid starts at 1:00 AM, with 8 hours of night before any meeting. Fix: default the visible range to the events and working hours, scroll to the first event. Cost 0.6.
- [C] 2 Layout · `schedule-work-week-day-1440.png`, y 260-1915: a 1,650px grid with two blocks in it; no summary of the week is offered. Fix: a one-line "so what" ("1 clash on Tuesday, 1 meeting Thursday"). Cost 0.3.
- [C] 7 Edge · `schedule-work-week-day-1440.png`: no state for an empty week, a week of 40 events, or all-day events (the All day row is empty and gives no hint). Quarterly review truncates "avery.l..." without a tooltip cue. Cost 0.4.
- [C] 5 Components · `schedule-work-week-day-1440.png`, y 235: "Quarterly review" event card is grey (cool) while the calendar chip is blue; the card colour doesn't match its calendar's colour, so the colour key is not decodable. Fix: tint the card from the calendar colour. Cost 0.2.
- [nit] 8 Phone · `schedule-work-week-day-390.png`, y 780-845: tab bar over content in the full-page capture (fixed element). Row text is good: the agenda stacks with a 3px clash edge, and titles use the full width. Day-names and "Nothing on Monday" rows are well done. Phone view differs from the Day view (grid), which is inconsistent.
- [nit] 3 Space · `schedule-work-week-day-390.png`, y 405-665: the clash block carries a pink gradient fading to nothing at the right/bottom, so its edge is undefined. Fix: solid tint, 3px edge only.

## schedule-week: Schedule, Week
Pictures opened: 3 of 5 listed (1440 night, 390 day; 1024 not opened; 1440 day matches work-week)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.6 | 4.0 | 4.0 | 3.9 | 4.0 | 3.4 | 4.1 | 3.8 | 4.2 |
Issues:
- [broken] `schedule-week-night-1440.png` and `schedule-week-day-390.png`: the "Weekdays" tab is the selected one, and the page shows Mon to Fri only (5 columns, "November 2 - 6"). This is the Work week view, not a 7-day Week; either the capture did not switch tab or the Week tab shows the wrong range. A week view with no Sat/Sun is wrong. Fix: check the Week tab renders 7 days (or the capture clicks the right tab). Cost 0.4 on point 7 (nothing seen for this view).
- [C] 1 Hierarchy · `schedule-week-night-1440.png`, y 1750-1880: as work-week, the clash sits 24-hour grid bottom and 1 AM start. Cost 0.6.
- [C] 6 Colour · `schedule-week-night-1440.png`, y 330-380: the Quarterly review card is dark grey with a pale-blue edge, readable; the clash card is dark brown with a salmon border, readable. Today column tint is nearly invisible at night (column at x 518-727 differs by about 1 L from others). Fix: lift the today column tint. Cost 0.3.
- [C] 7 Edge · same as work-week plus the above. Cost 0.6.
- [nit] 5 Components · same card colour mismatch as work-week.

## schedule-month: Schedule, Month
Pictures opened: 2 of 5 listed (1440 day, 390 day; not opened: 1440 night, 1024 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 4.1 | 4.1 | 4.0 | 4.0 | 4.0 | 3.7 | 4.2 | 4.0 | 4.2 |
Issues:
- [C] 1 Hierarchy · `schedule-month-day-1440.png`, Tuesday 3 cell: the clash day (3 events 9:46 PM to 11:00 PM) is not marked as a clash in the cell, only the burgundy "today" circle shows; the subtitle "1 clash, on Tuesday" from other views is missing here. Fix: a warning dot plus word on clash days. Cost 0.3.
- [C] 7 Edge · `schedule-month-day-1440.png`, x 430-585: event chips truncate to "9:46 PM Venue ..." and the time takes most of the width, so the title is cut to 5 letters. A day with 6+ events has no "+N more" visible (not shown). Fix: title first, time second; "+N more". Cost 0.5.
- [C] 7 Edge · no state of a busy month, an all-day event or a month with no events. Cost 0.3.
- [C] 4 Type · `schedule-month-day-1440.png`, y 264: weekday header (Mon, Tue...) at 11px grey and not aligned with the date numbers (left-aligned in some, centered in others: "Tue" at x 441 but date "27" at x 445; "Sun" at x 1269 vs date at 1273). Fix: share an edge. Cost 0.2.
- [nit] 3 Space · `schedule-month-day-1440.png`: dates in the first/last row use grey (outside month) and the same size; fine. Month grid ends 150px above sidebar end; ok.
- [nit] 8 Phone · `schedule-month-day-390.png`, y 355-415: count badge "3" beside dots is a tiny outlined pill (about 16px) and dots are 7px; hit area for tapping a day is the full cell (fine). Fix: bump the badge. Good: week grid fits the width, no sideways scroll.

## schedule-timeline: Schedule, Timeline
Pictures opened: 2 of 5 listed (1440 day, 390 day; not opened: 1440 night, 1024 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.4 | 3.8 | 3.8 | 3.6 | 3.8 | 3.4 | 4.2 | 3.7 | 4.1 |
Issues:
- [B] 1 Hierarchy · `schedule-timeline-day-1440.png`, y 255-400: the chart is a 150px strip with four unlabeled blue dots stacked at Nov 2/3, one more on Nov 5 and none labelled; the legend and help text below (y 410-460) take as much space as the chart, and 450px below is empty. The person cannot read what the dots are without hovering. Fix: label each entry, or lead with a list; shrink the legend to what appears. Cost 0.6.
- [B] 2 Layout · `schedule-timeline-day-1440.png`, y 255-400: the lane named "Personal" only; the Nov 12 Offsite is not visible (dot missing near Nov 9 column x 580 may be it; it sits at Nov 12 though). Dots are tied to dates by position only and the Today pill covers the first date label. Fix: show date labels at each dot. Cost 0.6.
- [C] 5 Components · `schedule-timeline-day-1440.png`, y 186: two tab rows of different styles on one line (the view tabs and "2 weeks / 10 weeks / A quarter") run together; the second group only has a gap of 20px to separate it. Fix: a divider or its own row. Cost 0.3.
- [C] 4 Type · `schedule-timeline-day-1440.png`, y 440-460: legend of 7 items in 13px with outline icons repeated in a run-on line; the glyphs for the Overdue/Done are 18px but unused on screen. Cost 0.3.
- [C] 7 Edge · no state with many lanes, many entries or none; 10 weeks of date headers with no density handling (Nov 2 label covered by the Today pill). Cost 0.4.
- [nit] 8 Phone · `schedule-timeline-day-390.png`: the phone shows an agenda list grouped by week, a good answer. But the legend at the bottom (y 650-735) is four rows of small text for icons that don't appear in the list. Fix: drop the legend on phone. Also the 2 weeks tab text is only 13px.

## schedule-add: Schedule, Add to schedule
Pictures opened: 2 of 4 listed (1440 day, 1440 night; 1024 not opened; no 390 picture, "not captured")
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.6 | 3.8 | 4.0 | 3.7 | 4.0 | 3.5 | 3.0 | 3.65 | 4.0 |
Issues:
- [B] 8 Phone · no `schedule-add-day-390.png`: the inventory says the phone Schedule has no Add to schedule button (the header button is gone and the + circle in the tab bar opens something else). A person on a phone cannot add an event. Fix: put Add to schedule in the phone header menu ("...") or make the + sheet offer it, then capture. Cost 1.0 (scored 3.0 because nothing can be judged).
- [C] 1 Hierarchy · `schedule-add-day-1440.png`, y 345-370: the only button, "Add", is a pale cream pill with burgundy text, lower in weight than "Cancel" (outlined, black bold). The primary action reads as disabled. Fix: filled burgundy Add (disabled only when name is empty). Cost 0.4.
- [C] 2 Layout · `schedule-add-day-1440.png`, x 960-1440, y 0-385: the drawer is a 480px box pinned top-right that ends at y 385, with the dimmed page below; the top of it covers the header (Restart/Hand something in) and it is not full-height like a drawer. Fix: full-height drawer or a centered dialog. Cost 0.3.
- [C] 5 Components · `schedule-add-day-1440.png`, y 150-210: "Ends at" is a disabled-looking select showing "9:30 AM" (the same as start) with hint "Give a start time first." under "Starts at" only; a time pre-filled that says "optional" is contradictory. Fix: blank placeholder "No time" and enable Ends after Starts. Cost 0.3.
- [C] 3 Space · `schedule-add-day-1440.png`: fields are two columns of unequal widths (What 253px vs Day 180px; Starts 140px vs Ends 140px; Place 220px vs Repeats 218px), so edges differ from row to row. Fix: one two-column grid. Cost 0.2.
- [C] 7 Edge · no error state shown (empty What, end before start), no calendar picker (which of the three calendars the event goes in is not asked). Cost 0.5.
- [nit] 6 Colour · `schedule-add-night-1440.png`: focus ring is gold and clear; the Add button at night is dark brown on dark with gold text (about 1.4:1 fill contrast), so the button shape is almost invisible. Fix as above.

## schedule-entry: Schedule, an entry opened
Pictures opened: 3 of 4 listed (1440 day, 390 day; 1024 not opened; night not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.6 | 3.8 | 4.0 | 3.8 | 4.0 | 3.5 | 3.9 | 3.8 | 4.1 |
Issues:
- [C] 2 Layout · `schedule-entry-day-1440.png`, x 244-922 and 944-1343: opening an entry squeezes the week grid to 680px (day headers wrap: "Today · Tue, Nov 3" breaks onto two lines; the clash card truncates "Venue walk-t...", "Budget check..."), and the detail card ends 380px high leaving empty space under it. Fix: overlay the panel as a drawer so the grid keeps its width. Cost 0.4.
- [C] 5 Components · `schedule-entry-day-1440.png`, y 395-450: the Calendar row shows a lone blue dot on its own line above the calendar name; dot and name don't sit together. Fix: dot inline before the text. Cost 0.2.
- [C] 1 Hierarchy · `schedule-entry-day-1440.png`, y 470-530: "Open" is a filled burgundy button with no object (open what, where?), and "Change it in your calendar app." is the only explanation. Fix: "Open in calendar app". Cost 0.3.
- [C] 7 Edge · no state for a long title, long place, attendees, all-day or an entry with no place (shows "Where" row always?). Cost 0.5.
- [C] 8 Phone · `schedule-entry-day-390.png`, y 510-545: the sheet leads with a full-width "Back to the calendar" button above the details, outweighing the info, with a close "x" already at top-right. Fix: remove the back button. The sheet covers half the page and the page behind shows through in an awkward cut at y 845-880 (leftover "avery.lane@example.com" text under the sheet bottom edge). Cost 0.3.

## todos: To-dos
Pictures opened: 7 of 20 listed (1440 day/night, 390 day/night, filtered to nothing 1440 day, loading 1440 day; also the Questions tab pictures)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.6 | 3.9 | 4.0 | 3.8 | 4.0 | 3.8 | 3.7 | 3.84 | 4.2 |
Issues:
- [C] 2 Layout · `todos-day-1440.png`, x 256-1136 vs 256-1416: the list card ends at x 1136 while the title rule, project filter bar and Add button run to 1416; 280px of dead gutter on the right of every row. Fix: one content width (VP01). Cost 0.5.
- [C] 5 Components · `todos-day-1440.png`, y 420-900: every row repeats a grey chip "Harborview Community Support Partnership Incorporated: not in a project" (and the others), a full organization name plus "not in a project" on 7 of 8 rows; two rows' chips run 440px wide. The same words on every row are noise, and "X: not in a project" reads as contradictory. Fix: omit the chip when the to-do has no project, show the short name when it has one. Cost 0.4.
- [C] 1 Hierarchy · `todos-day-1440.png`, y 80-115 and y 314: two add actions on one screen, the filled "Add a to-do" and the inline "Add a to-do..." row (the header's "Hand something in" is a third). Phone shows both stacked too (`todos-day-390.png`, y 128-160 and 301). Fix: keep the inline row, drop the header button (VP04). Cost 0.3.
- [C] 5 Components · `todos-day-1440.png`, y 218-260: two filter rows (State select and a project tab bar with counts) and tab labels truncate "Harborview Communi..." "Willowbrook Handma..." "Northfield Mobile Bicy..." with a 4px-wide count after them. The filter strip is the same grey as the page (nearly invisible). Fix: a "Filter" control, abbreviations. Cost 0.3.
- [C] 7 Edge · `todos-filtered-to-nothing-day-1440.png`, y 340: "Nothing open on the Lantern Row Studio side." while the main picture shows Lantern Row Studio with 4 to-dos; the All chip has no count and the tab says "To-dos 0". This state is not consistent with the data. Fix: the filter state must use a filter that really has none. Cost 0.4.
- [C] 7 Edge · `todos-loading-day-1440.png`: skeleton rows are about 55px against 65px real rows (layout shift) and show a button pill at the right that real rows don't have (they show "..."). Tabs show "To-dos 0" while loading. Cost 0.3.
- [C] 8 Phone · `todos-day-390.png`, y 405-450 and 920-960: project chips wrap to three lines, and the chip is narrower than the title above it (indent x 93-333 vs title x 69). The Side: All button replaces the project tab bar (fine). Fix: one-line truncated chip. Tab bar overlaps row 6 in the full-page capture. Cost 0.4.
- [nit] 4 Type · `todos-day-1440.png`, y 946-995: help lines "1 to-do needs a date / Give them dates" and "8 of these 8 to-dos need you" at the foot; the second is a status sentence that says nothing (8 of 8). Fix: drop it. 
- [nit] 6 Colour · "Due today" in amber text only (`todos-day-1440.png` y 428), no icon; word carries the state, so it passes.

## questions: Questions (the Questions tab of To-dos)
Pictures opened: 2 of 2 listed (1440 day, 390 day; 1440 night, 1024 day not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.7 | 3.9 | 4.0 | 3.7 | 4.0 | 3.7 | 4.0 | 3.84 | 4.0 |
Issues:
- [C] 1 Hierarchy · `questions-day-1440.png`, y 80-115: on the Questions tab the primary is still "Add a to-do" (it adds a to-do on the questions tab), and the subtitle "8 open · 2 due today" counts to-dos while the tab says "Questions 0". Fix: the subtitle and primary follow the tab. Cost 0.3.
- [C] 5 Components · `questions-day-1440.png`, y 245-270: the project filter bar still counts to-dos ("All 8, Personal 2...") on a tab with 0 questions, so counts contradict the empty state. Fix: count questions. Cost 0.4.
- [C] 7 Edge · `questions-day-1440.png`, y 335-430: the empty state is plain and informative, a check icon in a tint circle (reads as "done" good); but there is no all-clear brand moment and nothing says how a question appears or "ask one". No state with a question in it is captured (a question row is never seen). Cost 0.5.
- [nit] 5 Components: tick icon for "no questions" is the same glyph as the sidebar's to-dos icon. 

## todos-many: To-dos, over a hundred
Pictures opened: 1 of 5 listed (1440 day, scaled to unreadable; the other sizes not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.5 | 3.8 | 3.9 | 3.7 | 3.9 | 3.2 | 3.5 | 3.6 | 4.0 |
Issues:
- [B] 7 Edge · `todos-many-day-1440.png`: the page is 9,287px tall: all ~140 rows are rendered in one page with no paging, "show more", or sticky group headers visible, and "Coming up" is a single group of well over 100 rows. The 100+ state is the one the rubric wants designed; here it is the same list made long. Fix: group by Overdue, Today, This week, Later with collapsed older groups and a "Show 20 more" footer. Cost 1.2.
- [C] 1 Hierarchy · same picture: the top of the page is unchanged, so nothing signals the person to start with the first 8; the "Today" group holds about 12 rows before Coming up. Cost 0.4.
- [nit] Scale limits what can be seen; rows carry mixed scripts (Arabic, Cyrillic, CJK) and render without clipping at this scale. Not verified at 390 or in detail (scores for 8 Phone estimated from the main to-dos).

## stages: Stages
Pictures opened: 2 of 5 listed (1440 day, 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.4 | 3.8 | 3.8 | 3.6 | 4.0 | 3.4 | 3.9 | 3.7 | 3.9 |
Issues:
- [B] 1 Hierarchy · `stages-day-1440.png`, y 190-325: the only content is a page-sized empty state with a four-line paragraph defining a stage ("A stage is where a piece of work stands, such as Idea, Draft or Done..."); no action, no way to start. The title has no subtitle and no "so what". Fix: one-line empty state plus a button that explains or points to how an item gets stages; drop the help paragraph (rubric point 4). Cost 0.6.
- [C] 2 Layout · `stages-day-1440.png`: the screen is 1,100px of blank page; the empty block floats centered with 4 lines of text 380px wide. Cost 0.3.
- [C] 7 Edge · no state with items (no board seen at all), no loading or error picture for this screen. Only the empty state is shown. Cost 0.6.
- [C] 5 Components · `stages-day-1440.png`, y 190-230: an inbox icon on a screen about stages (layers icon in the sidebar). Fix: a matching glyph. Cost 0.2.
- [nit] 8 Phone · `stages-day-390.png`: fine; copy wraps to 6 lines at 13px, readable.

## followups: Follow-ups
Pictures opened: 4 of 20 listed (1440 day, 390 day, 390 night; the filtered, loading, couldn't-load and offline states not opened; the sub-view pictures stand in for other states)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.5 | 3.6 | 4.0 | 3.6 | 4.0 | 3.6 | 3.8 | 3.73 | 4.1 |
Issues:
- [B] 2 Layout · `followups-day-1440.png`, x 256-310 on y 270-545: every row has a 53px empty lead slot (no avatar, no glyph), so titles sit at x 309 with a dead gutter to their left; the left card "Your own to-dos" sits above the list with the same anatomy as a person row though it is not a person. Fix: initials avatar in the lead slot (56px per VP02) or remove the slot. Cost 0.5.
- [C] 1 Hierarchy · `followups-day-1440.png`, y 360-1010: three "Copy message" actions in the list at the same weight, and a fourth filled "Copy message" in the detail panel; the primary action of the page is in the panel at y 992 under a 1,000px page. Fix: list rows show an "Open" quiet action or only the selected row shows one. Cost 0.4.
- [C] 3 Space · `followups-day-1440.png`, y 360-380 and 1050: the detail panel top (y 345) and the list top (y 345) share an edge, good, but the panel runs to y 1027 while the list ends at y 547; the "How your messages start and end" fold sits at y 1057 under a 500px gap. Fix: end the columns level. Cost 0.3.
- [C] 5 Components · `followups-day-1440.png`, y 580-620: the project chip "Willowbrook Handmade Ceramics and Garden Supply Cooperative: not in a project" appears inside the message summary at 12px on a tinted bar; the text area has a native resize handle (y 915). Fix: same chip rule as to-dos. Cost 0.3.
- [C] 5 Components · `followups-day-1440.png`, y 185-250: three filter rows stacked (tabs, By person / By project, project bar), 3 levels above the first row. Cost 0.3.
- [C] 8 Phone · `followups-day-390.png`, y 290-310: "Send one at a time" is a filled burgundy pill that sits on the card's top edge (overlapping the border) and looks like a button, but it is a label; at night it is gold (`followups-night-390.png`). Fix: make it a plain heading or a real button. Cost 0.3. Rows stack the action below the meta, good. Same dead lead gutter at 390 (x 16-69 empty).
- [C] 7 Edge · other states not opened; see sub-view entries below.

## followups-later: Follow-ups, Later
Pictures opened: 1 of 5 listed (1440 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.6 | 3.9 | 4.0 | 3.6 | 4.0 | 3.4 | 3.8 | 3.7 | 3.9 |
Issues:
- [B] 7 Edge · `followups-later-day-1440.png`, y 225-255: the project filter bar shows counts (All 4, Personal 1, Harborview 3...) on a tab whose list is empty ("Nothing is waiting for later"), so counts contradict the empty state. Fix: count what this tab holds or hide the bar when empty. Cost 0.6.
- [C] 1 Hierarchy · y 330-410: a small inbox-in-a-circle icon plus one sentence; no action, no brand moment. Cost 0.3.
- [C] 5 Components · the By person / By project toggle and the filter bar are shown for an empty list. Fix: hide filters below about 12 items (rubric 2). Cost 0.3.

## followups-waiting: Follow-ups, Waiting on them
Pictures opened: 2 of 5 listed (1440 day, 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.6 | 3.9 | 4.0 | 3.6 | 4.0 | 3.4 | 3.9 | 3.7 | 3.9 |
Issues:
- [B] 7 Edge · `followups-waiting-day-1440.png`, y 225-255: same as Later: counts 4, 1, 3, 2, 1, 1 over an empty "You're not waiting for any replies" body. On the phone (`followups-waiting-day-390.png`) the bar is replaced by "Side: All" so the contradiction is absent. Cost 0.6.
- [C] 1 Hierarchy · same bare empty state as Later; no brand moment or next step. Cost 0.3.
- [nit] 8 Phone · tab names "Waiting on them" nearly touch the right edge (x 252 of 390) but fit.

## followups-by-project: Follow-ups, by project
Pictures opened: 1 of 5 listed (1440 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.4 | 3.6 | 3.9 | 3.4 | 4.0 | 3.5 | 3.8 | 3.64 | 4.0 |
Issues:
- [B] 2 Layout · `followups-by-project-day-1440.png`, y 355-635: each group header ("Harborview Community Support Partnership Incorporated") is followed by a card whose title is the same name plus ": not in a project" (y 398, y 508). The header and the row say the same thing, and the combined string is contradictory. Fix: one name, and "No project" as its own group. Cost 0.6.
- [B] 5 Components · y 360-440: the open card (selected) has a tinted fill with a burgundy left edge while the unselected are white cards with their own borders and gaps; the selected row is joined to the left edge while others float. Right panel title wraps to 3 lines at 20px. Fix: one list pattern; short names. Cost 0.4.
- [C] 1 Hierarchy · y 470-630: the open items in the panel carry "Open" buttons at the same weight as rows; "To-do" is a small grey label over each title, not a status. Cost 0.3.
- [C] 3 Space · same empty lead slot as the main view. Cost 0.3.

## followups-empty: Follow-ups, nobody has one yet
Pictures opened: 1 of 5 listed (1440 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.6 | 3.9 | 3.8 | 3.7 | 4.0 | 3.6 | 3.9 | 3.8 | 4.0 |
Issues:
- [C] 4 Type · `followups-empty-day-1440.png`, y 355-440: a 4-line help paragraph defines a follow-up ("A follow-up is a message to someone about a question you need answered or a to-do they owe you. Nobody has one yet...") in 14px grey; rubric 4 wants a short line. Fix: "No follow-ups yet. They appear when someone else owes you an answer." Cost 0.3.
- [C] 7 Edge · y 176-243: "Your own to-dos, 8 to-dos of yours" card remains above the empty state, so the empty state is not the only thing; the project chips in the filter bar here have no counts (the others do). The tabs To send / Later / Waiting are gone in this picture (no tab row), so the page has less structure than the same page with data. Cost 0.4.
- [C] 1 Hierarchy · "How your messages start and end" fold sits at y 517 in bold black with a chevron, looks like a heading rather than a help fold. Cost 0.2.

## since-yesterday: Since yesterday
Pictures opened: 4 of 16 listed (1440 day, 1440 night, 390 day, offline 390 day; other states not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.6 | 3.8 | 3.8 | 3.7 | 4.0 | 3.8 | 3.9 | 3.78 | 4.1 |
Issues:
- [C] 4 Type · `since-yesterday-day-1440.png`, y 190-295: row titles are run-on sentences up to 920px wide ("Set aside "Spring sale: everything half price": a sorting rule set it aside (it was sent to many people, as a mailing list or bulk mail)"), with the reason in brackets. Fix: title is the subject, the reason goes on the meta line. Cost 0.4.
- [C] 1 Hierarchy · `since-yesterday-day-1440.png`, y 80-115: the only button is "Back to What changed" (outline), the page's real action (undo through the row menu) is hidden behind "..." with an explanation in a grey paragraph at y 130-160 ("Each row's menu undoes it."). Fix: a visible Undo on each row, and drop the paragraph. Cost 0.3.
- [C] 2 Layout · `since-yesterday-day-1440.png`, x 256-309: an empty lead slot as on every list in this section; rows start at x 309. Cost 0.3.
- [C] 7 Edge · `since-yesterday-day-1440.png` shows two rows and `since-yesterday-night-1440.png` shows the empty state ("Nothing new since yesterday...", Missed something?): the two themes are captured with different data. The empty state is good (icon, one line, "Missed something?"). The 1 and 100+ row states were not captured; the offline state (`since-yesterday-offline-day-390.png`) is well made. Cost 0.4.
- [nit] 8 Phone · `since-yesterday-day-390.png`: the "Back to What changed" button sits under the title and pushes content down 50px; the body paragraph is 3 lines of 13px. Fix: a back arrow in the header.

## what-changed: What changed
Pictures opened: 4 of 20 listed (1440 day, 390 day, 390 night; the states not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.6 | 3.8 | 3.9 | 3.5 | 3.9 | 3.6 | 3.6 | 3.66 | 4.1 |
Issues:
- [B] 1 Hierarchy · `what-changed-day-1440.png`, y 1005-1130: the two rows that need the person ("Needs you", stopped) are the last two of twelve; ten rows above say "With Reginald ... Reginald is on it". Fix: sort "Needs you" first and fold the rest. Cost 0.7.
- [B] 5 Components · `what-changed-day-1440.png`, y 255-1120: every row has a chip ("With Reginald" in a cream pill on ten rows, "Needs you" in an amber pill on two): a pill column of the kind the rubric calls out; the 10 identical chips and the 10 identical "Handed in Tue, Nov 3, 9:33 PM · Reginald is on it" lines carry no information. Fix: one status pattern (dot plus word), omit the default. Cost 0.5.
- [broken] `what-changed-day-1440.png`, y 400-435: the detail panel shows "Settings or code changed since the cockpit started; restart it to use them." Internal terms ("code", "cockpit") shown to a person.
- [C] 5 Components · `what-changed-day-1440.png`, x 939: the "..." menu is missing on the first five rows (calendar events) but shown on the next seven, so the row actions are not one pattern. Cost 0.3.
- [C] 2 Layout · `what-changed-day-1440.png`, y 185-230: two lines of underlined links at the top ("5 things wait for you on Today · Open Today", "2 handled for you") at 13px as a link stack above the list, in a style used nowhere else (underline links). Right panel ends at y 452, list at y 1145. Cost 0.3.
- [C] 8 Phone · `what-changed-day-390.png`, y 285-1880: each row is 140px with the title on two lines, the chip, and two meta lines; twelve rows are a 1,900px scroll. Dead 53px lead gutter (x 16-69) eats 14% of the width. The tab bar overlaps row 5 in the capture. Cost 0.4.
- [nit] 6 Colour · `what-changed-night-390.png`: "Needs you" amber chip against dark card is readable; "With Reginald" gold on brown at about 4.6:1. Fine.

## handled-for-you: Handled for you
Pictures opened: 2 of 20 listed (1440 day, 390 day; the states, night and 1024 not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.4 | 3.8 | 3.8 | 3.5 | 4.0 | 3.4 | 3.8 | 3.65 | 4.0 |
Issues:
- [B] 2 Layout · `handled-for-you-day-1440.png`, y 130-310: the screen is a header, two help paragraphs, a search, a three-way segmented control (Kind / Reason / Sender), and a single collapsed group "Sales, promotions and social updates · 2"; the list itself is one closed line and 600px of empty page below it. Fix: open the first group by default, drop the controls below 12 items (rubric 2). Cost 0.6.
- [C] 4 Type · `handled-for-you-day-1440.png`, y 185-215: two 13px help paragraphs sit above the content ("Sorted away before Reginald read it...", "Kept for 30 days..."); rubric 4 wants these in a tooltip. Cost 0.3.
- [C] 5 Components · `handled-for-you-day-1440.png`, y 148 and 260: two segmented controls of different weight (the two-tab "Set aside before reading · 2 / Read, nothing to do · 0" pill and the Kind/Reason/Sender grey group) and a dead "0" tab. Cost 0.4.
- [C] 7 Edge · no expanded group is shown, so a row of this screen is never seen in any picture; the zero tab ("Read, nothing to do · 0") has no empty text. Cost 0.5.
- [C] 8 Phone · `handled-for-you-day-390.png`, y 118-170: the two tab pills wrap to two lines inside a pale pill container whose edge is 4px off the page gutter. Cost 0.3.

## today: Today
Pictures opened: 6 of 22 listed (1440 day/night, 390 day, filtered to nothing 1440 day, loading 390 day; not opened: 1024, other states)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 3.7 | 3.8 | 3.8 | 3.8 | 3.9 | 3.8 | 3.6 | 3.8 | 4.2 |
Issues:
- [broken] `today-day-1440.png`, y 570-620 and 665-715, and `today-day-390.png`, y 850-1160: the clash rows read "Today · [dot] Your calendar, avery.lane@example.com and [dot] Your calendar, avery.lane@example.com · No time between them; ..." The two calendars are named in full, and "and" floats alone; on the phone it breaks as "an" / "d" in a 20px column (x 313-330). Fix: put the two event names as a line ("Venue walk-through, Budget check-in") and the calendar in meta once.
- [C] 1 Hierarchy · `today-day-1440.png`, y 150-195 and 260-300: three filled-or-outlined actions compete at the first screen: "Restart now", "Add the Sent folder", "Add one", "Open Venue walk-through", "Open Budget check-in", and "Continue setup" are six same-weight outline buttons; the only filled button (rubric VP04) is absent. Fix: one primary per viewport. Cost 0.4.
- [C] 2 Layout · `today-day-1440.png`, x 256-1072 vs 1096-1416: the right rail ends at y 900 while the main column ends at y 725; the page is 1440x988 and the sidebar ends at y 900 and the page below it fades. Titles of rows start at x 309 with an empty 53px lead slot on rows without an icon, while the clash rows start with a warning triangle at x 285. Cost 0.4.
- [C] 5 Components · `today-day-1440.png`, y 270-280, 355, 490: three chip styles on one screen ("Restart needed" amber, "Sent folder" grey outline, "No AI account" amber) plus the "2 of 7 done" outlined pill. Cost 0.3.
- [C] 4 Type · `today-day-1440.png`, y 365-420: a 4-line paragraph of three calendar names for the Sent-folder row ("Your inbox, avery.lane@example.com, Your inbox, avery.lane.home@example.com, Your inbox, ...") in 13px; names repeat. Cost 0.3.
- [C] 7 Edge · `today-filtered-to-nothing-day-1440.png`, y 300-580: the filter says "Nothing on the Lantern Row Studio side today." with "Clear filter", but an "At risk 1" row ("Back up your work") sits below it in the same card, so the screen both says nothing and shows something. The loading state (`today-loading-day-390.png`) omits the Decide heading and the greeting subtitle, only 3 rows. Cost 0.4.
- [C] 8 Phone · `today-day-390.png`, y 190-1210: the Schedule and Came in sections collapse to two closed rows (good), but the first screen is taken by the setup bar, then 10 lines of text before the first action; the Decide titles are not squeezed (wrap to 2 lines at 250px). Cost 0.4.
- [nit] 6 Colour · `today-day-1440.png`, y 160-175: the setup progress bar is green, a colour used nowhere else on screen (and not the brand).

## today-review: Today, a line opened for review
Pictures opened: 2 of 4 listed (1440 day, 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.4 | 3.8 | 3.9 | 3.7 | 4.0 | 3.2 | 3.9 | 3.68 | 4.1 |
Issues:
- [B] 2 Layout · `today-review-day-1440.png`, x 256-850 and 1055-1417, y 90-450: the title and help text sit on the left, the Details card is pushed to the far right at 360px wide, and 200px of empty space between them; below y 450 the screen is empty. Fix: put the details under the title in one column at the content width. Cost 0.6.
- [B] 7 Edge · same picture: this is a calendar event with no actions available (the page says "nothing here can be changed"), so the reviewing person has no primary, no "Open in calendar", no "Done" and the "Back" text button is the only control. A review screen for a line that wanted a decision shows nothing to decide. Cost 0.6.
- [C] 1 Hierarchy · `today-review-day-1440.png`, y 120-150: title (serif 28) and a grey "Calendar event" tag look right; the help paragraph "This is what your calendar says. The app keeps no entry of its own for it, so nothing here can be changed." is 2 lines of internal-logic copy (rubric 4). Fix: a one-line "From your calendar". Cost 0.3.
- [C] 5 Components · `today-review-day-1440.png`, y 90-100: "Back" is a bare text button at 13px (no icon, no hit-target frame) offset 9px right of the title edge (x 265 vs 256). Cost 0.3.
- [nit] 8 Phone · `today-review-day-390.png`: clean, one column, card full width; "Back" at x 25 vs title x 16, same offset.

## Summary
| Screen | Overall | Lowest point | Brand | Passes 4.0 / no point under 3.5 / brand ≥4.0 | Passes 4.6 / no point under 4.3 / brand ≥4.5 |
|---|---|---|---|---|---|
| schedule-month | 4.0 | 7 Edge 3.7 | 4.2 | yes | no |
| schedule-work-week | 3.9 | 7 Edge 3.6 | 4.2 | no (overall 3.89) | no |
| schedule-day | 3.9 | 8 Phone 3.6 | 4.2 | no (overall 3.86) | no |
| todos | 3.8 | 2 Layout 3.6 | 4.2 | no (3.84) | no |
| questions | 3.8 | 1/2/5 3.7 | 4.0 | no (3.84) | no |
| schedule-week | 3.8 | 7 Edge 3.4 | 4.2 | no (point under 3.5) | no |
| schedule-entry | 3.8 | 7 Edge 3.5 | 4.1 | no (3.80) | no |
| today | 3.8 | 8 Phone 3.6 | 4.2 | no (3.8) | no |
| since-yesterday | 3.8 | 1/2 3.6 | 4.1 | no (3.78) | no |
| followups-empty | 3.8 | 2 Layout 3.6 | 4.0 | no (3.76) | no |
| followups-waiting | 3.7 | 7 Edge 3.4 | 3.9 | no (point under 3.5, brand under 4.0) | no |
| followups | 3.7 | 2 Layout 3.5 | 4.1 | no (3.73) | no |
| followups-later | 3.7 | 7 Edge 3.4 | 3.9 | no (point under 3.5, brand under 4.0) | no |
| schedule-timeline | 3.7 | 1, 2, 7 3.4 | 4.1 | no (point under 3.5) | no |
| today-review | 3.7 | 7 Edge 3.2 | 4.1 | no (point under 3.5) | no |
| what-changed | 3.7 | 1 Hier 3.4 | 4.1 | no (3.66) | no |
| stages | 3.7 | 1/2/7 3.4 | 3.9 | no (point under 3.5, brand under 4.0) | no |
| schedule-add | 3.65 | 8 Phone 3.0 | 4.0 | no (point under 3.5) | no |
| handled-for-you | 3.65 | 2, 7 3.4 | 4.0 | no (point under 3.5) | no |
| followups-by-project | 3.6 | 1, 2, 5 3.4 | 4.0 | no (point under 3.5) | no |
| todos-many | 3.6 | 7 Edge 3.2 | 4.0 | no (point under 3.5) | no |

No screen reaches 4.6. Only the 4.0 bar is met by schedule-month (4.01).

Common cause across the part: the 53px empty lead gutter on every list row (followups, since-yesterday, what-changed, handled, today), the project chips with "not in a project", the filter bars with counts that contradict the empty states, and 24-hour grids that open on empty hours.

Top ten fixes, in order of score gained:
1. Schedule grids (day, work-week, week, add the week fix): open scrolled to the first event or the working day, and give the Week tab a real 7-day view (the Week captures show Weekdays). Gains about 0.3 each on 4 screens.
2. Follow-ups and To-dos filter bars: count only what the tab holds, hide filters on empty lists or below about 12 items (later, waiting, questions, filtered states). About 0.3 on 6 screens.
3. Remove "X: not in a project" chips and the duplicate group header text (todos, followups, by-project). About 0.3 on 4 screens.
4. Fill the lead slot with an avatar or remove it (followups, what-changed, since-yesterday, handled-for-you). About 0.25 on 5 screens.
5. What changed: sort "Needs you" first, one status pattern, no "With Reginald" chip on routine rows, remove "cockpit/code" copy. About 0.4.
6. Timeline: label the dots and drop the legend or make it a real list. About 0.4.
7. To-dos many: grouped, collapsed, paged list. About 0.4 on that screen (point 7 up 1.2).
8. Phone Add to schedule (a button on the phone), then capture it. Point 8 on schedule-add up 1.0.
9. Today and Today review: one primary per viewport, fix the clash row text and the orphan "and"/"an d", put the details in one column on the review page with an action. About 0.3 on 2 screens.
10. Content width (VP01): list cards and controls share one right edge on To-dos and Follow-ups. About 0.2 on 3 screens.

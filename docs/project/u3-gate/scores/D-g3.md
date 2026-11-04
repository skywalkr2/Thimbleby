# Scorer D, part G3 (the Schedule)

Capture dir `C` = `.../gate-fix/g3b-capture/`. File names below are relative to it unless prefixed `mock:` (the side-by-side folder).

## schedule-day: Schedule, Day (also the mockup page `schedule`, stricter bar)
Pictures opened: 3 of 5 listed (1440 day, 1440 night, 390 day; the 1024 and 390 night were not opened), plus the mockup side-by-sides (day and night 1440, day 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 3.8 | 4.1 | 4.2 | 4.0 | 4.2 | 4.0 | 3.9 | 4.0 | 4.3 |
Issues:
- [C] 2 Layout (-0.6) · `schedule-day-day-1440.png`, bottom: the grid card ends at y=860 and the sidebar and page canvas stop at y=900, leaving a flat strip of a different tone below; the Day grid is a single 1160px-wide column with one 4-at-once block, so the page is mostly empty bands. Fix: let the shell fill the viewport (min-height 100vh on the sidebar and canvas), and in Day view put a side list ("Today, 4 meetings") beside the hours or cap the column width.
- [C] 1 Hier (-0.6) · `schedule-day-day-1440.png`, header: "Reginald: needs a look" (amber dot pill) and "Hand something in" (filled cream pill) sit beside the burgundy primary; three pill-shaped things of similar weight. The mockup shows a quiet "All good" and an outline "Hand something in". Fix: make "Hand something in" an outline pill and the status a plain dot plus word.
- [C] 5 Comp (-0.6) · all 1440 pictures, toolbar row y=210: the calendar chips run off the right edge and the third reads "Your calendar, avery.lane.stu" cut by the container (clipped word), "Calendars" label is a loose word, the "Show all hours" link (burgundy, underlined, 16px) is as loud as the title link. Fix: collapse calendars into one "Calendars (3)" menu or wrap the chips; use the quiet link style for "Show all hours".
- [C] 4 Type (-0.4) · `schedule-day-day-1440.png`: the calendar names are the raw account label "Your calendar, avery.lane" (and ".home", ".stu...") where the mockup says "Home calendar", "Clinic calendar". Reads as an internal id. Fix: show a display name (calendar title) and keep the address in a tooltip.
- [C] 8 Phone (-0.7) · `schedule-day-day-390.png`: the phone Day view shows the hour grid only down to 7 AM and the toolbar stack (nav row, tab row, calendars row, "Show all hours") takes 280px before any event; the 4-at-once block has an empty lower half; the "Calendars" chips are cut at the right ("Your calendar, av"). The mockup's phone is an agenda list, not a grid. Fix: default phone Day to the agenda list, as Week does; fold the chips into one button.
- [nit] 6 Colour · `schedule-day-night-1440.png`: event blocks are muted blue/green on brown; the clash tint is a near-black red whose edge is the only separator. Passes day and night readably. Burgundy "Today" line by day and coral by night are both fine.
- [nit] 3 Space · `schedule-day-day-1440.png`: the nav row (y=168) and tab row (y=210) are 42px apart and the third row of calendars chips adds a third alignment; the title block is tight to the nav row (28px) while "Show all hours" floats 24px under it. Fix: one rhythm of 16/24.
Differences from the mockup that cost points (mockup page `schedule`): (1) default view Day with an empty 1-8 AM grid instead of a Week with the whole working day; (2) header status and "Hand something in" styles; (3) calendar names and clipped chips; (4) no "Your sides" and "Records" groups in the left menu (it has "Saved items"), and a different tab list ("Weekdays" added) with a segmented control rather than the mockup's underline tabs; (5) no title subline of "This week"; the build repeats "1 clash, on Wednesday" as an underlined link; (6) "Show all hours" link; (7) the Today column is tinted beige but the mockup uses a numbered burgundy day chip; (8) phone: the mockup shows an agenda list with a "Clash · 30 min short" row with "Open both"; the build Day phone is a clipped grid; (9) the build search field has no "/" hint and a bold black focus border.


## schedule-work-week: Schedule, Work week ("Weekdays")
Pictures opened: 3 of 5 (day 1440, night 1440, day 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 3.9 | 4.1 | 4.2 | 4.0 | 4.2 | 4.0 | 4.1 | 4.06 | 4.3 |
Issues:
- [C] 2 Layout (-0.7) · `schedule-work-week-day-1440.png`, x=256-1416, y=266-860: the grid is cut at 8 AM with no inner scroll cue and the card ends 40px above the end of the sidebar; the day starts at 1 AM, so the working hours (9-5) are below the fold, the opposite of what "Weekdays" is for. Fix: start the visible range at the first working hour (or the first entry minus one hour) and fill the viewport height.
- [C] 5 Comp (-0.6) · same picture, y=186-226: clipped third calendar chip "avery.lane.stu", raw "Your calendar, ..." names, loud "Show all hours" link (see schedule-day).
- [C] 1 Hier (-0.6) · `schedule-work-week-day-1440.png` header: amber status pill and cream "Hand something in" pill compete with the burgundy primary.
- [nit] 8 Phone · `schedule-work-week-day-390.png`: the Clash group's tinted gradient runs behind four rows of two-line meta; the account name repeats on every row ("Your calendar, avery.lane"), so meta wraps to two lines on every entry. Fix: drop the calendar name when one calendar holds most entries, or use the colour dot only.
- [nit] 6 Colour · `schedule-work-week-night-1440.png`: clash tint is a dark brown block with a coral outline; readable.

## schedule-week: Schedule, Week
Pictures opened: 4 of 5 (day 1440, night 1440, day 390, night 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 4.0 | 4.1 | 4.1 | 4.0 | 4.2 | 3.9 | 3.6 | 4.0 | 4.3 |
Issues:
- [B] 8 Phone, broken data · `schedule-week-day-390.png`, the list: the "Week" tab shows Monday to Friday only, "Nov 2 – 6", identical to "Weekdays", so Saturday's "Public holiday" (shown on the 1440 Week picture, Sat Nov 7) is missing. A seven-day view that drops two days is wrong, and it makes the two tabs indistinguishable. Fix: phone Week lists Mon-Sun and the range reads "Nov 2 – 8".
- [C] 1 Hier / 2 Layout · `schedule-week-day-1440.png`, y=406-592: the "4 at once" block is 154px wide, so its title is cut ("4 at once · 1:53 ...", "Venue walk-throu...") and a third of the box is empty tint below the last entry. Fix: size the clash box to its rows; stack it in a wider popover or show the title only.
- [C] 5 Comp · same chips and "Show all hours" issues as schedule-day.
- [C] 3 Space · `schedule-week-day-1440.png`: Quarterly review block text "5:00 AM · In 2 calend..." truncates meta that matters ("In 2 calendars").
- [nit] 4 Type: "Today · Wed, Nov 4" is bold 13px beside regular "Thu, Nov 5"; fine.

## schedule-month: Schedule, Month
Pictures opened: 3 of 5 (day 1440, night 1440, day 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.2 | 4.2 | 4.2 | 4.2 | 4.1 | 4.2 | 4.1 | 4.0 | 4.15 | 4.3 |
Issues:
- [C] 5 Comp (-0.5) · `schedule-month-day-1440.png`, the calendar chips and "Calendars" label (y=210) clip at the right ("avery.lane.stu"); week-day header row (Mon…Sun, 11px) is separated from the title by 40px.
- [C] 4 Type (-0.4) · `schedule-month-day-1440.png`, cell Wed 4: entries carry 13px titles wrapping to "Venue walk-/through", the "1 more" link is 12px burgundy underline at 24px height (small hit target).
- [C] 8 Phone · `schedule-month-day-390.png`: the month grid is 440px tall with count circles plus up to four dots per day (a ring with "4" and four dots) — doubled encoding; the day list sits below the fold behind the tab bar. Fix: show either the count or the dots.
- [nit] 2 Layout: sidebar ends at y=900 while the month grid continues to y=1020 (shell does not fill the page; likely capture, but visible).

## schedule-timeline: Schedule, Timeline
Pictures opened: 3 of 5 (day 1440, night 1440, day 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.7 | 3.9 | 3.9 | 3.8 | 4.0 | 3.7 | 4.0 | 3.85 | 4.1 |
Issues:
- [B/C] 2 Layout (-1.0) · `schedule-timeline-day-1440.png`, x=432-1416, y=268-500: eight entries stacked as a diagonal staircase, each label running across the hatched weekend bands ("Nov 4 Fitting appointme…" over hatching at x=567); labels cut to "Venue walk-thr…", "Budget chec…". The right two thirds of the chart is empty and the page is empty below y=540. Fix: put labels in a left list column, mark days on the track; give hatching a lower contrast so text reads; size the chart to its content.
- [C] 4 Type · `schedule-timeline-day-1440.png`: date prefix ("Nov 4") 12px muted directly against the title in the same line; the title and date read as one phrase. Fix: bold titles, date in its own column.
- [C] 5 Comp · `schedule-timeline-day-390.png`: every marker is the same burgundy dot, so calendar colours (blue/green/purple on the other views) are lost, and burgundy reads as the brand/danger colour. Fix: use the calendar colour dot.
- [C] 3 Space · `schedule-timeline-day-1440.png`: three control rows (nav, view tabs plus range tabs, calendars chips clipped "avery.lan") are 4px-tighter than other views, so the title block jumps between views by 24px (subline absent).
- [nit] 1 Hier: the "Today" burgundy flag is the only accent in the chart; good.

## schedule-add: Add to schedule (drawer / sheet)
Pictures opened: 3 of 5 (day 1440, night 1440, day 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.2 | 3.8 | 4.2 | 4.3 | 4.1 | 4.2 | 4.2 | 4.3 | 4.16 | 4.3 |
Issues:
- [C] 2 Layout (-0.8) · `schedule-add-day-1440.png`, x=960-1440, y=0-508: the drawer is a 480px panel that stops at y=508 with a hard bottom edge and no rounding, leaving an unfinished panel floating over the dimmed page; below it the scrim is unbroken. Fix: full-height drawer (or a centred dialog), footer pinned at the bottom.
- [C] 2 Layout / 3 Space · same picture, y=226-320: "Ends at" sits alone on its row with an empty right half, then helper "Give a start time first." — the form has holes; Day and Starts at share a row, Ends does not. Fix: Day / Starts / Ends in one row, or one column.
- [C] 5 Comp · `schedule-add-day-1440.png`, y=478: the "Add" button is a washed pale pill (disabled) with burgundy text; it reads as a secondary and as neither disabled nor enabled; no reason is shown. Fix: a real disabled style (grey) plus the missing-field hint.
- [nit] 6 Colour · `schedule-add-night-1440.png`: Add in near-black text on dark = low contrast (disabled).
- [nit] 8 Phone · `schedule-add-day-390.png`: sheet works, grab handle, Cancel and Add pinned; no keyboard offset shown.

## schedule-entry: an entry opened (popover / sheet)
Pictures opened: 3 of 5 (day 1440, night 1440, day 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 4.0 | 4.2 | 4.3 | 4.2 | 4.2 | 4.2 | 4.4 | 4.2 | 4.3 |
Issues:
- [C] 2 Layout (-0.6) · `schedule-entry-day-1440.png`, x=996-1416, y=238-541: the popover is pinned top-right instead of anchored to the entry (Quarterly review is at x=793, y=650), covers the "Fri, No…" column header and the grid's top rows, and has no scrim or pointer, so it is not clear which entry it belongs to. Fix: anchor beside the selected block with an arrow, or use a side panel.
- [C] 1 Hier (-0.5): "Open the event" is a full burgundy primary but the action only opens an outside app; fine as the one primary, but the "Change it in your calendar app." note is 13px muted and easy to miss.
- [nit] 5 Comp · `schedule-entry-day-1440.png`: the selected block shows a 2px burgundy outline that is the same red as the clash edge, so selected and clashing look alike.

## schedule-day / Nothing today
Pictures opened: 3 of 5 (day 1440, night 1440, day 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.6 | 4.0 | 4.0 | 3.7 | 4.1 | 3.0 | 3.6 | 3.70 | 3.8 |
Issues:
- [B] 7 Edge (-1.6) · `schedule-day-nothing-today-day-1440.png`, y=842-870: the empty state is an 870px-tall empty hour grid and one grey line "Nothing on this day." at the very bottom (y=861), out of sight at 1440 and hidden by the tab bar at 390 (`...-390.png`, y=848). No title, no brand moment, no next action (the mockup state has a serif "Nothing on this week", one sentence, a "Next week" pill). Fix: replace the grid with a centred empty card or put the line at the top of the grid; offer "Add to schedule" or "Next day".
- [C] 1 Hier · the emptiness gets more room than any content.
- [C] 5 Comp · same chips as the others.
- [C] 8 Phone · `schedule-day-nothing-today-day-390.png`: the grid ends below the tab bar; the only message sits under it.

## schedule-day / All-day entries
Pictures opened: 3 of 5
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 4.0 | 4.1 | 4.2 | 4.1 | 4.2 | 4.1 | 4.0 | 4.1 | 4.3 |
Issues:
- [C] 5 Comp · `schedule-day-all-day-entries-day-1440.png`, y=308-368: the "×3" duplicate badge (Public holiday ×3) is a small outline pill, a style used nowhere else; same-named entries are merged on desktop but listed three times on the phone week list (`schedule-work-week-all-day-entries-and-overlaps-day-390.png`). Be consistent.
- [nit] 2 Layout: all-day band rows 32px full width bars: heavy for two entries.
- Same header and chip issues as schedule-day.

## schedule-work-week / Nothing this week
Pictures opened: 3 of 5
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.6 | 4.0 | 4.0 | 3.7 | 4.1 | 3.2 | 3.8 | 3.75 | 3.8 |
Issues:
- [B] 7 Edge · `schedule-work-week-nothing-this-week-day-1440.png`, y=860: a 6-column empty grid plus a 13px help paragraph "Nothing on the calendar in these days. Use Add to schedule above to put a meeting on it." that points up at a button (the rubric asks for a state that says it at the moment of use, not a paragraph). No designed empty card, no "Next week" action (mockup has both).
- [C] 8 Phone · `...-nothing-this-week-day-390.png`: five "Nothing on Monday" rows is a better empty state than the desktop, but the help paragraph repeats it below.

## schedule-work-week / A busy week
Pictures opened: 3 of 5
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.8 | 4.0 | 4.1 | 4.0 | 4.2 | 3.8 | 4.0 | 3.97 | 4.3 |
Issues:
- [C] 7 Edge / 2 Layout · `schedule-work-week-a-busy-week-day-1440.png`, y=826-862: the 8 AM row of "Meeting 1/37/28/19/10" cards is cut off by the card's bottom edge (text "Meeting 28 8:00 AM · Your calendar, avery.l…" halfway visible) and the grid starts at 2 AM so the visible area is five empty hours for one clash. Fix: scroll to first entry and show a "45 meetings" scroll cue, or fit the visible range to the entries.
- [C] 4 Type · event meta "8:00 AM · Your calendar, avery.l…" truncated to nonsense; show time and title only.
- [nit] 8 Phone · `...-390.png` (45 rows long list, no day collapsing); acceptable.

## schedule-work-week / All-day entries and overlaps
Pictures opened: 3 of 5
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 3.9 | 4.1 | 4.1 | 4.0 | 4.2 | 4.0 | 3.9 | 4.03 | 4.3 |
Issues:
- [C] 4 Type · `schedule-work-week-all-day-entries-and-overlaps-day-1440.png`, x=762-976, y=512-652: overlapped blocks Planning and Review are half-width and their meta reads "10:00 AM · Y…" (cut); text under 110px wide.
- [C] 2 Layout · same picture: the hour labels skip 8 AM (the all-day band pushes the grid to y=372, first label 9 AM at y=437) leaving a blank 65px gap with no label.
- [nit] 8 Phone · `...-390.png`: three identical "Public holiday" rows, then Offsite; merge as on desktop.

## schedule-week / Nothing this week
Pictures opened: 3 of 5 (day 1440, day 390; night not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.6 | 4.0 | 4.0 | 3.7 | 4.1 | 3.2 | 3.8 | 3.75 | 3.8 |
Issues: same as work-week nothing: [B] 7 Edge · `schedule-week-nothing-this-week-day-1440.png`, y=861 help line, no designed empty card; phone `...-390.png` lists Mon-Fri only on a "Week" view.

## schedule-week / A busy week
Pictures opened: 2 of 5 (day 1440; the phone picture was not opened for this state)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.8 | 4.0 | 4.0 | 4.0 | 4.2 | 3.8 | 3.8 | 3.94 | 4.2 |
Issues:
- [C] 7 Edge · `schedule-week-a-busy-week-day-1440.png`, y=826-862: 8 AM meeting cards cut at the card's bottom; their text "Meeting 28 8:00 AM · Your calen…" truncated at 140px; Sat and Sun columns carry nothing while the day above has a staggered grid.
- [C] 2 Layout: the clash box is narrow (154px) so its heading "4 at once · 1:53 ..." and "Venue walk-throu..." are cut.
- Phone not opened separately (score from the sibling state `schedule-work-week-a-busy-week-day-390.png`).

## schedule-week / All-day entries and overlaps
Pictures opened: 3 of 5
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 3.9 | 4.1 | 4.0 | 3.9 | 4.2 | 4.0 | 3.7 | 3.98 | 4.3 |
Issues:
- [B/C] 8 Phone · `schedule-week-all-day-entries-and-overlaps-day-390.png`: the "Week" view again lists Mon to Fri ("Nov 2 – 6"), so Saturday's "Public holiday" shown on the 1440 picture is missing on the phone.
- [C] 5 Comp · `schedule-week-all-day-entries-and-overlaps-day-1440.png`, x=482-630, y=306-346: the "×3" badge wraps under "Public holiday" and makes that bar double height.
- [C] 4 Type · "Planning 10:00 A…" and "Review 11:00 A…" meta cut at 70px.

## schedule-month / A busy month
Pictures opened: 3 of 5 (day 1440, day 390; night not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 4.0 | 3.9 | 4.0 | 4.1 | 4.2 | 4.1 | 4.0 | 4.04 | 4.3 |
Issues:
- [C] 3 Space / 4 Type · `schedule-month-a-busy-month-day-1440.png`: every cell shows "Annual planning review with the..." in two truncated lines, so cells have mixed heights per row (Wed 4 and "9 more" make a row 235px, others 105px) and week rows are uneven (y=500-735 vs 735-970 vs 970-1205).
- [C] 5 Comp · "5 more" links are 12px; cells at 330px hold no overflow count for days with 4 items except the link.
- [nit] 8 Phone · `...-390.png` the count ring + dots; a long list of day entries is clear.

## schedule-month / An all-day entry
Pictures opened: 2 of 5 (day 1440, day 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 4.1 | 4.1 | 4.2 | 4.1 | 4.2 | 4.1 | 4.0 | 4.11 | 4.3 |
Issues:
- [C] 5 Comp · `schedule-month-an-all-day-entry-day-1440.png`: "Team offsite" is shown as a timeless bar spanning only one cell on each day it runs, with no multi-day bar from Wed 4 to Fri 6 (three separate pills); an all-day multi-day entry should read as one bar.
- Same chip row clipping as other views.

## schedule-month / A month with nothing
Pictures opened: 3 of 5 (day 1440, day 390; night not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 4.1 | 4.2 | 4.2 | 4.1 | 4.2 | 3.4 | 3.9 | 3.99 | 3.9 |
Issues:
- [C] 7 Edge (-1.2) · `schedule-month-a-month-with-nothing-day-1440.png`, y=888: an unchanged empty month grid and the same grey help sentence below it ("Use Add to schedule above..."); no empty-state card, no brand moment. `...-390.png`: the sentence sits at y=848, partly under the tab bar ("schedule above to put a meeting on it.").
- [C] 1 Hier: the only hint of what to do is a 13px sentence under the fold.

## schedule-timeline / Many lanes
Pictures opened: 3 of 5
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.7 | 3.8 | 3.9 | 3.8 | 3.9 | 3.9 | 4.0 | 3.85 | 4.0 |
Issues:
- [C] 2 Layout · `schedule-timeline-many-lanes-day-1440.png`, y=268-1130: lane heights vary (37px, 78px, 93px) so rows have no rhythm; a lane label of three lines ("Quarterly program of work number 1 for the northern region", 80px tall) makes a lane taller than its content; empty lanes ("Project 5", "Project 9") occupy a full row each.
- [C] 4 Type · labels like "Nov 5 Step 1 of 2" run through the hatching (x=567-575); "Nov 23 Step 1 of 8" is struck by the hatch.
- [C] 5 Comp · square checkbox markers (12px) look tickable but are not, and there is no state meaning ("To-do or promise with a day" legend).
- [nit] 8 Phone · `...-390.png`: grouped by week, readable.

## schedule-timeline / Many entries
Pictures opened: 3 of 5
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.5 | 3.8 | 3.8 | 3.8 | 3.9 | 3.6 | 4.0 | 3.75 | 4.0 |
Issues:
- [B/C] 2 Layout · `schedule-timeline-many-entries-day-1440.png`, y=268-640: 36 entries in a single "Everything" lane, in two staircases that overlap each other: "Nov 18 Item 9 with a lon…" starts at x=657 beside "Nov 2 Item 1 with a long…" at x=437 and the third column starts at x=855 — three columns of labels collide, with the Dec 30–Jan 9 entries flipped to the left of their markers (x=1075-1395). Every label is truncated "Item 12 with a lo…" so titles are unreadable. Fix: label in a list pane, wrap.
- [C] 6 Colour · hatching under every label lowers legibility; the overdue triangle icons (red) and checkboxes are 14px.
- [C] 7 Edge · 36 items shown with no count or "show all" control.

## schedule-timeline / Nothing on it
Pictures opened: 3 of 5
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.3 | 3.8 | 3.9 | 3.5 | 4.0 | 2.9 | 3.2 | 3.5 | 3.7 |
Issues:
- [B] 7 Edge (-1.7) · `schedule-timeline-nothing-on-it-day-1440.png`, y=230-280: two bare lines "Nothing with a date in these weeks." and the hatch legend "Days off: hatched, named in the details" (a legend for a pattern that is not shown), then 600px of blank page. No card, no action, no brand moment.
- [B] 2 Layout · same picture: after the toolbar the screen drops its chart frame, so the layout collapses from a bordered chart to loose text.
- [B] 8 Phone · `schedule-timeline-nothing-on-it-day-390.png`: 470px of blank between the legend and the tab bar.

## schedule-entry / A long title and place
Pictures opened: 3 of 5
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 4.0 | 4.2 | 4.3 | 4.1 | 4.2 | 4.4 | 4.4 | 4.21 | 4.3 |
Issues:
- [C] 2 Layout · `schedule-entry-a-long-title-and-place-day-1440.png`, x=996-1416: popover grows to 347px tall and covers the entry's own clash box (the chosen block at y=443 is partly under the focus underline "Annual planning r…" underlined, a link-style underline on a block, inconsistent with the other blocks).
- [nit] 4 Type: title wraps to three lines at 18px; fine; place wraps well on the phone.

## schedule-entry / No place
Pictures opened: 3 of 5
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 4.0 | 4.2 | 4.3 | 4.2 | 4.2 | 4.4 | 4.4 | 4.22 | 4.3 |
Issues: same anchoring problem as schedule-entry (`schedule-entry-no-place-day-1440.png`); the "Where" row is cleanly omitted and the popover shrinks. No other issues.

## schedule-add / A long title
Pictures opened: 3 of 5
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.2 | 3.8 | 4.2 | 4.2 | 4.1 | 4.2 | 4.0 | 4.3 | 4.13 | 4.3 |
Issues:
- [C] 7 Edge · `schedule-add-a-long-title-day-1440.png`, y=92-132: a one-line field scrolls the long title so its start is cut (the field shows "…and then the follow-up..."); there is no wrap or counter, and the person cannot see the beginning. Fix: auto-grow a textarea.
- Same drawer shape issue as schedule-add (stops at y=508).

## schedule-add / The end before the start
Pictures opened: 3 of 5
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 3.8 | 4.2 | 4.2 | 4.1 | 4.1 | 4.2 | 4.2 | 4.11 | 4.3 |
Issues:
- [C] 5 Comp / 6 Colour · `schedule-add-the-end-before-the-start-day-1440.png`, y=272-330: the error "It has to end after it starts." is red text with a left bar and no icon; status carried by colour plus words, but the 12px error type is small. The invalid field's red border is thin.
- [C] 5 Comp (focus) · same picture, y=364-408: the focus ring (dark burgundy, 3px) is on the Place field, not on the invalid Ends field, so the error and the focus point at different things. Fix: move focus to the invalid field.
- [C] 5 Comp: "Add" stays washed pale (disabled look) with no hint why beyond the error.

## schedule-day / Loading
Pictures opened: 4 of 5 (day 1440, night 1440, day 390; night 390 not captured)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.8 | 3.8 | 3.8 | 3.5 | 4.0 | 3.4 | 3.7 | 3.68 | 3.9 |
Issues:
- [C] 5 Comp · `schedule-day-loading-day-1440.png`, y=222-810: the skeleton is two shades off the card colour, almost invisible; it shows only a header tile and 8 short bars in the hour gutter, no event placeholders, so nothing suggests where content will go. The nav badges disappear ("Today" has no count) and the page subline is absent, which shifts the layout up 24px when the content arrives (layout shift).
- [C] 7 Edge: no spinner or text; on the night picture (`...-loading-night-1440.png`) it is near-invisible (dark grey on dark).
- [C] 8 Phone · `...-390.png`: same, plus the grid runs under the tab bar.

## schedule-day / Couldn't load
Pictures opened: 4 of 5 (day 1440, night 1440, day 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.7 | 4.0 | 4.0 | 3.9 | 4.0 | 3.8 | 3.9 | 3.89 | 4.0 |
Issues:
- [C] 7 Edge · `schedule-day-couldn-t-load-day-1440.png`, y=80-480: the capture shows the offline banner and the "Your schedule couldn't be loaded." message together, two messages with two actions ("Try now" and "Try again") for one cause; the header also reads "Disconnected · reconnecting" in red — three signals. The error text is 14px grey with no reason or time. Fix: one banner or one card; one retry.
- [C] 2 Layout: the banner pushes the page title down 90px (title at y=187 instead of 97).
- [nit] 6 Colour: error icon beige tile fine; red status text "Disconnected" is the danger red, close to the burgundy brand (hue collision noted in the rubric) — the pill is distinguishable only by the dot and word.

## schedule-day / Offline
Pictures opened: 4 of 5 (day 1440, night 1440, day 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 3.9 | 4.0 | 4.1 | 4.0 | 4.1 | 4.1 | 4.0 | 4.03 | 4.2 |
Issues:
- [C] 2 Layout (-0.7) · `schedule-day-offline-day-1440.png`, y=80-146: a 66px two-line amber banner pushes the whole page 90px down; the mockup used a 40px single-line bar. The content is the stale schedule with no mark that its entries are old beyond "loaded at 1:41 AM"; the 4-at-once block keeps full strength.
- [C] 5 Comp · header status "Disconnected · reconnecting" in red plus the banner repeat the same fact.
- [nit] 6 Colour · `schedule-day-offline-night-1440.png`: amber banner on dark brown is readable.

## Not covered by the new capture
The mockup states sheet has "One calendar can't be read", "Studio entries shown while its calendar can't be read" (dashed edge, "may be out of date") and "Three meetings at once". The new capture has none of the first two, so the connected-calendar sign-in banner and the stale-entry marking cannot be scored; the lack costs point 7 on the mockup page. Three at once is covered by the day/work-week clash block.

## Summary
| Screen | Overall | Lowest point | Brand | Passes 4.0 / no point under 3.5 / brand ≥4.0 | Passes 4.6 / no point under 4.3 / brand ≥4.5 |
|---|---|---|---|---|---|
| schedule-day | 4.03 | 3.8 (2) | 4.3 | yes | no |
| schedule-work-week | 4.06 | 3.9 (2) | 4.3 | yes | no |
| schedule-week | 4.0 | 3.6 (8) | 4.3 | yes (borderline; phone data fault) | no |
| schedule-month | 4.15 | 4.0 (8) | 4.3 | yes | no |
| schedule-timeline | 3.85 | 3.7 (2, 7) | 4.1 | no (overall) | no |
| schedule-add | 4.16 | 3.8 (2) | 4.3 | yes | no |
| schedule-entry | 4.2 | 4.0 (2) | 4.3 | yes | no |
| day: nothing today | 3.70 | 3.0 (7) | 3.8 | no | no |
| day: all-day entries | 4.1 | 4.0 | 4.3 | yes | no |
| work week: nothing | 3.75 | 3.2 (7) | 3.8 | no | no |
| work week: busy | 3.97 | 3.8 | 4.3 | no (by 0.03) | no |
| work week: all-day + overlaps | 4.03 | 3.9 | 4.3 | yes | no |
| week: nothing | 3.75 | 3.2 (7) | 3.8 | no | no |
| week: busy | 3.94 | 3.8 | 4.2 | no | no |
| week: all-day + overlaps | 3.98 | 3.7 (8) | 4.3 | no (by 0.02) | no |
| month: busy | 4.04 | 3.9 | 4.3 | yes | no |
| month: all-day entry | 4.11 | 4.0 | 4.3 | yes | no |
| month: nothing | 3.99 | 3.4 (7) | 3.9 | no (brand under 4.0) | no |
| timeline: many lanes | 3.85 | 3.7 | 4.0 | no | no |
| timeline: many entries | 3.75 | 3.5 | 4.0 | no | no |
| timeline: nothing on it | 3.5 | 2.9 (7) | 3.7 | no | no |
| entry: long title and place | 4.21 | 4.0 | 4.3 | yes | no |
| entry: no place | 4.22 | 4.0 | 4.3 | yes | no |
| add: long title | 4.13 | 3.8 | 4.3 | yes | no |
| add: end before start | 4.11 | 3.8 | 4.3 | yes | no |
| day: loading | 3.68 | 3.4 (1, 7) | 3.9 | no | no |
| day: couldn't load | 3.89 | 3.7 | 4.0 | no | no |
| day: offline | 4.03 | 3.9 | 4.2 | yes | no |

Mockup pages (stricter bar: 4.6 overall, no point under 4.3, brand at least 4.5):
| Page | Build overall | Lowest point | Brand | Passes 4.6 |
|---|---|---|---|---|
| `schedule` (day, work week, week, month, timeline, add, entry) | 4.06 | 3.6 to 3.8 on Layout, Phone and Edge | 4.3 | no |
| `schedule-states` (the 21 state captures) | 3.88 | 2.9 on Edge (Timeline nothing) | 4.0 | no |

Nothing reaches 4.6. 15 of the 28 screens and states pass 4.0 (day, work week, month, add and entry main screens, day all-day, work-week all-day, both month busy and all-day, the two entry states, both add states, offline); the rest fail on edge states or Timeline layout.

Top ten fixes, in order of score gained:
1. Design real empty states (card with serif title, one line, one action such as "Next week" or "Add to schedule") for Day, Work week, Week, Month and Timeline "nothing" states; drop the grey help paragraph and, on Timeline, the orphan hatch legend. About +0.3 overall on five states and +1.0 on point 7.
2. Fix the phone Week view so it lists all seven days (it currently repeats Mon-Fri and omits Saturday's entry); make "Week" and "Weekdays" differ.
3. Rebuild the Timeline: labels in a list column or own lane with wrapping, not over hatching; one row rhythm; calendar-coloured markers; fit height to content. About +0.4 on four Timeline screens.
4. Collapse the calendar chips into one "Calendars (3)" control with display names (not "Your calendar, avery.lane"), removing the clipped third chip on every view.
5. Make the shell fill the viewport (sidebar and canvas) and fit the visible hour range to the entries (start near the first entry or working hours), so the 8 AM cards are not cut and the Day view is not empty bands.
6. Calm the header: status as plain dot plus word, "Hand something in" as outline, so the one burgundy "Add to schedule" is the only primary.
7. Give the Add drawer full height (or a centred dialog), put Day/Starts/Ends in one grid, use a real disabled Add, and move focus to the invalid field on error.
8. Anchor the entry popover to its block (arrow, no overlap of the clicked entry) or use a side panel.
9. A designed skeleton for Loading (event-shaped placeholders at readable contrast, no layout shift) and a slim single-line offline bar (and one retry, not banner plus "Try again" plus header status).
10. Widen or stack the clash box and overlap blocks so titles and times are not cut ("4 at once · 1:53 ...", "10:00 A…"); merge repeated all-day entries consistently on the phone.

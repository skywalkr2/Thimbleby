# Scorer F, part G1b

## today: Today
Pictures opened: 3 main (more with states below)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 3.8 | 3.9 | 3.8 | 3.9 | 4.1 | 3.8 | 3.4 | 3.84 | 4.2 |
Issues:
- [B] 8 Phone · `today-day-390.png`, the five conflict rows (y 700-1600): the word "and" breaks into "an / d" in a narrow column to the right of the calendar chips; calendar names are truncated ("Your calendar, avery.lane@exam..."). Broken text. Fix: stack the two entries on their own lines at 480px and under, no inline "and" column. Costs 8 by 0.8. Screen content (conflict row meta), not a shared part.
- [C] 1 Hierarchy · `today-day-1440.png`, centre: five near-identical conflict rows with long meta fill the page; the one Decide item and the 7 at-risk items weigh the same. Fix: fold the conflicts into one group row ("5 clashes") that expands. Screen content.
- [C] 4 Type · `today-day-1440.png`, conflict rows: meta lines wrap to three lines with the email addresses repeated; meta is dense. Fix: show the calendar name only, address in a tooltip. Screen content.
- [C] 3 Space · `today-day-1440.png`, left of the rows: lead icon column ok, but the Decide row's icon sits vertically mid-row while the title is at top; rows have different heights. Shared (rows).
- [C] 2 Layout · `today-day-1440.png`: the right rail ends at y~1040 against the main column at y~975, edges do not end level. Screen content.
- [C] 8 Phone · `today-day-390.png`, bottom: the tab bar is a known artifact (not scored); the red tinted block runs under the left edge to the page edge with no inset, unlike the cards below it. Shared (rows).
- [C] 5 Components · `today-day-1440.png`, Came in: links are underlined burgundy and a dot-led row mixes with un-dotted rows; three button styles (outline, pill-in-row, text "Open"). Shared (rows, chips).
- [nit] 6 Colour · `today-night-1440.png`: the tinted at-risk block is flat brown-red; the gold link dots in Came in read as brand not state. Shared (chips).
- Brand: mark, serif title, burgundy/gold are present and match the site; the serif is on the page title only. 4.2.
State notes for today (pictures opened: loading 1440/390, couldn't-load 1440/390, offline 1440/390, filtered-to-nothing 1440/390; total 11 of 25 listed; 7 Edge revised to 3.9, overall 3.85):
- [C] 7 Edge · `today-loading-day-1440.png`: skeleton is three rows plus a rail card, but the real page has a Decide/At risk structure and a taller rail, so the layout will shift on load; the remainder of the page below y=440 is empty. Shared (skeleton). Fix: skeleton with the group label and the rail's real heights.
- [C] 7 Edge · `today-couldn-t-load-day-1440.png`: error is shown three times (yellow bar "Showing what loaded earlier", red row "couldn't be loaded", two dashed "couldn't be loaded" cards) and the header chip says "Offline"; the bar says "Showing what loaded earlier" while nothing is shown. Contradictory. Screen content. The error box has "Details" in tiny grey. Fix: one message, one Try again.
- [C] 7 Edge · `today-offline-day-1440.png` / `-390.png`: the offline bar is good (a time, a Try now) and the content stays; but the 390 picture repeats the broken "an / d" wrap. Offline bar is shared and fine.
- [C] 1 Hier · `today-filtered-to-nothing-day-1440.png`: the empty card is the biggest block (190px) on the page and pushes the one real item (Back up your work) below it; the filter chip row is a long scrolling tab strip with truncated names ("Harborview Community Su..."). Fix: a one-line empty row not a card; chips truncated mid-word. Shared (empty card, chips).
- [nit] 8 Phone · `today-filtered-to-nothing-day-390.png`: the "Side: Lantern Row Studio" chip stands in for the filter sheet, good.

## handled-for-you: Handled for you
Pictures opened: 7 of 20 (1440 day/night, 390 day, loading 1440, couldn't-load 1440, offline 1440 and 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 3.8 | 4.0 | 3.9 | 3.8 | 4.1 | 3.5 | 3.7 | 3.85 | 4.2 |
Issues:
- [C] 5 Components / 8 Phone · `handled-for-you-day-390.png`, y 115-175: the two-option segmented control ("Set aside before reading · 2" / "Read, nothing to do · 0") stacks its options on two lines inside one big rounded rectangle; the selected cream pill is narrower than the frame, so it looks broken. Shared (segmented control). Fix: equal-width options, each on one line with shorter labels, or a vertical list/tab pair at 480px and under. Costs 0.3 on 8.
- [B-edge] 7 Edge · `handled-for-you-loading-day-1440.png` vs `handled-for-you-day-1440.png`: the loading page shows a search box and a Kind/Reason/Sender segmented control that the loaded page doesn't have, and the skeleton drops the group heading and the second help line; the content jumps about 100px when it loads. Counts show "..." in the chips. Shared (skeleton) and screen content. Fix: show the same chrome in both, or none. Costs 0.4. C severity.
- [C] 7 Edge · `handled-for-you-couldn-t-load-day-1440.png`: the offline bar says "Showing what loaded earlier" while the list shows an error and nothing loaded earlier; header chip "Offline" and a red row say the same thing twice. Search box and Kind/Reason/Sender controls remain active over an error. Shared (offline bar). 
- [C] 7 Edge: no empty state picture for "0 in the list" (the second chip says 0 but no picture of it); the page has no filtered-to-nothing state. 
- [C] 3 Space/2 Layout · `handled-for-you-day-1440.png`: two help paragraphs sit between the control and the list, each on its own line with a 30px gap, as two separate blocks; the meta text of each row is capped at about 600px while the action sits at 1300px, a 400px gap in the row. Screen content / rows. Fix: one help line; move the action closer or let meta run wider.
- [C] 1 Hier · `handled-for-you-day-1440.png`: page is a low-stakes archive; fine, but the group heading and the chip both name the same count; "Bring it in" is the only action and is correctly quiet. nit.
- [nit] 6 Colour · `handled-for-you-night-1440.png`: "Bring it in" gold text on a tinted pill is good; the cards lift only by a hairline. Shared.

## followups: Follow-ups
Pictures opened: 9 of 25 (1440 day/night, 390 day, loading, couldn't-load, offline, filtered 1440 and 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 3.9 | 3.9 | 4.0 | 3.8 | 4.1 | 3.6 | 3.7 | 3.88 | 4.3 |
Issues:
- [C] 5 Components · `followups-day-390.png`, y 245-280: a filled burgundy pill "Send one at a time" sits on the top-left corner of the list card, half over its border, looking like a stray label. It is also a second filled element (the add circle is in the bar). Shared (chips). Fix: put it inside the card as a heading line or drop it.
- [C] 2 Layout · `followups-day-1440.png`: "Your own to-dos" card spans the full width with two lines and no action, above the list; the list (ends y=462) and the detail pane (ends y=896) end 430px apart, and the page leaves 400px of empty space before "How your messages start and end". Screen content.
- [C] 5 Components · `followups-day-1440.png`, y 400-430: the Message/Table segmented control is a full-width 28px outline pill whose selected cream chip fills only the left 90px; reads as a stray chip. Shared (segmented control). Fix: equal-width segments, selected fills its half.
- [C] 1 Hier · `followups-day-1440.png`: three "Copy message" outline buttons in the list and one filled "Copy message" in the pane say the same thing; the row's action competes with the pane's. Screen content.
- [C] 2 Layout / drawer · `followups-day-1440.png`, left drawer: "To-dos and ques..." is truncated and its check icon sits 7px left of the other icons (x=22 vs 29), with a second-level indent for the badge; "Harborview Communi..." truncated. Shared (drawer). Fix: wrap or widen the drawer and align the icon column.
- [C] 7 Edge · `followups-filtered-to-nothing-day-1440.png`: the filtered-to-nothing card says "Nobody has one yet" (a first-run message) and gives no "Clear filter" action, unlike Today's version, so the person cannot tell a filter is on. The filter chip strip truncates names ("Harborview Community Su..."). Shared (empty card, chips). Costs 0.4.
- [C] 7 Edge · `followups-couldn-t-load-day-1440.png`: the offline bar and the red error row both appear; "Showing what loaded earlier" is wrong since nothing loaded. Shared (offline bar). 
- [C] 7 Edge · `followups-loading-day-1440.png`: skeleton has check circles but real rows have none, and omits the "Your own to-dos" card, so the first row jumps ~65px on load. Shared (skeleton).
- [nit] 4 Type · `followups-day-1440.png`: tab strip (To send/Later/Waiting) active underline is burgundy 2px, good; the help text in the pane is 13px grey, two paragraphs of help text remain on screen where a tooltip could do.
- [nit] 6 Colour · `followups-night-1440.png`: filled "Copy message" in gold is right. Row selection edge is gold, fine.
- [nit] 8 Phone · `followups-filtered-to-nothing-day-390.png`: the "Filter (1)" chip is the sheet entry and is right; fine.

## todos: To-dos and questions
Pictures opened: 9 of 25 (1440 day/night, 390 day, loading, couldn't-load, offline 390, filtered 1440 and 390; the 1440 day and night were both opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.7 | 4.0 | 4.0 | 3.9 | 4.2 | 3.7 | 4.0 | 3.91 | 4.3 |
Issues:
- [C] 2 Layout · `todos-day-1440.png`: the list card ends at x=1136 while the title row's button, the tab rule and the page edge end at x=1416, so a 280px dead gutter sits right of the list (the known VP01 fault, still present). Screen content. Fix: let the list fill the content width or pair it with a rail.
- [C] 1 Hier · `todos-day-1440.png`: two add actions at once ("Add a to-do" filled top right and the inline "Add a to-do..." row), plus the add circle in the phone bar (`todos-day-390.png`, a filled "Add a to-do" under the title and the circle below, three adds). Screen content / shared (header). Fix: keep the inline row and drop the filled button.
- [C] 7 Edge · `todos-loading-day-1440.png`: the skeleton lacks the page subtitle, the add row and the group labels; tab counts show "0" and "0" while loading, which is a false number. Shared (skeleton, chips). Fix: show "..." or hide counts until loaded.
- [C] 7 Edge · `todos-couldn-t-load-day-1440.png`: counts "To-dos 0 / Questions 0" shown beside an error, and the drawer badge says 8: contradictory; offline bar says "Showing what loaded earlier" when nothing is shown. Shared (offline bar, chips).
- [C] 7 Edge · `todos-filtered-to-nothing-day-1440.png`: the tabs say "0" while the unfiltered page has 8; the filter strip is a pill-in-pill of truncated names. The empty card is good (reason plus Clear filter). Shared (chips, empty card).
- [C] 2 Layout · `todos-day-1440.png` drawer: "To-dos and ques..." truncated with its icon offset 7px left of the others and a badge; the drawer shows it truncated at 1440 but whole in the filtered state, so the name changes. Shared (drawer). Fix: allow two lines or widen.
- [C] 4 Type · `todos-day-1440.png`: the Chinese-script title row is bold and its weight reads heavier than neighbours (fallback font); a row title truncates with "..." at two lines (good, but no tooltip visible).
- [nit] 6 Colour · `todos-day-1440.png`: "Due today" in amber text only, with no dot or icon; overdue is not shown, so state by colour plus word, acceptable. The footer "1 to-do needs a date / Give them dates" band is cream on cream with weak separation. Shared (rows).
- [nit] 8 Phone · `todos-day-390.png`: the "..." menus are 16px targets at x=352; rows otherwise stack well. Shared (rows).

## stages: Stages
Pictures opened: 3 of 5 (1440 day/night, 390 day). No state pictures: the only picture is the empty state itself.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.6 | 3.9 | 3.8 | 3.8 | 4.1 | 3.5 | 4.0 | 3.80 | 4.1 |
Issues:
- [C] 7 Edge · `stages-day-1440.png`: the only content is the dashed empty card, a full-width 1160px box with the text held to 380px, leaving 700px of empty box on the right; it has no action (no "How to track work in stages", no link). No loading, error or populated picture exists. Shared (empty card). Fix: size the card to its content or add a next step.
- [C] 4 Type / 1 Hier · `stages-day-1440.png`: the explanation is a four-line help paragraph (the rubric wants a one-line brand voice message); jargon "add-on" and "stage". Screen content.
- [C] 2 Layout · `stages-day-1440.png`: below y=345 the page is empty to the bottom (550px). A first-run page with nothing else. Screen content.
- [nit] 6 Colour · `stages-night-1440.png`: dashed border at low contrast against near-black (about 1.6:1); decorative so acceptable. Shared (empty card).
- [nit] 8 Phone · `stages-day-390.png`: fine; the icon tile and text left edge align at x=41.

## people: People
Pictures opened: 6 of 20 (1440 day/night, 390 day; states below)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.6 | 3.8 | 3.9 | 3.7 | 4.1 | 3.6 | 3.5 | 3.75 | 4.2 |
Issues:
- [C] 2 Layout · `people-day-1440.png`, y 270-310: an empty header band holds only a tiny grid icon at the far right (a column chooser) above the column headers, a 40px row of nothing. Shared (rows/table). Fix: put the control in the section title row.
- [C] 2 Layout · `people-day-1440.png`: three blocks stacked (chips, the Organization label + dropdown, then the table) each with its own edge treatment; the "Organization" label sits above a 160px dropdown alone on its row, 110px of height for one control. The chip strip and the dropdown both filter. Screen content / shared (chips).
- [C] 1 Hier · `people-day-1440.png`: two tables with equal weight, two add buttons ("Add a person" filled, "Add an organization" outline) and heavy 15px bold names in every row; person rows are mostly blank cells (Who they are, How to reach, empty for 3 of 4). Screen content.
- [C] 8 Phone · `people-day-390.png`, y 300-760: each person row stacks "Open items:" / "8" and "Who they are:" / "Printer" as label over value with the "..." on its own line, so one row takes 100-160px with blank-looking space; the label/value pairs are form-like. Shared (rows). Fix: one meta line ("Printer · pat.sample@example.com") and the menu on the title row.
- [C] 3 Space · `people-day-390.png`: the Filter control reads "Side: All" and Organization select are two filters stacked, 150px of header chrome before the first row.
- [C] 5 Components · `people-day-1440.png`: "You" tag is outline, badges elsewhere are cream pill; the filter strip is a 1160px pill-in-pill with the selected "All" in a small cream chip and the other names truncated mid-word ("Harborview Community Su..."). Shared (chips, segmented control).
- [nit] 4 Type · `people-day-1440.png`: table column headers 13px grey bold are fine; the email truncated to "pat.sample@exa..." with room to spare (the column is 360px wide). Fix: let it fill.
People states (opened loading 1440/390, couldn't-load 1440, offline 1440; 10 of 20 total; 7 Edge set to 3.7, overall 3.76):
- [C] 7 Edge · `people-loading-day-1440.png`: the skeleton is a two-table, 4-column grid with six rows, but the loaded page has an Organization select, no column-chooser band and fewer rows; the first table shifts about 40px and the person table is 4 rows not 6. Shared (skeleton). Fix: match row counts and the real chrome.
- [C] 7 Edge · `people-loading-day-390.png`: the skeleton keeps a 4-column table on the phone, but the loaded phone page is stacked label/value cards, a different layout; big shift on load. Shared (skeleton). Costs 0.3 on 8 as well.
- [C] 7 Edge · `people-couldn-t-load-day-1440.png`: the "Add a person" filled button stays live under an error, and the offline bar says "Showing what loaded earlier" with nothing shown. Shared (offline bar).
- [nit] 7 Edge: `people-offline-day-1440.png` is clean: bar with the load time and Try now, content intact. Good. No empty ("no people") or long-name picture, though the long names in the fixtures wrap well.

## rules-review: Rules to look over
Pictures opened: 3 of 5 (1440 day/night, 390 day). No state pictures: judged from the empty state shown.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.6 | 3.9 | 3.8 | 3.8 | 4.1 | 3.5 | 4.0 | 3.81 | 4.1 |
Issues:
- [C] 7 Edge · `rules-review-day-1440.png`: the screen is shown only as empty ("No rules to look over right now."), a full-width dashed card with one line; no populated list, loading or error picture. The scale of the card is 1160 by 140 for one sentence. Shared (empty card). 
- [C] 4 Type · `rules-review-day-1440.png`, y 170-250: a 2-line grey help paragraph plus "Instructions sent with every task: 0 of 8000 characters." in black body weight; this line is internal (a character budget, "instructions", "task") and larger than the empty message. Screen content. Fix: move it to a tooltip or a details row, and it is jargon.
- [C] 2 Layout · `rules-review-day-1440.png`: the paragraph is held to 680px, the card to 1160px, so the right edges differ; below y=420 the page is empty. Screen content.
- [nit] 1 Hier · `rules-review-day-1440.png`: "Back to Knowledge" is small grey 13px and sits above the serif title, fine; but the drawer shows no selected item for this page (Knowledge not highlighted) so the person has no place marker. Shared (drawer).
- [nit] 6 Colour · `rules-review-night-1440.png`: dashed border faint. Shared (empty card).

## status-popover: The header's status popover
Pictures opened: 3 of 5 (1440 day/night, 390 day). The popover is a shared part (header).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.8 | 3.9 | 3.8 | 3.9 | 4.0 | 3.6 | 4.1 | 3.88 | 4.1 |
Issues:
- [broken] 2 Layout · `status-popover-day-1440.png` and `-night-1440.png`, bottom y 660-690: the popover is clipped at the bottom with the "Refresh" button cut by a fade overlay (the button's lower edge is hidden), so the popover is taller than its box with no visible scroll cue. Fix: raise max height or give the list an inner scroll with a visible scrollbar and keep Refresh pinned. Costs 2 by 0.4. Shared (header popover).
- [C] 4 Type · `status-popover-day-1440.png`: three kinds of 13px grey and 15px black lines run together ("Checked 6 connections, last at 5:51 AM" and "Mail from before Wed, Oct 21 has not been read yet" in the same style, no spacing); the section labels (Reginald, Backup, Connections, Updates) are 13px grey with a status dot that is the only state marker. Shared. 
- [C] 6 Colour · `status-popover-day-1440.png`: the dots for Reginald and Backup are amber and Connections green: color plus label, good, but the dot is 6px and the state has no word ("needs a look" appears only in the header). Shared (chips).
- [C] 5 Components · `status-popover-day-1440.png`: anchored to the right at x=723-1143, so it floats 270px left of the status chip it belongs to (chip at x=960-1130); the popover has no arrow and its right edge is 3px off the chip's. Fine, but the page behind is dimmed by a scrim that is brown not neutral by day. nit.
- [C] 3 Space · `status-popover-day-390.png`: the sheet is a good bottom sheet with a handle and a close button; "Mail from before Wed, Oct 21 has not been read yet" runs to the edge, fine. Section gaps 20px, good. The sheet is the best piece in this batch.
- [C] 7 Edge: only the one populated state; no state with an error connection (the rubric's point 5 failing connection) or all-good.

## schedule-day: Schedule, Day (used the newer pictures in g1b-capture-final-schedule)
Pictures opened: 6 of 25 (1440 day/night, 390 day, nothing-today 1440/390, all-day-entries 1440/390; loading, couldn't-load and offline not opened here)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.6 | 3.8 | 3.9 | 3.8 | 4.1 | 3.7 | 3.9 | 3.84 | 4.2 |
Issues:
- [C] 2 Layout · `schedule-day-day-1440.png`: the day grid ends at x=1152 while "Add to schedule", the page edge and the header end at x=1416, leaving a 264px empty gutter on the right (VP01 again). "Show all hours" is at x=1152, the grid's edge, not the content edge. Screen content. Fix: let the grid fill the content width.
- [C] 1 Hier / 3 Space · `schedule-day-day-1440.png`, y 130-300: five stacked control rows before any entry (summary link, date nav, view tabs, calendars chip row, "Show all hours") push the grid to y=300 and the first entry to y=390. Screen content. Fix: merge date nav and view tabs on one row; fold the calendar chips into a "Calendars" menu.
- [C] 2 Layout · `schedule-day-day-1440.png`, y 375-590: a clash group is a pink box listing its entries as stacked bars, not at their times; the 7:00-7:05 Budget check-in and the 6:05 walk-through share one box spanning the 7 AM and 8 AM rows, so the grid and the entries disagree on time. Fix: place entries at their times and show the clash with an edge and icon. Screen content.
- [C] 7 Edge · `schedule-day-nothing-today-day-1440.png`: the empty day is a bare grid with "Nothing on this day." in 15px grey below it at y=1037 (offscreen at 390), no summary line above, no icon or action. This is the designed empty? It is not; the message is the weakest text on the page. Fix: put the message and the "Add to schedule" action at the top of the grid. Costs 0.5. Shared (empty card not used here).
- [C] 8 Phone · `schedule-day-day-390.png`: the title "Schedule" plus "..." plus a two-line summary, the nav row, the tab strip, a Filter chip, Show all hours: 280px of controls; the clash title is truncated ("Clash · travel: you need 30 min to get ..."). The Filter chip is correct (one Filter entry). The 5-tab segmented control is edge to edge and fits. Shared (segmented control, chips).
- [nit] 4 Type · `schedule-day-day-1440.png`: time labels (6 AM...) sit above their lines, offset by about 8px from the rule, so "6 AM" looks tied to the now-line; summary link underlined in burgundy at 15px is loud. 
- [nit] 6 Colour · `schedule-day-night-1440.png`: night is good; clash boxes (brown with coral edge) have an icon and word. Calendar bars lift well.
- [nit] 8 Phone · `schedule-day-all-day-entries-day-390.png`: Planning/Review show "10:00 AM · Your cal..." truncated; fine.
- Brand: 4.2.

## schedule-work-week: Schedule, Work week (shown as "Weekdays")
Pictures opened: 8 of 25 (1440 day/night, 390 day, nothing-this-week 1440/390, busy-week 1440/390, all-day-and-overlaps 1440)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.9 | 3.8 | 3.8 | 3.8 | 4.1 | 3.8 | 4.0 | 3.89 | 4.2 |
Issues:
- [C] 1 Hier / 3 Space · `schedule-work-week-day-1440.png`, y 130-300: same stack of five control rows as Day (summary link, date nav, tabs, calendar chips, Show all hours); the grid starts at y=303. Shared across all Schedule views. Fix: fold the calendar chips and merge rows.
- [C] 7 Edge · `schedule-work-week-a-busy-week-day-1440.png`: with 45 meetings the cells show "Meeting 1 / 8:00 AM · Your calendar, avery.l..." and narrow columns truncate to "Y..."; the clash box on Wednesday at y 385-555 is partly covered by the "Meeting 28" block starting at 8:00 (its top edge is hidden under the box, a stray blue strip at y 555-610 below the clash box). Screen content. Fix: cap rows with "+N more" and stack the clash box above overlaps; drop the calendar name from the second line.
- [C] 7 Edge · `schedule-work-week-nothing-this-week-day-1440.png`: the empty week is a bare grid; the message sits under it at y=1037 in 15px grey. At 390 the empty message appears twice (five "Nothing on Monday..." rows plus a paragraph below, `schedule-work-week-nothing-this-week-day-390.png`). Fix: one message and an Add action at the top. Costs 0.4.
- [C] 5 Components · `schedule-work-week-day-1440.png`: the segmented control's selected state ("Weekdays") is a cream pill whose edge touches its left neighbour; labels are wider than the Day and Month items so segment widths are unequal. Shared (segmented control).
- [C] 2 Layout · `schedule-work-week-day-1440.png`: the grid now fills x 256-1416 (fixed since Day); a 3 PM line is cut by the card's bottom edge at y=1037 so the grid shows 6 AM to 3 PM only, "Show all hours" needed to see more. Fine; nit.
- [nit] 8 Phone · `schedule-work-week-day-390.png`: day groups with "Nothing on Monday" rows take 40px each, good; the clash row has a 3px red edge, icon and word. Good.
- [nit] 6 Colour · `schedule-work-week-night-1440.png`: today column tint nearly invisible by night; clash box good.

## schedule-month: Schedule, Month
Pictures opened: 7 of 20 (1440 day/night, 390 day, busy month 1440/390, empty month 1440, all-day entry 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 4.0 | 3.9 | 3.8 | 3.9 | 4.1 | 3.9 | 4.1 | 3.96 | 4.2 |
Issues:
- [C] 3 Space / 1 Hier · `schedule-month-day-1440.png`, y 130-270: the same five control rows above the grid (shared across Schedule). Fix as for Day.
- [C] 4 Type · `schedule-month-day-1440.png`, y 280-292: weekday header "Mon Tue ..." is 11px grey, left-aligned at the cell's left edge while the day numbers are 14px; the 11px size is under the 12px floor for non-pill text. Screen content. Also, in `schedule-month-a-busy-month-day-1440.png` event text truncates to "Annual planning review with the..." on two lines in every cell.
- [C] 7 Edge · `schedule-month-a-month-with-nothing-day-1440.png`: empty month is a bare grid with a grey sentence below the grid (y=924), nothing at the top and no summary line; a person has to scroll past 600px of empty cells to read it. Costs 0.4. Fix: show it above the grid.
- [C] 7 Edge · `schedule-month-a-busy-month-day-1440.png`: every cell with 3 chips plus "5 more" links works well; busy month is good (79 meetings), the page is 1800px tall though; the days-with-events chips are cut off by "N more" at three, good.
- [nit] 8 Phone · `schedule-month-a-busy-month-day-390.png`: dot clusters are 6px with a count ring and no legend for what colors mean; the selected day list below works. Calendars chips are hidden behind Filter (good). The grid cells are 51px wide, fine.
- [nit] 5 Components · `schedule-month-day-1440.png`: today's marker is a solid black circle, not the accent; unique, readable. Clash glyph (triangle) at the cell's right is 14px, small. 
- [nit] 6 Colour · `schedule-month-night-1440.png`: grid lines are very faint; cards lift OK.

## schedule-timeline: Schedule, Timeline
Pictures opened: 8 of 20 (1440 day/night, 390 day, many-lanes 1440/390, many-entries 1440, nothing-on-it 1440/390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.5 | 3.6 | 3.4 | 3.6 | 3.7 | 3.4 | 3.7 | 3.56 | 4.0 |
Issues:
- [B] 4 Type / 5 Components · `schedule-timeline-day-1440.png`, y 310-530: entry labels ("Fitting appointme...", "Venue walk-thr...", "Budget chec...", "Quarterly revi...", "Stock co...") are truncated even though 600px of empty space sits to their right; labels also run over the red today line and the hatched days-off bands, so letters are struck through by hatching. Screen content. Fix: let labels run to their natural width, put a surface chip behind them or place them on the side that has room, and keep hatching behind text. Costs 4 by 0.6.
- [B] 7 Edge · `schedule-timeline-many-entries-day-1440.png`: 36 entries are all labelled "Item N with a lon..." in 4 columns whose texts collide with the hatching, the today line and each other (for example "Nov 8 Item 4" cut by a hatch stripe; "Item 33 with a lon... Jan 5" over the Dec 28 band); the names are truncated to the same 14 characters so entries cannot be told apart. Fix: show one row per entry in a list below 15 entries, or cap the grid and offer the list. Costs 0.6.
- [C] 7 Edge · `schedule-timeline-nothing-on-it-day-1440.png`: the empty timeline is two grey lines at the top (no card, no icon, no action) and the rest of the page is empty (600px). It also shows the legend "Days off: hatched" for a screen with no grid. Shared (empty card not used). Fix: use the empty card with an "Add to schedule" action. Costs 0.4.
- [C] 2 Layout · `schedule-timeline-many-lanes-day-1440.png`: lane titles ("Quarterly program of work number 1 for the northern region") take three lines, making some lanes 76px tall and others 36px; empty lanes (Project 5, 9, 13) show nothing. Lanes with entries put the first dot at the column's left edge so the Today line passes through checkboxes ("Step 1 of 2" is crossed by the hatch at Nov 8). Screen content.
- [C] 6 Colour / 8 Phone · `schedule-timeline-day-390.png`: every entry dot is burgundy while the legend and the 1440 picture use blue, green and purple per calendar; by phone the person loses the calendar meaning and burgundy is the brand accent, which should not mark data. Fix: use the calendar colors. Costs 0.4 on 6.
- [C] 1 Hier · `schedule-timeline-day-1440.png`: three control rows (view tabs plus range segmented control on one row, calendar chips, date nav) and the legend sits at y=560 with nothing below; a single "Personal" lane makes 70% of the page empty. Shared (segmented control).
- [C] 5 Components · `schedule-timeline-day-1440.png`: two segmented controls side by side (Day/Weekdays/Week/Month/Timeline and 2 weeks/10 weeks/A quarter) separated by a thin rule; on 390 they stack as two full-width outline pills of identical weight. Shared (segmented control).
- [nit] 8 Phone · `schedule-timeline-many-lanes-day-390.png`: a clean grouped list (Week of ...) with title and date on one line; best phone view here, but 22 weeks of rows with checkboxes that look tickable (a legend says "To-do or promise with a day"). Shared (rows).
- Brand: 4.0 (the page itself holds no brand error, but the burgundy dots misuse the accent).

## schedule-add: Schedule, Add to schedule (drawer on 1440, bottom sheet on 390)
Pictures opened: 6 of 20 (1440 day/night, 390 day, end-before-start 1440/390, long-title 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.6 | 3.7 | 3.9 | 3.8 | 4.1 | 3.8 | 3.9 | 3.84 | 4.1 |
Issues:
- [C] 2 Layout · `schedule-add-day-1440.png`, y 140-440: the form's columns do not share edges: Day (180px wide) and Starts at (140px) sit left of centre, Ends at (140px) alone on its own row, Place (218px) and Repeats (218px) on the next, with the right 90px of the first rows empty; below y=440 the drawer is 400px of blank. Shared (drawer). Fix: a two-column grid with equal columns (Day | Starts, Ends | Repeats) and the place field full width.
- [C] 5 Components · `schedule-add-day-1440.png`, y 855-890: "Add" is disabled and drawn as a pale outline almost the same as Cancel; the reason text "Say what it is first." sits to its right in 13px grey. A disabled primary should keep its fill at reduced contrast or the reason sit above; cancel and add look equal. Shared (drawer footer). 
- [C] 7 Edge · `schedule-add-the-end-before-the-start-day-1440.png`: the error is clear (red edge, icon-less red text "It has to end after it starts.", tinted field), but the cursor focus ring sits on the Place field (y 366), not on the field in error; the footer text "Check the times first." duplicates. Fix: focus the field that needs fixing. Screen content. (The error uses colour plus words, good.)
- [C] 4 Type · `schedule-add-day-390.png`: field labels "Starts at (optional)" and "Ends at (optional)" repeat the word "optional" on three of five labels; the Place and Repeats labels vs hint lines are 13px grey. Screen content.
- [C] 8 Phone · `schedule-add-day-390.png`: the sheet is a good bottom sheet with a handle and close; its footer holds Cancel, Add and the hint on one line, with the hint wrapping to the width left (`schedule-add-the-end-before-the-start-day-390.png`: "Check the times first." fits but is cramped). The scrim shows the page header behind, fine. No safe area cut.
- [nit] 6 Colour · `schedule-add-night-1440.png`: focus ring gold on dark, good (3:1+). 
- [nit] 7 Edge · `schedule-add-a-long-title-day-390.png`: long title scrolls horizontally inside the field showing only the tail ("follow-up with the people who could not come"), the start is clipped without an ellipsis; the right-hand end is fine. Fix: use a multi-line field or show the start. Shared (form field).

## schedule-entry: Schedule, an entry opened (popover on 1440, bottom sheet on 390)
Pictures opened: 7 of 20 (1440 day/night, 390 day, long-title 1440/390, no-place 1440/390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 3.9 | 4.0 | 4.0 | 4.0 | 4.2 | 4.0 | 4.2 | 4.05 | 4.2 |
Issues:
- [C] 2 Layout · `schedule-entry-day-1440.png`: the popover is pinned to the page's bottom-right (x 996-1416, y 596-898) rather than beside its entry; its arrow at x=985 points at nothing in the Fri column and the popover covers the Fri-Sun columns' 9 AM to 1 PM area, so it hides other entries. It is clipped at the window's bottom edge by 2px. Shared (popover). Fix: anchor to the entry, flip to the left when the right has no room.
- [C] 5 Components · `schedule-entry-day-1440.png`: the opened entry is marked by a 2px burgundy ring that is close to the clash colour; the entry in the clash box ("Annual planning r..." in `schedule-entry-a-long-title-and-place-day-1440.png`) is underlined, a different selected style. Shared (rows). Fix: one selected style.
- [C] 4 Type · `schedule-entry-a-long-title-and-place-day-1440.png`: the long title wraps to three lines in the popover, correctly; label column 13px grey and values 15px, good. Chip texts in the grid are cut ("4 at once · 6:05 ..."). 
- [nit] 7 Edge · `schedule-entry-no-place-day-1440.png`: the "Where" row is dropped when empty, so the rows close up cleanly; good. Also-in row only when present, good.
- [nit] 8 Phone · `schedule-entry-day-390.png`: the bottom sheet is the best of the batch: handle, close, label/value rows, one full-width primary "Open the event" and one note. The only nit is that the primary is a 47px burgundy bar next to 14px footnote text; the sheet leaves the scrolled page visible behind, good.
- Best-scoring screen in this part.

## Summary
Most screens miss at least one state the rubric wants (conflict, 0/1/100+). Shared parts that cost the most points are in the fixes below. Only schedule-entry passes the 4.0 bar; none reaches 4.6.

| Screen | Overall | Lowest point | Brand | Passes 4.0 / no point under 3.5 / brand ≥4.0 | Passes 4.6 / no point under 4.3 / brand ≥4.5 |
|---|---|---|---|---|---|
| today | 3.85 | 8 Phone 3.4 | 4.2 | No (overall 3.85, point 8 under 3.5) | No |
| handled-for-you | 3.85 | 7 Edge 3.5 | 4.2 | No (overall 3.85) | No |
| followups | 3.88 | 7 Edge 3.6 | 4.3 | No (overall 3.88) | No |
| todos | 3.91 | 2 Layout 3.7 | 4.3 | No (overall 3.91) | No |
| stages | 3.80 | 7 Edge 3.5 | 4.1 | No (overall 3.80) | No |
| schedule-day | 3.84 | 2 Layout 3.6 | 4.2 | No (overall 3.84) | No |
| schedule-work-week | 3.89 | 7 Edge/5 Comp 3.8 | 4.2 | No (overall 3.89) | No |
| schedule-month | 3.96 | 4 Type 3.8 | 4.2 | No (overall 3.96; closest) | No |
| schedule-timeline | 3.56 | 4 Type 3.4, 7 Edge 3.4 | 4.0 | No (overall 3.56, two points under 3.5) | No |
| schedule-add | 3.84 | 2 Layout 3.6 | 4.1 | No (overall 3.84) | No |
| schedule-entry | 4.05 | 2 Layout 3.9 | 4.2 | Yes | No |
| people | 3.76 | 8 Phone 3.5 | 4.2 | No (overall 3.76) | No |
| rules-review | 3.81 | 7 Edge 3.5 | 4.1 | No (overall 3.81) | No |
| status-popover | 3.88 | 7 Edge 3.6 | 4.1 | No (overall 3.88) | No |

Note: the entry row above counts as the only pass; the entry overall of 4.05 is from main pictures plus long-title and no-place states.

Top ten fixes, in order of score gained:
1. Offline bar and error states (shared, all 14 screens plus every state sheet): the bar says "Showing what loaded earlier" when nothing is shown, and a page shows the bar, a red row, the header chip and dashed cards at once. One message, one retry; tab counts "0" must not show while loading or failed (todos, handled-for-you). About +0.2 on point 7 for six screens.
2. Skeletons (shared): make each skeleton match the loaded page's chrome and row count (handled-for-you adds a search box and a segmented control, people keeps a table on the phone, today has no group label, todos shows "0" counts). No layout shift. About +0.2 on 7 for six screens.
3. Today phone (`today-day-390.png`): fix the "and" that wraps to "an / d" and the truncated calendar names in the five clash rows; stack the two entries on their own lines. +0.8 on point 8 for Today (the one point under 3.5 outside Timeline).
4. Timeline (`schedule-timeline-day-1440.png`, `-many-entries-day-1440.png`): stop truncating labels beside 600px of free space, stop hatching and the today line crossing text, give 30+ entries a list. +0.6 on 4 and +0.6 on 7 for that screen, about +0.3 on its overall.
5. Schedule control stack (shared across five views): five control rows before the grid; merge date and view tabs, fold the calendar chips. +0.2 on 1 and 3 for six screens.
6. Empty messages in Schedule views and Stages (shared empty card): the message sits below the grid or in a 1160px dashed box holding one sentence; put it at the top with the add action and size the card to its content. About +0.3 on 7 for five screens.
7. One content width (VP01): the To-dos list (ends x=1136) and the Schedule day grid (ends x=1152) against the 1416 content edge; Follow-ups list/pane ends 430px apart. +0.3 on 2 for three screens.
8. Segmented control (shared): equal-width segments, the selected state fills its segment (follow-ups Message/Table, handled-for-you stacked on the phone, timeline's two controls). +0.2 on 5 for four screens.
9. Drawer (shared): "To-dos and ques..." is truncated with its icon 7px out of line at 1440 on seven screens, and saved-item names truncate mid-word; align the icon column and let long names wrap. +0.1 on 2 and 5 for ten screens.
10. Add drawer (`schedule-add-day-1440.png`): a two-column grid with equal columns, a visible disabled primary, and focus on the field in error. +0.3 on 2 and 5 for that screen.

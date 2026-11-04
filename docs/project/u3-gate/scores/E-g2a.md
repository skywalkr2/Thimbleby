# Scorer E, part G2a

Pictures were opened at 1440 day, 390 day and 1440 night for each screen (where one exists) and at 1440 day and 390 day for each state, except where a line says otherwise. The mockup pages were scored from the side-by-sides in `gate-fix/g2a-mockup/side-by-side/` and the build side of each; their capture pictures were opened too.

## today: Today (mockup page, stricter bar)
Pictures opened: 9 of 30 listed (main four sizes plus 4 states at 1440/390; side-by-sides for day 1440/390, night 1440, and 4 states)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 4.0 | 4.1 | 4.2 | 4.1 | 4.3 | 4.2 | 4.3 | 4.2 | 4.5 |
Issues (all differences from the mockup that cost points; the build is the right side of each side-by-side):
- [C] 1 Hier (-0.4) · `today-day-1440.png`, y 150-190: a "1 of 7 done / Next: Say who you are / Continue setup" strip sits between the title and the work. The mockup has none; it pushes the one decision down and is a second competing control row (outline button plus "..."). Fix: fold it into the nav or a single dismissible line below the list.
- [C] 1 Hier (-0.3) · `today-day-1440.png`, At risk group: seven near-identical clash rows with the same weight as the single Decide row. The mockup has one at-risk row and a separate "Look over" group. Group the overlap pairs under one row ("3 clashes, open schedule") or cap the group with "n more".
- [C] 2 Layout (-0.4) · `today-day-1440.png`, main card bottom (y 880-1040): about 160px of empty card under the list because the card stretches to the rail height. The mockup card ends at its last row. Fix: align-items start.
- [C] 2 Layout (-0.2) · `today-day-1440.png`: the header search is a 516px box with a heavy dark outline (focus-like) and no "/" hint, with a different placeholder ("A person or a to-do") from the mockup ("Search or ask Reginald"). The mockup field is flat with a hairline.
- [C] 2/5 · mockup has a Side filter ("Side All sides", "Showing Needs you") above the list and a "Your sides" list in the nav with coloured dots; the build shows neither at 1440 day (the filter appears only in the filtered state, as tabs). Nav: build says "Saved items" with a bare "P" tile; no counts on Follow-ups and To-dos (mockup shows 2 and 12).
- [C] 4 Type (-0.4) · `today-day-1440.png`, rows 3-6: meta runs on 2-3 lines with dangling " · " separators at line ends ("Today ·", "avery.lane@example.com ·") and an orphaned "They / overlap by 12 minutes" (x 773). The mockup keeps the meta to one line with a bold "30 min short". Fix: put the facts on one line, the calendar names on a second, drop the trailing separator.
- [C] 5 Comp (-0.4) · `today-day-1440.png`, Today's schedule: no "Clash" flag on the two clashing events (the mockup shows warning glyph plus "Clash"), times wrap as "4:12 AM – / 4:42 AM" in a 70px column, each event repeats the full email address as its meta, and the left rule is one grey-blue for all (mockup: per-side colour). The "Came in" list repeats the email address on every row and underlines titles; the mockup uses plain bold titles with a side dot.
- [C] 5 Comp (-0.2) · header chip says "Reginald: needs a look" in amber (mockup: "All good" green dot). That is correct for the data, but the chip is a pill with no border and reads as a button; the "Hand something in" is a tinted pill in the build and outline in the mockup. Fine, nit.
- [nit] 3 Space · `today-day-1440.png`: Decide row title baseline x=309 but At-risk rows with warning glyph share it; OK. Rail card gaps 24px, main/rail gutter 24px: good.
- [nit] 6 Colour · `today-night-1440.png`: the red-tinted at-risk block is a flat brown wash across ~620px; the mockup has the same pattern but fainter. The gold primary against the brown reads fine. -0.2.
- [C] 7 Edge (-0.4) · states. Loading (`today-loading-day-390.png`) is a good skeleton matching row height, but the Schedule card has no skeleton at 390 and the loading title lacks the "n things need you" line (acceptable). "Couldn't load" (`today-couldn-t-load-day-1440.png`) shows both the offline banner and a second red error card, and leaves an 520px blank white card under it; the mockup states are single, calm banners. The brand all-clear moment in the mockup has "See what was handled today"; the build has "Missed something?" (OK) and an empty rail "Came in" with a tiny icon. -0.4 total.
- [C] 8 Phone (-0.3) · `today-day-390.png`: the title of each at-risk row is two lines and the meta 4-5 lines, so one clash row is 190px tall; the dot separators are orphaned at line starts (" · No time between them"). Tab bar and centre add are good. Schedule and Came in are collapsed (fine, better than the mockup's long page). Mockup phone header has a green "All good" chip; the build chip is wide and clipped nowhere.
- [C] 9 Brand (-0.5): the mark, burgundy primary, serif title and gold night are right. Missing against the website: no brand moment on the working screen (fine), but "Not right"-style links are not here, and the underlined link titles in "Came in" are a heavy treatment. Brand 4.5.
Mockup comparison verdict: structure matches (title, rail, Decide then At risk, rail with schedule and Came in, phone tab bar) but the build misses the mockup's calm: one-line meta, a single at-risk row, the side filter, Clash tags, nav counts.
Brand-pass note: the mockup page also appears in the 1024 capture; at 1024 the rail drops under the main column and both cards sit with an unbalanced pair of heights (`today-day-1024.png`, y 890-1340). nit.

## today-states: Today's states (mockup page, stricter bar)
Pictures opened: 14 of 24 states pictures (every state at 1440 day or 390 day; loading, filtered to nothing, offline, couldn't load, plus the all-clear, loading, filtered and offline side-by-sides)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.2 | 4.1 | 4.2 | 4.2 | 4.2 | 4.3 | 4.0 | 4.2 | 4.2 | 4.5 |
Issues:
- [C] 7 Edge (-0.6) · `today-states-offline-day-390.png` (build side): the offline banner is good (icon, reason, "Try now"), but the whole page under it is the same long list; the mockup shows the banner as a short card in its own right. At 1440 (`today-offline-day-1440.png`) the banner is full width above the title and fine. The mockup's states not built: "A save that failed", "Changed somewhere else, saves merge", "One account of three needs you", "100 items, long titles, other languages", "The side filter opened with a fifth side that has a long name". The mockup lists these and the capture index has only Loading, Couldn't load, Offline, Filtered to nothing; the first four of those missing states are not in the capture set. I could score only what exists; a design lead would count the missing ones as an incomplete state sheet. -0.6.
- [C] 7 Edge · `today-filtered-to-nothing-day-1440.png`: the filtered state is not empty; it shows "Nothing on the Lantern Row Studio side today. Clear filter" above an "At risk 1" row, because the Backup item is global. The mockup shows a centred "Nothing for Lantern Row Studio today. 3 things on your other sides need you. Show all sides". The build's text is a flat paragraph left aligned with a button; clear but plainer. Also the Today's schedule card shows a "Connect a calendar" button squeezed to three lines (x 1880-1950) next to the text. Fix: stack the button under the text.
- [C] 2 Layout · `today-filtered-to-nothing-day-1440.png`: the side tabs row (All, Personal, Harborview Community Su…, Willowbrook Handmade Ce…, Northfield Mobile Bicycle R…, Lantern Row Studio) is a free-floating text row with no container, and the long names are truncated mid-word with an ellipsis and no tooltip visible. The mockup uses a "Side All sides" menu. Fix: one menu button, as the 390 picture already does.
- [nit] 3/4 · `today-loading-day-1440.png`: skeleton rows match the real row height (good); the "Decide" label in the skeleton card is real text while rows are not; fine.
- [C] 5 Comp · `today-couldn-t-load-day-1440.png`: error card has a border on the left in red only and a large burgundy "Try again" primary beside two more "Try again" outline buttons in the rail: three retry buttons plus "Try now" in the banner is four controls for one failure. Fix: one retry.
- [C] 8 Phone · `today-couldn-t-load-day-390.png` and `today-filtered-to-nothing-day-390.png`: both good; the "Clear filter" button wraps to two lines at the right of the sentence (`today-filtered-to-nothing-day-390.png`, x 285-355). -0.2.
- 9 Brand: the all-clear brand moment (`today-states-all-clear-brand-moment-day-1440.png`, build side) has mark, star, serif "Nothing needs you" and the one-line voice, close to the mockup. Brand 4.5.

## today-review: Today, a line opened for review
Pictures opened: 3 of 5
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.7 | 3.9 | 4.1 | 3.8 | 4.2 | 3.6 | 4.1 | 3.9 | 4.2 |
Issues:
- [B] 1 Hier / 5 Comp (-0.8) · `today-review-day-1440.png`, whole page: the screen is a read-only detail ("From your calendar. Change it there.") with no action at all: no "Open both", no "Dismiss", nothing to decide. A page opened "for review" from a clash line has nothing to review and leaves the person with only Back. Fix: show the clash it came from (the other event, the gap) and one primary.
- [C] 2 Layout (-1.0) · `today-review-day-1440.png`, y 330-900: 570px of empty canvas; the details sit as a bare label/value list with no card, so the page reads as unfinished next to Today. Fix: a card at the content width with the two events side by side.
- [C] 5 Comp · `today-review-day-1440.png`, x 550-655: the "Calendar event" tag is a square-cornered grey chip with 1px border, a different shape from every pill in the app; it sits on the title baseline 3px low. Fix: use the app's status pattern.
- [C] 7 Edge (-1.0) · no state pictures; nothing shown for an event that was deleted since, a long title, or many attendees. Judge: unknown handling. 
- [nit] 4 Type · `today-review-day-390.png`: "Details" heading (16 bold) is the same size as the key values; label/value pairs stack fine.
- [C] 9 Brand · `today-review-night-1440.png`: serif title and mark present, but no brand touch and the page is mostly black void.
Passes 4.0? No (overall 3.9). Reaches 4.6? No. capture note: picture shows a calendar event detail rather than a line opened for review; treat as a possible **capture fault** (the name promises the review of an item such as a clash).

## since-yesterday: Since yesterday
Pictures opened: 14 of 33 (main day 1440, night 1440, day 390; states at 1440/390 for loading, couldn't load, offline, one row, nothing new, over a hundred; 1024 and the other state sizes not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 4.0 | 4.2 | 4.2 | 4.0 | 4.3 | 3.8 | 4.2 | 4.1 | 4.3 |
Issues:
- [C] 7 Edge (-0.8) · `since-yesterday-over-a-hundred-day-1440.png` and `-390.png`: 120 rows in one unbroken list (10,718px and 15,280px tall), no "Show more" or paging, no grouping by day, and no count in the header ("120 things"). Fix: group by day with sticky day labels and show the first 25 with "Show 25 more".
- [C] 7 Edge · `since-yesterday-over-a-hundred-day-1440.png`, left: the sidebar ends at the page bottom with Settings, so at this height the nav scrolls away; nav should be fixed to the viewport. (May be a capture artifact; flag nit.)
- [C] 7 Edge · `since-yesterday-loading-day-1440.png`: **the nav in the loading picture differs from the loaded one** (it shows a "Work" group, "Stages", "Projects"; the loaded picture has no Work heading, no Stages, and "Personal" under Saved items) and the search placeholder is "Search or ask Reginald" instead of "A person or a to-do". The skeleton itself is good (right row height). So the page shifts the whole left nav on load. Fix: same nav data in all states. -0.5.
- [C] 7 Edge · `since-yesterday-couldn-t-load-day-390.png`: shows offline banner plus a second error card ("The list couldn't be loaded") for one cause; two retry buttons. 
- [C] 1 Hier (-0.5) · `since-yesterday-day-1440.png`: a history screen with no summary line ("3 changes, 1 closed since you last looked") and the only filled control is the global "Hand something in". Row primary alternates between "This is work" and "Undo" with different meanings; it is not clear which one wants me. "Closed since you last looked" status is a grey dot with no strong state.
- [C] 2 Layout (-0.4) · `since-yesterday-day-1440.png`: rows run 1160px wide with the action pinned at the far right; the title at x=309 and the action at x=1300 are 900px apart, so the eye must travel. At 1440 consider a max width of ~900. Also 620px of empty canvas under 3 rows.
- [C] 5 Comp (-0.5) · `since-yesterday-day-1440.png`: the "..." menu appears on rows 2 and 3 but not on row 1 (x 1383); action columns are not aligned (row 1 button is wider and ends at x=1398, rows 2-3 end at 1358 with a menu to the right). Same icon (archive box) on every row regardless of kind (set aside, closed, added): the icon carries no meaning.
- [nit] 4 Type · row meta is 13px muted, good; the title in rows is bold 15; "Back to What changed" link in muted grey at 13px is the smallest and the lowest contrast item on the page.
- [nit] 6 Colour · `since-yesterday-night-1440.png`: no tint problems; "This is work"/"Undo" gold pills fine.
- [nit] 1 · the nav has no highlighted item at this screen at 1440 (What changed should be active as the parent); at 390 More is highlighted. Inconsistent.
Passes 4.0: yes. Reaches 4.6: no.

## what-changed: What changed
Pictures opened: 10 of 17 (main day 1440/390, night 1440/390; offline 1440, loading 390, couldn't load 1440)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.9 | 4.1 | 3.9 | 3.8 | 4.2 | 3.5 | 3.9 | 3.9 | 4.2 |
Issues:
- [B] 7 Edge (-1.0) · `what-changed-couldn-t-load-day-1440.png`: **capture fault or real fault**: the "Couldn't load" picture shows the loading skeleton (three grey bars) under the offline banner, with no error message and no "Try again" on the list. If it is real, a failed load looks like loading forever. Also the nav in this picture and `what-changed-loading-day-1440.png` differs from the loaded screen (has Work heading, Stages, Projects; loaded has none), so the nav changes between states.
- [C] 1 Hier (-0.7) · `what-changed-day-1440.png`, list y 265-1900: 22 rows with the same weight and a near-identical meta line ("Handed in Wed, Nov 4, 3:57 AM · Say who you are first") on every row; nothing says which to take first, no row action except "...". The first row is selected (cream, burgundy left edge) and opens the right panel, but the panel only repeats the title and "Say who you are first" with no actions: the person has nothing to do. Fix: a primary per row or in the panel; group by what each needs.
- [C] 4 Type (-0.7) · rows: title is "Calendar event from Maya Okafor · Public holiday", so the kind and the sender (the same on 10 rows) lead the line and the distinct part comes last; scanning is hard. Fix: title first, kind and sender in meta with a leading icon. The 13px meta is muted and OK. The summary line "8 things wait for you on Today · Open Today · 2 handled for you" at 13px has three different weights and a lone "·" at the end of the line on 390 (`what-changed-day-390.png`, y 152-172 orphan dot before "2 handled").
- [C] 5 Comp (-0.8) · `what-changed-day-1440.png`: the detail panel (x 993-1411) has the title in 18px serif-less bold, a "Needs you" status dot, a "..." and nothing else; its top edge (y 225) matches the list but it ends at y 435, leaving 1500px of blank column. The row has no leading icon or avatar, so email and calendar rows look identical. "Since yesterday" outline button sits top right, far from the tabs.
- [C] 2 Layout (-0.5) · `what-changed-day-1440.png`: the list column is 713px and rail 418px with a 24px gutter, good; but the page is 2007px tall for one list with no paging, no grouping (Today / Earlier), no sticky header. 22 rows at 74px each.
- [C] 8 Phone (-0.7) · `what-changed-day-390.png`: each row is 80px with the meta wrapping to two lines ("Handed in Wed, Nov 4, 3:57 AM · Say who you are / first") and the "..." at the top right with 24px hit; title clamps to two lines, OK. The two-line meta with the same words repeated 22 times adds noise. Tab bar active state (More) wrong: What changed lives under More, fine. Filter tabs All/Done fine. 
- [C] 7 Edge · rows (no state with a long title, many items or error shown beyond the above); loading 390 skeleton good; offline banner good.
- [nit] 6 Colour · `what-changed-night-1440.png`: selected row's burgundy edge becomes gold, correct; the cream selected tint becomes a brown near-black, selection reads weakly. -0.2.
- [C] 9 Brand: serif title, burgundy active nav, mark. Nothing brand wrong; the screen is a plain list. Brand 4.2.
Passes 4.0: **no** (3.9, and point 7 at 3.5 is on the line). Reaches 4.6: no.

## handled-for-you: Handled for you
Pictures opened: 10 of 26 (main day 1440/390, night 1440; read tab 1440/390; couldn't load 1440; offline 390; loading 1440)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.2 | 4.0 | 4.1 | 4.1 | 4.1 | 4.3 | 3.6 | 3.9 | 4.0 | 4.3 |
Issues:
- [C] 7 Edge (-1.0) · `handled-for-you-read-tab-day-1440.png` (and `-390.png`): two empty states stacked on one tab, each with the same icon, and the second contradicts the first section: "Closed without you seeing ... 2 of 2 closed without you seeing them" followed by "Nothing here was closed by the assistant itself." Also a heading with the line "Choose Looks right..." names a control that is not on screen. Fix: one empty state; hide "Closed without you seeing" when there is nothing to list.
- [C] 7 Edge (-0.4) · `handled-for-you-loading-day-1440.png` and `-couldn-t-load-day-1440.png`: the loading and error states show a search field and Kind / Reason / Sender filter chips plus "..." counts on the tabs that the loaded picture (`handled-for-you-day-1440.png`) does not have; the subtitle is missing; the nav grows a Work group, Stages and Projects. The page jumps when it loads. The error card itself (reason, Try again, Details) is good.
- [C] 8 Phone (-0.7) · `handled-for-you-day-390.png`, y 215-610: the "Bring it in" button sits beside the text at x 250-333, squeezing the text column to ~200px; titles wrap to two lines ("Three neighbors posted / today") and the meta to three. The brief's rule: rows stack their actions below the meta and titles stay over 60% of the card. Fix: put "Bring it in" under the reason line at 390.
- [C] 2 Layout (-0.5) · `handled-for-you-day-1440.png`: the action is at x 1278-1358 and the text ends at x 860, a 420px gap, so the row reads as two islands; and 450px of blank canvas below. The first-level filter/search row exists only when there are many items (good) but isn't visible at 2 rows (correct).
- [nit] 4 Type · row reason text: "Set aside because **your mail service files it under social**. The message text was never sent to the AI." The bold phrase is good, but the second sentence repeats on every row; say it once in the subtitle.
- [nit] 5 Comp · tab counts: "2" and "0" in tiny pills; the "0" at x 423 sits 4px lower than the label baseline in the day picture. Group header "Sales, promotions and social updates · 2" uses 15 bold and a chevron, while other group labels in the app (Today: DECIDE) are 11px uppercase; inconsistent group-label style.
- [nit] 6 Colour · `handled-for-you-night-1440.png`: the ghost buttons are brown-tinted gold, readable (> 7:1).
Passes 4.0: yes, barely (overall 4.0; points 7 and 8 at 3.6 and 3.9). Reaches 4.6: no.

## stages: Stages
Pictures opened: 6 of 10 (main 1440 day/night, 390 day; with items 1440 day/390 day; 1024 not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.7 | 4.0 | 4.1 | 4.0 | 4.3 | 2.8 | 4.1 | 3.8 | 4.3 |
Issues:
- [B] 7 Edge · **capture fault**: `stages-with-items-day-1440.png`, `-390.png` (and presumably night/1024) are pixel-identical to the empty `stages-day-1440.png`: "Nothing is tracked in stages yet". The state named "With items" shows no items. The screen's real content, a list of work in stages, was never seen, so this cannot be scored above 2.8 for edge and the screen cannot be passed on its main state. Fix the capture (seed an item) and re-score.
- [C] 1 Hier / 2 Layout (-0.7) · `stages-day-1440.png`: the screen is only an empty state: a heading, an icon and "See add-ons". "See add-ons" is a dead end for someone who has no add-on; the page is 800px of blank beside a 40px-wide message. It is acceptable as an empty state but gives no way to start.
- [C] 5 Comp (-0.4) · nav in `stages-day-1440.png`: "To-dos and ques..." is truncated with an ellipsis at x 173 beside the count "8" although the same item fits whole on the other screens (no count there); saved-item names truncated ("Harborview Communi...", "Willowbrook Handm...") with raw 2-letter tile initials (HI, WC, NS, LS) of different widths so the labels start at x 52, 61, 57, 54 (ragged left edge). Fix: fixed-width tile.
- [nit] 4 Type · empty title is 15 bold, body 14 muted, fine. The page title has no one-line subtitle, unlike its sibling screens.
- [nit] 9 Brand · empty state is the place for a brand moment (VP17): it uses a generic layers icon, not the mark or the star.
Passes 4.0: **no** (3.8). Reaches 4.6: no.

## rules-review: Rules to look over
Pictures opened: 5 of 10 (empty main 1440 day, 390 day; with rules 1440 day, 1440 night, 390 day; 1024 and the rest not opened). The "with rules" night 390 was not made.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 4.0 | 4.1 | 4.1 | 3.9 | 4.3 | 4.0 | 4.1 | 4.1 | 4.3 |
Issues:
- [C] 5 Comp (-0.7) · `rules-review-with-rules-to-look-over-day-1440.png`, x 590-650: each row carries a square-cornered grey "Rule" tag with a 1px border (same chip as "Calendar event" on Today review); it is the only square-cornered element beside rounded pills, and it says the same word on all three rows so it carries no information. Fix: drop it, or use the status pattern.
- [C] 1 Hier (-0.4) · same picture: the intro paragraph promises three choices ("Keep them, limit where they apply, or stop using them") but only "Keep" is on the row; the other two are hidden behind "...". Row primary is the same on every row, so the person must judge each alone; no "Keep all" bar. 
- [C] 2 Layout (-0.4) · same: row action sits at x 1305-1358, 640px from the end of its text (x 720). The intro paragraph is limited to 650px but rows run 1160px: two different widths on one page. 480px blank below.
- [C] 4 Type (-0.4) · meta "Sent for 14 tasks, never used · All projects": "Sent for 14 tasks" is unclear (sent where? to the AI?), a wording point that costs clarity.
- [C] 8 Phone (-0.5) · `rules-review-with-rules-to-look-over-day-390.png`: title wraps to two lines and the "Rule" tag drops to its own line on row 3 (x 41, y 517) indented under the title; "Keep" button sits right of the text and the "..." above it, squeezing the text to ~215px (55% of the card). The meta wraps ("All / projects"). Fix: stack actions under the meta.
- [nit] 7 Edge · the empty state (`rules-review-day-1440.png`) is good: one line and a check icon, but it has no brand moment and the heading's back link shows. Loading/error not captured for this screen (no state pictures for those); a list of many rules, long rule text not shown.
- [nit] 3 Space · nav label "To-dos and ques..." truncates (x 173) because of the count.
Passes 4.0: yes. Reaches 4.6: no.

## search-results: Search, with results
Pictures opened: 9 of 20 (main 1440 day/night, 390 day; nothing found 1440/390; many results 1440/390; long names 1440/390). 1024 not opened. This is a header dropdown over Today, scored as a menu.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 4.0 | 4.2 | 4.2 | 4.0 | 4.3 | 3.8 | 4.2 | 4.1 | 4.3 |
Issues:
- [C] 7 Edge (-0.8) · `search-results-many-results-day-1440.png`, y 600-680: the list is cut mid-line ("before the end of the month and keep a copy for", y 668) with no fade, no scrollbar and no count; the "Ask Reginald about 'a'" row and the "Searching is free" footer disappear below the cut, so the one paid action is unreachable without scrolling an unseen area. At 390 (`search-results-many-results-day-390.png`) the list ends after one to-do, and the same two rows are hidden. Fix: keep the Ask row and the footer pinned under a scrolling result area, and show "n more".
- [C] 7 Edge · `search-results-many-results-day-1440.png`, y 612-675: a long to-do title wraps to 3 lines and makes that row 66px tall against 38px for the others; names should clamp at two lines with an ellipsis. The long project names (two lines) are handled well, with the tag staying right.
- [C] 5 Comp (-0.8) · `search-results-day-1440.png`: the kind tags ("Person", "To-do", "Project") are square-cornered boxed chips (the same off-shape chip as "Rule" and "Calendar event"); on the 390 pictures they take 55-70px of a 330px row and push long names to 3 lines. A leading icon already tells the kind. Fix: show the kind as grey text, or drop it when the icon is shown.
- [C] 2 Layout (-0.5) · `search-results-day-1440.png`: the dropdown (x 155-643) is exactly as wide as the search field plus nav, covering the nav item "Handled for you" and the Today count and sitting over the page without a scrim, while at 390 a scrim dims the page (`search-results-day-390.png`). The behind-page also shows a clipped tab row ("illowbrook Handmade Ce...") cut by the dropdown, which is fine as a cover but reads messy. Different overlay treatments at the two sizes.
- [C] 1 Hier · no group headings (People, Projects, To-dos) in the many-results list; 14 rows of the same weight and no highlighted first match. -0.3.
- [nit] 6 Colour · the search field's focus ring is a 2px dark burgundy outline plus a 1px inner border (`search-results-day-1440.png`, x 155-645), strong, and doubled; in night it is gold. Contrast is fine. The scrim at 390 is a flat grey wash that lowers the contrast of the Today page behind it.
- [nit] 4 Type · the footer "Searching is free. Asking sends your question to Reginald." is 14px muted, tidy and useful; a good touch.
- [nit] 7 Edge · nothing found (`search-results-nothing-found-day-1440.png`) is clear: says what was searched and what was not (mail and notes), and offers Ask; good.
Passes 4.0: yes. Reaches 4.6: no.

## Summary
| Screen | Overall | Lowest point | Brand | Passes 4.0 / no point under 3.5 / brand ≥4.0 | Passes 4.6 / no point under 4.3 / brand ≥4.5 |
|---|---|---|---|---|---|
| today (mockup page) | 4.2 | 4.0 (2 Layout) | 4.5 | yes | **no** (needs 4.6; points 4.0-4.3) |
| today-states (mockup page) | 4.2 | 4.0 (7 Edge) | 4.5 | yes | **no** |
| today-review | 3.9 | 3.6 (7 Edge) | 4.2 | **no** (overall 3.9) | no |
| since-yesterday | 4.1 | 3.8 (7 Edge) | 4.3 | yes | no |
| what-changed | 3.9 | 3.5 (7 Edge) | 4.2 | **no** (overall 3.9; point 7 on the line) | no |
| handled-for-you | 4.0 | 3.6 (7 Edge) | 4.3 | yes (barely) | no |
| stages | 3.8 | 2.8 (7 Edge) | 4.3 | **no** (point 7 under 3.5; "With items" is a **capture fault**) | no |
| rules-review | 4.1 | 3.9 (5 Comp) | 4.3 | yes | no |
| search-results | 4.1 | 3.8 (7 Edge) | 4.3 | yes | no |

Mockup pages (stricter bar, 4.6 / no point under 4.3 / brand 4.5): both fail. today misses on 1 Hier, 2 Layout, 3 Space, 4 Type, 5 Comp and 7 Edge (all under 4.3 or pulling the mean to 4.2); today-states misses mainly on 7 Edge (the mockup's 9 states are not all in the capture set: save failed, changed elsewhere, one account of three, 100 items with long titles, side filter with a fifth long-named side) and on the duplicated error and offline treatment.

Capture faults: `stages-with-items-*` (shows the empty state, identical to `stages-*`); `what-changed-couldn-t-load-day-1440.png` (shows the loading skeleton and an offline banner, not an error); possibly `today-review-*` (an event detail, not a clash review). Recurring non-fault: loading and error pictures show a different left nav (Work heading, Stages, Projects) and search placeholder than the loaded screens.

Top ten fixes, in order of score gained:
1. Re-capture "Stages, with items" and the "What changed, couldn't load" state, then re-score them (Stages 7 Edge 2.8, What changed 7 Edge 3.5).
2. Make the nav and the search placeholder identical in loading, error and loaded states (affects every state sheet; layout shift on load).
3. Today: cap the At risk group (group the clashes under one row), put the Clash tag on the schedule events, make meta one line, drop the dangling " · " separators and orphaned words (about +0.4 on today, +0.2 on 1/4/5 for the mockup bar).
4. Today: fold the "1 of 7 done / Continue setup" strip into the nav or a dismissible line, and stop the main card stretching to rail height (blank 160px).
5. Today states: add the missing mockup states (save failed, changed elsewhere, one account of three, 100 items, filter with a long-named side) and show one error treatment (not offline banner plus error card plus three Try again buttons).
6. Phone rows: stack the action below the meta at 390 on Handled for you, Rules to look over, Since yesterday and What changed, so titles keep 60% of the card.
7. What changed: lead each row with the distinct title, kind and sender in meta with an icon; give the right panel an action; group by day; page the list. Do the same grouping and "Show more" on Since yesterday (120 rows).
8. Replace the square-cornered "Rule", "Calendar event", "Person", "To-do", "Project" chips with the app's status pattern or plain text.
9. Search: pin the "Ask Reginald" row and the free-search footer under a scrolling results area, clamp long titles to two lines, add group headings, and use one overlay treatment at all widths.
10. Handled for you, Read tab: remove the contradictory second empty state ("Closed without you seeing" with "nothing here was closed"); Today review: give the page the other clashing event and one primary action.

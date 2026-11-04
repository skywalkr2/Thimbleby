# Scorer C, part G1

(Pictures are in `gate-fix/g1-final/`. Brand reference opened: site-light-1440.)

## today: Today
Pictures opened: 3 main (day 1440, day 390, night 1440) of 5 listed; states below.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.7 | 3.8 | 3.8 | 3.8 | 3.9 | 3.7 | 3.6 | 3.8 | 4.3 |
Issues:
- [B] 8 Phone · `today-day-390.png`, At risk rows: the "Your calendar, avery.lane@exam…" lines are truncated and the word "and" breaks to "an / d" in a narrow column to the right. Fix: stack the two calendar names on their own lines (no inline "and"), allow wrap or hide the address on phone, never let a one-word conjunction be its own column.
- [C] 8 Phone · `today-day-390.png`, bottom: the whole page below the setup bar is one 600px red-tinted slab of three near-identical clash rows with a 3px red edge; the Decide and At risk groups run to ~1250px before Schedule and Came in, which are collapsed. Fix: fold repeated clash rows into one expandable group on phone, or cap at 2 rows with "1 more".
- [C] 2 Layout · `today-day-1440.png`, below y=745: the main column ends at 745 while the rail runs to 1000, leaving a 250px empty hole under the main column; and the main column's card ends level with neither rail card. Fix: let the rail end level or flow the rail under main below a width; add an all-quiet line when the list is short.
- [C] 3 Space · `today-day-1440.png`, Decide row: the title starts at x=309 but the Decide heading and group labels at x=273, and "Reginald has no AI account" row title also at 309; but the Sent-folder meta paragraph is 3 lines of long address text in 13px that crowds the "Add the Sent folder" button (button 20px from text). Fix: shorten the account list to "3 mailboxes" and put the addresses behind a disclosure.
- [C] 4 Type · `today-day-1440.png`, clash rows: the meta mixes bold "Today", dots, two calendar names, "and", and a sentence in one 13px line that wraps at 3 lines; hard to scan. Fix: one line "Today 12:48 – 1:48 AM · Room 4 to Room 2 is 30 min short", with the calendar name in a tooltip.
- [C] 5 Comp · `today-day-1440.png`: three different secondary styles on screen: outline pill buttons ("Add one", "Open Venue walk-through"), pill chips ("Sent folder", "No AI account" amber), and underlined burgundy links in Came in ("Question for account 1"). Rubric allows two. Also "Hand something in" is a filled-tint button while the header status is another pill.
- [C] 6 Colour · `today-night-1440.png`: the red edge and tint on three clash rows are heavy, and the "Open …" buttons at night take the gold tint with low edge definition (no outline). Colour of the at-risk rows is also the only distinction between Decide and At risk groups besides a label.
- [nit] 9 Brand · `today-day-1440.png`: the mark and serif greeting are present and correct; the sidebar and "Came in" could carry no brand. The "Good morning" display serif is great. Minor: the thimble mark on night header uses a red tile that is brighter than the site's dark variant.
- Stays under 4.6 overall because of phone fault, long-address meta and the empty rail gap.
- States opened (1440 day + 390 day): loading, couldn't load, offline, filtered to nothing (7 more pictures, plus the offline and filtered 390).
- [C] 7 Edge · `today-filtered-to-nothing-day-1440.png`, centre: the empty card says "Nothing on the Lantern Row Studio side today." but the "At risk 1: Back up your work" row sits directly under it in the same card, so the screen says nothing and something at once; a 60px dead gap separates them. Fix: show the at-risk row above the empty line or make the empty copy "Nothing to decide on this side" and drop the gap. Same at `today-filtered-to-nothing-day-390.png`.
- [C] 7 Edge · `today-loading-day-390.png`: the skeleton has no Decide group heading and the collapsed "Schedule" row shows no count, while the loaded page has more height (layout shift ~900px). Fix: skeleton height close to the loaded page, or hide the Schedule row until loaded.
- [nit] 7 Edge · `today-couldn-t-load-day-1440.png`: the error shows twice (amber offline banner and the red error card both say the app can't reach its server) plus two more in the rail; header says "Disconnected · reconnecting" a third time. Fix: when offline, show the banner only and leave the cards as skeletons.
- Capture note: the filtered state uses a different workspace (Avery, "Search or ask Reginald", extra sidebar rows) from the other Today pictures; fine, not a fault.

## since-yesterday: Since yesterday
Pictures opened: 3 main (day 1440, day 390, night 1440) of 4 listed; states: loading, couldn't load, offline at 1440 day and 390 day (6 pictures).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.7 | 3.9 | 3.7 | 3.8 | 4.0 | 4.0 | 4.0 | 3.9 | 4.3 |
Issues:
- [C] 4 Type · `since-yesterday-day-1440.png`, both rows: each row title is a full 15px bold sentence ("Set aside “Spring sale: everything half price”: a sorting rule set it aside (it was sent to many people, as a mailing list or bulk mail)") running 925px on one line; the reason in brackets is as heavy as the verb. Fix: bold only the verb and the subject, put the reason in the 13px muted meta line.
- [C] 2 Layout · `since-yesterday-day-1440.png`, y>310: two rows in a full-width card then 590px of blank canvas; the intro paragraph is 550px wide while rows are 1160px. Fix: cap the list width to the reading measure or add the "Missed something?" prompt under the list so the page ends with an action.
- [C] 5 Comp · `since-yesterday-day-1440.png`: rows have no lead glyph or status, while the empty state and the loading skeleton show a lead circle; rows differ from their own skeleton. Fix: add a lead icon slot (set-aside glyph) to rows.
- [C] 7 Edge · `since-yesterday-day-1440.png` vs `since-yesterday-night-1440.png` and `-day-390.png`: day 1440 shows two rows, night and 390 show the empty state; the same screen is captured with different data so states can't be compared. Not a design fault; fix the capture.
- [C] 7 Edge · `since-yesterday-offline-day-390.png`: offline banner pushes the page title down by 190px and shows the empty state next to "What you see was loaded at 12:41 AM" while the 1440 offline picture says 12:36 AM; times differ between sizes only by capture. Banner is 4 lines on phone; shorten copy to "You're offline. Showing what loaded at 12:41 AM."
- [nit] 8 Phone · `since-yesterday-day-390.png`: "Back to What changed" is a full pill button between the title and intro, taking the primary position above the content; at 1440 it is top-right. Fix: make it a text link with a back arrow on phone.
- [nit] 1 Hier · `since-yesterday-loading-day-1440.png`: the skeleton rows have no card around them although the loaded rows sit in a bordered card, so the card appears at load (shift).

## what-changed: What changed
Pictures opened: 5 main (day 1440, day 390, night 1440, night 390; 1024 not opened) of 5 listed; states loading, couldn't load, offline at 1440 day and 390 day (6 pictures; offline 1440 was captured at about 1388 wide).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.6 | 3.9 | 3.6 | 3.6 | 3.9 | 3.7 | 3.6 | 3.7 | 4.2 |
Issues:
- [B] 1 Hier · `what-changed-day-1440.png`, whole list: 22 rows, every one "… · Needs you" with identical meta "Handed in Wed, Nov 4, 12:35 AM · stopped, see why below"; nothing is grouped or ranked, and "see why below" points at nothing (the reason is in the side pane, to the right). The screen reads as a wall. Fix: group by what the thing is (Calendar events, Email) or by reason, show 5 with "17 more", put the real reason ("Say who you are first") in the row meta instead of the repeated hand-in line.
- [C] 5 Comp · `what-changed-day-1440.png`, every row: the "Needs you" amber pill repeats 22 times and carries no information (the page is already "needs you"); the row has no lead glyph for email vs calendar. Fix: drop the pill when every row has it; use a lead icon (mail, calendar).
- [C] 4 Type · `what-changed-day-1440.png`, y=192-222: two stacked 13px lines, "5 things wait for you on Today · Open Today" and "2 handled for you" as underlined burgundy links, with a different left rhythm from the list below. Fix: one summary line; links as the accent-text style.
- [C] 2 Layout · `what-changed-day-1440.png`: the detail pane is a 210px card that stays 1700px short of the list bottom; pane text "Say who you are first" at 13px is the real instruction and is smallest, bottom of the card. Fix: make the pane sticky and lead with the reason.
- [C] 8 Phone · `what-changed-day-390.png`: 3379px tall single column, the "Needs you" pill drops to its own line under each title, which makes each row 4 lines; the "…" menu is 16px. Fix: put the pill inline in the meta, 44px hit area on "…".
- [C] 7 Edge · `what-changed-day-390.png`: there is no 100+ treatment or paging (22 rows shown at once); `what-changed-offline-day-390.png` repeats the full list with the 4-line banner above. Fix: cap and page.
- [nit] 7 Edge · `what-changed-loading-day-1440.png`: skeleton has tabs but not the summary lines; the sidebar differs from the loaded picture (Projects and Stages rows present), so counts and nav shift; capture inconsistency.
- [nit] 6 Colour · `what-changed-night-1440.png`: selected row's gold edge reads well; selected-row tint is nearly the card colour. Fine.

## handled-for-you: Handled for you
Pictures opened: 3 main (day 1440, day 390, night 1440) of 5; states loading, couldn't load, offline at 1440 day and 390 day (loading 1440 and 390, couldn't-load 1440 and 390, offline 1440 and 390).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.9 | 4.0 | 3.9 | 3.9 | 4.0 | 3.8 | 3.7 | 3.9 | 4.3 |
Issues:
- [C] 8 Phone · `handled-for-you-day-390.png`, y=118-175: the two view tabs ("Set aside before reading · 2", "Read, nothing to do · 0") are stacked in a pale pill, the second with no selected look and running off the pill's left edge; at `handled-for-you-loading-day-390.png` the first tab is clipped to "Set aside before reading · …". Fix: make it a two-segment control that scrolls or shortens labels ("Set aside", "Read").
- [C] 8 Phone · `handled-for-you-day-390.png`, rows: the title column is 150px wide (about 40% of the card) because "Bring it in" sits to its right, so "Three neighbors posted today" wraps to two lines, and the meta is 5 lines. Fix: drop the action below the meta on phone as the rubric asks.
- [C] 7 Edge · `handled-for-you-loading-day-1440.png` vs `handled-for-you-day-1440.png`: the loading page shows a search box and Kind / Reason / Sender filter row that the loaded page (two items) does not, and no "Kept for 30 days" line, so about 90px of layout shifts at load. Fix: same filter visibility rule in both (hide below about 12 items, per the rubric).
- [C] 4 Type · `handled-for-you-day-1440.png`, y=185-215: two 13px lines of help paragraph above the list, one repeating the title's idea; the reason line "Set aside because…" is the same weight as the sender meta. Fix: move "Kept for 30 days" to a tooltip; bold the reason keyword.
- [C] 7 Edge · `handled-for-you-day-1440.png`: the "Read, nothing to do · 0" tab is there but its empty state isn't captured; no state for 0 in the first tab either (no "filtered to nothing" capture).
- [nit] 2 Layout · `handled-for-you-day-1440.png`: rows end at x=1416 with the action at 1358 and "…" at 1383, but the reason text is capped at 850px leaving 400px of space mid-row. Fix: allow the text to use more width or centre-align actions on the title line.

## followups: Follow-ups
Pictures opened: 4 main (day 1440, day 390, night 1440, night 390) of 5; states loading, couldn't load, offline, filtered to nothing at 1440 day and 390 day (8 pictures).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.8 | 3.9 | 3.8 | 3.7 | 4.0 | 3.7 | 3.8 | 3.8 | 4.3 |
Issues:
- [C] 5 Comp · `followups-day-390.png`, y=245-278: "Send one at a time" is a filled burgundy pill that looks like a button but is a label, and it overlaps the top border of the card (it sits on the edge, not inside). Fix: render as a plain 13px eyebrow line inside the card; keep filled style for the one real action.
- [C] 5 Comp · `followups-day-1440.png`, row column: every row has an outline "Copy message" button, and the open pane has a filled "Copy message" for the same action; three identical-looking actions compete, and the pane's own tabs ("Message | Table") use a third control style. Fix: rows show a chevron or nothing; the pane carries the one action.
- [C] 2 Layout · `followups-day-1440.png`: the list card ends at y=462 but the pane to y=897 and the "How your messages start and end" row at y=929 hangs under with 30px gap; the "Your own to-dos" card above the list is full-width and looks like a row with no action. Fix: make "Your own to-dos" a tab or link row inside the list; align list and pane bottoms.
- [C] 4 Type · `followups-day-1440.png`, nav: sidebar "To-dos and ques…" is truncated while all others fit, and the check icon sits 3px left of other icons (x=27 vs 29) with the label at x=48 vs 50. Fix: widen nav label or shorten to "To-dos"; fix icon alignment.
- [C] 7 Edge · `followups-filtered-to-nothing-day-1440.png`, centre: the filtered-to-nothing state shows the first-run text ("Nobody has one yet…") with no "Clear filter" action and no mention that the Lantern Row Studio filter is on; the tabs (All, Personal, … Lantern Row Studio) are truncated "Harborview Community Su…". Fix: "Nothing to follow up on this side" plus Clear filter, as Today does.
- [C] 7 Edge · `followups-couldn-t-load-day-1440.png`: two separate red error cards stacked ("Follow-ups didn't load", "Couldn't load what is waiting to go out") each with its own Try again; plus the banner above. Fix: one error card with one retry.
- [nit] 1 Hier · `followups-day-1440.png`: the pane's help copy ("Copy the text, send it by email or chat, then mark it sent. Notes and labels aren't copied.") is 13px under a textarea; should be a tooltip.
- [nit] 4 Type · `followups-night-1440.png`: the bold list name 15px against muted "1 to send" works; no problems.

## todos: To-dos
Pictures opened: 3 main (day 1440, day 390, night 1440; night 390 and 1024 not opened) of 5; states loading, couldn't load, offline, filtered to nothing at 1440 day and 390 day (8 pictures).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.2 | 3.9 | 4.1 | 4.1 | 4.0 | 4.2 | 4.0 | 4.2 | 4.1 | 4.4 |
Issues:
- [C] 2 Layout · `todos-day-1440.png`, y=203-875: the list card ends at x=1136 while the page title, tabs rule and "Add a to-do" button end at x=1416; 280px of dead gutter on the right of every row, and the "…" menus sit at x=1103 far from the button above. Fix: let the list use the full content width (VP01) or put a side panel there.
- [C] 5 Comp · `todos-day-1440.png`, sidebar: "To-dos and ques…" truncated with an ellipsis while the label is the page title; the check icon is 2px left of the other icons. Fix: widen the label or use "To-dos" (the page shows the full name).
- [C] 5 Comp · `todos-day-1440.png`, y=847: "Give them dates" is bare grey bold text with no affordance, inside a tinted footer strip; rubric: no bare-text buttons. Fix: accent text link style.
- [C] 4 Type · `todos-day-1440.png`, y=895: "8 of these 8 to-dos need you" is a 13px footer line that says nothing when the numbers match. Fix: show only when the numbers differ.
- [C] 7 Edge · `todos-loading-day-1440.png`: tab counts read "To-dos 0 / Questions 0" during loading, and the header subtitle and Add button vanish, so the loaded page jumps 100px; loaded page has the add row + groups. Fix: hide counts while loading, keep the header and Add button.
- [nit] 8 Phone · `todos-day-390.png`: check circles are 18px and "…" 16px, below the 44px hit target; the long-title row clamps at 4 lines (rubric: 2). Fix: clamp at 2 lines; larger hit area.
- [nit] 2 Layout · `todos-day-390.png`: both the "Add a to-do" button and the inline "Add a to-do…" row and the centre tab-bar plus: three add actions on one phone screen. Fix: keep the inline row and the tab-bar plus.
- Strength: groups (Today, Coming up), Chinese text renders, clamp with ellipsis, filtered-to-nothing state is correct and has Clear filter.

## questions: Questions
Pictures opened: 3 (day 1440, day 390, night 1440) of 5; no state pictures (empty is the capture itself).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 3.9 | 4.0 | 4.0 | 4.0 | 4.1 | 4.0 | 4.1 | 4.0 | 4.3 |
Issues:
- [C] 1 Hier · `questions-day-1440.png`, top right: the primary "Add a to-do" button stays on the Questions tab, where a to-do is not what the tab holds, and the subtitle "8 open · 2 due today" counts to-dos while Questions shows 0. Fix: swap the primary to "Ask a question" or hide it on this tab; scope the subtitle to the tab.
- [C] 7 Edge · `questions-day-1440.png`: the empty state is a tick glyph and a single 13px-looking line, with 550px of blank below; no brand moment ("Nothing needs you…") and the copy "Questions you ask or are asked appear here" gives no action. Fix: add a one-line brand empty state and an "Ask a question" action.
- [C] 5 Comp · `questions-day-390.png`: the empty icon (tick in tile) is the same as the to-do all-clear, so a question and a to-do have the same glyph (rubric: questions look different). Fix: a question glyph.
- [nit] 2 Layout · `questions-day-1440.png`: the tab underline in the sidebar-selected row still truncates "To-dos and ques…".

## projects: Projects
Pictures opened: 4 main (day 1440, day 390, night 1440; 390 night and 1024 not opened) of 5 -> 3 main; states loading, couldn't load, offline at 1440 day and 390 day (6 pictures).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.5 | 3.8 | 3.6 | 3.4 | 3.7 | 3.4 | 3.8 | 3.6 | 4.1 |
Issues:
- [B] 5 Comp · `projects-day-1440.png`, y=128-393: the projects list is a one-column data table with a "Project" header, an empty toolbar band above it holding a lone grid icon at right (x=1391,y=149), and rows that are only a bold underlined burgundy link. It reads as a spreadsheet, and the grid icon has no label. Fix: make rows real list rows (initials tile as in the sidebar, name, one meta line such as "3 open to-dos"), remove the empty toolbar band or give the icon a label.
- [B] 7 Edge · `projects-couldn-t-load-day-1440.png` and `projects-couldn-t-load-day-390.png`: **capture fault or broken**: the picture is the offline banner plus a skeleton and no error message and no "Try again", and `projects-loading-day-1440.png` / `-390.png` have no page title and no Add button at all (the title is missing while loading). Fix: couldn't-load must show the error card with a retry (as To-dos does); loading keeps the title.
- [C] 4 Type · `projects-day-1440.png`: every project name is bold 15px underlined burgundy (five underlines stacked, the longest 460px); the underline is the link signal but at this density it is the loudest thing on the page, louder than the primary button. Fix: ink-coloured names, underline on hover/focus only (row is clickable).
- [C] 1 Hier · `projects-day-1440.png`, y=405-640: the "Views" section (title, Add view button, a 2-line help paragraph, and an empty state) takes more space than the projects list and has a second button next to the page's primary; "No views yet" empty state is a full brand-less illustration for a minor feature. Fix: fold Views into a collapsed "Views (0)" row until used.
- [C] 7 Edge · `projects-day-390.png`: the empty-state tile with 2-line copy under a 3-line help paragraph repeats the explanation twice ("A view is a list of projects…" then "No views yet. Add one to see only…"). Fix: drop the paragraph.
- [C] 6 Colour · `projects-night-1440.png`: gold underlined names on near-black; fine contrast but five gold underlines read as errors/warnings next to the gold primary. Same fix as Type.
- [nit] 2 Layout · `projects-day-1440.png`: sidebar shows Projects missing from Saved items in this capture (Projects page selected state not highlighted in the nav: no row is selected), so the page has no "you are here" in the sidebar. Fix: highlight the Projects row (or add it).

## side-page: A business's page, with a long name
Pictures opened: 3 (day 1440, day 390, night 1440) of 5; no state pictures (this screen is itself the long-name state).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.5 | 3.5 | 3.7 | 3.6 | 3.9 | 3.7 | 3.6 | 3.6 | 4.1 |
Issues:
- [B] 1 Hier · `side-page-day-1440.png`, whole page: eight stacked sections (Open with…, Activity, Projects, What Reginald knows, an input) at about equal weight, with no primary action; "Edit details" is the only button in the header and the useful action ("Add a to-do") is absent. Two full empty states (Projects, What Reginald knows) are the biggest things on the page (each about 200px tall) and push the real content (the to-do, the activity) to the top third. Fix: lead with the open items, fold empty sections to one line ("No projects yet · Add"), and make "Add a to-do" the primary.
- [B] 3 Space · `side-page-day-1440.png`, y=480-740: the "Projects" heading is separated from its empty state by 70px and the empty state from its buttons by another 70px, while "What Reginald knows" starts only 30px below the buttons. Section gaps are uneven (40, 70, 30). Fix: one section gap token, empty states with 24px padding.
- [C] 4 Type · `side-page-day-1440.png`, y=177: the section title "Open with Willowbrook Handmade Ceramics and Garden Supply Cooperative" repeats the 60-character page name at 16px bold, with the count "1" floating at x=1029. Fix: "Open items" and a count chip.
- [C] 2 Layout · `side-page-day-1440.png`, top right: the rail card "Nothing filled yet." (x=1056 to 1416) is an empty card with no heading; the main column ends at x=1032 and the rail is 360px wide, and the rail stays nearly empty beside 1000px of content. Fix: label it ("Details"), or drop it until filled.
- [C] 8 Phone · `side-page-day-390.png`, y=1310-1365: the "Nothing filled in yet." card ends up at the very bottom, after the input, as if it were an afterthought; "Open with…" wraps to two lines with the count "1" alone on its own line (y=319). Fix: put the count inline; order details after the title.
- [C] 5 Comp · `side-page-day-1440.png`, y=770-800: "Who reads it: Read by Stand-in account. What it reads is sent away from this computer to reach it." is an unstyled 15px paragraph with a bold lead-in and a widow ("it."); it is the only privacy statement on the page but looks like body text. Fix: a status line with the data-level glyph, one line.
- [nit] 6 Colour · `side-page-night-1440.png`: fine; the To-do tag chip and hairlines read clearly.

## project-missing: A page that no longer exists
Pictures opened: 3 (day 1440, day 390, night 1440) of 5; no state pictures (it is the state).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | 4.0 | 4.0 | 4.0 | 4.0 | 4.2 | 4.0 | 4.2 | 4.1 | 4.3 |
Issues:
- [C] 2 Layout · `project-missing-day-1440.png`: the heading "Not here" sits left at x=256 while the empty block and button are centred at x=836; two alignments on a 900px empty page. Fix: centre the title with the block, or left-align the block.
- [C] 4 Type · `project-missing-day-1440.png`: "Not here" as an h1 is curt, and it is a brand-moment chance ("This page has gone missing" in the serif). The body copy is 15px muted, fine. Fix: friendlier title, one line.
- [C] 5 Comp · `project-missing-day-1440.png` (day 1440 and 390): both a "Back" link and a filled "Go to Projects" button lead to nearly the same place; the empty-state glyph is the inbox icon, which means "nothing in the list", not "page missing". Fix: a different glyph; drop one.
- [nit] 9 Brand · `project-missing-night-1440.png`: no thimble or star brand moment in an empty/error state, where the brand allows one.

## people: People
Pictures opened: 3 main (day 1440, day 390, night 1440) of 5; states loading, couldn't load, offline at 1440 day and 390 day (6 pictures).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.6 | 3.7 | 3.7 | 3.5 | 3.9 | 3.5 | 3.4 | 3.6 | 4.1 |
Issues:
- [B] 8 Phone · `people-day-390.png`, whole list: each table row becomes a card with label-over-value pairs ("Open items:" then "8"; "Who they are:" then "Printer"; "How to reach:" then the email), and the "…" menu on its own line below, so one person is 90-150px tall and the page is 1600px for 4 people and 4 orgs. This is the form-like list the rubric excludes. Fix: on phone, a person row is name + one meta line ("Printer · pat.sample@example.com") with the "…" on the title line; drop the labels.
- [B] 5 Comp · `people-day-1440.png`, y=272-555: a four-column table (Name, Who they are, How to reach, Open items) with most cells empty (Bartholomew and Robin have nothing but a name; "Open items" has a value only for Avery), an empty toolbar band with an unlabelled grid icon at x=1391, and no avatars. Fix: person rows with initials avatar, name, one meta line; show columns only when at least half the rows fill them.
- [C] 1 Hier · `people-day-1440.png`: three stacked control rows above the data (tab strip of sides at y=148, "Organization" label + select at y=186-244, then the table's own toolbar), for four people (the rubric says hide filters under about 12 rows). Fix: drop the filters until the list is long.
- [C] 2 Layout · `people-day-1440.png`, y=640-900: the Organizations table has a different column grid from the People table (People column at x=617 matches "Who they are", but "Yours" at x=900 matches nothing above), so the two tables do not share column edges. Fix: align or stack as lists.
- [C] 7 Edge · `people-couldn-t-load-day-1440.png`: the People error appears but the Organizations section underneath shows its own empty state "No organizations yet. Add the ones your contacts work for." right under the error, which is false (they just did not load). Same in `people-couldn-t-load-day-390.png`. Fix: show the error for both sections.
- [C] 7 Edge · `people-loading-day-1440.png`: skeleton keeps "Add a person" but not the tab filter's row count; loaded page has 'Organization' select and table headers that the skeleton does not, so about 110px of shift.
- [nit] 4 Type · `people-day-1440.png`: "email: pat.sample@exa…" is truncated at 170px while the column has 350px free, and carries a raw "email:" prefix. Fix: show the full address, drop the prefix.

## settings-ai: Settings, AI and spending
Pictures opened: 3 main (day 1440, day 390, night 1440) of 5; states loading, couldn't load, offline at 1440 day and 390 day (6 pictures).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.8 | 3.7 | 3.7 | 3.8 | 4.0 | 3.5 | 3.6 | 3.7 | 4.2 |
Issues:
- [B] 7 Edge · `settings-ai-couldn-t-load-day-1440.png` and `-390.png`: the error is "The settings didn't load." in 15px muted text with an inbox glyph and no "Try again" button (every other screen has one), even though the offline banner offers "Try now". Fix: use the shared error card with retry.
- [C] 7 Edge · `settings-ai-loading-day-1440.png`: the loading page shows a row-list skeleton with round lead dots and pill buttons where the loaded page is a form of three inputs, and the section nav is shorter (no You, Notices, Backups, Appearance, Quick links, Advanced), so the nav jumps 4 entries on load. Fix: a form-shaped skeleton and keep the nav constant.
- [C] 1 Hier · `settings-ai-day-1440.png`, y=235-330: "AI accounts" (the thing that blocks the assistant: "No AI account is set up yet.") is a 16px heading with a 13px grey line, the same weight as the "AI spending" heading beneath it; the filled "Add an account" is the page's only primary but is far from the empty message. Fix: render the no-account case as a warning row with the status dot and word, then the button beside it.
- [C] 3 Space · `settings-ai-day-1440.png`: gaps are 34px (AI accounts to its line), 24px (line to spending heading), 22px (heading to first rule); section spacing is not one token. At 390 the "AI accounts" heading is missing altogether above "Add an account" (`settings-ai-day-390.png`, y=339), so the button floats with no title. Fix: one gap token; keep the heading on phone.
- [C] 8 Phone · `settings-ai-day-390.png`, y=244-274: the section picker "AI and spending ›" looks like a link row, and sits under a full-width search box; the chevron points right as though it navigates, while it opens the section list. Two stacked full-width bordered controls, plus an intro paragraph of 3 lines. Fix: a select/disclosure style with a down chevron; move the intro into a tooltip.
- [C] 5 Comp · `settings-ai-day-1440.png`: the three dollar inputs are 630px wide for values like "$0.10", with their help text pushed to a right column at x=1144 that is narrower than the input; the label-input-help triple does not read as one unit. Fix: 160px inputs with help below, or a right-aligned value.
- [nit] 4 Type · `settings-ai-day-1440.png`, y=130: the intro paragraph "Each change is saved as you make it, with Undo…" is 15px body text under the title, two lines; belongs in a tooltip or the first change toast.

## settings-business: Settings, Your business
Pictures opened: 3 main (day 1440, day 390, night 1440) of 5; states: loading 1440, couldn't load 1440, offline 1440 and 390 (4 pictures; loading 390 and couldn't-load 390 not opened).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.8 | 3.8 | 3.7 | 3.7 | 4.0 | 3.5 | 3.6 | 3.7 | 4.2 |
Issues:
- [B] 7 Edge · `settings-business-couldn-t-load-day-1440.png`, centre: the same one-line "The settings didn't load." with inbox glyph and no retry; and `settings-business-loading-day-1440.png` is a list-row skeleton (circles and pills) for a page of list rows plus accordions, with the nav shorter than the loaded one (no You, Appearance, Backups…), so it shifts. Fix: shared error card with retry; stable nav.
- [C] 8 Phone · `settings-business-day-390.png`, y=470-1060: each business name is squeezed into a 150px column (about 40% of the card, rubric says at least 60%) and wraps to four lines ("Harborview / Community Support / Partnership / Incorporated") because "Rename" and "Remove" sit beside it. Fix: actions below the meta on phone.
- [C] 5 Comp · `settings-business-day-1440.png`, y=415-695: each row carries an outline "Rename" and a bare grey "Remove" text button; "Remove" is a destructive action with no style (bare text) while Rename is a pill. Fix: put both in a "…" menu, or "Rename" as the single visible action.
- [C] 4 Type · `settings-business-day-1440.png`: three separate 13px help paragraphs ("A job or a business keeps…", "Lists provide choices…", the page intro) plus per-row "2 people and items are filed under it." Fix: tooltips; row meta "Job · 2 items".
- [C] 3 Space · `settings-business-day-1440.png`: the heading "What it is called" sits 6px above its card while "Lists" has 30px; the two page sections ("Your business" and "Lists") do not share a section gap. Also the nav selected row ("Your business") is outlined against the nav column's right edge (x=476) but the content column starts at 496.
- [C] 1 Hier · `settings-business-day-1440.png`: "Add a business" and "Add a job" are equal outline pills with no primary; the page has no filled button (rubric: one primary).
- [nit] 6 Colour · `settings-business-night-1440.png`: Rename pill reads gold-tint with no outline; the grey Remove at about 4:1 on the card is near the floor.

## settings-lists: Settings, Lists
Pictures opened: 3 (day 1440, day 390, night 1440) of 5; no state pictures (every list is collapsed, so the filled, empty and long-list cases are not shown).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.9 | 3.9 | 3.8 | 3.9 | 3.8 | 3.6 | 3.8 | 3.8 | 3.8 |
Issues:
- [C] 9 Brand · `settings-lists-day-1440.png` (Demo workspace): the accent is plum/magenta (the selected nav row, Hand something in, avatar), not the product burgundy; a person's brand colour is allowed to override, but next to the other captures it reads as a different product, and the plum sits close to the danger red family. Fix: make sure the override palette keeps the cream soft tone and the contrast; or capture this screen in the default workspace.
- [C] 7 Edge · `settings-lists-day-1440.png`: only the collapsed list headers are shown; there is no expanded list (values, add, reorder), no empty list and no long list; "Reminder kind" is a raw-looking label. Fix: capture one expanded accordion and the empty list.
- [C] 6 Colour · `settings-lists-night-1440.png`: the selected "Lists" nav row is a solid plum block (x=256-476) that is far heavier than the selected rows on other screens (a soft tint), and the page-level selected row (Settings) uses the same fill; two heavy selections at once. Fix: soft accent fill, as the cream by day.
- [C] 4 Type · `settings-lists-day-1440.png`: "Lists" nav item is in a different place (between Backups and More) from the other captures, where Lists is in the Your business page, so the same content has two homes. Fix: pick one.
- [nit] 8 Phone · `settings-lists-day-390.png`: 100px empty gap between the section picker and the intro line; the picker chevron faces right.
- [nit] 3 Space · `settings-lists-day-1440.png`: rows are 49px, uniform; fine.

## settings-addons: Settings, Add-ons
Pictures opened: 3 main (day 1440, day 390, night 1440) of 5; state "With an add-on installed" at 1440 day and 390 day (2 pictures).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.7 | 3.7 | 3.6 | 3.6 | 3.9 | 3.7 | 3.8 | 3.7 | 4.0 |
Issues:
- [B] 4 Type · `settings-addons-day-1440.png`, y=619: the error line reads "This catalog couldn't be read: couldn't read it: there is no internet connection" (stuttering, two "couldn't read" clauses) in 15px red on cream with a red bar, plus the empty state above it says "The catalog couldn't be read" again: the same fact three times in 170px. Fix: one error message, with the reason as a short second clause, and one retry ("Refresh" beside it).
- [C] 1 Hier · `settings-addons-day-1440.png`: the default state of the Add-ons page is an error (no catalog); the intro paragraph (4 lines, 13px: "Add-ons add a kind of work… The app never takes payment. Prices are in US dollars…") is the heaviest block and the tabs (Available, Installed) sit under it with no content. Fix: tooltip for the intro; show the empty state only when the catalog loaded and is empty; use the error card otherwise.
- [C] 5 Comp · `settings-addons-day-1440.png`, y=655: "Add another catalog" is centred bare grey bold text, with no button or link style, between the red line and the divider. Fix: text-link style, left aligned.
- [C] 5 Comp · `settings-addons-with-an-add-on-installed-day-1440.png`: the installed rows ("Example", "Kit") have a status dot and word "On" and an outline "Turn off" (good), but "Details" is a chevron-bold row and the card has no title or version; descriptions wrap at 640px while the card is 920px. Fix: add the version in meta.
- [C] 2 Layout · `settings-addons-day-1440.png`: the "Catalog" subsection sits in the main column below a dashed rule at 553 and "More settings" under another rule; three horizontal rules (dashed, solid, solid) of different styles in 150px.
- [nit] 8 Phone · `settings-addons-day-390.png`: "Available/Installed" tabs have no divider line and the selected tab underline is a short burgundy bar under a pill background; the section picker "Add-ons ›" repeats as on every Settings page.
- [nit] 9 Brand · `settings-addons-with-an-add-on-installed-day-1440.png`: Demo workspace in plum accent.

## settings-menu: Settings, the menu and search
Pictures opened: 3 (day 1440, day 390, night 1440) of 5; no state pictures (the screen is the search state).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.6 | 3.7 | 3.7 | 3.7 | 4.0 | 3.7 | 3.2 | 3.7 | 4.2 |
Issues:
- [B] **capture fault** · `settings-menu-day-390.png` vs `settings-menu-day-1440.png`: the 1440 picture is the search state (query "name", "1 place found", filtered results), the 390 picture is not: it is the "You" page with an empty search box, no result summary. The screen name is "the menu and search", so the phone search state is not shown at all. Fix: capture the same query at 390.
- [B] 8 Phone · `settings-menu-day-390.png`, y=95-660: the page shows the section navigation twice, a "You" select with a chevron (y=274) and then a full wrapped chip list of all sections ("About you / You Your business / Assistant / AI and spending Notices …") in a ragged flow that takes 380px, plus an "Open the setup guide" button between title and intro; a person has to scroll 700px before the first field. Fix: show one navigation control (the select) and the page directly below it.
- [B] 8 Phone · `settings-menu-day-390.png`, y=1420-1900: the "Accounts the assistant can act on" rows put a 110px description column to the left of a checkbox and a bold "Let Reginald act after your yes" label, so the description wraps to 7 lines of 5 words, repeated three times. Fix: stack description above the checkbox on phone.
- [C] 1 Hier · `settings-menu-day-1440.png`, y=185-265: search result block is "1 place found. 3 settings shown." (13px), then "Go to" heading, then "You Your name, time zone and spelling." with an underlined burgundy "You" link in a different font size from its description, then the matching section heading "You" — three headings before the first field; "Advanced" appears as an h2 under the results with one checkbox. Fix: results as one list with the section label as a small eyebrow per group.
- [C] 5 Comp · `settings-menu-day-1440.png`: the matched search text "name" is not highlighted in the results; search field has a double focus ring (burgundy ring plus outer ring) that reads heavy; the "Your assistant's name" fields are 630px wide for a single word.
- [C] 4 Type · `settings-menu-day-1440.png`: the intro paragraph (2 lines) stays above the search while results show; right-column help is 13px muted and about 4 lines on "Offer date reminders" (the longest, 5 lines).
- [nit] 6 Colour · `settings-menu-night-1440.png`: gold ring on the focused search field is strong and good; the checked box is gold with dark tick: fine.

## status-popover: The header's status popover
Pictures opened: 3 (day 1440, day 390, night 1440) of 5; no state pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.6 | 3.7 | 3.7 | 3.6 | 3.9 | 3.5 | 3.7 | 3.7 | 4.1 |
Issues:
- [B] 1 Hier · `status-popover-day-1440.png`, y=65-690: the popover holds five stacked sections (Reginald, Reginald again, Backup, Connections with three account cards, Updates) and is cut off at the bottom: the Updates section starts at y=667 and its button is clipped by the popover edge at y=688 with no scroll cue or fade. The first two sections both say Reginald is not ready ("No AI account yet", "The assistant isn't set up yet") — the same fact twice. Fix: one status line per system (a dot plus a word), expand only the failing ones; make the popover scroll with a visible fade, or cap its height with "See all".
- [C] 2 Layout · `status-popover-day-1440.png`: the popover (x=724-1143) overlaps the Today page with no scrim, so Today's rail and the clash rows' buttons show through on both sides, and its right edge (1143) does not align with the header's status chip (1143 is the chip's right edge: fine) but the arrow/caret is missing. Fix: a scrim or an elevation shadow stronger than the hairline; day shadow is faint.
- [C] 5 Comp · `status-popover-day-1440.png`: three different button styles in 250px: a full-width outline "Open AI account setup", a right-aligned small "Set up backups" outline, and a clipped one; status headlines are amber bold text ("No backup on another device") that mixes with real headings. Fix: one status pattern (dot, word, optional action right).
- [C] 8 Phone · `status-popover-day-390.png`: the popover takes the whole screen below the header and covers the page, with a "Close" text button at the top right (13px grey bold, under 44px); the account card list ends at y=690 with "avery.lane.studio" cut by the bottom edge and the tab bar visible but the popover not scrollable-looking. Fix: a bottom sheet with a grab handle and a 44px close.
- [C] 6 Colour · `status-popover-day-1440.png`: amber headings (about 4.1:1 on cream, estimated) at 15px bold; warning amber and the brand gold-brass are close at night (`status-popover-night-1440.png`: orange headings next to gold links). Fix: use the warning token with an icon and word and keep amber for the dot only.
- [nit] 4 Type · `status-popover-day-1440.png`: the connection cards use 15px bold e-mail addresses for headings (three of them, 190px wide) instead of the account label.

## search-results: Search, with results
Pictures opened: 3 (day 1440, day 390, night 1440) of 5; no state pictures (no "no results", loading or long-result case).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 4.0 | 4.0 | 4.0 | 3.9 | 4.1 | 3.7 | 4.0 | 3.9 | 4.2 |
Issues:
- [C] 7 Edge · `search-results-day-1440.png`: only the happy case (two results and an "Ask" row); no "nothing found" state, no loading, no 10+ results, no long names. Fix: capture them.
- [C] 5 Comp · `search-results-day-1440.png`, rows y=85-200: the result rows have no leading icon and no hover/selected highlight shown, so a keyboard user cannot see which row is active; "Person" and "To-do" kind labels are muted 13px at the right and the "Ask Reginald about “Pat”" row is the same weight as real results. Fix: a leading glyph per kind, a visible active row, and the Ask row separated with a rule and a spark icon.
- [C] 2 Layout · `search-results-day-1440.png`: the list panel is 480px wide, hangs from the field's left edge (155) and ends at 643 while the field ends at 644 (good); but the footer line "Searching is free. Asking sends your question to Reginald." sits outside the panel on the page below it, on a transparent background, so it overlaps the page content behind (x=164-520, y=240). Fix: put the note inside the panel.
- [C] 8 Phone · `search-results-day-390.png`: the panel overlays the Today page with its own note under it and no scrim, the page's red row shows right below the panel's note; the "Search" field replaced the header (good) but the tab bar remains. Fix: scrim, or the panel as a full-screen view on phone.
- [nit] 6 Colour · `search-results-night-1440.png`: panel edge only just lifts off the canvas (hairline); acceptable.

## setup-welcome: Setup, Welcome
Pictures opened: 1 of 1 (day 1440 only; 1440 night, 1024 and 390 are "not captured": the guide has no way back to Welcome from the step). Phone is scored 3.0 because there is no picture; this is a **capture gap**, not a design score.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.5 | 3.7 | 3.8 | 3.8 | 4.0 | 3.5 | 3.0 | 3.6 | 3.4 |
Issues:
- [B] 9 Brand · `setup-welcome-day-1440.png`: the first screen a person ever sees has no thimble mark, no star, no cream identity card and no brand line ("A little more room to think."): only the small serif "Getting started" at top left and a plain bulleted list. The rubric names Welcome as the place for the mark. Fix: centre the mark above "Welcome", brand line under it, and the numbered serif promises as on the website.
- [B] 8 Phone · no picture at 390: Welcome cannot be assessed on the phone. Fix: make the capture reachable (a route or a "Back to Welcome" in the guide).
- [C] 2 Layout · `setup-welcome-day-1440.png`: the header content ("Getting started", "Finish later") spans the full width at x=24 and x=1407, while the body column sits at x=380-1060 and the footer's "Start" is at x=997-1060; three different left/right edges. About 480px of empty page under three bullets (y=360-840). Fix: put the header inside the same 680px column or centre the content block vertically.
- [C] 1 Hier · `setup-welcome-day-1440.png`: "Welcome" at 24px serif is followed by a 15px muted line, then a 17px paragraph (the real message) that is larger than the helper above it, then "What you'll need" bold; the order of weight is inverted (the muted line "Each step can be skipped now…" comes before the point). Fix: lead with the statement, then the reassurance.
- [C] 5 Comp · `setup-welcome-day-1440.png`: "Finish later" at the top right is bare grey bold text; "Start" is the only button, with no "Back". Plain bullets with disc markers instead of the checklist glyphs the later steps use.
- [C] 7 Edge · no state pictures and no night picture; "Skipped/Done" welcome state and the first-run feel are not shown.

## setup-ai: Setup, Your AI account
Pictures opened: 5 (day 1440, day 390, night 1440, night 390; 1024 not opened) of 5 listed -> 4 opened; no state pictures (no wrong key, checking, network failure or "Something else" path).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.7 | 3.8 | 3.8 | 3.7 | 3.9 | 3.4 | 3.8 | 3.7 | 4.3 |
Issues:
- [B] 7 Edge · `setup-ai-day-1440.png`: only the first-run state; none of the states that matter on this step (a wrong key, "checking", a network failure, the "Something else" path, a chosen provider with its key field) are captured. The page below the cards (y=450-840) is 400px of empty canvas. Fix: capture them; they are where this step succeeds or fails.
- [C] 5 Comp · `setup-ai-day-1440.png`, y=268-382: three provider cards with border-only identity: none shows a selected state in the capture, and "Recommended" (green chip) is a status colour on a brand decision (state colours should not appear as brand). Fix: show a selected card with a check mark and a 2px accent border; make "Recommended" a neutral/brand chip.
- [C] 5 Comp · `setup-ai-day-1440.png`, footer y=856-890: "I'll do this later" (bare grey bold text) and "Finish later" (top right, bare grey bold text) both offer the same escape; the disabled "Continue" is a pale outline pill that reads like a secondary button, with its reason ("Choose an AI service to go on.") in 13px at the far right, 60px from the button. Fix: keep one escape; disabled Continue as a filled pill at 40% with the reason under or beside it.
- [C] 2 Layout · `setup-ai-day-1440.png`: the footer's controls start at x=514 (Back) and end at x=1194, aligning with the content column (good), but the rail begins at x=246 and the header at x=24, so the footer, rail and header are three different widths (the same VP01 fault the rubric lists). Fix: one content width.
- [C] 4 Type · `setup-ai-day-1440.png`, y=170-255: two help paragraphs (15px "Connect an AI account…" and 13px "Your assistant needs an AI service…") and a bold question between them; the cost sentence "It asks you before anything over $0.10, and stops for the day at $2. Change" is 15px with bold values in a tinted well: useful, but the "Change" link is underlined burgundy (a third link style). Fix: drop the first paragraph.
- [C] 8 Phone · `setup-ai-day-390.png`, y=725-840: the sticky footer stacks the reason line, "Back" (left, small pill), "I'll do this later" (right, bare text) and a full-width disabled Continue: four elements, about 120px of the 847px screen. Fix: reason beside Continue; drop one escape.
- [nit] 9 Brand · `setup-ai-night-1440.png`: italic serif numerals in the rail echo the website's promises (good); no mark or star on the step.
- [nit] 6 Colour · `setup-ai-night-1440.png`: the rail shows "Your promises · Skipped" dashed and People ticked while the day capture shows none: the two themes were captured in different progress states.

## setup-promises: Setup, Your promises
Pictures opened: 3 main (day 1440, day 390, night 1440) of 5; state "Promises found" at 1440 day and 390 day (2 pictures).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.5 | 3.6 | 3.7 | 3.8 | 4.0 | 3.2 | 3.7 | 3.6 | 4.1 |
Issues:
- [B] **capture fault** · `setup-promises-promises-found-day-1440.png` and `-390.png`: the state is named "Promises found" but the picture shows no promises: it shows "The assistant looks back over mail it can read. Until some is connected, hand it something to read and see what it does." with two buttons, which is the "nothing connected yet" state. Fix: capture a step with found promises (a list of what you promised and to whom).
- [B] 7 Edge · `setup-promises-day-1440.png`, y=90-840: the default state is a title, one line, one sentence and one outline button in the top 260px, with 580px empty below; the step's whole content is a redirect ("Choose an AI account first… Go to your AI account"), yet "Continue" is a filled primary pointing forward while the real next action ("Go to your AI account") is an outline. Fix: make "Go to your AI account" the primary in this state and demote Continue; shorten the void with a brand empty state.
- [C] 1 Hier · `setup-promises-day-1440.png`: the helper line "The first thing the assistant does for you." (muted, 15px) is followed by the message in black at the same size; the message and the button end at different right edges (the button right-aligned at x=1194, text left-aligned at 514), so the button floats away from its sentence. Fix: put the button under the sentence, left-aligned.
- [C] 2 Layout · `setup-promises-promises-found-day-1440.png`: the two buttons sit at the end of the sentence (x=710-1194, y=249-283) right-aligned, the first outline "Go to mail and calendar", the second filled and 290px wide "Hand something in to see what it does" (about 40 characters on a button); long button labels. Fix: shorter label, left-aligned.
- [C] 5 Comp · `setup-promises-day-390.png`: the "Continue" is a full-width filled button at the bottom while the step content says to leave this step; footer is "Back" + full-width Continue (two rows) here but one row at `setup-promises-promises-found-day-390.png` (Back, I'll do this later, Continue in one row): footer layout differs between states of the same step.
- [nit] 6 Colour · `setup-promises-night-1440.png`: the rail marks "Your promises" as "Skipped" with a dashed ring on the page being viewed, which contradicts the current-step highlight.

## setup-people: Setup, People
Pictures opened: 3 (day 1440, day 390, night 1440) of 5; no state pictures (the 390 and night pictures show an "already exists" error but the day picture is the clean form).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.5 | 3.4 | 3.6 | 3.4 | 3.9 | 3.5 | 3.6 | 3.6 | 4.1 |
Issues:
- [B] 5 Comp · `setup-people-day-1440.png`, y=255-530: "The people in your life" is a bulleted list with a disc marker, the name, a full-width 640px "Choose…" select (the person's relationship, unset on all three rows) and a small "Remove" pill under each, so each person is three stacked controls, 92px, with no avatar or row boundary; it is the form-like list the rubric excludes. Fix: rows with initials avatar, name, a compact relationship select inline at the right, and "Remove" in a "…" menu.
- [B] 3 Space · `setup-people-day-1440.png`: the "Remove" pill of one person sits 8px above the next person's name, so it reads as belonging to the next row; the add form's labels (Name, Who they are) are 45px below the last Remove; "Paste a list" 28px under the inputs. No consistent gap. Fix: row separators and 16px row padding.
- [C] 1 Hier · `setup-people-day-1440.png`: the step's primary job (adding a person) is a small form with a pale disabled "Add" button at the far right (x=1138-1194), lighter than the "Remove" buttons above; "Continue" is the only filled button. Fix: make the add row a single input with an inline "Add".
- [C] 8 Phone · `setup-people-day-390.png`, y=605-805: the error "Sam Twin already exists." appears below the "Who they are" select and pushes "Paste a list" to y=797, only 28px above the sticky footer's top edge; the Add button is squeezed to 56px beside a 290px select. Fix: put the error under the Name field it belongs to.
- [C] 7 Edge · `setup-people-day-1440.png`: no empty list and no 10+ people case; the error appears only in night and 390 pictures. Fix: capture the empty first-run and the error in day.
- [C] 4 Type · `setup-people-day-1440.png`: "Paste a list" is an underlined burgundy link set alone below the form, the same link style used for "Change" elsewhere.
- Strength: night error row (red bar and word, not colour alone) is correct.

## Summary
Not opened: 1024 day pictures for every screen, 390 night for screens other than followups, what-changed, setup-ai (not listed there for the rest), settings-business loading 390 and couldn't-load 390, and the 1024 pictures of all states. Scores are from the pictures listed under each screen only. No screen reaches 4.6.

| Screen | Overall | Lowest point | Brand | Passes 4.0 / no point under 3.5 / brand ≥4.0 | Passes 4.6 / no point under 4.3 / brand ≥4.5 |
|---|---|---|---|---|---|
| today | 3.8 | 8 Phone 3.6 | 4.3 | No (overall) | No |
| since-yesterday | 3.9 | 4 Type 3.7 | 4.3 | No (overall) | No |
| what-changed | 3.7 | 1 Hier 3.5 | 4.2 | No (overall) | No |
| handled-for-you | 3.9 | 8 Phone 3.7 | 4.3 | No (overall) | No |
| followups | 3.8 | 7 Edge 3.7 | 4.3 | No (overall) | No |
| todos | 4.1 | 2 Layout 3.9 | 4.4 | **Yes** | No |
| questions | 4.0 | 2 Layout 3.9 | 4.3 | **Yes** (4.01) | No |
| projects | 3.6 | 5 Comp 3.4, 7 Edge 3.4 | 4.1 | No (two points under 3.5) | No |
| side-page | 3.6 | 1 Hier 3.4 | 4.1 | No (point under 3.5) | No |
| project-missing | 4.1 | 5 Comp 4.0 | 4.3 | **Yes** | No |
| people | 3.6 | 8 Phone 3.4 | 4.1 | No (point under 3.5) | No |
| settings-ai | 3.7 | 7 Edge 3.5 | 4.2 | No (overall) | No |
| settings-business | 3.7 | 7 Edge 3.5 | 4.2 | No (overall) | No |
| settings-lists | 3.8 | 7 Edge 3.6 | 3.8 | No (overall, brand) | No |
| settings-addons | 3.7 | 1 Hier 3.6 | 4.0 | No (overall) | No |
| settings-menu | 3.7 | 8 Phone 3.2 | 4.2 | No (overall, point under 3.5) | No |
| setup-welcome | 3.6 | 8 Phone 3.0 (no picture) | 3.4 | No (overall, point, brand) | No |
| setup-ai | 3.7 | 7 Edge 3.4 | 4.3 | No (point under 3.5) | No |
| setup-promises | 3.6 | 7 Edge 3.2 | 4.1 | No (point under 3.5) | No |
| setup-people | 3.6 | 3 Space 3.4, 5 Comp 3.4 | 4.1 | No (two points) | No |
| status-popover | 3.7 | 7 Edge 3.5 | 4.1 | No (overall) | No |
| search-results | 3.9 | 7 Edge 3.7 | 4.2 | No (overall 3.96) | No |

22 screens scored; 3 pass the 4.0 bar (todos, questions, project-missing); 0 reach 4.6.

Capture faults: `settings-menu-day-390.png` (not the search state); `setup-promises-promises-found-day-1440.png` and `-390.png` (no promises shown); `projects-couldn-t-load-day-1440.png` and `-390.png` (offline banner and skeleton, no error); `since-yesterday-day-1440.png` (rows present, other sizes empty); `setup-welcome` night, 1024 and 390 not captured.
Broken: raw "an / d" split at 390 on Today's clash rows (`today-day-390.png`); no retry on settings couldn't-load (`settings-ai-couldn-t-load-day-1440.png`, `settings-business-couldn-t-load-day-1440.png`); status popover clipped at its bottom edge (`status-popover-day-1440.png`).

Top ten fixes across this part, in order of score gained:
1. One shared couldn't-load card with a retry for every screen (Settings pages lack a retry; Projects shows none; Follow-ups and People show two): lifts 7 Edge by 0.2-0.4 on about 10 screens.
2. Phone row anatomy: actions drop below the meta and titles get at least 60% width (Handled for you, Settings business, People, Today clash rows, Setup people): lifts 8 Phone by 0.3-0.6 on about 7 screens; fixes the "an/d" break and the label-over-value people cards.
3. Replace the one-column tables on Projects and People with list rows (avatar, name, one meta line); hide filters and empty toolbar bands under about 12 rows: lifts 5 Comp and 2 Layout by 0.4 on two screens.
4. What changed: group the 22 identical rows, drop the repeated "Needs you" pill, show the real reason in the row: lifts 1 Hier and 4 Type by 0.4.
5. Welcome: add the mark, brand line and the numbered serif promises, and make Welcome and its night and phone pictures capturable: lifts 9 Brand 3.4 to 4.2 and 8 Phone.
6. Side page: fold empty sections, lead with open items and one primary, one section-gap token: lifts 1 Hier and 3 Space by 0.4-0.5.
7. Setup people: row anatomy with inline relationship select and "…" menu; fix the 8px Remove gap: lifts 3 Space and 5 Comp by 0.4-0.5.
8. State sheets in the setup steps (wrong key, checking, network failure, found promises, empty people) and a real "Promises found" capture: lifts 7 Edge on three setup screens by 0.4-0.6.
9. Status popover: one line per system, scroll fade, bottom sheet on phone, a scrim: lifts 1 Hier, 5 Comp and 8 Phone by 0.3.
10. Settings phone navigation: show one control (the select) not both the select and the wrapped chip list, stack the "Accounts the assistant can act on" rows, and restore the missing "AI accounts" heading at 390: lifts 8 Phone on settings-menu by about 0.8, and 0.2 on the other Settings pages.

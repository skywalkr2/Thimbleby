# Scorer A, part 1

## today: Today
Pictures opened: 11 of 25 (main five, plus loading, couldn't-load, offline, filtered-to-nothing at 1440 and 390 where noted)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.4 | 3.6 | 3.7 | 3.7 | 3.7 | 4.0 | 3.2 | 3.6 | 4.2 |
Issues:
- [B] 8 Phone · `today-day-390.png`, y 780-840: the tab bar sits across the middle of the page and hides the "Venue walk-through" decide row (title unreadable); bottom padding does not clear the bar. Fix: reserve bar height as bottom padding; if it is a full-page capture artifact, capture the viewport scrolled to the end as well.
- [B] 8 Phone · `today-day-390.png`, y 850-1120: the conflict rows show a lone "an" / "an d" column squeezed to the right of "Your calendar, avery.lane@exam…", and a stray "·" on its own line. Mark **broken**. Fix: stack the two calendar chips on separate lines, drop the "and" joiner, never show the same account twice in one line.
- [C] 2 Layout · `today-day-1440.png`, main column ends y=725 while the rail ends y=900: columns do not finish level; empty band under the main card. Fix: let the page grow with the rail or put the rail below.
- [C] 1 Hierarchy · `today-day-1440.png`, header: "Restart to finish" chip, "Reginald" warning, "Hand something in" (tinted) and the Decide "Restart now" all compete; the Decide row 2 meta paragraph (three mailbox addresses) outweighs its title. Fix: summarise to "3 mailboxes" and fold the addresses.
- [C] 2/3 Layout/Space · `today-day-1440.png`, Decide rows: titles start at x=309 but the At risk conflict rows have a leading warning glyph at x=285 and the Decide rows have a 24px empty lead; rows differ in height (one, two, three meta lines) with no fixed rhythm.
- [C] 4 Type · `today-day-1440.png`, conflict rows: the meta is a run-on "Today · • Your calendar, … and • Your calendar, … · No time between them" at 13px with raw email addresses repeated, hard to scan. Fix: one fact per line, bold "30 minutes short".
- [C] 5 Components · `today-day-1440.png`: three pill styles (Restart needed amber, Sent folder grey outline, No AI account amber) and several secondary button styles (outlined, tinted "Hand something in", underlined link "Thanks"). Fix: one status pattern (dot plus word).
- [C] 6 Colour · `today-night-1440.png`, "Restart to finish" and "Reginald" chips and the underlined Came-in links are all orange/gold, close to the gold accent, so warning and brand read alike. Fix: the night warning to the brief's #ff9a5c and links to ink.
- [C] 7 Edge · states are good (skeleton rows, offline banner plus Try now, per-card Try again, filtered empty with Clear filter), but `today-filtered-to-nothing-day-1440.png` still shows an At risk row under the "Nothing on the Lantern Row Studio side" card (filter and list disagree) and leaves a 90px dead gap inside that card; no all-clear and no 30+ picture. `today-loading-day-1440.png` skeleton is 3 rows where the real list is 7, so layout shifts when it loads.
- [nit] 9 Brand · `today-day-1440.png`: mark, serif title, burgundy and cream are right; the green setup progress bar is off-brand. The Came-in unread dots in burgundy collide with the brand accent.


## today-review: Today, a line opened for review
Pictures opened: 2 of 4 (1440 day, 390 day; 1440 night and 1024 not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.0 | 3.4 | 3.8 | 3.5 | 3.8 | 3.4 | 3.9 | 3.5 | 4.1 |
Issues:
- [B] 2 Layout · `today-review-day-1440.png`, the Details card floats at x=1055-1416, y=245, with 800px of empty space between it and the title block, and everything below y=450 is empty. Fix: put the card in the main column under the explanation, or make it a two-column page with the card beside the text.
- [C] 1 Hierarchy · `today-review-day-1440.png`: no next action at all (the person came from "too close together" and cannot decide, move or dismiss). The "Back" is a bare text button. Fix: one primary such as "Open in your calendar", and a quiet "Back".
- [C] 8 Phone / 2 Layout · `today-review-day-390.png`: the left nav shows no selected item at 1440 (Today not highlighted although it is the parent) while the phone tab "More" is selected, an odd mapping. Fix: highlight the section the page was opened from.
- [C] 4 Type · `today-review-day-1440.png`: two 13-14px grey help paragraphs repeat the same idea ("nothing here can be changed" / "Change it in your calendar app"). Fix: one sentence.
- [C] 7 Edge · no state pictures; "When" wraps "10:16 / PM" onto a second line at 1440 (`today-review-day-1440.png`, x=1199 y=300-320). Fix: no-wrap times, or widen the card.
- [nit] 5 Components · "Calendar event" pill beside the serif title is a fourth status style.

## since-yesterday: Since yesterday
Pictures opened: 4 of 16 (1440 day, 390 day, 1440 night, couldn't-load 1440; other states not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.7 | 3.7 | 3.6 | 3.6 | 3.8 | 3.8 | 3.7 | 3.7 | 4.1 |
Issues:
- [C] 1 Hierarchy · `since-yesterday-day-1440.png`, y 190-300: row titles are the full sentence ("Set aside “Spring sale…”: a sorting rule set it aside (it was sent to many people, as a mailing list or bulk mail)") in bold 15px, so the reason outweighs the object. Fix: title "Set aside “Spring sale: everything half price”", reason as muted meta.
- [C] 2 Layout · `since-yesterday-day-1440.png`: rows have a 24px empty lead slot (titles at x=309, heading at x=256) and no per-row action; the only undo is hidden in the "…". A mostly empty page: two rows then 600px blank. Fix: show an Undo link on each row; drop the dead lead.
- [C] 4 Type · `since-yesterday-day-1440.png`, y 130-160: help paragraph at 13px grey under the title repeats what the page is. Fix: fold into a tooltip.
- [C] 7 Edge · the day 1440 picture has two rows but `since-yesterday-night-1440.png` and `-390.png` show the empty state, so the pictures disagree about the data; the empty state ("Nothing new since yesterday…" plus "Did Reginald miss something? [Missed something?]") is good but the phrase doubles the question as a button. No 1-row or 100+ view.
- [C] 5 Components · `since-yesterday-day-1440.png`: "Closed since you last looked" is bold grey inline meta, the only status shown, not the dot-plus-word pattern; "Back to What changed" is an outline button at the top right acting as navigation (should be a back link).
- [nit] 8 Phone · `since-yesterday-day-390.png`: "Back to What changed" button sits between the title and the paragraph pushing content down; at the empty state the content ends 330px above the tab bar (fine).
- [nit] 9 Brand · burgundy mark and serif title right; no brand moment in the empty state (inbox glyph only).

## what-changed: What changed
Pictures opened: 7 of 21 (1440 day, 390 day, 1440 night, 390 night, loading 1440, offline 390; others not opened)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.5 | 3.7 | 3.5 | 3.4 | 3.8 | 3.8 | 3.3 | 3.5 | 4.1 |
Issues:
- [B] 4 Type · `what-changed-day-1440.png`, detail panel, y 400-430: raw product wording "Settings or code changed since the cockpit started; restart it to use them." shown as the opened item's body (internal term "cockpit", and it is unrelated to a calendar event). Mark **broken**. Fix: show the item's real detail; never show the internal term.
- [C] 1 Hierarchy · `what-changed-day-1440.png`: all 12 rows have the same weight; "Needs you" rows (the only ones to act on, bottom y 1015-1120) sit last, with no grouping. Fix: group "Needs you" first, then "With Reginald".
- [C] 2 Layout · `what-changed-day-1440.png`: the first five rows (calendar events) have no "…" menu and the other rows do, so the right edge differs; rows have a 24px empty lead slot; the detail panel ends at y=452 while the list runs to y=1145. The two lines "5 things wait for you on Today · Open Today" and "2 handled for you" are loose underlined links above the list. Fix: one link row.
- [C] 5 Components · `what-changed-day-1440.png`: "With Reginald" / "Needs you" pills in two colours, plus underlined burgundy links and an outline "Since yesterday" button. One status pattern please. "stopped, see why below" points at nothing visible.
- [B] 8 Phone · `what-changed-day-390.png`, y 780-840: the tab bar crosses the list and hides a row title (capture of the whole scrolled page; also in `what-changed-offline-day-390.png`, y 720-790). If real, rows are hidden under the bar; if capture only, add a viewport-scrolled capture. Rows are 140px tall each because the pill and two meta lines stack; 12 rows is 1900px. Fix: put the status word in the meta line, one-line meta.
- [C] 4 Type · every row repeats "Handed in Tue, Nov 3, 9:33 PM · Reginald is on it" (identical on all rows), noise that hides the useful part. Fix: show it once, or only what differs.
- [C] 7 Edge · `what-changed-loading-day-1440.png` skeleton has circle and button blocks that the real rows do not have (layout shift); the loading nav also lacks the item badges. Offline banner good.
- [nit] 6 Colour · `what-changed-night-1440.png`: selected row's 3px edge is gold and tint barely lifts; fine.

## handled-for-you: Handled for you
Pictures opened: 3 of 17 (1440 day, 390 day, 1440 night)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.4 | 3.5 | 3.4 | 3.5 | 3.8 | 3.4 | 3.8 | 3.5 | 4.0 |
Issues:
- [C] 2 Layout · `handled-for-you-day-1440.png`: the two filter tabs, two paragraphs, a search box (x 256-768) and a Kind/Reason/Sender segmented control (x 788-1000) all sit above a single collapsed group; the search and segmented control end at x=1000 while the page runs to 1416, so no shared right edge. The page is 70% empty below y=310. Fix: hide search and grouping controls below about 12 items; show the two items directly.
- [C] 1 Hierarchy · `handled-for-you-day-1440.png`: the content (one collapsed group "Sales, promotions and social updates · 2") is the weakest thing on screen; the controls outweigh it. Fix: expand the group by default when it is the only one.
- [C] 4 Type · `handled-for-you-day-1440.png`, y 185-215: two 13px grey help paragraphs. Fix: one sentence, rest in a tooltip.
- [C] 5 Components · "Set aside before reading · 2" / "Read, nothing to do · 0" are tabs drawn as a pill toggle, and the Kind/Reason/Sender control is a second toggle of the same look, so they read as the same control. In `handled-for-you-day-390.png` the tab pill is a faint cream band with the second tab off its edge.
- [C] 7 Edge · no empty-state picture for the "Read, nothing to do · 0" tab; states otherwise not opened.
- [nit] 3 Space · `handled-for-you-day-390.png`: first tab pill starts at x=20, not the title's x=16.
- [nit] 9 Brand · serif title and mark good; plain page, no brand moment for the all-handled state.

## followups: Follow-ups
Pictures opened: 4 of 5 main (1440 day, 390 day, 1440 night; empty at 1440), no state pictures opened for loading/offline/filtered
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.6 | 3.7 | 3.7 | 3.7 | 3.9 | 3.8 | 3.7 | 3.7 | 4.2 |
Issues:
- [C] 1 Hierarchy · `followups-day-1440.png`: four filled-or-tinted actions at once: three "Copy message" outlines in the list and a filled burgundy "Copy message" in the panel, for the same item. Fix: list rows open the panel; the only Copy is in the panel.
- [C] 2 Layout · `followups-day-1440.png`: the panel runs y 345-1025 while the list ends y=547, and the "How your messages start and end" disclosure sits at y=1057 far below at x=259 with 500px of empty space left of it. The "Your own to-dos" card above the list spans the full width but is a different anatomy from the person rows below it.
- [C] 2 Layout · `followups-day-1440.png`, nav: "To-dos and ques…" is truncated with its icon at x=27 and label at x=48 (others at 29 and 50), so this row alone is misaligned and clipped. Fix: shorter label or wider rail; fix the badge-driven shift.
- [C] 5 Components · three stacked filter rows (To send/Later/Waiting tabs, By person/By project toggle, side chips with counts) before any content = three nested control styles. Fix: fold the side filter into one "Side" menu as the phone already does (`followups-day-390.png`).
- [C] 4 Type · `followups-day-1440.png`: long name "Bartholomew Featherstonehaugh-Winterbottom" wraps in the panel title with a hyphen break, fine; but the "Willowbrook Handmade Ceramics and Garden Supply Cooperative: not in a project" is a 12px tinted box inside a bullet, hard to read. Help line "Copy the text, send it by email or chat…" at 13px grey.
- [C] 8 Phone · `followups-day-390.png`: "Send one at a time" burgundy pill sits glued to the card's top edge (y=307, overlapping the card border) and is a filled burgundy pill that is not a button, so it reads as a primary action. Fix: make it plain meta text.
- [nit] 7 Edge · `followups-empty-day-1440.png`: empty state is a good plain sentence but long (four lines) and has an inbox glyph (the same as Handled for you); the "Your own to-dos" card above says 8 to-dos and the nav badge for To-dos shows 8 while Today says 2; fine.
- [nit] 9 Brand · burgundy primary and serif title; night primary is gold pill (right per brief).

## followups-later: Follow-ups, Later
Pictures opened: 2 of 5 (1440 day, 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.6 | 3.7 | 3.8 | 3.7 | 3.9 | 3.7 | 3.8 | 3.7 | 4.0 |
Issues:
- [C] 7 Edge · `followups-later-day-1440.png`, y 224-255: the side chip row still says "All 4, Personal 1, Harborview 3…" although the tab is empty, so the counts contradict the empty message. Fix: count per tab, or hide the chips when the list is empty.
- [C] 1 Hierarchy · `followups-later-day-1440.png`: the empty message is 14px grey, 480px wide, above 500px of blank; two filter rows outweigh the message. Fix: hide filters on an empty list (rubric 2: filters hidden below about 12 items).
- [C] 4 Type · empty copy is a two-sentence explanation of the feature; one line would do.
- [nit] 8 Phone · `followups-later-day-390.png`: "By person / By project" pill and "Side: All" chip sit in one row with the pill's cream band cut at x=208, uneven.
- [nit] 9 Brand · same inbox glyph as three other pages; a brand moment would help.

## followups-waiting: Follow-ups, Waiting on them
Pictures opened: 2 of 5 (1440 day, 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.6 | 3.7 | 3.8 | 3.7 | 3.9 | 3.7 | 3.8 | 3.7 | 4.0 |
Issues:
- [C] 7 Edge · `followups-waiting-day-1440.png`, y 224-255: chip row shows counts "All 4 …" on an empty tab (same fault as Later). Fix as Later.
- [C] 1 Hierarchy · `followups-waiting-day-1440.png`: the page shows only a filter and a sentence; no primary or next step. Fix: hide filters when empty.
- [nit] 3 Space · empty block starts 60px below the chips on desktop, 40px on the phone; the glyph is not centred over the text column at 1440 (glyph x=836, text centre x=836, ok) but the tab underline for "Waiting on them" sits 1px under the rule.
- [nit] 9 Brand · as Later.

## followups-by-project: Follow-ups, by project
Pictures opened: 2 of 5 (1440 day, 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.4 | 3.5 | 3.4 | 3.6 | 3.8 | 3.6 | 3.6 | 3.5 | 4.0 |
Issues:
- [B] 4 Type · `followups-by-project-day-1440.png`, y 356-620: each group heading repeats the row below it ("Harborview Community Support Partnership Incorporated" then "Harborview Community Support Partnership Incorporated: not in a project"; same for Willowbrook). The 14-word names are shown in full in heading, row and panel title, three times. Fix: heading is the business, row says "Not in a project · 2 open".
- [C] 2 Layout · `followups-by-project-day-1440.png`: the detail panel (y 345-630) top sits 10px above the first row top (y=375) and ends 5px apart from the list; group headings (x=256) sit outside the card edge while rows start at x=309. "Your own to-dos" card has a different anatomy.
- [C] 5 Components · panel rows labelled "To-do" with an "Open" outline button each, while the list rows have no button; two row anatomies.
- [C] 8 Phone · `followups-by-project-day-390.png`: titles wrap to three lines ("Harborview Community Support Partnership Incorporated: not in a project"), cards 130px tall. Fix: clamp titles to two lines.
- [nit] 7 Edge · long-name stress is actually exercised here (good), but there is no 100+ case.

## followups-empty: Follow-ups, nobody has one yet
Pictures opened: 1 of 5 (1440 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.6 | 3.6 | 3.6 | 3.7 | 3.9 | 3.8 | 3.6 | 3.7 | 4.0 |
Issues:
- [C] 1 Hierarchy · `followups-empty-day-1440.png`: "Your own to-dos 8 to-dos of yours" card in full width at y=176-243 is the heaviest thing on the screen, above the empty message; and "How your messages start and end" is a bold disclosure under it with nothing to disclose yet. Fix: empty state first, hide the disclosure.
- [C] 4 Type · the empty text is four lines at 14px, 380px wide, and explains the model ("an owner who is not you"). Fix: one line: "Nothing to send. Follow-ups appear when someone owes you an answer."
- [nit] 6 Colour · glyph chip is cream on cream, 2.0:1; decorative, fine.
- [nit] 8 Phone · not opened; scored from the other Follow-ups phone pictures.
- [nit] 9 Brand · an empty state is where the brand voice belongs ("A little more room to think"); here it is a generic inbox icon.

## todos: To-dos
Pictures opened: 5 of 5 main... (1440 day, 390 day, 1440 night, filtered-to-nothing 1440; 390 night and 1024 not opened) 
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.4 | 3.8 | 3.7 | 3.7 | 3.8 | 3.9 | 3.6 | 3.7 | 4.2 |
Issues:
- [B] 2 Layout · `todos-day-1440.png`: the list card ends at x=1136 while the header button, tabs rule and side chips run to x=1416; 280px of dead gutter on the right of the list (the exact VP01 fault). Fix: list takes the full content width, or a rail sits there.
- [C] 2 Layout · `todos-day-1440.png`: two add actions (header "Add a to-do" filled, and the inline "Add a to-do…" row) and, at 8 items, three filter rows (State menu, side chips with counts, tabs). Rubric: filters hidden below about 12 items. Fix: drop the header button, hide filters under 12.
- [C] 4 Type · `todos-day-1440.png`, project pills: "Harborview Community Support Partnership Incorporated: not in a project" repeated on 5 of 8 rows in a tinted box; it is 13px and drowns the due date. Fix: show the business as a dot plus short name; "not in a project" is the default so omit it.
- [C] 5 Components · `todos-day-1440.png`: three more bare-text actions ("Give them dates" at y=946, "8 of these 8 to-dos need you" footer at y=995) and an amber "Due today" text-only status (colour plus a word, ok), no overdue group; the "…" is 14px wide with a 16px hit target (rubric VP13). The CJK title row is fine.
- [C] 2 Layout · `todos-day-1440.png`, y 750: the long row title is clamped at two lines and its meta wraps to two more lines (due date on one, project pill on another), so row heights are 65/105; rubric wants two row heights from tokens.
- [B] 8 Phone · `todos-day-390.png`, y 780-840: the tab bar crosses the list and hides "Book the van" row's meta and the next row's title (capture of full scrolled page; if real the list hides under the bar). Rows run 84-120px because the project pill wraps to three lines ("Harborview Community Support Partnership Incorporated: not in a project"). Header "Add a to-do" is a full filled button AND the tab bar has the centre add circle AND the inline row: three add actions at 390.
- [C] 8 Phone · `todos-day-390.png`: "State Any state" and "Side: All" chips push the list down 60px; rubric: one Filter sheet.
- [nit] 7 Edge · `todos-filtered-to-nothing-day-1440.png`: good (search glyph, one line, Clear filter), but the tab counts "To-dos 0" show a filtered count and the "All" chip count is gone; counts disagree between pictures.
- [nit] 9 Brand · burgundy primary and serif H1 right; night primary gold pill right.

## questions: Questions
Pictures opened: 2 of 5 (1440 day, 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.5 | 3.6 | 3.7 | 3.7 | 3.9 | 3.7 | 3.7 | 3.7 | 4.0 |
Issues:
- [C] 1 Hierarchy · `questions-day-1440.png`, y 80-260: header "Add a to-do" filled button, "8 open · 2 due today" (which counts the other tab: Questions is 0), a State menu and a chip row with counts "All 8 … Lantern Row Studio 4" all sit above an empty list. Counts on the chips contradict "No questions are open". Fix: counts per tab; hide filters on empty.
- [C] 5 Components · same page: a primary "Add a to-do" on the Questions tab is the wrong primary; the check glyph for the empty state reads as "done" not "no questions". Fix: "Ask a question" action, or none.
- [C] 8 Phone · `questions-day-390.png`: header, two filter chips, tabs eat 270px before the empty message; "Add a to-do" full button plus the tab bar's centre circle. Fix: one Filter sheet.
- [nit] 4 Type · the empty copy repeats the tab name. [nit] 9 Brand · as other empties.

## todos-many: To-dos, over a hundred
Pictures opened: 2 of 5 (1440 day and 390 day, both full page at 9,287 and 10,047 px; only legible as a shape)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.4 | 3.6 | 3.6 | 3.6 | 3.8 | 3.3 | 3.4 | 3.5 | 4.0 |
Issues:
- [B] 7 Edge · `todos-many-day-1440.png`, whole page: about 120 rows render as one 9,287px list with no paging, no "show more", no collapsed groups; "Coming up" alone is about 100 rows. The 99+ count rule is not shown either (counts show real numbers). Fix: cap each group at 10 to 15 rows with "Show 40 more", and cap tab counts at 99+.
- [C] 2 Layout · `todos-many-day-1440.png`: same 280px dead right gutter as `todos`; the header "Add a to-do" button is far from the list. The inline add row scrolls away; no sticky.
- [C] 1 Hierarchy · the "Today" group (the 17 rows due today) has no more emphasis than 100 later rows; the overdue/today group is not folded apart.
- [C] 8 Phone · `todos-many-day-390.png`: rows at 120-140px for multi-line titles; 10,047px page; the filters scroll away so there is no way back to them.
- [nit] 4 Type · mixed-script titles (Arabic, Cyrillic, CJK) render and align well: a good stress fixture, no clipping seen at this scale.

## stages: Stages
Pictures opened: 3 of 5 (1440 day, 390 day, 1440 night)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.3 | 3.4 | 3.7 | 3.4 | 3.5 | 3.8 | 3.4 | 3.6 | 3.5 | 3.9 |
Issues:
- [C] 1 Hierarchy · `stages-day-1440.png`: the only content is a five-line paragraph explaining what a stage is; the screen has no action (no way to add or start tracking). A first-run page that cannot be acted on. Fix: one line plus an action, or hide the nav item until an add-on provides stages.
- [C] 4 Type · `stages-day-1440.png`, y 245-325: a 14px, four-line, 380px-wide paragraph with "an add-on adds" wording. Fix: "Nothing is tracked in stages yet." plus one action.
- [C] 7 Edge · empty is the only state; no list state to judge, and the same inbox glyph appears here (reuse across 6 pages).
- [C] 2 Layout · `stages-day-1440.png`: 75% of the screen is empty; the message floats at x=836 with no relation to the title's x=256 edge.
- [nit] 3 Space · empty block starts 90px under the title at 1440 and 80px on the phone; consistent.
- [nit] 9 Brand · lowest of the set: a good place for a brand moment; plain here.

# Schedule

## schedule-day: Schedule, Day
Pictures opened: 4 of 5 main (1440 day, 390 day, 1440 night, 390 night; 1024 not opened) and none of the state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.5 | 3.4 | 3.6 | 3.7 | 3.7 | 3.5 | 3.5 | 3.5 | 4.1 |
Issues:
- [B] 1 Hierarchy · `schedule-day-day-1440.png`, y 340-1390: the page opens at 7 AM and the only events are at the very bottom (y 1400-1530); 1,050px of empty hours come first, so the thing that matters is below the fold on a 900px window. Fix: scroll to now or to the first event, or trim empty hours at the start and end.
- [B] 2 Layout / 4 Type · `schedule-day-day-1440.png`, x 257-313: hour labels ("10:00 AM", "11:00 AM", "12:00 PM") run edge to edge of the 65px gutter and touch the card border at x=257, and each label sits on its grid line (label baseline y=350 for the 7:00 line at 343) so the line strikes through the text height. Fix: right-align with 8px padding, centre the label over the line, or 12-hour short form ("7 AM").
- [C] 2 Layout · `schedule-day-day-1440.png`: the "3 at once · 9:46 PM" block is drawn as one box spanning 10:00-11:30 PM instead of three events at their times (9:46-10:16, 10:16-10:46, 11:00); the user cannot see where each begins or ends, and "3 at once" is wrong for back-to-back events. Fix: draw each event in its time slot, with the clash marker between them.
- [C] 3 Spacing · `schedule-day-day-1440.png`, y 150-260: four stacked control rows (date nav, view tabs, calendar filter chips with raw emails, then the grid), then the grid heading "Today · Tue, Nov 3" repeats the date shown at y=165. Fix: merge the nav and tabs, drop the repeat.
- [C] 5 Components · `schedule-day-day-1440.png`: calendar chips show the full address "Your calendar, avery.lane.home@example.com" (raw email) with a checkbox; chips are 35px tall against 34px buttons above, different radius from the tabs; the header "Add to schedule" is filled at 13px while the nav "Today" is outline. Fix: a short calendar name, dot colour.
- [C] 8 Phone · `schedule-day-day-390.png`: the calendar chip row scrolls sideways inside the page (second chip cut at x=374 "Your"), hour labels clip against the card edge at x=17 ("10:00 AM"), and the tab bar again crosses the grid in the full-page capture (y 780-845). "Add to schedule" is only a "…" menu on the phone (and the Add picture is not captured at 390: "can't be reached").
- [C] 7 Edge · no state pictures opened; day with no events at all, 0-1 events and an all-day event are not shown; "All day" row is empty and 28px tall.
- [nit] 6 Colour · `schedule-day-night-1440.png`: clash block is dark-brown with a pale-coral border, 3.5:1 boundary; the calendar colour dots are only 8px. The "now" line colour matches the clash colour, so "now" and "clash" look related.
- [nit] 9 Brand · burgundy primary, serif title; the cream canvas of the grid is a slightly different beige (#f7f3ee) from the page (#f5f3ee), good.

## schedule-work-week: Schedule, Work week
Pictures opened: 2 of 5 (1440 day, 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.5 | 3.4 | 3.5 | 3.7 | 3.7 | 3.4 | 3.8 | 3.5 | 4.1 |
Issues:
- [B] 1 Hierarchy · `schedule-work-week-day-1440.png`: the grid starts at 1:00 AM and runs to midnight (1,650px tall); the week's only content is a 1 AM "Quarterly review" at the top and the clash at 9:46 PM at the bottom, with 15 empty hours between. Neither fits one window; nothing says "now". Fix: default to working hours (for example 8 AM to 7 PM) with a "show all hours" link; scroll to now.
- [C] 2 Layout · `schedule-work-week-day-1440.png`, x 246-307: hour labels again fill the 62px gutter edge to edge ("10:00 AM", "11:00 AM" start at x=246, the card border) and sit on the grid lines.
- [C] 2 Layout · same picture: "3 at once · 9:46 PM" box is one card under 9:46 to 11:30 PM instead of three events in their slots; the 1 AM event card is 50px tall (an hour) with its meta truncated "avery.l…" (raw email in event text).
- [C] 5 Components · the calendar filter chips again carry raw email addresses and take a full row.
- [C] 8 Phone · `schedule-work-week-day-390.png`: the phone switches to an agenda list, which is the right call, but the tab bar crosses it (y 780-845, capture), "Clash · travel: you need 30 min to get from one place to the other" is a 15px bold sentence over a tinted block with a 3px red edge (good, state not colour alone), yet its meta lines wrap to three lines each with the raw "Your calendar, avery.lane@example.com". Fix: show only "Room 4".
- [C] 7 Edge · no state pictures; empty days shown as "Nothing on Monday" rows (OK, but 4 of 5 rows are empty, 44px each).
- [nit] 3 Space · date title "November 2 – November 6, 2026" on desktop but "Nov 2 – 6" on phone, fine.

## schedule-week: Schedule, Week
Pictures opened: 2 of 5 (1440 day, 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.5 | 3.4 | 3.5 | 3.6 | 3.7 | 3.3 | 3.8 | 3.5 | 4.1 |
Issues:
- [B] broken · `schedule-week-day-1440.png` and `schedule-week-day-390.png`: the "Weekdays" tab is the selected one, the title reads "November 2 – November 6" and the grid shows five days, so this picture is the work-week view, not a Week view (it is pixel-identical to `schedule-work-week-day-1440.png`). Either the Week tab does not switch views in this capture or the screen is not built. Score is therefore the work-week score; the real Week view (seven days) is not evidenced.
- [C] 7 Edge · as work-week; no weekend, no all-day event, no overlapping events within one day shown for a seven-day grid.
- [C] 1/2/3/4/5 · same faults as `schedule-work-week` (empty early hours, hour labels touching the card border, "3 at once" merged block, raw emails in chips).
- [nit] 6 Colour · today column tint (#f7f3ee) vs white cells is 1.04:1; "today" is marked also by the header word, so colour is not alone.

## schedule-month: Schedule, Month
Pictures opened: 2 of 5 (1440 day, 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.8 | 3.7 | 3.6 | 3.8 | 3.7 | 3.6 | 3.8 | 3.7 | 4.2 |
Issues:
- [C] 4 Type · `schedule-month-day-1440.png`, y 430-515: event chips are truncated to "9:46 PM Venue …", "10:16 PM Budge…", "11:00 PM Suppli…": the time takes the width and the title is lost, so the person cannot tell what is on the day. Fix: title first, time as meta or hidden in the cell; "+N more" past two events.
- [C] 1 Hierarchy · the clash that the page subtitle names elsewhere ("1 clash, on Tuesday") is not marked on 3 Nov; only the burgundy today disc is. Fix: a clash glyph in the cell. Today's burgundy disc is also the brand colour (state versus brand).
- [C] 2 Layout · `schedule-month-day-1440.png`: month title row "November 2026" has no subtitle (the clash line is gone), so the title block shifts 20px against Day view; calendar chips still carry raw emails; the grid ends at y=940 and the window below is blank (fine).
- [C] 3 Spacing · day numbers sit at x=270, 437, 603 (left padding 13px) but today's disc sits at x=446, so numbers do not share an edge in that row; outside-month days (26-31, 1-6) are the same weight at 3:1 contrast.
- [C] 8 Phone · `schedule-month-day-390.png`: dots and a count pill "(3)" under 3 Nov are 8px dots and a 16px pill, under the 24/44 hit-target rule; there is no way to see what is on a day (no sheet or list under the grid). Fix: tapping a day lists its events below.
- [nit] 7 Edge · no state pictures, no 4+ events per day, no multi-day events.
- [nit] 9 Brand · burgundy today disc is right; it competes with the filled "Add to schedule".

## schedule-timeline: Schedule, Timeline
Pictures opened: 2 of 5 (1440 day, 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.3 | 3.4 | 3.5 | 3.4 | 3.5 | 3.4 | 3.4 | 3.8 | 3.5 | 3.9 |
Issues:
- [B] 1 Hierarchy · `schedule-timeline-day-1440.png`, y 255-400: the chart is a 145px strip of unlabelled blue dots (four stacked at x=454 and two more), and the legend (seven entries) plus the hint line are bigger than the data. The person cannot tell which dot is which event without hovering. Fix: label each dot, or switch to the agenda list that the phone uses.
- [B] 6 Colour · `schedule-timeline-day-1440.png`: the legend's "Calendar entry" is a burgundy dot but the chart's dots are blue-grey, so the legend does not match the chart; "Overdue" and "Done" are 14px icon-in-box symbols nowhere in the chart. At phone the dots become burgundy (`schedule-timeline-day-390.png`), so the colour of a calendar entry changes with the width.
- [C] 2 Layout · `schedule-timeline-day-1440.png`: a 10-week range with 6 events: the hatched "days off" bands (about 10 stripes) dominate the visual weight over events; the left lane label column is 175px wide for the single lane "Personal"; 500px blank under the legend.
- [C] 4 Type · hint line "Move over an item, or tab to it, to see its details here. Press Enter to open it." is instruction text on the page (rubric: tooltip, not paragraph); the legend is 13px grey and unusually wide.
- [C] 5 Components · the range control "2 weeks / 10 weeks / A quarter" is a second pill group on the same row as the view tabs, with the active state in a different white pill, so two tab rows read as one.
- [C] 8 Phone · `schedule-timeline-day-390.png`: the phone view is well adapted (weekly groups, a row per event); the legend (seven items in 3 wrapping rows, y 650-735) is dense and below 4.5:1 in places; titles at 15px, good.
- [nit] 7 Edge · no state pictures; no empty range, no lane with 50 events.
- [nit] 9 Brand · timeline today marker (burgundy) is the right accent; the rest is neutral.

## schedule-add: Schedule, Add to schedule
Pictures opened: 2 of 4 (1440 day, 1440 night; 1024 not opened; no 390 picture exists: not captured, "can't be reached: the Schedule has no Add to schedule button" at 390)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.4 | 3.5 | 3.7 | 3.6 | 3.8 | 3.5 | 2.8 | 3.5 | 4.0 |
Issues:
- [B] 8 Phone · not captured at 390: the brief for this inventory says the Schedule has no Add to schedule button on the phone, so the add form is unreachable there, and the "…" menu in the phone header offers nothing visible. A screen the person cannot reach on a phone cannot score above 3. Fix: make Add reachable (the tab bar's centre circle should open it on Schedule) and capture it.
- [C] 2 Layout · `schedule-add-day-1440.png`: the panel is pinned flush to the top-right corner (x 960-1440, y 0-385), covering the header (the status chips are cut: "Restart…") with only a dimmed scrim, and no left or top gap; "Starts at" (x=977) and "Ends at" (x=1205) do not share edges with "Day" (x=1237) and "Repeats" (x=1205), so three columns are visible in a two-column form. Fix: one two-column grid; make it a drawer full height or a centred dialog.
- [C] 3 Spacing · same picture: label to field gaps are 8px, but the hint "Give a start time first." sits 8px under the start field and pushes the Place row 20px lower on the left than on the right; the footer buttons sit flush to the panel edge (Add ends at x=1423, 17px from the edge).
- [C] 5 Components · `schedule-add-day-1440.png`: "Ends at" is shown as a greyed dropdown prefilled with "9:30 AM" (same as start) while disabled; Add is a cream disabled pill that reads as secondary beside Cancel; the "Day" input uses a date-picker glyph while times use a select. Fix: leave unset times empty ("Add a time"), keep Add visibly primary-disabled.
- [C] 7 Edge · no error, no clash warning, no long-title state.
- [nit] 1 Hierarchy · "What" label required but not marked as such, while the other fields say "(optional)"; good rule, but "What" has no hint.
- [nit] 6 Colour · `schedule-add-night-1440.png`: focus ring is gold (3:1 on the field), good; the scrim barely dims the night page, so the panel edge is only the hairline.
- [nit] 9 Brand · gold focus by night, burgundy by day, right.

## schedule-entry: Schedule, an entry opened
Pictures opened: 2 of 4 (1440 day, 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.5 | 3.6 | 3.6 | 3.5 | 3.7 | 3.5 | 3.7 | 3.6 | 4.0 |
Issues:
- [C] 1 Hierarchy · `schedule-entry-day-1440.png`: the rail card for "Quarterly review" has a filled burgundy "Open" with no object and a line "Change it in your calendar app." right under it, so the person cannot tell whether Open opens the calendar app or this page. Fix: "Open in your calendar" and drop the line.
- [C] 2 Layout · `schedule-entry-day-1440.png`: the grid is squeezed to 680px so the Tuesday header wraps ("Today · Tue, Nov / 3"), the clash block truncates ("Venue walk-t…", "Budget check…") and the 1 AM event card shows "1:00 AM · Your c…"; the rail ends at y=548 while the grid runs to y=1915. Fix: put the rail below 1100px or overlay.
- [C] 5 Components · `schedule-entry-day-390.png`: the sheet has two ways out (× at top right and a full-width outline "Back to the calendar"), the calendar dot sits alone on its own line above the address (y=698), and the "Open" button is a third, smaller primary below. The sheet title is 17px sans, not the serif, which is fine.
- [C] 4 Type · `schedule-entry-day-390.png`: the sheet's content fits (When/Where/Calendar), but the raw address "Your calendar, avery.lane@example.com" is shown under "Calendar" instead of a short name.
- [nit] 6 Colour · the selected event keeps a burgundy outline on the cream fill at `schedule-entry-day-1440.png` (x 677-797, y 345-393), a 2px ring, good; clash colour red and brand burgundy are close in hue on the same screen (the selected outline against the clash box).
- [nit] 7 Edge · no state pictures; no long title or many attendees.
- [nit] 9 Brand · fine; consistent with other pages.


## Summary
| Screen | Overall | Lowest point | Brand | Passes 4.0 / no point under 3.5 / brand >=4.0 | Passes 4.6 / no point under 4.3 / brand >=4.5 |
|---|---|---|---|---|---|
| today | 3.6 | 3.2 | 4.2 | no | no |
| today-review | 3.5 | 3.0 | 4.1 | no | no |
| since-yesterday | 3.7 | 3.6 | 4.1 | no | no |
| what-changed | 3.5 | 3.3 | 4.1 | no | no |
| handled-for-you | 3.5 | 3.4 | 4.0 | no | no |
| followups | 3.7 | 3.6 | 4.2 | no | no |
| followups-later | 3.7 | 3.6 | 4.0 | no | no |
| followups-waiting | 3.7 | 3.6 | 4.0 | no | no |
| followups-by-project | 3.5 | 3.4 | 4.0 | no | no |
| followups-empty | 3.7 | 3.6 | 4.0 | no | no |
| todos | 3.7 | 3.4 | 4.2 | no | no |
| questions | 3.7 | 3.5 | 4.0 | no | no |
| todos-many | 3.5 | 3.3 | 4.0 | no | no |
| stages | 3.5 | 3.3 | 3.9 | no | no |
| schedule-day | 3.5 | 3.4 | 4.1 | no | no |
| schedule-work-week | 3.5 | 3.4 | 4.1 | no | no |
| schedule-week | 3.5 | 3.3 | 4.1 | no | no |
| schedule-month | 3.7 | 3.6 | 4.2 | no | no |
| schedule-timeline | 3.5 | 3.3 | 3.9 | no | no |
| schedule-add | 3.5 | 2.8 | 4.0 | no | no |
| schedule-entry | 3.6 | 3.5 | 4.0 | no | no |

Screens scored: 21. Pass 4.0: 0. Pass 4.6: 0. No screen reaches 4.6.

Notes for the reader: pictures were opened for 1440 day, 390 day and usually 1440 night per screen, plus a sample of states (loading, couldn't load, offline, filtered to nothing) for Today, Since yesterday, What changed and Follow-ups; 1024 pictures were opened only for Today. Point 7 for most screens therefore rests on the main pictures. Where a 390 full-page picture shows the tab bar across the middle of the list (Today, What changed, To-dos, Schedule, Day), I counted it as a capture of the fixed bar on a full-page render but still deducted from Phone because bottom padding and hidden rows cannot be verified.

Top ten fixes, in order of score gained:
1. Make the Schedule time grids useful: start at working hours or scroll to now, draw each event in its own slot (no merged "3 at once" box), pad the hour labels off the card edge (Day, Weekdays, Week, Entry; four screens, about +0.3 each).
2. Replace raw email addresses and "Your calendar, avery.lane@example.com" with short names everywhere (Schedule chips, Today conflict rows, entry detail, phone agenda).
3. Give list pages one content grid: To-dos and To-dos many list ends at x=1136 against controls at 1416; Follow-ups panel and list end at different heights (VP01).
4. Hide filter rows below about 12 items and use a single Filter sheet on the phone (To-dos, Questions, Follow-ups, Handled for you).
5. Fix the phone shell: reserve bottom padding equal to the tab bar and stack conflict rows' calendar chips (Today 390 "an / d" fragments); one add action only.
6. Cap long lists (To-dos over a hundred: 9,287 px page) with group limits, "Show more" and 99+ counts.
7. Make the Week picture the real Week view (it shows Weekdays today) and add state pictures for Schedule's other views.
8. Remove internal wording and duplicate meta on rows: "cockpit" in What changed detail; the repeated "Handed in ... Reginald is on it" line; project pills ending ": not in a project".
9. One status pattern (dot plus word) and one secondary style; stop tinted pills, bare text actions and underlined links mixing on Today, What changed, To-dos.
10. Empty and first-run states: replace the single inbox glyph and four-line explanations with one line plus an action in the brand voice (Stages, Questions, Follow-ups empty tabs, Since yesterday); stop showing counts and chips on empty lists.

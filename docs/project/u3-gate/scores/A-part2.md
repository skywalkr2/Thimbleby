# Scorer A, part 2

Method note: for each screen I opened the 1440 day, 390 day and 1440 night pictures (the 1440 day and 390 day were viewed side by side in one composite image, the 1440 night alone). For each state row I opened the 1440 day and 390 day pictures side by side in one composite. 1024 and 390 night pictures were not opened unless said.

## projects: Projects
Pictures opened: 3 main + 6 state (loading, couldn't load, offline at 1440 day and 390 day) of 22 listed
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.3 | 2.7 | 3.3 | 3.4 | 3.2 | 3.8 | 3.0 | 2.3 | 3.1 | 4.0 |
Issues:
- [B] 8 Phone · `projects-day-390.png`, the project list card (y 150-720): the table keeps its desktop columns, so only the frozen first column shows (about 110px wide) and the other columns are cut off behind it. Names wrap to five or six lines ("Harborview / Community / Support / Partnership / Incorpora…") and the right 60% of the card is empty. Fix: below 600px render each project as a stacked row (name full width, then one meta line with status and open counts), not a scrolling table.
- [B] 8 Phone · `projects-day-390.png`, y 780-845: the tab bar sits on top of the "Views" heading and its "Add view" button, so both are half hidden. Fix: pad the page bottom by the tab bar height plus the safe area.
- [B] 2 Layout · `projects-day-1440.png`, table header and rows (y 170-395): the columns Status, Stage, Target, Last updated, Group, Owner, Open to-dos, Open questions have no values in any row, so the whole right 60% of the card is blank under eight headers. Fix: hide columns that are empty for every row, or show the values; at 5 rows drop the column headers and show a plain list.
- [B] 1 Hier / 5 Comp · `projects-day-1440.png`, the footer line "0 projects" under a list of five projects, and "· 0" after every name. Both are wrong or cryptic (what is 0?). Fix: count the rows, and label the number ("0 open") or drop it when zero.
- [C] 5 Comp · `projects-day-1440.png`, y 226-374: all five names are burgundy and underlined, so the list reads as five loud links and the primary "Add a project" has to compete. Fix: ink text, underline only on hover; keep burgundy for the one primary.
- [C] 4 Type · `projects-day-1440.png`, y 490-510: a two-line help paragraph under "Views" restates what the empty state below says. Fix: drop the paragraph, or drop the empty state text, not both.
- [C] 1 Hier · `projects-day-1440.png`, y 436-670: the Views section (heading, button, help text, empty state with an icon) takes more room than the project list and is the empty part of the page. Fix: fold Views into a single quiet line with "Add view" until a first view exists.
- [C] 7 Edge · `projects-couldn-t-load-day-1440.png`: the "Couldn't load" state shows the banner "You're offline. The app can't reach its server" over grey skeleton rows, with no page title. A load failure is not an offline state, and the skeleton never resolves. Fix: show the title, a one-line error ("Projects didn't load") and a Try again button in place of the skeleton.
- [C] 7 Edge · `projects-loading-day-1440.png`: skeleton rows are 3 two-line rows with a pill at the right, but the real page is a table with a title and button, so the layout shifts on load. No page title. Fix: render the title and the Add button during loading; make the skeleton match the real row.
- [C] 7 Edge · `projects-offline-day-390.png`: the offline banner is about 140px tall at 390 and pushes the title down; the page body is otherwise the broken table above. Fix: shorten the message (the time stays in the header chip).
- [nit] 6 Colour · `projects-offline-day-1440.png`, header chip "Disconnected · reconnecting" is red text on pale red with a dot: fine, but the same chip in `projects-day-1440.png` ("Backup needed") is brown on cream; two near-identical pill styles beside a plain "Reginald" dot. Fix: one status pattern for all three.
- [nit] 3 Space · `projects-day-1440.png`: the gap between the title and the card (30px) is more than the gap between the card and "Views" (40px reads as the same group). Fix: one section gap.

## project-page: A project's page
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.1 | 3.2 | 3.3 | 3.3 | 3.8 | 3.1 | 3.3 | 3.3 | 4.0 |
Issues:
- [B] 7 Edge · `project-page-day-1440.png`, y 410-860: three empty states stacked (an inbox icon with "No projects here yet.", then "Reginald doesn't know anything here yet", with an icon each) and a "What Reginald knows" block. About 60% of the page is empty-state furniture. No state pictures exist for this screen. Fix: one line of quiet text per empty section, no icon, no 100px blocks; hide "Projects" and the knowledge block when they are empty.
- [C] 1 Hier · `project-page-day-1440.png`, y 80-130: the heading "Open with Harborview Community Support Partnership Incorporated" repeats the page title (long name twice) and is as big as "Activity". Fix: "Open to-dos" with the count.
- [C] 2 Layout · `project-page-day-1440.png`: the right "People" card (x 735-983) ends at y 163 while the left column runs to y 860, so the right rail is a floating stub; left blocks end at x 717, the knowledge field at x 717, but the empty-state text is centred on a different axis (x 447). Fix: put the People card under the main column at 1024 and below, and align empty-state text to the left edge.
- [C] 5 Comp · `project-page-day-1440.png`, y 140-230: to-do rows have a left indent of 36px with no checkbox shown (blank space where a control or icon should be), and a "To-do" tag on every row. Fix: show the tick control, or remove the indent; drop the tag when every row is a to-do.
- [C] 4 Type · `project-page-day-1440.png`, y 618-650 and 840-860: help paragraphs ("Who reads it: Read by Stand-in account. What it reads is sent away from this computer to reach it.") are 13px muted and say a thing a person doesn't act on. "Stand-in account" looks like an internal name. Fix: fold it behind "What Reginald knows" as one muted line with an info tooltip.
- [C] 8 Phone · `project-page-day-390.png`: the title takes three lines at 28px and "Edit details" is a separate pill below it; the knowledge box and the People card are at the very bottom after two empty states, so the one fact (the person) is 1400px down. Fix: put People in the meta line under the title; shrink the title to two lines with truncation.
- [C] 8 Phone · `project-page-day-390.png`, y 780-845: the tab bar covers the "Projects" heading and the top of its empty state in the captured page (fixed bar over scrolled capture); check bottom padding.
- [nit] 3 Space · `project-page-day-1440.png`: Back link at 13px sits 10px above the title with a 24px gap under the title only 12px (y 107-123); inconsistent.
- [nit] 6 Colour · `project-page-night-1440.png`: card hairlines at 1.1:1 against canvas are the only separation of the to-do list; the card does not lift.

## side-page: A business's page, with a long name
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 2.5 | 2.5 | 3.0 | 3.2 | 3.0 | 3.8 | 2.5 | 3.5 | 3.0 | 3.8 |
Issues:
- [B] broken · `side-page-day-1440.png`, `side-page-day-390.png`, `side-page-night-1440.png`: the picture shows the "Not here / Project" page that says "This page isn't here any more", not a business page with a long name. The capture is a duplicate of the missing page, so the long-name case is not visible. Fix: capture the right route; as shown, scored as the missing-page screen.
- [B] 1 Hier · `side-page-day-1440.png`, y 150-215: a missing page has no way forward: only "Back" at the top, and the body is a warning icon with 13px text, left to float 60px from the title. Fix: add a primary "Go to Projects" button under the message.
- [C] 5 Comp · `side-page-day-1440.png`, y 94: "Not here" is the page title with a "Project" tag beside it; "Not here" reads as an internal label. Fix: "This page is gone" as the heading, drop the tag.
- [C] 2 Layout · `side-page-day-1440.png`: the message is centred at x 580 in a content column that starts at x 178, so it shares no edge with the title above. Fix: left-align under the title or centre both.
- [nit] 4 Type · the message is 12-13px muted text in a 270px measure.

## project-missing: A page that no longer exists
Pictures opened: 2 of 5 listed (1440 day, 390 day). 1440 night not opened for this id; `side-page-night-1440.png`, which shows the same missing-page layout, was opened and night colour is judged from it.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 2.6 | 2.6 | 3.0 | 3.2 | 3.0 | 3.8 | 2.8 | 3.5 | 3.1 | 3.8 |
Issues:
- [B] 1 Hier · `project-missing-day-1440.png`, y 150-215: no way forward. Only the small "Back" link at the top; the body is a warning icon and 13px muted text. Fix: a primary "Go to Projects" button under the message.
- [C] 5 Comp · `project-missing-day-1440.png`, y 94: the title is "Not here" with a "Project" tag beside it; it reads as an internal label. Fix: "This page is gone" as the heading and drop the tag. The warning triangle in burgundy-tint is the same icon used for errors, so a removed page looks like a fault.
- [C] 2 Layout · `project-missing-day-1440.png`: the message is centred at x 580 while the title and Back sit at x 178, so nothing shares an edge. Fix: left-align under the title.
- [C] 7 Edge · no state pictures; this screen is itself an edge state, but offers no recovery (search, recent projects). Fix: add "Go to Projects".
- [nit] 4 Type · 13px message in a 270px measure at 1440; it is 17px at 390, so the desktop text is smaller than the phone text.

## people: People
Pictures opened: 3 main + 6 state (loading, couldn't load, offline at 1440 day and 390 day) of 22 listed
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.3 | 3.5 | 3.5 | 3.4 | 3.9 | 3.8 | 3.4 | 3.5 | 4.1 |
Issues:
- [C] 2 Layout · `people-day-1440.png`, header (y 95-170): three filter layers stacked before any data: a tab strip of five names, an "Organization" label with a dropdown, and the table. At 4 people and 4 organizations filters add nothing (rubric: hide filters below about 12). The tab strip and the dropdown filter the same thing. Fix: show filters only above a row threshold; keep one of the two.
- [C] 2 Layout · `people-day-1440.png`, y 220-385: columns "Who they are", "How to reach", "Last contact" are empty for three of four rows, "Last contact" for all four, "Also called" empty for all organizations. Fix: hide fully empty columns; show "Add a role" only on hover.
- [C] 5 Comp · `people-day-1440.png`: "Bartholomew Featherstonehaugh-Winterbottom" wraps to two lines and the row grows, while Avery Lane's "You" tag is a boxed pill in a style used nowhere else (outline box, not a pill). Fix: use the pill style; truncate with a tooltip, or give the name column more width.
- [C] 8 Phone · `people-day-390.png`: rows become label/value pairs on separate lines ("Open items:" then "8" on the next line) with the "..." menu on its own line below, so each person is 130-180px tall and the 4-person list takes 700px. Labels are muted 17px, the same size as values. Fix: one meta line ("8 open · Printer · email") and the menu at the row's right edge.
- [C] 8 Phone · `people-day-390.png`, y 780-845: tab bar covers the "Organizations" heading and "Add an organization" button in the page capture. Check bottom padding.
- [C] 1 Hier · `people-day-1440.png`: the Organizations section has its own table, header and primary-looking button, which competes with People on the same page. Fix: collapse Organizations to a link row until asked.
- [C] 7 Edge · `people-couldn-t-load-day-1440.png`: two banners at once, the global offline banner and a local "The people couldn't be loaded" with Try again, and the Organizations half shows "No organizations yet" as if empty, which is false (it failed too). Fix: show one banner; do not render the empty state for a section whose load failed.
- [C] 7 Edge · `people-loading-day-1440.png`: skeleton rows are two-line with a pill at right but the real rows are single-line cells; the Organization filter dropdown is absent so the page shifts when it loads. Fix: match skeleton to the row height (about 34px).
- [nit] 6 Colour · `people-offline-day-1440.png`, header chip "Disconnected · reconnecting" is red text on a pale tint, thin at 12px; make the weight 600.
- [nit] 3 Space · `people-day-1440.png`: "4 people" footer text (y 400) is 11px and sits 10px under the table; mid-gap between sections is 25px but 40px elsewhere.

## person-page: A person's page
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.6 | 3.7 | 3.7 | 3.6 | 4.0 | 3.8 | 3.7 | 3.8 | 4.3 |
Issues:
- [C] 1 Hier · `person-page-day-1440.png`, y 190-310: the main column on a person with 0 items is a 120px empty-state block ("Nothing with Pat yet" plus a button that repeats the primary "Add a to-do for Pat" at top right). Two identical actions in one viewport. Fix: drop the empty state's button, or fold the Overview tab when it has nothing.
- [C] 2 Layout · `person-page-day-1440.png`: the right card (x 735-983) starts at y 123, top-aligned with the tab strip rather than the title, and the left column ends at y 440 while the right ends at y 508; Activity is left of an empty-looking gap. Fix: align the card top with the tab strip content and end both columns together, or drop the rail below 1100px.
- [C] 5 Comp · `person-page-day-1440.png`, right card y 180-290: "Remove", "Add another email" and "Add phone" are three different quiet links at 11px indented 105px from the label, with no consistent edge; the "Role" value "Printer" repeats the subtitle under the title. Fix: put actions at the row's right edge, in the accent text style, and show the role once.
- [C] 4 Type · `person-page-day-1440.png`: the card's labels, values and the help text are 11-12px, under the 13px meta floor; "Reginald sees this and what you said before. Changes it suggests come back for you to keep or drop." is a standing help paragraph. Fix: 13px meta; move the help text to a tooltip on the field.
- [C] 8 Phone · `person-page-day-390.png`, y 780-845: the tab bar covers the Phone/Role part of the details card and "Time away" heading in the captured page. Fix: bottom padding.
- [C] 8 Phone · `person-page-day-390.png`: on the phone the details card (email, phone, time away, Ask) is under the empty state and Activity is below it again; the facts a person wants (email, phone) sit 540px down. Fix: put a one-line contact row under the title with tap-to-call/email.
- [nit] 6 Colour · `person-page-night-1440.png`: cards separate from the canvas by hairline only; "Person" tag is dim.
- [nit] 3 Space · `person-page-day-1440.png`: breadcrumb to title 12px, title to subtitle 6px, subtitle to tabs 20px; unequal.

## person-long-name: A person's page, with a very long name
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.5 | 3.6 | 3.6 | 3.5 | 4.0 | 3.8 | 3.6 | 3.7 | 4.3 |
Issues:
- [C] 8 Phone · `person-long-name-day-390.png`, y 80-290: the name is broken across three lines at 30px ("Bartholomew / Featherstonehaugh- / Winterbottom"), the breadcrumb repeats the whole name on a second line, and the "Person" tag drops under it, so the page header uses 230px before the primary button. Fix: the breadcrumb ends in "People" only; clamp the title to two lines (24px at 390) and put the tag in the meta line.
- [C] 5 Comp · `person-long-name-day-390.png`, y 250-300: the primary button reads "Add a to-do for Bartholomew" and the tab reads "Open with Bartholomew", so the first name is used in six places on one page, and the tab strip ("Open with Bartholomew 0   Activity") nearly overflows the right edge (Activity ends at x 1362 of 1390). Fix: "Add a to-do" and "Open items" without the name.
- [C] 2 Layout · `person-long-name-day-1440.png`: the title runs to x 643 and the primary button starts at x 775, only 130px apart; at a longer name the button would wrap. The right card top (y 108) sits 14px above the tab strip, which differs from the person-page screen (123). Fix: pin the card top to one value on both pages.
- [C] 7 Edge · `person-long-name-day-1440.png`: the long name fits at 1440 because the title is kept on one line at 26px, but it shows twice more (breadcrumb, Activity line "You added Bartholomew Featherstonehaugh-Winterbottom"); the page repeats the long string four times. Fix: first name or initials in secondary places.
- [nit] 4 Type · the 390 empty-state text wraps with an orphan "Winterbottom show up here."
- [nit] 6 Colour · `person-long-name-night-1440.png` as person-page.

## person-new: A person's page, with nothing yet
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); this screen is itself the empty state
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.5 | 3.6 | 3.6 | 3.5 | 4.0 | 3.4 | 3.5 | 3.6 | 4.2 |
Issues:
- [C] 7 Edge · `person-new-day-1440.png`, y 170-300: the empty state is a check-mark icon, "Nothing with Robin yet" and a second "Add a to-do for Robin" button, directly under the identical primary at the top right (y 87). A check mark is the symbol for done; for "nothing yet" it reads as success. Fix: remove the duplicate button, use a plain muted line with the first useful step ("Add Robin's email or a first to-do").
- [C] 1 Hier · `person-new-day-1440.png`: three "Add ..." prompts compete with no hierarchy: "Add a to-do for Robin" (filled), "Add email", "Add phone", "Add time away" (all quiet, same weight). Fix: keep one filled primary; make the three in the card a single "Add contact details" link.
- [C] 5 Comp · `person-new-day-1440.png`, card y 180-210: "Add email" and "Add phone" are bold 11px text with no underline, no icon and no outline; they read as values, not actions. Fix: the accent-text style with a plus.
- [C] 8 Phone · `person-new-day-390.png`: 'Open with Robin 0' tab, empty state, then the card: Overview is a 300px empty block before anything useful; the tab bar hides "Time away" text in the capture. Fix: collapse the empty state to one line on the phone.
- [C] 4 Type · `person-new-day-1440.png`: 11px label/value text in the card (Email, Phone) and 11px help text under "Ask about Robin".
- [nit] 3 Space · empty block y 170-310 is 120px high while "Activity" follows at y 348: gap 38px vs 24px above.

## person-missing: A person's page that no longer exists
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.5 | 3.6 | 3.5 | 3.7 | 3.9 | 3.8 | 3.9 | 3.7 | 3.9 |
Issues:
- [C] 2 Layout · `person-missing-day-1440.png`, y 90-200: the block is centred in a 840px column starting at the top (y 90), with the main area empty below (y 200-625). Sidebar active state is none, and there is no breadcrumb or Back, so the person only has the one button. Fix: add the same breadcrumb ("People") as the other person pages, and left-align with the page edge.
- [C] 4 Type · `person-missing-day-1440.png`: "There is no one at this address" uses a web term (address) for a person; the 13px muted text is under the 15px row size. Fix: "This person was removed, or the link is old."
- [C] 5 Comp · `person-missing-day-1440.png`: the warning triangle, used for errors, stands for a removed record; it implies a fault. Fix: a neutral icon.
- [C] 1 Hier · `person-missing-day-1440.png`: heading is 14px bold, below a normal section title, with no page title (compare `project-missing-day-1440.png`, which has a title and lacks the button). The two missing screens do not match. Fix: one missing-page component: title, one line, one primary button.
- [nit] 6 Colour · `person-missing-night-1440.png`: icon tile barely lifts off the canvas.

## person-add: Add a person
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.3 | 3.3 | 3.4 | 3.3 | 3.4 | 3.7 | 3.3 | 3.6 | 3.4 | 3.8 |
Issues:
- [B] 1 Hier · `person-add-day-1440.png`, the form (y 50-580): eleven-plus fields with equal weight. Full name is the only required one, but First name, Other names, a five-checkbox "Where they belong" group, "Who they are to you" and Email are all open on the first screen. Fix: ask Full name, then "Where they belong" and Email; put First name, Other names and the role behind "More details".
- [C] 5 Comp · `person-add-day-1440.png`, footer (y 604): the primary "Add a person" is disabled and renders as pale cream with burgundy text at about 2:1, so it looks like a secondary and is hard to read; the reason "Add a name first." sits to its right as 11px text. Fix: show disabled as the primary shape in a lowered opacity with the reason above the button or as helper text under Full name.
- [C] 4 Type · `person-add-day-1440.png`: help text under fields is 11px and sits on the field's own line ("(nicknames or spellings people use, separated by commas)", with brackets). Three of them. Fix: 13px muted, no brackets; or placeholders inside the fields.
- [C] 5 Comp · `person-add-day-1440.png`, y 295-430: the checkbox labels are bold 11px and wrap on two lines for three of five organizations, the group has no border or grouping. The first option "Personal" is ticked while the others are not and the legend reads as an instruction paragraph. Fix: regular weight, 13px, and a single bordered group.
- [C] 3 Space · `person-add-day-1440.png`: label to field 6px, field to hint 8px, hint to next label 20px but "Email" label sits 24px under its previous hint; unequal.
- [C] 8 Phone · `person-add-day-390.png`: the bottom sheet is fine (handle, close, footer pinned) but the form is 1000px+ long (the footer cuts "Who they are to you" at y 785) and the footer's helper text "Add a name first." wraps beside the buttons. Fix: sheet at full height; reason text above the buttons.
- [C] 2 Layout · `person-add-day-1440.png`: the drawer is only 330px wide with 11px text on a 1440 window, leaving 55% of the screen as a dim copy of People; the title "Add a person" is small (13px) and not serif, so it has no hierarchy over labels. Fix: title 20px, drawer 420px.
- [nit] 6 Colour · `person-add-night-1440.png`: focused Full name field has a gold 2px outline, fine; the checked box is gold on dark, fine; the disabled primary reads as an active secondary.

## person-edit: A person's page, Edit
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.0 | 3.3 | 3.4 | 3.3 | 3.0 | 3.7 | 2.8 | 3.4 | 3.2 | 3.8 |
Issues:
- [B] broken · `person-edit-day-1440.png`, `person-edit-day-390.png`: the form is not filled from the person. "Who they are to you" is empty although the page behind shows "Printer", and every box under "Where they belong" is unticked, so Save is disabled with "Choose where they belong first." on a person who already exists. Fix: load role and belonging from the record; a person edit must open ready to save.
- [B] 7 Edge · `person-edit-day-1440.png`, footer: because of the above, the person cannot save without re-choosing where Pat belongs. Fix: as above, and never block Save on a field the record already holds.
- [B] 1 Hier · `person-edit-day-1440.png`: same long form as Add, with equal weight on every field (see person-add). Fix: same.
- [C] 5 Comp · `person-edit-day-1440.png`, y 595-615: Save is a pale cream pill with burgundy text (disabled), the Cancel is outline, so they look like two secondaries. Fix: as person-add.
- [C] 4 Type · `person-edit-day-1440.png`: 11px labels and hints; title "Edit person" is 13px bold (no step above labels). Fix: 20px title.
- [C] 8 Phone · `person-edit-day-390.png`: footer helper "Choose where they belong first." is 17px and takes the space of the Save button; Cancel and Save are the sheet's bottom edge, but the sheet shows only 60% of the form without a scroll cue. Fix: sheet with a divider shadow when content continues.
- [nit] 6 Colour · `person-edit-night-1440.png`: tick boxes' borders at 2.2:1.

## organization-page: An organization's page
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.2 | 3.4 | 3.5 | 3.4 | 3.9 | 3.2 | 3.4 | 3.4 | 4.1 |
Issues:
- [C] 1 Hier · `organization-page-day-1440.png`, y 160-320: the page has no purpose beyond a note and an activity line: "Activity" with the single line "You added Featherstonehaugh, Winterbottom and Ashcombe Printing and Bindery Limited" is the largest element. The person who comes here wants the people, open items and contact; none are shown (not even "0 people"). Fix: a summary row (people, open items) under the title; Activity folded after it.
- [C] 2 Layout · `organization-page-day-1440.png`: the right card "Notes / Prints and binds small runs." starts at y 158 aligned with the Activity heading and ends at y 207; the left column ends at y 320; the card content (label at x 745, value at x 833) uses a two-column label grid in a 250px card for one line. Fix: put the note as a line of muted text under the title.
- [C] 7 Edge · `organization-page-day-1440.png`: no empty states shown for what a business page would hold (people, items). The page omits sections instead of showing "No one yet", so it is unclear what can be added. Fix: show People and Open items sections with a designed empty state.
- [C] 8 Phone · `organization-page-day-390.png`, y 100-310: the 30px title takes four lines ("Featherstonehaugh, / Winterbottom and / Ashcombe Printing and / Bindery Limited"), 120px, then the Organization tag and the Edit details button each on their own line, so Activity starts at y 340 of 844. Fix: title at 22px, two-line clamp, Edit details in a "..." menu on the title row.
- [C] 5 Comp · `organization-page-day-390.png`: the Reginald input appears between Activity and Notes with its explanation paragraph (13px) between the two; the Notes card is a label/value pair with the label stacked on top at the same size as the value. Fix: label at 13px muted, value at 15px.
- [C] 4 Type · `organization-page-day-1440.png`: breadcrumb "Back" and the tag "Organization" at 11px; the help text under the input is 12px.
- [nit] 3 Space · `organization-page-day-1440.png`: title to tag gap 8px, tag to Activity 20px; the card's top (y 158) is not on the same line as the "Activity" heading baseline (y 174).
- [nit] 6 Colour · `organization-page-night-1440.png`: the Notes card lifts only by a hairline.

## organizations: People, with organizations
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures (the screen is the loaded state with 6 organizations)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.4 | 3.5 | 3.5 | 3.4 | 3.9 | 3.5 | 3.2 | 3.5 | 4.1 |
Issues:
- [C] 2 Layout · `organizations-day-1440.png`, y 460-700: the organizations table has the columns "People", "Yours", "Also called" where "Also called" is empty on all six rows and "People" is empty on five of six; two organizations ("Featherstonehaugh...", "Quarry Press") have no value in any column. Fix: hide empty columns, show a count only when above zero.
- [C] 1 Hier · `organizations-day-1440.png`: the screen is two tables with two headings and two add buttons; "Add a person" is filled burgundy, "Add an organization" is outline, but both are page-level actions with equal weight to a reader. The bare title "People" does not say that organizations are on the page. Fix: add the count line "4 people, 6 organizations" under the title; or move Organizations to its own tab.
- [C] 8 Phone · `organizations-day-390.png`: 11 cards, each 130-180px tall (Avery Lane: name, "Open items:" label, "8" on its own line, "..." on its own line); the phone page is 1900px for ten rows. Labels are the same size as values. Fix: one meta line per row ("8 open · Printer"), the menu at the right of the title.
- [C] 8 Phone · `organizations-day-390.png`, y 780-845: the tab bar covers the 4th person's row and "Open items" in the capture.
- [C] 5 Comp · `organizations-day-1440.png`: the filter strip (tabs) plus the "Organization" dropdown are two filters at 8 rows. See `people`. Fix: hide.
- [nit] 4 Type · "4 people" footer at 11px; no "6 organizations" footer to match.

## organization-removed: An organization removed, with Undo
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); this picture is the toast state
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.4 | 3.5 | 3.5 | 3.4 | 3.9 | 3.5 | 3.2 | 3.5 | 4.1 |
Issues:
- [C] 5 Comp · `organization-removed-day-390.png`, y 690-770: the undo toast wraps the close "x" under the message on its own line (toast is 80px tall for one sentence), while at 1440 it is one line. Fix: keep "Removed Quarry Press. Undo  x" on one row at 390; shorten to fit.
- [C] 7 Edge · `organization-removed-day-1440.png`, y 583-613: the toast sits on top of the Northfield row, hiding its "Your business" cell, and there is no auto-hide cue (a progress line). Fix: position above the content's bottom padding and add a countdown.
- [C] 6 Colour · `organization-removed-day-1440.png`: the removed row is gone but the "Lantern Row Studio" row beside the toast shows a hover tint with no cursor, which reads as the removed row's ghost. Nothing in the list shows what changed. Fix: remove the tint, or fade the row out before the toast.
- [C] 1 Hier · `organization-removed-day-1440.png`: the toast text "Removed Quarry Press." has no scope ("organization"); an undo toast should name the action. Fix: "Removed organization Quarry Press."
- [nit] 4 Type · toast text 12px at 1440 and 17px at 390; same component, two scales.
- [nit] 3 Space · toast is centred in the page column (x 355-645) rather than the window or the content edge.
(Other findings as for `organizations`.)

## files: Files
Pictures opened: 3 main + 6 state (loading, couldn't load, offline at 1440 day and 390 day) of 22 listed
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.3 | 3.7 | 3.6 | 3.5 | 3.9 | 3.8 | 3.8 | 3.6 | 4.2 |
Issues:
- [C] 7 Edge · `files-day-1440.png`, y 150-210: the only picture of the screen is the first-run empty state: a tile icon and one 11px line ("No files yet. Use "Add a file" to keep one here."), 400px of blank below. No drop target, no example of what a file is for. Fix: a dashed drop area ("Drop a file here or choose one") that is the empty state, with the primary beside it.
- [C] 1 Hier · `files-day-1440.png`, y 90-115: a five-tab side strip ("All, Personal, Harborview Community Su..., ...") is the second-largest thing on an empty page, and two of its labels are cut ("Su...", "Ce...", "R..."). Filters for zero files. Fix: hide the strip until there are more than about 12 files.
- [C] 5 Comp · `files-day-1440.png`: the tab-strip tabs are truncated organization names with no tooltip; they look like a second nav. Fix: one "Side: All" menu (as on the phone) at all widths.
- [C] 4 Type · `files-day-1440.png`: the empty-state line is 11px muted; the page title is the only large text.
- [C] 7 Edge · `files-loading-day-1440.png`: skeleton rows (circle, two lines, pill) are generic; a files list would have an icon, name, size and date. No shift problem seen because the title and button stay in place, which is good.
- [nit] 7 Edge · `files-offline-day-1440.png`: the offline banner is 45px tall and the content below it shifts by that; the banner time ("9:53 PM") and the phone's time ("10:03 PM") differ, a capture difference.
- [nit] 3 Space · `files-day-390.png`: gap title to primary 12px, primary to Side filter 12px, filter to empty state 80px.
- [nit] 6 Colour · `files-night-1440.png`: the empty icon tile (burgundy-black) is 1.2:1 against the canvas, fine as decoration.
Strengths worth keeping: `files-couldn-t-load-day-1440.png` is the best error state in this part (title kept, message, Try again primary, Details disclosure, 3px red edge plus icon plus words).

## files-add: Add a file
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.7 | 3.6 | 3.5 | 3.5 | 3.8 | 3.4 | 3.8 | 3.6 | 3.9 |
Issues:
- [C] 5 Comp · `files-add-day-1440.png`, footer (y 443): "Add" is disabled and renders as pale cream with burgundy text (about 2:1), so it looks like a ghost; "Cancel" is a plain text link. No reason is given for why Add is off (a file has not been chosen). Fix: disabled primary at reduced opacity, with "Choose a file first" beside it.
- [C] 4 Type · `files-add-day-1440.png`: dialog title "Add a file" is 13px bold, the same size as the field labels ("File", "Where does it belong?"), so there is no step; the hint "Any document, picture or sound file. Up to 50 MB." is 11px. "Optional" tags beside two labels add noise. Fix: 18-20px title, 13px hint, put "Optional" in the placeholder.
- [C] 1 Hier · `files-add-day-1440.png`, y 280-400: "About this file" is a group heading with a single field "Description" under it, and a "Where does it belong?" field above; the heading adds nothing. Fix: drop "About this file".
- [C] 7 Edge · no picture of the dialog with a file chosen, an oversize file or an unsupported type; the drop zone is the 28px dashed bar and shows only the empty look. Fix: capture the filled and error states.
- [nit] 2 Layout · `files-add-day-1440.png`: dialog 390px wide centred; its left padding 14px vs the drop zone at 14px, matching; footer buttons right-aligned, good.
- [nit] 8 Phone · `files-add-day-390.png`: the bottom sheet's Cancel/Add row is full width and "Add" is a 285px pill (disabled, pale); sheet drops to the bottom correctly. The drop wording "or drop here" makes no sense on a phone. Fix: hide "or drop it here" below 600px.
- [nit] 6 Colour · `files-add-night-1440.png`: dashed border of the drop zone at 1.8:1.

## notes: Notes
Pictures opened: 3 main + 6 state (loading, couldn't load, offline at 1440 day and 390 day) of 22 listed
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.2 | 3.7 | 3.5 | 3.4 | 3.9 | 3.7 | 3.7 | 3.6 | 4.1 |
Issues:
- [C] 1 Hier · `notes-day-1440.png`, y 90-220: an empty page with no primary action: the empty state says "A note you hand in to be kept shows up here." but the page has no "Add a note" and the way to make one is "Hand something in" at the top right of the header, 800px from the text. Fix: add a primary "Write a note" on the page, or link "Hand something in" from the sentence.
- [C] 2 Layout · `notes-day-1440.png`: the empty state is centred at x 580 in a column that starts at x 178; the tab strip above it is left-aligned and 800px wide, so the filter strip is wider than anything it filters. Fix: hide the strip for an empty list; left-align the empty state.
- [C] 5 Comp · `notes-day-1440.png`, sidebar: the Notes and Knowledge entries use the same open-book icon, so two destinations look the same in the nav. Fix: a distinct icon (note or pencil for Notes).
- [C] 4 Type · `notes-day-1440.png`: empty-state text is 11px at 1440 and 17px at 390 (same copy, two scales; the text wraps to an orphan "here." at 1440).
- [C] 7 Edge · `notes-loading-day-1440.png`: the skeleton is the generic row; same as Files. `notes-offline-day-1440.png` is correct and calm.
- [nit] 6 Colour · `notes-night-1440.png`: tab strip is a dark pill with white text; selected "All" is barely lifted (1.3:1 between selected and unselected).
- [nit] 8 Phone · `notes-day-390.png`: 560px of blank below the empty state; no primary visible without opening the tab bar's "+".

## knowledge: Knowledge
Pictures opened: 3 main + 6 state (loading, couldn't load, offline at 1440 day and 390 day) of 22 listed
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.2 | 3.4 | 3.4 | 3.3 | 3.9 | 3.6 | 3.4 | 3.5 | 4.1 |
Issues:
- [C] 1 Hier · `knowledge-day-1440.png`, y 150-460: two unrelated things share the page: a learned-knowledge empty state (a centred icon with a 3-line explanation) and the "Your words" form directly under it. The form, which a person can act on, is the only action but has the lowest weight: "Add word" is a pale grey disabled pill. Fix: put "Your words" first with a normal title, move the empty state into a one-line muted note.
- [C] 4 Type · `knowledge-day-1440.png`, y 270-300 and y 426: three help paragraphs (a subtitle under the title, a description under "Your words", and a hint under the second field) at 11-13px. Rubric: no help paragraph when a tooltip can say it. "Where you control it" in the subtitle is vague. Fix: keep one line under the title; move the others to field placeholders.
- [C] 2 Layout · `knowledge-day-1440.png`: the form fields are 355px wide in an 800px column, so their right edge (x 533) shares nothing with the heading or the empty state; the empty state is centred at x 580, the form left-aligned at x 178. Fix: one alignment.
- [C] 5 Comp · `knowledge-day-1440.png`, y 449: "Add word" is disabled and looks like the app's secondary button at 40% opacity; no reason why it is disabled. Fix: sentence under the field, "Type a word to add it."
- [C] 8 Phone · `knowledge-day-390.png`: 380px of the first screen are the title, two lines of subtitle and a three-line empty state before "Your words" begins at y 410; the tab bar covers the bottom of the second field in `knowledge-offline-day-390.png`. Fix: put the form first.
- [C] 7 Edge · `knowledge-couldn-t-load-day-1440.png`: the error shows the Try again button but no Details disclosure, unlike Files and Notes (inconsistent component); the form "Your words" is gone, so a failure to load the learned items blocks adding a word. Fix: keep the form.
- [nit] 7 Edge · `knowledge-loading-day-1440.png`: skeleton has three rows while the page has an empty state and a form; layout will shift.
- [nit] 6 Colour · `knowledge-night-1440.png`: inputs have a 1.5:1 border on the canvas; they look recessed rather than outlined.

## rules-review: Rules to look over
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures (the one picture is the empty state)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.4 | 3.6 | 3.4 | 3.4 | 3.9 | 3.3 | 3.8 | 3.5 | 4.0 |
Issues:
- [C] 7 Edge · `rules-review-day-1440.png`, y 225-280: the only picture is the all-clear state: a tile icon and "No rules to look over right now." No picture of the screen with rules in it, so the row design for Keep, Limit and Stop is not reviewable. For an all-clear this is also a brand moment missing: plain 13px grey text. Fix: capture a populated state; give the all-clear a short warm line ("Nothing to look over. Reginald is using everything it was given.").
- [C] 4 Type · `rules-review-day-1440.png`, y 118-175: the intro is a 13px two-line paragraph, then "Instructions sent with every task: 0 of 8000 characters." in black 13px, which reads as a debug line (a size budget a person cannot act on, no unit explanation). Fix: show it only when above 80% of the limit; or move it to Advanced.
- [C] 1 Hier · `rules-review-day-1440.png`: the intro tells the three choices ("Keep them for later review, limit where they apply, or stop using them") but there is nothing to choose on the page, so the heading and text outweigh the empty content. Fix: one line under the title while empty.
- [C] 2 Layout · `rules-review-day-1440.png`: the empty state is centred at x 580 while the title and text are at x 178; the page has no right column, so the content spans 500px of an 840px area. Fix: left-align.
- [C] 5 Comp · `rules-review-day-1440.png`: "Back to Knowledge" is 11px muted, 90px wide hit target, above a page that has no other navigation; the sidebar shows no active item. Fix: highlight Knowledge in the sidebar and use a standard back chip.
- [nit] 8 Phone · `rules-review-day-390.png`: fine; the tab bar does not cover anything. 17px help text is larger than the 13px text on desktop.
- [nit] 6 Colour · `rules-review-night-1440.png`: the "0 of 8000" line is full white on near-black, brighter than the title's muted sibling text.

## todo-page: A to-do's page
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.5 | 3.7 | 3.6 | 3.6 | 3.9 | 3.4 | 3.5 | 3.6 | 4.2 |
Issues:
- [C] 1 Hier · `todo-page-day-1440.png`, y 80-110: three buttons share the title row: a "..." menu, an outline "Edit details" and the filled "Mark done". That is right (one primary), but the page title repeats as "The words: "Pay the deposit"" at y 128 directly underneath. The title and its quote are the same string. Fix: drop "The words" when equal to the title.
- [C] 2 Layout · `todo-page-day-1440.png`: the facts are split: "The words" and "Promised to" on the left in 12px, "Owner, Due, Project" in a right card; with only a due date and a project that matter, the person's eye goes left to right with no order. The right card starts at y 115 against the left column at y 120. Fix: one list (Owner, Due, Project, Promised to) under the title.
- [C] 5 Comp · `todo-page-day-1440.png`, y 160-175: "Promised to: No one in particular" with a "Change" link that is burgundy and underlined, the loudest text on the screen. Fix: ink or muted text link, no underline at rest.
- [C] 4 Type · `todo-page-day-1440.png`: labels (The words, Promised to, Owner, Due, Project) at 11px; values 11-12px; the Reginald help paragraph 11px.
- [C] 7 Edge · no state pictures; "No one in particular" is the edge case shown but the Activity list has one item, and nothing for a to-do with a long title, many activity items or a missing due date. Fix: capture them.
- [C] 8 Phone · `todo-page-day-390.png`, y 140-180: the "..." menu, "Edit details" and "Mark done" sit in one row under the title; "Mark done" is 100px wide and the row starts with the menu at x 1025, so the primary is not at the left. The details card (Owner, Due, Project) is below the Reginald input and the tab bar hides "Project". Fix: put the card above Activity; keep Mark done as a full-width primary.
- [nit] 3 Space · `todo-page-day-1440.png`: Activity heading to input is 100px, input to paragraph 12px.
- [nit] 6 Colour · `todo-page-night-1440.png`: "Mark done" gold, fine; "Change" in gold is brighter than the primary's text.

## todo-edit-details: A to-do's Edit details
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.1 | 2.9 | 3.2 | 3.3 | 3.1 | 3.8 | 3.0 | 3.2 | 3.2 | 3.9 |
Issues:
- [B] 2 Layout · `todo-edit-details-day-1440.png`, y 115-480: a form-like stack of six full-width fields (Title, Due, How long it takes, Owner, Project, Repeats), each 805px wide, pushed inline between the page header and the page's own details (which still show underneath at y 510-620, so the page has the old values and the form at once). Rubric 3.5 says no form-like lists. Fix: a drawer or dialog (as Add a person), or an inline two-column form (Title full width, Due and How long side by side, Owner and Project side by side).
- [B] 1 Hier · `todo-edit-details-day-1440.png`, y 80-110 vs y 478: while editing, "Mark done" (filled burgundy) and "Edit details" stay on, so the page has two primaries (Mark done and Save) and Save is a pale cream disabled-looking pill at the form's bottom right, far from the top. Fix: while editing, hide Mark done, show Save as the primary, and keep Cancel beside it.
- [C] 4 Type · `todo-edit-details-day-1440.png`, y 190-450: wording "In Harborview Community Support Partnership Incorporated, not in a project" in the Project field is self-contradictory. Labels for Title, Due, Repeats are regular weight while "How long it takes", Owner and Project are bold; so the form uses two label styles. Fix: all labels one style; the option reads "Harborview Community Support Partnership Incorporated" or "No project".
- [C] 5 Comp · `todo-edit-details-day-1440.png`, y 185-215: the Due field is a date input 124px wide with a native calendar icon while the rest are 805px; Repeats is a free-text box ("For example: every Tuesday"), which the project's own rule says should be a list. Fix: a choice list (does not repeat, daily, weekly...).
- [C] 8 Phone · `todo-edit-details-day-390.png`: the form pushes the page's details below the tab bar (y 760) and Save is a 285px disabled-looking pale pill; Project value is truncated ("In Harborview Community Partne...") with no way to see it. Fix: sheet with Save in a pinned footer; two-line select.
- [C] 7 Edge · no state with a validation error or an unsaved-changes state is pictured. Fix: capture a blank Title.
- [nit] 3 Space · `todo-edit-details-day-1440.png`: label-to-field gaps 4px, field-to-label gaps 12-24px, irregular (Due label y 173 against title field bottom y 160; Owner label y 289 against field bottom y 265).
- [nit] 6 Colour · `todo-edit-details-night-1440.png`: Save in dark burgundy on near-black, 1.6:1.

## handover: Handover
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures (the one picture is the "both copies match" state)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.3 | 3.3 | 3.0 | 3.3 | 3.4 | 3.9 | 3.1 | 3.7 | 3.4 | 4.0 |
Issues:
- [B] 3 Space · `handover-day-1440.png`, y 85-135: the subtitle ("Your work is kept on this computer and in the folder it syncs to...") starts 4px under the title baseline; title and paragraph touch. At 390 the same (`handover-day-390.png`, y 135-145). Fix: 8-12px under the title.
- [C] 1 Hier · `handover-day-1440.png`, y 100-230: the page name in the nav and in the picture list is "Handover" but its title is "Which copy to keep"; a person who gets here from a Today line sees a different name than the link. The page's real content (a conflict decision) is not shown; the all-match state has a tile icon and "Both copies match." Fix: one name; capture the conflict state with its Keep this computer / Keep the folder choice.
- [C] 7 Edge · `handover-day-1440.png`: only the all-clear is pictured. The important state (copies differ), the stalest page-level risk in the product, has no picture. All-clear is plain grey text. Fix: capture the conflict state; make the all-clear a brand moment ("Both copies match" with the mark).
- [C] 4 Type · `handover-day-1440.png`: two-line help paragraph (13px) says the same as the title and the state; not one thing a person acts on. Fix: shorten to one line.
- [C] 2 Layout · `handover-day-1440.png`: content is a single centred icon under a left-aligned title, 800px of blank to the right and below. Fix: left-align.
- [nit] 6 Colour · `handover-night-1440.png`: fine.

## quality: How the assistant is doing
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures (the one picture is the "Too early to tell" state)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.4 | 3.7 | 3.6 | 3.5 | 3.9 | 3.4 | 3.8 | 3.6 | 4.1 |
Issues:
- [C] 7 Edge · `quality-day-1440.png`, y 115-250: the one picture is the zero-data state, so the page's purpose (how often promises are kept, corrections repeated) is not reviewable. The state is correct and honest ("It has found 0 so far") but is the only thing seen. Fix: capture a populated state with numbers, the delta direction and the period.
- [C] 1 Hier · `quality-day-1440.png`: the card heading "Too early to tell" (13px bold) is the answer, but smaller than the page title and no more prominent than the body below it. Rubric: lead with the one-line "so what". Fix: make "Too early to tell" 18px, the reason muted below.
- [C] 5 Comp · `quality-day-1440.png`, y 224: "Count them yourself" is burgundy bold text at 11px without underline or arrow; it reads as a label, not a link. Fix: accent text with an arrow, 13px.
- [C] 4 Type · `quality-day-1440.png`, y 160-200: the body copy uses "The assistant" while the title says "Reginald" (name inconsistency within one card); meta line "Counting from Oct 6 to Nov 3." at 10px is below the 13px floor and sits 2px under the body.
- [C] 2 Layout · `quality-day-1440.png`: a 473px-wide card in an 840px column, left-aligned, with 360px of blank right; it shares no right edge with the header. Fix: full column width or a two-column grid when data exists.
- [nit] 3 Space · title to card gap 12px; card padding 12px top, 16px sides.
- [nit] 6 Colour · `quality-night-1440.png`: the card hairline border is the only lift.

## status-popover: The header's status popover
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 2.8 | 2.8 | 3.0 | 2.8 | 3.0 | 3.6 | 3.4 | 3.0 | 3.0 | 3.8 |
Issues:
- [B] 4 Type · `status-popover-day-1440.png`, y 120-195: the Connections summary is a single run-on paragraph of 11px text mixing roman and italic: "Checked 2 connections, last at 9:33 PM · Mail from before Tue, Oct 20 has not been read yet · Your inbox, avery.lane.home@example.com not read yet · Your calendar, avery.lane.home@example.com not read yet · Your inbox, avery.lane.studio@example.com not read yet · Your calendar, ...". It repeats what the three account rows directly below say (Read 9:33 PM / Not read yet). Fix: delete the paragraph; keep the account rows, and show one line "Checked 9:33 PM · mail before Oct 20 not read yet".
- [B] 2 Layout · `status-popover-day-1440.png`, y 35-495: the popover is 445px wide and 460px tall on a 625px window and covers the page's greeting and the first list; it has five sections (Updates, Backup, Connections, Restart, Reginald) in two columns with unequal heights, plus a nested list of accounts with its own card and a full-width "Open Connections" button. Rubric: no card inside a card. Fix: a single column, four rows (status dot, label, one action), accounts folded under Connections.
- [B] 1 Hier · `status-popover-day-1440.png`: three actions look alike: "Refresh" (outline), "Set up backups" (outline), "Open AI account setup" (outline) and one filled "Restart now"; the Restart row is the one that blocks work but sits at the bottom left, under the long paragraph. Fix: order rows by urgency: Restart first.
- [C] 8 Phone · `status-popover-day-390.png`: the popover is a full-width sheet whose top is under the header (y 47), no visible title or close, 800px+ tall; the 12-line italic paragraph is at 17px and pushes accounts to y 480. "Reginald" section is cut at the bottom (y 840). Fix: the paragraph fix above; sheet with a title and a close.
- [C] 5 Comp · `status-popover-day-1440.png`: colours of the three status words (brown "No backup on another device", brown "Restart the app...", brown "The assistant isn't set up yet") are all the same amber with no icon or dot; the header chip beside it is "Restart to finish" in a different style from the "Reginald" with a triangle. Fix: one status row pattern (dot or icon, word, action).
- [C] 6 Colour · `status-popover-day-1440.png`: status brown on white is about 5:1; ok. `status-popover-night-1440.png` has orange on dark at 8:1; ok. The state is by text plus colour; the dots on the account rows are green/grey by colour with words beside them, ok.
- [C] 3 Space · `status-popover-day-1440.png`: section gaps vary (Updates to Connections 12px, Connections to Restart 24px, rows inside accounts 0 with hairlines); labels at 10px uppercase-free sentence case differ from the page's uppercase group labels.
- [nit] 7 Edge · no state picture for a healthy status (everything fine) which is the common case.
- [nit] 1 Hier · the popover sits over the greeting, so the page title is half hidden (y 60-90 "Good eve...").

## user-menu: The user menu
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.5 | 3.6 | 3.4 | 3.5 | 3.9 | 3.3 | 3.7 | 3.6 | 4.1 |
Issues:
- [C] 1 Hier · `user-menu-day-1440.png`, y 35-293: the menu mixes three jobs (workspace: Settings and "How Reginald is doing"; Theme with three radios; Spacing with two) in one 150px column. Appearance settings take more room than the two links a person came for. Fix: Theme and Spacing as one "Appearance" row opening Settings, or as two compact segmented controls.
- [C] 5 Comp · `user-menu-day-1440.png`, y 48-110: "Settings" has a gear icon but "How Reginald is doing" has none, so the two rows do not share a text edge (x 862 vs x 848). The radio rows (Match this computer, Light, Dark) have icons but no radio; the active one is shown only with a check at the right edge. Fix: icons on every row or none.
- [C] 4 Type · `user-menu-day-1440.png`: 10px section labels (WORKSPACE, THEME, SPACING) and 11px rows on a 150px menu at 1440; the 390 version is 17px: two scales for one component.
- [C] 2 Layout · `user-menu-day-1440.png`: the menu hangs from x 836-988 and covers the "Today's schedule" card title; it has no arrow tying it to the avatar. No name or email at the top, so there is no way to see who is signed in. Fix: show name and email as the first row.
- [C] 7 Edge · `user-menu-day-390.png`: the menu covers the page's first card and its right edge sits 6px from the window edge, but it is not cut. No empty or error case relevant.
- [nit] 6 Colour · `user-menu-night-1440.png`: the menu border is the only lift (1.3:1); selected check marks are muted gold.
- [nit] 8 Phone · `user-menu-day-390.png`: the menu is a floating popover, not a sheet; touch rows are 36px high (under 44px). Fix: 44px rows on the phone.

## help-menu: The help menu
Pictures opened: 2 of 4 listed (1440 day, 1440 night; no 390 picture exists for this screen, so point 8 is scored from the 1440 pictures and the owner's phone is unknown). 1024 not opened.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.6 | 3.6 | 3.5 | 3.2 | 3.9 | 3.4 | 3.0 | 3.5 | 4.0 |
Issues:
- [C] 5 Comp · `help-menu-day-1440.png`, y 60-190: the icons carry the wrong meaning: "Show keyboard shortcuts" uses a question-mark circle (the same glyph as the button that opens the menu), "Setup guide" uses a check mark (reads as "done" or as a selected item), "Missed something?" and "Write feedback" use the same speech-bubble outline. Fix: a keyboard icon, a list/compass icon for the guide, a flag or search icon for "Missed something?".
- [C] 4 Type · `help-menu-day-1440.png`: "Missed something?" does not say what it does (it is a report that something was missed); "Version 0.1.0" is muted 13px, fine. Fix: label "Report something Reginald missed".
- [C] 8 Phone · no 390 picture of this menu: the phone's help items live in the More sheet (`more-sheet-day-390.png`), whose Help group is cut at the window bottom after two items ("Missed something?", "Show keyboard shortcuts"), so "Setup guide", "Write feedback" and the version cannot be seen without scrolling and no scroll cue shows. Fix: capture it; add a fade or scrollbar cue.
- [C] 2 Layout · `help-menu-day-1440.png`: the menu (x 1145-1380) is placed 60px left of the window edge and does not align with the "?" button (x 1363) it hangs from; it covers the right edge of the setup banner's "..." menu. Fix: right-align the menu to the button.
- [nit] 3 Space · rows are 36px with 6px gaps; a divider before "Version" has 8px more.
- [nit] 6 Colour · `help-menu-night-1440.png`: item icons are muted grey at 3:1, ok.

## more-sheet: The phone's More sheet
Pictures opened: 1 of 1 listed (390 day only; the screen has only that picture, so the 1440 day and 1440 night pictures required by the brief do not exist)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.2 | 3.1 | 3.4 | 3.5 | 3.0 | 3.7 | 3.0 | 3.4 | 3.3 | 3.8 |
Issues:
- [B] 2 Layout · `more-sheet-day-390.png`, y 395-670: the "Saved items" group holds Personal, People, Files, Notes, Knowledge and Settings: Settings, People, Files, Notes and Knowledge are not saved items (the desktop sidebar keeps them as separate entries), and the four projects ("Harborview...", "Willowbrook...", "Northfield...", "Lantern Row...") that are saved items on desktop are missing here. The grouping is wrong. Fix: group as Keeping track / Projects / People and files / Settings, and list every project.
- [C] 5 Comp · `more-sheet-day-390.png`, y 445: the "Personal" row has no icon, its text starts at x 24 while every other row starts at x 54 (icon column), so the list has two text edges. Fix: an icon (or initial tile like the desktop's "P") on every row.
- [C] 5 Comp · `more-sheet-day-390.png`, y 760-805: "Missed something?" uses a warning triangle, which reads as an error, and "Show keyboard shortcuts" is a phone item for a keyboard that a phone rarely has. Fix: hide shortcuts below 600px; a neutral icon.
- [C] 7 Edge · `more-sheet-day-390.png`, bottom (y 805-845): the sheet is cut at the window with the Help group half shown ("Setup guide", "Write feedback", version are not visible); no scroll cue. Fix: fade at the bottom edge and an inner scroll.
- [C] 8 Phone · `more-sheet-day-390.png`: rows are 44px apart, fine, but the sheet has a "More" title and a close x at the top right, 40px hit; the sheet does not have the tab bar visible behind it, so the person cannot switch directly to Today. OK. The handle is 40px wide, fine.
- [nit] 1 Hier · `more-sheet-day-390.png`: no active-state row and no hint of where the person came from; fine for a menu.
- [nit] 4 Type · group labels are 11px uppercase with 0.1em tracking, consistent with the brand spec.

## shortcuts: Keyboard shortcuts
Pictures opened: 2 of 4 listed (1440 day, 1440 night; no 390 picture exists, so point 8 is scored from the 1440 pictures: the dialog is a single 390px-wide box of two-column rows that would need a stack on a phone). 1024 not opened.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.5 | 3.4 | 3.4 | 3.5 | 3.9 | 3.4 | 3.0 | 3.4 | 4.0 |
Issues:
- [C] 1 Hier · `shortcuts-day-1440.png`, y 90-390: a flat list of 16 shortcuts in one run plus 4 for the Schedule; no grouping (move, act on an item, go to) so the person cannot find "Undo" or "Hand something in". Fix: 3 groups with labels, most-used first (j, k, Enter, u).
- [C] 4 Type · `shortcuts-day-1440.png`: the dialog title "Keyboard shortcuts" is 13px bold, the same as the "On the Schedule" group label (same weight, no step), and the key chips are 9px monospace; descriptions are 11-12px. The key column's descriptions start at x 364 for all, good. Fix: 18px title, 13px rows, 12px keys with padding.
- [C] 5 Comp · `shortcuts-day-1440.png`, y 368: "Enter" and "Esc" chips are wider than "j" and "k" so the key column has a ragged right edge; the "Swipe" row at y 521 is a gesture, not a key, and "On a phone, swipe sideways to move" is in a keyboard dialog. Fix: fixed-width key cells; move Swipe out.
- [C] 8 Phone · no 390 picture: a shortcuts dialog on a phone is not useful (the More sheet still offers "Show keyboard shortcuts"). Fix: hide the command below 600px, or capture it.
- [C] 7 Edge · no state picture; the list is longer than the 625px 1440 window, the dialog ends at y 572 with its Close button, so nothing scrolls here, but at 1024x768 and smaller windows height may cut it (1024 not opened; check). 
- [nit] 6 Colour · `shortcuts-night-1440.png`: key chips are grey on grey at 1.6:1.
- [nit] 5 Comp · "Close" is the only button and filled burgundy with a 2px focus ring, correct.

## feedback: Write feedback
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.2 | 3.3 | 3.0 | 3.1 | 3.1 | 3.7 | 3.3 | 3.4 | 3.3 | 3.8 |
Issues:
- [B] 3 Space · `feedback-day-1440.png`, y 255-300: "Message preview" (heading) sits 2px under the checkbox hint ("Only the counts are added...") and 4px above "Subject"; the two checkbox rows are 20px apart and their hint touches the heading. Same at 390 (`feedback-day-390.png`, y 420-445: the heading is directly under the hint, no gap). Fix: 20px above each group heading.
- [B] 1 Hier · `feedback-day-1440.png`: the dialog asks for one thing (what happened), then shows two checkboxes, a Subject field, a Message field and a "Details for the makers" disclosure on the first view; the person has typed nothing and already faces a subject and a preview. The primary "Open in your email app" is a pale cream pill (disabled) that looks like the secondary "Copy". Fix: show the textarea and the primary first; the preview, subject and options in one closed "What will be sent" disclosure.
- [C] 4 Type · `feedback-day-1440.png`: three paragraphs of 11px help text ("Nothing is sent from here...", "Write a few words to continue.", "Only the counts are added, never what you said. ""Missed something?"" was not used in the weeks counted.", "Your email app asks who to send it to...") plus a title at 13px. The last text is clipped under the footer's top rule at 390 (`feedback-day-390.png`, y 778: "Your email app asks who to send it to: send it to whoever..." is cut by the footer). Fix: one help line; the rest to tooltips.
- [C] 5 Comp · `feedback-day-1440.png`, footer: "Close" is a text button, "Copy" a pale pill, "Open in your email app" a slightly darker pale pill; disabled and enabled states of the primary are not distinguishable, and no reason for disabled is next to it (the reason, "Write a few words to continue.", is 300px above). Fix: place the reason beside the button.
- [C] 8 Phone · `feedback-day-390.png`: the sheet scrolls under a fixed footer with a clipped line (above); the text area is 60px high at 17px type; the checkbox labels wrap to two lines each. Fix: pad the scroll area by the footer height.
- [nit] 6 Colour · `feedback-night-1440.png`: the focused textarea has a gold 2px ring, good; the disabled primary reads as active.
- [nit] 2 Layout · `feedback-day-1440.png`: the dialog is 390px wide while its content (preview message) wraps at 360px; the modal sits at y 53 so its top is 10px under the header.

## hand-in: Hand something in
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.5 | 3.4 | 3.4 | 3.4 | 3.8 | 3.4 | 3.5 | 3.5 | 4.0 |
Issues:
- [C] 1 Hier · `hand-in-day-1440.png`, y 50-525: five questions in a column (Paste or type it here; Whose words; Anything to do with it; Who may see this; Where does it belong) before the one action. Only the first is needed; the other four have defaults. Fix: show the text area and "Hand in", fold the four options into "Options".
- [C] 5 Comp · `hand-in-day-1440.png`, y 239: "Choose a file" is a bare 11px text with no icon, border or underline, directly under the text area, and does not look clickable. Fix: the quiet outline button with an upload icon, or a drop target inside the text area.
- [C] 5 Comp · `hand-in-day-1440.png`, footer (y 566): "Hand in" is a pale cream pill (disabled) with burgundy text, same as Cancel's weight: the primary does not read as primary. Fix: disabled = the filled shape at 40% opacity.
- [C] 4 Type · `hand-in-day-1440.png`: drawer title 13px (same as field labels); hints at 10-11px ("Reginald reads this as information, never as instructions.") appear under three of five fields; 17 vs 11px between 390 and 1440.
- [C] 3 Space · `hand-in-day-1440.png`: "Choose a file" (y 239) sits 12px above "Whose words are these?" label (y 259), tighter than the 24px between every other pair; the hint under the segmented control (y 306) is 10px from the next label.
- [C] 2 Layout · `hand-in-day-1440.png`: the drawer is 445px wide, edge to edge to the right, covering the page's right 45% and its header's right half (the Hand-something-in button and avatar vanish behind it at y 16). The drawer's bottom edge stops at y 587 with 40px of canvas below. Fix: full height.
- [C] 8 Phone · `hand-in-day-390.png`: the sheet cuts the "Where does it belong?" field (y 770), with no scroll cue; the placeholder "For example: find the to-dos and save the date:" is clipped at the field edge (the "s" is cut). Fix: shorten placeholder; footer fade.
- [nit] 6 Colour · `hand-in-night-1440.png`: dashed 2px gold border on the text area is the focus ring; fine.

## add-todo: Add a to-do
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.4 | 3.5 | 3.4 | 3.2 | 3.8 | 3.3 | 3.6 | 3.5 | 3.9 |
Issues:
- [C] 1 Hier · `add-todo-day-1440.png`, y 45-420: six fields (What to do, Due, How long it takes, Who does it, Where does it belong, Repeats) are shown equally. One is needed. The same screen already has an inline "Add a to-do..." row on the page behind it (y 217), so the drawer duplicates a faster path. Fix: the drawer asks What to do and Due; the rest under "More".
- [C] 5 Comp · `add-todo-day-1440.png`, y 389-415: "Repeats" is a free text box ("For example: every Tuesday"); "Due (optional)" is also free text ("Friday, or next Tuesday"). The project's UI rule is a list for any known set of values. Fix: choice for Repeats; keep Due as a typed phrase only if its result is previewed beside it ("Friday, Nov 6").
- [C] 5 Comp · `add-todo-day-1440.png`, footer (y 465): "Add" pale cream (disabled-looking) pill; same defect as the other forms; no reason is given why Add is disabled (What to do is empty).
- [C] 4 Type · `add-todo-day-1440.png`: title "Add a to-do" 13px bold, the same size as labels; at 390 title 20px. "Where does it belong?" has no default ("Choose one") while "Who does it" has one.
- [C] 7 Edge · no state picture of validation (blank What to do on Add), a very long title, or a failed save. Fix: capture them.
- [C] 2 Layout · `add-todo-day-1440.png`: the background list behind the drawer shows a CJK title ("請款單寄給客戶") and a three-line truncated title, which is useful as an edge case, but the drawer hides the row actions column.
- [nit] 8 Phone · `add-todo-day-390.png`: the sheet starts at y 133 and the footer sits at y 785; the "What to do" field has a burgundy 2px ring and the cursor in the first field (matches the rule). Good.
- [nit] 6 Colour · `add-todo-night-1440.png`: field borders at 1.8:1.

## ask: Ask
Pictures opened: 4 of 5 listed (1440 day, 390 day, 1440 night, 390 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.5 | 3.5 | 3.4 | 3.4 | 3.8 | 3.3 | 3.8 | 3.5 | 4.0 |
Issues:
- [C] 5 Comp · `ask-day-1440.png`, y 190-215: "Ask" is a pale cream pill (disabled look) beside a plain "Close"; the primary of the panel is the weakest-looking control on it. At 390 (`ask-day-390.png`, y 630-665) "Ask" is a 295px-wide pale bar, a disabled-looking primary the full width. Fix: disabled primary at the filled shape with lowered opacity.
- [C] 1 Hier · `ask-day-1440.png`, y 230-320: below the input there are two further blocks: a three-line help paragraph with a burgundy underlined link ("Keep track of something of your own"), then "Recent questions: No questions yet." Both are secondary, but the link is the loudest thing in the panel. Fix: link in ink, "Recent questions" hidden while empty.
- [C] 4 Type · `ask-day-1440.png`: 11px helper under the field and 11px help paragraph; title "Ask Reginald" 13px bold, the same as "Your question" label. Fix: 18px title, drop one of the two help paragraphs ("Reginald uses your saved information..." and "Ask answers from what is saved here..." say nearly the same thing).
- [C] 2 Layout · `ask-day-1440.png`: the panel is 333px wide on the right, its top at y 35 (under the header), it covers the right column of Today (and the row actions "Give them dates" at x 650 are cut by the panel's edge, "Giv"), and the panel's content stops at y 320 over 300px of empty panel. Fix: panel height to content; reveal the clipped button by not truncating.
- [C] 7 Edge · no state picture of a question in progress, an answer, or an error; the answer area, the most important state, is not captured. Fix: capture them.
- [nit] 8 Phone · `ask-day-390.png`: the sheet is the right pattern (handle, field with ring, pinned Close/Ask), but the sheet starts at y 402 and "Recent questions" at y 790 is 30px above the window's edge. 
- [nit] 6 Colour · `ask-night-390.png`: the Ask bar is dark brown on dark grey at 1.3:1 and its label gold at 7:1; the control's boundary is not visible by night.

## search-results: Search, with results
Pictures opened: 3 of 5 listed (1440 day, 390 day, 1440 night); no state pictures
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 2.8 | 2.8 | 3.3 | 3.3 | 3.0 | 3.4 | 2.8 | 3.5 | 3.1 | 3.8 |
Issues:
- [B] broken · `search-results-day-1440.png` and `search-results-night-1440.png`: the field contains "Pat" and has focus, but no results popover is shown at 1440, either day or night, while `search-results-day-390.png` shows it. At desktop width the screen titled "with results" shows none. Fix: capture after results have rendered, and check the popover mounts at 1440.
- [B] 6 Colour · `search-results-day-1440.png`, y 19 (x 433) and `search-results-day-390.png` (x 1357, y 76): the clear "x" in the search field is bright blue (#2a4a9a-ish), the only blue in the interface; it is off the burgundy palette and reads as a different product. Fix: ink or muted grey icon; the night version is white.
- [C] 1 Hier · `search-results-day-390.png`, y 100-270: the popover has three rows: person (name, role, "Person"), to-do (title and "To-do" at the right) and "Ask Reginald about "Pat"". The first row is two-line and the others one-line, so rows are unequal (the to-do row has no subtitle); the "Ask Reginald about" row is not set apart from results; its meaning (sends the question) is in a 13px sentence below. Fix: a divider and a different icon before "Ask Reginald..." row; the cost note under it.
- [C] 5 Comp · `search-results-day-390.png`: result type tags "Person" and "To-do" are plain right-aligned text with no pill, while `todo-page-day-1440.png` uses boxed tags for the same words. Fix: use the one tag style.
- [C] 7 Edge · no picture of no results, of many results, or of a long name. Fix: capture those.
- [C] 2 Layout · `search-results-day-390.png`: the popover is 365px wide, full-width on the phone, with its top attached to the field; but the header's Reginald status chip and the search icon vanish while search is open, and the page below shows the Today screen cut by the popover (y 330). OK in principle.
- [nit] 3 Space · `search-results-day-390.png`: result rows are 46px with 12px side padding, while the field's text starts at x 1045 and the results' text at x 1034: 11px off the field's text edge.


## Summary
No screen in this part reaches 4.0. Every screen is also below 4.6. Brand is 3.8 to 4.3; 4.0 or more on 21 of 33 screens.

| Screen | Overall | Lowest point | Brand | Passes 4.0 / no point under 3.5 / brand >=4.0 | Passes 4.6 / no point under 4.3 / brand >=4.5 |
|---|---|---|---|---|---|
| projects | 3.1 | 2.3 (Phone) | 4.0 | no | no |
| project-page | 3.3 | 3.1 (Layout) | 4.0 | no | no |
| side-page | 3.0 | 2.5 (Hier) | 3.8 | no | no |
| project-missing | 3.1 | 2.6 (Hier) | 3.8 | no | no |
| people | 3.5 | 3.3 (Layout) | 4.1 | no | no |
| person-page | 3.8 | 3.6 (Layout) | 4.3 | no | no |
| person-long-name | 3.7 | 3.5 (Layout) | 4.3 | no | no |
| person-new | 3.6 | 3.4 (Edge) | 4.2 | no | no |
| person-missing | 3.7 | 3.5 (Layout) | 3.9 | no | no |
| person-add | 3.4 | 3.3 (Hier) | 3.8 | no | no |
| person-edit | 3.2 | 2.8 (Edge) | 3.8 | no | no |
| organization-page | 3.4 | 3.2 (Layout) | 4.1 | no | no |
| organizations | 3.5 | 3.2 (Phone) | 4.1 | no | no |
| organization-removed | 3.5 | 3.2 (Phone) | 4.1 | no | no |
| files | 3.6 | 3.3 (Layout) | 4.2 | no | no |
| files-add | 3.6 | 3.4 (Edge) | 3.9 | no | no |
| notes | 3.6 | 3.2 (Layout) | 4.1 | no | no |
| knowledge | 3.5 | 3.2 (Layout) | 4.1 | no | no |
| rules-review | 3.5 | 3.3 (Edge) | 4.0 | no | no |
| todo-page | 3.6 | 3.4 (Edge) | 4.2 | no | no |
| todo-edit-details | 3.2 | 2.9 (Layout) | 3.9 | no | no |
| handover | 3.4 | 3.0 (Space) | 4.0 | no | no |
| quality | 3.6 | 3.4 (Layout) | 4.1 | no | no |
| status-popover | 3.0 | 2.8 (Hier) | 3.8 | no | no |
| user-menu | 3.6 | 3.3 (Edge) | 4.1 | no | no |
| help-menu | 3.5 | 3.0 (Phone) | 4.0 | no | no |
| more-sheet | 3.3 | 3.0 (Comp) | 3.8 | no | no |
| shortcuts | 3.4 | 3.0 (Phone) | 4.0 | no | no |
| feedback | 3.3 | 3.0 (Space) | 3.8 | no | no |
| hand-in | 3.5 | 3.4 (Space) | 4.0 | no | no |
| add-todo | 3.5 | 3.2 (Comp) | 3.9 | no | no |
| ask | 3.5 | 3.3 (Edge) | 4.0 | no | no |
| search-results | 3.1 | 2.8 (Hier) | 3.8 | no | no |

Notes on coverage: the 1024 pictures and the 390 night pictures were not opened. `more-sheet` has only a 390 day picture; `help-menu` and `shortcuts` have no 390 picture; the brief's three-picture minimum could not be met for those three. The side-page capture shows the missing-page screen, not a long-name business page.

Pattern findings that cost points on many screens (fixing each once lifts every screen that shares it):
1. The disabled primary button (pale cream fill, burgundy text, about 2:1) in every form and dialog: person-add, person-edit, files-add, feedback, hand-in, add-todo, ask, todo-edit-details. It reads as a secondary and gives no reason.
2. Phone data lists render each field as a stacked "Label:" then "value" with the "..." menu on its own line (people, organizations, projects): 130-180px per row.
3. The fixed tab bar covers the last content in full-page captures on almost every 390 picture (add bottom padding equal to the bar plus the safe area).
4. Empty states are a tile icon plus 11px grey text and no action (files, notes, knowledge, rules-review, handover, project-page), and tab-strip filters show on lists with zero or four items.
5. Title and label sizes: dialog and drawer titles are 13px bold, same as labels; help text at 10-11px at 1440 but 17px at 390.
6. Burgundy underlined links used for ordinary text (project names, Change, Count them yourself, Keep track...) compete with the one primary.

Top ten fixes across this part, in order of score gained:
1. `projects-day-390.png` / `people-day-390.png` / `organizations-day-390.png`: stack rows on the phone (one name line, one meta line, menu at right); drop the frozen first column table on Projects. About +0.4 on three screens and +1.0 on phone for Projects.
2. `projects-day-1440.png`: hide the eight empty columns, fix "0 projects", remove "· 0" suffixes. About +0.4 on Projects.
3. `status-popover-day-1440.png`: delete the run-on italic Connections paragraph; make the popover a single column of four rows. About +0.6 on that screen.
4. `person-edit-day-1440.png`: pre-fill role and belonging so Save is enabled; fix the empty "Who they are to you". About +0.5 and a real defect.
5. `search-results-day-1440.png`: render the results at 1440; change the blue clear icon to ink. About +0.6.
6. `side-page-day-1440.png` / `project-missing-day-1440.png`: one missing-page component with a title, one line and a "Go to Projects" primary; capture the real long-name business page. About +0.5 on two screens.
7. Disabled primary look (pattern 1) across eight dialogs. About +0.2 each.
8. `todo-edit-details-day-1440.png`: move the six-field form to a drawer or two-column layout; hide Mark done while editing; fix the "not in a project" wording. About +0.5.
9. `feedback-day-1440.png` and `hand-in-day-1440.png`: collapse to one question plus an Options disclosure; fix the 2px gap above "Message preview". About +0.4 each.
10. `more-sheet-day-390.png`: regroup (Projects, People and files, Settings), add the missing projects, put an icon on "Personal", and add a scroll cue. About +0.5.

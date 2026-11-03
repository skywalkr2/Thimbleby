# Scorer A, part 3

## settings-you: Settings, You
Pictures opened: 10 of 16 (main: 1440 day, 1440 night, 390 day; states loading, couldn't load, offline at 1440 day and 390 day; not opened: 1024 day, state night pictures)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.6 | 3.6 | 3.8 | 3.8 | 3.9 | 3.8 | 3.3 | 3.7 | 4.2 |
Issues:
- [B] 8 Phone · `settings-you-day-390.png`, y 300-390: a collapsed "Section: You" disclosure is followed by about 80px of blank space, then a second "You" heading; the person sees two labels for one thing and a dead gap. Fix: drop the heading that repeats the section, remove the gap, and show the current section name once.
- [B] 8 Phone · `settings-you-day-390.png`, y 1220-1760: each account row squeezes its description into a 100px column (7 lines, "The service / asks for the / wider access...") beside the checkbox. Fix: stack the checkbox and "Let Reginald act after your yes" under the description at 480px and under, as the rubric's VP08 says.
- [C] 8 Phone · `settings-you-day-390.png`: the fixed tab bar sits mid-page at y 780-845 and covers the content between "English spelling" and "Your assistant's name" (likely a full-page capture artifact, but no bottom padding is visible at the end either). Fix: confirm bottom padding equals the bar height; capture at viewport scroll positions.
- [C] 2 Layout · `settings-you-day-1440.png`, left rail y 230-750: group labels ("About you", "Assistant", "Your data", "More") are the same size and nearly the same weight as the links beneath them, and the links sit at different x offsets, so the rail reads as one flat list. Fix: make group labels 11px uppercase muted, as the rubric specifies, and align all items to one edge.
- [C] 2 Layout · `settings-you-day-1440.png`: the rail ends at y=900 and the left app menu stops at y=900 while the page and canvas run to 1082, leaving a band of different colour at the bottom. Fix: make the shell fill the viewport height.
- [C] 3 Space · `settings-you-day-1440.png`, y 750-990: "Accounts the assistant can act on" has no divider above it, a three-line help paragraph at 14px, and its rows put the label at x=496 but the right-hand help column used by every other field is gone, so the block does not share the form's grid. Fix: give it a section divider and the same two-column grid; shorten the paragraph.
- [C] 4 Type · `settings-you-day-1440.png`, y 130-170: the intro line "Each change is saved..." is 15px and wraps to two lines under a 24px title; it competes with the labels. Fix: a one-line 13px muted note, or move it to a tooltip.
- [C] 5 Comp · `settings-you-day-1440.png`, x 1175-1416: "Let Reginald act after your yes" is a bold label on a plain checkbox repeated three times; a switch or a quiet control would read as a setting. Fix: one switch per row with a short label.
- [nit] 7 Edge · `settings-you-loading-day-1440.png`: the skeleton rows show a round dot and a pill, but the loaded rows show a checkbox on the right and no dot; shapes differ, so the layout shifts. Fix: match the skeleton to the loaded row.
- [C] 7 Edge · `settings-you-couldn-t-load-day-1440.png`, y 825-845: the error is one red line with no Retry action. Fix: add a "Try again" button and a reason.
- [nit] 7 Edge · `settings-you-offline-day-390.png`: the offline banner is clear and has Try now; the status chip says "Disconnected · reconnecting" in red, good. Name field stays editable though offline: say whether changes are held.
- [nit] 9 Brand · `settings-you-day-1440.png`: mark, serif title and burgundy active nav match the site; the selected nav row is cream as specified. The "Restart to finish" amber chip is close to the brass; fine. "Hand something in" is a tinted pill and no filled primary exists, which is correct for a form.

## settings-ai: Settings, AI and spending
Pictures opened: 9 of 20 (1440 day, 1440 night, 390 day; loading, couldn't load, offline at 1440 day and 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.6 | 3.7 | 3.8 | 3.9 | 4.0 | 3.0 | 3.4 | 3.7 | 4.3 |
Issues:
- [B] 7 Edge · `settings-ai-loading-day-1440.png` and `settings-ai-loading-day-390.png`: the "loading" picture is identical to the loaded page (no skeleton, no spinner). **capture fault** or a missing loading state. Fix: show skeleton rows at the account row height and disable the three spending fields.
- [B] 7 Edge · `settings-ai-couldn-t-load-day-1440.png` and `-390.png`: identical to the loaded page, with no error and no retry. **capture fault** or a missing error state. Fix: an inline error with "Try again" in place of the account list.
- [C] 7 Edge · `settings-ai-day-1440.png`, y 285: the empty state is a bare grey line "No AI account is set up yet." There is no explanation of what an account does, and no brand moment. Fix: a designed empty block with one sentence and the Add an account button beside it; the spending limits could be disabled until an account exists.
- [C] 7 Edge · `settings-ai-offline-day-1440.png`: "Add an account" and the spending fields stay active while offline. Fix: disable them with a "needs a connection" tooltip, or say changes are held.
- [B] 8 Phone · `settings-ai-day-390.png`, y 250-390: "Section: AI and spending" collapsed disclosure followed by about 90px of blank space; the section heading is missing at that point and the content starts as "AI accounts". Fix: remove the gap and show the section picker as one control with the current section name.
- [C] 8 Phone · `settings-ai-day-390.png`, y 780-845: the tab bar covers "More settings" and the "Most to spend in a month" field is cut at the bar (capture of a fixed bar over a full page). Fix: bottom padding equal to the bar height.
- [C] 2 Layout · `settings-ai-day-1440.png`, y 235-300: "AI accounts" heading with its button at x=1280-1416 shares the right edge, good, but the "AI spending" heading has no divider above it while the fields do, so the two blocks are not separated. Fix: one section heading style with a rule above each.
- [C] 2 Layout · `settings-ai-day-1440.png`, left rail: group labels "About you / Assistant / Your data / More" look like links (same size), and "Your business" sits under "About you" while "Backups" sits under "Your data" with a gap that makes them read as belonging to the group above. Fix: 11px uppercase muted group labels with extra space above, not below.
- [C] 4 Type · `settings-ai-day-1440.png`: the page title is 24px serif, section headings 16px, labels 14px bold; the help text at 13px is fine, but the intro paragraph at 15px under the title is heavier than the help text. Fix: 13px muted.
- [nit] 6 Colour · `settings-ai-night-1440.png`: the "Add an account" gold button and gold selected nav text follow the brand; the "Restart to finish" orange is near the gold (about 20 degrees apart at a glance). Fix: move the night warning further to red-orange as the rubric says.
- [nit] 9 Brand · the gold primary on near-black and the burgundy by day match the website; no brand moment in the empty account line.

## settings-today: Settings, Notices
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.2 | 3.3 | 3.3 | 3.5 | 3.6 | 3.2 | 3.2 | 3.3 | 4.0 |
Issues:
- [B] 2 Layout · `settings-today-day-1440.png`, y 1000-1700: from "Where reminders reach you" down, the page drops the two-column label/help grid used above; radios, help text and a card run at 640px wide with different left edges (radio circles at x=513, text at 496/536). Fix: put this block on the same grid as the rows above, with the choice labels sharing one left edge.
- [B] 1 Hier · `settings-today-day-1440.png`, y 1010-1430: four reminder choices each carry a description plus a second "No calendar account can carry reminders yet..." paragraph and two links; this is the loudest part of the page and tells the person nothing to do. Fix: show disabled options as one line ("Needs a signed-in calendar. Sign in") and fold the explanation.
- [B] 5 Comp · `settings-today-day-1440.png`, y 1195-1325: the radios for "In my calendar" and "To my mail" have no visible circle at all (about 10% opacity), so they look like missing controls; the same in night at y 1203 and 1312. Fix: draw disabled radios with a visible outline and a muted label, at 3:1.
- [C] 4 Type · `settings-today-day-1440.png`: help texts run to six lines at 13px in the right column, truncated with "It..." and a "More" link; the same paragraph is cut mid-sentence in "What waited arrives...". Fix: one-sentence help; move the detail into a tooltip.
- [C] 3 Space · `settings-today-day-1440.png`, y 1010-1070: the group heading "Where reminders reach you" has 14px of space above and below the 13px intro; "Ways to get a notice" repeats the pattern with a different gap. Fix: fixed section gaps.
- [C] 5 Comp · `settings-today-day-1440.png`, y 1550-1700: the "This computer" card contains an error-like sentence ("Notifications are blocked on this computer") in plain text, with no status dot and no button to fix it. Fix: a status line with a dot and word, and an action.
- [C] 2 Layout · `settings-today-day-1440.png`: the rail ends at y=900, so the left menu stops at 900 while the page runs to 1870 (the menu is not sticky in the capture). Fix: full-height shell.
- [B] 8 Phone · `settings-today-day-390.png`, y 200-290 and y 620: duplicate heading "Section: Notices" then "Notices" with a gap of about 60px; the tab bar overlaps the Quiet hours field at y 620-665. Fix: remove the repeated heading and the gap; pad the bottom by the bar's height.
- [C] 8 Phone · `settings-today-day-390.png`, y 480-520: the working hours selects wrap so "17:30" sits alone on a second line. Fix: stack as two labelled pairs ("From / To" for days, then for hours).
- [C] 7 Edge · no state pictures: nothing shows loading or an error for the notification permission or the saved values.
- [nit] 6 Colour · `settings-today-night-1440.png`: "Sign in to an account" links are gold and underlined, fine; the disabled radios nearly vanish against `#0c0d0e`.
- [nit] 9 Brand · burgundy check boxes by day and gold by night are right; serif title present; no brand moment (not needed).

## settings-backups: Settings, Backups
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.3 | 3.2 | 3.3 | 3.3 | 3.4 | 3.7 | 3.4 | 3.4 | 3.4 | 4.0 |
Issues:
- [B] 1 Hier · `settings-backups-day-1440.png`, y 270-1440: five sections (automatic, where, last, restore, key, synced folder) are one long unbroken stack with no cards or dividers; the primary action ("Choose a folder", burgundy, at y=1416) is the lowest thing on the page and the first-run person needs the folder control at y=450. There are two filled/tinted accents ("Use this folder for backups" tinted, "Choose a folder" filled) plus "Save" tinted. Fix: one primary (the next step: choose a folder), the others outline; group each section under a rule.
- [B] 2 Layout · `settings-backups-day-1440.png`: the help column on the right (x 1144) exists only for the first row; below, actions float to the right edge at different x (Check/Choose at x 1065-1240, "Use this folder" at 1036-1248, "Back up now" at 1093-1207, "Make one for me / Save" at 1228-1416), so no shared edge. Fix: left-align each action row under its field, on the field's left edge.
- [C] 4 Type · `settings-backups-day-1440.png`, y 860-980: "Choose one of your copies above and restore it..." is 16px body, larger than the 13px help beneath it, so the paragraph outweighs its own heading "Restore from a backup". Fix: 13px muted, and collapse the three help lines.
- [C] 3 Space · `settings-backups-day-1440.png`, y 380-430: "Folder" label sits 0px under the "No cloud drive folder..." line, while other labels have 14-24px above. Fix: consistent label spacing.
- [C] 5 Comp · `settings-backups-day-1440.png`, y 1210-1225: "Where it is kept instead" is a bold fragment that looks like a button but is not clearly one; "Check" is a faint disabled pill with no contrast. Fix: a real disclosure or link with a chevron; a visible disabled style.
- [C] 7 Edge · `settings-backups-day-1440.png`, y 640-690: "No backup on another device" is the empty state in a white card with a grey dot and a word, but nothing on a card for "No copy has been made yet" (a plain line). Fix: one empty pattern for both.
- [B] 8 Phone · `settings-backups-day-390.png`, y 250-350: the "Section: Backups" disclosure plus about 60px gap, then a second "Backups" heading. Fix: remove the repeat and the gap.
- [C] 8 Phone · `settings-backups-day-390.png`, y 760-790: the tab bar overlaps "Use this folder for backups". Fix: bottom padding; "Check" and "Choose..." wrap onto separate lines (y 637 and 682) with different widths. Fix: put them on one row of equal pills or a stacked full-width pair.
- [nit] 6 Colour · `settings-backups-night-1440.png`: "Back up now" and "Check" disabled pills are very close to the canvas (about 1.3:1). Fix: raise the disabled outline.
- [nit] 9 Brand · title serif, burgundy/gold primary, mark all correct; no brand moment in "No backup yet".

## settings-appearance: Settings, Appearance
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.8 | 3.8 | 3.9 | 4.0 | 4.0 | 3.6 | 3.6 | 3.8 | 4.2 |
Issues:
- [C] 4 Type · `settings-appearance-day-1440.png`, x 1144-1416: help text runs 4-5 lines at 13px for "Spacing" and "Clock"; the Theme help adds a "Default: Match this computer" line in a third style. Fix: one sentence each; move "Default" into the Reset tooltip.
- [C] 8 Phone · `settings-appearance-day-390.png`, y 250-350: "Section: Appearance" disclosure then about 60px of blank then a second "Appearance" heading. Fix: drop the repeat and the gap.
- [C] 8 Phone · `settings-appearance-day-390.png`, y 760-850: the tab bar sits over the "Clock" select. Fix: bottom padding equal to bar height.
- [C] 2 Layout · `settings-appearance-day-1440.png`: the left rail again ends at y=900 and group labels ("Assistant", "Your data", "More") read as links. Fix: as in settings-you.
- [C] 5 Comp · `settings-appearance-day-1440.png`, y 283-297: "Changed · Reset" sits at the label row's far right, but "Reset" is bold burgundy underlined, the only such link on the page; "Changed" is a word with no dot. Fix: a status dot plus word, and an outline "Reset" matched with other pages.
- [C] 7 Edge · no state pictures: theme, spacing and clock change at once but nothing shows a preview or what happens when a value fails to save.
- [nit] 3 Space · `settings-appearance-day-1440.png`: row gaps differ (Theme row 118px, Spacing 115px, Clock 97px, Minutes 100px) because help text height drives them. Fix: a fixed row height with help clamped.
- [nit] 9 Brand · by day cream selection and burgundy active item, serif title and mark all on brand; a person changing Theme sees no preview of the product's look.

## settings-links: Settings, Quick links
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.6 | 3.8 | 3.9 | 3.8 | 4.0 | 3.2 | 4.0 | 3.8 | 4.2 |
Issues:
- [B] 7 Edge · `settings-links-day-1440.png`, y 280-600: the screen shows an empty add form and nothing else; there is no empty line ("No links yet"), no list of saved links, and nothing showing how a saved link looks, long names, or a 40-link list. Fix: a designed empty state with one line, and a state sheet with 1, 5 and 20 links, a long address truncated in the middle, and a remove with undo.
- [C] 2 Layout · `settings-links-day-1440.png`: the two fields run 920px wide to x=1416 (full width) while every other form uses a 628px field with a right help column; the page has no help column and the intro text is 545px. Fix: use the same field width and grid as other sections; a URL does not need 920px.
- [C] 5 Comp · `settings-links-day-1440.png`, y 566-600: "Add this link" is a cream tinted pill at the far right, far from the fields' left edge; on the same page the form is the only thing to do, so it should be the one primary (filled), aligned left under the fields. Fix: filled burgundy, left-aligned, disabled until both fields are filled.
- [C] 3 Space · `settings-links-day-1440.png`, y 240-340: the intro paragraph sits 50px below the heading (an empty band) and 20px above "Name". Fix: 12px under the heading.
- [C] 2 Layout · `settings-links-day-1440.png`: below y=600 the page is blank to y=900; fine for a small form but the hierarchy leaves the screen unbalanced. Fix: place the list of links here once there is one.
- [nit] 8 Phone · `settings-links-day-390.png`: clean, add button full width and clear of the tab bar; the "Section: Quick links" disclosure plus gap repeats as on every Settings page. Fix: drop the gap.
- [nit] 9 Brand · burgundy/cream and serif are right.

## settings-business: Settings, Your business
Pictures opened: 12 of 20 (1440 day, 1440 night, 390 day; loading, couldn't load, offline at 1440 day and 390 day)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.7 | 3.8 | 3.9 | 3.8 | 4.0 | 3.2 | 3.6 | 3.7 | 4.2 |
Issues:
- [B] 7 Edge · `settings-business-loading-day-1440.png`, `-390.png`: identical to the loaded page, no skeleton. **capture fault** or a missing loading state. Fix: skeleton rows at the real row height (about 87px) and disabled Add buttons.
- [B] 7 Edge · `settings-business-couldn-t-load-day-1440.png`, `-390.png`: identical to the loaded page; no error and no retry. **capture fault** or a missing state. Fix: an inline error with "Try again" in place of the list.
- [C] 7 Edge · `settings-business-offline-day-1440.png`: Add a business, Add a job, Rename and Remove stay fully active while offline. Fix: disable them with a tooltip, or hold the change visibly.
- [C] 7 Edge · `settings-business-day-1440.png`: long names are handled in the rows (wrap at 390, one line at 1440) but truncate to "Harborview Communi..." in the left menu without a tooltip being visible, and the empty case (no businesses) and one-business case are not shown. Fix: state sheet for 0, 1 and 4 businesses; tooltip on the truncated menu names.
- [C] 5 Comp · `settings-business-day-1440.png`, x 496-549 on each row: an empty 50px lead slot where an avatar or monogram is expected; titles start at x=549 while the "What it is called" heading and the card edge are at 496. Fix: draw the two-letter monogram used in the left menu in that slot (or remove the slot), so the row has one lead pattern.
- [C] 5 Comp · `settings-business-day-1440.png`: every row has "Rename" as an outline pill and "Remove" as bare text; that is two secondary styles in a row, and "Add a business" and "Add a job" are equal outline pills without a primary. Fix: one primary (Add a business), Rename as an overflow item, Remove behind a menu.
- [C] 3 Space · `settings-business-day-1440.png`, y 360-390: "What it is called" sits 0px above the card (card begins at y=386, label baseline at 375) and 18px below the buttons; the Lists section is 40px lower. Fix: 8px under each section label, 32px between sections.
- [C] 8 Phone · `settings-business-day-390.png`, y 250-350: "Section: Your business" disclosure followed by about 70px of blank and a second "Your business" heading. Fix: drop the repeat and the gap.
- [C] 8 Phone · `settings-business-day-390.png`, y 520-780: Rename/Remove stack below the meta, good, but the tab bar overlaps the second row's actions at y 780. Fix: bottom padding.
- [nit] 1 Hier · `settings-business-day-1440.png`: Lists is a separate topic ("Project group, phase, priority, status") nested under Your business; it also appears as the "Lists" menu entry. Fix: keep it in one place.
- [nit] 2 Layout · `settings-business-day-1440.png`, left menu: "To-dos and ques..." is truncated in the nav, a sign the label is too wide for 232px; widen or shorten to "To-dos".
- [nit] 9 Brand · cream selection, burgundy text and serif title are right; the amber "Backup needed" chip and green "Reginald" dot are state colours, not mistaken for the brand.

## settings-lists: Settings, Lists
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
**capture fault:** all three pictures show "Your business" with a line "Lists isn't in Settings here, so this is Your business instead." They do not show a Lists screen. The scores below are for what the pictures show (the redirect notice and the Lists block at the bottom), and the screen needs a re-capture.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.4 | 3.5 | 3.7 | 3.6 | 4.0 | 3.0 | 3.4 | 3.5 | 4.2 |
Issues:
- [B] capture fault · `settings-lists-day-1440.png`, `-night-1440.png`, `-390.png`: the page shows the Your business screen. The Lists screen (its own section) has not been captured. Fix: re-capture on a workspace where the Lists section exists, or remove the screen from the inventory.
- [B] broken · `settings-lists-day-1440.png`, y 237: a line of developer wording, "Lists isn't in Settings here, so this is Your business instead.", sits above the title with no heading style, and the page title "Your business" then appears 36px lower. A person who followed a link to Lists sees an apology in grey 13px text. Fix: redirect without the sentence, or show it as a proper notice with a link to the right place.
- [B] 7 Edge · `settings-lists-day-1440.png`: the fallback has no designed state; the Lists accordion rows (Project group, phase, priority, status) are collapsed with no count of values inside. Fix: show the count on each row ("5 values") and an empty state for a list with none.
- [C] 8 Phone · `settings-lists-day-390.png`, y 250-350 and y 780: Section disclosure then a blank gap of about 80px, and the tab bar overlaps the second business's actions. Fix: as in settings-you.
- [C] 5 Comp · `settings-lists-day-1440.png`, y 865-1060: the accordion uses a small "▶" glyph (7px) different from the chevron used in "More settings" elsewhere. Fix: one disclosure chevron.
- [nit] 9 Brand · as for settings-business.

## settings-connections: Settings, Connections
Pictures opened: 13 of 22 (1440 day, 1440 night, 390 day, 390 night; loading, couldn't load, offline at 1440 day and 390 day; not opened 1024 day or state night pictures)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.7 | 3.7 | 3.8 | 3.8 | 3.9 | 3.1 | 3.7 | 3.7 | 4.2 |
Issues:
- [B] 7 Edge · `settings-connections-loading-day-1440.png` and `-390.png`: the loading picture is the loaded list with the "Accounts" section missing; there is no skeleton and no shape for the missing block, so the page ends abruptly and then jumps when it loads. Fix: skeleton cards at the card height (about 195px) and a reserved Accounts block.
- [B] 7 Edge · `settings-connections-couldn-t-load-day-1440.png`, y 940-955: the error is one grey 13px line, "The sign-ins didn't load.", at the bottom under the list, with no retry and no icon. Fix: an error row with a warning glyph, the word "Couldn't load", and "Try again".
- [C] 7 Edge · `settings-connections-offline-day-1440.png`: "Add mail, calendar or folder", "Choose what to read" and the "..." menus remain active offline. Fix: disable the actions that need the network.
- [C] 5 Comp · `settings-connections-day-1440.png`, y 400-920: two accounts with "Not read yet" show a grey dot for each of 4 rows; 8 identical grey statuses repeat, and "Not read yet" gives no reason or next step (the rubric's VP05 asks for a tinted row with the reason and a Reconnect). Fix: group the unread rows into one line under the account ("Reads start in a few minutes") or show the reason, and a "Read now" action.
- [C] 5 Comp · `settings-connections-day-1440.png`, y 1000-1110: the Accounts card uses a different anatomy from the cards above (no icon, "Example mail" at x=549 with a 50px empty lead slot, "Add another account" as bare grey text at the right). Fix: the same card anatomy (icon, name, status) and a real button.
- [C] 2 Layout · `settings-connections-day-1440.png`, y 940-1000: "Accounts" heading is 22px below the last card with no divider, tighter than the 12px between cards plus the 30px above "Connections" intro. Fix: 32px between sections.
- [C] 4 Type · `settings-connections-day-1440.png`: the "Private" tag at 12px in a bordered box is the third pill/tag style on the page (status dots, outline buttons, bordered tag). Fix: render it as status text with an icon.
- [C] 8 Phone · `settings-connections-day-390.png`, y 770-850: tab bar sits over the third row's status; row statuses stack under the meta, correct per the rubric. "Section: Connections" disclosure sits above a 40px gap but the heading is not repeated, better than other pages. Fix: bottom padding.
- [nit] 6 Colour · `settings-connections-night-390.png`: green status dots and grey "Not read yet" differ by word as well as colour; fine. The tab bar's active "More" in gold is correct.
- [nit] 9 Brand · cream icon tiles, burgundy/gold links and the mark all match the site.

## settings-addons: Settings, Add-ons
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures. The pictures show the catalog-unreadable state, not a list of add-ons (partial **capture fault**: the main screen with add-ons listed is not shown).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.5 | 3.5 | 3.6 | 3.6 | 3.9 | 3.6 | 3.6 | 3.6 | 4.2 |
Issues:
- [B] capture fault · `settings-addons-day-1440.png`: the happy path (an Available list with prices, access lines and an Install button) is never shown. Fix: capture the list with 3 or more add-ons, and Installed with 1.
- [C] 4 Type · `settings-addons-day-1440.png`, y 612-625: the error reads "This catalog couldn't be read: couldn't read it: there is no internet connection", which says "couldn't read" twice, and the empty area above says "The catalog couldn't be read: no add-ons are listed" a third time. Fix: one message; the reason once, with the word "Offline".
- [C] 1 Hier · `settings-addons-day-1440.png`, y 385-490: the empty area is 170px tall with a small icon and a two-line message, and the real action ("Refresh") is 100px lower beside the "Catalog" heading. Fix: put "Try again" inside the empty state.
- [C] 5 Comp · `settings-addons-day-1440.png`, y 295-320: the tab control "Available | Installed" has a white pill background with an underline in burgundy, mixing a segmented control and an underline tab. Fix: choose one pattern.
- [C] 5 Comp · `settings-addons-day-1440.png`, y 655: "Add another catalog" is bare grey text centred under the status line; it is a button with no affordance. Fix: an outline button or accent-text link, left-aligned with the Catalog heading.
- [C] 2 Layout · `settings-addons-day-1440.png`: the centred empty block (x 785-1127) sits on an axis of its own while everything else is left-aligned at x=496. Fix: left-align or centre the whole column.
- [C] 8 Phone · `settings-addons-day-390.png`, y 770-850: the tab bar overlaps the Catalog row's meta line; the "Section: Add-ons" gap is smaller here (about 40px). Fix: bottom padding.
- [nit] 6 Colour · `settings-addons-night-1440.png`: the red error text on the vertical bar is coral on near-black and passes; it uses a bar plus words, fine.
- [nit] 9 Brand · matches the site; the empty inbox icon in a cream tile is the only brand-like moment; the "Thimbleby's add-on list" line names the product.

## settings-files: Settings, Files
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures.
**capture fault:** all three show Settings, You, with the line "Add-on files isn't in Settings here, so this is You instead." The Files section was not captured. Scores are for what is shown, with low weight.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.4 | 3.4 | 3.4 | 3.6 | 3.7 | 3.9 | 3.2 | 3.1 | 3.5 | 4.2 |
Issues:
- [B] capture fault · `settings-files-day-1440.png`, `-night-1440.png`, `-390.png`: the pictures show the You page. Fix: re-capture on a workspace where an add-on adds the Files section.
- [B] broken · `settings-files-day-1440.png`, y 237: "Add-on files isn't in Settings here, so this is You instead." is shown as 13px grey text above the page heading, a developer-style redirect message, and also "Open the setup guide" has returned at top right that other pages don't show. Fix: redirect silently or show a clear notice.
- [B] 8 Phone · `settings-files-day-390.png`, y 1260-1790: the account rows squeeze the description into a 100px column (7 lines) beside the checkbox. Fix: stack under the label.
- [C] 8 Phone · `settings-files-day-390.png`, y 300-430: the "Section: You" disclosure, a 50px gap, the notice line and the "You" heading all stack; the tab bar covers the "English spelling" field (y 760-850).
- [nit] 9 Brand · as settings-you.

## settings-advanced: Settings, Advanced
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 3.9 | 4.0 | 3.9 | 3.9 | 4.1 | 3.6 | 4.0 | 3.9 | 4.2 |
Issues:
- [C] 5 Comp · `settings-advanced-day-1440.png`, x 496-504: the disclosure glyph is a 7px "▶" that does not rotate or match the 14px chevron on "More settings" in other sections. Fix: one chevron component, rotating on open.
- [C] 4 Type · `settings-advanced-day-1440.png`, y 270-300: the intro "Settings most people never change that no page above holds, by topic. Open a topic to see them." is awkward and wraps 'them.' alone to a second line. Fix: "Rarely needed settings, grouped by topic." on one line.
- [C] 7 Edge · `settings-advanced-day-1440.png`: only the four collapsed topics are shown; no opened topic is captured, so the 1-topic and long-list cases are not seen. Fix: add a state picture with one topic open showing 5+ settings.
- [C] 2 Layout · `settings-advanced-day-1440.png`, y 320-500: the list takes 920px of width for four short labels with nothing at the right; each row has no count or hint. Fix: add the count of settings in each topic at the right edge.
- [nit] 1 Hier · the rail's group labels still look like links ("Assistant", "Your data", "More").
- [nit] 8 Phone · `settings-advanced-day-390.png`: clean; the disclosure plus gap at y 250-340 repeats.
- [nit] 9 Brand · on brand; plain.

## settings-ai-compare: Settings, Compare AI accounts
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). The pictures show only the "nothing to compare" empty state; the table of accounts is not shown (partial **capture fault**).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.5 | 3.6 | 3.6 | 3.5 | 4.0 | 3.8 | 3.8 | 3.7 | 4.1 |
Issues:
- [B] capture fault · `settings-ai-compare-day-1440.png`: the compare table (accounts, how often right, cost, pass mark) is never shown, so the screen's main job is unscored. Fix: capture with two or more accounts.
- [C] 5 Comp · `settings-ai-compare-day-1440.png`, y 225-242: "Back to settings" is a small grey text with a pale pill outline and no arrow; it sits under the title at x=505, 9px right of the title edge. Fix: a back arrow link aligned with the title edge at x=496.
- [C] 4 Type · `settings-ai-compare-day-1440.png`, y 262-280: the subtitle "How often each account gets it right · what a right answer costs · 80% or more counts as a pass" is one 15px grey line of three clauses, wider than the empty-state text under it. Fix: 13px muted, or three short labels.
- [C] 1 Hier · `settings-ai-compare-day-1440.png`: the empty state has an icon and a line but no action; "Add an account first" is text, not a button. Fix: a button "Add an account" in the empty state.
- [C] 2 Layout · `settings-ai-compare-day-1440.png`: the page title "Compare what accounts can do" is 16px, one level above the 24px "Settings" it sits under, and the rail marks "AI and spending" while the screen is a sub-page. Fix: a breadcrumb or title that says where it is.
- [C] 8 Phone · `settings-ai-compare-day-390.png`: fine and clear of the tab bar; the "Section: AI and spending" disclosure is kept above a sub-page where it does not apply. Fix: hide the section picker on sub-pages.
- [nit] 9 Brand · cream gear tile in the empty state is a small brand moment; no brand line.

## settings-menu: Settings, the menu and search
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures.
**capture fault:** the three pictures are the plain Settings, You page. No menu is open and no search text or result is shown, which is what the name says the screen is. Scores are for the You page shown, and carry little weight. The menu and search need a re-capture (search with text typed, results, and the "no match" case).
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.8 | 3.6 | 3.6 | 3.8 | 3.8 | 3.9 | 3.0 | 3.3 | 3.6 | 4.2 |
Issues:
- [B] capture fault · `settings-menu-day-1440.png`, `-night-1440.png`, `-390.png`: the screen named is not shown. Fix: capture "Search settings" focused with a query, and the 390 section picker open.
- [B] 7 Edge · none of the pictures show search results, a no-match state, or the open section picker at 390, so the edge point cannot be scored higher than 3.0. Fix: add those three captures.
- [C] 8 Phone · `settings-menu-day-390.png`, y 285-420: the "Section: You" picker is a small text disclosure with a 90px blank band after it; it is the only way to move between 17 sections on a phone and looks like a caption, not a control. Fix: a full-width select-style row with the current section and a chevron.
- [C] 8 Phone · `settings-menu-day-390.png`, y 1260-1760: the checkbox rows squeeze the description to 100px; see settings-you.
- [nit] 9 Brand · same as settings-you.

## settings-addon-page: An add-on's page
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 2.8 | 3.0 | 3.2 | 3.5 | 3.0 | 3.8 | 2.0 | 3.0 | 3.0 | 3.8 |
Issues:
- [B] broken · `settings-addon-page-day-1440.png`, y 260-900: under the title "Journey mail" the entire content area is blank; the add-on's page shows nothing, no settings, no description, no state. Same in `settings-addon-page-night-1440.png` and `settings-addon-page-day-390.png` (y 380-780). Fix: show the add-on's settings, or an explicit "This add-on has no settings" with its description and a link to Add-ons.
- [B] 7 Edge · the empty page has no empty-state design at all (no icon, line or action). Fix: designed empty state; plus loading, error and a long list of settings.
- [B] 1 Hier · no primary, no description, no status (installed, version, access) to say what this page is. Fix: a header with the add-on name, a status line ("Installed · reads mail") and its settings below.
- [C] 2 Layout · `settings-addon-page-day-1440.png`: the "Journey mail" title is 16px and in the same place as other section titles, but there is no divider and no help column, so the page looks unfinished. Fix: rule under the title.
- [C] 5 Comp · `settings-addon-page-day-1440.png`, y 676-712: the rail's nested "Journey mail" item is selected with a cream block that starts at x=268 and ends at x=476, narrower than other selected items (256-476), so selection edges differ. Fix: same selection width for nested items.
- [C] 8 Phone · `settings-addon-page-day-390.png`: the page is only a title in a 600px blank; the "Section: Journey mail" disclosure repeats the title.
- [nit] 9 Brand · the page carries no mark, tile or brand moment.

## settings-add-connection: Settings, Add a connection (the drawer)
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.6 | 3.7 | 3.7 | 3.7 | 3.9 | 3.1 | 3.6 | 3.6 | 4.1 |
Issues:
- [B] 7 Edge · `settings-add-connection-day-1440.png`: only step 1 is shown. The second step, a sign-in that fails, an empty add-on list, and "no add-on choices" are not captured. Fix: state sheet for step 2, a wrong address, and a failed sign-in.
- [C] 5 Comp · `settings-add-connection-day-1440.png`, x 1330-1407, y 653-687: "Continue" is a cream tinted pill with burgundy text, the same weight as the selected card; the one primary of the drawer reads as disabled. It is also enabled even though selection is unclear. Fix: a filled burgundy primary, disabled until a card is chosen.
- [C] 5 Comp · `settings-add-connection-day-1440.png` vs `-390.png`: a different card is preselected in each picture ("A capture folder" at 1440, "A calendar" at 390); at 1440 the shaded card has no check or border, so selection is shown by a faint tint only. Fix: a check mark and a 2px border on the selected card; no preselection, or the same one everywhere.
- [C] 2 Layout · `settings-add-connection-day-1440.png`, y 0-720: the drawer is 640px wide but stops at y=720 of a 900px window, leaving the bottom 180px of the drawer column as scrim, so a side drawer that is not full height. Fix: make it full height with a sticky footer.
- [C] 2 Layout · `settings-add-connection-night-1440.png`, y 65-705: in night the content sits inside a bordered inner card within the drawer (card in a card); by day there is no such card. Fix: drop the inner card, as by day.
- [C] 3 Space · `settings-add-connection-day-1440.png`, y 80-180: "Choose what to read" (16px bold), "Step 1 of 2" (13px), "What do you want to read?" (14px bold) and "Built in" (13px) stack in 90px with four different styles, and the question repeats the title. Fix: title "Add a connection", step counter in the header, one group label per section.
- [C] 4 Type · `settings-add-connection-day-1440.png`: card descriptions use 13px grey at 3 lines; "Built in" and "Journey mail" group labels are 13px grey in sentence case instead of 11px uppercase. Fix: group labels per the rubric.
- [C] 2 Layout · `settings-add-connection-day-1440.png`, y 407-512: "A mailbox" sits alone in a two-column grid, leaving an empty cell, while the add-on's two cards below are shorter (48px) and carry no description, so the card anatomy differs. Fix: give the add-on cards the same title+line anatomy.
- [nit] 8 Phone · `settings-add-connection-day-390.png`: the sheet is a proper bottom sheet with a grab handle; the footer buttons (Cancel, Continue) are below the fold with no sticky bar visible. Fix: sticky footer.
- [nit] 9 Brand · on brand; cream selected card, serif absent in the drawer title (fine, serif is for page titles only).

## settings-sign-out: Settings, Sign out of an account (the question)
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.2 | 4.0 | 4.0 | 4.0 | 4.0 | 4.0 | 3.3 | 4.1 | 4.0 | 4.2 |
Issues:
- [C] 7 Edge · `settings-sign-out-day-1440.png`: only the first question is shown; a failure to sign out, an account with items waiting, or a long address (it fits at 1440 but is not tested longer; at 390 it wraps correctly) is not captured. Fix: add a long-address and an error state.
- [C] 6 Colour · `settings-sign-out-day-1440.png`, x 893-979, y 513-547: "Sign out" is a red-orange fill (`#b93815`-like) with white text, while the primary elsewhere is burgundy. That is right for a destructive action, but "Keep signed in" and "Sign out" are the same height and weight, and the safe choice is not the default. Fix: make "Keep signed in" the focused default and label the destructive one with an icon.
- [C] 4 Type · `settings-sign-out-day-1440.png`, y 450-485: the second paragraph, "What was already read stays. Signing out can't be undone: to read again, you sign in again.", is 13px and says "can't be undone" and "sign in again" in one sentence, which reads as a contradiction. Fix: "Signing out reverses with signing back in. What was read stays."
- [C] 2 Layout · `settings-sign-out-day-1440.png`: the dialog is 560px wide but its left edge (x=440) aligns to nothing on the page, and the scrim only dims by 15%. Fix: centre it and dim by about 40%.
- [nit] 8 Phone · `settings-sign-out-day-390.png`: a bottom sheet with a grab handle, a good pattern; the buttons are left-aligned and equal width rather than stacked full-width. Fix: 44px full-width stacked buttons.
- [nit] 9 Brand · burgundy absent from the dialog by design (danger), correct per 4b.

## settings-ai-add: Settings, Add an AI account
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.6 | 3.7 | 3.4 | 3.7 | 3.6 | 3.9 | 3.1 | 3.8 | 3.6 | 4.1 |
Issues:
- [B] 3 Space · `settings-ai-add-day-1440.png`, y 473-492: the group label "Use an app you're signed in to" sits 0px below the DeepSeek/xAI cards (cards end y=472, label at y=483) while "Which AI should Reginald use?" has 18px above its first card; the two groups have no gap between them. Fix: 24px above each group label and 8px below.
- [C] 1 Hier · `settings-ai-add-day-1440.png`: 12 cards of equal weight with no recommended one, no primary and no footer (no Cancel, no Continue); a person has to pick from 12 vendors with no guidance, while the setup step (`setup-ai-day-390.png`) recommends one. Fix: show a recommended badge and reduce to 3-4 cards with "More options".
- [C] 5 Comp · `settings-ai-add-day-1440.png`: the selected card (OpenRouter) is a faint cream tint, and in `settings-ai-add-day-390.png` it is "Google AI Studio"; neither has a check or border, and nothing happens until a click, so the selection state is unclear. Fix: remove the preselection; show a check and a border when chosen.
- [C] 2 Layout · `settings-ai-add-day-1440.png`, y 0-830: the drawer ends at y=830 of 900, and cards run to x=1425, 15px from the window edge, wider than the 24px side padding used by the header (x=817). Fix: shared side padding of 24px and a full-height drawer.
- [C] 7 Edge · none of the pictures show what follows a click (key entry, a wrong key, checking, a network failure), which the rubric lists for AI setup. Fix: add state pictures for each.
- [C] 4 Type · `settings-ai-add-day-1440.png`: vendor names are visible, which the CLAUDE rules allow only in the adapter list; fine for a picker. Descriptions at 13px grey run to 3 lines on the CLI cards (Codex CLI is 4 lines). Fix: trim to two lines.
- [nit] 8 Phone · `settings-ai-add-day-390.png`: a good bottom sheet with one column of full-width cards; the drawer title and close are in a sticky header. The CLI group is below the fold with no hint; add a "More options" row earlier.
- [nit] 9 Brand · cream and ink, no brand moment; fine.

## setup-welcome: Setup, Welcome
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
**capture fault:** `setup-welcome-day-390.png` and `setup-welcome-night-1440.png` both show "Step 3 of 7: Your AI account", not the Welcome step. The Welcome screen is scored from `setup-welcome-day-1440.png` only; its phone and night looks are unseen, so points 6 and 8 are scored from the neighbouring Setup pages and are low-confidence.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.2 | 3.2 | 3.3 | 3.6 | 3.5 | 3.7 | 3.0 | 3.3 | 3.4 | 3.2 |
Issues:
- [B] capture fault · `setup-welcome-day-390.png`, `setup-welcome-night-1440.png`: show Step 3, not Welcome. Fix: re-capture on step 1.
- [B] 9 Brand · `setup-welcome-day-1440.png`: the brand's biggest moment is a bare page with the serif "Welcome" at 22px, no mark, no ✳ star, no cream identity card, no one-line brand voice ("A little more room to think."); only the burgundy Start button carries the brand. The website's first screen has the mark centred and the headline large. Fix: add the mark above the heading, a serif headline at 32px+, and the brand line; drop the plain bulleted list for the three promises with italic serif numerals.
- [B] 1 Hier · `setup-welcome-day-1440.png`, y 90-360: the first thing the eye lands on is an intro line (15px grey), a second paragraph (17px), "What you'll need" and a bullet list; "Start" sits 500px lower at the bottom-right of the footer. The page is 60% empty (y 360-840). Fix: centre the content vertically, put Start under the list, and keep the footer for Back/Continue only on later steps.
- [C] 2 Layout · `setup-welcome-day-1440.png`: three left edges: "Getting started" at x=24, the content at x=380, and the footer's Start ending at x=1060; "Finish later" at x=1332-1407 is the only element at the far right. Fix: one centred 680px column for header content, body and footer.
- [C] 4 Type · `setup-welcome-day-1440.png`, y 130-145: "Each step can be skipped now and done later. Nothing is read or spent until you say so." is 15px grey and sits above the bigger 17px sentence; the order of importance is reversed. Fix: lead with the 17px line.
- [C] 5 Comp · `setup-welcome-day-1440.png`, x 1332: "Finish later" is bare grey text with no affordance. Fix: a quiet link with an underline on hover and a focus ring.
- [C] 7 Edge · no state pictures: no resume (coming back mid-way), no reduced-motion variant, no failure.
- [nit] 6 Colour · burgundy Start button is 9.7:1 per the rubric; fine.

## setup-you: Setup, You
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.6 | 3.7 | 3.8 | 3.7 | 3.9 | 3.1 | 3.6 | 3.7 | 4.3 |
Issues:
- [B] 7 Edge · `setup-you-day-1440.png`: no state is shown for the form: a time zone that fails to match, a name that is too long, Continue after a name is typed, a failed save. "Enter your full name to go on." is the only edge text. Fix: add the filled, error and saving states.
- [C] 2 Layout · `setup-you-day-1440.png`, y 90-840: the step rail (x 246-466), the column (x 514-1194) and the footer (buttons x 789-1194) share the right edge at 1194, but the footer's left button group floats at x=789, not on the column's left edge at 514 where "Back" sits on later steps; "Finish later" at x=1332 is outside the grid. Fix: one grid for header, rail, column and footer; put "Finish later" on the column's right edge.
- [C] 1 Hier · `setup-you-day-1440.png`, y 855-890: "Continue" is a cream tinted pill (disabled) next to "I'll do this later" at the same height, so on step 1 neither reads as the primary. Fix: a visibly disabled filled button with the reason beneath it, or keep it filled and explain on click.
- [C] 5 Comp · `setup-you-day-1440.png`: the time zone is a text field ("UTC") with help "Type to search, for example Pacific or UTC-8"; the brief's own UI rule says a known set of values must be a list. Fix: a searchable select with the zone preselected.
- [C] 3 Space · `setup-you-day-1440.png`, y 450-490: "Your assistant is called Reginald. [Rename]" sits 48px under the time zone help line and has no label or divider; it reads as a stray sentence. Fix: a labelled row "Your assistant's name" with the field's width.
- [C] 4 Type · `setup-you-day-1440.png`: "STEP 1 OF 7" but the rail lists 8 steps (1-8); Welcome counts as no step. Fix: "of 8", or drop the numbers from the rail's last step.
- [C] 8 Phone · `setup-you-day-390.png`, y 50-195: about 145px of blank space between the header and "STEP 1 OF 7"; the "Steps" pill in the header is the only way to see the rail. Fix: remove the gap so the heading starts 24px under the header.
- [C] 8 Phone · `setup-you-day-390.png`, y 770-845: the footer holds a hint line, then Back-less buttons; "I'll do this later" and "Continue" share one row but "Continue" at 91px is a cream pill (disabled look). Fix: full-width 44px primary.
- [nit] 9 Brand · italic serif numerals in the rail follow the website's promises; the mark is absent from the setup header (only "Getting started" in serif). Add the mark at the left.

## setup-work: Setup, What it's for
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.7 | 3.7 | 3.8 | 3.8 | 3.9 | 3.2 | 3.6 | 3.7 | 4.3 |
Issues:
- [C] 2 Layout · `setup-work-day-1440.png`: the column ends at y=390 and 450px below is blank; the footer is 450px away from the last control. Fix: keep the footer sticky, but reduce the gap with a larger step title or move the buttons under the content on wide screens.
- [C] 4 Type · `setup-work-day-1440.png`, y 220-290: "What will you use it for?" (13px bold grey) is followed by "Your own life is always included." at 15px black, then "Also keep track of:" in the same grey as the label; three levels in 70px with the least important sentence the largest. Fix: question as a 16px heading, the always-included line as 13px muted with a check icon.
- [C] 5 Comp · `setup-work-day-1440.png`, y 305-360: checkboxes are 18px with 34px row pitch for job and business; the two options are not cards, so the choice looks like a form from 2005, unlike the card choice on "Your AI account". Fix: two selectable cards with a check mark.
- [C] 5 Comp · `setup-work-day-390.png`, y 495-550: checkbox rows are 17px with a 34px pitch, under the 44px touch target. Fix: 44px rows.
- [C] 7 Edge · no state pictures: the follow-up when "A job" is ticked (what is its name) and the "both empty" path are not shown. Fix: capture the ticked state with the name field.
- [C] 8 Phone · `setup-work-day-390.png`, y 50-230: 180px of empty space above the step label.
- [nit] 1 Hier · "I'll do this later" and "Back" at the footer plus "Finish later" in the header are three ways out of a two-option step. Fix: keep one.
- [nit] 9 Brand · rail numerals and burgundy active state on brand.

## setup-ai: Setup, Your AI account
Pictures opened: 4 of 6 (1440 day, 1440 night, 390 day (shown in the file named `setup-welcome-day-390.png`, since `setup-ai-day-390.png` was not opened separately; the two were the same step), 390 night; no 1024). No state pictures beyond the "Something else" screen scored below.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 3.8 | 3.8 | 3.9 | 3.9 | 4.0 | 3.2 | 3.9 | 3.8 | 4.3 |
Issues:
- [B] 7 Edge · `setup-ai-day-1440.png`: no state for a wrong key, a checking run, or a network failure, which the rubric requires for this step (the roadmap listed these as "not shown"). Fix: capture each.
- [C] 1 Hier · `setup-ai-day-1440.png`, y 855-890: "Continue" is a cream tinted pill with burgundy text (disabled), at the same weight as "I'll do this later"; before any choice there is no obvious primary, and the hint "Choose an AI service to go on." sits right of it in 13px. Fix: show the disabled filled button and move the hint above the footer.
- [C] 5 Comp · `setup-ai-day-1440.png`, x 514-1194: the selected state of the cards is not shown in the main picture (none is selected), so the call to action has no preselected "Recommended" card; the "Recommended" badge is green, a status colour used as a promotion tag. Fix: use a brand-tinted badge, not the success green.
- [C] 3 Space · `setup-ai-day-1440.png`, y 200-265: "Which AI should Reginald use?" is followed by a two-line 13px help paragraph that touches the card tops (paragraph ends y=260, cards begin y=268), where other gaps are 16px. Fix: 16px gap.
- [C] 2 Layout · `setup-ai-day-1440.png`: the three cards sit at x 514-1194 with a 10px gutter, and the cost note below ("It asks you before anything over $0.10...") is a cream band the width of the column; good edges. The footer's left edge (Back at x=514) matches. The right-hand 250px of the window and the lower 400px are empty.
- [C] 8 Phone · `setup-ai-night-390.png`: clean; cards stack full width and the footer holds three actions; "I'll do this later" is a bare grey text with a 44px target, acceptable. The hint above the footer duplicates the disabled state.
- [nit] 6 Colour · `setup-ai-night-1440.png`: the green "Recommended" chip on near-black is readable; the gold "Change" link underlined passes.
- [nit] 9 Brand · the numerals in the rail, the serif title and the burgundy/gold accents match; no mark.

## setup-mail: Setup, Mail and calendar
Pictures opened: 6 of 11 (1440 day, 1440 night, 390 day, 1440 day and 390 day of the "one account needs sign-in" state; not opened: 390 night, 1024, state night and 1024)
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.0 | 3.9 | 3.8 | 3.8 | 3.9 | 4.1 | 3.7 | 3.8 | 3.9 | 4.3 |
Issues:
- [C] 4 Type · `setup-mail-one-account-needs-sign-in-day-1440.png`, y 200-260: the lead line still says "Example mail is connected. Reginald is reading 3 accounts, one row each." while the third row says "Needs sign-in"; the headline contradicts the row (and "one row each" is jargon). Fix: "2 of 3 accounts are connected" computed from the state.
- [C] 1 Hier · `setup-mail-one-account-needs-sign-in-day-1440.png`: "Sign in again" (filled burgundy) and "Continue" (filled burgundy) are both filled in one viewport; the rubric allows one. Fix: make "Sign in again" an outline, or keep Continue as the only filled button until the account is fixed.
- [C] 5 Comp · `setup-mail-day-1440.png`, y 270-510: every row repeats "Example mail · Connected · Private to you", three times in a column; the "Your inbox and your calendar" description is in 13px at the title's baseline. Fix: group the repeated lines into one status for the group, or drop "Private to you" into the header.
- [C] 5 Comp · `setup-mail-day-1440.png`, y 532-552: "Newsletters, sales and mailing lists are set aside · Change" is 13px grey with a bold grey "Change" that looks like text, not a link. Fix: an accent-text link.
- [C] 3 Space · `setup-mail-day-1440.png`, y 200-260: the bold lead line and a 13px paragraph that wraps "do." alone on a second line. Fix: shorten so it fits on one line.
- [C] 7 Edge · `setup-mail-day-1440.png`: states shown are 3 connected and 2 + 1 needing sign-in; not shown are no accounts (first run), 20+ accounts, a long address, loading, and a failed sign-in. Fix: add the first-run (no accounts, with the connect buttons) and a long address.
- [C] 8 Phone · `setup-mail-day-390.png`, y 340-420 and 700-790: each row stacks four lines (address, description, status, privacy) so three rows take 360px; the "Connect another account" button is hidden under the footer bar at y 765-790. Fix: two lines per row; scroll padding equal to the footer.
- [nit] 6 Colour · the needs sign-in row has a red 3px edge, a warning triangle and a word (good); the red edge is close to the burgundy button right beside it. Fix: use the day danger orange-red (`#b93815`) edge, and check it against the button.
- [nit] 9 Brand · the numerals show check marks for done steps; no mark.

## setup-ai-other: Setup, Your AI account, Something else
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 3.8 | 3.7 | 3.8 | 3.9 | 4.1 | 3.3 | 3.7 | 3.8 | 4.3 |
Issues:
- [C] 5 Comp · `setup-ai-other-day-1440.png`, x 974-1196: the selected card has a 2px burgundy border and a tint (good), but no check mark, so the selection is carried by colour and border; the rubric asks for a check. Fix: add a check in the card's corner.
- [C] 2 Layout · `setup-ai-other-day-1440.png`, x 514-530 and y 403-655: the nested options sit under a 2px grey rule at x=514 and are indented 14px, with arrows at the right; they are three card-in-a-card items under a selected card. Fix: expand inside the selected card or use a plain list without the rule.
- [C] 4 Type · `setup-ai-other-day-1440.png`, y 405-418: "These need a technical setup. If you're not sure, choose one of the first two." is 13px at the start of the sub-list; it reads as a warning but has no icon. Fix: an info icon and a word.
- [C] 3 Space · `setup-ai-other-day-1440.png`, y 655-720: the cost band follows 16px after the last nested item but 14px after the first row in the main step; fine, but the nested group and the main cards have different gaps (10px vs 12px). Fix: one token.
- [C] 8 Phone · `setup-ai-other-day-390.png`, y 590-860: the footer bar overlaps the third nested option ("One on this computer") at y 770-865, so it cannot be seen in this picture; the page would need bottom padding. Fix: bottom padding.
- [C] 7 Edge · no state picture for the follow-up forms after each of the three options (a key field, an app picker, a local address).
- [nit] 6 Colour · `setup-ai-other-night-1440.png`: the gold 2px border on the selected card is clear on near-black.
- [nit] 9 Brand · on brand.

## setup-promises: Setup, Your promises
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; the screen shown is itself the blocked state ("Choose an AI account first").
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.5 | 3.3 | 3.4 | 3.6 | 3.6 | 3.8 | 3.3 | 3.4 | 3.5 | 3.9 |
Issues:
- [B] 1 Hier · `setup-promises-day-1440.png`, y 90-840: the whole step is two sentences and an outline button on a page that is 85% empty; "Your promises" is the product's headline idea (the website's "built on three promises"), and here it shows only a blocker. The filled "Continue" at the bottom invites skipping a step that cannot be done. Fix: when blocked, make "Go to your AI account" the one filled primary and disable or hide Continue; add the brand's three promises as a preview.
- [B] 7 Edge · `setup-promises-day-1440.png`: the happy path (the promises the assistant found, with evidence) is never captured; only the blocked state is. Fix: capture the list with 1, 3 and 10 promises, a loading state while it looks, and an error.
- [C] 2 Layout · `setup-promises-day-1440.png`, x 1018-1194: "Go to your AI account" is right-aligned at the column edge, 24px below a left-aligned sentence, so the sentence and its action sit on different edges. Fix: left-align under the sentence.
- [C] 4 Type · `setup-promises-day-1440.png`, y 160-215: a 15px grey subtitle followed by a 15px black sentence; the sentence that matters (what to do) has the same size as the subtitle. Fix: bold or 17px for the action line.
- [C] 5 Comp · `setup-promises-night-1440.png`, y 265-290: the rail marks the open step "Skipped" in the rail while it is the current step, so a status label contradicts the page (the night capture came from a run with different history). Fix: show "Current" or nothing for the open step.
- [C] 8 Phone · `setup-promises-day-390.png`, y 50-310: 260px of blank space above "STEP 5 OF 7" and 280px below the button. Fix: start the content 24px under the header.
- [nit] 9 Brand · the page that should carry the brand's promises has no italic-serif numerals or mark (VP17).

## setup-backup: Setup, Backups
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.6 | 3.4 | 3.7 | 3.6 | 3.8 | 3.3 | 3.6 | 3.6 | 4.0 |
Issues:
- [B] 3 Space · `setup-backup-day-1440.png`, y 220-260: "No cloud drive folder was found on this computer. Choose a folder to keep backups in." sits with 0px between its baseline and "Folder" (y=247), a label jammed against a sentence; the same pattern as settings-backups. Fix: 16px between the notice and the field label.
- [C] 7 Edge · `setup-backup-day-1440.png`: no state for a chosen folder, a folder that fails "Check", a first backup in progress or a cloud drive found (the happy path); only the empty field is shown. Fix: capture each, with the "Check" result as a status line.
- [C] 5 Comp · `setup-backup-day-1440.png`, x 882-1059: "Check" is a faint disabled pill and "Choose..." an outline pill, right of the field; two small buttons with unequal widths at different heights (y 268-302 vs 268-302 fine, but x 882 vs 963 have a 9px gap). Fix: one button "Choose a folder" with the field read-only, and the check run automatically.
- [C] 1 Hier · `setup-backup-day-1440.png`, y 855-890: the footer primary reads "Back up now and continue" in a cream disabled pill 193px wide, longer than anything else in the footer; with "I'll do this later" and the hint there are four items in one row. Fix: shorter label ("Continue"); the hint above the field.
- [C] 4 Type · `setup-backup-day-1440.png`, y 160-200: the explanation "If this computer is lost or breaks..." is 15px and the notice below it is 13px, but the notice is the actionable one. Fix: lead with the action.
- [C] 8 Phone · `setup-backup-day-390.png`, y 740-840: the footer takes three rows (hint, Back + later, full-width primary) = 110px of a 845px screen, and the primary is cream-on-cream. Fix: two rows, filled primary when active.
- [C] 8 Phone · `setup-backup-day-390.png`, y 50-230: about 180px of blank space under the header again.
- [nit] 9 Brand · on brand but plain; no brand moment on a screen about trust and safety.

## setup-people: Setup, People
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.7 | 3.6 | 3.6 | 3.8 | 3.6 | 3.9 | 3.1 | 3.6 | 3.6 | 4.0 |
Issues:
- [B] 7 Edge · `setup-people-day-1440.png`: only the empty form is shown. The list after adding one person, 10 people, a duplicate name, a long name, a pasted list and its review are not captured, and these are the whole job of the step. Fix: capture each; show added people as rows with a remove action and an undo toast.
- [C] 5 Comp · `setup-people-day-1440.png`, x 825-1125 and 1137-1194: "Who they are" is a select with "Choose..." as the placeholder, a good known-set list; the "Add" pill beside it is a faint cream disabled button 57px wide at a different baseline (y=270 vs the fields at y=267). Fix: align heights at 40px; show Add as enabled when both are filled.
- [C] 1 Hier · `setup-people-day-1440.png`, y 305-325: "Paste a list" is a bold burgundy underlined link, the most colourful thing on the page, though it is the secondary path; "Continue" is filled even though nothing has been added. Fix: link in ink with underline; Continue copy "Skip for now" while empty.
- [C] 2 Layout · `setup-people-day-1440.png`: "Name" field x 514-812 and select x 825-1124 do not match the column width (514-1194) or other steps' field widths (360px on "You"), so the row has its own grid. Fix: share one field width.
- [C] 4 Type · `setup-people-day-1440.png`, y 160-200: "STEP 7 OF 7" while the rail shows 8 items, and the intro is a two-line paragraph that includes the skip rule. Fix: step count to match; move the skip rule to the footer.
- [C] 8 Phone · `setup-people-day-390.png`, y 50-225: about 175px of blank above the step label; "Add" is a 57px pill at the right of the select, under the 44px height rule? it is 32px tall. Fix: full-width stacked Add button 44px.
- [nit] 9 Brand · no brand moment; fine for a working step.

## setup-done: Setup, Done
Pictures opened: 3 of 4 (1440 day, 1440 night, 390 day; no 1024). No state pictures; judged from the main pictures.
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 3.3 | 3.2 | 3.2 | 3.5 | 3.2 | 3.8 | 3.2 | 3.2 | 3.3 | 2.8 |
Issues:
- [B] 9 Brand · `setup-done-day-1440.png`: the finish of setup, one of the two named brand moments (with Welcome), has no mark, no ✳ star, no cream identity card for Reginald, no brand line, no motion; it is a status table titled "Where things stand". Fix: a finished state with the mark, the serif headline (for example "You're set." with the brand line "A little more room to think."), and the status table folded below.
- [B] 1 Hier · `setup-done-day-1440.png`, y 187-490: seven rows, each with a status and an identical outline "Set up" button, plus "Rename", then "Optional extras" with a card holding two more buttons: 10 equal-weight buttons on one screen. The primary "Go to Today" is in the footer. Fix: one primary (the first thing left to do), rows show a link only when something is open, and fold the optional extras.
- [B] broken · `setup-done-day-1440.png`, y 815-845: the last sentence ("The assistant has no AI account yet, so it can't read anything. Today's setup line and its No AI account line take you back to it.") is cut by the footer bar, and the footer ends at y=900 while the page continues to y=1002. Same at `setup-done-night-1440.png`. Fix: bottom padding equal to the footer, and sticky footer over the full viewport.
- [C] 5 Comp · `setup-done-day-1440.png`, y 200-470: state is shown with a hollow circle or a dash and the words "Not set up yet", "Skipped", "No one added": three different glyph/word pairs for similar states, and no success glyph for done steps (none done in this capture). Fix: one status pattern (dot plus word), a check for done.
- [C] 2 Layout · `setup-done-day-1440.png`, y 187-490: the table has a border and a canvas-coloured fill (not the surface), so it looks cut out of the page; the "Hand in a first note" card is white with a different border. Fix: both on the surface token with the same radius.
- [C] 3 Space · `setup-done-day-1440.png`: the title starts at y=97 while on other steps there is a "STEP n OF 7" eyebrow at y=99 and title at y=129; the rail does not align the title baseline with the step's. Fix: same title y on all steps.
- [C] 8 Phone · `setup-done-day-390.png`, y 790-870: "Hand something in" is overlapped by the footer bar, and "Not set up yet" next to "Mail and calendar" wraps the label onto two lines (y 345-365), where other rows have one. Fix: row labels may not wrap; bottom padding.
- [C] 7 Edge · no state picture of the happy path (everything set up), which should be this page's best moment; only the all-unset state is captured. Fix: add the all-done state.
- [nit] 6 Colour · the "Not done yet" chip in burgundy tint on cream by day resembles the brand tone, not a state colour (rubric 4b hue collision). Fix: neutral chip with a word.


## Summary
Overall is recomputed as the mean of points 1-8 in every table above. 28 screens scored; none passes the 4.0 bar, none reaches 4.6. Screens marked capture fault carry scores from the wrong picture and need a re-capture: settings-lists, settings-files, settings-menu, setup-welcome (390 day and 1440 night), and partly settings-addons and settings-ai-compare. The "loading" and "couldn't load" pictures for settings-ai and settings-business were identical to the loaded page (capture fault or missing states).

| Screen | Overall | Lowest point | Brand | Passes 4.0 / no point under 3.5 / brand ≥4.0 | Passes 4.6 / no point under 4.3 / brand ≥4.5 |
|---|---|---|---|---|---|
| settings-you | 3.7 | 3.3 (Phone) | 4.2 | no | no |
| settings-ai | 3.7 | 3.0 (Edge) | 4.3 | no | no |
| settings-today | 3.3 | 3.2 (Layout) | 4.0 | no | no |
| settings-backups | 3.4 | 3.2 (Layout) | 4.0 | no | no |
| settings-appearance | 3.8 | 3.6 (Edge) | 4.2 | no | no |
| settings-links | 3.8 | 3.2 (Edge) | 4.2 | no | no |
| settings-business | 3.7 | 3.2 (Edge) | 4.2 | no | no |
| settings-lists (capture fault) | 3.5 | 3.0 (Edge) | 4.2 | no | no |
| settings-connections | 3.7 | 3.1 (Edge) | 4.2 | no | no |
| settings-addons | 3.6 | 3.5 (Layout) | 4.2 | no | no |
| settings-files (capture fault) | 3.5 | 3.1 (Phone) | 4.2 | no | no |
| settings-advanced | 3.9 | 3.6 (Edge) | 4.2 | no | no |
| settings-ai-compare | 3.7 | 3.5 (Layout) | 4.1 | no | no |
| settings-menu (capture fault) | 3.6 | 3.0 (Edge) | 4.2 | no | no |
| settings-addon-page | 3.0 | 2.0 (Edge) | 3.8 | no | no |
| settings-add-connection | 3.6 | 3.1 (Edge) | 4.1 | no | no |
| settings-sign-out | 4.0 | 3.3 (Edge) | 4.2 | no (Edge under 3.5) | no |
| settings-ai-add | 3.6 | 3.1 (Edge) | 4.1 | no | no |
| setup-welcome (capture fault) | 3.4 | 3.0 (Edge) | 3.2 | no | no |
| setup-you | 3.7 | 3.1 (Edge) | 4.3 | no | no |
| setup-work | 3.7 | 3.2 (Edge) | 4.3 | no | no |
| setup-ai | 3.8 | 3.2 (Edge) | 4.3 | no | no |
| setup-mail | 3.9 | 3.7 (Edge) | 4.3 | no (overall 3.9) | no |
| setup-ai-other | 3.8 | 3.3 (Edge) | 4.3 | no | no |
| setup-promises | 3.5 | 3.3 (Layout) | 3.9 | no | no |
| setup-backup | 3.6 | 3.3 (Edge) | 4.0 | no | no |
| setup-people | 3.6 | 3.1 (Edge) | 4.0 | no | no |
| setup-done | 3.3 | 3.2 (Layout) | 2.8 | no | no |

Top ten fixes across this part, in order of score gained:
1. **State sheets for every Settings and Setup screen** (point 7, about 28 screens, +0.1 to +0.2 overall each, and the main reason every screen is under 3.5 on a point). Loading skeletons at the real row height, error with a Try again button, offline with the actions disabled, and the empty and 1 / many cases. The "loading" and "couldn't load" pictures of settings-ai and settings-business must actually show those states.
2. **Phone shell for Settings** (point 8, all 18 Settings screens): remove the "Section: X" disclosure plus the 60-90px blank band and the repeated section heading; make the section picker a full-width select-style row with the section name; add bottom padding equal to the tab bar so it never covers a field or button.
3. **Phone setup shell** (point 8, all 10 Setup screens): remove the 150-260px of blank space between the header and "STEP n OF 7"; make the footer one or two rows with a 44px full-width primary.
4. **Stacked account rows on the phone** (settings-you, settings-files, settings-menu): put the checkbox and "Let Reginald act after your yes" under the description instead of in a 100px column that wraps to 7 lines.
5. **Fix the add-on page** (settings-addon-page, +0.8 overall): the page under "Journey mail" is blank. Show its settings, or a designed empty state with the add-on's description and status.
6. **Brand moments on Welcome and Done** (point 9 for setup-welcome 3.2 and setup-done 2.8; +0.5 and more): the mark, a serif headline, the brand line, the italic numerals for the promises, and a finished state; also re-capture Welcome at 390 and by night.
7. **Notices and Backups form grids** (settings-today, settings-backups; +0.4 each): one two-column label/help grid for the whole page, left-aligned action rows, one primary per page, help text cut to one sentence, visible disabled radios and buttons, no 16px body paragraph under a 13px label.
8. **One primary and a disabled style** (Setup footers, Add-connection drawer, Backups, Promises): "Continue" is a cream tinted pill when disabled and a filled pill when active; show a disabled filled style plus the reason, make "Sign in again" an outline when Continue is filled, and give the selected cards a check mark.
9. **Re-capture the wrong screens** (settings-lists, settings-files, settings-menu, setup-welcome, and the missing happy paths of settings-addons and settings-ai-compare, Promises and People). Their scores are placeholders until then; remove the developer sentence "X isn't in Settings here, so this is Y instead."
10. **Shell and rail polish across all Settings screens** (points 2 and 5, +0.1 each): the left menu and rail stop at y=900 while the page runs on; group labels ("Assistant", "Your data", "More") look like links (use 11px uppercase muted); the 7px "▶" disclosure glyph should be one chevron component; "Remove" and "Rename" rows should use one secondary style plus an overflow.

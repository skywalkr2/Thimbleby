# Visual review 2: Today and the daily work screens

**Seen at:** `04ffc21e`.

**Folders:** D = sweep/daily/out, B = sweep/business/out.

**Scores:** 1–5, in the order Hierarchy / Layout / Spacing / Type / Components / Colour / Empty / Phone.

**Overall read:** the base system is sound. Tokens are calm, the day/night pair is clean, and the accent is restrained. The weaknesses are structural:
- Every list row reserves a pill column that wastes space.
- Controls crowd the header.
- The rail cards are stacks of equal-weight buttons.
- Empty states are a sentence under a heading.

## Scorecard

| Screen | States | Scores | Overall | Shots |
|---|---|---|---|---|
| Today: queue and rows | empty, data, D N P | 3/3/3/3/3/4/2/3 | 3.0 | D e-d-today, e-n-today, e-p-today, l1-line0-open; B v1-today-day/-night/-phone, t02-today-tab-Northwind |
| Today: line opened in place | data, D | 2/3/2/3/2/3/–/– | 2.5 | D l2-line0-open, l2-line3-menu; B t22-inbox-lookover, t26-lookover-draft |
| Today: rail cards (brief, Schedule, Came in) | empty, data, D N P | 2/3/2/2/2/4/2/3 | 2.5 | B v1-today-day, t13-week-briefing, t21-brief-show-clash, t40-schedule-entry-menu; D e-d-today |
| Today: setup line, side tabs | data, D | 4/4/3/3/3/4/–/3 | 3.4 | B s10-today-midsetup, v1-today-phone |
| Schedule: Day, Work week, Week, Month | empty, data, D N P | 3/3/3/3/3/3/2/2 | 2.8 | D e-d-schedule, t-d-sched-*; B v3-schedule-* |
| Schedule: entry panel, event page | data, D | 3/2/3/3/3/3/–/– | 2.8 | B sc01, sc04, sc07, sc08 |
| Add to schedule | D | 3/2/2/3/2/3/–/– | 2.5 | B sc05-add-to-schedule |
| What changed | empty, data, D P | 2/2/3/3/3/3/2/3 | 2.6 | D e-d-work_changed; B v2-work_changed-day/-phone |
| Since yesterday | empty, D P | 3/3/3/3/3/3/2/3 | 2.9 | B v2-work_since-*; D e-d-work_since |
| Handled for you | empty, data, D N P | 3/2/3/3/2/3/2/3 | 2.6 | D e-d-work_handled; B v2-work_handled-*, h01, h02, h08, h09 |
| Follow-ups | empty, data, D N P | 2/2/2/3/2/3/2/3 | 2.4 | D e-d-work_followups, fu1-main; B f01, f02-theo, f04-table, f07b-style-edit, f09-waiting, v2-work_followups-* |
| To-dos and questions | empty, data, D N P, menus, editors | 2/2/2/3/2/3/2/3 | 2.4 | D e-d-work_open, td-d-list, td-menu, td-m-edit, td-m-reassign, td-d-add-form; B v2-work_open-* |
| Stages | empty, D N P | 2/1/3/3/–/4/1/3 | 2.4 | D e-d-work_stages, f-n-work_stages, e-p-work_stages |

## V-P1

**V2-1. The row pill column wastes ~140px and makes every list read as a form.**
- Every row starts with a fixed left column; titles begin at x=413.
- Today: the pills repeat the group heading (five "Review" pills under "Review").
- To-dos: the column is empty, leaving a blank 150px gutter.
- What changed: a status pill. Handled: "Mail" on every row.
- Titles wrap sooner than they need to, and the clash title is cut off.
- **Fix:** drop the column. Title first, then a meta line. Show a pill only when it adds something the group heading doesn't (Needs you, Clash, Sent today). To-dos get a round checkbox in the gutter.
- **Component:** Row / ListDetail, with a `leading` slot that collapses to zero.
- **Shots:** B v1-today-day, v2-work_changed-day, h01-expanded, v2-work_open-day.

**V2-2. The rail cards are stacks of equal-weight buttons.**
- **Morning brief:**
  - "Show this week's briefing" is bordered, while "Not this week" (text) and "Close for today" (bordered) sit side by side.
  - Every "On Today" line has its own "Show" button, and every "Needs your yes" line has "Remind me".
  - The weekly version adds a native select and more buttons: 5–7 equal buttons in a 320px card.
- **Schedule card:**
  - "Add to schedule" and "Open the schedule" are right-aligned on separate lines at different widths.
  - When empty, "Connect a calendar" sits mid-sentence.
- **Fix:**
  - The brief becomes a read-only summary with one primary and "Close for today" as a link in its header; "Show" becomes a chevron on the line.
  - The Schedule footer is one row ("Open the schedule" link on the left, "+ Add" icon on the right).
  - Empty-state copy on its own line, with a block button below.
- **Component:** Panel, with a link-style Button and a card footer slot.
- **Shots:** B v1-today-day, t13-week-briefing, t40-schedule-entry-menu; D e-d-today, l1-line0-open.

**V2-3. Today's header has no clear hierarchy.**
- The title, a four-option side filter pressed against it, the date and the count share one 40px strip, so the filter reads as part of the title ("Today All Personal…").
- The 12px line "Checked 3 connections… · Not looked at before…" sits with no gap below.
- **Fix:** title and date on the left; the side filter right-aligned, or as an underlined tab strip on its own row; the "Checked…" line moves into the Connected chip's popover.
- **Component:** SegmentedControl (side-filter variant), page header.
- **Shot:** B v1-today-day.

**V2-4. The opened line shows duplicate titles and competing primaries.**
- The row turns tinted, with a 3px left bar plus a 2px outline.
- A question shows its title 3 times and has two Answer buttons (a solid one and a disabled grey one), with Close as floating grey text.
- A review has a solid "Look over" at the top, a solid "All looks good" at the bottom, and four equal "Not right" buttons between them.
- The injection-safety line is 12px grey in the middle of the work.
- The expanded content starts at x=413, leaving 150px of tinted empty space.
- **Fix:** a bordered inset card with the title once and an × to close; one primary at the bottom right; "Not right" as quiet per-item links; the safety line as a footnote; content starting at the title's left edge.
- **Components:** Row (expanded), Panel, Button ghost.
- **Shots:** D l2-line0-open; B t22-inbox-lookover, t26-lookover-draft.

**V2-5. Native browser controls clash with the design:** filter selects with labels above and OS chevrons, native date fields ("10/30/2026"), and a "--:-- --" time field.
- **Fix:** a styled Select (custom chevron, 36px); filters as compact chips ("Person: Everyone ▾"); a styled date input with a popover.
- **Component:** Select, Input, FormField.
- **Shots:** D td-menu, td-d-add-form; B sc05, t13.

**V2-6. The Schedule grid: clipped hour labels, no 7 AM label, cramped events.**
- Hour labels render as ":00 AM" or "0:00 AM" (the gutter clips them), and 7 AM is unlabeled.
- Back-to-back 30-minute events are 28px strips. With the panel open they shrink to ~130px wide with the titles cut away.
- The now-line is a thin red rule with no dot or time.
- **Fix:** a 64px gutter with right-aligned tabular hours; events at least 28–32px tall, with the title on one line; at least 56px per hour; open scrolled to an hour before now; a now-dot.
- **Component:** the calendar grid.
- **Shots:** D e-d-schedule; B v3-schedule-day, sc01, sc07.

**V2-7. The Schedule toolbar is crowded and wraps.** Prev/Today/Next, the title, the view switch and the side filter share one row; the title wraps ("October 26 – October / 30, 2026"); "Add to schedule" sits alone.
- **Fix:**
  - Row 1: the title, with "+ Add" on the right.
  - Row 2: the nav and a short title ("Oct 26 – 30, 2026") on the left, the view switch on the right.
  - The side filter goes on its own row or in a Filter dropdown.
- **Shots:** B v3-schedule-day, sc01.

**V2-8. What changed is a long flat list, with Learning boxes that look like errors.**
- 25 rows (1,800px; 4,299px on a phone), not grouped by day.
- "Learning from a correction" appears 8 times, and "With Reginald" 4 times in a row.
- Blue-barred "Learning from this…" callouts sit between rows, duplicated.
- The pane nests an inner card with bold run-on text ("…Venue walk-through Venue walk-through When: … 14:37…"), and each item has its own ⋯.
- **Fix:**
  - Group by time ("Last hour", "Earlier today", "Yesterday").
  - Collapse identical runs ("Learning from a correction ×4").
  - Learning shown as one muted line inside its row.
  - No inner card in the pane, and one ⋯ in the pane header.
- **Components:** Row, ListDetail, a new GroupHeader.
- **Shots:** B v2-work_changed-day, v2-work_changed-phone.

**V2-9. Follow-ups: four control clusters in the header, and a nested pane.**
- The title, the side filter, "By person / By project" and "To send / Later / Waiting on them" share one row (three strips on a phone).
- The "You" row looks like a person.
- "Copy message" appears twice, both as primaries.
- The caption isn't on the button's baseline.
- An inner border box sits inside the pane.
- "How your messages start and end" floats 480px below the list, then opens three 1,160px-wide inputs.
- The Waiting card spans 1,150px with an inner box and a bold underlined "Where it came from".
- **Fix:**
  - "To send / Later / Waiting on them" as an underlined tab strip with counts.
  - "By person / By project" as a small toggle, and the side filter in a Filter dropdown.
  - "You" as a link row above the list.
  - One Copy message.
  - Message style in a ~480px drawer.
- **Shots:** B f01, f02-theo, f07b, f09-waiting, v2-work_followups-phone.

**V2-10. To-dos: an empty gutter, loud links, an Add button that moves, stacked editors.**
- A 150px empty gutter.
- "Where it came from" bold, underlined and accent-coloured on every row: six of the loudest elements on the page, all identical.
- "Personal: not in a project" on every row.
- "Add a to-do" moves: under the empty-state sentence, top-right, or under the title.
- The filter labels stack above 40px native selects (~100px).
- The ⋯ menu has 9 items with no separators, and Drop isn't red; it covers the next row's Mark done.
- The note editor, edit form and reassign select can all be open at once (~600px), with mixed label styles and 985px-wide fields.
- **Fix:**
  - A round checkbox in the gutter; Mark done on hover only.
  - "From: Maya Okafor's email" muted in the meta line.
  - No "not in a project" chip.
  - Add always top-right, plus an inline "Add a to-do…" row at the top of the list.
  - Filters as dropdown chips.
  - The menu in three sections, with Drop in red.
  - One editor at a time, at most 560px wide.
- **Components:** Row, Select, Menu (separators, danger item), Button.
- **Shots:** D td-menu, td-m-edit, td-m-reassign, e-d-work_open; B v2-work_open-day.

**V2-11. Handled for you is a form, not a list.**
- The side filter, a two-option segmented control and Kind/Reason/Sender sit on three levels, with grouping set apart from what it groups.
- Two 12px intro paragraphs.
- A 510px search with a bold label and a permanent 3px focus ring on load.
- Rows are three grey lines, each repeating "Mail", Bring it in and ⋯.
- An underlined group heading.
- The "Bring it in as" chooser is three outlined buttons plus Cancel.
- **Fix:**
  - Tabs "Set aside · 2 | Read, nothing to do · 0".
  - A 280px search with an icon and placeholder, no label, no autofocus.
  - Group by as a dropdown.
  - One intro sentence.
  - A row is a title plus one meta line, with the explanation on expand.
  - "Bring it in as" becomes a menu.
- **Components:** SegmentedControl (tabs), Input (search), Row.
- **Shots:** D e-d-work_handled; B h01-expanded, h02-by-Sender, h09-bring-in, v2-work_handled-day.

**V2-12. Empty states are one sentence under a heading.**
- Plain 14px text at the top left of a 1,100px canvas.
- Stages is only "No items have stages yet.".
- What changed shows its filters and tabs with nothing to filter.
- Follow-ups has a disclosure under its sentence.
- Today's empty queue repeats "Hand something in" as a second primary.
- **Fix:** one EmptyState, centred, with a 40px icon, a 16/600 title, a 14px sentence at most 44 characters wide, and one action. Hide controls that need data.
- **Shots:** D e-d-work_changed, e-d-work_followups, e-d-work_stages, e-d-work_open, e-d-today; B v2-work_since-day.

**V2-13. "Add to schedule" is a nearly empty full-height drawer:** 420px wide, about 75% blank. The "What" and "Day" labels sit on different baselines. The disabled Add is light grey and hard to see. There's a heavy focus ring.
- **Fix:** a 480px modal sized to its content; the title field full width, then Day and Time side by side; a disabled primary that still reads as a primary.
- **Shots:** B sc05; D td-d-add-form, td-d-long-fail.

## V-P2

**V2-14. The cursor row's ring is too heavy:** a 2px outline flush with the card, and its button turns solid while the same button is tinted on other rows. **Fix:** a soft fill and a 2px left bar, with the button the same weight on every row.

**V2-15. Button weights are inconsistent** across rows, the rail and Follow-ups. **Fix:** three levels only; row actions secondary or quiet; one solid per page.

**V2-16. Form labels differ** (12px grey against 14px bold, parentheticals in labels). **Fix:** labels 14/600 above, hints 12/400 below, and an "Optional" tag.

**V2-17. Links are bold, underlined and accent-coloured,** and "2 handled for you today" is underlined at night but not by day. **Fix:** one link token (14/500, underline on hover), the same in both themes.

**V2-18. Came in misaligns its titles:** "New" pills indent the title by ~8px, and wrapped titles hang. **Fix:** a 6px unread dot in a fixed 12px gutter, on a grid.

**V2-19. The Schedule's keyboard-help paragraph** is always visible, even on a phone. **Fix:** move it to the ? menu.

**V2-20. The Month view is flat:**
- Out-of-month cells have a heavy grey fill.
- Today is a pale tint with an underlined number.
- "Due:" items are dashed and cut off.

**Fix:** white cells with dim numbers, today as a filled circle, a check glyph for due items, and "+N more".

**V2-21. The Day view is one ~1,100px column.** **Fix:** cap the events at ~640px, or keep a detail panel open beside it.

**V2-22. The entry panel and the event page repeat each other.**
- The panel is a floating 420px card whose "Open" leads to a page with the same data.
- The event page has Back 11px off the title's left edge, a tiny overline, and a lone Details card on the right.
- The own-entry page has a 3-line Prep help paragraph.

**Fix:** "Open" as a link, shown only when the page adds something; Details top-left; a breadcrumb.

**V2-23. Menus cover the row they belong to.** **Fix:** anchor below the ⋯ and flip near the bottom of the window, with a shadow, a border, 8px item padding and a hover fill.

**V2-24. Since yesterday:** no menu item is highlighted, there's a bordered "Back to What changed", and "Missed something?" appears twice. **Fix:** keep What changed highlighted, use a breadcrumb, and drop the in-page button.

**V2-25. Tiny grey type:**
- Group headers are 12px grey, almost the same as the pill text.
- Intro and status lines are 12px.
- Titles (15/500) and meta lines (14px) barely differ.

**Fix:** group headers 12/600 with a count and space above; titles 15/600; meta 13/400; help text at most 2 lines.

**V2-26. Toasts stack three high** over the menu and list. **Fix:** at most 2 visible, placed bottom-centre or bottom-right.

**V2-27. On a phone, row actions are full-width bars:**
- Nine identical blue bars.
- The collapsed brief card has empty padding.
- The side filter wraps.
- The tab is called "Your day" on one workspace and "Work" on another.

**Fix:** tappable rows with a chevron and actions in a sheet (or one compact right-aligned button); the filter as a scrolling chip row; collapsed cards on one line.

**V2-28. Night mode: the Schedule's today column** is a saturated navy block, far heavier than the pale tint by day. **Fix:** a ~8% `--accent-soft` fill.

## Patterns (fix once)

1. **Row:** no fixed pill gutter, and an optional `leading` slot (checkbox, avatar or dot).
2. **Page header with filters:** a title row (one primary on the right), an underlined tab strip with counts, then a filter row of dropdown chips. The side filter becomes "All sides ▾".
3. **Button hierarchy:** three weights, one primary per region, row actions never solid.
4. **EmptyState,** used everywhere, with controls that need data hidden.
5. **FormField, Select and date input:** labels above, hints below, at most 560px in editors.
6. **One link token,** with the underline on hover only, the same in both themes.
7. **Menu:** sections, a red danger item, anchored so it never covers its row.
8. **GroupHeader and type tokens.**
9. **A disabled primary** that still reads as a primary (muted accent, readable text).
10. **No nested bordered boxes** in panes; use spacing and hairlines.
11. **The phone Row and SegmentedControl pattern.**

## Three screens that most need a redesign

**A. To-dos and questions.**
- **Header:** the title, and "+ Add a to-do" as the primary on the right.
- **Tabs:** "To-dos 6 · Questions 0", with filter chips on the right.
- **List:**
  - an inline add row at the top
  - each row a round checkbox, the title (15/600) and one meta line ("Robin Calloway · due Mon, Nov 2 · from Maya's email")
  - overdue and today dates in their state colour
  - ⋯ on hover
- **Menu:** three sections.
- **Editors:** one at a time, as a 560px inset card.
- **Empty:** a centred EmptyState.
- **Phone:** rows with a checkbox, and a bottom sheet for actions.

**B. Today.**
- **Header:** title, date and count, with "All sides ▾" on the right; the status line moves into the Connected popover.
- **Groups:** "Decide · 2", "At risk · 2", "Review · 5".
- **Rows:** title plus meta; pills only for Needs you, Clash and Sent today; a secondary action on the title's baseline. The cursor row gets a soft fill and a left bar.
- **Opened line:** an inset card with the title once, an × and one primary.
- **Rail:**
  - The brief as a 2–3 line summary with one primary and "Close for today" as a link.
  - The Schedule card shows today's events and an "Open the schedule →" link.
  - Came in uses dot gutters.
- **Empty:** a centred "You're clear" state, and one-line connect prompts in the cards.
- **Phone:** tappable cards with a chevron, and collapsed rail sections.

**C. Schedule.**
- **Header, row 1:** title, with "+ Add" on the right.
- **Header, row 2:** "‹ Today ›" and a short title on the left, the view switch on the right, and "All sides ▾".
- **Grid:**
  - a 64px tabular gutter
  - opens scrolled to an hour before now
  - a now-line with a dot and the time
  - events at least 28px tall, with a side-coloured left bar, side by side when they overlap
  - the panel never squeezes events below 120px
- **Month:** white cells, today as a filled circle, "+N more".
- **Adding:** a 480px modal.
- **Help:** keyboard help moves to the ? menu.
- **Phone:** Day and Month only, side chips, and an entry opens as a bottom sheet.

## Gaps (no screenshot)

- **Stages** with data, in any mode.
- **Since yesterday** with data, and at night.
- **What changed** at night with data, and its detail pane on a phone.
- **Schedule on a phone** with events, the panel, Month with events, the Add dialog and the event page.
- **At night:** Add to schedule, the entry panel, the opened line, the Follow-ups pane, the To-dos menu and editors, and the To-dos drawer.
- **On a phone:** the To-dos drawer, the row menu, inline editors, the Follow-ups message pane and the opened line.
- **Today filtered to one side:** this couldn't be judged visually, because the filter does nothing (X18).

# Visual 2 at 8ebf3cf: the work screens

**Bottom line:**
- Every work screen is up 0.3 to 0.7 on 04ffc21e. The shared components landed: grouped rows, round checkboxes, a sectioned menu, underlined tabs, pills, a bottom-centre toast, a tab bar with a "+" circle.
- **No work screen reaches stage A;** the best is the Schedule's Month view at 3.4.
- Brand is about 1.0 everywhere.

## Scorecard
The scores are Hierarchy, Layout, Spacing, Type, Components, Colour, Empty, Phone.

| Screen | States | Scores | Overall | Brand | Stage | Previous |
|---|---|---|---|---|---|---|
| Today: queue | day, night, phone, 2 to 14 items | 3.5/3.5/3/3/3/3.5/3/2.5 | 3.1 | 1.0 | none | 3.0 |
| Today: the opened review and the clash | day, phone | 3/3/3/3/3/3/–/2 | 2.9 | 1.0 | none | 2.5 |
| Today: the rail (brief, Schedule, Came in) | day, night, phone | 2.5/3/3/3/2.5/3.5/3/3 | 2.9 | 1.0 | none | 2.5 |
| Today: worst case | day, phone | 2.5/2.5/2.5/3/2.5/3/3/1.5 | 2.6 | 1.0 | none | new |
| To-dos and questions (with data) | many states | 3/3/3/3/3/3.5/3/2.5 | 3.1 | 1.0 | none | 2.4 |
| (the same) 40+ items | day, night, phone | 2.5/2.5/2.5/3/3/3/–/2 | 2.7 | 1.0 | none | |
| (the same) empty | day | 3/3.5/3.5/3.5/3/3.5/3.5/3.5 | 3.4 | 1.0 | none | |
| (the same) menu and editors | day | 3/2.5/3/3/3/3/–/– | 2.9 | 1.0 | none | |
| Schedule: Day, Work week, Week | day, phone | 3/3/3/3/3.5/3.5/3/3 | 3.1 | 1.0 | none | 2.8 |
| Schedule: Month | day | 3.5/4/3.5/3/3.5/3.5/3/3 | 3.4 | 1.0 | none | 2.8 |
| Schedule: Timeline | day | 2.5/2.5/3/2.5/3/3/2.5/2.5 | 2.7 | 1.0 | none | 2.8 |
| Schedule: entry pane | day | 3.5/3/3.5/3.5/3.5/3.5/–/– | 3.4 | 1.0 | none | 2.8 |
| Schedule: Add form | day | 3/3/3/3/2.5/3/–/– | 2.9 | 1.0 | none | 2.5 |
| What changed | day, night, phone | 2.5/3/3/3/2.5/3/3/3.5 | 2.9 | 1.0 | none | 2.6 |
| Since yesterday | empty only | 3/3/3/3/3/3/3/3.5 | 3.1 | 1.0 | none | 2.9 |
| Handled for you | data | 3/3/3/3/3/3/3/3 | 3.0 | 1.0 | none | 2.6 |
| Follow-ups | data, 40+, style, phone | 2.5/2.5/2.5/3/2.5/3/3/2.5 | 2.7 (2.4 at 40+) | 1.0 | none | 2.4 |
| Stages | empty | 2.5/2.5/3/3/–/3/2.5/3 | 2.8 | 1.0 | none | 2.4 |

**Area average (the 14 main screens):** 3.0, against 2.65 at 04ffc21e. **Stage A:** 0.

## The VP items in the way
**VP16** for every screen; then:
- **Today:**
  - VP01: the rail ends 290px below the main column.
  - VP02: titles start at x=327–342, or 583 beside a chip.
  - VP03: the labels.
  - VP04: two or three filled buttons.
  - VP05: tags, not a dot and a word.
  - VP06, VP08 and VP07: no all-clear state.
- **To-dos:**
  - VP04: two filled buttons.
  - VP02: three-line rows, with a loud "Where it came from".
  - VP01: the list is 1160px wide.
  - VP03, VP11: no grouping at 40+.
  - VP08: three selects on the phone.
  - VP13: 18px circles.
- **Schedule:**
  - VP02 and VP11: 28px clipped events.
  - VP07: the Timeline's dots.
  - VP13, VP08.
  - The Add form uses native inputs.
- **What changed:** VP02, VP03, VP05, VS07.
- **Handled for you:** VP03, VP01.
- **Follow-ups:**
  - VP04: up to four filled buttons.
  - VP11: 32 bullets.
  - VP01 and VP02: a card inside a card.
  - VP08.
- **Stages:** VP07, VP17.
- **Since yesterday:** VP07.

## Findings
### V-P1
1. **Today's opened review breaks on a phone:** "To/do", "Not right" over "Your note", "wner:" clipped, and chips three lines tall (C/c20-worst-lookover-phone).
2. **A permanent 2px indigo box sits on the first row of every list** when the page loads. It's the keyboard cursor, but it reads as selected or an error. Fix: show it on `:focus-visible` only, as a 3px left bar with a tint (t-today-50, e-today, n-today).
3. **Square-cornered tags before every title**: Review, Answer, No date, Send, Clash, Needs you, Filed, Done, Checked, Mail. They make the left edge ragged and often repeat the group heading: the old pill column, narrower. Fix: a fixed lead slot, a tag only when it adds meaning, and chips in the meta.
4. **The brief and wrap-up card is a stack of five to seven controls in 320px.** It pushes the Schedule down about 600px, shows a five-line promise with a postal address, has a 40px gap, and "Close for today" sits 7px off its title.
5. **40+ items aren't graded or capped:** 50 flat rows, three layers of filters, "Needs a date" taking 560px, row heights alternating between 37 and 70px, Follow-ups' 32 bullets in 1200px, up to four filled buttons, and a 150px message box that cuts a line.
6. **Two filled buttons almost everywhere:** "Hand something in" plus the page's own. Fix: VP04.

### V-P2
- **Native controls:** the filters, "mm/dd/yyyy", "--:-- --", Handled's strip, the Add drawer (VC05).
- **Group labels** are 12px sentence case with a count at 70% opacity.
- **Long names run on:** the side strip reaches x=1400, the left menu clips with no ellipsis, and the phone clips them sideways.
- **The calendar:** 28px events clip ("Choir", "Budget"), seven 11 PM strips sit along the bottom, the now-line strikes through text, and the columns shrink to 93px when the pane opens.
- **The Timeline:** unlabeled dots, loud hatching, two tab strips, a six-item legend, a repeated lane label.
- **The Add form:** baselines don't match, the edges are at 977, 1205 and 1237, the drawer is square-bottomed, and "Add" looks disabled.
- **What changed:** flat, with five identical rows, a blue-bar callout, three "…" menus, a wall of bold text, a wrapped title, and chips on the tab row.
- **Handled for you:** two paragraphs, a 510px search and the Kind strip above the first row; 106px rows, with the action 700px away from its text.
- **Empty states:** Stages has a 210-character centred paragraph and no action. Since yesterday mixes alignments. No brand moment in either.
- **The phone:** the "Keeping track" tab wraps; To-dos has three selects taking 250px; Today's rows aren't stacked.
- **Night:** cards show only by their hairline, and the accent is periwinkle.
- **Accent overuse:** "Where it came from" is an accent link, and "Not right" appears four times in accent.
- **The clash:** "It's fine" against "Open Take the tablets".
- **Hit targets:** the 14px "…", the 18px circles, small Remove buttons.

## Against the mockups
- **Today, what matches:** the rows card with group counts, one row per thing, the folded review with "Look over", the rail, the inset opened card with one primary, the phone's folded brief, and the "+" tab.
- **Today, what doesn't:**
  - no serif, mark or burgundy
  - labels not uppercase
  - per-row tags
  - a box ring instead of the tinted cursor row
  - one review row per source, with a capital "Your"
  - no greeting card, and the brief as a button stack
  - no "Open both"
  - two or three filled buttons
  - a tab strip instead of the "Showing ▾" filter
  - the rail longer than the main column
- **To-dos, what matches:** underlined tabs with counts, round circles, the 15/13 title and meta, the "…" with a sectioned menu and red Drop, the footer count, the toast.
- **To-dos, what doesn't:**
  - no "6 open · 1 overdue" subtitle
  - no inline add row on the desktop
  - no due-state colour
  - native selects instead of chips
  - the list 1160px wide instead of 980
  - three-line rows with a loud source link
  - "Needs a date" as a 340px block of date fields
  - two primaries
  - no serif or burgundy

## Better since 04ffc21e
- Group headers and an inset opened line.
- Round checkboxes and a sectioned menu with a red Drop.
- Definition lists on the to-do and entry pages.
- Underlined tabs, and pills.
- The Schedule's toolbar, gutter and now-dot; Month with white cells and a filled today circle.
- The "Your own to-dos" row.
- The rail cards fold.
- The phone tab bar and sheets.
- The ×5 fold in What changed.
- The toast.
- What changed on the phone, stacked.

## Worse or unchanged
- **Worse:**
  - the square-tag column (new)
  - the first-row ring (new)
  - the phone break in the opened review
  - "Needs a date" taking 340–560px above To-dos
- **Unchanged:**
  - the brief's buttons
  - native inputs
  - clipped events
  - the Timeline's dots
  - What changed is flat
  - the Follow-ups message box
  - the brand

## Gaps
Never captured:
- a truly empty Today, and the all-clear state
- loading, error, offline and conflict states
- the morning and evening brief
- the Schedule at night (not read), Week on the phone, and 768 and 1024 widths
- Questions with data, a filtered-empty list, a done row
- Stages with data
- Since yesterday with entries
- Handled's "Read" tab with data
- the message-style drawer
- hover, focus and pressed states
- the clash with Move

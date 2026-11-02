# Visual 3 at 8ebf3cf: record and admin pages

**Headline:**
- Up 0.5 to 1.8 points on 04ffc21e, mostly from the shared parts: the DefinitionList, the ActivityList, the EmptyState and the one-line composer.
- **Only one screen state reaches stage A:** Files with data, at 3.5 (provisional, with no phone or night capture).
- Close behind: Quality at 3.4, the person page and Handover at 3.3.
- **Brand is 1.5 everywhere.** The old name isn't shown.

## Scorecard
The scores are Hierarchy, Layout, Spacing, Type, Components, Colour, Empty, Phone.

| Screen | Scores | Overall | Brand | Stage | Against 04ffc21e |
|---|---|---|---|---|---|
| People list and organizations | 3/3/3/3.5/3.5/3.5/3/2.5 | 3.1 | 1.5 | none | 2.6 → 3.1 |
| Person page | 3.5/3.5/3/3.5/3.5/3.5/3/3 | 3.3 | 1.5 | none | 2.9 → 3.3 |
| Add person drawer | 3.5/3/3/3.5/3.5/3.5/–/– | 3.3 | 1.5 | none | 3.0 → 3.3 |
| Organization, business and job page | 2.5/3/3/3/3/3.5/3/2.5 | 2.9 | 1.5 | none | 2.6 → 2.9 |
| Projects table | 3/2.5/3/3/3/3.5/3/– | 3.0 | 1.5 | none | 2.5 → 3.0 |
| Project page | 3/3.5/3/3/3/3.5/3/– | 3.1 | 1.5 | none | 2.4 → 3.1 |
| Personal side page | 2.5/3/3/3/3/3.5/3/– | 3.0 | 1.5 | none | new |
| To-do page | 3.5/3/3/3.5/3/3.5/3/3 | 3.2 | 1.5 | none | 2.7 → 3.2 |
| To-do Edit details | 1.5/1.5/2/2.5/2/3/–/– | 2.1 | 1.5 | none | newly captured |
| Files, empty | 3/3/3.5/3.5/3.5/3.5/2.5/3.5 | 3.2 | 1.5 | none | 2.1 → 3.2 |
| Files with data, and the Add dialog | 3.5×7/– | 3.5 | 1.5 | A (provisional) | 2.1 → 3.5 |
| Notes list | 2.5/3/3/2.5/2.5/3.5/–/– | 2.8 | 1.5 | none | new |
| A note's page | 3/2.5/3/3/3/3.5/3/– | 3.0 | 1.5 | none | new |
| Knowledge | 3/2.5/3/3/2.5/3.5/3.5/– | 3.0 | 1.5 | none | 2.1 → 3.0 |
| Rules to look over | 3/3/3/3/3/3.5/3/– | 3.1 | 1.5 | none | 2.1 → 3.1 |
| How Reginald is doing | 3.5×6/2.5/3 | 3.4 | 1.5 | none (0.1 short) | 1.6 → 3.4 |
| Handover | 3/3/3/3.5/3.5/3.5/3/3.5 | 3.3 | 1.5 | none | 1.8 → 3.3 |
| Missing-record and fallback pages | 2/3/2.5/3/3/3/3/– | 2.8 | 1.5 | none | new |
| Came-in message page | 2/2.5/3/2.5/3/3.5/2/– | 2.6 | 1.5 | none | new |

**Area average:** 3.04 (19 screens), against about 2.3 for the comparable screens at 04ffc21e. **Stage A:** 1, provisional.

## The VP items in the way
- **People:**
  - VP08: on a phone, cards stack as label and value, the "…" sits on its own line, and the strip clips.
  - VP02: empty columns.
  - VP01: the strip and select float.
  - VP07.
- **The person page (about 0.2 short of A):**
  - VP04: Edit is the only button.
  - VP02: a question looks like a to-do.
  - VP03: 12px help, and the time column wraps.
  - VP08: the details card is at the bottom on a phone.
  - VP07.
- **Organization and business pages:**
  - VP01 and VP04: a bare Back, no kind pill, Activity above Projects.
  - VP07: two empty states.
  - VP08.
  - "127.0.0.1:9455" shown as the account.
- **Projects:**
  - VP02: five of eight columns blank, and the sides are underlined links.
  - VP07: an empty "Views" block.
- **The to-do page (about 0.3 short):** VP04 (two filled buttons), VP01 (two detail styles), VP08.
- **Edit details:** a full redesign as a short drawer.
- **Files:**
  - empty: VP07 (a drop zone)
  - with data: VP02 (an "Attachment" chip on every row) and VP04 (a filled Open beside a filled Add)
- **Notes:** VP02 and VP07.
- **Knowledge and Rules:** VP07 and VP03 ("0 of 8000 characters").
- **Quality (0.1 short):** VP07 (11 bare section cards), VP03, VP05 (the deltas have no direction colour), VP08 (headers break mid-word).
- **Handover:** VP07 (the In sync pill, the last sync time, Check now) and VP03.
- **Fallback pages:** VP07.
- **All:** VP16 (the gate to B), VP17 (the gate to C), VP06 (night).

## Findings
### V-P1
1. **Edit details is a 25-field form** in a 360px card, making a 2760px page: "PRJ-1", "[object Object]", native date and selects, misaligned checkboxes, with a pale Save 1900px down and a heavy autofocus ring. Fix: a 480px drawer with Name, Due, Who and Project, with More folded.
2. **The Notes list shows raw text as titles:** three to six bold lines of "FACT-2 … ACT-6 … [ "kind": "action" … ]", with "From outside" on every row, no search and no grouping.
3. **The Came-in page shows a database record:** a content hash, "Kind watched:journey-mail/mail", a six-line "Watched" value, and no message text, leaving 55% of the page empty.
4. **The left menu scrolls sideways** on the business page and on Notes ("e Upholstery and Restoration Ltd"). Long names clip at x=232 everywhere. Fix: overflow hidden, an ellipsis and a tooltip.
5. **The missing-record page has a skeleton header:** a crumb, an orphan tag, no title, and "This page didn't load" with Try again. Unknown routes redirect silently.
6. **The phone:**
   - Quality's headers break mid-word ("Promi / ses").
   - The person, business and to-do details sit below the composer.
   - The business page's 15-row list is 1100px tall, and comes before Projects.

### V-P2
1. **The right-aligned side strip floats** on People, Files and Notes. People's organization select sits alone. The strip wraps to three lines on a phone.
2. **Empty table columns** on People and Projects, under an empty 41px toolbar.
3. **The page headers differ:** a breadcrumb, a bare Back, or "Back to Today"; the kind pill inline, below the title, or missing.
4. **Quality:** 9 to 11 bare section cards, and the "Your own count" form outweighs the data.
5. **Quality's deltas have no direction,** and the table headers wrap to three lines.
6. **The "Who reads it" line** is a 15px run-on with a host and port. Two identical empty states.
7. **Activity comes before the page's own contents.** The 56px time column wraps "10:25 / PM" on every record page.
8. **A tag on every row:** To-do ×15, ×36; Attachment; From outside.
9. **Two filled buttons:** Edit with Open; Open with Add a file; plus "Hand something in" everywhere.
10. **Underlined links in the wrong places:** "Where it came from" as a title, Change, the sides in Projects, "Sort them".
11. **Lonely one-line cards** on the organization and business pages.
12. **The time-away entry:** a card inside a card, with a four-line bold title cut mid-word.
13. **Small controls:** Remove and Add another at 12px, about 68x20, misaligned, touching the next label.
14. **Knowledge:** "Add word" looks disabled, in a bare 512px column.
15. **"Back to Today"** as bare grey text.
16. **Night:** hairline-only cards, and a solid selected menu item.

## Against the mockups
- **The person page:** about 80% of the structure and 55% of the finish.
  - **Same:** the breadcrumb, pill, ⋯, outline Edit, tabs, DefinitionList, Activity and composer.
  - **Missing:** the "Open with" card done well (with 36 items it's a flat list with tags), a blue "Show all", the composer at the bottom, the dates rows, the avatar.
  - **Primary:** still Edit.
- **Quality:** about 85% of the structure and 60% of the polish.
  - **Same:** four tiles, the weekly table, the Mistakes and Count columns.
  - **Missing:** sparklines, coloured deltas, the period dropdown, the breadcrumb, the subtitle, the percentage tile.
  - **Different:** a native date box.
  - **Added against the mockup:** 9 to 11 bare section cards.

## Better since 04ffc21e
- The record parts: the DefinitionList, ActivityList, composer and EmptyState.
- Quality as tiles and a table, instead of a 17-section wall.
- Files: a drop zone in the Add dialog, an Optional tag, Row anatomy.
- Plain bold titles.
- The Projects headers aren't cut off.
- The Add drawer's reasons and labels.
- The phone tab bar.

## Worse or not improved
- **Worse:**
  - the sidebar's sideways scroll with long names
  - silent unknown routes
  - Edit details and the Came-in page stand out more against the cleaner pages beside them
  - the page headers are now more mixed
- **Not improved:** the People select and strip, and the phone person card.

## Gaps
- **No phone capture:** Projects, the project page, an organization page, Files with data, Notes, a note's page, Knowledge, Rules, Edit details, the Add drawer, Came in, the fallback pages.
- **No night capture:** Files, Notes, Knowledge, Projects, an organization page, dialogs.
- **Never captured:**
  - first-run empty People and Projects
  - loading and error states
  - Add an organization
  - a long file name
  - several Knowledge words
  - Rules with rules
  - the 1024 and 768 widths

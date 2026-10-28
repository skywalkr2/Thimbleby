# Visual review 3: records and Settings

**Seen at:** `04ffc21e`.

**Folders:** D = sweep/daily/out, B = sweep/business/out, S = sweep/settings/out.

**Scores:** 1–5, in the order Hierarchy / Layout / Spacing / Type / Components / Colour / Empty / Phone.

## Scorecard

| Screen | States | Scores | Overall | Shots |
|---|---|---|---|---|
| Projects table (side headings, pane) | empty, data, N, P, pane | 3/2/3/3/3/3/2/1 | 2.5 | D e-d-records_projects, f-n-records_projects; B v3-records_projects-day/-phone, p05-project-hale |
| A side's page | data, D, P | 2/2/2/2/3/3/2/3 | 2.4 | B p01, p03, v6-records_project_PRJ-3-day/-phone |
| Organization page | data, D | 2/2/3/3/3/3/2/– | 2.6 | B p06, v6-records_organization_ORG-2-day |
| Add a project drawer | D | 3/2/3/3/2/3/3/– | 2.7 | B p08, p09 |
| People list and organizations | empty, data, D N P | 3/2/3/3/2/3/2/3 | 2.6 | D e-d-records_people, f-p-records_people; B v3-records_people-*, pp03 |
| People pane | D | 3/3/3/3/2/3/–/– | 2.8 | D p-d-person-page |
| Person page | D N | 3/3/3/3/3/3/2/3 | 2.9 | B pp-Maya, pp-Hattie, v6-records_person_PER-3-*; D p-d-person-full |
| Add / edit person, add org | D | 3/3/3/3/3/3/–/– | 3.0 | B pp02, pp04, pp05; D p-d-add-duplicate |
| To-do page | D | 3/3/2/3/3/3/2/– | 2.7 | D r-todo |
| Fact page and source dialog | D P | 3/3/3/3/3/3/3/3 | 3.0 | D r-fact, r-email-source; B r03, v6-records_fact_FACT-2-phone |
| Schedule entry and event pages | D | 3/2/3/3/3/3/2/– | 2.7 | B sc04, sc08 |
| Files (list, Add, details) | empty, data, D | 2/2/3/2/2/3/1/– | 2.1 | D e-d-records_files, f-add, f-record; B v4-records_files-day |
| Knowledge and Rules to look over | empty, data, D N P | 2/1/2/3/2/3/1/3 | 2.1 | D e-d-records_knowledge, f-n-records_knowledge, f-p-records_knowledge, e-d-records_rules-review |
| How Reginald is doing | empty, data, D N | 1/1/2/1/2/3/2/– | **1.6** | D e-d-quality, f-n-quality |
| Handover | empty, D | 1/1/2/3/–/3/1/– | **1.8** | D e-d-handover |
| Settings shell (title, search, nav) | all | 3/3/3/3/3/3/–/2 | 2.9 | S b-d-*, b-p-* |
| You | D P, skipped | 3/3/3/3/3/3/3/1 | 2.9 | S b-d-you, b-p-you |
| AI and spending (and Add an account) | D P, 1 and 2 accounts, skipped | 3/3/3/2/3/3/2/3 | 2.8 | S b-d-ai, b-p-ai, ai-add-open, ai-choose-open, ai-two-accounts |
| Compare | D | 3/2/3/3/3/3/2/– | 2.7 | S b-d-ai-compare, cmp-measured |
| Notices | D | 2/3/2/2/2/3/–/– | 2.4 | S not-more-open |
| Backups | D P | 2/2/2/3/1/2/–/3 | 2.1 | S b-d-backups, b-p-backups |
| Appearance | D | 4/3/4/4/3/3/–/– | 3.5 | S b-d-appearance |
| Quick links | empty, D | 3/3/3/3/3/3/2/– | 2.9 | S b-d-links |
| Your business and Lists | D P | 3/3/3/3/2/2/2/3 | 2.6 | S b-d-business, b-p-business |
| Connections (and add forms) | D N P, skipped | 2/2/1/2/1/3/2/1 | **1.8** | S b-d-connections, b-p-connections, cn-choose, cn-mailbox-form |
| Add-ons, an add-on's page | D N | 2/2/2/2/2/3/2/– | 2.1 | S b-d-addons, ad-installed, ad-journey |
| Advanced | N | 3/3/3/3/3/3/–/– | 3.0 | S adv-all-open |

## V-P1

**V3-1. Connections: the card's actions float and collide.**
- "Sign out" and "Add another account" are text buttons floating mid-card, with "Add another account" centred on its own row.
- "Signed in as…" is indented with an empty icon slot.
- On a phone it wraps one word per line, and "Sign out" prints over it.
- **Fix:** title and subtitle on the left; a right-aligned action cluster ("Choose what to read" + ⋯ holding Sign out and Add another account); stack below ~600px.
- **Component:** Row, Button, an action slot that wraps.
- **Shots:** S b-d-connections, cn-choose, b-p-connections.

**V3-2. Connection rows are run-on grey paragraphs.** Each is 3–4 lines of "·"-joined text, with no status dot, right-aligned time or privacy pill.
- **Fix:** one line (title, a source pill, a status dot with "Checked 2 min ago", a "Private" pill), with the rest in a fold.
- **Component:** Row, Pill.

**V3-3. Settings › You on a phone: the act-on account row collapses** into a ~60px column, 1–3 characters per line ("Examp / le mail"). On desktop it breaks the label/hint grid, and the checkbox sits far from its label.
- **Fix:** stack at narrow widths.
- **Component:** SettingRow responsive grid.
- **Shots:** S b-p-you, b-d-you.

**V3-4. The Projects table on a phone:** side headings are squeezed into a ~125px tinted box and wrap.
- **Fix:** a full-width group header (12/600 muted, hairline above, count right).
- **Component:** RecordsTable card layout.
- **Shot:** B v3-records_projects-phone.

**V3-5. The Projects table at 1440: 8 columns, mostly empty, headers cut off.**
- "Last up…", "Open to…" and "Open q…" are cut while 45% of the width is blank. Only "today" fills any column.
- Side headings are underlined links on a shaded band.
- When empty, it's a header over "Personal · 0" and "0 projects".
- **Fix:** hide columns that are empty for every row; size columns by content; never cut a header; a group-header style for sides; an EmptyState when there are no projects.
- **Component:** RecordsTable, EmptyState.
- **Shots:** B v3-records_projects-day, D e-d-records_projects.

**V3-6. "Talk to Reginald" is a raw stacked form on every record page:** a bold title, 12px "Nothing has been said…", a bold question, a bare textarea, and a disabled-looking Send.
- **Fix:** a one-line composer ("Ask Reginald about this…" with an inline send icon), showing history only when it exists.
- **Component:** a new shared AskAboutThis.
- **Shots:** every r, p, pp and sc shot.

**V3-7. The Activity log is a wall of run-on sentences, and leaks system text.**
- "You changed project on New in Your calendar: Budget check-in Budget check-in When: …15:07…", repeated 2–3 times.
- One entry is the raw JSON `[ "kind": "action", "id": "ACT-6"…`.
- **Fix:** a timeline grouped by day, a plain sentence truncated to 1–2 lines with an expander, the latest 5 then "Show all", and never serialised data.
- **Component:** a new ActivityList.
- **Shots:** B v6-records_project_PRJ-3-day, p01; D r-email-source.

**V3-8. "How Reginald is doing" is a text wall.**
- 17 sections, each an H3, a 12px grey paragraph and a 14px "nothing here" line, at ~620px on a 1440 screen.
- Numbers are written as sentences ("it found 0 promises of yours, and you kept 0…").
- The weekly data is five identical lines rather than a table.
- A native date form sits mid-page.
- "Back to Today" is a bare ghost link.
- **Fix:** 4 stat tiles (big number, label, change since last week); a weekly table; the remaining sections as collapsed cards, with empty ones merged into one muted line; the count form as a small card.
- **Components:** a new StatTile, Panel, RecordsTable, Disclosure.
- **Shots:** D e-d-quality, f-n-quality.

**V3-9. Files.**
- Empty: one grey line.
- Add a file: the full MIME list in 12px, a native file input, and an "About this file" fieldset box in the dialog.
- **Fix:** an EmptyState with a drop zone; in the dialog, a drop zone, a one-line list of accepted types with "See all", and no inner box.
- **Components:** EmptyState, a new FileDrop, Dialog.
- **Shots:** D e-d-records_files, f-add; B v4-records_files-day.

**V3-10. Knowledge: headings over a bare form, with no designed empty state.**
- Two grey intro paragraphs, then a 2-field form taking ~500px of 1200.
- With data: "What Reginald follows / Nothing is in use yet." sits over nothing; "Pri Remove" with Remove as bare text; an empty icon gap on a row; "Add word" looks disabled.
- Rules to look over: an empty page with "Back to Knowledge" under the title and "Instructions sent with every task: 0 of 8000 characters.".
- **Fix:** Panels, each with a one-line description, Rows with trailing actions and an inline add row; empty states as a muted line inside the panel; Back as a breadcrumb.
- **Shots:** D e-d-records_knowledge, f-n-records_knowledge, e-d-records_rules-review; B v4-records_knowledge-day.

**V3-11. The Connections add form nests boxes:** a legend-bordered fieldset inside a card inside a section; radio tiles 200–280px wide with hollow gaps; "What to read" repeated; labels written as sentences.
- **Fix:** two steps: a type card grid, then only that type's fields, with 14/600 labels and 12px hints below.
- **Shots:** S cn-choose, cn-mailbox-form.

**V3-12. Backups: duplicate sections and buttons that look like headings.**
- "Synced folder" twice, with two "Choose a folder" primaries.
- "Where it is kept instead" has a button's padding and no border, so it reads as a stray heading.
- "Make one for me" outlined next to a disabled Save.
- The grid changes from 3 columns to 1 partway down the page.
- **Fix:** one synced-folder section; one primary per section; the "where kept" control as a link with an info icon; Save enables on input; one grid throughout.
- **Shots:** S b-d-backups, b-p-backups.

**V3-13. Notices: radios sit ~5px off their labels,** and the descriptions aren't indented. A toast overlaps the brief's selects, and the two groups use different heading styles.
- **Fix:** a radio group with label and description in one grid; toasts kept out of the content area.
- **Shot:** S not-more-open.

**V3-14. Add-ons is one long stack.**
- The Available tab shows "Installed (version 0.1.0) and on / Signed in", contradicting the tab.
- Five small headings over bullets, with no actions on that tab.
- The catalog row is one line, "127.0.0.1 · read … Remove", with a centred "Add another catalog" below.
- The add-on's own page is just a key form, with Save about 900px from its field.
- **Fix:** each add-on card shows name, publisher, one line, a status pill and one action; details in a "What it can do" disclosure as a definition list; the catalog as a small list.
- **Shots:** S b-d-addons, ad-installed.

**V3-15. Handover is a title and one grey line.**
- **Fix:** an EmptyState with an icon, an "In sync" pill, the last-synced time and Check now.
- **Shot:** D e-d-handover.

## V-P2

**V3-16. Every link is underlined blue, including row titles,** so tables read as 1999 HTML. Day-mode rule 6 (no underline until hover) isn't applied.
- **Fix:** row titles in `--text` at 500 with a hover underline; prose links in `--accent-text`.
- **Token:** link styles in Row and RecordsTable.

**V3-17. Two filled primaries per screen:**
- People: "Add a person" and "Add an organization" are equal.
- Backups: two "Choose a folder".
- The person pane has a filled Edit, while the page has an outline "Edit details".

**Fix:** one filled button per region.

**V3-18. Filter controls float.** The side segmented control sits mid-title-row; People also has an "Organization" select alone on its own row. On a phone the segmented control wraps.
- **Fix:** one toolbar row under the title that scrolls sideways on a phone.
- **Components:** SegmentedControl, FilterBar.

**V3-19. Detail cards are tall stacks of bold label, then value,** at 60px per field, with duplicates ("Side" and "Sides"; "Wording" repeating the title).
- **Fix:** a 2-column definition list (110px muted label, 14px value, 36px rows); hide duplicates; group into About and Where it came from.
- **Component:** a new DefinitionList.

**V3-20. The page header varies between pages:**
- The kind chip appears on some pages and not others.
- Back sits above the chip.
- The title's position jumps (y=94 against 98) depending on "Open the setup guide".
- The detail card starts at y=162–229.
- A lone ⋯ floats at the title row's edge.

**Fix:** one PageHeader (breadcrumb, title, inline kind pill, trailing actions), with the detail panel top-aligned.

**V3-21. Empty cells are blank, and empty groups are headings over nothing.** Use a muted "–" in cells; hide empty sections or give them one line with an action.

**V3-22. A row menu with one item** ("Edit") overlaps the next row. Hide the ⋯ when there's only one action.

**V3-23. The Add a project drawer:**
- Ten equal fields, with native "Not set" selects.
- Parenthetical hints inside the labels.
- A disabled Add with its reason below it in 11px.
- Drawers are 640px here against 420px elsewhere.

**Fix:** Name and Inside first, the rest under "More details", hints below the fields, one drawer width (480px).

**V3-24. Native controls look foreign:** the date input "mm/dd/yyyy", native selects, and the native file input. Use styled Select, DateField and FileDrop.

**V3-25. Autofocus rings appear on page load** (Settings You, Appearance, Quick links, Lists, an add-on's key, Knowledge), so a page opens looking as if it has an error. Autofocus only in dialogs, with a lighter ring.

**V3-26. The Settings menu is flat text,** with "Journey mail" tacked on after Advanced. On a phone it becomes four rows of wrapping pills (~120px). Group it (Account / Data / Workspace / Advanced), put add-on pages under Add-ons, and use a scroller on a phone.

**V3-27. Settings search has a heavy label** and no icon or placeholder. Use an icon, a placeholder and a sunk fill.

**V3-28. Lists is heavy:**
- Four lists, each repeating "Used for:" and an add form.
- 3px grey left bars that look like drag handles.
- "Counts as" pills in colours that map to an internal value.
- "What it is called" sits 2px above its card.

**Fix:** accordions with a count badge, a muted second column, neutral pills, and "+ Add" opening an inline field.

**V3-29. Toasts stack** (three identical "Added X. Undo") and cover the fields they refer to. Use one toast at a time, bottom-centre or bottom-right, never over a focused field.

**V3-30. Night mode with a maroon brand:** the selected nav is a fully filled bar; "Choose what to read" and "Turn off" are dark filled; "Hand something in" is a pink block. This breaks the tonal rule. Use accent-soft for selected nav in dark mode, and tonal row buttons.

**V3-31. Typography:**
- 12px grey is the default for 3-line paragraphs, running 620–900px wide.
- Section headings switch between 14/700, 20/600 and 18 on the same page.

**Fix:** one scale (page 22, section 16–18/600, help 13/400 muted, at most 72 characters a line).

**V3-32. Quick links with nothing in them** is a form with autofocus. Use an empty-state card with an inline add row.

**V3-33. Compare:** the header, a "Back to settings" ghost and a grey legend in three weights; the empty result is a single line. Use a breadcrumb, an empty card with Measure, and the legend as a table header.

**V3-34. People on a phone:** each row's ⋯ sits on its own line (+30px a row). Put the ⋯ top-right and lay labels and values on a mini grid.

## Patterns (fix once)

1. **PageHeader:** breadcrumb, kind pill, title, trailing actions, one primary.
2. **Neutral row-title links,** with an underline on hover.
3. **DefinitionList** for detail panels.
4. **AskAboutThis composer.**
5. **ActivityList timeline.**
6. **EmptyState everywhere** (about 10 screens use a lone grey line or an empty table).
7. **SettingRow responsive grid.**
8. **InlineAddRow.**
9. **Row** (title / meta / trailing) with a wrapping action cluster.
10. **Button hierarchy:** one filled per region, outline secondary, text tertiary; no ghost headings.
11. **Toast placement.**
12. **No autofocus on page load.**
13. **One drawer width,** and no nested bordered boxes.
14. **Styled Select, DateField and FileDrop.**
15. **Dark-mode accent-soft** for selected states.

## Three screens that most need a redesign

**A. How Reginald is doing.**
- A header with a "Last 4 weeks" range and a breadcrumb.
- 4 stat tiles (number, label, change since last week, sparkline).
- A 2-column grid of cards: Weekly (a table), Mistakes, Your checks (a compact table form), Things it couldn't do.
- Empty sections merged into one muted line.
- Descriptions in "i" tooltips.

**B. Connections.**
- A header with "Add a connection" as the only filled button.
- An account card (logo, name, signed in as, status pill, ⋯).
- Its connections as a compact table: Name / What / How often / Last checked (status dot) / Privacy pill / ⋯.
- Adding is a two-step drawer.
- An empty state with "Add a connection" and "Ask how".
- Cards on a phone.

**C. Record pages.**
- PageHeader with one primary (Edit) and a ⋯.
- Two columns: main tabs (Overview, Open items, Activity) and a sticky 320px detail panel with a DefinitionList.
- Overview lists the top open to-dos with owner and due date.
- The Ask composer pinned at the bottom of the main column.
- Activity as a timeline.
- On a phone, a collapsed "Details" row.

## Gaps (no screenshot)

- A real project's own page (the shots show the side page).
- Rules to look over with data.
- Handover with a conflict.
- Files on a phone and at night.
- The organization page on a phone and at night.
- Entry and event pages at night and on a phone.
- The person pane at night and on a phone.
- Add person on a phone.
- Backups at night, and with a folder and key set.

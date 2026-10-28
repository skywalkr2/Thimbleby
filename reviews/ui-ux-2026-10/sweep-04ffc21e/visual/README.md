# Visual design review: every screen, at `04ffc21e`

**For:** the host and the owner. This is part of the full-sweep package (`../README.md`, `../TRACKING.md`).

**Seen at:** all findings come from build `04ffc21e`. Screens will change batch by batch, so each item names the screen and the master `X` id it belongs to. The host folds each item into the batch already touching that screen.

**Question asked:** do the pages look good by today's standards for modern web apps (the best-known task, mail, notes and payments apps)? That means:
- calm, with a clear hierarchy and one obvious action
- consistent components and purposeful spacing
- type that tells the story, and restrained colour
- empty states that are designed, and phone layouts that are intentional

**How it was done:**
- Three reviewers scored every screen from the sweep's ~870 screenshots (day, night and phone), on eight points from 1 to 5: Hierarchy, Layout fit, Spacing, Typography, Components, Colour, Empty states, Phone.
- I checked the headline findings against the screenshots myself.
- I built six screens as mockups on the app's own tokens (`mockups/tokens.css` is a copy of `web/src/theme/tokens.css`), rendered in day, night and phone.

**Files:**

| File | What it holds |
|---|---|
| `README.md` | This file: verdict, scores, shared fixes, per-screen findings, mockups, visual exit criteria |
| `appendix/visual-1-setup-chrome.md` | Setup and the app's chrome and overlays: full scorecard and findings V1-1 to V1-28 |
| `appendix/visual-2-work-screens.md` | Today, Schedule, What changed, Handled for you, Follow-ups, To-dos, Stages: V2-1 to V2-28 |
| `appendix/visual-3-records-settings.md` | Records, People, Files, Knowledge, quality, Handover, every Settings section: V3-1 to V3-34 |
| `mockups/*.html` | Six mockups as HTML (open in a browser), plus `mock.css` with one block per shared component |
| `mockups/*-day-1440.png`, `*-night-1440.png`, `*-day-390.png` | The mockups rendered |
| `before-after/*.jpg` | Each mockup next to the same screen from the sweep |

## 1. Verdict

**The visual system itself is sound.** The tokens are calm, day and night now pair cleanly, the accent is restrained, and nothing scrolls sideways.

**The screens don't look finished or modern.** The cause is structure, not colour. Average screen score: **2.6 out of 5.** No screen scored above 3.9, and five score under 2.

What drags them down, in order:
1. **Lists read as forms.** Every row reserves a ~140px pill column that is often empty or repeats the group heading. Row titles are underlined links. To-dos show a blank 150px gutter and an identical underlined "Where it came from" on every row.
2. **Too many controls, all at the same weight.** Headers carry two to four control groups on the title row. The rail cards are stacks of equal buttons. Opened lines have two primary buttons each.
3. **Empty states aren't designed.** About 15 screens show a single grey sentence, a heading over nothing, or a bare table header.
4. **Text is a wall of small grey type.** "How Reginald is doing" is 17 sections of 12px paragraphs. Activity logs are run-on sentences. Help text sits at 11–12px.
5. **Browser-default controls and boxes inside boxes.** Native fieldsets with the legend on the border, native selects, date and file inputs, and bordered cards nested three deep.
6. **The phone layout is squeezed rather than designed.** Rows end in full-width bars, filters wrap, and some rows collapse into one-word columns.

The six mockups show the same app with these fixed, on the same tokens. **Most of the work is in about a dozen shared components** (section 3). Fixing those lifts every screen at once.

## 2. Scores, worst first

| Screen | Overall | Weakest points | Mockup |
|---|---|---|---|
| How Reginald is doing | **1.6** | hierarchy 1, layout 1, type 1 | `quality` |
| Handover | **1.8** | hierarchy 1, layout 1, empty 1 | |
| Settings › Connections (and the add forms) | **1.8** | spacing 1, components 1, phone 1 | `connections` |
| Files | 2.1 | empty 1 | |
| Knowledge, Rules to look over | 2.1 | layout 1, empty 1 | |
| Settings › Backups | 2.1 | components 1 | |
| Settings › Add-ons | 2.1 | | |
| Setup: AI "Something else", account form, privacy | 2.3 | | `setup-ai` |
| Setup: mail sides; Another mail or calendar | 2.3 | components 1 | |
| Feedback dialog | 2.3 | | |
| A side's page | 2.4 | | `person` (record pattern) |
| Setup: People | 2.4 | | |
| Follow-ups | 2.4 | | |
| To-dos and questions | 2.4 | | `todos` |
| Settings › Notices | 2.4 | | |
| Stages | 2.4 | layout 1, empty 1 | |
| Projects table | 2.5 | phone 1 | |
| Today: rail cards; opened line | 2.5 | | `today` |
| Ask pane | 2.5 | | |
| Add to schedule | 2.5 | | |
| Setup: mail first view | 2.6 | | |
| What changed; Handled for you; People list; organization page; Your business and Lists | 2.6 | | |
| Add a project; to-do page; entry and event pages; Compare; Shortcuts | 2.7 | | |
| Schedule grid; entry panel; Setup: What it's for and Promises; People pane | 2.8 | | |
| AI and spending | 2.8 | | |
| Person page; Since yesterday; Settings shell; You; Quick links; Backups step; user menu | 2.9 | | `person` |
| Today queue; Header; You step; AI top choices; status popovers; add/edit person; fact page; Advanced | 3.0 | | |
| Welcome; Done; Hand something in drawer | 3.1 | | |
| Toasts | 3.3 | | |
| Today setup line and side tabs | 3.4 | | |
| Settings › Appearance | 3.5 | | |
| Missed something? | 3.7 | | |
| Left menu and phone bottom bar | 3.9 | | |

Each appendix has the full scorecard: all eight points per screen, with the screenshots used.

## 3. Shared components and tokens: fix once, every screen improves

These cut across batches, so they're listed apart from the screens. Each names the findings it covers, and `mockups/mock.css` has a block for each.

| ID | Component or token (in `web/src/ui` / `tokens.css`) | What it should be | Covers |
|---|---|---|---|
| **VC01** | **Row** | No fixed pill column. Title first, one meta line, trailing actions. An optional leading slot (round checkbox for to-dos, a dot for unread), zero width when empty. A pill only when it adds something the group heading doesn't. Cursor row: soft fill and a 2px left bar, with the button the same weight as on other rows. A phone variant: the whole row is tappable, actions compact or in a sheet | V2-1, V2-14, V2-18, V2-27, V1-8, V3-1, V3-2 |
| **VC02** | **PageHeader and filter bar** | Breadcrumb, title, inline kind pill, one primary on the right. Below it, an underlined tab strip with counts, then filter chips ("Who: Everyone ▾", "All sides ▾"). Nothing crowded onto the title row. On a phone, chips scroll sideways and never wrap | V2-3, V2-7, V2-9, V2-11, V2-24, V3-18, V3-20 |
| **VC03** | **Button** | Three weights only: primary solid, secondary outline, quiet text. One primary per region. Row actions are never solid. A disabled primary still reads as a primary, with its reason beside it, not under it. No ghost buttons that look like headings | V1-2, V2-4, V2-15, V3-12, V3-17 |
| **VC04** | **EmptyState** | A centred block: a 40px icon, a 16/600 title, one 14px sentence at most 44 characters wide, and one action. Used on every list, page and card. Controls that need data are hidden while empty | V2-12, V3-5, V3-9, V3-10, V3-15, V3-21, V3-32, V3-33, V1-19 |
| **VC05** | **FormField, Select, DateField, FileDrop, CheckboxGroup** | Labels 14/600 above, help 13/400 below with even gaps, and "Optional" as a tag. Styled select, date and file controls. No native fieldset with the legend on the border. No autofocus on page load (dialogs only, with a lighter ring). Search fields have an icon and placeholder, not a label | V1-1, V1-4, V1-13, V1-17, V2-5, V2-16, V3-11, V3-23, V3-24, V3-25, V3-27 |
| **VC06** | **The overlay family** | One Drawer (480px, height fits its content), one Dialog with a sticky footer, one BottomSheet on phones (with a handle). Popovers in two columns. A Menu with sections and a red danger item, anchored so it never covers its own row. The Ask pane is an overlay like the drawer, never pushing the page | V1-9, V1-11, V1-12, V1-24, V1-26, V1-27, V2-13, V2-23, V3-22 |
| **VC07** | **Toast** | One at a time (the newest replaces), with an icon, bottom-centre or bottom-right regardless of the sidebar, never over a control or a focused field | V1-28, V2-26, V3-29 |
| **VC08** | **Link and type tokens** | Row titles in `--text` 600 with an underline on hover only. One link token, the same by day and by night. Scale: page title 22, section title 16/600, row title 15/600, meta 13/400, help 13/400 at most two lines. Group headers 12/600 with a count and space above. No 12px paragraphs | V1-13, V1-14, V2-17, V2-25, V3-16, V3-31 |
| **VC09** | **Dark-mode accents and elevation** | Selected nav and states use accent-soft, not a solid fill. Row buttons tonal. Overlays get a border or shadow so they lift off the page. A low-chroma "today" column in the calendar | V1-25, V2-28, V3-30 |
| **VC10** | **Record-page parts** | A DefinitionList (110px muted label, value, 36px rows, no duplicate fields). An ActivityList (a timeline grouped by day, plain sentences, latest 5, then "Show all"). An AskAboutThis composer (one line, with an inline send button) | V3-6, V3-7, V3-19 |
| **VC11** | **RadioCard / choice card** | One level only: no nested bordered cards, no truncated descriptions, a clear selected state (2px accent ring plus a soft tint), and no heavy unselected borders | V1-3, V1-4 |
| **VC12** | **Wizard shell and StepFooter** | A centred column of 640–720px with the explanation under the step title (no side-note column). A fixed footer: Back, then "I'll do this later", then one primary. On phones a sticky bar. A step rail with check circles, not the word "Done". "Step 3 of 7" above the title | V1-2, V1-5, V1-6, V1-20, V1-21 |
| **VC13** | **Header status** | One status pill with a short label ("All good", "Needs restart") and the detail in its popover. The "Checked 3 connections… / Not looked at before…" line moves into that popover. "Missed something?" goes into the help menu | V1-22, V1-23, V2-3 |

## 4. Findings by screen

Each line gives the screen's master id where the functional sweep has one, then the visual findings (the full text is in the appendix named by its prefix). Fixing VC01–VC13 clears much of each line, so the per-screen work is what's left after those.

| ID | Screen | Master | Visual findings | Screen-specific work beyond VC01–VC13 |
|---|---|---|---|---|
| VS01 | Setup: Your AI account | X10, X11 | V1-3, V1-4, V1-5 | Follow the `setup-ai` mockup: three top cards, a 3-step checklist panel, privacy as two choice cards, the spend line as one row |
| VS02 | Setup: Mail and calendar | X01, X08, X09 | V1-1, V1-15, V1-16, V1-17 | A provider list with one Connect per row. Sides as one chip group with "Set separately". Another mail as a modal with only the chosen kind's fields |
| VS03 | Setup: What it's for, Promises, Backups, People, Done | X03, X07, X14, X15, X58 | V1-7, V1-8, V1-18, V1-19, V1-20 | The warning banner under "A job". Promises as a list of sources plus a summary strip. A folder chooser with breadcrumbs and New folder. People in shared Rows with one Add each. Done showing each actual choice |
| VS04 | Header, menus, Ask, Hand in, feedback, shortcuts | X27, X61, X62 | V1-9, V1-10, V1-11, V1-12, V1-24, V1-26 | A command-palette search with a fixed width. The user menu: profile, quality link, appearance. Shortcuts in two grouped columns with real keycaps. The Hand-in drop zone |
| VS05 | Today | X18–X28 | V2-1, V2-2, V2-3, V2-4 | Follow the `today` mockup: group headers with counts, the opened line as an inset card with one primary and "Not right" links, the brief as a short summary, the Schedule card as today's entries, Came in with dots |
| VS06 | Schedule | X45 | V2-6, V2-7, V2-13, V2-19, V2-20, V2-21, V2-22, V2-28 | A 64px hour gutter with no clipped labels. Entries at least 28px tall. Opens scrolled to now. A now-dot. A two-row toolbar. Month cells white, with today as a filled circle. Keyboard help moved to the ? menu |
| VS07 | What changed, Since yesterday | X29, X65 | V2-8, V2-24 | Group by time. Collapse identical runs ("×4"). Learning shown as a muted line in its row. No inner card in the pane |
| VS08 | Handled for you | X30 | V2-11 | Tabs with counts, a 280px search with an icon, "Group by" as a dropdown, one-line rows |
| VS09 | Follow-ups | X31 | V2-9 | The status tabs as the only tabs. One "Copy message". "You" as a link row. Message style in a drawer |
| VS10 | To-dos and questions | X33 | V2-5, V2-10 | Follow the `todos` mockup: a round checkbox, one meta line, an inline add row, filter chips, a sectioned menu with Drop in red, one editor at a time |
| VS11 | Stages | Y04 | V2-12 | An EmptyState that says what a stage is |
| VS12 | Projects, a side's page, Add a project | X43 | V3-4, V3-5, V3-23 | Hide columns that are empty for every row. Size columns by content. Sides as group headers. Short drawer, with "More details" folded |
| VS13 | People, person, organization and record pages | X37, X40, X41 | V3-6, V3-7, V3-19, V3-20, V3-22, V3-34 | Follow the `person` mockup: PageHeader, overview tabs, a sticky details panel, a timeline, the composer at the bottom |
| VS14 | Files, Knowledge, Rules to look over | X39, X46 | V3-9, V3-10 | A drop-zone empty state. Knowledge as panels with inline add rows |
| VS15 | How Reginald is doing | X59 | V3-8 | Follow the `quality` mockup: 4 stat tiles, a weekly table, a "mistakes to look at" list, your own count as a small card, empty sections in one line |
| VS16 | Handover | X63 | V3-15 | An EmptyState with an "In sync" pill, the last sync time and Check now |
| VS17 | Settings shell and sections | X51, X54, X57, X58, Y03 | V3-3, V3-12, V3-13, V3-26, V3-27, V3-28, V3-32, V3-33 | A grouped Settings menu (You / Assistant / Your data / More), with add-on pages under Add-ons. Setting rows that stack on a phone. One synced-folder section. Lists as accordions. Radio rows on one grid |
| VS18 | Settings › Connections | X09, X53 | V3-1, V3-2, V3-11 | Follow the `connections` mockup: an account card with a status pill and a sources table. Adding is a two-step drawer |
| VS19 | Settings › Add-ons | X52 | V3-14 | Each card: name, publisher, one line, status pill, one action. Details in a disclosure |

## 5. The mockups

Each one is the screen from the sweep, rebuilt with the shared components above and the app's own tokens. The words come from the functional fixes in the master list, for example "This is me", "might be", and dates in words. **Open the `.html` in a browser, or see the PNGs.**

| Mockup | Day | Night | Phone | Before → after | What changes |
|---|---|---|---|---|---|
| Today | `today-day-1440.png` | `today-night-1440.png` | `today-day-390.png` | `before-after/today.jpg` | Groups with counts, no pill column, one primary per line, the review opened as an inset card, a calm three-card rail, one header status pill |
| To-dos and questions | `todos-day-1440.png` | `todos-night-1440.png` | `todos-day-390.png` | `before-after/todos.jpg` | Round checkboxes, one meta line with the source, dates in their state colour, an inline add row, tabs plus filter chips |
| Settings › Connections | `connections-day-1440.png` | `connections-night-1440.png` | | `before-after/connections.jpg` | A grouped Settings menu. An account card with "Choose what to read" and a ⋯ menu. Sources as a table with privacy pills and status dots |
| How Reginald is doing | `quality-day-1440.png` | `quality-night-1440.png` | | `before-after/quality.jpg` | Stat tiles with trends, a weekly table, mistakes as rows to act on, your own count as a small card, empty sections in one line |
| A person's page (the record-page pattern) | `person-day-1440.png` | `person-night-1440.png` | | `before-after/person.jpg` | PageHeader with a breadcrumb, tabs, open items with checkboxes, a timeline, the composer, a sticky details list |
| Setup: Your AI account | `setup-ai-day-1440.png` | `setup-ai-night-1440.png` | | `before-after/setup-ai.jpg` | A centred column, step-rail circles, three choice cards, a 3-step checklist with links, privacy as two cards, a fixed footer with one primary |

The mockups use the app's real token values. Night is the same markup with the dark scheme. Phone is the same page at 390px with the phone rules in `mock.css`.

## 6. Visual exit criteria

These are added to `../TRACKING.md` as E9–E12. The round isn't done until they hold:

- **E9.** Every screen in the inventory re-scores **at least 3.5 overall**, with **no single point below 3**, on the same 8-point rubric, by day, by night and on a phone. The reviewer re-scores from fresh captures.
- **E10.** VC01–VC13 are built as shared components in `web/src/ui` (or as tokens), and used everywhere, with no local copies. The style guide page shows each in its states, in both themes.
- **E11.** The six mockup screens are built to match their mockup, or a variant the owner approves. Checked by a side-by-side capture in the hand-over.
- **E12.** Visual guards in CI, on every inventory screen:
  - no native unstyled `<fieldset>` legend, `<select>`, `input[type=date|time|file]`
  - no paragraph text under 13px (pills, captions and keycaps excepted)
  - no autofocus on page load (dialogs and drawers excepted)
  - at most one solid primary button per region (a page header, a card, a dialog footer)
  - no list row with an empty leading column

**Beyond this round:** 3.5 is the gate for now, not the goal. `PATH-TO-4.6.md` sets E13 (4.0) and E14 (4.6). It covers the work (VP01–VP15), a standard for each point, and a stricter scoring method. A separate reviewer scored the six mockups cold at **3.6 on average**. So building them gets the app to E9 and no further. The rest of the way is states, the phone, interaction and craft.

## 7. Gaps (no screenshot in the sweep)

Each appendix lists what it couldn't see. Taken together:
- **Stages with data;** Since yesterday with data, and at night.
- **Night:** What changed with data; the opened Today line; Follow-ups' message pane; To-dos' menu and editors; Add to schedule; the Hand-in drawer; the Ask pane.
- **Phone:** the Schedule with events; dialogs and menus; Files; the organization page.
- **A real project page** (as opposed to a side's page); Handover with a conflict; Backups with a folder and key set.
- **The AI providers' error states;** the sign-in popup.

The fresh captures for E9 must cover these, and I'll score them in the re-sweep.

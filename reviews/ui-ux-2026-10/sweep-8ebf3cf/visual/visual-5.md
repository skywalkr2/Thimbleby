# Visual 5 at 8ebf3cf: Settings

**Headline:**
- Up about 0.3 on 04ffc21e, from shared fixes: the label/field/hint grid, a grouped menu, pills, a phone tab bar, Connections' account card and table.
- The screens still look like a form generator.
- **Brand is about 1.5 everywhere**, and 1.2 on Backups, which shows "cockpit restore".
- **Stage A:** only the sign-out dialog and the user menu.

## Scorecard
The scores are Hierarchy, Layout, Spacing, Type, Components, Colour, Empty, Phone.

| Screen | States | Scores | Overall | Brand | Stage | Against 04ffc21e |
|---|---|---|---|---|---|---|
| Settings shell, menu, search | D N P | 3/3/2.5/3/3/3/–/3 | 2.9 | 1.5 | none | 0 |
| You | D P | 3/3/2.5/3/3/3/–/2.5 | 2.9 | 1.5 | none | 0 |
| Your business and Lists | D | 3/3/3/3/3/3/2.5/3 | 2.9 | 1.5 | none | +0.3 |
| AI and spending | D N | 3/3/3/3/3/3/2.5/3 | 2.9 | 1.5 | none | +0.1 |
| AI and spending, work list open | D | 2/2/3/2.5/3/3/–/– | 2.6 | 1.5 | none | new |
| Compare › Measure | D | 2.5/2.5/3/3/3/3/2.5/– | 2.8 | 1.5 | none | +0.1 |
| Notices | D | 3/3/2.5/2.5/2.5/2.5/–/– | 2.8 | 1.5 | none | +0.4 |
| Backups | D P | 2.5/2.5/2.5/2.5/2.5/3/2.5/2.5 | 2.6 | 1.2 | none | +0.5 |
| Folder chooser | D | 2.5/2/2.5/2.5/2.5/3/1.5/– | 2.4 | 1.5 | none | new |
| Appearance | D N | 4/3/3.5/3.5/3.5/3/–/– | 3.4 | 1.5 | none (0.1 short) | −0.1 |
| Quick links | D | 3/3/3/3/3/3/2.5/– | 2.9 | 1.5 | none | 0 |
| Connections | D N P | 2.5/2.5/2/2.5/2.5/3/2.5/2.5 | 2.5 | 1.5 | none | +0.7 |
| Add drawer, step 1 | D | 3×6 | 3.0 | 1.5 | none | new |
| Add drawer, step 2 | D | 2.5×5/3 | 2.6 | 1.5 | none | new |
| Sign-out dialog | D | 4/4/3.5/3.5/3.5/3.5/–/– | 3.7 | 1.5 | **A** | new |
| Add-ons | D P | 2.5×5/3/2.5/3 | 2.6 | 1.5 | none | +0.5 |
| An add-on's page | D | 2.5/3/3/3/2.5/3/2/– | 2.7 | 1.5 | none | new |
| Advanced | D | 3×6 | 3.0 | 1.5 | none | 0 |
| Feedback dialog | D | 2.5/3/2/3/3/3/–/– | 2.8 | 1.5 | none | +0.5 |
| Help menu | N | 3.5/3.5/3/3.5/3/3.5 | 3.3 | – | none | new |
| User menu | D | 3.5×6 | 3.5 | – | **A** | +0.6 |

**Settings pages:** about 2.8 on average, against about 2.5 at 04ffc21e.

## The VP items in the way
- **To reach B on most pages:** VP03 (type scale), VP02 (rows), VP04 (primary discipline) and VP16 (brand).
- **Page by page:**
  - **The shell:** the menu spacing and the repeated "You" (VS17); VP08 on a phone.
  - **AI and spending:** VP02 and VP05; the open work list also needs VP07 and a table.
  - **Compare:** VP05 and VP07, and a breadcrumb.
  - **Notices:** one grid, and visible disabled radios.
  - **Backups:** one card per topic, a path chip, VP11 and VP04.
  - **The chooser:** a breadcrumb, New folder, VP07 and VP13.
  - **Appearance:** 0.1 from A; VP16 belongs here.
  - **Connections:** VP02, VP05, VP11, VP01, VP08.
  - **The Add drawer:** VP04 (two primaries on step 2).
  - **Add-ons:** card anatomy (VS19).
  - **The add-on page:** VP07 and VP03.

## Findings
### V-P1
1. **Connections:** "Sign out" and "Add another account" float as bare grey text in a 148px card titled "Example mail", with the address as a 13px line.
2. **Connections rows** are four-line walls of text, with no icons and top-aligned columns.
3. **Status contradicts itself:** a green "Read" on rows saying "Not read until you sign in", while the header says "All good".
4. **A folder source row** is named "source", with an orphan "· last read".
5. **The Settings menu:** each group label sits closer to the item above it. "You" appears as both group and page. Labels are the same size as items.
6. **Backups is a stack of unrelated controls:** an option card with its confirm button 60px away, a raw 150-character path, a lone "Back up now", the restore paragraph showing "cockpit restore", and a key field with buttons floating 40px below.
7. **Add-on cards are walls of text** (about 375px, 11 lines), with the status hidden at the bottom. Available lists an installed add-on.
8. **An add-on's page is a bare form,** with Save about 350px from its field and an orphan label.
9. **Compare** shows a failure and the empty state together, a 12px back link, and a title the size of the body text.
10. **On a phone,** each Connections row stacks into labelled lines and takes 190px.
11. **On a phone,** the "act on" row squeezes its hint into 100px.
12. **Notices:** disabled radios are nearly invisible, the radio sits off its baseline, two layouts are mixed, and hints are cut.

### V-P2
1. **No brand on any Settings page.** The selected item looks different by day and by night.
2. **Each section's header takes 190px** before any content.
3. **No shared grid:** edges at 1416, 1124 and 590; a 920px field for a 40-character name.
4. **Four secondary button styles,** and two primaries per viewport.
5. **Section titles** are the same weight as row labels.
6. **Native controls:** triangles, bullets, selects, a tab strip.
7. **The feedback dialog:** text collides, and three text areas compete.
8. **The chooser** is bare.
9. **The help menu** repeats its icons, and offers keyboard shortcuts on a phone.
10. **Toasts** overlap row text.
11. **The AI account card:** three lines of 13px text, and the name "127.0.0.1:9555".
12. **The AI work list:** ten identical rows.
13. **A heavy search box.**
14. **Help text:** about 12 grey paragraphs at 12–13px on Notices and Backups.

## Connections against the new mockup
**What's missing or different:**
- the breadcrumb and serif title; the Add button is filled and competes with the header's button
- the menu: inverted spacing, and indigo instead of cream
- the header status: says "All good" instead of "1 account needs you"
- the account card: the address as its title, an icon tile, status with icon and word, side chips, one action, the red edge
- the failing state, and its "Sign in again"
- the sources: a separate table of four-line rows, not compact rows inside the card
- the privacy pill style
- folder rows
- the phone cards
- the brand

**What's there:** the account block, a status dot with a word, and a good sign-out dialog.

## Better since 04ffc21e
- The settings row grid.
- Connections' card and table.
- The user menu.
- The phone tab bar and the section chooser.
- The sign-out dialog.
- Pills, and 8px fields.
- The search icon.
- The folder chooser exists.
- Quick links' character count.

## Worse or unchanged
- Appearance is down 0.1.
- The page header has grown.
- The grey help text.
- The phone's "act on" row.
- The selected state by night.
- Raw paths and hosts.
- "All good" while a connection fails.

## Gaps
- Dialogs on a phone and at night.
- Most Settings pages on a phone and at night.
- The 1024 and 768 widths.
- Appearance's "More settings".
- Hover and focus.
- Empty Connections, Add-ons and Lists.

## The three screens most in need of a redesign
- **Connections:** as the mockup.
- **Backups:** a card per topic, a Restore button.
- **Add-ons:** a card per add-on, with a Details disclosure.

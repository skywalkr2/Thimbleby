# Visual 4 at 8ebf3cf: several businesses, several mailboxes, one failing

**Bottom line:**
- List- and table-based screens take long names and nine rows at 1440. Names wrap in Projects, Settings › Business, the More sheet and setup.
- **The side filter strip is the component that fails:** unusable at 390 with long names, and up to 90px at 1024.
- **Most screens drop 0.1 to 0.2 against one account.** The big drops: the left menu (−0.6), the status popover with a failing account (−0.8), and setup's Mail step with three accounts (−0.5).
- **Connections** is 3.0 when healthy and 2.2 when one account fails, against the mockup's 3.6.
- **Stage A:** only the More sheet at 390. **Brand:** 1.0.

## Scorecard
The scores are Hierarchy, Layout, Spacing, Type, Components, Colour, Empty, Phone.

| Screen | States | Scores | Overall | Stage | One account (drop) |
|---|---|---|---|---|---|
| Today, all sides | 1440, 1024, 390, light and dark | 3.5/3/3/3/3/3.5/3/2 | 3.0 | none | 3.1 (−0.1) |
| Today, filtered | 1440 | 3/3/3/3/3/3.5/3/– | 3.1 | none | 3.1 (0) |
| **The side filter strip** | every page | 2.5/2/2.5/3/3/3/–/1.5 | 2.4 | none | new |
| Left menu and icon rail | 1440, 1024 | 3.5/3/3/3/3/3.5/–/– | 3.2 | none | 3.8 (−0.6) |
| Schedule: Work week and Week | all | 3/2.5/3/3/3/3/3/2.5 | 2.9 | none | 3.1 (−0.2) |
| Schedule: Month | 1440 | 3.5/3.5/3.5/3/3.5/3/3/– | 3.3 | none | 3.4 (−0.1) |
| Schedule: Timeline | 1440 | 2.5/2.5/3/2.5/3/3/2/– | 2.6 | none | 2.7 (−0.1) |
| Schedule: entry pane | 1440 | 3.5/2.5/3/3.5/3.5/3/–/– | 3.2 | none | 3.4 (−0.2) |
| Schedule: Add form | 1440 | 3/2.5/3/3/2.5/3/–/– | 2.8 | none | 2.9 (−0.1) |
| What changed | 1440 | 2.5/2.5/3/3/2.5/3/3/– | 2.8 | none | 2.9 (−0.1) |
| Handled for you | 1440 | 3/2.5/3/3/2.5/3/3/– | 2.9 | none | 3.0 (−0.1) |
| Follow-ups | 1440 | 2.5/2.5/2.5/3/2.5/3/3/– | 2.6 | none | 2.7 (−0.1) |
| Projects | all | 3/3.5/3/3/3/3.5/3/2.5 | 3.1 | none | 3.0 (+0.1) |
| People | 1440, 390 | 3/2.5/3/3/3/3/3/2.5 | 2.9 | none | 3.1 (−0.2) |
| Person page | 1440 | 3/3/3/3/3/3.5/3/– | 3.1 | none | 3.3 (−0.2) |
| Side pages | 1440 | 2.5/2.5/2.5/3/3/3/3/– | 2.8 | none | 3.0 (−0.2) |
| Settings › Connections, healthy | 1440, 390 | 3/2.5/3/3/3/3/3/3.5 | 3.0 | none | mockup 3.6 |
| Settings › Connections, failing | 1440 | 2/2/2.5/2.5/2/2/2.5/– | 2.2 | none | new |
| Settings › Business | all | 3.5/3.5/3/3.5/3/3.5/3/3.5 | 3.3 | none | new |
| Setup Mail, 1 account | 1440 | 3×6 | 3.0 | none | 3.0 |
| Setup Mail, 3 accounts | 1440, 390 | 2/2/2.5/2.5/3/3/–/2.5 | 2.5 | none | 3.0 (−0.5) |
| Hand in drawer | 1440 | 3.5/3/3/3.5/3/3.5/–/– | 3.3 | none | 3.3 |
| More sheet | 390 | 4/4/3.5/3.5/4/3.5/–/4 | 3.7 | A | 3.8 |
| Header popover, one account failing | 1440 | 2/2/2.5/2/3/2.5/–/– | 2.3 | none | 3.1 (−0.8) |

- **Holds up:** Projects, Settings › Business, the More sheet, Month, Hand in, the setup checkbox lists.
- **Drops:** everything carrying the strip, the left menu, Week and the entry pane, People and the person page, side pages, failing states, setup's Mail step.
- **Fails:** the strip at 390, and the failing-account states.

## The VP items in the way
VP16 for all; then:
- **Today:**
  - VP11: the strip, sidebar clipping, cut clash titles.
  - VP12: five identical rail icons, a three-row strip at 1024.
  - VP01: the strip at x=340 on one page and x=272 on another.
  - VP04, VP08.
- **The left menu:**
  - VP11: no ellipsis or tooltip.
  - VP12: identical icons.
  - VP02: an 8px sideways shift.
- **The Schedule:**
  - VP11: "Supplie r call", a 170px all-day lane.
  - VP12: about 130px columns when the pane opens.
  - VP05: no per-calendar colour.
  - VP01.
- **What changed, Handled and Follow-ups:**
  - VP01 and VP04: two to four stacked strips.
  - VP05: no side or mailbox on rows.
  - VP03.
- **Projects and People:**
  - VP02: five to seven blank columns.
  - VP08: 108px group boxes on a phone.
- **The person page:** VP11 (the email breaks, the sides show twice).
- **Connections:**
  - VP05: "Signed in" in green while all rows are red.
  - VP02: no grouping by account.
  - VP11: nine rows reach 1300px.
  - VP07: no failing, retrying or reconnecting design.
- **The popover:** VP07, VP05, VP01.
- **Setup Mail with 3 accounts:** VP03, VP02, VP04.

## Findings
### V-P1
1. **The side strip is unusable at 390 with long names.**
   - Chips clip at both edges.
   - The strip is centred, so a long chip's left half can't be reached.
   - The track wraps into a lumpy blob.
   - It adds about 130px above the Schedule.
   - **Fix:** one SideFilter component. At 390, a "Side: All ▾" button opening a sheet. At 1024 and 1440, one row that scrolls with a fade, chips of about 22ch with a tooltip, left-aligned, a 12px track radius.
2. **The strip's position and shape change from page to page:** right-aligned at x=340 or 520, left-aligned at 259, sharing a row with tabs, wrapping to two or three rows, a white selected pill on a grey track. **Fix:** one slot under the title, left-aligned, one row, with the selected chip in accent-soft with an underline.
3. **A failing account is told in a red wall that the page contradicts.**
   - A 14-line red popover, with a 90px void beside it.
   - A green "Signed in" beside nine "Failed" rows.
   - A red-barred lowercase sentence nine times over 1300px.
   - No "Sign in again".
   - **Fix:** a ConnectionCard per account with a red edge, "Needs sign-in" and "Sign in again", its parts folded into one line; the popover with one row per failing account; a slim banner on Today ("1 of 3 accounts needs you").
4. **The left menu:**
   - It clips names at x=231 with no ellipsis.
   - It shifts 8px sideways on side pages.
   - At 1024 the five side icons are identical.
   - **Fix:** an ellipsis and tooltip, a monogram or colour dot per side, overflow hidden.
5. **Setup's Mail step with three accounts is a 1900px wall** (3010px at 390):
   - a bold nine-item run-on
   - three identical checkbox blocks
   - Continue floating mid-page
   - the fixed Back bar covering a checkbox on a phone

   **Fix:** one row per account with a "For:" chip row and Change, which opens a popover; three success rows; Continue in the footer.
6. **The Schedule:**
   - All grey, with no way to tell calendars apart.
   - Entries crushed when the pane opens.
   - The same invitation twice.
   - Three identical all-day "Due:" rows.

   **Fix:** a 3px side-coloured edge on each entry, side and address in the pane, all-day entries as chips with "+3 more", the pane as an overlay below 1280px, and a per-calendar legend with toggles.
7. **The Connections table:** nine 119px rows of four lines each, the address buried in line 2, Privacy and Status at the far right, and "Sign out" and "Add another account" as bare text.

### V-P2
1. **The Settings menu headings** sit closer to the group above than to their own items. "You" appears twice.
2. **Four stacked toggles on Follow-ups,** three on Handled, in different pill styles.
3. **No side or mailbox marker on rows.** "Your inbox" is repeated for every account. **Fix:** a coloured dot and the side name in the meta.
4. **Projects on a phone:** 108px group header boxes, labels above values, the "…" on its own line.
5. **The person page:** the email cut mid-address in a 200px column, the sides twice. **Fix:** a middle ellipsis, side chips once, a 400px card.
6. **Side pages are bare:** "Nothing filled in yet.", "Read by 127.0.0.1:9655", a bare Back, and no list of the side's accounts.
7. **The Add form:** three 140px columns cut "Does not re…", a native side select, and no calendar choice.
8. **Hand in:** doesn't preselect the side it was opened from, ten flat options, and a pale Hand in button.
9. **What changed's pane** is a column of underlined links.
10. **The Evening wrap-up** is a whole card holding only "Close for today", and the rail is 290px longer than the main column.
11. **The Timeline:** three of five lanes, "Personal" over "Personal", a wrapped label, a seven-item legend.
12. **The More sheet:** a 14px icon among 18px ones, offset by 4px.

## Connections against its mockup (3.6)
- **The title:** the page is titled "Settings", with "Connections" a 16px heading over two paragraphs.
- **The account card:**
  - The badge comes before the name, and the addresses are 12px lines with "Sign out" in text.
  - **What's missing:** an avatar, a status per account, the Connected chip.
- **The rows:** a separate table of 119px rows (Connection, Privacy, Status, Actions).
  - **The "For" (sides) column is missing.**
  - The rows aren't grouped under their account.
  - Sentences take the place of "Last checked" with a dot.
- **The failing row:** a red "Failed" and a sentence, nine times, against the mockup's amber "retrying".
- **The header:** "Connection failed" against a green "Signed in".
- **The Add button:** "Add mail, calendar or folder" doesn't fit at 390.

**What it should be:** one ConnectionCard per account address, with:
- an avatar, the address as its title, the service in muted text, side chips, and a status
- the parts as 43px rows with a dot
- for a failing account, a red edge and "Sign in again"
- one Add button in the header

## Gaps
Not captured:
- Connections at night and at 1024.
- The retrying state on its own.
- Business dialogs with long names.
- The work views at 390 and 1024 with the strip.
- The Schedule at 390 beyond the Day view.
- The Add form's side select opened, and the form at 390.
- The person and side pages at 390 and at night.
- People at 1024.
- The popover at 390 and at night.
- Setup Mail at night and at 1024.
- What it's for with five sides.
- The collapsed menu at 1440.
- Hand in at 390.
- Six or more sides: at five the strip already ends at x=1400.

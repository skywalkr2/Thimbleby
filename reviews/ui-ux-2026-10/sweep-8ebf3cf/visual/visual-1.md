# Visual 1 at 8ebf3cf: setup and app chrome

**Rubric:** the 8 points as at 04ffc21e, with brand scored separately. Stages: A at 3.5, B at 4.0, C at 4.6. **States:** D day 1440, N night, P phone 390.

## Scorecard
The scores are Hierarchy, Layout, Spacing, Type, Components, Colour, Empty, Phone.

| Screen | States | Scores | Overall | Brand | Stage | Against 04ffc21e |
|---|---|---|---|---|---|---|
| Wizard shell and step rail | D N P | 3.5/4/3/3/3.5/3.5/–/3.5 | 3.4 | 1 | none | +0.5 (2.9) |
| Welcome | D N P | 3/3/3/3.5/3.5/3.5/–/4 | 3.4 | 1 | none | +0.3 (3.1) |
| You | D N P | 4/3.5/3.5/3.5/3.5/3.5/–/3 | 3.5 | 1 | A | +0.5 (3.0) |
| What it's for | D P | 3/2.5/3/3/3/3.5/3/3 | 3.0 | 1 | none | +0.2 (2.8) |
| AI: top choices | D N P | 3.5/3/3/3.5/3.5/3.5/–/3.5 | 3.4 | 1 | none | +0.4 (3.0) |
| AI: Something else, account form, privacy, Advanced | D | 3/2.5/3/3/3/3.5/–/– | 3.0 | 1 | none | +0.7 (2.3) |
| Mail: first view, app-password steps | D | 3/3/2.5/3/3/3/3/– | 2.9 | 1 | none | +0.3 (2.6) |
| Mail: connected, sides | D | 3/3/3/3/3/3/–/– | 3.0 | 1 | none | +0.7 (2.3) |
| Mail: Another mail or calendar dialog | D | 3/3/3/3/3/3.5/–/– | 3.1 | 1 | none | +0.8 (2.3) |
| Your promises | D | 3/2.5/3.5/3/3.5/3.5/3/– | 3.1 | 1 | none | +0.3 (2.8) |
| Backups and folder chooser | D N P | 4/3.5/3.5/3.5/3.5/3.5/3.5/3.5 | 3.6 | 1 | A | +0.7 (2.9) |
| People | D N P | 3/2.5/2.5/3/2.5/3.5/3/3 | 2.9 | 1 | none | +0.5 (2.4) |
| Done | D N P | 3.5/3.5/3.5/3.5/3.5/3.5/3/3.5 | 3.4 | 1 | none | +0.3 (3.1) |
| Header | D N P | 3.5×6/–/3.5 | 3.5 | 1 | A | +0.5 (3.0) |
| Status and Reginald popovers | D | 3/3/3/3/3/3.5/–/– | 3.1 | 1 | none | +0.1 (3.0) |
| User menu, help menu | D | 3.5/3.5/3/3.5/3/3.5/–/– | 3.3 | 1 | none | +0.4 (2.9) |
| Left menu | D N | 4/4/4/3.5/3.5/3.5/–/– | 3.8 | 1 | A | −0.1 (3.9) |
| Phone bottom bar and sheets | P | 4/4/3.5/3.5/4/3.5/–/4 | 3.8 | 1 | A | new |
| Hand something in drawer | D | 3.5/3/3/3.5/3/3.5/–/– | 3.3 | 1 | none | +0.2 (3.1) |
| Ask pane | D | 3/2.5/3/3/2.5/3/3/– | 2.9 | 1 | none | +0.4 (2.5) |
| Toasts | D | 3.5/4/3.5/3.5/3.5/4/–/– | 3.7 | 1 | A | +0.4 (3.3) |
| Today setup line | D | 3.5/3.5/3.5/3/3/3.5/4/– | 3.4 | 1 | none | 0.0 (3.4) |

**Area average:** 3.30 (22 screens), against about 2.9 for the same screens at 04ffc21e. **Stage A:** 6 of 22. **Brand:** 1 everywhere.

**Brand detail:**
- An indigo monogram with the workspace initial.
- "Getting started" as plain text.
- No mark, cream, burgundy, gold, serif or ✳.
- Periwinkle by night.
- "Thimbleby" appears only in "Backups › Thimbleby".

## The VP items in the way
- **To reach A:**
  - VP01: the footer and column edges.
  - VP03: the 12px help text, and an 11px "Step n of 8".
  - VP02 and VP04: a body-level Continue, and two "Continue setup" buttons.
  - VP05: the disabled-reason sentence beside the button.
  - People: VP02.
  - AI › Something else: nested cards.
  - Hand in, Ask and the popovers: one overlay family.
- **To reach B:**
  - VP16, the brand: the gate for every row.
  - VP08: no mark on the phone header.
  - VP06: night cards show only by their hairline.
  - The left menu: long names clipped, one book icon for both Notes and Knowledge, "Keeping track" wrapping.
  - VP07: no loading, error or offline states for the header and toasts.
- **To reach C:** VP17 (brand moments) and VP09/VP10 (motion and keyboard).

## Visual findings
### V-P1
- **V1. The wizard footer is misaligned and jumps:**
  - Back floats at x≈462, on neither the rail's edge (246) nor the column's (514).
  - Continue ends at 1246 while the column ends at 1194.
  - With a disabled reason showing, Continue jumps to x≈1000.
  - Fix: the footer inside `--content-max`, with fixed positions and the reason above the footer.
- **V2. The Ask pane is a docked 480px pane** with no scrim. It clips row buttons ("Giv", "R"), has no close X, a pale Ask button, an answer like a wall of text, and bare Helpful and Not helpful. The header search shows no results list as you type. Fix: a Drawer, and a command palette.
- **V3. AI › Something else nests three levels of cards,** with four mixed paragraphs after "Works", in a step about 1900px tall.
- **V4. People is a raw bullet list:** Remove at a different x on each row, a 640px select, a 190px paste box, pale disabled buttons.
- **V5. The header popovers are misaligned:** columns off by 2 to 13px, a 60px gap, "Reginald" twice. A second popover is a different shape (420px) and overlaps the Schedule card.
- **V6. Done lists step names only,** not the choices made.
- **V7. The connected mail step has no primary in the footer.** Continue sits in the body, "Connect another" is centred, a focus ring is left on Change, and there's no success chip.

### V-P2
- **V8. No brand anywhere** (VP16 and VP17). The Welcome and Done pages are plain.
- **V9. The phone wizard shows its progress three times** ("You · 1 of 8", a Steps pill, "Step 1 of 8") under a 120px header.
- **V10. The phone footer wraps on Backups.**
- **V11. A "Recommended" chip pushes its card's title down 27px.** The AI cards use a 2+1 grid.
- **V12. Icons misused** in the help, user and More menus: a check used as an icon, and a shared speech bubble.
- **V13. The left menu:** names clipped with no ellipsis, one book icon twice, three identical grid icons, a 14px collapse button.
- **V14. The Hand-in drawer:** a dashed box, a bare "Choose a file", a full-width segmented control, and a drawer that isn't full height.
- **V15. The setup line:** a square "0 of 7" chip, a menu with only Hide that overlaps the Schedule, and two "Continue setup" buttons.
- **V16. A warning toast shows a success check.**
- **V17. The rail with skipped steps** has uneven row heights.
- **V18. Seven green checks at night** make the rail noisy.
- **V19. What it's for:** the banner touches the next title, there are two 108px boxes per business, Remove is 12px. The mail first view has no gaps between its parts.
- **V20. The Backups chooser** has no breadcrumb, and "Go up one folder" floats.

## Better since 04ffc21e
- The wizard shell: the column, the rail and a fixed footer.
- Sides as checkboxes.
- The promises step's two buttons are gone.
- The app-password steps.
- The phone wizard's sticky footer.
- The header pill and fixed-width search, with "Missed something?" moved into a menu.
- The phone sheets: a handle, the 44px "+", an active tab.
- The toast's icon and position.
- The Backups 2×2 grid and the chooser's empty state.

## Worse or new
- The footer is misaligned (V1).
- Left-menu clipping and the duplicate icon (V13).
- The warning toast with a check (V16).
- The phone's triple progress (V9).
- The brand is unchanged.

## Gaps
- **Phone:** Ask, Hand in, the popovers, the user menu, and the AI and mail steps.
- **Night:** the popovers, menus, Ask, Hand in, toasts, mail, the chooser, What it's for, and the sheets.
- **Never captured:** the collapsed menu, Shortcuts, Feedback, the promises result, backup failures, the AI errors, and mail while connecting.

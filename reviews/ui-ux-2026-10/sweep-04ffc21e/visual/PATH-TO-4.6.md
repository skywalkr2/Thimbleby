# Path to 4.6: from "no longer looks broken" to "looks as good as the best"

**Where this sits:** this extends `README.md` (the visual review at `04ffc21e`). The 3.5 bar in E9 is the gate for this round. This page sets the next two: **4.0 (E13)** and **4.6 (E14)**. It also covers the work, the standards and the scoring method for each.

**For the host:** none of this blocks the current round. Finish E1–E12 first. The VP rows below are already in `../TRACKING.md`, under their stage, so nothing gets lost in between.

## 1. Where we are

| | Average | Lowest points | What it means |
|---|---|---|---|
| The app at `04ffc21e` | **2.6** | empty states, layout, hierarchy | Looks unfinished in places |
| **The six mockups**, scored cold by a separate reviewer on the same rubric | **3.6** (3.5–3.7) | empty and edge states 2.5–3.0, phone 3.0–3.4, layout fit 3.0–3.7, components 3.5–3.7 | Clean and consistent, but not yet crafted |
| Target | **4.6** | no point below 4.3 | A design lead at a top app company would ship it with only nits |
| **Brand** (the new point 9, section 4b) | about **1.5** in the app and about **4.0** in the brand preview (the reviewer's estimate; scored cold in the re-sweep) | No mark, no brand colour, no brand type | The app looks like a generic tool, not like the product on its website |

**The honest consequence:** building the mockups exactly (E11) lands the app at about 3.5–3.7. That is enough for E9, and no more. **The gap to 4.6 is about one full point on every screen.** Most of it is in five places. The first four don't show in a static mockup:
1. **States:** empty, loading, error, offline, conflict, and 0, 1 or 100+ items.
2. **The phone:** a real tab bar and rows that stack.
3. **Interaction:** hover, pressed, focus, motion, keyboard and undo.
4. **Craft:** shared edges, a tighter type scale, one primary per view, status that isn't colour alone.
5. **Brand:** the product has a finished identity (a thimble mark, burgundy, cream and brass, a serif for headlines), and **none of it is in the app**. The app still uses the generic indigo default, system fonts and an initials monogram.

**Checked by the reviewer before acting on the cold scoring:**
- **Correct:** the setup mockup's render was broken: the footer was stuck mid-page over clipped content. It's fixed and re-rendered, along with its before-and-after image. The setup mockup also showed "Works" next to an empty key. Now it shows a masked key.
- **Not correct, so dropped:**
  - "Meta text is below the contrast minimum." `--text-subtle` measures **4.91:1** on the page background and 5.0:1 on sunk wells, which passes AA.
  - "The icons are placeholders." Only the mockups use placeholder squares. The app already has a line-icon set (`web/src/ui/Icon.tsx`).

## 2. What each point needs, at 3.5 and at 4.6

| Point | 3.5 looks like (this round) | 4.6 looks like (the target) |
|---|---|---|
| 1 Hierarchy | One primary per region; the page title says what the page is | **One primary per viewport**. The thing that needs the person outweighs everything else on screen. Supporting detail (a review list, a note) is folded until asked for. Every page leads with a one-line "so what" where it has numbers |
| 2 Layout fit | No form-like lists, no pill column, no dead gutters | **Every block shares two edges** (one content grid). The rails end level with the main column or sit naturally under it. No card inside a card inside a card. The layout adapts to the amount of content: filters hidden below about 12 items, lists grouped by what matters (Overdue, Today, Upcoming) |
| 3 Spacing | Consistent tokens | **One vertical rhythm**: two row heights, fixed gaps between sections. Titles in a list always start at the same x, whatever the row holds |
| 4 Type | No 12px paragraphs; a defined scale | **A visible step at every level** (page 24, section 16, row 15, meta 13). Meta is in `--text-muted`, not subtle. No help paragraph on screen when a tooltip or toast at the moment of use can say it. Facts that matter are bolded in the meta ("30 min short") |
| 5 Components | VC01–VC13 shared and used everywhere | **Two secondary styles only** (outline, accent text). **One status pattern** (a dot plus a word). Questions look different from to-dos. Every component has its hover, pressed, focus, disabled, loading and error states, shown in the style guide |
| 6 Colour | Restrained accent; day and night both readable | **State is never colour alone:** a 3px edge or dot plus a word. Deltas have their direction defined once. Night cards lift off the canvas without needing their hairline. Focus is at least 3:1 on every surface, tinted rows included |
| 7 Empty and edge | A designed EmptyState on every list | **A state sheet for every screen:** first run, filtered to nothing, loading (a skeleton matching row height, no layout shift), error with retry, offline or sync degraded, conflict ("Updated just now · See change"), and 0, 1 and 100+ |
| **9 Brand** (new; scored from stage B on and reported apart, so the 8-point average still compares with 2.6) | Not scored this round | **It feels like the product on its website:** the mark at the top left, on Welcome and Done, and in the icon and favicon. Burgundy and cream by day, gold on near-black by night. The serif for page titles only. State colours never mistaken for the brand. Brand moments in empty and all-clear states, without decoration on working screens. A person's own brand colour still overrides the accent (`ui.brand.color`) |
| 8 Phone | Nothing squeezed or broken | **Designed for a phone:** a 56px tab bar plus the safe area, 24px icons with labels and an active state, and add as a 44px accent circle. Rows stack their actions below the meta. Titles are never under 60% of the card's width. Filters live in one "Filter" sheet. Nothing hides under the bar |

## 3. The ladder

| Stage | Bar | Built from | Exit |
|---|---|---|---|
| **A, this round** | 3.5 overall, no point under 3 | VC01–VC13, the six mockups, the CI guards | E9–E12 |
| **B, next round** | **4.0 overall, no point under 3.5**, including state and phone captures; **brand at least 4.0** | Mockups v2 (VP14a) in the brand, VP01–VP08, **VP16** | **E13** |
| **C, the target** | **4.6 overall, no point under 4.3**, by the stricter method in section 6; **brand at least 4.5** | Mockups v3 (VP14b), VP09–VP13, VP15, **VP17** | **E14** |

**Why in stages:** 4.6 is mostly craft, and craft only pays once the structure is right. Polishing the motion on a row that still has a pill column is wasted work. Each stage also builds the components the next stage polishes.

## 4. The work: VP01–VP15

Each VP row is shared work: fixed once, and every screen gains. The standards carry numbers so a check can verify them.

| ID | Stage | What | The standard | Seen in the mockups |
|---|---|---|---|---|
| **VP01** | B | **One content grid** | A `--content-max` token. Title, filters, primary button, list, cards and setup footer all share the same left and right edges. The right rail ends level with the main column or flows under it | To-dos: the list ends at x=1244 while its controls end at 1408. Today: the inner table is inset 12px. Setup: the footer is narrower than the column. Connections: the sub-menu top sits off the title |
| **VP02** | B | **Row anatomy v2** | A fixed lead slot: 0, 24 (check) or 56 (pill). Titles share one left edge. Two row heights from tokens (one-line and two-line meta). Titles clamp at two lines and meta truncates at one, with a tooltip. The owner is shown only when it isn't you. A question has its own glyph, not a tickable circle | Today: Clash titles at x=337 against 300. To-dos: "Robin Calloway" on five of six rows. Person: a question drawn as a to-do |
| **VP03** | B | **Type scale v2** | Page title 24/30. Section 16/600. Row 15/600. Meta 13 `--text-muted`. Group labels 11 uppercase with 0.04em tracking and a readable count. 12px only for pills and column headers. Deltas at least 13px | The same bold-15 plus grey-13 pair repeats about 18 times on Today. Counts in group labels get lost. Quality deltas are the smallest text in their tile |
| **VP04** | B | **Primary discipline** | At most one filled button per viewport. The header's "Hand something in" turns secondary on pages that have their own primary. Two secondary styles only (outline, accent text). No bare-text buttons. Today's "Look over N things" is folded by default | Today shows three filled buttons at once and four secondary styles. To-dos has two add actions. Person leads with "Edit" when the main action is "Add a to-do" or "Draft a message" |
| **VP05** | B | **Status and state rows** | One `.status` (a dot plus a word, 13px) replaces the three pill styles. `row[data-state=warn\|danger]` gets a 3px left edge and a soft tint. Delta direction is defined once (up is good or bad, per measure). The header status reflects any failing connection | Connections: a retrying row looks healthy, and the header still says "All good". To-dos: overdue is shown in red text only |
| **VP06** | B | **Night elevation and focus** | `--surface` 2–3 L above `--canvas` by night, plus a 1px inner highlight on cards. A focus ring of at least 3:1 on every surface, the tinted decide rows and selected cards included | Night cards register only by their hairline |
| **VP07** | B | **A state sheet per screen** | For every inventory screen: first run, filtered to nothing, loading (a skeleton at the real row height, within 150ms, no layout shift), error with retry, offline or sync degraded, conflict, and 0, 1 and 100+. Each shown in the style guide and in mockups v2 | No mockup shows any state but the happy path, except one retrying row and one empty field. Quality shows "3 mistakes" over two rows, and a date range that doesn't match its table |
| **VP08** | B | **Phone shell** | A tab bar 56px plus the safe area, 24px icons, 11px labels, an active state, and a centre add as a 44px accent circle. Search and Hand in become header icons. At 480px and under, row actions drop below the meta. Titles at least 60% of the card's width. Filters in one sheet. Bottom padding equal to the bar's height | Today's phone render: a text-only bar, the Decide title squeezed to about 100px over four lines, left edges at 28 and 48. To-dos: the add button and three filter pills push content down about 240px |
| **VP09** | C | **Interaction and motion** | Hover within 100ms, pressed within 60ms. Row actions reveal at 120ms ease-out with no layout shift. Ticking fills the circle in 150ms, collapses the row in 200ms, and shows an Undo toast with a visible countdown. Expanding takes 200ms, keeps the trigger in place, and survives a polling refresh (nothing new moves the target under the cursor). Overlays scale in from 0.98 over 200ms, with a scrim, a focus trap, Esc to close, and focus back on the trigger. All through `--dur-*`, so reduced motion turns it off | Not visible in a mockup. The tokens and the reduced-motion rule already exist in `tokens.css` |
| **VP10** | C | **Keyboard** | `/` search, `j`/`k` move, `x` or Space tick, `e` edit, Enter open, Esc close and return focus. Shortcuts appear in tooltips and in the `?` sheet. Focus order matches reading order | Not visible in a mockup |
| **VP11** | C | **Content resilience** | Long names, roles, emails and folder paths: paths truncate in the middle, emails truncate with a tooltip. 40+ rows. 99+ counts. Dates in words for the locale. 24-hour time where set. Text up to 30% longer. **Add long-name and many-item fixtures to both fictional workspaces** so every capture exercises them | Person: the email ends 10px from the card edge and will overflow. Connections: a raw folder path |
| **VP12** | C | **In-between widths** | Checked at 1024 and 768 as well as 1440 and 390. The right rail drops under the main column below 1100. The left menu folds to icons below 900. No sideways scroll anywhere from 360 to 1920 | Only 1440 and 390 are rendered. At 1024, Today's main column would get about 450px |
| **VP13** | C | **Hit targets** | Touch: 24px visible, 44px to hit. Desktop: 32px minimum to hit. At least 8px between neighbours. The "…" is at least 4.5:1 when shown and fully opaque on hover | To-dos: 18px check circles and a 16px "…" |
| **VP14** | B, C | **Mockups v2, then v3** (reviewer's work) | **v2:** fixes every per-mockup gap in section 5, adds phone renders for all six, a state sheet per mockup, and real icons. Re-scored cold, it must reach 4.0. **v3:** the polish pass with short interaction recordings (tick and undo, expand, open a drawer, keyboard through a list), re-scored cold to 4.6 | |
| **VP16** | B | **The brand in the app** (section 4b) | Brand tokens by day and by night (palette and contrasts in 4b) as the product default, replacing indigo. The mark at the top left (clean by day, the dark variant by night) beside the product name, plus the favicon and app icon. The serif for page titles, Inter for the interface, both bundled with nothing fetched at run time. The state colours moved off the brand: danger off the burgundy by day, warning off the gold by night, always with an icon and a word. Brass for decoration only | Every mockup and the whole app: an initials monogram, indigo, the system font. The two hue collisions measured in 4b |
| **VP17** | C | **Brand moments** | The mark and the ✳ star on Welcome, Done, the all-clear Today and the empty states (one line in the brand voice, for example "Nothing needs you. A little more room to think."). Numbered setup steps in italic serif numerals, as on the website's three promises. A cream "identity card" for the assistant in the Ask pane and on the You page. Motion on the mark only at first launch and on finishing setup, honouring reduced motion. No brand decoration on working lists | Not in any mockup yet |
| **VP15** | C | **Design QA in the build** | Every UI batch hands over before-and-after captures from the fixed list in section 6. Screenshot comparisons in CI on every inventory screen (day, night, phone) so nothing slips back. The style guide shows every component in every state, in both themes | |

## 4b. The brand

**Source.** The product's website (thimbleby.app, light and dark) and `docs/design/brand/` on the host branch (the icon masters and their README). The reviewer captured the site by day, by night and on a phone (`brand-reference/`), and measured every colour pair below.

**Palette, as the app would use it** (`mockups/brand.css` holds these values):

| Role | Day | Night | Contrast |
|---|---|---|---|
| Page (canvas) | warm paper `#f5f3ee` (the site uses `#fafaf9`) | near-black `#0c0d0e` | |
| Panes (surface) | `#fefdfb` | `#151617`, lifted off the canvas (VP06) | |
| Text | ink `#171717` | `#f4f4f2` | 17:1 and 17.7:1 |
| Muted text | `#5c5c5c` | `#aaaead` | 6.0:1 and 8.7:1 |
| Accent: primary button, selected view | **burgundy `#741e25`** with cream text `#fff2d8` | **gold `#e5c78d`** with deep burgundy text `#2a0c10` | button text 9.7:1 and 11:1; burgundy on paper 10:1 |
| Accent soft: selected rows and nav | **cream `#f3ecdf`** | burgundy-black `#251c1e` | burgundy on cream 9.1:1; gold on it 10:1 |
| Brass `#b59859` | the icon's rim, small dividers on brand moments | the same | **2.7:1: never text, never a control boundary** |

**Two collisions to fix before the brand ships (measured):**
- **By day, burgundy is 8° of hue from the app's danger red** (`#741e25` at 355° against `#b3261e` at 3°). A "Clash" pill and a primary button would read as the same thing. Move danger to `#b93815` (13°, brighter, 5.2:1 on paper), and always pair it with a ⚠ and a word.
- **By night, gold is 4° from the app's warning amber** (`#e5c78d` at 40° against `#f2b65c` at 36°). Move the night warning to `#ff9a5c` (23°, 8.7:1), with an icon and a word.

**Type.**
- **Fraunces** (the website's serif, weight 450, tracking −0.025em) for page titles and brand moments only. The token `--font-display` already exists for this.
- **Inter** for everything else.
- Group labels in uppercase, 11px, with 0.12em tracking: a quieter version of the website's eyebrows (0.23em is for marketing).
- Both fonts are open source and are bundled with the app, as the icons are.

**Shape (decided: the owner asked for current best practice).**
- **Every button is a pill:** primary, secondary, quiet, the small row actions, and filter chips. Icon-only buttons are circles.
- **Inputs, selects and search fields keep 8px corners,** so a field never looks like a button.
- **Cards and panes keep 12px, and dialogs 16px.** Anything inside a card uses a smaller radius than the card (concentric corners).
- **Why:**
  - It's where the major platform design systems have settled for buttons: capsule-shaped by default on both the main mobile platforms and in the major web component libraries.
  - It matches the website.
  - The difference in shape tells actions apart from fields, which helps a beginner.
  - The brand preview already uses it.
- Ships with VP16. Through the radius tokens only (`--radius-full` on the Button component and chips), with no local overrides.

**Where it lives (the boundary).**
- The product name, mark and default palette come from the product's one place (the phase I decision: "Thimbleby on screen, in the installers and in the docs from one place"), not from `web/src`.
- Core code keeps the tokens and a generic `--font-display`.
- `ui.brand.color` and `ui.brand.logo` still let a person or business put their own colour and logo on top. The product mark stays in the app icon and the About page.
- The host decides the exact mechanism. The reviewer suggests: a product brand file beside `catalog/product.yaml`, plus the assets in the build.

**Preview.** `mockups/today-brand`, `todos-brand` and `setup-ai-brand` are the same mockups with `brand.css` and the real mark. They come by day and by night at 1440, plus the phone for Today. `before-after/brand-today.jpg` puts them beside the current-token version.
- **What the preview shows:** the app reads as the product at once. The burgundy primary is calm and distinct. The cream selection is warmer and clearer than indigo tint. The serif title gives the pages a face without slowing anything down.
- **What it doesn't solve yet:**
  - The "Not right" links in burgundy, four in a row, are too loud. Make them ink with an underline, and keep the accent for the one primary.
  - The phone header still shows text and no mark.
  - The nav icons are still mockup placeholders.

The open HTML falls back to Georgia and the system font, because the fonts aren't committed; the PNGs were rendered with the real fonts.

## 5. The gaps in each mockup (what v2 fixes)

From the cold scoring. Each bullet gives what's wrong now, then the fix.

- **Today (3.5)**
  - Three filled buttons on screen. Fix: one.
  - The opened review is the biggest thing on the page. Fix: fold it to one row.
  - The greeting card repeats the header. Fix: drop it, or make it the "all clear" state.
  - The rail ends 150px above the main column. Fix: per VP01.
  - Clash titles start at a different x. Fix: VP02.
  - The phone Decide row squeezes the title to four lines. Fix: stack it.
  - Not shown: the all-clear Today, loading, sync failed, 30+ items. Fix: draw them.
- **To-dos (3.6)**
  - The list and controls have different right edges. Fix: VP01.
  - The rows are unsorted. Fix: group them as Overdue, Today, Upcoming, Waiting, No date.
  - There are two add actions. Fix: keep the inline row and drop the header button.
  - The add hint sits on the input line. Fix: show it below the input, on focus only.
  - The footer help line belongs elsewhere. Fix: say it in the toast at the moment of use.
  - "Pick an owner" breaks the rows' rhythm. Fix: move it into the meta line as a link.
  - Not shown: no to-dos, Questions at 0, filtered to nothing, the undo toast, a done row.
- **Connections (3.6)**
  - The retrying row looks healthy, and the header says "All good". Fix: a tinted row with the reason and "Reconnect", and a header status that agrees.
  - Two selected states at once (left menu and Settings menu). Fix: keep the left menu neutral.
  - The two cards have different anatomy. Fix: one card pattern.
  - Actions sit at both the card and the row level. Fix: pick one.
  - Two pill styles mean different things. Fix: VP05.
  - A raw folder path. Fix: show the folder name and truncate in the middle.
  - Not shown: no connections, sign-in expired, a long list, reconnecting, the remove confirm.
- **Quality (3.6)**
  - No one-line "so what". Fix: add a headline sentence above the tiles.
  - The mistakes list, the only thing to act on, sits at table weight. Fix: lift it.
  - The "Your own count" form outweighs the data it supports.
  - The sparklines show 5 bars for "last 4 weeks", with no labels.
  - The count says 3 mistakes but 2 rows show, and the date range disagrees with the table.
  - "Look" has no object. Fix: say "Review".
  - Not shown: a new account with no data, loading, error, no prior period.
- **Person (3.7)**
  - No avatar. Fix: 56px initials.
  - A redundant "Person" pill.
  - The primary is "Edit". Fix: make "Add a to-do" or "Draft a message" the primary.
  - The tabs duplicate the overview.
  - The details card top sits 10px off the tabs.
  - The email will overflow.
  - The timeline has no actor glyphs.
  - A question drawn as a to-do.
  - Not shown: no open items, no activity, long names, several emails.
- **Setup: Your AI account (3.6)**
  - Four decisions on one step. Fix: move "What may it read?" to its own step.
  - Three different widths for the rail, column and footer. Fix: VP01.
  - Uneven gaps between sections.
  - Selection shown by border alone. Fix: add a check mark.
  - The sub-steps are drawn as radio buttons and all their buttons share one weight. Fix: checklist glyphs, and only the next step's button stands out.
  - "Finish later" and "I'll do this later" both appear. Fix: keep one.
  - Not shown: a wrong key, checking, a network failure, the "Something else" path, the phone.
  - *(Render bug and the key contradiction: fixed.)*

## 6. How 4.6 is scored, so the number means something

At 4.6 the differences are small, and one reviewer's score varies by about ±0.3. So E14 uses a stricter method than E9:

1. **A fixed capture list** for every inventory screen:
   - day, night, 390, 768 and 1024
   - plus the state sheet (VP07)
   - plus hover, focus and pressed on one row and one button
   - plus five short recordings: tick and undo; expand a review; open and close a drawer from a button with the keyboard; the setup step with a wrong key; adding on the phone
2. **Two independent reviewers** score from the same captures without seeing each other's scores. The lower score counts.
3. **The owner signs off** on the recordings. A number alone doesn't settle 4.6.
4. **No screen drops** between rounds (VP15's screenshot comparisons enforce it).
5. **The brand point** is scored against section 4b and the website captures, by day and by night. It covers the palette, the mark, the type, the brand moments, and whether any state colour is mistaken for the brand.

## 7. Exit criteria (added to `../TRACKING.md`)

- **E13 (Stage B, 4.0).**
  - Every inventory screen scores **at least 4.0 overall with no point below 3.5**, from day, night and phone captures and its state sheet.
  - VP01–VP08 and **VP16** done; **the brand point at least 4.0** on every screen.
  - Mockups v2 re-scored cold at 4.0 or higher, then built.
- **E14 (Stage C, 4.6).**
  - Every inventory screen scores **at least 4.6 overall with no point below 4.3**, by the method in section 6.
  - VP09–VP13, VP15 and **VP17** done; **the brand point at least 4.5** on every screen.
  - Mockups v3 built.
  - The screenshot comparisons in CI pass.
  - The owner has signed off on the recordings.

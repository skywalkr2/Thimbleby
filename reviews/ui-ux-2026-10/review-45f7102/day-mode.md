# Day mode: bringing it up to night mode's standard

**Evidence:**
- `shots/30-day-today-before.jpg` and `shots/31-day-today-after.jpg`: the demo's Today in day mode, before and after
  the overlay in `day-mode-tokens.css`, with no other change.
- `shots/32-night-today.jpg`: night mode, for comparison.
- `shots/33-…` and `shots/34-…`: Follow-ups, before and after.

## 1. Why night mode looks better

Night mode isn't better because it's dark. It's better because of four things it does by accident, which day mode
undoes:

| | Night | Day, now | Effect in day mode |
|---|---|---|---|
| **Row buttons** | Light pink on near-black: they glow softly | Saturated dark blocks (maroon in the demo, indigo by default) on white | Today has a column of 19 heavy blocks. The eye can't find the one that matters |
| **Pane edges** | Canvas and surface are close (`#0e1014` / `#171a20`), and the borders (`gray-800`) almost vanish | A grey canvas *and* a hairline border *and* grey group bands | Boxes inside boxes. The page reads as a form |
| **Text contrast** | Body text 14.6:1 | Body text 17.9:1 at weight 600 | Near-black bold titles make every row shout. The page looks dense |
| **Pills** | Tinted on dark, low-key | Grey slabs, amber slabs and red slabs next to each other | Four colours of block before the title |

So day mode needs **less ink**: fewer filled shapes, fewer lines, slightly softer text. Night mode stays as it is.

## 2. Token changes (light only)

In `web/src/theme/tokens.css`, under "2. Semantic roles (light)":

| Token | Now | Proposed | Why | Contrast |
|---|---|---|---|---|
| `--canvas` | `gray-50` `#f3f4f6` | `#f4f5f7` | Closer to the panes. Panes separate by a soft edge, not a grey moat | — |
| `--border` | `gray-150` `#e1e4e9` | `#e8eaef` | Dividers recede (decorative, so no minimum) | — |
| `--surface-sunk` | `gray-100` `#eef0f3` | `#f6f7f9` | Group bands and wells stop being slabs | `--text-subtle` on it: 5.0:1 |
| `--text` | `#14171f` | `#1d2230` | Softer black, as in night mode | 15.9:1 on white |
| `--text-muted` | `gray-650` | `#4e5565` | Keeps meta readable while `--text` softens | 7.5:1 on white, 7.0:1 on sunk |
| `--btn-border` (new) | — | `#cfd4dc` | A secondary button's outline. The label identifies the control, so 1.4.11 doesn't apply to it. Inputs keep `--border-strong` (3.26:1) | — |

Unchanged:
- **Status hues.** Amber 6.0:1 and red 5.7:1 on their tints already pass.
- **The brand primitives.** The brand colour is still the accent.

## 3. Component rules (both themes, unless noted)

1. **Row actions are tonal.**
   - A row's main button uses `--accent-soft` with `--accent-text` (7.7:1 with the default indigo).
   - **Only the selected line's button and the page's one main action** ("Hand something in", a dialog's confirm) are
     filled.
   - In night mode the same rule changes little, because brand-900 with brand-200 is already how it looks.
2. **Panels drop their border in day mode.**
   - Use `box-shadow: 0 0 0 1px rgb(20 24 34 / 0.05), 0 1px 3px rgb(20 24 34 / 0.05)` as the pane edge.
   - This is the one exception to "only floating things get shadows". It's an edge, not elevation. The alternative,
     if the rule must hold, is the border at `#e8eaef` with a canvas of `#f4f5f7`.
3. **Group headers** ("Decide", "At risk", "Review") lose their band: a transparent background, a hairline above and
   muted text.
4. **Row titles use weight 500**; the page and pane titles keep 600.
5. **Neutral pills are outlines,** not slabs: transparent with an inset hairline. Only state pills (Overdue, At risk,
   Decision) keep a tint.
6. **One accent per screen.** Links in the rail use `--accent-text` without an underline until hover. Today's rail has
   six underlined links today.

## 4. What it fixes, and what it can't

The overlay alone makes Today read calmer (compare 30 with 31). One filled button now marks the line that's selected.

It can't fix density, because that comes from Today showing things two or three times (README F6). Do F6 first, then
these tokens.

## 5. Test

- **A visual test** in light mode on Today, To-dos and Follow-ups. It counts filled buttons in `main`: at most 2.
- **The axe contrast check** in both themes.
- **The tokens test** checks that every text pair in this table meets AA.

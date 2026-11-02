# Cold score of the 4.6 mockups, first pass

Scored by a separate reviewer.

| Page | H | L | S | T | C | Col | Edge | Phone | Overall | Brand | Meets 4.6 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| today | 4.5 | 4.2 | 4.5 | 4.6 | 4.4 | 4.5 | 3.8 | 4.0 | 4.3 | 4.6 | no |
| today-review | 4.2 | 4.2 | 4.4 | 4.5 | 4.2 | 4.5 | 3.8 | 3.8 | 4.2 | 4.6 | no |
| today-states | 4.3 | 4.3 | 4.4 | 4.5 | 4.3 | 4.4 | 4.2 | 2.5 | 4.1 | 4.7 | no |
| todos | 4.5 | 4.4 | 4.5 | 4.6 | 4.5 | 4.5 | 3.8 | 3.6 | 4.3 | 4.6 | no |
| schedule | 4.3 | 3.9 | 4.4 | 4.4 | 4.3 | 4.4 | 3.6 | 2.3 | 4.0 | 4.5 | no |
| connections | 4.4 | 3.9 | 4.3 | 4.5 | 4.4 | 4.5 | 4.3 | 4.0 | 4.3 | 4.5 | no |
| person | 4.6 | 4.5 | 4.5 | 4.6 | 4.5 | 4.6 | 3.8 | 4.1 | 4.5 | 4.6 | no |
| quality | 4.5 | 4.4 | 4.4 | 4.6 | 4.4 | 4.4 | 3.5 | 2.2 | 3.8 | 4.5 | no |
| setup-ai | 4.6 | 4.5 | 4.5 | 4.6 | 4.3 | 4.6 | 3.5 | 4.4 | 4.4 | 4.6 | no |
| setup-mail | 4.5 | 4.5 | 4.5 | 4.6 | 4.4 | 4.6 | 3.8 | 4.4 | 4.4 | 4.6 | no |

**Brand passes on every page.** What holds the pages back is the phone, 1024, the edge states and consistency.

**Layout breaks:**
- the Schedule at 390 and 1024 (clash cards unreadable)
- Quality at 390 (wider than the phone)
- Connections at 1024 (rows squeezed into one word per line)

**One filled button:** the phone's "+" makes two. Today with a review open has two.

**The 1024 width:** the header pill wraps, and nav labels truncate.

**"⋯" placement and link styles** differ between pages.

**Edge states missing:**
- the key states in setup (checking, accepted, rejected)
- the states sheet on a phone
- the failing account on Today
- empty states per list
- a failed save
- a filtered list with nothing in it

**Inconsistencies:**
- dates: an overdue item due Nov 2 while today is Oct 28; a mistake dated Oct 29
- the failing account shown only on Connections
- the bottom nav highlights Today on the Schedule
- three styles for counts
- the side list (4 in the nav, 6 in the popover) and Lantern's dot colour
- state icons used unevenly
- Quality's delta glyphs need words
- night sparklines invisible
- the Quality breadcrumb
- "Open" styled three ways in setup
- Continue enabled with an empty key
- "Choose what to read" ×3 with no done state

**Still needed in the build:**
- one source of "now" and one source of account health
- pending, failure and undo states for every action
- no reflow when the skeleton is replaced
- three or more overlapping events
- narrow layouts for tiles and tables
- pagination for 100+ items
- the key's check states
- contrast at night
- 44px targets
- accessible names that include the title
- long data and right-to-left text

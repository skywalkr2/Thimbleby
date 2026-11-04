# Schedule and Connections against the 4.6 mockups (step 4b)

Build: the `v4b` work on commit 05573e8. Mockups: `schedule`, `schedule-states`, `connections` and `connections-states` of
`reviews/ui-ux-2026-10/mockups-46/`. Captured with `npm --prefix web run visual:capture -- --pages schedule,connections --with-states`
three times (before, in the middle, after), at 1440 day and night, 1024, 390 and 390 first screen. The sample data differs from the
mockups' (other names, counts and items, no sides on the accounts server); that is not listed.

Change log: section 318. Tracking rows: VS06, VS18, X45, X53, X57, VC13.

The last picture was taken before the stale-calendar line over the Schedule (below) was added; that line is held by
`web/src/components/ScheduleLayouts.test.tsx`, not by a capture.

## Fixed

| Page | Difference found | What was done |
|---|---|---|
| connections | A table of every connection under a list of services with an account list | One card for each account address, its connections as rows inside it; the table is gone (`web/src/components/ConnectionCard.tsx`, `lib/connection-cards.ts`) |
| connections | No "For" or "Last checked" column | The sides are chips with **Change** (the tick boxes open in the card); the last read is the row's status ("Read 2 min ago", "Not read since 10:51 AM", never Read for a connection that is not being read) |
| connections | Sources outside the card; folders named "A folder" | Folders and feeds share a card of their own and are named by their own labels |
| connections | A failing account was a line above the table, and the sign-in was an outline button | The failing account is the first card, with a 3px edge, "Needs sign-in since <time>" and the one filled **Sign in again**; "Add a connection" is the outline button, so the screen has one filled button at a time per failing account |
| connections | The header's "1 account needs you" and the page said it in different places | The card and the header read the same account state (`AccountsAgree.test.tsx`) |
| connections | The state mark on every row was an alert icon and bold | `StateMark quiet`: the dot in the tone's color and the word; the card's head keeps the icon |
| connections | A phone stacked the service, privacy and sides (five lines) before the button | Name, state and Sign in again first; the service, privacy and sides after (CSS grid areas; measured by `accounts.spec.ts` VS18) |
| connections | A sign-in that came back as another account was added as a second account | Refused: the sign-in is started for that account's address, a different address keeps nothing and starts nothing, and the card says "That was a different account: <address>. Sign in as <expected>." with Try again (`tests/test_sign_in_refused.py`) |
| connections | Waiting for the sign-in window was a button that was disabled | A line in the card, "Waiting for you to sign in, in the window that opened.", with Cancel |
| connections | Privacy was a pill on every row | Said once in the card's head when the account's connections share a level; each row says its own when they differ |
| schedule | Weak event text and fills in the week grid | A block with the calendar's color on a 3px edge and, softly, in its fill, the title in the control weight and the time and calendar on a second line; 72px an hour so a 30-minute block holds two lines |
| schedule | Meetings that overlap sat side by side, narrow | One **Clash** card naming them (with the word and an icon); "3 at once · 6:41 AM" for three or more, as the states sheet draws it |
| schedule | An invitation held in two calendars was named only for a screen reader | Shown once, "In 2 calendars" in its line |
| schedule | The legend was small buttons with a round mark | Toggles: a pill with a tick box in the calendar's color, "Hidden" in words when off; on a phone they scroll inside their own row and never move the page |
| schedule | Week and work week fell back to Day when narrow | Below 1100px the Week is the working days and says so; on a phone the week is a list by day (a heading for each day, a row for each entry, one row for a clash, "Nothing on Sunday") |
| schedule | Day, Month and Timeline had gray marks | The calendar's color on the month's dots and on a timeline entry's mark; the blocks, toggles and clash card are the same in Day |
| schedule | Two outline buttons in the header and no line under the title | Add to schedule is the one filled button; the line under the title names the clashes in view |
| schedule-states | One calendar can't be read: no line | One line over the calendar naming it and the account, "Entries shown are from <time>", with Sign in again (`ScheduleStale`) |

## Fixed in the final side-by-side review (change log 320)

| Page | Difference found | What was done |
|---|---|---|
| schedule | The full-page picture was split, the header mid-page | The capture tool scrolls to the top before a full-page picture; the app still opens at now |
| schedule | At 390 the view switch wrapped, Timeline alone | One row of segments that share the width (`Schedule.module.css`) |
| schedule | At 390 the header was 187px: the title, an Add to schedule row, then Today and a range wrapping to two lines | The title with a "..." menu holding Add to schedule (the tab bar's plus hands something in), then the moves and a short range ("Nov 2 – 6") on one row that does not wrap (`ScheduleLayouts.test.tsx`; change log 324) |
| connections-states | "No accounts yet" had a small icon and an outline "Ask how to add one" | The card "Connect your mail and calendar" with the filled "Add a connection"; asking stays beside it (`Sources.test.tsx`) |
| connections-states | "Sign-in refused" had two filled buttons | Try again is filled; Sign in again is plain while the refusal shows (`ConnectionCard.test.tsx`) |

## Left, with the reason

| Page | Difference | Why |
|---|---|---|
| connections | The page is "Settings" with a Connections section, with the mockup's breadcrumb, h1 and section list | The Settings frame is not this step's (it is shared with every Settings page) |
| connections | "Add a connection" | The button says "Add mail, calendar or folder" because the setup steps and 70 tests use those words; a rewording belongs with the setup step |
| connections | "Private to you" | The levels are Open, Confidential and Private (`sources.level.*`); the card says the level's word |
| connections | The "For" line is not in the captures | The capture's accounts server has no sides, so the app (as designed) hides the line; `ConnectionCard.test.tsx` holds the chips and Change |
| connections | A calendar's name as the row's second line ("Studio calendar") | The data has no calendar name besides the connection's label (which names the account); the row says what it holds ("Meetings and events") and how often it is read |
| connections | "Sent mail: What you promised" | The row says "Mail you sent"; the words were not decided with the owner |
| connections | The mockup has no list of services under the cards | The Accounts section stays under the cards: it is where a person signs in the first time, adds another account, chooses what to read and uses their own app registration |
| connections | "Remove studio@…?" with Keep it / Remove | Signing out asks with the sign-out dialog's own words (it says what stops and that it can't be undone) |
| connections-states | Offline, A save that failed | They are the shell's banners (shared with every screen), not this page's |
| connections-states | Long content, A large count | Not drivable: the stand-in service's addresses are short and it plays three accounts (listed by the capture) |
| schedule | At 1024 the mockup draws a list by day, not a grid | The brief and the README say weekdays only below 1100px; the grid shows the working days. The mockup's own 1024 picture follows a later rule that its README does not state |
| schedule | The view switch is an underlined strip (Week, Day, Month, Timeline) | It is the app's segmented control with a Work week choice, kept with its keys 1 to 5 and 19 tests; the strip is a separate change to the control |
| schedule | "Today" sits in the title row | It sits with the arrows, where the period moves; the title row holds the one filled button |
| schedule | "This week · 1 clash on Wednesday" | The line says "1 clash, on Tuesday" (the view's clashes); the unit ("This week") is not told |
| schedule | The clash says "30 min short" and has Open both | A travel clash says it is about travel and the minutes asked for between the places ("Clash · travel: you need 30 min to get from one place to the other"), not how many are short; each meeting in the card is its own button, since no page shows both |
| schedule | A clash a person marked "It's fine" on Today | Closed: the Schedule's clashes come from the engine's rules, the same as Today's, so a marked pair is two ordinary entries (section 318) |
| schedule | The weekend while the Week shows the working days | Not read; the line under the grid says so (an honest note, not the data) |
| schedule | Calendars are named "Your calendar, <address>" | They are the connections' labels, from the add-on; renaming a calendar is a feature the product does not have |
| schedule | All-day chips collapse into "+2 more" | The strip lists every all-day entry for the day |
| schedule-states | A save that failed, Long content, A large count | Not drivable: the Schedule only reads and the calendars hold a handful of entries (listed by the capture) |
| schedule-states | Loading, Offline, A week with nothing in it | Captured; they are the shared states (skeleton, the shell's banner, "Nothing on the calendar in these days") |

## Schedule at the gate (batch g3, section 328)

Compared with the `schedule` and `schedule-states` side-by-sides at 1440 and 390, day and night.

| Page | Difference found | What was done |
|---|---|---|
| schedule | The mockup's grid is a frame; the build's grid ran twenty-four hours down the page | The grid scrolls in its own labelled frame, headings fixed, opening on the first clash, else now, else the first entry |
| schedule | Hour labels touched the card's edge | Short labels ("10 AM") with room at the edge |
| schedule | Month chips led with the time | The title first, the time after; a clash day has a mark |
| schedule-states | Three meetings at once is one card listing them (the mockup) | Kept as one card; the scorers' "each in its own slot" is not followed |
| schedule-states | The loading skeleton is a grid in the mockup; the build's is a list | Left: the skeleton is the shared one (a grid-shaped one is in the open list below) |
| schedule-states | One calendar that can't be read; a week with nothing in it | Held by the existing stale line and empty text; no new picture-level change |

Left open, with reasons: the calendar filter chips carry the connection's own label (a data fact of the fixture).

### Third pass (batch g3b)

| Page | Difference found | What was done |
|---|---|---|
| schedule | Four rows of controls above the grid; the day's date said twice | Two rows, the calendars one scrolling line with an edge fade; a single day's column says "Today" or the weekday |
| schedule | No one-line summary of the week | "1 clash, on Tuesday · 2 meetings" under the title, on the grids and the Month |
| schedule | An empty all-day row; identical all-day entries listed one by one | No row when none; identical ones fold with a count |
| schedule | No way to see the hours outside the configured ones | "Show all hours" / "Show fewer hours" |
| schedule | Month: weekday names off their numbers, numbers not on one edge, cut titles, tiny dots, today in the brand color | Centered names, one edge, two-line titles, time hidden when narrow, 24px/44px targets, today in ink |
| schedule | Timeline: marks without dates, heavy days-off bands | A date beside each mark, light bands |
| schedule-states | A week with nothing, a busy week of 40, all-day entries and overlaps, a busy month, many lanes, many entries, none, a long title and place, no place, a long Add title, an end before the start | Each has a capture state in `web/visual/inventory.ts` (the server's own answer, changed) |

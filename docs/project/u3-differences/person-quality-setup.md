# A person's page, Quality and the setup's AI and mail steps against the 4.6 mockups (step 6)

Build: the `v6` work on commit 909250e. Mockups: `person`, `person-states`, `quality`, `quality-states`, `setup-ai`, `setup-mail` and
`setup-states` of `reviews/ui-ux-2026-10/mockups-46/`. Captured with `npm --prefix web run visual:capture -- --pages person,quality,setup-ai,setup-mail --with-states`
before (all sizes), once part-way (a run that stopped when the stand-in service's certificate file was gone), and after (all sizes). The
sample data differs from the mockups' (other names, counts and items); that is not listed.

Change log: section 317. Tracking rows: VS01, VS03, VS13, VS15, VC10, VC11, VC12, X59, Y01.

## Fixed

| Page | Difference found | What was done |
|---|---|---|
| person | The one filled button was Edit | "Add a to-do for <first name>" is the one filled button and opens the add form with them as the one who does it (`useAddTodo.open(words, owner)`); Edit is on the contact card |
| person | No avatar; the details were a plain panel | The contact card: initials on a disc in the color of their first side (`PersonAvatar`), "Last contact" and how, **Edit**, then the details |
| person | The box to ask was in the main column under the history, its title kept for a screen reader | A rail card "Ask about <first name>", placeholder "Ask anything about <first name>", the send button inside the box; last on a phone |
| person | The details panel sat below the page where columns stack | Where columns stack (under 1100px) the order is open with them, the contact card, the history, the box to ask (CSS `order` on `data-slot` parts). The scorer's list asked for the card above Activity; the mockup had it below |
| person | The timeline had times at the left and no marks | An icon for who did it (the assistant, the person adding, the person changing), the words, and the time under them |
| person | Nothing open was a bare hint; a gone person a bare line | "Nothing with <name> yet", what shows up there and the add button; "This person isn't here any more" with a way back to People |
| person | Emails and phones: in full | Checked: each value wraps (`overflow-wrap: anywhere`) and is never cut off; labelled by the workspace's own kinds |
| quality | The heading had only the window's dates | One bold line from the figures ("6 of 9 promises were closed as done."), the false alerts to look at, then the window |
| quality | Tiles said a change in a sentence only | An arrow and the sentence, and "better" or "worse" in a word where one way is better; never by color alone |
| quality | No trend | A small SVG trend line per tile with a text alternative that says the numbers, no chart library (`QualityTrend`) |
| quality | The weekly table at every width, with headers that wrapped letter by letter on a phone | A list at 639px and under (each week a block, its figures beside their names); the table above |
| quality | Mistakes were a name and a count | A row with a mark, who and which week, and **Review**, which opens the person's page |
| quality | Thirteen bordered boxes of "Nothing yet." | One card, a line each, each with a count of 0 and its one line |
| quality | A phone showed the tiles one under another | Two columns on a phone, as the mockup (not seen in the last capture) |
| setup | The rail's circles were empty | A numeral in the display face, in italics, in each circle; a check once the step is done |
| setup | The footer's buttons were off the column's edges | Back on the column's left edge, the primary and the "why" on its right; one block of buttons in the column's track, at every width with a rail |
| setup | The eyebrow was plain text | The small spaced label (`GroupLabel`) |
| setup | The AI cards were two and one | Three in a row where the column is wide enough |
| setup | The key's steps were a loose list; three styles of "Open" | One bordered list with large numerals; every Open link is one style (a small quiet link) |
| setup | The key had one line for every state | Empty (nothing), checking (a spinner and "Checking it…"), accepted (a check, the account's own label and "Works. Ready to use."), rejected (a mark and the check's reason, the box marked invalid) |
| setup | Mail accounts were lines of text | A card each: mark, address, what is read, "Connected" with a check, then "For" and the sides as chips (each chip a tick box) |
| setup | No service was a sentence and a button | An empty state "Connect your first account" with the same sentence and button |
| setup | Waiting for the service's window was one hint | A banner "Finish signing in in the window that opened. This page carries on by itself when you're done." with **Cancel** (stops waiting, closes the window) |
| setup | "Connect another" was a full-width ghost | "Connect another account", a small button with a plus |
| setup | Mail, no account yet: the add-on's id, a long description and a second form beside Sign in | One first-account card; services by their own names, the mailbox folded inside it (section 321) |
| setup | Mail, waiting for the window: an "Opening the sign-in page…" button beside the banner | The banner alone (section 321) |
| setup | Mail, one account needs sign-in: all accounts Connected | The shared account row with "Needs sign-in since <time>" and Sign in again (section 321) |
| setup | Offline: no banner in the guide | The offline banner in setup's own words (section 321) |
| setup | Mail rows "Your inbox and Your calendar" | "Your inbox and your calendar" (section 321) |
| quality | First week: a page of zeros | One "Too early to tell" card; `dispatch.knowledge.quality_min_promises` (section 321) |
| person | A save that failed was never captured | The drive changes a field first, since Save is off until something changed (section 321); the capture now scrolls to the "Not saved" note and the picture shows it (section 322) |
| setup | Phone: a header of about 170px and a footer of two rows | One header bar (title, Steps, Finish later) and one footer row; a waiting primary's reason is a line above it (section 322) |
| setup | Accepted: the privacy block of five lines | The question and one line; "Which account is it?" opens the rest (section 322) |
| setup | The first-account card was loose parts on the page | One centred card holding the services as rows and the mailbox folded inside it (section 322) |
| setup | Mail rows without "Private to you", the sides as boxes with no chips or Change | Every account is a card with "Private to you", "For <side> chips Change"; the account needing sign-in is the same card with its edge and Sign in again (section 322) |
| person | Phone: the menu alone at the left | The menu at the right of the title's row (section 322) |
| person | Not found kept a "Not here" title and a chip | The card alone (section 322) |
| quality | "Back to Today" button; week headers of three lines; own count open with a wrapping title; a bare red line when it couldn't load; a second panel in the too-early state | A "Today ›" crumb; Found, Done, False alerts, Looking over; the own count folded as "Count them yourself"; the shared failed-load row; the fold inside the too-early card (section 322) |

## Left, with the reason

| Page | Difference | Why |
|---|---|---|
| person | "Draft a message" beside the primary | No message can be drafted to a person from their page; a nudge is drafted from a follow-up |
| person | "Files from <name>" and a Files tab | Files are tied to projects, not to people |
| person | "Everything with <name> 14" as a tab | The tabs are Overview, Open with <name> and Activity; the count the mockup shows would be a new measure |
| person | The details edited in place (Cancel and Save under the fields) | They open in the drawer the People screen uses; one form for both |
| person | The tinted "owes you" row on the open list and a side mark on each row | The open list is the shared record rows; the mark by side belongs to the lists (step 4) |
| person | A large count, a failed save | The fixtures tie no hundred items to a person, and the save's own banner is the shell's; listed as not driven by the capture |
| person | The capture shows no side color on the avatar | The sample person is on no side; the disc takes the color when they are on one (`PersonPage.test.tsx`) |
| person | The empty state's height | The shared empty state keeps its own padding |
| quality | "Kept on time" as a percentage and its column | The data counts what was closed, not what was on time; no figure to make it from |
| quality | A period chooser and "against the 4 before" | The window is the settings' `days`; the comparison is the last two weeks |
| quality | "Count a sample" as a link in the card | The card's fold is "Count them yourself"; the sample keeps its own section, folded |
| quality | A highlighted current week | The last row is the week now; no mark for it yet |
| quality | A worse period, long content and a large count | The fixtures hold no four weeks of history and no mistakes; the capture lists them as not driven |
| setup-ai | A check disc on the chosen card, "Recommended" at the card's top right | `RadioCard` stays as it is; a ring and a tint show the choice, with its words |
| setup-ai | A three-step checklist with "Done" on each, a key box with Show | The steps are four to do, not to tick; the key box has Show and Hide as it had |
| setup-ai | The step's title "Which AI should Reginald use?" | The title is the step's name (the rail says it); the question is the group's label |
| setup-mail | Continue in the footer; "I'll do this later" beside it | The step draws its Continue under its result (Y01); moving it would change the step's tests and the first screen's count of buttons |
| setup-mail | The card's menu | A card has no menu |
| setup-mail | The sides in the capture | The stand-in account has no sides; the chips show when the person has a side beside Personal (`Walkthrough.test.tsx`) |
| setup | "Thimbleby" mark and "About 10 minutes" in the header; "Step 3 of 8" | The header is the wizard's title and time; seven steps, not eight |
| setup | Checking, offline and accepted states with the stand-in service | The capture drives "Another service", so the accepted line reads "Another service: Works…"; the mockup's key is Anthropic's |
| setup | A key valid but no credit | The stand-in service never answers that; not driven |

## Changed in the gate's fix round, batch G1 (change log 327)

| Page | Difference found | What was done |
|---|---|---|
| setup | 150 to 260px of blank space above "STEP n OF 7" on a phone | The layout's rows keep their height and start at the top (`align-content: start`), so the step starts under the header |
| setup | The footer took three rows on a phone, with a faint cream primary | Two rows: the way back and later on the first, the primary across the width, 44px tall; a disabled primary is a sunken fill with a firm edge, with its reason beside it |
| quality | "Today ›" crumb with a bare button | The shared way back (`BackLink`) with a chevron, named "Back to Today" |

## Checks

The unit tests for each piece are named in change log 317. The browser tests are written (`web/e2e/person-quality-setup-46.spec.ts`, in
the `people-records` project) and have not been run. Specs changed for the replaced layout: `web/e2e/journeys-new-start.spec.ts`
("Connect another account"). Tests changed: `Walkthrough.test.tsx` (the waiting banner's words, "Connect another account"),
`PersonPage.test.tsx` (the primary, Edit on the card, "Last contact" in the card's head), `RecordPageRecords.test.tsx` (a gone person).

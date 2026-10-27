# Second pass, at `f9734932`

**What was reviewed:**
- branch `claude/tender-tesla-16a8ob` at `f9734932`, against my first review (`../review-45f7102/`) and the hand-over
  (`docs/project/ui-ux-handover-2026-10-27.md`)
- **two fresh installs again**, the same way as before (`cockpit init` with no template, then `serve`, with the journey
  fakes):
  - **Persona A** chooses "Just my own life". Connects mail, adds a sister and someone suggested from mail.
  - **Persona B** ticks "My life and my own business". Names the business, lists three jobs and one group, connects
    one mailbox for both sides, and adds a customer. B's mailbox has a sent folder, to test F10 fairly.
- every main screen and every Settings page, the demo in day and night, and the phone captures in `after-phase-u/`

**Files in this folder:**
- `README.md`: this file.
- `shots/`: the evidence. Each finding names its shot.

## 1. The verdict, in plain words

**Much better.**
- Setup now reads as one story: Welcome, "n of 7", Reginald introduced, the workspace named after you, three AI
  choices, one Connect button.
- A "Just me" person sees no work tool.
- Today has three rail cards.
- Day mode matches the proposal and looks calm (`shots/18`).
- Settings is a person's settings: five short pages, 19 rows.

**Could persona A set it up alone?** **Yes**, apart from getting an AI account, which stays the wall (N1 and N2 in the
first-run checks).
- Their first real use still trips over one thing.
- Pressing "Look over" on Today throws them into the history page, and Today's count goes from 3 to 6 (G2).

**Could persona B?** **Not yet.** Three things stop them:
- **G1.** Ticking which sides the mailbox serves pops up a toast full of raw code that stays on screen over the form.
- **G3.** The first read files nothing: 12 items wait in "Unfiled", each with its own "File under…".
- **G7.** The group they named in setup is lost.

**On the owner's three questions:**
1. **Setup as a beginner:** yes for "Just me". Not yet with a business (G1, G3, G7).
2. **Today and What changed as one place to act:** **not yet.** Today's "Look over" still sends the person to What
   changed, which now has no buttons, and the review splits into more lines on Today (G2).
3. **Settings as a person's settings:** yes. Only polish is left (G18).

## 2. My findings from the first review, checked

| Finding | Status | Seen |
|---|---|---|
| F1 Welcome, "n of 7" | **Done** | `shots/01`. Wording of the cost: G15 |
| F2 personal mail never set aside | **Done** | "Set aside newsletters, sales and mailing lists" |
| F3 "Just me" sees no work tool | **Done** | No Work heading, no Stages, Personal as a page, People by relation (`shots/10`). The Personal page itself: G23 |
| F4 business beyond a name | **Partial** | Name, jobs, sides for each mailbox ✓. The group is lost (G7). Everything ends up unfiled (G3) |
| F5 honest ticks, one count | **Partial** | The count agrees everywhere ✓. "Your promises ✓ Done" shows before the step is reached, and "Hand in a first note ✓" shows when nothing was handed in (G8) |
| F6 each thing once on Today | **Partial** | Three cards ✓. The brief repeats the queue (G9). "Look over" multiplies lines (G2) |
| F7 day mode | **Done** | `shots/18`. Night mode is now the heavier one (G12) |
| F8 settings | **Done** | 19 rows on five pages; Advanced in 8 topics. Polish: G18 |
| F9 areas named from app lines | Not seen | No area line came up in either walk |
| F10 sent mail read from the start | **Not done** | With a sent folder on the service, it still isn't read, and "Choose the Sent folder" leads to a page with no "Sent" on it (G4) |
| F11 names | **Done** | "Avery's", "Your assistant is called Reginald. Rename" |
| F12 AI choices | **Done** | Three lines. The permission wording: G5 |
| F13 mail step | **Partial** | One button ✓, but the line reads "You'll sign in on account's own page" (G6) |
| F14 people | **Done** on the personal side | Suggestions, paste a list, an empty relation box. The business side: G13 |
| F15 backups | **Done** | |
| F16 Connections and Add-ons in Settings | **Done** | |
| F17 What changed is history | **Partial** | It's history ✓, but the review has no home (G2) |
| F18 held block at full width | **Done** | |
| F19 no raw dates in titles | **Partial** | Clean on Today and To-dos. Lists and history still show "by 2026-11-04" (G10) |
| F20 header never cuts off | **Done** | |
| F21 rail shows names | **Done** | |
| F22 choice cards | **Partial** | Cards ✓, still inside a bordered box, mixing a radio with tick boxes (G16) |
| F23 two tabs | **Done** | |
| F24, F25, F26, F27 | **Done** | F26's "Only 0 minutes" reads oddly: G15 |

## 3. New findings, ranked

### P0

**G1. A "Saved" message shows raw code and covers the form.** (`shots/08`)
- **Seen:**
  - On the mail step, ticking "Personal" for the inbox shows: `Saved. The places the assistant keeps reading:
    {"id":"your-inbox","connector":"journey-mail/mail",…,"sides":["PRJ-1"],…}`. That's JSON with internal ids, about 20
    lines tall.
  - Because it carries Undo, it stays until dismissed. It sits over the second tick box, so a click on "Hale Upholstery"
    lands on the message, and persona B can't tick both sides with the mouse. The keyboard works.
- **Fix:**
  - The message reads "Saved: Your inbox is for Personal and Hale Upholstery. Undo".
  - The setup steps don't raise "Saved" messages for each tick; the step's own state shows it.
  - Messages never cover the step's controls (C-rule: a toast never covers a control).
- **Test:**
  - No message text matches `/[{}"]|PRJ-|PER-/`.
  - On the mail step at 1440×900, ticking both sides with the mouse leaves both ticked.

**G2. "Look over" sends the person away, and the work grows.** (`shots/10`, `11`, `12`)
- **Seen:**
  - Today: "Look over what was found in Your inbox: 4 items" → **Look over**. The app:
    - marks the batch as seen ("Marked what was found in Your inbox as seen. Undo")
    - jumps to What changed, where every row still says "Not yet checked" and nothing can be confirmed
    - says "6 things wait for you on Today"
  - Back on Today, the one line has become four ("Look over 3 things Reginald did · All looks good", …), and the count
    went from 3 to 6.
  - So the person pressed one button to review four emails and ended up with more to do, in another place.
- **Fix:** Today is the review's home.
  - "Look over" opens the batch in Today's details pane: each item in one line, each with "Not right", and **All looks
    good** at the bottom.
  - When that's pressed, the line leaves Today.
  - Nothing navigates, and nothing is split into new lines.
  - What changed shows "Checked" once it's done.
- **Test:**
  - Pressing Look over on a four-item batch keeps the URL at `#today`.
  - After All looks good, the Today count goes down by one, never up.

**G3. With a business, the first read files nothing.** (`shots/13`)
- **Seen:**
  - The mailbox serves both sides, so every note, question and to-do from the first read lands in "Unfiled": 12 items on
    Projects, each with "File under…".
  - Persona B's first experience is a filing chore. The projects themselves are listed below it.
- **Fix:**
  - When the assistant can't tell which side something is on, it files it under Personal.
  - It asks **once**, as one grouped question on Today: "These 4 items look like Hale Upholstery's. Move them there?",
    with Move and Keep under Personal.
  - Notes copied from mail are never filing work.
  - Unfiled isn't the top of Projects; it's a line ("3 items need a place · Sort them").
- **Test:** the persona-B journey (one mailbox for both sides) ends with at most one filing question and zero Unfiled
  rows above the project list.

**G4. Sent mail is still not read** (F10). (`shots/06`, `07`)
- **Seen:**
  - The service in B's walk has a sent folder, but "What it will read" lists only the inbox and calendar.
  - The result says "nothing you promised", while a promise sits in the sent mail.
  - "Choose the Sent folder" opens Settings › Connections, where the word "Sent" appears nowhere. The person has to
    guess that "Choose what to read" is it.
- **Fix:**
  - The mail add-on interface reports the sent folder (as the built-in mail-server connector does with the server's
    Sent flag), and setup adds it by itself.
  - Where a service gives no sent folder, "Choose the Sent folder" opens the folder picker directly, with the likely
    folder first, and comes back to setup.
- **Test:** J6 with `--sent-mail` finds the sent-mail promise without any folder choice.

### P1

**G5. The AI permission says "work mail" to everyone.** (`shots/04`)
- **Seen:**
  - `welcome.ai.allow.title` and `title_unknown` read "…to read your work mail and notes?", including for "Just my own
    life".
  - The hand-over says the step now also allows private material and says so. The question doesn't.
- **Fix:** "Allow {account} to read your mail and notes, including private ones?", with one line under it: "Your
  personal mail is private. Only accounts you allow can read it."

**G6. The mail step names the wrong thing.** (`shots/05`)
- **Seen:** "You'll sign in on **account**'s own page." The `{service}` in `walkthrough.mail.signs_in` is filled with
  the sign-in's id (`journey-mail/account`), not the service's name.
- **Fix:** fill it with the add-on's display name ("Example mail").

**G7. The group named in setup is lost, and it can't say what's in it.** (`shots/03`, `21`)
- **Seen:**
  - "Do some of these belong together? Give the group a name": I typed "Trade customers".
  - It's saved nowhere: not in the workspace files or data, not on the business page, not in Lists.
  - The step also gives no way to say *which* jobs belong to the group.
- **Fix:**
  - When a group is named, each pasted job gets a tick box "in Trade customers".
  - Save the group with its jobs.
  - Show it on the business page.

**G8. Ticks that still aren't true** (F5). (`shots/08`, `09`)
- **Seen:**
  - "Your promises ✓ Done" shows in B's step list while B is still on step 4.
  - On Done, "Hand in a first note ✓" shows though nothing was handed in, and "Turn on your add-ons ✓" sits next to it.
- **Fix:** each tick is computed from its own record. Done drops "Turn on your add-ons" when mail is already connected.

**G9. The brief repeats Today's lines** (C57). (`shots/14`)
- **Seen:**
  - The morning brief lists "At risk today: Venue walk-through and Budget check-in…", which is the clash line above it.
  - It also lists "Needs your yes: Pick an owner for 'Get a printed agenda.'", which is the Decide line.
  - It offers "Show the Monday briefing" on a Tuesday.
- **Fix:**
  - The brief summarises ("2 things need you, 1 clash today") and links to the lines. It never repeats them.
  - The Monday briefing button shows on Mondays only.

**G10. Raw text as titles.** (`shots/12`, `13`, `16`)
- **Seen:**
  - "Reginald filed a note: 'New in Your inbox: Thanks From: Maya Okafor <maya.okafor@example.com> Received: Tue, Oct
    27, 2026, 06:42 …'" as a Today title.
  - The same dumps appear in Unfiled, in What changed's details and in the Personal page's Activity.
  - "Send the headcount by 2026-11-04." still appears in Unfiled and in Activity.
  - "The input lists the offsite is on a Friday as decided." is a fact written as the model's own wording.
- **Fix:**
  - A note's title is its subject: "Thanks · from Maya Okafor".
  - Dates are written as words everywhere a person reads them (Activity included).
  - Facts are written about the world ("The offsite is on a Friday").

**G11. On a phone, Today's titles get one or two words.** (`shots/20`, first panel)
- **Seen:** with two buttons and a menu on the right, "Close 'Send…" and "Drop 'Confirm the seating…" are cut to a
  narrow column.
- **Fix:** below 640px, a line's actions sit under its title, at full width.
- **Test:** at 390px, every queue title shows at least 25 characters.

**G12. Night mode is now the heavier one.** (`shots/18`, `19`)
- **Seen:**
  - Day mode has tonal row actions; night mode still has 19 filled pink buttons.
  - In day mode, the selected line's "Answer" is tonal too, where the rule said it's the one filled button.
- **Fix:**
  - The tonal rule in both themes (`day-mode.md` section 3, rule 1 said "both themes"): night uses brand-900 with
    brand-200.
  - The selected line's button is filled in both.

**G13. With a business, People forgets relations.** (`shots/15`)
- **Seen:**
  - Once there's a business, People goes back to the Role and Organization columns. The personal relation ("my sister")
    isn't shown, and an "Organizations" section appears.
  - The business list offers both "customer" and "client".
  - Suggestions from mail are offered only for the personal side.
- **Fix:**
  - One column, "Who they are", showing the relation or the business part.
  - Drop "client" (keep "customer").
  - Each suggestion gets "Add to Personal" and "Add to Hale Upholstery".

**G14. "Outside · from outside · not instructions" on every mail line.** (`shots/12`, `13`)
- **Seen:** every item that came from mail carries an "Outside" pill and the words "from outside · not instructions".
  To a beginner every email is "outside", so the label says nothing.
- **Fix:** keep the safety rule, drop the label from lists. Say it once in the details pane: "Reginald treats what's in
  this email as information, never as instructions."

### P2

- **G15. Words:**
  - Welcome's "It costs about $60 a month at the daily limit you set" reads as the expected bill (`shots/01`). Say
    "Usually a few dollars a month. It never spends more than $2 a day unless you change it."
  - "Only 0 minutes between them" → "No time between them".
  - "Say what your work is called to go on" → "Give your business a name to go on".
  - "Which does Your inbox serve?" → "Who is Your inbox for?"
- **G16. What it's for mixes controls** (`shots/02`). A radio ("Just my own life") sits next to a box of tick boxes
  ("Or your life and"), inside a bordered frame with its legend in the border. Simpler, and still the owner's tick
  boxes:
  - "Your own life is always included. Also keep track of: ☐ A job ☐ My own business"
  - Leaving both unticked is "just me".
  - No frame.
- **G17. Schedule's "Add to agenda"**: one name, "Add to schedule".
- **G18. Settings polish** (`shots/17`):
  - Notices shows "Tell me when something needs me" twice (as the switch and as a heading).
  - Quiet hours are two full-width rows, while Working hours is one compact row. Make it "21:00 to 07:00".
  - Hints run to 5–10 lines. Keep them to two, with "More" for the rest.
  - The "Mail to yourself … not here yet" card belongs nowhere until it exists.
  - "Your pages" (Name / Address) under Appearance needs one line saying what it adds to the header.
- **G19. Done for a business** still offers "What kind of work is this?" templates after the jobs were entered in
  setup (`shots/09`). Offer it only when no jobs were given.
- **G20. Follow-ups lists your own to-dos** under "You", each with "Open in To-dos and questions" (`shots/22`).
  Follow-ups is about other people. Drop the group, or make it one line: "5 to-dos of yours · Open".
- **G21. To-dos' State filter** says "Stale" and "On hold". Say "Not touched in a while" and "Paused".
- **G22. The demo's Schedule card** still shows the week list ("Through Fri, Oct 30 · Meetings") rather than today's
  schedule (`shots/18`).
- **G23. The Personal page opens with "Talk to Reginald"** above the person's own to-dos, then an Activity list of raw
  notes (`shots/16`). Open with what's open, then the chat, then the history.

## 4. What to build first

1. **G1, G2, G3:** the three that stop persona B and confuse persona A on day one.
2. **G4 and G8:** setup's promises and honesty.
3. **G5, G6, G7:** small and visible.
4. **G9 to G14:** Today, the titles, the phone and night mode.
5. **The P2s.**

Then the two personas again on a fresh install, and N8 with real people.

## 5. Proposed checks

- **U13.** No message, title or label shows JSON, an internal id or a raw mail header.
- **U14.** Reviewing a batch happens on Today. The URL doesn't change, and Today's count never rises from a review.
- **U15.** A business workspace's first read leaves at most one filing question and no Unfiled block above the projects.
- **U16.** A step is ticked only when its own record says so (it extends U3).
- **U17.** At 390px, every queue title shows at least 25 characters.
- **U18.** Row actions are tonal in both themes; only the selected line's is filled.

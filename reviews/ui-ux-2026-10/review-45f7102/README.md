# The whole app, walked as a beginner, at `45f71023`

**What was reviewed:**
- branch `claude/tender-tesla-16a8ob` at `45f71023`, following the hand-over (`docs/project/ui-ux-handover-2026-10-26.md`)
  and my brief (`../pre-installer-review-brief.md`)
- **two fresh installs, never the demo**, made the way a person makes one (`cockpit init` with no template, then
  `cockpit serve`, with the stand-in mail and AI services the journey tests use):
  - **Persona A, personal only:** answers "Just me". Connects mail, adds a sister and a doctor.
  - **Persona B, personal plus a small upholstery business:** answers "Me and my work". Names the business, adds a
    customer and a supplier.
- every main screen afterwards, the Settings pages, and **every Advanced field opened one by one**
- day mode on the demo, before and after a token overlay
- the 156 retaken captures in `after-fix-batch/`

**Files in this folder:**
- `README.md`: this file. The verdict, where a beginner stops, and the ranked findings.
- `settings.md`: every setting marked keep, move, automate or remove, the list of what should not exist at all, and
  the basic page as it should be.
- `day-mode.md` and `day-mode-tokens.css`: why night mode works, and the token and component changes for day mode.
- `shots/`: the evidence. Each finding names its shot.

## 1. The verdict, in plain words

**Could persona A set it up alone?** They would get to the end, but not to a tool that feels like theirs.
- The steps themselves mostly work. The AI-account step stays the real wall for someone with no technical background
  (N1 and N2).
- Once through, the app talks to them about work:
  - Done asks "What kind of work is this?"
  - The side menu says "Work", "Stages" and "Waiting to go out".
  - Projects is a nine-column office table.
  - Today's first result is four "Pick an owner" lines about their own life.
  - The mail step's default sets aside "personal mail", which for this person is all their mail.

**Could persona B set it up alone?** No.
- The business is a name and nothing more. Nothing asks what they work on (jobs, clients or orders), nothing creates a
  project, and nothing asks which mailbox is the business's.
- The step warns them about their *employer's* permission, which doesn't apply to someone who owns the business.

**What has to change first** (findings F1 to F8): a real opening screen, one honest progress count, no work words for
someone who said "Just me", a business step that goes past the name, Today that shows each thing once, a calmer day
mode, and Settings cut to what a person sets.

**What's better than last time:**
- The time zone search works.
- Sign-in opens in its own window and comes back by itself.
- People are added by relation, and B gets customer, supplier and staff.
- Today has the All / Personal / business filter.
- The clash line names both entries.
- "Handled for you" exists.
- Nothing scrolled sideways.

## 2. Where a beginner stops, guesses or gives up

In the order they meet it. The number at the end of each line is the finding in section 3.

1. **The first screen** is a form titled "Set up your workspace". Nothing says what the app does for them, what they
   need, or that the first result is a list of their own open promises. "Workspace" is jargon. (F1)
2. **On a phone,** the eight step names wrap into three rows of chips above the form, and there's no "1 of 7". (F1)
3. **"Work: is this just for you, or for your work too?"** A sole trader wonders whether their business is "work". If
   they say yes, they're warned about their employer's permission. (F4)
4. **"Which AI should Reginald use?"** Who is Reginald? Nobody introduced him. (F11)
5. **"Something else"** opens ten technical options, one of them a paragraph about what a command-line tool's
   documentation says. (F12)
6. **The mail step** has three sentences about an add-on, says "Needs 1 key from you" next to "The app never sees your
   password", and ticks "Set aside newsletters and personal mail automatically" by default. (F2, F13)
7. **Your promises:** the first result found nothing, because sent mail isn't read unless they "Choose the Sent
   folder". The step meant to impress them comes back empty. (F10)
8. **Backups** asks for a "name for this folder (optional)", and the folder chooser shows the raw path `/root`. (F15)
9. **People:** the relation box starts on "my partner", so the first person added could easily be filed as their
   partner. (F14)
10. **Done** asks "What kind of work is this?" of someone who said "Just me", offers "Turn on your add-ons" for mail
    they've already connected, and ticks steps they skipped. (F3, F5)
11. **Today:**
    - It says "Setup 2 of 5" while setup listed eight steps.
    - It shows four "Pick an owner" lines, and then the same four again in Top priorities.
    - It offers "File 4 items under a new area, Pick?" with a button "Start Pick".
    - The same two meetings appear under both "This week" and "Agenda".

    (F5, F6, F9)
12. **The side menu** shows "Stages" (empty), "Waiting to go out" (empty) and "Knowledge" (which explains itself as
    "rules, lessons, glossary"). Connections and Add-ons, clicked in the main menu, open inside Settings. (F3, F16)
13. **What changed** right after the first read: eight "Looks good" buttons for things Today also asks them to "Look
    over". (F17)
14. **Settings** has ten pages. One shows the internal id `PRJ-1` under a 45-word label, and another asks for quiet
    hours twice. Advanced has 40 groups ("Ui today", "Watch mail kinds", "Steward people") holding 178 fields, and is
    22,765px tall with every group open. (F8)

## 3. Findings, ranked

P0 means a person can't succeed alone or would stop trusting the app. P1 means they would stumble. P2 means polish.
Each has the fix and the browser test that proves it.

### P0

**F1. No opening screen, no honest progress.** (`shots/01`, `shots/02`)
- **Seen:**
  - Setup opens straight onto the "You" form, under "Set up your workspace · About 10–20 minutes".
  - There's no "here's what this is and what you'll need" (an AI account and what it costs, mail optional, a backup
    place).
  - There's no "Step 1 of 7".
  - On a phone, the step list takes the top third of the screen.
- **Fix:**
  - **A Welcome screen**, not counted as a step:
    - one line on what it does for you: "Reginald reads your mail and calendar and keeps track of what you've promised
      and what you're owed"
    - what you'll need, as a list of three, with "about $X a month" next to the AI account
    - "Start"
  - The title becomes **"Getting started"**.
  - Each step shows "You · 1 of 7".
  - On a phone, the step list collapses to that one line, with the list behind a "Steps" button.
- **Test:** a fresh install opens on Welcome. No step shows the word "workspace". Progress reads "1 of 7" through "7 of
  7". At 390px the first field is above the fold.

**F2. The mail step sets aside personal mail by default.** (`shots/05`)
- **Seen:**
  - `walkthrough.mail.sorting` reads "Set aside newsletters and personal mail automatically", ticked.
  - The hint says "…to set aside personal mail and promotions. Uncertain messages stay with your work."
  - For persona A, all their mail is personal. For B, half of it is. This is the opposite of "Personal is the default
    project".
- **Fix:**
  - Word it as **"Set aside newsletters, sales and mailing lists"**.
  - Personal mail is never a set-aside kind.
  - "Uncertain messages stay with you."
  - Check `setaside.what.personal` and the sorting rule behind it, so nothing sets aside mail just for being personal.
- **Test:** on a "Just me" workspace, a personal message from a friend lands under Personal, not in Handled for you.
  The mail step's text never contains "personal mail" as a thing set aside.

**F3. "Just me" still gets a work tool.** (`shots/09`, `10`, `11`, `12`, `13`, `24`)
- **Seen** after answering "Just me":
  - Done asks "What kind of work is this?" (Client work, Content calendar).
  - The side menu heads its group "Work" and lists Stages and Waiting to go out.
  - Projects is a table with the columns Status, Stage, Target, Group, Owner, Open to-dos and Open questions, for one
    row, "Personal".
  - People has Role and Organization columns and an "Organizations" section.
  - Settings › Lists offers "Project group, phase, priority, status".
  - Today's first lines are "Pick an owner for 'Get a catering quote.'". On a personal-only workspace, the owner of an
    unowned to-do is the person.
- **Fix** (my adjustment 2, still open):
  - With no business:
    - The menu group is unnamed or "Your life", not "Work".
    - Stages, Waiting to go out and Projects are hidden.
    - "Personal" sits in the menu as a page, with its areas.
    - People shows Name, "Who they are to you" and How to reach.
    - No Organizations section.
  - Done never shows the work template.
  - The assistant defaults an unowned personal to-do to "you", and asks only when someone else is named.
- **Test:** on a "Just me" workspace, no screen contains the words "Work", "Project", "Stage", "Organization", "Owner"
  or "Template". Unowned personal to-dos show no "Pick an owner" line.

**F4. The business step stops at a name.** (`shots/16`, `18`)
- **Seen:**
  - "Me and my work" asks "What is your work called?" with the hint "Your employer's name, or your business's", plus a
    warning about the employer's permission.
  - Nothing else is asked about the business.
  - Projects then shows "Hale Upholstery" as one more row next to "Personal".
  - The mail step doesn't ask which mailbox is the business's.
- **Fix** (adjustments 1 and 3):
  - Split the answer into three: "Just my own life" / "My life and my job" / "My life and my own business".
  - **Employer** shows the permission note.
  - **Business** never does. After the first result, it gets one step:
    - "What does Hale Upholstery work on?": jobs, clients or orders, with "paste a list"
    - "Group them?" as an optional programs line
  - The mail step asks, for each mailbox connected: "Is this mailbox personal, for Hale Upholstery, or both?"
- **Test:** a business-owner journey creates the business with two jobs and one group. Its mailbox is marked business.
  A business mail lands in a business job, and a personal mail lands under Personal.

**F5. Ticks that aren't true, and three different counts.** (`shots/17`, `10`)
- **Seen:**
  - With mail skipped, the step list shows "Your promises ✓ Done".
  - Done shows "Hand in a first note ✓ Done" when nothing was handed in. The after-fix night capture of `setup-you`
    shows "Your promises ✓ Done" before anything was filled in.
  - Done's recap lists five steps and leaves out Work and Your promises.
  - Today says "Setup 2 of 5" and "Setup 3 of 5", while the wizard lists eight.
- **Fix:**
  - One list of steps, with one count, used by the wizard, Done and Today's setup line.
  - A step is "Done" only when its own thing happened. "Skipped" otherwise.
- **Test:** skipping mail shows "Your promises · Skipped (needs mail)". The counts on Today, Done and the wizard match
  in every journey.

**F6. Today shows the same things two or three times.** (`shots/11`)
- **Seen:**
  - The four "Pick an owner" lines are in Decide and again in Top priorities.
  - The two meetings are in "This week" and "Agenda".
  - Connecting mail is offered by the setup line, "Connect a calendar" and "Connect a mailbox".
  - On the empty Today (`shots/10`), five of the seven rail cards say there is nothing.
- **Fix:**
  - **C57: an item appears once on Today.**
  - The rail drops from seven cards to three:
    - **Briefing**, with goals inside
    - **Schedule**: Agenda and This week merged, which is the P49 card
    - **Came in**
  - Top priorities and Your to-dos leave Today. The queue *is* the priorities, and to-dos have their own home (see
    section 4).
  - An empty card isn't drawn. One line says "Nothing else needs you today".
- **Test:** on every Today fixture, no line key appears twice. The rail has at most three cards. An empty Today has one
  empty message, not five.

**F7. Day mode is heavy.** (`shots/30`, `31`, `32`; see `day-mode.md`)
- **Seen:**
  - Every row has a filled, saturated button, so a column of 19 dark blocks runs down the screen.
  - Every pane has both a fill change and a hairline border.
  - Group headers are grey bands.
  - Row titles are near-black at weight 600 (17.9:1, against 14.6:1 in night mode).
  - Neutral pills are grey slabs.
- **Fix:** the tokens and three component rules in `day-mode.md`:
  - row actions become tonal
  - panes lose their border
  - group bands go
  - titles drop to weight 500
  - the text is softened to about 15.9:1
- **Test:** the visual test compares Today, To-dos and Follow-ups in light mode. On Today there's at most one filled
  button per screen (the selected line's) plus "Hand something in". The axe contrast check passes.

**F8. Settings is a dump of the configuration files.** (`shots/19` to `24`; see `settings.md`)
- **Seen:**
  - The basic pages hold 32 fields, two of them quiet hours twice over (`shots/20`) and one of them `PRJ-1` (`shots/19`).
  - Labels are the schema's descriptions, written about "the person" ("The project that holds the person's own
    life…").
  - Advanced is 40 groups with names straight from the code ("Ui today", "Ui followups", "Watch versions", "Steward
    people", "Storage kept secrets") and 178 fields. Among them:
    - 27 file-type checkboxes, some reading `audio/mp4`
    - three identical "tier" labels quoting `tasks.<kind>.tier`
    - "Delivery dates / Decisions / Design quality" under Follow-ups and reminders
    - "json: a small JSON message"
  - The AI page shows nine routing pickers to everyone (`shots/23`).
- **Fix:** `settings.md`.
  - **Remove or automate 126 of the 188 on-screen fields.**
  - The basic page becomes 23 fields on five short pages (26 with a business).
  - Advanced becomes 8 plain topics with 28 fields, each with a short label and the explanation as its hint.
  - No setting shows an internal id or a key name, ever.
- **Test:** the settings walk test counts fields: at most 26 basic and at most 30 advanced. No label is longer than 60
  characters. No label or heading matches `/^Ui |^Watch |^Steward |PRJ-|PER-|tasks\.|json|tier/`.

### P1

**F9. "File 4 items under a new area, Pick?"** (`shots/11`)
- **Seen:** the area suggestion took the word "Pick" (from four "Pick an owner" titles) as an area name, and its button
  reads "Start Pick".
- **Fix:**
  - Areas are proposed from the items' subject, never from words of the app's own line titles.
  - The line reads "Group 4 to-dos under a new area?", with the name as a field.
- **Test:** a fixture with four "Pick an owner" items proposes no area named after an app verb.

**F10. The promises step can't find promises.** (`shots/06`)
- **Seen:** sent mail isn't read unless the person picks the Sent folder, and the page says so in small print. Promises
  are mostly in what the person *sent*.
- **Fix:**
  - Read the Sent folder by default; services name it in a standard way.
  - When nothing is found, say what the assistant *did* find ("7 messages read, 2 meetings this week, nothing you
    promised"), plus "Hand something in to see what it does".
- **Test:** the J6 journey with a promise only in the sent mail finds it, without choosing a folder.

**F11. Names nobody chose.**
- **Seen:**
  - "Reginald" appears in the AI step's question with no introduction.
  - The workspace is called "Workspace", which shows in the header with a "W" monogram.
  - The hand-over says the first step asks the person's name, the workspace's name, the assistant's name and personal
    or business. The build asks only the name and time zone; the rest is the Work step, and the two names aren't asked
    at all.
- **Fix:**
  - The "You" step adds "Your assistant is called Reginald. [Rename]".
  - The workspace takes the person's or business's name by default ("Avery's", "Hale Upholstery"), shown on Done with
    Rename.
- **Test:** a fresh workspace's header never reads "Workspace".

**F12. The AI choice drowns a beginner.** (`shots/04`)
- **Seen:**
  - "Something else" opens six services and four command-line tools, one with a 40-word note about its documentation,
    then "More options" with four more.
  - The step also shows "AI accounts: No AI account is set up yet".
- **Fix:**
  - "Something else" opens three lines (another service, an app you're signed in to, one on this computer), each
    opening its own short list.
  - Notes are one line each.
  - Drop the empty "AI accounts" block from the step.

**F13. The mail step explains the plumbing.** (`shots/05`)
- **Seen:**
  - "Not on this computer yet. Connect installs it and turns it on." (no button says Connect)
  - "Connecting this kind of account directly needs the Example mail add-on. One button adds it, restarts the app and
    opens the sign-in."
  - The button: "Add it and sign in — the app restarts for a moment"
  - "Made by Example publisher"
  - "Needs 1 key from you", next to "The app never sees your password"
  - "a mail server folder or a private calendar address"
- **Fix:**
  - One line and one button: "**Connect Example mail** · You'll sign in on Example's own page. The app restarts for a
    few seconds first."
  - The publisher and the key count go under "What it can access".
  - "Another mail or calendar" stays as the other button, with no sentence about server folders.

**F14. People on the personal side.** (`shots/08`, `13`)
- **Seen:**
  - The relation box starts on "my partner".
  - The list offers "my sister or brother".
  - No one is suggested from mail, though mail was connected two steps earlier.
  - There's no "paste a list".
  - After saving, the People screen doesn't show the relation at all. It shows empty Role and Organization columns.
- **Fix:**
  - The box starts empty ("Choose…").
  - Split "sister" and "brother".
  - Add "our landlord", "our school", "a tradesperson".
  - Suggest the five people mailed most, each with an Add.
  - Offer "Paste a list".
  - People shows "Who they are to you" in place of Role on the personal side.

**F15. Backups asks what it could decide.** (`shots/07`)
- **Seen:**
  - "Name for this folder (optional)"
  - "A folder outside this workspace that this app can write to"
  - a chooser opening at the raw path `/root`, with "There are no folders here"
- **Fix:**
  - Drop the name field.
  - The hint becomes "Pick a folder in your cloud drive (OneDrive, Dropbox, iCloud, Google Drive) or on a USB drive".
  - The chooser opens at the home folder, shown as "Your home folder".

**F16. Connections and Add-ons are in two places.** (`shots/14`)
- **Seen:**
  - Both sit in the main menu.
  - Clicking either opens a page inside Settings, with the Settings side bar or a "Back to Settings" link.
  - The main menu then highlights nothing.
- **Fix:**
  - Pick one home: **Settings** (they are set up once).
  - Take them out of the main menu.
  - Today's lines that need a connection link straight to the right Settings page.
  - Keep "Handled for you" in the main menu; it's daily.

**F17. The first read is reviewed in two places.** (`shots/15`, `11`)
- **Seen:** Today has "Look over what was found in Your inbox: 4 items" and "…Your calendar: 3 items", while What
  changed has eight rows, each with "Looks good".
- **Fix:**
  - Today's line is the only place to act.
  - What changed is the history: past tense, no buttons, with "Undo" in each row's menu.

**F18. What changed's details pane squashes a held item.** (`shots/40`)
- **Seen:** the "Waiting for you · Would drop a to-do" block renders in a column about 100px wide, with brown text
  ("Maya Okafor, Ines Duarte were told on Sat, Oct 10…").
- **Fix:** the held block uses the pane's full width, the same layout as Today's details pane.

**F19. Raw dates in titles.** (`shots/11`)
- **Seen:** "Send the venue list by 2026-11-02.", "Send the headcount by 2026-11-04."
- **Fix:** titles drop a due date that the meta line already shows, or write it as "by Mon, Nov 2".

**F20. The header still cuts off at 1440.** (`shots/11`, `41`)
- **Seen:** "Regin…", "last task 4:09 P…", "Qu…".
- **Fix:** the assistant's status shows as one dot and the name, with the last task in its popover. Nothing in the
  header is cut off at 1280 or wider.

**F21. The rail is too narrow for its words.** (`shots/11`, `41`)
- **Seen:**
  - "Your to-\ndos"
  - "Venue walk-\nthrough"
  - "maya.okafor@example.c\nom"
- **Fix:**
  - Show the sender's name only; the address goes in the tooltip.
  - Meeting titles take the full row under the time.
  - With F6's three cards, the rail can be `clamp(320px, 22vw, 440px)`.

### P2

- **F22. The Work step's radios sit in a bordered box with its legend in the border** (`shots/03`), with the radios
  higher than their labels. Use two large choice cards, each with a one-line description, as on the AI step.
- **F23. Handled for you has three tabs**, where the proposal had two (`shots/42`). Merge "Closed by a rule" into "Set
  aside": the reason shows the rule.
- **F24. "Missed one"** is still the Quality heading (`quality.missed.title`). Make it "Missed something?", to match
  the rename.
- **F25. "Copy 1", "Copy 2", "Copy 3"** in Follow-ups. Make them "Copy message", with the count in the row's meta.
- **F26. "That leaves 30 minutes too little to travel between them"**: say "Only 0 minutes between them; you need about
  30 to get from Room 4 to Room 2".
- **F27. The Settings intro** is in 12px grey under the title, and "Open Add-ons" / "Open the setup guide" sit at the
  top of every Settings page. Keep "Open the setup guide" on the You page only.

## 4. One place to act: my decision

The designer is right that a to-do can be ticked in four places. **Every thing has one home where it is acted on;
everywhere else is a link to that home.**

| Thing | Its home, where it is acted on | Everywhere else |
|---|---|---|
| A decision or question to you | **Today's queue line** (Answer) | Follow-ups' "You" group and the record page link to it: "Answer on Today" |
| A to-do | **To-dos and questions**, where its row has Mark done | Today's queue keeps one summary line ("Finish 2 overdue to-dos → Show", which opens the list filtered). The rail's "Your to-dos" card goes (F6). Follow-ups shows your own to-dos as links |
| A message to send | **Follow-ups › To send** (Copy message, Mark sent) | Today's "Send 1 to-do to Ines Duarte" opens it. **"Waiting to go out" merges into this tab**, since both are things waiting for your approval to go out |
| Mail handled for you | **Handled for you** | Today and What changed show one count line that opens it (as P47 proposes) |
| Something the assistant did | **Today's Review line** (All looks good) | What changed is the history (F17) |

This keeps 7.7 ("the queue is the only place") for everything that needs the person, and gives a to-do a list of its
own, which a beginner expects.

## 5. The two proposals

**P47, "Handled for you"** (built). **Yes, with two changes:**
- **Two tabs, not three** (F23).
- **Group by kind by default.** Bills, orders and deliveries matter more than who sent them.

The name "Handled for you" is right: it says the app did something on the person's behalf, which "Sorted" doesn't.
Keep "Kept for 30 days".

**P49, the schedule** (approved and built). **Yes:**
- Today's card is the first day of the schedule, and it absorbs "This week" (F6).
- On a 1440 window, three days sit side by side; on a phone, one day, with a swipe.
- No week view yet.
- The calendar label on each row is right. Keep the colour optional.

## 6. Checked against the agreed plan

| Item | Status | Seen |
|---|---|---|
| Welcome screen ("what you'll need") | **Not done** | F1 |
| You: no workspace name | Done | The name was dropped, but nothing replaced it (F11) |
| Business yes/no and name asked early (adj. 1) | **Partial** | Asked in step 2, but as "work", and no business vs employer (F4) |
| No "project" wording for personal-only (adj. 2) | **Not done** | F3 |
| Small-business words, programs optional (adj. 3) | **Not done** | Only the people step has customer, supplier and staff (F4) |
| People by relation, paste a list if mail skipped (adj. 4) | **Partial** | Relations are in. No paste, no suggestions, and the relation isn't shown on People (F14) |
| Two sides apart from day one (adj. 5) | **Partial** | Today has the filter. Follow-ups, To-dos and the records don't. Nothing asks which side a mailbox is (F4) |
| Mail skipped → "Hand something in to see what it does" | **Not done** | It says "Connect your mail first" |
| Progress "You: 1 of 7" | **Not done** | F1, F5 |
| N3–N7 | Hold | Nothing regressed on the first-run checks. N1, N2 and N8 are still open |

## 7. Proposed setup checks (P1 to P12), for the master checklist

- **P1.** The first screen says what the app does for the person, what they'll need and the time, with no PM words.
- **P2.** Progress reads "n of 7" in the wizard, on Done and on Today. All three agree.
- **P3.** A step is ticked only when its thing happened. Otherwise it reads "Skipped".
- **P4.** "Just me": no screen shows Work, Project, Stage, Organization, Owner or Template.
- **P5.** No sorting rule sets aside mail for being personal.
- **P6.** "My own business" asks the business's name, what it works on (paste allowed) and, per mailbox, which side it
  belongs to. "My job" shows the employer note, and "business" never does.
- **P7.** People on the personal side: a relation box that starts empty, suggestions from mail, and paste a list. The
  People screen shows the relation.
- **P8.** The first result reads sent mail by default. An empty result says what was read and offers "Hand something
  in".
- **P9.** The assistant is introduced by name before anything refers to it. The workspace never shows as "Workspace".
- **P10.** Today shows each item once (C57), with at most three rail cards.
- **P11.** At 390px, setup's first field is above the fold, and the step list is one line.
- **P12.** Settings: at most 26 basic fields, at most 30 advanced, and no ids or key names (see `settings.md`).

## 8. What to build first

1. **F2 and F5.** These are small, and they are the two that break trust.
2. **F1 and F11:** the opening and the names.
3. **F3 and F4:** the two personas' paths.
4. **F6 and section 4:** one home for everything, and Today shows each thing once.
5. **F8:** the settings cut in `settings.md`.
6. **F7:** the day-mode tokens. This is mechanical once F6 removes most of the row buttons from Today.
7. The P1s and P2s, with the browser tests named above.

Then run both personas again on a fresh install, and N8 with real people.

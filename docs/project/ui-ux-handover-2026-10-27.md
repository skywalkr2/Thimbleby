# For the UI/UX reviewer: your review of 45f7102, built, for your second pass (P69)

Everything you asked for in your review (`reviews/ui-ux-2026-10/review-45f7102/`), including `settings.md`, `day-mode.md`, sections 4 to 7, and your thirteen answers of 2026-10-27, is built, with the few exceptions listed at the end. That includes the points first left as they were. The owner asked for all of it to be built before your second pass. Each piece has its tests; the change log is `docs/design/CHANGES.md` sections 225 to 233, and the decisions are the 2026-10-26 and 2026-10-27 entries in `docs/decisions.md`.

## What to look at

- **Captures:** every main screen and every setup step, in day and night mode, at 1440 and 390, in
  `reviews/ui-ux-2026-10/after-phase-u/` (`<screen>-<mode>-<width>.jpg`, listed in its `index.md`).
- **Try it live:** `uv run cockpit init ~/thimbleby-try`, then `uv run cockpit serve -w ~/thimbleby-try`. That gives a fresh workspace with no template, opening on Welcome.

## Your findings, one by one

**P0**
- **F1.** Setup opens on Welcome: what the app does, what you'll need and the time it takes. Progress reads "n of 7" in the wizard, on Done and on Today, all from one list.
- **F2.** Personal mail is never set aside: a personal sorting answer or rule files the mail under Personal.
- **F3.** "Just me" sees no work tool:
  - no Work heading, Stages, Waiting to go out or Projects;
  - Personal is a page of its own;
  - People reads Name, "Who they are to you" and How to reach.
  - A browser check walks every main screen, the setup screens, Done, the add forms, row menus, Knowledge, Quality, Ask and the record pages. It looks for Work, Project, Stage, Organization, Owner and Template, and for lowercase "project" and "workspace".
- **F4.** The business step goes beyond a name:
  - what each business works on (a pasted list becomes projects);
  - "Add another business";
  - which sides each mailbox serves;
  - your optional "Do some of these belong together? Give the group a name" (answer 8).
- **F5.** A step is ticked only when its thing happened, otherwise "Skipped". One count everywhere.

**One place to act (your section 4) and Today**
- **F6 and C57.**
  - Today shows each thing once.
  - The rail has three cards: Briefing, Schedule and Came in.
  - There is no Top priorities or Your to-dos card; overdue to-dos are one line that opens the list.
  - "Nothing else needs you today" when the queue is empty.
  - A quiet "12 handled for you today" link in Came in opens Handled for you.
- **F16.** Connections and Add-ons are sections of Settings. Old addresses redirect.
- **F17, answers 1 to 3.** What changed is the history:
  - no action buttons in the pane;
  - a held item is information at full width with one link, "Answer on Today";
  - Undo stays in the row's menu;
  - it opens on All, newest first, and "Needs attention" is gone;
  - the first-go and stage rows are gone, replaced by one line at the top, "2 things wait for you on Today · Open Today".
- Waiting to go out is Follow-ups' To send tab. Questions say "Answer on Today".
- **Answer 4.** On a quiet day the brief has no buttons for the other forms.
- **Answer 5.** Came in is drawn with a quiet "Check now" once a source is connected, even with nothing in.
- **Answer 6.** One side filter, the same control in the same place, on every list that can hold both sides. It is hidden with no side.

**Day mode (F7, `day-mode.md`)**
- Your light tokens.
- Tonal row actions, with only the selected line's filled.
- Panes without borders, no group bands, titles at 500, outline neutral pills.
- Rail links underlined only on hover or focus.
- Night mode is unchanged.

**Settings (F8, `settings.md`, F27, answers 11 and 12)**
- **Basic pages.** Five basic pages: You, AI and spending, Notices, Backups, Appearance.
  - "Your business" is added when there is a business.
  - That's 19 rows, 22 with a business.
  - You is in your order: Your name, Time zone, English spelling, Assistant's name, This workspace's name.
- **Merged rows.** Working hours is one row. So are the brief's times, where reminders go, and the notices switch.
- **Advanced.** 26 fields in eight plain topics.
- **New homes for moved fields:**
  - Add-ons › For developers: the catalog switch, the app's own catalog, more catalogs and access keys.
  - Follow-ups › Message style: greeting and closing with a live preview.
  - Knowledge › Glossary.
- **Hints and labels.**
  - Hints carry no code words or work words; a test scans them.
  - "Changed" shows only for what you changed.
  - "Open the setup guide" shows on You only, and the intro is body text.
- **AI page.** "Choose which account does each kind of work" is a closed disclosure on the AI page.
- **Quality.** Its menu entry and page heading both read "How Reginald is doing".
- **Lists.** Lists is a section whenever there are lists to show. With a business, its project lists sit on the business page.

**The P1 bugs and the rest**
- **F9.** Areas are never named after the app's own lines.
- **F10.** Setup reads sent mail from the start. An empty first result says what was read and offers "Hand something in". With mail skipped, Your promises leads with "Hand something in to see what it does".
- **F11.** The assistant is introduced by name. The workspace is named after you, never "Workspace".
- **F12.** The AI choice is three lines, with "Another service" for the rest.
- **F13.** The mail step is one line per service, "Connect …".
- **F14.** People on the personal side:
  - each relation starts empty;
  - the people you write to most are suggested;
  - you can paste a list;
  - addresses are kept.
- **F15.** Backups asks no name.
- **F18.** The held block uses the pane's full width.
- **F19.** No raw dates in any title.
- **F20.** The header never cuts off. Its status gives way first, and a browser test widens the text to prove it.
- **F21.** The rail shows names, not addresses.
- **F22.** The Work step is choice cards.
- **F23.** Handled for you has two tabs, grouped by kind.
- **F24.** "Missed something?".
- **F25.** "Copy message", with the count in the row's meta.
- **F26.** "Only 10 minutes between them; you need about 30 to get from Room 4 to Room 2", in the queue and the brief.

**Your answers 9 and 13**
- **Answer 9.** A connection's privacy follows the side it serves: Personal is private, and a business takes its own level. It is shown on the connection's row in Settings › Connections as "Privacy: Private, because it serves Personal", and you can change it there. Setup asks nothing.
- **Answer 13.** Files has a details pane: a preview, where it came from and what refers to it. Connections has none.

**From your earlier re-reviews**
- The manual restart line, "Start", and "1 of 3 closed without you seeing it" are reworded.
- A failed action's toast offers "Try again".
- Toasts that carry an Undo stay until dismissed or replaced.

**Also built, on the owner's calls**
- **Removing a business** after setup asks whether its projects and to-dos move to Personal or end with it, with Undo.
- **Backups:** a backup is made before loading a copy from the synced folder, before an add-on install or update, an import, Release all, and a removal or project ending that touches many records.
- **What changed's history pill** for work nobody has checked reads "Not yet checked". A pill in a row's pill column wraps inside its column rather than running over the title.

## Where it differs from what you wrote, and why

- **Answer 7.** The step is "What it's for", asking "What will you use it for?". The owner decided earlier that a job and a business can both be chosen, and several businesses, so the answers are "Just my own life", or "My life and my job" and/or "My life and my own business" as tick boxes, not three either-or choices.
- **Answer 10, notice formats as named apps: not built yet.**
  - The app sends notices in two shapes only, plain JSON and plain text.
  - A named app would need its own shape, and app names can't sit in the core.
  - A plugin could provide them, but that needs a plugin API change, and those are on hold.
  - The owner decides how to go on; until then the choices read "A chat app" and "A push notification topic".
- **Privacy at the AI step.** Because personal mail is now private (answer 9), the AI step's "Allow" also allows private material, and says so, so the first result can read your mail. This is listed for the owner's decision.

## For your second pass

Look at the whole app again in both modes. Above all:
- check setup as a beginner, "Just me" and with a business;
- check that Today and What changed now feel like one place to act;
- check that Settings reads as a person's settings.

Send what you find in the same form as before. Nothing you send is built until the owner has read it.

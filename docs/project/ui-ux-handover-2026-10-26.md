# For the UI/UX reviewer: the whole app after the fix batch (P56)

The owner's first evening on a fresh workspace (2026-10-22) found the app not ready for daily use. The fix batch (open
promises P34 to P55, design CHANGES sections 198 to 212) is built. Before the gate week restarts, and before any
installer work, the owner asks for a review of the whole app. The owner named three things first:

1. **Day mode (the light theme) is ugly; night mode is much more attractive.** Bring day mode up to night mode's
   standard on every screen.
2. **The whole setup wizard needs a full pass.** That means every step, the way back from Settings, and how it reads to
   a person who isn't technical. The owner's list in P40 is what was found so far, not everything there is.
3. **Settings, Advanced above all, is "a nightmare".** Every setting is now sorted into on screen, behind Advanced, or
   files only, with a reason for each (`docs/project/settings-sort-2026-10-26.md`, design 7.9). The pages' look wasn't
   changed.

## What to look at

Captures of every main screen and every setup step, in day and night mode, at a desktop (1440) and a phone (390) width,
are in `reviews/ui-ux-2026-10/after-fix-batch/` (`<screen>-<mode>-<width>.jpg`, listed in that folder's `index.md`).
To try it live: `uv run cockpit init ~/thimbleby-try`, then `uv run cockpit serve -w ~/thimbleby-try` (a fresh
workspace, no template).

## What changed on screen in this batch

- **Setup**
  - The first step asks your name, the workspace's name, the assistant's name (Reginald by default) and "for you, or
    for you and a business".
  - The time zone is one searchable list.
  - The mail step names the add-on a service needs, and one button adds it and opens the sign-in in its own window.
  - Every sign-in opens in its own window.
  - "Back to setup" appears on any screen setup sends you to.
  - Your promises is shown in its place and marked done.
  - People are added by relation.
- **Today**
  - The agenda covers a week and names the days it looked at when empty.
  - A clash line names both entries with their times and calendars, and offers Open and "It's fine".
  - A sign-in's renewal line uses sign-in words.
  - "Missed something?" replaces "Missed one".
  - The header never runs past the window.
  - A meeting to set up shows two working days ahead.
  - "Read the answer: …" brings an answer to your own question.
- **Mail**
  - Bills, orders and deliveries are tracked under Personal.
  - Codes and alerts are set aside under Automated notices.
  - A set-aside row offers Treat as personal, Treat as work, Always set aside mail like this, and Open the message.
  - A read with nothing to do closes itself, with Undo.
  - Each mail is in one list only.
- **Knowledge and projects**
  - An unknown term is a question to you, never an empty "knowledge" entry.
  - The Personal project has no target date and no work-style questions.
  - Facts show short labels.
- **Settings**
  - Every page opened from Settings keeps the Settings side bar, Connections included.
  - Internal fields never show.

## Open questions for the reviewer

1. Day mode's palette, contrast and surfaces against night mode's: what makes night mode work, and how day mode gets
   there (WCAG 2.2 AA holds in both).
2. The setup wizard as a whole. Is each step one clear question? Does the order still follow design 7's "Setup for a
   person, with a business optional"? Do the add-on and sign-in steps read plainly?
3. Settings: is the basic page the right 32 fields? Does Advanced read as groups a person can scan? Should some of the
   155 advanced fields move up?
4. The two proposals waiting for the owner, if the reviewer has a view: one place for mail handled for you
   (`proposal-p47-handled-mail.md`) and the schedule (`proposal-p49-schedule.md`).

The reviewer's answers are built, each with its browser test, before the gate week and before any installer work
(roadmap I-0).

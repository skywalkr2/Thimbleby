# Full sweep of the app from a fresh install, at `04ffc21e`

**For:** the main session (host), and the owner.
**From:** the UI/UX reviewer, 2026-10-28.
**Build:** branch `claude/tender-tesla-16a8ob` at `04ffc21e`, built clean.

**Why this exists:**
- My earlier rounds looked at setup and the top of each menu screen on a workspace filled by the test mail.
- They never opened empty screens, record pages, dialogs, menus or most options.
- The owner found many bad screens on a real first day. This sweep opens everything.

**What's in this folder:**

| File | What it holds |
|---|---|
| `README.md` (this file) | Verdict, how it was tested, the **exit criteria**, the **master list** (every finding merged and numbered), cross-cutting causes, what to build first |
| `TRACKING.md` | One row per master item: severity, title, sources, the test that proves it, status. **Fill in its Status, Commit and Test columns as you go** |
| `appendix/sweep-setup.md` | Sweep 1, in full: setup, every step and option, three complete runs |
| `appendix/sweep-daily.md` | Sweep 2, in full: every screen empty, then daily use as persona A (own life only) |
| `appendix/sweep-business.md` | Sweep 3, in full: persona B (personal + job + business), mail connected, every record page |
| `appendix/sweep-settings.md` | Sweep 4, in full: every Settings section and control, plus the admin screens |
| `appendix/auto-checks.md` | The automatic checks run on every screen opened, with each hit |
| `shots/<sweep>/<name>.jpg` | 381 screenshots: every one a finding cites. Each name matches the appendix |
| `visual/README.md` | The visual review: a score for every screen, shared component fixes (VC01 to VC13), findings by screen (VS01 to VS19), six mockups with before and after, visual exit criteria E9 to E12 |
| `visual/appendix/`, `visual/mockups/`, `visual/before-after/` | The three visual reviews in full, the mockup pages and their renders, and side-by-side images of today's screen and the mockup |

**Source ids:**
- In the appendices: `S-` setup, `D-` daily use, `B-F` business, `T-` Settings.
- Master items: `X01`–`X65` (P0 and P1), and `Y01`–`Y06` (P2 groups).

**Nothing is lost by merging:** every source finding is named under its master item, and the appendices keep each sweep's exact words and steps.

## 1. Verdict

- **Neither persona could get through a first week alone on this build.** Setup mostly works, but five problems can trap the person or quietly damage their data (X01–X05). A sixth gives a false state on Today: an unsent to-do reads "Sent today" (X06).
- **Daily use is held back by a few causes that show up everywhere**, not by single screens:
  - **Internals leak onto the screen:** ids, JSON, ISO dates, file names and validation messages.
  - **Work words and work questions** reach a person who only tracks their own life.
  - **Sides don't work:** the side filter changes nothing, and people and connections can't be given a side.
  - **Reviews still bounce around:** a review sends the person away, multiplies lines, or doesn't remove what was rejected.
  - **Saves race:** quick changes are lost.
- **Night mode works everywhere,** and nothing scrolls sideways at phone width except one edge case (Y04). The colours, type and tokens are sound, but the screens are not yet laid out like a modern app: the separate visual review in `visual/README.md` scores them 2.6 out of 5 on average and sets its own exit criteria (E9 to E12).

**Counts after merging:**

| | P0 | P1 | P2 |
|---|---|---|---|
| Source findings, all four sweeps | 5 | 110 | 91 |
| Master items | **6** | **59** | **6 groups** |

Two items are raised to P0 because they corrupt data:
- **X05:** duplicate sources multiply items.
- **X06:** an unsent to-do is marked sent, and settles its own follow-up.

I checked these by hand, beyond the four sweeps' own checks:
- **X01:** I reproduced the lost save myself.
- **X03, X04, X06, X21, X22, X48:** I compared each against its screenshot or page text.

## 2. How it was tested

- **Four sweeps at the same time,** each on its own fresh install (`cockpit init` with no template, then `cockpit serve`). The journey test kit's fakes stand in for the AI service, the mail and calendar service, and the add-on catalog.
- **Each sweep was asked to open every screen, state, menu, dialog and option in its area** and to press every button. Each was checked at 1440 in day mode, 1440 in night mode and 390×844 on a phone, and tried with wrong input, Undo, Back and reload.
- **Every screen saved also ran the automatic checks** in `appendix/auto-checks.md`.

| Sweep | Installs | Screens saved | What it covered |
|---|---|---|---|
| 1. Setup | 3 runs: personal only with everything filled in; personal + job + two businesses with mail sides; everything skipped | ~330 | Every step, every AI option, every mail form, backups, people, Done, every way in and out |
| 2. Empty and daily use | Persona A, mail added late | ~150 | Every main view and overlay empty, then data typed by hand and every action on it |
| 3. Business | Persona B with mail | 233 | Today with data, every list, every record page reached, business add, rename and remove |
| 4. Settings | Main plus a skipped-setup install | 205 | Every section and control changed and reloaded, search, admin screens |

**Not reached, to cover in the next sweep:**
- Note, question, decision, series, delivery and source record pages. The fake AI made no question or decision, and notes have no list to open them from (see X43).
- The real Anthropic and OpenAI key errors: this container can't reach them.
- The sign-in popup itself.

**Known fixes not in this build:** the host said folder lists for add-on accounts, and focus when opening Label, weren't pushed yet. Neither is reported as a finding.

## 3. Exit criteria for this round

This round is **done** only when all of these hold, and the reviewer has signed off in `TRACKING.md`:

1. **Every P0 (X01–X06) is fixed,** each with a browser test that reproduces the original failure first and passes after. The test's name goes in TRACKING.
2. **Every P1 (X07–X65) is fixed, or deferred in writing by the owner.** A deferred item is recorded in `docs/project/` with the owner's yes and the reason, and is marked "Deferred (owner)" in TRACKING. "Partly fixed" is not done.
3. **P2 groups (Y01–Y06)** are fixed or moved to the backlog with the owner's OK. Each line in a group is ticked or moved.
4. **Guards run in CI on every screen in the inventory below:** every main view, every Settings section, every setup step, every record page kind, every dialog and drawer, and every empty state. Each runs at 1440 and 390, in day and night. The guards:
   - **No internals on screen or in any outward message:** no internal id (`PER-`, `ACT-`, `PRJ-`, `WEEK-`…), raw JSON, ISO date (`2026-11-04`), ISO time (`T15:07`), file name (`*.yaml`), code word (`journey-mail`, `America/Los_Angeles`, `en-GB`), unfilled `{placeholder}`, `undefined`, `null`, `NaN`, model name, or raw validation text ("Input should be…", "String should match pattern…", "Errno").
   - **No sideways scroll, no button without a name, no console error.**
   - **Saves never race:** three edits within a second on any one settings page all persist after a reload. The same holds for the mailbox side boxes in setup and Settings.
   - **Today:**
     - an item appears once (C57)
     - the count never rises because of the person's own action (U14)
     - a source marked business-only never shows under Personal or another side's tab
   - **Personal only:** on an own-life-only workspace, no screen shows Work, Project, Stage, Organization, Owner, Template, "report to", "manage" or "action" (extends P4/U-checks).
5. **Three journeys pass from a fresh install:**
   - **A, own life only:** a typed person with an email, a typed to-do, a hand-in, mail connected later.
   - **B:** personal + job + business, one mailbox serving two sides; a second business added later from Settings, then removed.
   - **Skip everything:** the person reaches Today and stays there across reloads, and can find the way back to setup.
6. **Fresh captures** of every screen in the inventory, empty and with data, at 1440 and 390, in day and night, are in `reviews/ui-ux-2026-10/after-sweep/` with an index.
7. **A hand-over** in `docs/project/` lists every X and Y id with its status, commit and test, plus anything built differently from this list and why.
8. **The reviewer re-sweeps** with the same four-area method on the new build:
   - **Pass:** no P0, and no P1 that is new or reopened.
   - Every screen in the inventory has a coverage row.
   - The automatic checks are clean, except hits explained as intended.

**Screen inventory** (the guards and captures must cover every one):
- **Setup:** Welcome, You, What it's for, Your AI account (and each Something else option), Mail and calendar (and every Another mail or calendar form), Your promises, Backups, People, Done.
- **Main views:** Today, Schedule (Day, Work week, Week, Month), What changed, Since yesterday, Handled for you (both tabs), Follow-ups (every tab), To-dos and questions (both tabs), Stages, Projects, each side's page, People, Organizations, Files, Knowledge, Rules to look over, How Reginald is doing, Handover.
- **Settings:** You, AI and spending, Compare, Notices, Backups, Appearance, Quick links, Your business, Lists, Connections, Add-ons, each add-on's page, Advanced (every topic), Files.
- **Record pages:** person, organization, project, side, to-do, question, decision, note, fact, schedule entry, calendar event, delivery, series, file, source.
- **Overlays:** Hand something in, Ask (drawer and pane), header search, Missed something?, the status popover, the Reginald popover, the user menu, Help, shortcuts, feedback, every row's "…" menu, and each confirm dialog (Remove, Sign out, Remove business).

## 4. Master list

Each item gives a short description, then **Fix** and **Done when**. **Sources** lists the appendix ids, where the full steps and quotes are kept. **Shots** gives `shots/<sweep>/<name>.jpg`.

### P0: stops a person, or loses or corrupts data

**X01. Quick changes are silently lost.**
- **What happens:**
  - Settings: change three fields on one page within a few seconds. All three show "Changed", but after a reload the last one is gone. The reviewer reproduced it: $0.10 / $2.00 / $30.00 → shown $0.35 / $6.00 / $47.00 → after a reload, $0.35 / $6.00 / **$30.00**.
  - Quick Resets in Advanced are dropped the same way (3 of 6).
  - Setup's mailbox "Who is it for?" boxes save a different set from the one on screen. The job the person unticked was saved as ticked.
- **Fix:** one save path that queues or merges changes and never drops one. Redraw from the server's answer. If a save is refused, put the field back and say so beside it.
- **Done when:** three edits within a second, on any settings page and on the side boxes, all persist after a reload (guard 4).
- **Sources:** T-P0-1, S-P0-1.
- **Shots:** settings/race-quick-edits, setup/r2-08-mail-sides-quick, setup/r2-09-mail-sides-separately.

**X02. Setup can't be left while a step is missing.**
- **What happens:** with the name or AI account skipped, "Go to Today" and "Finish later" save, then reset on the next load. Even `#today` opens Getting started, so the person can never stay on Today.
- **Fix:** respect `closed` and `finished` on load. While something is missing, Today shows one setup line instead of reopening setup.
- **Done when:** the skip-everything journey reloads Today three times and stays there.
- **Sources:** S-P0-3.
- **Shots:** setup/r3-09-today-reopen, setup/r3-04-today-all-skipped-night.

**X03. "Paste a list" saves junk as people, and setup can't remove anyone.**
- **What happens:** "12345", "!!!", "http://example.com", "Ines Duarte, my sister" and a second "Sam Rivera; my accountant" all become people. No row in the step has Remove.
- **Fix:**
  - Skip lines with no letters, and addresses.
  - Read "Name, relation", "Name - relation" and "Name; relation" as a name plus a relation.
  - Show a preview before adding, and merge duplicates.
  - Put Remove with Undo on each row.
- **Done when:** a test pastes those lines and gets two people with relations, and no junk.
- **Sources:** S-P0-2; also B-F41 and S-P2-15.
- **Shots:** setup/r1-48-people-paste-filled, setup/r1-49-people-paste-after.

**X04. Backups has no backup folder, no Back up now and no restore.**
- **What happens:**
  - After setup, Settings › Backups shows "Back up automatically", "Synced folder" twice, and Backup key.
  - It doesn't show where backups go, when the last one was made, or any way to change the folder.
  - Back up now exists only in the header popover, and there is no restore screen anywhere.
  - On a skipped install, automatic backup is ticked with no folder.
- **Fix:**
  - At the top of the page: "Where backups go" (Check, Choose…), the last backup, Back up now, and "Restore from a backup" (with a backup taken first).
  - The automatic switch shows off, with its reason, until a folder is set.
  - Back up now reports its result.
- **Done when:** a journey sets a folder in Settings, backs up, restores, and sees the result on screen.
- **Sources:** T-P0-2, T-P2-9.
- **Shots:** settings/b-d-backups, settings/bk-more-open, settings/skip-skip-settings-backups.

**X05. "Choose what to read" makes duplicate sources that multiply items.** *(Raised from P1: it corrupts data.)*
- **What happens:**
  - It accepts any typed folder name ("Nonsense folder 123", "Archive"). Each one adds another "Example mail · 6 items" row that reads the inbox again.
  - Today went from 6 to 9, What changed from 5 to 11, and To-dos from 4 to 10.
  - Removing the rows left the duplicates behind.
- **Fix:** pick from the account's own folder list, refuse a second source for the same folder, and never make duplicate items from one message. Removing a source offers to remove what came only from it.
- **Done when:** adding the same folder twice is refused, and a nonsense folder is refused with a plain reason.
- **Sources:** T-P1-13.
- **Shots:** settings/cn-choose-mail, settings/cn-add-Nonsensefolder123, settings/cn-change-inbox.

**X06. An unsent to-do shows as "Sent today", and settles its own follow-up.** *(Raised from P1: it corrupts the to-do's state.)*
- **What happens:**
  - A to-do for Priya appears twice on Today: as "Send 1 to-do to Priya Hart · Ready to send", and as "Sent today · Follow up with Priya Hart · 1 item awaiting a reply". The nudge refers to a note never sent.
  - Follow-ups lists it under both To send and Waiting on them.
  - Mark sent marks the follow-up "Settled elsewhere", and Followed up marks the unsent line "Settled elsewhere".
- **Fix:** one state per to-do. It becomes "sent" only through Mark sent (or an approved send), which moves it to Waiting on them.
- **Done when:** a test makes a to-do for someone else and checks it is under To send only, until Mark sent moves it.
- **Sources:** D-P1-3.
- **Shots:** daily/s1-d-today, daily/fu1-main, daily/fu1-Waitingonthem, daily/a-mark-sent, daily/a7-followed-up.

### P1: Setup

**X07. "Your promises" says nothing was found when something was.**
- **What happens:**
  - "No open promises found… nothing you promised", while Today lists the person's own "Send the revised budget by Thu, Nov 5" from the sent mail.
  - The intro claims "one follow-up ready".
  - "You press Start first; nothing is read before" stays above the result.
- **Fix:** count the person's own new to-dos as promises, claim a follow-up only when one exists, and write the text from the step's state.
- **Sources:** S-P1-1, D-P2-19, S-P2-11, S-P2-12.
- **Shots:** setup/r2-11-promises-result, setup/r2-12-today-sent-lookover, daily/m-promises.

**X08. A mailbox, calendar or folder is added without a check, then fails with the wrong reason.**
- **What happens:**
  - A nonsense mailbox is "Added… read within a minute" and marks the step Done.
  - Later errors read "There was no internet connection" and "[Errno -2] Name or service not known".
  - A bad server reads "Not checked: no internet connection"; a bad calendar link reads "isn't a host this may reach… or sign in again".
  - There's no Remove in setup.
- **Fix:** test before adding, name the real cause in plain words beside the field, and add Remove.
- **Sources:** S-P1-2, T-P1-14.
- **Shots:** setup/r1-23-mail-another-mailbox-nonsense, setup/r1-36, settings/cn-mailbox-bad, settings/cn-cal-bad.

**X09. "Another mail or calendar" and "Add a connection" read like an admin console.**
- **What happens:**
  - "settings: Value error, give the calendar's link…", which persists after switching kind.
  - "Default: (empty)", "Changed · Reset", "every 240 minutes".
  - "*.txt × *.md ×", "a full path, or one inside the workspace's folder".
  - "Whose work it holds", "Older mail isn't read" on calendar forms, and "What to read" twice.
  - Picking "Another mailbox" drops into a generic five-kind form.
  - Today's "Connect a mailbox" leads here, not to the one-click service.
  - Rows are named by type ("A folder").
  - The folder form has no chooser.
- **Fix:**
  - Each kind has its own short form, with a one-line description.
  - Technical options go behind Advanced, and errors sit beside the field.
  - "Another mailbox" goes straight to the mailbox fields.
  - Today's link opens the service list.
  - Rows are named after what they read.
- **Sources:** S-P1-3, S-P1-4, D-P1-23, T-P2-15, T-P2-11.
- **Shots:** setup/r1-22-mail-apppw-Anothermailbox, setup/r1-23-mail-another-mailbox, daily/m-connect-from-today.

**X10. The AI choices: broken wording, model names, dead-ends.**
- **What happens:**
  - Claude Code: "The service is Claude Code account.", "…no account at email.", "Recommended / Stronger / Stronger", "The app calls this one 'haiku'", "Checking your key…" with no key, and cut-off card text.
  - Ollama and LM Studio show red errors before any check, with no address field or Check button.
  - The command-line agent says "Test also checks the lockdown", but there's no Test button.
  - The generic service gives one message for every failure.
  - Google AI Studio's text contradicts itself.
  - "Add and check" is disabled with no reason given.
  - The default account name, "Another service that speaks the common chat format account", is repeated about 30 times, sometimes as "account 2".
  - "Selected model: fake-small".
- **Fix:** rewrite each option's sentences, never show a model's name, add a Check button with no error before the first check, ask for a short account name (defaulting to the service's name), and give the reason a button is disabled.
- **Sources:** S-P1-5, S-P1-6, S-P1-16, T-P1-6, T-P1-7, T-P1-10, D-P2-22, B-F46, T-P2-13, T-P2-14.
- **Shots:** setup/r1-12-ai-app-claude-after20s, setup/r1-13-ai-local-*, setup/r1-14-*, settings/ai-add-cli, settings/ai-add-other-filled, settings/b-d-ai.

**X11. Privacy is asked twice, in three vocabularies.**
- **What happens:**
  - Setup asks Allow / Not my private mail, then Advanced asks again as Open / Internal / Restricted ticks, along with "environment variable name" and "128,000 text units".
  - Connections uses Like what it serves / Open / Confidential / Private.
  - An inbox can be lowered to "Open" with no warning.
- **Fix:** one vocabulary across the app, one question in setup, and a warning when making anything less private.
- **Sources:** S-P1-7, T-P1-16.
- **Shots:** setup/r1-17, setup/r1-18-*, settings/ai-add-openai, settings/cn-change-inbox.

**X12. A reload loses typed setup answers.** The employer, businesses, project lists and groups on What it's for, and the AI service, address and key, are gone after a reload. The job and business ticks are lost too.
- **Fix:** keep a draft per screen, and say it was restored.
- **Sources:** S-P1-8, B-F40.
- **Shots:** setup/r1-16.

**X13. Getting back to setup, and its counts.**
- **What happens:**
  - After skipping everything, Today has no setup line and nothing says there's no AI account, while What it's for promises "the setup list on Today".
  - Reopening mid-setup lands on Today, with "At risk · Back up your work" for a step not yet reached.
  - Counts disagree ("3 of 7" against "4 of 7").
  - The Steps list lags after the AI step.
  - "Open the setup guide" exists only on Settings › You.
- **Fix:**
  - Show the setup line while any step is skipped or to do.
  - Make "No AI account" a Needs-you line.
  - Resume at the step the person left.
  - Raise no At risk for a step not reached.
  - Use one count, phrased as "3 of 7 done".
  - Refresh the setup data after each save.
- **Sources:** S-P1-9, S-P1-10, S-P1-11, D-P2-1, S-P2-19, plus the Settings sweep's note "outside my area".
- **Shots:** setup/r3-04-today-all-skipped, setup/r3-05, setup/r3-08, setup/r1-19-mail-night, setup/r1-19-mail-day.

**X14. Done and the setup checklist claim false things.**
- **What happens:**
  - "Today shows one line to start the assistant… until you press Start", after Start was already pressed.
  - With everything skipped, the screen is still headed "Done" and says to "approve the first items".
  - "Skipped (needs mail)" shows for a step never skipped.
  - "Your promises — Done" shows after "Skipped (needs mail)".
  - "Hand in a first note ✓ Done" shows when only an Ask was typed or nothing was handed in.
- **Fix:** every line and tick is computed from the records (U16).
- **Sources:** S-P1-15, D-P1-15, B-F51, S-P2-12.
- **Shots:** setup/r1-50, setup/r3-02, daily/o-d-setup-guide.

**X15. Business and job editing in setup.**
- **What happens:**
  - Once anything is filed under a job or business, its Remove disappears without a reason, while the text still says it can be removed.
  - "Nothing under it yet" shows while a person is filed there.
  - "Tick the jobs that are in Retail" says "jobs" for projects.
  - Ticking a project deletes that line from the typed box and reorders the rest.
  - The first business's Remove sits between the two businesses.
- **Fix:**
  - Keep Remove and explain what happens to what's filed.
  - Say "projects".
  - Never rewrite the typed text.
  - Put each business under its own heading, with Remove beside its name.
- **Sources:** S-P1-12, S-P1-13, B-F41.
- **Shots:** setup/r2-02, setup/r2-03, setup/r2-04-*, setup/r2-16.

**X16. Time zone.**
- **What happens:**
  - Searching "Pacific" gives 64 alphabetical matches, with Los Angeles 30th, duplicates and legacy zones.
  - "Narnia" is silently reverted.
  - With Los Angeles chosen, Today's clash line said 7:37 AM while the Schedule said 2:37 PM. The header popovers disagree the same way, so some text uses the browser's clock.
- **Fix:** rank common cities first, drop aliases and duplicates, and format every time shown in the chosen zone.
- **Done when:** with the browser in UTC and the setting on Los Angeles, every screen shows the same time.
- **Sources:** S-P1-14, T-P1-1, T-P2-2.
- **Shots:** setup/r1-03-you-tz-pacific, setup/r1-53, settings/you-today-after, settings/hdr-penny-click.

**X17. The AI is marked untested after a harmless change.**
- **What happens:**
  - After adding and removing a backup AI account, Today says "Setup 6 of 7 · Next: Add an AI account and test it".
  - The popover says the connection hasn't been tested.
  - Test in Settings ("Answered ✓") doesn't clear either.
  - The setup AI step blocks Continue, though the account is listed.
- **Fix:** the tested state follows the account in use, and a successful Test clears it.
- **Sources:** T-P1-8.
- **Shots:** settings/ap-reloaded-today, settings/setup-ai-revisit.

### P1: Today and reviews

**X18. The side filter has no effect.**
- **What happens:**
  - Today and Schedule show the same lines under All, Personal, the job and the business: "9 things need you" on every tab. *(Checked.)*
  - A clash from a calendar marked business-only shows under Personal and the job.
  - The job's tab shows "these wait under Personal".
- **Fix:** a line with no project takes the sides of its source; a side's tab shows only that side's lines.
- **Done when:** guard 4's side test passes.
- **Sources:** B-F01.
- **Shots:** business/t02-today-tab-All, business/t02-today-tab-Personal, business/t03-northwind.

**X19. Reviews: rejected items stay, drafts aren't shown, and Undo leaves the list out of step.**
- **What happens:**
  - Not right: the box doesn't say which item it's about, and "Undo what it did first" (ticked) undoes the whole note.
  - After Send back, the rejected to-do stayed in the review and in To-dos 40+ minutes later.
  - "Draft new text for the week plan" asks for All looks good without showing the draft, and the line says "Your note".
  - Reviews list bare to-dos with no source email, side or owner, and say "this email" for three emails.
  - After Undo of a Move, the count says 4 while 3 lines show until a reload; an accept gives no feedback.
  - After Mark sent → Undo, the line comes back hidden behind "1 new line · Show".
- **Fix:**
  - Not right is per item, with that item named.
  - The rejected item leaves at once, and "redoing" shows until it's done.
  - A draft review shows the draft.
  - Each item shows its source.
  - The list redraws after every accept and Undo.
- **Sources:** B-F04, B-F06, B-F08, B-F09, D-P1-26, D-P2-25.
- **Shots:** business/t23-not-right, business/t24-sent-back, business/t26-lookover-draft, business/t22-inbox-lookover, business/t31-move-undone, daily/a-mark-sent-undo.

**X20. "Move them?" asks once per side, and only Today warns.**
- **What happens:**
  - With a job and a business, the same 2 items are listed twice, each with its own Move and Keep, and a business-only calendar's item is offered to the job.
  - Moving a project via Edit › Inside, or a to-do via "Move to…", gives no visibility warning.
- **Fix:** one question with a side picker that starts on the source's side, and the same warning on every way of moving something.
- **Sources:** B-F03, B-F14.
- **Shots:** business/t29-move-look, business/p18-project-moved, business/r10-todo-move.

**X21. Asked to identify the person's own mailbox name, once per email.** "Identify 'Avery Lane'" appears twice, and it's the address of the mailbox the person connected. Answering one leaves the other.
- **Fix:** the mailbox owner is "you". Ask once per name, with "This is me" first.
- **Sources:** D-P1-28, B-F05.
- **Shots:** daily/m5-pick, business/t01-today-first, business/t04-pick-open.

**X22. A question line repeats itself and is recorded as a note.**
- **What happens:**
  - The question text appears 3 times, with two Answer buttons.
  - Its source reads "From From: Priya Hart", and it also sits inside "Look over 3 things".
  - Answering shows in What changed as "Your note · … Filed 1 note", plus "Learning from a correction" rows.
- **Fix:** show the question once, strip "From:", and record it as "You answered".
- **Sources:** D-P1-8.
- **Shots:** daily/l2-line0-open, daily/a6-reword, daily/l2-line2-open.

**X23. The brief: counts, repeats, timing and the weekly message.**
- **What happens:**
  - The brief says "2 things need you" against the header's 9 (or 3), and "1 clash today · Show" points at the line beside it.
  - A clash marked "It's fine" comes back as "At risk today".
  - Close for today has no Undo and no way back.
  - "Morning brief" shows in the afternoon.
  - The weekly briefing asks a personal-only user "Who do you report to?", offering sister, neighbour or teacher.
  - With a job, it lists customers and suppliers, doesn't pre-pick the manager, and covers every side, so personal and business items could go into a message to an employer.
  - "Your promises this week" misses items that are due.
- **Fix:**
  - Brief counts match Today.
  - A settled clash stays settled.
  - Close for today has Undo, and a way to bring the brief back.
  - The brief is named by the time of day.
  - The weekly message is offered only with a job, picks the manager, and drafts from the job's side only.
- **Sources:** D-P1-27, D-P2-26, B-F10 (part), B-F11, B-F13, B-F16, B-F17.
- **Shots:** daily/a-brief-show, daily/s1-d-today, business/t13-week-briefing, business/t10-clash-fine, business/t18-close-for-today.

**X24. The clash line.** It can only be dismissed: the row doesn't open, and there's no way to see or move either entry. Its text is cut off, and "you need about 30 to get from Room 4 to Room 2" has no unit.
- **Fix:** the line opens both entries, with Move and Open; it says "30 minutes"; its title is short.
- **Sources:** B-F10, D-P1-29.
- **Shots:** business/t09-clash-clicked, business/v1-today-phone, daily/m-today-after.

**X25. Today's count rises from the person's own actions, and counts disagree.**
- **What happens:**
  - Reassigning a to-do raised the count from 2 to 3, and drafting the weekly message from 6 to 7.
  - Side-menu, tab and list counts differ: To-dos 4 against 5, and "To-dos (6)" / "6 shown" against All 5.
- **Fix:** a person's action never adds a Today line; all counts come from one query.
- **Sources:** B-F52, D-P2-27, B-F48.
- **Shots:** daily/td-d-list.

**X26. "Reginald is on it" while nothing runs.** "Handed in. Reginald is on it." and "Asked. Reginald is on it." show while Today waits for "Start the assistant: 2 items, about $0.02".
- **Fix:** say that it waits for Start on Today, with a link.
- **Sources:** D-P1-12.
- **Shots:** daily/h-d-after-handin-1, daily/o-d-search-enter.

**X27. The header search doesn't search, and the Ask pane squeezes Today.**
- **What happens:**
  - "Ask Reginald or search…" only fills an Ask question, which costs money to send. Typing "ladder" or "Priya" finds nothing.
  - At 1440, the open Ask pane cuts Today's lines to "Send 2 to-dos to Sa…" while a 140px column stays empty.
  - The "Keep track of something of your own" link has no context.
- **Fix:**
  - Local results appear as the person types, with "Ask Reginald about …" last.
  - The pane takes space from the empty column first.
  - The link gets a sentence of context.
- **Sources:** D-P1-2, D-P1-24, B-F25, D-P2-20.
- **Shots:** daily/se-ladder, daily/se-priya, business/r04-search.

**X28. Came in rows don't open.** The only action is "Set aside: sales", even on mail from a friend.
- **Fix:** a row opens the message's page, and its menu has Treat as… and Set aside.
- **Sources:** B-F24.
- **Shots:** business/t06-menu-open.

### P1: What changed, Handled for you, Follow-ups

**X29. What changed is flooded, and shows wrong states.**
- **What happens:**
  - 40+ rows in one afternoon, many "Your note · Changed on screen", and four identical "Learning from a correction · Reginald is on it".
  - Undone actions still say "Done".
  - "Undo everything it did" is offered on "Added the business", with no confirmation.
  - "Learning from this correction… at 3:00 pm" appears on plain moves.
- **Fix:**
  - The person's own edits fold into one row per record per day.
  - Learning rows are one per correction.
  - Undone rows say "Undone".
  - Confirm any Undo that removes a side or many records.
  - Learning shows only on a real correction.
- **Sources:** B-F18, B-F19, B-F22, B-F45.
- **Shots:** business/r06-pasted-detail, business/hi04-changed-after-handin.

**X30. Handled for you contradicts itself.**
- **What happens:**
  - "2 of 2 closed without you seeing them" is followed by "Everything that was closed, you made or saw."
  - A social update is grouped under "Sales and promotions".
  - The menu has only "Always set aside", with no "Open the message" or "Treat as…".
  - Senders show as `Name <address>`.
  - The Bring it in toast says "Apply to this sender / this email domain".
  - When empty, the search is autofocused with no line saying it fills once mail is connected.
- **Fix:** one honest sentence; social mail in its own group; every row gets Open the message and Treat as…; senders by name; the toast in plain words; a short empty state.
- **Sources:** D-P1-19, B-F23, D-P2-8, B-F35, D-P2-7.
- **Shots:** daily/hd-read, daily/hd-group, business/h05-read-nothing, business/h11-brought-in.

**X31. Follow-ups lists the person's own to-dos, and its empty state is wrong.**
- **What happens:**
  - "You · 4 to-dos of yours" sits under To send, and is selected by default, so the pane opens nearly empty.
  - The empty state names the wrong things that will appear, over a "How your messages start and end" disclosure.
  - Mark sent shows three times, and only in the menu when copying is blocked.
  - Message style asks the person to type `{first_name}`.
- **Fix:** no "You" group; an empty state saying what a follow-up is; one Mark sent; message style with name chips instead of placeholders.
- **Sources:** D-P1-20, D-P2-9, B-F36, B-F26.
- **Shots:** daily/fu1-main, daily/e-d-work_followups, business/f03-copied, business/f07-message-style, business/f10-copy-no-permission.

**X32. Outgoing messages use office wording and raw dates.**
- **What happens:** to a neighbour, "Action items with you: - Lend us the trailer on 2026-11-07. (due Sat, Nov 07)"; to Priya, "(due Tue, Nov 03)".
- **Fix:** dates as on screen, with no zero padding; a personal opener for personal relations ("Hi Sam, just a reminder about…"); "To-do", never "Action items".
- **Done when:** guard 4 covers outward message text.
- **Sources:** D-P1-9.
- **Shots:** daily/a7-sam-review, daily/a-copy-message.

### P1: To-dos and record pages

**X33. The to-do page and to-do editing.**
- **What happens:**
  - The page is headed "Action", with Evidence, Wording, Told and Owners fields, and schema help text in Draft ("The work the action stands for … It is long text…").
  - It shows "Who owes it" and "Who does it", "Due" and "Due date", and has no Mark done.
  - To-do titles don't open the page.
  - The list says "Send the headcount." while the edit box says "…by 2026-11-04.".
  - The menu has both Edit… and Change this.
  - Edit… has no project, side or owner fields.
  - Inline editors stack on one row, with three Saves, and Escape doesn't close them.
  - Pause on a repeating chore asks "What is it waiting for?".
  - Every typed to-do has "Where it came from · Your note · Added a to-do".
- **Fix:**
  - Call it a "To-do", with Mark done at the top.
  - Show each fact once, in words; hide the internal fields.
  - Titles open the page.
  - One title everywhere.
  - One Edit with every field.
  - One editor at a time, closed by Escape.
  - No "Where it came from" on typed to-dos.
- **Sources:** D-P1-7, D-P1-11, D-P2-10, B-F15, B-F27, B-F28.
- **Shots:** daily/r-todo, daily/td-m-changethis, daily/td-menu, business/r08-todo-page, business/o06-edit.

**X34. A long to-do fails with no reason.** At 477 characters, Add stays enabled, the server refuses it, and the toast says "That didn't work. Try again", and Try again fails the same way.
- **Fix:** a character counter and a limit on the field, with the message beside it.
- **Sources:** D-P1-10.
- **Shots:** daily/td-d-long-fail.

**X35. Reassigning makes the other person "promise" it and queues a send.** Reassign saves as soon as a name is chosen, with no Save button. Then "Sam Okoro promised you: Buy a birthday card for Mum", and a send is queued.
- **Fix:** reassigning a to-do makes it theirs to do, not a promise made to you. Nothing is queued to send without the person's choice.
- **Sources:** D-P1-21.
- **Shots:** daily/talk-sent, daily/td-reassign.

**X36. Hand-added to-dos are missing from the Personal page.** "Open with Personal 6" lists only Reginald's to-dos, while To-dos shows 11.
- **Fix:** with one side, a typed to-do belongs to it; with several, the form asks.
- **Sources:** D-P1-6.
- **Shots:** daily/r1-d-records_project_PRJ-1.

**X37. Record pages show internal field names and raw values.**
- **What happens:**
  - Fact: "Basis Said / Trust From outside / As of / Wording", and "0 items are open here".
  - Project: "Aliases", "Budget usd 400", "Parent", where the form says Other names, Budget (US dollars) and Inside.
  - The person's own schedule entry shows Evidence, Trust and developer help text.
  - A source dialog shows "2026-10-28T15:07:36Z".
  - Calendar text reads "Budget check-in Budget check-in When: …15:07".
- **Fix:** one set of plain labels shared by forms and pages, and values in words.
- **Sources:** D-P2-11, B-F29, B-F20 (part), B-F21.
- **Shots:** daily/r-fact, business/r01-fact-page, business/p14-project-page, business/sc08-own-entry-page, business/r03-fact-source.

**X38. Internal ids, JSON, raw dates and file names on screen.** *(Cross-cutting; checked in several places.)*
- **What happens:**
  - `Reginald noted [ "kind": "action", "id": "ACT-6", "gone": true … ]`
  - `The person changed action ACT-2 … now 2026-11-02. (none)` and `(empty input)`
  - "Made: WEEK-1, an unreviewed draft"
  - "Told · PER 3: Wed, Oct 28"
  - "You changed told on…"
  - raw JSON in the weekly message draft
  - "Changed in steward.yaml"
  - "Due: … by 2026-11-02" in Month view
  - screen-reader labels with ISO dates
  - The automatic checks found raw ISO dates on 23 screens, code words on 29 and JSON on 4.
- **Fix:**
  - One formatter for every record reference: title, never id.
  - One for dates: words.
  - Plain sentences for undo and change history.
  - AI output checked for plain text before it's shown ("Couldn't draft this" otherwise).
  - No file names.
- **Done when:** guard 4's internals check is clean on every screen and message.
- **Sources:** D-P1-1, B-F02, B-F07, B-F21, T-P1-25, D-P1-7 (dates), D-P1-18 (dates), plus `appendix/auto-checks.md`.
- **Shots:** daily/r1-d-records_project_PRJ-1, daily/r-fact-source, business/v2-work_changed-day, business/r10-todo-move, business/t17-draft-message, business/sc02-view-Month, settings/adv-all-open.

**X39. Notes can't be found.** There's no list of notes (Knowledge shows only "Your words") and no link to them from What changed.
- **Fix:** a Notes list (on the side's page, or in Files and notes), and every "Filed 1 note" links to it.
- **Sources:** B-F43.

### P1: People, organizations, projects, business

**X40. People can't be given contact details or sides, and get work questions.**
- **What happens:**
  - Add a person and Edit details have no email, phone, side or relation. So Jun Park is on every side, and "How to reach" stays empty.
  - The person page asks a sister or a customer "I manage them / I work alongside them / I report to them / I only watch them", under the same label as "my sister".
  - The one field has three names: "Who they are", "Who they are to you" and "Relation". "Other names" becomes "Aliases".
  - Pages show both "Side: Business" and "Sides: Calloway Upholstery".
  - Other details:
    - "Name verified" shows on everyone.
    - "Organization (if they're outside your team)" doesn't fit a customer.
    - The Organizations people count is blank for one business.
    - The email shows twice.
    - The same to-do appears under "promised you" and "Open with".
    - "Mark as left" is offered for a friend.
  - A duplicate name gives no warning, and its error toast sits behind the drawer.
- **Fix:**
  - The person form has sides, a relation for each side, and repeatable email and phone fields.
  - The work stance appears only for job people.
  - One name per field.
  - A duplicate is warned while typing.
- **Sources:** D-P1-4, D-P1-5, B-F30, B-F49, B-F50 (part), D-P2-13, D-P2-14.
- **Shots:** daily/p-d-person-full, daily/p-d-add-person, daily/p-d-person-edit, business/pp04-add-person, business/pp02-maya-edit, business/pp-Hattie.

**X41. The business has two pages.** Its project page and its organization page each have their own conversation and activity, and they disagree ("0 items open" against 1). The link is labelled "Your business".
- **Fix:** one page for the business, with the organization's details as a section of it.
- **Sources:** B-F31.
- **Shots:** business/p06-business-org.

**X42. No "Add a business" or "Add a job" in Settings, and removal is limited.**
- **What happens:**
  - Settings › Your business has only Rename and Remove. Adding means Open the setup guide (from You only) → What it's for → Add another business → Continue, which lands on the AI step.
  - The setup text "add later from the setup list on Today" is false.
  - Removal offers only "Move them to Personal", and leaves an orphan organization.
- **Fix:**
  - "Add a business" and "Add a job" on that page, as a short form.
  - Removal offers Move, or End with Undo, and removes or keeps the organization by choice.
  - Fix the setup sentence.
- **Sources:** B-F12, T-P1-18.
- **Shots:** business/v5-settings_business-day, business/bz04-after-continue, business/bz10-remove-question, settings/bz-renamed, settings/setup-guide-whatfor.

**X43. The Projects screen and project form.**
- **What happens:**
  - For a personal-only user, "File them" leads to a bare 9-column table ("Personal · 0", "0 projects") that isn't in the menu.
  - Side names open a page while project names open a pane.
  - There's no "Add a project" on the business page, and the project page doesn't show its side.
  - "Budget" is the AI spending cap but reads as the job's own budget ("$0.00 of $400.00 spent").
  - The Add a project form mixes the setup group (under "Inside") with a separate "Group" list. It shows language codes ("en-AU…"), "workspace" and "ticket prefix", and "Phase" in the form is "Stage" in the table.
  - Columns are cut ("Last up…", "Robin C…") at 1440 despite free space, and side headers are squeezed at 390.
  - Removing a group fails with "That didn't work. Still used by 3 record(s) (project), so it can't be removed.".
- **Fix:**
  - With one side, filing is automatic and Projects stays hidden.
  - Projects open the same way everywhere.
  - Rename Budget to "AI spending limit".
  - One grouping idea.
  - Plain fields.
  - Columns sized to their content.
  - Removing a group offers to move or remove what's in it.
- **Sources:** D-P1-16, B-F32, B-F33, B-F34, B-F37, B-F38.
- **Shots:** daily/m5-file, daily/e-d-records_projects, business/p08-add-project, business/p18-project-moved, business/v3-records_projects-phone, business/p19-remove-group-confirm.

**X44. Work words on a personal-only workspace.**
- **What happens:**
  - "Keep track of something of your own" offers only the Client work and Content calendar templates.
  - Knowledge says "Words that mean something particular where you work".
  - Look-over lines say "4 actions".
  - Details say "Filed a note in Personal, not in a project".
  - The chip "…: not in a project" sits on every row.
- **Fix:** guard 4's personal-only word check; templates and wording that fit a personal life; drop the "not in a project" chip.
- **Sources:** D-P1-30, D-P1-29 (part), B-F47.
- **Shots:** daily/ask-keeptrack, daily/e-d-records_knowledge, daily/f-p-today.

### P1: Schedule, Files, Knowledge

**X45. The Schedule.**
- **What happens:**
  - Hour labels are clipped (":00 AM" with the first digit missing) in day, night and phone. *(Checked.)*
  - A 10:00 entry is about 25px tall, with its title hidden.
  - Entries can't be moved or cancelled: a calendar entry's page says "nothing here can be changed", and the person's own entry has only "Change this".
  - "Add a meeting" (opened from "Add to schedule") has only What, Day and Time: no end, place, side or repeat.
  - Typed entries say "From your notes".
  - The all-day cell shows "Due: … by 2026-10-30.".
  - Schedule is in no menu, and Today stays highlighted while it's open.
  - The empty grid has no hint.
  - The entry panel squeezes the week and cuts titles.
  - Today's empty Schedule card wraps "Connect a calendar" mid-sentence.
- **Fix:**
  - Hour labels fit.
  - Entries keep a minimum height, with the title on hover.
  - Move, Change and Cancel on the person's own entries (and calendar entries through the add-on).
  - A full Add form.
  - Schedule in the menu.
  - An empty hint.
  - The panel overlays rather than squeezes.
- **Sources:** D-P1-17, D-P1-18, B-F20, B-F44, D-P2-2, D-P2-4, D-P2-5, D-P2-6.
- **Shots:** daily/e-d-schedule, daily/e-p-schedule, daily/sc-entry-open, daily/sc-after-add, daily/t-d-sched-add, business/sc04-event-page, business/sc08-own-entry-page, business/t41-schedule-entry-move.

**X46. Files.**
- **What happens:**
  - Add a file lists MIME types ("application/vnd.openxmlformats…", "audio/mp4") and fonts.
  - "What it's for" is a select with one choice.
  - The description typed on upload is never shown.
  - A file can't be renamed, edited or removed.
- **Fix:** "Any document, picture or sound file" with a size note; drop the one-choice select; show the description; give a file Rename, Edit and Remove with Undo.
- **Sources:** D-P1-13, D-P1-14, B-F42.
- **Shots:** daily/f-add, daily/f-after-add.

**X47. Small changes need a restart, and the warning is alarming.**
- **What happens:**
  - Adding a "never ask" word in Knowledge, changing spelling, the synced folder or side words all stop Reginald until a restart, with no warning first ("⚠ Reginald · waiting for a restart"), though Settings promises to ask first.
  - Restart now shows "Disconnected · reconnecting" with no "done" message.
- **Fix:** take these changes in without a restart. Where one can't be avoided, ask first, then confirm "Back and running".
- **Sources:** D-P1-22, T-P2-4, D-P2-21.
- **Shots:** daily/rs-status, daily/rs-reginald, daily/rs-restart-0.

### P1: Settings and admin screens

**X48. Appearance changes need a reload, and the theme is set in two places.**
- **What happens:**
  - "Saved. Light or dark: dark" shows, but the page stays light until reloaded. Compact and the accent colour behave the same.
  - The user-menu theme overrides Settings, so Settings says Dark while the screen is light.
  - "Spacing" and "Comfortable or compact" name one thing.
- **Fix:** apply at once; one theme setting per device with one name; Settings shows what's in effect.
- **Sources:** T-P1-2, T-P2-7, T-P2-6 (part).
- **Shots:** settings/ap-dark, settings/ap-reloaded-today.

**X49. Validation and save messages show raw values.**
- **What happens:**
  - "“Ask me before the assistant starts something estimated…” isn't allowed: Input should be greater than or equal to 0" (it quotes the hint, not the label, and keeps "$-3.00").
  - "String should match pattern '^#[0-9a-fA-F]{6}$'".
  - "Input should be less than or equal to 365".
  - Refused values stay in the fields.
  - Toasts show "America/Los_Angeles", "en-GB", "saturday", "back to the default, ai", and "1.5" while the field shows $1.50.
- **Fix:** messages say what's allowed, in words, beside the field, naming the label; refused values are put back; toasts use the field's own display format.
- **Sources:** T-P1-3, T-P1-4.
- **Shots:** settings/ap-accent-red, settings/not-wh-backwards, settings/adv-chase, settings/you-after-changes, settings/not-wh-odd.

**X50. Reminder destinations dead-end.** "To my mail" says "Turn on Let the assistant act after your yes for one first". The radio stays selected though nothing was saved, and the switch on You is greyed out ("…has no extra access to ask for").
- **Fix:** disable unavailable choices, with their reason and a link that works; the radio shows only what's saved.
- **Sources:** T-P1-5.
- **Shots:** settings/not-radio-Tomymail, settings/b-d-you.

**X51. Compare › Measure.**
- **What happens:**
  - The price shows only after a click, as red error text ("Testing needs your confirmation first: it would cost about $13.85…"), with no mention of the $2 daily limit.
  - After "Test anyway" the page still says "Nothing measured yet".
  - Results use jargon ("Using a term 33%", "Not asking twice 0%").
- **Fix:** the cost on the button with a note about the daily limit, a progress line, and results in plain words.
- **Sources:** T-P1-9.
- **Shots:** settings/cmp-measured, settings/cmp-test-anyway.

**X52. Add-ons: one add-on with three names, and no Remove.**
- **What happens:**
  - The add-on is "Example mail" in the catalog, "journey-mail" (with "…for the journey tests") in Installed, and "Journey mail" in the Settings menu.
  - It asks for a "Client id" while already signed in, and offers "Use your own app registration".
  - Only Turn off and Turn on exist.
  - Turned-off rows say "Not available" and "Read every 15 minutes", and Today doesn't say mail reading is off.
  - Catalog jargon: "set by an environment variable", "127.0.0.1", and a .yaml address.
- **Fix:** one display name from the add-on's own data; ask for keys only when needed; Remove with a backup first; a Today line while reading is off; the catalog by name.
- **Sources:** T-P1-11, T-P1-12, T-P2-16, T-P2-17.
- **Shots:** settings/ad-installed, settings/cn-add-open, settings/ad-off-restarted.

**X53. Sign out has no confirm, and stale states follow.**
- **What happens:**
  - One click signs out, with no confirm or Undo.
  - Sources still say "Read every 15 minutes", and the header still says "Connected".
  - After signing in again, the card shows "Not signed in" until a reload.
  - "Add another account" opens a window that closes itself, with no message.
- **Fix:** confirm with what stops; update every state at once; say what happened when the window closes.
- **Sources:** T-P1-15.
- **Shots:** settings/cn-signed-out.

**X54. Quick links aren't where the page says.**
- **What happens:**
  - The hint says "shown as buttons in the header", but they're in the initials menu.
  - The name is cut at 40 characters with no warning.
  - "example.org/bank" is refused rather than getting https:// added.
  - Bad input shows the browser's own "Please enter a URL."
- **Fix:** a hint that matches where they appear, a visible length limit, https:// added automatically, and the app's own messages.
- **Sources:** T-P1-17.
- **Shots:** settings/ql-two, settings/ql-bad, settings/hd-d-usermenu.

**X55. Settings search misses the words beginners use.** "password", "email", "money", "delete" and "sign out" find nothing; it searches rows only, not sections, accounts or the backup key.
- **Fix:** search sections, accounts and keys too, with a synonym list kept as shipped data.
- **Sources:** T-P1-19.
- **Shots:** settings/search-password.

**X56. The logo and accent colour need expert input.** The logo is "a file in the app's configuration folder, by name", with no upload, and a missing file is accepted. The accent is "#rrggbb", with no picker and a "WCAG AA" message.
- **Fix:** upload a logo; a colour picker with a contrast warning in plain words.
- **Sources:** T-P1-20.
- **Shots:** settings/ap-logo.

**X57. Phone layout in Settings.** On You, the act-on account is squeezed into a one-word-wide column. On Connections, "Signed in as…" overlaps "Sign out". About 400px of description, search and chips come before any content.
- **Fix:** stack these rows on a phone, and collapse the header into a section picker.
- **Sources:** T-P1-21, T-P2-26.
- **Shots:** settings/b-p-you, settings/b-p-connections.

**X58. The backup key and synced folder accept bad input.**
- **What happens:**
  - A backup key of "abc" is accepted.
  - Nonsense, or a folder inside the app's own data, is saved as the synced folder despite the hint.
  - The second Synced folder block contradicts the first.
  - After "Make one for me", Make and Save stay on the page.
  - "Backups made before keep the key…" shows with no earlier key.
  - "Where it is kept instead" is unexplained.
  - The folder chooser says "There are no folders here" with "Use this folder" enabled, no path and no New folder.
- **Fix:** a minimum key strength; a checked folder; one synced-folder block; key wording from the actual state; a chooser with a path and New folder.
- **Sources:** T-P1-23, T-P1-24, T-P2-10, T-P2-11, S-P2-14.
- **Shots:** settings/bk-short-key, settings/bk-sync-nonsense, settings/bk-sync-inside.

**X59. "How Reginald is doing" points to a setting that doesn't exist, and is mostly empty.**
- **What happens:**
  - "Allow the independent reading in Settings first", but no setting by that name exists.
  - About 16 to 18 sections say "Nothing… in this window", with five rows of zeros.
  - A garbled heading reads "Missed out of present, all together".
  - It opens with "6 of 6 closes weren't seen by you." and no next step.
  - The date field is autofocused.
- **Fix:** a real link to the setting; hide empty sections, with one line saying what fills them; fix the heading; give each number a next step.
- **Sources:** T-P1-22, D-P2-16.
- **Shots:** settings/adm-d-quality, daily/e-d-quality.

**X60. A skipped install dead-ends.**
- **What happens:**
  - "Ask how to add one" on the empty Connections page answers "Needs you · Say who you are first", and there's no AI account anyway.
  - The "⚠ Reginald" pill means nothing until clicked, and its popover reads " no AI account yet" (lowercase, leading space).
  - A green "Connected" shows before any mail is connected.
- **Fix:** with no AI, offer the setup step instead of Ask; the pill says "No AI account"; the header says "Not connected" until something is.
- **Sources:** T-P1-26, T-P2-28, D-P2-3, S-P2-18.
- **Shots:** settings/skip-skip-ask-how, settings/skip-skip-ask-pressed, daily/o-d-status, setup/r3-05.

**X61. Feedback and help.** Feedback's subject is "Feedback on PM Cockpit", an internal name. Its preview has raw "2026-10-28 08:13 -07:00" and "Error: no_access", and the message box starts with blank lines. There are two feedback routes, and the Help menu has no actual help.
- **Fix:** use the product's display name; one feedback route with a plain preview; a Help entry with the guide's first steps.
- **Sources:** D-P1-25, T-P2-23.
- **Shots:** daily/o-d-feedback, settings/hd-write-feedback.

**X62. The user menu and the phone tabs.**
- **What happens:**
  - The initials button is named "Change appearance".
  - Its menu leads with "How Reginald is doing" and a tick that looks like a selected option, and has no Settings or name.
  - On a phone, the tab "Your day" sits beside Today, which reads as the same thing; the guide calls it "Work".
- **Fix:** name the button after the person; its menu holds their name, Settings, appearance, links and quality; one name for each tab.
- **Sources:** D-P2-23, D-P2-24.
- **Shots:** daily/o-d-user-menu, daily/ph-Yourday.

**X63. Pages with no way back, and silent fallbacks.**
- **What happens:**
  - #styleguide is blank, with no way back.
  - #handover is just "Which copy to keep / Both copies match.", with no explanation or back link.
  - #settings/files (and, on a skipped install, business and lists) silently show the You page.
- **Fix:** a page that isn't available says so and links back; Handover explains itself in one line.
- **Sources:** T-P2-24, T-P2-25, D-P2-17, T-P2-1.
- **Shots:** settings/adm-d-styleguide, daily/e-d-handover.

**X64. Toasts stack and get in the way.** Three or four stack high, cover the bottom rows, follow the person to other pages, and some sit behind drawers. A rename toast from Done follows the person onto Today.
- **Fix:** at most one toast at a time (newest replaces), cleared on navigation unless it carries Undo, and always above drawers.
- **Sources:** T-P2-8, D-P2-14 (part), S-P2-17.

**X65. "Since yesterday" and the "changed" line.** Today's "Look over what changed since yesterday" sits under At risk, opens a third page, and repeats the Review lines. "Since yesterday" says "Nothing changed since yesterday" after one visit, has an empty left gutter, and says "You haven't seen this close".
- **Fix:** drop the Today line when Review lines cover the same items, or fold it into them; fix the wording.
- **Sources:** D-P2-29, B-F39, plus the validate-82d24cc note H1.

### P2 groups

Each group is one TRACKING row. Every line in it is ticked off, or moved to the backlog with the owner's OK.

**Y01. Setup polish.**
- **Sources:** S-P2-1 to 11, 13, 16, 19; D-P2-1.
- **What's in it:**
  - Welcome's wording.
  - Footer alignment.
  - A 70px phone gap.
  - Rename buttons floating away from their field.
  - One-word "full names" accepted.
  - What it's for repeating "own life".
  - The AI step's run-together text and "0.1".
  - The AI revisit view.
  - The mail step's repeats and plain-looking buttons.
  - Two primary buttons on Promises.
  - Hand something in leaving setup.
  - "Done" nine times, and "AI" initials after renaming the workspace.

**Y02. Setup People polish.**
- **Sources:** S-P2-15, B-F41.
- **What's in it:**
  - Suggestion boxes labelled "Personal".
  - "Side" as a word.
  - The relation staying filled after Add.
  - "manager" preselected.
  - No "Someone else" on added people.
  - No relation box for business people.
  - A heading over nothing.
  - "No one to suggest yet" after all were added.

**Y03. Settings polish.**
- **Sources:** T-P2-3, 5, 9, 12, 13, 14, 18–22, 27; B-F50, B-F53.
- **What's in it:**
  - A 120-character assistant name scrolling the page 1796px sideways (needs a limit).
  - Night-shift working hours refused.
  - Money edge cases: "1,50", $1,000,000, and a day limit above the month limit.
  - Lists:
    - silent duplicates
    - "retire" vs "Stop offering"
    - the focus
    - "Used for:" repeating the heading
    - Under way vs Underway
    - unexplained Good/Caution chips
    - an autofocused box
  - The remove-business alignment.
  - Advanced wording.
  - Radios 6px off their labels.
  - "set under Details" with no Details.
  - Empty Connections layout.
  - "High" with "Caution".
  - "Journey mail" in the menu.

**Y04. Empty states and small screens.**
- **Sources:** D-P2-12, D-P2-15, D-P2-18, D-P2-28, T-P2-1.
- **What's in it:**
  - Stages with no explanation of what a stage is.
  - Knowledge's heading over nothing.
  - Settings › You autofocusing on a phone.
  - "Not looked at before Wed, Oct 14" in the header.

**Y05. People page polish.**
- **Sources:** D-P2-13, B-F49, B-F50.
- **What's in it:**
  - The phone card "…" on its own line.
  - "My own page" listing only the job as my organization.

**Y06. Restart and status wording.**
- **Sources:** T-P2-4, D-P2-21, S-P2-18.
- **What's in it:** the alarming restart pill, the missing "done" message, and the " no AI account yet" text.

## 5. Causes that cut across many items

Fixing these at the root clears many master items at once. Each needs a guard (exit criterion 4) so it doesn't come back.

1. **One save path that never drops a change.** Covers X01, and probably the setup side boxes' "That didn't work" (validate-82d24cc H7).
2. **One formatter for everything a person reads:** record references by title, dates and times in words in the person's own time zone, money in their format, and validation in plain words. Covers X16, X32, X37, X38 and X49, and most of the automatic-check hits.
3. **A side model on every record and source:** people, connections, typed to-dos, lines without a project, and the filter. Covers X18, X20, X36, X40 and X44.
4. **Personal-only means no work concepts:** the stance question, "report to", templates, "actions", "project" and Projects. Covers X23 (weekly), X40, X43 and X44.
5. **Today's state machine:** an item has one state and one line, nothing a person does adds lines, and Undo redraws. Covers X06, X19, X22, X25 and X29.
6. **Forms test before saving and show their own errors:** connections, folders, keys, links, the AI service and long text. Covers X05, X08, X09, X34, X54 and X58.
7. **Setup state comes from records:** ticks, counts, Done text, resuming and leaving. Covers X02, X07, X13, X14 and X17.

## 6. Earlier-round items that came back or were never closed

- **Raw ISO dates in titles and text** (F19 → G10 → H4): still on 23 screens.
- **The clash line's missing unit:** the earlier G15 fix produced "you need about 30 to get…".
- **False setup ticks** (F5 → G8): partly back (X14).
- **The model's name on screen** (R-b in the B-9 round): back on the Claude Code option.
- **"Since yesterday" as a third place** (H1): still there (X65).
- **The mail side boxes losing a tick** (H7): now reproduced reliably (X01).

## 7. What to build first

1. **X01–X06,** the P0s.
2. **Causes 1, 2 and 5:** the save path, the one formatter, and Today's state machine. These clear the most P1s.
3. **Cause 3 (sides) and cause 4 (personal-only).**
4. **The setup P1s:** X07–X17.
5. **The remaining P1s, by area:** Today, then records, then Settings.
6. **The P2 groups.**
7. **The exit criteria's guards and journeys.** They are part of the work, not an afterthought.

Then send the reviewer the hand-over (exit criterion 7) for the re-sweep.

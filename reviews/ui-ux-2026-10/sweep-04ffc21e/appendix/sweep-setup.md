# Sweep 1: setup ("Getting started"), every step and option

**Code:** commit `04ffc21e`.

**Screenshots:** sweep/setup/out (`r1-*`, `r2-*`, `r3-*`).

**Counts:** P0 3 · P1 16 · P2 19.

**Runs:**
1. Personal only, everything filled in, with every AI option, nonsense in every mail form, bad backup paths and junk in People.
2. Personal plus a job plus two businesses (one removed later), with a group, and mail with sides.
3. "I'll do this later" on every step, then Today, then finding the way back.

**Not verified:**
- Anthropic and OpenAI wrong-key wording: the container couldn't reach those services, so every key read "There is no internet connection".
- The sign-in popup's own screenshot.
- Mislabelled shots: `r1-19-mail-night` and `r1-19-mail-phone` show Today; `r3-04-today-all-skipped-night` and `r3-04-today-all-skipped-phone` show setup's Done.

## Coverage

D = 1440 day, N = 1440 night, P = 390 phone.

| Screen / state | Seen in | Result | Shots |
|---|---|---|---|
| Welcome | D N P | pass, P2 | r1-01-* |
| You: empty, Continue disabled with a reason | D N P | pass | r1-02-* |
| You: phone Steps list | P | P2 | r1-02-you-phone-steps-open |
| You: rename the assistant, blank, cancel | D | P2 | r1-03-you-rename-* |
| You: time zone "Pacific", nonsense | D | P1 | r1-03-you-tz-* |
| You: filled, revisited | D | P2 | r1-04, r1-59 |
| What it's for: nothing ticked | D N P | P2 | r1-05-* |
| What it's for: job only, both, blank or long name, pasted list | D | P1/P2 | r1-06-*, r2-03 |
| Group disclosure and "in Retail" ticks | D | P1 | r2-01, r2-02 |
| Add another business, Remove with Undo | D | P2 | r2-03, r2-05 |
| Saved view after Back: Rename, Remove | D N P | P1 | r2-04-*, r2-06, r2-16 |
| Reload with an unsaved form | D | P1 | r1-16 |
| AI: top choices | D N P | P2 | r1-07-* |
| AI: Anthropic and OpenAI, wrong key | D | not verifiable | r1-08-*, r1-09-* |
| AI: Something else → each item in the Another service list | D P | P1 | r1-11-*, r3-13 |
| AI: generic service with nonsense, dead and working address | D | P1 | r1-14-* |
| AI: An app you're signed in to (all 4) | D P | P1 | r1-12-*, r3-12 |
| AI: One on this computer (all 3) | D | P1 | r1-13-* |
| AI: spend → Change | D | P2 | r1-15 |
| AI: Allow / Not my private mail / Advanced | D | P1 | r1-17, r1-18-* |
| AI: revisited with an account set | D P | P2 | r1-58 |
| Mail: first view, What it can access | D N P | P2 | r1-19-day, r1-21, r1-28-* |
| Mail: app password for Gmail, Yahoo, iCloud, Fastmail, Another mailbox | D | P1 | r1-22-* |
| Mail: Another mail or calendar, all 5 kinds with nonsense | D | P0/P1 | r1-23-*, r1-24 |
| Mail: Connect (install, restart, sign in, signed in) | D N P | P2 | r1-25, r1-26, r1-28-* |
| Mail: set-aside Change, Connect another | D | P2 | r1-29, r1-30 |
| Mail: sides, quick ticks, Set them separately, reload | D N P | P0 | r2-07…r2-10 |
| Mail: skipped | D | pass | r3-01 |
| Promises: before Start, running, result | D N P | P1 | r1-31…33, r2-11-* |
| Promises: Missed something?, Hand something in, Choose the Sent folder | D | P1/P2 | r1-34…37 |
| Promises: with no AI; with AI but no mail | D | P2 | r3-03, r3-10 |
| Backups: chooser, Go up, bad path, own folder, good path, revisit | D N P | P2 | r1-38…41, r1-56 |
| People: suggestions, Add these, typed person, Someone else, one-word name | D N P | P1 | r1-42…46 |
| People: Paste a list with junk | D | P0 | r1-47…49 |
| People with sides; no suggestions; skipped | D N P | P2 | r2-13-*, r2-14, r3-11 |
| Done: all done; all skipped; Set up; Rename; Go to Today | D N P | P1/P2 | r1-50…53, r2-15-*, r3-02-* |
| Finish later, close and reopen, reload | D | P0/P1 | r1-60, r3-09, r1-19-night |
| Today's "Continue setup" line | D | P1 | r1-19-night, r3-08, r2-18 |
| Settings → You → Open the setup guide; Back to setup; jumping via Steps | D P | pass, P2 | r1-54…59, r1-35 |
| Top-bar "⚠ Reginald" with no AI | D | P2 | r3-05 |

## P0

**S-P0-1. Mail sides race: the saved answer differs from the screen.**
- **Where:** run 2 → Mail and calendar after Example mail is connected → the "Who are they for?" boxes, and after "Set them separately" ("Your inbox: who is it for?").
- **Steps:**
  1. Untick all three slowly; that saves correctly.
  2. Click quickly: Personal on, The Salt Orchard on, Harbor and Pine Consulting on, Harbor and Pine Consulting off.
  3. The screen shows Personal and The Salt Orchard, still 3 seconds later.
- **Result:** after a reload, all three are saved as ticked. Reproduced twice.
- **Why it matters:** work mail is silently filed under the job the person unticked.
- **Fix:** send one change at a time (or debounce and send the final set), and redraw from the server's answer.
- **Shots:** r2-08-mail-sides-quick, r2-09-mail-sides-separately.
- **Reviewer's note:** in my own test at 82d24cc7 I saw "That didn't work." once, right after sign-in, but couldn't reproduce it at gaps of 100–700ms. This sweep reproduced it twice with a four-click sequence.

**S-P0-2. Paste a list saves junk as people, and setup has no Remove.**
- **Where:** People → "Paste a list".
- **Seen:** "Added 8 people." The names saved include "12345", "!!!", "http://example.com", "Ines Duarte, my sister", "Jun Park - our neighbor" and "Sam Rivera; my accountant" (a second Sam Rivera next to the one added before). Each gets "How 12345 relates to you". No row has Remove; the one-word "Jun" can't be taken out either.
- **Fix:**
  - Skip lines with no letters, and addresses.
  - Read "Name, relation", "Name - relation" and "Name; relation" as a name plus a relation.
  - Show a preview before adding, and merge duplicates.
  - Add Remove with Undo to each row.
- **Shots:** r1-48-people-paste-filled, r1-49-people-paste-after (I checked it on screen), r1-46-people-oneword.

**S-P0-3. Finish later and Go to Today don't stick while a step is missing.**
- **Where:** run 3 (everything skipped); any install where the name or the AI account is missing.
- **Seen (`/api/setup`):**
  1. "Go to Today" saved `finished: true`; a reload reopened the walkthrough on Done and set `finished: false`.
  2. "Finish later" saved `closed: true`, then went back to `false` after a reload.
  3. Opening `#today` directly bounced into setup.
  4. It still happened with the AI set, because the name was skipped.
- **Why it matters:** the person can never stay on Today.
- **Fix:** respect `closed`/`finished` on load, and show a Today line instead of reopening setup.
- **Shots:** r3-04-today-all-skipped-night, r3-04-today-all-skipped-phone, r3-09-today-reopen (I checked it: opening Today shows Getting started).

## P1

**S-P1-1. Promises says "nothing you promised" when it found one.**
- **Seen:** "No open promises found… 7 messages read, 2 meetings this week, nothing you promised." Yet Today's "Look over what was found in Your sent mail" holds the person's own promise "Send the revised budget by Thu, Nov 5". The inbox also has "Avery Lane will send the venue list". The intro still claims "one follow-up ready".
- **Fix:** count the person's own to-dos as promises, and only claim a follow-up when one exists.
- **Shots:** r2-11-promises-result, r2-12-today-sent-lookover.

**S-P1-2. A nonsense mailbox is accepted with no check.**
- **Where:** Mail → Another mail or calendar → "Your mailbox (address and app password)", every field "zzz nonsense ???".
- **Seen:**
  - "Added zzz nonsense ???. It is read within a minute…" The step turns Done, and "Now reading: zzz nonsense ???" shows.
  - Later the cause is wrong: "There was no internet connection. It is tried again by itself" and "couldn't be checked yet without a network".
  - Choose the Sent folder shows "couldn't reach the mail server: [Errno -2] Name or service not known".
  - There's no Remove in setup.
- **Fix:** test the sign-in before adding, name the real cause in plain words, and add Remove.
- **Shots:** r1-23-mail-another-mailbox-nonsense, r1-24, r1-33, r1-36.

**S-P1-3. The "Add a connection" form reads like an admin console.**
- **Seen:**
  - "settings: Value error, give the calendar's link or a file on this computer, one of the two", which persists after switching kind.
  - "Default: (empty)", "Changed · Reset", "every 240 minutes".
  - "*.txt × *.md × *.m4a …".
  - "a full path, or one inside the workspace's folder".
  - "Whose work it holds: Different people / Avery Lane (you)"; "Area (optional): No area".
  - "Older mail isn't read" on calendar, folder and feed forms.
  - An orphan heading "Where it is kept instead", and "What to read" twice.
- **Fix:** plain error text beside the field, Advanced for the technical options, "every 4 hours", and a one-line description per kind.
- **Shots:** r1-23-mail-another-*.

**S-P1-4. "Another mailbox" leads to the wrong form.**
- **Seen:** it replaces the step with the generic five-kind form, nothing preselected. Picking "Your mailbox" then shows the service list again above raw server, user and password fields.
- **Fix:** go straight to the mailbox fields.
- **Shots:** r1-22-mail-apppw-Anothermailbox, r1-23-mail-another-mailbox.

**S-P1-5. An app you're signed in to (Claude Code) has broken wording.**
- **Seen:**
  - "The service is Claude Code account."; the generic service has the same sentence ("…common chat format account.").
  - "…the program's answer has no account at email."
  - Models: "Recommended / Stronger / Stronger".
  - "The app calls this one 'haiku'" shows the model's name.
  - "Checking your key…" where there is no key.
  - Card text is cut off ("with its tools…") and then repeated in full below.
- **Fix:** rewrite these sentences, never show model names, and show each description once.
- **Shots:** r1-12-ai-app-claude-after20s.

**S-P1-6. One on this computer.**
- **Seen:**
  - Ollama and LM Studio show a red "couldn't be reached. Check the address" as soon as they're picked, with no address field, no Check button and no install link. "Nothing leaves this computer" appears three times.
  - The command-line agent says "…Test also checks the lockdown", but there's no Test button. "Use {model} for the model name." is jargon.
- **Fix:** show "Start Ollama, then press Check" with a Check button and a download link, and no red before the first check.
- **Shots:** r1-13-ai-local-*.

**S-P1-7. Privacy is asked twice at the AI step.**
- **Seen:**
  - Allow / "Not my private mail" sits under a 2-line legend that overlaps the box border.
  - Advanced repeats it as Open / Internal / Restricted ticks ("…only once both are ticked").
  - Advanced also has "environment variable name", "128,000 text units" and "Use it for my work".
  - The account name defaults to "Another service that speaks the common chat format", cut off.
- **Fix:** keep one plain choice in setup; the rest goes in Settings.
- **Shots:** r1-17, r1-18-*.

**S-P1-8. A reload loses typed answers.**
- **Seen:** What it's for loses employer, businesses, project lists and groups. The AI step loses the service, address and key.
- **Fix:** keep a draft per screen and say it was restored.
- **Shots:** r1-16.

**S-P1-9. No way back after skipping everything.**
- **Seen:**
  - Today shows only Back up your work, Connect a calendar and Connect a mailbox: no setup line, and nothing says there's no AI account.
  - The only signs are the "⚠ Reginald" pill and Settings → You → Open the setup guide.
  - What it's for promises "the setup list on Today", which isn't there.
  - Run 1, with steps unfinished rather than skipped, did show "Setup 3 of 7 · Continue setup".
- **Fix:** show the line while any step is skipped or to do, make "no AI account" a Needs-you item, and fix the sentence.
- **Shots:** r3-04-today-all-skipped, r3-05, r3-08.

**S-P1-10. Reopening mid-setup lands on Today.**
- **Seen:** Today shows "At risk · Back up your work" and an amber "Backup needed" for a step not yet reached. "Setup 3 of 7" shows while the walkthrough said "4 of 7".
- **Fix:** resume where the person was, don't raise At risk for a step not reached, and say "3 of 7 done".
- **Shots:** r1-19-mail-night.

**S-P1-11. The Steps list lags behind.** Right after the AI step it showed Your AI account without "Done" (the server had it done) until a reload. **Fix:** refresh the setup data after the AI save. **Shots:** r1-19-mail-day.

**S-P1-12. Remove disappears with no reason.**
- **Seen:** once anything is filed under a job or business, its Remove vanishes. The text still says it can be taken back out, and the job still says "Nothing under it yet." while a person is filed under it.
- **Fix:** keep Remove and explain what happens to what's filed, or say why it can't be removed here.
- **Shots:** r2-16, r2-04.

**S-P1-13. The group wording and a rewritten list.**
- **Seen:**
  - "Tick the jobs that are in Retail" calls projects "jobs".
  - Ticking deletes that line from the projects box and reorders the rest.
  - The first business's Remove sits between the two businesses; the second has no heading.
- **Fix:** say "projects", never rewrite the typed text, and head each business with Remove beside its name.
- **Shots:** r2-02, r2-03.

**S-P1-14. Time zone.**
- **Seen:** "Pacific" gives 64 alphabetical matches; Los Angeles is 30th, "Pacific" appears twice, and alias zones like Truk and Yukon are listed. With Los Angeles set, Today's clash line said 7:37 AM while the Schedule showed 2:37 PM for the same meeting.
- **Fix:** rank common matches first, drop aliases and duplicates, and use the chosen zone for every time shown.
- **Shots:** r1-03-you-tz-pacific, r1-53.

**S-P1-15. The Done text is false for the person's state.**
- **Seen:**
  - "Today shows one line to start the assistant… until you press Start" after Start was already pressed.
  - With everything skipped, it is still headed "Done" and says "review the estimated cost and approve the first items".
  - "Skipped (needs mail)" appears for a step the person never skipped.
- **Fix:** write the line from the actual state.
- **Shots:** r1-50, r3-02.

**S-P1-16. The generic AI service gives one message for every failure.**
- **Seen:** "not a web address" and a dead address both get "The service couldn't be reached". Google AI Studio says "a key with no credit won't work" while its card says it has a free tier.
- **Fix:** say "That isn't a web address", and correct the Google AI Studio copy.
- **Shots:** r1-14-*, r1-11-ai-another-google.

## P2
1. **Welcome:** "Reginald" appears with no "your assistant"; the sentence has no full stop.
2. **Footer:** when Continue is disabled, its reason pushes it out of line with "I'll do this later". On a phone, Continue sits alone on the left.
3. **Phone gap:** an empty band of about 70px under the Steps bar (You, connected Mail).
4. **Rename assistant:** Cancel and Save float away from the field.
5. **Full names:** "Your full name" accepts "Avery"; People accepts "Jun".
6. **What it's for:**
   - The "own life" sentence appears three times.
   - The employer warning butts against the business fields.
   - Going back shows a wall of empty textareas.
7. **AI step:**
   - "RecommendedAnthropic" runs together on a phone.
   - The spend Change box shows "0.1".
   - "cheaper work starts on its own" is unclear.
8. **AI revisit:**
   - No top radio is selected.
   - The account name appears three times.
   - "No backup account is set… work waits" has no full stop.
   - "Measure" is unexplained.
   - It's unclear whether a new choice replaces or adds.
9. **Mail step:**
   - "Sign in to start reading" is said twice.
   - "What it can access" shows "Connects to: 127.0.0.1" and "Needs 1 key from you".
   - "Connect another" and "Set them separately" look like plain text, not buttons.
   - Continue floats mid-card.
   - "What it reads waits for you…" is said twice.
   - The "Who are they for?" box is an unstyled default fieldset.
10. **Mail lists:** "Now reading" and "Example mail is connected" are two separate lists of what's read.
11. **Promises buttons and text:**
    - Start and Continue are both primary before Start, so the look-back can be skipped by mistake.
    - Two primaries again after it runs.
    - "Not everything was read" is repeated.
    - "Your calendar, read" is awkward.
12. **Missed something?:** the step still says "nothing you promised" after the report, and Done then marks "Hand in a first note · Done".
13. **Hand something in:** it leaves setup for Today; Escape leaves the person there, with only a small "Back to setup".
14. **Backups:**
    - The chooser opens on "There are no folders here." and has no New folder.
    - "You are in /" lists system folders.
    - "That folder won't work: Give the folder's full path." has a capital after the colon, and "full path" is jargon.
15. **People:**
    - Each suggestion's box is labelled "Personal".
    - "Side" is jargon.
    - The relation stays filled after Add.
    - Work sides preselect "manager".
    - An added person's relation list has no "Someone else".
    - People added to a business get no relation box.
    - "People you write to" is a heading over nothing when there's no mail.
16. **Done:**
    - "Done" appears nine times.
    - The default name shows as "Workspace".
    - After renaming the workspace, its initials badge reads "AI".
17. **Toast:** the rename toast from Done follows the person onto Today.
18. **Reginald popover:** " no AI account yet" (lowercase, leading space).
19. **Settings:** "Open the setup guide" exists only on Settings → You.

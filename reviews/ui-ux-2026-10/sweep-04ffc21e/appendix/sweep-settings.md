# Sweep 4: Settings, every section and control, plus admin screens

**Code:** commit `04ffc21e`.

**Screenshots:** sweep/settings/out (205 PNGs plus `auto-issues.jsonl`; the skipped-setup install's are in `out/skip/`).

**Counts:** P0 2 · P1 26 · P2 28.

**Installs:**
- **Main** (Dana Whitfield, assistant renamed "Penny"): two businesses (Salt Orchard, Brightline Tutoring), fake AI with Allow, fake mail with both businesses, look-back run, backups set.
- **Skipped setup:** a second install with every step skipped.

**Screenshot names:** `b-d-*`, `b-n-*` and `b-p-*` are day 1440, night 1440 and phone 390 for every section. The test browser runs in UTC.

## Coverage

D = 1440 day, N = 1440 night, P = 390 phone.

| Screen / state / dialog | Seen in | Result |
|---|---|---|
| Settings with setup skipped (You, AI, Notices, Backups, Appearance, Quick links, Connections, Add-ons, Advanced, Compare) | D | Fail |
| You: name, time zone, spelling, assistant name, name at top, act-on switch, Reset, Undo, wrong input | D N P | Fail |
| Restart-needed flow (header pill, popover, Restart now) | D | P2 |
| Notices: switch (blocked, not asked, allowed, Send me a test), More, working hours, quiet hours, hold, brief, reminder destinations, More settings | D N P | Fail |
| AI and spending: Test, menu, Rename, Remove + Undo, Add an account (key, app, More options, another service), each-kind fold, money (1.5, $1.50, 1,50, abc, -3, 0, 1000000), Reset | D N P | Fail |
| Compare page: empty, Measure, confirm, Test anyway, results | D N P | Fail |
| Backups: auto switch, synced folder (nonsense, inside the app's folder, good), both folder choosers, key (Make, Replace, "abc", good), More, Back up now | D N P | Fail |
| Appearance: theme, density, accent (good/bad/low contrast), logo, calendar hours, theme from the user menu | D N P | Fail |
| Quick links: empty, bad, javascript:, no https, good, long name, where it shows | D N P | Fail |
| Your business: Rename (empty, duplicate, good), Remove → Move to Personal → Undo, add a business via the setup guide | D N P | Fail |
| Lists: add, duplicate, long, Rename, duplicate rename, Stop offering, Offer again | D N P | P2 |
| Connections: account card, menus, Choose what to read, Change (privacy), Read now, Look at the last day, Turn off/on, Remove + Undo, Sign out, sign in again, Add another account, folder / calendar link / mailbox (with nonsense) | D N P | Fail |
| Add-ons: Available, Installed, Turn off → restart → Turn on → restart, keys, developer catalogs, Refresh, catalog nonsense, #settings/addon/journey-mail | D N P | Fail |
| #settings/files and #settings/lists | D N P | Fail (silent fallback) |
| Advanced: every topic opened, one control changed in each, Reset | D N P | Fail |
| Search: dark, password, email, backup, cost, notifications, language, money, delete, sign out, time zone, nonsense | D | Fail |
| #quality, #handover, #styleguide | D N P | Fail / P2 / P2 |
| Shortcuts (?), Help menu, Write feedback, Missed something?, user menu, phone More menu | D (N partly) P | P2 |

## P0

**T-P0-1. A third change made quickly is silently lost, though the screen shows it saved.** *(I reproduced it with 1.5 s between fields: before $0.10/$2.00/$30.00, shown $0.35/$6.00/$47.00, after a reload $0.35/$6.00/$30.00.)*
- **Where:** Settings › AI and spending. The save path is shared by every settings row.
- **Steps:**
  1. Type 0.5 in "Ask me before anything over".
  2. Type 7 in "Most to spend in a day".
  3. Type 43 in "Most to spend in a month".
  4. Click the heading, wait 4 s and reload.
- **Seen:** all three show "Changed · Reset", but only two saves are sent. Reproduced 4 times at 0.25, 0.8, 1 and 2.5 s, with Tab or click. Of 6 rapid Resets in Advanced, only 3 took effect.
- **Fix:** queue or merge saves, never drop one, and if a save is refused, put the field back and say so.
- **Likely the same cause as S-P0-1** (setup's mailbox tick boxes).
- **Shot:** race-quick-edits.

**T-P0-2. After setup, Backups has no backup folder, Back up now, list of backups or restore.** *(I checked the page; there's no restore screen in the web code.)*
- **What's there:** "Back up automatically", "Synced folder" twice with two different Choose buttons, Backup key, More settings.
- **What's missing:**
  - where backups go
  - when the last one was made
  - a way to change the folder
  - Back up now (it's only in the header popover)
  - any restore
- **Skipped install:** "Back up automatically" is ticked while no folder exists.
- **Fix:** at the top, "Where backups go" (Check, Choose…), the last backup, Back up now and "Restore from a backup". The auto switch shows off, with a reason, until a folder is set.
- **Shots:** b-d-backups, bk-more-open, skip/skip-settings-backups.

## P1

**T-P1-1. Time zone isn't applied everywhere.** After choosing Los Angeles, Today's clash line says "Venue walk-through (7:37 AM to 8:07 AM…)" while the schedule beside it says "2:37 PM – 3:07 PM". The header popovers disagree too ("Last task 7:31 AM" vs "Updated 2:36 PM"): some text uses the setting, some the browser clock. *(you-today-after, hdr-penny-click, hdr-restart-click)* Same as S-P1-14.

**T-P1-2. Appearance needs a reload.** "Saved. Light or dark: dark" shows, but the page stays light; compact and accent colour behave the same. *(ap-dark, ap-reloaded-today)*

**T-P1-3. Raw validation text that quotes the hint, not the label.**
- "“Ask me before the assistant starts something estimated…” isn't allowed: Input should be greater than or equal to 0" (the field keeps "$-3.00").
- "String should match pattern '^#[0-9a-fA-F]{6}$'".
- For working hours: "“When a reminder on a dated thing reaches the person” isn't allowed…"; refused values stay in the selects.
- "Input should be less than or equal to 365".

*(ap-accent-red, not-wh-backwards, adv-chase)*

**T-P1-4. Toasts show internal values:** "America/Los_Angeles", "en-GB", "saturday", "rules", "back to the default, ai", and "1.5" while the field shows $1.50. *(you-after-changes, not-wh-odd)*

**T-P1-5. Reminder destinations dead-end.**
- "To my mail" says "No mailbox can do this yet. Turn on Let the assistant act after your yes for one first."
- The radio stays selected, but a reload shows the earlier choice was kept.
- The switch on You is greyed out: "…has no extra access to ask for."

*(not-radio-Tomymail, b-d-you)*

**T-P1-6. Model names shown:** "The app calls this one "haiku"…"; "Recommended / Stronger / Stronger"; "Selected model: fake-small". *(ai-add-cli, ai-add-other-filled)*

**T-P1-7. The long account name repeats everywhere.**
- "Another service that speaks the common chat format account" appears about 30 times, and setup never asks for a name.
- A fresh install already shows "Filing what you hand in — Changed".
- The fold uses jargon like "Checking what is tied to a move".

*(b-d-ai, ai-choose-open)*

**T-P1-8. The AI is marked untested after a harmless change.** After adding and removing a backup account:
- The popover says "The assistant's connection hasn't been tested… Open the setup guide".
- Today says "Setup 6 of 7 · Next: Add an AI account and test it".
- Test in Settings ("Answered ✓") doesn't clear either.
- The setup AI step asks "Which AI should Penny use?" again and blocks Continue.

*(ap-reloaded-today, setup-ai-revisit)*

**T-P1-9. Compare › Measure.**
- The price shows only after a click, as red error text: "Testing needs your confirmation first: it would cost about $13.85…", with no mention of the $2 daily limit.
- After "Test anyway" the page still says "Nothing measured yet".
- Results later appear with jargon ("Using a term 33%", "Not asking twice 0%").

*(cmp-measured, cmp-test-anyway)*

**T-P1-10. "Add and check" is disabled without a reason** until Check is pressed, and a nonsense service address gets no message. *(ai-add-other-filled)*

**T-P1-11. One add-on, three names.**
- Catalog: "Example mail"; Installed: "journey-mail" ("…for the journey tests"); Settings list and add-a-connection group: "Journey mail".
- Installed asks for an empty "Client id" key while it's already Signed in.
- The account menu offers "Use your own app registration".

*(ad-installed, cn-add-open)*

**T-P1-12. No Remove for add-ons,** only Turn off / Turn on. *(ad-off-restarted)*

**T-P1-13. Choose what to read adds duplicates.**
- It opens a generic form where you type a folder name ("inbox"), with "What to read" twice.
- "Nonsense folder 123" and "Archive" are both accepted; each adds an identical "Example mail · 6 items" row that re-reads the inbox.
- Today went 6 → 9, What changed 5 → 11, To-dos 4 → 10. Removing the rows left those items behind.

*(cn-choose-mail, cn-add-Nonsensefolder123, cn-change-inbox)*

**T-P1-14. Wrong errors for bad connection details.**
- Mailbox server "not a server" gives "Not checked: no internet connection".
- Calendar link "my calendar" gives "isn't a host this may reach… or sign in again".
- A missing folder is accepted and fails later; nothing is checked before adding.

*(cn-mailbox-bad, cn-cal-bad)* Same family as S-P1-2.

**T-P1-15. Sign out.**
- One click, with no confirmation or Undo.
- The sources still say "Read every 15 minutes · Nothing new" and the header still says "Connected".
- After signing in again, the card shows "Not signed in" until a reload.
- "Add another account" opens a window that closes itself with no message.

*(cn-signed-out)*

**T-P1-16. Three privacy vocabularies.**
- AI account: Open / Internal / Restricted material.
- Connections: Like what it serves / Open / Confidential / Private.
- An inbox can be lowered to "Open" with no warning.

*(ai-add-openai, cn-change-inbox, cn-remove)*

**T-P1-17. Quick links aren't where the page says.**
- The hint says "shown as buttons in the header"; they're actually in the initials menu.
- The name is cut at 40 characters without a word.
- "example.org/bank" is refused rather than getting https:// added.
- Nonsense shows the browser's own "Please enter a URL."

*(ql-two, ql-bad, hd-d-usermenu)*

**T-P1-18. No "Add a business" in Settings.** Adding one means Open the setup guide (You only) → What it's for → Add another business → Continue, which lands on the AI step. *(bz-renamed, setup-guide-whatfor)* Same as B-F12.

**T-P1-19. Search misses beginner words:** "password", "email", "money", "delete" and "sign out" give "No settings match". It searches setting rows only, not sections, accounts or the backup key. *(search-password)*

**T-P1-20. Logo and accent colour need expert input.** The logo is "a file in the app's configuration folder, by name", with no upload, and a missing file is accepted. The accent is "#rrggbb", with no picker and a "WCAG AA" message. *(ap-logo)*

**T-P1-21. Phone (390):** on You, the act-on account is squeezed into a one-word-wide column; on Connections, "Signed in as…" overlaps "Sign out". *(b-p-you, b-p-connections)*

**T-P1-22. #quality points to a setting that doesn't exist.**
- "Allow the independent reading in Settings first" finds nothing in a search.
- The page is about 16 mostly empty sections.
- It opens with "6 of 6 closes weren't seen by you." and no next step.

*(adm-d-quality)*

**T-P1-23. A weak backup key ("abc") is accepted** with no warning. *(bk-short-key)*

**T-P1-24. The synced folder accepts bad paths:** nonsense, and a folder inside the app's own data, despite the hint. The second Synced folder block still says "This workspace isn't kept in a synced folder." *(bk-sync-nonsense, bk-sync-inside)*

**T-P1-25. A file name on screen:** Advanced › snooze days shows "1, 3, 7, 14 — Changed in steward.yaml". *(adv-all-open)*

**T-P1-26. "Ask how to add one" dead-ends on the skipped install,** answering "Needs you · Say who you are first" with no AI account. *(skip/skip-ask-how, skip/skip-ask-pressed)*

## P2

**T-P2-1. Hidden sections fall back silently:** #settings/files, and #settings/business and lists on the skipped install, show You with no note.

**T-P2-2. Time zone input:**
- It starts as "UTC" while the hint says "Pick the city".
- The list has duplicates and legacy entries (Eastern ×2, Indianapolis ×2, Istanbul ×2, ACT, NSW, LHI, East-Indiana).
- "Narnia" is silently reverted.

**T-P2-3. No length limit on the assistant's name:** 120 characters break the header and cause 1796px of sideways scroll. *(you-long-assistant-today)*

**T-P2-4. Restarts for small changes** (spelling, synced folder, side words), with an alarming "⚠ Penny waiting for a restart / Restart the app to resume the assistant's work".

**T-P2-5. A night shift is impossible:** working hours of 22:00 to 06:00 are refused.

**T-P2-6. Notices holds unrelated settings** (working hours, quiet hours, brief, reminders) and lives at #settings/today. The user menu says "Spacing" where Settings says "Comfortable or compact".

**T-P2-7. The theme is set in two places:** the user-menu theme overrides the workspace one, so Settings says Dark while the screen is light.

**T-P2-8. Toasts pile up** three or four high, cover the bottom rows and follow you to other pages.

**T-P2-9. Back up now gives no clear result;** the header still says "Backed up less than an hour ago".

**T-P2-10. Backup key wording:**
- After "Make one for me", the Make and Save buttons stay.
- "Backups made before keep the key…" shows when there was no earlier key.
- "Where it is kept instead" is an unexplained toggle on several pages.

**T-P2-11. Folder pickers:**
- "Your home folder — There are no folders here", with "Use this folder" enabled, no path and no New folder.
- The connection folder form has no chooser ("*.txt", size "512" with no unit).

**T-P2-12. Money edge cases:** "1,50" becomes $1.50; $1,000,000 is accepted as the ask threshold; a day limit above the month limit gives no warning.

**T-P2-13. Add-account panel:** descriptions cut off with "…", "CLI" jargon, and the provider grid pushes the form below the fold.

**T-P2-14. A missing word:** "does Penny's work  if it can't answer…".

**T-P2-15. Connection rows default to the type's name:** "A folder", "A calendar (its private link)", "Your mailbox (address and app password)".

**T-P2-16. A turned-off add-on's rows** say "Not available" and also "Read every 15 minutes · Nothing new"; Today doesn't mention that mail reading is off.

**T-P2-17. Catalog jargon:** "…is set by an environment variable" (possibly from the test option `--catalog-by-environment`), and the catalog shows as "127.0.0.1" and a .yaml address.

**T-P2-18. Lists:**
- A duplicate add is silently ignored.
- A duplicate rename says "retire one" while the menu says "Stop offering".
- The rename box isn't focused.
- "Used for: project phase" repeats the heading.
- "Under way" vs "Underway".
- The Good/Caution chips aren't explained.
- The New choice box is autofocused (the phone keyboard pops up).

**T-P2-19. Remove-business:** the question line is misaligned with the card, and Rename shows no toast.

**T-P2-20. Advanced wording:**
- "applies after the rules above" appears with no rules above.
- Side words exist only for personal and business/job, so three businesses can't be told apart.
- Jargon like "Bring related items in line after a move…".

**T-P2-21. Reminder radios:** the circles sit about 6px above their labels, and the descriptions aren't indented.

**T-P2-22. More jargon:** "Only to-dos marked open / Open and internal to-dos"; "set under Details" where there's no Details.

**T-P2-23. Help and feedback:**
- The Help menu has no actual help.
- There are two feedback routes.
- The subject is "Feedback on PM Cockpit".
- The preview has raw "2026-10-28 08:13 -07:00" and "Error: no_access".

*(hd-write-feedback)*

**T-P2-24. #styleguide is blank,** with no text and no way back. Redirect it or say "Not available". *(adm-d-styleguide)*

**T-P2-25. #handover has no context:** only "Which copy to keep / Both copies match.", with no explanation or back link.

**T-P2-26. Phone Settings:** about 400px of description, search and section chips before any content.

**T-P2-27. Empty Connections (skipped install):** "Open Add-ons" floats away from its sentence, and "Add another catalog" looks like plain text.

**T-P2-28. The "⚠ Reginald" pill** on the skipped install means nothing until clicked, and a permanent "Help" tooltip sits under the ? button after load.

**Outside this area:**
- Reopening the browser mid-setup goes to Today rather than back to the step (as S-P1-10).
- The clash line lacks "minutes" (as D-P1-29).

# S1 report: setup from a fresh install, at 8ebf3cf

**Runs:**
- A: skip everything (with `--mail`); A2: the same without it.
- B: personal only, with worst-case content.
- C: cloud drives present, a job and two businesses.
- D: an old-name backup folder present.

`--mail` shows the add-on as "On. Sign in to start reading."; without it, "Connect Example mail", then a restart.

**Gaps:**
- The scripted look-back answers weren't applied to the look-back; worst-case content went in through Hand something in instead.
- X17 wasn't tested.
- The upgrade path with an existing config wasn't tested.
- Night and phone views were limited to Welcome, the You step (phone), and Backups.

## Row verdicts

| ID | Verdict | What was seen | Screenshot |
|---|---|---|---|
| X02 | ✓ Pass | "Finish later" from Welcome and all 8 steps lands on Today with the cursor on "Today"; reloads stay; "Continue setup" opens You on its heading (side effect: P1-1) | A/a05-*, A2/a2-today-after-go |
| X03 | ✓ Pass | Junk left out ("Left out, since they don't read as a person"), and Remove on every row. "Maya", a single word, was added | B/b19-paste-preview, B/b20-people-added |
| X07 | ✓ Pass | Today shows "Look over what was found in Your inbox: 3 items" | B/b28-inbox-lookover |
| X08 | ✓ Pass | A bad link is refused ("That isn't a web address…"); an unreachable one is refused; neither is added | D/d05-calendar-bad, D/d05-calendar-unreach |
| X09 | ◐ Partly | The names are plain. A mailbox can be added two ways on one screen. The calendar form has an unlabeled password box (P1-5) | D/d04-add-dialog, D/d05-calendar-form |
| X10 | ◐ Partly | No model names, and plain error wording. A stale OpenAI guide and a duplicate account card remain (P1-3, P1-4) | B/b07-ai-another-kind, B/b15-ai-test |
| X11 | ◐ Partly | Three vocabularies remain: "Allow / Not my private mail", "Normal / Confidential / Private", and the mail sides | B/b10-ai-allowed, B/b22-hand-in |
| X12 | ✓ Pass | After a reload: "Picked up where you left off…". The AI key stays empty, with no line saying so (P2) | C/c04-after-reload, B/b09-ai-after-reload |
| X13 | ◐ Partly | The setup line works as the way back, but it says "0 of 7 done" or "6 of 7 done" beside an 8-step rail | A/a04-today-after-skip, C/c19-today-worst |
| X14 | ✗ Fail | "Your promises" shows Done after only Continue on an explainer whose own text says nothing is spent until Start. "People: No one added" | B/b21-done, C/c14-done |
| X15 | ✓ Pass | The job banner, two businesses, a group with tick boxes, Remove | C/c06-group-ticked |
| X16 | ✗ Fail | P1-2: Today's Schedule card and Came in show UTC beside "Now" in the person's zone. **Confirmed by the reviewer** | B/b24-today-first |
| X17 | — Not checked | | |
| X66 | ◐ Partly | No "Cockpit" on screen, and the cards read "Backups › Thimbleby". **But:** `cockpit.db` inside the new folder; the window title never names the product; an old folder beside a fresh setup is ignored (P2, see the reviewer's correction); the upgrade path is untested | C/c11-backups-clouds, D/d01, D/d02 |
| X67 | ✓ Pass | "The app copies it every day to a folder your cloud drive keeps." | A/a03-step1 |
| X68 | ✓ Pass (setup) | The header and the rail both count 8. Today's line doesn't (X13) | B/b21-done |
| X69 | ✗ Fail | The wizard only explains, but says it twice. Today has a Start line with a cost. Long titles aren't shortened, and the email isn't named with a link (P1-8) | B/b14-promises, C/c19-today-worst |
| X70 | ✓ Pass | No company voice anywhere in setup | all |
| Y01 | ◐ Partly | **Done:** one primary, the banner, the wording. **Still open:** sides as plain checkboxes, "Set them separately" looking like plain text, Continue in the body, the phone gap and the phone People layout | C/c08-mail-sides |
| Y02 | ✓ Pass | One-name rows, Remove, "Added 4 people" | B/b20-people-added |
| VS01 | ◐ Partly | Choice cards, numbered steps, one privacy question, one spend line. Not compared with the mockup. "Something else" misbehaves | B/b10-ai-allowed |
| VS02 | ✗ Fail | Sides are four plain checkboxes, not a chip group | C/c08-mail-sides |
| VS03 | ◐ Partly | The job banner and People rows are built. The folder chooser has no breadcrumbs or New folder | C/c06, B/b16-backups-chooser |
| Cursor on heading | ◐ Partly | Passes on every step reached by Continue, Back, the rail or a reload. **Fails** on a reload of the connected Mail step (the cursor lands on "Change") and on the calendar form (P1-5) | B/b13, D/d05-calendar-form |

## New findings

### P1
1. **Today says "Nothing needs you" while a setup session is open.** The card reads "Connect an AI service to get started", the "No AI account" and "Back up" rows disappear, and the pill says "Reginald: needs a look". The same state outside setup shows "2 things need you" (A/a07-today-now, A/a04, A2/a2-today-setup-left-open).
2. **Times on Today are off by the time-zone difference.** The Schedule card and Came in format UTC ("10:33 PM" beside "Now · 2:35 PM" in Los Angeles); the clash row is right. The agenda and arrived APIs return Z times that the card doesn't convert (B/b24-today-first, C/c19). **Confirmed.**
3. **The AI step keeps the previous choice's guide.** OpenAI, then Something else, then Another service still shows "Connect OpenAI / 1 Make an account … Access key", and two cards look selected (B/b07, B/b06).
4. **Back on the AI step after connecting:**
   - two cards for the same account, with the host and port as its name
   - Test, and a "…" menu with "Change AI models", "Replace access key", "Set the access key's expiry date" and "Remove"
   - "Measure"
   - the choice cards unselected, so it looks as if nothing was saved

   (B/b15-ai-test, B/b15-ai-menu)
5. **The calendar form opened by "Add connection" leaves the cursor on the page body,** against the owner's rule. Also: the five kinds are still listed above the form, an unlabeled password-type link box, and a 30-word sentence twice (D/d05-calendar-form).
6. **"No time zone matches. Try another spelling."** is drawn in a 4px collapsed bar and can't be read, by day and on a phone (B/b03-tz-narnia-zoom, B/b03-you-phone-narnia).
7. **The folder chooser has no New folder or breadcrumbs.** A typed missing folder says "Connect the drive, or create the folder" with no way to create one (B/b16-backups-chooser).
8. **A long promise title is shown whole:** "Print, sign and mail … P.O. Box 1004, Springfield ST 65102 by Fri, Nov 6., due Fri, Nov 6", with a double full stop and the date twice. The sample items show the same ".," pattern. Spanish and emoji are fine (C/c19-today-worst, C/c20).
9. **Phone: the expanded Look over rows overlap** ("Nol right", "Tod do") (C/c20-worst-lookover-phone).
10. **"Done" and the counts claim untrue things** (X14, X13).
11. **The old-name folder** (corrected by the reviewer to P2): on a fresh setup beside an old folder, the old one is ignored. The upgrade path is untested.

### P2
1. The window title and top-left name: "Workspace", then "Dana's" (from "{name}'s"), then the chosen name. Never Thimbleby.
2. "Reginald is reading: Your inbox, Your calendar…" has capital Ys and contradicts "waits for you to start".
3. Mail step layout: Continue in the body, the restart line outside the card ("add-on"), a focus ring after a reload, "Who are they for?" is unclear, and "Set them separately" looks like plain text.
4. The promises step repeats itself. "Waiting for mail" disagrees with "Choose an AI account first".
5. The AI step says "The service is Another service." and "can't tell which account it is signed in to" when a key was pasted. After a reload there's no line saying the key must be pasted again.
6. "Next: Say who you are" against the step name "You". "What is your business called?" then "What is your business?". The grouping question is unclear.
7. The pill doesn't match Today. Welcome says nothing is read, yet People already lists names from mail.
8. People: a one-word name is stored, the paste box has no label, focus falls to the body, and the phone layout wraps.
9. Backups: "Back up now and continue" doesn't confirm. `cockpit.db` sits inside the backup. Settings › Backups shows the full path.
10. Today after the look-back: "7 things need you" over 2 rows, "3 items" against "4 to-dos", a raw date in a Because quote, and a gap in the briefing card.
11. A bare tick with nothing typed is lost on reload.
12. Welcome's "$2 a day" line appears before any account exists.

**Counts:** P0 0 · P1 10 (P1-11 moved to P2) · P2 13.

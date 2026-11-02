# S3 report (personal + job + one business, one mailbox) at commit 8ebf3cf

**Setup used:** a fresh install with:
- a job ("Harbourside Regional Council") and a 60-character business name
- three projects typed in setup
- fake mail connected, backups done, the look-back run
- Maya Okafor added with two emails and two phones
- about 45 to-dos for her, including a two-line title with a case number and a postal address, French text with emoji, and 40 "Chase supplier N" items

**Not done:**
- days off for a team
- the "Give them dates" flow, and the Schedule beyond night and phone shots
- the fake's one-answer script
- the "redoing" line (X19)
- the Undo on a review toast, which was never exercised

## Row verdicts

| ID | Verdict | What was seen | Screenshot |
|---|---|---|---|
| X06 | ✓ Pass | An untold to-do for Maya shows "Maya Okafor · To send". After Mark sent, the Waiting tab shows "sent today" with "Mark their work done" | f01-followups, f05-waiting |
| X19 | ◐ Partly | "Not right" and Send back works, and the item leaves the batch. **The re-run adds copies:** the inbox review went from 3 to 4 items, and "Get a catering quote." appeared twice; after "All looks good" the To-dos list holds two identical rows. The redoing line wasn't exercised | r02-notright-box, r03-sentback, r05-todos-after-accept |
| X29 | ◐ Partly | Five of the person's own due-date edits folded into one row, "You changed Send the headcount by Wed, Nov 4. 5 times". **But** four or five extra "After '…' moved" rows and a "Learning from a correction" row still appear. The pane shows raw ids (P0-2), and its five lines are identical | c01-changed-after-edits, c02-folded-row |
| X30 | ◐ Partly | Set aside is fine. "Read, nothing to do · 0" says "once a mailbox is connected and mail arrives" although the mailbox is connected. "Closed without you seeing" says "2 of 2 closed without you seeing them", then "Everything that was closed, you made or saw." | h01-handled, h04-handled-read |
| X31 | ◐ Partly | The "Your own to-dos" row sits on top and opens To-dos. The message style is still a pattern editor with "Hi Ada,", not name chips. The due-soon band is wrong (P1-3) | f01-followups, f07-40-followups, f10-style |
| X32 | ✓ Pass | Draft dates read "(due Tue, Nov 3)" | f01-followups |
| X35 | — Not checkable | Reassigning wasn't exercised. A to-do given at creation is listed under To send | f01-followups |
| X40 | ✓ Pass | Two emails and two phones, each with Remove and Add another. Mail from the second address matched ("Last contact: Mail from them on Mon, Nov 2 · Thanks"). The Remove buttons are 68x20 (P2) | p03b-add-person-filled, p04-person-page |
| X41 | ✓ Pass | The organization row and the sidebar item open the same business page | o02-org-business, o03-side-business |
| X42 | ✓ Pass | Add a business, Add a job, Rename and Remove. Remove asks "What happens to the projects and to-dos in …?" The wording is unclear (P2) | s-business, s-business-remove |
| X43 | ◐ Partly | Sides are group headers. Empty columns (Status, Stage, Target, Group, Owner, Open questions) show at rest and hide only after a pane opens, so the columns jump. "2 items need a place · Sort them" isn't explained | k03-projects, k04-project-page |
| X59 | ◐ Partly | Tiles, the weekly table, Mistakes and Your own count are there. No next step for any figure. "Counting from Oct 5 to Nov 2" sits over a last row "Nov 2 to Nov 8" | q01-quality |
| X63 | ◐ Partly | Handover says what it's for and has Back to Today. **Wrong fallbacks:** a missing person shows a blank title and "This page didn't load. Try again"; #records/foo/X1 titles itself "Foo"; #nonsense silently shows Today; #settings/nonsense silently shows You | q02-handover, n01-fallback, n05-fallback |
| Y05 | ◐ Partly | Every job is listed. Remove and Add another are under 24px and misaligned. The People table has empty columns | p01-people, p04-person-page |
| VS07 | ✗ Fail | No grouping by time, no "×4", learning shown as a boxed block, ids and JSON in the pane | c01, c02 |
| VS08 | ◐ Partly | Tabs with counts and a search with an icon. Group by is three unlabeled buttons. Rows take two lines | h01, h02, h04 |
| VS09 | ✗ Fail | Three stacked filter rows plus inner Message and Table tabs. Message style is inline, not in a drawer | f01, f07, f10 |
| VS12 | ◐ Partly | Sides as group headers are done. Empty columns aren't hidden at rest | k03-projects |
| VS13 | ◐ Partly | The person page matches the mockup well, but the composer isn't at the bottom. The organization, business, project and to-do pages use a different, plainer layout | p04-person-page, o02-org-business |
| VS15 | ◐ Partly | Built to the mockup. Eight sections are bare titles with no count | q01-quality |
| VS16 | ✗ Fail | Only "Both copies match." with an icon. No "In sync" pill, last sync time or Check now | q02-handover |

## New findings

### P0
- **P0-1. A to-do's "Edit details" is a raw 25-field form, and saving it corrupts the to-do.**
  - **Where:** #records/action/ACT-6 › Edit details.
  - **What it shows:** Project "PRJ-1", Wording "Send the headcount by 2026-11-04.", Owners "[object Object]", Status "open", Where it came from "SRC-2", and about 20 developer fields: Reply owed, Reported by, How it was said, Date set by, News and more.
  - **What saving does:** changing only the due date and saving changed the title from "Send the headcount." to "Send the headcount by Wed, Nov 4.", while Due reads "Mon, Nov 9".
  - **Fix:** a short form (what, due, who, project picked by name). Never prefill from internal values, and never save untouched fields.
  - **Screenshots:** w03-edit-details, w03b-edit-full, w04-after-save1, v-night-todo.
- **P0-2. The What changed pane shows internal ids and a code dump.**
  - **What it shows:** "FACT-2: The notes list that … The person changed action ACT-6 "…": due was Sun, Nov 8, now Mon, Nov 9. (none)".
  - **Same cause on Notes** (P1-5).
  - **Fix:** render these rows from the structured change, not from note text.
  - **Screenshot:** c01-changed-after-edits.

### P1
1. **Re-running a note duplicates untouched items:** "Get a catering quote." twice in To-dos (r03-sentback, r05-todos-after-accept).
2. **"Who is Avery Lane?" is asked in three places on Today:** Decide, the inbox review and the sent-mail review. "This is me" is the primary button (r01-review-inbox, r17-sent-review).
3. **The "due soon" band lists the two already-sent to-dos.** The unsent ones due Nov 2 and Nov 3 have no band (f07-40-followups).
4. **Handled for you contradicts itself on its empty tab.** The side chips say 2 while the tab says 0 (h04-handled-read).
5. **The Notes page shows ids, ISO dates and JSON** ("ask_whether_the_date_should_change": "… (PER-1)"). A note is filed for every due-date edit, every note is badged "From outside", and calendar notes repeat their title (k05-notes).
6. **The message style contradicts the real draft:** the style says "Hi Ada,", the draft says "Hey Maya, hope you're doing well." (f10-style, f01-followups).
7. **Wrong wording on a person's activity:** "You changed away on Maya Okafor". Time-away text over 80 characters is cut silently (p06-time-away-saved).
8. **The Evening wrap-up's "Moved to tomorrow" is wrong:** it lists items that weren't moved, with double punctuation, and is open by default (r10-cal-review).
9. **What changed counts don't match:** chips and the badge say 3 over 11 rows. The sidebar says "To-dos and questions 14", the tab "To-dos 50" (r08-changed, f08-40-todos).
10. **"Promised to: No one in particular"** on a to-do someone asked of the person (w01-todo-click).
11. **The missing-record page** has a blank title and offers "Try again" (n01-fallback).
12. **The folded five-edit pane** has five identical lines with no old or new date, and says "Reginald did 1 thing" under "You changed" (c02-folded-row).

### P2
- **Today:**
  - "Look over what was found in Your calendar" has a capital Y mid-sentence.
  - The "Needs you" chip repeats the section name.
  - About 95 to-dos show skeleton rows for about 3.5 seconds, with no count.
- **Sidebar:** side names are cut ("Harbourside Regional Cour…"), and clicking the business item scrolls the sidebar sideways.
- **Phone:** the Quality table headers break mid-word, and Today's clash text is cut.
- **The "Copying was blocked…" toast** has a check icon.
- **Follow-ups:**
  - "In this message" repeats the message.
  - The fixed-height message box cuts "Thanks!".
  - 32 bullets go into one message.
  - Three filter rows nest.
- **The Follow-ups empty text** says "Nobody has one yet" with no link to People. People offers no hint to add the senders.
- **"Needs a date":** the help text sits below its group, and the date inputs are native ("mm/dd/yyyy").
- **The business page:** "Read by 127.0.0.1:9455 …" and "Details: Nothing filled in yet."
- **The Settings left menu:** "You" appears twice, and the group titles look like links.
- **Removing a business:** "End them with it" and "People who work for it keep it in place" are unclear.
- **Quality:**
  - eight bare section titles
  - "Promises found 0" after the look-back found to-dos
- **Setup against Today:** "Step 8 of 8" against "6 of 7 done".
- **The person page:**
  - "Activity" is both a tab and a heading.
  - "Their team's days off count too" shows for someone with no team.
- **A raw ISO date inside an AI quote** taken from the source mail.

**Counts:** P0 2 · P1 12 · P2 15

# Sweep 2: empty screens, then daily use for persona A (own life only)

**Code:** commit `04ffc21e`.

**Screenshots and page text:** sweep/daily/out (`<name>.png` / `.txt`), with the automatic checks in `auto-issues.jsonl`.

**Counts:** P0 0 · P1 29 (plus 2 work-wording items) · P2 29.

**Setup used:**
- You "Jordan Ellis Hart"; What it's for left empty.
- Fake AI with Allow.
- Mail, promises and people skipped; backups set.

**Data added by hand:** 4 people, 6 to-dos, 3 schedule entries, 1 file, 2 Knowledge words, 7 hand-ins and several Ask questions. Example mail was connected afterwards.

The fake AI only turns certain sentence shapes into to-dos, so one realistic email had its answer scripted. Findings caused by the fake AI's own wording are left out, except where the app passes that wording on unchanged.

## Coverage

D = 1440 day, N = 1440 night, P = 390 phone.

**Setup**
- All steps (D): fail (P1-15, P2-1).

**Today**
- Empty (D N P): fail (P2-2, P2-3).
- With the "Start the assistant" cost line (D): fail (P1-12).
- With hand-ins (D): fail.
- After mail (D N P): fail (P1-28, P1-29).

**Schedule**
- Day, Work week, Week, Month; arrows; Today; keys 1–4 (D N P): fail (P1-17, P2-4).
- Add to schedule (D): fail (P1-18, P2-5).
- Entry panel (D): fail (P2-6).

**What changed**
- Empty, All and Done (D N P): pass.
- With data (D N P): fail (P1-1, P1-8).

**Since yesterday**
- Empty and with data (D N P): pass.

**Handled for you**
- Empty, both tabs and filters (D N P): fail (P2-7).
- With mail: group, Bring it in, Undo, menu (D P): fail (P1-19, P2-8).

**Follow-ups**
- Empty (D N P): fail (P2-9).
- To send, Later, Waiting on them, "You" panel (D N P): fail (P1-3, P1-20).
- "By person / By project": not in this build.

**To-dos and questions**
- Empty, both tabs (D N P): pass.
- Add a to-do: no date, date in words, repeat, owner, bad date, bad repeat, 477 characters (D): fail (P1-10).
- Filters (D N P): pass.
- Mark done and Undo (D): pass.
- Every "…" item: Add a note, Edit…, Reassign…, Hand to the assistant, Change reminder…, Remove reminder, Pause, Change this, Drop (D): fail (P1-11, P2-10).

**Record pages**
- To-do (D): fail (P1-7).
- Fact (D): P2-11.
- Personal (D): fail (P1-1, P1-6).
- Projects (D N P): fail (P1-16).
- Stages (D N P): P2-12.

**People**
- List and row menu (D N P): P2-13.
- Add a person, including spaces-only and duplicate (D): P2-14.
- Person page and Edit details (D): fail (P1-4, P1-5).
- Talk to Reginald (D): fail (P1-21).

**Files**
- Empty, Add a file, details (D N P): fail (P1-13, P1-14).

**Knowledge**
- Empty, add a word, a "never ask" word (D N P): fail (P1-22, P2-15).
- Rules to look over (D N P): pass.

**How Reginald is doing** (D N P): P2-16.

**Handover** (D N P): P2-17.

**Settings**
- Landing (D N P): P2-18.
- Connections from Today (D): fail (P1-23).
- Add-ons and the setup mail step: pass apart from P2-19.

**Overlays**
- Hand something in drawer (D P): fail (P1-12).
- Ask pane (D P): fail (P1-2, P1-24, P2-20).
- Header search (D): fail (P1-2).
- Missed something? (D P): pass.
- Status popover, Restart to finish, Restart now (D P): P1-22, P2-21.
- Reginald popover (D): P2-22.
- User menu (D P): P2-23.
- Help menu, shortcuts "?", Setup guide (D P): pass.
- Write feedback (D): fail (P1-25).
- Side-menu collapse (D): pass.
- Phone Your day / More / + (P): P2-24.

**Today line actions**
- Read the answer, Review & copy, Copy message, Mark sent, Undo, Draft a nudge, Followed up, menus (D): fail (P1-3, P1-26).
- Look over, Not right, Send back, All looks good, Undo (D): P2-25.
- Question: Answer, Reword, Ask someone else (D): fail (P1-8).
- Brief: Show this week's briefing, Remind me (D): fail (P1-27, P2-26).
- Pick (Identify Avery Lane), File them, inbox look-over, clash (D P): fail (P1-16, P1-28, P1-29).

## P1

**D-P1-1. Raw JSON and ids in Activity and What changed.** *(I checked it in the page text.)*
- **Where:** Today → Look over → Not right → note → Send back. Then open Personal, or the row in What changed.
- **Seen:**
  - `Reginald noted [ "kind": "action", "id": "ACT-6", "gone": true, "where": "taken back when the work was sent back" }, …]`
  - `The person changed action ACT-2 "Pay the water bill": due was Fri, Oct 30, now 2026-11-02. (none)`
  - `(empty input)`
- **Fix:** a plain sentence for undone work, never echo request text, and hide empty notes.
- **Shots:** r1-d-records_project_PRJ-1, r-fact-source.

**D-P1-2. The header "Ask Reginald or search…" never searches.**
- **Seen:** typing "ladder" or "Priya" only fills an Ask question, which costs AI money to send.
- **Fix:** show local matches as the person types, with "Ask Reginald about …" as the last row.
- **Shots:** se-ladder, se-priya.

**D-P1-3. A to-do never sent shows as "Sent today".** *(I checked it in the page text.)*
- **Where:** a to-do with Who does it = Priya Hart.
- **Seen:**
  - Today shows both "Send 1 to-do to Priya Hart · Ready to send" and "Sent today · Follow up with Priya Hart · 1 item awaiting a reply · sent today".
  - The nudge says "Following up on one thing from my note on Wed, Oct 28".
  - Follow-ups lists it under both To send and Waiting on them.
  - Mark sent strikes out the follow-up ("Settled elsewhere"); Followed up marks the unsent Send line "Settled elsewhere".
- **Fix:** one state per to-do. "Sent" only after Mark sent, which moves it to Waiting on them.
- **Shots:** s1-d-today, l1-line2-open, fu1-main, fu1-Waitingonthem, a-mark-sent, a7-followed-up.

**D-P1-4. The person page asks a work question about family.**
- **Seen:** "Who they are to you" offers "Use my default (I work alongside them) / I manage them / I work alongside them / I report to them / I only watch them" for a sister. The add form uses the same label for "my sister".
- **Fix:** hide it without a job or business, or rename it.
- **Shots:** p-d-person-full.

**D-P1-5. Nowhere to add an email or phone.**
- **Seen:** Add a person and Edit details have no contact fields, yet the list has a "How to reach" column. The page says "No contact on file yet."
- **Fix:** a repeatable email/phone field on both forms.
- **Shots:** p-d-add-person, p-d-person-edit.

**D-P1-6. Hand-added to-dos are missing from the Personal page.**
- **Seen:** "Open with Personal 6" lists only Reginald's to-dos; the 5 typed ones are missing. To-dos shows 11.
- **Fix:** with one side only, a typed to-do belongs to it.
- **Shots:** r1-d-records_project_PRJ-1.

**D-P1-7. The to-do record page.**
- **Seen:**
  - Kind "Action".
  - Title "Pick up the dry cleaning by 2026-10-30." (the list shows "due Fri, Oct 30"), with ISO dates also in The words, Evidence and Wording.
  - "Who owes it" and "Who does it" both shown; "Due" and "Due date" both shown.
  - The Draft help is developer text: "The work the action stands for … It is long text…".
- **Fix:** call it "To-do", dates in words, each fact once, rewrite the help.
- **Shots:** r-todo.

**D-P1-8. The question line repeats itself.**
- **Seen:**
  - The question text appears 3 times, with two Answer buttons.
  - The source reads "From From: Priya Hart".
  - It is also inside "Look over 3 things".
  - After answering, What changed shows "Your note · Yes, keep it a surprise… · Filed 1 note", plus "Learning from a correction" rows.
- **Fix:** show the question once, strip "From:", record it as "You answered".
- **Shots:** l2-line0-open, a6-reword, l2-line2-open.

**D-P1-9. Outgoing message has raw dates and office wording.**
- **Seen:** "Action items with you: - Lend us the trailer on 2026-11-07. (due Sat, Nov 07)"; Priya's message says "(due Tue, Nov 03)".
- **Fix:** dates as on screen, no zero padding, and a personal opener for personal relations.
- **Shots:** a7-sam-review, a-copy-message.

**D-P1-10. A long to-do fails with no reason.**
- **Seen:** 477 characters; Add stays enabled; the server returns 422 `string_too_long`; the toast says "That didn't work. Try again", and Try again fails the same way.
- **Fix:** a counter and a message on the field.
- **Shots:** td-d-long-fail.

**D-P1-11. Inline to-do editors stack.**
- **Seen:** Add a note, Edit… and Change reminder… stay open together, each with its own Save. Escape doesn't close them, and editors stay open on other rows.
- **Fix:** one editor at a time.
- **Shots:** td-m-changethis, td-m-pause, td-m-hand.

**D-P1-12. "Reginald is on it" while nothing runs.**
- **Seen:** "Handed in. Reginald is on it." and "Asked. Reginald is on it." while Today waits for "Start the assistant: 2 items, about $0.02".
- **Fix:** say it waits for Start on Today, with a link.
- **Shots:** h-d-after-handin-1, o-d-search-enter.

**D-P1-13. A file's description is never shown.**
- **Seen:** the description is saved but appears nowhere, and a file has no edit, rename or remove.
- **Shots:** f-after-add.

**D-P1-14. Add a file lists format codes.**
- **Seen:** "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet…, audio/mp4…", font formats, and a "What it's for" select whose only choice is "Attachment".
- **Shots:** f-add.

**D-P1-15. The setup checklist claims skipped steps are done.**
- **Seen:** "Your promises — Done" (it said "Skipped (needs mail)" a minute earlier); "Hand in a first note ✓ Done" when only an Ask had been typed.
- **Shots:** o-d-setup-guide.

**D-P1-16. "File them" leads to a bare Projects table.**
- **Seen:** 9 columns cut off ("Last up…", "Open to…", "Open q…"), "Personal · 0", "0 projects", "2 items need a place · Sort them". Projects isn't in the side menu.
- **Fix:** with one side only, file to Personal automatically.
- **Shots:** m5-file, e-d-records_projects.

**D-P1-17. The Schedule's hour labels are cut off.** *(I checked it on screen.)*
- **Seen:** ":00 AM" and ":00 PM" with the first digit cut off, in day, night and phone.
- **Shots:** e-d-schedule, e-p-schedule.

**D-P1-18. Schedule entries are hard to read and wrongly labelled.**
- **Seen:**
  - A 10:00 entry is about 25px tall with its title hidden.
  - The all-day cell says "Due: Pick up the dry cleaning by 2026-10-30."
  - Typed entries say "From your notes", and What changed says "Your note · Added a meeting".
  - The dialog is titled "Add a meeting" while the button says "Add to schedule".
- **Shots:** sc-entry-open, sc-after-add, m-today-after.

**D-P1-19. Handled for you contradicts itself.**
- **Seen:** "2 of 2 closed without you seeing them" then "Everything that was closed, you made or saw." The empty tab says "Nothing has been read with nothing to do."
- **Shots:** hd-read.

**D-P1-20. Follow-ups lists the person's own to-dos.**
- **Seen:** "You · 4 to-dos of yours" under To send; its side panel is one box, "4 to-dos of yours · Open".
- **Shots:** fu1-main.

**D-P1-21. Reassigning makes the other person "promise" it.**
- **Seen:** reassigning saves on select, with no Save. Then "Sam Okoro promised you: Buy a birthday card for Mum", and a send is queued automatically.
- **Shots:** talk-sent, td-reassign.

**D-P1-22. A Knowledge word stops Reginald until a restart.**
- **Seen:** adding the "never ask" word "Pri" gave no warning. The header shows "Restart to finish" and "⚠ Reginald · waiting for a restart", though Settings promises such changes ask first. Restart now recovers.
- **Shots:** rs-status, rs-reginald.

**D-P1-23. Today's "Connect a mailbox" leads to a technical page.**
- **Seen:** Settings › Connections says "Turn on a mail or calendar add-on…" and offers a form with capture folder, RSS and app password. The one-click Example mail from setup isn't offered.
- **Shots:** m-connect-from-today.

**D-P1-24. The Ask pane squeezes Today's lines at 1440.**
- **Seen:** "Look over 3 things…", "Send 2 to-dos to Sa…", "Ready to s…", while a left column of about 140px stays empty.
- **Shots:** se-ladder, a-read-answer.

**D-P1-25. Feedback shows an internal product name.**
- **Seen:** subject "Feedback on PM Cockpit"; the message box starts with blank lines.
- **Shots:** o-d-feedback.

**D-P1-26. Undo brings a line back hidden.**
- **Seen:** after Mark sent → Undo, the line returns only behind "1 new line · Show 1 new item".
- **Shots:** a-mark-sent-undo.

**D-P1-27. The weekly briefing asks "Who do you report to?"**
- **Seen:** the choices are sister, neighbour or teacher. "Your promises this week" lists only the water bill, though the ladder and bins are also due.
- **Shots:** a-brief-show.

**D-P1-28. "Identify 'Avery Lane'" twice, and it's the mailbox owner.**
- **Seen:** two Decide lines for the same name, which is the person's own connected address.
- **Fix:** one line per name; offer "This is me" first.
- **Shots:** m-today-after, m5-pick.

**D-P1-29. The clash line has no unit; work words in personal lines.**
- **Seen:** "you need about 30 to get from Room 4 to Room 2" (cut at "about 30 to g…" on the phone); "4 actions" and "1 action"; "Filed a note in Personal, not in a project".
- **Shots:** m-today-after, f-p-today.

**D-P1-30. Work wording on a personal-only workspace.**
- **Seen:** "Keep track of something of your own" offers only the Client work and Content calendar templates; Knowledge says "Words that mean something particular where you work".
- **Shots:** ask-keeptrack, e-d-records_knowledge.

## P2

**D-P2-1. Setup:** What it's for says "own life only" three times. The AI step shows "…common chat format account 2" (a first Continue didn't move on). On reload, Today showed "Setup 2 of 7" instead of resuming setup. *(s03-whatfor, s05-ai-filled)*

**D-P2-2. Today's empty Schedule card:** "Connect a calendar" wraps mid-sentence, and "Add to schedule" and "Open the schedule" sit right-aligned on separate rows. *(e-d-today)*

**D-P2-3. A green "Connected" shows before any mail is connected;** its popover has only Updates and Backup. *(o-d-status)*

**D-P2-4. The empty Schedule** is a full grid with no hint. Schedule is in no menu on desktop or phone, and the side menu highlights Today while it's open. *(e-d-schedule)*

**D-P2-5. Add to schedule** has only What, Day and Time (no end, place or repeat), and its labels sit at different heights. *(t-d-sched-add)*

**D-P2-6. The schedule entry panel** has only "Open" (no edit, move or delete), and it squeezes the week so the header wraps. *(sc-entry-open)*

**D-P2-7. Handled for you, empty:** the search is autofocused and the filters show, with no line saying it fills once mail is connected. *(e-d-work_handled)*

**D-P2-8. Handled for you:**
- A social update is grouped under "Sales and promotions".
- Senders show as `Name <address>`.
- The menu has only "Always set aside mail like this", with no "Open the message" or "Treat as…".

*(hd-group)*

**D-P2-9. Follow-ups, empty:** it names the wrong things that will appear, and shows a "How your messages start and end" disclosure over nothing. *(e-d-work_followups)*

**D-P2-10. To-do rows:**
- The menu has both "Edit…" and "Change this".
- Pause on a repeating chore asks "What is it waiting for?".
- Each row keeps an empty left column.
- Every row has "Where it came from", even typed ones ("Your note · Added a to-do").

*(td-menu, td-where-from)*

**D-P2-11. Fact page:** "Basis", "Trust" and "As of" are jargon. *(r-fact)*

**D-P2-12. Stages:** "No items have stages yet." with no explanation. *(e-d-work_stages)*

**D-P2-13. People:**
- The empty state is a bare table.
- On a phone, each card's "…" sits on its own line.
- One field has three names: "Who they are", "Who they are to you" and "Relation".
- "Other names" in the form becomes "Aliases" in the details.

*(e-d-records_people, f-p-records_people)*

**D-P2-14. A duplicate name** gives no warning while typing. The error is a toast behind the drawer with a pointless "Try again", and toasts stack three high. *(p-d-add-duplicate-after)*

**D-P2-15. Knowledge:** "What Reginald follows · Nothing is in use yet." is a heading over nothing after the first word. *(k-after-word)*

**D-P2-16. How Reginald is doing, empty:**
- About 18 headings over "Nothing… in this window".
- Five weekly rows of zeros.
- A garbled heading, "Missed out of present, all together".
- An autofocused date field.

*(e-d-quality)*

**D-P2-17. Handover:** "Which copy to keep · Both copies match." with no explanation. *(e-d-handover)*

**D-P2-18. Settings › You** autofocuses Your name, so a phone's keyboard opens. *(e-p-settings)*

**D-P2-19. Setup Promises after mail:** "You press Start first; nothing is read before." sits directly above "7 messages read". *(m-promises)*

**D-P2-20. The "Keep track of something of your own" link** sits in the Ask pane with no context. *(o-d-search-typed)*

**D-P2-21. Restart now** shows "Disconnected · reconnecting", then recovers with no "done" message. *(rs-restart-0)*

**D-P2-22. The Reginald popover** says "account 2" when only one account exists. *(o-d-reginald)*

**D-P2-23. The initials button** is named "Change appearance". Its menu leads with "How Reginald is doing" plus a tick that looks like a selected option, and has no Settings or name. *(o-d-user-menu)*

**D-P2-24. The phone tab "Your day"** versus "Work" in the guide; "Today" and "Your day" read as the same thing. *(ph-Yourday)*

**D-P2-25. Not right on one to-do** with "Undo what it did first" undoes the whole note, and the box doesn't say so. After Send back there's no "redoing" state. *(a5-notright-filled, a5-sentback)*

**D-P2-26. Today's brief:**
- "Morning brief" shows in the afternoon.
- Its count (2) differs from the header (3).
- The reminder text reads "for 'Pick up the dry cleaning by Fri, Oct 30.'".

*(s1-d-today)*

**D-P2-27. Side-menu counts** differ from the tab counts (To-dos 4 vs 5; later 7 vs 11). *(td-d-list)*

**D-P2-28. "Not looked at before Wed, Oct 14"** in the header is cryptic. *(m-today-after)*

**D-P2-29. "Look over what changed since yesterday"** sits under "At risk". *(m-today-after)*

Night mode looked finished on every screen checked. Nothing scrolled sideways at phone width.

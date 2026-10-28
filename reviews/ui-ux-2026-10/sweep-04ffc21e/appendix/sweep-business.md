# Sweep 3: persona B (personal + business + job, mail connected), every screen with data and every record page

**Code:** commit `04ffc21e`.

**Screenshots:** sweep/business/out (233 PNGs, with a `.txt` of each page's text, and `auto-issues.jsonl`).

**Counts:** P0 0 · P1 38 · P2 15.

**Setup used:**
- Robin Calloway, with Personal, the job "Northwind Clinic" and the business "Calloway Upholstery": 3 projects, 2 of them in the group "Customer jobs".
- Inbox → Personal + business; calendar → business; sent mail → Personal + business.
- People: Maya and Theo from the suggestions, plus a typed customer, supplier and manager.

**Not checked:** note, question, decision, series, delivery and source/connection pages. The fake AI made no question or decision, and filed notes have no list or link to open them from.

**Script slip:** the sweep added the choice "Robin's Cushion Stall" to Settings › Lists › Project status. That is the script's doing, not a finding.

## Coverage

D = 1440 day, N = 1440 night, P = 390 phone.

| Area | Seen in | Result |
|---|---|---|
| Setup: You, What it's for (job, business, group ticks), AI, mail and sides, promises, backups, People | D | Pass, but fails on ticks lost on reload (F-40) and People step (F-30, F-41) |
| Today with 9 lines: side filter, Pick/identify, every "…" menu, clash (row click, It's fine, Undo) | D N P | Fail |
| Today reviews: Look over inbox / calendar / sent / draft, Not right, Send back, All looks good, Unfiled Move / Keep, Undo | D N P | Fail |
| Today side cards: brief (Show, week briefing, report-to, goals, Draft the message, Not this week, Close for today), Schedule card, Came in (Check now, menus), Ask panel | D N P | Fail |
| What changed: rows, pane, menus, Change this, Take another look, Undo everything, all row states | D N P | Fail |
| Since yesterday | D N P | Fail |
| Handled for you: both tabs, Kind / Reason / Sender, search, Bring it in as side, toast, Always set aside | D N P | Fail |
| Follow-ups: empty and with data, By person / project, 3 tabs, Message / Table, Copy (with and without clipboard), Mark sent, Waiting, message style | D N P | Fail |
| To-dos: filters, side tabs, menus, Reassign, Edit; to-do page (Move to…, Change, conversation) | D N P | Fail |
| Projects: list by side, side pages, group and project panes, project page, Add (every field), Edit, move to Personal, Remove + Undo, remove a group | D N P | Fail |
| Business page and its organization page | D N P | Fail |
| People: list, filters, panes, 4 person pages, Edit, Add person, Add organization, Remove + Undo, Mark as left (no merge offered) | D N P | Fail |
| Schedule: Day / Work week / Week / Month, entry pane, calendar-event page, Add to schedule, own entry page, side filter | D N P | Fail |
| Fact page and its source dialog | D N P | Fail |
| Files: Add, upload, preview | D N P | Fail |
| Knowledge | D N P | Pass, with P2 (F-43) |
| Hand something in | D | Pass |
| Settings › Your business: rename (empty, already used, good), remove job + Undo, remove business (move-or-end question) | D N P | Fail |
| Note, question, decision, series, delivery, source pages | | Not reached |

## P1 (38)

**B-F01. The side filter has no effect.** *(I checked it: every tab says "9 things need you" and shows the same lines.)*
- **Where:** Today and Schedule, each side tab.
- **Seen:** all 9 lines under every tab, including a clash from a calendar marked business-only. The job tab shows "these wait under Personal".
- **Fix:** give a line with no project the sides of its source.
- **Shots:** t02-today-tab-*, t03-northwind.

**B-F02. Internal ids and code words.** *(I checked "Made: WEEK-1" and "Told · PER 3".)*
- **Seen:**
  - "Made: WEEK-1, an unreviewed draft" (What changed).
  - "Told · PER 3: Wed, Oct 28" (to-do page).
  - "You changed told on Get a catering quote."
  - Screen-reader labels like "More actions for Send the venue list by 2026-11-02."
- **Fix:** titles instead of ids, and plain words for each kind of change.
- **Shots:** v2-work_changed-day, r10-todo-move.

**B-F03. "Move them?" asks once per side.**
- **Seen:** the same 2 items twice ("might be Northwind's", "might be Calloway's"), each with its own Move and "Keep under Personal". It asks whether a business-only calendar's item is the job's.
- **Fix:** one question with a side picker, pre-picking the source's side.
- **Shots:** t29-move-look.

**B-F04. Count and list disagree after Undo.**
- **Seen:** after Undo of a Move, the count went back to 4 but only 3 lines showed until a reload. After All looks good on the inbox, the line stayed with no feedback.
- **Fix:** refetch after Undo and after an accept.
- **Shots:** t31-move-undone, t32-after-undo-reload, t27-all-good.

**B-F05. Asked to identify the person's own mailbox name, once per email.**
- **Seen:** two lines "Identify 'Avery Lane'", the address of the mailbox the person connected. Answering one left the other open.
- **Fix:** treat the mailbox owner as "you", or ask once and offer "This is me".
- **Shots:** t01-today-first, t04-pick-open.

**B-F06. Not right / Send back doesn't remove the item.**
- **Seen:** the box doesn't say which item it's about, and "Undo what it did first" is ticked. After Send back, "Get a printed agenda." stayed in the review and in To-dos 40+ minutes later.
- **Fix:** mark the item in question and undo it at once.
- **Shots:** t23-not-right, t24-sent-back.

**B-F07. Raw JSON in the weekly message draft.** *(I checked it.)*
- **Seen:** the draft box showed `{"summary": "The stand-in found nothing it reads by rule, so it kept…`.
- **Fix:** check the output is plain text, else say "Couldn't draft this".
- **Shots:** t17-draft-message.

**B-F08. A draft review doesn't show the draft.**
- **Seen:** "Draft new text for the week plan" asks for All looks good with no draft shown. The line says "Your note" though the person wrote nothing, and the draft also sits in the brief card.
- **Shots:** t26-lookover-draft.

**B-F09. Reviews lack context.**
- **Seen:** bare to-dos with no source email, side or owner. The pane says "this email" for 3 emails.
- **Shots:** t22-inbox-lookover.

**B-F10. The clash line can only be dismissed.**
- **Seen:** only "It's fine"; the row doesn't open; the text is cut off; "about 30 to get from Room 4" has no unit.
- **Shots:** t09-clash-clicked, v1-today-phone.

**B-F11. A clash marked fine comes back in the brief** as "At risk today".
- **Shots:** t10-clash-fine.

**B-F12. A second business only through Setup; removal is limited.**
- **Seen:**
  - Settings › Your business has Rename and Remove but no Add.
  - The setup text "add later from the setup list on Today" is false after setup.
  - Continue after adding walks on into the AI step.
  - Removal offers only "Move them to Personal" and leaves an orphan organization.
- **Shots:** v5-settings_business-day, bz02-whatfor-revisit, bz04-after-continue, bz10-remove-question.

**B-F13. "Who do you report to?" lists customers and suppliers.**
- **Seen:** the manager isn't pre-selected, and the weekly message covers all sides, so personal and business items can go to an employer.
- **Fix:** ask only for the job side, and draft from that side only.
- **Shots:** t13-week-briefing.

**B-F14. The side-change warning appears only on Today's Move.**
- **Seen:** moving a project via Edit › Inside, or a to-do via "Move to…", gives no warning.
- **Shots:** p18-project-moved, r10-todo-move.

**B-F15. The to-do title differs between list and edit form:** "Send the headcount." versus "Send the headcount by 2026-11-04." *(o06-edit)*

**B-F16. Close for today hides the brief** with no Undo and no way back. *(t18-close-for-today)*

**B-F17. The brief repeats Today with a different count:** "2 things need you" against a header of 9; "1 clash today · Show" only points at the line beside it. *(t01-today-first)*

**B-F18. Undone actions still show "Done":** "Moved to Northwind Clinic" and "Removed Northwind Clinic" stay Done after Undo. *(hi04-changed-after-handin)*

**B-F19. What changed is flooded:** 40+ rows in one afternoon, many "Your note · Changed on screen", and four identical "Learning from a correction · Reginald is on it". *(r06-pasted-detail)*

**B-F20. Schedule entries can't be moved or cancelled.**
- **Seen:**
  - The entry pane offers only Open; a calendar entry's page says "nothing here can be changed".
  - The person's own entry has only a free-text "Change this".
  - "Add a meeting" has no end time, place or side.
  - The own-entry page shows Evidence / Trust and developer help text ("…It is long text: a draft waits for the person's review…").
- **Shots:** sc04-event-page, sc08-own-entry-page, t41-schedule-entry-move.

**B-F21. Raw times and duplicated titles.**
- **Seen:**
  - "Budget check-in Budget check-in When: Wed, Oct 28, 2026, 15:07 to …"
  - "2026-10-28T15:07:36Z" in the source dialog
  - "Due: … by 2026-11-02" in Month view
- **Shots:** p01-side-calloway, r03-fact-source, sc02-view-Month.

**B-F22. "Undo everything it did"** appears on "Your note · Added the business", with no confirmation.

**B-F23. Handled for you contradicts itself.**
- **Seen:**
  - "2 of 2 closed without you seeing them" then "Everything that was closed, you made or saw."
  - "Always set aside" gives no visible feedback (not certain).
  - A social message is grouped under "Sales and promotions", and there's no "Open the message".
- **Shots:** h05-read-nothing.

**B-F24. Came in rows' only action is "Set aside: sales",** even on mail from a friend, and the rows don't open. *(t06-menu-open)*

**B-F25. The Ask/search panel crushes Today at 1440:** "Draft new text for t…", and typing "Venue list" searches nothing. *(r04-search)*

**B-F26. Message style asks the person to type `{first_name}`.** *(f07-message-style)*

**B-F27. To-do titles don't open, and the to-do page lacks basics.**
- **Seen:** no Open in the menu; the page is headed "Action" with no Mark done; it shows Evidence, Wording, Told and Owners, plus schema text in "Draft".
- **Shots:** r08-todo-page.

**B-F28. Edit… on a to-do has no project, side or owner fields,** and "Edit…" and "Change this" do the same thing.

**B-F29. Record pages show internal field names.**
- **Seen:**
  - Fact: "Basis Said / Trust From outside / Wording" and "0 items are open here".
  - Project: "Aliases", "Budget usd 400" and "Parent", where the form says "Other names", "Budget (US dollars)" and "Inside".
- **Shots:** r01-fact-page, p14-project-page.

**B-F30. People can't be given sides or contact details after setup.**
- **Seen:**
  - Add and Edit person have no side, relation, email or phone, so Jun Park is on every side.
  - Pages show both "Side: Business" and "Sides: Calloway Upholstery".
  - A customer and a friend are offered "I report to them / I manage them".
  - "Name verified" shows for everyone.
  - "Organization (if they're outside your team)" doesn't fit a customer.
  - The Organizations people count is blank for Calloway (3 people) but 1 for Northwind.
- **Shots:** pp04-add-person, pp02-maya-edit, pp-Hattie.

**B-F31. The business has two pages** (project page and organization page), each with its own conversation and activity. The org page says "0 items open" (the project page says 1) and "Nothing filled in yet"; its link reads "Your business". *(p06-business-org)*

**B-F32. Projects open inconsistently:** side names open a page, project names open a pane ("Open Mrs Hale's wingback chair's page"). The business page has no "Add a project", and the project page doesn't show its side.

**B-F33. "Budget" on a project is the AI spending cap** but reads as the job's own budget: "$0.00 of $400.00 spent".

**B-F34. Add a project mixes "Group" and "Inside".**
- The setup group is a parent picked under "Inside", while a separate "Group" field lives in Settings › Lists.
- Language codes ("en-AU…"), "workspace" and "ticket prefix".
- "Phase" in the form is "Stage" in the table.
- Inside choices don't show their side.

*(p08-add-project)*

**B-F35. The Bring it in toast** says "Apply to this sender / this email domain", which is technical. *(h11-brought-in)*

**B-F36. Follow-ups.**
- No empty-state explanation.
- "Mark sent" shows 3 times, and only in the menu when copying is blocked.
- "You" is selected by default, so the pane opens nearly empty.

*(f03-copied, f10-copy-no-permission)*

**B-F37. The Projects table:** mostly empty columns, with cut headers and values ("Fri, Nov …", "Robin C…") at 1440 despite free space; side headers squeezed at 390. *(p18-project-moved, v3-records_projects-phone)*

**B-F38. Removing a group fails with a developer message:** "That didn't work. Still used by 3 record(s) (project), so it can't be removed.", with a useless Try again. **Fix:** offer to move or remove the projects inside. *(p19-remove-group-confirm)*

## P2 (15)

**B-F39. Since yesterday:**
- "Nothing changed since yesterday" after one visit.
- An empty left gutter on rows.
- "You haven't seen this close".

**B-F40. Setup:** the job and business ticks on What it's for are lost on reload.

**B-F41. Setup's People step:**
- "No one to suggest yet" after everyone suggested was added.
- Business suggestions get no relation picker.
- The business relation list starts on "customer" with no "Choose…".
- "Tick the jobs…" says "jobs" where everything else says "projects".

**B-F42. Files:**
- The Add dialog lists MIME types and fonts.
- "What it's for" is a dropdown with one choice.
- The typed description is never shown.

**B-F43. Notes can't be found:** there's no list (Knowledge shows only "Your words") and no link from What changed.

**B-F44. Schedule:**
- Not in the left menu, and "Today" stays highlighted.
- Hour labels are clipped (".0:00 AM").
- Event titles are cut in half when the pane opens.

**B-F45. Learning banner:** "Learning from this correction… at 3:00 pm" appears on plain moves and reassigns, with a lowercase "pm".

**B-F46. Garbled sentence:** "Read by Another service that speaks the common chat format account…".

**B-F47. Repeated chip:** "…: not in a project" on every row, and a dangling dot at the line end on the phone.

**B-F48. To-do counts disagree:** "To-dos (6)" and "6 shown" against All 5 and nav 5.

**B-F49. The person page repeats itself:**
- The email is shown twice.
- The same to-do appears under "promised you" and "Open with".
- My own page lists only the job as my organization.

**B-F50. Odd wording:**
- "Mark as left" for a friend.
- "Used for: project group" repeats the heading.
- "High" carries a "Caution" pill.
- "Journey mail" sits in the Settings menu.

**B-F51. The Done screen stays stale after setup:** "Today shows one line to start the assistant", and a first note is marked done though none was handed in.

**B-F52. The count rises after the person's own actions:** reassigning a to-do (2→3) and drafting the weekly message (6→7).

**B-F53. The move-or-end question** sits outside the card's padding.

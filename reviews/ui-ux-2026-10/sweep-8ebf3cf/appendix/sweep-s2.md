# S2 report: daily use, personal life only, at 8ebf3cf

**Setup:** a fresh install with only the person's own life, mail connected and the look-back run.

**Coverage limits:**
- Today's morning, evening and Monday brief wasn't due at 22:30, so only an earlier capture covers it.
- Night was read for Today only; the other night views had the automatic checks only.
- Phone was read for Today, the Keeping track sheet and the More sheet.

## Row verdicts

| ID | Verdict | What was seen | Screenshot |
|---|---|---|---|
| X18 | — Not checkable | There's one side, so no side filter, which is correct. On To-dos the person filter changes the rows, but the footer still says "49 need you" | t-todos-filter-avery |
| X19 | ◐ Partly | "All looks good" removes the review at once, with "Reviewed and filed. Undo". "Not right" asks "What should Reginald do differently about: Bring the floor plan.?" (a stray ".?"). The redoing line isn't built | t-review-accepted, t-notright-form |
| X20 | — Not checkable | One side only | |
| X21 | ✓ Pass | No "this is me" question for the person's own mailbox | t-promises-result |
| X22 | — Not checkable | No question lines were produced | |
| X23 | ◐ Partly | From an earlier capture: "Get a catering quote by Wed, Nov 4., due Wed, Nov 4" (".," and the date said twice) | t-brief-folded |
| X24 | ✗ Fail | The opened clash shows When and Calendar, and only Close. No Move, no Open | t-clash-open |
| X25 | ◐ Partly | 50 to-dos add no Today lines. But asking a question added "Answer / Read the answer…", taking Today from 4 to 5 while the answer was already on screen | t-ask-answer, t-today-50 |
| X26 | ◐ Partly | Start waits as it should. The toast "Asked. Reginald is on it." is still there when the answer shows | t-ask-answer |
| X27 | ✓ Pass | "/" focuses search, with results, "Nothing found", and Ask as an overlay. Caveats: "Send the venue list by 2026-11-02." shows with a raw date; "Maya", "Theo" and email subjects aren't found | t-search-enter-plain, t-ask-overlay |
| X28 | ◐ Partly | Came in rows open, but the page is raw (P1-2) | t-cameIn-open, t-cameIn-menu |
| X33 | ✗ Fail | The row menu's inline editing is good, but the to-do page's Edit details is a raw record form (P1-1) | t-menu-Edit, t-todo-edit-details |
| X34 | ✓ Pass | 400 characters: "That's 100 characters too long: a to-do can be 300 at most…" | t-addform-400 |
| X35 | — Not checkable | Reassigning wasn't done | t-todos-9 |
| X36 | ✓ Pass | Hand-added to-dos are on the Personal page | t-personal-page-after |
| X37 | ✗ Fail | Raw fields on Edit details and on the Came-in page | as above |
| X38 | ✗ Fail | Raw dates in the Pause dropdown, search, the Because quote and the brief proposal. Ids in Edit details ("PRJ-1") and on the message page ("m-1", a content hash) | t-menu-Pause, t-changed-entries |
| X39 | ◐ Partly | The Notes list exists and opens. Notes aren't found by search, there's no search on Notes, and the list is cluttered (P1-3) | t-notes-after |
| X44 | ✗ Fail | Work words remain for a personal-only person (P1-11) | d-sched-Timeline |
| X45 | ◐ Partly | **Pass:** Place and Repeats with a last day, every view, Move or Cancel one or every date, Undo (5 to 4 to 5; 5 to 0 to 5), no dragging. **Fail:** the Timeline's work words, and 30-minute entries overlapping and clipped | d-sched-*, t-sched-* |
| X46 | ✓ Pass | Add, Rename, Edit description and Remove, each with Undo. The "Attachment" chip is on every row | t-files-* |
| X65 | ◐ Partly | Since yesterday has entries, but the wording chains colons. No Today line while two unseen entries existed | e-work_since, t-since-entries |
| X66 | ✓ Pass | No "Cockpit" anywhere. The window title is the workspace name ("Rosalind's"), so "Thimbleby" is shown nowhere (P2-20) | all *.txt |
| X69 | ✗ Fail | P1-7 | t-promises-result, t-review-inbox |
| VS05 | ◐ Partly | Group headers, the inset card and "Not right" match the mockup. Missing: Open both on the clash, the greeting and brief card, and a short review title ("Look over what was found in Your inbox: 3 items") | e-today, t-review-inbox |
| VS06 | ◐ Partly | Hour labels, the now-dot, the toolbar and the month cells are there. 30-minute entries overlap and clip | t-sched-entry-open, d-sched-Month |
| VS10 | ◐ Partly | The round checkbox and the sectioned menu with a red Drop match. Missing: the inline add row, the one-line meta (rows take three lines), the "6 open · 1 overdue" subtitle and the footer hint | t-todos-9, t-todo-menu |
| VS11 | ✓ Pass | The empty Stages page says what a stage is, but in work words, and it's reachable only by URL | e-work_stages |
| VS14 | ✗ Fail | The Files empty state is one line. No drop zone outside the Add dialog | e-records_files |

## New findings

### P1
1. **The to-do page's "Edit details" is a raw record form:** Area "PRJ-1", Wording "Get a catering quote by 2026-11-04.", "Who does it" holding `[object Object]`, plus Reply owed, Reported by, Date set by, Status (held, open, done, dropped) and more. Only changed fields are sent; the Owners box wasn't tested (t-todo-edit-details, t-todo-edit-saved). S3 found that a due-date save rewrites the title.
2. **The Came-in message page shows raw internals:** "Content hash 6bdf0cc6ce1e…", "Kind watched:journey-mail/mail", "Watched From: Maya Okafor / **By us: No** / By you: No / Change: new / Reference: m-1 / Where it came from: your-inbox". The message text itself isn't shown, and "By us" speaks as a company (t-cameIn-open). **Confirmed by the reviewer.**
3. **The Notes list shows machine text:** "From outside New in Your calendar: Offsite day Offsite day When: Wed, Nov 11, 2026, 22:10 to …". Eight of nine notes are system-made, there's no Add from Notes, and the title is the whole text (t-notes-after, t-note-open).
4. **What changed has identical rows and the wrong actor:** five "Your note · Added a meeting" rows. The person's own file actions show as "Your note · Removed a file…" with "Reginald did 1 thing". The chips "Filed / Checked / Not yet checked" are jargon, and there's no grouping by day (t-changed-entries).
5. **Raw ISO dates:** the Pause dropdown ("Send the venue list by 2026-11-02."), search, a Because quote and the brief proposal. The same to-do is named differently in different places (t-menu-Pause). **Confirmed by the reviewer.**
6. **A handed-in paste becomes the Review title:** "Reginald added 'Send the florist order by Mon, Nov 9. We need a table booked at The Old Mill by Tue, Nov 10. Decided: …'". The quote is cut mid-word ("Decided: Mum"), and the to-do text holds all three sentences (t-handin-result, t-handin-review).
7. **The look-back's results on Today (X69):**
   - "Look over what was found in Your inbox: 3 items" with "4 to-dos" under it, so the counts disagree.
   - The source "Email from Maya Okafor · Venue list" isn't a link.
   - The only actions are Not right and All looks good.
   - "Send 2 to-dos to Avery Lane" and "Date 2 new to-dos" appear before the review is accepted (t-promises-result, t-review-inbox).
8. **Counts disagree:** "To-dos 9" against "7 need you". 52 against 49. The person filter still says 49. The Personal page says 52 while the People row says 49 (t-todos-9, t-todos-50, t-todos-filter-avery).
9. **The clash line (X24):** no Move or Open. Two clash rows start with the same words (t-clash-open).
10. **A host and port stand in for the AI account name:** "127.0.0.1:9355: 15 tasks", "Everyday work: 127.0.0.1:9355", "Read by 127.0.0.1:9355" (j-reginald, e-records_projects).
11. **Work words for a personal-only person (X44):**
    - the Timeline lanes, including "Not filed under a project" (twice)
    - "Days people don't work"
    - the default tab is "Work week"
    - "Add a meeting" for a dentist appointment
    - Stages ("a piece of work")
    - the Ask pane ("equipment or contracts")
    - Handover ("Your work is kept…")
    - "Everyday work / Harder work"
    - "Search your work"
    - Quality's "Promises on your own list"

    (d-sched-Timeline, t-sched-add, e-work_stages, t-ask-overlay, e-handover)
12. **Phone: Today's titles are cut:** "Sort out the clash on Mon, Nov 2: Venue…", and one is squeezed to "Sort / out the clash…" by its button (p-today, p2-today-full).

### P2
13. **Quality is mostly empty:** nine "Nothing yet.", four headings with nothing under them, a US-format date box, and expert wording (e-quality).
14. **Search finds no mail, notes or unadded people** ("Maya", "Theo", "Venue list").
15. **The Week view:** 30-minute entries overlap and are cut ("Venue", "Bud"), the now-line strikes through text, and the columns squeeze when the side pane opens.
16. **Schedule wording:**
    - "Move this date…" against "Move this event" against "Moved that date."
    - Cancel doesn't confirm (Undo works).
    - Today says "From your notes" while the Schedule says "Added by you".
17. **The Timeline shows unlabeled dots;** a daily repeat gives about 70 identical dots.
18. **To-do rows:**
    - Every "Mark done" button has the same accessible name.
    - The toast doesn't name the to-do.
    - The "· Personal" suffix is inconsistent.
    - "Promised to: No one in particular" on the person's own to-do.
    - A Learning box stays in the list.
    - "in 3 days" isn't understood.
19. **Small items:**
    - "Look over" stays on the opened row.
    - Knowledge's "Add word" has no toast or Undo.
    - The Files chip is on every row.
    - Notes and Knowledge share one icon.
    - The Personal page's Back floats alone.
    - The People table has empty columns.
20. **"Thimbleby" appears on no screen;** the window title is the workspace name.
21. **The Ask pane** says "Reginald uses your saved information and the guide." ("the guide" is unclear).

**Counts:** P0 0 · P1 12 · P2 9. **Rows:** 7 pass, 11 partly, 7 fail, 5 not checkable.

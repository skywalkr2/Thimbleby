# Where rules judge the person's work instead of the assistant (P110, 2026-11-02)

The rule (owner, 2026-11-02): rules take the easy and mechanical cases, money, safety and the person's own rules; any
judgment about the work is the assistant's, with its knowledge and learnings; a plain function may only narrow what it
looks at. A read-only sweep of `engine/` and `api/` found the places below. The three most serious were checked in the
code by hand (reply owed, booking, due dates). About 30 mechanical places (date arithmetic, clashes, overdue lines,
dedup of identical items, the person's own rules, safety checks) and 8 narrowing places stay as they are.

Recommendation key: **Move** = the assistant decides (in the run it already makes, or one low-cost run), a rule only
picks candidates. **Check** = the rule stops overwriting and becomes a check that sends the answer back to the
assistant once (a lint), so the assistant makes the call. **Fix** = a plain bug. **Keep** = fine as it is, with why.

| # | What a rule decides today | Recommendation |
|---|---|---|
| J1 | Which words to ask about ("What does X mean?"), with no AI | **Move** (in progress): the scan lists candidates, the notes run decides what to ask |
| J6 | A reply owed is closed as answered when the person sends *any* mail to the asker on that thread, never checking it answers | **Moved 2026-11-02**: same-thread mail to the asker is a candidate; a low-cost run with the ask and the reply decides "answered / partly / not"; not answered keeps it open (`tests/test_reply_lines.py`) |
| J16 | A booking confirmation deletes the assistant's own calendar entry that starts at the same moment, whatever its title | **Fixed 2026-11-02**: the assistant's entry is dropped only when it starts at the same moment and shares a title word with the booking (`tests/test_booking_entries.py::test_an_entry_of_the_assistants_about_something_else_at_the_same_moment_is_kept`) |
| J2, J3 | The rule's reading of due words ("next Friday", "once the keys arrive") replaces the date the assistant gave, or strips it | **Check**: the assistant's date stands; when the rule reads the words differently, the answer goes back once with both readings; still different, the date is kept and marked "check this date" |
| J4 | A new promise like an open one is turned into a move or merged, by text likeness and a date window | **Moved 2026-11-02**: the likeness only flags, put to the assistant once; its answer stands with no second return and no stronger tier (`tests/test_promises.py`) |
| J5 | "Closed" words turn done into dropped; a bare "closed" makes a rule-written question | **Moved 2026-11-02**: the `ending-reading` lint tells the assistant what the words suggest, once; its answer stands, nothing is rewritten and no rule writes a question (`tests/test_endings_need_delivery.py`, `tests/test_agenda.py`) |
| J7 | A "no need to reply" phrase refuses the assistant's reply owed | **Moved 2026-11-02**: the phrase is the `reply-not-needed` lint put once; the header part (automatic mail, mail the person sent) stays a refusal (`tests/test_reply_lines.py`) |
| J8 | A calendar entry and a promise are linked when their words overlap on the same day, and the promise then moves when the entry moves, with no confirmation | **Move**: the overlap proposes a link; the assistant confirms it in the run that reads the calendar change (or the person does); only confirmed links move dates |
| J13 | Word lists decide mail is a bill, order, delivery or automated notice: filed under Personal, never sorted, and the assistant's facts from it refused | **Move**: the low-cost sorting run (already headers-only) also answers the kind; word lists stay only as a hint in its packet. Refusing facts from automated notices becomes a check, not a ban |
| J12 | Bulk and list mail, the mail service's promotions/social tabs and no-reply code mail are set aside before the assistant sees them | **Keep**: the mail's own headers and the service's own tabs say it, it saves money, and the person can pull any back (that pull is learned). The unsure cases already go to the sorting run |
| J10 | When the assistant left an item's project empty, ranked signals file it, else Personal | **Move**: the packet already lists projects; the assistant is told to file it, and the rule's guess is only shown as "filed by a guess" when the assistant still leaves it empty |
| J17 | After N dismissals in M days a whole kind of Today line is quieted, by a counter | **Move** (later): dismissals become learnings the brief's run reads, and quieting a kind is proposed with its reason for the person to keep |
| J9 | Dates in documents the assistant missed are found by rule and held for the person | **Keep**: a safety net that only proposes; it says it was found by a rule |
| J11 | Filing questions and rule proposals from the person's own Move choices | **Keep**: from the person's behaviour, always confirmed |
| J14 | "Who is X?" asked, and a pick refused when only a shared first name was written | **Keep**: safety (a wrong recipient is the costly mistake); it asks, it never guesses |
| J15 | No owner: the person on Personal, else "Pick an owner" | **Keep**: a product rule (every action names a person) |
| J18, J19 | "Make this a to-do" and "new area" offers | **Keep**: offers only; the person decides |
| U2 | Lints with word lists send the assistant's answer back (promise, owner, decision) | **Keep**: they return to the assistant, which decides; they never write |
| U1, U4-U13 | Older document versions, Monday goals by due date, day capacity, bare "ok" notes, review lines by kind, signature cutting, meeting capture lines, project wind-down | **Keep** for now (mechanical in effect or confirmed by the person); U4 Monday goals and U10 which meetings get a "what happened?" line are candidates for the assistant later |

Proposed order, highest value first: J16 (bug), J6, J2/J3, J4, J5, J7, J8, J13, J10, J17. Each lands with a test of the
person's path and an evaluation case where it is the assistant's judgment, and each is estimated before any costs a run.

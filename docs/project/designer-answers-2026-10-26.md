# The functional designer's answers to F33 to F38 and P5, and what a full read of the docs turned up (2026-10-26)

As received. Planned in `docs/project/open-promises.md` P60 to P63; the owner's decisions on the read's points are
recorded in `docs/decisions.md` as they are made.

## The six questions

**F33. Unknown words: neither the rule alone nor the AI alone.** The rule finds candidates, and the AI decides whether to
ask.
- What we learned running it: a term question is worth asking only when the local meaning may differ from the common
  one, or when something the assistant is about to write depends on it. A short acronym often means something specific
  at work that differs from its everyday meaning. "Every AI knows that one" is exactly the case a glossary exists to
  catch. So letting the AI raise terms on its own judgment alone would miss the cases that matter most.
- The order before asking: the glossary, then the workspace's own facts and notes, then the lookup when it's built. Only
  then a question (lesson 12). The built rule goes straight from the scan to asking.
- Three outcomes, not two: known: silent; assumed: recorded in Knowledge with "assumed: <meaning>" and the source, with
  no question; unknown and it matters: one question. In our run a typical week recorded about 25 terms, nearly all
  assumed or confirmed quietly. Only the ones blocking a record were asked.
- Keep the shipped list as a suppress list of unambiguous names only: countries, time zones, mail folder names,
  well-known services. Never put short acronyms on it.
- Known terms are glossary records, not settings. They're seeded with origin "shipped", so the AI sees them in its
  packet. Today the same idea lives in `language.known_terms*` and in the glossary. That breaks "a setting never repeats
  a record" (4.0), and `language.*` needs a restart to change.
- Limits: a cap per day; the day's term questions batched into one Review line; a dropped term question means never
  raise that term again; negative cases in the evals: common words raise nothing; a short acronym that has a local
  meaning on file is never asked.
- Meanwhile: the default (rule plus list) is fine. Add the cap and the batching now.

**F34. Keep the name "Handled for you", but split it by how each item was handled, not by what kind of item it is.**
- Three sections, because each one offers different next steps: Set aside before reading (Treat as personal or work, or
  Always set aside); Closed by a rule (Take a closer look; for an older version, Not an older version); Read, nothing to
  do (Take a closer look).
- On every row: a chip for the item's kind (mail, file, page, tracker, calendar) and the reason it was closed. A kind
  filter sits on top.
- Grouping: by reason, with counts, collapsed. Size it for hundreds of rows a week. In our run, closes outnumbered items
  for the person about 6 to 1.
- Nothing on Today. Today lists only what the person does, and a count of handled items isn't an action. Put the count
  on What changed instead.
- The point of the screen is finding a wrong close. Our worst silent loss came from a rule closing real items for days,
  so the bring-back must be one click from every row.

**F35. Don't accept the default: risks left open after a project ends is the exact failure from lesson 2.** In our case
the leftover risks kept being chased.
- Don't make risk a core record for this. A personal workspace with no packs has no risks, so the problem only exists
  where a pack is on.
- Add the one extension point the lessons need: a project-ending hook that returns the pack's own ops (for example
  `registrar.project_ending(project) -> [ops]`). Its ops join the core's wind-down group, so the person gets one Undo,
  one held change when it came from an input, one keep list. The same hook, or one on `action.drop`, lets a pack drop
  the risk paired with a dropped action (lesson 8).
- Make it the first item released when the hold lifts, or the one stated exception to the hold.
- Until then: a pack's Today lines, chasing and notifications skip records whose project has a done meaning (add a test
  for it); the ending's confirmation lists the pack items left behind, with "Close these too"; left-over items are never
  called "resolved" (dropped isn't done, lesson 9).
- Keep the keep list as a list, not one decline per item. Ours had 26 actions; declining them one by one is 26 clicks.
  Offer "Keep these" on a multi-select.

**F36. Yes, a link by hand is enough, but put it in two places and add the way to undo a wrong grouping.**
- Where: on the file's page ("Same document as…"); on the "older version" row in Handled for you, where a wrong grouping
  is actually noticed. Nobody visits a file's page to find one.
- The reverse is needed too: "Not the same document" splits a family the name rule joined wrongly. The 1234 and 5678
  test shows such groupings happen.
- Which copy is current: version first, then the date in the name. When those tie or disagree, ask once. Use modified
  time only as the last resort: a sync, restore or copy bumps it, and then the real current copy closes silently.
- It may not need an API release: at 6c6d8ac the file record's `replaces` is an ordinary field, and `record.edit`
  doesn't refuse it. Check whether linking by hand is a `record.edit` of `replaces` plus the version families respecting
  it. If so, it can be built under the hold.
- Optional, later: when a new file's text overlaps strongly with a current file in the same folder (no AI, just
  shingles), ask once: "Is this a new version of <file>?"

**F37. Yes to a short look at the setup captures, but it shouldn't block the build.** Points from the read:
- Two choices, not three: "Just me" and "Me and my work". Whether the work is a job or a business shows in the people
  step's relations and the wording, not as a third path. Choosing work brings up the employer-mail notice (designer
  answer, item 5), which the tester guide still lacks.
- Step 1 asks too much: name, workspace name, assistant name, time zone and personal/business all at once. Workspace and
  assistant names can take their defaults and move to Settings. Put the work question on its own screen.
- The step order is written two ways in 7.8 (Backups 5 or 7, People 5 or 6). Fix that before the reviewer walks it.
- Bills and orders file under Personal "whoever sent it" (rank 0). That's right for a personal user, but a business
  user's supplier invoices would land in Personal. When the work side is a business, rank the sender's relation first.
- Personal keeps needing exceptions (no target, no phase, no work-style questions). That's a sign it's its own kind of
  thing, not a project with rules switched off. That's fine for v1; just don't add a fifth exception.

**F38. Change the format after the hold, as the default says, but show the add-on as one now.**
- Now: the Add-ons screen groups entries that share a release file (the same `sha256`) into one row: "Mail and calendar ·
  includes Gmail, Outlook". Each service shows its own state underneath (one-click or own registration, signed in or
  not).
- The fix is needed anyway: Remove must count how many entries use a file before deleting it. Today two entries sharing
  one file would break each other on removal.
- After the hold: an optional `includes:` field on the catalog entry. Readers have to ignore unknown fields, so an older
  app doesn't hide the entry.

**P5. A typical week of real input.** Counts from one ordinary working week of our deployment: one person, about ten
tracked projects, five weekdays. Use the shares to tune the day-30 noise; the numbers are one person's.
- About 200 incoming changes (40 a day, Monday the heaviest after the weekend): 31% version bumps in watched page trees;
  27% issue-tracker updates; 22% edits on watched pages; 14% files saved into a shared folder; 7% the person's own notes,
  pastes and screenshots.
- 86% closed with nothing for the person: 35% by plain rules before any AI run, 51% by the assistant after reading. Of 27
  file changes, 24 were nothing to do: mostly re-saves and new versions of a handful of decks and workbooks. One deck had
  five saves in two days.
- About 196 AI runs: two thirds from watched changes, about 55 from the person's own replies (answers, feedback on
  questions and actions, pasted notes) and 11 lookups.
- 220 changes written: 7 failed or were rejected and retried. 30% had something for the person (a page draft, a
  question, a decision). The other 70% were filed quietly.
- What gets written is mostly facts: about 130 facts, 25 glossary terms and 14 lessons that week. Facts outnumber page
  edits.
- The noise the person felt was over-asking, not over-reading: 22 questions were dropped that week as "shouldn't have
  been asked".
- Bursts: one meeting's notes produce 10 to 30 writes at once; a deck under review produces several saves a day; a rename
  can touch dozens of items.

## What the full read turned up

1. **The plugin API hold isn't recorded as a decision.** It's cited four times in decisions and in P33, but it has no
   scope, no exit and no list of what waits on it. It now blocks five core behaviors: Helpful / Not helpful signals;
   risks at project end; the sent folder; older mail from add-ons; linking files by hand (maybe not, per F36). Pack
   builders were also promised a batch. Record the hold as a decision, then either lift it once for one batched release
   (with the project-ending hook first) or move the core behaviors out from under it. Meanwhile 0.3.89 and new signal
   kinds shipped, so say what the hold covers.
2. **The gate is now after everything it was meant to gate.** F1 and F2 said to prove S1 on a week of real mail before
   building more. The 10/22 change builds S1b to S5 first and measures afterwards. That reverses the gate's purpose and
   raises the cost of the freeze. At minimum, set the pass bar now: the thresholds are still open (R10). And run a
   two-day measured check on S1 before S2 to S5 grow further.
3. **The roadmap doesn't show this week.** roadmap-to-1.0's "where things stand" is dated 10/20 to 10/22. P51 to P54, the
   fix batch, the hold and F33 to F38 live only in open promises and CHANGES. One source of truth for status would help.
   open-promises.md (60 rows, 50 KB, re-read every session) needs pruning: finished rows out, cells capped. Its P35 and
   P32 rows are malformed.
4. **Lessons only partly in the design.** Each needs a product rule and a test:
   - 5: a retry may fix a failing op but never drop one. Every tracked item, including a bare row without a detail page
     and a pack's records, needs a place for facts. Today facts attach only to a project, event or series. Our 10/26
     lesson covers what happened when they didn't.
   - 7: a decision is a choice someone made; what a document lists is a fact. There's no rule or lint, and the stand-in
     AI turns "Decided:" lines into facts.
   - 8: an action and its paired risk go together. Nothing pairs them.
   - 11: F17 (a second move within 14 days gets a history row) and the 10-14 rule (date moves leave reader history) only
     agree if F17 means the person's own history. Say so.
   - 6: only the model's name is blocked outward. The assistant's display name must not appear on anything others read
     either (drafts, calendar entries, shared pages), though it's fine to the person. Add the test.
   - 4: lead time works by matching meeting "setup words". It should be a lead-time field on any to-do with a runway, so
     it isn't tied to the language.
   - 3: P53 left two holes: a stuck loop isn't in the notification count, and nothing watches the watchdog. Also, pack
     handlers, validators and Today lines have no timeout. A hang is as fatal as a crash. And after three failures a pack
     switches off: say what happens to its queued ops.
5. **385 settings is the root of F33's kind of bug.** About 70 `language.*` word lists do what the AI already does, and
   several are restart-only. Move word lists into shipped data, cut duplicate settings (quiet hours, snooze days, backup
   and export intervals), and keep 30 to 40 on screen.
6. **One place to act isn't true yet.** A to-do can be ticked in the queue line, the rail, the To-dos screen and
   Follow-ups. 7.7 says the queue is the only place. Pick one, and make the others links.
7. **The docs contradict each other in places a reviewer will trip on:** sign-in opens in this tab (7.15) or its own
   window (7.8); the agenda defaults to 1 day (04) or a week (handover); `server.*` is file-only (04) yet listed as
   advanced on screen (settings sort); "Helper inferred this" (7.14) uses a stray name for the assistant; 08's "no
   glossary yet" tags are stale, so its enforcement column can't be trusted.
8. **The business model and the research disagree.** business-model.md is still the pre-delta plan. The mail-sign-in
   research says the provider's 100-new-user cap is lifetime and can't be reset, so a second registration only
   multiplies it. It also says the personal app-password path the delta discounts still works. scope.md says "Candidate
   changes: none" after twelve steward additions, which breaks its own change control.
9. **What I'd cut or defer for a one-person v1:** Phase T's selling machinery beyond the IP check (sell by hand first);
   the charter's eight-pack end state (move it to a vision file); sending, meeting prep, people memory, voice and
   capture, the attention budget and the record conversation, until the gate passes; the schedule view (P49): keep the
   agenda with clash lines; adding new eval cases until P1's "after" summary exists (learning pairs are the
   differentiator, and they're the weakest result).
10. **Small but visible:** the reminder wording still says "while this computer was asleep" (the steward review asked
    for "overdue"); the tester form lacks the "Missed something?" count F8 asked for; "Drop" is being reworded to
    "Remove". Keep "Drop" distinct from "Done" (lesson 9).

# Go-forward plan to 1.0

Rewritten on 2026-10-12 after the review (`review-2026-10-12.md`), at the owner's direction.

**The goal:** Thimbleby (still called PM Cockpit in the code until phase I): a daily assistant for anyone juggling work,
which keeps track of what the person promised and what was promised to them, and gets the next step ready, with the
person approving everything outward. The path:
- **The first milestone:** the core complete, with full UI and code reviews approved, plus the installers (phases B, S and
  I).
- **The gate week** on the owner's personal mail is the first measured use of the core.
- **Real use by the owner** starts once the writing pack is complete (phase C).
- **The free core release comes first** (owner, 2026-10-20: "core Thimbleby vs paid Thimbleby+"): after phase I, the
  open core is published with its website update, and it waits for no pack and nothing the paid upgrade needs.
  Thimbleby+ (phase T) follows only if the owner goes ahead with it.
- **Packs come after the core** (the writing pack, then the project management and publishing packs). Product 1.0 ships
  on plugin API 0.x; plugin API 1.0 keeps its own test (two packs unchanged through real use), so 1.0 doesn't wait for
  every pack to be designed (decisions, 2026-10-20).
- **1.0 is published** once the owner finalizes scope.

**How the order was chosen:** each phase makes the next one testable by the owner. The plan holds one stream of work at
a time, and a phase ends when its exit test passes, not when its code is written.

Durations are estimates in working sessions. Dates are set when a phase starts and recorded here.

**This file holds only what is left.** What the roadmap finished, in the order it was done, is in
`roadmap-done.md`. Open items carry a batch tag in square brackets, such as `[S1-2]`; "The plan in batches" below
says what each batch covers, what passes at its end and how big it is. A batch is one meaningful piece of scope, with
one full test run and one push (CLAUDE.md, "Usage and machine load").

## Where things stand (2026-10-28)

- **Built:** phase S, apart from the Lefts each of its boxes names; the fix batch from the owner's first evening
  (open promises P34 to P50, the lessons P51 to P54); and **phase U, built and validated by the reviewer**
  (`reviews/ui-ux-2026-10/validate-82d24cc/`: G1 to G4 fixed, both personas finish setup alone, no Today action raised the
  count), with its second pass, the audit's leftovers (A2, A2b, A3, A5) and the bookkeeping (A1) done. Each ticked box cites its
  tests. **Plugin API 0.3.91**; the hold on API changes applies again (P33).
- **Open in the audit's batch:** A4, the checklist's partials, each re-marked with why (C16, C23, C24, C29, C35, C43).
- **Next, in order:**
  1. **AI account hardening** (gate I-0a): B-11c's last item (`thinking: off`, which the service's listing gives no capability
     for), B-11b's rest (the recommendation by cost per passing answer, "Measure", the model picker's role words, effort in the
     pre-save check, confirming each service's effort parameter), each fix checked on a low-cost model first, then the owner's
     re-run (B-10; P30 and P31 are the owner's captures and the learning-pair groups).
  2. **The owner's checks and the gate week with its pass bar** (P65: drafted in `docs/project/gate-pass-bar-draft-2026-10-28.md`,
     waiting for the owner's yes; the thresholds paragraph of design 6.32 is matched to it after that yes): the laptop and phone
     exit checks (B-6a, B-6b), an add-on installed from a real release host (B-5), the app-password check (P67), the real-mail
     re-run (P46). The gate's instruments already count the pass bar's rows for lost promises, the 50-message sample, sources not read and review time (change log 235).
  3. **Phase S's leftovers**, the gate week showing which matter; those that need an add-on (calendar acts, the add-ons' channels,
     Move to, older mail) go to the add-on builders.
  4. **Phase I**, once I-0, I-0a, I-0c and I-0d pass.
- **Held, not dropped:** `includes:` (P62, P39) and the test kit case for a validator that reads a file (P71) and a core op that
  copies long text with its authorship (P72) wait for the next plugin API release; the writer walk-through (P70) waits for the
  writing pack to register its screens.
- **Status lives here and in `open-promises.md`;** finished promises move to `open-promises-done.md`; finished roadmap work to
  `roadmap-done.md`.

## How the order was set (decided; kept from 2026-10-20)

- **The order:** phase B and its UI gate, then phase S (the daily steward), then phase U (the UI/UX reviewer's findings), then
  AI account hardening, then the gate week on the core as built, then phase I (installers; the first milestone ends there),
  then C (the writing pack), P (the other packs), D (sign-off), L-more and E, then Publish 1.0 once the owner finalizes scope
  (owner, 2026-10-22: the gate week comes once the core is built; 2026-10-26: phase U before the gate week).
- **The first milestone** (owner, 2026-10-19): the core complete, with full UI and code reviews approved, and the installers
  (phases B, S and I), published as the free core release (the free core's own phase I item, I-3). 1.0 is a moving target until
  the owner finalizes scope; it ships on plugin API 0.x. There is no go/no-go date: the 2026-10-30 one was set aside on
  2026-10-09 and 2026-10-12, and stays set aside.
- **When the owner uses it:** the owner tests it in the evenings as it goes, and starts real use once the writing pack is
  complete (owner, 2026-10-15; confirmed 2026-10-19). Phase S's gate week is the measured trial of the core on the owner's
  personal mail (R9 rules out work mail), before testers.
- **The AI re-run:** the owner's first run of the learning tests (O3) was made on 2026-10-20 (81% of 214, 79% harder, 53% pairs,
  30% harder pairs); its failures were fixed in batch B-7 (design `CHANGES.md` section 126). The owner re-runs the failed cases
  (B-10, steps under O3, below).

## The plan in batches

One row per batch, in the order of work. A batch is one meaningful piece of scope: it ends on its exit test, with one
full test run and one push (CLAUDE.md, "Usage and machine load"). Every open item below carries its batch tag. Sizes are
rough (half a day to two days; the batches from phase C on are sized when they are reached). The phase sections below
keep each item's full text.

1. **S1-1 Promises core (built; the owner's learning run O3 is its last step)** (0 open items; size: about a day)
    - *Covers:* *Promises both ways* (phase S, S1; built so far: promise ops, rules-first dates, endings held for Keep, see that item's "Built so far"; left: prompts and playbook, the sent folder as a source, golden cases and harness pairs); *How a promise resolves* (S1; left: the line for a promise past its date with its choices); *Every promise shows why* (S1).
    - *Exit:* the twenty learning pairs run as harness pairs and pass; a fictional thread gives promises both ways with endings held for Keep; and the owner's one learning-test run (O3) on this batch's push.

2. **S1-2 What the person owes and misses (built)** (0 open items; size: about two and a half days)
    - *Covers:* *Replies owed* (S1); *Reminders at a time* (moved here from S2, since the gate's first slice names reminders; S2 keeps a one-line pointer); *What changed since yesterday* (a new item in S1, from the designer's F2: the gate text names the line and no item stood for it); *"Missed one"* (S1).
    - *Also covers* (the designer's lessons, 2026-10-19): *A stance per person* (the field, its default and the gate on drafts and questions, design 6.34), and *A rejected ask is dropped, not reworded* (6.22), each with learning pairs.
    - *Also covers* (the designer's notes for later batches, 2026-10-19; design 6.35): *Learning from the sent version* (the style pair, moved here from L-more), *What a draft to someone else carries*, *A sender's distribution limit travels with the content*, and the extra endings of a reply owed (in *Replies owed*) and the assistant's own voice in *What changed since yesterday*.
    - *Exit:* a journey test for each; the stance gate holds a design question drafted to someone the person works alongside; a draft to someone outside a restricted message's group draws only on the open one; the style pair passes; the new learning pairs pass.

3. **S1-3 Ready for the gate week (built; the gate week is next)** (0 open items; size: about a day and a quarter)
    - *Covers:* *Sign-in sources taken in quietly* (S1, designer's F6: sources a sign-in adds use the quiet intake, and journeys J2 and J6 are rewritten for one total, one go and one "Look over what was found" line; a new item in S1); *A first success in five minutes* (S1); *The gate week's instruments* (S1).
    - *Also covers* (the designer's lessons, 2026-10-19): *Which sign-in an agent runs as* (design 6.16), so the gate week runs on a known account; and (the designer's notes for later batches) *Work the assistant releases on its own keeps the person's hours* (design 6.35).
    - *Exit:* the owner can start the two measured days; journeys J2 and J6 pass with one total, one go and one "Look over what was found" line.

4. **B-5 Sources and accounts** (1 open item, plus the numbered wave 5 entry; size: about one to two days)
    - *Covers:* *Wave 5* with P17 (.ics calendars, full featured) and P18 (several accounts of one service); the items that belong with it: *Passwords, keys and private addresses typed on the screen* (P16), *Add-ons install from the screen* (P15), *Mailbox and calendar passwords and addresses entered on screen* (all in phase B, built to S's shape).
    - *Exit:* the tests each item names pass; the owner adds an .ics link and file and a second account of one service, and types a password and a key on screen, with no file edit.

5. **B-6a The rest of B: records, Settings and forms** (2 open items, plus the numbered wave 6 entry; size: about one to two days)
    - *Covers:* from *Wave 6* (phase B): the designer's F12 and F13 and P26 (in the wave 6 entry), *Lists, not typing*, *The cursor starts where you type*, *Value-list values carry meaning*, *Follow-ups' Later*, *An action can be blocked*, *The obvious next steps on screen*; and the open items that fit this area: *A project's "what the assistant knows"*, *"Overlaps with …"*, *The Quality screen*, *Where a fact came from* (29), *A series page* (30), *A date move isn't news*, *Settings*, *Learning on screen*, *Action items and open questions, cleaned up*, *The app's own kit*, *Found by the phase A journeys*.
    - *Also covers* (the designer's lessons, 2026-10-19): *An unknown status stays unknown, and an add from a link says when nothing could read it* (design 6.19).
    - *Exit:* the tests each item names pass, and the browser test of every main screen at several widths shows no sideways scroll; the owner works through their own open items on a laptop and a phone.

6. **B-6b The rest of B: Today and the shell** (10 open items; built on 2026-10-20 apart from what each item says is left; size: about one to two days)
    - *Covers:* from *Wave 6* (phase B): *The Today rows as the mockup review set them*, *This week at every width*, *Notifications for "needs you" only*, *The walkthrough's look*, *An unnamed assistant reads as one*, *The header shows the assistant is alive*, *Words and accessibility throughout*; and the open items that fit this area: *After a move* (27), *Held for a look* (28), *Work*, *Setup guide*, *The rest* (Stages board, phone review mode, hand-in drawer, Ask as a side pane), *Review after the first Go*, *When something is due a follow-up*, *Top priorities, always current*, *Copy puts the formatted message and its plain text on the clipboard together*, *What the work version's screens show*.
    - *Exit:* phase B's exit test: the owner reviews every screen on a laptop and a phone; checklist items C1 to C53 and N1 to N8 are marked Done or explained (`docs/project/ui-review-status-2026-10-20.md`), with screenshots; the journey tests run against the new screens.

7. **UI gate: the UI/UX designer's re-review (done 2026-10-20: its feedback is recorded in `ui-rereview-2026-10-20.md`)** (0 open items)
    - *Covers:* *The UI/UX designer's re-review* (phase B, last group): once B-6b is pushed, the main session messages the session titled "UI/UX design review" with the commit to review and the list of UI changes since its last review (`docs/design/CHANGES.md`); it builds and reviews the screens itself. The ping carries what the reviewer asked for (2026-10-20): the branch and commit, the main session's own Done / Partial / Not done table for C1–C46 (each row citing its test, audited against the code by a subagent first), its bug list re-checked, and every place the build chose differently from the review, with why.
    - *Exit:* its feedback is received and recorded in one file in `docs/project/`.

8. **B-7 UI/UX feedback** (1 open item, with eleven of its thirteen sub-items checked off; size: about two days)
    - *Covers:* *Build the UI/UX designer's accepted feedback* (phase B, last group): the whole re-review of 2026-10-20 (`docs/project/ui-rereview-2026-10-20.md`), its demo data, and the owner's learning-run fixes from B-6b, in four briefs: records and item text (§3.2, §3.5) beside the learning fixes, then Today (§3.1, §3.4, §3.12, §3.14, §3.15) beside the rest of the P2s and tables (§3.3, §3.6–§3.11, §3.13), then the demo data.
    - *Exit:* each accepted item has its test, and the owner sees the changed screens.
    - *Then* (owner, 2026-10-20): once B-7 is pushed and green, the UI/UX reviewer gets the next round, and the paid 1.0
      plan on `claude/paid-1-0-plan` (`docs/project/business-model.md`, its P25) is merged into this branch and folded
      into the roadmap as P25 says.

9. **Gate week (owner)** (no items; the gate is written out in phase S; size: two measured days, then the counted week; *runs after S5, once the core is built*: owner, 2026-10-22, so batches 10 to 16 come first)
    - *Covers:* the owner's personal mail, at least one closed-lid night and one network drop; the owner writes down each promise they notice before looking at the assistant's list; two days are measured first and the thresholds set from what was seen, then the counted week. The testers are held to the thresholds this week sets for missed out of present, silent closes and wrong endings: those numbers come from real use, and per-tester thresholds would move the bar to fit. Counts that depend on how much mail a person gets are reported, not gated. The "Missed one" trend from week one to week two is the one measure only the testers have.
    - *Frozen:* What is measured is frozen during the counted week: Today, the promise lines, the prompts and the model choices don't change. Fixes found during the week go into `docs/project/gate-week-fixes.md` (created when the week starts) and land after it. The one exception is anything that loses a promise or closes one wrongly: it is fixed at once, and the day is noted in the week's log so the measures before and after it can be told apart.
    - *Exit:* pass or not on the owner's thresholds for the measures in design 6.32. The installers (I) start after it.

10. **S1b-1 The publisher and the guards** (1 open item; size: about a day)
    - *Covers:* *The publisher, brought forward from phase C4*; *Nothing on its own* (both in phase S, S1b); and the named S1b tests of the approval guards (designer's F7, `docs/project/designer-answers-2026-10-19.md`): a closed lid or lost network mid-send is checked with the service before any retry, an approval does not survive a restart that changed the draft's inputs, and the rest of that answer's list.
    - *Exit:* those tests pass; every outward act shows its exact content and target, nothing runs without the person's yes on that exact act, and the status and ledger line are written.

11. **S1b-2 Mail and calendar acts** (4 open items; size: about a day, with the mail add-on's builder)
    - *Covers:* *Mail*; *Calendar*; *Plugin API for acting* (all in S1b).
    - *Exit:* journey tests with fake mail and calendar services pass: an approved reply, a move or label, an invitation answer; the owner sees each act's exact content, its status and Undo where the service allows.

12. **S2 Time and attention** (6 open items; size: about a day)
    - *Covers:* *Repeating to-dos*, *What changed in an invitation*, *The morning brief* (and the evening wrap-up), *The Monday briefing, in the app* (moved here from phase B; it is the weekly form of the brief), *A capacity check on the day's priorities*, *An attention budget* (phase S, S2, and the B item for the briefing).
    - *Exit:* the engine tests each item names pass; the owner sees a brief built from a fictional day's changes, risks and yeses, and a "more than today holds" line on an overfull fictional day.

13. **S3 People and meetings** (2 open items; size: about half a day)
    - *Covers:* *Meeting prep and after-meeting capture*; *People memory* (S3).
    - *Exit:* journey tests: a fictional meeting shows its prep and files its notes; a person's line shows before a meeting and when a promised follow-up has gone quiet.

14. **S4 What arrives, and where it may go** (3 open items; size: about a day)
    - *Covers:* *Dates in documents*; *Areas of life*; *Capture from anywhere* (S4).
    - *Exit:* a fictional booking and bill become dated facts with proposed reminders; each area says which account reads it and whether anything leaves the computer; a forwarded item arrives.

15. **S5 Manner and proof** (3 open items; size: about a day)
    - *Covers:* *Gentle suggestions with choices*; *Talking to Reginald*; *The core reads as a daily assistant*; *The outcome, measured* (S5).
    - *Exit:* phase S's exit test: the Quality screen shows the outcome measures from the owner's measured week.

16. **I-1 Installers, name and icons** (16 open items; size: about two sessions, the old estimate for all of phase I)
    - *Covers:* every installer item of phase I: the CI build from a tag, install places, app-data places, opening the app, add-ons beside the app, updates, signing, *A name and icons*, *Nothing made-up ships*, *How it is built*, *Add-ons in an installed app*, the system vault, the *Exit test*; and *A launcher for people who never open a terminal* (phase B, moved here).
    - *Exit:* phase I's exit test on a clean Mac and a clean Windows machine: download, install, open, finish the walkthrough to the first result, quit, reopen with the data still there, update, uninstall with the data kept.

17. **I-2 The tester milestone and the website** (5 open items; size: about half a day, then the owner's decisions)
    - *Covers:* open promise P24: *the content brief for the website's session* and *keeping the website in step with releases* (phase I, "The website"); the tester invitation items: *the release build fills in its catalog and feedback addresses*, *Mail and calendar sign-in approval for testers and launch*; and the tester milestone paragraph at the top of phase I.
    - *Exit:* the first content brief is sent; a small invited group can install and connect mail, and the website says what to expect.

18. **Tester weeks (testers)** (no items; size: two calendar weeks)
    - *Covers:* the invited group uses the app on personal mail (or work mail with the employer's OK, risk R14) for two weeks, each tester bringing back what was missed through "Missed one". The testers are held to the thresholds the gate week set for missed out of present, silent closes and wrong endings; counts that depend on how much mail a person gets are reported, not gated.
    - *Exit:* the testers' "Missed one" counts fall from week one to week two, and the inherited thresholds hold.

19. **C0 The capability matrix, step 2 (refined when reached)** (4 open items; size: about 1.5 sessions, as C0 states)
    - *Covers:* the four items of C0 (phase C)
    - *Exit:* phase C's exit test, for the part C0 serves: work goes to the cheapest model whose measured scores hold.

20. **C1 The writing pack, installed and reviewed (refined when reached)** (6 open items; size: set when reached)
    - *Covers:* the items of C1 (phase C)
    - *Exit:* the pack installs from Add-ons with its libraries, and the owner's walkthrough on a fictional book is done.

21. **C4 What the packs need from the core (refined when reached)** (11 open items; size: set when reached)
    - *Covers:* the items of C4 (phase C): the file channel, shared-file writing, fact lookups, and the builders' question rounds
    - *Exit:* phase C's exit test: the writing pack takes a fictional manuscript from import to a built PDF and EPUB the owner approves, and a correction in the pack's own work teaches.

22. **C2 The project management pack (refined when reached)** (3 open items; size: set when reached)
    - *Covers:* the items of C2 (phase P)
    - *Exit:* phase P's exit test, for the plan, the schedule and what is late or at risk.

23. **C3 The publishing pack (refined when reached)** (4 open items; size: set when reached)
    - *Covers:* the items of C3 (phase P); C3b, the sales support pack, has no items and waits on its user's requirements
    - *Exit:* phase P's exit test, for the launch plan, listing sheet and prices and the hand-offs between packs.

24. **C3c Business analysis and systems architect packs (refined when reached)** (4 open items; size: set when reached)
    - *Covers:* the items of C3c (phase P)
    - *Exit:* each pack drafts what its role writes, works alone, and hands off through versioned interfaces.

25. **L-more The rest of learning (refined when reached)** (11 open items; size: about 4 sessions, as the phase states)
    - *Covers:* the items of phase L-more
    - *Exit:* each item's own test; it runs beside real use after the packs.

26. **D Owner validation and real use (refined when reached)** (4 open items; size: set when reached)
    - *Covers:* the items of phase D
    - *Exit:* phase D's exit test, which is the owner's own judgment on dates the owner sets.

27. **E The rest of version 1 (refined when reached)** (9 open items; size: set when reached)
    - *Covers:* the items of phase E
    - *Exit:* each item's named test, in the order phase E gives (what protects real data first).

28. **Publish 1.0** (3 open items; size: set when reached)
    - *Covers:* the three release mechanics of the section "Publish 1.0"
    - *Exit:* the private workspace's self-check passes, the fresh repository exists, and the README and docs match what 1.0 does.

## Owner actions on the critical path

Things only the owner can do, usually because they need the owner's own computer or accounts. Each says exactly what it
blocks; everything else goes ahead without it.

| # | Action | Needs | Blocks | Does not block |
|---|---|---|---|---|
| O1 | **Done 2026-10-14** (`docs/project/evals/2026-10-14-before-agent.json`: 42 of 42 passed on the owner's one account, a command-line agent). **The "before" run of the golden set** on real models: today's 14 cases × 3 runs, on a low-cost and a stronger account, with today's scoring. Steps below. | The owner's computer, with their AI accounts | Only L4's last step: the "after" report and its comparison with this one. That report also has to exist before real use starts. | All of phase A, and L-core's code, including the harder set itself. The run is pinned to commit `802538e`, so changing the cases, the scoring or the packet afterwards doesn't spoil it. |
| O2 | **Done 2026-10-14** (`docs/project/evals/2026-10-14-before-harder-agent.json`: 30 of 48 as scored at `feb6b3f`, 48 of 48 once six cases were corrected; every failure was an extra op the case hadn't allowed). **The harder set's "before" run** (the original designer's L1 check-in, 2026-10-14): the harder set (below, "L1b") on the owner's account, 3 runs per case, pinned to the commit that adds it, which is the last commit before any L2 code. The report records the agent's program version, and says plainly when every tier ran on the same account, so the run says nothing about a low-cost tier against a stronger one. Steps below, once the set lands. | The owner's computer, with their AI accounts | L4's comparison, which rests on this set. | L2's build: the run is pinned, so it can be made any time; L2 code only lands after the pinned commit. |
| O3 | **First run made 2026-10-20 (the results and the fixes are under "Found by the owner's first real use", B-6b); left: the owner re-runs the failed cases with `--case-failed` after batch B-7.** **One run of the learning tests, at the end of batch S1-1:** the golden set, the harder set, the existing learning pairs and the twenty promise pairs, on the owner's account, 3 runs per case, on the commit that S1-1 pushes. Compared case by case with O1 and O2. It costs the owner's AI allowance once, and it gives the gate week a clean "before". Steps below. | The owner's computer, with the account used for O1 and O2 | The gate week's start, and real use: the comparison has to exist before either starts. | Phase B, which goes ahead meanwhile. |

| M5 | **Before the free core release:** make the working repository private and publish the open core from it as a fresh public repository at each release; first, a session lists what in `docs/project/` and the design is the owner's own business, and the owner decides what the public core carries (`business-model.md`) | The owner's GitHub account | The free core release (I-3) | Everything before phase I |
| M6 | **Before the free core release:** the website's pages for it: download, privacy policy, terms (open promise P24; I-2) | The website's session | The free core release (I-3) | Everything before phase I |
| M0 | **Before anything is sold:** read the intellectual-property and outside-business clauses of every employment or contractor agreement, or a short consult; R9 is reopened until then | The owner's agreements | Phase T (Thimbleby+) | The free core release |
| M1 | Ask Google whether a local app sending mail to the person's own AI account is in scope of the yearly assessment (CASA), and what its user-data policy requires for AI processing; get an assessor's quote | A Google account for the app | Phase T's one-click Gmail sign-in, and the price | The free core: it connects Gmail through the person's own registration |
| M2 | Microsoft publisher verification for the add-on's registration | The website and its privacy policy | Phase T's one-click Outlook sign-in | The free core |
| M3 | Signing: Apple's developer programme and Windows signing (about $219 a year) | Payment | Selling (phase T) | The free core and testers ("unsigned to start", 2026-10-17) |
| M4 | A payment service that is the merchant of record, issuing the licences | M0 | Phase T's licence | The free core |

**O3 steps** (on the commit that batch S1-1 pushes; the message that asks for the run names it). Earlier attempts at the
"after" run, and the fixes they led to, are in `roadmap-done.md` and `decisions.md` (2026-10-15). In the owner's copy of
the repository, on their own computer, on the workspace and account used for O2:
```
git fetch origin claude/tender-tesla-16a8ob
git worktree add ../cockpit-after FETCH_HEAD
cd ../cockpit-after
uv sync
uv run cockpit ai test -w ~/cockpit-exit
uv run cockpit evaluate --from workspaces/demo-b -w ~/cockpit-exit --account "<the account used for O2>" --runs 3 --json > ~/after.json
uv run cockpit evaluate --from workspaces/demo-a -w ~/cockpit-exit --account "<the account used for O2>" --runs 3 --json > ~/after-harder.json
uv run cockpit evaluate --pairs --from workspaces/demo-b -w ~/cockpit-exit --account "<the account used for O2>" --runs 3 --json > ~/after-pairs.json
uv run cockpit evaluate --pairs --from workspaces/demo-a -w ~/cockpit-exit --account "<the account used for O2>" --runs 3 --json > ~/after-pairs-harder.json
```
- **Check the commit:** `git log -1 --format=%h` in `../cockpit-after` must show the commit the message names.
- **First:** `ai test` should end with every tier able to run, on its main account or a backup that stands in; stop
  there if a tier can't run. Paste the lines exactly as written: a
  `<…>` placeholder or a trailing `# note` breaks the whole paste in zsh.
- **Cost:** about 430 small runs in all on the one account before the promise pairs: 81 and 60 for the two sets (27 and
  20 cases × 3), and about 280 for the pairs (30 pairs and the day-30 scenario, each about three calls, × 3); the twenty
  promise pairs add about 180. On a subscription agent it is
  usage, and a long run may pause at the plan's limit and carry on. Run the commands one at a time if you'd rather see
  each report first.
- **What it shows:** each report ends with a pass rate per case and an overall line. The first two cover O1's and O2's
  cases plus the ones added since (those have no "before" number). A pair passes only when the later input comes out
  right with the correction not repeated, and a negative pair passes only when its later input is unchanged. A pair
  that fails names what the later run was given, so a gap in learning shows which knowledge didn't reach it.
- **Saving the report:** `--out <file>` saves the report after every case, so a run that stops part way leaves what it
  finished. If the main account's allowance runs out, the pair commands run on the backup account, and the report names it.
- **Keep the computer awake:** start each command with `caffeinate -i` on a Mac. A run frozen by sleep can take many
  minutes to recover, since each call waits up to 90 seconds before giving up.
- **Then:** send the four files (in your home folder) to the session. It checks them for account names or addresses, writes the comparison
  with O1 and O2 in `docs/project/evals/`, and turns any failing pair into a fix with its test before the gate week starts.
  After that, `git worktree remove ../cockpit-after`.

## The plugin API's road to 1.0

The pack builders plan against this table (owner, 2026-10-13). The contract stays `docs/plugin-guide.md`, generated from
the code; each version's changes are in `docs/plugin-api-0.x.md`; builders hear of each change in the weekly round.
Within 0.3 every change is additive: a pack built for an earlier 0.3 version keeps working, and manifests keep
`plugin_api: '>=0.3,<0.4'`. A minor version (0.4) may break, and is announced a round ahead with what to change.

| When (phase) | What the plugin API gains | Version | Breaks anything? |
|---|---|---|---|
| B | Nothing planned: panels, Today lines and jobs keep their contract through the redesign | none | No |
| C1, then P (C2, C3) | What the packs' builders ask for, answered in the weekly round (round 39: a conversation on a record, context-sized task kinds, data-form previews, a pack's value on a request, computed-column headings); interfaces between packs (such as `pm/schedule@1`) belong to the packs | 0.3.x | No |
| C4 | The publisher and the file channel for a pack's outputs, fact lookups from configured sources, and a kind of author for edits made outside the app in a shared folder. Whether a pack's "send" changes shape is decided here; if it does, this is 0.4 | 0.3.x or 0.4 | Only if 0.4, announced a round ahead |
| D | Frozen: no new names, only fixes, anything deprecated removed | 0.9 | Removals only, listed a round ahead |
| Publish 1.0 | 1.0 once the writing pack and the project management pack run on it unchanged through phase D's week of real use | 1.0 | No |

At the estimates below, the packs can count on: the L-core additions in about 9 sessions, a stable contract for the
redesign (4 sessions), the publisher and fact lookups at the end of phase C (about 9 sessions more), and the freeze at
the start of phase D. Dates are recorded here as each phase starts.

## Phase B: finish the UI/UX redesign

The note box on action buttons, the header's "alive" line, on hold isn't due, the follow-up rule and the "where it came
from" link are built for real use at the end of L-core ("Ready for real use"); phase B gives them their final layout.

The design is in Part 7 (7.7, 7.12–7.14); the foundation and shell are built.

**Where phase B stands (2026-10-28).** Waves 1 to 6 are built, and so is every defect the outside reviews found
(roadmap-done.md, "Phase B"); the UI/UX designer's re-review is done and recorded (UI gate), B-7, B-8 and B-9 are built, and
phase U's reviews of the whole app are built and validated (see phase U below). Each open item below says what is built and
what is left; what remains is mostly the owner's own checks and re-run (B-5, B-6a, B-10) and the AI account items (B-11).

From the three outside reviews of 2026-10-18 (`docs/project/incoming/reviews-2026-10-18/`); their defects are fixed
(roadmap-done.md), and this one was for the owner to decide (decided 2026-10-19, below):

3. **Plan changes proposed, for the owner to decide** (product review): the tester cohort as a roadmap milestone with
   exit numbers; a real-mail acceptance gate at S1 (the owner's mailbox, one week, the promise workflow whole, a
   miss and false-alarm rate the owner accepts); numbers for "dependable" before S's later waves; later steward
   capabilities held behind a dependable promise workflow; the risks register rewritten for the steward product;
   a policy for older mail at first run; a named S1b test of the approval guards against hostile input; the
   walkthrough reworked for the new audience; Today judged by the next action being obvious; a visible coverage
   line (what was read, when, and what wasn't) so "nothing needs you" never looks like "couldn't check"; a cheap way
   to add a missed promise, with omissions measured.

**Owner decisions from the reviews (decided 2026-10-19 to 2026-10-26, `docs/decisions.md`):** the product review's plan
changes above (the owner's review of the batched plan and calls on the designer's plan points, 2026-10-19); the publisher's
acceptance tests are built (stale approvals, a retry never sending twice, an uncertain answer never shown as sent, a withdrawn
sign-in, outside content that tries to change a recipient: `tests/test_publisher.py`); the installers ship the mail and calendar
add-ons ready to sign in (decided 2026-10-20, the I-1 item). **Still waiting for the owner's yes:** the numeric thresholds for
"dependable" (the gate week's pass bar, P65, drafted in `docs/project/gate-pass-bar-draft-2026-10-28.md`), measured with
denominators and a held-out set, with omissions found by an independent reading of a consented sample (built, A3).

**The waves left** (waves 1 to 4 are in roadmap-done.md):

3. [B-5] **Wave 5, sources and accounts:** open promise P17 (.ics calendars, full featured: a pasted link, a file on disk,
   invitations as calendar entries, repeating events expanded, Outlook time zones, attendees) and P18 (several accounts
   of one service at once, each source picking its account; a plugin API change told to the mail add-on's builder).
   P16's leftovers too: an add-on's own secrets and the backup key typed on the screen.
   *P17 built (B-5):* a link or a file on this computer, repeats expanded, invitations, Outlook zones, attendees, a
   changed or cancelled date on its own entry, a promise due at it following and listed in Since yesterday
   (`tests/test_ics_full.py`). Left of P17: an invitation attached to a mail, and a hosted app's upload instead of a file.
   *P18 built (B-5):* tokens kept per account, the old single file migrated, each source reading as its account (a
   list on its form), signing one account out pausing only its sources, sources a new account starts reading as it,
   `context.account` (plugin API 0.3.82) (`tests/test_sign_in_accounts.py`, `web/src/components/SignIns.test.tsx`,
   `web/src/components/Sources.test.tsx`). Left of P18: the note to the mail add-on's builder (drafted at the end of
   `plugin-answers-34-48.md`, sent with the weekly plugin round), a renewal warning for an account other than the
   first, and the "not reading" line and setup step per account. *P16's leftovers built:* see the checked P16 item.
4. [B-6a, B-6b] **Wave 6, the rest:** (also the designer's F12 and F13, 2026-10-19: a refused form refreshes the untouched fields and
   lists what changed underneath; kept secrets nothing refers to are removed after 30 days or with their source, never
   while an Undo points at one; and open promise P26: a to-do tied to the question it waits on, the nudge's
   answered-and-left-out list, the suggested escalation after a second follow-up) Top priorities, the Stages board, the phone review mode, the hand-in drawer, Ask as a side pane,
   the Quality screen, a project's "what the assistant knows", the work screens as list and detail, blocked actions, Copy
   with formatting, the action and question clean-up, lists not typing everywhere, the cursor in the first field, and
   checklist C1–C46 with screenshots. (The Monday briefing moved to phase S1; the launcher moved to phase I.)

Waiting on the owner: whether a Follow-ups table's action links should go to the project's pages (built that way in wave 2);
signing for the installers (phase I).

**Exit test:** the owner reviews every screen on a laptop and a phone. Checklist items C1–C46 of
`reviews/ui-ux-2026-10/` are marked Done or explained, with screenshots in `reviews/ui-ux-2026-10/after/`. The re-review
added C47–C53 and the first-run review N1–N8 (`reviews/ui-ux-2026-10/rereview-c8f8e18/README.md` §5,
`reviews/ui-ux-2026-10/first-run/README.md`); the build's status for all of them is in
`docs/project/ui-review-status-2026-10-20.md`.

From L3 (design 7.18):

From the UI designer's answers to questions 25 to 32 (2026-10-16; `reviews/ui-ux-2026-10/answers-25-32.md`, mockups in
`reviews/ui-ux-2026-10/mockup-round-25-32/`; each answer has its layout, exact wording, edge cases and the test for done):
- [ ] [B-6b] **28 Held for a look**: the action as a question, reason and evidence first, the primary button names the result,
  the other answer a visible button.
  *Built (wave 4):* `tests/test_held_ask.py`, `TodayRecords.test.tsx`. *Built (audit A5):* "Drop it and draft the note" (`tests/test_drop_and_draft_note.py`, `web/src/components/TodayRecords.test.tsx`).
  *Left:* a note box on "Keep it open" (design 7.6 says "Not built"); nothing else of this item.

From the original designer's lessons of 2026-10-14:
- [x] [B-6b] **Work:** What changed and Follow-ups as list | detail, with a "to send" marker on each action row (from L0).
  Sources shows on a source's row when its mail couldn't be sorted and why (from L0). Waiting to go out is a designed screen with its empty
  state.
  *Built (B-6b):* the "To send" marker on an open action's row in What changed and in To-dos and questions
  (`tests/test_to_send_marker.py`, `web/src/components/OpenItems.test.tsx`, `web/src/components/WhatChanged.test.tsx`); a
  source's row saying why some of its mail wasn't sorted (`tests/test_mail_sorting.py`,
  `web/src/components/Sources.test.tsx`); Waiting to go out as a designed empty state
  (`web/src/components/WaitingToGoOut.test.tsx`). *Built (list | detail):* What changed and Follow-ups
  as one line per change or person with the chosen one's detail beside the list (a drawer below 1024px), the first (or the one
  asking a question) chosen as the list opens beside it, Up and Down moving the choice, Enter into the detail and Escape back
  to the line, every button and menu item of an open row in the detail
  (`web/src/components/WhatChangedListDetail.test.tsx`, `web/src/components/FollowUpsListDetail.test.tsx`,
  `web/src/components/WhatChanged.test.tsx`, `web/src/components/WhatChangedFold.test.tsx`,
  `web/src/components/FollowUps.test.tsx`). The browser tests on the new layout pass at `a79141c` (`acceptance.spec.ts`, `late-evening.spec.ts`,
  `journeys.spec.ts`, `panes.spec.ts` with both phone review modes setting up their own item instead of skipping,
  `shell.spec.ts`, `layout.spec.ts`, `a11y.spec.ts`). A To send line shows the count without an age, because the server
  holds none for a message not yet sent (the design asks for none).
- [x] [B-6a] **Settings:** nav | form | help, save bar or autosave with Undo, "Changed · Reset", and pickers for time zone,
  language, money and dates. Appearance has the contrast warning; admin sections sit inside Settings.
  *Built (wave 3):* nav, saved as made with Undo, "Changed · Reset", help beside the field, `Settings.test.tsx`, `shell.spec.ts`. Left: the contrast warning in Appearance and the pickers for money and dates, to check and finish in wave 6.
  *Built (B-6a):* the contrast warning in Appearance and the date-format list (`web/src/lib/theme.test.ts`,
  `web/src/components/Settings.test.tsx`). *Not built, by decision:* a money list: the functional designer answered that amounts are US dollars, labeled plainly, for 1.0 (design 7.9,
  change log 174), because every cost is an AI service's price in dollars and the app has no exchange rates; a currency
  setting waits for that (checklist C29, kept open in A4).
- [x] [B-6b] **The header shows the assistant is alive** (the original designer's lessons from running, 2026-10-13): one short line, always ("The assistant ✓ last run 9:42", the
  account's own label, never a model's name), with today's runs per account, what's queued and the fallback order in its
  tooltip; amber or red when something is wrong. The held-work and paused lines cover the bad case; this covers "is it
  alive?". The header is two rows when it needs them (title, views and primary buttons on top; status and the person's
  links small below), tested at about 1,000 px wide. (The line and the two-row header below 1280px are built under "Ready
  for real use"; what is left here is the final layout and a browser check of the header at about 1,000 px wide.)
  *Changed (B-7, `docs/decisions.md`, 2026-10-20):* the header is one row at every width; below 1440px the assistant's
  state is a section of the status chip's popover.
  *Built (B-6b, B-7):* the final layout, one row with the alive line beside the status chip from 1440px and in the chip's
  popover below it (`web/src/shell/Header.test.tsx`: "the assistant's alive line is in the header beside the status
  chip", "below 1440px the assistant's state moves into the status chip's popover, as on the phone, and the line beside
  the chip is gone"), and in a browser at 800, 1000, 1100, 1200 and 1300px (`web/e2e/shell.spec.ts`: "at 1000px the
  header is one row, with every control inside the window and the assistant's state in the status chip", passing at
  `9c0f76e`), with a long assistant line beside the chip at 1440px ("the header never wraps, with plugin panels
  present").
- [x] [B-6b] **The rest:** the Stages board, the phone review mode, the hand-in drawer, Ask as a side pane on wide screens.
  *Built (B-6b):* the stages board (`web/src/components/StagesBoard.test.tsx`, `tests/test_stage_cards.py`), the hand-in as a
  drawer and Ask as a pane from 1440px (`web/src/components/AskPane.test.tsx`), and the phone's review mode on What
  changed (`web/src/components/WhatChanged.test.tsx`: "review mode on a phone"). The same mode for Follow-ups' messages to send, one person at a time
  with the message's own Copy and Mark sent and Next in the bar (`web/src/components/FollowUpsListDetail.test.tsx`: "review mode
  on a phone"). The review-mode browser tests no longer skip: each hands in its own item (`web/e2e/panes.spec.ts`, which
  has run in the full run since; What changed has no phone review mode now, it is the history, change log 229).
  *Not a separate screen any more:* Waiting to go out is the To send tab of Follow-ups, with its review mode (change log 229).
- [ ] [B-6b] **Review after the first Go** (found by journey J2): What changed shows "5 new · Show" with Needs attention
  empty while Needs you counts 5, and only one review opens by default, so an owner question can sit closed. The
  Today redesign makes the first results one clear list. After Remove, the add-on's row vanishes along with its note.
  *Built (B-6b):* the first results as one list, every open question open (`web/src/components/WhatChanged.test.tsx`).
  *Left:* the removed add-on's row and note going together (after Remove the row stays and says "<name> is removed.
  Restart to finish." (`web/src/components/Addons.test.tsx`); whether the row also goes from the list was not checked
  in a browser).
- [ ] [I-1] **A launcher for people who never open a terminal** (owner, 2026-10-13): moved to phase I, where the macOS and
  Windows installers give the app icon and Start menu entry.
  The UI/UX reviewer's first-run review (2026-10-20, F1, `reviews/ui-ux-2026-10/first-run/`) sets the bar N1: a person who
  has never used a terminal installs and opens the app from a downloaded file, before any non-technical tester.
- [ ] [I-1] **Mail and calendar connect with a sign-in on a fresh install** (the first-run review's F3 and N2): Gmail or
  Microsoft 365 connects with a sign-in, with no add-on screen, restart or server setting on the person's path; "Other
  email" fills the server from the address; server, port and secret settings under Advanced in plain words; the
  unverified-app warning explained where it appears. *Decided (owner, 2026-10-20: "anything that makes a non technical
  user life easier"), narrowed the same day (core first):* the installer ships the mail and calendar add-ons installed
  and turned on, **ready to set up**: their tiles are on the setup step from the first start, and they connect through a
  registration the person makes with plain numbered steps (Gmail's set to "In production"), or for other mail an app
  password over IMAP. Gmail's app passwords aren't counted on (password sign-in ended for Workspace accounts; personal
  Gmail unconfirmed, `business-model-delta-gmail-later.md`): the owner's live check says whether the steps may offer
  them second, so the Gmail steps are written as the app's best walkthrough, a screenshot per step. One-click sign-in through the add-on's own registration is Thimbleby+ (phase T), since it needs Google's yearly
  assessment. To be built as a generic feature (nothing of it exists in the code yet: no bundling step or setting): the release build
  bundles the add-on packages a repository variable lists (as the catalog and feedback addresses are filled in), installs them with the app
  and turns them on in a new workspace with no restart; this repository names none of them. The add-ons stay in their
  own repository and release there.
- [ ] [B-5] **Add-ons install from the screen** (P15; owner, 2026-10-16: "they still require manual command line installs
  instead of through the screen. the screen lists zero available plugins"). *Built:* with no catalog listed Add-ons
  offers an address field (the cursor in it) that saves into `workspace.plugins.catalog.feeds` and reads it at once; the
  catalog list adds another and takes away one the person added; an install refused for want of a read token asks for it
  in place (typed and kept as in P16 on a local app, a reference on a hosted one), then Install can be pressed again;
  the plugin guide's "Publishing a pack" says to attach the built wheel to the tagged release and give its address and
  SHA-256 in `release` (`tests/test_catalog_screen.py`, `web/src/components/Addons.test.tsx` (adding a catalog from the
  screen, a read token for a private release)). The mail add-on's builder was told to attach its package and give `release` (2026-10-22). *Left:* an install tried against a
  real private release host by the owner.
- [ ] [B-6a] **Action items and open questions, cleaned up end to end** (owner, 2026-10-13: "the whole action items / open
  issues needs a lot of work"). Starts from L0's audit of design 6.8 to 6.11 against the code, so the list of what is
  wrong comes from the code, not memory. Then one place for each: every open action with its owner, due date, project
  and where it came from; every open question with who it's waiting on and since when. Filter by project, person and
  state; edit, close and reassign from the row, with Undo; duplicates offered for merging; anything stale or with no
  owner surfaced on Today. From the original designer's review (2026-10-13): "where it came from" is a link that opens
  the source, not a label (the original page if the source has one, else the input's saved text or its registered
  summary, else the change that made the item with the request behind it; provenance is already in the ledger);
  **on hold isn't due** (built for real use, L-core; B gives the layout; the original designer's lessons from running, 2026-10-13): a held action is out of due and overdue everywhere (Today, counts, reports, the weekly
  review), shows "on hold" with its old date in a tooltip and names what it waits for, and when the input that ends the
  hold arrives the assistant takes it off hold and gives it a new date in the same change (a status value's `meaning`,
  with `held` ranked below open and never due); a note box on every action button (the helper and the routes are built, L0: the screens send no note yet), so a note typed on any action button reaches the assistant; each row carries its project (and
  parent project) tag, with its notes on hover; actions are worded to stand on their own (a playbook rule and a lint
  on the assistant's wording); and the follow-up rule above (built for real use; B gives the layout). Exit check: the owner works through their own open items on a laptop and a phone.
  *Built (B-6a):* To-dos and questions under Work, with filters, edit, reassign, merge, hold and drop from the row with
  Undo; stale and no-owner lines on Today; a note box on every action button; the action-stands-alone lint
  (`tests/test_open_items.py`, `tests/test_action_stands_alone.py`, `web/src/components/OpenItems.test.tsx`,
  `web/src/components/NoteBoxEverywhere.test.tsx`); notes and the parent project tag on Follow-ups asks and Today lines, and
  Reassign on Waiting-on-them asks (`tests/test_action_row_details.py`, `web/src/components/FollowUps.test.tsx`,
  `web/src/components/Today.test.tsx`); To-dos and questions show notes as a second line on a phone too
  (`web/src/components/OpenItems.tsx` uses the same `NotesTitle`). *Left:* the owner's exit check on a laptop and a phone;
  and on a phone, Today's lines that open no detail (a reminder, a reply) reach their notes only through a screen reader,
  since Today's lines keep one line each (B-8 R3).
- [x] [B-6b] **Copy puts the formatted message and its plain text on the clipboard together** (owner, 2026-10-13: the work
  version opens a generated page with a copy button; decided on review, design 7.5): the preview on screen is what is
  pasted, mail and documents get the formatting, chat gets clean plain text, and the menu has Copy as plain text. Every
  Copy in the app uses it (questions, follow-ups, the briefing, reports). A browser test pastes both versions and checks
  the formatted one escapes every piece of text.
  *Built (B-6b):* one helper, `web/src/lib/copy.ts`, used by every place the app copies (the preview is what is pasted,
  formatted and plain together, "Copy as plain text" in the menu, every piece of text escaped, a refused copy selects the
  text) (`web/src/lib/copy.test.ts`, `web/src/components/FollowUps.test.tsx`). The browser test that pastes both
  versions passes at `0ce2108` (`web/e2e/acceptance.spec.ts`, "3d. Copy puts the formatted message and its plain text on
  the clipboard together…"), so nothing is left.
- [ ] [S2] **The Monday briefing, in the app** (owner, 2026-10-13: the work version has "monday briefings"). *Moved to phase
  S1 (2026-10-17), as the weekly form of the morning brief; the description below stands.* On the first
  open of the week (the day is a setting), a briefing in this order (the designer's notes, 2026-10-19; design 6.35):
  a copy-ready message to whoever the person reports to (stance *I report to them*, 6.34; a draft under the draft
  rules, with its estimate); "this week" through the last working day: promises due by owner with overdue first,
  questions to send, answers to chase, decisions waiting, built from the records by rules; and three to five goals the
  person confirms, kept for the week. Nothing already on Today is repeated. Sending it to the person is phase E.
  **Built so far (S2):** the form on its day (`steward.brief.weekly_day`), offered beside the morning brief on the later
  working days until the goals are confirmed, with the week's promises by owner, questions to send, answers to chase
  and decisions waiting, what Today holds counted and not repeated, the three to five goals (a `week_plan` record: proposed
  from what is due, confirmed or changed by the person, kept for the week, read by the morning brief) and the message
  to whoever the person reports to as a draft of the core kind `monday-message` (estimated, held for the go, unreviewed
  until Copy) (`tests/test_brief.py`, `tests/test_brief_week.py`, `web/src/components/BriefCard.test.tsx`). **Built (cleanup batch):** Send beside Copy when an account can act, drafting the message as an act through
  `POST /api/acts` for the person's yes (`tests/test_act_draft_api.py`, `web/src/components/BriefCard.test.tsx`).
  **Built (audit A5):** asking once who the message is for when nobody is marked (`tests/test_brief.py`, `tests/test_brief_week.py`, `web/src/components/BriefCard.test.tsx`).
- [ ] [B-6b] **What the work version's screens show** (owner's screens, 2026-10-13; the screens hold real names, so only
  what they do is written here). *Built (B-6b), checked off in `roadmap-done.md`:* Follow-ups by person, or by project;
  Projects at a glance; links to the person's own pages; a meeting added in one line; never raw data on screen. Two
  sub-items are open:
  - [ ] **The hand-in takes a pasted screenshot** as well as text and files. Check first what the drawer does today.
    *Built:* the check of what it does today: a pasted picture is told plainly it can't be read yet, and the box keeps
    its words (`web/src/components/HandIn.test.tsx`). *Left:* reading a picture.
- [x] [B-6b] **The walkthrough's look** (owner, 2026-10-12: "this looks rough"):
  - fields sized to what they hold, not the full page width;
  - one clear primary button per screen ("Save and continue"), with Skip as a quiet link;
  - the step list without "Not done yet" on every row;
  - the current step marked as "you are here", not styled like a focused button (owner: it read as focus). The
    cursor already starts in the screen's first field (`Walkthrough.test.tsx`);
  - the page using its width.

  It goes through the redesign's components and screenshots like every other screen.
  *Built (B-6b, B-7):* the step list without "Not done yet" (only done and skipped are marked), "You are here" on the
  current step with a bar and no fill, one primary on every screen (Continue; "Save and continue" on You) with "I'll do
  this later" or Skip beside it, and the cursor in the first field (`web/src/components/Walkthrough.test.tsx`, "the
  look"). The fields sized to what they hold and the page using its width pass in a browser after B-7's buttons
  (`web/e2e/panes.spec.ts`, "the walkthrough's look", at `0ce2108`), so nothing is left.
- [ ] [B-6b] **Notifications for "needs you" only** (7.19): opt-in, the Decide group's items, quiet hours. The targets are
  notification channels the phone already receives anywhere: the browser, mail to the person themselves, or a webhook
  (chat app or push topic). Each is checked with "Send me a test" and sends only to the person, a count by default.
  *Built (B-6b):* opt-in and off by default (`ui.notifications`); one notice, a count and never what an item is about, when
  an item enters Today's Decide group that the person has not been told about; quiet hours that hold it; a failed note
  tried again with the reason in Settings; the browser's own notification and a webhook (the person's own address kept
  as a secret reference), each with "Send me a test" (`tests/test_notifications.py`,
  `web/src/components/Notifications.test.tsx`). *Left:* mail to the person themselves: mail sending is built, but a notice goes without a click on each one, which the
  act approval guard allows only for a reminder under a standing yes, so a notice needs a standing yes of its own there
  (a change to a trust boundary, for the main session; design 6.12); and titles for an allowed data level (`detail`,
  `allowed_data`).
- [ ] [B-6b] **Found by the owner's first real use (2026-10-20):**
  - adding a second AI account closes its form once saved; the account's row shows its checks as they run ("Checking for
    harder work…") and the outcome, and an account whose sign-in can't be told apart says so with "Use it anyway"
    (the screenshot: "Adding…" held for minutes while the checks ran);
    *Built (B-6b):* `web/src/components/AccountChecks.test.tsx`, `web/src/components/WelcomeAiDrawer.test.tsx`;
  - a plain calendar entry is filed by rule with no AI run and no Review line, if the designer agrees (question F20);
    *Built (B-7):* the designer agreed (F20) and nobody else invited, no description and no promise's date makes an entry
    plain (`tests/test_plain_calendar_entries.py`);
  - the two follow-up settings (`steward.chase_*_days` and `ui.followups.*_days`) become one, with the impact noted;
    *Built (cleanup batch):* one family, `ui.followups.*`: the promise lines read the same dated and undated days as the
    follow-ups; `steward.chase_dated_days` and `steward.chase_undated_days` are read for one release from a file, an
    environment variable or a flag, noted on the setting's row, and saving the new name removes the old one
    (`tests/test_followup_timing_family.py`);
  - the toast-at-390px and the Today-cursor browser tests are made robust under load (each failed once under load and
    passed alone);
    *Built:* both tests are rewritten (`web/e2e/shell.spec.ts`: "with three toasts showing, Tab never leaves a control
    under them at 390px" and "Today opens with the cursor in its first field…") and pass in the full run at `0ce2108`.
  - **date words the rules can't read** (the owner's learning run, 2026-10-20: 6 of 11 misses): `engine/due_phrases.py`
    reads "the 25th", "by the 30th", "due Oct 22" and their kin, and words it still can't read keep the model's own
    date marked to check instead of dropping it; the case `quoted-thread-action-exists` expects the move held for Keep
    that the designer's correction set (2026-10-19), not a direct date change;
    *Built (B-7):* `tests/test_due_phrases.py`, `tests/test_promises.py`, `tests/test_learning_run_b7.py`;
  - **the rest of the owner's learning run (2026-10-20; 81% of 214, 79% harder, 53% pairs, 30% harder pairs; one run
    per case). About 7 cases that passed in O2 now fail: a regression from S1-1 (date words override the date and an
    unread phrase drops it; one promise per owner splits a shared task, which older cases still expect as one):** a
    condition ("once the keys arrive", "after the workshop") goes in the promise's due words (8 misses); a reply that
    doesn't answer is `action.news` (7 misses); the date reader takes a leading "on" or "due" and ordinals (about 8);
    then the owner re-runs the failed cases with `--case-failed`. Built in batch B-7 (owner, 2026-10-20: "include the
    ai fixes").
    *Built (B-7):* a condition keeps its words as the due words with no date
    (`tests/test_promises.py::test_a_condition_keeps_its_words_and_has_no_date_even_when_the_model_gave_one`), a reply
    that doesn't answer is news and never an ending, and the date reader takes a leading "on" or "due" and ordinals
    (`tests/test_learning_run_b7.py`, `tests/test_due_phrases.py`). *Left:* the owner's re-run of the failed cases with
    `--case-failed` on the commit that batch B-7 pushes, which is this item's acceptance; and the split of a shared
    task into one promise per owner, which no recorded fix covers (check it on that re-run);
  - `cockpit evaluate` waits for the network as the app's own runs do (a lost network uses up no try and fails no case),
    and the pair harness's practice copies never hold the main account as an unchecked backup (fixed:
    `tests/test_catch_up_learning.py::test_the_main_account_listed_again_as_its_own_backup_is_never_held_as_an_unchecked_backup`);
    *Built (B-7):* the wait (`tests/test_evaluate_network.py`).

The journey tests from A3 run against the new screens as they land.

From the owner (2026-10-19), after phase B's screens and before the gate week:
- [ ] [B-7] **Build the UI/UX designer's accepted feedback** (owner, 2026-10-19): the feedback the owner accepts from that
  re-review is built before the gate week, each item with its test. *Received 2026-10-20 and accepted in full*
  (`docs/project/ui-rereview-2026-10-20.md`; the review's sections are cited as §3.x; choices in `docs/decisions.md`,
  2026-10-20). Each sub-item is done when its test passes. *Built (2026-10-20), checked off in `roadmap-done.md`:* the record pages and every view saying names, dates and words, Today's first screen, the tables beside the detail pane, the P2 findings; no
  bookkeeping in item text; one row per thing; demo data for answers 27 to 31; first run for a person with no IT
  background; the functional designer's answers to F15 to F25; "Mark this closed" isn't "done"; outward material never
  names the assistant. What is left:
  - **The reviewer's further feedback** (owner, 2026-10-20: "provide the UI/UX agent the next batch when you can because
    it already has more feedback"): received (`reviews/ui-ux-2026-10/first-run/`; built in "First run for a person with no
    IT background", checked off in `roadmap-done.md`). *Left:* when B-7 is pushed and green, the reviewer gets the commit,
    the status for C1–C53 and N1–N8 (`docs/project/ui-review-status-2026-10-20.md`) and every place the build chose
    differently.
  - **The learning-run fixes** (owner, 2026-10-20: built in this batch): the B-6b items "date words the rules can't
    read" and "the rest of the owner's learning run", then the owner re-runs the failed cases with `--case-failed`.
    *Built:* the fixes, each with its test (see "Found by the owner's first real use", B-6b). *Left:* the owner's re-run
    of the failed cases, which is this sub-item's acceptance, and its result.

- [x] [B-8] **Build the UI/UX designer's review of batch B-7** (received 2026-10-20 at `46cc3ea`,
  `reviews/ui-ux-2026-10/rereview-46cc3ea/README.md`; the owner's standing answer, 2026-10-20: "give them what they
  want"). B-7's six deliberate differences were accepted; F25's yes is accepted on two conditions, which are built here.
  Each sub-item is done when its test passes:
  - R1: no record id in any title the person reads (Today, its inspector, What changed, Follow-ups): a line is titled by
    its item ("Drop 'Settle the endpaper color'?"); an id in a title is refused as an invariant, and the sweep reaches
    those screens (check C54). **Built (wave 1):** `tests/test_titles_without_ids.py` (labels by title, the kind in words
    when there is none, a held and a review line, the invariant, the sweep of an old label and of a stored title with Undo),
    `web/src/components/TodayRecords.test.tsx` ("no line of Today shows an id"), `web/e2e/shell.spec.ts` ("no Today line,
    inspector heading or What changed title holds an internal id": passing at `9c0f76e`), and the web sweep draws
    What changed and Follow-ups from data (`web/src/components/ViewSweep.test.tsx`), so nothing is left;
  - R2: a held line is asked as a question ("Close 'Send two spine options'?") with the same two result buttons in the
    line and the inspector ("Close it", "Keep it open"); its meta keeps the quote and who said it, the rest moves to the
    inspector (check C55). **Built (wave 1):** `web/src/components/TodayRecords.test.tsx` (every ask on the line, no
    "Keep:" or second question), `web/src/components/TodayPromises.test.tsx` (the endings read from an input, Close it and
    Keep it open with Undo), `web/src/components/WhatChanged.test.tsx` ("a held drop on the change's card has the line's two
    buttons, and who was told leads it"), `tests/test_held_ask.py`;
  - R3: every Today line's meta is one line, cut with an ellipsis, and "Outside" folds into the pill column, so six lines
    fit at 1280×720 (checks C47, C56). **Built (wave 1):** `web/src/ui/Row.test.tsx`,
    `web/src/components/TodayRecords.test.tsx` ("Outside in the pill column, meta one line"), `web/e2e/shell.spec.ts` (six
    lines in full at 1280×720 with the demo's longest held and moved lines, each meta one line), and in a browser
    (`web/e2e/today-capacity.spec.ts`: "Today at 1280x720 shows six lines in full when the held and moved lines are as
    long as the demo's, each with its meta on one line", passing at `9c0f76e`). *Carried, not blocking the box:* the stopped-work lines
    (`HeldLines`) still wrap their second line, because it says why and until when and has no inspector to hold the rest;
  - R4: on a new workspace the header has no "Missed one" until there is something it could have missed, and the
    workspace's new name shows without a reload. **Built (wave 1):** `web/src/shell/Header.test.tsx` ("a new workspace
    offers no Missed one until something has been read or handed in"), `web/src/App.test.tsx` ("a new name for the
    workspace shows in the header at once");
  - R5: the mail step on a fresh install says one sentence, with one button and one way out. **Built (wave 1):**
    `web/src/components/Walkthrough.test.tsx` ("with no service listed and nothing read the step is one sentence and one
    button");
  - F25's conditions: the yes is asked in the AI step right after the key check passes, and Continue can't skip it
    silently; when it was skipped, Today says "Let <account> read your work mail and notes" with Allow; the browser
    tests' fixture has a stand-in account so the yes can be captured. **Built (wave 2):** `tests/test_work_access.py` (the
    line for an account the person said Not now about, none for one never asked or one that may read internal material,
    Allow with its read-back and Undo, a higher level kept, the guide records Not now), `web/src/components/WelcomeAi.test.tsx`
    ("Allow lets the account read open and internal material; Not now leaves it at open material only", with `work_data`),
    `web/src/shell/HeldLines.test.tsx` (the line and "Allow gives the yes … and Undo puts the answer back"). The step
    already asked the yes after the check and kept Continue disabled until it was answered
    (`web/src/components/WelcomeAi.test.tsx`: "the question names the account and its sign-in…"). *Left:* the browser check
    `web/e2e/work-access.spec.ts` ("Today offers Allow for an account the person said Not now about, and Allow and Undo
    work", on the server's `--standin-account`) passes at `9c0f76e`, so nothing is left;
  - R6–R11: the Done step's empty cards; the series page's side panel (labels above values, an item not listed in both
    Agenda and Next); the rules line's weight and pill; 24px hit areas for checkboxes; no "From: <person>" titles in What
    changed; shorter Top priorities wording. **Built (wave 2):** R6 `web/src/components/Walkthrough.test.tsx` ("each step
    is one compact row…"); R7 `web/src/components/SeriesPage.test.tsx` ("an item listed under Agenda is not listed again
    under Next…", "a person whose only items are on the agenda…") and `web/src/theme/targets.test.ts` ("a side panel puts
    each label above its value…"); R8 `web/src/shell/HeldLines.test.tsx` (the pill "Rules"; the weight is a stylesheet rule,
    not measured); R9 `web/src/theme/targets.test.ts` ("a checkbox or radio is a 24px control itself…"); R10
    `web/src/components/WhatChanged.test.tsx` ("a change from an email is titled by Today's rule…"); R11
    the Top priorities panel tests (removed with the panel, change log 229) ("a person's row reads name · 1 overdue · 1 waiting 10 days…"). *Left:* the
    browser checks for R6 (`web/e2e/acceptance.spec.ts`, "the setup walkthrough and Settings are screens of their own…":
    every recap row at most 64px high), R9 (`web/e2e/a11y.spec.ts`, "… has no visible interactive element under 24×24
    at 1024, 1440 and 390px", measuring the control itself) and R10 (`web/e2e/shell.spec.ts`, "What changed titles follow
    Today's title rule, never From: and a person") pass at `9c0f76e`; R7's side panel is still not measured in a
    browser, carried and not blocking the box (its CSS follows the review's numbers and the stylesheet tests);
  - CI's python-later job (the tests with the clock 40 days ahead) finishes: on `46cc3ea` it ran past 30 minutes with
    every other job green and was cancelled, as the same run hung locally at 94% with three workers and passed with two.
    The job now has a time limit and prints the stack of any test past five minutes; the hanging test is found and fixed,
    and the job passes on the batch's commit. *Found and fixed (2026-10-20):* the hang was faketime's, not a test's
    (`tests/test_events.py::test_wait_returns_when_the_counter_moves` waited for a deadline faketime had moved 40 days
    out), and keeping its timing clock real broke short sleeps instead (33 failures at `0f37be4`), so the job moves the
    date inside each test process with the time-machine test library (`TEST_CLOCK_DAYS_AHEAD`, `tests/conftest.py`):
    the whole suite passes 40 days on locally with three workers, and the job passed on CI at `9e9c3f0` (4.5 minutes,
    run 39527996195).

- [x] [B-9] **Build the UI/UX designer's review of batch B-8** (received 2026-10-20 at `0f37be4`,
  `reviews/ui-ux-2026-10/rereview-0f37be4/README.md`; R1 to R11 confirmed fixed on screen, and both of the session's
  judgment calls accepted; the owner's standing answer: "give them what they want"). Each sub-item is done when its
  test passes:
  - S1: one decision is one Today line: a held op leaves its change's review line; the review line says how many wait
    under Decide; a change holding only held ops shows no review line; approving a review never settles a held op
    (true in the code today: `looks_good` only marks the change reviewed; a test pins it) (check C57: no item on two
    Today lines). **Built (B-9):** `tests/test_one_decision_one_line.py` (the held op leaves the review line, the line's
    `deciding` keys, a change with only held ops has no review line, `looks_good` never settles a held op, no op on two
    lines), `tests/test_source_intake.py`, `web/src/components/TodayOneDecision.test.tsx` ("the decision stays a question
    under Decide, and the review line beside it says it waits there", "Go to what waits opens the held line's details");
    the browser check "one decision is one line: no item is on two Today lines, read from the demo through the API" in
    `web/e2e/today-capacity.spec.ts` passes at `9c0f76e`;
  - S2: a held line's details show only the held decision (the question, the quote and who said it, the source, why it
    waits, the two answers); a held op's label is conditional ("Would close a to-do"). **Built (B-9):**
    `web/src/components/TodayOneDecision.test.tsx` ("a held line opens on only its decision…", "a held op the engine
    doesn't shape as a question opens as its own row…", "a held op's label on its change's card says what it would do…"),
    `web/src/wording/wording.test.ts` ("every op that says what was done has a conditional twin…");
  - S3: the pill column has one fixed width on every row, so every title starts in line. **Built (B-9):**
    `web/src/components/TodayOneDecision.test.tsx` ("the lines that stop or ask for something use the queue's columns…");
    measured at 1440px on the demo's build: every line's title starts at x = 413, where the Access line started at 344 and
    the Rules line at 333 (`web/e2e/today-capacity.spec.ts`: "every line's title starts at the same place at 1440px,
    whichever kind of line it is", and `web/e2e/work-access.spec.ts`: "the Access line's title starts where every other
    line's title starts, at 1440px", both passing at `9c0f76e`);
  - S4: What changed and Today topics come from a short topic, never a cut-off first sentence; "Work <assistant>
    started" says what the work was. **Built (B-9):** `tests/test_item_titles.py` ("a short topic beats a first line that
    would be cut off", "with no topic and a first line too long to show whole the topic is empty", "work the app
    started…"), `web/src/lib/queue-words.test.ts`;
  - S5: under Review a change the assistant made reads in the past tense ("<assistant> dropped …"); under Decide, a
    question. **Built (B-9):** `tests/test_one_decision_one_line.py` ("a review line for one thing says what was done and
    to what"), `web/src/components/TodayOneDecision.test.tsx` ("a review line says what the assistant did in the past
    tense…"), `web/src/wording/wording.test.ts` ("a review title for one thing the assistant did is in the past tense…");
  - S6: with nothing connected, the mail step shows only "I'll do this later"; Continue appears once something is
    connected. **Built (B-9):** `web/src/components/Walkthrough.test.tsx` ("the mail step with nothing connected has one way
    on…", "the mail step has Continue once something is connected…");
  - `docs/project/ui-review-status-2026-10-20.md` carries the reviewer's marks at `0f37be4` and then B-9's. **Built (B-9):**
    the file (a documentation item, so no test). The three browser checks passed in the full runs and on CI at
    `e4d9fd7` (run 39545093376, every job green), and the reviewer marked S1 to S6 Done on screen at `9e9c3f0`
    (`reviews/ui-ux-2026-10/rereview-9e9c3f0/README.md`) and R-0 to R-c at `149890e` (its `followup-149890e/`).

- [ ] [B-10] **The owner's re-run of the failed AI cases** (2026-10-21, at `9e9c3f0`, one account, 3 runs per case:
  the golden set's 41 failing cases at 39% of runs passing, 10 cases passing every run). Each sub-item is done when its
  cases pass on the owner's next re-run and a stub or unit test pins the rule.
  *The owner's re-run of 2026-10-21 evening (same account, 3 runs):* the failing cases rose from 39% to 78% of runs
  passing (20 more cases pass every run; the three reply-owed cases 100%, 100% and 0%), demo-a cases 58%, learning pairs
  52% (demo-b) and 57% (demo-a). Next batch, each checked on the low-cost model against the exact failing packet first:
  who a promise is owed to (027, t25-m2, pairs 07, 11, 12, 20), a to-do or a question rather than a fact
  (they-finished-note, follow-up-with-no-clear-owner, no-placeholders, stance-manage, injection), the person's own sent
  promise answered with nothing (t14), "we" as shared work (promise-owed-we-team, pair 03), where a lesson reaches (19,
  15, 20, another-teams-rows, over-application, other-project), a new project proposed for a name the workspace lacks
  (project-no-record), and the new-person question (new-person-with-organization). Found first: t14 failed because its
  test subject named the scenario (fixed in every thread case, d3cb7af); the others are re-checked on the new subjects
  before any instruction changes. Re-checked on the low-cost model with natural subjects (one answer per case): 10 of the 14 still-failing cases pass (first-name-in-thread, follow-up-goes-to-who-made-the-claim, follow-up-with-no-clear-owner, 027, 056, 078, 119, t21, new-person-with-organization, project-no-record); still failing: t16-m3 (a thanks-only reply gets nothing, not news), t25-m2 (the PM's own "I'll review it Monday" becomes news on the other's action), promise-owed-we-team (owed to the PM although the PM is in the team's "we") and they-finished-note ("my approval can wait until Oct 20" becomes facts, not a moved date). The instructions already say each, so these get deterministic checks that send the answer back, not more words. Later: the notes packet is about 130,000 characters before the input, a lot for a
  low-cost model to weigh and to pay for on every run; trim it with the evaluation cases as the guard:
  - a promise with a condition keeps its date words apart from the condition, and the condition in its text (019, 020,
    021, 054, 055, 056, 064, t10, t12, t25-m2): the task's prompt and guidance. **Built** (instructions; a model
    behavior, so done when the owner's next re-run passes these cases): `tests/test_learning_run_b7.py`
    "a_condition_with_a_date_keeps_the_date…" pins the wording, and `promised_to` is required whenever the input shows who;
  - the scorer compares due words as the date rules read them, past "on" and "by" (013, 027, 112). **Built:**
    `tests/test_evaluate_harness.py` "due_words_are_compared_as_the_date_rules_read_them" and the pinned
    "a_promise_is_matched_on_who_it_is_owed_to…";
  - a first name two people share is held for "who is it" even when the answer names one of them in full, when the
    full name isn't in the input (shared-first-name). **Built:** the golden case `shared-first-name-named-in-full`;
  - a person the answer writes as an address, or a name with the address beside it, is the person the address belongs
    to (the learning pairs 07 and 20 held "tess@example.com" and "Tess (tess@example.com)" as unknown). **Built:**
    `tests/test_names.py` "a_person_written_with_their_address…", "an_address_nobody_has…";
  - a reply in a promise's thread that the answer leaves without any op goes back once for what it said (105, 110,
    114, 120, t21). *Open, a design question first:* an action keeps no record of the words it came from, so which
    open promise a pasted reply belongs to can only be guessed from overlapping text, and a wrong guess spends a paid
    return round. *Decided (F30):* the thread is the conversation the rules join, and pasted text joins a promise's
    thread by rule when its quoted history holds that promise's evidence quote; done when a stub case shows a pasted
    reply that quotes the promise's sentence linked to it by rule, and an empty answer to it sent back once. **Built:**
    `tests/test_thread_promise_lint.py::test_through_a_hand_in_an_empty_answer_is_sent_back_once` and
    `::test_news_from_a_reply_that_quotes_the_promise_is_about_it_whatever_its_own_words` (the lint
    `thread-promise-unanswered`). *Left:* the five cases pass only when the reply quotes the promise, so they are
    checked again on the owner's re-run; watched mail joined by conversation alone is not built;
  - a lesson as narrow as the person's words (F31): a named person or project, a role or plural group, or "always",
    "every", "never"; the reach stated in words; a correction never left without a lesson; done when the pairs
    `over-application`, `other-project` and `another-teams-rows-naming-ours` pass on the owner's next re-run, with a
    unit test of the breadth rule. *The instructions are written* (the learning prompt and its playbook; the Learned
    line already states the reach and picks it), with
    `test_a_lessons_breadth_is_read_from_the_persons_words_and_a_mistake_always_teaches_the_narrow_one`; *left:* the
    three pairs on the owner's re-run;
  - who a promise is owed to (F32): three stub cases, Cc (owed to the To recipients, the person watches), a named third
    party, and "we'll" from the sender's team. **Built:** the golden cases `promise-owed-cc-team`,
    `promise-owed-named-third-party` and `promise-owed-we-team`, the instruction in the notes prompt and playbook
    (`test_a_promise_is_owed_to_whoever_it_is_said_to`), and a forbid that names who a promise must not be owed to
    (`test_forbid_can_name_who_a_promise_must_not_be_owed_to`);
  - a self-check that fails while a decision entry from 2026-10-21 on names no change-log section that exists. **Built:**
    `engine/selfcheck/decisions.py`, `tests/test_selfcheck_decisions.py`;
  - the rest, case by case, through the prompt or a stronger tier (`docs/decisions.md` 2026-10-21, "Four evaluation
    cases follow the reply-owed rule"):
    - cases brought to the reply-owed rule: `decision-for-pm`, `thread-t18-m2-called-off` and
      `follow-up-with-no-clear-owner-asks-who` (stub cases pass);
    - instructions that contradicted a check: a reply's source in words, never an id
      (`question-asked-of-me-facts-hold-it`, `tests/test_obvious_steps_f.py`), and shared work as one action
      (`production-checkin`, `test_the_prompt_says_who_owns_shared_work_and_where_a_direct_choice_and_a_disputed_claim_go`);
    - rules: **Built:** a reply owed with no draft when a fact answers it (`tests/test_reply_already_known.py`), the
      person's own request (`promise-078-send-bram-agenda`, `tests/test_own_request_lint.py`), a signature phone
      (`signature-phone`, `tests/test_signature_contact.py`);
    - instructions only, a model behavior: the disputed claim (`follow-up-goes-to-who-made-the-claim`) and the colon
      (`colon-in-title`);
    - checked on a low-cost model (CLAUDE.md, "Check an AI fix on a low-cost model"): 14 of the 15 golden cases above
      pass on it, `decision-for-pm` only on the stronger tier; of the learning pairs, 11, 12, 15, 16, look-it-up and
      over-application pass (look-it-up and over-application after their expectations were brought to the reply-owed
      rule and loosened from one exact phrase), 20 passes on the stronger tier, and a lesson may now name only the
      projects its correction touches (`tests/test_learn_correction.py`); the reply owed also asks whoever the routing
      names (`test_a_reply_owed_with_no_recorded_answer_also_asks_whoever_the_routing_names`);
    - *left:* `stance-manage` (a design change from someone the person manages gets no "why" question on either tier: an
      instruction gap), `another-teams-rows-naming-ours` (the impact question missed on both), pair 03 (kept as a
      glossary term, not a lesson), `other-project` (a routing entry where a lesson was wanted), pair 19 (no lesson
      proposed), and thread-t14, whose answers are in the owner's `rerun.json`, not yet seen. All of these are done only
      when the owner's next re-run passes them.
  - the owner's re-runs of 2026-10-22 (Claude Code on its low-cost model, 3 runs per case): the main set went 47%,
    62%, 64%, 80% and the harder pair 17%, 17%, 50%, 100%, as each batch landed. What moved them:
    - the app's instructions as Claude Code's own (`agent.system_option`,
      `tests/test_catalog_claims.py::test_a_program_that_takes_system_instructions_from_a_file_gets_ours_there_and_only_the_request_as_its_packet`);
    - answers sent back once by rule, each checked first on a low-cost model with the exact packet and send-back:
      `promise-as-fact`, `someone-given-owner`, `due-move-missed`, `owed-to-missing`, `project-start-as-fact`, and a
      due date on a finished action refused (`tests/test_promise_as_fact.py`, `tests/test_own_request_lint.py`);
    - a scoring fix: a forbidden owner is met only by an action that person owns
      (`tests/test_evaluate_harness.py::test_a_forbidden_owner_is_met_only_by_an_action_that_person_owns`).
    *Left on the 80% run:* `follow-up-goes-to-who-made-the-claim` (33%: the question goes to the person, not whoever
    made the claim), `thread-t21-m4-no-answer` (33%), `first-name-in-thread`, `promise-078`, `promise-114`,
    `promise-119` and `they-finished-note` (67% each). Pairs re-run the same day: main 69% (from 52%), harder 70% (from
    57%). Pairs 06 and 14 had right lessons the expectation's words missed (widened, with a comment). *Left, for the
    owner to decide:* pairs 15, 20, 23, 24 and 25 propose no lesson after a correction saying the answer was wrong.
    Decision F31 says such a correction still proposes the narrow lesson; design 6.22 and
    `tests/test_learn_correction.py::test_nothing_to_generalize_makes_no_knowledge` allow none ("Typo in the title").
    The owner decided (`docs/decisions.md` 2026-10-22): not always; an unclear correction asks the person one
    question. *Left:* the five pairs, on the owner's next re-run. The harder pairs re-run after it: 80%; left there are
    `other-project` (no lesson proposed; the later run files the work under the wrong project) and `over-application`
    (the later run moves an existing action's date instead of adding the review for the person).
    The main pairs after it: 67% (06, 14 and 15 now pass). *Left, in order:* (1) clear corrections still answered with
    nothing, not a lesson and not a question (20, 23, 24, 25, `rejected-ask`); (2) a promise in mail to the person
    left owed to nobody (11; 07 and 20 also name the owner by a bare first name); (3) a lesson that contradicts a
    built rule (03: "list the project team as owners", where the rule leaves "we" unowned); (4) a lesson kept for the
    wrong kind of work after a drop (19: follow-on, not notes).
  - from the learning pairs' re-run (69 runs at 32%): a lesson kept with a reach that misses the later run (pair 19,
    reach `follow-on` or `action-work`, the later run `notes`) and three firsts that propose no lesson at all (15, 16,
    20): whether the reach the model picks should be widened or checked against the correction's own task kind;
    `promised_to` left out of a promise made to the person in a message to them (pairs 11 and 12); "we" still owned by
    the writer (03); routing, the kept term and the fact lookup given but not followed (routing, day-30, look-it-up,
    stance-manage);
  - from the harder set (12 runs at 58%): `new-person-with-organization` and `project-no-record` (a project named in
    the input with no record is not held for adding).
  - from the harder learning pairs (21 runs at 62%): a correction turned into a lesson or routing entry broader than
    the correction (`over-application`: a reviewer for the load-test plan became "every plan review"; and
    `another-teams-rows-naming-ours`, the kept lesson over-applied), and no lesson for a correction about another project
    (`other-project`). With the pairs above, one piece of work on how a lesson is proposed and scoped.
- [ ] [B-11c] **Every kind of AI account works properly** (owner, 2026-10-21: "Most people will not use API and will
  probably just use subscription but I want them all to work properly"; after S1-4a): (1) an audit of every catalog
  entry against its own documentation, command-line programs first (the options each command accepts, how it takes an
  effort, its temperature and output rules), each finding fixed as data or an adapter capability, never a vendor check
  in code; (2) a native adapter for the recommended service's own messages interface, with effort, prompt caching and
  refusal handling. Done when each catalog entry's settings are confirmed against its documentation with a named test
  per finding, and the native adapter passes the smoke test's exact parameters and the lock-down rules in a named test.
  *Part 1 built* (`tests/test_catalog_claims.py`, 46 tests, one per finding); *part 2a built*, the native adapter for
  the recommended service (`tests/test_anthropic_messages.py::test_the_smoke_test_passes_with_the_exact_parameters_of_each_tier`
  and the rest of that file). *Part 2b built:* the command-line agents' documented lock-downs and notes that claim only what
  their docs back, and the account check listing models first where a service refuses a key on its list
  (`tests/test_catalog_claims.py::test_the_command_that_runs_carries_the_options_its_programs_documentation_gives_for_denying_tools`,
  `::test_a_saved_account_whose_key_the_service_refuses_on_its_model_list_fails_as_a_refused_key`). *Part 2c built:* effort sent only
  where the model's listed capabilities take it, room to think added for models that list adaptive thinking
  (`thinking_room`), and a tier's `thinking: off` sent only where a model's listing accepts it, with the account check
  saying in plain words what a model doesn't take
  (`tests/test_anthropic_messages.py::test_a_model_that_takes_no_effort_gets_none_and_the_test_says_so_in_plain_words`).
  *Part 2's other items built* (2026-10-22): estimates by the model's own token count, corrected from every run's reported usage,
  plus a command-line agent's own overhead per request (`tests/test_estimate_calibration.py`); the preset's newest-of-family
  pick by the listing's own date, then the version in the id, never the list's order (`tests/test_family.py`, and a newer
  model of the family watched weekly, `tests/test_model_watch.py`); moving a saved account of the recommended service to the
  native adapter, only on a yes with an identity read-back (`tests/test_native_move.py`).
  *Left in part 2:* the service's listing names no "thinking can be turned off" capability, so `thinking: off` is never sent
  yet. *Left in the item:* P30 (the owner captures each command-line agent's signed-out message) and the check of each fix
  on a low-cost model.
  (3) **Failures captured in detail for feedback** (owner, 2026-10-21: "We should have something in the program that
  captures failures in detail so the user can send them in the feedback"): every failed AI call, account check,
  connector read and server error keeps what a maintainer needs (when, the task kind, the account's service and
  program version, the request's exact parameters, the status code, the error kind and the service's own error text),
  and never the packet, mail or any of the person's content; keys, tokens and addresses are masked. Send feedback offers
  "Add the last problems" (on by default when there were any in the last days, a setting), shown in full in the email
  before it leaves, as today. Done when a named test shows a failed call's report holds the parameters and the error and
  no packet text, secret or address. *Built:*
  `tests/test_problems.py::test_a_failed_calls_report_holds_the_parameters_and_the_error_and_no_packet_text_secret_or_address`;
  a request's settings are shown as configured when the report is made.
- [ ] [B-11] **A recommended setup per AI service, out of the box, measured to stay current** (split, owner
  2026-10-21, so the steward starts the next day: **B-11a** first, the three tiers, the presets, effort as an adapter
  capability, the fallback by price and setup loading it all with no question; **B-11b** later, beside I-0, the Settings
  screen with the tiers and their cost per day, and "Measure"). **B-11a built:** `engine/ai/presets.py`,
  `tests/test_tier_presets.py` (presets for the two services whose families are certain; effort reaches a service only
  through its confirmed `effort_param` or `effort_option`, none set yet). *Built for B-11b (audit A5):* each tier's cost per day on the Settings AI page (`tests/test_tier_costs.py`, `web/src/components/AiRouting.test.tsx`). *Left for B-11b:* the Settings screen's recommendation by cost per passing answer,
  "Measure", the model picker's role words (two examples now share "stronger"), effort in the pre-save account check,
  and confirming each service's effort parameter. *Found while confirming it (2026-10-21):* the recommended service is
  reached through its chat-format compatibility endpoint, which per its own documentation ignores `reasoning_effort`,
  supports no prompt caching, is "not considered a long-term or production-ready solution", and refuses any
  temperature below 1 on current models; **fixed:** `send_temperature` (off for that entry,
  `test_the_recommended_service_is_sent_no_temperature`). *Proposed:* a native adapter for that service's own
  messages interface, for effort, prompt caching and refusal handling (owner to decide) (owner, 2026-10-21;
  design 6.16; placed before phase S because it decides what testers spend; the owner may move it): three tiers
  (everyday, stronger, hardest); a preset per catalog entry naming a model family and an effort per tier; effort as a
  per-model adapter capability; tiers filled by price where no preset matches, marked not checked; a measured
  recommendation from a few evaluation cases on request, comparing model and effort pairs by measured cost per passing
  answer (a low-cost model at high effort against a stronger one at low effort); setup loads the preset with no
  question, and Settings shows the three tiers with a cost per day, changes them and measures. Done when a new account of each preset service gets its tiers filled with no choice made,
  a service with no preset gets them by price, and a measurement test picks the cheapest passing model, each with a
  named test.

## Phase S: the daily steward (after phase B, before phase I)

The owner's ask (2026-10-17): "this core needs to be full featured" as a daily assistant for anyone, not only project
support; the owner accepted `docs/project/steward-proposal.md` ("i agree with everything you wrote so definetely want to
work on these before we do the full ci/cd setup with the installers"). Reordered the same day after an outside review the
owner brought (in the proposal's "Review, 2026-10-17"): **dependable memory for commitments across work and personal life
is the reason to choose Thimbleby**, so promises and how they resolve come first, before reminders and briefs. Design
6.32. Each item ends with named tests. Exit test: a week of the owner's own use, measured (S5). The starting set of
journey tests and evaluation cases is `docs/project/steward-scenarios.md` (15 fictional scenarios, reviewed 2026-10-17).

Guide sections for promises, the brief, reminders, bills, bookings and acting after a yes are drafted
(`docs/project/steward-guide-sections.md`); each moves into `engine/guide/guide.md` in the change that builds its
feature, never before, since the guide is what the assistant answers from.

**From the outside design review (2026-10-21, `docs/project/reviews/steward-design-review-2026-10.md`; checked against
the code by the main session),** for S1 before the gate week:
- [x] [S1-3] The first run's coverage: before Start, which account, folders and dates will be read; after it, which
  were read; and a missing sent folder said plainly on the first promise list, so an incomplete first result never
  looks complete. (`tests/test_first_promises.py::test_before_the_start_it_names_the_account_the_folders_and_the_day_the_read_goes_back_to`,
  `::test_after_a_read_with_one_folder_failed_that_folder_is_named_as_not_read_and_the_result_is_not_complete`,
  `::test_a_mail_source_with_no_sent_folder_says_so_and_is_never_complete`,
  `web/src/components/FirstPromises.test.tsx` "what it reads". Left: a sent folder offered by a sign-in itself, 6.33.)
- [x] [S1-3] A date marked "check this" is never a firm deadline: no reminder, at-risk line or overdue from it until the
  person confirms it. **Built:** `tests/test_due_check.py` (one reading, `engine/firm_due.py`, wherever a due date
  becomes urgency).
- [x] [S1-3] The deadline words people use every day are read by the rules, so fewer dates wait for "check this"
  (the outside helper's 80 phrases, `tests/fixtures/phrases/due-phrases-01.yaml`, 42 read as a person means them at
  `1ec95d2` and none read wrongly; `tests/test_phrase_cases.py` holds the rules to them): numeric dates in the
  language's order ("11/6"), "day after tomorrow", "later today", "tonight", "noon" and "midnight", "first thing
  <day>", "end of the month" and "end of next month", "this weekend", "within <n> hours or days", a time with a zone
  abbreviation ("5pm ET", zone abbreviations as language data), and holidays as dated data per locale ("by
  Thanksgiving"), never in code. Each one read is a case in that file passing; a doubtful reading stays inexact.
  **Built:** `tests/test_phrase_cases.py::test_the_rules_read_more_of_the_deadline_words_people_use_every_day`
  (33 of the 80 read exactly, 21 before, none wrongly; the roadmap's "42" counted differently and could not be
  reproduced). *Left:* "by 9 in the morning", and Easter-dated days.
- [x] [S1-3] A late reminder says "overdue · due <time>" unless the app knows it was closed or asleep (today's
  `queue.reminder.late` says "while this computer was asleep" without knowing).
  **Built:** `tests/test_reminder_lines.py::test_a_late_reminder_says_the_app_was_away_only_when_a_gap_in_its_running_covers_the_due_time`
  (the app's own running record, `engine/running.py`; the words say "while the app wasn't running", since a gap can't
  tell sleep from closed).
- [x] [S1-3] The brief's all-clear names any source not read since the last brief, so a stale mailbox never reads as a
  quiet day.
  **Built:** `tests/test_watch.py::test_a_source_not_read_successfully_within_the_stale_hours_is_named_by_when_it_was_last_read`
  (there is no brief yet, so Today's all-clear carries it; `watch.stale_after_hours`).
- [x] [S1-3] `docs/project/steward-proposal.md`'s stale statements (phase order, the Monday briefing's phase, reminders on
  any dated thing, approved writes as an open question) are corrected to the roadmap. Checked by reading.

**The gate (functional designer's F1 and F2, 2026-10-19; design 6.32 "Dependability").** Phase S builds a first slice,
proves it on a week of real use, and only then goes on:
- **The first slice (S1):** promises and how they end, reminders, replies owed, one plain "what changed since yesterday"
  line, the coverage line, "Missed one", the quiet first run, and outage handling brought forward from phase E (work waits
  for the network; a run that did no work isn't an attempt). A rule's check before the change applies (from phase E) is
  needed before S1b at the latest. **Estimated alone: about 4 sessions** (connecting the fifteen rule modules into intake,
  the promise records and endings, the coverage line, "Missed one", the quiet first run, outage waiting, the replay set),
  then the gate week.
- **The gate week:** the owner's personal mail (R9 rules out work mail); at least one closed-lid night and one network drop;
  the owner writes down each promise they notice before looking at the assistant's list, as the independent list; two
  days are measured first and the thresholds set from what was seen, then the counted week. Pass on the owner's
  thresholds for the measures in design 6.32. The testers are held to the thresholds this week sets for missed out of present, silent closes and wrong endings: those numbers come from real use, and per-tester thresholds would move the bar to fit. Counts that depend on how much mail a person gets are reported, not gated. The "Missed one" trend from week one to week two is the one measure only the testers have.
- **The freeze:** What is measured is frozen during the counted week: Today, the promise lines, the prompts and the model choices don't change. Fixes found during the week go into `docs/project/gate-week-fixes.md` (created when the week starts) and land after it. The one exception is anything that loses a promise or closes one wrongly: it is fixed at once, and the day is noted in the week's log so the measures before and after it can be told apart.
- **When the gate week runs** (owner, 2026-10-22): once the core is built, after S5 and before phase I; S1b and the
  rest of phase S are built first.

S1. **Promises, and how they end:**

S1b. **Acting for you, after your yes** (owner, 2026-10-17: "if we can have the app actually able to do mail/calendar
management (not just read only) lets do it"):
- [ ] [S1b-1] **The publisher, brought forward from phase C4:** every outward act is shown as its exact content and target
  (recipients, the calendar and the time), approved by the person, then carried out with a visible status (sent, failed
  with why, undone where the service allows) and written to the ledger. Recipient checks: a new or outside recipient,
  or one taken from untrusted text, is called out before the yes. It calls `outward.check_outgoing` on every draft before
  the yes, so nothing that still names the assistant goes out (design 6.12; the function is built and tested in B-7,
  `tests/test_outward_never_names_assistant.py`).
  **Built so far (S1b-1a, change log 180):** the `act` record and its states, the outbound-tier ops, the fingerprint, the
  callouts, the publisher with its attempt key and its start-up `resume`, the core's `copy` channel, `registrar.channel`
  (plugin API 0.3.87) and the API; `tests/test_publisher.py` holds the designer's eight named tests and the guards
  (design 6.12, "Built so far"). **Built (S1b-1b, change log 182):** Waiting to go out (the list, each act's exact content and target on
  screen, the callouts acknowledged by name, Approve and send with its confirm, Copy and Mark sent for a `copy` act,
  Look again for a stale one, Take it back with Undo) and the Today lines (failed, uncertain, stale):
  `web/src/components/WaitingToGoOut.test.tsx`, `web/src/components/TodayActs.test.tsx`; the browser test
  `web/e2e/outgoing.spec.ts`. **Built (S1b-2d, change log 190):** the undo toast after a send and Take back in what went
  out, the count of a list and every kind of act in words, the invitation's name on an answer
  (`web/src/components/OutgoingActs.test.tsx`). **Left:** before-and-after text of a stale act (an act keeps only hashes of
  what the yes covered), and the screen using the acts list's `status` values and `limit` (it still reads every act and
  filters).
- [ ] [S1b-2] **Mail:** reply, reply all, forward and send a drafted message; archive, move, label and mark read, one at a time
  or as an approved list. Through the account's own service (the Google and Microsoft add-ons ask for send and modify
  access, a change their builder makes) and, for a plain mailbox, sending through the account's outgoing server.
  **Built so far (S1b-2a):** the acts' actions, `about`, account and undo in the engine and API
  (`tests/test_act_actions.py`), and **(S1b-2b)** the core `mailbox` channel for a plain mailbox: sending through its
  outgoing server, the sent copy, status by Message-ID, archive, move, label and mark read over IMAP, and Undo
  (`tests/test_mailbox_channel.py`). **Built (S1b-2d, change log 190):** the screens: Reply, Reply to everyone, Forward,
  Archive, Move to, Label and Mark as read from a saved message, Send reply on a reply owed, the sent and archive folders as
  pick lists (`tests/test_act_draft_api.py`, `web/src/components/ActsOnRecords.test.tsx`,
  `web/src/components/TodayReplySend.test.tsx`, `web/src/components/Sources.test.tsx`); the browser test
  `web/e2e/acts-journey.spec.ts` ran green in the full browser run. **Left:** the add-ons' channels; acting on several selected
  messages at once (no list of saved messages lets the person select any); Move to for a signed-in account (no folder
  list for one).
- [x] [S1b-2] **Reminders that reach the person while the computer sleeps** (moved from S1-2's reminders, which needed
  the publisher for it): (owner: "whatever we can do to make it full featured ... but not
  phone pushes unless it was an installed ios or apk"): one choice in Settings: in the app's own calendar (local, with an
  alarm; no act), in the person's calendar on a signed-in calendar account (an event with an alarm), or as a reminder
  mail to their own address, the last two approved once per reminder or by a standing yes for reminders. No third-party
  push service. **Built (S1b-2c):** `tests/test_standing_yes.py`, `tests/test_reminder_acts.py`,
  `web/src/components/ReminderWhere.test.tsx`. **Left:** the calendar form on a real account waits for an add-on whose
  channel declares `calendar: create`; a companion phone app (iOS and Android) that receives the desktop's reminders is
  planned after 1.0 (it needs a relay the apps can reach).
- [ ] [S1b-2] **Calendar:** create an event or a hold, move or cancel one the person owns, and accept, decline or propose a
  new time for an invitation. Through the account's service; a subscribed calendar link stays read-only by nature.
  Reading an invitation and preparing the answer has its engine (`engine/itip.py`, `tests/test_itip.py`); sending it
  waits for the publisher.
  **Built so far (S1b-2a):** the calendar acts' actions, an answer addressed to the organizer, and undo of a created event
  (`tests/test_act_actions.py`). **Built (S1b-2b):** the answer's iTIP reply by mail through the core `mailbox` channel
  (`tests/test_mailbox_channel.py::test_an_answer_goes_as_mail_to_the_organizer_with_the_itip_reply_attached`).
  **Built (S1b-2d, change log 190):** Accept, Maybe, Decline and Propose a time from the invitation's calendar entry, the
  free times of the working week to pick from (`tests/test_act_draft_api.py`,
  `web/src/components/ActsOnRecords.test.tsx`). **Built (cleanup batch):** a Today line in Decide for an invitation waiting for an answer, opening the entry's page where
  Accept, Maybe, Decline and Propose are (`tests/test_invitation_lines.py`, `web/src/components/MeetingPrep.test.tsx`).
  **Left:** creating, moving and cancelling events (a calendar service's add-on, and their screens).
- [ ] [S1b-2] **Plugin API for acting:** add-ons declare the acts they can carry out (a channel per account kind: send,
  reply, move, label, create or change an event) and the access they need in `requires`; the core calls them only from
  the publisher after the yes, and their sign-in asks for the wider access when the person turns acting on. Released
  with the guide, so the mail add-on's builder builds against it.
  **Built so far (S1b-2a, plugin API 0.3.88):** channels declare `actions` and `accounts`; `OutgoingAct` carries the
  action, what it is about, the account and the event fields; `watch.acting` per account, with Copy carrying a draft for
  an account that is off; `acting_scopes` on a sign-in and `POST /api/sign-ins/{name}/start?acting=true`; `act.undo`
  with the channel's `undo(act, service_id)`: `tests/test_act_actions.py` (see design 6.12, "Built (S1b-2a)").
  **Built (S1b-2d, change log 190):** the Settings switch for each account, which starts the sign-in with acting for a
  signed-in account and saves for a mailbox (`web/src/components/ActingAccounts.test.tsx`). **Left:** asking the service
  to drop the wider access when acting is turned off, and the guide's section for the mail add-on's builder to confirm.

S2. **Time and attention:**
*Reminders at a time moved to S1 (batch S1-2), because the gate's first slice names reminders.*
- [x] [S2] **Repeating to-dos** on the repeat engine the calendar uses (open promise P17), each occurrence its own row.
  A repeat is typed as a phrase and shown back from data (`engine/repeat_phrases.py`, `tests/test_repeat_phrases.py`):
  "the 31st" falls on a short month's last day rather than skipping it.
  The repeats people say that the grammar declines today (the outside helper's 60 phrases,
  `tests/fixtures/phrases/repeat-phrases-01.yaml`, 31 agreeing at `1ec95d2`, every other one declined, none read
  wrongly): wording variants of supported repeats ("weekly on Wednesday", "every two weeks on Thursday", "every other
  week on Monday", "the first Saturday each month", "on the 1st", "annually"); several days of the week ("Mondays and
  Thursdays", "weekdays except Friday"); several days of the month ("the 1st and 15th", "the second and fourth
  Tuesday"); the last day, weekday or a given day of the month; a yearly weekday ("the last Friday in November"); and
  February 29 falling on the 28th. Each needs a shape and its wording to say it back; unclear ones ("biweekly",
  "quarterly") stay declined and asked.
  **Built so far (S2):** the grammar reads all of those phrases, each with a shape
  (`tests/test_repeat_phrases.py`, `tests/test_phrase_cases.py::test_the_rules_read_every_repeat_the_helper_wrote_except_those_with_the_task_in_them`;
  the four phrases that carry the to-do's own words stay declined, "biweekly" and "quarterly" stay unclear); a repeat on
  a to-do (`action.repeat`, `repeat` and `occurrence_of` on the action) set by the person at once with Undo, from an
  input waiting for the yes; the next occurrence made in the same change when one is done, dropped or done by someone
  else, a missed one staying open and Undo taking both back (`tests/test_repeating_todos.py`); the check route, the set
  and stop routes and the views' `repeat` and earlier occurrences (`tests/test_repeating_todos.py::test_checking_a_phrase_says_what_was_understood_or_that_it_is_not_clear`);
  and the screens: the Repeats field in the edit form with its said-back words, the row's repeat mark, Stop repeating
  and the page's earlier occurrences (`web/src/components/RepeatingTodos.test.tsx`, `web/src/lib/repeat.test.ts`).
  The Repeats field is also on the form that adds a to-do by hand, and Today's to-do rows carry the repeat mark in
  words (`tests/test_add_todo.py`, `web/src/components/AddTodo.test.tsx`).
  **Built (S2c):** the assistant proposes a repeat from a sentence like "I send the report every Friday": `action.repeat`
  carries only the input's words (the engine reads them from the to-do's day, else the day the input was received),
  names a to-do added earlier in the same answer as `@<n>`, refuses alone on unclear words, and waits for the person's
  yes from an input (`tests/test_repeating_todos.py`; the extraction prompt line; the golden-set cases
  `repeat-named-from-the-same-answer` and `repeat-someone-elses-habit`,
  `tests/test_evaluate_harness.py::test_the_repeat_cases_pass_on_their_stub_answers_and_the_repeat_stays_held`).
- [x] [S2] **Adding a to-do yourself** (design 6.32; found while building repeating to-dos): Add a to-do on Today and
  To-dos, no AI, at once with Undo. Built: `POST /api/todos/day` and `POST /api/todos`, with a day in words, none, for
  someone else, with a repeat, Undo and what isn't clear said back (`tests/test_add_todo.py`); the drawer with the
  cursor in the words, the said-back day and repeat, the lists and the Undo toast, on Today and To-dos
  (`web/src/components/AddTodo.test.tsx`). The to-do and its repeat are two changes in order, undone last first.
- [ ] [S2] **What changed in an invitation** is computed as data (`engine/invitation_changes.py`,
  `tests/test_invitation_changes.py`): moved, end changed, cancelled or restored, title, place, organizer, and who was
  added, removed or replied, each a kind with its values for the wording sheet; it feeds the brief's "changed
  overnight" lines and the invitation's page.
  **Built so far (S2):** it feeds the brief's "changed overnight" lines: a new invitation, one called off or back on,
  moved, a new place, title or organizer, read from the calendar entries' history, and not who replied
  (`tests/test_brief.py::test_what_changed_in_an_invitation_overnight_is_a_line_for_each_change_that_matters`,
  `tests/test_brief.py::test_a_sample_morning_makes_the_brief_its_case_expects`, `web/src/components/BriefCard.test.tsx`).
  **Built (cleanup batch):** an unanswered invitation is a Today line that opens the entry's page, where it is answered
  (`tests/test_invitation_lines.py`). **Left:** what changed in an invitation shown on the entry's page itself.
- [ ] [S2] **The morning brief as what changed, what is at risk and what needs your yes** (not another summary), and the
  evening wrap-up; the Monday briefing is the weekly form (moved from phase B).
  Its shape is in design 6.32, with ten samples (`docs/project/steward-brief-samples.md`) that become its evaluation cases.
  **Built so far (S2):** the morning brief, the evening wrap-up and the card on Today that shows the one that is due
  and closes for the day, by rules and never AI (`engine/brief.py`, `tests/test_brief.py`,
  `web/src/components/BriefCard.test.tsx`); the ten samples are cases in both fictional workspaces
  (`workspaces/*/briefs/`, `tests/test_brief.py::test_a_sample_morning_makes_the_brief_its_case_expects`), each scored
  exactly, with what it still lacks named. **Built (S2, capacity and clashes):** the capacity line first in the at-risk
  section (sample 6), clashes from today onward with travel time, and the reminder offer (sample 7)
  (`tests/test_day_capacity.py`, `tests/test_brief.py::test_a_sample_morning_makes_the_brief_its_case_expects`).
  **Left:** at-risk lines from dates inside mail and bookings ("the last day to cancel", samples 7 and 9) and from a
  meeting named only in words (samples 4 and 8).
- [ ] [S2] **A capacity check on the day's priorities:** an optional effort estimate on a to-do (the assistant suggests one),
  the free time left from the calendar, and "this is more than today holds" when it is, with what to move. No automatic
  scheduling.
  What to move is proposed by rules (`engine/capacity.py`, `tests/test_capacity.py`): never a fixed to-do, those due
  today or overdue last, then lowest priority, not promised and latest due first, with no move a larger one made
  unnecessary.
  Free time is computed by rules (`engine/free_slots.py`, `tests/test_free_slots.py`): every calendar merged,
  working hours and days in the person's zone across clock changes, a buffer around meetings, tentative entries
  blocking unless counted as free; it also finds the slots for "propose a new time".
  Clashes are found by rules (`engine/clashes.py`, `tests/test_clashes.py`): overlaps across every calendar,
  tentative ones apart, and too little travel time between two places, an online meeting needing none.
  **Built (S2):** `effort_minutes` on the to-do, set in the edit form and Add a to-do and suggested by the assistant as a
  held `record.set` (`tests/test_day_capacity.py`, `tests/test_add_todo.py`,
  `web/src/components/RepeatingTodos.test.tsx`, `web/src/components/AddTodo.test.tsx`, the case
  `effort-stated-for-an-open-todo` in both workspaces); the check and the Today line "Move N to-dos: today holds about
  H hours" with its proposed moves, each acting at once with Undo, and the same line in the brief
  (`tests/test_day_capacity.py`, `web/src/components/TodayCapacity.test.tsx`); clashes from today onward as Today and
  brief lines (`tests/test_day_capacity.py`). **Left:** an effort suggested for a to-do added in the same answer (the
  op can name only an existing to-do).
- [ ] [S2] **An attention budget:** quiet hours, a cap on suggestions per day (the rest wait for the digest), an importance
  threshold, and dismissals that stick and teach (a dismissed kind of suggestion comes back only when something
  changes). All settings with defaults.
  Which suggestions interrupt is decided by rules (`engine/attention.py`, `tests/test_attention.py`): held back when
  dismissed and unchanged or below the threshold, saved for the digest in quiet hours or past the day's cap, the
  most important shown first.
  **Built (S2):** the rules are applied to the suggestion lines on Today (a follow-up gone unanswered, to-dos nobody has
  touched, items filed under no project, what was learned), what waits is in the next morning brief, and "Not now" puts a
  suggestion off until its items change, with Undo and the signal `suggestion_dismissed`
  (`engine/suggestions.py`, `tests/test_day_capacity.py`, `tests/test_add_todo.py`,
  `web/src/components/TodayCapacity.test.tsx`, `web/src/components/BriefCard.test.tsx`). **Left:** a dismissed kind of
  suggestion teaching the assistant (the signal is recorded but no learning reads it yet).

S3. **People and meetings:**
- [ ] [S3] **Meeting prep and after-meeting capture** for any calendar event, not only a series.
  **Built so far (S3, change log 193):** for any calendar entry with other people on it, by rules: who is coming (by id,
  without anyone who declined), what is open with each of them both ways with the exact words it was made from, the last
  time in touch and what the last entry with them left open, as the entry's page and a Today line
  `steward.meetings.prep_hours_before` before it starts; an optional prep note as the core draft kind `meeting-prep`
  (estimated, held for the go, unreviewed until accepted); and after it ends a Today line that opens a note box tied to the
  entry, whose words are handed in like any note (`engine/meeting_prep.py`, `tests/test_meetings_people.py`,
  `web/src/components/MeetingPrep.test.tsx`). **Built (cleanup batch):** the browser journey, which has run in the full runs
  (`web/e2e/meetings-journey.spec.ts`; its seed is `tests/e2e_meetings.py`, `tests/test_e2e_meetings_seed.py`).
  **Left:** the journey passing in a browser run, a capture for an entry nobody else is on, and an undo for "nothing to note".
- [ ] [S3] **People memory:** last in touch, asked of and by them, what matters to them, how they like to be reached, their
  dates, all with evidence; shown before a meeting, and one line when a promised follow-up has gone quiet.
  **Built so far (S3, change log 193):** a person's page has What to remember by rules, each part with its evidence: last in
  touch (their mail, the person's mail to them, a copied message, an ended entry), what is open both ways, how to reach them
  and the way they last wrote from, their dates (a date word and the next day, or a full date ahead) and the facts the
  person kept about them; and the Today line "Follow up with <person>: <promise> has gone quiet" after
  `steward.people.quiet_promise_days` (`engine/people_memory.py`, `tests/test_meetings_people.py`,
  `web/src/components/MeetingPrep.test.tsx`). **Built (cleanup batch):** Send a follow-up from the line (a message to whoever owes the promise, written from the wording
  sheet and drafted as an act for the person's yes) and Snooze to a day from a list, with Undo
  (`tests/test_quiet_line_acts.py`, `web/src/components/MeetingPrep.test.tsx`); the person's page journey, which has run in the full runs
  (`web/e2e/meetings-journey.spec.ts`). **Left:** who asked a question (a question has no asker, so "asked by
  them" is the replies owed), dates from a contact source or in other languages.

S4. **What arrives, and where it may go:**
- [ ] [S4] **Dates in documents:** deadlines, renewals, expiries, warranties and bookings become dated facts with a proposed
  reminder; travel and booking confirmations become the app's own calendar entries. Bills are reminders only: no bank
  connection, balances or cash flow (owner, 2026-10-17).
  Booking confirmations are read from the structured data the mail carries (`engine/bookings.py`,
  `tests/test_bookings.py`, fictional samples in `tests/fixtures/bookings/`): flights, stays, events, restaurants,
  rental cars and trains, with every missing or unclear field reported and nothing guessed from the prose.
  Bill dates by rules (`engine/bill_dates.py`, `tests/test_bill_dates.py`): a day of the month (the 31st becomes the
  month's last day), the last day, the nth weekday, every N weeks or yearly, moved to the previous or next business
  day around weekends and the person's holidays, each with reminders some days before.
  **Built so far (S4, change log 194):** a booking an input carries as structured data becomes the app's own calendar
  entry by rules (local, never an act), titled by its kind and place, with the confirmation's code, provider or place as
  its evidence, and with what could not be made listed on the changeset; the assistant's own entry for the same booking
  is not added twice (`engine/booking_entries.py`, `tests/test_booking_entries.py`). A deadline, renewal, expiry, warranty
  end or bill an input states with a full date becomes a fact with its day and kind, refused unless its quote states that
  day, with a reminder proposed by the rules for the working morning `steward.dates.lead_days` before it, held for the
  person's yes (also for a to-do due on a day its input labels); a kept reminder shows on Today from its moment until the
  day has passed; one prompt line and one evaluation case in each fictional workspace
  (`engine/dated_facts.py`, `tests/test_dated_facts.py`, `web/src/lib/queue-words.test.ts`,
  `web/src/components/TodayArrives.test.tsx`). **Left:** a booking in mail read through a connector (the connectors hand
  over plain text, so only markup in a pasted or dropped message is read until a connector carries it), dated facts by
  rules alone when the assistant misses one, delivering a fact's reminder through the person's own calendar or mail,
  and a bill's amount (never: bills are reminders only).
- [ ] [S4] **Areas of life** (work, home, a side project) with their own data level and allowed AI accounts, one Today across
  them, and **the separation visible:** each area says which account reads it and whether anything leaves the
  computer, and a draft for one area never draws on another area's knowledge (the packet's reach stops at the area).
  **Personal, decided** (owner, 2026-10-20; design 6.32 "Personal life"): setup makes one Personal project; areas (no end
  date) and personal projects (with an end) under it, proposed by the assistant once several items share a theme and
  confirmed by the person; a move teaches the next filing; privacy per area through content levels; Personal left out
  of work reports. First five minutes: one Personal project and no questions until a pattern shows.
  **Built so far (S4, change log 194):** a project is an area (`area`, no end day, so never behind) or a project with an
  end, under Personal or an area; a draft or an input about a project in an area leaves out the facts, lessons, open
  items and projects of every other area (the packet's reach stops at the area); a project's page says which accounts
  may read it (its content levels and those above it), where each runs, and whether anything is sent away from the
  computer, or that no account may read it; when `steward.areas.propose_after` items filed under Personal itself share a
  word, one Today suggestion offers an area for them and Start files them as the person's own edits (each a correction)
  with Undo (`engine/areas.py`, `tests/test_areas.py`, `web/src/components/TodayArrives.test.tsx`,
  `web/src/components/ProjectKnows.test.tsx`). **Left:** a per-area allowed-account
  picker on the page (the levels are set where content levels are), the meeting-prep and people-memory drafts reading the
  same reach, and the filter "one Today across them, tagged by area".
- [ ] [S4] **Capture from anywhere:** a forward-to address or watched folder, voice notes transcribed through a new adapter
  capability, the phone page's capture box; the global shortcut with phase I's menu bar and tray app.
  **Built so far (S4, change log 194):** a capture folder is a source of the core's `capture` kind: what lands in it is
  handed in as the person's own words (a trusted source authored by them, like a typed note), the first read included; a
  sound file dropped there, or on the Hand in drawer, is a voice note, kept and turned into text through the adapter
  capability `transcribe` (a model is listed as taking speech by its account's `transcribe_models` or its catalog entry,
  never assumed), estimated from the file's size, held for the person's go above the configured amount, recorded as a run,
  and stopped with "This account can't transcribe" when no account can; its words go on as the person's own note. The
  phone already has a capture box: the full-screen Hand in sheet from the + (`engine/capture.py`, `engine/transcribe.py`,
  `tests/test_capture.py`, `web/src/lib/queue-words.test.ts`). **Left, waiting for phase I:** the forward-to address and the
  global shortcut with the menu bar and tray app. **Left:** speech-to-text on the native and command-line adapters (they
  refuse a voice note, and only the common OpenAI-compatible path takes one), and a browser journey in the end-to-end
  tests.

S5. **Manner and proof:**
- [ ] [S5] **Gentle suggestions with choices** on patterns, each choice recorded as a signal, within the attention budget; the
  governor's stale sweep for the person's own items is brought forward from phase E.
  **Built so far (S5, change log 195):** a to-do moved `steward.patterns.moved_times` times, a promise re-dated
  `redated_times` times and a person owed `owed_replies` replies are each one suggestion line with choices, and the
  stale line carries Keep, Drop and Snooze for one to-do (Keep them and Snooze them for several); each choice acts at
  once, records a `suggestion_chosen` signal and has Undo, inside the attention budget (`tests/test_patterns.py`,
  `web/src/components/SuggestionChoices.test.tsx`). **Left:** a separate stale line for each of several to-dos.
- [ ] [S5] **Talking to Reginald:** the conversation on a record (plugin question 190) as the way to ask for anything, every
  proposed change kept or dropped inline.
  **Built so far (S5, change log 195):** a box on a to-do, question, person, project or calendar entry: each message an
  ask about the record with the earlier exchanges, estimated and held for the go, answered with prose and the changes
  listed under it, each kept or dropped there; kept on the record (`tests/test_conversation.py`,
  `web/src/components/RecordConversation.test.tsx`). **Left:** the core's search (plugin question 207) bringing older
  history in, and the box on every screen of a record.
- [x] [S5] **The core reads as a daily assistant:** screens, prompts and help audited for project-manager wording; what is
  PM-only is listed for the PM pack (phase P). **Built (S5, change log 195):** the wording sheet, the prompts, the
  playbook guidance, the guide and the settings descriptions say "you", "the user" or "the person"; the PM-only concepts
  are in `docs/project/pm-pack-items.md`
  (`tests/test_wording.py::test_no_screen_wording_talks_to_a_project_manager`,
  `tests/test_wording.py::test_the_settings_prompts_and_guide_a_person_or_the_assistant_reads_say_the_user_not_a_project_manager`).
- [ ] [S5] **The outcome, measured** on the Quality screen (6.20): open promises found that the person kept, false alerts
  (dismissed or corrected), time spent reviewing, and follow-ups completed. The exit test reads these from the owner's
  week.
  **Built so far (S5, change log 195):** the four measures per week and for the window on `GET /api/quality` and the
  Quality screen (`tests/test_outcome.py`, `web/src/components/Quality.test.tsx`, `web/src/lib/review-time.test.tsx`).
  **Left:** review time from screens beyond review mode, What changed and Since yesterday; the exit is the owner's
  measured week.

Decided by the owner (2026-10-17): approved mail and calendar management in 1.0 (S1b); reminders reach a sleeping
person through their own calendar or a mail to themselves, no third-party push, a companion phone app after 1.0; the
first audience is independent professionals juggling clients and personal life, tested first by the owner's colleagues
and people answering a LinkedIn post. Areas stay inside one workspace.

## Phase U: the UI/UX review's findings (review of 45f7102, 2026-10-26)

The reviewer walked the whole app as two beginners ("Just me" and "Me and my work" for a small business); the review is
in `reviews/ui-ux-2026-10/review-45f7102/` (README: verdict, findings F1 to F27, one place to act, the proposals;
`settings.md`: every on-screen field with a verdict; `day-mode.md` and its tokens). Its setup checks and C57, copied here
as asked (the reviewer's P1 to P12 are numbered U1 to U12 here, so they don't clash with the open promises):

- [x] [U1] The first screen says what the app does for the person, what they'll need and the time, with no PM words.
  **Built:** `tests/test_walkthrough.py::test_the_walkthrough_opens_by_itself_on_a_new_workspace_on_welcome`, `web/src/components/Walkthrough.test.tsx` ("a fresh walkthrough opens on Welcome").
- [x] [U2] Progress reads "n of 7" in the wizard, on Done and on Today. All three agree.
  **Built:** `tests/test_walkthrough.py::test_todays_setup_count_equals_the_walkthroughs`, `web/src/components/Walkthrough.test.tsx` ("progress reads 1 of 7 through 7 of 7, in the one order").
- [x] [U3] A step is ticked only when its thing happened. Otherwise it reads "Skipped".
  **Built:** `tests/test_walkthrough.py::test_skipping_mail_makes_your_promises_skipped_with_the_needs_mail_reason`.
- [x] [U4] "Just me": no screen shows Work, Project, Stage, Organization, Owner or Template.
  **Built:** `web/e2e/just-me.spec.ts` (the main screens, setup and Done, the add forms, row menus, Knowledge, Quality, Ask and
  the record pages, lowercase "project" and "workspace" too), `tests/test_settings_cut.py::test_a_hint_never_says_work_project_stage_organization_owner_or_template`.
- [x] [U5] No sorting rule sets aside mail for being personal.
  **Built:** `tests/test_handled.py::test_a_personal_message_from_a_friend_is_not_on_the_set_aside_tab_and_is_filed_under_personal`.
- [x] [U6] "My own business" asks the business's name, what it works on (paste allowed) and, per mailbox, which side it
  belongs to.
  **Built:** `tests/test_walkthrough.py::test_a_job_and_two_businesses_make_three_sides_in_order_with_their_kinds`, `::test_what_a_business_works_on_becomes_projects_under_it_through_the_project_route`, `::test_the_sides_a_mailbox_serves_are_saved_through_settings_and_file_what_nothing_else_places`.
- [x] [U7] People on the personal side: a relation box that starts empty, suggestions from mail, and paste a list.
  **Built:** `tests/test_people_suggestions.py`, `web/src/components/People.test.tsx`.
- [x] [U8] The first result reads sent mail by default. An empty result says what was read and offers "Hand something in".
  **Built:** `tests/test_sent_folder.py`, `tests/test_first_promises.py`, `web/src/components/FirstPromises.test.tsx`.
- [x] [U9] The assistant is introduced by name before anything refers to it. The workspace never shows as "Workspace".
  **Built:** `tests/test_walkthrough.py::test_saving_the_persons_name_names_a_default_named_workspace_after_them_and_leaves_a_renamed_one_alone`, `web/src/components/Walkthrough.test.tsx` ("You says what the assistant is called, and Rename...").
- [x] [U10] Today shows each item once (C57), with at most three rail cards.
  **Built:** `tests/test_today_queue.py::test_no_line_key_repeats_on_today_after_each_kind_of_input`, `web/src/components/TodayRail.test.tsx` ("the rail has at most three cards...").
- [x] [U11] At 390px, setup's first field is above the fold, and the step list is one line.
  **Built:** `web/e2e/shell.spec.ts` ("on a phone the setup shows its place on one line, the list is behind Steps, and You's first field is above the fold").
- [x] [U12] Settings: at most 26 basic fields, at most 30 advanced, and no ids or key names (see `settings.md`).
  **Built:** `tests/test_settings_cut.py::test_the_settings_walk_counts_at_most_26_basic_and_30_advanced`, `::test_a_hint_names_no_code_like_id_and_no_word_of_the_files`, `web/e2e/settings-walk.spec.ts`.
- [x] [C57] An item appears once on Today.
  **Built:** `tests/test_today_queue.py::test_an_item_that_would_fall_in_two_groups_stays_in_the_higher_one_only`, `::test_no_line_key_repeats_with_overdue_to_dos_setup_open_and_mail_not_connected`.

### Phase U, second pass (review of f973493, 2026-10-28)

The reviewer's second pass (`reviews/ui-ux-2026-10/review-f973493/`) and the designer's answers F39 to F46
(`docs/project/designer-answers-2026-10-28.md`) are all built here (owner, 2026-10-28; decision 2026-10-28, change log
234 and 237), in batches with the full suites once per batch. The reviewer then walked a fresh install again with both
personas (`reviews/ui-ux-2026-10/validate-82d24cc/`): G1 to G4 fixed, phase U closed (roadmap A2b).
- [x] [G1-G4] The P0s: no raw data in messages and none over a control (G1); a review on Today (G2, F39); unsure filing
  under Personal with one question (G3, F40, F41); setup reads an add-on's sent mail (G4, F10). **Built:**
  G1 `web/src/lib/raw-data.test.ts`, `web/src/lib/settings-save.test.tsx`,
  `tests/test_screen_text.py::test_no_message_toast_title_or_label_shows_json_a_record_id_or_a_raw_mail_header`;
  G2 `tests/test_review_batches.py`, `tests/test_today_adds_no_lines.py`, `web/e2e/today-review.spec.ts`;
  G3 `tests/test_filing_unsure.py`, `tests/test_filing_api.py`, `web/src/components/TodaySides.test.tsx`,
  `web/src/components/Unfiled.test.tsx`;
  G4 `tests/test_sent_folder_addon.py`, `tests/test_first_promises.py`, `web/src/components/FirstPromises.test.tsx`.
- [x] [G5-G14] The P1s: the AI step's words (G5, F46), the service's name (G6), the setup group saved with its jobs (G7),
  ticks from records (G8), the brief summarises (G9, F42), plain titles and facts (G10, F44), phone lines (G11), tonal
  in night mode (G12), "Who they are" (G13, F45), the outside marker (G14, F43). **Built:**
  G5 `web/src/components/WelcomeAi.test.tsx`,
  `tests/test_work_access.py::test_a_new_or_fallback_account_reads_nothing_private_until_the_person_says_yes_for_that_account`;
  G6 and G7 `web/src/components/Walkthrough.test.tsx`;
  G8 `tests/test_walkthrough.py::test_every_counted_tick_is_computed_from_its_own_record_and_no_screen_state_ticks_one`,
  `::test_a_first_note_is_ticked_only_when_something_was_handed_in_not_for_any_change_made_on_a_screen`,
  `::test_your_promises_is_not_ticked_before_its_screen_was_reached_even_when_the_look_back_ran`;
  G9 `tests/test_brief.py`, `web/src/components/BriefCard.test.tsx`;
  G10 `tests/test_plain_titles.py`, `web/src/components/RecordPageRecords.test.tsx`;
  G11 and G12 `web/e2e/today-review.spec.ts`, `web/src/theme/dayMode.test.ts`;
  G13 `web/src/components/People.test.tsx`;
  G14 `web/src/components/Today.test.tsx`, `web/src/components/MeetingPrep.test.tsx` (the meeting prep's tag went with A2).
- [x] [G15-G23] The P2s, as the review lists them. **Built:** G15 `web/src/lib/wording.test.tsx`; G16 and G19
  `web/src/components/Walkthrough.test.tsx`,
  `tests/test_walkthrough.py::test_the_work_templates_are_offered_only_when_no_jobs_were_given_in_setup`; G17, G22
  `web/src/components/TodayRail.test.tsx`; G18 `web/src/components/Settings.test.tsx`,
  `web/src/components/Notifications.test.tsx`, `tests/test_settings_cut.py`; G20 `web/src/components/FollowUps.test.tsx`;
  G21 `web/src/components/OpenItems.test.tsx`, `web/src/wording/wording.test.ts` ("Stale" and "On hold" everywhere, A2);
  G23 `web/src/components/RecordPageRecords.test.tsx`.
- [x] [U13] No JSON, ids or raw headers in any message, title or label. **Built:** `web/src/lib/raw-data.test.ts`,
  `tests/test_screen_text.py::test_no_message_toast_title_or_label_shows_json_a_record_id_or_a_raw_mail_header`,
  `tests/test_note_title_migration.py` (notes stored before the title rule were re-titled once, A2).
- [x] [U14] A review happens on Today: the address stays and the count never rises; no Today action adds lines.
  **Built:** `tests/test_today_adds_no_lines.py`, `web/e2e/today-review.spec.ts`.
- [x] [U15] A business's first read leaves at most one filing question. **Built:** `tests/test_filing_unsure.py` (one
  mailbox serving both sides ends with one question and nothing unfiled; also with a job and a business beside Personal:
  one question per side a day, one Today line that names neither).
- [x] [U16] Setup's ticks come from records. **Built:**
  `tests/test_walkthrough.py::test_every_counted_tick_is_computed_from_its_own_record_and_no_screen_state_ticks_one`.
- [x] [U17] At 390px, queue titles show at least 25 characters. **Built:** `web/e2e/today-review.spec.ts`.
- [x] [U18] Row actions are tonal in both themes, only the selected line's filled. **Built:** `web/src/theme/dayMode.test.ts`,
  `web/e2e/today-review.spec.ts`.
- [x] [U19] A hand-made file link survives the older copy moving into Archive and the current copy being renamed.
  **Built:**
  `tests/test_version_choices.py::test_a_link_survives_the_older_copy_moving_into_archive_and_the_current_copy_being_renamed`.
- [x] [U20] A rail panel opened on a phone stays open when Today's data refreshes. **Built:** `web/src/components/TodayRailFold.test.tsx`
  (the cause: a card out of the page while what it asks is on its way lost its own fold; the rail keeps it now),
  `web/e2e/layout.spec.ts` (the walk opens Came in plainly, no retry).
- [x] [G-notices] Notices name the apps they go to, from a shipped list, each with its message shape and where to find its
  address (the reviewer's answer 10; owner, 2026-10-28). **Built:** `tests/test_notice_apps.py`,
  `web/src/components/Notifications.test.tsx`.

### Before AI hardening: the audit of 2026-10-28 (path to 1.0, the reviewer's and the designer's notes)

Two read-only audits checked every roadmap item, the reviewer's notes (F1 to F27, G1 to G23, the 13 answers, the
re-reviews, C1 to C57) and the designer's answers and notes (F1 to F46, lessons, future notes, the day's input) against the
code. Nearly all is built or planned. What is left, in two batches:
- [x] [A1] Bookkeeping: tick the boxes built and never ticked (phase U's second pass, B-6a, B-6b, B-8, B-11c part 2),
  CHANGES 234 complete and marked built, "Where things stand" brought up to date, built work no longer marked "designed"
  in the design, stale open-promise rows refreshed and cells capped, and two decisions written down that were taken in
  building: the handled-for-you count on Today supersedes the designer's F34 and P58 ("nothing about handled mail on
  Today"), and removing the Top priorities card keeps F15, F16 and F24's chase rules without their display.
  *Checked by reading* (2026-10-28, docs only): every box named is ticked with its test or left open with what is left, the
  design's marks and change log 234 are brought up to date, and the two decisions are in `docs/decisions.md` (2026-10-28).
- [x] [A2] The second pass's leftovers: notes stored before today re-titled once (no raw headers anywhere); U20; the
  "From an email" note at a link to open and a payment; "Stale" and "On hold" replaced everywhere (G21); no "Outside" tag
  on meeting-prep lines (G14); U15 with a job and a business (two sides). **Built:** `tests/test_note_title_migration.py`,
  `web/src/components/TodayRailFold.test.tsx`, `tests/test_outside_steps.py`, `web/src/components/TodayArrives.test.tsx`,
  `web/src/wording/wording.test.ts`, `web/src/components/MeetingPrep.test.tsx`, `tests/test_filing_unsure.py` (change log 235).
- [x] [A2b] The reviewer's check of the fixes (`reviews/ui-ux-2026-10/validate-82d24cc/`, 2026-10-28): G1 to G4 fixed,
  both personas finish setup alone, no Today action raised the count; phase U can close. Backlog H1 to H8: the "since
  yesterday" line folded into the review lines (H1); "Not looked at before" said once (H2); "Leave both empty to keep it to
  your own life" (H3); no raw dates in the review's items and facts that say who said them (H4); no stray "·" on the
  Personal page (H5); "might be" Hale Upholstery's (H6); a quick second tick queued, not dropped, and a failed tick named
  with Try again (H7); the last message matching the final state of the ticks (H8). **Built:** `tests/test_since_yesterday.py`
  (H1), `web/src/components/LookBack.test.tsx` (H2), `web/src/wording/wording.test.ts` (H3, H6), `web/src/components/Today.test.tsx`,
  `FactSays.test.tsx`, `tests/test_fact_says.py` (H4), `RecordPageRecords.test.tsx` (H5), `Walkthrough.test.tsx` (H7, H8). The fact the
  reviewer saw, "The notes list that the offsite is on a Friday.", is the stand-in answer's shape for a "Decided:" line in
  a document (`engine/ai/adapters/stand_in.py`): the line says no one chose, and the stand-in sets no speaker; a fact with
  a known speaker now reads "Pat says …" with its day.
- [x] [A3] The gate's instruments matched to the drafted pass bar (P65): review time on Today's review pane, counters for
  lost promises and for a source unread over a day without a line, a procedure for the 50-message sample, design 6.32's
  thresholds paragraph matched to the draft once the owner says yes.
  *Built so far (2026-10-28):* the review pane on Today is timed and the median is given; lost promises, sources unread over a day
  and the 50-message sample (setting, draw, the person's counts, `docs/project/gate-sample-procedure.md`) are counted with their
  denominators (`tests/test_gate_instruments.py`, `web/src/components/BatchDetail.test.tsx`, `Quality.test.tsx`). *Not part of
  the box, waiting for the owner's yes (P65):* the thresholds paragraph of design 6.32, matched to the drafted pass bar once the
  owner says yes.
- [ ] [A4] The checklist's partials (C13, C15, C16, C23, C24, C29, C35, C36, C41, C43, C45) built or re-marked, with C21
  and C22 re-marked. Built with tests (`docs/project/ui-review-status-2026-10-20.md`): C13, C15, C21, C22, C25, C36, C41, C45.
  Left, each re-marked with why: C16 (the rail's rows to `ui/Row`), C23 (two columns and inline validation in the forms),
  C24 (a sweep of about 240 disabled controls), C29 (a currency setting), C35 (the `.kind` chips and three filter groups)
  and C43 (queued clicks while offline).
- [x] [A5] The designer's open points: the day-30 scenario tuned to the typical-week shares (P5); the `language.*` word
  lists moved into shipped data (full-read point 5); the Monday message asking once who it is for; "Drop it and draft the
  note"; P40 point 8 reproduced; B-11b's tiers with a cost per day. (S4's setup tick boxes for common areas: dropped, owner 2026-10-28; areas
  come only from the assistant's proposals, as design 7.8 says.)
  *Built so far (2026-10-28):* the day-30 scenario in the typical-week shares (P5, `tests/test_pairs.py`); the Monday message asking once who it
  is for; "Drop it and draft the note"; P40 point 8 reproduced with a test that passes (see `open-promises.md`); B-11b's cost per day
  for each tier (`tests/test_tier_costs.py`); the 52 `language.*` word lists in shipped data, `engine/defaults/language/en-US.yaml`, each setting an
  optional override that replaces the whole shipped list and applies at once (full-read point 5, change log 236, `tests/test_language_words.py`).
  Nothing is left in this item.
- Held, not dropped: `includes:` (P62, P39) with the next plugin API release; calendar create, move and cancel and the
  add-on channels with the add-on builders.

## Phase I: installers for Windows and macOS (after phase S)

- [ ] [I-0d] **The person can always start and restart the app without a terminal** (owner, 2026-10-26: "the user watches
  the app, so the user needs to be able to reboot it"): the app's icon starts it when it isn't running and opens the page
  when it is; a page the browser shows when the app can't be reached says plainly that it isn't running and how to start
  it; and a Restart in the app's menu, at the person's choice only (the app never restarts on its own).
- [ ] [I-0c] **Before any installer work: everything batched from the owner's first fresh-workspace setup is fixed**
  (owner, 2026-10-22: "for sure all of what is batched up has to be fixed before we spend time on installers"): open
  promises P34, P36, P37, P38's free-add-on part, P39 and P40 (all twelve setup findings), each with its named test.
- [ ] [I-0a] **Before any installer work: every kind of AI account hardened** (owner, 2026-10-21: "I want this hardened
  across the board before we get to the installer"): B-11c done (each catalog entry confirmed against its own
  documentation with a named test per finding, and the native adapter in), subscription programs first.
- [ ] [I-0] **Before any installer work: setup and the everyday screens reviewed as a normal non-IT person** (owner,
  2026-10-21, passed to the UI/UX reviewer). The reviewer walks setup and the daily screens as a personal and business
  tool, not a project manager's. Setup is reshaped to match design 7 ("Setup for a person, with a business optional", in the UI/UX
  reviewer's order of 2026-10-21: the business question in step 1, Welcome not counted, a hand-in when mail is skipped,
  people by relation, small-business words, Personal in place of Projects):
  what this is and what to do first; the personal side (the people in one's life, personal business); then the optional
  "Do you have a business you want to track?" (its name, programs, projects, people). The new flow is built under the
  UI rules already in force (design Part 7 and CLAUDE.md's UI rules: the wording sheet, the cursor in the first field,
  lists to pick from, one primary action, Continue and Skip as the walkthrough has them, no sideways scroll at any
  width, WCAG 2.2 AA in light and dark, and the browser tests at every width). Done when the reviewer's findings
  are answered and a journey test walks both paths (personal only; personal and a business) with no work terms on the
  personal-only path.
  Inputs, reviewed against design 7 and the wording sheet (2026-10-21): `docs/project/setup-inputs/` holds the setup
  wording (`wording.yaml`), the relations list for the Personal side (`relations.yaml`, a setting's default) and the
  common Personal areas offered as unticked boxes (`areas.yaml`, a setting's default; phase S4 proposes areas from a
  pattern). A job or a business is the second side, the person's choice in step 1, with `workspace.project.work_kind`
  picking its words (decisions 2026-10-21, "A job or a business can be the second side").

**The tester milestone (owner, 2026-10-18; designer's F8 and plan point 5, 2026-10-19).** Measured also by how many
items each tester brings back through "Missed one" per week, which should fall from week one to week two. The invitation
says personal mail, or work mail only with the employer's OK (risk R14). A small invited group tests the installers with the mail and calendar
add-on. Gated on: every integrity defect in phase B's first items fixed with its test; the installers built and tried
on a clean Mac and a clean Windows computer with the same journey (install, connect mail, a first result, Undo,
reopen); and the gate week passed, so its thresholds exist. The testers are held to the thresholds the gate week set for
missed out of present, silent closes and wrong endings: those numbers come from real use, and per-tester thresholds would
move the bar to fit. Counts that depend on how much mail a person gets are reported, not gated. The "Missed one" trend
from week one to week two is the one measure only the testers have. The two tester weeks are their own row in the batches
("Tester weeks").

**The owner decided (2026-10-18):** (1) every defect above is fixed before anyone outside tests the app: the tester
milestone below is gated on them; (2) testers use the mail and calendar add-on, since a test without real mail isn't
much of a test; it stays an add-on and becomes optional at 1.0, and how testers get it (inside the installers, or
offered from the catalog during setup) is designed in phase I without putting its code in this repository; (3) no
fixed date: the 2026-10-20 target is dropped and the tester group follows the gates; (4) the website is fed by this
plan (phase I, "The website").

**The website (owner, 2026-10-18).** The product's public website lives in its own repository, worked by its own
session; today it is a coming-soon page. This plan feeds it what to say, and it never says more than the app does:
- [ ] [I-2] A content brief for the website's session at each milestone that changes what's true (the tester milestone,
  each release, 1.0): what the product does today, what it doesn't yet, who it's for, how to join the testers,
  where downloads are, and the mission's promises to the person (`docs/project/charter.md`, "Mission"), each checked
  against the release before it is sent. Written here from the release state; sent with `send_message`; the website's repository never
  receives code or private details from this one.
- [ ] [I-2] Keeping the two in step: the release workflow publishes the facts the website shows (latest version, download
  links and their checksums, release notes) in a form the website reads, so the site is never edited by hand to
  match a release. Designed with the website's session; the domain and repository are named in that session's
  settings, not in this repository.

The owner's ask (2026-10-16): "I really want to be able to create windows and mac distributions so that I can send them
to people for testing, and they will not want to do all the command lines to build it. Can we have a CI/CD setup that
will create windows and mac installers? Those windows/mac installers should set the program to be installed in the
appropriate places, and default the storage to the place where windows/mac typically store application data." It comes
after phase S (the owner's order, 2026-10-17) and before phase C's plugin API release. Today a tag builds the Python package with install scripts
(`.github/workflows/release.yml`); a tester still needs a terminal.

- [ ] [I-1] **Built by CI from a tag:** the same `v*` tag that builds the package also builds, on macOS and Windows runners, a
  macOS disk image (`.dmg`, Apple silicon and Intel) and a Windows installer (`.exe` setup), each with its own Python,
  the built screens and the core's shipped files inside, so a tester needs no Python, Node or terminal. The release page
  lists them with their SHA-256. The suite and the self-check run on each runner before anything is attached.
- [ ] [I-1] **Installed where each system expects:** macOS drags the app to Applications; Windows installs for the person
  (no administrator rights needed) in the per-user programs folder, with a Start menu entry and an uninstaller. This
  replaces phase B's "A launcher for people who never open a terminal".
- [ ] [I-1] **The data where each system keeps app data:** the workspace, its private folder, backups' defaults and logs go to
  the system's own place: on macOS the person's Application Support folder (logs in their Logs folder), on Windows their
  local AppData folder, never the roaming one, which a company may put on a network share where a database's locks
  are unreliable (logs and cache beside the data, each in its own folder). The app's location is never written to.
  Where the folder is stays a setting (`cockpit init` and the walkthrough can pick another), and uninstalling never
  deletes the person's data. The folders are computed by `engine/app_dirs.py` (`tests/test_app_dirs.py`); nothing
  uses it until phase I.
- [ ] [I-1] **Opening the app starts it:** the app starts the local server on loopback, opens the person's browser at it, and
  shows a menu bar (macOS) or tray (Windows) item with Open, Restart (only when one is waiting, per the restart rule) and
  Quit. A second launch opens the running one instead of starting another. The first launch lands in the walkthrough on
  a new workspace in the default folder (`cockpit init` with no template).
  The launcher's core is built (`engine/launcher.py`, `tests/test_launcher.py`): the per-folder lock, the readiness
  wait, the tray loop on the main thread and one server thread. Left: start it from the app with the configured
  base path and the install token, the menu wording from the wording sheet, the brand icon, `pystray` and Pillow in
  the desktop build only, one restart path shared with `cockpit serve` (which restarts by starting itself again),
  and the manual check on Windows and macOS.
  Draft build files (PyInstaller for macOS and Windows, a per-user Inno Setup installer, a tag workflow with
  checksums) are in `deploy/desktop/`, not switched on; `deploy/desktop/DRAFT.md` lists what to verify and fix first.
  The icon set ("Reginald's bow": SVG masters, the macOS iconset and .icns, the Windows .ico, one-color menu bar and
  tray icons in black and white, and the favicon) is in `docs/design/brand/icons/`; `export_icons.py` rebuilds the
  exports from the renders, checked to reproduce them pixel for pixel.
- [ ] [I-1] **Add-ons install beside the app, not inside it:** an installed app's own folder is read-only (and signed), so
  Install on Add-ons puts add-ons in a per-person add-ons folder in the app-data place, which the app reads at start.
- [ ] [I-1] **A price list for AI models, fetched with the release feed** (owner, 2026-10-22): the maintainers publish
  each model's prices with every release, and the app fetches them on the weekly model check, so a service whose own
  listing has no prices still gets a known price, and a newer model's price can be compared before any move (design 6.16).
- [ ] [I-1] **Updates:** the app checks the release feed it was built with (a build variable, empty in the repository) and
  shows "A new version is ready" with what changed; the person downloads and installs it themselves; their data stays.
- [ ] [I-2] **Three people set it up alone** (the first-run review's N8): three people who match the persona each complete
  setup alone ("set it up and see what it does with one of your emails") in under 20 minutes, watched without help;
  every stop or question becomes a finding. The exit test of the tester milestone.
- [ ] [I-2] **The release build fills in its catalog and feedback addresses** from repository variables, as the package build
  already does, so a tester's Add-ons lists packs with nothing to type.
- [ ] [I-1] **Signed so the systems let it open** (owner, 2026-10-21: decided, not before 1.0: "we can clearly state
  it's currently unsigned on the webpage. When we get more users I'll look at that again", paid for by Thimbleby Plus;
  1.0 ships unsigned, and the item below says how). Without signing, macOS refuses
  to open a downloaded app until the person allows it in Privacy & Security, and Windows SmartScreen warns before it
  runs. Signing needs an Apple Developer account (yearly fee) with notarization for macOS, and a code-signing
  certificate or signing service for Windows; the secrets live only in the repository's CI secrets. Until the owner
  decides, the builds are unsigned and the release notes say how to open them.
- [ ] [I-1] **A name and icons** (owner, 2026-10-16: "I also want to make sure we add proper icons and a good name. is PM
  Cockpit really a good name ... it should be marketed more as a daily assistant type thing versus only for PMs"): the
  product's name is **Thimbleby** (owner, 2026-10-17), and the assistant's default name is **Reginald**, which the
  person can still change; it is checked for clashes (app stores, trademarks, domains) before the installers ship. *First check
  (2026-10-17, the owner's research report, kept on their computer): two AI assistants already use the name in the same
  field (one with email integrations, one a reminder "butler"), a Windows productivity app has the exact name, the
  .app domain is held, and an official trademark search is still owed. "Morrowby" and "Daywarden" collided too; the owner chose
  Thimbleby after their own check; thimbleby.app was free on 2026-10-17 (the owner's check).* The name shown on
  screen, in the installers and in the docs comes from one place; internal names (the package, the command, the add-on
  entry point, the environment prefix) change, if at all, in phase C's plugin API release, so add-on builders adapt
  once. Icons: the app icon for macOS and Windows at every size, a one-color menu bar and tray icon, and the browser tab
  icon, from the designer. *Direction chosen 2026-10-17: "Reginald's bow", a cream thimble with a deep red bow tie and a
  gold rim on a deep red tile (concept: `docs/design/brand/icon-concept-reginalds-bow.webp`, an image-generator sketch,
  not a final file). The final set is redrawn as vector art: one consistent bow size and position at every size, the
  macOS tile on Apple's icon grid with its margin, no extra border on the dark version, dimples only at 512 and above,
  the bare silhouette with a white bow notch at 16, filled shapes for the menu bar and tray, a Windows .ico (16, 24,
  32, 48, 256) and the browser tab icon.*
- [ ] [I-1] **Nothing made-up ships** (owner, 2026-10-16: "I want it to come with all the capabilities but without all the
  nonsense demo setups that just make things confusing. The user can addon during setup"): the installed app has no
  sandbox command, no fictional workspaces and no example add-on; the first launch is the walkthrough on an empty
  workspace, and add-ons are offered in its add-ons step from the catalog. The fictional workspaces stay in the
  repository as test fixtures only.
- [ ] [I-1] **How it is built (research, 2026-10-17, checked against the code):** PyInstaller in its folder mode (not one
  file, which unpacks on every start) for the app; on macOS an `.app` signed with the hardened runtime, notarized and
  stapled, inside a `.dmg`, built separately on Apple silicon and Intel runners (pinned, not "latest"); on Windows an
  Inno Setup installer for the person only (`PrivilegesRequired=lowest`, under their local programs folder), with both
  the program and the installer signed. Python 3.12 on native runners; no Node or browser engine in the download (the
  screens are prebuilt and open in the person's own browser). The launcher: the menu bar or tray loop on the main
  thread, one server in the background (no reload, one worker), a readiness check before the browser opens, one
  instance only, and Quit stops everything. The local API already requires the install token besides loopback and the
  Host and Origin checks (`api/app.py`), which an app holding mail access needs. Updates start as "a new version is
  ready" opening the signed download; Sparkle (macOS) and WinSparkle (Windows) are the later step.
- [ ] [I-1] **Add-ons in an installed app (decide at the start of phase I, with a trial):** today Install unpacks a wheel into
  the app's own package folder (`engine/pack_install.py` `target()`), which a frozen, signed app can't take. The plan:
  an add-ons folder in the person's app-data place, put on the import path at start, filled with exactly the wheels a
  release lists (round 35's design: every wheel with its checksum, never from an index). Pure-Python wheels work that
  way. Wheels with compiled parts (a pack's XML or typesetting library) also need, on macOS, either the
  `disable-library-validation` entitlement (allowed for notarized apps; it lets the app load code not signed by its
  own team, so add-ons stay limited to checksummed catalog releases) or a separate Python worker for add-ons. The trial
  installs the writing pack's own wheels into a built app on both systems and picks one.
- [ ] [I-1] **Signing: unsigned to start** (owner, 2026-10-17: "i will just use unsigned to start"). The macOS build is
  only ad-hoc signed (Apple silicon needs that much, and PyInstaller does it), so a tester opens it once through
  System Settings, Privacy & Security, "Open Anyway"; on Windows, SmartScreen's "More info", then "Run anyway". The
  release notes and the download page show both, with pictures, and the download page says plainly, before the
  button, that the app is not yet signed, what the warning means and that signing comes later; each download's SHA-256
  checksum is shown beside it so a person can check the file is the one released. Unsigned builds don't enforce library validation, so
  compiled add-ons load without the entitlement for now; the trial above still decides the signed setup. Signing is
  added later without other changes. **Costs when it is (prices advertised 2026-10-17, before tax):** Apple Developer Program $99 a
  year (signing and notarization for direct downloads); Windows: Azure Artifact Signing Basic $9.99 a month with 5,000
  signatures (individuals eligible in the US and Canada, identity checked; signs from GitHub without a long-lived
  secret), or a standard certificate from about $129 a year plus a signing service or hardware token. About $219 a
  year for Apple plus Azure Basic. No signing removes SmartScreen's warning at once; reputation builds over downloads.
- [ ] [I-2] **Mail and calendar sign-in approval for testers and launch** (research the owner brought, 2026-10-17; the
  services' published rules, to be confirmed with them):
  - *Google:* the full feature set needs `gmail.modify` and `calendar.events` (plus `calendar.calendarlist.readonly`
    to pick calendars); Gmail reading is already a "restricted" permission, so a read-only test changes nothing. An
    app in Google's Testing mode allows up to 100 listed testers, shows an unverified warning, and its sign-ins expire
    after 7 days (testers reconnect weekly; the app's "sign in again" line covers it). Public use needs Google's
    verification: a verified domain (thimbleby.app), a homepage and privacy policy, a reason for each permission, a
    demonstration video. Sending mail content to a cloud AI service likely counts as processing outside the computer,
    which brings Google's yearly independent security assessment (priced by the assessing lab; ask for a written quote;
    a local model keeps the content on the computer). Start verification as soon as the acting features (S1b) can be
    shown.
  - *Microsoft:* `Mail.ReadWrite`, `Mail.Send` and `Calendars.ReadWrite` (with `offline_access` and `openid`); no
    published tester cap; personal Outlook accounts consent themselves; companies' consent rules often need an
    administrator's approval even for a verified publisher. Publisher verification is free but needs a verified
    organization in Microsoft's partner program.
  - *Both:* a public desktop client with the system browser, the authorization code flow and PKCE, no secret embedded
    in the app; and Thimbleby's own approval of every exact act stays, since a granted permission allows more than the
    person approved. For the first test: Google in Testing mode for under 100 people (others on Microsoft or a plain
    mailbox), a guide for company administrators, and the warning and weekly reconnection explained to testers.
- [ ] [I-1] **Passwords, keys and sign-in tokens in the system's own vault** (found writing the privacy policy, 2026-10-17):
  today they are files in the workspace's private folder, readable only by the person's account; the installed app
  keeps them in the macOS Keychain and Windows Credential Manager instead, with the files as the fallback where no vault
  exists. The privacy policy draft (`docs/design/brand/privacy-policy.md`) is updated to match when it lands.
- [ ] [I-1] **Exit test:** on a clean Mac and a clean Windows machine, download from the release page, install, open, finish
  the walkthrough to the first result, quit, reopen with the data still there, update to the next version, uninstall
  with the data kept. Journey tests cover what CI can (launch, the server answering, the data folder), and the owner
  checks the rest by hand on both systems.

- [ ] [I-3] **The free core release** (owner, 2026-10-20: "get to Thimbleby core faster and push and update the website";
  `docs/project/business-model.md`): after phase I's exit test, the open core is published under Apache-2.0 from a fresh
  public repository (owner action M5), with CONTRIBUTING (ideas welcome, no pull requests), SECURITY (how to report a
  problem privately) and a trademark note (Apache-2.0 doesn't license the name); the website shows the release (M6,
  I-2). A journey test: a free install connects an Outlook.com mailbox through a pasted registration, on the fake
  sign-in service the tests use; and the owner's live check of the same on a real Outlook.com and a real Gmail account
  (registration "In production"), which confirms the add-on's steps. Nothing in it waits for phase T.

## Phase T: Thimbleby+ (after the free core release, and only if the owner goes ahead)

The paid upgrade in `docs/project/business-model.md` (decisions, 2026-10-20): one yearly licence for one-click Gmail and
Outlook and every pack. It is conditional (owner, 2026-10-20: "a 'maybe' Thimbleby+"; "I don't want to be beholden to
this yearly Google assessment"), so nothing in the core depends on it. Owner actions M0 to M4 come first, M0 before
anything else. Each item ends with its named test. **Proposed, awaiting the functional designer's review**
(`docs/project/business-model-delta-gmail-later.md`): Plus launches with one-click Outlook and every pack, and Gmail's
one-click sign-in (with Google's yearly assessment, M1b) waits for a trigger; a tester registration the owner keeps in
Google's Testing status (M7) serves testers and founding members. The items below take it once it is accepted.

- [ ] [T-6] **Testers and the weekly sign-in** (functional designer, F27 and F29, 2026-10-21): a Today line the day
  before a known sign-in expiry ("<service> needs signing in again tomorrow"); mail unread while a sign-in lapsed shown
  as a coverage gap and counted apart from missed promises in the independent-list comparison; one question about it in
  the two-week check-in form; a dated list of everyone added to and removed from the tester registration, kept before
  anyone is added; and one of phase I's three testers on the free own-registration path.
- [ ] [T-7] **No dead end without mail** (F28): with no mail connected, the setup guide and the coverage line point to
  the mail add-on's steps, naming no service.

- [ ] [T-1] **The Plus licence, checked offline:** a licence file signed by the owner's key, kept in the workspace's
  private folder and checked with the public key the app ships with; no call home. Generic in the core: a catalog entry,
  a plugin manifest or a sign-in's own registration can name an entitlement (`plus`), and the core checks it without
  knowing what it unlocks (design 3.11).
- [ ] [T-2] **The add-on's own registration needs the entitlement:** the core uses a sign-in's shipped registration only
  while its entitlement is held; otherwise the Sign-ins row offers the person's own registration with the add-on's steps.
  Test: a lapsed licence keeps packs at their version, stops the one-click sign-in with the Sign-ins row's offer and a
  Today line, and a renewed licence brings it back.
- [ ] [T-3] **Downloads gated by the licence:** a small download address checks the licence and returns a short-lived
  link; Add-ons' Install sends the licence instead of a release host's read token (P15). Free add-ons download with no
  licence.
- [ ] [T-4] **Suggest something:** *Send feedback* and `report.draft` become one flow the person approves word for word;
  the assistant offers it when it hits something it can't do; release notes say what came from suggestions.
- [ ] [T-5] **The template gallery, as untrusted content** (after the paid 1.0 if time is short): templates shown in full
  before they are added, marked by origin, "from outside" in packets. Test: a gallery template whose help text tries to
  change routing changes nothing and reaches packets marked "from outside".

## Phase C: the writing pack in the owner's workspace

Re-sequenced on 2026-10-15 (the owner: the writing pack is finished completely before any other pack starts). Phase C is
the writing pack and what it needs from the core; the project management and publishing packs and the hand-offs between
packs are phase P, after it.

**Exit test:** in the owner's own workspace:
- the writing pack takes a fictional manuscript from import to a built PDF and EPUB the owner approves, working alone;
- **the pack learns too:** a correction in the pack's own work produces a proposal, and a later similar input comes out
  right. This proves the plugin API call in L2 carries the knowledge to packs.

C0. **The capability matrix, step 2: work goes to a model that can do it** (owner, 2026-10-15; design 6.16; about 1.5
sessions; first in phase C because the writing pack is the first use where model choice per kind of work matters most):
- [ ] [C0] task kinds, the core's and a pack's, declare the skills they need (plugin API: `task_kind(skills=...)` and `skills:`
  on a pack's cases), and the guide says so once it is built;
- [ ] [C0] the router picks the cheapest allowed model whose measured scores hold for every needed skill, across accounts,
  within the data level and the fallback rules; unknown or stale counts as not measured, and the run says which skill
  decided;
- [ ] [C0] corrections in real use count against the model for the skills they touch, shown apart from measured cases;
- [ ] [C0] Today's one line when the matrix shows a cheaper model is as good, or the configured one is low for a needed
  skill; nothing switches on its own.

C1. **The writing pack, installed and reviewed.**
- [ ] [C1] **A pack's own libraries install from the screen** (round 35, moved from phase A): a release names every package it
  needs with checksums. Install shows what will be added, refuses conflicts with the app's own, and Remove takes out only
  what that pack needed. Answered with plugin question 183 (file types a pack needs).
- [ ] [C1] It installs from Add-ons with its libraries.
- [ ] [C1] Its two load notes are settled: SVG and TIFF files the workspace doesn't accept yet.
- [ ] [C1] Its open questions are answered: 170, a review accepting a group of the assistant's changes at once; 172,
  guide fixes.
- [ ] [C1] A host-side review of the pack: what it registers and reaches, its rules, and its tests run against this host.
  It is checked on 2026-10-12 to load and register on plugin API 0.3.55.
- [ ] [C1] The owner's walkthrough on a fictional book, with what to change written down.

C4. **What the packs need from the core.**
- [ ] [C4] **The publisher and the file channel** (the publisher itself moves to phase S1b for mail and calendar; this item
  keeps the file channel). Approved files are saved or shared after the person approves the exact
  content. Waiting to go out lists them, with a diff where it applies. A page whose changes are logged as history rows
  logs each change, except the removal of a stray history row, which needs no row of its own (the functional designer's
  lesson 8, 2026-10-15).
- [ ] [C4] **Writing into a shared file someone else uses** (the original designer's lessons from running, 2026-10-13): write only the target cells or parts and copy every other
  part byte for byte, with a test that validations, conditional formats and formulas survive; "is it open?" checks for a
  process holding the file, not only a lock file (autosave on a synced cloud file leaves none); when it is open, hold the
  change and retry on a timer, then after writing wait for the sync to settle, re-read, and rewrite once if it was
  overwritten; after a few tries, go to the person once. Text written into someone else's table stays short and
  scannable (a key, a status word, a few words), explanations go in the assistant's own notes, and a cell where nothing
  was found stays blank.
- [ ] [C4] **Fact lookups** (6.19): published dates are looked up from the configured sources, never asked. Includes
  "add from <link>" reading the link's system of record first: its status, what shipped and its dates, and a finished
  item added with its facts and a question whether to mark it complete (the designer's lessons, 2026-10-19).
- [ ] [C4] Anything else either pack's builder asks for, answered in one weekly round.
- [ ] [C4] **Rounds 34 to 48 and 52, answered 2026-10-16** in `docs/project/plugin-answers-34-48.md` (sent to the builder, who
  confirmed and will adapt once): built together as phase C's first plugin API release, the dependency install in C1, and
  the conversation on a record (190) right after it. The owner keeps phase B first (2026-10-16: "Keep B first").
- [ ] [C4] **Round 39 from the writing pack's builder** (received 2026-10-13; answered in the weekly round, after L0):
  - 190, **a conversation on a record**: a thread kept on the record, opened from any screen with that record as its
    context, each message a request of a task kind the pack names, replies with citations, kept-or-dropped changes,
    queued work with its estimate, and questions answered by replying; it uses L2's bounded search. It is designed with
    Ask as a side pane (phase B) and built after L2, since it needs the search round; the design answer goes in the round.
  - 191, a task kind that declares the context it needs, so a run goes only to a model whose window fits, the estimate
    names it, and a run that fits nowhere says so before anything is sent (provider layer, 6.16).
  - 187, a preview beside a data form, run again after each save, read only, as the person.
  - 188, a small pack-defined value on a request, never shown, returned to the run.
  - 189, a computed panel column headed from the pack's wording.
- [ ] [C4] **Round 41 from the writing pack's builder** (received 2026-10-13; answered in the weekly round, after L0):
  - 193, a task kind whose `on` names several record kinds, the packet told which one it got;
  - 194, `$new:<n>` in a proposal for the record an earlier op creates, resolved by the applier in order, and refused
    with the reason when the person drops op n (applier work: the main session's);
  - 195, a `show_for`-style predicate on a person action, given the view and the target, quick and deterministic.
- [ ] [C4] **Round 42 from the writing pack's builder** (received 2026-10-13; answered in the weekly round, after L0):
  - 196, a task kind's declared tier holds over its role's tier (or is marked required), `ai.tasks.<kind>.tier` still
    overriding both; with 191's declared context need;
  - 197, `RefTo(..., blocks_delete=False)` for a reference that is history, left dangling and shown as removed.
- [ ] [C4] **Round 44 from the writing pack's builder** (received 2026-10-13; answered in the weekly round): 199, a request's
  part carrying a small pack-defined address for work on a record or file that isn't long text (with 188); 200, a record
  type saying where it is written, apart from a field named `project` (or the guide naming the rule); 201, the test
  kit's `ActionResult.apply` taking the requests to keep too.
- [ ] [C4] **Round 45** (received 2026-10-13): 202 answered at once from the code (a superseded request's `state` is set to
  done in the same change that sets `superseded_by`); 203, a stable code on the core's failures for packs' tests, and
  the guide saying the wording is not the contract, answered in the weekly round.
- [ ] [C4] **Round 46** (received 2026-10-13; answered in the weekly round): 204, `where` and `start_where` reading a field
  through a reference (with 195); 205, a request in a proposal `about` an existing record an item's op changes, dropped
  with it (with 194); 206, the guide saying a request waiting for the go is `needs_you` with approval `required`.

## Phase P: the project management and publishing packs (after the writing pack)

Moved out of phase C on 2026-10-15, in the same order the owner set: started once the writing pack is complete. The
writing pack's hand-offs to these packs are built here, when the packs exist (open promise P12, round 50).

**Exit test:** in the owner's own workspace:
- the project management pack holds the project's plan and builds a schedule from it, and the schedule shows what is
  late or at risk;
- the publishing pack starts a launch for the book, with its plan in the schedule, a listing sheet and prices;
- the hand-offs between the packs work, and each pack also works alone.

C2. **The project management pack: started** (owner, 2026-10-12). This is an AI project manager that knows what is
being done, builds schedules and tracks action items.
- [ ] [C2] Create its private repository, with a brief and a builder session like the other packs.
- [ ] [C2] The core keeps what every kind of work needs: actions with owners, questions, follow-ups, decisions, Today. The
  pack adds planning on top, through ops and the core's records:
  - [ ] **The charter:** drafted from a brief or notes for the person to approve (goals, scope, stakeholders, risks).
  - [ ] **Minutes of meetings:** drafted from notes or a transcript, with the decisions and actions filed as records.
  - [ ] **The files a project manager hands around** (owner, 2026-10-13: "PPTs, excels, etc"): slide decks, spreadsheets
    (schedules, trackers, budgets) and documents, built from the records in the person's template and saved or shared
    through the core's publisher after the person approves the exact file (C4).
  - [ ] **The plan:** goals, phases, deliverables and milestones; a date the core files as a calendar entry under a project
    becomes a milestone in that project's plan (moved from L3b). From L7, entries are made only for real events
    (meetings, launches, delivery windows, appointments), never an action's own due date, so a milestone comes from
    one of those.
  - [ ] **Meeting agendas linked to actions** (the functional designer's lesson 1 and answer 18, 2026-10-15): an agenda
    item stores the action or question it covers, and the series as well as the instance, when the agenda is written,
    so moving the meeting (the core's follow-on run, L7) finds them by id; an unsettled item rolls to the series' next
    instance; an item someone said they'd raise there is added if it's missing.
  - [ ] **What dependencies make possible in the core's terms** (answers 11 and 19): a dependent action moves with the
    one it waits on, with Undo and said in the change's note; an approval due before the work it approves is flagged
    to the person; a decision that blocks one of the person's actions due within a week is a Today line ("Waiting on
    <name>'s decision"). Never from shared words.
  - [ ] **The schedule:** work items with durations and dependencies, a critical path, dates worked out from the
    dependencies, baselines, and slips against them. Only the person rebaselines.
  - [ ] **Building it with the assistant:** from a brief, notes or another pack's milestones, the assistant drafts a
    plan and a schedule. The person approves it as any change.
  - [ ] **A system of record's bulk extract before item-by-item calls** (the original designer's lessons from running, 2026-10-13): a source declares a bulk extract (a team
    dashboard's full export of epics and stories, say) and its refresh time; the assistant reads it before asking anyone
    for status, cites its timestamp, and treats an old one as old.
  - [ ] **Tracking:** what is late or at risk each day goes to Today, with the action items behind it; a weekly status
    report is drafted for the person to send.
  - [ ] **A project update on request** (owner's screens, 2026-10-13): pick a project (or a parent and everything under
    it), a start date and who it is from and to; the assistant drafts the update from everything recorded since then
    (milestones, decisions, changes, inputs) in the sender's voice, with internal notes left out, for the person to
    approve.
  - [ ] **Health per project** (on track, at risk, on hold, not started) with the person's say, shown in the core's
    Projects table and in Top priorities.
  - [ ] **RAID:** risks, issues, assumptions and decisions, with owners and review dates.
  - [ ] **On the app's own calendar** (owner, 2026-10-13): milestones, due dates and meetings are entries in the
    core's calendar (the same records as `event.add`, phase L0), so the agenda and Today show them with everything
    else that is dated.
  - [ ] **An interface other packs use** to put their milestones into the schedule (`pm/schedule@1`). The writing pack
    puts in the book's chapters and edits; the publishing pack puts in the launch plan.
- [ ] [C2] Design 6.23 (dependencies and baselines) and 6.24 (RAID, risk reviews, escalation suggestions, cadence,
  meeting agendas) move from the core into this pack. This is a design change, recorded in decisions.

C3. **The publishing pack: started.** It doesn't exist yet. Its launch plan goes into the project management pack's
schedule when both are on, and is a plain list of milestones when it is alone.
- [ ] [C3] Create its private repository, with a brief and a builder session like the other packs.
- [ ] [C3] First version, from design 9.7 and the writing pack's `docs/publishing-pack.md`:
  - the title record;
  - a launch plan from a template, with lead times;
  - contributors;
  - Today lines and panels;
  - the listing sheet per platform and the price calculator, from dated platform data;
  - the AI-disclosure answers filled from the authorship breakdown;
  - the `publishing/manuscript-source@1` hand-off.
- [ ] [C3] After the first version:
  - the hand-off's next minor version, which says where each edition's book number comes from (the writer's own, a
    platform's free one, or none);
  - for editions with the writer's own number, a registration sheet in the order of the national numbering agency's
    form, and later a standard book-metadata file per title that the writer uploads. The pack sends nothing itself, and
    the agency's current terms are checked before this is built.
- [ ] [C3] From the writing pack's author records (received 2026-10-13, read through the hand-off's next minor version, read
  only): the author on each listing sheet; an author-profile sheet per platform, ready to copy; series and backlist
  cross-promotion in the launch plan, with the also-by list kept in step; listing and price checks for backlist titles
  outside the workspace; and short review quotes the writer approved, checked against each platform's quoting rule.
  Reading profile and review pages comes later, on the core's search and fact lookups, within each site's terms;
  nothing is scraped or sent.
- [ ] [C3] **Marketing, scope to settle when the pack is scoped** (owner, 2026-10-26: "Publishing pack will include
  marketing as a stage"): marketing as a stage of a title (the stages are config, design 6.26), its milestones in the
  launch plan template, drafted by `publishing/promo-draft` (design 9.7) and posted through the social media pack when it
  is on (copied to paste when it isn't, so the pack still works alone). **Open, to be designed** (owner, 2026-10-26):
  marketing may instead be its own pack that the publishing pack works with through an interface (the launch plan's
  marketing milestones handed to it), each working alone; decided when the publishing pack is scoped.
- Staying with the writing pack: the cover wrap specification and advance reader editions.

C3c. **A business analysis pack and a systems architect pack** (owner, 2026-10-14: "pretty much barely disguised
standard AI that would take inputs and generate outputs that those roles would typically do ... they would also fit
hand in hand with nearly every other plugin ... they can be used to submit change requests ... for system
improvements"). Each in its own private repository with a builder, like the other packs; neither is scheduled before
the project management pack's first version.
- [ ] [C3c] **Business analysis:** from notes, transcripts or a brief, drafts what a business analyst writes: requirements,
  user stories with acceptance criteria, process maps in words, gap and impact analysis, questions for stakeholders.
  Drafts are the person's to review; checkable facts in them carry evidence.
- [ ] [C3c] **Systems architect:** drafts what an architect writes: a solution outline, architecture decision records,
  interface and data descriptions, risks and trade-offs, and review notes on a design handed in.
- [ ] [C3c] **Working with the other packs** through versioned interfaces only (design 3.9): requirements and decisions to
  the project management pack's plan and RAID; a pack's own records as inputs to both.
- [ ] [C3c] **Change requests for this product:** both packs can turn a need into a well-formed request (the problem, the
  requirement, acceptance criteria, the impact) through the core's `report.draft`, which the person reviews and sends
  to the maintainers (design 6.13). The product never changes its own code; the request goes out only after the
  person approves its exact text.

C3b. **A sales support pack** (owner, 2026-10-13): for a family member's sales job. Waiting on its functional
requirements from its user; nothing is designed or scheduled before they arrive. When they do, it gets its own
private repository and builder like the other packs, and works with the project management pack through interfaces.

## Phase L-more: the rest of learning

After the packs, beside real use (owner, 2026-10-12). None of it is needed for the loop to work. Each item has its own test.
- [ ] [L-more] **Loading a shared lessons file** (moved from L4, with Take my lessons): the injected-import pair runs through the
  real loader, and an injected entry loads as proposed.
- [ ] [L-more] **Review earned per kind of change** (owner, 2026-10-13: "over time the AI should learn what can be auto AI
  approved"). Changes to the person's data already apply at once with Undo; what they approve is the review. A kind of
  change (per task kind and op, per project where it differs) that the person has passed with Looks good
  `ai.earned_review.runs` times in a row (a setting), unedited and not undone, stops needing a look: it is marked
  reviewed and stays in What changed with Undo. One edit, undo or send back takes the kind back to review. It is
  shown and reversible on the quality panel. Never for anything outbound, system ops (rules, recipients, sources) or a
  new or probation account, and never from a model's own confidence (design 6.16, 6.22). Exit check: a learning pair
  for earning and losing it, and a test that an outbound or system op never earns it.
- [ ] [L-more] Ask gets the knowledge section, with the same citation check, and a rule or fact stated in Ask becomes a proposal
  that applies at once with Undo (6.25).
- [ ] [L-more] Take my lessons: lessons, rules and general glossary terms to a file and back into another workspace. A file from
  the person's own workspace (signed with its key) loads as active; any other file loads as proposed, on one review list.
- [ ] [L-more] A pack's guidance shown before it is turned on, and marked by origin in the knowledge log (design 12.8).
- [ ] [L-more] The agent lockdown test checks that a dummy environment variable isn't visible.
- [ ] [L-more] Part 8's rules become the core playbook's seed lessons, each with a guard kind and its fixture ids. The page is
  generated from them, and the self-check fails when it is stale. A fixture case for every instruction-only rule.
- [ ] [L-more] A command-line agent's program version recorded on each run; a new version treated like an account change; the
  program's own auto-update turned off where it allows.
- [ ] [L-more] Probation ended early from the quality panel; probation work marked on Today.
- [ ] [L-more] The unused-entries list, offered for retirement.
- [ ] [L-more] Show and restore one record as it was at a past time, from the ledger.

## Phase D: owner validation and real use

The owner's real use starts once the writing pack is complete (owner, 2026-10-19); this phase is the sign-off once the
packs are in.

**Exit test:** the owner's own judgment, on dates the owner sets: a week of real notes, mail and pack work saved
time, nothing went out without approval, a backup succeeded, and the repeat-correction rate fell over the weeks of use.

- [ ] [D] The acceptance scenario run by the owner on real material.
- [ ] [D] A week of real use; friction recorded in `ux-notes.md` and fixed in order of cost.
- [ ] [D] **Microsoft mail and calendar set up as well as Google, before 1.0** (owner, 2026-10-12). The owner's exit test
  signs in to Google; a Microsoft account must work just as smoothly through the new-start walkthrough before 1.0:
  - personal and work or school accounts;
  - an organization that requires an administrator's approval, with the screen saying exactly that and what to ask
    the administrator for;
  - the service's setup checklist in the add-on's help (the app registration, its permissions, the redirect address);
  - "the service isn't set up" errors mapped to plain words;
  - a live check on a real account;
  - a journey test like J2 against a fake service that answers the way Microsoft's sign-in does, including the
    approval-required refusal.

  The core's part is the walkthrough and the sign-in flow. The add-on's builder is told in the weekly batch.
- [ ] [D] Learning on real material (6.22): voice per recipient beyond the first style notes, and a fact's freshness checked
  before an outward draft, with disagreements between sources recorded as private
  discrepancies to ask about.

## Phase E: the rest of version 1

Order by what protects real data first, then by what the packs ask for:
- [ ] [E] **What is left of L7's facts** (moved 2026-10-16): an inference never reaches anything others see (with the
  publisher of C4); the person's own deduction is recorded as theirs, with its reason on the question it closes; what
  the assistant writes about a change says who made each part.
- [ ] [E] **The capability matrix proved on every adapter kind** (moved from L7): a fake service for the native API, the
  aggregator and the command-line agent beside the existing chat-format one, each measured into the matrix and kept apart.
  *Today:* one test records tagged results for each kind.
- [ ] [E] **"Which team is <name> on?" asked once**, with the scope resolver (moved from L7, decisions 2026-10-16): when the
  resolver needs a team the person on file doesn't have, one question to the person, never repeated for them; the
  answer sets the team with Undo. *Today:* a person with no team counts as outside the tracked area.
- [ ] [E] **The governor:** (outage handling moved to phase S1, 2026-10-19) stale-item sweeps, outage handling, `sync.sources` (sources above a level encrypted or left out of the synced folder), the scheduled export with its remote; restore to a point in
  time (a single record comes in phase L).
  Outage handling includes a draft cut off at the output limit whose continuation call finds no network: today it is
  held with a note; it should wait for the network like any run.
- [ ] [E] **Retention, and export and forget a person** (design 5.2, 12.4): forgetting is a recorded redaction, with the local
  export repository rebuilt; evidence quotes survive retention. The forget travels through the synced folder: the history
  comparison treats redacted entries as matching, and the loading computer replays the forget. Undo never restores a
  forgotten value.
- [ ] [E] Scope resolver (6.18), the scheduled rules and lessons review with promotion (6.21), and read-backs (6.7).
  The resolver reads **the person's role on each project** (run, design, watch, a value list a pack can extend; per
  person id; the role itself and its two simplest rules are built before real use, "A slice of scope"), and "I'm running X now"
  in any input proposes the role change as a system op, effective that day (the original designer's lessons, 2026-10-14,
  lesson 1). Its learning pair is in L4.
  Dependencies, baselines and RAID moved to the project management pack (C2).
- [ ] [E] **The Monday briefing sent to the person** (owner, 2026-10-13; building it in the app is phase S2, this is sending it), and a morning summary if they want one: to a
  notification target, with content only where the target is allowed for the data level (7.19), counts otherwise.
- [ ] [E] Native AI adapters and reproducible runs (6.16).
- [ ] [E] **M0, the desktop installer:** no Python, uv, Node or terminal; it updates itself.

## Publish 1.0

1.0 is a moving target until the owner finalizes scope (owner, 2026-10-19). It ships on plugin API 0.x; plugin API 1.0
keeps its own test, two packs unchanged through real use (decisions, 2026-10-20). The items below are the release
mechanics.

- [ ] [Publish 1.0] Self-check against the private workspace (`cockpit selfcheck --workspace <path>`).
- [ ] [Publish 1.0] A fresh repository with one starting commit, under Apache-2.0; secret scanning on.
- [ ] [Publish 1.0] The README and docs match what 1.0 does.

## Not in 1.0

- **"Add an area" on the Personal page** (owner, 2026-10-28, a possible item after 1.0): quick picks from the shipped
  common-areas list (Home, Health, Money and the like), with Health and Money offering to be more private when added, for
  a person who wants structure before the assistant proposes it. Setup still asks nothing about areas.
- Hosted mode and sign-in (Part 11), and its end state: an organization install where members from the People list have
  roles, their own views and approvals by role (design 11.8; owner, 2026-10-13).
- Social, email and newsletter channels.
- **A social media pack** (owner, 2026-10-26): a pack like any other that adds "post this to a network" for other packs to
  use when it is on. It drafts posts per network (the core's draft review and approval of the exact text, as every
  outward item), takes marketing milestones from the publishing pack's launch plan and the project management pack's
  schedule through interfaces (design 3.9), and hands each approved post to the platform's own composer instead of its
  API, so no developer account or app review is needed (the owner's research:
  `docs/project/research/social-sharing-without-apis.md`). Each platform's link format is data in the pack. The post
  stays open until the person marks it posted. **The one core piece it needs:** a channel that hands an approved item
  over by opening an outside page with the text filled in (or copying it and opening the page), showing that page's real
  domain; a generic channel capability any pack can use, designed with the pack.
- An editor in the app for long text, what-you-see-is-what-you-get (owner, 2026-10-26: "in the future we might do a
  WYSIWYG editor in the app, but thats not 1.0"). In 1.0 long text is written in the person's own tools through
  working-copy formats (design 3.3, 5.0; Word first) and reviewed in the core's compare view. When it comes it is a core
  screen for any pack's `LongText` field, not one pack's.
- The sales pack (13.3).
- Which of a pack's AI work a project allows (the writing pack's question 198, after 1.0): a project, inherited from the
  workspace and its parent, names the task kinds or groups that may run, or none; the core refuses to queue the rest from
  anywhere, says why once, and hides actions and lines that lead only to disallowed work.
- A price per pack, or a marketplace: one Plus licence covers every pack instead (decisions, 2026-10-20; `business-model.md`, whose items the batches take under open promise P25).
- The delivery chain of the end state (charter, owner 2026-10-14): a requirement carried from business analysis through
  project management and technical design to development, testing, acceptance and deployment, with a development pack
  (sprints, built-in testing, demos), a testing and acceptance pack (internal test cases, UAT) and a deployment pack.
  Building is staged (charter): a build pack exported for a coding agent first; then read-only connectors that bring the
  development process back to the PM; driving the building from the cockpit last, with its own safety design.
  Business analysis, technical design (the systems architect pack) and project management are already planned (C2,
  C3c). What the chain needs from the core is listed there when it is designed: links that trace a requirement to its
  stories, test cases and defects across packs, and sign-offs by role (design 11.8).
- An adapter for the Copilot SDK (owner, 2026-10-14), once it is out of technical preview: it drives the same
  command-line agent through a structured channel instead of reading its printed output. It must pass the same
  lock-down test as the command-line adapter (no tools, no files), and the command-line adapter stays.


# Briefs for a coding agent: the next items before the installers

Each task is one branch from `origin/claude/tender-tesla-16a8ob-check`, one commit, one report. Read `CLAUDE.md` and
`.github/copilot-instructions.md` (at the repository root) first; their rules hold. The main session reviews the diff and
runs the full suites; the coding agent runs only what it touched.

## How every task works
- **Check the code first.** Read the plan item named and its State line in `docs/project/roadmap-to-1.0.md`, then say in
  the report what the code does today for this part.
- **Test first.** Write the test of the person's path, run it, and confirm it fails for the reason the item names. Then
  build the part, and run the test again.
- **The cheapest test that proves it:** a unit test before an API test, and an API test before a browser test. A browser
  test only where the task asks for one.
- **Stop and report instead of building when:**
  - the part needs a new op, a new AI task kind, a new config key, a plugin API change, or a design decision the item
    doesn't make;
  - or it would touch the applier, Undo, the publisher, spending, credentials, or trust and plugin boundaries.
  In those cases, say what is needed and why.
- **Rules that catch new code:**
  - No user-facing words in code: they go in `web/src/wording/en.json` (screens) or the core's wording files.
  - No real names, companies, systems or addresses: tests read names from the fixtures.
  - No sleeps, no real network, and never move the clock with faketime (use `time-machine` or a `now=` argument).
- **When done:**
  - update the item's State line to say what is now built, citing the test by file and name;
  - if the whole item is done, tick it and move it word for word to `docs/project/roadmap-done.md`, under the newest
    "finished" heading.
- **Checks:**
  - the test files you touched;
  - `uv run ruff check .` and `uv run ruff format --check .`;
  - `uv run python -m engine.selfcheck`;
  - for web changes, `npm --prefix web run build`;
  - for a browser test, build first, then run only that one spec's project with `PW_CHANNEL=chrome PW_WORKERS=1`. Set
    `PW_PORT_OFFSET` when another checkout may hold the ports. Never run the full browser suite.
- **The report ends the session:**
  - what the code did before;
  - the test, and whether it failed first;
  - the change;
  - each check with its exit code;
  - anything left, and why.
- Don't look into CI; the main session checks it.

## Task 7: a browser journey for capture
- **Item:** `[S4] Capture from anywhere`. Its State line says there is no browser journey for capture (`web/e2e` has
  none).
- **What the design does (checked):**
  - A capture folder holds the person's own notes, so a note found there is the person's own words.
  - It is filed at once with Undo, like a note the person hands in themselves.
  - It is not held for review; review is for outside content.
  - The journey checks that path. It does not change trust or the applier.
- **Build:**
  - a journey in a new `web/e2e/capture-journey.spec.ts`, with its project in `web/playwright.config.ts` beside the other
    journeys, on the shared demo server unless the spec needs data no other test may see;
  - the journey follows a person's path:
    1. turn on a capture folder from Settings › Sources;
    2. put a note file in it, through the same e2e server helper or API the Python capture tests use (read
       `tests/test_capture.py` and `tests/e2e_server.py` for what exists; add a helper route there only if none fits,
       and say so);
    3. after the folder is read, see the note filed where the person looks for it (Notes), and anything else the
       stand-in assistant files from it where that belongs;
    4. undo it from where the app offers Undo for that note, and see it gone;
    5. put a second note in, and see that a note already read isn't filed twice.
  - Use the screens' own names and roles, never CSS classes.
  - Name a unique word in each note so leftovers from other tests can't match.
- **Not this task:** the global shortcut and speech-to-text (phase I and later).
- **Done when:** the journey passes three times in a row (`--repeat-each 3`), and the State line cites it.

## Task 8: the model picker's role words
- **Item:** `[B-11] A recommended setup per AI service`. Its State line says the model picker's role words are not
  checked, and two examples may still share "stronger".
- **What the design says (checked; don't change it):**
  - Design 7.14 (`docs/design/07-ui.md`, near "an app's examples are Recommended, Stronger and Faster"): a program's
    example models are offered as Recommended, Stronger and Faster, from the catalog's `model_roles`.
  - When two share a purpose, they are numbered ("Stronger 1", "Stronger 2"), never named by the program's own model
    name.
  - So two examples sharing "Stronger" is the designed behavior, not a bug.
- **Build only tests, unless a test finds the code breaking the design:**
  - a Python test that every role in every shipped catalog entry's `model_roles` is one of the three words, and names an
    example the entry lists;
  - a component test that two examples sharing a role are shown with the role word and a number, and a single one with
    the word alone, and no example ever shows the program's own model name as its label.
- **Don't add new role words**, don't derive roles from tiers, and don't change the catalog's roles. If the test finds
  the code breaking the design, fix the code to match the design.
- **A first attempt** (`copilot-step3-8`, `78ae331`) changed the design and was not taken. Start fresh from the check
  branch.
- **Done when:** the tests pass, and the B-11 State line says the role words are checked against design 7.14, citing
  the tests. The rest of B-11's "Left" list stays for the main session.

## Task 9: the morning brief's two remaining samples
- **Item:** `[S2] The morning brief as what changed, what is at risk and what needs your yes`. Its **Left:** sample 7's
  changed line from the document, and sample 3's request in words to move a call.
- **Read:**
  - the samples in `docs/project/steward-brief-samples.md`;
  - their cases in `workspaces/*/briefs/`;
  - `tests/test_brief.py::test_a_sample_morning_makes_the_brief_its_case_expects`, and how the brief scores each case;
  - `engine/brief.py`.
- **For each sample:**
  - First, make the case expect the missing line, so the case test fails for that reason.
  - Then build the line from what the records and inputs already hold, rules first:
    - **sample 7:** the line says what changed in the document, with the words from it as evidence;
    - **sample 3:** a request in someone's words to move a call becomes the line the sample names, tied to that
      calendar entry.
  - **If either needs an AI call, a new op, or a new record field, stop and report what and why** instead of building
    it.
- **Both fictional workspaces** keep their cases passing.
- **Done when:** both samples' cases pass, with the expected lines, and the State line says so.

## Task 10: people memory dates written in other languages
- **Item:** `[S3] People memory`. Its **Left:** dates from a contact source or in other languages.
- **This task is only the "in other languages" part.** Dates from a contact source need a connector decision and stay
  for the main session.
- **Read:**
  - how people memory reads a person's dates today (a date word and the next day, or a full date ahead), and the tests
    the State line cites;
  - how the workspace's and a project's language are set (`Project.language`, the workspace locale).
- **Build:**
  - a unit test with fictional notes that write a date in at least two other languages: a day and a month name, and a
    full date. The test reads them as the right dates when the note's language (or the workspace's) is set to that
    language;
  - and reads nothing when the language isn't one the app knows;
  - then the fix.
- **Rules:**
  - Month and weekday names, and the words around dates, are data (a file per language beside the existing date words),
    never lists in code.
  - The language comes from the setting, never guessed from the words.
  - Evidence is the note's own words.
- **Done when:** the test passes for each language added and for an unknown one, and the State line says so. "From a
  contact source" stays open.

## Task 11: the phone review-mode check that still fails on CI
- **The failure:** `web/e2e/panes.spec.ts`, "the phone's review mode › goes through the messages waiting to be sent one
  person at a time…", failed on CI at `5e21d04`.
  - Its setup passed: the API reported at least two people with messages waiting, and a higher count than before.
  - Then "Send one at a time" was never found on Follow-ups at 390px.
  - It passes locally when run alone, and the same run passed the rest of the 390 tests.
- **What the screen needs (checked):** `web/src/components/FollowUps.tsx` shows the button when all of these hold:
  - the window is narrow (`useIsNarrow()`) and the screen is not `compact`;
  - the filter is "send" and the grouping is "person" (both the screen's own defaults);
  - at least one person other than the person themselves has something to send (`reviewable`);
  - and `shown` is not empty.
- **Find which of these was false on CI.**
  - Reproduce in CI's order: run the `root` project and then `root-panes` with its dependency, not `--no-deps`:
    `PW_CHANNEL=chrome PW_WORKERS=1 npx playwright test --project=root-panes` from `web/`, after a build.
  - Then run it three times.
  - If it never fails locally, add to the test, before the button is looked for, a check that reads what the screen
    shows:
    - the Follow-ups list's rows;
    - the filter and grouping as the person sees them;
    - whether the narrow layout is on.
  - Each check names what it found, so the next CI failure says which condition was false.
- **Then fix the cause:**
  - in the test, if it is the test's own setup (for example the page read before the hand-in's messages were filed);
  - or stop and report, if a person could hit it (messages waiting but no way to go through them on a phone).
  - Don't skip the test, add retries, or lengthen timeouts as the fix.
- **Done when:**
  - the cause is named, and the fix is in;
  - or the checks that will name it are in;
  - the whole `root-panes` project passes with its dependency;
  - and the P96 row in `docs/project/open-promises.md` says which.

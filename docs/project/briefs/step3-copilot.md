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
- **Build:**
  - a journey in a new `web/e2e/capture-journey.spec.ts`, with its project in `web/playwright.config.ts` beside the other
    journeys, on the shared demo server unless the spec needs data no other test may see;
  - the journey follows a person's path:
    1. turn on a capture folder from Settings › Sources;
    2. put a note file in it, through the same e2e server helper or API the Python capture tests use (read
       `tests/test_capture.py` and `tests/e2e_server.py` for what exists);
    3. see it arrive as something to look over;
    4. open it and keep it;
    5. see the result where the person would look for it.
  - Use the screens' own names and roles, never CSS classes.
- **Not this task:** the global shortcut and speech-to-text (phase I and later).
- **Done when:** the journey passes three times in a row (`--repeat-each 3`), and the State line cites it.

## Task 8: the model picker's role words
- **Item:** `[B-11] A recommended setup per AI service`. Its State line says the model picker's role words are not
  checked, and two examples may still share "stronger".
- **Read:** the role words in `web/src/wording/en.json` (`welcome.ai.role.*` and any other role or tier words the model
  picker shows), and where the picker chooses the word for each model. Say in the report which two models share a word
  and when.
- **Build:**
  - a unit test that, for every tier in every shipped preset, the picker's role word is one of the defined role words;
  - and that no two models offered in one picker share a role word, unless they are the same model;
  - then the fix: the role comes from the model's tier or its place in the preset, never from a vendor or model name.
- **Rules:**
  - No vendor or model name in code, wording or tests outside `engine/ai/adapters/` and config.
  - The model's name is never shown as its role.
- **Done when:** the test passes, and the State line says the role words are checked, citing the test. The rest of
  B-11's "Left" list stays for the main session.

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

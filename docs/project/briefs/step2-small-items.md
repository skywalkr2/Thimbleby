# Briefs: step 2, small finishing items (for a coding agent)

Each task is one session and one branch. Before starting, read `CLAUDE.md`. On a Mac, start from the latest working
branch:

```
git fetch origin
git checkout -B copilot-step2-<n> origin/claude/tender-tesla-16a8ob
uv sync && npm --prefix web ci
```

## Rules for every task
- **A failing test first**, then the fix at the root, then the same cause anywhere else.
- **Run only the tests you touched:**
  - `uv run pytest -q <file>` and `npx --prefix web vitest run <file>`;
  - a browser test only if the task says so, with `PW_CHANNEL=chrome PW_WORKERS=2 npx --prefix web playwright test
    --project=<name> --no-deps`, after `npm --prefix web run build`.
- **Before committing**, run `uv run ruff check . && uv run ruff format --check .` and
  `uv run python -m engine.selfcheck`.
- **Words come from `web/src/wording/en.json`**, never typed into a component.
- **Stop instead of guessing.** Stop and write the question in your summary if the task needs a design decision, or if
  it touches Undo, the applier, trust, spending or credentials.
- **Finish** with one commit and `git push -u origin copilot-step2-<n>`, then a short summary:
  - what the code did;
  - the test that failed first;
  - the fix;
  - the commands you ran and their results.

## Task 1: a note box on "Keep it open" for an item held for a look
- **Read:**
  - the plan item `[B-6b] **28 Held for a look**` in `docs/project/roadmap-to-1.0.md`, with its State line;
  - design 7.6 in `docs/design/07-ui.md` (search "Held for a look"; it says the note box is "Not built").
- **Build:** when the person chooses "Keep it open" on a held item, they can add an optional note saying why, the same
  note box other Today actions use (search `NoteBox`). The note is saved with the choice the same way other notes on
  that action are saved; reuse that path, don't add a new one.
- **Tests:**
  - a component test that the box shows on "Keep it open";
  - a test that the note reaches the API with the choice.
- **Done when:** both tests pass, and the item's State line is updated to say the note box is built, naming the tests.

## Task 2: an add-on's row leaves the list after Remove
- **Read:** the plan item `[B-6b] **Review after the first Go**` and its State line.
- **The bug:** after Remove, Settings › Add-ons shows "is removed" but the add-on's row may stay in the list.
  `web/src/components/Addons.test.tsx` only checks the message.
- **Tests:**
  - a component test where Remove succeeds, then the refreshed list no longer contains that add-on's row (it fails
    first if the row stays);
  - then the fix.
- **Done when:** the test passes and the State line says so.

## Task 3: the Monday briefing lists a decision that isn't on Today
- **Read:** `engine/brief.py` (the `decide` section) and
  `tests/test_brief.py::test_questions_to_send_answers_to_chase_and_decisions_waiting_are_their_own_sections`. It only
  checks the case where the decision is already on Today and is counted, not listed.
- **Add the positive case:** a decision for the person that is not on Today is listed in the `decide` section. Use the
  same fixtures as the neighbouring tests.
- **If it fails**, fix `engine/brief.py` at the root.
- **Done when:** the test passes. Note the test's name in the Monday briefing entry in `docs/project/roadmap-done.md`,
  under "Moved from the plan (2026-10-29)", on the item's "Built:" line. Add the name; don't rewrite the line.

## Task 4: the phone review-mode browser check brings its own data
- **The failure:** `web/e2e/panes.spec.ts`, the test "the phone's review mode › goes through the messages waiting to be
  sent one person at a time…", sometimes fails because "Send one at a time" only shows with two or more people who have
  messages waiting. That depends on what earlier tests left on the shared server.
- **Fix:** make the test create what it needs first, two people with a message waiting each, through the same API or
  page actions the other tests in that file use, so it no longer depends on order. Don't weaken what it checks.
- **Run:** that one test three times in a row:
  `--project=root-panes -g "phone's review mode" --repeat-each 3`, with `PW_CHANNEL=chrome` and a build first.
- **Done when:** it passes three times in a row.

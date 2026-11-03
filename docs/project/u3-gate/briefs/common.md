# The gate's fix round: rules for every batch

Before the app goes back to the UI/UX reviewer, every screen must score at least 4.0 on the reviewer's rubric, with no point under 3.5 and brand at least 4.0. Two cold scorers looked at captures of every screen and wrote concrete issues. An audit checked the tracking sheet's open rows against the code. Your batch fixes one area's issues from both.

## Setup

- Work in a new worktree from `cp1` (HEAD 636f0ca or later):
  `cd /home/user/ProjectManagementAgent/.claude/worktrees/cp1 && git worktree add ../<batch> -b <batch> cp1 && ln -s ../../cp1/web/node_modules ../<batch>/web/node_modules`
  Work only there.
- Read `CLAUDE.md` first, then `docs/design/README.md` for which design parts to read.
- Don't commit, push or message anyone. Leave the work uncommitted and report.

## Inputs (G = /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad)

- **Score issues** by screen id, in `$G/gate-score/A/part1.md`, `part2.md` and `part3.md`, and in `$G/gate-score/B/part1.md`. Each has a section per screen, with issues tagged [B], [C] or nit, and some marked broken.
  - Fix every [B] and every broken issue for your screens.
  - Fix the [C] issues where the fix is local and clear.
  - Where the two scorers disagree, the stricter one counts.
- **Audit rows**, in `$G/audit-open-rows.md`. The Part 1 table has the code location and a proposed fix for each row; the "Y07 to Y11, item by item" table does the same for the polish items.
- **Pictures:** `$G/gate-inventory/` (named `<screen>[-<state>]-<theme>-<width>.png`, with `index.md`), and `$G/gate-mockups/side-by-side/` for the eight mockup pages (build beside mockup).
- **The rubric:** `$G/gate-score/rubric.md`, section 2. Know what 4.0 and 4.6 look like for each point.
- **Owner decisions D1–D10:** `docs/decisions.md`, top entry (section 326).

## How to work

- **Check before you fix.** Each issue is a claim: open the picture and the code first.
  - If the picture shows a different screen from its name (a "Not here" page, the wrong tab), that is a **capture fault**: fix the drive in `web/visual/inventory.ts` (or `stages.ts`, `drive.ts`), not the screen.
  - If an issue is wrong, say so in your report, with why.
- **Measure a layout fault before changing CSS:** print each element's box in the state that failed, then make one change that answers the numbers.
- **Prefer the shared fix.** A rule that shows on many screens is fixed once, in the shared component (`web/src/ui/`) or token, never per screen.
- **No hard-coded words:** every new on-screen text goes in the wording sheet. No internal terms on screen.
- **Every fix has a test:** a unit test (Vitest or pytest) where it proves the behavior, a browser test where only layout can prove it. Add the browser tests to the spec file for that screen.
- **Tick your items** in `docs/project/u3-gate/items.md` (the round's one list; items are tagged with their batch): `- [x]` plus the test, or leave it open with "left: <why>". Shared fixes close items listed under other screens too: tick those.
- **Update the tracking copy**, `docs/project/sweep-8ebf3cf-tracking.md`. For each audit row you finish, set its Host status to "Fixed (<tests>)", or "Fixed except <what>, deferred by <who> (<where>)".
- **Docs:**
  - one decision entry at the top of `docs/decisions.md` and one `docs/design/CHANGES.md` section, both using the section number your batch was given;
  - the design text each fix changes;
  - the `docs/project/u3-differences/` file for each mockup page you change.

## Checks before you report

- `npm --prefix web run build` exits 0. Build and run the browser tests in one command, and start the tests only if the build exited 0.
- The unit tests for the files you changed.
- `uv run pytest -q -n0 <files>` for any Python you changed.
- `uv run python -m engine.selfcheck`, `uv run ruff check .` and `uv run ruff format --check .`.
- The browser projects you touched, once, with the `PW_PORT_OFFSET` you were given.
- Capture your screens once, by day and by night at 1440 and at 390:
  `PW_PORT_OFFSET=<yours> npm --prefix web run visual:capture -- --inventory --pages <your screen ids> --out $G/gate-fix/<batch>-capture`
  Open the pictures and check each issue you fixed. Say in the report what each picture shows now.

## Never

- Never run the full suites or faketime.
- Never stop processes by pattern.
- Never use a bare `git stash`.
- Never wrap Playwright in `timeout`.
- Never weaken a test's assertion to make it pass.
- Never add anything to an allowlist.
- Don't poll: run each long command once in the background and wait for its notification.

## Report

- **Per issue or row:** what you found, the fix (file:line), the test, and what the capture shows.
- **Issues you judged wrong**, and why.
- **What's left**, and why.
- **Each command's exit code.**

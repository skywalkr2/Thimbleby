# Batch G1c: G1's own findings from its cold score, before G1 merges

## 1. Goal

G1 fixed the shared rows, filter bars, tables, toasts and shell. A cold score of its 22 screens (scorer C) found 17 issues that belong to those shared parts. They're fixed before G1 merges.

The bar: every one of these lines ends as described in "Definition of done", and the shared parts pass the same score next time.

## 2. Where, and the starting state

- Work in the existing worktree `/home/user/ProjectManagementAgent/.claude/worktrees/g1` (branch `g1`). It holds G1's two passes, uncommitted. Build on them, and create no new worktree.
- G1's report and checks are summarized in `docs/project/u3-gate/items.md`, in cp1's copy at `/home/user/ProjectManagementAgent/.claude/worktrees/cp1/docs/project/u3-gate/items.md`: the "[G1]" and "[audit]" lines marked "G1 pass 2".
- G1's final capture is in `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1-final` (with `index.md`). Scorer C's file is `/home/user/ProjectManagementAgent/.claude/worktrees/cp1/docs/project/u3-gate/scores/C-g1.md`.
- Check before you build:
  - `git -C ../g1 status` shows G1's changes;
  - `web/src/ui/states.tsx` (or wherever the shared loading and couldn't-load states live; search for `ListStates`) exists;
  - `StatusMenu.tsx` holds the one-column popover.

## 3. The exact list you own

The `[G1c]` lines of cp1's `items.md`, at these line numbers: 857 860 879 889 907 908 909 910 915 925 930 936 937 938 939 940 957 . They are:

- **One couldn't-load card, with Try again, for every screen.**
  - The Settings pages have no retry.
  - Projects' couldn't-load picture shows the offline banner and a skeleton, with no error (check: a capture fault, or a real gap).
  - Follow-ups and People show two error cards.
  - Fix it in the shared state component, so every screen uses one card with one Try again.
- **A loading skeleton shaped like a form** for the form pages (the Settings pages). They now show list rows.
- **The status popover:**
  - not cut off at the bottom: a scroll fade and a visible end;
  - a scrim;
  - one button style for its actions;
  - on a phone, a sheet with a Close at least 44px;
  - warning colour distinct from the brand gold by night (rubric 4b);
  - the account label as each connection's heading, not the address.
- **Capture faults:**
  - `settings-menu` at 390 (the search state);
  - `projects` couldn't-load;
  - `setup-welcome` at 1440 night, 1024 and 390.

**Not yours:**
- `setup-promises` "promises found" (needs mail in the capture workspace) belongs to G5.
- The add-ons error wording belongs to G5.
- Today's "an / d" clash split belongs to G2.
- Every other screen-specific line belongs to G2, G4 or G5.

## 4. Inputs

Scorer C's file (above); the rubric `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-score/rubric.md`, sections 2 and 4b; and the pictures in `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1-final`.

## 5. Owner decisions that apply

None directly. Keep D7 in mind: no new motion except short state transitions.

## 6. How to work

- Check each line in the picture and the code first.
- A capture fault is fixed in `web/visual/inventory.ts`, `stages.ts` or `drive.ts`.
- Measure before you change CSS.
- Fix each shared part once, in `web/src/ui/` or the shell.
- Words go in the wording sheet.
- One test per fix, at the cheapest level that proves it.

## 7. Definition of done; nothing else ends the work

Every line you own ends as exactly one of:
- `→ fixed: <test>`;
- `→ judged wrong: <evidence>`;
- `→ needs the owner: <choices>`;
- `→ belongs to <batch>: <why>`.

"Left" and "not done" are not endings. Every check and capture below runs on the final code, after your last change.

If your context runs short, write `/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1c-handoff.md` (the open lines, the files changed, the checks still due) and report "handing off". There is no time-box.

## 8. Checks, on the final code

Use `PW_PORT_OFFSET=500`. Run each long command once, in the background, and wait for it.

- `npm --prefix web run build` (exit 0).
- Vitest for the files you touched.
- `uv run python -m engine.selfcheck`, `uv run ruff check .` and `uv run ruff format --check .`.
- The browser projects `layout`, `people-records` and `root-settings`, after the build exits 0.
- Then the capture:
  `npm --prefix web run visual:capture -- --inventory --pages followups,people,projects,settings-ai,settings-business,settings-menu,setup-welcome,status-popover --out /tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad/gate-fix/g1c-capture`
  Open every picture and say what it shows.

## 9. Who else is working

G3b is in the g3 worktree, on the Schedule. Don't touch `web/src/components/Schedule*` or the schedule entries of `inventory.ts`.

## 10. Report

- **Items closed:** each owned line copied exactly from `items.md`, with its ending.
- Each command's exit code.
- What each captured picture shows.
- The claims you judged wrong.

## 11. Never

- Never commit, push or message anyone.
- Never stop processes by pattern.
- Never use a bare `git stash`.
- Never wrap Playwright in `timeout`.
- Never use faketime.
- Never weaken an assertion.
- Never add an allowlist entry.
- Never use sleep loops.

# Instructions for coding agents in this repository

Before any change, read `CLAUDE.md` at the repository root and follow it exactly. It is the contract for this codebase:
the boundary (no specific names, vendors only in `engine/ai/adapters/`), plugins only through `engine.plugin_api`, every
change through ops and the applier, words from the wording sheet, fictional data only, and the checks to run.

- Work only on the branch you were given, never on `claude/tender-tesla-16a8ob` or `main`, and never force-push.
- Write a failing test first, then the fix. Run only the tests for what you changed; GitHub runs the full suites.
- Never weaken a check or a test to make it pass, and never add an allowlist entry to get past a scan.
- If a task needs a design decision or touches Undo, the applier, trust or spending, stop and write down the question.
- Briefs for agents are in `docs/project/briefs/`.

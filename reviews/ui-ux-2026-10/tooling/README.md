# Sweep tooling

The reviewer's tools for the full UI/UX sweep. They're kept here so a re-sweep can start from a fresh container. `../RESWEEP-PLAN.md` says how they're used.

| File | What it is |
|---|---|
| `lib.mjs` | Shared Playwright helpers: `open`, `go`, `audit` (screenshot plus automatic checks, written to `OUT/auto-issues.jsonl`) and `mainText`. Env: `WEB_DIR`, `OUT`, `APP`, `FAKE` or `TOKEN` |
| `BRIEF-COMMON.md` | The brief for each functional sweep agent. Fill in `{{WORKTREE}}`, `{{SWEEP}}`, `{{SCRATCH}}` and `{{COMMIT}}` |
| `BRIEF-VISUAL.md` | The brief for each visual scoring agent, with the 8-point rubric. Same placeholders |
| `scripts-04ffc21e/<sweep>/` | The scripts the four sweeps ran at `04ffc21e`. Use them as working examples of selectors and flows, not as fixed tests |
| `mockup-tools/` | `gen_mock.py` writes the mockup pages, and `render-mock.mjs` renders them by day and by night at 1440, plus the phone at 390 (env `WEB_DIR`, `M` = the mockups folder) |

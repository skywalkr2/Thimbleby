# For the owner: what's waiting on you

Kept current by the build session; finished items leave the list.

## Today (2026-10-28)

0. **Start from scratch after the sides batch lands** (the session says when it is pushed):
   `cd ~/dev/Thimbleby && git pull && uv sync --inexact && npm --prefix web ci && npm --prefix web run build`, then
   `uv run cockpit init ~/Thimbleby-try6` and `uv run cockpit serve -w ~/Thimbleby-try6` (keep try5 as it is). Check:
   the business step asks "What is it?" apart from its projects; the business opens as a group (no target date,
   status or role); choosing where something belongs is business, then project; Google connects with no key; the
   project page's "What Reginald knows" is one line while nothing is known.

1. **Ready to test (pushed 2026-10-28, commit 61f1f8b, CI green):**
   `cd ~/dev/Thimbleby && git pull && uv sync --inexact && npm --prefix web ci && npm --prefix web run build`, then
   `uv run cockpit init ~/Thimbleby-try5` and `uv run cockpit serve -w ~/Thimbleby-try5`. You should see:
   - setup's "What it's for" as two tick boxes, and no raw data or lost ticks while you tick a mailbox's sides;
   - your sent mail read without choosing a folder;
   - on Today, "Look over" opening the batch beside the list, "All looks good" removing the line with Undo, and the count
     never going up from anything you press;
   - with a business, unsure items under Personal and one "might be … Move them?" question;
   - Pause and Resume (not "on hold"); "Not touched in a while";
   - Settings › Notices offering apps by name; the AI page showing each tier's cost per day;
   - Quality showing lost promises, sources not read and review time; the 50-message sample stays off until you allow it;
   - dropping a to-do someone was told about: one button, "Drop it and tell them", a note waiting in Follow-ups › To
     send for your yes, and Undo taking the note back with the drop; a to-do nobody was told about shows plain "Drop it".
2. **Your AI re-run** (B-10), on the account you used before, after the test above:
   `uv run cockpit evaluate --from workspaces/demo-b -w ~/Thimbleby-try5 --account "<your account>" --runs 3 --out rerun-b.json`,
   then the same with `--from workspaces/demo-a` (`--out rerun-a.json`), and both again with `--pairs`
   (`--out pairs-b.json`, `pairs-a.json`). Send the four files' totals, or just say where they are.


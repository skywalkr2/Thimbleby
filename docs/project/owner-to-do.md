# For the owner: what's waiting on you

Kept current by the build session; finished items leave the list.

## Today (2026-10-28)

1. **Try an app password on your own Gmail** (P67, still open). Google Account → Security → 2-Step Verification on →
   App passwords → make one. Tell the session whether the option was there; don't paste it anywhere yet.
2. **Ready to test (pushed 2026-10-28, commit b21e09c):**
   `cd ~/dev/Thimbleby && git pull && uv sync && npm --prefix web ci && npm --prefix web run build`, then
   `uv run cockpit init ~/Thimbleby-try5` and `uv run cockpit serve -w ~/Thimbleby-try5`. You should see:
   - setup's "What it's for" as two tick boxes, and no raw data or lost ticks while you tick a mailbox's sides;
   - your sent mail read without choosing a folder;
   - on Today, "Look over" opening the batch beside the list, "All looks good" removing the line with Undo, and the count
     never going up from anything you press;
   - with a business, unsure items under Personal and one "might be … Move them?" question;
   - Pause and Resume (not "on hold"); "Not touched in a while";
   - Settings › Notices offering apps by name; the AI page showing each tier's cost per day;
   - Quality showing lost promises, sources not read and review time; the 50-message sample stays off until you allow it.

## Later, nothing waits on these

- **Your own AI re-run** of the test cases on your account, after the batch (the session gives the commands).

# For the owner: what's waiting on you

Kept current by the build session; finished items leave the list.

## Today (2026-10-28)

1. **Try an app password on your own Gmail** (P67, still open). Google Account → Security → 2-Step Verification on →
   App passwords → make one. Tell the session whether the option was there; don't paste it anywhere yet.
2. **Ready to test (pushed 2026-10-28, commit 82d24cc):**
   `cd ~/dev/Thimbleby && git pull && uv sync && npm --prefix web ci && npm --prefix web run build`, then
   `uv run cockpit init ~/Thimbleby-try4` and `uv run cockpit serve -w ~/Thimbleby-try4`. You should see:
   - setup's "What it's for" as two tick boxes under "Your own life is always included";
   - no raw data in any message while you tick which sides a mailbox serves;
   - your sent mail read without choosing a folder;
   - on Today, "Look over" opening the batch beside the list, and "All looks good" removing the line with Undo;
   - with a business, unsure items under Personal and one "Move them?" question;
   - People with one "Who they are" column;
   - Settings › Notices offering apps by name.

## Later, nothing waits on these

- **Your own AI re-run** of the test cases on your account, after the batch (the session gives the commands).
- **The gate week's pass bar** (P65): drafted, `docs/project/gate-pass-bar-draft-2026-10-28.md`. Say yes or change a number before the gate week.

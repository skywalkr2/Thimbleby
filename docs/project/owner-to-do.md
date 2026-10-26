# For the owner: what's waiting on you

Kept current by the build session; finished items leave the list.

## Tonight (2026-10-26)

1. **Try an app password on your own Gmail** (P67). Google Account → Security → turn on 2-Step Verification if it isn't →
   App passwords → make one. Just tell the session whether the option was there and it gave you a 16-letter password. You
   don't need to paste it anywhere yet.
2. **Ready now (the batch is pushed):** get the latest code and start a fresh workspace, so you get the new
   bill and order words:
   `cd ~/dev/Thimbleby && git pull && uv sync && npm --prefix web ci && npm --prefix web run build`, then
   `uv run cockpit init ~/Thimbleby-work2` and `uv run cockpit serve -w ~/Thimbleby-work2`.
3. **Ready now: send the UI/UX reviewer the hand-over** (screenshots retaken 2026-10-26 after the batch):
   `docs/project/ui-ux-handover-2026-10-26.md` and the captures in `reviews/ui-ux-2026-10/after-fix-batch/`.

## Later, nothing waits on these

- **Your own AI re-run** of the test cases on your account, after the batch (the session gives the commands).
- **The gate week's pass bar** (P65): the session drafts it for your yes before the gate week starts.

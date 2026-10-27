# For the owner: what's waiting on you

Kept current by the build session; finished items leave the list.

## This morning (2026-10-28)

1. **The reviewer's reply to the second pass is in**, saved unfixed in `docs/project/ui-ux-reply-2026-10-28.md`, with the
   full review in `reviews/ui-ux-2026-10/review-f973493/`. Much better overall; four P0s (G1 to G4), ten P1s and nine P2s,
   with a suggested order. Nothing is built from it until you decide.
2. **Three calls for you** (open promise P69):
   - **Named notice apps** (the reviewer's answer 10) aren't built. The app sends notices only as plain JSON or plain text,
     app names can't sit in the core, and a plugin that supplies them needs a plugin API change while the hold applies.
     Lift the hold for it, or leave it?
   - **Setup's "What it's for" step** keeps your tick boxes (a job and/or businesses), not the reviewer's three either-or
     answers. Keep?
   - **Privacy at the AI step:** personal mail is now private, so the AI step's "Allow" also allows private material, and
     says so; otherwise the first result couldn't read your mail. Keep that default?
3. **Ready to test (everything is pushed):**
   `cd ~/dev/Thimbleby && git pull && uv sync && npm --prefix web ci && npm --prefix web run build`, then
   `uv run cockpit init ~/Thimbleby-try3` and `uv run cockpit serve -w ~/Thimbleby-try3`. You should see:
   - Welcome, then "What it's for · 2 of 7";
   - Settings › You starting with Your name;
   - What changed as history with "Answer on Today";
   - "Check now" on Came in once mail is connected;
   - toasts with Undo that stay until you close them.

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

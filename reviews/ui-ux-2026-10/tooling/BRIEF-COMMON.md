# Common brief for the full UI sweep (read all of it)

## What this is
A cloud container. The app is a personal + small-business assistant ("PM cockpit"): React/Vite web in `web/`, Python engine
served by `cockpit serve`. The owner used it on a brand-new install last night and found many bad screens that earlier
reviews missed, because those reviews didn't open every screen from scratch. Your job: open EVERY screen, state, option,
menu, dialog and button in your area, as a complete beginner with no IT background, and report everything that is wrong,
confusing, ugly, broken, empty-and-unhelpful, inconsistent, or that dead-ends. Judge the flow, not only each screen.

## The code (already built; do NOT rebuild, edit, commit or push anything in it)
- Worktree: `{{WORKTREE}}` at commit `{{COMMIT}}`, branch `claude/tender-tesla-16a8ob`. Built: `web/dist` is current.
- Product rules: `{{WORKTREE}}/CLAUDE.md`, wording in `web/src/wording/en.json`, design in `docs/DESIGN.md` and `docs/design/`.
  Read files only when you need to understand something; never change them.

## Starting your own app (use ONLY your port block; other agents are running in parallel on other ports)
From `{{WORKTREE}}`, start the app FIRST and wait for health, THEN the fake services (the app clears its state folder on start):
```
cd {{WORKTREE}}
(uv run python -m tests.e2e_fresh_server --port APP_PORT --state STATE --https-port HTTPS_PORT --add-ons --catalog-by-environment --log > STATE.app.log 2>&1 &)
for i in $(seq 1 40); do curl -s http://127.0.0.1:APP_PORT/api/health >/dev/null && break; sleep 2; done
(uv run python -m tests.fake_services --port FAKE_PORT --https-port HTTPS_PORT --state STATE --catalog journey_mail --sent-mail > STATE.fake.log 2>&1 &)
for i in $(seq 1 30); do curl -s http://127.0.0.1:FAKE_PORT/__e2e/info >/dev/null && break; sleep 2; done
```
- This is a REAL fresh install (`cockpit init`, no template) opening on the setup Welcome. The fake services stand in for an
  AI service (`info.ai_base_url`), a mail+calendar service with a one-click add-on (signs in by itself in a popup), and an
  add-on catalog. `curl http://127.0.0.1:FAKE_PORT/__e2e/info` gives the token, `backup_folder`, `source_folder`, `people`.
- To get a SECOND fresh install (e.g. to try another branch), start another pair with a new STATE folder on your spare ports.
- To stop: `pkill -f "port APP_PORT"` and `pkill -f "port FAKE_PORT"` in their own Bash call (an exit code 144 is harmless).

## Driving the browser
Playwright + Chromium are installed. Use the shared helpers `{{SWEEP}}/lib.mjs` (read it): `open({width,height,scheme,path})`,
`go(page, "#hash")`, `audit(page, name, {full})` which screenshots to OUT and runs automatic checks (internal ids, raw
JSON, raw dates, undefined/null, code words, stuck Loading, unfilled placeholders, error text, sideways scroll, targets under
24px, cut-off text, unnamed buttons, console errors) and appends them to `OUT/auto-issues.jsonl`. Write your scripts in your
own folder (OUT/../scripts or similar) as .mjs and run with:
`WEB_DIR={{WORKTREE}}/web OUT=<your out> FAKE=http://127.0.0.1:FAKE_PORT APP=http://127.0.0.1:APP_PORT/ node script.mjs`
State lives on the server, so each script can open a new browser and carry on where the last left off (setup resumes).

Known selectors that work (from earlier walks; the UI may have changed slightly):
- Welcome: button "Start". You: label "Your full name". Continue/Back/"I'll do this later" buttons. "Finish later" top right.
- What it's for: checkboxes "A job", "My own business"; business fields `#work-business-1-name`, `#work-business-1-works-on`,
  a "belong together" disclosure with `#work-business-1-group-name` and "in <group>" tick boxes; "Add another business".
- AI step with the fake service: radio /Something else/ → button /^Another service/ → label /^Another service that speaks/
  → `#ai-key` fill "a-made-up-key" → textbox "Service address" fill info.ai_base_url, then blur and wait 3s ("Works. Ready
  to use.") → click text "Advanced" (exact) → select label "AI model for everyday work" option "fake-small" → radio /^Allow/
  → Continue.
- Mail step: row `[data-service="journey-mail"]` → button /^Connect/ (installs, restarts the app, opens a sign-in popup that
  signs in by itself; wait up to ~2 min until the row has attribute `data-signed-in`). Side boxes per mailbox appear when a
  business exists ("Who is Your inbox for?").
- Promises: button "Start" runs the look-back. Backups: label "Folder" (exact) fill info.backup_folder, button /Back up now/.
- People: "Their name", "How they relate to you" select, "Add", "Paste a list", suggestions with "Add …" buttons.
- Done: "Go to Today". Today queue lines: `[data-queue-line]`; details pane `[data-queue-inspector]`.
- Views are hash routes: #today #schedule #work/changed #work/since #work/handled #work/followups #work/open #work/stages
  #records/projects #records/people #records/files #records/knowledge #records/rules-review #settings/<you|ai|today|backups|
  appearance|links|business|lists|connections|addons|files|advanced> #settings/addon/<name> #settings/ai-compare #handover
  #quality #setup; record pages are #records/<kind>/<id> (open them by clicking, don't guess ids).

## How to judge (the owner's standards)
- A beginner who reads every word literally. Would they know what this screen is for, what to do next, and how to get back?
  Does anything dead-end, appear twice, have two names, or need hunting for?
- Empty states: an empty screen must say what will appear there and how to make it appear, in one or two lines; never a
  bare table header, a wall of empty boxes, "Nothing" five times, or a heading over nothing.
- Product rules: no internal ids, keys, JSON, file names or code words on screen; dates in words; plain English; one
  row per thing; one place to act per thing (the other places link to it); nothing appears twice on Today; owners are
  people; the model's name is never shown; the assistant drafts and the person approves anything outward.
- Visual: day (light) and night (dark) mode both look finished; nothing overlaps, cuts off or scrolls sideways; targets at
  least 24px; at phone width (390x844) the layout works and nothing important is squeezed or hidden.
- Exercise the functionality, not just the look: press every button, open every menu item, try every option, use Undo,
  try wrong input (empty, too long, nonsense), go Back, reload mid-way, and check the result is right AND shown right.
- Verify before you report: re-check each finding is real (not a script timing artifact). If unsure, say so.

## What to hand back
1. `OUT/findings.md`:
   - **Coverage table:** every screen, state, dialog and menu you opened, with day/night/phone, and pass or fail. This
     proves coverage, so list everything you touched, including the passes.
   - **Findings, ranked P0, P1, P2.** P0: stops a person, or loses or corrupts data. P1: confusing or wrong. P2: polish.
     Each finding gets: a short title, where it is (screen and the steps to get there), what you saw (quote the exact
     words), why it's a problem for a beginner, a suggested fix, and the screenshot file name(s) in OUT.
   - Keep it factual and concrete. No praise padding.
2. Your final message: a short summary with the counts by severity, the top 10 findings in one line each, and the path to
   findings.md. Don't message other sessions, and don't touch the repository.

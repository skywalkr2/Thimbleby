# Re-sweep plan: the full UI/UX validation after the host's hand-over

**When:** the host hands back its round (expected Monday morning) with a commit and its tracking copy.

**What:** the same full validation as the `04ffc21e` sweep: setup, every screen, every option, by day, by night and on a phone, plus the visual scoring. It adds one new area: **a person with several businesses, several mailboxes and several calendars**. That changes how most screens look.

**Output:** a new package `reviews/ui-ux-2026-10/sweep-<commit>/`, laid out like `sweep-04ffc21e/`, and a reply to the host. **The reply always includes the path to 4.6** (section 7).

This file and `tooling/` are committed so the run can start from a fresh container. Nothing here depends on the earlier scratchpad.

## 0. Inputs to collect from the host's hand-over

- [ ] The hand-over commit on `claude/tender-tesla-16a8ob`.
- [ ] Their tracking copy, `docs/project/sweep-04ffc21e-tracking.md`, with Status, Commit and Test filled in.
- [ ] **The several-accounts fakes** (section 3.1): the flag names and how to start them. If they're missing, sweep S5 runs with what exists and the gap is a finding against the hand-over.
- [ ] Anything the host marked deferred, or "done differently", with its reason.
- [ ] **Two fixes announced for this hand-over, to check by name:**
  - Setup's mail step with **two accounts of one service**: the sides question grouped by account and named by address. S1 and S5 check it.
  - The promises step's findings **move from the wizard to Today**. S1 checks the wizard; S2, S3 and S5 check Today.
- [ ] **The owner's reports X66–X69** (`owner-reports/old-name-and-two-setup-steps.md`):
  - X66: the old name, which the automatic checks now flag on every screen and in the window title; also the folders setup creates, and an existing old-name backup folder still being found.
  - X67: "We copy it…".
  - X68: the step count.
  - X69: the promises findings.
  - X70: "we" in six more lines.

## 1. Build

```
git fetch origin claude/tender-tesla-16a8ob
git worktree add <scratch>/wt <commit>
cd <scratch>/wt && uv sync && (cd web && npm ci && npm run build)
uv run pytest -q            # baseline: note any failure, don't fix it
uv run python -m engine.selfcheck
```

Fill the brief templates in `tooling/`:
- `{{WORKTREE}}` is the worktree.
- `{{SWEEP}}` is the sweep folder in the scratchpad, holding `lib.mjs` and the briefs.
- `{{SCRATCH}}` is the scratchpad.
- `{{COMMIT}}` is the commit.

Copy `tooling/lib.mjs` into `{{SWEEP}}`. The scripts in `tooling/scripts-04ffc21e/` show working selectors from the last run. Use them as a starting point, not as the test: the UI will have moved.

## 1b. Method changes after the owner's reports (X66–X70)

These run in every sweep from now on. The reasons are in `owner-reports/old-name-and-two-setup-steps.md`.

1. **The briefs carry the product's facts:** the product name (Thimbleby), the assistant's default name (Reginald), the website's three promises, and the latest decisions in `docs/decisions.md`. Read those decisions before writing the briefs.
2. **The automatic checks flag the old name** on every screen and in the window title (`lib.mjs`).
3. **A wording scan** of every string in `web/src/wording/en.json`:
   - company voice ("we", "us", "our", allowing the person's own phrases)
   - the old name
   - fragments ("…, read")
   - unfilled placeholders
   - text that breaks a promise
4. **Owner-path parity:** each of these is present in at least one run, or named as a gap:
   - cloud drive folders in the home folder for one setup run
     - **How:** start the app and the fakes with an explicit temporary `HOME`. The e2e server otherwise reads the real HOME; the host has a test-isolation fix on its list.
     - **On Linux,** make `$HOME/OneDrive/`, `$HOME/Dropbox/` and `"$HOME/Google Drive/"`. The list lives in `engine/defaults/cloud_folders.yaml` and is read by `engine/cloud_folders.py`; the first folder found is the one recommended.
     - **iCloud has no Linux place.** To see the iCloud card (the one in the owner's screenshot), override `storage.backups.cloud_folders` in the test workspace with an iCloud entry pointing at a temporary folder. If that isn't possible, name it as a gap.
     - **Check:** the folder named on each card, the folder actually created, that the old name appears nowhere (X66), and that an existing old-name folder is still found.
   - several accounts (S5)
   - an existing backup folder under the old name
5. **Worst-case content:** script the AI stand-in (the fake's one-answer script) to return:
   - promise titles of two or more lines, with case numbers and postal addresses
   - quotes cut off mid-sentence
   - non-English text
   - emoji
   - 40 or more items

   Judge every screen that shows them.
6. **Owner reports become checks:** every screenshot the owner sends is a check in the next sweep, by id.

## 2. Phase 1: functional sweeps (Sonnet subagents, in parallel, each on its own ports)

| Sweep | Ports (app, https, fake) | Who | What |
|---|---|---|---|
| **S1 Setup** | 9245, 9246, 9255 | Fresh install | Three complete runs: skip everything; personal only; everything. Every step, option, Back, reload mid-step, wrong input. Then leave setup from every step (X02) |
| **S2 Daily** | 9345, 9346, 9355 | Persona A: own life only | Every screen empty first, then a few days of use: Today, Schedule, every Work view, every record, Ask, Hand in, Undo |
| **S3 Business** | 9445, 9446, 9455 | Persona B: personal + job + one business, one mailbox | Every record page, mail-driven lines, follow-ups, reviews, Handled, quality, Handover |
| **S4 Settings** | 9545, 9546, 9555 | Persona B | Every Settings section and control, add-ons, backups and restore, connections, the admin screens |
| **S5 NEW: several businesses and accounts** | 9645, 9646, 9655 | **Persona C** (section 3) | The screens as they look and behave with 3 to 4 sides, 3 mailboxes and 3 calendars |

**Each agent gets:**
- `tooling/BRIEF-COMMON.md`, filled in, plus its own area.
- For S5, section 3 of this file as well.
- It returns its findings as text, because subagents can't write report files; I save them.
- Use `model: "sonnet"` (the owner's standing request).

**I verify myself:**
- every P0, and every finding that would reopen a closed master item
- one random P1 per sweep

## 3. Sweep S5: several businesses, several mailboxes, several calendars

### 3.1 What the fakes must give (asked of the host before the run)

Today `tests/fake_services.py` has one sign-in identity (`/account/v1/me` always answers the first person), one mailbox and one calendar. So a second account connects as the same person. S5 needs:

1. **Distinct accounts per sign-in.** For example, `--accounts 3` with an account chooser on the sign-in page, or a `login_hint` the popup honours. Each account has its own address, and **its own mailbox and calendar contents**.
2. **Calendars that interact:**
   - a meeting in account 1 that overlaps one in account 2 (a clash across calendars)
   - **the same invitation in two calendars** (it must show once)
   - an all-day entry
   - an entry on a calendar that can't be changed (read-only)
3. **Mail that interacts:**
   - the same thread copied to two mailboxes
   - a sender who writes to both the job and a business address
   - one mailbox that serves two businesses (the person ticks both sides for it)
4. **An account that fails:** sign-in expired or retrying. The warning state (VP05 / VC13) is seen with several healthy accounts beside it.
5. **Fixtures in both fictional workspaces** for long business names, and for 4 or more sides (VP11). Fictional names only.

### 3.2 Persona C

**Their life and work:**
- Personal life.
- A job.
- **Two businesses**: one name long enough to test truncation. The two "belong together" under a group.
- A third business added later, from Settings, so the move from 3 to 4 sides is seen.

**Their accounts:**
- **Personal account:** mail and calendar, private.
- **Job account:** mail and calendar.
- **Business account:** mail and calendar, serving both businesses.
- **One extra source** through "Another mail or calendar", or a read folder.

### 3.3 What to check, screen by screen

| Area | Check |
|---|---|
| Setup: What it's for | Two and three businesses. The group disclosure. Removing one. Long names. The phone |
| Setup: Mail and calendar | Connecting 3 accounts in a row. Sides per mailbox ("Who is this inbox for?") with one mailbox ticked for two businesses. That **Choose what to read** makes no duplicates (X05). Connecting the same account twice. Removing one mid-setup. Done showing each account and its sides |
| Header and side tabs | 4 or more sides: does the side filter or tab strip overflow, wrap or scroll at 1440, 1024 and 390? Is the selected side clear? Does "All sides" stay first? |
| Today | Lines labelled by side without a pill column (VC01). The clash across two calendars shown once, with both calendars named. The duplicate invitation shown once. Brief and rail cards per side. The filter set to one business |
| Schedule | **Calendar colours and a legend, or names.** Showing and hiding each calendar. Overlapping entries from different calendars side by side. The duplicate invitation once. Which calendar a new entry goes to (and that it can be chosen). Moving or cancelling an entry on a read-only calendar is refused in words (the X45 wording). Month view density |
| Work views | Grouping and filtering by side with 4 sides. Follow-ups: **which mailbox a draft would send from**, that it is the right one, and that the person can see and change it. Handled grouped by account |
| Records | The projects table with several sides (VS12). Each business's side page. A person who belongs to two sides. An organization that deals with two businesses. Files and knowledge filed per side |
| Ask and Hand in | Asking about one business only. Handing in to a chosen side: does the choice appear only when it's needed? |
| Settings | **Connections with 3 healthy accounts and 1 failing** (compare with the VS18 mockup). Disconnect and reconnect one. Business: add, rename and remove a side, and what happens to its lines. Notices and Lists per side. Privacy per side: personal mail private, data levels |
| Privacy | Personal mail never appears under a business. A business filter never shows personal lines. Confidential sides are marked |
| Visual | Density and colour with many sides. Side labels at phone width. Long names (truncate, never overlap). Night mode for the calendar colours |

### 3.4 Visual scoring for S5

- Score the S5 screens on the same 8 points.
- Also say **whether the layout still works at 4 sides and 3 calendars**. A screen can pass with one account and fail with three: that counts as a fail for E9, E13 and E14.

## 4. Phase 2: check every tracked item

Go through every row of the host's tracking copy (X01–X65, Y01–Y06, VC01–VC13, VS01–VS19, and VP01–VP15 where started). For each, fill in **Checked**:
- **Pass:** the commit and screenshot.
- **Fail:** what's still wrong, and the screenshot.
- **Partly:** what's still wrong, and the screenshot.
- **Not checkable:** why.

A fix claimed with no test named counts as Partly.

## 5. Phase 3: visual re-score (Sonnet subagents)

- **The agents:** the same three visual areas as before, plus S5's screens, using `tooling/BRIEF-VISUAL.md` (filled in).
- **What each agent reports for every screen:**
  - the 8 scores
  - the overall score
  - **the stage it has reached:** A at 3.5 or more with no point under 3; B at 4.0 or more with no point under 3.5; C at 4.6 or more with no point under 4.3
  - **the VP items that stand between it and the next stage**
  - **the brand point (9)**, scored against PATH-TO-4.6 section 4b and `sweep-04ffc21e/visual/brand-reference/`. It covers the mark, the palette, the type, the brand moments, and any state colour mistaken for the brand
- **The mockups:** the six built mockup screens are captured side by side with their mockups for E11.
- **Re-scoring the mockups:** if mockups v2 exist by then (VP14), have a separate agent re-score them cold.

## 6. Phase 4: the package

`reviews/ui-ux-2026-10/sweep-<commit>/`:
- **`README.md`:**
  - the verdict
  - how it was tested
  - the exit criteria E1–E14 with a verdict for each
  - the master list: new items numbered after X65; reopened items keep their old id
  - what changed since `04ffc21e`
- **`TRACKING.md`**, with Checked filled in.
- **`appendix/`:** the five sweeps, the automatic checks, and **the S5 appendix**.
- **`visual/README.md`:** scores and stages for each screen, and VC and VS status.
- **`visual/PATH-TO-4.6.md`:** updated, with where each screen stands now.
- **`shots/`:** recompressed to 1100px wide at quality 58.

## 7. The reply to the host (always this shape)

1. **Verdict:** whether the round passed or failed, and by which exit criteria.
2. **Blocking now:** the P0s and reopened P1s, each with its id and screenshot.
3. **Several businesses and accounts (S5):** what breaks or looks wrong with 3 or 4 sides and 3 accounts, and the new ids.
4. **The path to 4.6:**
   - **The scores:** the average now, against 2.6 at `04ffc21e`. How many screens are at stage A, B and C, and the five lowest screens.
   - **The brand:** the average brand point now, and where the app still looks generic (no mark, indigo, the system font) or where a state colour reads as the brand.
   - **What's left to reach 4.0 (E13):** the VP01–VP08 and VP16 items still open, ranked by how many screens each one holds back.
   - **What's left to reach 4.6 (E14):** the VP09–VP15 and VP17 items, and whether the method in PATH-TO-4.6 section 6 can be run yet (captures, recordings, two reviewers).
   - **The next five moves,** in order, each with the screens it lifts and by roughly how much.
   - **Anything that moved backwards** since `04ffc21e`.
5. **What I need from the host:** missing fakes, deferred items to confirm, and questions for the owner.

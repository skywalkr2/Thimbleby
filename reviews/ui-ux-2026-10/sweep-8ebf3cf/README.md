# Re-sweep at `8ebf3cf`: verdict, what to fix, the mockups to build to, and the path to 4.6

**Reviewed:** commit `8ebf3cf` on `claude/tender-tesla-16a8ob`, against the host's tracking copy at `083d820`.
**Method:**
- Five functional sweeps, each a separate agent on its own copy of the app.
- Five visual scoring passes.
- The reviewer's own checks: self-check, tests, a scan of every wording string, and a confirmation of each serious finding.
- The new method from `../RESWEEP-PLAN.md` section 1b: product facts in the briefs, the old-name check, worst-case content, cloud drives present, several accounts, and owner reports as checks.

## Contents of this folder

| File | What it holds |
|---|---|
| `README.md` (this file) | The verdict, the exit criteria, the new and reopened items, the mockups, the path to 4.6, and **the instructions for the hand-back** |
| `TRACKING.md` | Every one of the 125 rows in the host's tracking copy, with **Checked at 8ebf3cf** filled in and the evidence for each |
| `appendix/sweep-s1.md` … `sweep-s5.md` | The five sweeps in full: S1 setup, S2 daily use (own life only), S3 a job and a business, S4 every setting, S5 several businesses and accounts |
| `appendix/checked-by-reviewer.md` | What the reviewer confirmed, corrected or couldn't re-run |
| `visual/visual-1.md` … `visual-5.md` | Visual scores: V1 setup and chrome, V2 the work screens, V3 records, V4 several businesses and accounts, V5 Settings |
| `visual/mockups-46-score-*.md` | The cold scores of the 4.6 mockups |
| `../mockups-46/` | **The mockups to build to:** ten pages and two state sheets, by day, night, 1024 and phone (`png/`), with their HTML and `m46.css` |

## 1. Verdict

**The round doesn't pass yet.** The P0s held, and a lot of the app is clearly better. But a real install with several accounts, real mail and a phone still shows serious problems:

- **What held:**
  - The self-check and every test pass at `8ebf3cf`.
  - No "Cockpit" remains in any wording, and no company "we".
  - X02, X03, X05 and X06 hold.
  - The schedule's repeats, Move and Cancel work, as do Files and Undo.
- **What reopened:** 23 of the 125 rows fail and 69 are partly done (`TRACKING.md`). Several "Fixed" rows fail when checked by hand:
  - **X16, time zone:** Today's schedule card and Came in show UTC beside "Now" in the person's zone.
  - **X37 and X38, internals on screen:** a to-do's Edit details is a 25-field developer form showing "PRJ-1" and "[object Object]". Saving one field rewrote the title.
  - **X44, work words** for a person with only their own life.
  - **X24:** the clash line still has no Move or Open.
  - **X14:** Done claims things that aren't true.
  - **X69:** the promises results.
  - **X01:** a quick last edit is still lost if the page reloads within about 3 seconds. The screen says "Changed" with no "Saving".
- **New, from the several-accounts sweep (S5):**
  - one failing account shows every account as failed
  - the same invitation and thread show twice
  - calendars can't be told apart
  - the side filter leaks on Today
  - mail for two businesses is filed under Personal
  - there's no way to change which sides a mailbox serves after setup
- **The look:**
  - The app averages about **3.1 out of 5**, against 2.6 at `04ffc21e`.
  - 9 of 76 scored screens reach stage A (3.5); none reaches B.
  - **Brand is 1 to 1.5 everywhere:** no mark, no brand colours or type, and the product's name appears on no screen.

## 2. Exit criteria

| | Criterion | Verdict |
|---|---|---|
| E1 | Every P0 fixed, with a browser test | ✗ X01 still loses a quick last edit on reload (S4, six scripted runs; please reproduce in a test). X04 has no restore button |
| E2 | Every P1 fixed or deferred in writing | ✗ 23 rows fail and 69 are partly done |
| E3 | P2 groups fixed or moved to the backlog | ◐ Y02, Y04 and Y06 pass; Y01, Y03 and Y05 have owner-postponed layout items (record them as deferred) |
| E4 | Guards in CI on every screen | ◐ The self-check passes, but the guards missed raw ids in Edit details and Notes, UTC times, and work words for a personal-only person |
| E5 | Three journeys from a fresh install | ◐ They run. Journey B didn't catch the duplicate rows or the side leaks |
| E6 | Fresh captures with an index | ✗ None were handed over |
| E7 | A hand-over listing every id | ✓ The tracking copy at `083d820` |
| E8 | A re-sweep with no P0 and no new or reopened P1 | ✗ See section 3 |
| E9 | Every screen at 3.5 or more, no point under 3 | ✗ 9 of 76 |
| E10 | VC01–VC13 built and used everywhere | ✗ 12 partly done, VC05 (form fields) fails |
| E11 | The six mockup screens built to match | ✗ Partly. Superseded by the 4.6 mockups (section 4) |
| E12 | Visual guards in CI | ◐ The one-primary-per-region and pill rules hold; native date, time and select inputs remain |
| E13 | Stage B (4.0) | ✗ Not reached |
| E14 | Stage C (4.6) | ✗ Not reached |

## 3. What to fix: new items, and reopened rows to look at again

**Reopened rows keep their id:** X01, X14, X16, X24, X33, X37, X38, X44, X45, X69, and the 69 rows marked ◐. Each one's evidence is in `TRACKING.md`.

**New items, numbered after X70.** Each source is in the appendix.

### Data and trust
| ID | Sev | Item | Source |
|---|---|---|---|
| X71 | P0 | A to-do's **Edit details** is a raw 25-field form ("PRJ-1", "[object Object]", Reply owed, Date set by…), and **saving only the due date rewrote the title** so it contradicts the date. **Fix:** the same short editor as the row menu (what, due, who, side or project by name), saving only the fields touched | S3 P0-1 (confirmed), S2 P1-1, V3 |
| X72 | P1 | Ids, code text and ISO dates on screen: What changed's pane ("FACT-2 … ACT-6 … (none)"), the Notes list (JSON, "PER-1"), the Came-in page (content hash, "Reference: m-1", "By us: No"), the Pause menu, search and quotes ("by 2026-11-02") | S3 P0-2 (confirmed), S2 P1-2/3/5 (confirmed) |
| X73 | P1 | Today's Schedule card and Came in show UTC beside "Now" in the person's zone (reopens X16) | S1 P1-2 (confirmed) |
| X74 | P1 | Sending one item back adds duplicates of the others ("Get a catering quote." twice) | S3 P1-1 |
| X75 | P1 | Settings writes and reloads: quick edits wait 2.5–3s each with no "Saving" cue; a reload in that window loses the last (X01) | S4 F1 |
| X76 | P1 | Removing the AI account doesn't confirm, its Undo vanishes on navigation, and Today still offers Start | S4 F9 |

### Several accounts and sides (S5)
| ID | Sev | Item | Source |
|---|---|---|---|
| X77 | P1 | One failing account shows all as "Failed"; nine identical red lines; no "Sign in again"; a green "Read" on rows not being read (also after sign-out); "All good" in the header | S5 P1-1/2 (confirmed on screen), S4 F2 |
| X78 | P1 | The same invitation, and the same thread, show twice when in two accounts | S5 P1-5 (confirmed), P1-9 |
| X79 | P1 | Calendars and mailboxes can't be told apart: no colours, legend or toggles; "Your inbox", "Your calendar" for every account; clash lines don't name the calendars | S5 P1-4/6/11 |
| X80 | P1 | The side filter leaks on Today (personal clashes, and every Came-in item, under a business filter) | S5 P1-7/8 |
| X81 | P1 | Mail from a mailbox serving two businesses is filed under Personal | S5 P1-10 |
| X82 | P1 | There's nowhere to change which sides a mailbox serves after setup, and adding a business doesn't ask | S5 P1-12 |
| X83 | P1 | Long side names: the side strip is unusable at 390, the sidebar clips with no ellipsis and scrolls sideways, and five identical icons at 1024 | S5 P1-3, V4 V-P1.1/4 |
| X84 | P1 | Setup's mail step with three accounts: a nine-item run-on and a 1900px wall | S5 P1-13, V4 V-P1.5 |
| X85 | P1 | Follow-up drafts don't say which mailbox they send from, and the message style contradicts the draft | S5 P2-17, S3 P1-6 |

### Today and the work screens
| ID | Sev | Item | Source |
|---|---|---|---|
| X86 | P1 | Long titles aren't shortened: a pasted note becomes a three-sentence title; quotes are cut mid-word; ".," and the date twice | S2 P1-6, S1 P1-8 |
| X87 | P1 | Counts disagree: 52, 49, 9 and 7 on one screen; "3 items" against "4 to-dos"; What changed 3 over 11 rows; the setup line "6 of 7" beside 8 | S2 P1-8, S3 P1-9, S1 |
| X88 | P1 | "Who is Avery Lane?" is asked in three places on Today | S3 P1-2 |
| X89 | P1 | Follow-ups' "due soon" band lists already-sent items | S3 P1-3 |
| X90 | P1 | The Evening wrap-up's "Moved to tomorrow" lists items that weren't moved | S3 P1-8 |
| X91 | P1 | Today says "Nothing needs you" while a setup session is open | S1 P1-1 |
| X92 | P1 | Phone: Today's titles are cut; the opened review overlaps ("Nol right", "Tod do") | S2 P1-12, S1 P1-9, V2 |
| X93 | P1 | A host and port stand in for an account name ("127.0.0.1:9355: 15 tasks", "Read by 127.0.0.1…") | S2 P1-10, S3, S5 |

### Setup and Settings
| ID | Sev | Item | Source |
|---|---|---|---|
| X94 | P1 | The AI step keeps the previous choice's guide; back on the step after connecting, there are two cards for one account, plus jargon (Measure, Change AI models) | S1 P1-3/4 |
| X95 | P1 | The calendar form: the cursor isn't in the first field; an unlabeled password-type box | S1 P1-5 |
| X96 | P1 | "No time zone matches" is drawn in a 4px bar | S1 P1-6 |
| X97 | P1 | The folder chooser: no New folder, no breadcrumb; it browses system folders and accepts /etc | S1 P1-7, S4 F6 |
| X98 | P1 | Restore only from the command line, shown as `cockpit restore …` | S4 F3 |
| X99 | P1 | The synced folder vanishes after Save until a restart; Save is disabled with no reason | S4 F4 |
| X100 | P1 | A second backup folder is added instead of replacing the first; copies listed twice; no way to remove a folder | S4 F5 |
| X101 | P1 | The Add-connection drawer won't close with Esc or X on step 2; "Choose what to read" opens the generic drawer | S4 F7, F15 |
| X102 | P1 | Settings input: no length limits; engine words ("there is already a project called Personal"); "That didn't work."; "$-5.00", "1e-7" | S4 F10–12, X49 |
| X103 | P1 | AI and spending is a wall of ten identical rows; Compare contradicts the daily-limit note | S4 F13–14 |
| X104 | P1 | Add-on pages ask for unneeded keys, use jargon, and Remove doesn't confirm | S4 F16, X52 |

### P2 groups
- **Y07, setup polish (S1 P2):**
  - the AI step's wording
  - the mail step's layout
  - the promises step repeats itself
  - Backups doesn't confirm
  - a bare tick isn't kept
- **Y08, daily polish (S2 P2):**
  - Quality's empty boxes
  - search doesn't find mail or notes
  - Schedule wording
  - unlabeled Timeline dots
  - small to-do items
- **Y09, business polish (S3 P2).**
- **Y10, Settings polish (S4 F21–F35).**
- **Y11, several-accounts polish (S5 P2 14–29).**

## 4. The mockups to build to: `../mockups-46/`

The reviewer redrew the app at the 4.6 bar, in the product's brand. They supersede the six `04ffc21e` mockups (E11).

| Page | What it settles |
|---|---|
| `today`, `today-review` | **Today:**<br>• one filled button<br>• groups with counts<br>• a clash line naming both calendars<br>• side and calendar dots<br>• a calm rail no longer than the main column<br>• the review as an inset card with "Keep all 4"<br>• Decide demoted while a review is open |
| `today-states` | **Today's states:**<br>• all clear (a brand moment)<br>• loading at row height<br>• one account of three failing<br>• offline<br>• a failed save<br>• a side filtered to nothing<br>• the side filter opened, with long names<br>• changed elsewhere (old → new)<br>• 100+ items, long and non-English titles |
| `todos` | **To-dos:**<br>• grouped Overdue / Today / Coming up / Waiting<br>• an inline add row<br>• questions not tickable<br>• "Needs a date" as one line<br>• counts that match |
| `schedule` | **Schedule:**<br>• three calendars, each with its side's colour, as toggles<br>• a clash as one card naming both meetings<br>• "In 2 calendars"<br>• weekdays below 1100px<br>• **a list on a phone** |
| `connections` | **Connections:**<br>• one card per account address<br>• its sides as chips with Change<br>• a failing account with a red edge, "Needs sign-in since 10:51 AM" and "Sign in again"<br>• its parts as rows with a status<br>• the header saying "1 account needs you" |
| `person` | **A person's page:**<br>• avatar<br>• "Add a to-do for Maya" as the primary<br>• labelled emails in full<br>• a timeline with actor icons<br>• Ask with a send button |
| `quality` | **How Reginald is doing:**<br>• a one-line "so what"<br>• tiles with worded deltas<br>• a table that becomes a list on a phone<br>• mistakes as rows to act on |
| `setup-ai`, `setup-mail`, `setup-states` | **Setup:**<br>• the step rail with serif numerals<br>• the footer on the column's edges<br>• one "Open" style<br>• the key's states (empty, checking, accepted, rejected)<br>• three accounts as rows with "For" chips<br>• no accounts<br>• waiting for the sign-in window |

**The shared rules all of them use** are in `m46.css`. They map to VP01–VP17:
- one content grid
- rows with a fixed 24px lead slot
- 11px uppercase group labels with a count pill
- one filled button per screen, including the phone's bar
- a state shown with an icon and a word, plus a 3px edge and a tint
- side and calendar colours that are distinct from state colours
- pills for buttons, 8px corners for fields
- night surfaces that lift
- a phone tab bar of Today, To-dos, "+", Schedule and More, where "+" is tonal
- "⋯" always at the top right of a row on a phone
- in-between widths: the rail drops under the main column, settings lose their submenu, the Schedule shows weekdays only

**Every page also has a state sheet:**
- `todos-states`, `schedule-states`, `connections-states`, `person-states` and `quality-states`
- the shared minimum on each: offline, a failed save, long content, a large count
- plus the page's own cases

**Scores:** five cold passes by a separate reviewer against the 4.6 bar (4.6 overall, no point under 4.3, brand at least 4.5); see `visual/mockups-46-score-1.md` … `-5.md`.

| Pass | Range |
|---|---|
| 1 | 3.8–4.5 |
| 2 | 4.20–4.51 |
| 3 | 4.2–4.5 |
| 4 | 4.39–4.61 |
| **5 (final)** | **Setup AI 4.63, Setup mail 4.60, Connections 4.59, Today 4.58, Person 4.58, To-dos 4.55, Quality 4.54, Schedule 4.46** |

- **On the final pass:** no point below 4.3 anywhere, and brand 4.5–4.8 on every page.
- **Fixed after the final score** (not re-scored): the run-together calendar names on Today, To-dos' width, Quality's intro and the colour of one extra false alert, the state-sheet titles, and the phone rows.
- **Still open: build these to the bar.** The scorer's list is at the end of `visual/mockups-46-score-5.md`:
  - the Schedule's week grid text and fills, and its Day, Month and Timeline views
  - a trend visual on Quality
  - Connections' phone card
  - the person page's contact card at 1024 and on a phone
  - brand icons

## 5. The path to 4.6

| | `04ffc21e` | `8ebf3cf` |
|---|---|---|
| Average screen score | 2.6 | **about 3.1** (setup and chrome 3.3, work screens 3.0, records 3.0, Settings 2.9) |
| Screens at stage A / B / C | about 4 / 0 / 0 | **9 / 0 / 0** of 76 |
| Brand | not scored | **1 to 1.5 everywhere** |
| With several sides and accounts | not tested | most screens drop 0.1–0.2. The left menu drops 0.6, setup's mail step 0.5, and the failing-account popover 0.8 |

**What's left to reach 4.0 (E13)**, ranked by how many screens each item holds back:
1. **VP16, the brand** (every screen). Tokens, the mark, the fonts, the state colours moved off burgundy and gold. Only the pills are done.
2. **VP02, row anatomy** (about 40 screens). A fixed lead slot; no square tag column in front of titles.
3. **VP04, one filled button per viewport** (about 35). The header's "Hand something in" turns outline.
4. **VP07, state sheets** (every list screen). Loading, error, offline, conflict, filtered-empty, failing account.
5. **VP03, type scale** (about 30). Uppercase 11px group labels; no 12px help paragraphs.
6. **VP01, one content grid** (about 25). Footers, rails and filter strips on the same edges.
7. **VP05, status and state rows** (about 20). Dot and word, icon, edge and tint. The header status agreeing with Connections.
8. **VP08, the phone shell** (about 20). Rows stack; "⋯" top right; no side strip.
9. **VP06, night surfaces and focus** (every night screen). Plus the always-on first-row ring.
10. **The form controls** (VC05, still failing). No native date, time or select inputs.

**What's left to reach 4.6 (E14):**
- **Not started:**
  - VP09, motion
  - VP10, keyboard
  - VP12, in-between widths (1024 breaks the side strip and the menu)
  - VP13, hit targets (18px circles, a 14px "⋯", 68x20 Remove)
  - VP15, screenshot comparisons in CI
  - VP17, brand moments
- **Partly done:** VP11, content resilience. The long-name fixtures exist, but long names still clip.
- **The section 6 scoring method** in `../sweep-04ffc21e/visual/PATH-TO-4.6.md` can't run yet: there are no fixed captures or recordings.

**The next five moves, in order:**
1. **Fix X71–X77 and the reopened X01, X16, X37, X38.** Trust before looks: they're cheap and they hit every screen.
2. **VP16 (brand) and VC05 (form controls) as one token-and-component batch.** It lifts all 76 screens' brand point from 1–1.5 to about 4, and removes the native inputs.
3. **VP02, VP03 and VP04 (rows, type, one primary) in the shared Row, Panel, PageHeader and Button.** About +0.4 on 40 screens.
4. **Build `today`, `todos`, `schedule` and `connections` to the 4.6 mockups,** including their phone and 1024 versions and the state sheets. These four are where a person spends the day, and where S5's several-account problems live.
5. **VP07 and VP08 (states and the phone shell),** then the rest of the mockups (`person`, `quality`, setup).

**Gone backwards since `04ffc21e`:**
- a square tag column before titles
- a permanent ring on the first row of every list
- the setup footer misaligned with its new column
- "Needs a date" taking 340–560px above To-dos
- the left menu clipping long names and scrolling sideways
- a warning toast with a success check

## 6. Instructions for the hand-back (the owner's rule)

**Before handing back, validate your own build against each mockup:**
1. **Capture** every page in `../mockups-46/` from your build: same page, same state, same width and theme (1440 day and night, 1024, 390 day and night). Use the fictional workspaces with the several-accounts fakes and the long-name fixtures.
2. **Put each capture beside its mockup** in one image per page and state, and list every difference you see. For each one, either fix it or say why it differs (for example, an owner decision, or the mockup being wrong).
3. **Check the states:** for every state on `today-states` and `setup-states`, show the build in that state, by driving it with the fakes.
4. **Check the rules:** for each shared rule in section 4, name the CI guard that holds it, or say it's checked by hand.
5. **Re-run your own sweep** of X71–X104 and every ✗ and ◐ row, with a browser test for each fix, and update the tracking copy.
6. **Hand back** the commit, the tracking copy, the side-by-side images with their difference lists, and anything deferred with the owner's yes.

The reviewer will then score the build cold against the same bar, using the section 6 method in `PATH-TO-4.6.md`.

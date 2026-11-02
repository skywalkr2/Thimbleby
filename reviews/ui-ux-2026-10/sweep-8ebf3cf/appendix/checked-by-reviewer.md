# Checked by the reviewer (main session)

## S3 P0-1: CONFIRMED (screenshot w03b-edit-full, text w01, w03, w04)
- **What the form shows:** Edit details on a to-do is a 25-field form showing Project "PRJ-1", Wording "Send the headcount by 2026-11-04.", Owners "[object Object]", Status "open" and Where it came from "SRC-2", plus developer fields (Reply owed, Reported by, Date set by, News and more).
- **What saving does:** changing only the due date to Thu, Nov 5 changed the title from "Send the headcount." to "Send the headcount by Wed, Nov 4.", so the title now contradicts the due date.
- **Reopens X37** (record pages show internal field names and raw values) **and X38** (ids and raw dates on screen).

## S3 P0-2: CONFIRMED (c01-changed-after-edits.txt line 132)
- The What changed pane shows "FACT-2: … FACT-1: … The person changed action ACT-6 "…": due was Sun, Nov 8, now Mon, Nov 9. (none)".
- **Reopens X38.**

## S2 P1-2 (random pick): CONFIRMED (t-cameIn-open.txt lines 41–58)
- The Came-in message page shows "Content hash", "Kind", "By us: No" and "Reference: m-1".

## S2 P1-5: CONFIRMED (t-menu-Pause.txt lines 90–91)
- The Pause dropdown lists "Send the venue list by 2026-11-02."

## S1 P1-2 (time zone): CONFIRMED (B/b24-today-first.txt lines 65–88)
- "Now · 2:35 PM" (Los Angeles) sits beside "10:33 PM – 11:03 PM" (the same moment in UTC) and mail at "9:18 PM".
- The Schedule card and Came in format UTC. **Reopens X16.**

## S1 P1-11 (old-name folder): CORRECTED by the reviewer
- `engine/folder_rename.py` offers the rename on Today only when the old folder exists **and the new one doesn't**. In run D, setup's backup step had already made `Backups/Thimbleby`, so the offer can't appear.
- **What this leaves:**
  - P2: setup on a reinstall ignores an old-name folder beside it.
  - Untested: the upgrade path that matters to the owner (an existing workspace backing up to the old folder). The host should show the test that covers it, or the reviewer tests it with a prepared workspace.
- **X66: ◐ Partly.** The on-screen part passes, `cockpit.db` sits inside the new folder, and the window title never names the product.

## S5 P1-1 (one failing account shows all as failed): CONFIRMED ON SCREEN (fail-expired-connections.txt lines 63–145)
- With only account 3 (avery.lane.studio) set to fail, the rows that read avery.lane@example.com and avery.lane.home@example.com also show "Couldn't be read · Failed".
- **The cause isn't proven:** either the app shares one status across the service, or the fake fails more than the one account. The host should check with `tests/test_fake_accounts.py`. Either way, the screen can't tell the person which account to fix.

## S5 P1-5 (the same invitation twice): CONFIRMED (ev-q1.txt and ev-q2.txt each list "Quarterly review" three times in the week; two panes show different sides)

## S4 F1 (X01 remaining loss window): REPORTED, NOT RE-RUN by the reviewer
- The S4 servers had stopped, so the reviewer couldn't re-run it.
- The sweep's scripts (x01.mjs to x01f.mjs) ran it six ways with timings: with a 12s wait all three edits were kept; a reload 3s after the last edit lost it.
- **The host should reproduce it in a browser test** that reloads 3s after the third edit.

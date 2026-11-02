# S4 report: every Settings section and the admin screens, at 8ebf3cf

**Persona B:** a job (Harbor Logistics), a business (Salt Orchard Studio), mail connected, the fake AI service. The automatic checks flagged nothing; every finding below was found by hand.

## Row verdicts

| ID | Verdict | What was seen | Screenshot |
|---|---|---|---|
| X01 | ✗ Fail (partly) | Three money edits 300ms apart, then a reload 3s later: the third was lost ("$203.00" typed, "$102.00" after the reload). With a 12s wait all three kept. Saves run one at a time, 2.5–3s apart. The fields show "Changed · Reset" at once with no "Saving" cue, and the toast names only the first save. Seen in six scripted runs; **not re-run by the reviewer** | x01-reload-after-3000, x01-after-3-edits |
| X04 | ◐ Partly | The folder chooser, Back up now and encrypted copies work. **There's no restore button:** "It isn't a button yet: it is done from the command line", with a "For developers: the steps" box | bk-05-backup-now-during, rst-steps |
| X05 | ◐ Partly | Refusals work for a repeated inbox and a repeated folder. **The same folder with a trailing "/" is accepted**, giving two identical "source / A folder" rows | cn3-after-add-1, cn7-after-slash |
| X47 | ✓ Pass | An amber "Restart to finish", then Restart now, then "Restarted with the new settings." | ao3-off, rs1-restarting |
| X48 | ◐ Partly | Dark and the accent apply at once. Undo takes about 2s to show. "Empty uses the app's indigo" makes no sense beside a colour picker | app1-dark-picked, app2-after-undo |
| X49 | ◐ Partly | Plain refusals. But a refused "-5" stays as "$-5.00", "0.0000001" shows as "1e-7", a lower-case fragment "the daily limit can't be above…" shows, and a 120-character list choice gives only "That didn't work." | val1-huge, ls2-after-adds |
| X50 | ✓ Pass | Destinations that can't be used are off, with a reason and links. The disabled radios are nearly invisible | day-set-today, nt1-radio |
| X51 | ◐ Partly | The price is on the button. The line says a test "counts toward your daily limit", which contradicts the host's note. A failure shows above "Nothing measured yet…" | cmp3-ready, cmp4-done |
| X52 | ◐ Partly | One name on Settings, but the Add drawer heading says "Journey mail". The add-on page asks for a "Client id" while signed in. Remove has no confirmation and doesn't mention its backup. After removal, Connections says "Turn on…" when it should say install | cn4-add-step1, ao1-addon-page, ao4-removed |
| X53 | ◐ Partly | Sign out confirms clearly. Afterwards the rows say "Not read until you sign in" while the Status column shows a green "Read", and the header says "All good" | so1-confirm, so1-signed-out, so2-status |
| X54 | ✓ Pass | The hint, the limit, https:// added, junk refused. The same link twice is allowed | ql-junk, ql-usermenu |
| X55 | ✓ Pass | "password", "dark mode" and "money" find the right places. Nonsense gives "No settings match." | se2-* |
| X56 | ◐ Partly | Refusals and a contrast note in plain words. The toast shows "logo-843c1f97d8c5.png". A huge logo shows "can't be found" until a reload | app3-logo-*, app5-huge |
| X57 | ✓ Pass | "Signed in as … · Sign out" on one row, at 1440 and 390 | day-set-connections, phone-set-connections |
| X58 | ◐ Partly | Short keys and relative paths are refused. A 5000-character key is accepted. The chooser has no New folder or breadcrumbs, and browses "/". "/etc" is accepted as a backup folder | bk-07-key-short, bk11, bk12, bk13 |
| X60 | ◐ Partly | Today and Settings say there's no AI account. The header says "Reginald: needs a look", and Today still offers "Start the assistant… $0.09" | noai4-today, noai2-ai-page |
| X61 | ◐ Partly | The subject is "Feedback on Thimbleby", and Details folds. The text promises "open it in your email app", but there's no button for that. The body is garbled ("Missed something? not used in the weeks counted") | fb2-details, ph2-feedback |
| X62 | ✓ Pass | The user menu is named for the person, with every item | ql-usermenu, phone-usermenu, ph1-more |
| X63 | ◐ Partly | Unknown add-on pages say so. #settings/zzz and unknown addresses redirect silently. #settings/lists says "Lists isn't in Settings here", which is wrong. A missing person shows "didn't load" | nf1-* |
| X64 | ◐ Partly | One toast at a time, but toasts trail the saves ("Theme: Dark" while the page is Light) | ts1-quick |
| X66 | ◐ Partly | No "Cockpit" on any screen text, and the subject says Thimbleby. **But the restore steps show `cockpit restore …`.** The tab title is the workspace name, so "Thimbleby" shows nowhere else. The workspace holds `cockpit.db` and `.cockpit/` | rst-steps |
| X70 | ✓ Pass | No company voice in Settings | |
| Y03 | ◐ Partly | The wording is done; the postponed layout items remain | |
| Y04 | ◐ Partly | Quality is a wall of empty boxes. Compare shows "Nothing measured yet" under a failure | day-quality, cmp4-done |
| Y06 | ✓ Pass | The wording is clunky: "Restart to use: a change to the add-ons, Add-ons." | rs1-restart-pop |
| VS04 | ◐ Partly | The user menu is right. The shortcuts weren't opened | |
| VS17 | ◐ Partly | The grouped menu exists, but the label spacing is inverted, and "You / You / You" | day-set-you |
| VS18 | ◐ Partly | An account card and a table, but no "For" or "Last checked" column. Sources sit outside the card. Folders say only "A folder" | day-set-connections |
| VS19 | ✗ Fail | Add-on cards are walls of text with no status pill or disclosure. Available also lists an installed add-on | day-set-addons |
| Pill decision | ✓ Pass | Every boxed button is a pill and all 70 fields have 8px corners. Plain-text buttons aren't boxed | |

## New findings

### P1
1. **F1, X01's remaining loss window:** a quick last edit is lost on a reload within about 3s, while the screen already says "Changed" (x01-*).
2. **F2:** Connections shows a green "Read" and the header says "All good" while the rows say "Not read" or "isn't installed" (so1-signed-out, ao6, so2-status).
3. **F3:** No restore from the app. The page shows `cockpit restore` to a beginner (rst-steps).
4. **F4:** The synced folder vanishes after Save until a restart ("This workspace isn't kept in a synced folder."). Save is disabled with no reason (sy1, sy2, sy4).
5. **F5:** A second backup folder is added instead of replacing the first, every copy is listed twice, and the toast says one folder. There's no way to remove a folder (bk-05).
6. **F6:** The folder chooser has no New folder, browses system folders, and accepts /etc (bk12, bk13).
7. **F7:** The Add-connection drawer won't close with Esc, an outside click or the X on step 2 (esc2-after-escape).
8. **F8:** A trailing slash makes a duplicate folder source, and no path is shown (cn7-after-slash).
9. **F9:** Removing the AI account doesn't confirm, Undo vanishes on navigation, and Today still offers Start (noai4-today).
10. **F10:** Name fields have no length limit and accept empty. A long name scrolls the phone sideways (day-you2-longnames, phone-you2-longnames).
11. **F11:** Engine words: "there is already a project called Personal", "People who work for it keep it in place". A 150-character name clips (biz4-remove-inline).
12. **F12:** A list choice that's too long gives "That didn't work." (ls2-after-adds).
13. **F13:** AI and spending is a wall: 10 identical "No tests cover this kind of work yet…" rows (ai2-work).
14. **F14:** Compare › Measure contradicts the tracking note, and shows a failure and "nothing yet" together (cmp4-done).
15. **F15:** "Choose what to read" opens the generic "Add mail, calendar or folder" drawer, which never names the account, and has a free-text "inbox" box (cn1-choose-read).
16. **F16:** The add-on page asks for keys it doesn't need. The card menu's only item is "Use your own app registration" (ao1, cn8).
17. **F17:** Logo: a file name on screen, and a false error (app3, app5).
18. **F18:** Quality: 12 boxes, 9 saying "Nothing yet.", 3 empty; a raw date field; the phone table breaks words (day-quality, phone-quality).
19. **F19:** The same quick link twice is allowed.
20. **F20:** The feedback preview (see X61).

### P2
- **F21:** Toasts and Undo trail the screen by seconds.
- **F22:** Unknown pages redirect silently.
- **F23:** The Settings menu spacing, and "You" three times.
- **F24:** The window title is the workspace name.
- **F25:** "Make one for me" and Save float after a key exists. "Where it is kept instead" is unclear.
- **F26:** Handover mentions a sync folder before one exists.
- **F27:** Advanced uses jargon.
- **F28:** Disabled radios are nearly invisible.
- **F29:** No warning when the ask-before amount is above the per-task limit. Raw "$-5.00" and "1e-7".
- **F30:** "Another command-line agent signed in as you".
- **F31:** Add folder, step 2: a whole sentence as a label, two folds, two primaries.
- **F32:** Long business names clip in the sidebar.
- **F33:** "Show keyboard shortcuts" is offered on a phone.
- **F34:** An add-on takes three steps and two restarts, with Installed and Available disagreeing in between.
- **F35:** Backup path wording.

**Counts:** P0 0 · P1 20 · P2 15.

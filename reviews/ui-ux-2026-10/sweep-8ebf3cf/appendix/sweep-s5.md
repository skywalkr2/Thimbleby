# S5 report: one person with several businesses, mailboxes and calendars, at 8ebf3cf

**Setup (ports 9645 and 9655):**
- a job (Brindle Ash Associates) and two businesses (Harborview Community Support Partnership Incorporated, and Lantern Row Studio) grouped under Harborview
- three accounts: 1 for Brindle, 2 for Personal, 3 for Harborview and Lantern
- Cedar Bay Print Works added later from Settings, making five sides
- the many-sides seed (port 9665) used for looking only

**Limits:**
- the retrying state couldn't be seen apart from expired
- Notices and Lists per side weren't opened
- Move and Cancel on the app's own entries weren't tried
- the fake's mail is fixed, so mail arriving later couldn't be tested

## Row verdicts

| ID | Verdict | What was seen | Screenshot |
|---|---|---|---|
| X05 | ✓ Pass | A duplicate inbox is refused: "Your inbox already reads this. Change that one, or choose another folder." But with three inboxes it doesn't say which | x05-dup-1, choose2 |
| X40 | ◐ Partly | Two emails and two sides can be added. But "Last contact: Nothing yet" although two mails from those addresses had been read. The email wraps mid-address. "Who they are" is cut. The sides repeat on the page | x40-after-add, x40-person-1440-light |
| X45 (several calendars) | ✗ Fail | No calendar names, colours or legend. The same invitation shows twice. Clash lines don't name the calendars. Read-only wording is plain: "This is what your calendar says… Change it in your calendar app." | sched-tall-1440-light, ev-q1, ev-q2 |
| X57 | ◐ Partly | The phone's Connections page is clean. The badge says "Signed in", with the address as plain text: no "Signed in as …" beside Sign out | ph-settings_connections-light |
| X18 (4 and 5 sides) | ◐ Partly | The filter works on Today, Schedule, What changed and Follow-ups, at 1440 and 1024. It fails at 390 with long names, and it leaks on Today (P1-7, P1-8) | t5-today-1440-light, schedfilt-*, tf-filter-* |
| VP11 (long names) | ◐ Partly | Settings › Business, Projects, the More sheet and setup wrap well. The sidebar clips names hard, chips clip at both edges at 390, and an email breaks mid-address | m-today-390-light, t5-today-390-light |

## New findings

### P1
1. **A failing account makes every account look broken.**
   - The header says "Connection failed". Its popover is one red paragraph of nine identical "couldn't be read since 10:51 PM" lines, with no addresses.
   - Connections marks all nine rows "Failed" across all three addresses, though only one fails. The sentence starts in lower case.
   - Today's Schedule card repeats the sentence three times.
   - There's no "Sign in again" button. "since" gives the last good read, not when the trouble began.

   (fail-expired-header-click, fail-expired-connections, fail-retrying-connections) **Confirmed on screen; the cause isn't proven.**
2. **After recovery, and after signing out and in, all rows stay "Failed 2 times in a row".** A signed-out account's rows stay listed (so-readded, so-after).
3. **On a phone, long side names clip at both edges** ("rborview Community Support Partnership Incorpora"), and the clash titles are cut so the two meetings can't be read (t5-today-390-*, m-today-390-light, m-schedule-390-dark).
4. **The Schedule can't tell calendars apart:** no colours, legend, or show and hide per calendar. Every entry pane says "Calendar: Your calendar" (sched-tall, ev-q1, ev-allday).
5. **The same invitation shows twice:** "Quarterly review" twice in Week and in Month, with one pane saying the Brindle side and the other Personal, and it's filed twice in What changed (ev-q1, ev-q2, view2-Month). **Confirmed.**
6. **Clash lines don't name the calendars.** The rail says "Your calendar" for entries from different accounts (today-after-start, s15-done).
7. **A business filter still shows personal clashes on Today,** while the Schedule filtered the same way shows none (tf-filter-Harborview, schedfilt-Harborview).
8. **"Came in 12 messages" ignores the side filter** (tf-filter-*).
9. **A thread copied to two mailboxes shows twice** in Came in and in What changed (today-after-start, b-work_changed).
10. **Mail from a mailbox serving two businesses is filed under Personal.** "Order for the first/second business" sits under "Filed a note in Personal". The business pages show 0 (filed-Orderbusiness, side-Personal, side-Harborview).
11. **Every row says "Your inbox", "Your calendar" or "Your sent mail"** for all three accounts. Three identical "Look over what was found in Your sent mail: 1 item" lines (today-after-start).
12. **There's nowhere to change which sides a mailbox serves after setup.** The row's Change form has no "who is this for". Adding Cedar prompts nothing (rowchange, rowchange-more, addbiz-done).
13. **Setup's "Reginald is reading:"** is one bold run-on of nine items (c4-same-twice, setup390-mail-light).

### P2
14. The Promises step repeats its paragraph.
15. What changed's counts (7) don't match about 25 rows. Three "Not yet checked".
16. A second sign-in with the same account is silent. "Who are they for?" shows for a single account. "Where things stand" lists no accounts or sides. Setup has no way to remove an account.
17. Today's lines show no side label. A follow-up draft names neither the address nor the mailbox, with no way to choose.
18. The Week view crushes entries when the pane is open ("Supplie r call"), one entry covers another, and three identical all-day "Due:" entries.
19. The Add form doesn't say which calendar an entry goes to. The read-only entry page has a gap, and "your calendar app" names no app.
20. Handled for you isn't grouped by account.
21. Projects shows seven empty columns.
22. People: "Harborview Co…" is cut, there are no side tabs on a phone, your own "How to reach" is empty, and the targets are under 24px.
23. A person's page repeats the sides under "Who they are" and "Sides".
24. Side pages: a to-do listed twice, and in two sides. "Read by 127.0.0.1:9655". "Pick an owner: … by 2026-11-04."
25. Connections' row buttons all read "More actions for Your inbox" ×3.
26. Settings › Business: "End them with it". "25 people and items" against 9 items on the page. "You" twice in the menu, and no gap before "Assistant".
27. Hand in always asks "Where does it belong?" with ten flat options, even when opened from a side's page. Ask doesn't say it's limited to the filtered side.
28. At 1024 the icon sidebar shows five identical grid icons, with names on hover only. At 1440 names clip with no ellipsis.
29. The More sheet's icon is squeezed at 390. The Timeline has "Personal" over a row named "Personal".

**Counts:** P0 0 · P1 13 · P2 16.

**Working well:**
- Setup asks "Who is mail and calendar at <address> for?" for each address, and remembers the ticks.
- Sign out names the address.
- Removing a business explains what happens.
- The privacy badges name the sides.
- The side filter works on the Schedule, What changed and Follow-ups at 1440.

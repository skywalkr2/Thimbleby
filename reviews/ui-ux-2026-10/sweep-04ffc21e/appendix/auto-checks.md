# Automatic checks on every screen the sweeps opened

The sweep script ran these checks on every screen it saved: internal ids, raw JSON, raw ISO dates, undefined/null, code words, stuck Loading, unfilled {placeholders}, error text, sideways scroll, targets under 24px, cut-off text, unnamed buttons and browser console errors.

Each hit is listed once per screen. Some hits are on purpose (a test typed nonsense, or text was cut short by design in a narrow column), so read each one before acting on it. The hits that are real are already in the master list.

| Check | Screens hit |
|---|---|
| text cut off | 54 |
| wording key or code name on screen | 29 |
| raw ISO date on screen | 23 |
| error text | 11 |
| unfilled {placeholder} | 4 |
| raw JSON on screen | 4 |
| internal id on screen | 3 |
| scrolls sideways | 1 |

## text cut off

- `setup/r1-28-mail-connected-phone`: text cut off: No time between them; you need about 30 to get fro
- `daily/e-d-records_projects`: text cut off: Last updated / Open to-dos / Open questions
- `daily/e-p-records_projects`: text cut off: Project / Status / Stage / Target / Last updated / Group
- `daily/e-p-records_people`: text cut off: Name / Who they are / How to reach / Open items / Last contact
- `daily/a-read-answer`: text cut off: Ready to send / 1 item awaiting a reply · sent today
- `daily/se-ladder`: text cut off: Email from Priya Hart · Mum's 70th plan / Your note · Notes from the school run / Ready to send
- `daily/se-priya`: text cut off: my son's teacher
- `business/v1-today-phone`: text cut off: No time between them; you need about 30 to get fro / The assistant couldn't tell, so these wait under P
- `business/v3-records_people-day`: text cut off: manager at Northwind Clinic / customer at Calloway Upholstery / email: maya.okafor@example.com / supplier at Calloway Upholstery / email: theo.brandt@example.com
- `business/v3-records_people-phone`: text cut off: Name / Who they are / How to reach / Open items / Last contact / Organization
- `business/p12-project-added`: text cut off: Robin Calloway
- `business/p13-proj-menu-open`: text cut off: Last updated / Open to-dos / Open questions / Fri, Nov 20 / Repeat customers / Robin Calloway
- `business/pp-Maya`: text cut off: customer at Calloway Upholstery / supplier at Calloway Upholstery
- `business/sc02-view-Month`: text cut off: Venue walk-through / Budget check-in / Due: Send the venue list by 2026-11-02. / Due: Send the headcount by 2026-11-04. / Due: Send the revised budget by 2026-11-05.
- `business/r04-search`: text cut off: No time between them; you need about 30 to get fro / Look over 1 draft Reginald wrote · Your note

## wording key or code name on screen

- `setup/r1-08-ai-anthropic`: wording key or code name on screen: "e bills sent to. ⏎ Open the sign-up page ⏎ (console.anthropic.com, opens in a new tab) ⏎ 2 ⏎ Add credit ⏎ The "
- `setup/r1-09-ai-openai`: wording key or code name on screen: "e bills sent to. ⏎ Open the sign-up page ⏎ (platform.openai.com, opens in a new tab) ⏎ 2 ⏎ Add credit ⏎ The se"
- `setup/r1-11-ai-another-google`: wording key or code name on screen: "you close the page. ⏎ Open the keys page ⏎ (aistudio.google.com, opens in a new tab) ⏎ 4 ⏎ Paste it here ⏎ We "
- `setup/r1-22-mail-apppw-Gmail`: wording key or code name on screen: " ⏎ Open the Gmail page for app passwords (myaccount.google.com) ⏎  ⏎ Your address ⏎  ⏎ Your full Gmail address"
- `setup/r1-22-mail-apppw-YahooMail`: wording key or code name on screen: " the Yahoo Mail page for app passwords (login.yahoo.com) ⏎  ⏎ Your address ⏎  ⏎ Your full Yahoo address. ⏎  ⏎ Ap"
- `setup/r1-22-mail-apppw-iCloudMail`: wording key or code name on screen: "the iCloud Mail page for app passwords (account.apple.com) ⏎  ⏎ Your address ⏎  ⏎ Your full iCloud address. ⏎ "
- `setup/r1-22-mail-apppw-Fastmail`: wording key or code name on screen: "en the Fastmail page for app passwords (app.fastmail.com) ⏎  ⏎ Your address ⏎  ⏎ Your full Fastmail address."
- `daily/td-where-from`: wording key or code name on screen: "Oct 28, 2:35 PM ⏎ Filed ⏎ Email from orders@shop.example.com · Your order has shipped ⏎ Filed 1 note · Wed"
- `daily/f-add`: wording key or code name on screen: "cuments, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.openxmlf"
- `daily/hd-group`: wording key or code name on screen: "ted today ⏎ Neighborhood Network <updates@network.example.com> · Wed, Oct 28, 11:22 AM · Your inbox ⏎ Se"
- `daily/hd-bring`: wording key or code name on screen: "verything half price ⏎ Spring Shop <deals@shop.example.com> · Wed, Oct 28, 10:22 AM · Your inbox ⏎ Set a"
- `settings/ai-add-openai`: wording key or code name on screen: "LI. ⏎ More options ⏎ Get an access key ⏎ Open platform.openai.com and create an access key ⏎ Paste it here ⏎ A"

## raw ISO date on screen

- `daily/s2-d-work_changed`: raw ISO date on screen: "- Sam Okoro will lend us the trailer on 2026-11-07 ⏎ - I will pick up the dry cleaning by 2026-10-30 ⏎ -"
- `daily/r1-d-records_project_PRJ-1`: raw ISO date on screen: "e water bill": due was Fri, Oct 30, now 2026-11-02. (none) ⏎ Oct 28 Reginald noted Invitation: Parent-"
- `daily/r-todo`: raw ISO date on screen: "Back ⏎ Action ⏎ Pick up the dry cleaning by 2026-10-30. ⏎ The words ⏎ I will pick up the dry cleaning by 202"
- `daily/sc-after-add`: raw ISO date on screen: " notes ⏎ Due: Pick up the dry cleaning by 2026-10-30. ⏎ , A to-do due this day ⏎ 8:00 AM ⏎ 9:00 AM ⏎ 10:00 AM ⏎ "
- `daily/talk-sent`: raw ISO date on screen: " “Sam Okoro will lend us the trailer on 2026-11-07” ⏎  ⏎ Buy a birthday card for Mum ⏎  ⏎ “Buy a birthday ca"
- `daily/m5-pick`: raw ISO date on screen: " Avery Lane will send the venue list by 2026-11-02. Show source ⏎ Who is “Avery Lane”? ⏎ Choose a person"
- `daily/f-n-work_since`: raw ISO date on screen: "andt said “To do: send the headcount by 2026-11-04.” ⏎  ⏎ Wed, Oct 28, 3:04 PM ⏎  ⏎ Open ⏎ Added “Get a cateri"
- `business/t07-picked-robin`: raw ISO date on screen: "ry Lane will send the revised budget by 2026-11-05. Show source ⏎ Who is “Avery Lane”? ⏎ Choose a person"
- `business/t17-draft-message`: raw ISO date on screen: "is for: Dana Whitfield The week ends on 2026-10-30."}]} ⏎  ⏎ Copy message ⏎  ⏎ Nothing is due this week that"
- `business/t34-changed-lookover`: raw ISO date on screen: "ry Lane will send the revised budget by 2026-11-05.” ⏎  ⏎ Wed, Oct 28, 2:31 PM ⏎  ⏎ Open ⏎ Added “Bring the fl"
- `business/w02-venue-detail`: raw ISO date on screen: " Avery Lane will send the venue list by 2026-11-02. Show source ⏎  ⏎ Robin Calloway ⏎ · ⏎ due Mon, Nov 2 ⏎ · ⏎ p"
- `business/sc02-view-Month`: raw ISO date on screen: " 2: 1 entry ⏎ Due: Send the venue list by 2026-11-02. ⏎ , A to-do due this day ⏎ 3 ⏎ Open Tue, Nov 3: nothin"
- `business/sc08-own-entry-page`: raw ISO date on screen: "dence ⏎ Quote: Fabric delivery from Owen, 2026-10-29 10:00 ⏎ Source: note ⏎ Start ⏎ Thu, Oct 29, 10:00 AM ⏎ Tr"

## error text

- `setup/r1-08-ai-anthropic-wrongkey`: error text: "anced ⏎ Back ⏎ I'll do this later ⏎ Continue ⏎  ⏎ That didn't work yet. See above, then try again."
- `daily/p-d-add-duplicate-after`: error text: "am Okoro. ⏎ Undo ⏎ Added Rosa Delgado. ⏎ Undo ⏎ That didn't work. Priya Hart already exists. ⏎ Try again ⏎ Add a"
- `daily/td-d-list`: error text: "end the guest list for Mum's party ⏎ Undo ⏎ That didn't work. ⏎ Try again ⏎ Add a to-do ⏎ What to do ⏎ Due (opti"
- `daily/td-d-long-fail`: error text: "Where it came from ⏎  ⏎ Mark done ⏎  ⏎ 5 shown ⏎  ⏎ That didn't work. ⏎ Try again ⏎ Add a to-do ⏎ What to do ⏎ Due (opti"
- `business/p19-remove-group-confirm`: error text: "stomer jobs ⏎ 				today					 ⏎  ⏎ 5 projects ⏎  ⏎ That didn't work. Still used by 3 record(s) (project), so it"
- `business/p20-remove-workshop-confirm`: error text: "stomer jobs ⏎ 				today					 ⏎  ⏎ 4 projects ⏎  ⏎ That didn't work. Still used by 3 record(s) (project), so it"

## unfilled {placeholder}

- `setup/r1-13-ai-local-cli`: unfilled {placeholder}: "e app is started, with its options. Use {model} for the model name. ⏎  ⏎ How to send the request ⏎ Directl"
- `business/f07-message-style`: unfilled {placeholder}: "e first line of a copied message. Write {first_name} where the person's first name goes. ⏎  ⏎ How your m"

## raw JSON on screen

- `daily/r1-d-records_project_PRJ-1`: raw JSON on screen: "d (empty input) ⏎ Oct 28 Reginald noted [ "kind": "action", "id": "ACT-6", "gone": true, "where": "tak"
- `daily/r-fact-source`: raw JSON on screen: " a note in Personal, not in a project ⏎ [ "kind": "action", "id": "ACT-6", "gone": true, "where": "tak"
- `business/t17-draft-message`: raw JSON on screen: "nt from here. ⏎  ⏎ Draft, not yet reviewed ⏎  ⏎ {"summary": "The stand-in found nothing it reads by rule, so"

## internal id on screen

- `daily/r1-d-records_project_PRJ-1`: internal id on screen: "ginald noted [ "kind": "action", "id": "ACT-6", "gone": true, "where": "taken back when the work was"
- `daily/r-fact-source`: internal id on screen: "in a project ⏎ [ "kind": "action", "id": "ACT-6", "gone": true, "where": "taken back when the work was"

## scrolls sideways

- `settings/you-long-assistant`: scrolls sideways 1796>1440

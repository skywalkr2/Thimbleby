# Owner reports: the old product name, and two setup steps

**Seen by the owner** on their own install, during setup, before the Monday hand-over. These notes are from two screenshots they sent. They hold no personal data: the screenshots showed the owner's own addresses and mail, which stay out of the repository.

The ids carry on after the master list (X65) so they can go straight into the tracking copy.

## X66 (P1): the old name is still on screen, and setup writes it into the person's own folders

**The owner's words:** "this still says pm cockpit".

| Where a person sees it | Source on the host branch | Why it matters now |
|---|---|---|
| **Setup › Backups:** "iCloud Drive · Backups › PM Cockpit", and the same for OneDrive. **The folder is created in the person's cloud drive** | `engine/config/schema.py`, the default for `backups.cloud_path` | **It persists.** Backups made today stay in a folder with the old name after the rename. That means either a folder the person must find, or a migration |
| The workspace folder in the home folder, "Cockpit" | `engine/cli.py`, `DEFAULT_FOLDER` | It persists the same way, and it is visible in the file browser |
| The browser tab and window title, "Cockpit" | `web/index.html` | Seen on every screen |
| Add-ons: "PM Cockpit's add-on list", and the feedback email's subject | `app.name` in `web/src/wording/en.json` | Seen by the person, and by whoever reads the feedback |
| Entries the app writes to a calendar (`PRODID`), and the author of export and settings history | `engine/ics_write.py`, `engine/itip.py`, `engine/settings.py`, `engine/storage/export.py` | Seen only by someone who looks closely. Low priority |
| The command-line name and help text | `engine/cli.py` | Seen only by terminal users. It belongs to phase I and C, as already decided |

**Proposal:**
- **Bring the visible part of the rename forward from phase I.** That is everything above except the command line and the internal names. The owner is using the app daily now, and every backup made today is written into a folder with the old name.
- **Take the name from the product's one place**, in line with the phase I decision. For example, a `name` in `catalog/product.yaml` that feeds `app.name`, the page title, and the default for `backups.cloud_path`. Core code stays free of the name.
- **Migration:** a backup folder or workspace folder that already exists under the old name keeps working. The app finds it, says what it's called, and offers once to rename it. It never moves the person's files without asking.
- **Done when:** no screen, title, created folder or message shows the old name (the reviewer's automatic checks now look for it on every screen), and an existing old-name backup folder is still found after the update.

## X67 (P1): "We copy it…" goes against the privacy promise

- **What it says:** setup › Backups reads "If this computer is lost or breaks, your work is still there. **We** copy it every day to a folder your cloud drive keeps." (`walkthrough.why.backup`).
- **Why it's a problem:** the website's third promise is "Nothing goes to us." A beginner reads "we copy it" as "the company takes a copy".
- **Fix:** say who does the copying, and where the copy goes. For example: "If this computer is lost or breaks, your work is still safe. Each day the app copies it to a folder in your own cloud drive. Nothing comes to us." Use the assistant's or the product's name, whichever the wording rules prefer.

## X68 (P2): "Step 6 of 7" beside a rail of eight

- **What it shows:** the step rail lists eight entries, the last being "Where things stand", while the header counts seven.
- **Fix:** count what the rail shows, or show the last entry as an ending rather than a step: no circle, a different style, and no number.

## X69 (P1): the "Your promises" step, as the owner saw it (with the move to Today already announced)

The host is moving these findings to Today. These points apply wherever they land:
1. **The title is the whole sentence from the email:** the case number and the full postal address, two lines in bold. **Fix:** a short title for the action ("Mail the claim forms"), with the details on the item's own page or in its meta line.
2. **"From:" quotes a fragment cut off mid-sentence,** ending in "…documents to". **Fix:** name the email (who sent it, its subject, and when), with a link to open it. Never quote a cut-off fragment.
3. **"What was read" takes six lines for two accounts,** repeating "Your mail at … : Your inbox". "Your calendar, read" reads as broken English, and "Everything listed was read." adds nothing. **Fix:** one row per account, for example "*address*: inbox and sent mail since Fri, Oct 16 · calendar", with a single status for the whole list.
4. **There's no action on the promise:** keep it, it's done, or it's not mine. Today will have to provide one.
5. **Visual:** plain bullets and a bold paragraph. The row pattern (VC01) and the brand (VP16) apply here too.

## X70 (P1): six more lines speak as "we", found by scanning all the wording

The reviewer scanned every string in `web/src/wording/en.json` after X67. These also speak as a company, against "Nothing goes to us". The worst one says the company read the person's mail:

| Key | Text |
|---|---|
| `walkthrough.people.suggest.all_added` | "You've added everyone **we found in your mail**." |
| `welcome.ai.step.paste_hint` | "**We** check it straight away. It stays on this computer only." |
| `welcome.ai.allow.unknown` | "**We** can't tell which account it is signed in to…" |
| `welcome.ai.why.not_checked` | "**We** check it when you press Enter…" |
| `welcome.ai.address_hint_guide` | "…**We** check it as soon as you move on from the box." |
| `welcome.backup.none_found` | "**We** didn't find a cloud drive folder on this computer…" |

- **Fix:** the app or the assistant is the subject ("Reginald found…", "The app checks it…"), or the sentence needs no subject ("Checked as soon as you leave the box").
- **Not a finding:** "our neighbor", "our landlord" and the like are the person's own voice, as relation choices.
- **A guard:** the wording check in the self-check fails on "we", "us" and "our" in app wording, except for an allowlist of the person's own phrases.
- The same scan found `walkthrough.coverage.read` ("{place}: {name}, read"): that's the "Your calendar, read" in X69.

## Why the reviewer missed these, and what changes

| Item | Visible in the 04ffc21e sweep? | Why it was missed | What changes |
|---|---|---|---|
| X66 the old name | **Yes, partly:** two sweep reports quoted the subject "Feedback on PM Cockpit" without flagging it | The briefs never gave the product's decided name, so the agents didn't know it was wrong | The briefs give the product name, the assistant's name and the website's promises. `lib.mjs` flags "Cockpit" on every screen and in the window title |
| X66 the backup folder | **No:** the test machine has no cloud drive, so setup showed "We didn't find a cloud drive folder" and the cards never appeared | The test machine differs from a real Mac or PC | The sweep runs setup twice: once with no cloud drive, and once with a home folder that holds iCloud Drive, OneDrive, Dropbox and Google Drive folders |
| X67, X70 "we" | **Yes:** in three captures | Nothing checked the wording against the product's promises | A wording scan of every string in `en.json` (company voice, the old name, broken fragments), as well as the screens, because a scan reaches lines no walk opens |
| X68 step count | **No:** the eighth entry came after 04ffc21e | New since the sweep | The re-sweep checks every count against what's listed beside it |
| X69 promises | **Partly:** "What was read" and "Your calendar, read" were captured with one account and not flagged; the long title and the cut-off quote never appeared | The fake mail is short and tidy. Real mail and a real model give long sentences, case numbers, addresses and cut-off quotes | **Worst-case content:** the sweep scripts the AI stand-in's answers to give long titles, numbers, postal addresses, quotes cut mid-sentence and non-English text, and judges every screen that shows them. Plus S5's several accounts |
| All of them | | Screens were judged as the fake environment drew them, not as a real person's install would | **Owner-path parity:** before a sweep, list what a real install has that the test machine lacks (cloud drives, several accounts, messy mail, an existing old-name folder), and make each one present, or name it as a gap in the report |

# Check of the second-pass fixes, at `82d24cc7`

**What was checked:**
- branch `claude/tender-tesla-16a8ob` at `82d24cc7` (with `f18885d0`, the owner's list), against my second pass
  (`../review-f973493/`)
- **how:** both personas again, on two fresh installs (`cockpit init` with no template, then `serve`, with the journey
  fakes). Both mailboxes have a sent folder.
  - **A:** your own life only.
  - **B:** your own life and a business, with three jobs, a group, and one mailbox for both sides.
- the demo, in day and night mode
- the phone width (390px)

## 1. Verdict

**The four P0s are fixed, and the designer's exit test passes:**
- Both personas finish setup alone (getting an AI account aside).
- No action on Today raised its count:
  - "All looks good" took it from 5 to 4, and Undo brought it back.
  - "Move" took it from 7 to 6.
  - Neither one left `#today`.

**I agree phase U can close here.** What's left is small (section 3) and can go to the backlog as normal work.

## 2. Findings

| Finding | Status | Seen |
|---|---|---|
| **G1** raw-data message | **Fixed** | "Your inbox is for Personal and Hale Upholstery.", inline under the boxes (`shots/03`). See H7 for one rough edge |
| **G2** review on Today | **Fixed** | Look over opens the batch in place, with "Not right" on each item and All looks good. The URL stays, the count goes down, and there's Undo (`shots/04`). One leftover: H1 |
| **G3** business filing | **Fixed** | One line: "These 6 items look like Hale Upholstery's. Move them there?". It opens the 6 items with "These 6 items will be visible with Hale Upholstery's work.", Move and Keep under Personal. Projects has no Unfiled block (`shots/05`, `06`) |
| **G4** sent mail | **Fixed** | "Now reading: Your inbox, Your calendar, Your sent mail", with no folder to choose. The promise only the sent mail holds was found ("you said … will send the revised budget") |
| G5 AI permission | Fixed | "Reginald's AI service may read your mail, notes and calendar, including private ones…", with "Not my private mail" next to it |
| G6 service name | Fixed in the code | The line uses the service's own name. My walk passed it too fast to see it on screen |
| G7 setup group | Fixed | "in Trade customers" tick box on each job. Saved, with the jobs inside it (`shots/02`) |
| G8 ticks | Fixed | Each tick appears only once its step is done. Done has no false ticks and no add-ons line |
| G9 brief | Fixed | "On Today: 1 thing needs you · Show; 1 clash today · Show", plus "Show this week's briefing" |
| G10 titles | Mostly | Notes are "Revised offsite budget · from Avery Lane", and dates read "by Thu, Nov 5" on the filing list. Leftovers: H4 |
| G11 phone | Fixed | Titles get the full width, 324px at 390 (`shots/08`) |
| G12 night | Fixed | Tonal row actions; only the selected line's button is filled (`shots/07`) |
| G13 People | Fixed | One "Who they are" column ("supplier at Hale Upholstery"); suggestions offer Personal or the business |
| G14 Outside marker | Fixed | Gone from the lists; one sentence in the open review |
| G15–G23 | Fixed | One leftover from G16: H3 |

## 3. What's left (backlog, nothing blocking)

- **H1. A third place to look things over.**
  - Today's "Look over what changed since yesterday · 6 new, 2 set aside" sits under At risk.
  - It opens a separate "Since yesterday" page, which lists the same to-dos the Review lines already hold, with raw dates
    ("Send the revised budget by 2026-11-05.") (`shots/09`).
  - Fix: drop the line when Review lines cover the same items, or fold it into them.
- **H2. Today's subline says "Not looked at before Tue, Oct 13" twice**, once for each mailbox. Say it once.
- **H3. A stale hint on "What it's for"** (`walkthrough.why.work`): it still says "Choose Just my own life", an option
  that no longer exists. Make it "Leave both empty to keep it to your own life."
- **H4. Leftover raw text:**
  - The open review's items read "Send the venue list by 2026-11-02." (`shots/04`).
  - One fact reads "The notes list that the offsite is on a Friday." The designer's F44 asks for "Maya says the offsite
    is on a Friday · Oct 27" when it's someone's word.
- **H5. A stray "·"** ends the meta lines on the Personal page ("Avery Lane · due Mon, Nov 2 ·").
- **H6. The filing line contradicts itself:** "These 6 items look like Hale Upholstery's" next to "The assistant
  couldn't tell". Say "These 6 items might be Hale Upholstery's."
- **H7. A lost tick right after sign-in.**
  - Once, just after the sign-in restart, a quick second tick on another mailbox was lost and "That didn't work."
    appeared. The calendar's boxes were greyed out while the first save ran (`shots/03`).
  - I couldn't reproduce it later, with gaps of 100 to 700ms.
  - Fix: queue the click rather than drop it. If a save does fail, say which box and offer "Try again".
- **H8. The last message can contradict the boxes.** Unticking both sides quickly left the last message reading "Your
  sent mail is for Hale Upholstery." with nothing ticked. The last message should match the final state ("Your sent mail
  isn't marked for either").

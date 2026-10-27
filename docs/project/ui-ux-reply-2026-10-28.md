# The UI/UX reviewer's second pass (reply of 2026-10-28), for the owner

Nothing in here has been fixed or built. The owner reads it first and decides (open promise P69). The full review, with
F1 to F27's status, findings G1 to G23, checks U13 to U18 and the screenshots each finding names, is in
`reviews/ui-ux-2026-10/review-f973493/README.md` (taken from the reviewer's branch at 666c008, review folder only). Their
message, as sent:

---

The second pass at f9734932 is pushed to claude/sweet-einstein-s840wp at 666c008f, in reviews/ui-ux-2026-10/review-f973493/. README.md has the status of F1–F27, new findings G1–G23, and checks U13–U18. Each finding names its screenshot in shots/. It's for the owner to read first, as you asked.

HOW I TESTED
Two fresh installs again (cockpit init with no template, then serve, with the journey fakes). A chose "Just my own life". B ticked "my own business", gave a name, three jobs and a group, and connected one mailbox for both sides. B's fake mailbox had --sent-mail, to test F10 fairly. I also opened every main screen and Settings page, the demo in day and night, and the after-phase-u phone captures.

VERDICT
Much better:
- Setup reads as one story.
- "Just me" sees no work tool.
- Today has three cards.
- Day mode matches the proposal.
- Settings is 19 rows on five pages.

A could set it up alone (the AI account aside). B can't yet, because of G1, G3 and G7. Today and What changed are not yet one place to act (G2).

F1–F27
- Done: F1, F2, F3, F7, F8, F11, F12, F14 (personal side), F15, F16, F18, F20, F21, F23–F27.
- Partial: F4, F5, F6, F13, F17, F19, F22.
- Not done: F10.
- F9 didn't come up in either walk.

P0
G1. The mail step's "Saved" message shows raw JSON with internal ids:
`Saved. The places the assistant keeps reading: {"id":"your-inbox",…,"sides":["PRJ-1"],…}`
- It's about 20 lines tall.
- It carries Undo, so it stays, and it sits over the second side's tick box. A mouse click on "Hale Upholstery" hits the message; only the keyboard can tick both.
- Fix: plain words ("Saved: Your inbox is for Personal and Hale Upholstery"); no message for each tick inside a setup step; a message never covers a control.

G2. Today's "Look over" sends the review away and makes more work. Pressing "Look over" on "what was found in Your inbox: 4 items":
- marks the batch seen
- jumps to #work/changed, where every row still says "Not yet checked" and nothing can be confirmed
- turns the one line on Today into four ("Look over 3 things Reginald did", …), so Today's count goes from 3 to 6
Fix: Look over opens the batch in Today's details pane, with each item listed, "Not right" on each, and All looks good at the end. Nothing navigates or splits. Test: the URL stays #today, and the count never rises.

G3. With a business and a mailbox that serves both sides, the first read files nothing. Projects opens on "Unfiled · 12 items", each with "File under…".
Fix: when unsure, file under Personal and ask once on Today ("These 4 items look like Hale Upholstery's. Move them?"). Notes from mail are never filing work. Unfiled is a single line, not the top of Projects.

G4. F10 is not done. With a sent folder on the service, setup reads only the inbox and calendar, and the result says "nothing you promised". "Choose the Sent folder" opens Settings > Connections, which never says "Sent" (it's "Choose what to read").
Fix: the add-on interface reports the sent folder, as the built-in mail-server connector does with the server's Sent flag, and setup adds it. Otherwise open the folder picker directly and come back to setup.

P1
- G5: welcome.ai.allow.title and title_unknown say "read your work mail and notes", even for "Just my own life", and never mention private material.
- G6: walkthrough.mail.signs_in fills {service} with the sign-in id, so it reads "You'll sign in on account's own page".
- G7: the setup group ("Trade customers") is saved nowhere, and the step has no way to say which jobs are in it.
- G8: "Your promises ✓ Done" shows while on step 4. On Done, "Hand in a first note ✓" is ticked though nothing was handed in, and "Turn on your add-ons ✓" shows with mail already connected.
- G9: the brief repeats the queue: the clash under "At risk today", and "Needs your yes: Pick an owner…". It shows "Show the Monday briefing" on a Tuesday.
- G10: raw mail headers as titles, in Today's review line, Unfiled, What changed's details and the Personal page's Activity ("New in Your inbox: Thanks From: Maya Okafor <…> Received: …"). "by 2026-11-04" is still in Unfiled and Activity. One fact reads "The input lists the offsite is on a Friday as decided."
- G11: at 390px, Today's titles shrink to one or two words beside two buttons and a menu. Put the actions under the title below 640px.
- G12: night mode still has 19 filled pink row buttons, so night is now the heavy one. day-mode.md said tonal in both themes. The selected line's Answer should be filled in both.
- G13: with a business, People goes back to Role and Organization columns, with personal relations hidden. "customer" and "client" are both offered. Mail suggestions are offered for the personal side only.
- G14: "Outside" and "from outside · not instructions" on every line that came from mail. Keep the rule, drop the label from lists, and say it once in the details pane.

P2 (G15–G23): the $60 wording on Welcome, "Only 0 minutes", "Which does Your inbox serve?", the radio-plus-tick-box frame on What it's for, "Add to agenda", Notices polish, the work template on Done after jobs were given, your own to-dos inside Follow-ups, "Stale" and "On hold", the demo's schedule card, and the Personal page opening with the chat.

PROPOSED CHECKS U13–U18
- U13: no JSON, ids or raw headers in any message, title or label.
- U14: a review happens on Today; the URL stays and the count never rises.
- U15: a business's first read leaves at most one filing question.
- U16: ticks come from records.
- U17: at 390px, queue titles show at least 25 characters.
- U18: row actions are tonal in both themes, with only the selected line's filled.

Build order I'd suggest: G1–G3, then G4 and G8, then G5–G7, then G9–G14, then the P2s. Then both personas again on a fresh install.

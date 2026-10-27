# The 50-message sample for the gate week: the independent reading

Row 3 of the pass bar (`gate-pass-bar-draft-2026-10-28.md`) counts the promises the app missed out of the promises
present, from the person's own daily counts plus an independent reading of a consented sample of 50 messages. The app
draws the sample; the person reads it on their own and counts. The app never works the counts out.

## Before the counted week

1. **Consent.** Settings, the quality setting `dispatch.knowledge.sample_consent`, is off until the person turns it on. While
   it is off, nothing is drawn. The sample stays on this computer: it holds message ids, never their text.
2. **Size.** `dispatch.knowledge.sample_size` is 50 messages. A window with fewer messages gives all of them.
3. **The window** is the quality window (`dispatch.knowledge.quality_window_days`, 28 days) ending today. Only mail
   messages (saved inputs with a sent time) received inside it can be drawn.

## Drawing it (once)

At the end of the counted week, on the Quality screen, under "Messages you read yourself", choose **Draw the sample**
(`POST /api/quality/sample`).

- The messages are chosen by chance and by nothing else: each message's rank is a hash of a random seed and its id, and the
  first 50 are the sample. The seed is kept on the sample's record, so the same seed over the same messages gives the same
  sample, which makes the draw checkable.
- One sample is drawn for a window. A second draw inside the window is refused, so nobody can draw again until the messages
  suit them.
- Draw it before looking at what the app caught for those messages, and don't look at Today's lines for them first.

## Reading it (the person, alone)

For each message listed (subject and the day it arrived), open it in your own mail and, without looking at the app:

1. Count the promises it holds, both ways: ones you made and ones made to you that you would want on a list.
2. Then check the app. Count how many of those the app did not have (no action, no line, no note).
3. On the Quality screen, enter the two numbers for that message and Save. Saving again corrects it; Undo takes it back.
   The app refuses more missed than found.

A message with no promises is entered as 0 and 0: it counts as read. A message not read yet has no numbers and is left out
of the figure.

## What the figure uses

"Missed out of present, all together" is the daily counts and the sample's read messages added: promises present are the sum
of what you counted on your own list each day and what you found in the sample; missed are the sum of the two "didn't have"
counts. The bar is at most 1 in 10. The sample alone is also shown, as messages read of messages drawn, with the present and
missed from them, so a week with few daily counts can still be judged.

## Counting the silent closes in the same reading

The designer asked that the same reading sample the silent closes (the item was found and then closed). While reading, note
any promise the app had and then closed or dropped without you seeing it; that is already counted by the app as a silent
close, and a close you can't find in "Closes you didn't see" is a lost promise, which is a failure of the week.

## If a number is wrong

A miss found by the reading becomes a replay case (starting state, your action, the expected end) in the workspace's
`replays/` folder. The counted week's other rules are in the pass bar.

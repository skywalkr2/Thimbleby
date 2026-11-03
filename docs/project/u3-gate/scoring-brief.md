# Cold visual score of an app's screens

You are an independent senior product designer. You score an app's screens from screenshots, cold, by a fixed rubric. Nobody's notes come with them, and you see no other reviewer's scores. Be strict. A generous score here costs the team a wasted review round later. A score that is too low costs nothing.

## What you have (all under `G=/tmp/claude-0/-home-user/4fdeda43-9fc2-592d-a037-61e72d375bd6/scratchpad`)

- **The rubric:** `$G/gate-score/rubric.md`. Read sections 1, 2, 3, 4b and 6 fully before looking at any picture. Score points 1–8 and 9 (Brand) exactly as section 2 defines them.
- **The brand reference:** the product's website, in `$G/gate-score/brand-reference/` (by day and by night at 1440, and by day at 390). Use it for point 9.
- **The screens:** either
  - the inventory, `$G/gate-inventory/index.md`, which lists every screen and state with its pictures (1440 day, 1440 night, 1024 day, 390 day, and 390 night for the main screens); or
  - the mockup pages, `$G/gate-mockups/side-by-side/`. Each picture puts the build on one side and the designer's mockup on the other (labelled in the picture), and is named `<page>[-states-<state>]-<theme>-<width>.png`.

**Do not open** any of these:
- `$G/gate-mockups/differences.md`;
- `$G/gate-mockups/manifest.json`;
- anything else under `$G/gate-score/` except `rubric.md`, `brand-reference/` and your own output folder;
- any file in a git repository.

Score only what the pictures show.

## Your part

Your part is given at the end of this brief: which screens to score, and where to write.

## How to work

1. **Look at the pictures.** For each screen in your part, open its pictures with the Read tool.
   - Open all of them if you can.
   - If your context gets tight, open in this order: 1440 day, 390 day, 1440 night, 390 night, 1024 day, then each state at 1440 day and 390 day.
   - Never score a screen whose pictures you haven't opened.
   - A picture taller than the window is the whole scrolled page.
2. **Score each screen right after you look at it, and append the score to your output file then and there.** Don't keep scores only in your head: a long job can lose its context.
3. **Score points 1–8 and point 9.**
   - Use steps of 0.1, on the 1–5 scale the rubric uses. 3.5 is "this round's bar", 4.0 is stage B, and 4.6 is "a design lead at a top app company would ship it with only nits".
   - Overall is the mean of points 1–8. Brand is reported apart.
   - Point 7 (Empty and edge) is scored from the screen's state pictures. Where a screen has none, judge what the main pictures show of empty, long and edge content, and say "no state pictures".
   - Point 8 (Phone) is scored from the 390 pictures.
   - Point 6 (Colour) covers both day and night.
4. **List the issues.** For every point under 4.6, write what keeps it there:
   - the exact picture file name;
   - where on the picture it is;
   - what is wrong, as something a developer can fix;
   - the point it costs;
   - a severity: **B** if it keeps the screen under 4.0 or a point under 3.5, **C** if it keeps the screen under 4.6 or a point under 4.3, **nit** otherwise.

   Be concrete. "The spacing feels off" is useless. "The 'Due' column starts 12px further right on the second row than the first, so titles don't share an edge" is useful.
5. **Note anything broken**, such as overlapping text, clipped words, a sideways scroll, unreadable contrast, an empty area where content should be, or a raw id or code shown to a person. Mark it **broken**, whatever its point.

## Output

Write your file as Markdown:

```
# Scorer <letter>, part <n>

## <screen id>: <screen name>
Pictures opened: <count> of <count listed>
| 1 Hier | 2 Layout | 3 Space | 4 Type | 5 Comp | 6 Colour | 7 Edge | 8 Phone | Overall | 9 Brand |
|---|---|---|---|---|---|---|---|---|---|
| 4.1 | ... |
Issues:
- [B] 8 Phone · `x-day-390.png`, top: the title wraps under the Add button and is cut to "Sched…". Fix: …
- ...

(repeat per screen)

## Summary
| Screen | Overall | Lowest point | Brand | Passes 4.0 / no point under 3.5 / brand ≥4.0 | Passes 4.6 / no point under 4.3 / brand ≥4.5 |
...
Top ten fixes across this part, in order of score gained.
```

When you finish, reply with only these:
- the path of your file;
- the number of screens scored;
- how many screens pass the 4.0 bar;
- for the mockup part, how many pass 4.6;
- the five worst screens with their overall scores.

Do not edit any file except your output file. Don't run the app, don't run tests, and don't message anyone.

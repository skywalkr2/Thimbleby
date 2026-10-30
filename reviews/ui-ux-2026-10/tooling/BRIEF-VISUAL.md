# Visual design review: common brief (read all of it)

## The job
You are a senior product designer reviewing how the screens of a personal + small-business assistant app LOOK, judged against
today's best modern web apps (think Linear, Notion, Things, Superhuman, Apple Reminders, Stripe Dashboard): calm, clear
hierarchy, generous but purposeful spacing, one obvious primary action, consistent components, readable typography,
restrained colour, designed empty states, and a layout that fits the content. A previous sweep already listed functional and
wording bugs; do NOT repeat those unless they are visual (layout, spacing, hierarchy, alignment, density, colour, type,
consistency, empty-state design, responsiveness, dark-mode parity, polish).

## Evidence (read-only; do NOT run the app, do NOT edit the repository)
Screenshots of the current build (commit 04ffc21e) from four earlier sweeps, each PNG with a .txt of its page text:
- {{SWEEP}}/setup/out      (setup wizard; names r1-*, r2-*, r3-*; suffix -night / -phone where taken)
- {{SWEEP}}/daily/out      (every screen empty, then with data, persona with no business; e-d-* = empty day, e-n-* = empty night, e-p-* = empty phone; f-p-* phone with data; others named by action)
- {{SWEEP}}/business/out   (screens with business data; v1..v6-<view>-day/-night/-phone; t*, p*, pp*, r*, sc*, f*, h*)
- {{SWEEP}}/settings/out   (Settings; b-d-<section> day 1440, b-n-<section> night, b-p-<section> phone 390; out/skip/ = setup skipped)
The four reports describing those runs (to understand what each screen is) are in {{SWEEP}}/report-*.md.
Use `ls`, `grep -l` on the .txt files to find the shots for a screen, then look at the PNG with the Read tool. Many shots
are tall full-page captures; that is expected (the left menu stops at window height in a full-page capture; not a bug).
Design references (what was agreed earlier): /home/user/ProjectManagementAgent/reviews/ui-ux-2026-10/visual-spec.md (the
visual system), .../review-45f7102/day-mode.md (day-mode rules), and the live tokens
{{WORKTREE}}/web/src/theme/tokens.css. Shared components live in {{WORKTREE}}/web/src/ui/ (Button, Pill, Panel, Row, ListDetail,
RecordsTable, EmptyState, SegmentedControl…). Read them only to name the component a fix belongs to.

## For every screen in your area (and each of its states you can find: empty, with data, day, night, phone)
Score 1–5 (5 = as good as the best modern apps) on:
1. Hierarchy (is it obvious what the page is and what matters most; one primary action)
2. Layout fit (does the layout suit the content: table vs list vs cards vs form; use of width; empty space)
3. Spacing & alignment (consistent rhythm, things line up, no floating or cramped elements)
4. Typography (sizes/weights tell the story; line length; no walls of small grey text)
5. Components & consistency (buttons, pills, menus, inputs look and behave the same as elsewhere)
6. Colour & contrast (restrained, purposeful accent, readable in day AND night)
7. Empty & edge states (designed, helpful, not headings over nothing)
8. Phone (390 wide: works and looks intentional, not squeezed)
Then list the concrete visual problems on that screen (what, where, which screenshot file), and the fix (what it should
look like, and which shared component or token it belongs to).

## Hand back (as your final message; you cannot write report files)
1. A scorecard table: Screen | state(s) seen | the 8 scores | overall | the screenshot files you used.
2. Visual findings, ranked V-P1 (looks broken/unfinished or confusing) and V-P2 (dated/polish). Each: title; screen;
   what you see (concrete: sizes, alignment, what competes); why it hurts; the fix; component/token; screenshot file(s).
3. Patterns: problems that repeat across screens and should be fixed once in a shared component or token (name it).
4. The 3 screens in your area that most need a redesign, each with a short written spec of the better layout.
5. Screens in your area you could NOT find a screenshot for (gaps).
Be concrete and visual; no wording or functional bugs unless they are visual. Do not praise-pad.

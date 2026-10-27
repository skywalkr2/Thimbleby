# The functional designer's answers to F39 to F46, and input from the day's work (2026-10-28)

Relayed by the owner; kept as given.

## The eight questions

**F39. Review on Today: yes, as proposed. Two additions.**

- Only what needs a look goes into the review. In our run, 70% of what the assistant wrote was facts, sources and notes
  that nobody needed to check, so they were filed quietly. Only page drafts, questions, decisions and new to-dos came to
  the person. If every batch is a review, the person ends up reviewing the 70% too, and "All looks good" turns into a
  reflex. A batch with nothing to check goes straight to What changed as "Filed", with no Today line.
- The count never goes up because of something the person did. Add that as a rule, not just the G2 test: no action on
  Today may add lines to Today. If a correction needs a follow-up, it goes into the same line or the details pane.
- "All looks good" gets an Undo toast, like every other change. A batch left unopened for several days doesn't pile up:
  older batches fold into one line, "3 batches to look over", oldest first.

**F40. Filing when unsure: yes, under Personal, asked once. Three conditions.**

- Moving makes items visible to the business side, so the Move confirmation says so: "These 4 items will be visible with
  Hale Upholstery's work." Going to a less private level always needs the person's own click, never a rule's.
- Propose the filing rule only after the person repeats the move. One move is about those 4 items. The same sender moved
  a second time, by the person, is a pattern. In our run, rules learned from a single correction were too broad (F31
  found the same). The proposal states its reach: "mail from maya@… goes to Hale Upholstery."
- One grouped question per side per day, at most. On the first read that's one question, not one per batch. Unfiled
  stays a single line, as G3 says.

**F41. Notes from mail need no project: yes.** A note is reference material, not work. It takes its mail's side; when
that's unsure, F40 applies (Personal). A to-do or question drawn from the note still needs a home, so it can be filed.

**F42. The brief summarises and never repeats: yes. One change to "only on its day".**

- Offer the weekly form on the first day the app is opened that week, until it's done or dismissed, not only on its set
  day. In our run the person often didn't open the app on Monday; the weekly check-up stayed marked until they did. If it
  shows only on Monday, a Tuesday start skips the week's plan.
- Counts that link to the lines are right. In our weekly check-up the rule was the same: nothing already on Today is
  repeated.

**F43. The "Outside" marker leaves the lists: yes, keep the rule. One place the warning must stay visible.**

- Where an item from mail leads to an outward step (a reply draft, a link to open, a payment or an address to use), say
  at that step where it came from: "From an email; check the address before you pay." That's where the warning protects
  the person. On a list it's noise, as the reviewer says.
- Packets keep the marking, and links still show their real domain, as proposed.

**F44. Plain titles and facts: yes. One correction for facts.**

- Note titles: subject and sender, set by the core, as proposed. Strip "Re:" and "Fwd:" chains; with no subject, use the
  first words of the body.
- Facts: state the world, but keep who said it when it's someone's claim. "The offsite is on a Friday" is right when it's
  settled; "Maya says the offsite is on a Friday · Oct 27" is right when it's one person's word. In our run, losing who
  said what was one of the costliest fact errors: a claim later contradicted by someone else was impossible to weigh. The
  `said_by` on the fact can carry it, and the line shows it.
- "As decided" is a decision only if someone made a choice (lesson 7). The lint should catch "decided" written into a
  fact.

**F45. People with a business: yes, one "Who they are" column. One addition.**

- A person can be on several sides: "sister · supplier at Hale Upholstery". Show every relation the person has to them,
  Personal first, comma-separated. Organization and role stay in the details, as proposed.
- Drop "client" and keep "customer", as the reviewer says. But let the person type their own relation, since the shipped
  list will never fit everyone.

**F46. Private material at the AI step: keep it as built.** Personal mail stays private, and the AI step's Allow covers
it, said plainly.

- Two different questions are being answered by one setting. "Private" means who else may see it: never on the business
  side, never in drafts to others, never in exports or shares. "May this AI service read it" is about the account. For a
  personal assistant whose job is reading your own mail, the answer to the second has to be yes, or nothing works.
  Lowering personal mail to "internal" so the AI can read it weakens the first question. F40's filing safety relies on
  Personal being the more private side.
- So:
  - Personal mail stays private.
  - The AI step names exactly what it allows: "Reginald's AI service may read your mail, notes and calendar, including
    private ones. It needs to, to find what you promised."
  - "Only what could be public" and "Not my private mail" stay one click away.
- Our F25 answer still applies: a new or fallback AI account reads nothing private until the person says yes for that
  account. A switch of service must never carry private material along silently.

## Input from the day's work

1. **Phase U needs an exit, or the review loop won't end.** This is the second full pass, and it found 23 more findings.
   Every pass on a moving app will find more. Proposed exit: the four P0s (G1 to G4) are fixed; both personas finish
   setup alone (the reviewer's own test); no Today action raises the count. Then the P1s and P2s go to the backlog as
   normal work, and the reviewer checks only G1 to G4, not a third full pass. The owner is waiting on the gate week, and
   the gate measures more than the screens.
2. **The gate's pass bar is still "later" (P65).** It's the one thing that makes the gate week mean something. Draft it
   now, while phase U finishes, so it isn't written after the results are known.
3. **Hand-made file links are kept by path** (`watch.versions.same_document`). The person's own workflow moves old copies
   into an Archive folder. That moves the path and can lose the link, or the "current" answer. Key the links by the
   file's content or the family's key, not the path. Add a test: a link survives the older copy moving into Archive, and
   the current copy being renamed.
4. **Named notice apps** (the owner's call): leave them. Plain text plus a webhook covers v1. Lifting the hold for one
   app list costs another round for every pack builder.
5. **"What it's for" as tick boxes:** keep them. A job and a business together is a real case, and the tick boxes allow
   it. The business step must allow one mailbox for both sides.
6. **The owner's to-do list** still holds "Tonight (2026-10-26)" items under "This morning (2026-10-28)". Finished or
   stale items must leave it, or the person stops trusting the list. Our Today rule is the same: only what the person
   does now. Keep the list in date order, with done items gone.
7. **Good to see:** the project-ending hook first in the release plan; lead time as a field on any to-do; the version tie
   asked once instead of decided by modified time; a hang counted as a failure. All four came straight from running, and
   they're built with tests.

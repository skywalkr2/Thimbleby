# Proposal for the owner: one place for mail handled for you (P47, with P45 and P46)

Status: **proposal, waiting for the owner's yes.** Nothing here is built. The defect under it (the same mail in both
lists) is fixed (CHANGES section 204): each mail now shows in exactly one place.

## What the person sees today

- **Set aside** sits inside Connections: mail sorted away before the assistant read it (by the rules or the sorting).
- **Closed without you seeing** sits on What changed: mail the assistant read and found nothing to do in.
- Both are long vertical lists, one row per mail, and nothing says how they differ.

## The proposal

1. **One screen, "Handled for you"**, in the side menu under Work (P45 moves it out of Connections; Connections keeps
   only the accounts and sources).
2. **Two plainly named tabs**, each with one line saying what it holds:
   - **Set aside**: "Mail sorted away before {assistant} read it: newsletters, sales, codes and alerts."
   - **Read, nothing to do**: "Mail {assistant} read and found nothing for you in."
3. **Grouped, collapsed by default.** Rows are grouped by sender, or by kind (bills, orders, notices, newsletters,
   sales), with a count: "Example Shop · 4". A group opens to its mails, newest first.
4. **A search box** above the groups, matching sender, subject and kind.
5. **The same choices on every row, in both tabs** (P46): Treat as personal, Treat as work, Always set aside mail like
   this, Open the message. Each records a signal. There is no "Keep set aside": leaving a mail where it is is the
   confirmation.
6. **Today and What changed** show one quiet count line ("12 handled for you today") that opens the screen. The lists
   themselves never sit on Today.

## Choices for the owner

- **Group by sender or by kind, by default?** Proposed: by kind, since bills and orders matter more than who sent them.
  The other is one click away.
- **The name "Handled for you".** Alternatives: "Sorted for you", "Taken care of".
- **How long mail stays listed.** Today set-aside mail is purged after the configured days. Proposed: unchanged, and
  shown on the screen as "Kept for {n} days".

If the owner says yes, design 7 is updated first, then the screen is built with its browser test at several widths.

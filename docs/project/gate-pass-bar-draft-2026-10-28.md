# The gate week's pass bar (P65, risk R10): agreed by the owner, 2026-10-28

Written before any results are known, as the designer asked (2026-10-28). The measures and the frozen week are already
designed (design 6.32, "Measures"; built in `engine/gate_measures.py`, read from `GET /api/quality`). Design 6.32 says the
thresholds are "set from the two measured days". This draft changes that: the bar below is fixed now, and the two
measured days may only make it stricter, never looser. That way the gate can fail.

## What passes the week

Each measure is a count with its denominator over the counted week, on the owner's personal mail.

| # | Measure | Pass | Why this number |
|---|---|---|---|
| 1 | **Lost promises:** a promise that existed and then vanished with no ending anyone saw | **0** | R10. One lost promise makes the product worse than paper. |
| 2 | **Wrong silent closes:** a promise closed without the person seeing it, that wasn't done | **0** | The same harm as a lost one. |
| 3 | **Missed out of present:** promises in the mail the app didn't catch. Counted from "Missed something?" plus an independent reading of a consented sample of 50 messages | **at most 1 in 10** | A missed promise is the failure the person feels most. 90% caught is the floor for trusting it daily. |
| 4 | **Wrong endings out of endings made** (a nudge treated as done included) | **at most 1 in 20** | An ending removes something from view, so it needs a stricter bar than a proposal. |
| 5 | **Wrong out of proposed:** proposals the person drops or corrects | **at most 1 in 4** | Proposals are reviewed, so errors here cost time, not trust. |
| 6 | **Sources not read:** a connected source unread for more than a day without a Today line saying so | **0** | "Nothing needs you" must never mean "couldn't check". |
| 7 | **Review time:** the owner's time on Today, as measured | **median at most 10 minutes a day** | Above that, the app costs more than it saves. |
| 8 | **Repeat corrections:** the same mistake corrected twice | **reported, not gated** | One week is too short to judge learning. |

Counts that depend on how much mail arrives (how many promises, how many proposals) are reported, not gated, as the
design already says.

## How the two measured days are used

- They check the instruments: every measure has a denominator, nothing is counted twice, and the sample is drawn.
- If the two days show a measure better than its bar, the bar may be tightened to that day's figure. It is never loosened.
- If an instrument is broken, it is fixed and the two days start again. The counted week starts only on working
  instruments.

## If the week fails

- Measures 1, 2 or 6 failing ends the week at once. The cause is fixed with a test, and a new counted week starts.
- Measures 3, 4, 5 or 7 failing: the week finishes, the misses become replay cases (starting state, the person's action,
  the expected end), the fixes land, and a new counted week runs.
- The testers' run (phase I) starts only after a week passes, and the testers are held to the same bar for measures 1 to 4.

## Agreed

The owner said yes to every number (2026-10-28), noting that their own work is still mostly in add-ons being built, so
the week counts what the app sees, and that more is expected to show once the installers reach a few people (phase I).
Design 6.32 and risk R10 now say the bar is fixed and can only tighten.

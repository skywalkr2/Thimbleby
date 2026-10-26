# Posting to social networks without their APIs (research note, for when the social pack is planned)

Recorded 2026-10-26 from the owner's research, to read when the social media pack (design 3.7, roadmap "Not in 1.0")
is designed. Nothing here is built or decided. Every address and limit below must be checked against each platform's
own documentation at that time; they change.

## The idea

Instead of the app posting through a platform's API (developer accounts, app review, keys, sometimes a price), the
Publish button opens the platform's own composer with the approved text filled in, and the person presses the
platform's own Post or Share button. It is free, needs no keys or app review, and keeps the person in control. The
cost is one extra click.

## How it fits the core

It fits the core's existing rule that nothing goes out until the person approves the exact content (design 6.3, 6.12):
- it is a channel like Copy: the publisher marks the approved draft as handed over, and the person finishes it on the
  platform. The app can't see that the post was made, so the item stays open until the person marks it posted (or a
  connector reading the account later sees it), as Mark sent works for Copy;
- each platform's link format is data in the pack (a URL template with the text and link as parameters), never code,
  so a platform that changes its address is a data change;
- the link opens in the person's browser, never inside the app, and shows its real domain (design 7, untrusted links).

## What each platform allows (as reported; verify when building)

- **X:** a "web intent" address opens the post composer with text (and a link) filled in. No account or key is
  needed. The exact address was cut off in the research; at the time of writing it was of the form
  `https://x.com/intent/post?text=...` (formerly `twitter.com/intent/tweet`).
- **Facebook:** does not allow text to be filled in by a link (to stop spam). Its Share Dialog takes a link to share,
  and the person writes their own words above it. On a phone, the system share sheet or the app's own link can be
  used, with the suggested text put on the clipboard to paste.
- **Others to check then:** LinkedIn's share link (a link, no text), Bluesky's and Mastodon's compose links (text
  allowed), and Instagram (no web composer; phone share sheet only).

## Open questions for that design

- How the person marks a post as made, and whether a read-only connector to their own account confirms it.
- Copy to clipboard as the fallback for every platform that won't take text in a link.
- Scheduled posting is impossible this way (the person must press Post); scheduling would need the API route, which
  is a separate decision about cost and app review.

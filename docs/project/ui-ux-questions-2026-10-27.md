# For the UI/UX reviewer: questions before the rest of your review is built (P69)

Your review of 45f7102 (`reviews/ui-ux-2026-10/review-45f7102/`) is mostly built (phase U). The owner asked that
everything you asked for is built before the work comes back to you for a second pass. An audit of each of your requests
against the code found the items below, where your words can be read two ways, where they meet an earlier decision, or
where we found no sentence of yours. Each question says what the screen does today, the choices we see, and what we would
build if you have no preference. A one-word answer ("a", "b", "yours") is enough.

Everything else that's left is clear from your own words and is being built as you wrote it: "Your name" on You, Working hours as one
row, one notifications switch, brief times as one row, Add-ons › For developers, Follow-ups › Message style, Knowledge ›
Glossary, code words out of hints, Undo toasts that stay, rail links without an underline, a handled-for-you count on Today,
no "Treat as work" for "Just me", the wider "Just me" check, "Hand something in" when mail was skipped, raw dates out of
every title, the travel-clash wording, the setup guide link on You only, and the open wording rows from your re-reviews.

## What changed

1. **Buttons in the details pane (F17 and F18).** F17 says What changed is "the history: past tense, no buttons", and
   "Today's line is the only place to act". F18 asks that the held block "uses the pane's full width", which reads as if
   the held block (with Keep and Release) stays in the pane. Today the pane keeps Keep, Release and Release all on held
   items, at full width.
   - a) No buttons: each held item shows "Answer on Today", which opens its Today line. *(Our default: F17 is the
     stricter reading.)*
   - b) Keep the buttons in the pane, at full width, as built.
2. **The default filter.** What changed opens on "Needs attention". You call the screen the history; we found no sentence
   about the filter.
   - a) Open on All; keep "Needs attention" as a choice. *(Our default.)*
   - b) Open on All and drop "Needs attention".
   - c) Keep "Needs attention" as the default.
3. **First-go and stage rows.** What changed still shows "Start the assistant" and a stage's "Give the go" with their own
   buttons. Both also have a Today line.
   - a) Remove them from What changed. *(Our default.)*
   - b) Keep them as rows that link to their Today line.

## Today

4. **The brief on a quiet day.** The Briefing card shows buttons for the other forms of the brief ("Show the evening
   wrap-up", "Show the week") whenever it is drawn, also on a day with nothing in it. We found nothing of yours on this.
   - a) No such buttons on a quiet day; the other forms sit in the card's menu. *(Our default.)*
   - b) Keep them as they are.
5. **Check now with nothing arrived.** When nothing has come in, the Came in card isn't drawn (F6), so "Check now" is only
   in Settings › Connections (as "Read now" in each source's menu). We found nothing of yours on this.
   - a) As built: Check now only on Came in when it is drawn, and in Connections. *(Our default.)*
   - b) A quiet "Check now" link on Today even when nothing has arrived.
6. **Side filter on lists.** Today and Follow-ups have the side filter (Personal, each business, All). Should To-dos,
   People, Projects, Handled for you and What changed have it too?
   - a) Yes, every list. *(Our default.)*
   - b) Only To-dos and People.

## Setup

7. **The name of the "Work" step.** Your "Just me" check says no screen shows "Work", but the step where a person picks
   "Just me" is itself called "Work" in the step list, the "Work · 2 of 7" line and Done. What should the step be called
   for everyone? *(Our default: "Who this is for".)*
8. **"Group them?" on the business step.** You mention an optional line that groups a business's jobs. Does it mean
   grouping the jobs under a program (a parent project inside the business), and is it one line per business with a
   name box? *(Our default: yes to both, and skipped unless the person opens it.)*
9. **Ask a connection's data level?** Your Settings list removes the default data level from Settings and asks it when a
   connection is added. That adds a question to setup's mail step, which F13 cut to one line.
   - a) Ask only when a connection is added from Settings › Connections, not in setup (setup uses the default). *(Our
     default.)*
   - b) Ask in both places.

## Settings

10. **Notice format as named apps.** You asked for named apps instead of "A chat app" and "A push notification topic".
    The core may not name outside services in its code or wording (the boundary rule); an add-on may. Choices:
    - a) Plain words that describe the result ("Messages in a chat room", "Phone notifications through a topic
      service"), with named apps arriving with the add-ons that connect them. *(Our default.)*
    - b) Named apps listed in a data file the person can change.
11. **"Which model does what".** The AI page shows the routing pickers to everyone.
    - a) Behind a closed "Choose which AI does what" on the AI page. *(Our default.)*
    - b) Moved into Advanced › AI and spending.
12. **Quality's page heading.** The user menu says "How Reginald is doing" (yours); the page it opens is still headed
    "Quality".
    - a) Head the page "How Reginald is doing" too. *(Our default.)*
    - b) Keep "Quality" as the heading.

## From your earlier re-reviews

13. **Detail panes on Files and Connections (C5).** What changed and Follow-ups now have a list with a details pane;
    Files and Connections don't. Still wanted?
    - a) Yes. *(Our default.)*
    - b) No, they read fine as lists.

## The reviewer's answers (2026-10-27)

The reviewer answered in words; each is mapped to its choice here.

1. **a**, no action buttons. The held block shows at the pane's full width as information ("Waiting for you · Would drop
   a to-do", the quote, Show source) with one link, "Answer on Today". Undo stays in the row's menu (it corrects history).
2. **b**: open on All, newest first; "Needs attention" is dropped (its items live on Today).
3. **b**, as one line: no row each, but one summary line at the top, "2 things wait for you on Today · Open Today".
4. **a** without the menu: on a quiet day the "Show the evening wrap-up" and "Show the week" buttons are hidden; the brief
   shows by itself at its time.
5. **b**: on Today too, in the Came in card, as a quiet text button, also when nothing came in (above all just after
   connecting mail). Connections keeps its own.
6. **a**, with detail: on every list that can hold both sides (Today, What changed, Handled for you, Follow-ups, To-dos,
   People, Files), the same control in the same place; hidden entirely when there is no side.
7. **"What it's for"**: the question reads "What will you use it for?" with "Just my own life", "My life and my job", "My
   life and my own business". The ban on "Work" applies to the screens after "Just me" is chosen.
8. **Yes, optional programs only**: after the jobs, clients or orders, one optional line, "Do some of these belong
   together? Give the group a name", skipped by default; no group named, no program made, and the word "program" never
   shows.
9. **a**, with detail: not asked in setup. The level follows the side picked for the mailbox (Personal: the private
   level; a business: that business's level), shown and changeable on the connection's row in Settings.
10. **b**: a shipped list with the app names people recognise, plus "Something else (plain text)". The names live in a
    data file outside the core's code, as the boundary rule asks.
11. **a**: behind a closed "Choose which account does each kind of work" on the AI page.
12. **a**: "How Reginald is doing", from the assistant's name.
13. Files: **a**, a details pane (a preview, where it came from, what refers to it). Connections: **b**, no pane; each
    connection is a row in Settings that opens in place.

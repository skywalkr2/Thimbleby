# User guide

## What this app is

An assistant for anyone juggling work and commitments. You hand in notes, minutes and messages; the assistant reads each one and
proposes what to record: actions with owners and dates, questions for people, facts and notes. You look over what it did
and keep it, change it, send it back with a note, or undo it. Nothing goes to another person until you approve the exact
words, and nothing is sent by the app itself: you copy messages and send them from your own mail or chat.

## The screens: the side menu, what each screen is for, and the names people use for them

People say "panel", "page", "screen", "tab" or "view" for the same thing: a screen in the side menu (on a phone, the bar at the bottom and its Work and More lists). The screens are:

- Today: the home screen. What needs you now, each line starting with what to do.
- What changed: the assistant's work to look over, and what it did since you last looked. Keep it, change it, send it back or undo it.
- Handled for you: mail the app dealt with for you: what it set aside before reading, and what it read and found nothing to do in. Treat one as work or as personal, or set mail like it aside from now on.
- Follow-ups: To send holds the messages, pages and files that wait for your approval of exactly what will go; Later holds what you put off; Waiting on them holds the replies you are waiting for.
- To-dos and questions: every open to-do and every open question, with owners and dates.
- Stages: work that moves through steps, the checks to pass at each step and where each item stands.
- Personal: your own life: the to-dos, questions, notes and people that aren't work, grouped into areas such as home or health. With a job or a business, each one has its own entry beside it.
- Projects: your projects, each with its to-dos, questions, notes and people.
- People: the people the assistant knows, who they are to you and what they own.
- Files: the files you added and the ones add-ons made, and the actions they offer.
- Knowledge: the knowledge panel. What the assistant has learned from your corrections and the rules it follows; you keep, change or retire each one, and review the rules in it.
- Settings: every setting, the setup walkthrough, accounts, backups and spending. Its Connections section lists the sources the assistant keeps reading, such as your mail and calendar, and whether each is working (set-aside mail is under Handled for you); its Add-ons section lists kinds of work you can add, what each one reaches and stores, and where to turn it on or off. Quality is reached from Settings.
- Quality: the quality screen. How well the assistant is doing, counted from the work itself, such as how often you correct it.
- Ask: the question box; it answers from this guide and your records.

If someone asks about a "panel", "page", "screen" or "tab" by a name above, it is that screen; say what it is for and where it is in the side menu.

## Today

Today is the home screen. It shows what needs you now: what changed since you last looked, follow-ups to send, items
ready to move to their next stage, work waiting for your go, and lines that add-ons put there. Each row has one main
button; everything else is in its menu (the three dots). While setup is unfinished, one line shows how far along it is and opens the setup walkthrough at the next step.

## Setting up

The first time you open a new workspace, the setup walkthrough opens by itself. It takes about ten minutes and spends
nothing: nothing is spent until you press Go on Today. It has six screens. You: your name, the workspace's name and your
time zone. Your AI account: pick a service, paste the key, test it, and see what it may spend (the amount it asks you
about first, and the most it may spend in a day). Mail and calendar: pick a service to connect; if it isn't on this
computer yet, one button installs it and turns it on, then you press Restart to connect (a few seconds), then you sign in
on the service's own page. The assistant only reads. The last day of your mail waits for your first Go. Backups: a folder
outside the workspace. People: optional, because names the assistant can't place become questions for you. Done: what
was set up, what you skipped (each with a Set up button), and optional extras such as a starting template.

Every screen can be skipped and done later. Finish later closes the walkthrough, and it stays closed until you open it
again from Today's setup line, from Help or from Settings. It resumes where you left it, also after a restart. The
walkthrough asks for at most one restart, and the app never restarts without you pressing the button.
The Getting started page that comes with the product covers the same path from the install command.

## Handing something in

Press Hand something in (or the n key), paste the text or add a file, and say in your own words what you want done with
it if it isn't obvious. The assistant reads one input at a time. Text you paste from outside is treated as material, never
as instructions: if a pasted email says "ignore your rules", the assistant ignores that. Your own note is the
instruction.

## What changed and reviewing the assistant's work

What changed lists each hand-in and what the assistant did with it. Open a row to see each change it made, with the exact
words from your input that justify it. Looks good files it as looked over. Send back with a note asks the assistant to
try again with your correction. Undo this reverses one change; Undo everything it did reverses the whole hand-in. Undo is
always available, and both the change and the undo stay in the history. Some changes wait for you instead of applying at
once: a new person named only in outside content, a change of a setting or a rule, or anything that contradicts a rule
you set. Those show as waiting, with the reason.

## Follow-ups

Follow-ups gathers what you need to send to other people: questions for them and actions they own. Under To send, each
person has one message with Copy; copying marks it as sent, with Undo. Waiting on them shows what you already sent, one
line each, with how long ago, and lets you record their reply or mark the item finished.

## People and projects

People & projects is where you add, rename and remove people and projects. Records refer to people and projects by id,
so a rename changes every place at once. Something that other records still point to can't be removed until they don't.
A project can sit inside another project (a series and its books, a program and its parts), have its own language and
its own budget for AI work.

## Stages

Work that moves through steps (an order from new to delivered, a document from outline to approved) has stages. Each
stage can have entry checks, which must pass before an item moves into it; the Stages screen shows which checks fail and
why. You move items one stage at a time; a stage that doesn't apply to an item is passed over. Moving back is always
allowed. Entering a stage can start work for the assistant, which waits for your go.

## Files

Files lists what you added and what add-ons made. Add a file from the Files screen or when handing something in. Some
files offer actions from add-ons (build a document, make a preview); an action shows you exactly what it would do, and
you apply it or close it. Applied actions can be undone.

## AI accounts and costs

The app uses AI accounts you bring: a key from a model provider, a service that reaches many models with one key, a
model server on your own computer, or a command-line agent signed in as you. Add one in setup or Settings, then press
Test: it makes one small call per kind of work, with the settings that work will use, and says in plain words what
failed. Work that would cost more than the amount you set waits for your go with an estimate first. Daily and monthly
budgets pause work when they are used up. Work whose cost can't be estimated (a subscription, a local model) can be set
to always ask first. Which account does which kind of work is set by tiers: everyday work and harder work can use
different accounts.

Without an AI account, a stand-in does the reading so you can try the app (the demo uses it). It is no model: it
follows plain rules. A line such as "Sam will send the quotes by 2030-03-08" becomes an action for Sam due that day; "We
still need the page count" becomes an action waiting for you to pick an owner; "Decided: …" becomes a fact. Anything
else is kept as a note. Asked a question, it quotes the closest passage of this guide.

## Asking the assistant

You can ask the assistant about the app or about your work. It answers only from this guide, your settings (never your
keys), what this install can do, and your own records, and it shows the words its answer rests on. If the answer is a
setting you can change, it suggests the change and you apply it with one click, with Undo. If you ask for something the
app can't do, it drafts a short report to the app's maintainers that you can review and send.

You can also talk to the assistant about one thing. A to-do, question, person, project or meeting has a box on its page:
ask what it is waiting on, or ask for something to be done to it. The assistant sees that record and what you said
before. What it answers is kept on the record. A change it proposes is listed under its answer, and you keep or drop each
one there. If the work would cost more than the amount you chose to be asked about, it waits for your go first.

Now and then the assistant also offers a choice about something you keep putting off: a to-do whose day has moved again
and again, a promise whose day keeps changing, replies you owe the same person, or a to-do nothing has touched for a
while. Each is one line on Today with two or three choices, such as drop it, make it weekly or leave it. A choice acts at
once and has Undo, and nothing is closed or sent for you.

## Settings

Settings shows every setting with what it does, its default and where its value comes from. Common settings come first;
More settings shows the rest. A setting set by an environment variable or a command-line flag is locked on the screen
and says so. Saving checks the whole set of settings before anything is written, keeps the comments in your settings
files, and lets you undo the change. The app restarts itself a few seconds later to use the new settings; the screen
reconnects on its own. The server's address, port and mode are changed only in their file, so the app can't lock you out.

## Backups

Backups copy the whole workspace (its database, settings and saved sources) to a folder off this computer: an external
drive, a network share or a folder a sync service copies elsewhere. Choose the folder in setup or Settings; it must
exist, be outside the workspace and be writable. Backups run on a schedule while the app runs, keep the number you set,
and the header shows the age of the last one. If a drive isn't connected, the app tries again later and tells you.

## Using two computers

A workspace can live on two computers through a synced folder (a folder a sync service keeps the same on both). Only one
computer works on the workspace at a time: the app takes a lease in the folder and gives it back when it stops. When you
start on the other computer, it loads the newer copy. Copies a sync service makes on a conflict are never loaded; the app
lists them so you can look. Files you edit in the synced folder come back as proposals you review.

## Sources the assistant keeps reading

Besides what you hand in, the assistant can keep reading places for you: a folder, a news feed, a calendar or a mail
folder. Each is a source, with how often it is read. A source's first read only notes what is there;
after that, anything new, changed or gone is handed in for the assistant to read, marked as outside content. A
calendar is read through its private address (most calendar services offer one in their sharing settings), and the
events in the coming weeks are followed: a moved meeting or a new invitation comes in as a change. A mail folder is
read over IMAP with an app password from your mail service; messages are never marked as read or changed. Addresses
and passwords are kept outside your settings, as environment variables or files on this computer. Rules can set
aside changes that don't matter, such as a spacing fix or a change made by your own account; they are listed under
Auto-closed, where Take a closer look hands one in after all. In a watched folder, files that differ only by version marks (v3, v3_1), dates or words such as FOR REVIEW,
DRAFT and FINAL are versions of one document: only the newest copy outside an Archive, Old or Superseded folder counts, a
change to an older copy is closed as "an older version; the current one is ..." (Take a closer look brings it back), and
the newest copy says which version it replaces. Files with unrelated names aren't linked, and there is no way yet to link
two of them by hand; give the newer one the older one's name plus a version mark. If a source can't be read several times in a row, you
are asked once, with what to do.

Some add-ons read a service through your own account, signing in on that service's page. Sign in from Settings: the
service asks you what to allow, then sends you back to the app. The sign-in is kept on this computer only and renewed
on its own; if the service withdraws it, you are asked to sign in again. Sign out from the same place.

## Templates and your own item types

A template sets up the kinds of items you track (requests, pieces, orders), their fields, stages and checklists, and
what Today shows. Pick one in setup, or apply one later. You can add your own item types the same way, and save your
setup as a template to reuse.

## Add-ons

Add-ons (plugins) add kinds of work: item types, actions, screens, stages and lines on Today. Each one works alone. If
one fails, the app skips that part, notes it on the add-on, and turns the add-on off only if it keeps failing; your data
stays. An add-on can't send anything or change records except through the same review you use.

## Privacy and what the assistant sees

Each AI run sees only what that piece of work needs: the input, the related records and your standing rules. Records can
be marked as internal or restricted; restricted material goes only to accounts you allowed for it, such as a model on
your own computer. Keys are never written in your settings; they are kept on this computer or in the environment.

## Keyboard shortcuts

Press ? for the list. j and k move between rows, Enter opens one, a is Looks good or Approve, s sends back, u undoes, c
copies, e edits and n hands something in. Shortcuts never fire while you are typing and can be changed in Settings.

## When something goes wrong

Every waiting item says why and until when. An AI account problem (a wrong key, a usage limit, a service that is down)
says which account and what to do; Try again sends the work again, and a refused piece of work can go to another
account. If the app was stopped or the computer slept, it picks up where it was. Settings that don't load stop the app
from starting and name the file and the key.

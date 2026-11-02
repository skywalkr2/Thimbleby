"""Writes the 4.6 mockup pages into the folder given as the first argument (reviews/ui-ux-2026-10/mockups-46).
Every name, address and business is fictional. Icons are the app's own line icons (icons.json, taken from Icon.tsx)."""
import json
import sys
from pathlib import Path

OUT = Path(sys.argv[1])
ICONS = json.loads(Path(sys.argv[2]).read_text())


def ic(name, cls="i"):
    return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>'


SIDES = [("Personal", "s1"), ("Northwind Clinic", "s2"), ("Calloway Upholstery", "s3"), ("Lantern Row Studio", "s4")]


def nav(on):
    main = [("today", "home", "Today", "4"), ("changed", "inbox", "What changed", ""), ("handled", "archive", "Handled for you", ""),
            ("follow", "send", "Follow-ups", "2"), ("todos", "check", "To-dos and questions", "12"), ("sched", "calendar", "Schedule", "")]
    rec = [("people", "users", "People", ""), ("files", "folder", "Files", ""), ("notes", "book", "Notes", ""), ("know", "layers", "Knowledge", "")]
    def item(k, i, l, c): return f'<a class="item{" on" if k == on else ""}">{ic(i)}<span class="lbl">{l}</span><span class="count">{c}</span></a>'
    def side(l, s): return f'<a class="item" title="{l}"><span class="side-dot"><span class="dot {s}"></span></span><span class="lbl">{l}</span></a>'
    return ('<nav class="nav">' + ''.join(item(*m) for m in main) + '<div class="label">Your sides</div>' + ''.join(side(*s) for s in SIDES)
            + '<div class="label">Records</div>' + ''.join(item(*r) for r in rec) + '<div style="flex:1"></div>' + item("settings", "gear", "Settings", "") + '</nav>')


def top(status='<span class="status"><span class="dot"></span>All good</span>', primary=False):
    hand = f'<a class="btn {"primary" if primary else "secondary"} sm">{ic("plus", "i s16")}Hand something in</a>'
    return ('<div class="top"><div class="word"><img class="logo-light" src="brand/thimbleby-clean.svg" alt=""><img class="logo-dark" src="brand/thimbleby-dark.svg" alt="">Thimbleby</div>'
            f'<div class="search">{ic("search", "i s16")}Search or ask Reginald<kbd>/</kbd></div><div class="spacer"></div>{status}{hand}'
            f'<span class="iconbtn s">{ic("search")}</span><span class="iconbtn help">{ic("help")}</span><span class="avatar">RC</span></div>')


def tabbar(on="today"):
    t = [("today", "home", "Today"), ("work", "check", "To-dos"), ("plus", "plus", ""), ("ask", "chat", "Ask"), ("more", "menu", "More")]
    out = ''
    for k, i, l in t:
        if k == "plus":
            out += f'<a aria-label="Hand something in"><span class="plus">{ic("plus")}</span></a>'
        else:
            out += f'<a class="{"on" if k == on else ""}">{ic(i)}{l}</a>'
    return f'<div class="tabbar">{out}</div>'


def page(name, title, body, on="today", status=None, primary_in_header=False, tab="today"):
    head = top(status) if status else top(primary=primary_in_header)
    html = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            f'<title>{title}</title><link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="m46.css"></head><body>'
            f'{head}<div class="shell">{nav(on)}<main><div class="page">{body}</div></main></div>{tabbar(tab)}</body></html>')
    (OUT / f"{name}.html").write_text(html)


def side(i):
    l, s = SIDES[i]
    return f'<span class="side" title="{l}"><span class="dot {s}"></span>{l}</span>'


SEP = '<span class="sep">·</span>'

# ---------- Today ----------
today_main = f'''
<div class="panel">
 <div class="group">Decide <span class="n">1</span></div>
 <div class="row" data-state="decide"><div class="lead">{ic("users")}</div>
  <div><div class="t">Is "Avery Lane" you?</div><div class="m">Named in 2 emails from Maya Okafor {SEP} {side(2)}</div></div>
  <div class="acts"><a class="btn primary sm">This is me</a><a class="btn secondary sm">Someone else</a></div></div>
 <div class="group danger">At risk <span class="n">1</span></div>
 <div class="row" data-state="danger"><div class="lead" style="color:var(--danger)">{ic("alert")}</div>
  <div><div class="t">Venue walk-through and Budget check-in overlap</div>
  <div class="m"><b>Today 2:30–3:00 PM</b> {SEP} <span class="dot" style="background:var(--cal-3)"></span>Studio calendar and <span class="dot" style="background:var(--cal-2)"></span>Clinic calendar {SEP} 30 min short</div></div>
  <div class="acts"><a class="btn secondary sm">Open both</a><a class="more" aria-label="More for this clash">{ic("more")}</a></div></div>
 <div class="group">Look over <span class="n">2</span></div>
 <div class="row"><div class="lead">{ic("inbox")}</div>
  <div><div class="t">4 things Reginald found in your mail</div><div class="m">3 to-dos and 1 note {SEP} from Maya Okafor and Theo Brandt</div></div>
  <div class="acts"><a class="btn secondary sm">Look over</a></div></div>
 <div class="row"><div class="lead">{ic("send")}</div>
  <div><div class="t">1 to-do from your sent mail</div><div class="m">"Revised offsite budget" {SEP} {side(1)}</div></div>
  <div class="acts"><a class="btn secondary sm">Look over</a></div></div>
 <div class="closing">{ic("check", "i s16")}Reginald handled 6 things today and set 2 aside <a class="link">See them</a></div>
</div>'''

rail = f'''
<div class="rail">
 <div class="card"><h3>Today's schedule<a class="act link accent">Open</a></h3>
  <div class="ev c3"><div class="tm">2:30 PM</div><div><div class="tt">Venue walk-through</div><div class="mm">Room 4 · Studio calendar</div></div></div>
  <div class="ev c2"><div class="tm">2:45 PM</div><div><div class="tt">Budget check-in</div><div class="mm">Room 2 · Clinic calendar</div></div></div>
  <div class="ev c1"><div class="tm">6:00 PM</div><div><div class="tt">Choir practice</div><div class="mm">St Anne's hall · Home calendar</div></div></div>
 </div>
 <div class="card"><h3>Came in <span class="group" style="padding:0"><span class="n">3</span></span><a class="act link accent">Check now</a></h3>
  <div class="ci"><span class="dot s3"></span><div><div class="tt">Venue list</div><div class="mm">Maya Okafor · Studio inbox</div></div><span class="tm">1:22 PM</span></div>
  <div class="ci"><span class="dot s2"></span><div><div class="tt">Catering quote</div><div class="mm">Theo Brandt · Clinic inbox</div></div><span class="tm">10:22 AM</span></div>
  <a class="link" style="font-size:13px">1 more</a>
 </div>
</div>'''

today_head = f'''
<div class="ph"><div><h1>Good afternoon, Robin</h1><div class="sub">Wednesday, October 28 · <b>4 things need you</b>, starting with one decision</div></div></div>
<div class="filters"><span class="chip"><span class="k">Side</span><span class="v">All four</span>{ic("chevron", "i s16")}</span><span class="chip"><span class="k">Showing</span>Needs you</span></div>'''

page("today", "Today", today_head + f'<div class="layout">{today_main}{rail}</div>')

# Today, the review opened (the inset)
opened = today_main.replace(
    '<div class="acts"><a class="btn secondary sm">Look over</a></div></div>\n <div class="row"><div class="lead">' + ic("send"),
    '<div class="acts"><a class="btn quiet sm">Fold</a></div></div>'
    '<div class="inset">'
    f'<div class="it"><div><div class="t">Send the venue list</div><div class="m">To-do · due Mon, Nov 2 · from Maya Okafor\'s email <a class="link">Venue list</a></div></div><a class="link">Not right</a></div>'
    f'<div class="it"><div><div class="t">Get a catering quote</div><div class="m">To-do · from Theo Brandt\'s email <a class="link">Catering quote</a></div></div><a class="link">Not right</a></div>'
    f'<div class="it"><div><div class="t">Mail the claim forms</div><div class="m">To-do · due Fri, Nov 6 · claim 4471902, to the State Treasurer · from <a class="link">Unclaimed property</a></div></div><a class="link">Not right</a></div>'
    f'<div class="it"><div><div class="t">The offsite is on a Friday</div><div class="m">Note · filed under Calloway Upholstery</div></div><a class="link">Not right</a></div>'
    '<div class="foot"><span class="help" style="margin:0;flex:1">What\'s in an email is read as information, never as instructions.</span><a class="btn primary sm">Keep all 4</a></div></div>'
    '\n <div class="row"><div class="lead">' + ic("send"), 1)
page("today-review", "Today, a review opened", today_head + f'<div class="layout">{opened}{rail}</div>')

# Today states: all clear, loading, one account failing, offline, conflict, many items
clear = '''<div class="panel"><div class="empty"><img class="mk logo-light" src="brand/thimbleby-clean.svg" alt=""><div class="star">✳</div>
<h2>Nothing needs you</h2><p>A little more room to think. Reginald keeps watching your mail and calendars and brings anything new here.</p>
<a class="btn secondary sm">See what was handled today</a></div></div>'''
loading = '<div class="panel">' + ''.join(
    f'<div class="row"><div class="lead"><div class="skel" style="width:18px"></div></div><div><div class="skel" style="width:{w}%"></div><div class="skel" style="width:{w-25}%;margin-top:8px;height:10px"></div></div><div></div></div>'
    for w in (62, 48, 70, 55)) + '</div>'
failing = f'''<div class="banner danger"><span class="dot danger"></span><div class="tx"><b>1 of 3 accounts needs you.</b> studio@calloway.example asked to sign in again, so its mail and calendar haven't been read since 10:51 AM.</div><a class="btn secondary sm">Sign in again</a></div>'''
offline = f'''<div class="banner"><span class="dot warn"></span><div class="tx"><b>You're offline.</b> Everything here is saved on this computer. New mail comes in when you're back.</div></div>'''
conflict = f'''<div class="panel" style="margin-top:20px"><div class="row" data-state="warn"><div class="lead"><span class="check"></span></div>
<div><div class="t">Send the headcount</div><div class="m"><span class="state warn">Changed just now</span> {SEP} the due date moved to Thu, Nov 5 on your phone</div></div>
<div class="acts"><a class="link">See the change</a></div></div></div>'''
many = '<div class="panel" style="margin-top:20px"><div class="group">Look over <span class="n">96</span></div>' + ''.join(
    f'<div class="row"><div class="lead">{ic("inbox")}</div><div><div class="t">{t}</div><div class="m">{m}</div></div><div class="acts"><a class="btn secondary sm">Look over</a></div></div>'
    for t, m in [("12 things Reginald found in your mail", "9 to-dos and 3 notes · from 7 people"),
                 ("Mail the unclaimed property claim forms",
                  f"To-do · due Fri, Nov 6 {SEP} claim 4471902, to P.O. Box 1004, Springfield {SEP} from <a class='link'>Unclaimed property claim</a>"),
                 ("Confirmar la reserva del salón para el viernes 🎉", f"To-do · from Lucía Ferrer {SEP} {side(3)}")]) \
    + '<div class="showmore">Show 93 more</div></div>'


def sheet_block(label, html):
    return f'<div style="margin-top:36px"><div class="group" style="padding:0 0 10px">{label}</div>{html}</div>'


page("today-states", "Today, its states",
     '<div class="ph"><div><h1>Today: its states</h1><div class="sub">The same page in each state a real install meets</div></div></div>'
     + sheet_block("All clear (brand moment)", clear) + sheet_block("Loading (skeleton at row height, no shift)", loading)
     + sheet_block("One account of three needs you", failing) + sheet_block("Offline", offline)
     + sheet_block("The side filter opened: one control, long names end in an ellipsis with the full name on hover", '''<div class="card" style="max-width:360px;box-shadow:var(--shadow-pop);padding:8px"><div class="group" style="padding:8px 10px">Show one side</div><div style="display:flex;gap:10px;align-items:center;height:40px;padding:0 10px;border-radius:8px;background:var(--accent-soft);font-weight:600"><span class="dot "></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="All sides">All sides</span>✓</div><div style="display:flex;gap:10px;align-items:center;height:40px;padding:0 10px;border-radius:8px;"><span class="dot s1"></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="Personal">Personal</span></div><div style="display:flex;gap:10px;align-items:center;height:40px;padding:0 10px;border-radius:8px;"><span class="dot s2"></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="Northwind Clinic">Northwind Clinic</span></div><div style="display:flex;gap:10px;align-items:center;height:40px;padding:0 10px;border-radius:8px;"><span class="dot s3"></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="Harborview Community Support Partnership Incorporated">Harborview Community Support Partnership Incorporated</span></div><div style="display:flex;gap:10px;align-items:center;height:40px;padding:0 10px;border-radius:8px;"><span class="dot s4"></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="Willowbrook Handmade Ceramics and Garden Supply Cooperative">Willowbrook Handmade Ceramics and Garden Supply Cooperative</span></div><div style="display:flex;gap:10px;align-items:center;height:40px;padding:0 10px;border-radius:8px;"><span class="dot s5"></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="Lantern Row Studio">Lantern Row Studio</span></div></div>''')
     + sheet_block("Changed somewhere else (saves merge)", conflict) + sheet_block("100+ items, long titles, other languages", many))
print("today pages written")

# ---------- To-dos and questions ----------
def todo(t, m, state=None, q=False, act=""):
    lead = '<span class="q">?</span>' if q else '<span class="check"></span>'
    st = f' data-state="{state}"' if state else ''
    return (f'<div class="row"{st}><div class="lead">{lead}</div><div><div class="t">{t}</div><div class="m">{m}</div></div>'
            f'<div class="acts">{act}<a class="more" aria-label="More for {t}">{ic("more")}</a></div></div>')


todos = f'''
<div class="ph"><div><h1>To-dos and questions</h1><div class="sub"><b>12 open</b> · 1 overdue · 2 due today</div></div></div>
<div class="tabs"><a class="on">To-dos<span class="n">10</span></a><a>Questions<span class="n">2</span></a><a>Done<span class="n">31</span></a></div>
<div class="filters"><span class="chip"><span class="k">Who</span><span class="v">Everyone</span>{ic("chevron", "i s16")}</span><span class="chip"><span class="k">Side</span><span class="v">All four</span>{ic("chevron", "i s16")}</span></div>
<div class="panel" style="margin-top:16px">
 <div class="inlineadd"><span class="plus">{ic("plus")}</span>Add a to-do… try "call the landlord by Friday"</div>
 <div class="group danger">Overdue <span class="n">1</span></div>
 {todo("Send the venue list", f'<span class="state danger">Due Mon, Nov 2</span> {SEP} Maya Okafor asked {SEP} {side(2)}', "danger")}
 <div class="group">Today <span class="n">2</span></div>
 {todo("Get a catering quote", f'<span class="state warn">Due today</span> {SEP} from Theo Brandt\'s email {SEP} {side(1)}')}
 {todo("Take the tablets", f'Due today, 9:00 PM {SEP} repeats every day {SEP} {side(0)}')}
 <div class="group">Coming up <span class="n">5</span></div>
 {todo("Mail the claim forms", f'Due Fri, Nov 6 {SEP} claim 4471902 {SEP} {side(0)}')}
 {todo("Bring the floor plan", f'Due Tue, Nov 10 {SEP} <b>Needs an owner</b> {SEP} {side(2)}', act='<a class="btn secondary sm">Pick an owner</a>')}
 {todo("Book the fitting for the wingback chair", f'Due Thu, Nov 12 {SEP} {side(2)}')}
 <div class="showmore">Show 2 more coming up</div>
 <div class="group">Waiting on others <span class="n">2</span></div>
 {todo("Revised offsite budget", f'Theo Brandt · asked Oct 26, nothing back yet {SEP} {side(1)}', act='<a class="btn secondary sm">Nudge</a>')}
 {todo("Signed lease for the studio", f'Landlord Example · promised by Oct 30 {SEP} {side(3)}')}
 <div class="closing">{ic("calendar", "i s16")}2 to-dos need a date <a class="link">Give them dates</a></div>
</div>
<div class="sub" style="font-size:13px;margin-top:12px">Questions look like this: {'<span class="q" style="display:inline-grid;vertical-align:middle">?</span>'} a question to answer, never a box to tick.</div>'''
page("todos", "To-dos and questions", todos, on="todos", tab="work")

# ---------- Schedule, three calendars ----------
cal = [("Home calendar", "robin@example.com", "c1", "var(--cal-1)"), ("Clinic calendar", "robin@northwind.example", "c2", "var(--cal-2)"),
       ("Studio calendar", "studio@calloway.example", "c3", "var(--cal-3)")]
legend = ''.join(f'<span class="chip on" style="background:var(--surface-sunk);color:var(--text)"><span class="dot" style="background:{c}"></span>{n}</span>' for n, a, k, c in cal)
days = ["Mon 26", "Tue 27", "Wed 28", "Thu 29", "Fri 30"]
ents = {0: [(9, 1.0, "c2", "Team huddle", "Room 2")], 1: [(13, 1.5, "c3", "Fitting appointment", "Studio")],
        2: [(14.5, .5, "c3", "Venue walk-through", "Room 4", "clash"), (14.75, .75, "c2", "Budget check-in", "Room 2", "clash"), (18, 1.5, "c1", "Choir practice", "St Anne's hall")],
        3: [(10, 1.0, "c2", "Quarterly review", "In 2 calendars")], 4: [(8, .5, "c1", "Dentist", "Main St")]}
def fmt(h):
    hh = int(h); mm = int(round((h - hh) * 60)); ap = "AM" if hh < 12 else "PM"; hh = hh if hh <= 12 else hh - 12
    return f"{hh}:{mm:02d} {ap}"


cols = ''
for d, name in enumerate(days):
    blocks = ''
    for e in ents.get(d, []):
        st, dur, k, tt, pl = e[:5]
        clash = len(e) > 5
        top_px = (st - 8) * 64
        left = '0' if not clash else ('0' if tt.startswith("Venue") else '50%')
        width = '100%' if not clash else '50%'
        blocks += (f'<div class="calev {k}{" clash" if clash else ""}" style="top:{top_px}px;height:{max(dur * 64, 48)}px;left:{left};width:calc({width} - 4px)">'
                   f'<b>{tt}</b><span>{fmt(st)} · {pl}</span></div>')
    now = '<div class="now" style="top:410px"></div>' if d == 2 else ''
    cols += f'<div class="day{" today" if d == 2 else ""}"><div class="dh">{name}</div><div class="dg">{blocks}{now}</div></div>'
hours = ''.join(f'<div class="hr">{h if h <= 12 else h - 12} {"AM" if h < 12 else "PM"}</div>' for h in range(8, 20))
allday = '<div class="allday"><span class="ad-l">All day</span><span class="adchip"><span class="dot" style="background:var(--cal-2)"></span>Due: revised budget</span><span class="adchip more">+2 more</span></div>'
sched = f'''
<div class="ph"><div><h1>Schedule</h1><div class="sub">This week · <b>1 clash</b> on Wednesday</div></div><div class="spacer"></div>
<a class="btn secondary sm">Today</a><a class="btn primary sm">{ic("plus", "i s16")}Add to schedule</a></div>
<div class="filters"><span class="chip on">Week</span><span class="chip">Day</span><span class="chip">Month</span><span class="chip">Timeline</span><span class="spacer"></span>{legend}</div>
<div class="panel cal" style="margin-top:16px">{allday}<div class="grid"><div class="hours"><div class="dh"></div>{hours}</div>{cols}</div></div>
<div class="sub" style="font-size:13px;margin-top:12px">Each calendar keeps its colour everywhere: here, on Today and in Came in. The same invitation in two calendars shows once, marked "In 2 calendars".</div>'''
page("schedule", "Schedule", sched, on="sched")

# ---------- Settings › Connections, three accounts, one failing ----------
def part(icon, what, sub, dot, last):
    return (f'<div class="part"><span class="lead">{ic(icon)}</span><div><div>{what}</div><div class="pm">{sub}</div></div>'
            f'<span class="pv"><span class="dot {dot}"></span>{last}</span><span class="pm">Private</span><a class="more" aria-label="More for {what}">{ic("more")}</a></div>')


def acct(addr, service, sides, parts, fail=False):
    chips = ''.join(f'<span class="sidechip"><span class="dot {s}"></span>{l}</span>' for l, s in sides)
    status = ('<span class="state danger"><span class="dot danger"></span>Needs sign-in</span>' if fail else '<span class="state ok"><span class="dot"></span>Connected</span>')
    act = '<a class="btn primary sm">Sign in again</a>' if fail else '<a class="btn secondary sm">Choose what to read</a>'
    return (f'<div class="acct{" fail" if fail else ""}"><div class="hd"><div class="av">{ic("inbox")}</div><div style="min-width:0"><div class="nm">{addr}</div>'
            f'<div class="sv">{service} {SEP} {status}</div><div class="sv" style="margin-top:6px">For {chips} <a class="link" style="font-size:13px">Change</a></div></div><div class="acts" style="display:flex;gap:8px">{act}<a class="more" aria-label="More for {addr}">{ic("more")}</a></div></div>{parts}</div>')


conn = f'''
<div class="crumb">Settings {ic("chevron", "i s16")}</div>
<div class="ph"><div><h1>Connections</h1><div class="sub">The mail, calendars and folders Reginald reads. Each one is read only for the sides you pick.</div></div><div class="spacer"></div><a class="btn secondary sm">{ic("plus", "i s16")}Add a connection</a></div>
<div class="set"><div class="setnav"><div class="h">You</div><a>Profile</a><a>Appearance</a><div class="h">Assistant</div><a>AI and spending</a><a class="on">Connections</a><a>Add-ons</a><div class="h">Your data</div><a>Your sides</a><a>Backups</a><a>Lists</a><div class="h">More</div><a>Notices</a><a>Advanced</a></div>
<div>
<div class="banner danger" style="margin-top:0"><span class="dot danger"></span><div class="tx"><b>studio@calloway.example needs you.</b> It asked to sign in again at 10:51 AM, so nothing from it has been read since. The other two accounts are fine.</div></div>
{acct("studio@calloway.example", "Example mail", [("Calloway Upholstery", "s3"), ("Lantern Row Studio", "s4")],
      part("inbox", "Inbox", "Mail sent to you", "danger", "Not read since 10:51 AM") + part("calendar", "Calendar", "Studio calendar", "danger", "Not read since 10:51 AM"), fail=True)}
{acct("robin@northwind.example", "Example mail", [("Northwind Clinic", "s2")],
      part("inbox", "Inbox", "Mail sent to you", "", "Read 2 min ago") + part("send", "Sent mail", "What you promised", "", "Read 2 min ago") + part("calendar", "Calendar", "Clinic calendar", "", "Read 2 min ago"))}
{acct("robin@example.com", "Example mail", [("Personal", "s1")],
      part("inbox", "Inbox", "Mail sent to you", "", "Read 5 min ago") + part("calendar", "Calendar", "Home calendar", "", "Read 5 min ago"))}
</div></div>'''
page("connections", "Connections", conn, on="settings",
     status='<span class="status"><span class="dot danger"></span>1 account needs you</span>', tab="more")

# ---------- A person's page ----------
person = f'''
<div class="crumb">People {ic("chevron", "i s16")}</div>
<div class="ph"><div style="display:flex;gap:16px;align-items:center"><span class="avatar" style="width:56px;height:56px;font-size:18px">MO</span>
<div><h1>Maya Okafor</h1><div class="sub">Customer at Calloway Upholstery · a friend</div></div></div><div class="spacer"></div>
<a class="btn secondary sm">Draft a message</a><a class="btn primary sm">{ic("plus", "i s16")}Add a to-do for Maya</a><a class="more">{ic("more")}</a></div>
<div class="tabs"><a class="on">Overview</a><a>Open with Maya<span class="n">3</span></a><a>Activity</a></div>
<div class="layout">
<div>
<div class="panel"><div class="group">Open with Maya <span class="n">3</span></div>
{todo("Send the venue list", f'<span class="state danger">Due Mon, Nov 2</span> {SEP} she asked {SEP} {side(2)}', "danger")}
{todo("Wingback chair fabric: linen or velvet?", f'Question for Maya {SEP} asked Oct 24', q=True)}
{todo("Return the swatch book", f'Maya owes you {SEP} since Oct 20')}
</div>
<div class="panel" style="margin-top:16px"><div class="group">Activity</div>
<div class="row"><div class="lead">{ic("inbox")}</div><div><div class="t" style="font-weight:500">She emailed you <b>"Venue list"</b></div><div class="m">Today, 1:22 PM</div></div><div></div></div>
<div class="row"><div class="lead">{ic("check")}</div><div><div class="t" style="font-weight:500">Reginald added the to-do <b>Send the venue list</b></div><div class="m">Today, 1:23 PM</div></div><div></div></div>
<div class="row"><div class="lead">{ic("calendar")}</div><div><div class="t" style="font-weight:500">You met at <b>Fitting appointment</b></div><div class="m">Tue, Oct 27</div></div><div></div></div>
<div class="closing"><a class="link">Show all activity</a></div></div>
</div>
<div class="rail"><div class="card"><h3>Details<a class="act link">Edit</a></h3>
<dl class="dl"><dt>Email</dt><dd title="maya.okafor.upholstery-orders@example.com">maya.okafor…@example.com</dd><dt></dt><dd>maya@example.com</dd>
<dt>Phone</dt><dd>+1 555 0142</dd><dt>Sides</dt><dd><span class="sidechip"><span class="dot s3"></span>Calloway Upholstery</span></dd>
<dt>Birthday</dt><dd>Mar 14</dd><dt>Last contact</dt><dd>Today, by email</dd></dl></div>
<div class="card"><h3>Ask about Maya</h3><div class="input" style="color:var(--text-subtle);font-size:14px">Ask anything about Maya</div></div></div>
</div>'''
page("person", "Maya Okafor", person, on="people", tab="more")

# ---------- How Reginald is doing ----------
def tile(label, num, delta, good, spark):
    col = "var(--ok)" if good else "var(--danger)"
    bars = ''.join(f'<span style="height:{h}px;background:{"var(--accent)" if i == len(spark) - 1 else "var(--accent-soft)"}"></span>' for i, h in enumerate(spark))
    return (f'<div class="card" style="margin:0"><div style="font-size:13px;color:var(--text-muted)">{label}</div><div style="font:600 32px/40px var(--font-ui);margin-top:6px">{num}</div>'
            f'<div style="display:flex;align-items:end;justify-content:space-between"><span style="font-size:13px;font-weight:600;color:{col}">{delta}</span><span class="spark">{bars}</span></div></div>')


quality = f'''
<div class="crumb">You {ic("chevron", "i s16")}</div>
<div class="ph"><div><h1>How Reginald is doing</h1><div class="sub"><b>Kept on time is up 9 points, to 89%.</b> 2 false alerts to look at. Last 4 weeks, against the 4 before.</div></div><div class="spacer"></div><span class="chip"><span class="k">Period</span>Last 4 weeks{ic("chevron", "i s16")}</span></div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:24px">
{tile("Promises kept on time", "89%", "▲ 9 points", True, [20, 23, 26, 30])}{tile("Promises found", "47", "▲ 4", True, [18, 24, 22, 30])}
{tile("False alerts", "2", "▲ 1, look at these", False, [4, 12, 4, 12])}{tile("Your time looking over", "10 min", "▼ 3 min a week", True, [30, 27, 22, 20])}</div>
<div class="layout"><div class="panel"><div class="group">Week by week</div>
<table class="t"><tr><th>Week</th><th class="num">Found</th><th class="num">Kept on time</th><th class="num">False alerts</th><th class="num">Looking over</th></tr>
<tr><td>Oct 5–11</td><td class="num">9</td><td class="num">82%</td><td class="num">0</td><td class="num">12 min</td></tr>
<tr><td>Oct 12–18</td><td class="num">12</td><td class="num">86%</td><td class="num">1</td><td class="num">11 min</td></tr>
<tr><td>Oct 19–25</td><td class="num">11</td><td class="num">90%</td><td class="num">0</td><td class="num">9 min</td></tr>
<tr class="cur"><td><b>Oct 26 – now</b></td><td class="num">15</td><td class="num">94%</td><td class="num">1</td><td class="num">8 min</td></tr></table>
<div class="closing">Nothing to report yet on repeated corrections, things it couldn't do, or replays.</div></div>
<div class="rail"><div class="card"><h3>Mistakes to look at <span class="group" style="padding:0"><span class="n">2</span></span></h3>
<div class="ci" style="grid-template-columns:8px 1fr auto"><span class="dot danger"></span><div><div class="tt">"Order confirmed" read as a promise</div><div class="mm">False alert · Oct 29</div></div><a class="btn secondary sm">Review</a></div>
<div class="ci" style="grid-template-columns:8px 1fr auto"><span class="dot danger"></span><div><div class="tt">A newsletter's date taken as a deadline</div><div class="mm">False alert · Oct 27</div></div><a class="btn secondary sm">Review</a></div></div>
<div class="card"><h3>Your own count</h3><div style="font-size:13px;color:var(--text-muted)">Check a sample by hand to keep these numbers honest. <a class="link">Count a sample</a></div></div></div></div>'''
page("quality", "How Reginald is doing", quality, on="settings", tab="more")

# ---------- Setup: wizard pages ----------
def wizard(name, title, steps_on, body, primary="Continue"):
    steps = ["You", "What it's for", "Your AI account", "Mail and calendar", "Your promises", "Backups", "People", "Ready"]
    rail = ''.join(f'<a class="{"done" if i < steps_on else ("on" if i == steps_on else "")}"><span class="c">{"✓" if i < steps_on else i + 1}</span>{s}</a>' for i, s in enumerate(steps))
    html = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title>'
            f'<link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="m46.css"></head><body>'
            f'<div class="wtop"><div class="word"><img class="logo-light" src="brand/thimbleby-clean.svg" alt=""><img class="logo-dark" src="brand/thimbleby-dark.svg" alt="">Thimbleby</div>'
            f'<div class="spacer"></div><span style="font-size:13px;color:var(--text-muted)" class="hide-phone">About 10 minutes · you can stop and come back</span><a class="btn quiet sm">Finish later</a></div>'
            f'<div class="wiz"><nav class="rail-steps">{rail}</nav><div>{body}</div></div>'
            f'<div class="wfoot"><div class="in"><div></div><div class="bar"><a class="btn secondary">Back</a><span class="spacer"></span><a class="btn quiet">I\'ll do this later</a><a class="btn primary">{primary}</a></div></div></div></body></html>')
    (OUT / f"{name}.html").write_text(html)


wizard("setup-ai", "Your AI account", 2, f'''
<div class="eyebrow">Step 3 of 8</div><h1 style="margin-top:6px">Which AI should Reginald use?</h1>
<p class="lead2">Reginald needs an AI service to read your mail and notes. You pay the service directly, and Reginald asks before anything costs more than $0.10.</p>
<div class="cards3"><div class="choice on"><span class="tag">Recommended</span><div class="ct">Anthropic</div><div class="cd">Pay as you go on your own account.</div></div>
<div class="choice"><div class="ct">OpenAI</div><div class="cd">Pay as you go on your own account.</div></div>
<div class="choice"><div class="ct">Something else</div><div class="cd">Another service, or one on this computer.</div></div></div>
<h2 class="sec" style="margin-top:32px">Connect your Anthropic account</h2><div class="help" style="font-size:14px">Three steps, about two minutes.</div>
<div class="steps"><div class="st done"><span class="num">✓</span><div><div style="font-weight:600">Sign in or create an account</div><div class="help" style="margin:0">Done</div></div><a class="link">Open again</a></div>
<div class="st"><span class="num">2</span><div><div style="font-weight:600">Add a little credit</div><div class="help" style="margin:0">$5 lasts most people a month or more</div></div><a class="btn secondary sm">Open {ic("external", "i s16")}</a></div>
<div class="st"><span class="num">3</span><div><div style="font-weight:600">Make a key and paste it below</div><div class="help" style="margin:0">It's kept privately on this computer</div></div><a class="link">Open</a></div></div>
<div class="field"><label>Your key</label><div class="input" style="color:var(--text-subtle)">Paste the key that starts with "sk-ant-"</div><div class="help">Checked as soon as you paste it.</div></div>''')

wizard("setup-mail", "Mail and calendar", 3, f'''
<div class="eyebrow">Step 4 of 8</div><h1 style="margin-top:6px">Mail and calendar</h1>
<p class="lead2">Connect each account you use. Then say which sides each one is for, so a business never sees personal mail.</p>
{acct("robin@example.com", "Example mail", [("Personal", "s1")], "")}
{acct("robin@northwind.example", "Example mail", [("Northwind Clinic", "s2")], "")}
{acct("studio@calloway.example", "Example mail", [("Calloway Upholstery", "s3"), ("Lantern Row Studio", "s4")], "")}
<div style="margin-top:16px"><a class="btn secondary sm">{ic("plus", "i s16")}Connect another account</a></div>
<div class="help" style="margin-top:16px">Each account's inbox, sent mail and calendar are read. You can change what is read in Settings › Connections.</div>''')
print("all pages written")

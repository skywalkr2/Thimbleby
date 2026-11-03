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
            ("follow", "send", "Follow-ups", "2"), ("todos", "check", "To-dos & questions", "12"), ("sched", "calendar", "Schedule", "")]
    rec = [("people", "users", "People", ""), ("files", "folder", "Files", ""), ("notes", "book", "Notes", ""), ("know", "layers", "Knowledge", "")]
    def item(k, i, l, c): return f'<a class="item{" on" if k == on else ""}">{ic(i)}<span class="lbl">{l}</span><span class="count">{c}</span></a>'
    def side(l, s): return f'<a class="item" title="{l}"><span class="side-dot"><span class="dot {s}"></span></span><span class="lbl">{l}</span></a>'
    return ('<nav class="nav">' + ''.join(item(*m) for m in main) + '<div class="label">Your sides</div>' + ''.join(side(*s) for s in SIDES)
            + '<div class="label">Records</div>' + ''.join(item(*r) for r in rec) + '<div style="flex:1"></div>' + item("settings", "gear", "Settings", "") + '</nav>')


def top(status='<span class="status" aria-label="All good"><span class="dot"></span><span class="sl">All good</span></span>', primary=False):
    hand = f'<a class="btn {"primary" if primary else "secondary"} sm">{ic("plus", "i s16")}Hand something in</a>'
    return ('<div class="top"><div class="word"><img class="logo-light" src="brand/thimbleby-clean.svg" alt=""><img class="logo-dark" src="brand/thimbleby-dark.svg" alt="">Thimbleby</div>'
            f'<div class="search">{ic("search", "i s16")}Search or ask Reginald<kbd>/</kbd></div><div class="spacer"></div>{status}{hand}'
            f'<span class="iconbtn s">{ic("search")}</span><span class="iconbtn help">{ic("help")}</span><span class="avatar">RC</span></div>')


def tabbar(on="today"):
    t = [("today", "home", "Today"), ("work", "check", "To-dos"), ("plus", "plus", ""), ("sched", "calendar", "Schedule"), ("more", "menu", "More")]
    out = ''
    for k, i, l in t:
        if k == "plus":
            out += f'<a aria-label="Hand something in"><span class="plus">{ic("plus")}</span></a>'
        else:
            out += f'<a class="{"on" if k == on else ""}">{ic(i)}{l}</a>'
    return f'<div class="tabbar">{out}</div>'


import re as _re


def _meta(m):
    inner = m.group(2)
    parts = [p.strip() for p in inner.split(SEP)]
    if len(parts) < 2:
        return m.group(0)
    return m.group(1) + ''.join(f'<span class="mp">{p}</span>' for p in parts) + '</div>'


def page(name, title, body, on="today", status=None, primary_in_header=False, tab="today"):
    body = _re.sub(r'(<div class="m">)(.*?)</div>', _meta, body)
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
  <div class="m"><b>Today 2:30–3:00 PM</b> {SEP} <span class="side"><span class="dot" style="background:var(--cal-3)"></span>Studio calendar and</span><span class="side"><span class="dot" style="background:var(--cal-2)"></span>Clinic calendar</span> {SEP} <b>30 min short</b></div></div>
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
 <div class="card"><h3>Today's schedule<a class="act link">Open</a></h3>
  <div class="ev c3"><div class="tm">2:30 PM</div><div><div class="tt">Venue walk-through</div><div class="mm"><span class="state danger" style="font-size:12.5px">{ic("alert", "i s16")}Clash</span> <span style="color:var(--text-muted)">· Studio calendar</span></div></div></div>
  <div class="ev c2"><div class="tm">2:45 PM</div><div><div class="tt">Budget check-in</div><div class="mm"><span class="state danger" style="font-size:12.5px">{ic("alert", "i s16")}Clash</span> <span style="color:var(--text-muted)">· Clinic calendar</span></div></div></div>
  <div class="ev c1"><div class="tm">6:00 PM</div><div><div class="tt">Choir practice</div><div class="mm">St Anne's hall · Home calendar</div></div></div>
 </div>
 <div class="card"><h3>Came in <span class="group" style="padding:0"><span class="n">3</span></span><a class="act link">See all</a></h3>
  <div class="ci"><span class="dot s3"></span><div><div class="tt">Venue list</div><div class="mm">Maya Okafor · Studio inbox</div></div><span class="tm">1:22 PM</span></div>
  <div class="ci"><span class="dot s2"></span><div><div class="tt">Catering quote</div><div class="mm">Theo Brandt · Clinic inbox</div></div><span class="tm">10:22 AM</span></div>
  <a class="link" style="font-size:13px">1 more, from this morning</a>
 </div>
</div>'''

today_head = f'''
<div class="ph"><div><h1>Good afternoon, Robin</h1><div class="sub">Wednesday, October 28 · <b>4 things need you</b>, starting with one decision</div></div></div>
<div class="filters"><span class="chip"><span class="k">Side</span><span class="v">All sides</span>{ic("chevron", "i s16")}</span><span class="chip"><span class="k">Showing</span>Needs you</span></div>'''

page("today", "Today", today_head + f'<div class="layout">{today_main}{rail}</div>')

# Today, the review opened (the inset)
opened = today_main.replace('<a class="btn primary sm">This is me</a>', '<a class="btn secondary sm">This is me</a>').replace(
    '<div class="acts"><a class="btn secondary sm">Look over</a></div></div>\n <div class="row"><div class="lead">' + ic("send"),
    f'<div class="acts"><a class="btn quiet sm fold">Fold {ic("chevron", "i s16 up")}</a></div></div>'
    '<div class="inset">'
    f'<div class="it"><div><div class="t">Send the venue list</div><div class="m">To-do · due Fri, Oct 30 · from Maya Okafor\'s email <a class="link">Venue list</a></div></div><a class="btn quiet sm">Not right</a></div>'
    f'<div class="it"><div><div class="t">Get a catering quote</div><div class="m">To-do · from Theo Brandt\'s email <a class="link">Catering quote</a></div></div><a class="btn quiet sm">Not right</a></div>'
    f'<div class="it"><div><div class="t">Mail the claim forms</div><div class="m">To-do · due Fri, Oct 30 · claim 4471902, to the State Treasurer · from <a class="link">Unclaimed property</a></div></div><a class="btn quiet sm">Not right</a></div>'
    f'<div class="it"><div><div class="t">The offsite is on a Friday</div><div class="m">Note · filed under Calloway Upholstery</div></div><a class="btn quiet sm">Not right</a></div>'
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
failing = f'''<div class="banner danger"><span class="bi">{ic("alert")}</span><div class="tx"><b>1 of 3 accounts needs you.</b> studio@calloway.example asked to sign in again, so its mail and calendar haven't been read since 10:51 AM.</div><a class="btn primary sm">Sign in again</a></div>'''
offline = f'''<div class="banner"><span class="bi">{ic("refresh")}</span><div class="tx"><b>You're offline.</b> Everything is saved on this computer. Mail last came in at 10:42 AM.</div><a class="btn secondary sm">Try now</a></div>'''
conflict = f'''<div class="panel" style="margin-top:20px"><div class="row" data-state="warn"><div class="lead" style="color:var(--warn)">{ic("refresh")}</div>
<div><div class="t">Send the headcount</div><div class="m"><span class="state warn">Changed on your phone just now</span> {SEP} due <b>Thu, Nov 5</b> (was Tue, Nov 3). Your edit here is kept.</div></div>
<div class="acts"><a class="link">See the change</a></div></div></div>'''
many = '<div class="panel" style="margin-top:20px"><div class="group">Look over <span class="n">128</span></div>' + ''.join(
    f'<div class="row"><div class="lead">{ic("inbox")}</div><div><div class="t">{t}</div><div class="m">{m}</div></div><div class="acts"><a class="btn secondary sm">Look over</a></div></div>'
    for t, m in [("12 things Reginald found in your mail", "9 to-dos and 3 notes · from 7 people"),
                 ("Mail the unclaimed property claim forms",
                  f"To-do · due Fri, Oct 30 {SEP} claim 4471902, to P.O. Box 1004, Springfield {SEP} from <a class='link'>Unclaimed property claim</a>"),
                 ("Confirmar la reserva del salón para el viernes 🎉", f"To-do · from Lucía Ferrer {SEP} {side(3)}")]) \
    + '<div class="showmore">Show 125 more</div></div>'


savefail = f'''<div class="banner danger"><span class="bi">{ic("alert")}</span><div class="tx"><b>"Pay the deposit" wasn't saved.</b> The app couldn't write to its folder. Nothing is lost: your change is kept here until it saves.</div><a class="btn secondary sm">Try again</a></div>'''
filtered = f'''<div class="panel"><div class="empty" style="padding:36px 24px"><h2 style="font-size:20px;line-height:26px">Nothing for Lantern Row Studio today</h2><p>3 things on your other sides need you.</p><a class="btn secondary sm">Show all sides</a></div></div>'''


def sheet_block(label, html):
    return f'<div style="margin-top:36px"><div class="group" style="padding:0 0 10px">{label}</div>{html}</div>'


FAIL_STATUS = f'<span class="status warnpill" aria-label="1 account needs you">{ic("alert", "i s16")}<span class="sl">1 account needs you</span><span class="sls">1</span></span>'
page("today-states", "Today, its states",
     '<div class="ph"><div><h1>Today: its states</h1><div class="sub">The same page in each state a real install meets</div></div></div>'
     + sheet_block("All clear (brand moment)", clear) + sheet_block("Loading (skeleton at row height, no shift)", loading)
     + sheet_block("One account of three needs you", failing) + sheet_block("Offline", offline)
     + sheet_block("The side filter opened, with a fifth side that has a long name", '''<span class="chip" style="margin-bottom:8px"><span class="k">Side</span><span class="v">All sides</span></span><div class="card" style="max-width:360px;box-shadow:var(--shadow-pop);padding:8px;margin-top:8px"><div class="group" style="padding:8px 10px">Show one side</div><div style="display:flex;gap:10px;align-items:center;height:40px;padding:0 10px;border-radius:8px;background:var(--accent-soft);font-weight:600"><span class="dot "></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="All sides">All sides</span>✓</div><div style="display:flex;gap:10px;align-items:center;height:40px;padding:0 10px;border-radius:8px;"><span class="dot s1"></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="Personal">Personal</span></div><div style="display:flex;gap:10px;align-items:center;height:40px;padding:0 10px;border-radius:8px;"><span class="dot s2"></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="Northwind Clinic">Northwind Clinic</span></div><div style="display:flex;gap:10px;align-items:center;height:40px;padding:0 10px;border-radius:8px;"><span class="dot s3"></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="Calloway Upholstery">Calloway Upholstery</span></div><div style="display:flex;gap:10px;align-items:center;height:40px;padding:0 10px;border-radius:8px;"><span class="dot s4"></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="Lantern Row Studio">Lantern Row Studio</span></div><div style="display:flex;gap:10px;align-items:center;height:40px;padding:0 10px;border-radius:8px;"><span class="dot s5"></span><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="Harborview Community Support Partnership Incorporated">Harborview Community Support Partnership Incorporated</span></div></div>''')
     + sheet_block("A save that failed", savefail) + sheet_block("A side filtered to nothing", filtered)
     + sheet_block("Changed somewhere else (saves merge)", conflict) + sheet_block("100+ items, long titles, other languages", many), status=FAIL_STATUS)
print("today pages written")

# ---------- To-dos and questions ----------
def todo(t, m, state=None, q=False, act=""):
    lead = '<span class="q">?</span>' if q else '<span class="check"></span>'
    st = f' data-state="{state}"' if state else ''
    return (f'<div class="row"{st}><div class="lead">{lead}</div><div><div class="t">{t}</div><div class="m">{m}</div></div>'
            f'<div class="acts">{act}<a class="more" aria-label="More for {t}">{ic("more")}</a></div></div>')


todos = f'''
<div class="ph"><div><h1>To-dos and questions</h1><div class="sub"><b>12 open</b> · 1 overdue · 2 due today</div></div></div>
<div class="tabs" style="max-width:880px"><a class="on">To-dos<span class="n">10</span></a><a>Questions<span class="n">2</span></a><a>Done<span class="n">31</span></a></div>
<div class="filters"><span class="chip"><span class="k">Who</span><span class="v">Everyone</span>{ic("chevron", "i s16")}</span><span class="chip"><span class="k">Side</span><span class="v">All sides</span>{ic("chevron", "i s16")}</span></div>
<div class="panel" style="margin-top:16px;max-width:880px">
 <div class="inlineadd"><span class="plus">{ic("plus")}</span><span><span class="hide-phone">Add a to-do… try "call the landlord by Friday"</span><span class="show-phone">Add a to-do…</span></span></div>
 <div class="group danger">Overdue <span class="n">1</span></div>
 {todo("Pay the deposit for the venue", f'<span class="state danger">{ic("alert", "i s16")}Due Mon, Oct 26</span> {SEP} Maya Okafor asked {SEP} {side(2)}', "danger")}
 <div class="group">Today <span class="n">2</span></div>
 {todo("Get a catering quote", f'<span class="state warn">Due today</span> {SEP} from Theo Brandt\'s email {SEP} {side(1)}')}
 {todo("Take the tablets", f'<span class="state warn">Due today, 9:00 PM</span> {SEP} repeats every day {SEP} {side(0)}')}
 <div class="group">Coming up <span class="n">5</span></div>
 {todo("Mail the claim forms", f'Due Fri, Oct 30 {SEP} claim 4471902 {SEP} {side(0)}')}
 {todo("Bring the floor plan", f'Due Tue, Nov 3 {SEP} <b>Needs an owner</b> {SEP} {side(2)}', act='<a class="btn secondary sm">Pick an owner</a>')}
 {todo("Book the fitting for the wingback chair", f'Due Thu, Nov 5 {SEP} {side(2)}')}
 <div class="showmore">Show 2 more coming up</div>
 <div class="group">Waiting on others <span class="n">2</span></div>
 {todo("Revised offsite budget", f'Theo Brandt · asked Oct 26, nothing back yet {SEP} {side(1)}', act='<a class="btn secondary sm">Nudge</a>')}
 {todo("Signed lease for the studio", f'Landlord Example · promised by Oct 30 {SEP} {side(3)}')}
 <div class="closing">{ic("calendar", "i s16")}2 to-dos need a date <a class="link">Give them dates</a></div>
</div>
'''
page("todos", "To-dos and questions", todos, on="todos", tab="work")

# ---------- Schedule, three calendars ----------
cal = [("Home calendar", "robin@example.com", "c1", "var(--cal-1)"), ("Clinic calendar", "robin@northwind.example", "c2", "var(--cal-2)"),
       ("Studio calendar", "studio@calloway.example", "c3", "var(--cal-3)")]
legend = ''.join(f'<span class="chip toggle" role="checkbox" aria-checked="true" title="{a}"><span class="tick" style="background:{c}">✓</span>{n}</span>' for n, a, k, c in cal)
days = ["Mon 26", "Tue 27", "Wed 28", "Thu 29", "Fri 30", "Sat 31", "Sun 1"]
ents = {0: [(9, 1.0, "c2", "Team huddle", "Room 2")], 1: [(13, 1.5, "c3", "Fitting appointment", "Studio")],
        2: [(18, 1.5, "c1", "Choir practice", "St Anne's hall")],
        3: [(10, 1.0, "c2", "Quarterly review", "In 2 calendars")], 4: [(8, .5, "c1", "Dentist", "Main St")], 5: [(10, 2, "c1", "Market with Sam", "Harbour Sq")]}
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
    if d == 2:
        blocks += (f'<div class="calclash" style="top:{6.5 * 64}px;min-height:{1.25 * 64}px"><div class="ch">{ic("alert", "i s16")}Clash</div>'
                   f'<div class="cr"><span class="dot" style="background:var(--cal-3)"></span>Venue walk‑through</div><div class="cr"><span class="dot" style="background:var(--cal-2)"></span>Budget check‑in</div></div>')
    now = '<div class="now" style="top:410px"></div>' if d == 2 else ''
    dn = name.split()[0] + (f' <span class="todaydot">{name.split()[1]}</span>' if d == 2 else " " + name.split()[1])
    cols += f'<div class="day{" today" if d == 2 else ""}{" we" if d >= 5 else ""}"><div class="dh">{dn}</div><div class="dg">{blocks}{now}</div></div>'
hours = ''.join(f'<div class="hr">{h if h <= 12 else h - 12} {"AM" if h < 12 else "PM"}</div>' for h in range(8, 20))
allday = '<div class="allday"><span class="ad-l">All day</span><span class="adchip"><span class="dot" style="background:var(--cal-2)"></span>Due: revised budget</span><span class="adchip more">+2 more</span></div>'
sched = f'''
<div class="ph"><div><h1>Schedule</h1><div class="sub">This week · <b>1 clash</b> on Wednesday</div></div><div class="spacer"></div>
<a class="btn secondary sm">Today</a><a class="btn primary sm hide-phone">{ic("plus", "i s16")}Add to schedule</a></div>
<div class="tabs"><a class="on">Week</a><a>Day</a><a>Month</a><a>Timeline</a></div>
<div class="filters"><span class="k" style="font-size:13px;color:var(--text-muted)">Calendars</span>{legend}</div>
<div class="panel cal hide-phone" style="margin-top:16px">{allday}<div class="grid"><div class="hours"><div class="dh"></div>{hours}</div>{cols}</div></div>
<div class="panel agenda show-phone" style="margin-top:16px"><div class="group">Wednesday, Oct 28 · today</div>
<div class="row"><div class="lead"><span class="dot" style="background:var(--cal-2)"></span></div><div><div class="t">Due: revised budget</div><div class="m">All day · Clinic calendar · and 2 more due this week</div></div><div></div></div>
<div class="row" data-state="danger"><div class="lead" style="color:var(--danger)">{ic("alert")}</div><div><div class="t">Clash · 30 min short</div><div class="m"><span class="dot" style="background:var(--cal-3)"></span>2:30 Venue walk-through</div><div class="m"><span class="dot" style="background:var(--cal-2)"></span>2:45 Budget check-in</div></div><div class="acts"><a class="btn secondary sm">Open both</a></div></div>
<div class="row"><div class="lead"><span class="dot" style="background:var(--cal-1)"></span></div><div><div class="t">Choir practice</div><div class="m">6:00–7:30 PM · St Anne's hall · Home calendar</div></div><div></div></div>
<div class="group">Thursday, Oct 29</div>
<div class="row"><div class="lead"><span class="dot" style="background:var(--cal-2)"></span></div><div><div class="t">Quarterly review</div><div class="m">10:00–11:00 AM · in 2 calendars</div></div><div></div></div>
<div class="group">Friday, Oct 30</div>
<div class="row"><div class="lead"><span class="dot" style="background:var(--cal-1)"></span></div><div><div class="t">Dentist</div><div class="m">8:00–8:30 AM · Main St · Home calendar</div></div><div></div></div>
<div class="group">Saturday, Oct 31</div>
<div class="row"><div class="lead"><span class="dot" style="background:var(--cal-1)"></span></div><div><div class="t">Market with Sam</div><div class="m">10:00 AM–12:00 PM · Harbour Sq · Home calendar</div></div><div></div></div>
<div class="group">Sunday, Nov 1</div><div class="closing" style="border-top:0">Nothing on Sunday</div></div>
'''
page("schedule", "Schedule", sched, on="sched", tab="sched")

# ---------- Settings › Connections, three accounts, one failing ----------
def part(icon, what, sub, dot, last):
    return (f'<div class="part"><span class="lead">{ic(icon)}</span><div><div>{what}</div><div class="pm">{sub}<span class="pv2"> · {last}</span></div></div>'
            f'<span class="pv"><span class="dot {dot}"></span>{last}</span><a class="more" aria-label="More for {what}">{ic("more")}</a></div>')


def acct(addr, service, sides, parts, fail=False, setup=False):
    chips = ''.join(f'<span class="sidechip"><span class="dot {s}"></span>{l}</span>' for l, s in sides)
    status = (f'<span class="state danger">{ic("alert", "i s16")}Needs sign-in since 10:51 AM</span>' if fail else f'<span class="state ok">{ic("check", "i s16")}Connected</span>')
    act = '<a class="btn primary sm">Sign in again</a>' if fail else ''
    return (f'<div class="acct{" fail" if fail else ""}"><div class="hd"><div class="av">{ic("inbox")}</div><div style="min-width:0"><div class="nm">{addr}</div>'
            f'<div class="sv">{service}{" and calendar" if setup else ""} {SEP} {status} {SEP} <span title="Only you can see what it reads">Private to you</span></div><div class="sv" style="margin-top:6px">For {chips} <a class="link" style="font-size:13px">Change</a></div></div><div class="acts" style="display:flex;gap:8px">{act}<a class="more" aria-label="More for {addr}">{ic("more")}</a></div></div>{parts}</div>')


conn = f'''
<div class="crumb">Settings {ic("chevron", "i s16")}</div>
<div class="ph"><div><h1>Connections</h1><div class="sub">The mail, calendars and folders Reginald reads. Each one is read only for the sides you pick.</div></div><div class="spacer"></div><a class="btn secondary sm">{ic("plus", "i s16")}Add a connection</a></div>
<span class="chip show-tablet" style="margin-top:16px"><span class="k">Section</span><span class="v">Connections</span>{ic("chevron", "i s16")}</span>
<div class="set"><div class="setnav"><div class="h">You</div><a>Profile</a><a>Appearance</a><div class="h">Assistant</div><a>AI and spending</a><a class="on">Connections</a><a>Add-ons</a><div class="h">Your data</div><a>Your sides</a><a>Backups</a><a>Lists</a><div class="h">More</div><a>Notices</a><a>Advanced</a></div>
<div>
{acct("studio@calloway.example", "Example mail", [("Calloway Upholstery", "s3"), ("Lantern Row Studio", "s4")],
      part("inbox", "Inbox", "Mail sent to you", "danger", "Not read since 10:51 AM") + part("calendar", "Calendar", "Studio calendar", "danger", "Not read since 10:51 AM"), fail=True)}
{acct("robin@northwind.example", "Example mail", [("Northwind Clinic", "s2")],
      part("inbox", "Inbox", "Mail sent to you", "", "Read 2 min ago") + part("send", "Sent mail", "What you promised", "", "Read 2 min ago") + part("calendar", "Calendar", "Clinic calendar", "", "Read 2 min ago"))}
{acct("robin@example.com", "Example mail", [("Personal", "s1")],
      part("inbox", "Inbox", "Mail sent to you", "", "Read 5 min ago") + part("calendar", "Calendar", "Home calendar", "", "Read 5 min ago"))}
</div></div>'''
page("connections", "Connections", conn, on="settings",
     status=FAIL_STATUS, tab="more")

# ---------- A person's page ----------
person = f'''
<div class="crumb">People {ic("chevron", "i s16")}</div>
<div class="ph"><div><h1>Maya Okafor</h1><div class="sub">Customer at Calloway Upholstery, and a friend</div></div><div class="spacer"></div>
<a class="btn secondary sm">Draft a message</a><a class="btn primary sm">{ic("plus", "i s16")}Add a to-do for Maya</a><a class="more">{ic("more")}</a></div>
<div class="tabs"><a class="on">Overview</a><a>Everything with Maya<span class="n">14</span></a><a>Files<span class="n">2</span></a></div>
<div class="layout">
<div>
<div class="panel"><div class="group">Open with Maya <span class="n">3</span></div>
{todo("Send the venue list", f'Due Fri, Oct 30 {SEP} she asked {SEP} {side(2)}')}
{todo("Wingback chair fabric: linen or velvet?", f'Question for Maya {SEP} asked Oct 24', q=True)}
{todo("Return the swatch book", f'<span class="state danger">{ic("alert", "i s16")}Maya owes you since Oct 20</span>', "danger")}
</div>
<div class="panel" style="margin-top:16px"><div class="group">Activity</div>
<div class="row"><div class="lead">{ic("inbox")}</div><div><div class="t" style="font-weight:500">She emailed you <b>"Venue list"</b></div><div class="m">Today, 1:22 PM</div></div><div></div></div>
<div class="row"><div class="lead">{ic("check")}</div><div><div class="t" style="font-weight:500">Reginald added the to-do <b>Send the venue list</b></div><div class="m">Today, 1:23 PM</div></div><div></div></div>
<div class="row"><div class="lead">{ic("calendar")}</div><div><div class="t" style="font-weight:500">You met at <b>Fitting appointment</b></div><div class="m">Tue, Oct 27</div></div><div></div></div>
<div class="closing"><a class="link">Show all activity</a></div></div>
</div>
<div class="rail"><div class="card"><div style="display:flex;gap:12px;align-items:center;margin-bottom:14px"><span class="avatar" style="width:48px;height:48px;font-size:16px">MO</span><div><div style="font-size:13px;color:var(--text-muted)">Last contact</div><div style="font-weight:600">Today, by email</div></div><a class="link" style="margin-left:auto;font-size:13px">Edit</a></div>
<dl class="dl"><dt>Work email</dt><dd class="wrap">maya.okafor.orders<wbr>@example.com</dd><dt>Home email</dt><dd>maya@example.com</dd>
<dt>Phone</dt><dd>+1 555 0142</dd><dt>Sides</dt><dd><span class="sidechip"><span class="dot s3"></span>Calloway Upholstery</span></dd>
<dt>Birthday</dt><dd>Mar 14</dd></dl></div>
<div class="card"><h3>Files from Maya <span class="group" style="padding:0"><span class="n">2</span></span><a class="act link">See all</a></h3>
<div class="ci" style="grid-template-columns:36px 1fr auto"><span class="ftag">PDF</span><div><div class="tt">Venue floor plan.pdf</div><div class="mm">From "Venue list" · today</div></div><span></span></div>
<div class="ci" style="grid-template-columns:36px 1fr auto"><span class="ftag">JPG</span><div><div class="tt">Fabric swatches.jpg</div><div class="mm">Oct 20</div></div><span></span></div></div>
<div class="card"><h3>Ask about Maya</h3><div class="input" style="color:var(--text-subtle);font-size:14px;padding-right:6px">Ask anything about Maya<span class="spacer"></span><span class="iconbtn" style="width:32px;height:32px;background:var(--accent-soft);color:var(--accent-text)">{ic("send", "i s16")}</span></div></div></div>
</div>'''
page("person", "Maya Okafor", person, on="people", tab="more")

# ---------- How Reginald is doing ----------
def tile(label, num, delta, good, spark):
    col = "var(--ok)" if good else ("var(--warn)" if good is None else "var(--danger)")
    bars = ''.join(f'<span style="height:{h}px;background:{"var(--accent)" if i == len(spark) - 1 else "var(--border-strong)"};opacity:{1 if i == len(spark) - 1 else .45}"></span>' for i, h in enumerate(spark))
    return (f'<div class="card tile" style="margin:0"><div style="font-size:13px;color:var(--text-muted)">{label}</div><div style="font:600 32px/40px var(--font-ui);margin-top:6px">{num}</div>'
            f'<div style="display:flex;align-items:end;justify-content:space-between"><span style="font-size:13px;font-weight:600;color:{col}">{delta}</span></div></div>')


quality = f'''
<div class="crumb">Your menu {ic("chevron", "i s16")}</div>
<div class="ph"><div><h1>How Reginald is doing</h1><div class="sub"><b>Kept on time is up 9 points, to 89%.</b><br>2 false alerts to look at · last 4 weeks, against the 4 before</div></div><div class="spacer"></div><span class="chip"><span class="k">Period</span>Last 4 weeks{ic("chevron", "i s16")}</span></div>
<div class="tiles">
{tile("Promises kept on time", "89%", "▲ 9 points better", True, [20, 23, 26, 30])}{tile("Promises found", "47", "▲ 4 more", True, [18, 24, 22, 30])}
{tile("False alerts", "2", "▲ 1 more than before", None, [4, 12, 4, 12])}{tile("Your time looking over", "10 min", "▼ 3 min less: better", True, [30, 27, 22, 20])}</div>
<div class="layout"><div class="panel"><div class="group">Week by week</div>
<table class="t wk"><tr><th>Week</th><th class="num">Found</th><th class="num">Kept on time</th><th class="num">False alerts</th><th class="num">Looking over</th></tr>
<tr><td>Oct 5–11</td><td class="num">9</td><td class="num">82%</td><td class="num">0</td><td class="num">12 min</td></tr>
<tr><td>Oct 12–18</td><td class="num">12</td><td class="num">86%</td><td class="num">1</td><td class="num">11 min</td></tr>
<tr><td>Oct 19–25</td><td class="num">11</td><td class="num">90%</td><td class="num">0</td><td class="num">9 min</td></tr>
<tr class="cur"><td><b>Oct 26 – now</b></td><td class="num">15</td><td class="num">94%</td><td class="num">1</td><td class="num">8 min</td></tr></table>
<div class="closing">Nothing to report yet on repeated corrections, things it couldn't do, or replays.</div></div>
<div class="rail"><div class="card"><h3>Mistakes to look at <span class="group" style="padding:0"><span class="n">2</span></span></h3>
<div class="ci" style="grid-template-columns:8px 1fr auto"><span class="dot danger"></span><div><div class="tt">"Order confirmed" read as a promise</div><div class="mm">False alert · Tue, Oct 27</div></div><a class="btn secondary sm">Review</a></div>
<div class="ci" style="grid-template-columns:8px 1fr auto"><span class="dot danger"></span><div><div class="tt">A newsletter's date taken as a deadline</div><div class="mm">False alert · Wed, Oct 14</div></div><a class="btn secondary sm">Review</a></div></div>
<div class="card"><h3>Your own count</h3><div style="font-size:13px;color:var(--text-muted)">Check a sample by hand to keep these numbers honest. <a class="link">Count a sample</a></div></div></div></div>'''
page("quality", "How Reginald is doing", quality, on="", tab="more")

# ---------- Setup: wizard pages ----------
def wizard(name, title, steps_on, body, primary="Continue", waiting=False):
    steps = ["You", "What it's for", "Your AI account", "Mail and calendar", "Your promises", "Backups", "People", "Ready"]
    rail = ''.join(f'<a class="{"done" if i < steps_on else ("on" if i == steps_on else "")}"><span class="c">{"✓" if i < steps_on else i + 1}</span>{s}</a>' for i, s in enumerate(steps))
    html = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title>'
            f'<link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="m46.css"></head><body>'
            f'<div class="wtop"><div class="wtin"><div class="word"><img class="logo-light" src="brand/thimbleby-clean.svg" alt=""><img class="logo-dark" src="brand/thimbleby-dark.svg" alt="">Thimbleby</div>'
            f'<div class="spacer"></div><span style="font-size:13px;color:var(--text-muted)" class="hide-phone">About 10 minutes · you can stop and come back</span><a class="btn quiet sm">Finish later</a></div></div>'
            f'<div class="wiz"><nav class="rail-steps">{rail}</nav><div>{body}</div></div>'
            f'<div class="wfoot"><div class="in"><div></div><div class="bar"><a class="btn secondary">Back</a><span class="spacer"></span><a class="btn quiet">I\'ll do this later</a><a class="btn primary{" waiting" if waiting else ""}" {"aria-disabled=true" if waiting else ""}>{primary}</a></div></div></div></body></html>')
    (OUT / f"{name}.html").write_text(html)


wizard("setup-ai", "Your AI account", 2, f'''
<div class="eyebrow">Step 3 of 8</div><h1 style="margin-top:6px">Which AI should Reginald use?</h1>
<p class="lead2">Reginald needs an AI service to read your mail and notes. You pay the service directly, and Reginald asks before anything costs more than $0.10.</p>
<div class="cards3"><div class="choice on"><span class="tag">Recommended</span><div class="ct">Anthropic</div><div class="cd">Pay as you go on your own account.</div></div>
<div class="choice"><div class="ct">OpenAI</div><div class="cd">Pay as you go on your own account.</div></div>
<div class="choice"><div class="ct">Something else</div><div class="cd">Another service, or one on this computer.</div></div></div>
<h2 class="sec" style="margin-top:32px">Connect your Anthropic account</h2><div class="help" style="font-size:14px">Three steps, about two minutes.</div>
<div class="steps"><div class="st done"><span class="num">✓</span><div><div style="font-weight:600">Sign in or create an account</div><div class="help" style="margin:0">Done</div></div><span></span></div>
<div class="st done"><span class="num">✓</span><div><div style="font-weight:600">Add a little credit</div><div class="help" style="margin:0">Done · $5 lasts most people a month or more</div></div><span></span></div>
<div class="st done"><span class="num">✓</span><div><div style="font-weight:600">Make a key and paste it below</div><div class="help" style="margin:0">Done · it's kept privately on this computer</div></div><span></span></div></div><div class="help">All three done. <a class="link">Open the Anthropic console again</a> if you need to.</div>
<div class="field"><label>Your key</label><div class="input">sk-ant-••••••••••••••••7Qx2<span class="spacer"></span><a class="link" style="font-size:13px">Show</a></div><div class="help" style="color:var(--ok);font-weight:600;display:flex;gap:6px;align-items:center">{ic("check", "i s16")}Works. Ready to use.</div></div>''')

wizard("setup-mail", "Mail and calendar", 3, f'''
<div class="eyebrow">Step 4 of 8</div><h1 style="margin-top:6px">Mail and calendar</h1>
<p class="lead2">Connect each account you use. Then say which sides each one is for, so a business never sees personal mail.</p>
{acct("robin@example.com", "Example mail", [("Personal", "s1")], "", setup=True)}
{acct("robin@northwind.example", "Example mail", [("Northwind Clinic", "s2")], "", setup=True)}
{acct("studio@calloway.example", "Example mail", [("Calloway Upholstery", "s3"), ("Lantern Row Studio", "s4")], "", setup=True)}
<div style="margin-top:16px"><a class="btn secondary sm">{ic("plus", "i s16")}Connect another account</a></div>
''')
keyst = lambda lab, inp, help_html: f'<div class="field"><div class="group" style="padding:0 0 8px">{lab}</div><div class="input">{inp}</div>{help_html}</div>'
wizard("setup-states", "Setup: its states", 2, f'''
<div class="eyebrow">Setup states</div><h1 style="margin-top:6px">The key, and the mail step, in each state</h1>
{keyst("Empty: Continue waits, and says why", '<span style="color:var(--text-subtle)">Paste the key that starts with "sk-ant-"</span>', '<div class="help">Paste your key to go on. Or choose "I\'ll do this later".</div>')}
{keyst("Checking", 'sk-ant-••••••••••••7Qx2<span class="spacer"></span><span class="spin"></span><span style="font-size:13px;color:var(--text-muted)">Checking…</span>', '<div class="help">This takes a few seconds.</div>')}
{keyst("Accepted", 'sk-ant-••••••••••••7Qx2', f'<div class="help" style="color:var(--ok);font-weight:600;display:flex;gap:6px;align-items:center">{ic("check", "i s16")}Works. Ready to use.</div>')}
{keyst("Not recognized", 'sk-ant-••••••••••••0000', f'<div class="help" style="color:var(--danger);font-weight:600;display:flex;gap:6px;align-items:center">{ic("alert", "i s16")}Anthropic didn\'t accept this key. Check it was copied whole, or make a new one.</div>')}
<div class="group" style="padding:36px 0 0">Mail: no account yet</div>
<div class="panel" style="margin-top:12px"><div class="empty" style="padding:32px 24px"><h2 style="font-size:20px;line-height:26px">Connect your first account</h2><p>Reginald reads its mail and calendar, and nothing else, only for the sides you pick.</p><a class="btn secondary sm">{ic("plus", "i s16")}Connect an account</a></div></div>
<div class="group" style="padding:28px 0 0">Key valid, but no credit</div>
<div class="banner" style="margin-top:12px"><span class="bi">{ic("alert")}</span><div class="tx"><b>The key works, but the account has no credit.</b> Add a little credit, then come back; nothing is lost.</div><a class="btn primary sm">Add credit</a></div>
<div class="group" style="padding:28px 0 0">Mail: one account needs sign-in</div>
{acct("studio@calloway.example", "Example mail", [("Calloway Upholstery", "s3")], "", fail=True)}
<div class="group" style="padding:28px 0 0">Offline during setup</div>
<div class="banner" style="margin-top:12px"><span class="bi">{ic("refresh")}</span><div class="tx"><b>You’re offline.</b> Your answers are kept; checking the key waits until you’re back.</div></div>
<div class="group" style="padding:28px 0 0">Mail: waiting for the sign-in window</div>
<div class="banner" style="margin-top:12px"><span class="bi">{ic("external")}</span><div class="tx"><b>Finish signing in in the window that opened.</b> This page carries on by itself when you're done.</div><a class="btn secondary sm">Cancel</a></div>''', primary="Continue", waiting=True)
print("all pages written")

# ---------- state sheets for the other pages ----------
def empty(title, text, action=""):
    a = f'<a class="btn secondary sm">{action}</a>' if action else ""
    return f'<div class="panel"><div class="empty" style="padding:40px 24px"><h2 style="font-size:22px;line-height:28px">{title}</h2><p>{text}</p>{a}</div></div>'


def skel(n=3):
    return '<div class="panel">' + ''.join(
        f'<div class="row"><div class="lead"><div class="skel" style="width:18px"></div></div><div><div class="skel" style="width:{w}%"></div><div class="skel" style="width:{w-22}%;margin-top:8px;height:10px"></div></div><div></div></div>'
        for w in (58, 44, 66)[:n]) + '</div>'


def common_states(item, long_title, count, edits=True):
    out = [("Offline", f'<div class="banner"><span class="bi">{ic("refresh")}</span><div class="tx"><b>You’re offline.</b> What you see was saved on this computer at 10:42 AM.</div><a class="btn secondary sm">Try now</a></div>')]
    if edits:
        out.append(("A save that failed", f'<div class="banner danger"><span class="bi">{ic("alert")}</span><div class="tx"><b>“{item}” wasn’t saved.</b> Your change is kept here until it saves.</div><a class="btn primary sm">Try again</a></div>'))
    out.append(("Long content", f'<div class="panel"><div class="row"><div class="lead">{ic("inbox")}</div><div><div class="t">{long_title}</div><div class="m">Two lines at most, then an ellipsis; the full text is on its own page</div></div><div class="acts"><a class="more" aria-label="More">{ic("more")}</a></div></div></div>'))
    out.append(("A large count", f'<div class="panel"><div class="group">{count[0]} <span class="n">{count[1]}</span></div><div class="row"><div class="lead">{ic("check")}</div><div><div class="t">The first of {count[1]}</div><div class="m">Sorted by what needs you first</div></div><div></div></div><div class="showmore">Show {count[1] - 1} more</div></div>'))
    return out


def states_page(name, title, on, blocks, tab="more", status=None, item="this change", long_title="", count=("Open", 140), edits=True):
    blocks = blocks + common_states(item, long_title or "Print, sign and mail the unclaimed property claim forms to the State Treasurer, P.O. Box 1004, before the end of the month 🗂️", count, edits)
    body = f'<div class="ph"><div><h1>{title}</h1><div class="sub">States: how this page looks in each case a real install meets</div></div></div>' + ''.join(sheet_block(l, h) for l, h in blocks)
    page(name, f"{title}, its states", body, on=on, tab=tab, status=status)


done_all = f'''<div class="panel"><div class="empty"><div class="star">✳</div><h2>All done</h2><p>Nothing is open. New to-dos from your mail and notes land here.</p><a class="btn secondary sm">See what you finished</a></div></div>'''
states_page("todos-states", "To-dos and questions", "todos", [
    ("All done (a brand moment)", done_all),
    ("Filtered to nothing", empty("No to-dos for Theo Brandt", "Theo isn't on any open to-do.", "Show everyone")),
    ("Questions", '<div class="panel">' + todo("Linen or velvet for the wingback chair?", f'Question for Maya Okafor {SEP} asked Oct 24', q=True, act='<a class="btn secondary sm">Answer</a>')
     + todo("Is the offsite on Friday or Saturday?", f'Theo Brandt asked you {SEP} Oct 27', q=True, act='<a class="btn secondary sm">Answer</a>') + '</div>'),
    ("Loading", skel()),
    ("Ticked, with Undo", '<div class="panel"><div class="row"><div class="lead" style="color:var(--ok)">' + ic("check") + '</div><div><div class="t" style="text-decoration:line-through;color:var(--text-muted)">Get a catering quote</div><div class="m">Done just now</div></div><div class="acts"><a class="btn quiet sm">Undo</a></div></div></div>'),
], tab="work", item="Pay the deposit for the venue", count=("Open", 140))
states_page("schedule-states", "Schedule", "sched", [
    ("A week with nothing in it", empty("Nothing on this week", "Your three calendars are clear. Add something, or look at next week.", "Next week")),
    ("One calendar can't be read", f'<div class="banner danger"><span class="bi">{ic("alert")}</span><div class="tx"><b>The Studio calendar isn’t up to date.</b> studio@calloway.example needs you to sign in again. Entries shown are from 10:51 AM.</div><a class="btn primary sm">Sign in again</a></div>'),
    ("Three meetings at once", f'<div class="calclash" style="position:relative;max-width:300px"><div class="ch">{ic("alert", "i s16")}3 at once · 2:30 PM</div><div class="cr"><span class="dot" style="background:var(--cal-3)"></span>Venue walk-through</div><div class="cr"><span class="dot" style="background:var(--cal-2)"></span>Budget check-in</div><div class="cr"><span class="dot" style="background:var(--cal-1)"></span>School pickup</div></div>'),
    ("Loading", skel(2)),
    ("Studio entries shown while its calendar can’t be read", f'<div class="calev c3" style="position:relative;max-width:260px;opacity:.75;border-left-style:dashed"><b>Fitting appointment</b><span>1:00 PM · may be out of date</span></div>'),
], tab="sched", status=FAIL_STATUS, item="Choir practice, moved to 6:30", long_title="Annual general meeting of the Harborview Community Support Partnership, with the board and volunteers", count=("This week", 46))
states_page("connections-states", "Connections", "settings", [
    ("No accounts yet", empty("Connect your mail and calendar", "Reginald reads only what you connect, and only for the sides you pick.", "Add a connection").replace("btn secondary sm", "btn primary sm")),
    ("Signing in again", f'<div class="acct"><div class="hd"><div class="av">{ic("inbox")}</div><div><div class="nm">studio@calloway.example</div><div class="sv"><span class="spin"></span>Waiting for the sign-in window…</div></div><div class="acts"><a class="btn secondary sm">Cancel</a></div></div></div>'),
    ("All healthy", acct("robin@example.com", "Example mail", [("Personal", "s1")], part("inbox", "Inbox", "Mail sent to you", "", "Read 5 min ago"))),
    ("Sign-in refused", f'<div class="banner danger"><span class="bi">{ic("alert")}</span><div class="tx"><b>That was a different account.</b> You signed in as robin@example.com; this connection is for studio@calloway.example.</div><a class="btn primary sm">Try again</a></div>'),
    ("Removing an account asks first", '<div class="card" style="max-width:460px;box-shadow:var(--shadow-pop)"><h3>Remove studio@calloway.example?</h3><p style="margin:0 0 16px;color:var(--text-muted);font-size:14px">Reginald stops reading its mail and calendar. Nothing already filed is deleted.</p><div style="display:flex;gap:8px;justify-content:flex-end"><a class="btn secondary sm">Keep it</a><a class="btn danger sm">Remove</a></div></div>'),
], status=FAIL_STATUS, item="Calloway Upholstery added to this account", long_title="maya.okafor.upholstery-and-restoration-orders@calloway-and-whitfield.example", count=("Calendars", 24))
states_page("person-states", "Maya Okafor", "people", [
    ("Someone just added, with nothing yet", empty("Nothing with Theo yet", "To-dos, questions and messages with Theo Brandt show up here.", "Add a to-do for Theo")),
    ("A long name and no email", '<div class="card"><dl class="dl"><dt>Name</dt><dd class="wrap">Bartholomew Featherstonehaugh-Winterbottom</dd><dt>Email</dt><dd><a class="link">Add an email</a></dd></dl></div>'),
    ("Loading", skel(2)),
    ("Person not found", empty("This person isn’t here any more", "They may have been merged with someone else or removed. Undo is on the People page for 10 minutes.", "Back to People")),
    ("Editing the details", '<div class="card"><div class="field" style="margin-top:0"><label>Work email</label><div class="input">maya.okafor.orders@example.com</div></div><div class="field"><label>Birthday</label><div class="input">March 14</div></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><a class="btn secondary sm">Cancel</a><a class="btn primary sm">Save</a></div></div>'),
], item="Maya’s birthday", long_title="Bartholomew Featherstonehaugh-Winterbottom", count=("Open with Bartholomew", 61))
states_page("quality-states", "How Reginald is doing", "", [
    ("First week, not enough to measure", empty("Too early to tell", "After a week of mail, this page shows how often Reginald keeps your promises on time.", "")),
    ("Loading", '<div class="tiles" style="margin-top:0">' + ''.join('<div class="card tile"><div class="skel" style="width:60%"></div><div class="skel" style="width:40%;height:28px;margin-top:12px"></div></div>' for _ in range(4)) + '</div>'),
    ("Nothing to look at", '<div class="card"><h3>Mistakes to look at <span class="group" style="padding:0"><span class="n">0</span></span></h3><div style="font-size:14px;color:var(--text-muted)">No false alerts in the last 4 weeks.</div></div>'),
    ("A worse period, said plainly", tile("Promises kept on time", "71%", "▼ 18 points worse", False, [])),
    ("Couldn’t load", f'<div class="banner danger"><span class="bi">{ic("alert")}</span><div class="tx"><b>These numbers couldn’t be worked out.</b> The rest of the app is fine.</div><a class="btn primary sm">Try again</a></div>'),
], edits=False, count=("Mistakes to look at", 37))
print("state sheets written")

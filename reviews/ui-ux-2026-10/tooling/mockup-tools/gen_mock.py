import sys
M=sys.argv[1]
def page(title, body, nav_on='today', shell=True):
    navs=[('today','Today','5'),('changed','What changed','1'),('handled','Handled for you',''),('follow','Follow-ups','2'),('todos','To-dos and questions','6'),('sched','Schedule','')]
    saved=[('personal','Personal',''),('cu','Calloway Upholstery',''),('nw','Northwind Clinic',''),('people','People',''),('files','Files',''),('know','Knowledge','')]
    def item(k,l,c): return f'<a class="item{" on" if k==nav_on else ""}"><span class="ico"></span>{l}<span class="count">{c}</span></a>'
    nav=''.join(item(*n) for n in navs)+'<div class="label">Saved items</div>'+''.join(item(*n) for n in saved)+'<div style="flex:1"></div>'+item('settings','Settings','')
    top=('<div class="top"><div class="brand"><span class="mono">R</span>Robin\'s</div>'
         '<div class="search">⌕ Search or ask Reginald<kbd>/</kbd></div><div class="spacer"></div>'
         '<span class="status"><span class="dot"></span>All good</span>'
         '<a class="btn primary">+ Hand something in</a><span class="iconbtn">?</span><span class="avatar">RC</span></div>')
    inner=f'{top}<div class="shell"><nav class="nav">{nav}</nav><main>{body}</main></div>' if shell else body
    return f'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title><link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="mock.css"></head><body>{inner}</body></html>'

# 1. Today
today = '''
<div class="ph"><div><h1>Today</h1><div class="sub">Wednesday, October 28 · 5 things need you</div></div>
<div class="spacer"></div><span class="chip"><span class="k">Showing</span> All sides ▾</span></div>
<div style="display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;margin-top:20px;align-items:start">
<div class="panel">
 <div class="group">Decide <span class="subtle">· 1</span></div>
 <div class="row first cur"><div class="lead"></div><div><div class="t"><span class="txt">Who is "Avery Lane"?</span></div><div class="m">Named in 2 emails from Maya Okafor · Is this you?</div></div><div class="acts"><a class="btn primary sm">This is me</a><a class="btn secondary sm">Someone else</a></div></div>
 <div class="group">At risk <span class="subtle">· 1</span></div>
 <div class="row first"><div class="lead"><span class="pill danger">Clash</span></div><div><div class="t"><span class="txt">Venue walk-through overlaps Budget check-in</span></div><div class="m">Today 2:37 PM · Room 4 → Room 2 · no time between them, about 30 minutes needed</div></div><div class="acts"><a class="btn secondary sm">Open both</a><span class="iconbtn">⋯</span></div></div>
 <div class="group">Review <span class="subtle">· 3</span></div>
 <div class="row first"><div class="lead"></div><div><div class="t"><span class="txt">Look over 4 things from your inbox</span></div><div class="m">3 to-dos and 1 note · from Maya Okafor and Theo Brandt</div></div><div class="acts"><a class="btn secondary sm">Look over</a></div></div>
 <div class="inset">
  <div class="item"><span class="kind">To-do</span><span style="flex:1"><b>Send the venue list</b> <span class="muted">· due Mon, Nov 2</span><div class="src">From Maya Okafor's email "Venue list"</div></span><a class="link sm">Not right</a></div>
  <div class="item"><span class="kind">To-do</span><span style="flex:1"><b>Get a catering quote</b><div class="src">From Theo Brandt's email "Catering quote"</div></span><a class="link sm">Not right</a></div>
  <div class="item"><span class="kind">To-do</span><span style="flex:1"><b>Get a printed agenda</b><div class="src">From Theo Brandt's email "Last week's agenda"</div></span><a class="link sm">Not right</a></div>
  <div class="item"><span class="kind">Note</span><span style="flex:1"><b>Thanks · from Maya Okafor</b><div class="src">Filed under Personal</div></span><a class="link sm">Not right</a></div>
  <div class="foot"><span class="note">Reginald treats what's in these emails as information, never as instructions.</span><a class="btn quiet sm">Close</a><a class="btn primary sm">All looks good</a></div>
 </div>
 <div class="row"><div class="lead"></div><div><div class="t"><span class="txt">Look over 1 thing from your sent mail</span></div><div class="m">1 to-do · "Revised offsite budget"</div></div><div class="acts"><a class="btn secondary sm">Look over</a></div></div>
 <div class="row"><div class="lead"></div><div><div class="t"><span class="txt">These 6 items might be Calloway Upholstery's</span></div><div class="m">Reginald couldn't tell, so they wait under Personal</div></div><div class="acts"><a class="btn secondary sm">Sort them</a></div></div>
</div>
<div class="rail">
 <div class="card"><h3>Good afternoon, Robin<a class="act link">Close for today</a></h3>
  <div class="sm muted" style="margin-bottom:8px">5 things need you, 1 clash today, and 2 messages came in.</div>
  <a class="btn secondary sm">Show this week's briefing</a></div>
 <div class="card"><h3>Schedule <span class="subtle sm">Today</span><a class="act link">Open ›</a></h3>
  <div class="line"><span class="when">2:37 PM</span><span><b>Venue walk-through</b><div class="xs subtle">Room 4 · Calloway Upholstery</div></span></div>
  <div class="line"><span class="when">3:07 PM</span><span><b>Budget check-in</b><div class="xs subtle">Room 2 · Calloway Upholstery</div></span></div>
  <div class="foot"><span class="muted">Tomorrow: 1 entry</span><span class="spacer"></span><a class="link">+ Add</a></div></div>
 <div class="card"><h3>Came in <span class="subtle sm">3</span><a class="act link">Check now</a></h3>
  <div class="line"><span class="dot new" style="margin-top:6px"></span><span style="flex:1"><b>Venue list</b><div class="xs subtle">Maya Okafor</div></span><span class="subtle xs num">1:22 PM</span></div>
  <div class="line"><span class="dot new" style="margin-top:6px"></span><span style="flex:1"><b>Catering quote</b><div class="xs subtle">Theo Brandt</div></span><span class="subtle xs num">10:22 AM</span></div>
  <div class="line"><span style="width:8px"></span><span style="flex:1">Thanks<div class="xs subtle">Maya Okafor</div></span><span class="subtle xs num">2:22 PM</span></div>
  <div class="foot"><a class="link">2 handled for you today</a></div></div>
</div></div>'''
open(f'{M}/today.html','w').write(page('Today mockup', today,'today'))

# 2. To-dos
rows=[('Send the venue list','Robin Calloway · <span class="due">due Mon, Nov 2</span> · from Maya Okafor\'s email',''),
('Send the revised budget','Robin Calloway · <span class="due today">due today</span> · from your sent mail',''),
('Approve the cover proof','Robin Calloway · <span class="due over">overdue · Wed, Oct 21</span>',''),
('Bring the floor plan','<span class="pill need">Needs an owner</span> · Calloway Upholstery','pick'),
('Get a catering quote','Theo Brandt · waiting on them since Oct 26 · Calloway Upholstery',''),
('Get a printed agenda','Robin Calloway · no date','')]
r=''
for i,(t,m,k) in enumerate(rows):
    act='<a class="btn secondary sm">Pick an owner</a>' if k=='pick' else ''
    r+=f'<div class="row{" first" if i==0 else ""}"><div class="lead"><span class="check"></span></div><div><div class="t"><span class="txt">{t}</span></div><div class="m">{m}</div></div><div class="acts">{act}<span class="iconbtn">⋯</span></div></div>'
todos=f'''
<div class="ph"><div><h1>To-dos and questions</h1><div class="sub">6 open · 1 overdue</div></div><div class="spacer"></div><a class="btn primary">+ Add a to-do</a></div>
<div class="bar"><div class="tabs"><span class="tab on">To-dos <span class="n">6</span></span><span class="tab">Questions <span class="n">0</span></span></div>
<div class="chips"><span class="chip"><span class="k">Who</span> Everyone ▾</span><span class="chip"><span class="k">State</span> Open ▾</span><span class="chip"><span class="k">Side</span> All ▾</span></div></div>
<div class="panel" style="max-width:980px">
 <div class="row first" style="color:var(--text-subtle)"><div class="lead"><span style="font-size:18px">+</span></div><div class="sm">Add a to-do… <span class="xs">(type "by Friday" or "every Monday" and it's understood)</span></div><div></div></div>
 {r}
</div>
<div class="xs subtle" style="margin-top:10px">Tick the circle to mark a to-do done. Undo stays for 10 seconds.</div>'''
open(f'{M}/todos.html','w').write(page('To-dos mockup', todos,'todos'))

# 3. Settings Connections
conn='''
<div style="display:grid;grid-template-columns:200px minmax(0,1fr);gap:32px">
<div class="snav"><div class="g">You</div><a>Your details</a><a>Notices</a><a>Appearance</a>
<div class="g">Assistant</div><a>AI and spending</a><a class="on">Connections</a><a>Add-ons</a>
<div class="g">Your data</div><a>Backups</a><a>Your business</a><a>Quick links</a><div class="g">More</div><a>Advanced</a></div>
<div>
<div class="ph"><div><h1>Connections</h1><div class="sub">The mail, calendars and folders Reginald reads for you.</div></div><div class="spacer"></div><a class="btn primary">+ Add a connection</a></div>
<div class="panel" style="margin-top:20px">
 <div class="head"><span class="mono" style="background:var(--surface-sunk);color:var(--text)">E</span><div><h2>Example mail</h2><div class="xs muted">Signed in as avery.lane@example.com</div></div><span class="pill ok" style="margin-left:8px">Connected</span><span class="act" style="display:flex;gap:6px"><a class="btn secondary sm">Choose what to read</a><span class="iconbtn">⋯</span></span></div>
 <table class="t"><tr><th>What</th><th>For</th><th>Privacy</th><th>Last checked</th><th></th></tr>
 <tr><td><b>Inbox</b></td><td>Personal, Calloway Upholstery</td><td><span class="pill neutral">Private</span></td><td><span class="dot"></span>&nbsp; 2 min ago</td><td class="r">⋯</td></tr>
 <tr><td><b>Sent mail</b></td><td>Personal, Calloway Upholstery</td><td><span class="pill neutral">Private</span></td><td><span class="dot"></span>&nbsp; 2 min ago</td><td class="r">⋯</td></tr>
 <tr><td><b>Calendar</b></td><td>Calloway Upholstery</td><td><span class="pill neutral">Confidential</span></td><td><span class="dot warn"></span>&nbsp; 1 hour ago · retrying</td><td class="r">⋯</td></tr></table>
</div>
<div class="panel" style="margin-top:16px"><div class="head"><span class="mono" style="background:var(--surface-sunk);color:var(--text)">F</span><div><h2>Shop folder</h2><div class="xs muted">~/Documents/Calloway/Orders · every 4 hours</div></div><span class="pill ok" style="margin-left:8px">Reading</span><span class="act"><span class="iconbtn">⋯</span></span></div></div>
<div class="xs subtle" style="margin-top:12px">Sites you only open yourself go under <a class="link">Quick links</a>, not here.</div>
</div></div>'''
open(f'{M}/connections.html','w').write(page('Connections mockup', conn,'settings'))

# 4. Quality
def spark(vals): return '<div class="spark">'+''.join(f'<i style="height:{v}%"></i>' for v in vals)+'</div>'
quality=f'''
<div class="crumb"><a>Today</a> › How Reginald is doing</div>
<div class="ph"><div><h1>How Reginald is doing</h1><div class="sub">Sep 30 to Oct 28, compared with the 4 weeks before</div></div><div class="spacer"></div><span class="chip">Last 4 weeks ▾</span></div>
<div class="tiles">
 <div class="tile"><div class="k">Promises found</div><div class="v">12</div><div class="d up">+4 from last period</div>{spark([30,45,40,70,85])}</div>
 <div class="tile"><div class="k">Kept on time</div><div class="v">83%</div><div class="d up">+9 points</div>{spark([60,55,70,75,83])}</div>
 <div class="tile"><div class="k">False alerts</div><div class="v">2</div><div class="d down">+1 from last period</div>{spark([20,10,10,30,35])}</div>
 <div class="tile"><div class="k">Time spent looking over</div><div class="v">9 min</div><div class="d">a week, on average</div>{spark([50,60,40,35,30])}</div>
</div>
<div class="grid2">
 <div class="panel"><div class="head"><h2>Week by week</h2></div><table class="t"><tr><th>Week</th><th class="r">Found</th><th class="r">Kept</th><th class="r">False alerts</th><th class="r">Looked over</th></tr>
 <tr><td>Oct 26 – now</td><td class="r">4</td><td class="r">3</td><td class="r">1</td><td class="r">11 min</td></tr>
 <tr><td>Oct 19 – 25</td><td class="r">3</td><td class="r">3</td><td class="r">0</td><td class="r">8 min</td></tr>
 <tr><td>Oct 12 – 18</td><td class="r">3</td><td class="r">2</td><td class="r">1</td><td class="r">9 min</td></tr>
 <tr><td>Oct 5 – 11</td><td class="r">2</td><td class="r">2</td><td class="r">0</td><td class="r">7 min</td></tr></table></div>
 <div style="display:flex;flex-direction:column;gap:16px">
  <div class="panel"><div class="head"><h2>Mistakes to look at</h2><span class="n">3</span></div>
   <div class="row first"><div class="lead"></div><div><div class="t">"Book the photographer" closed as done</div><div class="m">Nobody said it was done · Oct 24</div></div><div class="acts"><a class="btn secondary sm">Look</a></div></div>
   <div class="row"><div class="lead"></div><div><div class="t">The same correction twice</div><div class="m">"Theo owns catering" · Oct 20 and Oct 26</div></div><div class="acts"><a class="btn secondary sm">Look</a></div></div></div>
  <div class="panel"><div class="head"><h2>Your own count</h2><span class="act xs muted">Helps Reginald know what it missed</span></div>
   <div style="padding:0 16px 14px;display:flex;gap:12px;align-items:end"><div class="field" style="flex:1"><label>Promises on your list today</label><div class="in">0</div></div><div class="field" style="flex:1"><label>Of those, ones Reginald missed</label><div class="in">0</div></div><a class="btn secondary">Save</a></div></div>
  <div class="xs subtle">Nothing to report on: corrections that repeated, things it couldn't do, replays.</div>
 </div>
</div>'''
open(f'{M}/quality.html','w').write(page('Quality mockup', quality,''))

# 5. Person page
person='''
<div class="crumb"><a>People</a> › Maya Okafor</div>
<div class="ph"><div><h1 style="display:flex;gap:10px;align-items:center">Maya Okafor <span class="pill neutral">Person</span></h1><div class="sub">Customer at Calloway Upholstery · friend</div></div><div class="spacer"></div><a class="btn secondary">Edit</a><span class="iconbtn">⋯</span></div>
<div style="display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:24px;margin-top:20px;align-items:start">
<div>
 <div class="bar" style="margin-top:0"><div class="tabs"><span class="tab on">Overview</span><span class="tab">Open with Maya <span class="n">3</span></span><span class="tab">Activity</span></div></div>
 <div class="panel"><div class="head"><h2>Open with Maya</h2><span class="n">3</span><a class="act link sm">See all</a></div>
  <div class="row first"><div class="lead"><span class="check"></span></div><div><div class="t">Send the venue list</div><div class="m">You · due Mon, Nov 2 · you promised her</div></div><div></div></div>
  <div class="row"><div class="lead"><span class="check"></span></div><div><div class="t">Confirm the seating plan</div><div class="m">Maya · waiting on her since Oct 26</div></div><div></div></div>
  <div class="row"><div class="lead"><span class="check"></span></div><div><div class="t">Wingback chair fabric choice</div><div class="m">Maya · question · asked Oct 24</div></div><div></div></div></div>
 <div class="panel" style="margin-top:16px;padding:6px 16px 12px"><div class="tl">
  <div class="day">Today</div><div class="ev"><span class="time">1:22 PM</span><span>Emailed you "Venue list" · <a class="link">open</a></span></div>
  <div class="ev"><span class="time">1:23 PM</span><span>Reginald added the to-do "Send the venue list"</span></div>
  <div class="day">Yesterday</div><div class="ev"><span class="time">4:10 PM</span><span>You marked "Confirm the seating plan" as waiting on her</span></div>
  <a class="link sm">Show all activity</a></div></div>
 <div class="composer" style="margin-top:16px">Ask Reginald about Maya…<span class="send">↑</span></div>
</div>
<div class="panel" style="padding:8px 16px 12px;position:sticky;top:72px"><dl class="def">
 <dt>Email</dt><dd>maya.okafor@example.com</dd><dt>Phone</dt><dd class="muted">Add a phone number</dd>
 <dt>Who she is</dt><dd>Customer at Calloway Upholstery<br>Friend (Personal)</dd><dt>Last contact</dt><dd>Today, 1:22 PM</dd>
 <dt>Dates</dt><dd>Birthday Mar 14</dd></dl></div>
</div>'''
open(f'{M}/person.html','w').write(page('Person mockup', person,'people'))

# 6. Setup AI step
setup='''
<div class="top"><div class="brand"><span class="mono">R</span>Getting started</div><div class="spacer"></div><span class="muted sm">About 10–20 minutes · you can stop and come back</span><a class="btn quiet">Finish later</a></div>
<div class="wiz">
<div class="steps"><div class="s done"><span class="c">✓</span>You</div><div class="s done"><span class="c">✓</span>What it's for</div><div class="s on"><span class="c"></span>Your AI account</div><div class="s"><span class="c"></span>Mail and calendar</div><div class="s"><span class="c"></span>Your promises</div><div class="s"><span class="c"></span>Backups</div><div class="s"><span class="c"></span>People</div></div>
<div>
 <div class="xs subtle" style="font-weight:600">STEP 3 OF 7</div>
 <h1 style="margin:4px 0 6px;font-size:24px;font-weight:600">Which AI should Reginald use?</h1>
 <p class="muted" style="margin:0 0 20px">Reginald needs an AI service to read your mail and notes. You pay the service directly; Reginald asks before anything costs more than $0.10.</p>
 <div class="choice"><div class="opt on"><div class="n">Anthropic <span class="pill need">Recommended</span></div><p>Pay as you go on your own account.</p></div><div class="opt"><div class="n">OpenAI</div><p>Pay as you go on your own account.</p></div><div class="opt"><div class="n">Something else</div><p>Another service, an app you use, or one on this computer.</p></div></div>
 <div class="sect"><h2>Connect your Anthropic account</h2><p>Three steps, about two minutes.</p>
  <div class="panel"><div class="row first"><div class="lead"><span class="check" style="background:var(--ok);border-color:var(--ok)"></span></div><div><div class="t">Sign in or create an account</div><div class="m">At console.anthropic.com</div></div><div class="acts"><a class="btn secondary sm">Open ↗</a></div></div>
  <div class="row"><div class="lead"><span class="check"></span></div><div><div class="t">Add a little credit</div><div class="m">$5 lasts most people a month or more</div></div><div class="acts"><a class="btn secondary sm">Open ↗</a></div></div>
  <div class="row"><div class="lead"><span class="check"></span></div><div><div class="t">Make a key and paste it below</div><div class="m">It's kept privately on this computer</div></div><div class="acts"><a class="btn secondary sm">Open ↗</a></div></div></div>
  <div class="field" style="margin-top:16px"><label>Your key</label><div class="in">sk-ant-••••••••••••••••7Qx2</div></div>
  <div class="okline" style="margin-top:10px"><span class="dot"></span>Works. Ready to use.</div></div>
 <div class="sect"><h2>What may it read?</h2><p>Your personal mail is private. Only accounts you allow can read it.</p>
  <div class="choice" style="grid-template-columns:1fr 1fr"><div class="opt on"><div class="n">Allow, including private mail</div><p>Needed to find what you promised.</p></div><div class="opt"><div class="n">Not my private mail</div><p>Reginald works only on what you hand in.</p></div></div></div>
 <div class="sect" style="display:flex;align-items:center;gap:8px;font-size:14px"><span class="muted">Spending:</span> asks before $0.10, stops at $2 a day. <a class="link">Change</a></div>
</div></div>
<div class="wfoot"><div class="in"><a class="btn secondary">Back</a><span class="spacer"></span><a class="btn quiet">I'll do this later</a><a class="btn primary">Continue</a></div></div>'''
open(f'{M}/setup-ai.html','w').write(page('Setup AI mockup', setup, shell=False))
print('ok')

"""This week (design 7.7): what is due by the end of the week, who is waiting on the person and which meetings to hold,
across every project, from today through the configured last working day. Reads only.

The week's end is the last working day the reminders settings name (`steward.reminders.working_last_day`); on a day
after it, the week is the next one. Something on hold is never due, so it is not listed.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any

from engine.blocked import standing_hold
from engine.config.schema import WEEKDAYS
from engine.firm_due import firm_due
from engine.names import People
from engine.sides import side_of_item
from engine.today import AgendaItem, agenda, zone


@dataclass
class Due:
    """An open to-do due from today through the week's end (or overdue), with its owners' ids and whether it is the
    person's own. A to-do with a lead time (`lead_days`: the working days before its day when the work must start) is
    also counted from that many working days before its day (`kind` "lead" when that day is past the week's end, "setup"
    for a meeting to set up). A meeting to set up with no lead time of its own takes `steward.meetings.
    setup_lead_working_days`; one whose invitation is out is counted only on its day (`kind` "hold")."""

    action: str
    text: str
    due: date
    project: str | None
    owners: list[str]
    mine: bool
    #: "due" (by the week's end), "lead" (a to-do counted ahead by its lead time), "setup" (a meeting counted ahead) or
    #: "hold"
    kind: str = "due"
    #: The side the to-do is on (the id of its top project); none when it is on none.
    side: str | None = None


@dataclass
class Waiting:
    """Someone waiting on the person: `count` of the person's open to-dos promised to them or replies owed to them that
    are due by the week's end or overdue, and the earliest `due` of them (none when none has a day). One person who is
    waited on from several sides has one of these for each side, so a side's list counts only its own."""

    person: str
    count: int
    due: date | None = None
    #: The side those to-dos are on (the id of its top project); none for those on none.
    side: str | None = None


@dataclass
class Week:
    """The week as of a day: `first` and `last` day, what is `due`, who is `waiting` and the `meetings`."""

    first: date
    last: date
    due: list[Due] = field(default_factory=list)
    waiting: list[Waiting] = field(default_factory=list)
    meetings: list[AgendaItem] = field(default_factory=list)


def week_end(cfg: Any, today: date) -> date:
    """The configured last working day on or after `today`."""
    target = WEEKDAYS.index(cfg.steward.reminders.working_last_day)
    return today + timedelta(days=(target - today.weekday()) % 7)


def is_meeting_to_set_up(cfg: Any, data: dict[str, Any]) -> bool:
    """Whether an open to-do is a meeting the person sets up: its text has one of `steward.meetings.setup_words`."""
    words = {w.casefold() for w in cfg.steward.meetings.setup_words}
    return bool(words & set(re.findall(r"\w+", str(data.get("text") or "").casefold())))


def invitation_out(data: dict[str, Any]) -> bool:
    """Whether the invitation for a meeting to set up has gone out: someone was told, or it has a calendar entry."""
    return bool(data.get("told") or data.get("event"))


def lead_of(cfg: Any, data: dict[str, Any]) -> int:
    """The working days before its day that an open to-do's work must start: its own `lead_days`; with none, a meeting
    the person sets up (its text has a setup word) takes the setting's default, and any other to-do has none."""
    own = data.get("lead_days")
    if own is not None:
        return int(own)
    return cfg.steward.meetings.setup_lead_working_days if is_meeting_to_set_up(cfg, data) else 0


def lead_start(cfg: Any, day: date, lead: int) -> date:
    """The day `lead` working days before `day`."""
    first = WEEKDAYS.index(cfg.steward.reminders.working_first_day)
    last = WEEKDAYS.index(cfg.steward.reminders.working_last_day)

    def working(d: date) -> bool:
        return (d.weekday() - first) % 7 <= (last - first) % 7

    back = day
    left = lead
    for _ in range(366):
        if left <= 0:
            break
        back -= timedelta(days=1)
        if working(back):
            left -= 1
    return back


def this_week(store: Any, cfg: Any, now: datetime) -> Week:
    """This week as of `now`."""
    today = now.astimezone(zone(cfg)).date()
    last = week_end(cfg, today)
    people = People(store, cfg)
    pm = people.pm
    reader = store.read()
    due: list[Due] = []
    waiting: dict[tuple[str, str | None], Waiting] = {}
    for record in reader.list("action"):
        d = record.data
        if d.get("status") != "open" or standing_hold(reader, d, people):
            continue
        day = firm_due(d)
        owners = [o["person"] for o in d.get("owners") or [] if o.get("person")]
        mine = pm is not None and pm in owners
        kind = "due"
        counted = day is not None and today <= day <= last
        meeting = is_meeting_to_set_up(cfg, d)
        lead = lead_of(cfg, d)
        if day is not None and meeting and invitation_out(d):
            counted, kind = day == today, "hold"
        elif day is not None and lead > 0 and day > last and lead_start(cfg, day, lead) <= today:
            counted, kind = True, "setup" if meeting else "lead"
        side = side_of_item(reader, cfg, record)
        if counted:
            due.append(Due(record.id, d["text"], day, d.get("project"), owners, mine, kind, side))
        if not mine or (day is not None and day > last):
            continue
        asked = [d["asker"]] if d.get("reply_owed") and d.get("asker") else []
        for person in {*(d.get("promised_to") or []), *asked}:
            if person == pm:
                continue
            found = waiting.setdefault((person, side), Waiting(person, 0, side=side))
            found.count += 1
            if day is not None and (found.due is None or day < found.due):
                found.due = day
    due.sort(key=lambda x: (x.due, x.text.lower(), x.action))
    meetings = [m for m in agenda(store, cfg, now, through=last) if not m.cancelled]
    return Week(
        today,
        last,
        due,
        sorted(
            waiting.values(), key=lambda w: (w.due is None, w.due or last, people.name(w.person).lower(), w.side or "")
        ),
        meetings,
    )

"""The schedule's timeline (design 7.7, "Timeline"): where each piece of work stands over the coming weeks. One lane per
project that has something in the range, grouped under its side; on a lane, the calendar entries, the to-dos and
promises with a day, the project's target day and the dated facts filed under it, each told apart by kind; and the days
people don't work. It reads the records the schedule already reads, by plain rules; nothing here calls AI, reaches a
service or changes a record.

A lane belongs to the project an item names; an item filed on a side itself is on the side's own lane, and a calendar
entry that names no project is on the lane of the one side its calendar serves, or on none (the screen's "other" lane).
The days people don't work come in two parts: the workspace's own (its weekly rest days and holidays), once for every
lane, and each lane's own (its owner's team's days off and the owner's own away periods).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any, Literal

from engine import days_off
from engine.firm_due import firm_due
from engine.schedule import Entry, entry_on, work_days
from engine.sides import (
    project_names,
    projects_of,
    side_ids,
    side_names,
    side_of_agenda_item,
    side_of_project,
)
from engine.today import agenda, zone
from engine.views import views_of_project

#: The ranges a timeline can show, by name, and how many days each is (a whole number of weeks).
RANGES: dict[str, int] = {"two_weeks": 14, "ten_weeks": 70, "quarter": 91}

Kind = Literal["entry", "todo", "promise", "target", "fact"]
State = Literal["open", "overdue", "done"]
OffKind = Literal["weekend", "holiday", "team", "away"]


@dataclass
class Item:
    """One thing on a lane: `start` and `end` are days (the same day for a thing on one day, a bar when they differ).
    `id` is the id of the record it is: the calendar entry's (or the connected event's), the to-do's, the project's for
    its target day, the fact's. `entry` is the schedule's own entry for a calendar entry, so the screen can open its
    details as the other views do."""

    kind: Kind
    id: str
    title: str
    start: date
    end: date
    state: State = "open"
    owners: list[dict[str, Any]] = field(default_factory=list)
    entry: Entry | None = None
    detail: str | None = None


@dataclass
class OffDay:
    day: date
    kind: OffKind
    reason: str = ""


@dataclass
class Lane:
    project: str | None
    name: str
    side: str | None
    in_project: bool
    views: list[str] = field(default_factory=list)
    parent: str | None = None
    parent_name: str | None = None
    depth: int = 0
    owner: str | None = None
    team: str | None = None
    days_off: list[OffDay] = field(default_factory=list)
    items: list[Item] = field(default_factory=list)


@dataclass
class Timeline:
    first: date
    last: date
    range: str
    lanes: list[Lane]
    off_days: list[OffDay]


def range_days(name: str | None, default: str) -> tuple[str, int]:
    """The name and the number of days of a range: the one named, or the default when none is named or the name is not
    a range."""
    chosen = name if name in RANGES else default if default in RANGES else "ten_weeks"
    return chosen, RANGES[chosen]


def _parent_of(view: Any, project_id: str) -> str | None:
    record = view.get("project", project_id)
    parent = record.data.get("parent") if record is not None else None
    return parent if parent and view.get("project", parent) is not None else None


def _owner_of(view: Any, project_id: str) -> str | None:
    """The person who owns a project: its own owner, else its nearest parent's."""
    seen: list[str] = []
    current: str | None = project_id
    while current and current not in seen:
        seen.append(current)
        record = view.get("project", current)
        if record is None:
            return None
        if record.data.get("owner"):
            return str(record.data["owner"])
        current = record.data.get("parent")
    return None


def _first_project(view: Any, record: Any) -> str | None:
    """The first project a record names that is there."""
    return next((p for p in projects_of(record.data) if view.get("project", p) is not None), None)


def _items(store: Any, cfg: Any, now: datetime, first: date, last: date) -> list[tuple[str | None, Item]]:
    """Every item that falls in the range, with the project it is filed under (None for none)."""
    view = store.read()
    here = zone(cfg)
    today = now.astimezone(here).date()
    found: list[tuple[str | None, Item]] = []
    for item in agenda(store, cfg, now, through=last, start=first):
        if item.cancelled or not item.days:
            continue
        kept = item.snapshot if item.own else item.entry
        record = view.get("event", kept) if kept else None
        project = _first_project(view, record) if record is not None else None
        if project is None:
            project = side_of_agenda_item(view, cfg, item)
        entry = entry_on(cfg, item, item.days[0])
        found.append((project, Item("entry", item.snapshot, item.title, item.days[0], item.days[-1], entry=entry)))
    for a in view.list("action"):
        data = a.data
        if data.get("status") not in ("open", "done") or not data.get("due"):
            continue
        done = data["status"] == "done"
        if not done and data.get("due_check"):
            continue  # a date still to be checked is not a deadline
        due = date.fromisoformat(str(data["due"]))
        if not first <= due <= last:
            continue
        firm = firm_due(data)
        state: State = (
            "done" if done else "overdue" if firm is not None and firm < today and not data.get("on_hold") else "open"
        )
        kind: Kind = "promise" if data.get("promised_to") else "todo"
        found.append(
            (_first_project(view, a), Item(kind, a.id, data["text"], due, due, state, list(data.get("owners") or [])))
        )
    replaced = {f.data["supersedes"] for f in view.list("fact") if f.data.get("supersedes")}
    for f in view.list("fact"):
        on = f.data.get("on")
        if not on or f.id in replaced:
            continue
        day = date.fromisoformat(str(on))
        if first <= day <= last:
            found.append(
                (_first_project(view, f), Item("fact", f.id, f.data["text"], day, day, detail=f.data.get("on_kind")))
            )
    for p in view.list("project"):
        target = p.data.get("target")
        if not target or p.data.get("area"):
            continue
        day = date.fromisoformat(str(target))
        if first <= day <= last:
            owners = [{"person": p.data["owner"]}] if p.data.get("owner") else []
            found.append((p.id, Item("target", p.id, str(p.data.get("name") or ""), day, day, owners=owners)))
    return _folded(found)


def _folded(found: list[tuple[str | None, Item]]) -> list[tuple[str | None, Item]]:
    """Runs of the same thing on consecutive days become one band over those days: a daily repeat (one calendar entry
    on each day) or identical to-dos with a day (a due date repeated each day). What differs in title, project, kind or
    state stays apart, and a thing already over several days is left as it is."""
    foldable = ("entry", "todo", "promise")

    def key(pair: tuple[str | None, Item]) -> tuple[Any, ...]:
        project, i = pair
        return (project, i.kind, i.id if i.kind == "entry" else "", i.title, i.state)

    kept: list[tuple[str | None, Item]] = [p for p in found if p[1].kind not in foldable or p[1].start != p[1].end]
    singles = sorted(
        (p for p in found if p[1].kind in foldable and p[1].start == p[1].end), key=lambda p: (str(key(p)), p[1].start)
    )
    band: tuple[str | None, Item] | None = None
    for pair in singles:
        project, i = pair
        if band is not None and key(band) == key(pair) and i.start <= band[1].end + timedelta(days=1):
            if i.start > band[1].end:
                band[1].end = i.start
            continue
        if band is not None:
            kept.append(band)
        band = (project, Item(i.kind, i.id, i.title, i.start, i.end, i.state, i.owners, i.entry, i.detail))
    if band is not None:
        kept.append(band)
    return kept


def _workspace_off(cfg: Any, first: date, last: date) -> list[OffDay]:
    week = set(work_days(cfg))
    found = [
        OffDay(first + timedelta(days=n), "weekend")
        for n in range((last - first).days + 1)
        if (first + timedelta(days=n)).weekday() not in week
    ]
    found += [OffDay(day, "holiday", reason) for day, reason in days_off.holidays_off(cfg, None, first, last)]
    return sorted(found, key=lambda o: (o.day, o.kind))


def _lane_off(view: Any, cfg: Any, owner: str | None, shared: list[OffDay], first: date, last: date) -> list[OffDay]:
    """The days off a lane has beyond the workspace's: its owner's teams' and the owner's own away periods."""
    if not owner:
        return []
    already = {(o.day, o.reason) for o in shared if o.kind == "holiday"}
    found: list[OffDay] = []
    for day, whose, reason in days_off.kinds(view, cfg, owner, first, last):
        if (day, reason) not in already:
            found.append(OffDay(day, "team" if whose == "team" else "away", reason))
    return sorted(found, key=lambda o: (o.day, o.kind))


def timeline(store: Any, cfg: Any, now: datetime, start: date | None = None, range_name: str | None = None) -> Timeline:
    """The timeline from `start` (the first day of the week the person is in when none) for a named range (the
    configured one when none). Lanes are in order: each side's, Personal first, then lanes on no side; inside a side a
    project's lane comes before the lanes of the projects inside it, which are indented."""
    view = store.read()
    here = zone(cfg)
    name, count = range_days(range_name, cfg.ui.schedule.timeline_range)
    today = now.astimezone(here).date()
    if start is None:
        from engine.config.schema import WEEKDAYS

        begin = WEEKDAYS.index(cfg.ui.schedule.week_starts_on)
        start = today - timedelta(days=(today.weekday() - begin) % 7)
    last = start + timedelta(days=count - 1)

    by_project: dict[str | None, list[Item]] = {}
    for project, item in _items(store, cfg, now, start, last):
        by_project.setdefault(project, []).append(item)

    names = {**side_names(view, cfg), **project_names(view, cfg)}
    sides = set(side_ids(view, cfg))
    shared = _workspace_off(cfg, start, last)
    lanes: dict[str | None, Lane] = {}
    for project, items in by_project.items():
        items.sort(key=lambda i: (i.start, i.end, i.kind, i.title.casefold()))
        if project is None:
            lanes[None] = Lane(None, "", None, False, [], items=items)
            continue
        parent = _parent_of(view, project)
        owner = _owner_of(view, project)
        teams = days_off.teams_of(view, owner) if owner else []
        lanes[project] = Lane(
            project=project,
            name=names.get(project, ""),
            side=side_of_project(view, cfg, project),
            in_project=project not in sides,
            views=views_of_project(view, project),
            parent=parent,
            owner=owner,
            team=teams[0] if teams else None,
            days_off=_lane_off(view, cfg, owner, shared, start, last),
            items=items,
        )

    # Depth and place: a lane sits under the nearest lane above it in its parent chain.
    def lane_above(project: str) -> str | None:
        seen = [project]
        current = _parent_of(view, project)
        while current and current not in seen:
            if current in lanes:
                return current
            seen.append(current)
            current = _parent_of(view, current)
        return None

    above = {p: lane_above(p) for p in lanes if p is not None}
    for p, lane in lanes.items():
        if p is None:
            continue
        up, depth = above[p], 0
        while up:
            depth += 1
            up = above.get(up)
        lane.depth = depth
        if lane.parent and lane.parent not in lanes and lane.parent not in sides:
            lane.parent_name = names.get(lane.parent)

    def order(side: str | None) -> list[Lane]:
        mine = [p for p, lane in lanes.items() if p is not None and lane.side == side]
        out: list[Lane] = []

        def walk(under: str | None) -> None:
            kids = sorted(
                (p for p in mine if above[p] == under), key=lambda p: (p != side, names.get(p, "").casefold(), p)
            )
            for p in kids:
                out.append(lanes[p])
                walk(p)

        walk(None)
        return out

    ordered: list[Lane] = []
    for side in [*side_ids(view, cfg), None]:
        ordered += order(side)
    if None in lanes:
        ordered.append(lanes[None])
    return Timeline(start, last, name, ordered, shared)

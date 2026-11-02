"""Days people don't work (design 5.1, 6.7), read from the records by plain rules; no AI.

A team's days off are the holidays of its calendar (the workspace's calendar when the team names none; a language with
no calendar has none), the weekdays of the workspace's working week that the team doesn't work (`Team.working_days`),
and the team's own closures (`Team.days_off`). A person's are their teams' (the team on their record, and any team that
lists them as a member) and their own `away` periods. The weekly rest days of the workspace's own week are never
listed: every screen and the date reader already know them, and listing them would bury the days really off.

The functions only report; they never decide what a due date should be. Each answer is a list of (day, reason) in day
order, a day once with the reasons joined, and the reason is words for a reader ("Thanksgiving", "closed for the move").
"""

from __future__ import annotations

from collections.abc import Iterable
from datetime import date, timedelta
from typing import Any

from engine.config.schema import WEEKDAYS
from engine.due_phrases import holiday_date, load_holidays

#: What a day is called when its record gives no label.
CLOSED = "closed"
AWAY = "away"
NOT_WORKED = "not a working day for the team"

#: Small words a holiday's name keeps in lower case when it is written for a reader.
_SMALL = frozenset({"of", "the", "and", "a", "in", "on"})


def holiday_label(names: tuple[str, ...]) -> str:
    """A holiday's first name written for a reader ("martin luther king jr. day" is "Martin Luther King Jr. Day")."""
    words = (names[0] if names else "").split()
    return " ".join(w if (i and w in _SMALL) else w[:1].upper() + w[1:] for i, w in enumerate(words))


def _days(first: date, last: date) -> Iterable[date]:
    for n in range((last - first).days + 1):
        yield first + timedelta(days=n)


def _workspace_week(cfg: Any) -> list[int]:
    from engine.schedule import work_days

    return work_days(cfg)


def _calendar_of(cfg: Any, team: Any) -> str:
    tag = (team.data.get("holiday_calendar") if team is not None else None) or cfg.language.holiday_calendar
    return str(tag or cfg.workspace.language or "")


def team_non_working(view: Any, cfg: Any, team_id: str, start: date, end: date) -> list[tuple[date, str]]:
    """The days from `start` to `end` (both included) a team doesn't work, each with why. Empty for a team that isn't
    there."""
    team = view.get("team", team_id)
    if team is None or end < start:
        return []
    found: dict[date, list[str]] = {}

    def add(day: date, reason: str) -> None:
        if start <= day <= end and reason not in found.setdefault(day, []):
            found[day].append(reason)

    for year in range(start.year, end.year + 1):
        for holiday in load_holidays(_calendar_of(cfg, team)):
            if not holiday.off:
                continue
            try:
                add(holiday_date(holiday, year), holiday_label(holiday.names))
            except ValueError:
                continue
    own = team.data.get("working_days")
    if own:
        worked = {WEEKDAYS.index(d) for d in own}
        week = _workspace_week(cfg)
        for day in _days(start, end):
            if day.weekday() in week and day.weekday() not in worked:
                add(day, NOT_WORKED)
    for closure in team.data.get("days_off") or []:
        first = date.fromisoformat(str(closure["start"]))
        last = date.fromisoformat(str(closure.get("end") or closure["start"]))
        for day in _days(max(first, start), min(last, end)):
            add(day, (closure.get("label") or "").strip() or CLOSED)
    return [(day, ", ".join(found[day])) for day in sorted(found)]


def teams_of(view: Any, person_id: str) -> list[str]:
    """The teams a person is in: the one on their own record, and any team that lists them as a member."""
    person = view.get("person", person_id)
    if person is None:
        return []
    found = [person.data["team"]] if person.data.get("team") else []
    found += [t.id for t in view.list("team") if person_id in (t.data.get("members") or []) and t.id not in found]
    return [t for t in found if view.get("team", t) is not None]


def _kinds(view: Any, cfg: Any, person_id: str, start: date, end: date) -> list[tuple[date, str, str]]:
    """(day, whose, reason) for each reason a person is off from `start` to `end`: `whose` is "team" for a team's day
    off and "own" for the person's own away period."""
    person = view.get("person", person_id)
    if person is None or end < start:
        return []
    found: list[tuple[date, str, str]] = []
    for team_id in teams_of(view, person_id):
        found += [(day, "team", reason) for day, reason in team_non_working(view, cfg, team_id, start, end)]
    for period in person.data.get("away") or []:
        first = date.fromisoformat(str(period["start"]))
        last = date.fromisoformat(str(period.get("end") or period["start"]))
        label = (period.get("label") or "").strip() or AWAY
        found += [(day, "own", label) for day in _days(max(first, start), min(last, end))]
    return found


def non_working(view: Any, cfg: Any, person_id: str, start: date, end: date) -> list[tuple[date, str]]:
    """The days from `start` to `end` (both included) a person doesn't work: their teams' days off and their own away
    periods, each day once with its reasons. Empty for someone who isn't there."""
    found: dict[date, list[str]] = {}
    for day, _, reason in _kinds(view, cfg, person_id, start, end):
        if reason not in found.setdefault(day, []):
            found[day].append(reason)
    return [(day, ", ".join(found[day])) for day in sorted(found)]


def off_on(view: Any, cfg: Any, person_id: str, day: date, name: str) -> str | None:
    """Words saying why a person is off on a day ("Sam's team is off on Thu 11/26 (Thanksgiving)", "Sam is away on Thu
    11/26 (vacation)"), or None when they work that day. `name` is how the person is named in the words."""
    found = _kinds(view, cfg, person_id, day, day)
    if not found:
        return None
    when = f"{day.strftime('%a')} {day.month}/{day.day}"
    team = [r for _, whose, r in found if whose == "team"]
    own = [r for _, whose, r in found if whose == "own"]
    parts = []
    if team:
        parts.append(f"{name}'s team is off on {when} ({', '.join(dict.fromkeys(team))})")
    if own:
        parts.append(f"{name} is away on {when} ({', '.join(dict.fromkeys(own))})")
    return "; ".join(parts)


def _runs(days: list[tuple[date, str]]) -> list[tuple[date, date, str]]:
    """Consecutive days with the same reason as one run."""
    runs: list[tuple[date, date, str]] = []
    for day, reason in days:
        if runs and runs[-1][2] == reason and runs[-1][1] + timedelta(days=1) == day:
            runs[-1] = (runs[-1][0], day, reason)
        else:
            runs.append((day, day, reason))
    return runs


def said(runs: list[tuple[date, date, str]]) -> str:
    """Runs of days off as words for a reader: "2026-11-26 (Thursday): Thanksgiving; 2026-12-21 to 2026-12-24: away"."""
    parts = []
    for first, last, reason in runs:
        when = (
            f"{first.isoformat()} ({first.strftime('%A')})"
            if first == last
            else f"{first.isoformat()} to {last.isoformat()}"
        )
        parts.append(f"{when}: {' '.join(reason.split())}")
    return "; ".join(parts)


def packet_section(view: Any, cfg: Any, today: date, people: Iterable[str], names: dict[str, str]) -> str:
    """The days off ahead of the people an input names, for the request part of a packet; empty when the setting is
    zero or none of them has a day off in the next `steward.dates.days_off_weeks` weeks. The assistant reads it to give
    each to-do the working day that fits its owner; nothing here chooses a date."""
    weeks = cfg.steward.dates.days_off_weeks
    if weeks <= 0:
        return ""
    last = today + timedelta(weeks=weeks)
    lines = []
    for pid in sorted(people):
        days = non_working(view, cfg, pid, today, last)
        if days:
            lines.append(f"- {pid} {names.get(pid, pid)}: {said(_runs(days))}")
    if not lines:
        return ""
    head = (
        f"Days off ahead (until {last.isoformat()}) for the people this input names; "
        "give a to-do the working day that fits its owner:"
    )
    return "\n".join([head, *lines])

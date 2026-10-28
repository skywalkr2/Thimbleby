"""The gate week's instruments (design 6.32, "Measures"): each measure as a count with its denominator, for each day and
for the window, read from the records alone. Nothing here calls AI.

- Silent closes out of all closes: `closes.measure` for the window, and the same closes by the day they were made.
- Wrong endings out of endings made. An ending is an op in `ENDING_OPS` (close, drop, move, part, unhold) in a change
  the assistant made (a run's, not one the person made on a screen). It was made once it applied or the person decided
  about it; one still waiting for the person's Keep is not counted yet. It is wrong when the person declined it ("Not
  yet", recorded by `decline_held`), when they undid it, or when it was a nudge recorded as done and the person later
  reopened the action. A nudge is found from the records: an applied `action.close` whose request came from a note
  typed on "Followed up" (the source's kind is `note:followed_up`), and the reopening is the action's status going back
  to open in the ledger after that close. An ending undone and then reopened counts once.
- Missed out of present: the person's own daily count (`promise_count`), summed over the window. The app never works
  it out.
- Review time: the seconds the screens that look over the assistant's work were open and in view (Today's review pane
  included), each day's total, and the median of those totals over the days with any.
- Lost promises: promises that existed and then vanished with no ending anyone saw (see `lost_measure`).
- Sources not read: connected sources unread for more than a day while Today said nothing (see `sources_measure`).
- The replay set: how many replay files the workspace has. When the replays last ran is not recorded anywhere that
  tells them from the golden set's runs, so it isn't shown.

A day is a day on the person's own clock. The window is the configured number of days ending today, whole days.
"""

from __future__ import annotations

import json
import statistics
import typing
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta, tzinfo
from pathlib import Path
from typing import Any

from engine import closes
from engine.applier import DECLINED_REASON, ENDING_OPS
from engine.names import People
from engine.promises import is_promise
from engine.storage import StoreError, WriteContext
from engine.today import zone

#: Where the person's own count is written: the person's own entry on a screen.
_COUNT = WriteContext(actor="pm", trust="trusted", op="gate.count")
#: The kind of source a note typed on "Followed up" is.
NUDGE_SOURCE = "note:followed_up"


class CountError(StoreError):
    """The day's count can't be saved as it was typed."""


# ---- the window ------------------------------------------------------------------------------------------------------


@dataclass(frozen=True)
class Window:
    since: date  # the first day
    until: date  # the last day: today
    start: datetime  # the start of the first day
    end: datetime  # now


def window(now: datetime, days: int, here: tzinfo) -> Window:
    """The `days` days before today and today, on the person's clock."""
    today = now.astimezone(here).date()
    first = today - timedelta(days=days)
    return Window(first, today, datetime.combine(first, time(0), tzinfo=here).astimezone(UTC), now)


def _moment(stamp: Any) -> datetime | None:
    if isinstance(stamp, datetime):
        return stamp if stamp.tzinfo else stamp.replace(tzinfo=UTC)
    try:
        moment = datetime.fromisoformat(str(stamp))
    except (TypeError, ValueError):
        return None
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


def _day_of(stamp: Any, here: tzinfo) -> date | None:
    moment = _moment(stamp)
    return moment.astimezone(here).date() if moment is not None else None


def end_of(day: date, here: tzinfo) -> datetime:
    """The last second of a day on the person's own clock."""
    return datetime.combine(day, time(23, 59, 59), tzinfo=here)


def _days(win: Window) -> list[date]:
    return [win.since + timedelta(days=n) for n in range((win.until - win.since).days + 1)]


# ---- silent closes out of all closes ---------------------------------------------------------------------------------


@dataclass(frozen=True)
class CloseDay:
    day: date
    total: int
    silent: int


@dataclass(frozen=True)
class ClosesMeasure:
    total: int
    silent: int
    days: list[CloseDay] = field(default_factory=list)  # days with a close, oldest first


def closes_measure(view: Any, win: Window, here: tzinfo) -> ClosesMeasure:
    """Silent closes out of all closes in the window, and for each day with a close."""
    whole = closes.measure(view, win.start, win.end)
    total: dict[date, int] = defaultdict(int)
    silent: dict[date, int] = defaultdict(int)
    for close in closes.collect(view, win.start, win.end):
        day = _day_of(close.when, here)
        if day is None:
            continue
        total[day] += 1
        silent[day] += close.silent
    return ClosesMeasure(whole.total, whole.silent, [CloseDay(d, total[d], silent[d]) for d in sorted(total)])


# ---- wrong endings out of endings made -------------------------------------------------------------------------------

_ENDING_NAMES = frozenset(typing.get_args(cls.model_fields["op"].annotation)[0] for cls in ENDING_OPS)


@dataclass(frozen=True)
class EndingDay:
    day: date
    made: int
    wrong: int


@dataclass(frozen=True)
class EndingsMeasure:
    made: int
    wrong: int
    declined: int  # wrong: the person kept things as they were ("Not yet")
    undone: int  # wrong: the person undid it
    reopened: int  # wrong: a nudge recorded as done, reopened by the person
    days: list[EndingDay] = field(default_factory=list)  # days with an ending made, oldest first


def _reopened_after(ledger: list[dict[str, Any]], changeset: str, action: str) -> bool:
    """Whether the action's status went back to open after the change closed it."""
    closed = [
        e["seq"]
        for e in ledger
        if e["changeset"] == changeset and e["record_id"] == action and e["field"] == "status" and e["after"] == "done"
    ]
    if not closed:
        return False
    return any(
        e["record_id"] == action and e["field"] == "status" and e["after"] == "open" and e["seq"] > min(closed)
        for e in ledger
    )


def endings_measure(view: Any, ledger: list[dict[str, Any]], win: Window, here: tzinfo) -> EndingsMeasure:
    """Wrong endings out of endings made in the window, by the day each was made. `ledger` is the action ledger."""
    made: dict[date, int] = defaultdict(int)
    wrong: dict[date, int] = defaultdict(int)
    kinds = {"declined": 0, "undone": 0, "reopened": 0}
    for cs in view.list("changeset"):
        data = cs.data
        when = _moment(data["created_at"])
        request = view.get("request", data["request"]) if data.get("request") else None
        # A change made on a screen has no run: the person made it. One from the person's note that a run read is the
        # assistant's.
        own = data.get("action") or (request is not None and request.data.get("origin") == "pm" and not data.get("run"))
        if own or when is None or not win.start <= when <= win.end:
            continue
        nudged = False
        source = (
            view.get("source", request.data["source"]) if request is not None and request.data.get("source") else None
        )
        if source is not None and source.data.get("kind") == NUDGE_SOURCE:
            nudged = True
        day = when.astimezone(here).date()
        for outcome in data["ops"]:
            op = outcome.get("op") or {}
            if op.get("op") not in _ENDING_NAMES:
                continue
            status = outcome.get("status")
            if status == "applied":
                how = (
                    "reopened"
                    if nudged and op["op"] == "action.close" and _reopened_after(ledger, cs.id, op["id"])
                    else None
                )
            elif status == "undone":
                how = "declined" if outcome.get("reason") == DECLINED_REASON else "undone"
            else:
                continue  # waiting, refused or rejected: not an ending made
            made[day] += 1
            if how:
                wrong[day] += 1
                kinds[how] += 1
    return EndingsMeasure(
        made=sum(made.values()),
        wrong=sum(wrong.values()),
        declined=kinds["declined"],
        undone=kinds["undone"],
        reopened=kinds["reopened"],
        days=[EndingDay(d, made[d], wrong[d]) for d in sorted(made)],
    )


# ---- missed out of present: the person's own daily count -------------------------------------------------------------


@dataclass(frozen=True)
class CountDay:
    day: date
    present: int
    missed: int


@dataclass(frozen=True)
class CountsMeasure:
    present: int
    missed: int
    entered: int  # days with a count
    days: list[CountDay] = field(default_factory=list)  # oldest first


def _day(value: Any) -> date | None:
    try:
        return value if isinstance(value, date) and not isinstance(value, datetime) else date.fromisoformat(str(value))
    except ValueError:
        return None


def counts_measure(view: Any, person: str | None, win: Window) -> CountsMeasure:
    """The counts `person` entered for the days of the window, summed: missed out of present."""
    found = []
    for record in view.list("promise_count"):
        day = _day(record.data["day"])
        if record.data.get("person") == person and day is not None and win.since <= day <= win.until:
            found.append(CountDay(day, record.data["present"], record.data["missed"]))
    found.sort(key=lambda c: c.day)
    return CountsMeasure(sum(c.present for c in found), sum(c.missed for c in found), len(found), found)


def _count_of(tx: Any, person: str | None, day: date) -> Any:
    for record in tx.list("promise_count"):
        if record.data.get("person") == person and _day(record.data["day"]) == day:
            return record
    return None


def save_count(
    store: Any, cfg: Any, day: date, present: int, missed: int, *, now: datetime | None = None
) -> dict[str, int] | None:
    """Save the person's count for a day, or correct the day's count. Returns what the day held before (`present` and
    `missed`), or None when it had nothing, which `restore_count` takes."""
    now = now or datetime.now(UTC)
    if present < 0 or missed < 0:
        raise CountError("A count can't be less than zero.")
    if missed > present:
        raise CountError("You can't have missed more than you counted.")
    if day > now.astimezone(zone(cfg)).date():
        raise CountError("That day hasn't happened yet.")
    person = People(store, cfg).pm
    values = {"present": present, "missed": missed, "at": now.isoformat()}
    with store.transaction() as tx:
        current = _count_of(tx, person, day)
        if current is None:
            tx.create("promise_count", {"person": person, "day": day.isoformat(), **values}, _COUNT)
            return None
        previous = {"present": current.data["present"], "missed": current.data["missed"]}
        tx.update("promise_count", current.id, values, _COUNT, read_version=current.version)
        return previous


def restore_count(store: Any, cfg: Any, day: date, previous: dict[str, int] | None) -> None:
    """Undo `save_count`: the day holds what it held before, or nothing."""
    person = People(store, cfg).pm
    with store.transaction() as tx:
        current = _count_of(tx, person, day)
        if current is None:
            raise CountError("There is no count for that day.")
        if previous is None:
            tx.delete("promise_count", current.id, _COUNT, read_version=current.version)
        else:
            tx.update(
                "promise_count",
                current.id,
                {"present": previous["present"], "missed": previous["missed"]},
                _COUNT,
                read_version=current.version,
            )


# ---- review time -----------------------------------------------------------------------------------------------------


@dataclass(frozen=True)
class ReviewDay:
    day: date
    seconds: int
    visits: int


@dataclass(frozen=True)
class ReviewMeasure:
    median_seconds: int | None  # None when no day has any review
    days_reviewed: int
    total_seconds: int
    visits: int
    days: list[ReviewDay] = field(default_factory=list)  # days with review time, newest first


def review_measure(view: Any, win: Window, here: tzinfo) -> ReviewMeasure:
    """Review time in the window: each `review_time` signal is one visit to a screen that looks over the assistant's
    work (the review pane on Today, What changed, Since yesterday, the review mode, Handled for you, the follow-ups, the
    to-dos and questions, and what the assistant knows), by the day it was recorded. The
    median is of a day's total over the days with any visit: a day nobody reviewed is not a day of review, so counting
    it as zero would let the figure pass by not looking."""
    seconds: dict[date, int] = defaultdict(int)
    visits: dict[date, int] = defaultdict(int)
    for signal in view.list("signal"):
        if signal.data["kind"] != "review_time":
            continue
        when = _moment(signal.data["at"])
        try:
            said = json.loads(signal.data.get("note") or "")
        except ValueError:
            continue
        if when is None or not isinstance(said, dict) or not win.start <= when <= win.end:
            continue
        day = when.astimezone(here).date()
        seconds[day] += int(said.get("seconds") or 0)
        visits[day] += 1
    days = [ReviewDay(d, seconds[d], visits[d]) for d in sorted(seconds, reverse=True)]
    median = int(statistics.median(seconds.values())) if seconds else None
    return ReviewMeasure(median, len(days), sum(seconds.values()), sum(visits.values()), days)


# ---- lost promises ---------------------------------------------------------------------------------------------------

#: The most lost promises listed by name.
LOST_LISTED = 20


@dataclass(frozen=True)
class LostItem:
    id: str
    text: str
    day: date


@dataclass(frozen=True)
class LostDay:
    day: date
    existed: int
    lost: int


@dataclass(frozen=True)
class LostMeasure:
    existed: int
    lost: int
    days: list[LostDay] = field(default_factory=list)  # days a promise was lost, oldest first
    items: list[LostItem] = field(default_factory=list)  # newest first, at most `LOST_LISTED`


def _accounted(entry: dict[str, Any]) -> bool:
    """Whether the write that took a promise out of view is one somebody saw: a person's own action (a screen, a kept or
    declined hold, an Undo) or an ending op (`ENDING_OPS`), whose change is on What changed with its Undo."""
    return entry["actor"] == "pm" or str(entry["op"]).split("#", 1)[0] in _ENDING_NAMES


def lost_measure(view: Any, ledger: list[dict[str, Any]], win: Window, here: tzinfo) -> LostMeasure:
    """Lost promises out of promises that existed, read from the action ledger.

    A *promise* is an action read as one (`promises.is_promise`). It *existed in the window* when it was open at some
    time in it. It *vanished* when its status left open or its record was deleted, and it stays gone: a promise brought
    back (an Undo, a reopening, an undelete) has not vanished. The
    vanishing is *lost* when the write that did it is not accounted for: it was not the person's own action (the
    ledger's actor is `pm`: a screen, a hold they kept, an Undo, a deletion they made) and it was not an ending op
    (`action.close`, `action.drop`, `action.move`, `action.part`, `action.unhold`, the ledger's op name before `#`),
    which is a change they can see and undo on What changed. A write by a sweep, a plugin or a status set by
    another op is lost. The silent close is its own measure: an ending op the person hasn't seen is not lost, it is
    silent. Each is counted by the day, on the person's clock, that it vanished."""
    history: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in ledger:
        history[entry["record_id"]].append(entry)
    existed = 0
    lost_items: list[LostItem] = []
    per_day: dict[date, int] = defaultdict(int)
    for record in view.list("action", include_deleted=True):
        if not is_promise(record.data) or not history.get(record.id):
            continue
        entries = history[record.id]
        made = _moment(entries[0]["at"])
        if made is None or made > win.end:
            continue
        closed: dict[str, Any] | None = None  # the write that took the status out of open, while it stands
        deleted: dict[str, Any] | None = None  # the write that deleted the record, while it stands
        for entry in entries:
            if entry["field"] == "status":
                closed = None if entry["after"] == "open" else (closed or entry)
            elif entry["field"] is None and entry["version"] > 1:
                deleted = None if deleted is not None else entry  # a delete, then an undelete, and so on
        gone = sorted((e for e in (closed, deleted) if e is not None), key=lambda e: e["seq"])
        vanished = _moment(gone[0]["at"]) if gone else None
        if vanished is not None and vanished < win.start:
            continue  # it was gone before the window began: not a promise of the window
        existed += 1
        if vanished is None or _accounted(gone[0]) or not win.start <= vanished <= win.end:
            continue
        day = vanished.astimezone(here).date()
        per_day[day] += 1
        lost_items.append(LostItem(record.id, str(record.data["text"]), day))
    lost_items.sort(key=lambda i: (i.day, i.id), reverse=True)
    return LostMeasure(
        existed,
        sum(per_day.values()),
        [LostDay(d, existed, per_day[d]) for d in sorted(per_day)],
        lost_items[:LOST_LISTED],
    )


# ---- sources not read ------------------------------------------------------------------------------------------------

#: A source counts as unread when its last good read, or its first try when it never had one, is older than this.
UNREAD_AFTER = timedelta(hours=24)


@dataclass(frozen=True)
class SourceDay:
    day: date
    checked: int
    over_a_day: int
    silent: int


@dataclass(frozen=True)
class SourcesMeasure:
    checked: int  # source-days: each connected source on each day it was connected
    over_a_day: int  # of those, the ones unread for more than a day
    silent: int  # of those, the ones Today had no line about
    days: list[SourceDay] = field(default_factory=list)  # days with a source connected, oldest first


def coverage_line(last_outcome: str, read_at: datetime | None, now: datetime, stale_after_hours: int) -> str | None:
    """What Today says about a source that is on, as the screen's coverage line does (`web/src/lib/coverage.ts`): that
    it couldn't be read (its latest try failed or found no network), that it hasn't been read within the configured
    hours, or that it isn't read yet; nothing for a source read lately."""
    if last_outcome in ("failed", "offline"):
        return "unread"
    if read_at is not None:
        return "stale" if now - read_at > timedelta(hours=stale_after_hours) else None
    return "pending"


def sources_measure(view: Any, cfg: Any, win: Window, here: tzinfo) -> SourcesMeasure:
    """Sources unread for more than a day while Today showed no line, counted in source-days.

    For each day of the window, at its last second (at the moment of the call for today), each source that is on and
    had been tried by then is *checked*. It is *unread over a day* when its last good read (`ok` or `baseline`), or its
    first try when it never had one, is more than `UNREAD_AFTER` before. It is *silent* when `coverage_line` would
    have said nothing about it at that moment. The reads come from the watch runs on record; the stale hours and the
    sources are as configured now, since a past setting is not kept."""
    runs = {s.id: view.find("watch_run", {"source": s.id}) for s in cfg.watch.sources if s.enabled}
    per_day: list[SourceDay] = []
    for day in _days(win):
        moment = min(end_of(day, here), win.end)
        checked = over = silent = 0
        for found in runs.values():
            tried = [r for r in found if (_moment(r.data["started_at"]) or moment) <= moment]
            if not tried:
                continue
            checked += 1
            tried.sort(key=lambda r: str(r.data["started_at"]))
            good = [r for r in tried if r.data["outcome"] in ("ok", "baseline")]
            read_at = _moment(good[-1].data["started_at"]) if good else None
            anchor = read_at or _moment(tried[0].data["started_at"])
            if anchor is None or moment - anchor <= UNREAD_AFTER:
                continue
            over += 1
            if coverage_line(tried[-1].data["outcome"], read_at, moment, cfg.watch.stale_after_hours) is None:
                silent += 1
        if checked:
            per_day.append(SourceDay(day, checked, over, silent))
    return SourcesMeasure(
        sum(d.checked for d in per_day), sum(d.over_a_day for d in per_day), sum(d.silent for d in per_day), per_day
    )


# ---- the replay set --------------------------------------------------------------------------------------------------


def replay_count(workspace: Path) -> int:
    """How many replay files the workspace has (a file that can't be read still counts: it is a miss someone kept)."""
    folder = workspace / "replays"
    return len(list(folder.glob("*.yaml"))) if folder.is_dir() else 0

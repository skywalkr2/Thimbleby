"""Top priorities and This week on Today, and the schedule (design 7.7). Each is read from the records each time it is
asked for; a row's actions use the routes the other screens use (`POST /api/actions/{id}/status` to mark done, `POST
/api/records/edit` to reassign), each the person's own change with Undo."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query

from api.schemas import (
    AgendaItemView,
    ComingView,
    ConnectedEventView,
    ConnectedPersonView,
    OwnerNameView,
    PriorityLineView,
    PriorityThingView,
    ScheduleDayView,
    ScheduleEntryView,
    ScheduleView,
    ThisWeekView,
    TopPrioritiesView,
    WeekDueView,
    WeekWaitingView,
)
from engine import schedule as schedule_module
from engine import sides
from engine.config import Config
from engine.config.schema import WEEKDAYS
from engine.names import People, render_owner
from engine.storage import Store
from engine.this_week import this_week
from engine.top_priorities import top_priorities
from engine.worker import Events, Worker
from engine.workspace import Workspace


def _entry_view(entry: schedule_module.Entry) -> ScheduleEntryView:
    return ScheduleEntryView(
        **vars(entry.item),
        slot=entry.slot,
        begins=entry.begins,
        ends=entry.ends,
        kind=entry.kind,
        side=entry.side,
        action=entry.action,
    )


def build_today_router(ws: Workspace, cfg: Config, store: Store, events: Events, worker: Worker) -> APIRouter:
    r = APIRouter(prefix="/api")

    def owners_of(people: People, data: dict[str, Any]) -> list[OwnerNameView]:
        return [
            OwnerNameView(
                person=o["person"],
                name=render_owner(
                    people.owner_format, people.name(o["person"]), people.team_names.get(o.get("team") or "")
                ),
                team=o.get("team"),
            )
            for o in data.get("owners") or []
        ]

    def owner_ids(people: People, ids: list[str]) -> list[OwnerNameView]:
        return [OwnerNameView(person=p, name=people.name(p)) for p in ids]

    @r.get("/today/priorities")
    def priorities() -> TopPrioritiesView:
        """Top priorities: a short ranked list across every project, by rules and never by an AI call. Overdue first,
        then waiting on the person, due within the follow-up window, then at risk; one line for each other person; a
        blocked action only as the question or action that holds it up; the blocked counted; and the dated to-dos of
        the next days after the lines."""
        reader = store.read()
        people = People(store, cfg)
        projects = sides.project_names(reader, cfg)
        found = top_priorities(store, cfg, worker.now())
        lines = []
        for line in found.lines:
            record = reader.get("action", line.action) if line.action else None
            lines.append(
                PriorityLineView(
                    key=line.key,
                    rank=line.rank,  # type: ignore[arg-type]
                    kind=line.kind,  # type: ignore[arg-type]
                    person=line.person,
                    person_name=people.name(line.person) if line.person else None,
                    text=line.text,
                    project=line.project,
                    project_name=projects.get(line.project or ""),
                    side_name=sides.side_name_of(reader, cfg, line.project),
                    due=line.due,
                    days=line.days,
                    action=line.action,
                    question=line.question,
                    version=record.version if record is not None else None,
                    owners=owners_of(people, record.data) if record is not None else [],
                    holds_up=line.holds_up,
                    send=line.send,
                    chase=line.chase,
                    overdue=line.overdue,
                    due_soon=line.due_soon,
                    waiting_days=line.waiting_days,
                    things=[PriorityThingView(**vars(t)) for t in line.things],  # type: ignore[arg-type]
                )
            )
        return TopPrioritiesView(
            lines=lines,
            more=found.more,
            blocked=found.blocked,
            coming=[
                ComingView(
                    action=c.action,
                    text=c.text,
                    due=c.due,
                    project=c.project,
                    project_name=projects.get(c.project or ""),
                    side_name=sides.side_name_of(reader, cfg, c.project),
                    owners=owner_ids(people, c.owners),
                    mine=c.mine,
                )
                for c in found.coming
            ],
        )

    @r.get("/today/week")
    def week() -> ThisWeekView:
        """This week, from today through the configured last working day: what is due, who is waiting on the person and
        the meetings to hold, across projects."""
        people = People(store, cfg)
        projects = sides.project_names(store.read(), cfg)
        found = this_week(store, cfg, worker.now())
        return ThisWeekView(
            first=found.first,
            last=found.last,
            due=[
                WeekDueView(
                    action=d.action,
                    text=d.text,
                    due=d.due,
                    project=d.project,
                    project_name=projects.get(d.project or ""),
                    side_name=sides.side_name_of(store.read(), cfg, d.project),
                    owners=owner_ids(people, d.owners),
                    mine=d.mine,
                    kind=d.kind,
                )
                for d in found.due
            ],
            waiting=[
                WeekWaitingView(person=w.person, person_name=people.name(w.person), count=w.count, due=w.due)
                for w in found.waiting
            ],
            meetings=[AgendaItemView(**vars(m)) for m in found.meetings],
        )

    @r.get("/schedule")
    def schedule(
        start: Annotated[date | None, Query(alias="from", description="The first day; today when none.")] = None,
        days: Annotated[
            int | None,
            Query(ge=1, le=schedule_module.MOST_DAYS, description="How many days; `ui.today.schedule_days` when none."),
        ] = None,
    ) -> ScheduleView:
        """A run of days from `from`, each with its all-day entries apart and its timed entries in time order, from the
        connected calendars and the app's own entries, in the person's time zone."""
        from engine.today import zone

        now = worker.now()
        try:
            found = schedule_module.schedule(store, cfg, now, start, days)
        except (OverflowError, ValueError):
            raise HTTPException(status_code=422, detail="that day is out of range") from None
        return ScheduleView(
            today=now.astimezone(zone(cfg)).date(),
            first=found[0].date,
            days=[
                ScheduleDayView(
                    date=d.date,
                    all_day=[_entry_view(e) for e in d.all_day],
                    timed=[_entry_view(e) for e in d.timed],
                )
                for d in found
            ],
            on_its_way=[_entry_view(e) for e in schedule_module.on_its_way(store, cfg, now)],
            work_days=schedule_module.work_days(cfg),
            week_starts_on=WEEKDAYS.index(cfg.ui.schedule.week_starts_on),
            grid_starts=cfg.ui.schedule.day_starts,
            grid_ends=cfg.ui.schedule.day_ends,
            month_entries=cfg.ui.schedule.month_entries,
        )

    @r.get("/schedule/events/{snapshot}")
    def schedule_event(
        snapshot: str,
        start: Annotated[
            str | None, Query(description="The start of the date of a repeating event to show; the first when none.")
        ] = None,
    ) -> ConnectedEventView:
        """What a connected calendar says about one event the app keeps no entry for: title, time, place, who is
        coming and where to open it. Nothing is read from the service."""
        found = schedule_module.connected_event(store, cfg, snapshot, start)
        if found is None:
            raise HTTPException(status_code=404, detail="That event isn't on a connected calendar any more.")
        return ConnectedEventView(
            **{k: v for k, v in vars(found).items() if k not in ("organizer", "attendees")},
            organizer=ConnectedPersonView(**vars(found.organizer)) if found.organizer else None,
            attendees=[ConnectedPersonView(**vars(p)) for p in found.attendees],
        )

    return r

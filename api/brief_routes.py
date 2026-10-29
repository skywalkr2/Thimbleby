"""The morning brief, the evening wrap-up and the Monday briefing (design 6.32): the form that is due, the week's goals
and the message to whoever the person reports to.

Reading writes nothing. Confirming goals is the person's own change, answered with what it replaced so that sending that
back is Undo. Asking for the message queues one request that goes the usual way (estimate, the person's go above the
configured amount); copying it marks the draft as the person's. Nothing here sends anything."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, HTTPException

from api.schemas import (
    BriefChoiceView,
    BriefGoalsIn,
    BriefGoalsKept,
    BriefGoalsView,
    BriefLineView,
    BriefMessageAsk,
    BriefMessageFor,
    BriefMessageForSaved,
    BriefMessageView,
    BriefSectionView,
    BriefView,
    HandedOver,
    Ok,
    OwnerNameView,
    RecordRef,
)
from engine import brief, sides, week_plan
from engine.config import Config
from engine.names import People
from engine.storage import Store, StoreError
from engine.worker import Events, Worker
from engine.workspace import Workspace


def build_brief_router(ws: Workspace, cfg: Config, store: Store, events: Events, worker: Worker) -> APIRouter:
    r = APIRouter(prefix="/api")

    def line_view(line: brief.Line) -> BriefLineView:
        values: dict[str, Any] = {k: v for k, v in vars(line).items() if k != "link"}
        return BriefLineView(
            **values,
            link=RecordRef(kind=line.link[0], id=line.link[1]) if line.link else None,
            side=sides.side_of_record(store.read(), cfg, *line.link) if line.link else None,
        )

    @r.get("/brief")
    def get_brief(form: Literal["morning", "evening", "monday"] | None = None) -> BriefView:
        """The form of the brief that is due now, or the one named. `form` is none before the morning time, and when the
        brief is turned off."""
        found = brief.build(ws, store, cfg, worker.now(), form)
        people = People(store, cfg)
        goals = found.goals
        message = found.message
        return BriefView(
            form=found.form,  # type: ignore[arg-type]
            day=found.day,
            forms=found.forms,  # type: ignore[arg-type]
            sections=[
                BriefSectionView(key=s.key, lines=[line_view(x) for x in s.lines], more=s.more) for s in found.sections
            ],
            quiet=found.quiet,
            on_today=found.on_today,
            goals=BriefGoalsView(**vars(goals)) if goals is not None else None,
            message=BriefMessageView(
                state=message.state,  # type: ignore[arg-type]
                to=[OwnerNameView(person=p, name=people.name(p)) for p in message.to],
                choices=[
                    BriefChoiceView(
                        person=p,
                        name=people.name(p),
                        role=(store.read().get("person", p).data.get("role") or None),
                    )
                    for p in message.choices
                ],
                text=message.text,
                estimate_usd=message.estimate_usd,
            )
            if message is not None
            else None,
        )

    @r.put("/brief/goals")
    def put_goals(body: BriefGoalsIn) -> BriefGoalsKept:
        """Confirm the goals for this week as the person's own, or take them back out with none. Sending the previous
        goals again is Undo."""
        try:
            previous = week_plan.set_goals(store, cfg, body.goals, worker.now())
        except week_plan.GoalsError as err:
            raise HTTPException(status_code=422, detail=str(err)) from None
        events.changed()
        return BriefGoalsKept(previous=previous)

    @r.post("/brief/weekly/dismiss")
    def dismiss_weekly() -> Ok:
        """Dismiss the offer of this week's briefing: the morning brief stops offering it for the week. Undo is
        POST /api/brief/weekly/undismiss."""
        week_plan.set_offer_dismissed(store, cfg, worker.now(), True)
        events.changed()
        return Ok(ok="dismissed")

    @r.post("/brief/weekly/undismiss")
    def undismiss_weekly() -> Ok:
        """Take back the dismissal: the week's briefing is offered again."""
        week_plan.set_offer_dismissed(store, cfg, worker.now(), False)
        events.changed()
        return Ok(ok="offered")

    @r.post("/brief/message")
    def ask_for_message(body: BriefMessageAsk) -> HandedOver:
        """Ask the assistant to draft this week's message to whoever the person reports to."""
        try:
            request = week_plan.ask_for_message(store, cfg, worker.now(), body.note)
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        worker.poke()
        return HandedOver(request=request)

    @r.post("/brief/message/for")
    def message_for(body: BriefMessageFor) -> BriefMessageForSaved:
        """Answer, once, who the Monday message is for: mark a person as someone the person reports to (an ordinary
        change with Undo), or say nobody, so the briefing stops asking. `nobody` false takes the last answer back."""
        changeset = None
        try:
            if body.person is not None:
                changeset = week_plan.set_report_to(store, cfg, body.person)
            else:
                week_plan.set_reports_to_nobody(store, cfg, worker.now(), bool(body.nobody))
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        return BriefMessageForSaved(changeset=changeset)

    @r.post("/brief/message/copied")
    def message_copied() -> Ok:
        """The person copied the message: the draft waiting for review is theirs as it is."""
        if not week_plan.copied(store, cfg, worker.now()):
            raise HTTPException(status_code=409, detail="There is no message waiting to be copied.")
        events.changed()
        return Ok(ok="copied")

    return r

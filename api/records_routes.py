"""Routes for the records screens (design 7.14): what the assistant filed under no project, and the pages of a series
and a fact that need more than a record's own fields."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.schemas import (
    Applied,
    AreaKeep,
    AreaKept,
    FilingItem,
    FilingKept,
    FilingMove,
    FilingMoved,
    FilingQuestion,
    FilingQuestions,
    ProjectKnowsView,
    SeriesPageView,
    UnfiledFile,
    UnfiledItem,
    UnfiledView,
)
from engine import areas, filing, project_knows, series_page
from engine import unfiled as unfiled_module
from engine.applier import apply_as_person
from engine.config import Config
from engine.storage import Store, StoreError
from engine.today import zone
from engine.worker import Events, Worker


def build_records_router(cfg: Config, store: Store, events: Events, worker: Worker) -> APIRouter:
    r = APIRouter(prefix="/api")

    @r.get("/unfiled")
    def unfiled() -> UnfiledView:
        """The notes, actions, questions and facts the assistant filed under no project (or under one since removed),
        newest first."""
        items = [
            UnfiledItem(
                kind=i.kind,  # type: ignore[arg-type]
                id=i.id,
                version=i.version,
                text=i.text,
                created_at=i.created_at or None,
                trust=i.trust,  # type: ignore[arg-type]
            )
            for i in unfiled_module.unfiled(store.read())
        ]
        return UnfiledView(count=len(items), items=items)

    @r.post("/unfiled/file")
    def file_unfiled(body: UnfiledFile) -> Applied:
        """File several items under one project as the person's own edit, in one change with Undo. Each item's
        project is an edit of the assistant's work, so each is recorded as a correction."""
        view = store.read()
        if view.get("project", body.project) is None:
            raise HTTPException(status_code=404, detail=f"There is no project {body.project}.")
        try:
            ops = unfiled_module.file_ops(view, [(i.kind, i.id, i.read_version) for i in body.items], body.project)
            cs_id = apply_as_person(store, cfg, ops, "Filed under a project on screen")
        except (StoreError, ValueError) as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        return Applied(changeset=cs_id)

    @r.get("/filing/questions")
    def filing_questions() -> FilingQuestions:
        """The questions of which side unsure items belong to: for each side, the items waiting under Personal that
        could be its own (none when the person answered that side's question today)."""
        asked = filing.questions(store.read(), cfg, worker.now())
        return FilingQuestions(
            questions=[
                FilingQuestion(
                    side=q.side,
                    name=q.name,
                    items=[
                        FilingItem(kind=i.kind, id=i.id, version=i.version, text=i.text)  # type: ignore[arg-type]
                        for i in q.items
                    ],
                )
                for q in asked
            ]
        )

    @r.post("/filing/move")
    def filing_move(body: FilingMove) -> FilingMoved:
        """Move unsure items from Personal to a side, as the person's own change with Undo; each is a correction. A
        second move of the same sender's items proposes a rule for it, held for Keep."""
        try:
            done = filing.move(
                store, cfg, body.side, [(i.kind, i.id, i.read_version) for i in body.items], worker.now()
            )
        except (StoreError, ValueError) as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        return FilingMoved(changeset=done.changeset, count=done.count, rule=done.rule)

    @r.post("/filing/keep")
    def filing_keep(body: FilingMove) -> FilingKept:
        """Keep unsure items under Personal: they are not asked about again, and nothing about them changes."""
        try:
            made = filing.keep(
                store, cfg, body.side, [(i.kind, i.id, i.read_version) for i in body.items], worker.now()
            )
        except (StoreError, ValueError) as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        return FilingKept(signal=made)

    @r.post("/areas/keep")
    def keep_area(body: AreaKeep) -> AreaKept:
        """Keep the area offered for a word: start it under the personal project and file the items that share the
        word under it, as the person's own edits with Undo (two changes, filing first)."""
        try:
            kept = areas.keep(store, cfg, body.word, body.name)
        except (StoreError, ValueError) as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        return AreaKept(project=kept.project, filed=kept.filed, started=kept.started)

    @r.get("/series/{series_id}/page")
    def series(series_id: str) -> SeriesPageView:
        """A series' page: the next meeting with what is open for it by person (the person last), and the meetings
        that passed, each with what was settled and what moved on."""
        here = zone(cfg)
        found = series_page.page(
            store.read(),
            series_id,
            worker.now().astimezone(here).date(),
            here,
            pm=cfg.workspace.user.person,
            owner_format=cfg.workspace.owner_format,
            settings=cfg.ui.series,
        )
        if found is None:
            raise HTTPException(status_code=404, detail=f"There is no series {series_id}.")
        return SeriesPageView(**found)

    @r.get("/projects/{project_id}/knows")
    def project_knows_view(project_id: str) -> ProjectKnowsView:
        """What the assistant knows about a project: where its inputs come from and the last of each, its facts with
        who they rest on and when, the glossary terms used there, who answers what, and what is still unknown with the
        question asked for it."""
        found = project_knows.knows(store.read(), project_id, cfg)
        if found is None:
            raise HTTPException(status_code=404, detail=f"There is no project {project_id}.")
        return ProjectKnowsView(**found)

    return r

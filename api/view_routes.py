"""Views (design 6.32): the person's own named lists of projects inside a side. Each change is the person's own, applied
at once and answered with its changeset so Undo takes it back."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from api.schemas import ViewAddIn, ViewApplied, ViewProjectsIn, ViewProjectView, ViewRenameIn, WorkViewView
from engine import sides
from engine.applier import apply_as_person
from engine.config import Config
from engine.storage import Store, StoreError
from engine.views import live_projects, view_records
from engine.worker import Events, Worker
from engine.workspace import Workspace


def build_view_router(ws: Workspace, cfg: Config, store: Store, events: Events, worker: Worker) -> APIRouter:
    r = APIRouter(prefix="/api")

    def shown() -> list[WorkViewView]:
        read = store.read()
        names = sides.project_names(read, cfg)
        side_names = sides.side_names(read, cfg)
        return [
            WorkViewView(
                id=v.id,
                name=v.data["name"],
                label=v.data["label"],
                side=v.data["side"],
                side_name=side_names.get(v.data["side"], ""),
                projects=[ViewProjectView(id=p, name=names.get(p, "")) for p in live_projects(read, v) if p in names],
            )
            for v in view_records(read)
        ]

    def change(op: dict[str, Any], summary: str) -> str:
        try:
            cs_id = apply_as_person(store, cfg, [op], summary)
        except (StoreError, ValueError) as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        return cs_id

    def need(view_id: str) -> None:
        if store.read().get("view", view_id) is None:
            raise HTTPException(status_code=404, detail="not found")

    @r.get("/views")
    def views() -> list[WorkViewView]:
        """The person's views, in the order they were made."""
        return shown()

    @r.post("/views")
    def add(body: ViewAddIn) -> ViewApplied:
        """Make a view of a side's projects, with Undo."""
        op: dict[str, Any] = {"op": "view.add", "name": body.name, "side": body.side, "projects": body.projects}
        if body.label:
            op["label"] = body.label
        before = {v.id for v in view_records(store.read())}
        cs_id = change(op, "Added a view")
        made = [v.id for v in view_records(store.read()) if v.id not in before]
        return ViewApplied(changeset=cs_id, view=made[0] if made else None)

    @r.post("/views/{view_id}/rename")
    def rename(view_id: str, body: ViewRenameIn) -> ViewApplied:
        """Rename a view, and its tag when one is given, with Undo."""
        need(view_id)
        op: dict[str, Any] = {"op": "view.set", "id": view_id, "name": body.name}
        if body.label:
            op["label"] = body.label
        return ViewApplied(changeset=change(op, "Renamed a view"))

    @r.post("/views/{view_id}/projects")
    def set_projects(view_id: str, body: ViewProjectsIn) -> ViewApplied:
        """Replace the projects a view holds, with Undo."""
        need(view_id)
        op = {"op": "view.set", "id": view_id, "projects": body.projects}
        return ViewApplied(changeset=change(op, "Changed the projects in a view"))

    @r.delete("/views/{view_id}")
    def remove(view_id: str) -> ViewApplied:
        """Remove a view; the projects stay as they are. Undo brings it back."""
        need(view_id)
        return ViewApplied(changeset=change({"op": "view.remove", "id": view_id}, "Removed a view"))

    return r

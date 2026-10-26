"""Where a record is written in the synced folder: the folder of one project, or the workspace's own.

By default a record is written in the folder of the project its `project` field names, else (for a kind that declares
`layout_project`) in the folder of the project the record that reference points at is in, else at the workspace level.
A record type may say otherwise when it is registered (`registrar.record_type(model, placed_by=...)`): `placed_by`
names the reference field that places it (the project of the record that field points at, or that project itself when
it points at a project), and `placed_by=None` writes every record of the kind at the workspace level.
"""

from __future__ import annotations

from typing import Any

from engine.projects import project_of
from engine.records import ref_fields

#: The three ways a kind is placed: by its project (the default), by one reference field, or always at the workspace.
DEFAULT, BY_FIELD, WORKSPACE_LEVEL = "default", "field", "workspace"


def check_placed_by(model: Any, field: str) -> None:
    """Refuse a `placed_by` that isn't a field holding one reference (a single id, not a list or a nested one)."""
    single = {path: target for path, target in ref_fields(model) if "." not in path and "[]" not in path}
    if field not in single:
        raise ValueError(
            f"placed_by names {field}, which isn't a field of {model.record_kind} that refers to one record"
        )


def project_for(plugins: Any, view: Any, record: Any) -> str | None:
    """The project whose folder a record is written in, or None for the workspace's own folder."""
    mode, field = plugins.placement(record.kind)
    if mode == WORKSPACE_LEVEL:
        return None
    model = plugins.records.get(record.kind)
    if mode == DEFAULT:
        project = project_of(record)
        field = getattr(model, "layout_project", None) if project is None else None
        if project is not None or not field:
            return project
    return _through(view, model, record, field)


def _through(view: Any, model: Any, record: Any, field: str | None) -> str | None:
    """The project of the record a reference field points at (that project itself when it points at one)."""
    value = record.data.get(field) if field else None
    target = dict(ref_fields(model)).get(field) if model is not None and field else None
    if not value or not target:
        return None
    referred = view.get(target, value)
    return project_of(referred) if referred is not None else None

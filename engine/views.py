"""Views (design 6.32, "Views: one project under several roles"): a view is a named list of projects inside one side, so
a project can show under more than one role the person works in. A view only changes what a screen shows. Nothing here
files an item, changes a project's side or changes a data level, and `engine.sides` never reads a view.

Reading: `views_of_project` gives the views a project is in (a sub-project comes with its parent), and
`views_of_item`, `views_of_record` and `views_of_line` follow the same paths the side functions follow. A project that
has been deleted is skipped. Writing: `apply` makes, changes and removes views for the person's own `view.add`,
`view.set` and `view.remove`.
"""

from __future__ import annotations

from typing import Any

from engine.sides import projects_of, side_ids, side_of_project
from engine.storage import StoreError, WriteContext


def label_of(name: str, label: str | None = None) -> str:
    """The short tag of a view: the label when there is one, else the first word of the name."""
    words = " ".join((label or "").split())
    if words:
        return words
    first = " ".join(name.split()).split(" ")[0] if name.strip() else ""
    return first[:20]


def view_records(view: Any) -> list[Any]:
    """Every live view, in the order they were made."""
    return sorted(view.list("view"), key=lambda r: r.id)


def live_projects(view: Any, record: Any) -> list[str]:
    """The projects a view holds that are still there, in the order the view lists them."""
    return [p for p in record.data.get("projects") or [] if view.get("project", p) is not None]


def _chain(view: Any, project_id: str) -> list[str]:
    """A project and its parents, up to the top. A chain that loops, or leads to a parent that isn't there, stops at the
    last project it reached."""
    seen: list[str] = []
    current: str | None = project_id
    while current and current not in seen:
        record = view.get("project", current)
        if record is None:
            break
        seen.append(current)
        current = record.data.get("parent")
    return seen


def in_a_project(view: Any, cfg: Any, project_id: str | None) -> bool:
    """Whether an id names a real project: not none, not a project that isn't there and not a side itself (an item filed
    directly on a side is on no project)."""
    return bool(project_id) and view.get("project", project_id) is not None and project_id not in side_ids(view, cfg)


def views_of_project(view: Any, project_id: str | None) -> list[str]:
    """The ids of the views whose projects hold this project or one of its parents, in the views' order. A project that
    isn't there is in none."""
    if not project_id:
        return []
    held = set(_chain(view, project_id))
    if not held:
        return []
    return [r.id for r in view_records(view) if held & set(r.data.get("projects") or [])]


def views_of_item(view: Any, record: Any) -> list[str]:
    """The views an item is in: those of every project it names (from its `project` or `projects`), each view once."""
    found: list[str] = []
    for project_id in projects_of(record.data):
        found += [v for v in views_of_project(view, project_id) if v not in found]
    return found


def views_of_record(view: Any, kind: str, record_id: str | None) -> list[str]:
    """The views a record is in, by its kind and id; none for a record that isn't there or names no project."""
    record = view.get(kind, record_id) if record_id else None
    return views_of_item(view, record) if record is not None else []


def views_of_line(view: Any, line: Any) -> list[str]:
    """The views a line of Today's queue is in: those of its project, else of the records it names (the question, the
    actions and the questions it covers), each view once."""
    if project := getattr(line, "project", None):
        return views_of_project(view, project)
    found: list[str] = []
    refs = [("question", getattr(line, "question", None))]
    refs += [("action", i) for i in getattr(line, "actions", None) or []]
    refs += [("question", i) for i in getattr(line, "questions", None) or []]
    for kind, record_id in refs:
        found += [v for v in views_of_record(view, kind, record_id) if v not in found]
    return found


def views_of_agenda_item(view: Any, item: Any) -> list[str]:
    """The views an entry of the agenda is in: those of the entry the app keeps for it. An event of a connected calendar
    with no entry of its own is in none."""
    kept = item.snapshot if item.own else item.entry
    return views_of_record(view, "event", kept) if kept else []


def views_of_projects(view: Any, project_ids: Any) -> list[str]:
    """The views of several projects together, each view once."""
    found: list[str] = []
    for project_id in project_ids:
        found += [v for v in views_of_project(view, project_id) if v not in found]
    return found


# ---- writing ---------------------------------------------------------------------------------------------------


def _projects_problem(tx: Any, cfg: Any, side: str, projects: list[str]) -> str | None:
    """Why a list of projects can't be a view of this side, or None."""
    for project_id in projects:
        if project_id in side_ids(tx, cfg):
            return "a side isn't a project: pick the projects inside it"
        if tx.get("project", project_id) is None:
            return f"there is no project {project_id}"
        if side_of_project(tx, cfg, project_id) != side:
            return "a view holds only projects inside its own side"
    return None


def _taken(tx: Any, side: str, name: str, except_id: str | None = None) -> bool:
    """Whether a view of this side already has the name (ignoring case)."""
    wanted = " ".join(name.split()).casefold()
    return any(
        r.id != except_id
        and r.data.get("side") == side
        and " ".join(str(r.data.get("name") or "").split()).casefold() == wanted
        for r in tx.list("view")
    )


def apply(tx: Any, cfg: Any, op: Any, w: WriteContext) -> list[dict[str, Any]]:
    """Apply `view.add`, `view.set` or `view.remove`. Returns the records touched."""
    if op.op == "view.add":
        name = " ".join(op.name.split())
        if op.side not in side_ids(tx, cfg):
            raise StoreError("a view is inside one of your sides: pick the side")
        if _taken(tx, op.side, name):
            raise StoreError(f"there is already a view called {name!r} in that side")
        projects = list(dict.fromkeys(op.projects))
        if why := _projects_problem(tx, cfg, op.side, projects):
            raise StoreError(why)
        made = tx.create(
            "view",
            {"name": name, "label": label_of(name, op.label), "side": op.side, "projects": projects},
            w,
        )
        return [{"kind": "view", "id": made.id}]
    current = tx.get("view", op.id)
    if current is None:
        raise StoreError(f"there is no view {op.id}")
    if op.op == "view.remove":
        tx.delete("view", op.id, w, read_version=current.version)
        return [{"kind": "view", "id": op.id}]
    changes: dict[str, Any] = {}
    if op.name is not None:
        name = " ".join(op.name.split())
        if _taken(tx, current.data["side"], name, except_id=op.id):
            raise StoreError(f"there is already a view called {name!r} in that side")
        changes["name"] = name
    if op.label is not None:
        changes["label"] = label_of(changes.get("name") or current.data["name"], op.label)
    elif op.name is not None and label_of(current.data["name"]) == current.data["label"]:
        changes["label"] = label_of(changes["name"])  # a tag that was the name's first word follows the new name
    if op.projects is not None:
        projects = list(dict.fromkeys(op.projects))
        if why := _projects_problem(tx, cfg, current.data["side"], projects):
            raise StoreError(why)
        changes["projects"] = projects
    tx.update("view", op.id, changes, w, read_version=current.version)
    return [{"kind": "view", "id": op.id}]

"""Organizations people work for, kept as records (design 5.1): one name in one place, referred to by id.

`link_sides` gives each side (a business or job, design 6.32) its organization, once; `keep_names_together` keeps the
two on one name; `own_organization` says the person works for it.

`resolve` turns a name the assistant or an older workspace used into the organization's id, matching names and
aliases without regard to case, and creating the organization when none matches. `move_names` is the one-time move
of a workspace whose people still hold organization names.
"""

from __future__ import annotations

from typing import Any

from engine.storage import StoreError, WriteContext
from engine.text_shape import text_problem

_ENGINE = WriteContext(actor="engine", trust="trusted", op="organizations.move")
LINK_OP = "organizations.link"
_LINK = WriteContext(actor="engine", trust="trusted", op=LINK_OP)


def find(tx: Any, name: str) -> str | None:
    """The id of the organization with this name or alias, or None."""
    wanted = " ".join(name.split()).casefold()
    for org in tx.list("organization"):
        names = [org.data["name"], *org.data.get("aliases", [])]
        if any(" ".join(n.split()).casefold() == wanted for n in names):
            return org.id
    return None


def resolve(tx: Any, value: str | None, w: WriteContext) -> str | None:
    """An organization's id from an id or a name: an id stays; a name finds its organization, or creates one."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise StoreError(
            text_problem("An organization's name or id", value) or "An organization's name or id has to be text."
        )
    if not value.strip():
        return None
    value = value.strip()
    if tx.get("organization", value) is not None:
        return value
    return find(tx, value) or tx.create("organization", {"name": " ".join(value.split())}, w).id


def move_names(store: Any) -> int:
    """Give every person who holds an organization's name the organization's id instead. Returns how many moved."""
    moved = 0
    with store.transaction() as tx:
        for person in tx.list("person"):
            held = person.data.get("org")
            if not held or tx.get("organization", held) is not None:
                continue
            tx.update("person", person.id, {"org": resolve(tx, held, _ENGINE)}, _ENGINE, read_version=person.version)
            moved += 1
    return moved


def adopt_name(tx: Any, org_id: str, name: str, w: WriteContext) -> None:
    """Give an organization a side's name when it is linked by another form of it (an alias or another spelling): the
    name it had is kept as an alias, so it is still found by it."""
    org = tx.get("organization", org_id)
    if org.data["name"] != name:
        aliases = [a for a in org.data.get("aliases", []) if a != name]
        tx.update(
            "organization", org_id, {"name": name, "aliases": [*aliases, org.data["name"]]}, w, read_version=org.version
        )


def keep_names_together(tx: Any, kind: str, record_id: str, name: str, w: WriteContext) -> None:
    """The one name of a side and its organization: after a project or an organization is renamed, the project or
    projects it is linked to (`Project.organization`) take the same name in the same write, so no name is held twice
    and Undo takes both back. Does nothing for another kind of record or when the names already agree."""
    name = " ".join(str(name).split())
    if kind == "project":
        project = tx.get("project", record_id)
        org = (
            tx.get("organization", project.data["organization"])
            if project and project.data.get("organization")
            else None
        )
        if org is not None and org.data["name"] != name:
            tx.update("organization", org.id, {"name": name}, w, read_version=org.version)
    elif kind == "organization":
        for project in tx.find("project", {"organization": record_id}):
            if project.data["name"] != name:
                tx.update("project", project.id, {"name": name}, w, read_version=project.version)


def own_organization(tx: Any, cfg: Any, person_id: str | None) -> bool:
    """Say the person the app is for works for their first side's organization, when their record names none. A person
    who already names an organization keeps it. Returns whether the record changed."""
    from engine.sides import side_list

    person = tx.get("person", person_id) if person_id else None
    if person is None or person.data.get("org"):
        return False
    for side in side_list(tx, cfg):
        org = tx.get("project", side.project).data.get("organization")
        if org and tx.get("organization", org) is not None:
            tx.update("person", person.id, {"org": org}, _LINK, read_version=person.version)
            return True
    return False


def link_sides(store: Any, cfg: Any) -> int:
    """Give every side that has no organization one, once: the organization with the side's name (or alias) is linked,
    else one is made, and the person the app is for is said to work for it when their record names none. A side that
    already has its organization is left alone, so a later start changes nothing. Returns how many sides were linked."""
    from engine.sides import side_list

    linked = 0
    with store.transaction() as tx:
        for side in side_list(tx, cfg):
            project = tx.get("project", side.project)
            held = project.data.get("organization")
            if held and tx.get("organization", held) is not None:
                continue
            org = resolve(tx, side.name, _LINK)
            adopt_name(tx, org, side.name, _LINK)
            tx.update("project", project.id, {"organization": org}, _LINK, read_version=project.version)
            own_organization(tx, cfg, cfg.workspace.user.person)
            linked += 1
    return linked


def release(tx: Any, cfg: Any, org_id: str | None) -> bool:
    """Take an organization back out with the side it was made for: when nothing but the person the app is for refers
    to it, their record stops naming it and it is deleted. An organization other people work for stays. Returns
    whether it was deleted."""
    from engine.records import referrers

    org = tx.get("organization", org_id) if org_id else None
    if org is None:
        return False
    me = cfg.workspace.user.person
    others = [(kind, rid) for kind, rid in referrers(tx, "organization", org.id) if (kind, rid) != ("person", me)]
    if others:
        return False
    person = tx.get("person", me) if me else None
    if person is not None and person.data.get("org") == org.id:
        tx.update("person", person.id, {"org": None}, _LINK, read_version=person.version)
    tx.delete("organization", org.id, _LINK, read_version=org.version)
    return True


def reclaim(tx: Any, cfg: Any, org_id: str | None) -> None:
    """Undo of `release`: bring the organization back, and the person the app is for names it again when their record
    names none."""
    org = tx.get("organization", org_id, include_deleted=True) if org_id else None
    if org is None:
        return
    if org.deleted:
        tx.undelete("organization", org.id, _LINK, read_version=org.version)
    person = tx.get("person", cfg.workspace.user.person) if cfg.workspace.user.person else None
    if person is not None and not person.data.get("org"):
        tx.update("person", person.id, {"org": org.id}, _LINK, read_version=person.version)

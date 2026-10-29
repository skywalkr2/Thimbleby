"""Local search (design 7.12): the people, projects, open to-dos, files and kept knowledge whose words contain what the
person typed. It reads the records and makes no AI call, so it costs nothing and can run on every keystroke."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

#: Most results of each kind, so the list stays short enough to scan.
PER_KIND = 5


#: The kinds of knowledge entry the search reads; only entries the person has kept (active) are found.
KNOWLEDGE_KINDS = ("lesson", "glossary_entry", "routing_entry", "style_note")


@dataclass(frozen=True)
class Hit:
    kind: str
    id: str
    title: str
    detail: str | None = None


def _matches(words: list[str], *fields: Any) -> bool:
    text = " ".join(str(f) for f in fields if f).casefold()
    return all(w in text for w in words)


def search(store: Any, cfg: Any, query: str, today: date, limit: int = PER_KIND) -> list[Hit]:
    from engine.open_items import open_actions

    words = query.casefold().split()
    if not words:
        return []
    view = store.read()
    out: list[Hit] = []
    people = [
        Hit("person", p.id, p.data["full_name"], p.data.get("role"))
        for p in view.list("person")
        if _matches(words, p.data.get("full_name"), p.data.get("role"), *p.data.get("aliases", []))
    ]
    projects = [
        Hit("project", p.id, p.data["name"], p.data.get("summary"))
        for p in view.list("project")
        if _matches(words, p.data.get("name"), *p.data.get("aliases", []))
    ]
    todos = [
        Hit("action", a.id, a.text) for a in open_actions(store, cfg, today, light=True) if _matches(words, a.text)
    ]
    all_files = view.list("file")
    replaced = {f.data.get("replaces") for f in all_files}
    files = [
        Hit("file", f.id, f.data["name"], f.data.get("file_kind"))
        for f in all_files
        if f.id not in replaced and _matches(words, f.data.get("name"))
    ]
    knowledge = [
        Hit(kind, e.id, e.data["text"], e.data.get("meaning"))
        for kind in KNOWLEDGE_KINDS
        for e in view.list(kind)
        if e.data.get("status") == "active"
        and _matches(words, e.data.get("text"), e.data.get("term"), e.data.get("meaning"))
    ]
    for group in (people, projects, todos, files, knowledge):
        out.extend(group[:limit])
    return out

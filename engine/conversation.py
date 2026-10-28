"""A conversation on a record (design 6.25, 6.32): the person talks to the assistant from a to-do, question, person,
project or calendar entry, with that record in view, to ask about it or to ask the assistant to do something to it.

It is the ask (`engine.tasks`, the `ask` kind) with one more thing in the request: the record it is `about`. Each
message is its own request, answered by the same packet, estimated and held for the person's go above the configured
amount. Its answer is prose with, when it proposes changes, a changeset the person keeps or drops inline (each op's
Undo, or Keep and Decline for one held for the person). The conversation is kept on the record: the requests that name
it, oldest first. Nothing here writes knowledge or sends anything; the ask's own path does.

What the assistant is sent about the conversation: the record's own fields (`steward.conversation.record_chars`), the
latest `steward.conversation.recent_turns` exchanges word for word, and each older one as a single short line.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from engine.names import People
from engine.record_page import _HIDDEN, display_name
from engine.storage import StoreError, WriteContext

#: The records a conversation can be about: every kind of record that has a page of its own.
KINDS = (
    "action",
    "question",
    "person",
    "organization",
    "team",
    "project",
    "event",
    "series",
    "source",
    "fact",
    "note",
    "rule",
    "lesson",
    "glossary_entry",
)
_ASK = WriteContext(actor="pm", trust="trusted", op="conversation.say")
_PERSON = re.compile(r"^[A-Z]+-\d+$")
#: How much of one answer is repeated to the assistant in a recent exchange.
ANSWER_CHARS = 600


def say(store: Any, kind: str, record_id: str, message: str) -> str:
    """Queue the person's message about a record as an ask; returns the request's id."""
    words = message.strip()
    if not words:
        raise StoreError("Say something to ask.")
    if kind not in KINDS:
        raise StoreError("A conversation can be about a record that has a page of its own.")
    with store.transaction() as tx:
        if tx.get(kind, record_id) is None:
            raise StoreError(f"There is no {kind} {record_id}.")
        made = tx.create(
            "request",
            {
                "task": "ask",
                "about": {"kind": kind, "id": record_id},
                "note": words,
                "origin": "pm",
                "state": "queued",
                "waiting": "With the assistant, starting now",
                "created_at": store.clock(),
            },
            _ASK,
        )
    return made.id


def about(request: Any) -> tuple[str, str] | None:
    """The record a conversation request is about, or None for an ask that is about nothing in particular."""
    named = request.data.get("about") or {}
    if request.data.get("task") == "ask" and named.get("kind") in KINDS and named.get("id"):
        return str(named["kind"]), str(named["id"])
    return None


def turns(view: Any, kind: str, record_id: str, *, before: str | None = None) -> list[Any]:
    """The requests of a conversation on a record, oldest first, each one a message and what came of it; with `before`,
    only those made before the request with that id."""
    found = [r for r in view.list("request") if about(r) == (kind, record_id) and not r.data.get("dismissed")]
    found.sort(key=lambda r: (str(r.data.get("created_at", "")), _number(r.id)))
    if before is not None:
        found = [r for r in found if _number(r.id) < _number(before)]
    return found


def _number(request_id: str) -> int:
    tail = request_id.rpartition("-")[2]
    return int(tail) if tail.isdigit() else 0


def _answer_of(view: Any, request_id: str) -> str:
    answers = view.find("answer", {"request": request_id})
    return str(answers[-1].data["text"]) if answers else ""


def _short(text: str, chars: int) -> str:
    flat = " ".join(text.split())
    return flat if len(flat) <= chars else flat[: max(chars - 1, 1)].rstrip() + "…"


def _value(view: Any, people: People, value: Any) -> str:
    if isinstance(value, dict):
        if value.get("person"):
            return f"{people.name(value['person'])} ({value['person']})"
        return json.dumps(value, ensure_ascii=False, default=str)
    if isinstance(value, list):
        return ", ".join(_value(view, people, v) for v in value)
    if isinstance(value, str) and _PERSON.match(value) and view.get("person", value) is not None:
        return f"{people.name(value)} ({value})"
    return str(value)


def record_text(store: Any, cfg: Any, kind: str, record_id: str) -> str:
    """What is written on the record, as plain lines of the fields that hold something, the person and project ids
    resolved to names, cut at `steward.conversation.record_chars`. Long texts are not part of it."""
    view = store.read()
    found = view.get(kind, record_id)
    if found is None:
        return ""
    people = People(store, cfg)
    lines = [f"{kind} {record_id}: {display_name(found.data)}"]
    for key, value in found.data.items():
        if key in _HIDDEN or value in (None, "", [], {}) or key in ("text", "title", "name", "full_name"):
            continue
        lines.append(f"{key}: {_short(_value(view, people, value), 300)}")
    return _cut("\n".join(lines), cfg.steward.conversation.record_chars)


def saved_text(ws: Any, store: Any, cfg: Any, kind: str, record_id: str) -> tuple[str, bool]:
    """The words of a saved input a conversation is about (a message, a note, a document), cut at
    `steward.conversation.record_chars`, and whether they came from outside. Empty for any other record."""
    found = store.read().get(kind, record_id) if kind == "source" else None
    if found is None:
        return "", False
    path = ws.sources_dir / f"{found.data['content_hash']}.txt"
    try:
        words = path.read_text(encoding="utf-8").strip()
    except OSError:
        return "", False
    return _cut(words, cfg.steward.conversation.record_chars), found.data.get("trust") == "untrusted"


@dataclass(frozen=True)
class History:
    """The older things a message found: the lines for the packet, whether any came from outside, and the log entry
    (what was searched for and which results were sent) for the run's knowledge log."""

    text: str
    untrusted: bool
    log: dict[str, Any]


def history(ws: Any, store: Any, cfg: Any, request: Any, kind: str, record_id: str, level: str) -> History | None:
    """What the workspace already holds that matches what the person said about this record, as evidence for the answer:
    the core's own search over facts, past inputs, records and what has been learned, at the privacy level the answering
    accounts may see, limited to what a draft about the record may draw on (its area), without the record itself or the
    saved input it is. At most `steward.conversation.history_results`; None when that is zero or nothing matches."""
    from engine import areas
    from engine import search as workspace_search

    limit = cfg.steward.conversation.history_results
    view = store.read()
    found = view.get(kind, record_id)
    if not limit or found is None:
        return None
    project = record_id if kind == "project" else found.data.get("project")
    reach = areas.reach(view, [project])
    # What the person said is what is searched for: the record itself is already in front of the assistant.
    words = str(request.data.get("note") or "").strip()
    query = workspace_search.Query(words=words, projects=tuple(sorted(reach)) if reach is not None else ())
    # A result must share at least two of the person's words (one when they used only one), so that a word everyone uses
    # doesn't bring in what has nothing to do with the question.
    enough = min(2, len(workspace_search.words_of(words)))
    hits = workspace_search.search(
        ws,
        store,
        query,
        limit=limit * 3 + 1,
        level=level,
        exclude_sources=[record_id] if kind == "source" else (),
    )
    hits = [h for h in hits if (h.record_kind, h.id) != (kind, record_id) and h.matched >= enough][:limit]
    entry = {
        "words": words,
        "kinds": list(query.kinds),
        "projects": list(query.projects),
        "results": len(hits),
        "sent": [h.id for h in hits],
    }
    if not hits:
        return History("", False, entry)
    lines = []
    for hit in hits:
        said = f"{hit.id} ({workspace_search._label(hit)}): {hit.text}"
        if hit.replaced_by:
            said += f" Replaced by {hit.replaced_by}: {hit.replaced_text}"
        lines.append(f'- <untrusted source="{hit.id}">{said}</untrusted>' if hit.untrusted else f"- {said}")
    return History("\n".join(lines), any(h.untrusted for h in hits), entry)


def _cut(text: str, chars: int) -> str:
    return text if len(text) <= chars else text[:chars].rstrip() + "\n(cut: the rest isn't shown)"


def earlier(store: Any, cfg: Any, request: Any) -> str:
    """The conversation before this message: the latest exchanges word for word and each older one as a short line.
    Empty for the first message."""
    place = about(request)
    if place is None:
        return ""
    view = store.read()
    rules = cfg.steward.conversation
    before = turns(view, place[0], place[1], before=request.id)
    if not before:
        return ""
    split = len(before) - rules.recent_turns if rules.recent_turns else len(before)
    older, recent = before[: max(split, 0)], before[max(split, 0) :]
    parts = [f"- You were asked earlier: {_short(r.data.get('note') or '', rules.older_turn_chars)}" for r in older]
    for r in recent:
        said = _answer_of(view, r.id) or "(no answer was given)"
        parts.append(f"- Asked: {r.data.get('note') or ''}\n  You answered: {_short(said, ANSWER_CHARS)}")
    return "\n".join(parts)

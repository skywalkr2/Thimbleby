"""The person's own word on which files are one document (design 6.2, "Versions of one document"): "Same document
as", "Not the same document" and the answer to "Which copy is the current one?".

A choice is a change to the `watch.versions` settings (`same_document`, `not_same`, `current`), saved the way the
Settings screen saves, so it is recorded with what it was and what it became, and Undo puts the old values back. The
families in `engine.versions` read those settings, so a choice takes effect the next time the folder is read and the
older-version rule never undoes it. A choice is also a correction: it records a signal.

The question "Which copy is the current one?" is asked once for a family whose copies can't be told apart by version
or date (`ask`); its answer names the current copy (`keep_answer`); setting it aside leaves the family to the modified
time, which is the last resort (`given_up`).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import PurePosixPath
from typing import Any

from engine import settings as config_screens
from engine import versions
from engine.storage import StoreError, WriteContext

VERSION_QUESTION = "version"
SAME, NOT_SAME, CURRENT = "watch.versions.same_document", "watch.versions.not_same", "watch.versions.current"
KEYS = ("watch.versions.",)
_ENGINE = WriteContext(actor="engine", trust="trusted", op="versions.ask")
_PM = WriteContext(actor="pm", trust="trusted", op="versions.answer")
TITLE = "Which copy of {name} is the current one?"
TEXT = "These copies can't be told apart by their version marks or the dates in their names: {files}."


@dataclass
class FileAt:
    """A watched file the person's choice is about: its folder's id, its key (path) and its title."""

    source: str
    key: str
    title: str
    record: str


@dataclass
class Candidate:
    key: str
    title: str


@dataclass
class Offer:
    """What the person can do about a watched file: link it to one of `others`, or split it from its family."""

    file: FileAt | None = None
    others: list[Candidate] = field(default_factory=list)
    can_split: bool = False
    family: list[str] = field(default_factory=list)


@dataclass
class Changed:
    """What a choice changed in the settings, for the read-back and Undo."""

    changes: list[dict[str, Any]]
    signal: str | None = None


def file_of(view: Any, record_id: str) -> FileAt | None:
    """The watched file a saved copy (a `source` record) came from, or None when it isn't a file in a watched folder."""
    record = view.get("source", record_id)
    watched = (record.data.get("watched") if record is not None else None) or {}
    if record is None or record.data.get("kind") != "watched:folder" or not watched.get("key"):
        return None
    return FileAt(watched["source"], watched["key"], PurePosixPath(watched["key"]).name, record.id)


def _top(key: str, archives: Any) -> str:
    folders = [p for p in PurePosixPath(key).parent.parts if p not in ("", ".")]
    kept = [p for p in folders if p.casefold() not in {a.casefold() for a in archives}]
    return kept[0].casefold() if kept else ""


def offer(view: Any, cfg: Any, record_id: str) -> Offer:
    """What can be done about the file a saved copy came from: the other files in its top folder to link it to, and
    whether it has other copies in its family to be split from."""
    found = file_of(view, record_id)
    if found is None:
        return Offer()
    settings = cfg.watch.versions
    snaps = [
        s
        for s in view.find("snapshot", {"source": found.source})
        if not s.data.get("gone") and not s.data.get("deleted")
    ]
    families = versions.Families(
        [_Item(s.data["key"], s.data.get("changed_at")) for s in snaps], settings, found.source
    )
    top = _top(found.key, settings.archive_folders)
    family = {c.key for c in families.family(found.key)}
    others = [
        Candidate(s.data["key"], PurePosixPath(s.data["key"]).name)
        for s in snaps
        if s.data["key"] != found.key and _top(s.data["key"], settings.archive_folders) == top
    ]
    others.sort(key=lambda c: (c.title.casefold(), c.key))
    grouped = len(family) > 1 or any(found.key in link.files for link in settings.same_document)
    return Offer(found, others, grouped, sorted(k for k in family if k != found.key))


@dataclass(frozen=True)
class _Item:
    key: str
    changed_at: str | None


def _save(
    ws: Any, cfg: Any, store: Any, changes: dict[str, Any], env: dict[str, str] | None, reset: list[str] | None = None
) -> list[dict[str, Any]]:
    saved = config_screens.save(
        ws,
        cfg,
        store,
        changes=changes,
        reset=reset or [],
        read_fingerprint=config_screens.fingerprint(ws.config_dir),
        env=env,
        allow=KEYS,
    )
    return saved.changes


def _groups(cfg: Any, source: str) -> tuple[list[dict[str, Any]], list[list[str]]]:
    """The entries of `same_document` as written, and the file lists of this folder's among them."""
    entries = [link.model_dump(mode="json") for link in cfg.watch.versions.same_document]
    return entries, [list(e["files"]) for e in entries if e["source"] == source]


def link(
    ws: Any,
    cfg: Any,
    store: Any,
    record_id: str,
    other: str,
    *,
    now: datetime | None = None,
    env: dict[str, str] | None = None,
) -> Changed:
    """Say the file a saved copy came from is the same document as `other` (another file of its folder): the two
    join, and so do the documents their names belong to, now and when later versions are saved."""
    found = file_of(store.read(), record_id)
    if found is None:
        raise StoreError("That isn't a file in a watched folder.")
    if other == found.key:
        raise StoreError("Choose a different file.")
    if not any(
        s.data["key"] == other and not s.data.get("gone")
        for s in store.read().find("snapshot", {"source": found.source})
    ):
        raise StoreError("That file isn't in the folder any more.")
    entries, groups = _groups(cfg, found.source)
    joined = {found.key, other}
    rest = []
    for files in groups:
        if joined & set(files):
            joined |= set(files)
        else:
            rest.append(files)
    elsewhere = [e for e in entries if e["source"] != found.source]
    new = [
        *elsewhere,
        *({"source": found.source, "files": f} for f in rest),
        {"source": found.source, "files": sorted(joined)},
    ]
    changes = _save(ws, cfg, store, {SAME: new}, env)
    return Changed(changes, _signal(store, "edited", record_id, f"Same document: {found.key} with {other}", now))


def split(
    ws: Any,
    cfg: Any,
    store: Any,
    record_id: str,
    *,
    now: datetime | None = None,
    closed: str | None = None,
    env: dict[str, str] | None = None,
) -> Changed:
    """Say the file a saved copy came from is not the same document as the others its name puts it with: it stands on
    its own, and leaves any group the person made. `closed` is the change a rule closed as an older version: the
    correction is that change pulled back, and `reopen` hands it in after all."""
    found = file_of(store.read(), record_id)
    if found is None:
        raise StoreError("That isn't a file in a watched folder.")
    entries, _ = _groups(cfg, found.source)
    new = []
    for entry in entries:
        files = [f for f in entry["files"] if not (entry["source"] == found.source and f == found.key)]
        if len(files) > 1 or entry["source"] != found.source:
            new.append({"source": entry["source"], "files": files})
    apart = sorted({*cfg.watch.versions.not_same.get(found.source, []), found.key})
    changes = _save(ws, cfg, store, {SAME: new, NOT_SAME: {**cfg.watch.versions.not_same, found.source: apart}}, env)
    note = f"Not the same document: {found.key}"
    kind, refs = ("pulled_back", [closed]) if closed else ("edited", [record_id])
    return Changed(changes, _signal(store, kind, refs, note, now))


def reopen(store: Any, request_id: str, read_version: int) -> None:
    """Hand in after all the change a rule closed as an older version, now that its file stands on its own."""
    current = store.read().get("request", request_id)
    if current is None or not current.data.get("auto_closed"):
        raise StoreError("That isn't something a rule closed.")
    with store.transaction() as tx:
        tx.update(
            "request",
            request_id,
            {"state": "queued", "waiting": "With the assistant, starting now", "auto_closed": None},
            WriteContext("pm", "trusted", "versions.reopen"),
            read_version=read_version,
        )


def undo(
    ws: Any, cfg: Any, store: Any, changes: list[dict[str, Any]], env: dict[str, str] | None = None
) -> list[dict[str, Any]]:
    """Put the settings a choice changed back as they were. Refused for a key that isn't a version setting."""
    if not changes or any(not str(c["key"]).startswith(KEYS) for c in changes):
        raise StoreError("That isn't a choice about versions.")
    put = {c["key"]: c.get("before") for c in changes if not c.get("was_default")}
    reset = [c["key"] for c in changes if c.get("was_default")]
    return _save(ws, cfg, store, {k: v if v is not None else _empty(k) for k, v in put.items()}, env, reset)


def _empty(key: str) -> Any:
    return [] if key == SAME else {}


def _signal(store: Any, kind: str, record: str | list[str], note: str, now: datetime | None) -> str:
    from engine.dispatcher import signal

    return signal(store, kind, [record] if isinstance(record, str) else record, note, now)


# ---- asking which copy is current -----------------------------------------------------------------------------


def questions(view: Any, source: str) -> list[Any]:
    """The questions about which copy is current that were asked for this folder, of any state."""
    return [
        q
        for q in view.list("question")
        if (q.data.get("resolves") or {}).get("kind") == VERSION_QUESTION and q.data["resolves"].get("source") == source
    ]


def given_up(view: Any, source: str) -> set[str]:
    """The families whose question was set aside: the modified time decides them, as the last resort."""
    return {q.data["resolves"]["family"] for q in questions(view, source) if q.data["status"] == "dropped"}


def ask(tx: Any, source: str, person: str, family: str, copies: Any, why: str) -> str | None:
    """Ask `person` once which copy is current. Returns the question's id, or None when it was asked before (in any
    state): the question is never put twice for a family."""
    if any(q.data["resolves"]["family"] == family for q in questions(tx, source)):
        return None
    files = [c.key for c in copies]
    data = {
        "to": person,
        "title": TITLE.format(name=_name_of(copies)),
        "text": TEXT.format(files=", ".join(c.title for c in copies)),
        "kind": "decision",
        "resolves": {"kind": VERSION_QUESTION, "source": source, "family": family, "files": files, "why": why},
    }
    return tx.create("question", data, _ENGINE).id


def _name_of(copies: Any) -> str:
    """The family's name for the question: the shortest file name among the copies, without its extension."""
    return min((PurePosixPath(c.title).stem for c in copies), key=lambda stem: (len(stem), stem))


def keep_answer(
    ws: Any, cfg: Any, store: Any, question_id: str, key: str, env: dict[str, str] | None = None
) -> list[dict[str, Any]]:
    """The person's answer: this file is the current copy. It is kept as the family's current copy, the other copies
    the question named leave the list of current ones, and the question is answered. Returns what changed in the
    settings, for Undo. Refuses a file the question didn't offer."""
    question = store.read().get("question", question_id)
    resolves = (question.data.get("resolves") or {}) if question is not None else {}
    if resolves.get("kind") != VERSION_QUESTION:
        raise StoreError("That isn't a question about which copy is current.")
    if key not in resolves["files"]:
        raise StoreError("Choose one of the copies listed.")
    source = resolves["source"]
    held = cfg.watch.versions.current
    pins = sorted({*(k for k in held.get(source, []) if k not in resolves["files"]), key})
    changes = _save(ws, cfg, store, {CURRENT: {**held, source: pins}}, env)
    with store.transaction() as tx:
        cur = tx.get("question", question_id)
        tx.update("question", question_id, {"status": "answered", "answer": key}, _PM, read_version=cur.version)
    return changes


def reopen_question(store: Any, question_id: str) -> None:
    """Open a question about which copy is current again, after Undo of its answer."""
    question = store.read().get("question", question_id)
    if question is None or (question.data.get("resolves") or {}).get("kind") != VERSION_QUESTION:
        raise StoreError("That isn't a question about which copy is current.")
    with store.transaction() as tx:
        tx.update(
            "question",
            question_id,
            {"status": "open", "answer": None},
            WriteContext(actor="pm", trust="trusted", op="versions.undo"),
            read_version=question.version,
        )

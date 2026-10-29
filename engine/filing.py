"""Filing when unsure (design 6.32, "Filing, the brief and facts after the reviewer's second pass").

When the filing ranks (`engine.sides.file_by_people`) can't tell whether an item belongs to Personal or to another side,
the item waits under Personal, the more private level. This module reads those items back and offers the one grouped
question that moves them. Each item is listed once: items that could be the same sides' (the sides the watched source
they came from serves, else every other side) are one question, with a choice of those sides that starts on the first
("These 4 items look like a side's. Move them there?") and Move and Keep under Personal. At most one question a day
for a set of sides, until each of them has been answered. Nothing here decides a filing: the ranks do, and the person's
click moves.

An item counts as waiting under Personal on a guess when it sits directly under the personal project, the assistant
made it after the side existed, and no signal stamped a reason on it (`filed_by` is empty). Move is the person's own
change (`record.edit` of the item's project, in one changeset with Undo, recorded as a correction like any edit of
something the assistant set). Keep and Move each leave a signal (`suggestion_dismissed`, `suggestion_chosen`) whose note
names the side, so a kept item is never asked about again and a side is asked about once a day. Moving the same sender's
items a second time proposes a standing rule that says where that sender's mail goes, held for Keep like other learning.
Reads only, except `move`, `keep` and the proposal the second move makes.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from email.utils import parseaddr
from typing import Any

from engine import sides
from engine.unfiled import KINDS, PERSON, _projects, from_input

#: What a filing signal's note names as its kind, so it is told from the other suggestion signals.
SIGNAL_KIND = "filing"


@dataclass(frozen=True)
class Waiting:
    """An item under Personal on a guess: what it is, the version the person saw and the sides it could be on."""

    kind: str
    id: str
    version: int
    text: str
    created_at: str
    could_be: tuple[str, ...]


@dataclass(frozen=True)
class Choice:
    """A side an item could move to: its top project and its name."""

    project: str
    name: str


@dataclass
class Question:
    """The question for a set of sides: the sides the items could be on (`sides`, in the person's order) and the items,
    newest first, each in exactly one question. `side` and `name` are the side the choice starts on: the first, which is
    the one side the items' source serves when it serves one."""

    sides: list[Choice]
    items: list[Waiting] = field(default_factory=list)

    @property
    def side(self) -> str:
        return self.sides[0].project

    @property
    def name(self) -> str:
        return self.sides[0].name


@dataclass(frozen=True)
class Summary:
    """What the Today line for the questions says: how many items, the one side's name when only one is asked about
    (none with several), and the oldest item's time."""

    count: int
    subject: str | None
    since: str


@dataclass(frozen=True)
class Moved:
    """What a move did: its changeset (for Undo), how many items moved and the rule it proposed, if any."""

    changeset: str
    count: int
    rule: str | None = None


def _at(value: Any) -> datetime:
    when = value if isinstance(value, datetime) else datetime.fromisoformat(str(value))
    return when if when.tzinfo else when.replace(tzinfo=UTC)


def _source_of(data: dict[str, Any]) -> str | None:
    evidence = data.get("evidence") or {}
    return data.get("source") or (evidence.get("source") if isinstance(evidence, dict) else None)


def _watched(view: Any, data: dict[str, Any]) -> dict[str, Any]:
    source_id = _source_of(data)
    source = view.get("source", source_id) if source_id and source_id != "note" else None
    return (source.data.get("watched") if source is not None else None) or {}


def _could_be(view: Any, cfg: Any, data: dict[str, Any], others: list[str]) -> list[str]:
    """The sides besides Personal an item could be on: those its watched source serves when it serves several, else
    every other side."""
    watched = _watched(view, data)
    for watch in cfg.watch.sources:
        if watched and watch.id == watched.get("source"):
            served = [s for s in others if s in set(watch.sides)]
            if served:
                return served
    return others


def sender_of(view: Any, data: dict[str, Any]) -> str | None:
    """The address of the message an item came from (lower case), when it came from a watched mail item."""
    watched = _watched(view, data)
    if not watched.get("source") or not watched.get("key"):
        return None
    for snap in view.find("snapshot", {"source": watched["source"], "key": watched["key"]}):
        message = snap.data.get("message") or {}
        address = parseaddr(message.get("sender") or "")[1].strip().lower()
        if address:
            return address
    return None


def _noted(signal: Any) -> dict[str, Any] | None:
    """The filing note a signal carries, or none for any other signal."""
    try:
        said = json.loads(signal.data.get("note") or "")
    except ValueError:
        return None
    return said if isinstance(said, dict) and said.get("kind") == SIGNAL_KIND else None


def _kept(view: Any) -> set[str]:
    """The ids of the items the person said to keep under Personal."""
    found: set[str] = set()
    for signal in view.list("signal"):
        said = _noted(signal)
        if said is not None and said.get("action") == "keep":
            found.update(signal.data["refs"])
    return found


def waiting(view: Any, cfg: Any) -> list[Waiting]:
    """Every open item the assistant put under Personal on a guess, newest first. None without a personal project or
    another side."""
    personal = sides.personal_project(view, cfg)
    others = sides.side_list(view, cfg)
    if personal is None or not others:
        return []
    made = view.creators("project")
    starts = [_at(made[s.project][1]) for s in others if s.project in made]
    since = min(starts) if starts else None
    other_ids = [s.project for s in others]
    kept = _kept(view)
    replaced = {f.data["supersedes"] for f in view.list("fact") if f.data.get("supersedes")}
    found: list[Waiting] = []
    for kind, (text_field, _, open_statuses) in KINDS.items():
        creators = view.creators(kind)
        for record in view.list(kind):
            data = record.data
            who, at = creators.get(record.id, (PERSON, ""))
            if (
                who == PERSON
                or record.id in kept
                or data.get("filed_by")
                or _projects(kind, data) != [personal]
                or (open_statuses and data.get("status") not in open_statuses)
                or (kind == "fact" and record.id in replaced)
                or (kind == "note" and from_input(view, data))
                or (since is not None and at and _at(at) < since)
            ):
                continue
            could = _could_be(view, cfg, data, other_ids)
            found.append(Waiting(kind, record.id, record.version, str(data.get(text_field) or ""), at, tuple(could)))
    return sorted(found, key=lambda i: (i.created_at, i.id), reverse=True)


def _answered_today(view: Any, cfg: Any, side: str, now: datetime) -> bool:
    """Whether the person already answered the question for this side today (Move or Keep)."""
    from engine.today import zone

    here = zone(cfg)
    today = now.astimezone(here).date()
    for signal in view.list("signal"):
        said = _noted(signal)
        if said is None or said.get("subject") != side:
            continue
        if _at(signal.data["at"]).astimezone(here).date() == today:
            return True
    return False


def questions(view: Any, cfg: Any, now: datetime) -> list[Question]:
    """The questions to ask now: the waiting items grouped by the sides they could be on, each item once, a group's
    question held back while every one of its sides was answered today. Groups in the order of their first side in the
    person's list of sides, then the rest."""
    items = waiting(view, cfg)
    listed = sides.side_list(view, cfg)
    order = {s.project: n for n, s in enumerate(listed)}
    names = {s.project: s.name for s in listed}
    groups: dict[tuple[str, ...], list[Waiting]] = {}
    for item in items:
        groups.setdefault(tuple(sorted(item.could_be, key=lambda p: order.get(p, len(order)))), []).append(item)
    asked: list[Question] = []
    for could, mine in sorted(groups.items(), key=lambda g: [order.get(p, len(order)) for p in g[0]]):
        if all(_answered_today(view, cfg, p, now) for p in could):
            continue
        asked.append(Question([Choice(p, names[p]) for p in could if p in names], mine))
    return [q for q in asked if q.sides]


def summary(view: Any, cfg: Any, now: datetime) -> Summary | None:
    """The one Today line for all the questions (the line plugs into Today's review group): how many items, which side
    when there is only one, and the oldest item's time; none when there is nothing to ask."""
    asked = questions(view, cfg, now)
    if not asked:
        return None
    every = {(i.kind, i.id): i for q in asked for i in q.items}
    return Summary(
        count=len(every),
        subject=asked[0].name if len(asked) == 1 and len(asked[0].sides) == 1 else None,
        since=min((i.created_at for i in every.values()), default=""),
    )


# ---- Move and Keep ---------------------------------------------------------------------------------------------------


def move_ops(view: Any, cfg: Any, side: str, items: list[tuple[str, str, int | None]]) -> list[dict[str, Any]]:
    """The edits that move these items from Personal to a side: one `record.edit` each, with the version the person
    saw. Refused, naming the item, for one that isn't under Personal any more or isn't a kind that can be filed."""
    personal = sides.personal_project(view, cfg)
    if side not in [s.project for s in sides.side_list(view, cfg)]:
        raise ValueError("that isn't one of your sides")
    ops = []
    for kind, record_id, seen in items:
        if kind not in KINDS:
            raise ValueError(f"a {kind} can't be filed under a project")
        record = view.get(kind, record_id)
        if record is None:
            raise ValueError(f"there is no {kind} {record_id}")
        if _projects(kind, record.data) != [personal]:
            raise ValueError(f"{kind} {record_id} was moved meanwhile")
        field_name = KINDS[kind][1]
        ops.append(
            {
                "op": "record.edit",
                "record": {"kind": kind, "id": record_id},
                "fields": {field_name: [side] if field_name == "projects" else side},
                "read_version": seen or record.version,
            }
        )
    return [*ops, *_notes_of(view, personal, side, items)]


def _notes_of(
    view: Any, personal: str | None, side: str, items: list[tuple[str, str, int | None]]
) -> list[dict[str, Any]]:
    """The edits that move the notes kept from the same inputs along with the items: a note takes its input's side."""
    moved = {(kind, rid) for kind, rid, _ in items}
    inputs = {src for kind, rid, _ in items if kind != "note" and (src := _source_of(view.get(kind, rid).data))}
    return [
        {
            "op": "record.edit",
            "record": {"kind": "note", "id": note.id},
            "fields": {"project": side},
            "read_version": note.version,
        }
        for note in view.list("note")
        if ("note", note.id) not in moved and note.data.get("source") in inputs and note.data.get("project") == personal
    ]


def _note(action: str, side: str, **more: Any) -> str:
    return json.dumps({"kind": SIGNAL_KIND, "subject": side, "action": action, **more})


def move(
    store: Any, cfg: Any, side: str, items: list[tuple[str, str, int | None]], now: datetime | None = None
) -> Moved:
    """Move the items to the side as the person's own change, in one changeset with Undo; each is a correction the
    assistant learns from. The move is noted (`suggestion_chosen`) so the side isn't asked again today; moving the same
    sender's items a second time proposes a rule for that sender."""
    from engine.applier import apply_as_person
    from engine.dispatcher import signal

    now = now or datetime.now(UTC)
    view = store.read()
    ops = move_ops(view, cfg, side, items)
    senders = sorted({s for kind, rid, _ in items if (s := sender_of(view, view.get(kind, rid).data))})
    name = next((s.name for s in sides.side_list(view, cfg) if s.project == side), "")
    changeset = apply_as_person(store, cfg, ops, sides.word(cfg, "filing.move_summary").format(side=name))
    signal(
        store,
        "suggestion_chosen",
        [rid for _, rid, _ in items],
        note=_note("move", side, senders=senders, count=len(items)),
        now=now,
        changeset=changeset,
    )
    proposed = None
    for sender in senders:
        if moves_of(store.read(), side, sender) >= 2:
            proposed = proposed or propose_rule(store, cfg, side, name, sender, now)
    return Moved(changeset, len(items), proposed)


def keep(store: Any, cfg: Any, side: str, items: list[tuple[str, str, int | None]], now: datetime | None = None) -> str:
    """Keep the items under Personal: they are never asked about again, and the side isn't asked again today. Nothing
    about the items changes. Returns the signal's id."""
    from engine.dispatcher import signal

    view = store.read()
    if side not in [s.project for s in sides.side_list(view, cfg)]:
        raise ValueError("that isn't one of your sides")
    for kind, record_id, _ in items:
        if kind not in KINDS or view.get(kind, record_id) is None:
            raise ValueError(f"there is no {kind} {record_id}")
    return signal(
        store,
        "suggestion_dismissed",
        [rid for _, rid, _ in items],
        note=_note("keep", side, change=str(len(items))),
        now=now or datetime.now(UTC),
    )


# ---- a rule after the second move ------------------------------------------------------------------------------------


def _undone(view: Any, changeset: str | None) -> bool:
    found = view.get("changeset", changeset) if changeset else None
    return found is not None and any(o.get("status") == "undone" for o in found.data["ops"])


def moves_of(view: Any, side: str, sender: str) -> int:
    """How many times the person moved items from this sender to the side (each Move is one, and one that was undone
    is none)."""
    count = 0
    for signal in view.list("signal"):
        said = _noted(signal)
        if (
            signal.data["kind"] == "suggestion_chosen"
            and said is not None
            and said.get("action") == "move"
            and said.get("subject") == side
            and sender in (said.get("senders") or [])
            and not _undone(view, signal.data.get("changeset"))
        ):
            count += 1
    return count


def propose_rule(store: Any, cfg: Any, side: str, name: str, sender: str, now: datetime) -> str | None:
    """Propose the standing rule that says where a sender's mail goes, stating its reach. It is a proposal like any
    learning: it changes nothing until the person keeps it, and a rule that says the same is not made twice."""
    from engine.proposals import duplicate_of
    from engine.records import Scope
    from engine.storage import WriteContext

    text = sides.word(cfg, "filing.rule_text").format(sender=sender, side=name)
    data = {
        "name": f"filing-{sender}-{side}".lower(),
        "text": text,
        "applies_to": Scope().model_dump(mode="json", by_alias=True),
        "origin": "assistant",
        "trust": "trusted",
        "status": "proposed",
        "source": sides.word(cfg, "filing.rule_source"),
        "learned_at": now.isoformat(),
        "constrains": [],
    }
    with store.transaction() as tx:
        if duplicate_of(tx, "rule", data) is not None:
            return None
        if any(r.data["name"] == data["name"] for r in tx.list("rule", include_deleted=True)):
            return None
        return tx.create("rule", data, WriteContext(actor="engine", trust="trusted", op="filing.propose")).id

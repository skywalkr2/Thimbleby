"""Sides in the data (design 6.32): the person's own life (Personal) and any number of other sides, each a job or a
business of their own.

`project.personal` names the top project of Personal and `project.sides` lists the others (the older single
`project.business` is read as the first). A side is identified by the id of its top project. A project is on a side by
the top of its parent chain; a person is on the sides their record names (`sides`, or the older `side` read as
Personal, the first side or both); an item is on the side of the project it is filed under. Filing by people
(`file_by_people`) gives an item that names no project the side's top project when the people it names, and the one it
came from, are on one side; people on several sides, and people not known, don't decide. When the people don't place an
item and there is another side, the signals after them may, each a rank read in order, the first that decides deciding
and a rank pointing to two or more sides deciding nothing: the sides the watched source serves (one decides, several
narrow every later rank to them), the sender's mail domain when the sender is nobody known, a project's aliases, the
names of projects that count by themselves (two or more words, or one that is no everyday word), then the configured
`project.side_words` (the personal words, and the business words while there is exactly one other side); the item's text
and quote are matched as whole words whatever their case. Whatever files an item is kept on it (`filed_by`) so the item
can say why. Reads only, except `make_personal` and `set_business`, which write the project each side needs.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from engine.mail_kinds import kind_of_input
from engine.ops import ActionAddOp, FactOp, NoteOp, ProjectAddOp, QuestionAddOp
from engine.records import FiledBy, referrers
from engine.storage import StoreError, WriteContext
from engine.yaml_load import load_yaml

#: A side is the id of its top project.
Side = str
#: What a side is: a job (the person works for someone) or a business of their own.
SIDE_KINDS = ("job", "business")

WORDS_FILE = Path(__file__).parent / "defaults" / "words.yaml"
PERSONAL_NAME_KEY = "project.personal_name"
SETTING_PERSONAL = "workspace.project.personal"
SETTING_BUSINESS = "workspace.project.business"
SETTING_SIDES = "workspace.project.sides"


def word(cfg: Any | None, key: str) -> str:
    """A word the engine writes into a record: the workspace's wording override, else the shipped default."""
    override = (cfg.ui.wording.get(key) or "").strip() if cfg is not None else ""
    if override:
        return override
    shipped = load_yaml(WORDS_FILE.read_text(encoding="utf-8")) or {}
    return str(shipped[key])


def _live(view: Any, project_id: str | None) -> str | None:
    """The configured project's id when a project by that id still exists (an undone or removed one counts as unset)."""
    return project_id if project_id and view.get("project", project_id) is not None else None


def _only_top(view: Any, project_id: str) -> bool:
    """Whether the project is the only top-level project in the workspace."""
    return all(p.id == project_id or p.data.get("parent") for p in view.list("project"))


def personal_project(view: Any, cfg: Any) -> str | None:
    """The project of the personal side, when one is set and still there."""
    return _live(view, cfg.workspace.project.personal)


def has_no_end(view: Any, cfg: Any, project_id: str | None) -> bool:
    """Whether a project has no end: the personal project itself, or an area. Either is ongoing, so it has no target
    day (design 6.32); a project with an end inside one is not covered."""
    record = view.get("project", project_id) if project_id else None
    return record is not None and (bool(record.data.get("area")) or project_id == personal_project(view, cfg))


def no_target_problem(view: Any, cfg: Any, project_id: str | None, fields: dict[str, Any]) -> str | None:
    """Why a change can't give a project with no end a target day, or None."""
    if fields.get("target") and has_no_end(view, cfg, project_id):
        return "the personal project and its areas have no target day: they are ongoing"
    return None


@dataclass(frozen=True)
class SideInfo:
    """A side besides Personal: the id of its top `project`, what it is (`kind`: job or business) and its `name`."""

    project: str
    kind: str
    name: str


def _stands_as_a_side(view: Any, record: Any) -> bool:
    """Whether a side's project still stands as one: it is at the top (a side moved inside another project, Personal
    say, is no longer a side) and it has not ended (an ended side is gone from the sides)."""
    from engine.endings import project_ended

    return not record.data.get("parent") and not project_ended(view, record.id)


def side_list(view: Any, cfg: Any) -> list[SideInfo]:
    """The sides besides Personal, in the order the person listed them (the older single business first): only those
    whose project still exists and stands as a side (`_stands_as_a_side`), each once. The one place the list is read."""
    found: list[SideInfo] = []
    personal = cfg.workspace.project.personal
    for entry in cfg.workspace.project.sides:
        record = view.get("project", entry.project)
        if (
            record is None
            or entry.project == personal
            or any(f.project == entry.project for f in found)
            or not _stands_as_a_side(view, record)
        ):
            continue
        found.append(SideInfo(entry.project, entry.kind, str(record.data.get("name") or "")))
    return found


def alone_with_personal(cfg: Any) -> str | None:
    """The personal project's id when the person has no side beside their own life, else none. A connection made then
    serves it, so it takes that side's data level and keeps it when a side is added later."""
    project = cfg.workspace.project
    return project.personal if project.personal and not project.sides else None


def business_project(view: Any, cfg: Any) -> str | None:
    """The top project of the first side besides Personal, when there is one and it is still there."""
    listed = side_list(view, cfg)
    return listed[0].project if listed else None


def side_ids(view: Any, cfg: Any) -> list[str]:
    """The id of every side that exists: Personal first, then the others in their order."""
    personal = personal_project(view, cfg)
    return [*([personal] if personal else []), *(s.project for s in side_list(view, cfg))]


def top_of(view: Any, project_id: str) -> str | None:
    """The project at the top of a project's parent chain (itself when it has no parent); none for a project that isn't
    there. A chain that loops, or leads to a parent that isn't there, stops at the last project it reached, so a bad
    parent never hangs a read."""
    seen: list[str] = []
    current: str | None = project_id
    while current and current not in seen:
        record = view.get("project", current)
        if record is None:
            break
        seen.append(current)
        current = record.data.get("parent")
    return seen[-1] if seen else None


def side_of_project(view: Any, cfg: Any, project_id: str | None) -> Side | None:
    """Which side a project is on: the id of the side whose top project the project's parent chain ends in; none when
    it ends in no side's (or the project isn't there)."""
    if not project_id:
        return None
    top = top_of(view, project_id)
    return top if top is not None and top in side_ids(view, cfg) else None


def side_word(view: Any, cfg: Any, side: str | None) -> Literal["personal", "business"] | None:
    """The older word for a side: personal for Personal, business for any other side."""
    if side is None:
        return None
    if side == personal_project(view, cfg):
        return "personal"
    return "business" if any(s.project == side for s in side_list(view, cfg)) else None


def watch_source_side(view: Any, cfg: Any, source_id: str | None) -> Side | None:
    """The one side a watched source serves (the sides that exist, in the sides' order); none when it serves none or
    several, so what came from it shows under every choice of the side filter."""
    source = next((s for s in cfg.watch.sources if s.id == source_id), None)
    if source is None:
        return None
    served = [i for i in side_ids(view, cfg) if i in set(source.sides)]
    return served[0] if len(served) == 1 else None


def resolve_side(view: Any, cfg: Any, choice: str | None) -> Side | None:
    """A side id from what a caller names: the id itself, or the older words (`personal`: the personal project,
    `business`: the first other side); none for anything else."""
    if not choice:
        return None
    if choice == "personal":
        return personal_project(view, cfg)
    if choice == "business":
        return business_project(view, cfg)
    return choice if choice in side_ids(view, cfg) else None


def projects_of(data: dict[str, Any]) -> list[str]:
    """The project ids a record names, from its `project` or `projects` field."""
    found: list[str] = []
    for field in ("project", "projects"):
        value = data.get(field)
        if isinstance(value, str) and value:
            found.append(value)
        elif isinstance(value, list):
            found += [v for v in value if isinstance(v, str) and v]
    return found


def side_of_item(view: Any, cfg: Any, record: Any) -> Side | None:
    """Which side an item (a record with a project) is on: that of the first project it names that has one."""
    for project_id in projects_of(record.data):
        if side := side_of_project(view, cfg, project_id):
            return side
    return None


def side_of_line(view: Any, cfg: Any, line: Any) -> Side | None:
    """Which side a line of Today's queue is on: that of its project, else the one side every record it names (the
    question, the actions and the questions it covers) is on. A line about records on several sides, or about none, is
    on no side, so a side filter shows it under every choice."""
    if side := side_of_project(view, cfg, getattr(line, "project", None)):
        return side
    found: set[Side] = set()
    refs = [("question", getattr(line, "question", None))]
    refs += [("action", i) for i in getattr(line, "actions", None) or []]
    refs += [("question", i) for i in getattr(line, "questions", None) or []]
    for kind, record_id in refs:
        record = view.get(kind, record_id) if record_id else None
        if record is not None and (side := side_of_item(view, cfg, record)):
            found.add(side)
    return next(iter(found)) if len(found) == 1 else None


# ---- the sides a person is on --------------------------------------------------------------------------------------


def _legacy_sides(view: Any, cfg: Any, word: str | None) -> list[str]:
    """The sides the older `side` word means: personal is Personal, business the first other side and both are those
    two."""
    personal, first = personal_project(view, cfg), business_project(view, cfg)
    mapped = {"personal": [personal], "business": [first], "both": [personal, first]}.get(word or "", [])
    return [m for m in mapped if m]


def person_sides(view: Any, cfg: Any, data: dict[str, Any]) -> list[str]:
    """The sides a person's record puts them on, as side ids in the order of the sides' list: what `sides` names that
    still exists, else what the older `side` word means. Empty when not known."""
    ids = side_ids(view, cfg)
    named = {s for s in data.get("sides") or [] if isinstance(s, str)}
    found = [i for i in ids if i in named]
    return found or _legacy_sides(view, cfg, data.get("side"))


def side_word_of(view: Any, cfg: Any, held: list[str]) -> Literal["personal", "business", "both"] | None:
    """The older `side` word for a person on these sides: only Personal is personal, no Personal but some other side
    is business, Personal and another is both, and none is none."""
    personal = personal_project(view, cfg)
    has_personal = personal is not None and personal in held
    has_other = any(h != personal for h in held)
    if has_personal and has_other:
        return "both"
    if has_personal:
        return "personal"
    return "business" if has_other else None


def sides_of_person(view: Any, cfg: Any, people: Any, person_id: str | None) -> list[str]:
    """The sides a known person is on; empty when unset or when no such person is known."""
    data = people.records.get(person_id or "") if person_id else None
    return person_sides(view, cfg, data) if data else []


def side_of_person(
    view: Any, cfg: Any, people: Any, person_id: str | None
) -> Literal["personal", "business", "both"] | None:
    """The older word for the side a person's record gives them, none when unset or when no such person is known."""
    return side_word_of(view, cfg, sides_of_person(view, cfg, people, person_id))


def person_write(view: Any, cfg: Any, fields: dict[str, Any]) -> tuple[dict[str, Any], str | None]:
    """A write to a person's `side` or `sides` with the other kept in step, or why it can't be made. Naming `sides`
    works out `side` from it; writing the older `side` works out `sides` while there is at most one side besides
    Personal, and with several it is refused in plain words, since business or both doesn't say which. Anything else
    in the write is left as it is."""
    if "sides" not in fields and "side" not in fields:
        return fields, None
    ids = side_ids(view, cfg)
    personal = personal_project(view, cfg)
    others = [i for i in ids if i != personal]
    out = dict(fields)
    if "sides" in fields:
        given = fields["sides"] if isinstance(fields["sides"], list) else []
        if unknown := [g for g in given if g not in ids]:
            return fields, f"{', '.join(str(u) for u in unknown)} isn't one of your sides"
        held = [i for i in ids if i in given]
        out["sides"], out["side"] = held, side_word_of(view, cfg, held)
        return out, None
    word = fields["side"]
    if word in ("business", "both") and len(others) > 1:
        names = ", ".join(s.name for s in side_list(view, cfg))
        return fields, (
            f"you have more than one side besides your own life ({names}): name the side this person is on "
            f"instead of '{word}'"
        )
    out["sides"] = _legacy_sides(view, cfg, word)
    return out, None


def _named(op: Any) -> list[str]:
    """The names (or ids) of the people an op that makes an item names: owners and who a promise is to, or who a
    question is to."""
    if isinstance(op, ActionAddOp):
        return [*op.owners, *op.promised_to]
    if isinstance(op, QuestionAddOp):
        return [op.to]
    return []


def _phrase(words: str) -> re.Pattern[str] | None:
    """A pattern that finds the words as a whole word or phrase, whatever the case and the spacing between them."""
    parts = words.split()
    if not parts:
        return None
    return re.compile(r"(?<!\w)" + r"\s+".join(re.escape(p) for p in parts) + r"(?!\w)", re.IGNORECASE)


def _words_of(op: Any) -> str:
    """What an item says that its words are read from: its text (or title and detail) and the quote it rests on."""
    if isinstance(op, QuestionAddOp):
        parts = [op.title, op.text]
    else:
        parts = [op.text, getattr(getattr(op, "evidence", None), "quote", "")]
    return "\n".join(p for p in parts if p)


#: The ranks of words, in the order they are read after the people, the source and the sender's domain.
WORD_RANKS: tuple[Literal["alias", "name", "word"], ...] = ("alias", "name", "word")

#: What a rank holds for each side (by its id): the pattern, the project it names (none for a configured word) and the
#: word itself.
Patterns = dict[Side, list[tuple[re.Pattern[str], str | None, str]]]


def _everyday(cfg: Any) -> frozenset[str]:
    """The words a project name made of one of them alone never files by (`language.everyday_words`), case ignored."""
    return frozenset(" ".join(w.split()).casefold() for w in cfg.language.everyday_words if w.strip())


def _name_counts(name: str, everyday: frozenset[str]) -> bool:
    """Whether a project's name files an item by itself: two or more words, or one that isn't an everyday word."""
    parts = name.split()
    return len(parts) >= 2 or (len(parts) == 1 and parts[0].casefold() not in everyday)


def _side_words(view: Any, cfg: Any) -> dict[str, Patterns]:
    """For each rank of words, the patterns that place an item on each side, each with the project it names: a
    project's aliases (any alias counts, even one word, since the person gave it), then the names of the projects on
    that side that count by themselves, then the configured side words (the personal words for Personal, the business
    words while there is exactly one other side). Only projects on a side have any."""
    configured = cfg.workspace.project.side_words
    everyday = _everyday(cfg)
    ids = side_ids(view, cfg)
    found: dict[str, Patterns] = {rank: {i: [] for i in ids} for rank in WORD_RANKS}
    for project in view.list("project"):
        side = side_of_project(view, cfg, project.id)
        if side is None:
            continue
        for alias in project.data.get("aliases") or []:
            if pattern := _phrase(str(alias)):
                found["alias"][side].append((pattern, project.id, " ".join(str(alias).split())))
        name = " ".join(str(project.data.get("name") or "").split())
        if name and _name_counts(name, everyday) and (pattern := _phrase(name)):
            found["name"][side].append((pattern, project.id, name))
    personal, others = personal_project(view, cfg), side_list(view, cfg)
    words = [(personal, configured.personal)] if personal else []
    words += [(others[0].project, configured.business)] if len(others) == 1 else []
    for side, listed in words:
        found["word"][side] += [(pattern, None, " ".join(w.split())) for w in listed if (pattern := _phrase(w))]
    return found


@dataclass(frozen=True)
class Filing:
    """The project an item is filed under and why: the signal (`FiledBy.by`), the word, domain or source that matched
    (none for people) and the project."""

    project: str
    by: Literal["people", "source", "domain", "alias", "name", "word"]
    word: str | None = None

    def stamp(self) -> FiledBy:
        return FiledBy(by=self.by, word=self.word, project=self.project)


def file_by_words(
    op: Any, view: Any, cfg: Any, words: dict[str, Patterns] | None = None, allowed: set[str] | None = None
) -> Filing | None:
    """How an item's words place it, none when they don't. The ranks are read in order (identifiers, project names,
    configured words) and the first that decides, decides: a rank whose words are all of one side gives that side's top
    project, or the one project of that side the words name; a rank with words of several sides decides nothing, so the
    next is read. With `allowed`, only words of those sides count."""
    text = _words_of(op)
    ranks = words or _side_words(view, cfg)
    for rank in WORD_RANKS:
        matched: dict[Side, list[tuple[str | None, str]]] = {}
        for side, patterns in ranks[rank].items():
            if allowed is not None and side not in allowed:
                continue
            hits = [(project, word) for pattern, project, word in patterns if pattern.search(text)]
            if hits:
                matched[side] = hits
        if len(matched) != 1:
            continue
        side, hits = next(iter(matched.items()))
        named = {project for project, _ in hits if project}
        project = next(iter(named)) if len(named) == 1 else side
        word = next((w for p, w in hits if p == project), hits[0][1])
        return Filing(project, rank, word)
    return None


def _domain_of(address: str) -> str:
    return address.rpartition("@")[2].strip().lower().rstrip(".") if "@" in address else ""


def sender_domain(people: Any, raw_input: str | None) -> str | None:
    """The domain of the From address of a message that opens the input, when that sender is nobody known; none for
    anything else."""
    from email.utils import parseaddr

    from engine.reply_lines import leading_headers

    head = leading_headers(raw_input or "")
    sender = (head[0].get("from") or "") if head else ""
    if not sender or people.match_entries([sender]):
        return None
    return _domain_of(parseaddr(sender)[1]) or None


def domain_side(view: Any, people: Any, cfg: Any, domain: str) -> Side | None:
    """The side a mail domain votes for: when every known person with an address there works for one organization and
    that organization's people are all on the same one side. A public mail service shared by many unrelated people, an
    address nobody known has, and a person with no organization never vote."""
    from engine.set_aside import is_public_domain

    if is_public_domain(domain, cfg):
        return None
    orgs = {
        data.get("org")
        for data in people.records.values()
        if any(_domain_of(v) == domain for v in data.get("how_to_reach", {}).values())
    }
    if len(orgs) != 1 or None in orgs:
        return None
    org = next(iter(orgs))
    on = {
        tuple(held)
        for data in people.records.values()
        if data.get("org") == org and (held := person_sides(view, cfg, data))
    }
    if len(on) != 1:
        return None
    held = next(iter(on))
    return held[0] if len(held) == 1 else None


def without_filed_by(ops: list[Any]) -> list[Any]:
    """The ops with any reason for filing they carry cleared: only `file_by_people` sets one."""
    return [
        op.model_copy(update={"filed_by": None})
        if isinstance(op, (ActionAddOp, QuestionAddOp, FactOp, NoteOp)) and op.filed_by is not None
        else op
        for op in ops
    ]


def source_sides(view: Any, cfg: Any, source: str | None) -> tuple[list[str], str]:
    """The sides the watched source an input came from serves (those that still exist, in the sides' order) and its
    label; empty when the input wasn't read from a watched source or the source names none."""
    record = view.get("source", source) if source else None
    watched = (record.data.get("watched") if record is not None else None) or {}
    for watch in cfg.watch.sources:
        if watch.id == watched.get("source"):
            named = set(watch.sides)
            return [i for i in side_ids(view, cfg) if i in named], watch.label or watch.id
    return [], ""


def file_by_people(
    ops: list[Any],
    view: Any,
    cfg: Any,
    people: Any,
    sender: str | None,
    raw_input: str | None = None,
    settled: str | None = None,
    source: str | None = None,
) -> list[Any]:
    """The ops with every new action, question, fact or note that names no project filed under a project, each keeping
    why it was (`filed_by`). The signals are read in order and the first that decides, decides; one that points to two
    or more sides decides nothing and the next is read:
    00. the project the person settled for the hand-in (the request's own project), when it has one;
    0. mail the rules know as a bill, an order or a delivery (`engine/mail_kinds.py`): the personal project, whoever
       sent it, unless the person has another side and the sender's relation is to it (`_sender_relation`: a known
       person on that side, or an organization whose people are all on it), which files it under that side;
    1. the people the op names and the input's sender, when known: the side every deciding person is on (those on
       several sides and those not known don't decide), filed under that side's top project;
    2. the sides the watched source the input came from serves (`WatchSource.sides`): one files it there, several
       narrow every rank after this one to them;
    3. the sender's mail domain, when the sender is nobody known (`domain_side`);
    4. a project's aliases, 5. the names of projects that count by themselves, 6. the configured side words
       (`file_by_words`): under the one project they name, else the side's top project.
    With no other side an unplaced item goes to the personal project when that is the only top-level project (a
    workspace tracking other work without naming a side keeps its unfiled items for the person to place); with one,
    an item no signal places stays unfiled for the person to place. A changeset that also proposes a new project is left
    as it is: adding that project files what the same input made with no project under it. Whatever the assistant
    wrote in `filed_by` is cleared: only this function sets it. The same ops always give the same result."""
    ops = without_filed_by(ops)
    personal, others = personal_project(view, cfg), side_list(view, cfg)
    if personal is None and not others:
        return ops
    if any(isinstance(op, ProjectAddOp) for op in ops):
        return ops
    words = _side_words(view, cfg) if others else None
    domain = sender_domain(people, raw_input) if others else None
    by_domain = domain_side(view, people, cfg, domain) if domain else None
    served, served_name = source_sides(view, cfg, source) if others else ([], "")
    only_personal = not others and personal is not None and _only_top(view, personal)
    kind = kind_of_input(cfg.watch.mail_kinds, raw_input)
    out: list[Any] = []
    for op in ops:
        if not isinstance(op, (ActionAddOp, QuestionAddOp, FactOp, NoteOp)) or op.project:
            out.append(op)
            continue
        if settled and view.get("project", settled) is not None:
            # The person settled which project the hand-in is about (Treat as personal, say): that decides.
            out.append(op.model_copy(update={"project": settled}))
            continue
        if kind and personal:
            # A bill, an order or a delivery is the person's own life, whoever sent it: the Personal project. Once the
            # person has another side, a sender whose relation is to it (a known person on that side, or an
            # organization whose people are all on it) is read first, so a supplier's invoice goes to work.
            relation = _sender_relation(view, cfg, sender, by_domain, domain, personal, people)
            filing = relation or Filing(personal, "word", kind)
            out.append(op.model_copy(update={"project": filing.project, "filed_by": filing.stamp()}))
            continue
        if not others:
            out.append(op.model_copy(update={"project": personal}) if only_personal else op)
            continue
        who = [people.resolve(name) for name in _named(op)]
        persons = [r.person for r in who if r.status == "ok" and r.person] + ([sender] if sender else [])
        voted = {held[0] for p in persons if len(held := sides_of_person(view, cfg, people, p)) == 1}
        filing: Filing | None = None
        if len(voted) == 1:
            filing = Filing(next(iter(voted)), "people")
        elif len(served) == 1:
            filing = Filing(served[0], "source", served_name)
        else:
            allowed = set(served) if len(served) > 1 else None
            if by_domain is not None and domain and (allowed is None or by_domain in allowed):
                filing = Filing(by_domain, "domain", domain)
            else:
                filing = file_by_words(op, view, cfg, words, allowed)
        out.append(op.model_copy(update={"project": filing.project, "filed_by": filing.stamp()}) if filing else op)
    return out


def _sender_relation(
    view: Any,
    cfg: Any,
    sender: str | None,
    by_domain: Side | None,
    domain: str | None,
    personal: str | None,
    people: Any,
) -> Filing | None:
    """How the sender's own relation files a bill, an order or a delivery under another side than Personal, or none:
    the sender is a known person on exactly that one side, or nobody known at a mail domain whose organization is wholly
    on it. Several sides, no side and an unknown sender leave the Personal default."""
    if sender and len(held := sides_of_person(view, cfg, people, sender)) == 1 and held[0] != personal:
        return Filing(held[0], "people")
    if by_domain is not None and by_domain != personal and domain:
        return Filing(by_domain, "domain", domain)
    return None


def filed_view(view: Any, cfg: Any, kind: str, record: Any) -> dict[str, Any] | None:
    """What an item says about why it was filed, for its line and its page: the signal and the word, domain or source,
    the project it was filed under and its name, every other side it can move to (`move_options`: the top project and
    name of each, Personal first) and the one it moves to in a single step when there is exactly one (`move_to`), with
    the field that holds its project and the version to read. None when people placed it or nobody did, when the
    project it was filed under is gone, and once the item is anywhere else: the line goes when the person moves it, and
    comes back with Undo."""
    found = record.data.get("filed_by")
    if not isinstance(found, dict) or found.get("by") == "people":
        return None
    project = view.get("project", found.get("project", ""))
    if project is None or found["project"] not in projects_of(record.data):
        return None
    side = side_of_project(view, cfg, project.id)
    elsewhere = [i for i in side_ids(view, cfg) if i != side and i != project.id] if side is not None else []
    options = [
        {"project": top.id, "name": str(top.data.get("name") or "")}
        for top in (view.get("project", i) for i in elsewhere)
        if top is not None
    ]
    return {
        "by": found["by"],
        "word": found.get("word"),
        "project": project.id,
        "project_name": str(project.data.get("name") or ""),
        "move_to": options[0]["project"] if len(options) == 1 else None,
        "move_to_name": options[0]["name"] if len(options) == 1 else None,
        "move_options": options,
        "field": "projects" if kind == "question" else "project",
        "version": record.version,
    }


# ---- making the top projects --------------------------------------------------------------------------------------


def make_personal(store: Any, cfg: Any | None = None) -> str:
    """Make the personal project, named from the wording sheet, as the first thing a workspace with no template holds.
    Returns its id; the caller records it in `project.personal`."""
    with store.transaction() as tx:
        return tx.create(
            "project",
            {"name": word(cfg, PERSONAL_NAME_KEY)},
            WriteContext(actor="pm", trust="trusted", op="init"),
        ).id


@dataclass(frozen=True)
class Business:
    """The side after `set_business`: its `project` id, whether this call made it (`created`), and the `changeset` to
    undo (none when nothing changed)."""

    project: str
    created: bool
    changeset: str | None
    kind: str = "business"


def set_business(
    ws: Any, store: Any, cfg: Any, name: str, *, kind: str = "business", env: dict[str, str] | None = None
) -> Business:
    """Add a side: make a top-level project with that name and append it to `project.sides` with its kind (a job or a
    business), as the person's own change with Undo. A name a side already has is that side, and nothing changes. A
    side whose project was since undone or removed is made again. Raises `StoreError` in plain words for a name another
    live project has, a kind that isn't one, or no name."""
    from engine import settings as config_screens
    from engine.applier import apply_as_person

    name = " ".join(name.split())
    if not name:
        raise StoreError("Give the business a name.")
    if kind not in SIDE_KINDS:
        raise StoreError(f"A side is a {' or a '.join(SIDE_KINDS)}.")
    view = store.read()
    listed = side_list(view, cfg)
    if same := next((s for s in listed if s.name == name), None):
        return Business(same.project, False, None, same.kind)
    changeset = apply_as_person(store, cfg, [{"op": "project.add", "name": name}], "Added the business")
    made = next(p for p in store.read().list("project") if p.data["name"] == name)
    entries = [{"project": s.project, "kind": s.kind} for s in listed]
    config_screens.save(
        ws,
        cfg,
        store,
        changes={SETTING_SIDES: [*entries, {"project": made.id, "kind": kind}]},
        reset=[],
        read_fingerprint=config_screens.fingerprint(ws.config_dir),
        env=env,
        allow=(SETTING_SIDES,),
    )
    return Business(made.id, True, changeset, kind)


def _below(view: Any, project_id: str) -> list[str]:
    """The ids of every project inside a project, however deep, each after the one it sits in."""
    found: list[str] = []
    waiting = [project_id]
    while waiting:
        here = waiting.pop(0)
        for record in view.list("project"):
            if record.data.get("parent") == here and record.id not in found and record.id != project_id:
                found.append(record.id)
                waiting.append(record.id)
    return found


def removable_side(view: Any, project_id: str) -> bool:
    """Whether a side's project and the projects inside it have nothing filed under them: no item, person, source or
    other record refers to any of them, only the projects inside it to each other."""
    family = {project_id, *_below(view, project_id)}
    return all(
        kind == "project" and other in family for pid in family for kind, other in referrers(view, "project", pid)
    )


def remove_side(ws: Any, store: Any, cfg: Any, project_id: str, *, env: dict[str, str] | None = None) -> list[str]:
    """Take a side back out before setup is finished: delete its project and the projects inside it, and drop it from
    `project.sides`. Refused in plain words while anything is filed under it, or when it is not a side. Returns the ids
    removed."""
    from engine import settings as config_screens

    if not any(s.project == project_id for s in side_list(store.read(), cfg)):
        raise StoreError("That isn't one of your sides.")
    context = WriteContext(actor="pm", trust="trusted", op="project.remove")
    with store.transaction() as tx:
        if not removable_side(tx, project_id):
            raise StoreError("Something is already filed under it, so it can't be removed here.")
        gone = [*reversed(_below(tx, project_id)), project_id]
        for pid in gone:
            tx.delete("project", pid, context, read_version=tx.get("project", pid).version)
    kept = [{"project": e.project, "kind": e.kind} for e in cfg.workspace.project.sides if e.project != project_id]
    config_screens.save(
        ws,
        cfg,
        store,
        changes={SETTING_SIDES: kept},
        reset=[],
        read_fingerprint=config_screens.fingerprint(ws.config_dir),
        env=env,
        allow=(SETTING_SIDES,),
    )
    return gone


#: What happens to a side's projects and to-dos when the side is removed after setup: they move to Personal, or they end
#: with it.
REMOVALS = ("personal", "end")


def remove_with_work(store: Any, cfg: Any, project_id: str, where: str, *, ws: Any = None) -> str:
    """Remove a side after setup, as the person's own change in one changeset with Undo (`apply_as_person`, no new op).
    `where` is what happens to what is filed under it: "personal" moves the side's project inside Personal
    (`record.set` of its parent), so its projects and to-dos are Personal's and none is lost; "end" moves the side's
    project and every project inside it to the status that means finished (`record.set` of the status), and the
    ending drops what is open on them, nobody credited. Either way the project no longer stands as a side
    (`side_list`), and Undo of the changeset brings the side back whole. A removal that touches many records makes a
    backup first when the workspace is given (`storage.backups`). Returns the changeset id; raises `StoreError` in plain
    words for a project that isn't a side, a choice that isn't one, or no personal project to move to."""
    from engine.applier import apply_as_person
    from engine.endings import project_ended

    view = store.read()
    side = next((s for s in side_list(view, cfg) if s.project == project_id), None)
    if side is None:
        raise StoreError("That isn't one of your sides.")
    if where not in REMOVALS:
        raise StoreError("Say whether its projects and to-dos move to Personal or end with it.")
    family = [project_id, *_below(view, project_id)]
    touched = len(family) + sum(1 for pid in family for kind, _ in referrers(view, "project", pid) if kind != "project")
    if ws is not None:
        from engine import backup

        backup.backup_before_many(ws, backup.live(ws, cfg), touched)
    if where == "personal":
        personal = personal_project(view, cfg)
        if personal is None:
            raise StoreError("There is no personal side to move them to.")
        ops = [{"op": "record.set", "kind": "project", "id": project_id, "field": "parent", "value": personal}]
    else:
        status = cfg.workspace.project.completed_status
        ops = [
            {"op": "record.set", "kind": "project", "id": pid, "field": "status", "value": status}
            for pid in family
            if not project_ended(view, pid)
        ]
    # Ending a side is no comment on the assistant's work, so its drops write no correction.
    return apply_as_person(store, cfg, ops, f"Removed {side.name}", all_or_nothing=True, corrections=False)


def restore_side(
    ws: Any, store: Any, cfg: Any, project_id: str, *, kind: str, position: int, env: dict[str, str] | None = None
) -> list[str]:
    """Bring back a side `remove_side` took out: undelete its project and the projects that were inside it, and list it
    in `project.sides` again with its kind, at `position` among the sides (the end when there are fewer). Refused in
    plain words for a project that isn't a removed side. Returns the ids brought back."""
    from engine import settings as config_screens

    if kind not in SIDE_KINDS:
        raise StoreError(f"A side is a {' or a '.join(SIDE_KINDS)}.")
    context = WriteContext(actor="pm", trust="trusted", op="project.restore")
    with store.transaction() as tx:
        top = tx.get("project", project_id, include_deleted=True)
        if top is None or tx.get("project", project_id) is not None or top.data.get("parent"):
            raise StoreError("That isn't a side that was taken back out.")
        every = tx.list("project", include_deleted=True)
        live = {p.id for p in tx.list("project")}
        back = [project_id]
        for record in every:  # ids rise as projects are made, so a project comes after the one it sits in
            if record.id not in live and record.data.get("parent") in back and record.id not in back:
                back.append(record.id)
        for pid in back:
            tx.undelete("project", pid, context, read_version=tx.get("project", pid, include_deleted=True).version)
    listed = side_list(store.read(), cfg)
    entries = [{"project": e.project, "kind": e.kind} for e in cfg.workspace.project.sides if e.project != project_id]
    anchor = listed[position].project if 0 <= position < len(listed) else None
    at = next((i for i, e in enumerate(entries) if e["project"] == anchor), len(entries))
    entries.insert(at, {"project": project_id, "kind": kind})
    config_screens.save(
        ws,
        cfg,
        store,
        changes={SETTING_SIDES: entries},
        reset=[],
        read_fingerprint=config_screens.fingerprint(ws.config_dir),
        env=env,
        allow=(SETTING_SIDES,),
    )
    return back

"""The scan for new terms (design 6.22, 6.8): after the person's own notes or a mail from a person has been read, a
plain function with no AI lists the words in it that look like the name of a system or an acronym and that the
workspace doesn't know, and asks the person what each means: one question, "What does X mean here?", with an answer
box. The day's term questions reach Today as one line that opens them together (`open_for`). A term with no meaning
is not knowledge, so nothing is proposed for the knowledge tabs; only the person's answer becomes a glossary term, as
their own words (`keep_answer`).

What looks like a term is set by patterns in the language settings. Never asked about: the words in
`language.new_term_ignore`, the core's list of well-known words (`language.known_terms_shipped`) and the person's own
(`language.known_terms`), the names of the configured sources and connectors, a word the glossary, the people, the
projects, the organizations or the teams already have, and a term the person already dismissed or was already asked
about. A term question the person dropped is a term never raised again in this workspace. Mail the app sorted as
automatic, bulk or set aside raises none. At most `dispatch.knowledge.new_terms_per_input` are asked for one input
and `dispatch.knowledge.new_terms_per_day` in one day.
"""

from __future__ import annotations

import re
from datetime import datetime
from functools import cache
from pathlib import Path
from typing import Any

from engine import knowledge
from engine.automatic_mail import classify_automatic
from engine.config import Config
from engine.language_words import language_words
from engine.names import People
from engine.ops import GlossaryAddOp
from engine.storage import WriteContext
from engine.today import local_day, zone
from engine.yaml_load import load_yaml

KNOWN_TERMS_FILE = Path(__file__).parent / "defaults" / "known_terms.yaml"
TERM_QUESTION = "term"
UNKNOWN_MEANING = "not known yet"
TITLE = "What does {term} mean here?"
_TITLE = re.compile(r"^What does (.+) mean here\?$")
QUOTE_MAX = 300
_ADDRESSES = re.compile(r"https?://\S+|www\.\S+|\S+@\S+")
_QUOTED = ("[quoted]", ">")
_ID_TAIL = re.compile(r"-\d")
_WORDS = re.compile(r"[^\W_]+")
_STATUSES = ("active", "proposed")
_OPEN = ("open", "sent")


def candidates(text: str, patterns: list[str], ignore: list[str]) -> list[tuple[str, str]]:
    """The terms in a text that match one of the patterns, each once (case ignored) in the order they first appear,
    with the line each was found on. Quoted lines, web and mail addresses, the first part of a record id, and the words
    in `ignore` are left out."""
    skipped = {word.lower() for word in ignore}
    found: list[tuple[int, int, str, str]] = []
    for number, line in enumerate(text.splitlines()):
        if line.lstrip().startswith(_QUOTED):
            continue
        clean = _ADDRESSES.sub(lambda m: " " * len(m.group(0)), line)
        for pattern in patterns:
            for match in re.finditer(pattern, clean):
                word = match.group(0)
                if word.lower() in skipped or _ID_TAIL.match(clean[match.end() :]):
                    continue
                found.append((number, match.start(), word, line.strip()[:QUOTE_MAX]))
    found.sort(key=lambda item: (item[0], item[1]))
    seen: set[str] = set()
    terms: list[tuple[str, str]] = []
    for _, _, word, line in found:
        if word.lower() not in seen:
            seen.add(word.lower())
            terms.append((word, line))
    return terms


def known_names(view: Any, leave_out: frozenset[str] = frozenset()) -> set[str]:
    """The names the workspace already has, lowercased: each glossary term that is active or proposed, and each name
    of a person, project, organization or team, whole and word by word. Entries named in `leave_out` don't count."""
    names: set[str] = set()

    def add(value: Any) -> None:
        if isinstance(value, str) and value.strip():
            names.add(" ".join(_WORDS.findall(value.lower())))
            names.update(w.lower() for w in _WORDS.findall(value))

    for entry in view.list("glossary_entry"):
        if entry.data.get("status") in _STATUSES and entry.id not in leave_out:
            names.add(" ".join(_WORDS.findall(str(entry.data["term"]).lower())))
    for person in view.list("person"):
        for key in ("full_name", "first_name"):
            add(person.data.get(key))
        for alias in person.data.get("aliases") or []:
            add(alias)
    for project in view.list("project"):
        add(project.id)
        add(project.data.get("name"))
        for tag in project.data.get("tags") or []:
            add(tag)
    for kind in ("organization", "team"):
        for record in view.list(kind):
            add(record.data.get("name"))
    return names


def _already_proposed(view: Any, source: str | None) -> int:
    """How many glossary entries were proposed from this input, whoever made them."""
    if source is None:
        return 0
    return sum(1 for e in view.list("glossary_entry") if (e.data.get("evidence") or {}).get("source") == source)


@cache
def shipped_known() -> frozenset[str]:
    """The core's well-known words, lowercased: every list in the shipped file."""
    data = load_yaml(KNOWN_TERMS_FILE.read_text(encoding="utf-8")) or {}
    return frozenset(str(w).lower() for words in data.values() for w in words or [])


def never_asked(cfg: Config) -> set[str]:
    """The words never asked about: the person's own list, the shipped list unless it is off, and the names of the
    configured sources and connectors (whole and word by word)."""
    words = {w.strip().lower() for w in cfg.language.known_terms}
    if cfg.language.known_terms_shipped:
        words |= shipped_known()
    for source in cfg.watch.sources:
        for name in (source.id, source.label, source.connector):
            for part in re.split(r"[/\s]+", name):
                words.add(part.lower())
            words.add(name.lower())
    return words


def automatic_source(view: Any, source: str | None) -> bool:
    """Whether an input came from mail the app sorted as not from a person: marked set aside, bulk, or a notice by its
    subject. A source with no mail behind it (a pasted note) is the person's own."""
    found = view.get("source", source) if source else None
    watched = (found.data.get("watched") or {}) if found is not None else {}
    if not watched:
        return False
    for snap in view.list("snapshot"):
        if snap.data.get("source") != watched.get("source") or snap.data.get("key") != watched.get("key"):
            continue
        message = snap.data.get("message") or {}
        if snap.data.get("set_aside") or message.get("bulk"):
            return True
        if classify_automatic({}, str(snap.data.get("title") or ""), "text/plain").kind != "none":
            return True
    return any(
        r.data.get("set_aside") for r in view.list("request") if source is not None and r.data.get("source") == source
    )


def term_of(question: Any) -> str | None:
    """The term a question asks the meaning of: the one it was made for, or the one its title names when it was made
    from a retired glossary proposal; None for any other question."""
    resolves = question.data.get("resolves") or {}
    if resolves.get("kind") == TERM_QUESTION:
        return str(resolves.get("term") or "") or None
    if resolves:
        return None
    found = _TITLE.match(str(question.data.get("title") or ""))
    return found.group(1) if found else None


def _term_questions(view: Any) -> list[Any]:
    return [q for q in view.list("question") if term_of(q) is not None]


def _key(term: str) -> str:
    return " ".join(_WORDS.findall(term.lower()))


def raised_terms(view: Any) -> set[str]:
    """The terms already asked about, whatever became of the question (open, answered or dropped), as the scan compares
    them. A dropped question is the person's "never ask this again", so it stays in this set for good."""
    return {_key(str(term_of(q))) for q in _term_questions(view)}


def open_for(view: Any, person: str | None) -> list[Any]:
    """The term questions waiting for this person's answer, oldest first: what Today shows as one line."""
    if person is None:
        return []
    return [q for q in _term_questions(view) if q.data.get("to") == person and q.data.get("status") == "open"]


def _asked_on(asked: list[Any], day: str) -> int:
    """How many term questions were asked on this day (the person's own day)."""
    return sum(1 for q in asked if (q.data.get("resolves") or {}).get("day") == day)


def scan(store: Any, cfg: Config, request_id: str, text: str, now: datetime, *, trust: str = "untrusted") -> list[str]:
    """Ask the person what each new term in `text`, the input of a request that has been read, means, and return the
    ids of the questions made. Nothing is asked when a limit is 0 or reached (for the input, or for the day), when the
    input is automatic mail, when nobody is set as the person, or for a term already asked about (open, answered or
    dropped: a dropped one is never raised again)."""
    per_input = cfg.dispatch.knowledge.new_terms_per_input
    per_day = cfg.dispatch.knowledge.new_terms_per_day
    view = store.read()
    request = view.get("request", request_id)
    source = request.data.get("source") if request is not None else None
    person = People(store, cfg).pm
    if per_input <= 0 or per_day <= 0 or person is None or automatic_source(view, source):
        return []
    asked = _term_questions(view)
    today = local_day(now, zone(cfg)).isoformat()
    room = min(
        per_input
        - sum(1 for q in asked if (q.data.get("resolves") or {}).get("source") == source and source is not None),
        per_day - _asked_on(asked, today),
    )
    if room <= 0:
        return []
    known = known_names(view) | never_asked(cfg)
    before = raised_terms(view)
    chosen: list[tuple[str, str]] = []
    for word, line in candidates(
        text, language_words(cfg.language, "new_term_patterns"), language_words(cfg.language, "new_term_ignore")
    ):
        key = _key(word)
        if key in known or key in before:
            continue
        chosen.append((word, line))
        if len(chosen) == room:
            break
    if not chosen:
        return []
    found = view.get("source", source) if source else None
    projects = list(found.data.get("projects") or []) if found is not None else []
    made: list[str] = []
    with store.transaction() as tx:
        for word, line in chosen:
            write = WriteContext(
                actor="engine", trust=trust, op="terms.scan", request=request_id, evidence={"source": source}
            )
            data: dict[str, Any] = {
                "to": person,
                "title": TITLE.format(term=word),
                "text": f"It came up in: {line}",
                "kind": "question",
                "resolves": {
                    "kind": TERM_QUESTION,
                    "term": word,
                    "source": source,
                    "request": request_id,
                    "day": today,
                },
            }
            if projects:
                data["projects"] = projects
            made.append(tx.create("question", data, write).id)
    return made


def keep_answer(store: Any, cfg: Config, question_id: str, answer: str) -> str | None:
    """Keep the person's answer to a term question as a glossary term in their own words, active at once. Returns the
    entry's id, or None for a question that isn't about a term, an empty answer, or a term already in the glossary."""
    view = store.read()
    question = view.get("question", question_id)
    term = term_of(question) if question is not None else None
    meaning = " ".join(answer.split())
    if not meaning or not term:
        return None
    if " ".join(_WORDS.findall(term.lower())) in known_names(view):
        return None
    standing = knowledge.Standing(
        person=True,
        pm=People(store, cfg).pm,
        origin="person",
        trust="trusted",
        source=None,
        request=None,
        now=store.clock(),
        hold_days=cfg.dispatch.knowledge.discards_hold_days,
        alike=cfg.dispatch.knowledge.discard_similarity,
    )
    op = GlossaryAddOp(text=f"{term}: {meaning}", term=term, meaning=meaning, confidence="confirmed")
    write = WriteContext(actor="pm", trust="trusted", op="terms.answer")
    with store.transaction() as tx:
        return knowledge.apply(tx, op, write, standing)[0]["id"]


def clear_old_entries(store: Any, cfg: Config) -> str | None:
    """Retire the glossary proposals that only say a term is not known yet, as one change the person can Undo, and ask
    what each means unless it is a well-known word (then it is only retired). Does nothing when there are none, or when
    nobody is set as the person to ask. Returns the change's id."""
    from engine.applier import apply_as_person

    view = store.read()
    old = [
        e
        for e in view.list("glossary_entry")
        if e.data.get("status") == "proposed" and e.data.get("meaning") == UNKNOWN_MEANING
    ]
    person = People(store, cfg).pm
    if not old or person is None:
        return None
    skip = never_asked(cfg) | known_names(view, frozenset(e.id for e in old)) | raised_terms(view)
    ops: list[dict[str, Any]] = []
    for entry in old:
        term = str(entry.data["term"])
        ops.append(
            {
                "op": "record.edit",
                "record": {"kind": "glossary_entry", "id": entry.id},
                "fields": {"status": "discarded", "discard_reason": "Asked as a question instead"},
                "read_version": entry.version,
            }
        )
        key = " ".join(_WORDS.findall(term.lower()))
        if key not in skip:
            skip.add(key)
            quote = (entry.data.get("evidence") or {}).get("quote")
            ops.append(
                {
                    "op": "question.add",
                    "to": person,
                    "title": TITLE.format(term=term),
                    "text": f"It came up in: {quote}" if quote else "",
                }
            )
    return apply_as_person(store, cfg, ops, "Asked what the unknown terms mean instead of proposing them")

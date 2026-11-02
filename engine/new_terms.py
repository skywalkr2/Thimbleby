"""The unknown words of an input and the questions about them (design 6.22, 6.8). A plain function with no AI lists
the words in an input, from any source, that look like the name of a system or an acronym and that the workspace
doesn't know (`unknown_words`); the notes run's request carries them as a short block (`packet_section`), and the
assistant, which has the glossary, the context and what it learned, decides whether any is worth asking about: one
question, "What does X mean here?", with an answer box (`question.add` with `term`). The core holds those questions to
the words listed and to the limits (`limit_questions`) and writes their title and where the word came up. The day's
term questions reach Today as one line that opens them one at a time (`open_for`). A term with no meaning is not
knowledge, so nothing is proposed for the knowledge tabs; only the person's answer becomes a glossary term, as their
own words (`keep_answer`).

What looks like a term is set by patterns in the language settings. Never listed: the words inside a web or mail
address, a link, a path or a query string, or a postal address (`engine/addresses.py`); the words in
`language.new_term_ignore`; the core's list of well-known words (`language.known_terms_shipped`: countries, currency
codes, place names, services, file types) and the person's own (`language.known_terms`); a word in capitals or a name
joined from words that are all everyday English words; the names of the configured sources and connectors; the
sender's own name and domain in a mail header; a word the glossary, the people, the projects, the organizations or the
teams already have; and a term the person already dismissed or was already asked about. A term question the person
dropped is a term never listed again in this workspace. At most `dispatch.knowledge.new_terms_per_input` are asked for
one input and `dispatch.knowledge.new_terms_per_day` in one day.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from functools import cache
from pathlib import Path
from typing import Any

from engine import addresses, knowledge
from engine.config import Config
from engine.html_text import as_text
from engine.language_words import language_words
from engine.names import People
from engine.note_titles import sender_name
from engine.ops import GlossaryAddOp
from engine.reply_lines import leading_headers
from engine.sides import word
from engine.storage import WriteContext
from engine.today import local_day, zone
from engine.yaml_load import load_yaml

KNOWN_TERMS_FILE = Path(__file__).parent / "defaults" / "known_terms.yaml"
TERM_QUESTION = "term"
#: The tag of the block that lists the unknown words in a notes run's request, and how many times as many words as may
#: be asked are listed.
BLOCK = "unknown_words"
CANDIDATE_FACTOR = 4
UNKNOWN_MEANING = "not known yet"
TITLE = "What does {term} mean here?"
_TITLE = re.compile(r"^What does (.+) mean here\?$")
QUOTE_MAX = 300
#: What is blanked before candidates are taken: markdown and angle-bracket links, web and mail addresses, a host with a
#: path, a path from the root, a path of several parts or ending in a file, and the `name=value` parts of a query
#: string.
_ADDRESSES = re.compile(
    r"\[[^\]\n]*\]\([^)\n]*\)"
    r"|<[^<>\n]*(?:://|@)[^<>\n]*>"
    r"|https?://\S+|www\.\S+|\S+@\S+"
    r"|[\w-]+(?:\.[\w-]+)+/\S*"
    r"|(?<![\w/])/[\w.~%-]+(?:/[\w.~%-]*)*"
    r"|[\w-]+(?:/[\w.~%-]+)*/[\w~%-]+\.[A-Za-z0-9]{2,5}\b"
    r"|[\w-]+(?:/[\w.~%-]+){2,}"
    r"|[?&#][\w%.\[\]-]+=\S*"
)
_CAMEL_PART = re.compile(r"[A-Z][a-z0-9]*")
_SHOUTED_MIN = 4
_SENDER_HEADER = re.compile(r"^\s*(?:from|sender|reply-to):\s*(.+)$", re.IGNORECASE | re.MULTILINE)
_SENDER_DOMAIN = re.compile(r"@([\w.-]+)")
_SENDER_PREFIX_MIN = 3
_QUOTED = ("[quoted]", ">")
_ID_TAIL = re.compile(r"-\d")
_WORDS = re.compile(r"[^\W_]+")
_STATUSES = ("active", "proposed")
_OPEN = ("open", "sent")


def candidates(
    text: str, patterns: list[str], ignore: list[str], postal: list[str] | None = None
) -> list[tuple[str, str]]:
    """The terms in a text that match one of the patterns, each once (case ignored) in the order they first appear,
    with the line each was found on. Quoted lines, web and mail addresses, postal addresses (found by the patterns in
    `postal`, which may run over two lines), the first part of a record id, and the words in `ignore` are left out."""
    skipped = {word.lower() for word in ignore}
    found: list[tuple[int, int, str, str]] = []
    lines = text.splitlines()
    for number, (line, shown) in enumerate(zip(lines, addresses.blank(text, postal or []).splitlines(), strict=True)):
        if line.lstrip().startswith(_QUOTED):
            continue
        clean = _ADDRESSES.sub(lambda m: " " * len(m.group(0)), shown)
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


ORDINARY_GROUP = "ordinary_words"


@cache
def _shipped_groups() -> dict[str, frozenset[str]]:
    data = load_yaml(KNOWN_TERMS_FILE.read_text(encoding="utf-8")) or {}
    return {str(name): frozenset(str(w).lower() for w in words or []) for name, words in data.items()}


def shipped_known() -> frozenset[str]:
    """The core's well-known words, lowercased: every list in the shipped file but the everyday words, which stand
    alone only when shouted (`is_ordinary`)."""
    return frozenset().union(*(words for name, words in _shipped_groups().items() if name != ORDINARY_GROUP))


def ordinary_words() -> frozenset[str]:
    """The everyday English words in the shipped file, lowercased."""
    return _shipped_groups().get(ORDINARY_GROUP, frozenset())


def is_ordinary(word: str, ordinary: frozenset[str]) -> bool:
    """Whether a candidate is only everyday words: a word in capitals of four letters or more that is one of them, or
    a name joined from two or more words (a capital at each joint) that are all among them."""
    if word.isupper():
        return len(word) >= _SHOUTED_MIN and word.lower() in ordinary
    parts = _CAMEL_PART.findall(word)
    return len(parts) >= 2 and "".join(parts) == word and all(part.lower() in ordinary for part in parts)


def sender_words(text: str) -> set[str]:
    """The words of the sender a mail header names, lowercased: the display name word by word, and the domain's labels
    without its last one (`mail.example.com` gives `mail` and `example`), also split at hyphens. A word in the text
    that is the start of one of the domain's labels (`peco` of `pecoenergy`) counts too (`sender_owns`)."""
    words: set[str] = set()
    for header in _SENDER_HEADER.findall(text):
        words.update(w.lower() for w in _WORDS.findall(header.split("<", 1)[0]))
        for domain in _SENDER_DOMAIN.findall(header):
            for label in domain.lower().split(".")[:-1]:
                words.add(label)
                words.update(_WORDS.findall(label))
    return words


def sender_owns(term: str, sender: set[str]) -> bool:
    """Whether a term is the sender's own name: a word of the header, or the start of one of its words."""
    key = _key(term)
    return key in sender or (len(key) >= _SENDER_PREFIX_MIN and any(w.startswith(key) for w in sender))


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


def watched_source(view: Any, source: str | None) -> bool:
    """Whether an input was read by the app from a watched source (mail, a calendar), not typed or pasted."""
    found = view.get("source", source) if source else None
    return bool(found is not None and (found.data.get("watched") or {}))


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


def day_of(view: Any, cfg: Config, request_id: str | None) -> str:
    """The person's day an input's term questions are counted on: the day the input was handed in."""
    found = view.get("request", request_id) if request_id else None
    created = (found.data.get("created_at") if found is not None else None) or datetime.now(UTC).isoformat()
    return local_day(datetime.fromisoformat(str(created)), zone(cfg)).isoformat()


def resolves_for(term: str, source: str | None, request: str, day: str) -> dict[str, Any]:
    """What a term question records about itself (`term_of` reads it): the term, the input it came from and the
    person's day it was asked, which the per-input and per-day limits count."""
    return {"kind": TERM_QUESTION, "term": term, "source": source, "request": request, "day": day}


def room(store: Any, cfg: Config, source: str | None, day: str) -> int:
    """How many more term questions may be asked for an input on this day: the lesser of what is left of
    `dispatch.knowledge.new_terms_per_input` and `new_terms_per_day`. 0 when a limit is 0 or nobody is set as the
    person."""
    per_input = cfg.dispatch.knowledge.new_terms_per_input
    per_day = cfg.dispatch.knowledge.new_terms_per_day
    if per_input <= 0 or per_day <= 0 or People(store, cfg).pm is None:
        return 0
    asked = _term_questions(store.read())
    for_input = sum(1 for q in asked if source is not None and (q.data.get("resolves") or {}).get("source") == source)
    return max(0, min(per_input - for_input, per_day - _asked_on(asked, day)))


def unknown_words(store: Any, cfg: Config, text: str) -> list[tuple[str, str]]:
    """The words in an input's text the workspace doesn't know, each with the line it was found on, from any source:
    what looks like a term (acronyms and run-together product names, by the language settings) less everything the
    filters leave out (see the module's text) and every term already asked about, dropped ones included. These are
    candidates only: the assistant decides which, if any, to ask the person about."""
    view = store.read()
    known = known_names(view) | never_asked(cfg)
    before = raised_terms(view)
    ordinary = ordinary_words() if cfg.language.known_terms_shipped else frozenset()
    plain = as_text(text, keep_structured=False)  # a booking page kept as markup for its data is read as its words here
    sender = sender_words(plain)
    found = candidates(
        plain,
        language_words(cfg.language, "new_term_patterns"),
        language_words(cfg.language, "new_term_ignore"),
        addresses.address_patterns(cfg.language),
    )
    return [
        (word, line)
        for word, line in found
        if _key(word) not in known
        and _key(word) not in before
        and not is_ordinary(word, ordinary)
        and not sender_owns(word, sender)
    ]


def packet_section(store: Any, cfg: Config, request: dict[str, Any], text: str) -> str:
    """The block a notes run's request carries when the input holds words the workspace doesn't know: the words (at
    most a few times as many as may be asked) and how many the assistant may ask about. Empty when there are none, or
    when a limit leaves no room. The words are data; what to ask about is the prompt's."""
    created = request.get("created_at")
    day = local_day(datetime.fromisoformat(created), zone(cfg)).isoformat() if created else ""
    left = room(store, cfg, request.get("source"), day)
    if left <= 0:
        return ""
    words = [w for w, _ in unknown_words(store, cfg, text)][: left * CANDIDATE_FACTOR]
    if not words:
        return ""
    return f'<{BLOCK} ask_at_most="{left}">\n{", ".join(words)}\n</{BLOCK}>'


def _where(view: Any, cfg: Config, people: Any, source: str | None, text: str) -> tuple[str, dict[str, str]]:
    """Where an input came from, as the wording-sheet key of its line and the values that line takes: mail from a
    sender, a calendar entry, an attached file, another watched source by its label, or the person's own notes."""
    found = leading_headers(text)
    if found is not None and found[0].get("from"):
        name = sender_name(found[0]["from"], people)
        return ("mail" if name else "mail_unknown"), {"sender": name}
    first = next((line.strip() for line in text.splitlines() if line.strip()), "")
    if first.startswith("Attached file:"):
        return "file", {}
    record = view.get("source", source) if source else None
    watched = (record.data.get("watched") or {}) if record is not None else {}
    if not watched:
        return "notes", {}
    if first.startswith("Event:"):
        return "calendar", {}
    label = next((s.label for s in cfg.watch.sources if s.id == watched.get("source")), "")
    return ("source", {"source": label}) if label else ("notes", {})


def question_text(store: Any, cfg: Config, source: str | None, text: str, term: str) -> str:
    """What a term question says about where the word came up, in the wording sheet's words: the input's kind and the
    first line the word is on."""
    people = People(store, cfg)
    key, values = _where(store.read(), cfg, people, source, text)
    pattern = re.compile(rf"(?<![^\W_]){re.escape(term)}(?![^\W_])", re.IGNORECASE)
    lines = (ln.strip() for ln in text.splitlines() if not ln.lstrip().startswith(_QUOTED))
    line = next((ln for ln in lines if pattern.search(ln)), "")
    return word(cfg, f"terms.came_up_in.{key}").format(line=line[:QUOTE_MAX], **values)


def limit_questions(changeset: Any, store: Any, cfg: Config, inputs: Any) -> Any:
    """The changeset with its term questions held to what the scan listed: a question that names a word the request
    didn't list (or one already asked, or the same word twice) is left out, and so is every one past the limits. Each
    kept one is written the same way, to the person, with the standard title and where the word came up. Other ops are
    untouched, and a changeset with no term question is returned as it was."""
    ours = [i for i, op in enumerate(changeset.ops) if getattr(op, "op", "") == "question.add" and op.term]
    if not ours:
        return changeset
    person = People(store, cfg).pm
    text = f"{inputs.raw_input}\n{inputs.note}"
    listed = {_key(w): w for w, _ in unknown_words(store, cfg, text)}
    left = room(store, cfg, inputs.source, day_of(store.read(), cfg, inputs.request)) if person is not None else 0
    out: list[Any] = []
    seen: set[str] = set()
    for i, op in enumerate(changeset.ops):
        if i not in ours:
            out.append(op)
            continue
        key = _key(op.term)
        if left <= 0 or key not in listed or key in seen:
            continue
        seen.add(key)
        left -= 1
        shown = listed[key]
        out.append(
            op.model_copy(
                update={
                    "to": person,
                    "term": shown,
                    "title": TITLE.format(term=shown),
                    "text": question_text(store, cfg, inputs.source, text, shown),
                    "links": [],
                    "kind": "question",
                    "matters_for": None,
                    "asks_about": "other",
                }
            )
        )
    return changeset.model_copy(update={"ops": out})


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

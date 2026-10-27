"""The words of a note kept from a mail (design 6.32, "Note titles and facts"): the core titles it by the message's
subject and sender ("Thanks · from Pat Marsh"), never by the message's own header lines. A subject has its "Re:" and
"Fwd:" chains taken off; a message with no subject is titled by the first words of its body. Only a note whose words
repeat the message's header lines (what a reading step that copied the input gives) is re-titled; a note the assistant
wrote in its own words is left as written. Pure functions over the input's text; the wording is the sheet's
(`note.title_from`)."""

from __future__ import annotations

import re
from email.utils import parseaddr
from typing import Any

from engine.reply_lines import leading_headers
from engine.sides import word
from engine.titles import TOPIC_WORDS, _clean_subject, _who

#: The line a watcher puts before an item's text: "New in {where}: {title}" or "Changed in {where}: {title}".
_WRAPPER = re.compile(r"^(?:New|Changed) in [^:\n]*:\s*(?P<title>.*)$")
#: A header name followed by a value, as a message's own header lines read in running text.
_HEADER_WORDS = re.compile(r"\b(?:From|To|Cc|Date|Received|Subject):\s*\S")


def repeats_headers(text: str) -> bool:
    """Whether a note's words are the message's own header lines (or its watcher line), not anything said about it."""
    return bool(_WRAPPER.match(text.lstrip()) or _HEADER_WORDS.search(text))


def _subject_of(raw_input: str, headers: dict[str, str]) -> str:
    first = raw_input.lstrip("\n").splitlines()[0] if raw_input.strip() else ""
    wrapped = _WRAPPER.match(first)
    return _clean_subject(headers.get("subject") or (wrapped.group("title") if wrapped else ""))


def _first_words(body: str) -> str:
    """The first words of a message's body: its first line whole when short, else its first words and an ellipsis."""
    for line in body.splitlines():
        words = line.split()
        if words:
            return " ".join(words) if len(words) <= TOPIC_WORDS else " ".join(words[:TOPIC_WORDS]).rstrip(",;:") + "…"
    return ""


def _sender_name(sender: str, people: Any) -> str:
    person, shown = _who(sender, people)
    if person:
        return str(people.name(person))
    if shown and "@" not in shown:
        return shown
    address = parseaddr(sender)[1]
    return " ".join(w.capitalize() for w in re.split(r"[._+-]+", address.split("@", 1)[0]) if w)


def title_of(cfg: Any, people: Any, raw_input: str | None) -> str | None:
    """The title a mail's note gets: its subject and its sender; none when the input isn't a message (no From line)."""
    found = leading_headers(raw_input or "")
    if found is None or not found[0].get("from"):
        return None
    headers, body = found
    subject = _subject_of(raw_input or "", headers) or _first_words(body)
    sender = _sender_name(headers["from"], people)
    if not subject:
        return None
    key = "note.title_from" if sender else "note.title_from_unknown"
    return word(cfg, key).format(subject=subject, sender=sender)


def note_text(text: str, cfg: Any, people: Any, raw_input: str | None) -> str:
    """The words a note is kept with: its subject and sender when the text only repeats the message's header lines."""
    if not repeats_headers(text):
        return text
    return title_of(cfg, people, raw_input) or text


#: The parts of a message's header lines as they read once a note's words were run together on one line.
_FLAT_FROM = re.compile(r"\bFrom:\s*(?P<sender>.+?)(?=\s+(?:To|Cc|Date|Received|Subject):|\s*$)")
_FLAT_SUBJECT = re.compile(r"^(?:New|Changed) in [^:\n]*:\s*(?P<subject>.*?)\s+From:\s")


def _headers_from_words(text: str) -> str | None:
    """The message a note's own words repeat, rebuilt as header lines, when the message itself wasn't kept."""
    sender = _FLAT_FROM.search(text)
    subject = _FLAT_SUBJECT.match(" ".join(text.split()))
    if sender is None or subject is None:
        return None
    return f"From: {sender.group('sender')}\nSubject: {subject.group('subject')}\n\n"


def _retitled(text: str, cfg: Any, people: Any, raw: str | None) -> str:
    fresh = note_text(text, cfg, people, raw)
    if fresh == text and repeats_headers(text):
        fresh = note_text(text, cfg, people, _headers_from_words(text))
    return fresh


def retitle_stored(ws: Any, store: Any, cfg: Any) -> int:
    """Give each note stored before the title rule the title the rule gives now, once: its message's subject and
    sender, taken from the saved message, or from the header lines its own words repeat when the message wasn't kept.
    A note in the assistant's own words is left as written, so a second run finds nothing to change. Stored changes
    are never rewritten: What changed shows a note as its record stands. Returns how many notes were re-titled."""
    from engine.intake import source_text
    from engine.names import People
    from engine.storage import WriteContext

    view = store.read()
    people = People(store, cfg)
    raws: dict[str | None, str] = {}

    def raw_of(source: str | None) -> str:
        if source not in raws:
            raws[source] = source_text(ws, store, source)
        return raws[source]

    notes = []
    for note in view.list("note"):
        text = note.data["text"]
        if repeats_headers(text):
            fresh = _retitled(text, cfg, people, raw_of(note.data.get("source")))
            if fresh != text:
                notes.append((note, fresh))
    if not notes:
        return 0
    write = WriteContext(actor="engine", trust="trusted", op="migrate.note_titles")
    with store.transaction() as tx:
        for note, fresh in notes:
            tx.update("note", note.id, {"text": fresh}, write, read_version=note.version)
    return len(notes)

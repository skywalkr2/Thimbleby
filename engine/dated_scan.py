"""Dates in documents found by rules alone (design 6.32, "What arrives").

When the assistant's own reading of an input misses a deadline, a renewal or an expiry, this pass over the input's new
text finds it from plain words: a sentence with exactly one full calendar date (its year included) and words from the
language lists for one kind of day (`dated_deadline_words`, `dated_renewal_words`, `dated_expiry_words`), and none of
the doubt words (`dated_doubt_words`). Nothing is worked out from words that are not a full date, a day already past
is left alone, and what the answer already records for that day is not offered again.

What is found is a dated `fact` whose evidence is the sentence. Its words are not the person's own, so the op carries
the group `GROUP` and waits for the person's yes; the applier holds it. No AI runs and nothing is written here."""

from __future__ import annotations

import re
from datetime import date
from typing import Any

from engine.document_dates import dates_with_places
from engine.language_words import language_words
from engine.ops import EvidenceIn, FactOp

#: The group of an op this pass makes, which the applier holds for the person's yes.
GROUP = "dates-found"
#: The kinds this pass can find, with the language list that names each.
LISTS = (("deadline", "dated_deadline_words"), ("renewal", "dated_renewal_words"), ("expiry", "dated_expiry_words"))
#: A sentence longer than this is not offered: its words would not read as one fact.
MOST_CHARS = 300

_CLAUSE = re.compile(r"[^;\n]+")
_SENTENCE = re.compile(r".+?(?:[!?](?=\s|$)|\.(?=\s+[A-Z])|$)")


def _pattern(words: list[str]) -> re.Pattern[str] | None:
    found = [w.strip() for w in words if w.strip()]
    if not found:
        return None
    alternatives = "|".join(re.escape(w) for w in sorted(found, key=len, reverse=True))
    return re.compile(rf"(?<![\w'-])(?:{alternatives})(?![\w'-])", re.IGNORECASE)


def sentences(text: str) -> list[str]:
    """The sentences of a text, each inside one line and one clause."""
    found = []
    for clause in _CLAUSE.finditer(text):
        for sentence in _SENTENCE.finditer(clause.group(0)):
            words = " ".join(sentence.group(0).split())
            if words:
                found.append(words)
    return found


def read(cfg: Any, text: str, today: date) -> list[tuple[str, date, str]]:
    """The kind, the day and the sentence of each date the words of `text` give by rules, in the order the text gives
    them: today or later, one date and one kind of day in the sentence, no doubt word beside it."""
    from engine.dated_facts import locale_of

    locale = locale_of(cfg)
    if locale is None or not text.strip():
        return []
    language = cfg.language
    kinds = [(kind, _pattern(language_words(language, name))) for kind, name in LISTS]
    doubt = _pattern(language_words(language, "dated_doubt_words"))
    found: list[tuple[str, date, str]] = []
    for sentence in sentences(text):
        if len(sentence) > MOST_CHARS:
            continue
        marks = {kind for kind, pattern in kinds if pattern is not None and pattern.search(sentence)}
        dates = dates_with_places(sentence, locale)
        if len(marks) != 1 or len(dates) != 1:
            continue
        day, start, end = dates[0]
        if day < today:
            continue
        # The doubt words are looked for in the sentence with its date taken out, so a month's name never counts.
        if doubt is not None and doubt.search(sentence[:start] + " " + sentence[end:]):
            continue
        found.append((next(iter(marks)), day, sentence))
    return found


def _covered(ops: list[Any], view: Any, source: str | None, kind: str, day: date, sentence: str) -> bool:
    """Whether the answer or the records already hold this day: a fact of the answer for that day, or a fact made from
    this input for that day and kind."""
    for op in ops:
        if isinstance(op, FactOp) and op.on == day:
            return True
        if isinstance(op, FactOp) and " ".join(op.evidence.quote.split()) == sentence:
            return True
    for fact in view.list("fact"):
        data = fact.data
        if data.get("source") == source and str(data.get("on")) == day.isoformat() and data.get("on_kind") == kind:
            return True
    return False


def proposals(cfg: Any, view: Any, text: str, source: str | None, ops: list[Any], today: date) -> list[FactOp]:
    """The dated facts to add to an answer for the dates its input gives that the answer lacks, at most
    `steward.dates.find_most`; each waits for the person's yes."""
    rules = cfg.steward.dates
    if not rules.find_by_rules:
        return []
    made: list[FactOp] = []
    for kind, day, sentence in read(cfg, text, today):
        if len(made) >= rules.find_most:
            break
        if _covered([*ops, *made], view, source, kind, day, sentence):
            continue
        made.append(
            FactOp(
                op="fact",
                text=sentence,
                evidence=EvidenceIn(quote=sentence),
                on=day,
                on_kind=kind,
                group=GROUP,
            )
        )
    return made

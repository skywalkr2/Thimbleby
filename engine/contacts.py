"""A person's contact details: each kind (email, phone, ...) holds any number of values (design 5.1).

A record written before a kind could hold several keeps one text for it; every reader here accepts both shapes, a text
being a list of one, and `restate_stored` rewrites the old shape once when a workspace opens. The first value of a kind
is the one used when a single one is needed (an address to send to, the person's own address); every value is matched
when an address is looked up.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any

from engine.storage import WriteContext


def _squash(value: Any) -> str:
    return " ".join(str(value).split())


def values_of(held: Any) -> list[str]:
    """What one kind holds as a list of distinct, non-blank texts in the order written, whether it is stored as one
    text (older records), as a list, or empty. Two values that differ only in case or spacing are one."""
    items: Iterable[Any] = [held] if isinstance(held, str) else held if isinstance(held, (list, tuple)) else []
    seen: set[str] = set()
    found: list[str] = []
    for item in items:
        text = _squash(item)
        if text and text.casefold() not in seen:
            seen.add(text.casefold())
            found.append(text)
    return found


def reach_lists(reach: Any) -> dict[str, list[str]]:
    """A person's `how_to_reach` as each kind mapped to its list of values; a kind left with none is left out."""
    if not isinstance(reach, Mapping):
        return {}
    kept = {str(kind): values_of(held) for kind, held in reach.items()}
    return {kind: values for kind, values in kept.items() if values}


def all_values(reach: Any) -> list[str]:
    """Every value of every kind, in the order written."""
    return [value for values in reach_lists(reach).values() for value in values]


def first_value(reach: Any, kind: str) -> str:
    """The first value of a kind, or an empty text when the person has none of it."""
    values = reach_lists(reach).get(kind)
    return values[0] if values else ""


def has_value(reach: Any, kind: str, value: str) -> bool:
    """Whether the kind holds the value (compared ignoring case and spacing)."""
    return _squash(value).casefold() in {v.casefold() for v in reach_lists(reach).get(kind, [])}


def with_value(reach: Any, kind: str, value: str) -> dict[str, list[str]]:
    """The details with the value added to the kind, after the ones it holds; unchanged when it is already there."""
    kept = reach_lists(reach)
    kept[kind] = values_of([*kept.get(kind, []), value])
    return kept


def without_value(reach: Any, kind: str, value: str) -> dict[str, list[str]]:
    """The details with the value taken out of the kind; a kind left with none is left out."""
    kept = reach_lists(reach)
    wanted = _squash(value).casefold()
    left = [v for v in kept.get(kind, []) if v.casefold() != wanted]
    if left:
        kept[kind] = left
    else:
        kept.pop(kind, None)
    return kept


def restate_stored(store: Any) -> int:
    """Rewrite every person who still holds one text for a kind as a list, once; later starts find none. Returns how
    many records changed."""
    todo = [
        p
        for p in store.read().list("person")
        if isinstance(p.data.get("how_to_reach"), dict)
        and any(not isinstance(held, list) for held in p.data["how_to_reach"].values())
    ]
    if not todo:
        return 0
    write = WriteContext(actor="engine", trust="trusted", op="migrate.contact_lists")
    with store.transaction() as tx:
        for person in todo:
            tx.update(
                "person",
                person.id,
                {"how_to_reach": reach_lists(person.data["how_to_reach"])},
                write,
                read_version=person.version,
            )
    return len(todo)

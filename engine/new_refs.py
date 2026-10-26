"""A record made earlier in the same change (design 6.7): `$new:<n>` in an op's fields names the record op `n` of the
same answer or proposal created (the first op is 0), and the applier puts that record's id there when it reaches the op.

The op must come after the one it names, and that op must have been applied and have made a record. One that was
refused, is waiting for the person, was dropped from the review or made nothing refuses the op that names it, with the
reason and the position of the op it depended on. Only a whole value that is exactly `$new:<n>` is replaced, never
words that happen to contain it.
"""

from __future__ import annotations

import re
from typing import Any

from engine.storage import StoreError

PREFIX = "$new:"
#: `$new:3`, or `$new:dropped:3` for a reference to an op the person left out of a review.
_REF = re.compile(r"\$new:(dropped:)?(\d+)")


def mentions(op: Any) -> bool:
    """Whether an op (a model) has a `$new:` value anywhere in its fields."""
    return PREFIX in op.model_dump_json()


def referenced(value: Any) -> list[tuple[int, bool]]:
    """Every `$new:` value in a structure, as (n, dropped), in order."""
    found: list[tuple[int, bool]] = []
    if isinstance(value, str):
        match = _REF.fullmatch(value)
        if match:
            found.append((int(match.group(2)), bool(match.group(1))))
    elif isinstance(value, dict):
        for item in value.values():
            found += referenced(item)
    elif isinstance(value, (list, tuple)):
        for item in value:
            found += referenced(item)
    return found


def replaced(value: Any, change: Any) -> Any:
    """The structure with each `$new:` value replaced by `change(n, dropped)`."""
    if isinstance(value, str):
        match = _REF.fullmatch(value)
        return change(int(match.group(2)), bool(match.group(1))) if match else value
    if isinstance(value, dict):
        return {k: replaced(v, change) for k, v in value.items()}
    if isinstance(value, list):
        return [replaced(v, change) for v in value]
    return value


def created_in(pending: list[tuple]) -> tuple[str, str] | None:
    """The (kind, id) of the first record a step created, from the ledger rows it wrote (kind, id, version, ...)."""
    return next(((row[0], row[1]) for row in pending if row[2] == 1), None)


class WithMade:
    """A read view that also finds the records an earlier op of the change made and a later op names with `$new:<n>`.
    In the dry run those exist only inside a transaction that is rolled back, so the checks that read the saved records
    (does this project exist?) would otherwise say they don't. Only `get` sees them, and only those a placeholder named:
    lists and searches (the near-duplicate checks) never see what the change itself made."""

    def __init__(self, base: Any, made: dict[tuple[str, str], Any]):
        self._base = base
        self._made = made

    def get(self, kind: str, record_id: str, *args: Any, **kwargs: Any) -> Any:
        found = self._base.get(kind, record_id, *args, **kwargs)
        return found if found is not None else self._made.get((kind, record_id))

    def __getattr__(self, name: str) -> Any:
        return getattr(self._base, name)


class NewRefs:
    """What the ops of one change have made so far, to resolve the `$new:<n>` values of the ops after them."""

    def __init__(self) -> None:
        self.ids: dict[int, str] = {}
        self.stopped: dict[int, str] = {}
        self.names: dict[int, str] = {}
        self.records: dict[tuple[str, str], Any] = {}  # in a dry run: what each made record looked like when made
        self.used: set[tuple[str, str]] = set()  # the records a placeholder was replaced by

    def made(self, n: int, name: str, created: tuple[str, str] | None, tx: Any = None) -> None:
        """Op `n` (called `name`) was applied; `created` is the (kind, id) of the record it created, if it created one.
        In a dry run, `tx` is the transaction to snapshot the record from."""
        self.names[n] = name
        if created is not None:
            self.ids[n] = created[1]
            if tx is not None:
                self.records[created] = tx.get(*created)
        else:
            self.stopped[n] = "made no record to refer to"

    def failed(self, n: int, name: str, why: str) -> None:
        """Op `n` was not applied: `why` is how to say so after "which" ("was refused: ...", "is waiting for you")."""
        self.names[n] = name
        self.stopped[n] = why

    def seen(self) -> dict[tuple[str, str], Any]:
        """The records a placeholder named, as the dry run saw them (for `WithMade`)."""
        return {key: record for key, record in self.records.items() if key in self.used}

    def resolve(self, op: Any, index: int, store: Any) -> Any:
        """The op with every `$new:` value replaced by the id it names; the op itself when it has none. Raises
        StoreError, saying why, when one names an op that doesn't come before it or didn't make a record."""
        if not mentions(op):
            return op
        data = op.model_dump(mode="json", exclude_none=True)
        for n, dropped in referenced(data):
            if dropped:
                raise StoreError(f"depends on change {n} of the review, which was left out")
            if n >= index:
                raise StoreError(f"{PREFIX}{n} names a change that doesn't come before it (the first change is 0)")
            if n not in self.ids:
                why = self.stopped.get(n, "made no record to refer to")
                raise StoreError(f"depends on change {n} ({self.names.get(n, '?')}), which {why}")
        from engine.ops import CHANGESET

        named = {self.ids[n] for n, _ in referenced(data)}
        self.used.update(key for key in self.records if key[1] in named)
        data = replaced(data, lambda n, dropped: self.ids[n])
        return CHANGESET.validate_python({"ops": [data]}, context={"op_models": store.plugins.ops}).ops[0]

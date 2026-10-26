"""Reviewing an assistant's answer by group, and releasing its held ops together (design 6.7).

A task kind may label the ops of its answer (`task_kind(groups=fn)`): the applier keeps each op's label on its outcome
(`answer_group`), and the review shows one row for each label with Keep and Drop for all of its ops.

- **Drop** takes the group out. Its applied ops are undone (the same Undo as the rest of the answer, which records a
  correction signal for what the assistant wrote), and its held ops are kept as they were (declined, one signal each).
  An op the undo can't take back without overwriting a later change is left and reported.
- **Keep** releases the group's held ops as the person's own go. Applied ops already stand.
- **Release all** does the same for every held op of the answer. An op that waits on a choice only the person can make
  there (who someone is, or the end of a project, which has its own question) is left and reported.

Nothing here applies anything new: a held op is applied by the same release as the single button, so Undo of the whole
answer still takes everything back in one step.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.storage import Store, StoreError


@dataclass
class GroupSummary:
    """One group of an answer: its position (`id`), `label`, the indexes of its ops and how many are in each state."""

    id: int
    label: str
    ops: list[int] = field(default_factory=list)
    applied: int = 0
    held: int = 0
    refused: int = 0
    undone: int = 0


@dataclass
class GroupResult:
    """What a Keep, a Drop or a Release all did: the ops `released`, `restored` (undone) and `declined`, and the ops
    that were left, each with the `ops` it covers and a plain `reason`."""

    released: list[int] = field(default_factory=list)
    restored: list[int] = field(default_factory=list)
    declined: list[int] = field(default_factory=list)
    skipped: list[dict[str, Any]] = field(default_factory=list)


def groups_of(outcomes: list[dict[str, Any]]) -> list[GroupSummary]:
    """The groups of a changeset's ops, in the order each label first appears; ops with no label are in none."""
    found: dict[str, GroupSummary] = {}
    for outcome in outcomes:
        label = outcome.get("answer_group")
        if not label:
            continue
        group = found.setdefault(label, GroupSummary(len(found), label))
        group.ops.append(outcome["index"])
        status = outcome["status"]
        if status in ("applied", "held", "refused", "undone"):
            setattr(group, status, getattr(group, status) + 1)
    return list(found.values())


def _group(store: Store, changeset_id: str, group_id: int) -> tuple[GroupSummary, list[dict[str, Any]]]:
    cs = store.read().get("changeset", changeset_id)
    if cs is None:
        raise StoreError(f"there is no changeset {changeset_id}")
    outcomes = cs.data["ops"]
    found = [g for g in groups_of(outcomes) if g.id == group_id]
    if not found:
        raise StoreError("that group isn't in this answer")
    return found[0], outcomes


def drop(store: Store, changeset_id: str, group_id: int) -> GroupResult:
    """Take a group out of an answer: undo its applied ops and decline its held ones."""
    from engine.applier import decline_held_many
    from engine.dispatcher import undo_changeset

    group, outcomes = _group(store, changeset_id, group_id)
    applied = [i for i in group.ops if outcomes[i]["status"] == "applied"]
    held = [i for i in group.ops if outcomes[i]["status"] == "held"]
    result = GroupResult()
    if applied:
        report = undo_changeset(store, changeset_id, applied)
        result.restored = sorted(report.restored)
        result.skipped = list(report.skipped)
    if held:
        decline_held_many(store, changeset_id, held)
        result.declined = held
    return result


def keep(store: Store, cfg: Any, changeset_id: str, group_id: int, *, ws: Any = None) -> GroupResult:
    """Keep a group: release its held ops (those that don't wait on a choice of the person's own)."""
    group, _ = _group(store, changeset_id, group_id)
    return _release(store, cfg, changeset_id, group.ops, ws)


def release_all(store: Store, cfg: Any, changeset_id: str, *, ws: Any = None) -> GroupResult:
    """Release every held op of an answer that can be released without a choice of the person's own."""
    cs = store.read().get("changeset", changeset_id)
    if cs is None:
        raise StoreError(f"there is no changeset {changeset_id}")
    return _release(store, cfg, changeset_id, [o["index"] for o in cs.data["ops"]], ws)


def _release(store: Store, cfg: Any, changeset_id: str, indexes: list[int], ws: Any) -> GroupResult:
    from engine.applier import release
    from engine.endings import held_endings
    from engine.next_steps import add_project as add_held_project

    cs = store.read().get("changeset", changeset_id)
    outcomes = cs.data["ops"]
    endings = {e.index for e in held_endings(store.read(), changeset_id, outcomes)}
    result = GroupResult()
    for index in indexes:
        outcome = outcomes[index]
        if outcome["status"] != "held":
            continue
        if outcome.get("question"):
            result.skipped.append({"ops": [index], "reason": "waits for you to say who this is"})
            continue
        if index in endings:
            result.skipped.append({"ops": [index], "reason": "ends a project, which asks about what is open on it"})
            continue
        # An earlier release may have applied this one too (several ops waiting on the same question).
        fresh = store.read().get("changeset", changeset_id).data["ops"][index]
        if fresh["status"] != "held":
            continue
        try:
            if outcome["op"].get("op") == "project.add":
                add_held_project(store, cfg, changeset_id, index, ws=ws)
            else:
                release(store, cfg, changeset_id, index, ws=ws)
        except StoreError as err:
            result.skipped.append({"ops": [index], "reason": str(err)})
            continue
        result.released.append(index)
    return result

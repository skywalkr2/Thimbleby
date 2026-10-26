"""A failing step never leaves a change half applied (design 6.7, lesson 3 of the running notes).

Any failure in a step, an exit included, rolls the whole change back, records it as rejected with why, and sends the
work back to the assistant; removing again what an earlier step of the same change removed is skipped, not an error.
Names and ids come from the fixtures.
"""

from __future__ import annotations

import json

import pytest

from engine import applier
from engine.ai.adapters.stub import set_responder
from engine.ai.router import Router
from engine.applier import REPEATED_REMOVAL, STEP_FAILED, ChangeFailed, apply_as_person
from engine.dispatcher import process
from engine.intake import hand_in
from tests.test_corrections import pm_of
from tests.test_hold_drop_fold import NOW, an_action, data, env  # noqa: F401  (env is the shared fixture)


def drop(action_id: str) -> dict:
    return {"op": "action.drop", "id": action_id, "reason": "Not needed"}


def outcomes(store, cs_id: str) -> list[dict]:
    return store.read().get("changeset", cs_id).data["ops"]


def test_a_change_that_removes_the_same_item_twice_applies_cleanly(env):  # noqa: F811
    _, cfg, store = env
    target = an_action(cfg, mine=True)
    cs_id = apply_as_person(store, cfg, [drop(target), drop(target)], "Drop")
    first, second = outcomes(store, cs_id)
    assert (first["status"], second["status"]) == ("applied", "applied")
    assert second["reason"] == REPEATED_REMOVAL and not second.get("records")
    assert data(store, "action", target)["status"] == "dropped"


def test_a_step_that_exits_leaves_the_data_as_it_was_and_records_why(env, monkeypatch):  # noqa: F811
    _, cfg, store = env
    first, second = an_action(cfg, mine=True), an_action(cfg, mine=False)
    real = applier._apply_op

    def exits_on_the_second(tx, op, ctx, wctx, today):
        if getattr(op, "id", None) == second:
            raise SystemExit(1)
        return real(tx, op, ctx, wctx, today)

    monkeypatch.setattr(applier, "_apply_op", exits_on_the_second)
    with pytest.raises(ChangeFailed) as failed:
        apply_as_person(store, cfg, [drop(first), drop(second)], "Drop")
    assert data(store, "action", first)["status"] == "open", "the step before the exit is rolled back too"
    assert data(store, "action", second)["status"] == "open"
    recorded = store.read().get("changeset", failed.value.changeset).data
    assert recorded["status"] == "rejected"
    assert all(o["status"] == "refused" and o["reason"].startswith(STEP_FAILED) for o in recorded["ops"])


def test_the_assistants_change_with_a_failing_step_goes_back_to_it_to_be_done_again(env, monkeypatch):  # noqa: F811
    ws, cfg, store = env
    add = {
        "op": "action.add",
        "text": "Tell the shop when the proofs ship",
        "owners": [pm_of(cfg)],
        "evidence": {"quote": "Notes for the item."},
    }
    before = len(store.read().list("action"))

    def exits(*_args, **_kwargs):
        raise SystemExit(1)

    monkeypatch.setattr(applier, "_apply_op", exits)
    set_responder(lambda task: json.dumps({"summary": "Filed.", "ops": [add]}))
    handed = hand_in(ws, store, pasted="Notes for the item.", now=NOW)
    process(ws, store, cfg, Router(cfg, store, env={}), handed.request, now=NOW)
    request = data(store, "request", handed.request)
    assert request["state"] == "queued" and request["retries"] == 1
    assert STEP_FAILED in request["waiting"]
    assert len(store.read().list("action")) == before, "nothing of the change was kept"

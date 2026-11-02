"""`action.tie` (design 6.2, 6.32; P110 J8 follow-up): the assistant ties an open to-do to the calendar entry it is due
at, when the words or the proposal in its packet show it. A data op that needs the quoted words, with Undo, that does
what the person's Tie it does: the to-do is due at the entry, on its day, and no proposal is left. Names and ids come
from the fixtures; the AI is the stub."""

from __future__ import annotations

import pytest

from engine import entry_ties
from engine.ai.adapters.stub import set_responder
from engine.applier import Context, Inputs, apply_changeset, check
from engine.dispatcher import undo_changeset
from engine.names import People
from engine.ops import CHANGESET, OP_MODELS, TIERS
from engine.packet import _open_actions
from engine.storage import Store, WriteContext
from engine.tasks import TASKS
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records
from tests.test_knowledge_records import request as make_request

_PM = WriteContext("pm", "trusted", "test")
OWNER = fixture_records(DEMO_B, "person")[0]["id"]
PROJECT = fixture_records(DEMO_B, "project")[0]["id"]
QUOTE = "the contract is due at the print sync"
RAW = f"Reminder: {QUOTE}, so bring it signed."


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()
    set_responder(None)


def entry(store, title="Print sync", start="2026-11-16T14:00:00+00:00", **more) -> str:
    fields = {"title": title, "start": start, "end": None, "project": PROJECT, "trust": "trusted"}
    with store.transaction() as tx:
        return tx.create("event", {**fields, **more}, _PM).id


def todo(store, text="Return the signed contract", **more) -> str:
    fields = {"text": text, "owners": [{"person": OWNER}], "due": "2026-11-13", "status": "open"}
    with store.transaction() as tx:
        return tx.create("action", {**fields, **more}, _PM).id


def tie_op(action, event, **more) -> dict:
    return {"op": "action.tie", "id": action, "event": event, "evidence": {"quote": QUOTE}, **more}


def context(env, raw=RAW):
    _, cfg, store = env
    return Context(
        store,
        cfg,
        People(store, cfg),
        tuple(store.plugins.ops),
        Inputs(make_request(store, "input", task="notes"), None, "", raw, "untrusted"),
    )


def apply(env, ops) -> tuple[str, list[str]]:
    _, _, store = env
    cs = CHANGESET.validate_python({"ops": ops}, context={"op_models": store.plugins.ops})
    cs_id = apply_changeset(cs, [], context(env), run=None)
    return cs_id, [o["status"] for o in store.read().get("changeset", cs_id).data["ops"]]


def refusals(env, op) -> list[str]:
    _, _, store = env
    cs = CHANGESET.validate_python({"ops": [op]}, context={"op_models": store.plugins.ops})
    return [p.message for p in check(cs, context(env)) if p.severity == "refuse"]


def test_action_tie_is_a_data_op_that_needs_evidence_and_notes_offers_it():
    assert TIERS["action.tie"] == "data"
    assert OP_MODELS["action.tie"].model_fields["event"].is_required()
    assert "action.tie" in TASKS["notes"].ops


def test_the_assistant_ties_a_to_do_to_an_entry_and_it_does_what_the_persons_tie_does_with_undo(env):
    _, _, store = env
    found = entry(store)
    mine = todo(store, proposed_event=found)
    cs_id, statuses = apply(env, [tie_op(mine, found)])
    assert statuses == ["applied"]
    tied = store.read().get("action", mine).data
    assert (tied["due_event"], tied["due"], tied["due_check"], tied["proposed_event"]) == (
        found,
        "2026-11-16",
        False,
        None,
    )
    assert entry_ties.tied_fields(store.read().get("event", found)) == {
        "due_event": found,
        "due": "2026-11-16",
        "due_check": False,
        "proposed_event": None,
    }
    ledger = [r for r in store.read().changes_of(cs_id) if r["kind"] == "action"]
    assert {r["field"] for r in ledger} >= {"due_event", "due"} and all(r["evidence"]["quote"] == QUOTE for r in ledger)
    assert undo_changeset(store, cs_id).restored == [0]
    back = store.read().get("action", mine).data
    assert (back["due_event"], back["due"], back["proposed_event"]) == (None, "2026-11-13", found)


def test_a_tied_to_do_then_moves_with_its_entry(env):
    _, _, store = env
    found = entry(store)
    mine = todo(store)
    apply(env, [tie_op(mine, found)])
    with store.transaction() as tx:
        current = tx.get("event", found)
        tx.update("event", found, {"start": "2026-11-18T14:00:00+00:00"}, _PM, read_version=current.version)
        from engine.applier import follow_event

        follow_event(tx, found, _PM)
    assert store.read().get("action", mine).data["due"] == "2026-11-18"


@pytest.mark.parametrize("status", ["done", "dropped"])
def test_a_to_do_that_isnt_open_is_refused(env, status):
    _, _, store = env
    found = entry(store)
    closed = todo(store, status=status)
    [why] = refusals(env, tie_op(closed, found))
    assert closed in why and status in why
    assert store.read().get("action", closed).data["due_event"] is None


def test_a_missing_or_called_off_entry_and_a_missing_to_do_are_refused(env):
    _, _, store = env
    mine = todo(store)
    gone = entry(store, title="Called off sync", cancelled=True)
    [why] = refusals(env, tie_op(mine, gone))
    assert gone in why and "called off" in why
    [why] = refusals(env, tie_op(mine, "EVT-999"))
    assert "EVT-999" in why
    [why] = refusals(env, tie_op("ACT-999", gone))
    assert "ACT-999" in why
    assert store.read().get("action", mine).data["due_event"] is None


def test_a_to_do_tied_to_the_entry_already_is_refused_and_evidence_is_required(env):
    _, _, store = env
    found = entry(store)
    mine = todo(store, due_event=found)
    [why] = refusals(env, tie_op(mine, found))
    assert "already" in why
    other = todo(store)
    cs = CHANGESET.validate_python(
        {"ops": [{"op": "action.tie", "id": other, "event": found}]}, context={"op_models": store.plugins.ops}
    )
    assert [p.check for p in check(cs, context(env)) if p.severity == "refuse"] == ["evidence"]


def test_words_not_in_the_input_are_refused(env):
    _, _, store = env
    found = entry(store)
    mine = todo(store)
    op = tie_op(mine, found)
    op["evidence"] = {"quote": "the contract is due at the board meeting"}
    assert refusals(env, op)
    assert store.read().get("action", mine).data["due_event"] is None


def test_the_packet_shows_the_assistant_the_proposal_so_it_can_confirm_it(env):
    _, cfg, store = env
    found = entry(store)
    proposed = todo(store, due="2026-11-16", proposed_event=found)
    plain = todo(store, text="Order the bookmarks")
    lines = {line.split()[1]: line for line in _open_actions(store, People(store, cfg)).splitlines()}
    assert f"may be due at calendar entry {found}, not tied yet" in lines[proposed]
    assert "not tied yet" not in lines[plain]
    apply(env, [tie_op(proposed, found)])
    assert "not tied yet" not in _open_actions(store, People(store, cfg))


def test_the_notes_prompt_and_the_op_reference_describe_the_tie():
    from engine.ops import reference_for
    from engine.prompts import render

    reference = reference_for(["action.tie"])
    assert '"action.tie"' in reference and "due at" in reference
    words = render("notes", {"assistant_name": "Assistant", "contact_kinds": "", "learning_from_input": ""}, None)
    assert "action.tie" in words and "not tied yet" in words

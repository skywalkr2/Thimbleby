"""Drop it and tell them (design 7.6, 6.12): dropping a to-do that reached someone is one path that also drafts a note
to each person who was told, whichever way it is dropped (a held drop's answer, the row menu's drop, or "no longer
needed" for an ending). The drop applies at once; the note is an outward act that waits for the person's yes on its
exact content and goes only through the publisher. Nothing is sent by the drop, and no drop leaves the copyable one-line
notice. A to-do nobody was told about is dropped with no note. Names, ids and addresses come from the fixtures; every
address is on example.com."""

from __future__ import annotations

import json
from datetime import UTC, datetime

import pytest

from engine.ai.adapters.stub import set_responder
from engine.ai.router import Router
from engine.dispatcher import process
from engine.intake import hand_in
from engine.storage import WriteContext
from tests.conftest import DEMO_B
from tests.test_act_draft_api import client  # noqa: F401  (the API fixture with a mailbox account that can act)
from tests.test_endings_need_delivery import CLOSED, close_op, own_note
from tests.test_gate_measures import from_input
from tests.test_hold_drop_fold import OPEN, drop_op
from tests.test_knowledge_records import apply, source
from tests.test_project_ending import PROJECT, QUOTE, set_status
from tests.test_project_ending import RAW as ENDING_RAW
from tests.test_project_ending import ending as ending_status
from tests.test_project_ending import open_of as open_on_project
from tests.test_publisher import api  # noqa: F401  (the API fixture the client builds on)

TODAY = datetime.now(UTC).date().isoformat()
NOW = datetime.now(UTC)
_CTX = WriteContext(actor="pm", trust="trusted", op="test.drop-note")


@pytest.fixture
def demo():
    """The fixtures the held drop is read from are the second fictional workspace's."""
    return DEMO_B


def held_drop_of_a_told_action(client):  # noqa: F811
    """A run's drop of an action the fixture person was already told about: it waits for the person."""
    action = OPEN[0]["id"]
    with client.store.transaction() as tx:
        found = tx.get("action", action)
        tx.update(
            "action",
            action,
            {"told": {client.person: TODAY}},
            _CTX,
            read_version=found.version,
        )
    cs_id, statuses = from_input(client.store, client.cfg, [drop_op(action)])
    assert statuses == ["held"]
    return cs_id, action


def questions(client):  # noqa: F811
    return {q.id for q in client.store.read().list("question")}


def test_dropping_and_drafting_the_note_drops_at_once_and_waits_for_the_yes_on_the_exact_note(client):  # noqa: F811
    cs_id, action = held_drop_of_a_told_action(client)
    before = questions(client)
    done = client.post(f"/api/changesets/{cs_id}/ops/0/release-with-note")
    assert done.status_code == 200, done.text
    body = done.json()
    assert client.store.read().get("action", action).data["status"] == "dropped"
    assert questions(client) == before, "the note is an outward act, not a second kind of line"
    (act_id,) = body["acts"]
    shown = client.get(f"/api/acts/{act_id}").json()
    item = " ".join(client.store.read().get("action", action).data["text"].split())
    assert shown["status"] == "draft" and shown["kind"] == "message"
    assert [r["address"] for r in shown["recipients"]] == ["api.recipient@example.com"]
    assert item in shown["parts"]["body"] and shown["parts"]["subject"]
    assert client.fake.delivered == [] and shown["account"] is not None
    # Only the person's yes on this content lets the publisher send it, and then exactly that content goes.
    sent = client.post(
        f"/api/acts/{act_id}/send", json={"fingerprint": shown["fingerprint"], "acknowledged": [client.person]}
    )
    assert sent.status_code == 200 and sent.json()["status"] == "sent"
    assert client.fake.delivered[0][0].parts == shown["parts"]


def test_undo_takes_back_the_drop_and_the_draft_together(client):  # noqa: F811
    cs_id, action = held_drop_of_a_told_action(client)
    body = client.post(f"/api/changesets/{cs_id}/ops/0/release-with-note").json()
    client.post(f"/api/changesets/{body['changesets'][0]}/undo", json={})  # the one Undo of the drop
    assert client.store.read().get("action", action).data["status"] == "open"
    assert client.store.read().get("act", body["acts"][0]) is None


def test_an_action_nobody_was_told_about_drops_with_no_note(client):  # noqa: F811
    action = OPEN[1]["id"]
    cs_id, statuses = from_input(client.store, client.cfg, [drop_op(action)])
    if statuses == ["applied"]:
        pytest.skip("a drop nobody was told about is applied without a hold")
    done = client.post(f"/api/changesets/{cs_id}/ops/0/release-with-note")
    assert done.status_code == 200 and done.json()["acts"] == []


def test_a_change_that_is_not_waiting_is_refused(client):  # noqa: F811
    cs_id, _ = held_drop_of_a_told_action(client)
    client.post(f"/api/changesets/{cs_id}/ops/0/release-with-note")
    again = client.post(f"/api/changesets/{cs_id}/ops/0/release-with-note")
    assert again.status_code == 409


def told_action(client):  # noqa: F811
    """A to-do the fixture person was already told about, still open."""
    action = OPEN[0]["id"]
    with client.store.transaction() as tx:
        found = tx.get("action", action)
        tx.update("action", action, {"told": {client.person: TODAY}}, _CTX, read_version=found.version)
    return action


def notices(client):  # noqa: F811
    return [q for q in client.store.read().list("question") if q.data["kind"] == "action-notice"]


def waiting_drafts(client, acts):  # noqa: F811
    return [client.get(f"/api/acts/{a}").json()["status"] for a in acts]


def test_a_plain_release_of_a_held_drop_makes_no_copyable_line(client):  # noqa: F811
    cs_id, action = held_drop_of_a_told_action(client)
    assert client.post(f"/api/changesets/{cs_id}/ops/0/release", json={}).status_code == 200
    assert client.store.read().get("action", action).data["status"] == "dropped"
    assert notices(client) == []


def test_the_row_menus_drop_of_a_told_to_do_drafts_the_note_and_makes_no_copyable_line(client):  # noqa: F811
    action = told_action(client)
    done = client.post(f"/api/actions/{action}/drop", json={"reason": "Handled elsewhere"})
    assert done.status_code == 200, done.text
    body = done.json()
    assert client.store.read().get("action", action).data["status"] == "dropped"
    assert len(body["drafts"]) == len(body["acts"]) == 1
    assert notices(client) == []
    assert waiting_drafts(client, body["acts"]) == ["draft"] and client.fake.delivered == []
    # One Undo takes the note and the drop back together.
    assert client.post(f"/api/changesets/{body['changeset']}/undo", json={}).status_code == 200
    assert client.store.read().get("action", action).data["status"] == "open"
    assert client.store.read().get("act", body["acts"][0]) is None


def test_the_row_menus_drop_of_a_to_do_nobody_was_told_about_drafts_nothing(client):  # noqa: F811
    action = OPEN[1]["id"]
    body = client.post(f"/api/actions/{action}/drop", json={"reason": "Handled elsewhere"}).json()
    assert body["drafts"] == [] and body["acts"] == []
    assert client.store.read().get("action", action).data["status"] == "dropped"
    assert notices(client) == []


def test_no_longer_needed_for_a_told_to_do_drafts_the_note_and_undo_takes_everything_back(client):  # noqa: F811
    action = told_action(client)
    cs_id, statuses = own_note(client.store, client.cfg, close_op(action, CLOSED))
    assert statuses == ["held"]
    done = client.post(f"/api/changesets/{cs_id}/ops/0/ending", json={"ending": "called_off"})
    assert done.status_code == 200, done.text
    body = done.json()
    assert body["changeset"] == cs_id and len(body["drafts"]) == len(body["acts"]) == 1
    assert client.store.read().get("action", action).data["status"] == "dropped"
    assert notices(client) == []
    assert waiting_drafts(client, body["acts"]) == ["draft"]
    client.post(f"/api/changesets/{cs_id}/undo", json={})
    assert client.store.read().get("act", body["acts"][0]) is None
    assert client.store.read().get("action", action).data["status"] == "open"


def test_done_by_the_owner_drafts_no_note(client):  # noqa: F811
    action = told_action(client)
    cs_id, _ = own_note(client.store, client.cfg, close_op(action, CLOSED))
    body = client.post(f"/api/changesets/{cs_id}/ops/0/ending", json={"ending": "done"}).json()
    assert body["drafts"] == [] and body["acts"] == []
    assert client.store.read().get("action", action).data["status"] == "done"


def test_a_drop_the_assistant_applies_by_itself_makes_no_copyable_line(client):  # noqa: F811
    action = OPEN[1]["id"]
    cs_id, statuses = from_input(client.store, client.cfg, [drop_op(action)])
    if statuses == ["held"]:
        client.post(f"/api/changesets/{cs_id}/ops/0/release", json={})
    assert client.store.read().get("action", action).data["status"] == "dropped"
    assert notices(client) == []


def test_a_project_ending_drafts_one_note_to_each_person_told_listing_every_dropped_to_do(client):  # noqa: F811
    store, cfg = client.store, client.cfg
    actions, _ = open_on_project(store)
    told = [a for a in actions if store.read().get("action", a).data["status"] == "open"][:2]
    assert len(told) == 2
    for action in told:
        with store.transaction() as tx:
            found = tx.get("action", action)
            tx.update("action", action, {"told": {client.person: TODAY}}, _CTX, read_version=found.version)
    cs_id, result = apply(
        store,
        cfg,
        [set_status(ending_status(cfg, store), quote=QUOTE)],
        origin="input",
        trust="untrusted",
        source_id=source(store),
        raw=ENDING_RAW,
    )
    assert set(result) == {"held"}
    index = next(o["index"] for o in store.read().get("changeset", cs_id).data["ops"] if o["op"]["op"] == "record.set")
    before = questions(client)
    shown = client.get(f"/api/changesets/{cs_id}/ops/{index}/project-ending").json()
    assert len(shown["told_names"]) == 1
    done = client.post(f"/api/changesets/{cs_id}/ops/{index}/project-ending", json={"end": True, "keep": []})
    assert done.status_code == 200, done.text
    body = done.json()
    assert store.read().get("project", PROJECT["id"]).data["status"] == ending_status(cfg, store)
    assert body["names"] == shown["told_names"]
    (act_id,) = body["acts"]
    assert len(body["drafts"]) == 1 and questions(client) == before, "one note, and no copyable line"
    parts = client.get(f"/api/acts/{act_id}").json()["parts"]
    for action in told:
        item = " ".join(store.read().get("action", action).data["text"].split())
        assert item in parts["body"]
    assert len(parts["body"].splitlines()) == 2
    assert client.fake.delivered == []
    assert client.post(f"/api/changesets/{cs_id}/undo", json={}).status_code == 200
    assert store.read().get("project", PROJECT["id"]).data["status"] == PROJECT["status"]
    assert store.read().get("act", act_id) is None
    assert all(store.read().get("action", a).data["status"] == "open" for a in told)


def test_keeping_a_to_do_through_a_project_ending_leaves_it_out_of_the_note(client):  # noqa: F811
    store, cfg = client.store, client.cfg
    actions, _ = open_on_project(store)
    told = [a for a in actions if store.read().get("action", a).data["status"] == "open"][:2]
    for action in told:
        with store.transaction() as tx:
            found = tx.get("action", action)
            tx.update("action", action, {"told": {client.person: TODAY}}, _CTX, read_version=found.version)
    cs_id, _ = apply(
        store,
        cfg,
        [set_status(ending_status(cfg, store), quote=QUOTE)],
        origin="input",
        trust="untrusted",
        source_id=source(store),
        raw=ENDING_RAW,
    )
    ops = store.read().get("changeset", cs_id).data["ops"]
    index = next(o["index"] for o in ops if o["op"]["op"] == "record.set")
    keep = next(o["index"] for o in ops if o["op"]["op"] == "action.drop" and o["op"]["id"] == told[0])
    body = client.post(f"/api/changesets/{cs_id}/ops/{index}/project-ending", json={"end": True, "keep": [keep]}).json()
    parts = client.get(f"/api/acts/{body['acts'][0]}").json()["parts"]
    assert len(parts["body"].splitlines()) == 1
    assert " ".join(store.read().get("action", told[0]).data["text"].split()) not in parts["body"]


def test_keeping_the_project_drafts_no_note(client):  # noqa: F811
    store, cfg = client.store, client.cfg
    cs_id, _ = apply(
        store,
        cfg,
        [set_status(ending_status(cfg, store), quote=QUOTE)],
        origin="input",
        trust="untrusted",
        source_id=source(store),
        raw=ENDING_RAW,
    )
    index = next(o["index"] for o in store.read().get("changeset", cs_id).data["ops"] if o["op"]["op"] == "record.set")
    body = client.post(f"/api/changesets/{cs_id}/ops/{index}/project-ending", json={"end": False, "keep": []}).json()
    assert body["drafts"] == [] and body["acts"] == [] and body["names"] == []


# ---- the person's own note, read by the worker, and the links Undo follows -------------------------------------------


def told_through_a_note(client):  # noqa: F811
    """Run the person's own note that drops a to-do someone was told about. Returns the changeset, the to-do and its
    held op's index: the worker holds a drop of something that reached someone, whoever asked for it."""
    action = told_action(client)
    quote = "it is not needed any more"
    op = {"op": "action.drop", "id": action, "reason": "No longer needed", "evidence": {"quote": quote}}
    set_responder(lambda task: json.dumps({"summary": "Filed.", "ops": [op]}))
    worker = client.app.state.worker
    handed = hand_in(worker.ws, client.store, note=f"Drop it, {quote}.", now=NOW)
    cs_id = process(
        worker.ws, client.store, client.cfg, Router(client.cfg, client.store, env={}), handed.request, now=NOW
    )
    set_responder(None)
    return cs_id, action


def acts_of(client):  # noqa: F811
    return list(client.store.read().list("act"))


def test_a_note_that_drops_a_told_to_do_waits_for_the_person_and_makes_no_copyable_line(client):  # noqa: F811
    cs_id, action = told_through_a_note(client)
    (outcome,) = client.store.read().get("changeset", cs_id).data["ops"]
    assert outcome["status"] == "held" and client.store.read().get("action", action).data["status"] == "open"
    assert notices(client) == [] and acts_of(client) == []


def test_releasing_that_drop_with_the_note_leaves_one_draft_linked_from_the_change_and_undo_takes_it_back(client):  # noqa: F811
    cs_id, action = told_through_a_note(client)
    done = client.post(f"/api/changesets/{cs_id}/ops/0/release-with-note")
    assert done.status_code == 200, done.text
    (act,) = acts_of(client)
    assert act.data["status"] == "draft" and notices(client) == []
    linked = client.store.read().get("changeset", cs_id).data["followups"]
    assert linked == done.json()["changesets"][1:]
    undone = client.post(f"/api/changesets/{cs_id}/undo", json={"ops": [0]})
    assert undone.status_code == 200 and undone.json()["restored"] == [0] and undone.json()["skipped"] == []
    assert client.store.read().get("action", action).data["status"] == "open"
    assert acts_of(client) == []


def test_an_act_that_has_gone_out_is_left_and_the_undo_says_so(client):  # noqa: F811
    cs_id, action = told_through_a_note(client)
    client.post(f"/api/changesets/{cs_id}/ops/0/release-with-note")
    (act,) = acts_of(client)
    with client.store.transaction() as tx:
        found = tx.get("act", act.id)
        tx.update("act", act.id, {"status": "approved"}, _CTX, read_version=found.version)
    undone = client.post(f"/api/changesets/{cs_id}/undo", json={"ops": [0]}).json()
    assert undone["restored"] == [0]
    assert client.store.read().get("action", action).data["status"] == "open"
    (left,) = undone["skipped"]
    assert left["changeset"] == client.store.read().get("changeset", cs_id).data["followups"][0]
    assert "moved on" in left["reason"]
    assert client.store.read().get("act", act.id) is not None


def test_the_links_to_the_notes_survive_the_export_round_trip(client, tmp_path):  # noqa: F811
    from tests.roundtrip import round_trip

    cs_id, _ = told_through_a_note(client)
    client.post(f"/api/changesets/{cs_id}/ops/0/release-with-note")
    assert client.store.read().get("changeset", cs_id).data["followups"]
    assert round_trip(client.store, client.cfg, tmp_path / "trip")["differences"] == []

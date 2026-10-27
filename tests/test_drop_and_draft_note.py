"""Drop it and draft the note (design 7.6, 6.12): the answer to a held drop of an action that reached someone which also
drafts a note to each person who was told. The drop applies at once; the note is an outward act that waits for the
person's yes on its exact content and goes only through the publisher. Nothing is sent by the drop. Names, ids and
addresses come from the fixtures; every address is on example.com."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from engine.storage import WriteContext
from tests.conftest import DEMO_B
from tests.test_act_draft_api import client  # noqa: F401  (the API fixture with a mailbox account that can act)
from tests.test_gate_measures import from_input
from tests.test_hold_drop_fold import OPEN, drop_op
from tests.test_publisher import api  # noqa: F401  (the API fixture the client builds on)

TODAY = datetime.now(UTC).date().isoformat()
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
    for changeset in body["changesets"]:
        client.post(f"/api/changesets/{changeset}/undo", json={})
    assert client.store.read().get("action", action).data["status"] == "open"
    assert client.store.read().get("act", body["acts"][0]) is None or (
        client.get(f"/api/acts/{body['acts'][0]}").json()["status"] != "draft"
    )


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


def test_plain_drop_it_still_drafts_its_copyable_line_as_before(client):  # noqa: F811
    cs_id, _ = held_drop_of_a_told_action(client)
    before = questions(client)
    assert client.post(f"/api/changesets/{cs_id}/ops/0/release", json={}).status_code == 200
    assert len(questions(client) - before) == 1

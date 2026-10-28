"""Several saved messages at once (design 6.12, S1b-2): the person selects messages from a list of saved mail and
drafts one change (archive, move, label, mark as read) for all of them. Each message gets its own act on the account
it came in on, all in one change; the person's one yes approves each act and the publisher sends each one. Move to is
offered for an account that can't list its folders too, saying so. Built on the draft tests' workspace and fake
channel."""

from __future__ import annotations

import pytest

from engine import act_accounts
from engine.channels import ChannelRegistration, FakeChannel
from tests.test_act_draft_api import ACCOUNT, MAILBOX, SIGNED_IN, client, message  # noqa: F401  (fixtures and helpers)
from tests.test_publisher import api  # noqa: F401  (the API fixture the client builds on)


def pick(client, n: int = 3) -> list[str]:  # noqa: F811
    return [message(client, f"batch-{i}") for i in range(n)]


def yes(client, drafted: dict) -> dict:  # noqa: F811
    return {"acts": [{"id": a["id"], "fingerprint": a["fingerprint"]} for a in drafted["acts"]]}


@pytest.mark.parametrize(
    ("action", "more"),
    [("archive", {}), ("mark_read", {}), ("move", {"folder": "Projects"}), ("label", {"label": "Waiting"})],
)
def test_each_selected_message_gets_its_own_act_all_in_one_change(client, action, more):  # noqa: F811
    ids = pick(client)
    made = client.post("/api/acts/batch", json={"action": action, "about": ids, **more})
    assert made.status_code == 200, made.text
    drafted = made.json()
    assert drafted["skipped"] == [] and len(drafted["acts"]) == 3
    assert [[a["id"] for a in act["about"]] for act in drafted["acts"]] == [[i] for i in ids]
    assert {(a["kind"], a["action"], a["status"], a["account"], a["channel"]) for a in drafted["acts"]} == {
        ("mailbox", action, "draft", ACCOUNT, "fake")
    }
    assert {a["folder"] for a in drafted["acts"]} == {more.get("folder")}
    assert {a["label"] for a in drafted["acts"]} == {more.get("label")}
    # nothing is carried out by drafting, and one Undo takes every draft back
    assert client.fake.delivered == []
    cs = drafted["changeset"]
    assert client.store.read().get("changeset", cs) is not None
    assert client.post(f"/api/changesets/{cs}/undo", json={"ops": None}).status_code == 200
    assert client.get("/api/acts", params={"status": "draft"}).json()["acts"] == []


def test_a_message_that_cannot_be_acted_on_is_skipped_with_its_reason_and_the_rest_are_drafted(client):  # noqa: F811
    good = message(client, "good")
    off = message(client, "off", source="other-mail")
    client.cfg.watch.sources.append(
        type(client.cfg.watch.sources[0])(id="other-mail", connector="mailbox", label="Other")
    )
    unknown = message(client, "unknown", source="no-such-source")
    drafted = client.post(
        "/api/acts/batch", json={"action": "archive", "about": [good, off, unknown, "SRC-999"]}
    ).json()
    assert [a["about"][0]["id"] for a in drafted["acts"]] == [good]
    reasons = {s["record"]: (s["why"], s["account_label"]) for s in drafted["skipped"]}
    assert reasons == {
        off: ("acting_off", "Other"),
        unknown: ("no_account", None),
        "SRC-999": ("gone", None),
    }
    assert {s["title"] for s in drafted["skipped"] if s["record"] == off} == {"Subject of off"}


def test_a_channel_that_does_not_do_the_change_skips_its_messages(client):  # noqa: F811
    narrow = client.fake.registration("narrow")
    client.store.plugins.core_channels["narrow"] = ChannelRegistration(
        **{**narrow.__dict__, "actions": {"message": ("send",), "mailbox": ("archive",)}}
    )
    del client.store.plugins.core_channels["fake"]
    one = message(client, "narrow")
    drafted = client.post("/api/acts/batch", json={"action": "label", "about": [one], "label": "x"}).json()
    assert drafted["acts"] == [] and [(s["why"], s["account_label"]) for s in drafted["skipped"]] == [
        ("cannot", "Work mail")
    ]
    assert (
        client.post("/api/acts/batch", json={"action": "archive", "about": [one]}).json()["acts"][0]["channel"]
        == "narrow"
    )


def test_a_move_names_its_folder_and_a_selection_names_something(client):  # noqa: F811
    one = message(client, "folderless")
    refused = client.post("/api/acts/batch", json={"action": "move", "about": [one]})
    assert refused.status_code == 409 and "folder" in refused.json()["detail"]
    assert client.post("/api/acts/batch", json={"action": "archive", "about": []}).status_code == 422


def test_one_yes_approves_and_sends_each_act_as_its_own(client):  # noqa: F811
    ids = pick(client)
    drafted = client.post("/api/acts/batch", json={"action": "archive", "about": ids}).json()
    done = client.post("/api/acts/batch/send", json=yes(client, drafted))
    assert done.status_code == 200, done.text
    assert [(r["status"], r["reason"]) for r in done.json()["results"]] == [("sent", None)] * 3
    assert len(client.fake.delivered) == 3
    assert {act.about[0].id for act, _ in client.fake.delivered} == set(ids)
    for act in drafted["acts"]:
        data = client.store.read().get("act", act["id"]).data
        assert data["status"] == "sent" and data["approved"]["by"] and data["sent_by"] == "publisher"
        ledger = [
            e["op"].split("#")[0]
            for e in client.store.read().ledger(kind="act", record_id=act["id"])
            if e["field"] == "status"
        ]
        assert ledger == ["act.draft", "act.approve", "act.sending", "act.sent"]
    # a sent one is taken back on its own where the channel can
    assert client.post(f"/api/acts/{drafted['acts'][0]['id']}/undo").json()["status"] == "undone"


def test_one_that_is_different_from_what_was_shown_does_not_stop_the_others(client):  # noqa: F811
    ids = pick(client)
    drafted = client.post("/api/acts/batch", json={"action": "mark_read", "about": ids}).json()
    body = yes(client, drafted)
    body["acts"][1]["fingerprint"] = "not-what-was-shown"
    results = client.post("/api/acts/batch/send", json=body).json()["results"]
    assert [r["status"] for r in results] == ["sent", "draft", "sent"]
    assert results[1]["reason"] and "different" in results[1]["reason"]
    assert len(client.fake.delivered) == 2
    assert (
        client.post("/api/acts/batch/send", json={"acts": [{"id": "XACT-999", "fingerprint": "x"}]}).status_code == 404
    )


def test_a_channel_failure_is_that_acts_and_the_others_still_go(client):  # noqa: F811
    ids = pick(client, 2)
    drafted = client.post("/api/acts/batch", json={"action": "archive", "about": ids}).json()
    client.fake.mode = "fail"
    results = client.post("/api/acts/batch/send", json=yes(client, drafted)).json()["results"]
    assert [r["status"] for r in results] == ["failed", "failed"] and all(r["reason"] for r in results)
    client.fake.mode = "succeed"
    again = client.post("/api/acts/batch/send", json=yes(client, drafted)).json()["results"]
    assert [r["status"] for r in again] == ["sent", "sent"]


def test_the_batch_options_say_whether_the_selection_has_one_account_and_lists_its_folders(client):  # noqa: F811
    ids = pick(client, 2)
    one = client.get("/api/acts/batch-options", params={"record": ids}).json()
    assert one["account"] == ACCOUNT and one["folder_source"] == MAILBOX and one["folders_listed"] is True
    other = type(client.cfg.watch.sources[0])(id="second-mail", connector="mailbox", label="Second")
    client.cfg.watch.sources.append(other)
    mixed = client.get(
        "/api/acts/batch-options", params={"record": [*ids, message(client, "x", source="second-mail")]}
    ).json()
    assert mixed["several_accounts"] is True and mixed["account"] is None and mixed["folders_listed"] is False
    none = client.get(
        "/api/acts/batch-options", params={"record": [message(client, "y", source="no-such-source")]}
    ).json()
    assert none["account"] is None and none["several_accounts"] is False


def test_move_to_is_offered_for_a_signed_in_account_that_cannot_list_its_folders_and_says_so(client, monkeypatch):  # noqa: F811
    mail = message(client, "signed-in")
    registration = client.fake.registration("demo/mail")
    client.store.plugins.core_channels["demo/mail"] = ChannelRegistration(
        **{**registration.__dict__, "accounts": ("demo-service",)}
    )
    del client.store.plugins.core_channels["fake"]
    client.cfg.watch.acting.append(SIGNED_IN)
    monkeypatch.setattr(act_accounts, "of_record", lambda view, store, cfg, record_id: SIGNED_IN)
    options = client.get("/api/acts/options", params={"record": mail}).json()
    assert "move" in options["actions"]
    assert options["folder_source"] is None and options["folders_listed"] is False
    drafted = client.post(
        "/api/acts", json={"kind": "mailbox", "action": "move", "about": [mail], "folder": "Receipts"}
    )
    assert (
        drafted.status_code == 200 and drafted.json()["folder"] == "Receipts" and drafted.json()["account"] == SIGNED_IN
    )
    # a plain mailbox still lists its folders
    monkeypatch.undo()
    client.store.plugins.core_channels["fake"] = FakeChannel(accounts=("mailbox",)).registration()
    plain = client.get("/api/acts/options", params={"record": mail}).json()
    assert plain["folders_listed"] is True and plain["folder_source"] == MAILBOX

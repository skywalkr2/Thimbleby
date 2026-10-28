"""A stale act shows what changed (design 6.12, S1b-1): the yes keeps the exact content and target it was given on,
and when the act goes stale the screen sets that against the act as it resolves now, field by field, with both texts.
Built on the publisher tests' workspace and fake channel; names, ids and addresses come from the fixtures."""

from __future__ import annotations

from engine import acts
from engine.applier import apply_as_person
from engine.channels import FakeChannel
from engine.storage import WriteContext
from tests.test_publisher import api, env  # noqa: F401  (the fixtures)

_TEST = WriteContext(actor="pm", trust="trusted", op="test.stale-text")


def test_a_yes_keeps_the_exact_content_and_target_it_was_given_on(env):  # noqa: F811
    act_id = env.ready(parts={"subject": "The proofs", "body": "The proofs ship on Monday."})
    shown = env.act(act_id)["approved"]["shown"]
    assert shown["parts"] == {"subject": "The proofs", "body": "The proofs ship on Monday."}
    assert shown["recipients"] == [{"role": "to", "address": env.address[env.ana]}]
    assert shown["channel"] == "fake"


def test_a_stale_act_keeps_the_yes_it_lost_and_says_what_changed(env):  # noqa: F811
    act_id = env.ready()
    old = env.address[env.ana]
    env.set_address(env.ana, "moved.recipient@example.com")
    assert env.publisher.send(act_id).status == "stale"
    data = env.act(act_id)
    assert data["approved"] is None and data["was_approved"]["by"] == env.pm
    assert data["was_approved"]["shown"]["recipients"] == [{"role": "to", "address": old}]
    found = acts.differences(
        data["was_approved"]["shown"], acts.current_shown(env.store.read(), env.store.plugins, data)
    )
    assert [(d.part, d.field, d.before, d.after) for d in found] == [
        ("target", "to", old, "moved.recipient@example.com")
    ]
    assert env.fake.calls == []


def test_a_template_updated_since_the_yes_shows_its_version_then_and_now(env):  # noqa: F811
    env.use(FakeChannel(templates={"letter": "1"}))
    act_id = env.ready(template={"name": "letter", "version": "1"})
    env.fake.templates["letter"] = "2"
    assert env.publisher.send(act_id).status == "stale"
    data = env.act(act_id)
    found = acts.differences(
        data["was_approved"]["shown"], acts.current_shown(env.store.read(), env.store.plugins, data)
    )
    assert [(d.part, d.before, d.after) for d in found] == [("template", "letter 1", "letter 2")]


def test_a_new_yes_or_an_edit_or_taking_it_back_clears_what_was_kept(env):  # noqa: F811
    for how in ("yes", "edit", "withdraw"):
        act_id = env.ready()
        env.set_address(env.ana, f"{how}.recipient@example.com")
        assert env.publisher.send(act_id).status == "stale"
        assert env.act(act_id)["was_approved"] is not None
        if how == "yes":
            env.yes(act_id)
        elif how == "edit":
            version = env.store.read().get("act", act_id).version
            env.person_op("act.edit", act_id, read_version=version, parts={"subject": "A", "body": "B"})
        else:
            env.person_op("act.withdraw", act_id)
        assert env.act(act_id)["was_approved"] is None


def test_the_difference_names_a_changed_part_of_the_content_the_things_it_is_about_and_the_account():
    before = {
        "parts": {"subject": "Hello", "body": "One"},
        "recipients": [{"role": "to", "address": "a@example.com"}, {"role": "cc", "address": "c@example.com"}],
        "target": {"when": "9:00"},
        "about": {"EV-1": {"title": "Planning", "text": "9 - 10"}},
        "account": "mailbox:one",
        "channel": "fake",
        "template": None,
    }
    now = {
        **before,
        "parts": {"subject": "Hello", "body": "Two", "extra": "New"},
        "recipients": [{"role": "to", "address": "a@example.com"}],
        "target": {"when": "10:00", "folder": "Done"},
        "about": {"EV-1": {"title": "Planning", "text": "9 - 10 (cancelled)"}},
        "account": "mailbox:two",
    }
    found = {(d.part, d.field): (d.before, d.after, d.name) for d in acts.differences(before, now)}
    assert found == {
        ("content", "body"): ("One", "Two", None),
        ("content", "extra"): (None, "New", None),
        ("target", "cc"): ("c@example.com", None, None),
        ("target", "when"): ("9:00", "10:00", None),
        ("target", "folder"): (None, "Done", None),
        ("about", "EV-1"): ("9 - 10", "9 - 10 (cancelled)", "Planning"),
        ("account", "account"): ("mailbox:one", "mailbox:two", None),
    }
    assert acts.differences(before, before) == []


def _fake_act(client) -> str:
    op = {
        "op": "act.draft",
        "channel": "fake",
        "target": {"kind": "message", "recipients": [{"person": client.person, "kind": "email"}]},
        "parts": {"subject": "The proofs", "body": "The proofs ship on Monday."},
    }
    cs = apply_as_person(client.store, client.cfg, [op], "Drafted an act")
    return client.store.read().get("changeset", cs).data["ops"][0]["records"][0]["id"]


def test_the_api_lists_what_changed_with_both_texts_for_a_stale_act_only(api):  # noqa: F811
    act_id = _fake_act(api)
    assert api.get(f"/api/acts/{act_id}").json()["changes"] == []
    seen = api.get(f"/api/acts/{act_id}").json()
    body = {"fingerprint": seen["fingerprint"], "acknowledged": [r["key"] for r in seen["recipients"] if r["reasons"]]}
    assert api.post(f"/api/acts/{act_id}/approve", json=body).json()["status"] == "approved"
    assert api.get(f"/api/acts/{act_id}").json()["changes"] == []
    with api.store.transaction() as tx:
        found = tx.get("person", api.person)
        tx.update(
            "person",
            api.person,
            {"how_to_reach": {"email": "moved.recipient@example.com"}},
            _TEST,
            read_version=found.version,
        )
    # the screen's own fingerprint is the old one, so approve-and-send meets a changed act and the send goes stale
    assert api.post(f"/api/acts/{act_id}/send", json=body).json()["status"] == "stale"
    stale = api.get(f"/api/acts/{act_id}").json()
    assert stale["changes_known"] is True and stale["approved_before_by"] is not None
    assert stale["changes"] == [
        {
            "part": "target",
            "field": "to",
            "name": None,
            "before": "api.recipient@example.com",
            "after": "moved.recipient@example.com",
        }
    ]
    assert stale["parts"] == {"subject": "The proofs", "body": "The proofs ship on Monday."}
    assert api.get("/api/acts", params={"status": "stale"}).json()["acts"][0]["changes"] == stale["changes"]


def test_a_yes_given_before_the_content_was_kept_still_goes_stale_and_says_so(api):  # noqa: F811
    act_id = _fake_act(api)
    seen = api.get(f"/api/acts/{act_id}").json()
    api.post(
        f"/api/acts/{act_id}/approve",
        json={
            "fingerprint": seen["fingerprint"],
            "acknowledged": [r["key"] for r in seen["recipients"] if r["reasons"]],
        },
    )
    with api.store.transaction() as tx:
        found = tx.get("act", act_id)
        tx.update(
            "act", act_id, {"approved": {**found.data["approved"], "shown": None}}, _TEST, read_version=found.version
        )
        found = tx.get("person", api.person)
        tx.update(
            "person",
            api.person,
            {"how_to_reach": {"email": "later.recipient@example.com"}},
            _TEST,
            read_version=found.version,
        )
    api.post(f"/api/acts/{act_id}/send", json={"fingerprint": seen["fingerprint"], "acknowledged": []})
    stale = api.get(f"/api/acts/{act_id}").json()
    assert stale["status"] == "stale" and stale["why"] == ["target"]
    assert stale["changes_known"] is False and stale["changes"] == []

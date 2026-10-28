"""Creating, moving and cancelling events on a connected calendar (design 6.12, S1b-2): the draft takes the event's
fields, a calendar account is offered only when acting is on and its channel declares the action, an event is offered
for move and cancel only when it is the person's own, and each act waits for the person's yes on its exact content
before the channel carries it out. Built on the draft tests' workspace and a fake channel serving a signed-in
account."""

from __future__ import annotations

import pytest

from engine import act_accounts
from engine.channels import ChannelRegistration
from engine.storage import WriteContext
from tests.test_act_draft_api import (  # noqa: F401  (fixtures and helpers)
    ORGANIZER,
    SIGNED_IN,
    client,
    entry,
    message,
)
from tests.test_publisher import api  # noqa: F401  (the API fixture the client builds on)

_ENGINE = WriteContext(actor="engine", trust="trusted", op="test.calendar")
START = "2026-11-02T09:00:00+00:00"
END = "2026-11-02T10:00:00+00:00"
NEW_START = "2026-11-03T14:00:00+00:00"
NEW_END = "2026-11-03T15:00:00+00:00"
CALENDAR = "demo/calendar"


@pytest.fixture
def calendar(client, monkeypatch):  # noqa: F811
    """A signed-in account with acting on, served by a channel that declares every calendar action."""
    registration = client.fake.registration(CALENDAR)
    client.store.plugins.core_channels[CALENDAR] = ChannelRegistration(
        **{**registration.__dict__, "accounts": ("demo-service",)}
    )
    client.cfg.watch.acting.append(SIGNED_IN)
    monkeypatch.setattr(act_accounts, "of_record", lambda view, store, cfg, record_id: SIGNED_IN)
    monkeypatch.setattr(
        act_accounts,
        "known",
        lambda store, cfg: [
            act_accounts.AccountInfo(
                SIGNED_IN, "Demo service (pat@example.com)", act_accounts.acting_on(cfg, SIGNED_IN)
            )
        ],
    )
    return client


def own_entry(client, **more):  # noqa: F811
    return entry(client, message(client, "calendar-source"), invitation=False, **more)


def test_a_connected_calendar_is_offered_when_acting_is_on_and_its_channel_creates_events(calendar):
    listed = calendar.get("/api/acts/calendar-options").json()["accounts"]
    assert [(a["id"], a["label"], a["acting"]) for a in listed] == [(SIGNED_IN, "Demo service (pat@example.com)", True)]
    calendar.cfg.watch.acting.remove(SIGNED_IN)
    assert calendar.get("/api/acts/calendar-options").json()["accounts"] == []
    calendar.cfg.watch.acting.append(SIGNED_IN)
    narrow = calendar.fake.registration(CALENDAR)
    calendar.store.plugins.core_channels[CALENDAR] = ChannelRegistration(
        **{**narrow.__dict__, "accounts": ("demo-service",), "actions": {"calendar": ("answer",)}}
    )
    assert calendar.get("/api/acts/calendar-options").json()["accounts"] == []


def test_a_new_event_is_drafted_with_its_exact_fields_on_the_accounts_own_calendar(calendar):
    made = calendar.post(
        "/api/acts",
        json={
            "kind": "calendar",
            "action": "create",
            "account": SIGNED_IN,
            "title": "Review the proofs",
            "start": NEW_START,
            "end": NEW_END,
            "alarm_minutes": 15,
        },
    )
    assert made.status_code == 200, made.text
    shown = made.json()
    assert (shown["kind"], shown["action"], shown["status"], shown["channel"]) == (
        "calendar",
        "create",
        "draft",
        CALENDAR,
    )
    assert (shown["title"], shown["start"], shown["end"], shown["alarm_minutes"]) == (
        "Review the proofs",
        NEW_START,
        NEW_END,
        15,
    )
    assert shown["calendar"] == "own" and shown["account"] == SIGNED_IN and shown["recipients"] == []
    assert calendar.fake.delivered == []  # drafting sends nothing


def test_a_new_event_needs_a_title_and_a_time_and_a_move_needs_its_new_start(calendar):
    bare = calendar.post("/api/acts", json={"kind": "calendar", "action": "create", "account": SIGNED_IN})
    assert bare.status_code == 409 and "names the calendar and the time" in bare.json()["detail"]
    untitled = calendar.post(
        "/api/acts",
        json={"kind": "calendar", "action": "create", "account": SIGNED_IN, "start": NEW_START, "end": NEW_END},
    )
    assert untitled.status_code == 409
    moved = calendar.post("/api/acts", json={"kind": "calendar", "action": "move", "about": [own_entry(calendar)]})
    assert moved.status_code == 409 and "new start" in moved.json()["detail"]
    cancel_two = calendar.post(
        "/api/acts", json={"kind": "calendar", "action": "cancel", "about": [own_entry(calendar), own_entry(calendar)]}
    )
    assert cancel_two.status_code == 409 and "one calendar entry" in cancel_two.json()["detail"]


def test_each_of_create_move_and_cancel_waits_for_the_yes_then_goes_out_as_shown(calendar):
    mine = own_entry(calendar)
    drafts = {
        "create": {"account": SIGNED_IN, "title": "Review", "start": NEW_START, "end": NEW_END},
        "move": {"about": [mine], "start": NEW_START, "end": NEW_END},
        "cancel": {"about": [mine]},
    }
    for action, more in drafts.items():
        made = calendar.post("/api/acts", json={"kind": "calendar", "action": action, **more}).json()
        assert made["status"] == "draft" and made["action"] == action and made["account"] == SIGNED_IN
        sent_before = len(calendar.fake.delivered)
        done = calendar.post(f"/api/acts/{made['id']}/send", json={"fingerprint": made["fingerprint"]}).json()
        assert done["status"] == "sent", done
        assert len(calendar.fake.delivered) == sent_before + 1
        act, _ = calendar.fake.delivered[-1]
        assert (act.kind, act.action, act.account) == ("calendar", action, SIGNED_IN)
        if action == "create":
            assert (act.calendar, act.title, act.start, act.end) == ("own", "Review", NEW_START, NEW_END)
        else:
            assert [a.id for a in act.about] == [mine]
            assert act.start == (NEW_START if action == "move" else None)


def test_a_move_or_cancel_that_changed_after_the_yes_goes_stale_instead_of_going_out(calendar):
    mine = own_entry(calendar)
    made = calendar.post(
        "/api/acts", json={"kind": "calendar", "action": "move", "about": [mine], "start": NEW_START, "end": NEW_END}
    ).json()
    assert (
        calendar.post(f"/api/acts/{made['id']}/approve", json={"fingerprint": made["fingerprint"]}).json()["status"]
        == "approved"
    )
    with calendar.store.transaction() as tx:
        found = tx.get("event", mine)
        tx.update(
            "event",
            mine,
            {"start": "2026-11-02T09:30:00+00:00"},
            _ENGINE,
            read_version=found.version,
        )
    sent = calendar.post(f"/api/acts/{made['id']}/send", json={"fingerprint": made["fingerprint"]}).json()
    assert sent["status"] == "stale" and calendar.fake.delivered == []
    stale = calendar.get(f"/api/acts/{made['id']}").json()
    assert [(c["part"], c["before"], c["after"]) for c in stale["changes"]] == [
        ("about", f"{START} - {END}", "2026-11-02T09:30:00+00:00 - " + END)
    ]


def test_an_event_is_offered_for_move_and_cancel_only_when_it_is_the_persons_own(calendar):
    def offered(record: str) -> list[str]:
        return calendar.get("/api/acts/options", params={"record": record}).json()["event_actions"]

    assert offered(own_entry(calendar)) == ["move", "cancel"]
    source = message(calendar, "invite-source")
    assert offered(entry(calendar, source)) == []  # an invitation from someone else
    calendar.cfg.workspace.user.accounts.append(ORGANIZER)
    assert offered(entry(calendar, source, key="<mine>")) == ["move", "cancel"]  # invited by the person themselves
    assert offered(own_entry(calendar, cancelled=True)) == []  # already called off
    with calendar.store.transaction() as tx:
        local = tx.create("event", {"title": "Own note", "start": START, "end": END, "trust": "trusted"}, _ENGINE).id
    assert offered(local) == []  # an entry only in the app's own calendar is no service's
    calendar.cfg.watch.acting.remove(SIGNED_IN)
    assert offered(own_entry(calendar)) == []  # acting off for its account


def test_a_channel_that_does_not_move_or_cancel_offers_neither(calendar):
    narrow = calendar.fake.registration(CALENDAR)
    calendar.store.plugins.core_channels[CALENDAR] = ChannelRegistration(
        **{**narrow.__dict__, "accounts": ("demo-service",), "actions": {"calendar": ("create", "answer")}}
    )
    assert calendar.get("/api/acts/options", params={"record": own_entry(calendar)}).json()["event_actions"] == []
    refused = calendar.post("/api/acts", json={"kind": "calendar", "action": "cancel", "about": [own_entry(calendar)]})
    assert refused.status_code == 409 and "can't cancel" in refused.json()["detail"]

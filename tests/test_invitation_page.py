"""What changed in an invitation, on the calendar entry's own page (design 6.32, 7.14): read from the entry's history
by rules, the same history the brief's changed-overnight lines read, with who was added, left out or answered as well.
Names, addresses and days are made up here."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine import invitation_history
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B

_RULE = WriteContext(actor="engine", trust="untrusted", op="calendar.keep")
_TEST = WriteContext(actor="pm", trust="trusted", op="test.invitation")
TOKEN = "invitation-page-token"
ORGANIZER = {"address": "organizer@example.com", "name": "Quinn Fictional"}
GUEST = {"address": "guest@example.com", "name": "Gale Guest", "response": "needs_action"}


def soon(hours: float) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).isoformat()


def invitation(store, ctx=_RULE, **more) -> str:
    data = {
        "title": "Design review",
        "start": soon(30),
        "end": soon(31),
        "invitation": True,
        "organizer": ORGANIZER,
        "attendees": [GUEST],
        "source": "SRC-0",
        "key": "k-design",
        **more,
    }
    with store.transaction() as tx:
        return tx.create("event", data, ctx).id


def keep(store, event_id: str, ctx=_RULE, **changes) -> None:
    with store.transaction() as tx:
        tx.update("event", event_id, changes, ctx, read_version=tx.get("event", event_id).version)


@pytest.fixture
def client(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "UTC"}, flags={"server.base_path": "/"})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui")
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as http:
        yield http, app.state.store, cfg


def kinds(body) -> list[str]:
    return [c["kind"] for c in body["changes"]]


def test_the_page_names_each_change_since_the_entry_was_kept_including_who_answered_and_who_was_added(client):
    http, store, _ = client
    found = invitation(store)
    new_start = soon(50)
    keep(store, found, start=new_start, end=soon(51), where="Room 4", title="Design review, second round")
    keep(
        store,
        found,
        attendees=[
            {**GUEST, "response": "accepted"},
            {"address": "newcomer@example.com", "name": "Nell Newcomer", "response": "needs_action"},
        ],
    )
    body = http.get(f"/api/meetings/{found}/prep").json()
    assert kinds(body) == [
        "title_changed",
        "moved",
        "end_changed",
        "location_changed",
        "attendee_replied",
        "attendee_added",
    ]
    by_kind = {c["kind"]: c for c in body["changes"]}
    assert by_kind["title_changed"]["text"] == "Design review, second round"
    assert by_kind["location_changed"]["text"] == "Room 4"
    moved = by_kind["moved"]
    assert (moved["day"], moved["at"]) == (new_start[:10], new_start[11:16])
    assert moved["from_day"] and moved["from_at"]
    assert (by_kind["attendee_added"]["name"], by_kind["attendee_replied"]["status"]) == ("Nell Newcomer", "accepted")
    assert body["changed_at"]


def test_an_entry_kept_once_or_changed_before_the_days_looked_back_has_no_changes(client):
    http, store, cfg = client
    found = invitation(store)
    assert http.get(f"/api/meetings/{found}/prep").json()["changes"] == []
    keep(store, found, cancelled=True)
    assert kinds(http.get(f"/api/meetings/{found}/prep").json()) == ["cancelled"]
    view = store.read()
    later = datetime.now(UTC) + timedelta(days=cfg.steward.meetings.changes_days + 1)
    assert invitation_history.changes_since(view, view.get("event", found), UTC, later) is None


def test_an_entry_that_is_not_an_invitation_or_was_changed_by_the_person_shows_no_changes(client):
    http, store, _ = client
    own = invitation(store, invitation=False, key="k-own")
    keep(store, own, cancelled=True)
    edited = invitation(store, key="k-edited")
    keep(store, edited, _TEST, title="Renamed by the person")
    body = http.get(f"/api/meetings/{edited}/prep").json()
    assert http.get(f"/api/meetings/{own}/prep").json()["changes"] == [] and body["changes"] == []


def test_the_brief_and_the_page_read_the_same_history_so_a_change_the_brief_names_is_on_the_page(client):
    http, store, _ = client
    found = invitation(store)
    keep(store, found, where="Room 9")
    rows = invitation_history.calendar_rows(store.read())[found]
    assert [r["field"] for r in rows if r["version"] > 1] == ["where"]
    assert kinds(http.get(f"/api/meetings/{found}/prep").json()) == ["location_changed"]


def test_the_stored_history_is_unchanged_by_reading_it(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "UTC"})
    store = Store(ws.db_path, cfg=cfg)
    try:
        found = invitation(store)
        keep(store, found, cancelled=True)
        before = store.read().get("event", found).version
        view = store.read()
        invitation_history.changes_since(view, view.get("event", found), UTC, datetime.now(UTC) - timedelta(days=1))
        assert store.read().get("event", found).version == before
    finally:
        store.close()

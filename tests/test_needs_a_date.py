"""To-dos with no date get one (design 7.5, 7.7, P112): the To-dos screen's "Needs a date" group lists the open undated
to-dos the person owns or has told someone about, a date picked there is the person's own change with Undo, and Today
has one line, only for undated to-dos added in the last `steward.dates.undated_line_days` days. Names, ids and days come
from the fixtures."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine.applier import apply_as_person
from engine.dispatcher import undo_changeset
from engine.open_items import open_actions, undated_new_actions
from engine.storage import Store, WriteContext
from engine.today_queue import queue
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records

TOKEN = "needs-a-date-token"
NOW = datetime(2026, 10, 14, 14, 0, tzinfo=UTC)
TODAY = NOW.date()
_PM = WriteContext(actor="pm", trust="trusted", op="test.needs_a_date")
PEOPLE = fixture_records(DEMO_B, "person")
ME = PEOPLE[0]["id"]
OTHER = PEOPLE[1]["id"]
PROJECT = fixture_records(DEMO_B, "project")[0]["id"]


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()


@pytest.fixture
def api(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"server.base_path": "/", "storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui")
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        yield client, app.state.store


def add(store, text, *, owners=(ME,), age_days=0, **more) -> str:
    data = {"text": text, "owners": [{"person": p} for p in owners], "project": PROJECT, **more}
    with store.transaction() as tx:
        made = tx.create("action", data, _PM).id
    when = (NOW - timedelta(days=age_days)).isoformat(timespec="seconds")
    with store.transaction() as tx:
        tx.sql("UPDATE ledger SET at=? WHERE kind=? AND record_id=?", (when, "action", made))
    return made


def needing(store, cfg) -> set[str]:
    return {r.id for r in open_actions(store, cfg, TODAY, now=NOW) if r.needs_date}


def test_the_group_is_the_open_undated_to_dos_the_person_owns_or_told_someone_about(env):
    _, cfg, store = env
    own = add(store, "Tidy the style sheet")
    told = add(store, "Fix the cover file", owners=(OTHER,), told={OTHER: TODAY.isoformat()})
    elsewhere = add(store, "Check the index", owners=(OTHER,))
    dated = add(store, "Send the proof", due=(TODAY + timedelta(days=3)).isoformat())
    paused = add(store, "Wait on the printer", on_hold={"waiting_for": "the printer", "since": TODAY.isoformat()})
    reply = add(store, "Reply to the printer", reply_owed=True)
    found = needing(store, cfg)
    assert {own, told} <= found
    assert not ({elsewhere, dated, paused, reply} & found)


def test_a_date_picked_in_the_group_is_the_persons_own_change_with_undo_and_takes_it_out_of_the_group(env):
    _, cfg, store = env
    todo = add(store, "Tidy the style sheet")
    assert todo in needing(store, cfg)
    version = store.read().get("action", todo).version
    day = (TODAY + timedelta(days=2)).isoformat()
    made = apply_as_person(
        store,
        cfg,
        [
            {
                "op": "record.edit",
                "record": {"kind": "action", "id": todo},
                "fields": {"due": day, "due_words": None, "due_check": False},
                "read_version": version,
            }
        ],
        "Changed on screen",
    )
    assert store.read().get("action", todo).data["due"] == day and todo not in needing(store, cfg)
    undo_changeset(store, made)
    assert store.read().get("action", todo).data["due"] is None and todo in needing(store, cfg)


def test_the_open_items_route_marks_each_row_that_needs_a_date(api):
    client, store = api
    own = add(store, "Tidy the style sheet")
    dated = add(store, "Send the proof", due="2026-12-01")
    rows = {a["id"]: a for a in client.get("/api/open-items").json()["actions"]}
    assert rows[own]["needs_date"] is True and rows[dated]["needs_date"] is False


def test_today_has_one_line_for_the_undated_to_dos_added_lately_and_none_for_older_or_dated_ones(env):
    ws, cfg, store = env
    new = [add(store, "Tidy the style sheet", age_days=1), add(store, "Sort the old proofs", age_days=3)]
    add(store, "Rewrite the back cover", age_days=cfg.steward.dates.undated_line_days + 2)  # the stale rule's, not this
    add(store, "Send the proof", age_days=1, due=(TODAY + timedelta(days=3)).isoformat())
    lines = [line for line in queue(ws, store, cfg, NOW) if line.kind == "needs_date"]
    assert len(lines) == 1
    (line,) = lines
    assert (line.group, line.key) == ("review", "needs_date")
    own_new = {r.id for r in undated_new_actions(store, cfg, NOW)}
    assert set(new) <= own_new and set(line.actions) == own_new and line.count == len(own_new)


def test_the_line_goes_once_the_to_dos_have_dates_or_are_old_and_zero_days_turns_it_off(env):
    ws, cfg, store = env
    todo = add(store, "Tidy the style sheet", age_days=1)

    def lines():
        return [line for line in queue(ws, store, cfg, NOW) if line.kind == "needs_date"]

    assert todo in lines()[0].actions
    cfg.steward.dates.undated_line_days = 0
    assert lines() == []
    cfg.steward.dates.undated_line_days = 7
    with store.transaction() as tx:
        found = tx.get("action", todo)
        tx.update("action", todo, {"due": (TODAY + timedelta(days=4)).isoformat()}, _PM, read_version=found.version)
    assert all(todo not in line.actions for line in lines())
    # A week and a day on, what was added then is the stale rule's, not this line's.
    assert undated_new_actions(store, cfg, NOW + timedelta(days=30)) == []

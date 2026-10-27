"""Handled for you, retention and what a rule closed (design 7.20; P58): mail stays listed for
`watch.handled_keep_days` and then leaves the list with no record changed, and what a rule closed joins the set-aside
mail on the first tab (the closes nobody has seen are under the second), each row saying what kind of item it is and
keeping its choices. Names come from the fixtures."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
import yaml
from fastapi.testclient import TestClient

from api.app import create_app
from engine import handled
from engine.config import load_config
from engine.set_aside import set_aside_item
from engine.storage import Store, WriteContext
from engine.watch import refresh
from tests.test_handled import COLLEAGUE, SHOP_LIST, promo, read_with_nothing, subject_of
from tests.test_set_aside import mail, make
from tests.test_silent_closes import closed_by_a_rule, from_input, question, question_drop

NOW = datetime.now(UTC).replace(microsecond=0)
_ENGINE = WriteContext(actor="engine", trust="trusted", op="test")


def client_for(ws, cfg):
    app = create_app(ws, cfg, "t", start_worker=False)
    client = TestClient(app, headers={"Authorization": "Bearer t"})
    return client, cfg.server.base_path.rstrip("/") + "/api"


def aged(tmp_path, days, **watch):
    """A workspace that set one promotion aside and read one mail with nothing to do, `days` before now."""
    then = NOW - timedelta(days=days)
    items = [promo("sale-a", SHOP_LIST, 1), mail("lunch", COLLEAGUE, subject="Lunch is moved", hours=2)]
    ws, cfg, store = make(tmp_path, items, **watch)
    result = refresh(ws, store, cfg, "m", then)
    read_with_nothing(ws, cfg, store, [r for r in result.new if subject_of(store, r) == "Lunch is moved"])
    return ws, cfg, store, then


# ---- retention -----------------------------------------------------------------------------------------------------


def test_mail_stays_listed_for_the_keep_days_then_leaves_both_lists_and_no_record_changes(tmp_path):
    ws, cfg, store, then = aged(tmp_path, 0)
    try:
        assert cfg.watch.handled_keep_days == 30
        before = (
            {(r.id, r.version) for kind in ("snapshot", "request", "source") for r in store.read().list(kind)},
            len(store.read().ledger()),
        )
        day_29 = handled.listing(ws, store, cfg, "set_aside", "reason", "", NOW + timedelta(days=29))
        assert day_29["counts"] == {"set_aside": 1, "read": 1} and day_29["kept_days"] == 30
        day_31 = handled.listing(ws, store, cfg, "set_aside", "reason", "", NOW + timedelta(days=31))
        assert day_31["counts"] == {"set_aside": 0, "read": 0} and day_31["groups"] == []
        assert handled.listing(ws, store, cfg, "read", "reason", "", NOW + timedelta(days=31))["groups"] == []
        after = (
            {(r.id, r.version) for kind in ("snapshot", "request", "source") for r in store.read().list(kind)},
            len(store.read().ledger()),
        )
        assert after == before, "leaving the list writes nothing, so the ledger and Undo are whole"
        (snap,) = [s for s in store.read().list("snapshot") if s.data.get("set_aside")]
        assert not snap.data["deleted"] and snap.data["title"], "the app's copy is kept"
    finally:
        store.close()


def test_the_keep_days_setting_decides_how_long(tmp_path):
    ws, cfg, store, then = aged(tmp_path, 0, handled_keep_days=7)
    try:
        assert cfg.watch.handled_keep_days == 7
        assert handled.listing(ws, store, cfg, "read", "reason", "", NOW + timedelta(days=6))["counts"]["read"] == 1
        late = handled.listing(ws, store, cfg, "read", "reason", "", NOW + timedelta(days=8))
        assert late["counts"] == {"set_aside": 0, "read": 0} and late["kept_days"] == 7
    finally:
        store.close()


def test_mail_the_person_sets_aside_by_hand_is_kept_from_that_day_not_from_when_it_arrived(tmp_path):
    ws, cfg, store = make(tmp_path, [mail("lunch", COLLEAGUE, subject="Lunch is moved", hours=2)])
    try:
        long_ago = NOW - timedelta(days=60)
        refresh(ws, store, cfg, "m", long_ago)
        (snap,) = store.read().list("snapshot")
        set_aside_item(store, snap.id, "sales", now=NOW)
        shown = handled.listing(ws, store, cfg, "set_aside", "reason", "", NOW + timedelta(days=1))
        assert [i["title"] for g in shown["groups"] for i in g["items"]] == ["Lunch is moved"]
        gone = handled.listing(ws, store, cfg, "set_aside", "reason", "", NOW + timedelta(days=31))
        assert gone["groups"] == []
    finally:
        store.close()


def test_the_api_lists_nothing_older_than_the_keep_days_and_says_how_long_mail_is_kept(tmp_path):
    ws, cfg, store, then = aged(tmp_path, 40)
    store.close()
    client, api = client_for(ws, cfg)
    for tab in ("set_aside", "read"):
        body = client.get(f"{api}/handled", params={"tab": tab}).json()
        assert body["groups"] == [] and body["kept_days"] == 30
        assert body["counts"] == {"set_aside": 0, "read": 0}
    fresh_ws, fresh_cfg, fresh_store, _ = aged(tmp_path / "fresh", 2)
    fresh_store.close()
    client, api = client_for(fresh_ws, fresh_cfg)
    assert client.get(f"{api}/handled").json()["counts"] == {"set_aside": 1, "read": 1}


def test_the_keep_days_setting_refuses_zero(tmp_path):
    ws, cfg, store = make(tmp_path, [promo("sale-a", SHOP_LIST, 1)])
    store.close()
    current = yaml.safe_load((ws.config_dir / "watch.yaml").read_text())
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump({**current, "handled_keep_days": 0}))
    with pytest.raises(Exception, match="handled_keep_days"):
        load_config(ws.config_dir, env={})


# ---- the closed by a rule list -------------------------------------------------------------------------------------


def closed_view(client, api, **params):
    shown = client.get(f"{api}/handled", params={"tab": "set_aside", "group": "reason", **params})
    assert shown.status_code == 200, shown.text
    return shown.json()


def closed_rows(view):
    """The rows of the set-aside tab that a rule closed (the tab also holds the mail set aside)."""
    return [i for g in view["groups"] for i in g["items"] if i["tab"] == "closed"]


def test_a_change_a_rule_closed_is_a_row_with_its_rule_its_reason_and_its_kind_of_item(tmp_path):
    ws, cfg, store, request = closed_by_a_rule(tmp_path)
    store.close()
    client, api = client_for(ws, cfg)
    view = closed_view(client, api)
    (row,) = closed_rows(view)
    assert row["id"] == row["request"] == request and row["tab"] == "closed"
    assert row["rule"] == "Spacing" and row["change"] == "changed" and row["reason"]
    assert row["item"] == "other", "the test source is neither mail, a file nor a page"
    (group,) = view["groups"]
    assert group["key"] == group["label"] == row["reason"] and group["count"] == 1
    assert view["counts"] == {"set_aside": 1, "read": 0}
    assert view["kinds"] == [{"item": "other", "count": 1}]
    assert client.get(f"{api}/handled/counts").json() == {**view["counts"], "today": 0}


@pytest.mark.parametrize(
    ("connector", "item"), [("mailbox", "mail"), ("calendar", "calendar"), ("folder", "file"), ("feed", "page")]
)
def test_a_close_says_what_kind_of_item_its_source_reads_and_the_list_narrows_by_it(tmp_path, connector, item):
    ws, cfg, store, request = closed_by_a_rule(tmp_path)
    store.close()
    current = yaml.safe_load((ws.config_dir / "watch.yaml").read_text())
    current["sources"] = [{**current["sources"][0], "connector": connector, "settings": {}}]
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump(current))
    client, api = client_for(ws, load_config(ws.config_dir, env={}))
    assert [r["item"] for r in closed_rows(closed_view(client, api))] == [item]
    assert [r["item"] for r in closed_rows(closed_view(client, api, item=item))] == [item]
    other = "other" if item != "other" else "mail"
    assert closed_rows(closed_view(client, api, item=other)) == []


def test_a_source_that_is_gone_from_the_settings_gives_other_and_a_set_aside_close_is_mail():
    from types import SimpleNamespace

    from engine import closes

    cfg = SimpleNamespace(watch=SimpleNamespace(sources=[SimpleNamespace(id="s", connector="feed")]))
    said: dict[str, str | None] = {}
    assert handled.item_kind_of(cfg, said, "s") == "page"
    assert handled.item_kind_of(cfg, said, "gone") == "other" and handled.item_kind_of(cfg, said, None) == "other"
    close = closes.Close(ref="snapshot:SNAP-1", kind="set_aside", how="set_aside", title="t", when="", why="")
    assert handled.item_of_close(SimpleNamespace(), cfg, said, close) == "mail"
    action = closes.Close(
        ref="changeset:CS-1:0", kind="assistant", how="closed", title="t", when="", why="", record=("action", "ACT-1")
    )
    assert handled.item_of_close(SimpleNamespace(), cfg, said, action) == "action"


def test_take_a_closer_look_hands_it_in_records_a_signal_and_leaves_the_list_and_undo_closes_it_again(tmp_path):
    ws, cfg, store, request = closed_by_a_rule(tmp_path)
    store.close()
    client, api = client_for(ws, cfg)
    (row,) = closed_rows(closed_view(client, api))
    done = client.post(f"{api}/requests/{row['id']}/closer-look", json={"read_version": row["version"]})
    assert done.status_code == 200, done.text
    after = closed_view(client, api)
    assert after["groups"] == [] and after["counts"]["set_aside"] == 0
    again = Store(ws.db_path)
    try:
        assert again.read().get("request", request).data["state"] == "queued"
        (signal,) = [s.data for s in again.read().list("signal") if s.data["kind"] == "pulled_back"]
        assert signal["refs"] == [request] and "Spacing" in signal["note"]
    finally:
        again.close()
    undone = client.post(f"{api}/requests/{request}/closer-look/undo")
    assert undone.status_code == 200, undone.text
    (back,) = closed_rows(closed_view(client, api))
    assert back["id"] == request and back["rule"] == row["rule"] and back["reason"] == row["reason"]
    assert client.post(f"{api}/requests/{request}/closer-look/undo").status_code == 404, "nothing left to undo"


def test_undo_of_take_a_closer_look_is_refused_once_the_assistant_has_started(tmp_path):
    ws, cfg, store, request = closed_by_a_rule(tmp_path)
    store.close()
    client, api = client_for(ws, cfg)
    (row,) = closed_rows(closed_view(client, api))
    client.post(f"{api}/requests/{row['id']}/closer-look", json={"read_version": row["version"]})
    started = Store(ws.db_path)
    try:
        with started.transaction() as tx:
            waiting = tx.get("request", request)
            tx.update("request", request, {"state": "running"}, _ENGINE, read_version=waiting.version)
    finally:
        started.close()
    refused = client.post(f"{api}/requests/{request}/closer-look/undo")
    assert refused.status_code == 409 and "started" in refused.json()["detail"]
    assert client.post(f"{api}/requests/REQ-999/closer-look/undo").status_code == 404


def test_looks_right_marks_a_rules_close_as_seen_and_the_row_stays(tmp_path):
    ws, cfg, store, request = closed_by_a_rule(tmp_path)
    store.close()
    client, api = client_for(ws, cfg)
    assert client.post(f"{api}/silent-closes/seen", json={"ref": f"request:{request}"}).status_code == 200
    assert [r["id"] for r in closed_rows(closed_view(client, api))] == [request]
    assert client.get(f"{api}/silent-closes").json()["count"] == 0


def test_the_assistants_own_unseen_closes_stay_on_their_own_route_with_the_kind_of_item(tmp_path):
    ws, cfg, store, request = closed_by_a_rule(tmp_path)
    cs_id, _ = from_input(store, cfg, [question_drop(question(store))])
    store.close()
    client, api = client_for(ws, cfg)
    by_kind = {c["kind"]: c for c in client.get(f"{api}/silent-closes").json()["closes"]}
    assert by_kind["assistant"]["item"] == "question" and by_kind["assistant"]["changeset"] == cs_id
    assert closed_view(client, api)["counts"]["set_aside"] == 1, "only a rule's closes are rows on this list"


def test_the_set_aside_tab_lists_both_a_set_aside_mail_and_a_file_a_rule_closed_and_the_old_tab_name_reads_as_it(
    tmp_path,
):
    from tests.test_watch import reread

    ws, cfg, store, request = closed_by_a_rule(tmp_path)
    plan = {"key": "a", "title": "Plan", "text": "One  budget"}
    cfg, store, _ = reread(
        tmp_path,
        ws,
        store,
        [plan, mail("sale", SHOP_LIST, bulk=True, subject="Sale of the week", body="Our budget range.")],
    )
    store.close()
    current = yaml.safe_load((ws.config_dir / "watch.yaml").read_text())
    current["sources"] = [{**current["sources"][0], "connector": "folder", "settings": {}}]
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump(current))
    client, api = client_for(ws, load_config(ws.config_dir, env={}))
    body = closed_view(client, api)
    rows = [i for g in body["groups"] for i in g["items"]]
    assert {(r["tab"], r["item"]) for r in rows} == {("set_aside", "mail"), ("closed", "file")}
    assert body["counts"] == {"set_aside": 2, "read": 0} and body["tab"] == "set_aside"
    assert {k["item"] for k in body["kinds"]} == {"mail", "file"}
    mail_row = next(r for r in rows if r["item"] == "mail")
    file_row = next(r for r in rows if r["item"] == "file")
    assert mail_row["reason"] and mail_row["rule"] is None, "each row keeps its own reason"
    assert file_row["rule"] == "Spacing" and file_row["request"] == request
    old = client.get(f"{api}/handled", params={"tab": "closed"}).json()
    assert old["tab"] == "set_aside" and old["counts"] == body["counts"]
    assert {i["id"] for g in old["groups"] for i in g["items"]} == {r["id"] for r in rows}
    by_kind = client.get(f"{api}/handled", params={"tab": "set_aside", "group": "kind"}).json()
    keys = [g["key"] for g in by_kind["groups"]]
    assert by_kind["group"] == "kind" and len(keys) == len(set(keys)) and set(keys) == {"kind:sales", "item:file"}


def test_a_rule_close_leaves_the_list_after_the_keep_days_too(tmp_path):
    ws, cfg, store, request = closed_by_a_rule(tmp_path)
    try:
        created = datetime.fromisoformat(str(store.read().get("request", request).data["created_at"]))
        assert handled.counts(ws, store, cfg, created + timedelta(days=29))["set_aside"] == 1
        assert handled.counts(ws, store, cfg, created + timedelta(days=31))["set_aside"] == 0
    finally:
        store.close()


def test_the_server_names_the_page_size_every_list_shows_before_show_more(tmp_path):
    ws, cfg, store, then = aged(tmp_path, 0)
    store.close()
    client, api = client_for(ws, cfg)
    assert closed_view(client, api)["page_rows"] == cfg.ui.handled_rows_shown

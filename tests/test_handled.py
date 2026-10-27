"""Handled for you (design 7.20; P45, P46, P47): what was set aside before it was read (mail, and changes a rule
closed) and mail read with nothing to do are two lists on one screen; an item is in one of them at most; rows are
grouped by kind, by reason or by sender, newest first, and searched; every row offers Treat as personal, Treat as work
and Always set aside mail like this, each recording a signal, and Treat as work or personal can be undone. There is
no Keep set aside. Senders are made up."""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine import sides
from engine.ai.adapters.stub import set_responder
from engine.ai.router import Router
from engine.dispatcher import process
from engine.watch import refresh
from tests.test_pipeline import answers
from tests.test_set_aside import mail, make, requests_in

NOW = datetime.now(UTC).replace(microsecond=0)
CODES = "no-reply@codes.example.com"
SHOP_LIST = "offers@lists.example.com"
SHOP_LIST_TWO = "deals@promos.example.com"
COLLEAGUE = "colleague@work.example.com"
POWER = "billing@power.example.com"


@pytest.fixture(autouse=True)
def _reset():
    yield
    set_responder(None)


def code_mail(n):
    return mail(
        f"code-{n}", CODES, subject="Your verification code", body=f"Your verification code is 48291{n}.", hours=n
    )


def promo(key, sender, hours):
    return mail(key, sender, bulk=True, subject=f"Sale {key}", hours=hours)


def read_with_nothing(ws, cfg, store, request_ids):
    """The assistant reads each request and finds nothing to record, so each closes by itself."""
    answers({"summary": "Nothing needs recording.", "ops": []})
    for request in request_ids:
        process(ws, store, cfg, Router(cfg, store, env={}), request, now=NOW)


def subject_of(store, request_id):
    """The subject the request's saved message carries."""
    request = store.read().get("request", request_id)
    return store.read().get("source", request.data["source"]).data["title"]


def start(tmp_path, items, read=(), **watch):
    """A workspace that has read `items`: the set-aside ones are marked, and the assistant has read the mail whose
    subject is in `read` with nothing to do. Returns the app's pieces."""
    ws, cfg, store = make(tmp_path, items, **watch)
    result = refresh(ws, store, cfg, "m", NOW)
    read_with_nothing(ws, cfg, store, [r for r in result.new if subject_of(store, r) in read])
    if sides.personal_project(store.read(), cfg) is None:
        sides.make_personal(store, cfg)
    store.close()
    created = create_app(ws, cfg, "t", start_worker=False)
    client = TestClient(created)
    client.headers["Authorization"] = "Bearer t"
    return ws, cfg, created.state.store, client, cfg.server.base_path.rstrip("/") + "/api"


@pytest.fixture
def app(tmp_path):
    items = [
        code_mail(1),
        promo("sale-a", SHOP_LIST, 2),
        promo("sale-b", SHOP_LIST, 3),
        promo("sale-c", SHOP_LIST_TWO, 4),
        mail("lunch", COLLEAGUE, subject="Lunch is moved", body="Lunch moves to one o'clock.", hours=5),
        mail("statement", POWER, subject="Your statement is ready", body="Amount due 64.20 by the 12th.", hours=6),
    ]
    ws, cfg, store, client, base = start(tmp_path, items, read=("Lunch is moved", "Your statement is ready"))
    yield ws, cfg, store, client, base
    store.close()


def ids(view, tab=None):
    return {i["id"] for g in view["groups"] for i in g["items"] if tab is None or i["tab"] == tab}


def titles(view):
    return [i["title"] for g in view["groups"] for i in g["items"]]


def get(client, base, **params):
    shown = client.get(f"{base}/handled", params=params)
    assert shown.status_code == 200, shown.text
    return shown.json()


def row(view, title):
    return next(i for g in view["groups"] for i in g["items"] if i["title"] == title)


def test_the_two_lists_hold_different_mail_and_no_mail_is_in_both(app):
    ws, cfg, store, client, base = app
    aside, read = get(client, base, tab="set_aside"), get(client, base, tab="read")
    assert aside["counts"] == read["counts"] == {"set_aside": 4, "read": 2}
    assert {i["tab"] for g in aside["groups"] for i in g["items"]} == {"set_aside"}
    assert {i["tab"] for g in read["groups"] for i in g["items"]} == {"read"}
    assert not (ids(aside) & ids(read))
    assert sorted(titles(read)) == ["Lunch is moved", "Your statement is ready"]
    # The folder's own list and the first tab agree, and neither holds the read mail.
    folder = {i["id"] for i in client.get(f"{base}/set-aside").json()["items"]}
    assert folder == ids(aside)


def test_rows_are_grouped_by_kind_by_default_with_unique_keys_a_count_and_newest_first(app):
    ws, cfg, store, client, base = app
    view = get(client, base, tab="set_aside")
    assert view["group"] == "kind"
    keys = [g["key"] for g in view["groups"]]
    assert len(keys) == len(set(keys)) and set(keys) == {"kind:sales", "kind:notices"}
    assert all(g["label"] is None for g in view["groups"]), "the screen words a kind"
    by_key = {g["key"]: g for g in view["groups"]}
    sales = by_key["kind:sales"]
    assert sales["count"] == 3 and [i["title"] for i in sales["items"]] == ["Sale sale-a", "Sale sale-b", "Sale sale-c"]
    assert [i["title"] for i in by_key["kind:notices"]["items"]] == ["Your verification code"]
    # Groups are ordered by their newest row: the code mail is newer than all the bulk mail.
    assert keys == ["kind:notices", "kind:sales"]
    read = get(client, base, tab="read")
    assert read["group"] == "kind" and {g["key"] for g in read["groups"]} == {"kind:bills", "kind:other"}


def test_grouped_by_reason_each_group_is_named_by_its_words_and_a_read_mail_falls_back_to_its_kind(app):
    ws, cfg, store, client, base = app
    view = get(client, base, tab="set_aside", group="reason")
    assert view["group"] == "reason"
    assert all(g["key"] == g["label"] and g["key"] for g in view["groups"]), "a reason group is named by its words"
    by_reason = {g["key"]: g for g in view["groups"]}
    bulk = next(g for g in view["groups"] if any(i["title"] == "Sale sale-a" for i in g["items"]))
    assert bulk["count"] == 3 and [i["title"] for i in bulk["items"]] == ["Sale sale-a", "Sale sale-b", "Sale sale-c"]
    other = next(g for g in view["groups"] if g is not bulk)
    assert [i["title"] for i in other["items"]] == ["Your verification code"] and len(by_reason) == 2
    assert view["groups"] == [other, bulk]
    read = get(client, base, tab="read", group="reason")
    assert {g["key"] for g in read["groups"]} == {"kind:bills", "kind:other"}, "a mail read has no reason, so its kind"
    assert all(g["label"] is None for g in read["groups"]), "the screen words a kind"


def test_every_row_says_what_kind_of_item_it_is_and_the_list_names_the_kinds_it_holds(app):
    ws, cfg, store, client, base = app
    view = get(client, base, tab="set_aside")
    assert {i["item"] for g in view["groups"] for i in g["items"]} == {"mail"}
    assert view["kinds"] == [{"item": "mail", "count": 4}]
    assert get(client, base, tab="set_aside", item="mail")["counts"]["set_aside"] == 4
    assert get(client, base, tab="set_aside", item="file")["groups"] == []
    assert get(client, base, tab="set_aside", item="file")["kinds"] == [{"item": "mail", "count": 4}], (
        "the filter stays"
    )
    assert view["page_rows"] == cfg.ui.handled_rows_shown == 25


def test_the_other_grouping_is_by_sender(app):
    ws, cfg, store, client, base = app
    view = get(client, base, tab="set_aside", group="sender")
    assert view["group"] == "sender"
    by_sender = {g["key"]: g for g in view["groups"]}
    assert by_sender[SHOP_LIST]["count"] == 2 and by_sender[SHOP_LIST_TWO]["count"] == 1
    assert by_sender[SHOP_LIST]["label"] == "Someone", "the sender's name as the message gave it"
    assert [i["title"] for i in by_sender[SHOP_LIST]["items"]] == ["Sale sale-a", "Sale sale-b"]


def test_the_settings_grouping_applies_when_none_is_asked_for(tmp_path):
    ws, cfg, store, client, base = start(tmp_path, [promo("one", SHOP_LIST, 1)])
    try:
        assert get(client, base)["group"] == "kind"
        (ws.config_dir / "ui.yaml").write_text("version: 1\nhandled_group: sender\n")
        assert get(client, base)["group"] == "sender"
        assert get(client, base, group="reason")["group"] == "reason"
        (ws.config_dir / "ui.yaml").write_text("version: 1\nhandled_group: reason\n")
        assert get(client, base)["group"] == "reason"
    finally:
        store.close()


def test_a_search_narrows_by_sender_subject_and_kind_and_leaves_the_counts_alone(app):
    ws, cfg, store, client, base = app
    assert titles(get(client, base, tab="set_aside", q="sale-b")) == ["Sale sale-b"]
    assert len(titles(get(client, base, tab="set_aside", q="PROMOS.example"))) == 1, "an address, in any case"
    assert len(titles(get(client, base, tab="set_aside", q="sales"))) == 3, "a kind"
    assert len(titles(get(client, base, tab="set_aside", q="sale zebra"))) == 0, "every word must be found"
    none = get(client, base, tab="read", q="no such words")
    assert none["groups"] == [] and none["counts"] == {"set_aside": 4, "read": 2}
    assert titles(get(client, base, tab="read", q="bills")) == ["Your statement is ready"]
    assert len(titles(get(client, base, tab="set_aside", q="mailing list"))) == 3, "a reason"


def test_each_row_carries_what_its_choices_need(app):
    ws, cfg, store, client, base = app
    aside = row(get(client, base, tab="set_aside"), "Sale sale-a")
    assert aside["address"] == SHOP_LIST and aside["reason"] and aside["section"] == "sales"
    assert "link" in aside and aside["domain"] == "lists.example.com"
    read = row(get(client, base, tab="read"), "Lunch is moved")
    assert read["reason"] is None and read["request"] and read["saved"]
    assert read["section"] == cfg.watch.handled_rule_section == "notices"


def test_a_personal_message_from_a_friend_is_not_on_the_set_aside_tab_and_is_filed_under_personal(tmp_path):
    from tests.test_mail_sorting import Account

    friend = mail("hello", "friend@club.example.com", subject="Dinner on Friday", body="Are you free for dinner?")
    set_responder(Account(answers={"Dinner on Friday": "personal", "Sale sale-a": "sales"}))
    ws, cfg, store, client, base = start(tmp_path, [friend, promo("sale-a", SHOP_LIST, 2)], sorting="ai")
    try:
        aside = get(client, base, tab="set_aside")
        assert titles(aside) == ["Sale sale-a"] and aside["counts"] == {"set_aside": 1, "read": 0}
        assert "Dinner on Friday" not in titles(get(client, base, tab="read"))
        (made,) = [
            r
            for r in requests_in(store, "queued")
            if store.read().get("source", r.data["source"]).data["title"] == "Dinner on Friday"
        ]
        assert made.data["project"] == sides.personal_project(store.read(), cfg)
    finally:
        store.close()


def test_a_message_an_earlier_version_set_aside_as_personal_still_lists_and_offers_both_treat_choices(app):
    from engine.set_aside import set_aside_item

    ws, cfg, store, client, base = app
    item = row(get(client, base, tab="set_aside"), "Sale sale-a")
    set_aside_item(store, item["id"], "personal")
    old = row(get(client, base, tab="set_aside"), "Sale sale-a")
    assert old["kind"] == "personal" and old["section"] == cfg.watch.handled_rule_section, "a rule can't be personal"
    assert "kind:personal" in {g["key"] for g in get(client, base, tab="set_aside")["groups"]}
    done = client.post(f"{base}/handled/{old['id']}/personal", json={"read_version": old["version"]})
    assert done.status_code == 200, done.text
    assert store.read().get("request", done.json()["request"]).data["project"] == sides.personal_project(
        store.read(), cfg
    )
    other = row(get(client, base, tab="set_aside"), "Sale sale-b")
    set_aside_item(store, other["id"], "personal")
    again = row(get(client, base, tab="set_aside"), "Sale sale-b")
    assert client.post(f"{base}/handled/{again['id']}/work", json={"read_version": again["version"]}).status_code == 200


def test_treat_as_work_on_set_aside_mail_hands_it_in_records_a_signal_and_undo_sets_it_aside_again(app):
    ws, cfg, store, client, base = app
    item = row(get(client, base, tab="set_aside"), "Sale sale-a")
    stale = client.post(f"{base}/handled/{item['id']}/work", json={"read_version": item["version"] + 9})
    assert stale.status_code == 409
    done = client.post(f"{base}/handled/{item['id']}/work", json={"read_version": item["version"]})
    assert done.status_code == 200, done.text
    assert done.json()["request"] in {r.id for r in requests_in(store, "queued")}
    signals = [s.data for s in store.read().list("signal") if s.data["kind"] == "pulled_back"]
    assert len(signals) == 1 and "Set aside" in signals[0]["note"]
    view = get(client, base, tab="set_aside")
    assert item["id"] not in ids(view) and view["counts"]["set_aside"] == 3
    back = client.post(f"{base}/mail/{item['id']}/set-aside", json={"section": item["section"]})
    assert back.status_code == 200
    assert item["id"] in ids(get(client, base, tab="set_aside"))


def test_treat_as_personal_on_set_aside_mail_files_it_under_the_personal_project(app):
    ws, cfg, store, client, base = app
    item = row(get(client, base, tab="set_aside"), "Sale sale-b")
    done = client.post(f"{base}/handled/{item['id']}/personal", json={"read_version": item["version"]})
    assert done.status_code == 200, done.text
    request = store.read().get("request", done.json()["request"])
    assert request.data["project"] == sides.personal_project(store.read(), cfg)
    signals = [s.data for s in store.read().list("signal") if s.data["kind"] == "pulled_back"]
    assert len(signals) == 1 and "treated as personal" in signals[0]["note"]


def test_treat_as_a_side_files_the_hand_in_under_that_side_on_either_list_and_refuses_what_is_not_a_side(app):
    from tests.test_sides import BUSINESS_NAME

    ws, cfg, store, client, base = app
    side = sides.set_business(ws, store, cfg, BUSINESS_NAME, kind="business").project
    item = row(get(client, base, tab="set_aside"), "Sale sale-a")
    refused = client.post(
        f"{base}/handled/{item['id']}/work", json={"read_version": item["version"], "side": "PRJ-404"}
    )
    assert refused.status_code == 409 and "isn't one of your sides" in refused.json()["detail"]
    done = client.post(f"{base}/handled/{item['id']}/work", json={"read_version": item["version"], "side": side})
    assert done.status_code == 200, done.text
    assert store.read().get("request", done.json()["request"]).data["project"] == side
    read = row(get(client, base, tab="read"), "Lunch is moved")
    again = client.post(f"{base}/handled/{read['id']}/work", json={"read_version": read["version"], "side": side})
    assert again.status_code == 200, again.text
    assert store.read().get("request", again.json()["request"]).data["project"] == side
    # With no side named, nothing is filed by the choice itself.
    plain = row(get(client, base, tab="set_aside"), "Sale sale-b")
    made = client.post(f"{base}/handled/{plain['id']}/work", json={"read_version": plain["version"]})
    assert not store.read().get("request", made.json()["request"]).data.get("project")


def test_a_row_carries_the_one_side_its_source_serves_and_the_side_filter_narrows_the_lists_and_counts(app):
    import yaml

    from tests.test_sides import BUSINESS_NAME

    ws, cfg, store, client, base = app
    side = sides.set_business(ws, store, cfg, BUSINESS_NAME, kind="business").project
    personal = sides.personal_project(store.read(), cfg)
    everything = get(client, base, tab="set_aside")
    assert {i["side"] for g in everything["groups"] for i in g["items"]} == {None}  # the source serves no side yet
    path = ws.config_dir / "watch.yaml"
    config = yaml.safe_load(path.read_text())
    config["sources"][0]["sides"] = [side]
    path.write_text(yaml.safe_dump(config))
    mine = get(client, base, tab="set_aside", side=side)
    assert titles(mine) == titles(everything) and {i["side"] for g in mine["groups"] for i in g["items"]} == {side}
    elsewhere = get(client, base, tab="set_aside", side=personal)
    assert titles(elsewhere) == [] and elsewhere["counts"] == {"set_aside": 0, "read": 0}
    # A source that serves two sides says neither, so its mail shows under every choice.
    config["sources"][0]["sides"] = [side, personal]
    path.write_text(yaml.safe_dump(config))
    both = get(client, base, tab="set_aside", side=personal)
    assert titles(both) == titles(everything) and {i["side"] for g in both["groups"] for i in g["items"]} == {None}


def test_treat_as_work_on_mail_read_with_nothing_to_do_reads_it_again_and_records_a_signal(app):
    ws, cfg, store, client, base = app
    item = row(get(client, base, tab="read"), "Lunch is moved")
    earlier = store.read().get("request", item["request"])
    done = client.post(f"{base}/handled/{item['id']}/work", json={"read_version": item["version"]})
    assert done.status_code == 200, done.text
    made = store.read().get("request", done.json()["request"])
    assert made.data["state"] == "queued" and made.id != earlier.id and not made.data.get("project")
    (signal,) = [s.data for s in store.read().list("signal") if s.data["kind"] == "pulled_back"]
    assert signal["refs"] == [earlier.id] and signal["changeset"] == earlier.data["changeset"]
    assert "nothing to do" in signal["note"]
    view = get(client, base, tab="read")
    assert item["id"] not in ids(view), "it is being read again, so it is not listed as read with nothing to do"
    assert view["counts"]["read"] == 1 and item["id"] not in ids(get(client, base, tab="set_aside"))


def test_treat_as_personal_on_mail_read_with_nothing_to_do_files_the_new_read_under_personal(app):
    ws, cfg, store, client, base = app
    item = row(get(client, base, tab="read"), "Your statement is ready")
    done = client.post(f"{base}/handled/{item['id']}/personal", json={"read_version": item["version"]})
    assert done.status_code == 200, done.text
    made = store.read().get("request", done.json()["request"])
    assert made.data["project"] == sides.personal_project(store.read(), cfg) and made.data["state"] == "queued"
    (signal,) = [s.data for s in store.read().list("signal") if s.data["kind"] == "pulled_back"]
    assert "treated as personal" in signal["note"]


def test_undo_takes_the_new_read_back_while_it_is_waiting_and_not_after_it_started(app):
    ws, cfg, store, client, base = app
    item = row(get(client, base, tab="read"), "Lunch is moved")
    done = client.post(f"{base}/handled/{item['id']}/work", json={"read_version": item["version"]}).json()
    undone = client.post(f"{base}/handled/{item['id']}/undo", json={"read_version": done["version"]})
    assert undone.status_code == 200, undone.text
    assert item["id"] in ids(get(client, base, tab="read")), "listed as read with nothing to do again"
    assert store.read().get("request", done["request"]).data["dismissed"] is True
    again = row(get(client, base, tab="read"), "Lunch is moved")
    second = client.post(f"{base}/handled/{item['id']}/work", json={"read_version": again["version"]}).json()
    with store.transaction() as tx:
        waiting = tx.get("request", second["request"])
        tx.update("request", waiting.id, {"state": "running"}, _engine(), read_version=waiting.version)
    refused = client.post(f"{base}/handled/{item['id']}/undo", json={"read_version": second["version"]})
    assert refused.status_code == 409 and "started" in refused.json()["detail"]


def _engine():
    from engine.storage import WriteContext

    return WriteContext(actor="engine", trust="trusted", op="test")


def test_a_choice_on_a_mail_that_is_in_neither_list_is_refused(app):
    ws, cfg, store, client, base = app
    item = row(get(client, base, tab="read"), "Lunch is moved")
    client.post(f"{base}/handled/{item['id']}/work", json={"read_version": item["version"]})
    again = client.post(f"{base}/handled/{item['id']}/work", json={"read_version": item["version"]})
    assert again.status_code == 409
    assert client.post(f"{base}/handled/NOPE/work", json={"read_version": 1}).status_code == 404


def test_always_set_aside_on_a_read_row_files_it_in_the_configured_section_and_records_a_signal(app):
    ws, cfg, store, client, base = app
    item = row(get(client, base, tab="read"), "Lunch is moved")
    fp = client.get(f"{base}/settings").json()["fingerprint"]
    body = {"fingerprint": fp, "choice": item["section"], "senders": [item["address"]], "mail": item["id"]}
    assert client.post(f"{base}/watch/sorting", json=body).status_code == 200
    (signal,) = [s.data for s in store.read().list("signal") if s.data["kind"] == "set_aside"]
    assert "Always" in signal["note"] and signal["refs"] == [item["id"]]


def test_there_is_no_keep_set_aside_choice_anywhere(app):
    ws, cfg, store, client, base = app
    item = row(get(client, base, tab="set_aside"), "Sale sale-a")
    for path in (
        f"set-aside/{item['id']}/confirm",
        f"set-aside/{item['id']}/keep",
        "set-aside/confirm",
        "handled/keep",
    ):
        assert client.post(f"{base}/{path}", json={}).status_code in (404, 405), path
    assert item["id"] in ids(get(client, base, tab="set_aside")), "leaving a mail where it is changes nothing"


def test_the_count_for_today_is_the_handled_mail_that_came_in_on_the_persons_day(app):
    from datetime import timedelta

    from engine import handled

    ws, cfg, store, client, base = app
    both = [r for tab in handled.TABS for r in handled.rows(ws, store, cfg, tab, NOW)]
    newest = max(datetime.fromisoformat(r["received"]) for r in both)
    day_of_it = handled.counts(ws, store, cfg, newest)
    assert 1 <= day_of_it["today"] <= day_of_it["set_aside"] + day_of_it["read"]
    # A few days on, the same mail is still listed but none of it came in today.
    later = handled.counts(ws, store, cfg, newest + timedelta(days=3))
    assert later["today"] == 0 and later["set_aside"] == day_of_it["set_aside"] and later["read"] == day_of_it["read"]
    shown = client.get(f"{base}/handled/counts").json()
    assert set(shown) == {"set_aside", "read", "today"}

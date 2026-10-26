"""Bills, orders and deliveries are tracked, never set aside (design 6.5, 6.32; P46): the rules know them from the
first sign-in with no setup, code and security mail goes to its own Automated notices section, tracked mail is filed
under the Personal project, and a set-aside row offers Treat as personal beside Treat as work. Senders are made up."""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine import sides
from engine.names import People
from engine.triage import classify
from engine.watch import refresh
from tests.test_set_aside import mail, make, requests_in
from tests.test_sides import base as base  # noqa: F401  (the fixtures)
from tests.test_sides import env as env  # noqa: F401
from tests.test_sides import new_op

NOW = datetime.now(UTC).replace(microsecond=0)
POWER = "billing@power.example.com"
SHOP = "orders@shop.example.com"
CARRIER = "tracking@parcels.example.com"
NOREPLY = "no-reply@accounts.example.com"

CASES = {
    "bill": mail("bill", POWER, subject="Your statement is ready", body="Amount due $64.20 by 2026-11-12."),
    "order": mail("order", SHOP, subject="Order confirmation", body="Thank you for your order. Order number 1234."),
    "shipping": mail(
        "ship", CARRIER, subject="Your order has shipped", body="Tracking number 9Z. Estimated delivery 2026-11-03."
    ),
    # A shop's order mail that carries a bulk header and a promotions category still is not sales mail.
    "bulky order": mail(
        "bulky", SHOP, bulk=True, categories=["promotions"], subject="Thank you for your order", body="Items."
    ),
}


def change(item):
    return {
        "source": "m",
        "key": item["key"],
        "title": item["title"],
        "now": item["text"],
        "author": item["author"],
        "message": item["message"],
    }


@pytest.mark.parametrize("name", list(CASES))
def test_a_bill_an_order_and_a_delivery_are_kept_with_the_assistant_whatever_else_the_mail_says(tmp_path, name):
    ws, cfg, store = make(tmp_path, [CASES[name]])
    try:
        closed, kept = classify(store, cfg, change(CASES[name]))
        assert closed is None and kept, "never set aside, and no sorting may set it aside"
    finally:
        store.close()


def test_a_first_read_hands_them_in_as_work_with_no_run_and_sets_a_code_aside_as_a_notice(tmp_path):
    code = mail("code", NOREPLY, subject="Your verification code", body="Your verification code is 482913.")
    alert = mail("alert", NOREPLY, subject="New sign-in to your account", body="We saw a new sign-in from a phone.")
    items = [*CASES.values(), code, alert]
    ws, cfg, store = make(tmp_path, items)
    try:
        refresh(ws, store, cfg, "m", NOW)
        marked = [s for s in store.read().list("snapshot") if s.data.get("set_aside")]
        assert {s.data["set_aside"]["section"] for s in marked} == {"notices"} and len(marked) == 2
        assert len(requests_in(store, "queued")) == len(CASES)
        assert not store.read().has("run"), "no AI call"
    finally:
        store.close()


def test_the_setting_turns_the_kinds_off(tmp_path):
    ws, cfg, store = make(tmp_path, [CASES["bill"]], mail_kinds={"enabled": False}, set_aside_defaults=True)
    try:
        assert classify(store, cfg, change(CASES["bill"])) == (None, False)
    finally:
        store.close()


def test_a_shop_newsletter_with_no_order_words_is_still_sales_mail(tmp_path):
    promo = mail("promo", "offers@shop.example.com", bulk=True, subject="Big sale this week")
    ws, cfg, store = make(tmp_path, [promo])
    try:
        closed, _ = classify(store, cfg, change(promo))
        assert closed and closed["section"] == "sales"
    finally:
        store.close()


# ---- filing ------------------------------------------------------------------------------------------------------


def raw(sender, subject):
    return f"New in Inbox: {subject}\n\nFrom: Someone <{sender}>\nSubject: {subject}\n\nBody."


def filed(env, text):
    _, cfg, store = env
    return sides.file_by_people([new_op(text="Pay it")], store.read(), cfg, People(store, cfg), None, text)[0]


def test_mail_the_rules_know_as_a_bill_or_an_order_is_filed_under_the_personal_project(env):
    _, cfg, _ = env
    for sender, subject in (
        (POWER, "Your statement is ready"),
        (SHOP, "Order confirmation"),
        (CARRIER, "It has shipped"),
    ):
        got = filed(env, raw(sender, subject))
        assert got.project == cfg.workspace.project.personal and got.filed_by.by == "word"


def test_the_same_words_in_a_note_or_in_other_mail_file_nothing_by_kind(env):
    assert filed(env, "My own note: order confirmation").project is None
    assert filed(env, raw("colleague@work.example.com", "Lunch is moved")).project is None


# ---- the set-aside row -------------------------------------------------------------------------------------------


@pytest.fixture
def app(tmp_path):
    promo = mail("promo", "offers@lists.example.com", bulk=True, subject="Big sale")
    ws, cfg, store = make(tmp_path, [promo])
    refresh(ws, store, cfg, "m", NOW)
    store.close()
    created = create_app(ws, cfg, "t", start_worker=False)
    client = TestClient(created)
    client.headers["Authorization"] = "Bearer t"
    yield ws, cfg, created.state.store, client, cfg.server.base_path.rstrip("/") + "/api"
    created.state.store.close()


def test_treat_as_personal_hands_it_in_for_the_personal_project_and_records_a_signal(app):
    ws, cfg, store, client, base = app
    (item,) = client.get(f"{base}/set-aside").json()["items"]
    personal = sides.personal_project(store.read(), cfg)
    if personal is None:
        personal = sides.make_personal(store, cfg)
    stale = client.post(f"{base}/set-aside/{item['id']}/personal", json={"read_version": item["version"] + 9})
    assert stale.status_code == 409
    done = client.post(f"{base}/set-aside/{item['id']}/personal", json={"read_version": item["version"]})
    assert done.status_code == 200, done.text
    (request,) = [r for r in requests_in(store, "queued") if r.data["source"]]
    assert request.data["project"] == personal and not request.data.get("set_aside")
    signals = [s.data for s in store.read().list("signal") if s.data["kind"] == "pulled_back"]
    assert len(signals) == 1 and "treated as personal" in signals[0]["note"]
    assert client.get(f"{base}/set-aside").json()["items"] == []


def test_always_set_aside_records_a_signal_and_the_row_carries_its_link(app):
    ws, cfg, store, client, base = app
    (item,) = client.get(f"{base}/set-aside").json()["items"]
    assert "link" in item
    fp = client.get(f"{base}/settings").json()["fingerprint"]
    body = {"fingerprint": fp, "choice": item["section"], "senders": [item["address"]], "mail": item["id"]}
    assert client.post(f"{base}/watch/sorting", json=body).status_code == 200
    kinds = [s.data for s in store.read().list("signal") if s.data["kind"] == "set_aside"]
    assert len(kinds) == 1 and "Always" in kinds[0]["note"]


# ---- the golden set ----------------------------------------------------------------------------------------------

CASE_IDS = (
    "bill-statement-becomes-a-reminder",
    "order-confirmation-is-watched-until-it-arrives",
    "shipping-notice-updates-the-watched-order",
    "not-work-one-time-code",
)


@pytest.mark.parametrize("case_id", CASE_IDS)
def test_the_mail_kind_cases_pass_on_their_ideal_answers(monkeypatch, case_id):
    from tests.conftest import DEMO_B
    from tests.test_evaluate_harness import run_edited

    result = run_edited(monkeypatch, DEMO_B, case_id)
    assert result.passed and not result.missing and not result.forbidden and not result.extra, result


def test_a_tracked_bill_or_order_in_the_cases_is_filed_under_the_personal_project():
    from engine.evaluate import load_cases
    from tests.conftest import DEMO_B

    cases = {c["id"]: c for c in load_cases(DEMO_B)}
    from engine.config import load_config
    from engine.mail_kinds import kind_of_input

    cfg = load_config(DEMO_B / "config", env={})
    kinds = {i: kind_of_input(cfg.watch.mail_kinds, cases[i]["pasted"]) for i in CASE_IDS}
    assert kinds == {
        CASE_IDS[0]: "bill",
        CASE_IDS[1]: "order",
        CASE_IDS[2]: "shipping",
        CASE_IDS[3]: None,
    }

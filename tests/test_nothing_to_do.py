"""Automated no-reply mail and reads with nothing to record (design 6.5, 6.32): one-time-code mail from a no-reply
sender is set aside by rules every time, in any order; a read that recorded nothing and asked nothing closes by itself
(Done, with Undo that records a signal); and each mail shows in exactly one list."""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine import closes
from engine.ai.adapters.stub import set_responder
from engine.ai.router import Router
from engine.dispatcher import process
from engine.triage import first_match
from engine.watch import refresh
from tests.test_pipeline import answers
from tests.test_set_aside import mail, requests_in
from tests.test_set_aside import make as make_mail

SENDER = "no-reply@codes.example.com"
BILLER = "noreply@billing.example.com"
NOW = datetime.now(UTC).replace(microsecond=0)


def code_mail(n, sender=SENDER, subject="Your verification code"):
    return mail(
        f"code-{n}", sender, subject=subject, body=f"Your verification code is 48291{n}. It expires soon.", hours=n
    )


@pytest.fixture(autouse=True)
def _reset():
    yield
    set_responder(None)


def test_several_code_mails_from_one_no_reply_sender_are_all_set_aside_whatever_the_order(tmp_path):
    other = code_mail(2, subject="Sign in to continue")
    other["text"] = other["text"].replace("verification code", "one-time code")
    items = [code_mail(1), other, code_mail(3), code_mail(4, subject="Code 7731")]
    ws, cfg, store = make_mail(tmp_path, items)
    try:
        result = refresh(ws, store, cfg, "m", NOW)
        assert len(result.new) == len(items)
        marked = [r for r in store.read().list("request") if r.data.get("set_aside")]
        assert len(marked) == len(items) and not requests_in(store, "queued")
        assert not store.read().has("run"), "no AI call"
    finally:
        store.close()


def test_a_no_reply_bill_is_not_caught_and_the_setting_turns_the_rule_off(tmp_path):
    bill = mail("bill", BILLER, subject="Your invoice is ready", body="Invoice 12 is due on the 30th.")
    ws, cfg, store = make_mail(tmp_path, [bill, code_mail(1)])
    try:
        assert first_match(store, cfg, _change(bill)) is None
        assert first_match(store, cfg, _change(code_mail(1)))["section"] == "notices"
    finally:
        store.close()
    ws, cfg, store = make_mail(tmp_path / "off", [code_mail(1)], automated_mail={"set_aside": False})
    try:
        assert first_match(store, cfg, _change(code_mail(1))) is None
    finally:
        store.close()


def _change(item):
    return {
        "source": "m",
        "key": item["key"],
        "title": item["title"],
        "now": item["text"],
        "author": item["author"],
        "message": item["message"],
    }


def _read(tmp_path, answer):
    item = mail("news", "colleague@work.example.com", subject="Lunch is moved", body="Lunch moves to one o'clock.")
    ws, cfg, store = make_mail(tmp_path, [item])
    request = refresh(ws, store, cfg, "m", NOW).new[0]
    answers(answer)
    cs_id = process(ws, store, cfg, Router(cfg, store, env={}), request, now=NOW)
    return ws, cfg, store, request, cs_id


def _client(ws, cfg, store):
    store.close()
    created = create_app(ws, cfg, "t", start_worker=False)
    client = TestClient(created)
    client.headers["Authorization"] = "Bearer t"
    return created.state.store, client, cfg.server.base_path.rstrip("/") + "/api"


def test_a_read_with_nothing_recorded_and_nothing_asked_closes_by_itself_and_undo_brings_it_back(tmp_path):
    ws, cfg, store, request, cs_id = _read(tmp_path, {"summary": "Nothing needs recording.", "ops": []})
    assert store.read().get("request", request).data["state"] == "done"
    assert store.read().get("changeset", cs_id).data["reviewed"]
    store, client, base = _client(ws, cfg, store)
    try:
        item = next(c for c in client.get(f"{base}/changes").json() if c["id"] == request)
        assert item["state"] == "done"
        assert client.post(f"{base}/changesets/{cs_id}/reopen").status_code == 200
        assert store.read().get("request", request).data["state"] == "review"
        signals = [s.data for s in store.read().list("signal") if s.data["kind"] == "pulled_back"]
        assert [s["refs"] for s in signals] == [[request]]
    finally:
        store.close()


def test_a_read_that_recorded_something_still_waits_for_a_look(tmp_path):
    _, _, store, request, _ = _read(tmp_path, {"summary": "A note.", "ops": [{"op": "note", "text": "Lunch moves."}]})
    try:
        assert store.read().get("request", request).data["state"] == "review"
    finally:
        store.close()


def test_a_read_that_lacked_something_still_waits_for_a_look(tmp_path):
    _, _, store, request, _ = _read(tmp_path, {"summary": "Hm.", "ops": [], "missing": ["a way to log this"]})
    try:
        assert store.read().get("request", request).data["state"] == "review"
    finally:
        store.close()


def test_mail_set_aside_is_listed_only_in_the_set_aside_folder_and_never_as_closed(tmp_path):
    ws, cfg, store = make_mail(tmp_path, [code_mail(1), mail("keep", "colleague@work.example.com")])
    refresh(ws, store, cfg, "m", NOW)
    store, client, base = _client(ws, cfg, store)
    try:
        shown = {r["title"] for r in client.get(f"{base}/set-aside").json()["items"]}
        listed = {c["title"] for c in client.get(f"{base}/silent-closes").json()["closes"]}
        assert shown and not (shown & listed)
        assert all(c.kind != "set_aside" for c in closes.silent(store.read()))
        in_changes = {c["source_title"] for c in client.get(f"{base}/changes").json()}
        assert not (shown & in_changes)
    finally:
        store.close()

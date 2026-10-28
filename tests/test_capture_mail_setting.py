"""The capture setting of a mail source is offered from Connections (design 6.32, S4): it is set when a source is added
or later, only on a source that reads mail, with an address that looks like one, saved with Undo, and shown back on the
source. Built on the setup tests' workspace."""

from __future__ import annotations

from engine.config import load_config
from tests.test_setup import client, make
from tests.test_typed_secrets import mailbox_kind, new_source


def fingerprint(c, api) -> str:
    return c.get(f"{api}/settings").json()["fingerprint"]


def source_of(ws, source_id: str):
    return next(s for s in load_config(ws.config_dir, env={}).watch.sources if s.id == source_id)


def added(c, api, **more):
    body = {
        **new_source(mailbox_kind(c, api)),
        "secrets": {"password": "pw"},
        "fingerprint": fingerprint(c, api),
        **more,
    }
    return c.post(f"{api}/watch/sources", json=body)


def test_a_mail_source_is_added_as_capture_and_says_so(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    done = added(c, api, capture=True, capture_address="  name+capture@example.com ")
    assert done.status_code == 200, done.text
    found = source_of(ws, "work-mail")
    assert found.capture is True and found.capture_address == "name+capture@example.com"
    listed = next(s for s in c.get(f"{api}/watch").json() if s["id"] == "work-mail")
    assert listed["capture"] is True and listed["capture_address"] == "name+capture@example.com"


def test_the_setting_is_changed_later_with_undo_and_each_part_alone(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    assert added(c, api).status_code == 200
    plain = source_of(ws, "work-mail")
    assert plain.capture is False and plain.capture_address is None
    first = c.post(f"{api}/watch/sources/work-mail", json={"capture": True, "fingerprint": fingerprint(c, api)})
    assert first.status_code == 200, first.text
    assert (source_of(ws, "work-mail").capture, source_of(ws, "work-mail").capture_address) == (True, None)
    second = c.post(
        f"{api}/watch/sources/work-mail",
        json={"capture_address": "me+notes@example.com", "fingerprint": fingerprint(c, api)},
    )
    assert second.status_code == 200
    assert (source_of(ws, "work-mail").capture, source_of(ws, "work-mail").capture_address) == (
        True,
        "me+notes@example.com",
    )
    cleared = c.post(
        f"{api}/watch/sources/work-mail",
        json={"capture": False, "capture_address": "", "fingerprint": fingerprint(c, api)},
    )
    assert cleared.status_code == 200
    assert (source_of(ws, "work-mail").capture, source_of(ws, "work-mail").capture_address) == (False, None)
    # Undo is the settings Undo: the change's values from before are saved back.
    before = [ch for ch in cleared.json()["changes"] if ch["key"] == "watch.sources"][0]["before"]
    back = c.post(
        f"{api}/settings", json={"changes": {"watch.sources": before}, "reset": [], "fingerprint": fingerprint(c, api)}
    )
    assert back.status_code == 200 and source_of(ws, "work-mail").capture_address == "me+notes@example.com"


def test_an_address_that_is_not_one_and_a_source_that_does_not_read_mail_are_refused_in_plain_words(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    assert added(c, api).status_code == 200
    bad = c.post(
        f"{api}/watch/sources/work-mail", json={"capture_address": "not an address", "fingerprint": fingerprint(c, api)}
    )
    assert bad.status_code == 400 and bad.json()["detail"] == "That doesn't look like an email address."
    folder = next(k for k in c.get(f"{api}/watch/kinds").json() if k["name"] == "folder")
    body = {
        "connector": folder["name"],
        "label": "Papers",
        "settings": {"path": str(tmp_path)},
        "capture": True,
        "fingerprint": fingerprint(c, api),
    }
    refused = c.post(f"{api}/watch/sources", json=body)
    assert refused.status_code == 400 and "reads mail" in refused.json()["detail"]

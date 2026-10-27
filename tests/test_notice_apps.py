"""Notices name the apps they go to (design 7.19, "Named apps"): the common apps are a shipped list beside the core,
each with the message it needs, filled with the notice's text, and one line on where to find its address; the old
`webhook_format` values still work; a workspace adds entries of its own. No app is named in the core's code or
wording."""

from __future__ import annotations

import json
import re
from pathlib import Path

import httpx
import pytest

import engine.net
from engine import notice_apps, notifications
from engine.config import load_config
from tests.test_notifications import ADDRESS, ENV, Fake, at, keys_are, setup_env
from tests.test_setup import client, make

REPO = Path(notice_apps.__file__).resolve().parents[1]


@pytest.fixture
def fake(monkeypatch):
    f = Fake()
    monkeypatch.setattr(engine.net, "TRANSPORT", httpx.MockTransport(f))
    return f


def test_the_shipped_list_covers_chat_apps_a_team_chat_a_phone_push_service_and_plain_text():
    apps = notice_apps.shipped()
    names = {a.id: a for a in apps}
    assert len(apps) >= 6 and len(names) == len(apps)
    assert [a for a in apps if a.shape is None][-1].id == "plain"  # "Something else (plain text)" ends the list
    assert all(a.name.strip() and a.where.strip() and "://" not in a.where for a in apps)
    for app in apps:
        if app.shape is not None:
            assert "{text}" in json.dumps(app.shape), app.id  # the shape carries the notice's text


def test_the_old_formats_map_to_a_shape_and_an_app_wins_over_them(tmp_path):
    ws, _, _ = make(tmp_path)
    cfg = load_config(ws.config_dir, env={"COCKPIT__UI__NOTIFICATIONS__WEBHOOK_FORMAT": "json"})
    assert notice_apps.chosen(cfg).id == "generic-chat"
    plain = load_config(ws.config_dir, env={"COCKPIT__UI__NOTIFICATIONS__WEBHOOK_FORMAT": "plain"})
    assert notice_apps.chosen(plain).shape is None
    named = notice_apps.shipped()[0].id
    both = load_config(
        ws.config_dir,
        env={
            "COCKPIT__UI__NOTIFICATIONS__WEBHOOK_FORMAT": "plain",
            "COCKPIT__UI__NOTIFICATIONS__WEBHOOK_APP": named,
        },
    )
    assert notice_apps.chosen(both).id == named


def test_the_chosen_shape_is_filled_with_the_notice_text_and_sent_as_json(tmp_path, fake, monkeypatch):
    app = next(a for a in notice_apps.shipped() if a.shape is not None and a.id != "generic-chat")
    ws, cfg, store, env = setup_env(tmp_path, {"COCKPIT__UI__NOTIFICATIONS__WEBHOOK_APP": app.id})
    keys_are(monkeypatch, ["question:Q1"])
    notifications.deliver_if_due(ws, store, cfg, at(cfg, 12), env=env)
    body = json.loads(fake.bodies()[0])
    assert body == notice_apps.fill(app, "1 decision waiting for you")
    assert "1 decision waiting for you" in json.dumps(body) and "{text}" not in json.dumps(body)
    assert fake.sent[0].headers["content-type"].startswith("application/json")


def test_a_push_service_and_plain_text_get_the_words_alone(tmp_path, fake, monkeypatch):
    app = next(a for a in notice_apps.shipped() if a.shape is None)
    ws, cfg, store, env = setup_env(tmp_path, {"COCKPIT__UI__NOTIFICATIONS__WEBHOOK_APP": app.id})
    keys_are(monkeypatch, ["question:Q1"])
    notifications.deliver_if_due(ws, store, cfg, at(cfg, 12), env=env)
    assert fake.bodies() == ["1 decision waiting for you"] and fake.sent[0].headers["content-type"].startswith(
        "text/plain"
    )


def test_the_old_json_setting_still_sends_the_generic_chat_shape(tmp_path, fake, monkeypatch):
    ws, cfg, store, env = setup_env(tmp_path)  # webhook_format json in the test env
    keys_are(monkeypatch, ["question:Q1"])
    notifications.deliver_if_due(ws, store, cfg, at(cfg, 12), env=env)
    body = json.loads(fake.bodies()[0])
    assert body["text"] == "1 decision waiting for you" and body["content"] == body["text"]


def test_a_workspace_adds_its_own_entry_and_it_is_offered_after_the_shipped_ones(tmp_path):
    ws, _, _ = make(tmp_path)
    extra = [{"id": "ours", "name": "Our own chat", "shape": {"msg": "{text}"}, "where": "In its settings."}]
    cfg = load_config(
        ws.config_dir,
        env={
            "COCKPIT__UI__NOTIFICATIONS__APPS_EXTRA": json.dumps(extra),
            "COCKPIT__UI__NOTIFICATIONS__WEBHOOK_APP": "ours",
        },
    )
    listed = notice_apps.offered(cfg)
    ids = [a.id for a in listed]
    assert ids[-1] == "plain" and ids[-2] == "ours"  # the workspace's own sit before "Something else", which stays last
    assert notice_apps.chosen(cfg).name == "Our own chat"
    assert notice_apps.fill(notice_apps.chosen(cfg), "Hi") == {"msg": "Hi"}


def test_an_entry_of_the_workspace_with_a_shipped_id_replaces_it(tmp_path):
    ws, _, _ = make(tmp_path)
    shipped = notice_apps.shipped()[0]
    extra = [{"id": shipped.id, "name": "Renamed", "shape": None, "where": "Elsewhere."}]
    cfg = load_config(ws.config_dir, env={"COCKPIT__UI__NOTIFICATIONS__APPS_EXTRA": json.dumps(extra)})
    found = [a for a in notice_apps.offered(cfg) if a.id == shipped.id]
    assert len(found) == 1 and found[0].name == "Renamed"


def test_an_unknown_app_falls_back_to_the_old_format(tmp_path):
    ws, _, _ = make(tmp_path)
    env = {
        "COCKPIT__UI__NOTIFICATIONS__WEBHOOK_APP": "no-such-app",
        "COCKPIT__UI__NOTIFICATIONS__WEBHOOK_FORMAT": "json",
    }
    assert notice_apps.chosen(load_config(ws.config_dir, env=env)).id == "generic-chat"


def test_the_screen_is_offered_the_apps_by_name_with_where_to_find_the_address(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, base = client(ws, cfg, store)
    view = c.get(f"{base}/notifications").json()
    ids = [a["id"] for a in view["apps"]]
    assert view["app"] in ids and ids == [a.id for a in notice_apps.offered(cfg)]
    assert all(a["name"] and a["where"] for a in view["apps"])


def test_choosing_an_app_is_saved_through_settings_and_the_screen_reads_it_back(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, base = client(ws, cfg, store)
    fingerprint = c.get(f"{base}/settings").json()["fingerprint"]
    target = notice_apps.shipped()[0].id
    done = c.post(f"{base}/notifications/app", json={"app": target, "fingerprint": fingerprint})
    assert done.status_code == 200, done.text
    assert load_config(ws.config_dir, env={}).ui.notifications.webhook_app == target
    assert c.get(f"{base}/notifications").json()["app"] == target
    refused = c.post(
        f"{base}/notifications/app", json={"app": "no-such-app", "fingerprint": done.json()["fingerprint"]}
    )
    assert refused.status_code == 400


def test_no_app_is_named_in_the_cores_code_or_wording():
    names = {a.name.lower() for a in notice_apps.shipped() if a.id not in ("plain", "generic-chat")}
    assert names
    patterns = [re.compile(rf"(?<![\w-]){re.escape(name)}(?![\w-])") for name in names]
    for top in ("engine", "api"):
        for path in (REPO / top).rglob("*.py"):
            text = path.read_text(encoding="utf-8").lower()
            assert not [p.pattern for p in patterns if p.search(text)], str(path.relative_to(REPO))
    sheet = (REPO / "web" / "src" / "wording" / "en.json").read_text(encoding="utf-8").lower()
    assert not [p.pattern for p in patterns if p.search(sheet)]
    assert ENV and ADDRESS

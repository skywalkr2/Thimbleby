"""A plugin's connector can say it reads older items (plugin API 0.3.90): "Look further back" is offered for its sources
only then, the count and the reading are asked of it within `watch.look_back_max_items`, and the work is estimated and
held for the person's go like the core mailbox's. Names and days come from the fixtures; the AI is the stub."""

from __future__ import annotations

import json
from datetime import UTC, datetime

import pytest
import yaml
from fastapi.testclient import TestClient

from engine import source_intake
from engine.config import load_config
from engine.config.schema import Price
from engine.storage import Store, StoreError
from engine.watch import refresh
from tests.test_source_intake import mail
from tests.test_today_panels_jobs import MANIFEST, workspace

NOW = datetime(2026, 10, 19, 9, 0, tzinfo=UTC)

FIXTURE = """
import json
from datetime import date
from pydantic import BaseModel, Field
from engine.plugin_api import MessageDetails, Poll, Settings, SourceItem

class Config(Settings):
    pass

class InboxSettings(BaseModel):
    items: list[dict] = Field(default_factory=list)
    older: list[dict] = Field(default_factory=list)
    log: str = ""

def build(entry):
    m = entry["message"]
    return SourceItem(
        key=entry["key"], title=entry["title"], text=entry["text"], author=entry.get("author"),
        message=MessageDetails(sender=m.get("sender"), received=m.get("received"), unread=True),
    )

def poll(settings, state, context):
    return Poll([build(i) for i in settings.items], {})

def within(settings, since, before):
    return [e for e in settings.older if since <= date.fromisoformat(e["message"]["received"][:10]) < before]

def note(settings, what, limit, account):
    if settings.log:
        with open(settings.log, "a") as handle:
            handle.write(json.dumps([what, limit, account]) + "\\n")

def older(settings, since, before, limit, context):
    note(settings, "read", limit, context.account)
    return [build(e) for e in within(settings, since, before)][-limit:]

def older_count(settings, since, before, limit, context):
    note(settings, "count", limit, context.account)
    return min(len(within(settings, since, before)), limit)

def register(registrar):
    registrar.connector("p18/inbox", label="Inbox", settings=InboxSettings, poll=poll, reads="mail",
                        older=older, older_count=older_count)
    registrar.connector("p18/uncounted", label="Uncounted", settings=InboxSettings, poll=poll, reads="mail",
                        older=older)
    registrar.connector("p18/plain", label="Plain", settings=InboxSettings, poll=poll, reads="mail")
"""


def _manifest():
    manifest = dict(MANIFEST)
    manifest["provides"] = {
        "connectors": ["p18/inbox", "p18/uncounted", "p18/plain"],
        "connector_reads": {"p18/inbox": "mail", "p18/uncounted": "mail", "p18/plain": "mail"},
    }
    return manifest


def make(tmp_path, connector="p18/inbox", account=None):
    ws, cfg, store = workspace(tmp_path, FIXTURE)
    store.close()
    (ws.root / "plugins" / "p18" / "plugin.yaml").write_text(yaml.safe_dump(_manifest()))
    log = tmp_path / "calls.log"
    entry = {
        "id": "m",
        "connector": connector,
        "label": "Inbox",
        "settings": {
            "items": [mail(f"m{d}", d) for d in (1, 2, 3)],
            "older": [mail(f"o{d}", d) for d in (20, 21, 22)],
            "log": str(log),
        },
        **({"account": account} if account else {}),
    }
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump({"version": 1, "sources": [entry], "sorting": "rules"}))
    cfg = load_config(ws.config_dir, env={})
    use = cfg.ai.tiers["routine"].use
    cfg.ai.prices[use] = Price(input_per_million=1000.0, output_per_million=1000.0)
    cfg.ai.budgets.confirm_above_usd = 0.10
    store = Store(ws.db_path, cfg=cfg)
    assert store.plugins.active("p18"), store.plugins.status["p18"].reason
    return ws, cfg, store, log


def calls(log):
    return [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []


@pytest.fixture
def env(tmp_path):
    ws, cfg, store, log = make(tmp_path)
    yield ws, cfg, store, log
    store.close()


def test_a_connector_that_declares_older_items_is_offered_a_look_further_back(env):
    ws, cfg, store, _ = env
    refresh(ws, store, cfg, "m", NOW)
    assert source_intake.can_look_back(cfg.watch.sources[0], store)
    assert source_intake.back_to_of(store.read(), "m") is not None


def test_a_connector_that_does_not_declare_it_is_never_offered_one(tmp_path):
    ws, cfg, store, _ = make(tmp_path, "p18/plain")
    try:
        refresh(ws, store, cfg, "m", NOW)
        assert not source_intake.can_look_back(cfg.watch.sources[0], store)
        with pytest.raises(StoreError):
            source_intake.look_back_preview(ws, store, cfg, "m", 30, NOW)
        with pytest.raises(StoreError):
            source_intake.look_further_back(ws, store, cfg, "m", 30, NOW)
    finally:
        store.close()


def test_the_preview_asks_only_for_a_count_within_the_limit_and_writes_nothing(env):
    ws, cfg, store, log = env
    cfg.watch.look_back_max_items = 2
    refresh(ws, store, cfg, "m", NOW)
    held = len(store.read().list("request"))
    found = source_intake.look_back_preview(ws, store, cfg, "m", 30, NOW)
    assert found.count == 2 and found.estimate_usd and found.estimate_usd > 0
    assert calls(log) == [["count", 2, None]]
    assert len(store.read().list("request")) == held


def test_looking_further_back_reads_the_older_items_within_the_limit_and_holds_them_for_the_go(env):
    ws, cfg, store, log = env
    cfg.watch.look_back_max_items = 2
    refresh(ws, store, cfg, "m", NOW)
    before = source_intake.back_to_of(store.read(), "m")
    done = source_intake.look_further_back(ws, store, cfg, "m", 30, NOW)
    assert done.taken == 2 and not done.started and done.estimate_usd and done.estimate_usd > 0
    assert ["read", 2, None] in calls(log)
    assert source_intake.back_to_of(store.read(), "m") < before
    held = [r for r in store.read().list("request") if r.data.get("intake") == "m"]
    assert len(held) == 5 and all(source_intake.waits_on_go(r.data) for r in held)


def test_a_connector_with_no_count_is_read_for_the_estimate(tmp_path):
    ws, cfg, store, log = make(tmp_path, "p18/uncounted")
    try:
        refresh(ws, store, cfg, "m", NOW)
        found = source_intake.look_back_preview(ws, store, cfg, "m", 30, NOW)
        assert found.count == 3 and calls(log) == [["read", cfg.watch.look_back_max_items, None]]
    finally:
        store.close()


def test_the_source_is_asked_as_the_account_it_reads_with(tmp_path):
    ws, cfg, store, log = make(tmp_path, account="person@example.com")
    try:
        refresh(ws, store, cfg, "m", NOW)
        source_intake.look_back_preview(ws, store, cfg, "m", 30, NOW)
        assert calls(log)[-1][2] == "person@example.com"
    finally:
        store.close()


def test_a_connector_that_fails_asking_for_older_items_is_contained(tmp_path):
    ws, cfg, store, log = make(tmp_path)
    try:
        refresh(ws, store, cfg, "m", NOW)
        cfg.watch.sources[0].settings["older"] = [{"key": "x"}]  # an entry the connector can't read
        with pytest.raises(StoreError):
            source_intake.look_back_preview(ws, store, cfg, "m", 30, NOW)
    finally:
        store.close()


def test_the_source_list_offers_the_choices_only_for_a_source_that_can_be_asked(tmp_path):
    ws, cfg, store, _ = make(tmp_path)
    store.close()
    from api.app import create_app

    application = create_app(ws, cfg, "t", ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(application, headers={"Authorization": "Bearer t"}) as client:
        assert client.get("/api/watch").json()[0]["look_back_choices"] == []
        assert client.post("/api/watch/m/read").status_code == 200
        assert client.get("/api/watch").json()[0]["look_back_choices"] == [30, 90, 365]
        preview = client.get("/api/watch/m/look-back", params={"days": 30})
        assert preview.status_code == 200 and preview.json()["count"] == 3

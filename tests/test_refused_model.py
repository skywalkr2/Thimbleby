"""A saved account whose check stops on a model the service retired (promise P36, design 6.16): the check's answer says
which kind of work it was for and offers the next model the service's listing says fits, and the refused model is
remembered on the account so a later default pick and a later offer skip it. The offer never comes from a model's
name."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import yaml

from engine.ai import adapters
from engine.ai.task import ModelInfo
from engine.config import load_config
from engine.workspace import init_workspace
from tests.test_retired_model import HOSTED, a_service
from tests.test_setup import COMMON, DEMO_B, client, make

LISTING = {
    "old-retired": ModelInfo(retired=True),
    "speech-only": ModelInfo(chat=False),
    "fit-a": ModelInfo(input_per_million=1, output_per_million=2),
    "fit-b": ModelInfo(input_per_million=5, output_per_million=9),
    "fit-c": ModelInfo(input_per_million=7, output_per_million=11),
}


def saved_account(tmp_path, monkeypatch, retired, listing=None):
    """A workspace with one saved account on a service that has retired the given models."""
    monkeypatch.setitem(adapters.ADAPTERS, COMMON, a_service(set(retired), listing or LISTING))
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    made = c.post(
        f"{api}/ai/accounts",
        json={
            "name": "spare",
            "adapter": COMMON,
            "endpoint": HOSTED[0]["id"],
            "key": "not-a-real-key",
            "models": {"everyday": "fit-a", "harder": "fit-c"},
            "use_for": ["routine", "deep"],
            "fingerprint": c.get(f"{api}/settings").json()["fingerprint"],
        },
    )
    assert made.status_code == 200, made.text
    return ws, c, api


def on_disk(ws):
    return yaml.safe_load((ws.config_dir / "ai.yaml").read_text(encoding="utf-8"))["providers"]["spare"]


def test_a_saved_accounts_check_on_a_retired_model_offers_the_next_one_for_that_kind_of_work(tmp_path, monkeypatch):
    ws, c, api = saved_account(tmp_path, monkeypatch, {"fit-a"})
    line = c.post(f"{api}/ai/accounts/spare/test?tier=routine&model=everyday").json()[0]
    assert line["ok"] is False and line["reason"] == "model_retired"
    assert line["work"] == "routine" and line["model_short"] == "everyday"
    # The offer comes from the listing's usable models: not the refused one, not a retired or non-chat one.
    assert line["next_model"] in ("fit-b", "fit-c")
    assert "fit-a" not in line["detail"] and "deprecated" not in line["detail"]  # no model name, no service words


def test_the_offer_for_harder_work_is_the_listings_pick_for_harder_work(tmp_path, monkeypatch):
    ws, c, api = saved_account(tmp_path, monkeypatch, {"fit-c"})
    line = c.post(f"{api}/ai/accounts/spare/test?tier=deep&model=harder").json()[0]
    assert line["reason"] == "model_retired" and line["work"] == "deep" and line["model_short"] == "harder"
    assert line["next_model"] in ("fit-a", "fit-b")  # never fit-c, the one just refused


def test_a_refused_model_is_remembered_on_the_account_and_never_offered_again(tmp_path, monkeypatch):
    ws, c, api = saved_account(tmp_path, monkeypatch, {"fit-a", "fit-b"})
    assert on_disk(ws).get("refused_models", []) == []
    first = c.post(f"{api}/ai/accounts/spare/test?tier=routine&model=everyday").json()[0]
    assert on_disk(ws)["refused_models"] == ["fit-a"]
    assert first["next_model"] in ("fit-b", "fit-c")
    # Testing again changes nothing, and a second refused model is added to the list once.
    c.post(f"{api}/ai/accounts/spare/test?tier=routine&model=everyday")
    assert on_disk(ws)["refused_models"] == ["fit-a"]
    # The service also refuses what was offered second: the memory now keeps both out of the next offer.
    saved = c.post(
        f"{api}/ai/accounts/spare",
        json={
            "models": {"everyday": "fit-b", "harder": "fit-c"},
            "fingerprint": c.get(f"{api}/settings").json()["fingerprint"],
        },
    )
    assert saved.status_code == 200, saved.text
    second = c.post(f"{api}/ai/accounts/spare/test?tier=routine&model=everyday").json()[0]
    assert on_disk(ws)["refused_models"] == ["fit-a", "fit-b"]
    assert second["next_model"] == "fit-c"


def test_a_remembered_refusal_is_skipped_by_the_offer_even_when_the_service_still_lists_it(tmp_path, monkeypatch):
    ws, c, api = saved_account(tmp_path, monkeypatch, {"fit-b"})
    path = ws.config_dir / "ai.yaml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    data["providers"]["spare"]["refused_models"] = ["fit-c"]
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    c.post(
        f"{api}/ai/accounts/spare",
        json={"models": {"everyday": "fit-b"}, "fingerprint": c.get(f"{api}/settings").json()["fingerprint"]},
    )
    line = c.post(f"{api}/ai/accounts/spare/test?tier=routine&model=everyday").json()[0]
    assert line["reason"] == "model_retired" and line["next_model"] == "fit-a"  # fit-c is remembered as refused


def test_a_listing_that_has_nothing_else_fitting_offers_nothing(tmp_path, monkeypatch):
    only = {"fit-a": ModelInfo(), "old": ModelInfo(retired=True)}
    ws, c, api = saved_account(tmp_path, monkeypatch, {"fit-a"}, only)
    line = c.post(f"{api}/ai/accounts/spare/test?tier=routine&model=everyday").json()[0]
    assert line["reason"] == "model_retired" and line["next_model"] is None


def test_another_failure_is_not_a_refusal_and_remembers_nothing(tmp_path, monkeypatch):
    ws, c, api = saved_account(tmp_path, monkeypatch, set())
    ok = c.post(f"{api}/ai/accounts/spare/test?tier=routine&model=everyday").json()[0]
    assert ok["ok"] is True and ok["reason"] is None and ok["next_model"] is None
    assert on_disk(ws).get("refused_models", []) == []


def test_remembering_a_refusal_does_not_uncheck_the_account(tmp_path, monkeypatch):
    from engine.ai.checked import account_fingerprint

    ws, c, api = saved_account(tmp_path, monkeypatch, {"fit-a"})
    before = account_fingerprint(load_config(ws.config_dir, env=dict(os.environ)), "spare/everyday")
    c.post(f"{api}/ai/accounts/spare/test?tier=routine&model=everyday")
    after = account_fingerprint(load_config(ws.config_dir, env=dict(os.environ)), "spare/everyday")
    assert before == after


def test_a_default_pick_skips_the_models_an_account_refused():
    from engine.ai.presets import suggest_models

    easy, hard = suggest_models(None, LISTING, avoid=frozenset({"fit-a"}))
    assert easy == "fit-b" and hard == "fit-c"


def test_the_weekly_look_at_newer_models_never_offers_a_refused_one():
    from engine.ai import model_watch

    cfg = load_config_with_refusal(["fit-9"])
    listing = {"fit-1": ModelInfo(), "fit-9": ModelInfo(), "fit-5": ModelInfo()}
    entry = {"id": "k", "base_url": "", "tier_presets": {"routine": {"family": "fit", "effort": ""}}}
    offers, _ = model_watch.look(cfg, "spare", listing, [entry], {}, {}, {})
    assert offers["routine"]["candidate"] == "fit-5"


def load_config_with_refusal(refused):
    """The demo settings with one account on a model of the family `fit`, its tier on it, and models it refused."""
    ws = init_workspace(Path(tempfile.mkdtemp()) / "ws", template=DEMO_B, git=False)
    path = ws.config_dir / "ai.yaml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    data["providers"]["spare"] = {
        "adapter": COMMON,
        "kind": "k",
        "models": {"everyday": "fit-1"},
        "refused_models": refused,
    }
    data["tiers"]["routine"]["use"] = "spare/everyday"
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    return load_config(ws.config_dir, env={})


# ---- the model's name is never shown --------------------------------------------------------------------------------


def test_no_text_a_check_shows_carries_a_model_id(tmp_path, monkeypatch):
    """The setup line (the new-account check), the saved account's line and the smoke test's own message say the kind of
    work and never the id of the model that was refused or the one offered in its place."""
    from engine.ai.smoke import _problem
    from engine.ai.task import AiError

    ids = ("fit-a", "fit-b", "fit-c")
    ws, c, api = saved_account(tmp_path, monkeypatch, {"fit-a"})
    saved_line = c.post(f"{api}/ai/accounts/spare/test?tier=routine&model=everyday").json()[0]
    setup_line = c.post(
        f"{api}/ai/account-check",
        json={
            "endpoint": HOSTED[0]["id"],
            "key": "not-a-real-key",
            "models": {"everyday": "fit-a"},
            "use": {"routine": "everyday", "deep": "everyday"},
        },
    ).json()
    assert saved_line["reason"] == setup_line["reason"] == "model_retired"
    for shown in (saved_line["detail"], setup_line["message"]):
        assert "everyday work" in shown and not any(i in shown for i in ids)
    assert not any(i in _problem(AiError("model_retired", "gone"), "hosted", "fit-a", "deep") for i in ids)
    assert "harder work" in _problem(AiError("model_retired", "gone"), "hosted", "fit-a", "deep")
    # Another failure whose own words name the model doesn't show it either.
    other = _problem(AiError("other", "The model fit-a could not be loaded"), "hosted", "fit-a")
    assert "fit-a" not in other and "the model" in other

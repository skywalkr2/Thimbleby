"""A model with no price anywhere is asked for its price when an account is added (P97, option B): the service's list,
then the app's shipped table, then `ai.prices`. The route says which picked models the shipped table has no price
for (a service on this computer, a program and a typed address on this computer are never asked), and adding the account
keeps the price the person gave where `ai.prices` keeps prices, by account and short model name."""

from __future__ import annotations

import pytest

from engine.ai import shipped_prices
from engine.config import load_config
from engine.setup import known_endpoints
from tests.test_setup import client, make

PAID = next(e for e in known_endpoints() if e["base_url"] and not e["local"] and not e["program"])
LOCAL = next((e for e in known_endpoints() if e["local"]), None)
TABLE = {PAID["id"]: {"models": [{"family": "fit", "version": "2", "input": 5, "output": 25}]}}


@pytest.fixture
def web(tmp_path, monkeypatch):
    monkeypatch.setattr(shipped_prices, "_table", lambda: TABLE)
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    return ws, c, api


def test_a_model_the_shipped_table_prices_is_not_asked_and_one_it_does_not_is(web):
    _ws, c, api = web
    asked = c.post(
        f"{api}/ai/prices/missing", json={"endpoint": PAID["id"], "models": ["vendor-fit-2", "other-model-7"]}
    )
    assert asked.status_code == 200, asked.text
    assert asked.json() == {"unpriced": ["other-model-7"]}


def test_a_service_on_this_computer_or_a_typed_address_on_it_is_never_asked(web):
    _ws, c, api = web
    if LOCAL is not None:
        assert c.post(f"{api}/ai/prices/missing", json={"endpoint": LOCAL["id"], "models": ["any-model"]}).json() == {
            "unpriced": []
        }
    typed = c.post(
        f"{api}/ai/prices/missing",
        json={"endpoint": PAID["id"], "models": ["any-model"], "base_url": "http://localhost:11434/v1"},
    )
    assert typed.json() == {"unpriced": []}
    assert c.post(f"{api}/ai/prices/missing", json={"endpoint": "no-such-kind", "models": ["m"]}).status_code == 400


def test_the_price_the_person_gives_is_kept_with_the_account_where_prices_are_kept(web):
    ws, c, api = web
    fingerprint = c.get(f"{api}/settings").json()["fingerprint"]
    account = {
        "name": "priced",
        "adapter": PAID["adapter"],
        "endpoint": PAID["id"],
        "key_ref": "env:SOME_KEY",
        "models": {"everyday": "model-without-price", "harder": "another-without-price"},
        "prices": {
            "everyday": {"input_per_million": 0.25, "output_per_million": 1.25},
            "harder": {"input_per_million": 3, "output_per_million": 15},
        },
        "use_for": ["routine"],
        "fingerprint": fingerprint,
    }
    done = c.post(f"{api}/ai/accounts", json=account)
    assert done.status_code == 200, done.text
    prices = load_config(ws.config_dir, env={}).ai.prices
    assert (prices["priced/everyday"].input_per_million, prices["priced/everyday"].output_per_million) == (0.25, 1.25)
    assert (prices["priced/harder"].input_per_million, prices["priced/harder"].output_per_million) == (3, 15)


def test_a_price_for_a_model_the_account_does_not_have_is_refused_and_a_negative_one_too(web):
    ws, c, api = web
    fingerprint = c.get(f"{api}/settings").json()["fingerprint"]
    base = {
        "name": "priced",
        "adapter": PAID["adapter"],
        "endpoint": PAID["id"],
        "key_ref": "env:SOME_KEY",
        "models": {"everyday": "model-without-price"},
        "fingerprint": fingerprint,
    }
    stray = c.post(
        f"{api}/ai/accounts", json={**base, "prices": {"harder": {"input_per_million": 1, "output_per_million": 2}}}
    )
    assert stray.status_code == 400
    negative = c.post(
        f"{api}/ai/accounts", json={**base, "prices": {"everyday": {"input_per_million": -1, "output_per_million": 2}}}
    )
    assert negative.status_code == 422
    assert "priced" not in load_config(ws.config_dir, env={}).ai.providers
    # No price given: the account is added as before (the form is what asks).
    assert c.post(f"{api}/ai/accounts", json=base).status_code == 200
    assert load_config(ws.config_dir, env={}).ai.prices == {}

"""Settings refusals: a limit on the assistant's name, and a day limit that is not above the month's."""

from tests.test_setup import client, make


def _save(c, api, changes):
    fp = c.get(f"{api}/settings").json()["fingerprint"]
    return c.post(f"{api}/settings", json={"changes": changes, "fingerprint": fp})


def test_an_assistant_name_over_the_limit_is_refused_in_plain_words(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    refused = _save(c, api, {"workspace.assistant_name": "x" * 120})
    assert refused.status_code == 400, refused.text
    assert refused.json()["detail"] == "Use at most 40 characters."
    assert refused.headers["X-Cockpit-Field"] == "workspace.assistant_name"
    assert _save(c, api, {"workspace.assistant_name": "x" * 40}).status_code == 200


def test_a_day_limit_above_the_month_limit_is_refused_in_plain_words(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    refused = _save(c, api, {"ai.budgets.per_month_usd": 10, "ai.budgets.per_day_usd": 40})
    assert refused.status_code == 400, refused.text
    assert "daily limit can't be above the monthly limit" in refused.json()["detail"]
    assert _save(c, api, {"ai.budgets.per_month_usd": 100, "ai.budgets.per_day_usd": 40}).status_code == 200
    # The month's limit lowered under the day's is the same refusal.
    again = _save(c, api, {"ai.budgets.per_month_usd": 30})
    assert again.status_code == 400 and "daily limit can't be above the monthly limit" in again.json()["detail"]


def test_a_million_dollar_amount_is_read_whole(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    done = _save(c, api, {"ai.budgets.per_month_usd": "$1,000,000"})
    assert done.status_code == 200, done.text
    assert done.json()["changes"][0]["after"] == 1000000.0

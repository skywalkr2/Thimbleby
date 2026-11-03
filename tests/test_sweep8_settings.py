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


def test_every_text_setting_has_a_length_limit_shown_as_a_plain_refusal(tmp_path):
    from engine.settings import TEXT_MAX_CHARS

    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    items = {i["key"]: i for i in c.get(f"{api}/settings").json()["items"]}
    texts = [i for i in items.values() if i["type"] == "text"]
    assert texts and all(i["max_length"] for i in texts), [i["key"] for i in texts if not i["max_length"]]
    # A name that has no limit of its own in the schema takes the backstop; a long one is refused in plain words.
    backstop = [i for i in texts if i["max_length"] == TEXT_MAX_CHARS and i["editable"] and not i.get("choices")]
    plain = backstop[0]["key"]
    refused = _save(c, api, {plain: "x" * (TEXT_MAX_CHARS + 1)})
    assert refused.status_code == 400, refused.text
    assert refused.json()["detail"] == f"Use at most {TEXT_MAX_CHARS} characters."
    assert refused.headers["X-Cockpit-Field"] == plain
    named = _save(c, api, {"workspace.name": "w" * 120})
    assert named.status_code == 400 and named.json()["detail"] == "Use at most 80 characters."


def test_a_request_the_schema_refuses_says_what_is_allowed_never_the_library_s_words(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    long = c.post(f"{api}/todos", json={"text": "x" * 400, "when": "2030-01-01", "owners": []})
    assert long.status_code == 422
    assert long.json()["detail"] == "Use at most 300 characters."


def test_a_refusal_from_the_product_s_own_check_is_a_whole_sentence(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    refused = _save(c, api, {"ai.budgets.per_month_usd": 10, "ai.budgets.per_day_usd": 40})
    detail = refused.json()["detail"]
    assert detail[0].isupper() or detail.startswith("“")
    assert "The daily limit can't be above the monthly limit." in detail

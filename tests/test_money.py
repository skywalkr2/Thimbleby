"""Amounts of money: marked once in the schema, written by one formatter, and read the same however they are typed."""

import pytest

from engine import money, settings
from engine.config import levels, load_config
from engine.config.schema import FILES
from tests.test_setup import client, make


def test_an_amount_is_the_sign_and_two_decimals():
    assert money.usd(1.5) == "$1.50"
    assert money.usd(0) == "$0.00"
    assert money.usd(0.1) == "$0.10"
    assert money.usd(2) == "$2.00"


@pytest.mark.parametrize(
    ("text", "amount"),
    [
        ("1.5", 1.5),
        ("$1.50", 1.5),
        (" $ 1.50 ", 1.5),
        ("2", 2.0),
        ("0.10", 0.1),
        (".5", 0.5),
        ("1,250.00", 1250.0),
        ("$1,250", 1250.0),
        ("1,5", 1.5),
        ("1,50", 1.5),
    ],
)
def test_one_point_five_and_one_fifty_with_the_sign_are_the_same_amount(text, amount):
    assert money.parse_usd(text) == amount


def test_a_number_format_with_a_decimal_comma_reads_its_own_marks():
    assert money.parse_usd("1.234,50", decimal=",") == 1234.5
    assert money.parse_usd("$1,50", decimal=",") == 1.5
    assert money.parse_usd("1.5", decimal=",") == 1.5


@pytest.mark.parametrize("text", ["", "abc", "$", "1.2.3,4,5x", "--1", "1e3"])
def test_what_is_not_an_amount_is_refused(text):
    with pytest.raises(ValueError):
        money.parse_usd(text)


def _fields(model, path=()):
    for name, info in model.model_fields.items():
        inner = settings._model_of(info.annotation)
        if inner is not None:
            yield from _fields(inner, (*path, name))
        else:
            yield ".".join((*path, name)), info
    # A map's values are models too (a kind of work's own limits, a model's prices).
    for name, info in model.model_fields.items():
        args = getattr(info.annotation, "__args__", ())
        for arg in args:
            if isinstance(arg, type) and hasattr(arg, "model_fields"):
                yield from _fields(arg, (*path, name, "*"))


def test_every_money_setting_is_marked_once_in_the_schema():
    """A setting that holds US dollars (`..._usd`) or a price is marked `money`, and nothing else is."""
    found = {}
    for file, model in FILES.items():
        for key, info in _fields(model, (file,)):
            extra = info.json_schema_extra if isinstance(info.json_schema_extra, dict) else {}
            found[key] = extra.get("money") is True
    named = {k for k in found if k.rsplit(".", 1)[-1].endswith("_usd") and k != "ai.agents.*.cost_usd"}
    prices = {k for k in found if ".prices." in k or k.startswith("ai.prices.")}
    money_keys = {k for k, marked in found.items() if marked}
    assert {
        "ai.budgets.per_run_usd",
        "ai.budgets.confirm_above_usd",
        "ai.budgets.per_day_usd",
        "ai.budgets.per_month_usd",
    } <= money_keys
    # Every `_usd` setting that is a number is marked (a path to where an agent reports its cost is text, not money).
    unmarked = {k for k in named if not found[k] and "cost_usd" not in k}
    assert unmarked == set()
    assert prices and all(found[k] for k in prices), sorted(k for k in prices if not found[k])
    assert money_keys == {k for k in (named | prices) if found[k]}


def test_the_screens_are_told_which_settings_are_money_and_the_marker_stays_with_the_field_when_it_is_placed():
    shown = {s.key: s for s in settings.describe(load_config(None, env={}))}
    for key in (
        "ai.budgets.confirm_above_usd",
        "ai.budgets.per_day_usd",
        "ai.budgets.per_month_usd",
        "ai.budgets.per_run_usd",
    ):
        assert shown[key].money is True and shown[key].type == "number", key
    assert shown["workspace.name"].money is False
    # Placing a field (basic or advanced) must not drop its other markers.
    assert "ai.budgets.per_run_usd" in levels.ADVANCED


def test_a_money_setting_saved_as_text_is_saved_as_the_same_number(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)

    def day(text):
        fp = c.get(f"{api}/settings").json()["fingerprint"]
        return c.post(f"{api}/settings", json={"changes": {"ai.budgets.per_day_usd": text}, "fingerprint": fp})

    done = day("1.5")
    assert done.status_code == 200, done.text
    assert done.json()["changes"][0]["after"] == 1.5
    again = day("$1.50")
    assert again.status_code == 200, again.text
    assert again.json()["changes"][0]["before"] == 1.5 and again.json()["changes"][0]["after"] == 1.5
    assert load_config(ws.config_dir, env={}).ai.budgets.per_day_usd == 1.5
    # A number goes through as it always did.
    fp = c.get(f"{api}/settings").json()["fingerprint"]
    assert (
        c.post(f"{api}/settings", json={"changes": {"ai.budgets.per_day_usd": 3}, "fingerprint": fp}).status_code == 200
    )
    assert load_config(ws.config_dir, env={}).ai.budgets.per_day_usd == 3


def test_a_money_setting_that_is_not_an_amount_is_refused_in_words(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    fp = c.get(f"{api}/settings").json()["fingerprint"]
    refused = c.post(f"{api}/settings", json={"changes": {"ai.budgets.per_day_usd": "lots"}, "fingerprint": fp})
    assert refused.status_code in (400, 409, 422), refused.text
    assert "must be an amount of money, such as $1.50" in refused.text


def test_the_messages_the_server_writes_use_the_one_formatter(tmp_path):
    from engine.dispatcher import about

    assert about(0.8, None) == "About $0.80."
    assert about(0.8, 1.2, "the main account") == "About $0.80 on the main account, at most $1.20."
    assert about(0.8, 0.8001) == "About $0.80."


def test_the_runtime_config_carries_the_language_the_number_format_follows(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    body = c.get(f"{api}/runtime-config").json()
    assert body["language"] == cfg.workspace.language

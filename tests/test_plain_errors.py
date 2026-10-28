"""A refused value is told in plain words, from the kind of the error and its limits, never the library's message."""

from typing import Annotated, Literal

import pytest
from pydantic import BaseModel, Field, ValidationError, field_validator

from engine.plain_errors import reason_of
from tests.test_setup import client, make

#: The phrases of the validation library that no screen shows.
FRAMEWORK = ("Input should", "String should", "Field required", "value is not", "ensure this value", "Extra inputs")


class Shape(BaseModel):
    count: Annotated[int, Field(ge=0, le=365)]
    name: Annotated[str, Field(min_length=1, max_length=5, pattern=r"^[a-z]+$")]
    mode: Literal["a", "b"]
    price: float
    flag: bool
    tags: Annotated[list[str], Field(min_length=1)]


def first(**values):
    good = {"count": 1, "name": "ab", "mode": "a", "price": 1.0, "flag": True, "tags": ["x"]}
    with pytest.raises(ValidationError) as caught:
        Shape.model_validate({**good, **values})
    return caught.value.errors()[0]


@pytest.mark.parametrize(
    ("values", "said"),
    [
        ({"count": -3}, "Use a number that is 0 or more."),
        ({"count": 400}, "Use a number that is 365 or less."),
        ({"count": "many"}, "Use a whole number."),
        ({"count": 1.5}, "Use a whole number."),
        ({"name": ""}, "Write a little more."),
        ({"name": "abcdefg"}, "Use at most 5 characters."),
        ({"name": "AB"}, "That isn't in the form this setting needs."),
        ({"mode": "c"}, "Pick one of the choices offered."),
        ({"price": "lots"}, "Use a number."),
        ({"flag": "perhaps"}, "Choose yes or no."),
        ({"tags": []}, "Add at least one."),
    ],
)
def test_each_kind_of_refusal_says_what_is_allowed(values, said):
    error = first(**values)
    assert reason_of(error) == said
    assert not any(phrase in reason_of(error) for phrase in FRAMEWORK)


def test_a_missing_value_and_an_unknown_key_are_said_plainly():
    with pytest.raises(ValidationError) as caught:
        Shape.model_validate({})
    assert {reason_of(e) for e in caught.value.errors()} == {"This needs a value."}


def test_a_product_check_keeps_its_own_sentence():

    class Rule(BaseModel):
        word: str

        @field_validator("word")
        @classmethod
        def plain(cls, value):
            raise ValueError("a word of the product's own refusing")

    with pytest.raises(ValidationError) as caught:
        Rule(word="x")
    assert reason_of(caught.value.errors()[0]) == "a word of the product's own refusing"


def test_a_setting_refused_for_its_limit_says_the_limit_beside_its_field(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    fp = c.get(f"{api}/settings").json()["fingerprint"]
    refused = c.post(f"{api}/settings", json={"changes": {"ai.budgets.confirm_above_usd": -3}, "fingerprint": fp})
    assert refused.status_code == 400, refused.text
    assert refused.json()["detail"] == "Use a number that is 0 or more."
    assert refused.headers["X-Cockpit-Field"] == "ai.budgets.confirm_above_usd"
    assert not any(phrase in refused.text for phrase in FRAMEWORK)
    # With several settings in the save the reason names the one it is about.
    fp = c.get(f"{api}/settings").json()["fingerprint"]
    both = c.post(
        f"{api}/settings",
        json={"changes": {"ai.budgets.confirm_above_usd": -3, "ai.budgets.per_day_usd": 2}, "fingerprint": fp},
    )
    assert both.status_code == 400
    assert "isn't allowed" in both.json()["detail"] and "0 or more" in both.json()["detail"]

"""A validation error told in plain words (design 7.0): what is allowed, for the person reading it.

`reason_of` reads the kind of a validation error and its limits (`type` and `ctx`), never the framework's message, so no
phrase of the validation library reaches a screen. An error from one of the product's own checks (a `ValueError` raised
in a validator) already carries its own sentence, which is kept.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any


def _number(value: Any) -> str:
    """A limit as a person writes it: "0", "365", "0.5"."""
    return f"{value:g}" if isinstance(value, float) else str(value)


def reason_of(error: Mapping[str, Any]) -> str:
    """What is allowed, in words, for one validation error: told by the kind of the error and its limits, never by the
    framework's own message. An error from one of the product's own checks already carries its sentence."""
    ctx = error.get("ctx") or {}
    match error.get("type"):
        case "greater_than_equal":
            return f"Use a number that is {_number(ctx.get('ge'))} or more."
        case "greater_than":
            return f"Use a number that is more than {_number(ctx.get('gt'))}."
        case "less_than_equal":
            return f"Use a number that is {_number(ctx.get('le'))} or less."
        case "less_than":
            return f"Use a number that is less than {_number(ctx.get('lt'))}."
        case "multiple_of":
            return f"Use a number that counts in steps of {_number(ctx.get('multiple_of'))}."
        case "int_parsing" | "int_from_float" | "int_parsing_size" | "int_type":
            return "Use a whole number."
        case "float_parsing" | "float_type" | "decimal_parsing" | "decimal_type":
            return "Use a number."
        case "bool_parsing" | "bool_type":
            return "Choose yes or no."
        case "string_too_short":
            least = ctx.get("min_length")
            return "Write a little more." if least == 1 else f"Use at least {_number(least)} characters."
        case "string_too_long":
            return f"Use at most {_number(ctx.get('max_length'))} characters."
        case "too_short":
            least = ctx.get("min_length")
            return "Add at least one." if least == 1 else f"Add at least {_number(least)}."
        case "too_long":
            return f"Keep it to {_number(ctx.get('max_length'))} or fewer."
        case "string_pattern_mismatch" | "string_type" | "url_parsing" | "url_scheme" | "url_syntax_violation":
            return "That isn't in the form this setting needs."
        case "literal_error" | "enum":
            return "Pick one of the choices offered."
        case "missing":
            return "This needs a value."
        case "extra_forbidden":
            return "That isn't a setting."
        case "value_error" | "assertion_error":
            text = str(error.get("msg", "")).removeprefix("Value error, ").removeprefix("Assertion failed, ").strip()
            return text if text else "That value can't be used."
        case _:
            return "That value can't be used."

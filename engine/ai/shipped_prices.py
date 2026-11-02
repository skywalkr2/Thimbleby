"""The prices the app ships for services whose model list carries none (`catalog/ai-prices.yaml`).

A price is found by the account's kind of service and the model's family and version, read from its id by the same
rule as the look at newer models (`engine/ai/family.py`): the family word is in the id and the id's version numbers,
date stamps left out, are the entry's. Nothing here reads a vendor's name; the words come from the data.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from engine.ai.family import version_of
from engine.shipped import shipped
from engine.yaml_load import load_yaml

PRICES = shipped("catalog") / "ai-prices.yaml"


@lru_cache(maxsize=1)
def _table() -> dict[str, Any]:
    data = load_yaml(PRICES.read_text(encoding="utf-8")) or {}
    services = data.get("services")
    return services if isinstance(services, dict) else {}


def _version(text: str) -> tuple[int, ...]:
    return tuple(int(part) for part in str(text).split(".") if part.isdigit())


def price_for(kind: str | None, model_id: str) -> dict[str, float] | None:
    """The shipped price of a model of this kind of service, as {input, output, cached_input} per million tokens, or
    None when the app ships none for it."""
    service = _table().get(kind or "")
    found = version_of(model_id)
    if not isinstance(service, dict) or found is None:
        return None
    lowered = model_id.casefold()
    for entry in service.get("models") or []:
        family = str(entry.get("family") or "").casefold()
        if family and family in lowered and _version(entry.get("version", "")) == found[0]:
            return {
                "input": float(entry["input"]),
                "output": float(entry["output"]),
                "cached_input": float(entry.get("cached_input", entry["input"])),
            }
    return None


def with_prices(kind: str | None, listing: dict[str, Any]) -> dict[str, Any]:
    """A service's model listing ({id: ModelInfo}) with the shipped price filled in where the listing gives none."""
    from dataclasses import replace

    out = {}
    for model_id, info in listing.items():
        known = price_for(kind, model_id) if info.input_per_million is None or info.output_per_million is None else None
        out[model_id] = (
            replace(
                info,
                input_per_million=known["input"],
                output_per_million=known["output"],
                cached_input_per_million=known["cached_input"],
            )
            if known is not None
            else info
        )
    return out

"""Whether text the assistant wrote for a person to read is writing at all: an answer that is only a data structure
(a list or a map where a sentence was asked for) is never shown or kept as writing. A plain function on text."""

from __future__ import annotations

import json


def is_data(text: str) -> bool:
    """Whether the whole text is one JSON list or map, with nothing written around it."""
    trimmed = text.strip()
    if not trimmed or trimmed[0] not in "[{" or trimmed[-1] not in "]}":
        return False
    try:
        return isinstance(json.loads(trimmed), (dict, list))
    except ValueError:
        return False

"""How a message opens (design 6.32): a message to a colleague opens as the settings' greeting says, and one to someone
who is only on the person's own life opens by how they relate to the person, from the wording sheet, unless the person
set their own greeting (their message style), which then opens every message.

The wording sheet (`engine/defaults/words.yaml`, overridden by the workspace's `ui.wording`) holds, for each kind of
relation, `greeting.relation_words.<kind>` (the words in a person's `relation` that mean it, separated by commas) and
`greeting.relation.<kind>` (how a message to them opens; `{first_name}` is the name a greeting uses), and
`greeting.personal` for anyone on the own life whose relation names none. Reads only.
"""

from __future__ import annotations

import re
from typing import Any

from engine import sides

_WORDS = "greeting.relation_words."
_OPENING = "greeting.relation."


def _kinds(cfg: Any) -> list[str]:
    """The kinds of relation the wording sheet knows, in the order it lists them."""
    shipped = sides.words_sheet()
    named = [k for k in (cfg.ui.wording or {}) if k.startswith(_WORDS)]
    return list(dict.fromkeys(k[len(_WORDS) :] for k in [*shipped, *named] if k.startswith(_WORDS)))


def own_style_set(cfg: Any) -> bool:
    """Whether the person set the greeting of their messages themselves (it is not the one shipped): their style then
    opens every message, to a colleague and to someone on their own life alike."""
    default = type(cfg.language.messages).model_fields["greeting"].default
    return cfg.language.messages.greeting != default


def opening(cfg: Any, people: Any, person: str) -> str:
    """The first line of a message to a person, with their first name in it. The person's own message style, when they
    set one, opens every message; otherwise a colleague's opens as the shipped setting says and someone on the own life
    opens by how they relate to the person."""
    first = people.first_name(person)
    if person not in getattr(people, "own_life", frozenset()) or own_style_set(cfg):
        return cfg.language.messages.greeting.format(first_name=first)
    relation = set(re.findall(r"[\w'-]+", str((people.records.get(person) or {}).get("relation") or "").casefold()))
    for kind in _kinds(cfg):
        words = {w.strip().casefold() for w in sides.word(cfg, _WORDS + kind).split(",") if w.strip()}
        if relation & words:
            return sides.word(cfg, _OPENING + kind).format(first_name=first)
    return sides.word(cfg, "greeting.personal").format(first_name=first)

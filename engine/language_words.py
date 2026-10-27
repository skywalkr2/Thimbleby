"""The language's word lists: shipped data, with the workspace's own setting laid over it (design 4.0, "Word lists").

The words and patterns the program reads to understand and check text are not in code or in the settings schema. The
core ships them in one file for each language (`engine/defaults/language/<tag>.yaml`, grouped by what they do). Each
list has a setting of the same name in `language` that is not set by default; when the workspace sets it, its value
replaces the whole shipped list (the date phrases are replaced meaning by meaning, by the date reader).
`language_words` is the one place that decides which of the two a reader gets, and readers call it at the moment of
use, so a change to a setting applies at once.
"""

from __future__ import annotations

from functools import cache
from pathlib import Path
from typing import Any

from engine.yaml_load import load_yaml

SHIPPED_DIR = Path(__file__).parent / "defaults" / "language"
DEFAULT_TAG = "en-US"
#: The nested groups of the shipped file: a settings model whose lists are in one names it with a `words_group` class
#: attribute (`language.reported_speech.verbs` is `reported_speech.verbs` in the file).
GROUPS = ("reported_speech",)
NO_GROUP = ""


@cache
def _shipped(tag: str) -> dict[str, Any]:
    """The shipped lists of one language file by dotted name (`verbs` of the group `reported_speech` is
    `reported_speech.verbs`)."""
    data = load_yaml((SHIPPED_DIR / f"{tag}.yaml").read_text(encoding="utf-8")) or {}
    flat: dict[str, Any] = {}
    for name, value in data.items():
        if name in GROUPS and isinstance(value, dict):
            flat.update({f"{name}.{inner}": found for inner, found in value.items()})
        else:
            flat[str(name)] = value
    return flat


@cache
def _tag_with_file(tag: str) -> str:
    """The tag of the file that serves a language tag: its own, else one with the same primary language, else the
    default's."""
    if (SHIPPED_DIR / f"{tag}.yaml").is_file():
        return tag
    primary = tag.split("-", 1)[0].lower()
    for path in sorted(SHIPPED_DIR.glob("*.yaml")):
        if path.stem.split("-", 1)[0].lower() == primary:
            return path.stem
    return DEFAULT_TAG


def _copy(value: Any) -> Any:
    """A list or mapping of lists as a new one, so a caller that changes it never changes the cache or the setting."""
    if isinstance(value, dict):
        return {key: _copy(found) for key, found in value.items()}
    return list(value) if isinstance(value, list) else value


def names(tag: str = DEFAULT_TAG) -> tuple[str, ...]:
    """Every list the language file ships, by dotted name."""
    return tuple(_shipped(_tag_with_file(tag)))


def shipped(name: str, tag: str = DEFAULT_TAG) -> Any:
    """A shipped list (or mapping) by its dotted name, as a copy the caller may change."""
    return _copy(_shipped(_tag_with_file(tag))[name])


def language_words(settings: Any, name: str) -> Any:
    """The list a reader uses: the workspace's own setting `name` of `settings` (the language settings, or one of its
    groups such as the reported-speech settings) when it is set, else the shipped list. Returns a list, or a mapping for
    the lists that map words to a meaning, a number or a zone; the caller may change it."""
    own = getattr(settings, name)
    if own is not None:
        return _copy(own)
    group = getattr(settings, "words_group", NO_GROUP)
    return shipped(f"{group}.{name}" if group else name)

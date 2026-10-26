"""Settings the app works out, or lets follow another (design 7.9, "The Settings cut").

A removed or automated setting keeps its key, schema and default, and a file, an environment variable or a flag still
sets it: whatever one of those sets always wins. Until then:

- a worked-out default stands in for a setting that follows from others: how dates are written from the language, the
  holiday calendar from the time zone (`defaults/worked_out.yaml`);
- a merged setting follows the one the screen shows: where several settings said nearly the same thing, the screen asks
  once, and the others take that answer unless something sets them themselves. They follow only once the one on screen
  is set; until then each keeps its own default.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Any

from engine.config.schema import FILES
from engine.yaml_load import load_yaml

WORKED_OUT_FILE = Path(__file__).parent.parent / "defaults" / "worked_out.yaml"


@cache
def _data() -> dict[str, Any]:
    return load_yaml(WORKED_OUT_FILE.read_text(encoding="utf-8")) or {}


@dataclass(frozen=True)
class Follows:
    """`follower` takes what `leader` holds (turned by `convert`; None means leave the follower alone)."""

    leader: str
    follower: str
    convert: Callable[[Any], Any] = lambda value: value


def _whole_days(value: Any) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) and value > 0 else None


def _time_of_day(value: Any) -> str | None:
    """A time of day as the files write it: "HH:MM", or the minutes a file's own reading of 22:30 comes to."""
    if isinstance(value, int) and not isinstance(value, bool) and 0 <= value < 24 * 60:
        return f"{value // 60:02d}:{value % 60:02d}"
    return value if isinstance(value, str) and len(value) == 5 and value[2] == ":" else None


def _one_snooze(value: Any) -> int | None:
    """One snooze length from the list the person is offered: the longest that is a week or less, else the shortest."""
    days = (
        sorted({n for n in value if isinstance(n, int) and not isinstance(n, bool) and n > 0})
        if isinstance(value, list)
        else []
    )
    if not days:
        return None
    within = [n for n in days if n <= 7]
    return within[-1] if within else days[0]


#: The merged settings: quiet hours once, one snooze list, one "Chase after N days".
FOLLOWS = (
    Follows("steward.reminders.quiet_start", "ui.notifications.quiet_hours.start", _time_of_day),
    Follows("steward.reminders.quiet_end", "ui.notifications.quiet_hours.end", _time_of_day),
    Follows("steward.people.snooze_days", "steward.patterns.snooze_days", _one_snooze),
    Follows("ui.followups.question_after_days", "ui.followups.action_due_within_days", _whole_days),
    Follows("ui.followups.question_after_days", "ui.followups.undated_after_days", _whole_days),
    Follows("ui.followups.question_after_days", "steward.people.quiet_promise_days", _whole_days),
)


def _get(raw: Mapping[str, Any], dotted: str) -> Any:
    name, *path = dotted.split(".")
    node: Any = raw.get(name)
    for part in path:
        if not isinstance(node, Mapping) or part not in node:
            return None
        node = node[part]
    return node


def _set(raw: dict[str, dict[str, Any]], dotted: str, value: Any) -> None:
    name, *path = dotted.split(".")
    node = raw[name]
    for part in path[:-1]:
        child = node.get(part)
        if not isinstance(child, dict):
            child = {}
            node[part] = child
        node = child
    node[path[-1]] = value


def _default(dotted: str) -> Any:
    name, *path = dotted.split(".")
    node: Any = FILES[name]().model_dump(mode="json")
    for part in path:
        node = node[part]
    return node


def calendar_for_zone(zone: str) -> str | None:
    """The holiday calendar of the place a time zone is in, from the shipped list; None for a zone it doesn't list."""
    for calendar, names in (_data().get("holiday_calendar_zones") or {}).items():
        for name in names:
            if zone == name or (name.endswith("/") and zone.startswith(name)):
                return str(calendar)
    return None


def formats_for_language(language: str) -> dict[str, str]:
    """How dates are written for a language: its entry in the shipped list, empty when it has none."""
    table = _data().get("date_formats_by_language") or {}
    return dict(table.get(str(language).replace("_", "-")) or {})


def apply(raw: dict[str, dict[str, Any]], sources: Mapping[str, str]) -> None:
    """Fill the settings no layer sets with what the app works out, and let each merged setting follow the one the
    screen shows. `raw` is the files' contents with environment variables and flags laid over them; `sources` names the
    layer that set each key."""
    language = _get(raw, "workspace.language") or _default("workspace.language")
    for key, value in formats_for_language(language).items():
        dotted = f"language.messages.{key}"
        if dotted not in sources:
            _set(raw, dotted, value)
    zone = _get(raw, "workspace.user.timezone") or _default("workspace.user.timezone")
    if "language.holiday_calendar" not in sources and (calendar := calendar_for_zone(str(zone))):
        _set(raw, "language.holiday_calendar", calendar)
    for rule in FOLLOWS:
        if rule.leader not in sources or rule.follower in sources:
            continue
        value = rule.convert(_get(raw, rule.leader))
        if value is not None:
            _set(raw, rule.follower, value)

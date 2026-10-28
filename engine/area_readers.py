"""Which AI accounts may read an area of life (design 6.32, "Personal life").

There is one way to say who reads what: content levels. A project carries levels, and an account takes some of them (or,
with no list, every level). The picker on an area's page is that same thing seen from the accounts: ticking an account
makes it take the area's own level, unticking an account makes it stop taking it. An area with no level of its own gets
one the first time someone is left out, named from the area and described by its name; an area everyone may read needs
none. A level an area inherits from the project above it is never changed here: an account that level keeps out stays
out, and the picker says so.

`plan` works out the changes from the records and the settings and writes nothing; the route applies them.
"""

from __future__ import annotations

import re
from collections.abc import Collection
from dataclasses import dataclass, field
from typing import Any

from engine import areas
from engine.ai.router import LEVELS, takes
from engine.ai.smoke import where_of

#: What an area's own level is named after: the prefix and the area's name, folded to letters, digits and hyphens.
LEVEL_PREFIX = "area-"


@dataclass(frozen=True)
class Choice:
    """One account the picker offers: its short name and the name the person gave it, whether it may read the area now,
    whether reading sends the material away from this computer, and why it can't be ticked (`parent`: a level the
    project above carries keeps it out)."""

    account: str
    name: str
    reads: bool
    leaves: bool
    locked: str | None = None


@dataclass
class Plan:
    """What it takes to make the readers the person chose: the area's own `level` (None when none is needed), the level
    to add to the AI settings (`new_level`: id and what it covers), the area's content levels after the change
    (`project_levels`, None when they stay), and each account's levels after the change (`provider_levels`: a list, or
    None for an account that takes every level)."""

    level: str | None = None
    new_level: tuple[str, str] | None = None
    project_levels: list[str] | None = None
    provider_levels: dict[str, list[str] | None] = field(default_factory=dict)

    @property
    def changes(self) -> bool:
        return bool(self.new_level or self.project_levels is not None or self.provider_levels)


def candidates(cfg: Any) -> list[str]:
    """The accounts that could read an area's material at all: each one a tier uses that may see internal material,
    once, in tier order."""
    found: list[str] = []
    for tier in cfg.ai.tiers.values():
        for ref in [tier.use, *tier.fallback]:
            name = ref.partition("/")[0] if ref else ""
            provider = cfg.ai.providers.get(name)
            if provider is None or name in found:
                continue
            if LEVELS.index("internal") <= max(LEVELS.index(lvl) for lvl in provider.allowed_data):
                found.append(name)
    return found


def _inherited(view: Any, project_id: str) -> tuple[str, ...]:
    """The levels an area has from the projects above it, not its own."""
    record = view.get("project", project_id)
    parent = record.data.get("parent") if record is not None else None
    return areas.levels_of(view, parent) if parent else ()


def _own(view: Any, project_id: str) -> list[str]:
    record = view.get("project", project_id)
    return list((record.data.get("content_levels") if record is not None else None) or [])


def choices(view: Any, cfg: Any, project_id: str) -> list[Choice]:
    """Each account that could read the area, with whether it does now."""
    levels = frozenset(areas.levels_of(view, project_id))
    inherited = frozenset(_inherited(view, project_id))
    found = []
    for name in candidates(cfg):
        provider = cfg.ai.providers[name]
        found.append(
            Choice(
                account=name,
                name=provider.label or name,
                reads=takes(provider, levels),
                leaves=where_of(provider) != "local",
                locked=None if takes(provider, inherited) else "parent",
            )
        )
    return found


def _level_id(cfg: Any, name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.casefold()).strip("-") or "area"
    base, n = f"{LEVEL_PREFIX}{slug}", 1
    found = base
    while found in cfg.ai.content_levels:
        n += 1
        found = f"{base}-{n}"
    return found


def plan(view: Any, cfg: Any, project_id: str, wanted: Collection[str]) -> Plan:
    """The changes that make exactly `wanted` (accounts' short names) the accounts that may read the area, among the
    accounts that could. An account the project above keeps out can't be wanted. Raises ValueError for an account
    that isn't one that could read an area, or one a level above the area keeps out."""
    offered = {c.account: c for c in choices(view, cfg, project_id)}
    for name in wanted:
        if name not in offered:
            raise ValueError(f"{name} isn't an account that can read an area")
        if offered[name].locked:
            raise ValueError(
                f"{offered[name].name} can't read this area: a level the project above it carries keeps it out"
            )
    result = Plan()
    own = _own(view, project_id)
    needed = [c for c in offered.values() if c.account not in wanted and not c.locked and c.reads]
    wants_in = [c for c in offered.values() if c.account in wanted and not c.reads]
    if not needed and not wants_in:
        return result
    record = view.get("project", project_id)
    level = own[0] if own else None
    if level is None:
        if not needed:
            return result  # everyone asked for already reads it, and no level is needed to say so
        level = _level_id(cfg, str(record.data.get("name") or project_id))
        result.new_level = (level, str(record.data.get("name") or project_id))
        result.project_levels = [*own, level]
    result.level = level
    area_levels = result.project_levels or own
    for c in offered.values():
        provider = cfg.ai.providers[c.account]
        held = provider.content_levels
        if c.account in wanted:
            # Every level of the area's own that it lacks, so that it takes them all. An account with no list takes all.
            lacks = [lv for lv in area_levels if held is not None and lv not in held]
            if lacks:
                result.provider_levels[c.account] = [*held, *lacks]  # type: ignore[misc]
        elif not c.locked and held is None:
            # It took every level, this one too: it now takes every other level and not this.
            others = [lv for lv in cfg.ai.content_levels if lv != level]
            result.provider_levels[c.account] = others
        elif not c.locked and held is not None and level in held:
            result.provider_levels[c.account] = [lv for lv in held if lv != level]
    return result

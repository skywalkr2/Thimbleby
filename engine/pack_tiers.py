"""A plugin's own tiers (design 3.3, 4.8): declared by the plugin, mapped by the person, and never picked by the core.

A plugin declares a tier with `registrar.tier(...)`: a label, a description and the core tier it falls back to. The
person maps it in Settings or the setup guide to an account and model, and that mapping is the setting
`ai.tiers.<id>`. Until it is mapped, the work of the plugin's task kinds that name it runs on the fallback tier, which
is one the person already set up, so no account is ever chosen here. The core's own work never uses a plugin's tier.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class PackTier:
    """A declared tier and where it stands now."""

    id: str
    plugin: str
    label: str
    description: str
    falls_back_to: str
    mapped: bool  # the person gave it an account
    used_by: tuple[str, ...]  # the plugin's task kinds that name it


def mapped(cfg: Any, tier: str) -> bool:
    """Whether the person gave this tier an account."""
    settings = cfg.ai.tiers.get(tier)
    return settings is not None and bool(settings.use)


def effective(cfg: Any, plugins: Any, tier: str) -> str:
    """The tier a piece of work runs on: the tier itself, or, for a declared tier of a plugin that the person hasn't
    mapped, the core tier it falls back to."""
    if "/" not in tier or mapped(cfg, tier):
        return tier
    declared = plugins.pack_tiers().get(tier)
    return declared.falls_back_to if declared is not None else tier


def declared(cfg: Any, plugins: Any) -> list[PackTier]:
    """Every tier the running plugins declare, with whether it is mapped, in plugin then name order."""
    return [
        PackTier(
            tier.name,
            tier.name.partition("/")[0],
            tier.label,
            tier.description,
            tier.falls_back_to,
            mapped(cfg, tier.name),
            tuple(plugins.tier_task_kinds(tier.name)),
        )
        for tier in plugins.pack_tiers().values()
    ]


def unmapped_in_use(cfg: Any, plugins: Any) -> list[PackTier]:
    """The declared tiers some task kind names that the person hasn't mapped: their work runs on the fallback."""
    return [t for t in declared(cfg, plugins) if not t.mapped and t.used_by]

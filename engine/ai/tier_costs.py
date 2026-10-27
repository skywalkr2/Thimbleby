"""What each AI tier costs a day (design 7.9, roadmap B-11b), read from the recorded calls alone: the cost of the tier's
calls over the days `ai.models.use_days` names, divided by those days. A call that did no work isn't counted; a call
with no known price is counted apart (`unpriced`) and never as free, so a day's figure is a floor when there are any.
Only the core's tiers are listed: an add-on's own tiers are mapped under the add-on."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any


@dataclass(frozen=True)
class TierCost:
    runs: int  # calls on the tier in the window
    unpriced: int  # of those, calls whose cost isn't known
    days: int  # the window's days
    per_day_usd: float | None  # the known cost per day; None when the tier had no calls


def per_tier(view: Any, cfg: Any, now: datetime) -> dict[str, TierCost]:
    """The cost per day of every core tier, over the last `ai.models.use_days` days."""
    days = cfg.ai.models.use_days
    start = (now - timedelta(days=days)).astimezone(UTC)
    runs: dict[str, int] = {}
    unpriced: dict[str, int] = {}
    spent: dict[str, float] = {}
    for stored in view.since("run", "started_at", start.date().isoformat()):
        run = stored.data
        when = datetime.fromisoformat(str(run["started_at"]))
        if run.get("no_work") or (when if when.tzinfo else when.replace(tzinfo=UTC)).astimezone(UTC) < start:
            continue
        tier = run["tier"]
        runs[tier] = runs.get(tier, 0) + 1
        if run.get("cost_usd") is None:
            unpriced[tier] = unpriced.get(tier, 0) + 1
        else:
            spent[tier] = spent.get(tier, 0.0) + float(run["cost_usd"])
    return {
        name: TierCost(
            runs.get(name, 0), unpriced.get(name, 0), days, spent.get(name, 0.0) / days if name in runs else None
        )
        for name in cfg.ai.tiers
        if "/" not in name
    }

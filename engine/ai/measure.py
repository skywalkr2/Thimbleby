"""Measuring an account on request (design 6.16, "What a model can do, measured").

"Measure" runs the golden cases, the plugins' own cases and the learning pairs on one account's models and adds the
runs to the capability matrix (`engine/ai/matrix.py`), the same work the check on a switch does. Spending is the
person's choice, so an estimate comes first (`estimate`), and only the cases and pairs whose material the account is
allowed to see are priced and run: its most private allowed data level decides (`engine.skills.within_level`).

A measuring spends the person's own money, so it counts like any other work. Each case it runs is recorded in the
person's store as a run of the kind `TASK` (`Meter.count`), which the daily and monthly totals add up like every other
run. The limits apply before it starts (`limit_reached`: a limit already used up refuses it; `Left`: an estimate above
what is left today needs the person's go, as one above the amount to ask about does) and before each case
(`Meter.stops`): a case that began is finished, the cases after it are not made, what was measured is kept and the
measuring is kept as failed, saying which limit stopped it.

A measuring that was asked for is kept on this computer, in the workspace's private folder, so a restart finishes what
was asked: for each model, `waiting`, `measuring` or `failed` with why. A finished one leaves nothing here; the matrix
holds what it found. Nothing here is a setting.
"""

from __future__ import annotations

import json
import os
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from engine.ai.router import LEVELS
from engine.config import Config, load_config
from engine.state_file import changing, write_whole
from engine.storage import Store, WriteContext
from engine.usage import spend

STATE_FILE = "ai-measures.json"
WAITING, MEASURING, FAILED = "waiting", "measuring", "failed"
#: Why a measuring failed, as kept; the screen words them.
NO_ANSWER, UNFINISHED = "no-answer", "unfinished"
#: Stopped before the end because the day's or the month's spending limit was reached.
LIMIT_DAY, LIMIT_MONTH = "limit-day", "limit-month"
#: What a measuring's runs are recorded as: the kind of work, and the tier, so every report of the runs names them.
TASK = TIER = "measurement"
_SYSTEM = WriteContext(actor="engine", trust="trusted", op="run.record")


class MeasureError(ValueError):
    """A measuring that can't be planned; the message says why in plain words."""


@dataclass(frozen=True)
class Plan:
    """What measuring an account would run."""

    account: str
    models: list[str]  # the short names of the models measured, each on its own
    level: str | None  # the most private data level the account may see, None when it may see none
    cases: int  # what one model's measuring runs: cases, the plugins' cases, pairs and scenarios
    skipped: int  # left out because their material is more private than the account may see
    runs: int  # how many times each runs
    usd: float | None  # about what all of it costs; None when a model's price isn't known


def most_private(cfg: Config, account: str) -> str | None:
    """The most private data level an account is allowed to see; None when it is allowed none."""
    provider = cfg.ai.providers.get(account)
    levels = [level for level in (provider.allowed_data if provider else []) if level in LEVELS]
    return max(levels, key=LEVELS.index) if levels else None


def _everything(ws: Any) -> int:
    """How many cases, plugin cases, pairs and scenarios there are, whoever may see them."""
    from engine.ai import switch_check
    from engine.evaluate import load_cases, load_pack_cases
    from engine.pairs import load_pairs, load_scenarios

    template = switch_check._template()
    return (
        len(load_cases(template))
        + len(load_pack_cases(ws.root))
        + len(load_pairs(template))
        + len(load_scenarios(template))
    )


def estimate(
    cfg: Config,
    ws: Any,
    account: str,
    model: str | None = None,
    env: Mapping[str, str] | None = None,
    ai_config: Path | None = None,
) -> Plan:
    """What measuring an account's models (or the one named, by its short name) would run and cost, priced as the
    switch check prices its cases. Raises MeasureError for an account or model that isn't there."""
    from engine.ai import switch_check

    provider = cfg.ai.providers.get(account)
    if provider is None:
        raise MeasureError(f"There is no account called {account}.")
    if model is not None and model not in provider.models:
        raise MeasureError(f"{model} isn't one of this account's models.")
    shorts = [model] if model is not None else list(provider.models)
    level = most_private(cfg, account)
    total = _everything(ws)
    runs = cfg.ai.evaluation.runs
    if level is None:
        return Plan(account, shorts, None, 0, total, runs, 0.0)
    usd: float | None = 0.0
    count = 0
    for short in shorts:
        price, count = switch_check.estimate(
            cfg, ws, f"{account}/{short}", env, ai_config=ai_config, most_private=level
        )
        usd = None if price is None or usd is None else usd + price
    # Nothing to run costs nothing, whatever the account's price: an unknown price only matters for work that runs.
    return Plan(account, shorts, level, count, max(0, total - count), runs, 0.0 if not count else usd)


@dataclass(frozen=True)
class Left:
    """What the person's spending limits leave, counted from every recorded run (a measuring's too)."""

    spent_today_usd: float
    today_usd: float  # what may still be spent today: the day's limit or the month's, whichever is nearer
    month_usd: float

    def passed_by(self, plan: Plan) -> bool:
        """Whether the plan's estimate is more than what is left today. An unknown price can't pass anything."""
        return plan.usd is not None and plan.usd > self.today_usd


def left(store: Store, cfg: Config, now: datetime | None = None) -> Left:
    """What is left of the day's and the month's limits, never below nothing."""
    s = spend(store, cfg, now)
    day, month = max(0.0, s.per_day_usd - s.today_usd), max(0.0, s.per_month_usd - s.month_usd)
    return Left(s.today_usd, min(day, month), month)


def limit_reached(store: Store, cfg: Config, now: datetime | None = None) -> str | None:
    """`LIMIT_MONTH` or `LIMIT_DAY` when that limit is already used up (as the router stops other work), else None."""
    s = spend(store, cfg, now)
    if s.month_usd >= s.per_month_usd:
        return LIMIT_MONTH
    if s.today_usd >= s.per_day_usd:
        return LIMIT_DAY
    return None


def needs_go(cfg: Config, plan: Plan, room: Left | None = None) -> bool:
    """Whether the person's go is needed first: the estimate is above the amount they asked to be asked about, or
    there is none and they asked to be asked about those too, or (given `room`) it is more than the limits leave
    today."""
    budgets = cfg.ai.budgets
    if room is not None and room.passed_by(plan):
        return True
    if plan.usd is None:
        return budgets.confirm_unpriced
    return plan.usd > budgets.confirm_above_usd


class Meter:
    """Counts what one measuring spends in the person's own spending, and says when a limit stops it. The cases run on a
    scratch copy with a store of its own, so what each case cost (`RunResult.cost_usd`, from its recorded calls) is
    written here as runs in the person's store, where the totals the limits read are added up."""

    def __init__(self, store: Store, cfg: Config, now: Callable[[], datetime] | None = None) -> None:
        self.store, self.cfg = store, cfg
        self.now = now or (lambda: datetime.now(UTC))
        self.reason: str | None = None  # which limit stopped it, once one has

    def stops(self) -> bool:
        """Whether a limit is used up, so the next case isn't made. Once one has stopped it, it stays stopped."""
        if self.reason is None:
            self.reason = limit_reached(self.store, self.cfg, self.now())
        return self.reason is not None

    def count(self, result: Any) -> None:
        """Record what one finished case cost, as a run on each account it called (its cost shared among them, as the
        capability matrix shares it). A case that made no call, or whose cost isn't known, adds nothing to count."""
        if not result.accounts or not (result.cost_usd or 0.0) > 0.0:
            return
        share = result.cost_usd / len(result.accounts)
        at = self.now().isoformat()
        with self.store.transaction() as tx:
            for ref in result.accounts:
                provider, _, model = ref.partition("/")
                tx.create(
                    "run",
                    {
                        "request": None,
                        "task": TASK,
                        "provider": provider,
                        "model": model,
                        "tier": TIER,
                        "cost_usd": share,
                        "seconds": result.seconds / len(result.accounts),
                        "outcome": "ok",
                        "started_at": at,
                    },
                    _SYSTEM,
                )


def metered(run: Callable[..., Any], store: Store, cfg: Config) -> Callable[..., Any]:
    """`run` (an evaluator such as `switch_check.evaluate_on`) with a `Meter` passed in when it takes one, so what a
    check spends counts toward the person's limits like any run; an evaluator that takes none is called as it is."""
    import inspect

    try:
        takes = "meter" in inspect.signature(run).parameters
    except (TypeError, ValueError):
        takes = False
    if not takes:
        return run
    return lambda *args, **kwargs: run(*args, meter=Meter(store, cfg), **kwargs)


# ---- what is kept ----------------------------------------------------------------------------------------------------


def path_of(ws: Any) -> Path:
    """Where this workspace keeps the measurings that were asked for."""
    return ws.private_dir / STATE_FILE


def read(ws: Any) -> dict[str, dict[str, Any]]:
    """Every asked-for measuring by "account/short model name": `state` (waiting, measuring or failed), `why` for a
    failed one and `at`."""
    try:
        data = json.loads(path_of(ws).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return (
        {k: v for k, v in data.items() if isinstance(k, str) and isinstance(v, dict)} if isinstance(data, dict) else {}
    )


def _write(ws: Any, data: dict[str, dict[str, Any]]) -> None:
    write_whole(path_of(ws), json.dumps(data, sort_keys=True, indent=2) + "\n")


def _now() -> str:
    return datetime.now(UTC).isoformat()


def begin(ws: Any, refs: list[str]) -> list[str]:
    """Ask for these models ("account/short name") to be measured. One already waiting or measuring is left as it is;
    one that failed is asked again. Returns the refs that were already waiting or measuring."""
    with changing(path_of(ws)):
        data = read(ws)
        already = [ref for ref in refs if data.get(ref, {}).get("state") in (WAITING, MEASURING)]
        for ref in refs:
            if ref not in already:
                data[ref] = {"state": WAITING, "why": None, "at": _now()}
        _write(ws, data)
    return already


def waiting(ws: Any) -> list[str]:
    """The models whose measuring is still to run."""
    return [ref for ref, entry in read(ws).items() if entry.get("state") == WAITING]


def interrupted(ws: Any) -> None:
    """Put the measurings that were running when the app stopped back to waiting, to run again from the start. Called
    when no thread is measuring."""
    with changing(path_of(ws)):
        data = read(ws)
        for entry in data.values():
            if entry.get("state") == MEASURING:
                entry["state"] = WAITING
        _write(ws, data)


def state_of(ws: Any, ref: str) -> dict[str, Any] | None:
    return read(ws).get(ref)


def _set(ws: Any, ref: str, state: str | None, why: str | None = None) -> None:
    with changing(path_of(ws)):
        data = read(ws)
        if state is None:
            data.pop(ref, None)
        elif ref in data:
            data[ref] = {**data[ref], "state": state, "why": why, "at": _now()}
        _write(ws, data)


def run_waiting(
    ws: Any,
    env: Mapping[str, str] | None = None,
    evaluator: Callable[..., Any] | None = None,
    *,
    store: Store,
    now: Callable[[], datetime] | None = None,
) -> list[str]:
    """Run every measuring still waiting, one after another. Each adds its runs to the matrix and leaves nothing
    behind, and its cost is counted in the person's spending in `store` (`Meter`); one that wasn't answered at all,
    or that can't finish, is kept as failed with why, never as a result, and one a spending limit stopped is kept as
    failed too, with what it measured before that kept in the matrix. Returns the models that were run."""
    from engine.ai import switch_check

    env = os.environ if env is None else env
    run = evaluator or switch_check.evaluate_on
    done = []
    for ref in waiting(ws):
        _set(ws, ref, MEASURING)
        try:
            cfg = load_config(ws.config_dir, env=dict(env))
            meter = Meter(store, cfg, now)
            report = run(ref, cfg, ws, env, most_private(cfg, ref.partition("/")[0]), meter=meter)
            if meter.reason is not None:
                _set(ws, ref, FAILED, meter.reason)
            elif any(not r.not_run for r in report.results):
                _set(ws, ref, None)
            else:
                _set(ws, ref, FAILED, NO_ANSWER)
        except Exception:  # a measuring that can't run is shown as one that didn't finish, never as a result
            _set(ws, ref, FAILED, UNFINISHED)
        done.append(ref)
    return done

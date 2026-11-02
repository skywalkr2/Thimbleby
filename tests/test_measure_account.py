"""Measuring an account on request (design 6.16, "What a model can do, measured"): the estimate comes first and counts
only the cases and pairs the account is allowed to see, a cost above the amount the person asked to be asked about is
refused without their go, and the measuring runs in the background and fills the capability matrix. The harness is the
real one with the stand-in AI; only the price and which cases run are set here."""

from __future__ import annotations

import shutil
from datetime import UTC, datetime
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

import engine.evaluate as ev
import engine.pairs as pairs
from api.app import create_app
from engine.ai import matrix, measure, switch_check
from engine.config import load_config
from engine.evaluate import Report, RunResult, evaluate, load_cases
from engine.skills import skills as skill_list
from engine.storage import Store, WriteContext
from engine.usage import spend
from engine.workspace import init_workspace
from tests.conftest import DEMO_B

OTHER = "other"
CASES = ("close-action",)
SKILL = next(s.id for s in skill_list())


@pytest.fixture
def env(tmp_path, monkeypatch):
    """A workspace with the `stub` account and a second account `other` that may see internal material at most, a
    client on its app, and the price of one model's check set to a number."""
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    path = ws.config_dir / "ai.yaml"
    raw = yaml.safe_load(path.read_text())
    raw["providers"][OTHER] = {
        "adapter": "stub",
        "models": {"default": "other-a", "harder": "other-b"},
        "allowed_data": ["open", "internal"],
    }
    path.write_text(yaml.safe_dump(raw, sort_keys=False))
    cfg = ws.config(env={})
    Store(ws.db_path, cfg=cfg).close()
    app = create_app(ws, cfg, "t", start_worker=False)
    client = TestClient(app)
    client.headers["Authorization"] = "Bearer t"
    priced = []

    def price(cfg, ws, ref, env=None, ai_config=None, most_private=None):
        priced.append((ref, most_private))
        return 0.5, 40

    monkeypatch.setattr(switch_check, "estimate", price)
    return ws, app, client, priced


def api(ws) -> str:
    return load_config(ws.config_dir, env={}).server.base_path.rstrip("/") + "/api"


def finish(app):
    thread = app.state.worker._measuring
    if thread is not None:
        thread.join(timeout=60)
        assert not thread.is_alive()


def stub_measuring(ref, cfg, ws, env, most_private, meter=None):
    """What measuring runs, with the stand-in AI answering a few cases ideally: the real harness and the matrix."""
    report = evaluate(DEMO_B, stub=True, runs=1, env={}, only=list(CASES), most_private=most_private, meter=meter)
    matrix.record_report(ws, report, stale_days=cfg.ai.skills.stale_days)
    return report


def skills_of(client, ws, account, model):
    found = client.get(f"{api(ws)}/ai/skills").json()
    row = next(m for a in found["accounts"] if a["name"] == account for m in a["models"] if m["model"] == model)
    return row, {s["id"]: s for s in row["skills"]}


# ---- the estimate ---------------------------------------------------------------------------------------------------


def test_the_estimate_names_the_models_the_level_the_account_may_see_and_what_asking_would_need(env):
    ws, _app, client, priced = env
    cfg = load_config(ws.config_dir, env={})
    got = client.post(f"{api(ws)}/ai/skills/{OTHER}/estimate", json={}).json()
    assert got["models"] == ["default", "harder"] and got["level"] == "internal"
    assert got["usd"] == pytest.approx(1.0) and got["cases"] == 40 and got["runs"] == cfg.ai.evaluation.runs
    assert got["confirm_above_usd"] == cfg.ai.budgets.confirm_above_usd and got["needs_go"] is True
    # The screen says beside the price what is left of the daily limit, since a test counts toward it.
    assert got["per_day_usd"] == cfg.ai.budgets.per_day_usd
    assert got["left_today_usd"] == cfg.ai.budgets.per_day_usd and got["passes_limit"] is False
    assert priced == [(f"{OTHER}/default", "internal"), (f"{OTHER}/harder", "internal")]
    one = client.post(f"{api(ws)}/ai/skills/{OTHER}/estimate", json={"model": "harder"}).json()
    assert one["models"] == ["harder"] and one["usd"] == pytest.approx(0.5)
    assert client.post(f"{api(ws)}/ai/skills/{OTHER}/estimate").status_code == 200  # no body: every model


def test_an_unknown_account_or_model_is_not_found_and_nothing_is_priced(env):
    ws, _app, client, priced = env
    assert client.post(f"{api(ws)}/ai/skills/nobody/estimate", json={}).status_code == 404
    assert client.post(f"{api(ws)}/ai/skills/{OTHER}/estimate", json={"model": "missing"}).status_code == 404
    assert client.post(f"{api(ws)}/ai/skills/nobody/measure", json={"confirmed": True}).status_code == 404
    assert priced == []


def test_the_go_is_needed_above_the_amount_asked_about_and_for_an_unknown_price_only_when_asked(env):
    cfg = load_config(env[0].config_dir, env={})
    plan = measure.Plan("a", ["m"], "internal", 4, 0, 1, cfg.ai.budgets.confirm_above_usd)
    assert not measure.needs_go(cfg, plan)
    assert measure.needs_go(cfg, measure.Plan("a", ["m"], "internal", 4, 0, 1, cfg.ai.budgets.confirm_above_usd + 0.01))
    unknown = measure.Plan("a", ["m"], "internal", 4, 0, 1, None)
    assert measure.needs_go(cfg, unknown) is cfg.ai.budgets.confirm_unpriced


def test_the_level_is_the_most_private_one_the_account_is_allowed_and_a_case_above_it_is_left_out(tmp_path):
    cfg = load_config(None, env={})
    assert measure.most_private(cfg, "no-such-account") is None
    template = tmp_path / "template"
    shutil.copytree(DEMO_B, template)
    first, second = sorted((template / "evals").glob("*.yaml"))[:2]
    for path, level in ((first, "restricted"), (second, "open")):
        path.write_text(yaml.safe_dump({**yaml.safe_load(path.read_text()), "data_level": level}))
    held, open_case = (yaml.safe_load(p.read_text())["id"] for p in (first, second))
    for most_private, expected in (("restricted", {held, open_case}), ("internal", {open_case}), ("open", {open_case})):
        report = evaluate(template, stub=True, runs=1, env={}, only=[held, open_case], most_private=most_private)
        assert {r.case for r in report.results} == expected, most_private
        assert held in report.case_set, "the report still names every case, so the set measured doesn't change"


def test_an_unknown_data_level_on_a_case_or_pair_is_refused_when_it_loads(tmp_path):
    template = tmp_path / "template"
    shutil.copytree(DEMO_B, template)
    path = sorted((template / "evals").glob("*.yaml"))[0]
    path.write_text(yaml.safe_dump({**yaml.safe_load(path.read_text()), "data_level": "secret"}))
    with pytest.raises(ValueError, match="data_level is one of open, internal, restricted"):
        load_cases(template)
    pair_path = sorted((template / "pairs").glob("*.yaml"))[0]
    pair_path.write_text(yaml.safe_dump({**yaml.safe_load(pair_path.read_text()), "data_level": "secret"}))
    with pytest.raises(ValueError, match="data_level is one of"):
        pairs.load_pairs(template)


def test_the_estimate_counts_only_what_the_account_may_see_and_nothing_to_run_costs_nothing(env, monkeypatch):
    ws, _app, _client, _priced = env
    monkeypatch.undo()  # the real estimate, with every shipped case at the level a handed-in note has
    raw = yaml.safe_load((ws.config_dir / "ai.yaml").read_text())
    raw["providers"][OTHER]["allowed_data"] = ["open"]
    (ws.config_dir / "ai.yaml").write_text(yaml.safe_dump(raw, sort_keys=False))
    plan = measure.estimate(load_config(ws.config_dir, env={}), ws, OTHER)
    assert (plan.level, plan.cases, plan.usd) == ("open", 0, 0.0) and plan.skipped > 0
    raw["providers"][OTHER]["allowed_data"] = []
    (ws.config_dir / "ai.yaml").write_text(yaml.safe_dump(raw, sort_keys=False))
    none = measure.estimate(load_config(ws.config_dir, env={}), ws, OTHER)
    assert (none.level, none.cases, none.skipped) == (None, 0, plan.skipped)


# ---- measuring ------------------------------------------------------------------------------------------------------


def test_a_cost_above_the_amount_asked_about_is_refused_without_the_go_and_nothing_starts(env):
    ws, app, client, _priced = env
    refused = client.post(f"{api(ws)}/ai/skills/{OTHER}/measure", json={})
    assert refused.status_code == 409 and "confirmation" in refused.json()["detail"]
    assert measure.read(ws) == {} and app.state.worker._measuring is None
    assert client.post(f"{api(ws)}/ai/skills/{OTHER}/measure").status_code == 409  # no body at all


def test_a_measuring_with_the_go_runs_in_the_background_fills_the_matrix_and_leaves_nothing_waiting(env, monkeypatch):
    ws, app, client, _priced = env
    monkeypatch.setattr(switch_check, "evaluate_on", stub_measuring)
    done = client.post(f"{api(ws)}/ai/skills/stub/measure", json={"confirmed": True})
    assert done.status_code == 200, done.text
    assert done.json()["started"] == ["default"] and done.json()["already"] == []
    assert done.json()["estimate"]["needs_go"] is True
    finish(app)
    assert measure.read(ws) == {}
    row, skills = skills_of(client, ws, "stub", "default")
    assert row["measure"] is None and row["measure_why"] is None
    assert any(s["measured"] and s["runs"] >= 1 for s in skills.values())


def test_a_cost_within_the_amount_asked_about_needs_no_go(env, monkeypatch):
    ws, app, client, _priced = env
    monkeypatch.setattr(switch_check, "estimate", lambda *a, **k: (0.01, 3))
    monkeypatch.setattr(switch_check, "evaluate_on", stub_measuring)
    done = client.post(f"{api(ws)}/ai/skills/stub/measure", json={})
    assert done.status_code == 200 and done.json()["estimate"]["needs_go"] is False
    finish(app)
    assert any(s["measured"] for s in skills_of(client, ws, "stub", "default")[1].values())


def test_an_account_that_may_see_none_of_the_cases_has_nothing_to_measure(env, monkeypatch):
    ws, app, client, _priced = env
    monkeypatch.undo()
    raw = yaml.safe_load((ws.config_dir / "ai.yaml").read_text())
    raw["providers"][OTHER]["allowed_data"] = ["open"]
    (ws.config_dir / "ai.yaml").write_text(yaml.safe_dump(raw, sort_keys=False))
    nothing = client.post(f"{api(ws)}/ai/skills/{OTHER}/measure", json={"confirmed": True})
    assert nothing.status_code == 409 and "Nothing to measure" in nothing.json()["detail"]
    assert measure.read(ws) == {} and app.state.worker._measuring is None


def test_an_account_asked_for_twice_is_measured_once(env):
    ws, _app, _client, _priced = env
    assert measure.begin(ws, [f"{OTHER}/default"]) == []
    assert measure.begin(ws, [f"{OTHER}/default", f"{OTHER}/harder"]) == [f"{OTHER}/default"]
    assert measure.waiting(ws) == [f"{OTHER}/default", f"{OTHER}/harder"]


def test_a_measuring_cut_short_by_a_restart_runs_again_from_the_start(env):
    ws, _app, _client, _priced = env
    measure.begin(ws, [f"{OTHER}/default"])
    measure._set(ws, f"{OTHER}/default", measure.MEASURING)
    assert measure.waiting(ws) == []
    measure.interrupted(ws)
    assert measure.waiting(ws) == [f"{OTHER}/default"]


def test_an_account_that_answered_none_of_the_cases_is_a_failed_measuring_with_why_never_a_result(env, monkeypatch):
    ws, app, client, _priced = env
    never = Report(f"{OTHER}/default", 1, [RunResult("close-action", 1, False, not_run=True)])
    monkeypatch.setattr(switch_check, "evaluate_on", lambda *a, **k: never)
    assert (
        client.post(f"{api(ws)}/ai/skills/{OTHER}/measure", json={"confirmed": True, "model": "default"}).status_code
        == 200
    )
    finish(app)
    row, skills = skills_of(client, ws, OTHER, "default")
    assert row["measure"] == "failed" and "nothing was measured" in row["measure_why"]
    assert not any(s["measured"] for s in skills.values())
    # Asking again starts it again.
    monkeypatch.setattr(switch_check, "evaluate_on", stub_measuring)
    again = client.post(f"{api(ws)}/ai/skills/{OTHER}/measure", json={"confirmed": True, "model": "default"})
    assert again.json()["started"] == ["default"]
    finish(app)
    assert measure.read(ws) == {}


def test_a_measuring_that_cannot_run_is_failed_not_finished(env, monkeypatch):
    ws, app, client, _priced = env

    def broken(*a, **k):
        raise RuntimeError("the program stopped")

    monkeypatch.setattr(switch_check, "evaluate_on", broken)
    client.post(f"{api(ws)}/ai/skills/{OTHER}/measure", json={"confirmed": True, "model": "harder"})
    finish(app)
    row, _ = skills_of(client, ws, OTHER, "harder")
    assert row["measure"] == "failed" and "couldn't finish" in row["measure_why"]
    assert "RuntimeError" not in str(row) and "stopped" not in str(row)


def test_the_real_check_passes_the_level_to_the_cases_and_the_pairs_and_keeps_the_report_whole(env, monkeypatch):
    ws, _app, _client, _priced = env
    seen = []

    def one(label):
        def run(*a, **k):
            seen.append((label, k.get("most_private")))
            return Report("acct/m", 1, [RunResult(label, 1, True)])

        return run

    monkeypatch.setattr(ev, "evaluate", one("case"))
    monkeypatch.setattr(pairs, "evaluate_pairs", one("pair"))
    cfg = load_config(ws.config_dir, env={})
    report = switch_check.evaluate_on("acct/m", cfg, ws, {}, most_private="internal")
    assert seen == [("case", "internal"), ("pair", "internal")] and report.cases() == ["case", "pair"]
    seen.clear()
    switch_check.evaluate_on("acct/m", cfg, ws, {})
    assert seen == [("case", None), ("pair", None)], "a switch check still runs everything"


def test_the_work_of_measuring_stays_in_this_computers_private_folder(env):
    ws, _app, _client, _priced = env
    measure.begin(ws, [f"{OTHER}/default"])
    assert Path(measure.path_of(ws)).parent == ws.private_dir


def test_what_an_account_can_do_is_named_in_plain_words_and_each_says_what_it_means():
    from engine.skills import core_skills

    for skill in core_skills():
        assert skill.description.strip(), skill.id
        internal = ("term", "lesson", "routing", "scope", "injection")
        assert not any(word in skill.label.lower() for word in internal), skill.id


# ---- the spending limits --------------------------------------------------------------------------------------------

PRICE = 0.3  # what each case's run costs, as the fixed price of a priced stand-in account


def priced_cases(monkeypatch, cost=PRICE):
    """Make every case the real harness runs cost a fixed amount on the stand-in account, with no model call."""

    def run_case(template, case, n, **k):
        return RunResult(
            case["id"], n, True, cost_usd=cost, seconds=1.0, accounts=["stub/scripted"], models=["stub/scripted"]
        )

    monkeypatch.setattr(ev, "_run_case", run_case)


def measuring_few(count):
    """An evaluator that runs `count` cases through the real harness with its meter, and fills the matrix."""

    def run(ref, cfg, ws, env, most_private, meter=None):
        only = [c["id"] for c in load_cases(DEMO_B)][:count]
        report = evaluate(DEMO_B, stub=True, runs=1, env={}, only=only, most_private=most_private, meter=meter)
        matrix.record_report(ws, report, stale_days=cfg.ai.skills.stale_days)
        return report

    return run


def set_budgets(ws, **budgets):
    path = ws.config_dir / "ai.yaml"
    raw = yaml.safe_load(path.read_text())
    raw["budgets"] = {**raw.get("budgets", {}), **budgets}
    path.write_text(yaml.safe_dump(raw, sort_keys=False))


def spent_today(ws) -> float:
    store = Store(ws.db_path, cfg=load_config(ws.config_dir, env={}))
    try:
        return spend(store, load_config(ws.config_dir, env={})).today_usd
    finally:
        store.close()


def runs_of(ws):
    store = Store(ws.db_path, cfg=load_config(ws.config_dir, env={}))
    try:
        return [r.data for r in store.read().list("run")]
    finally:
        store.close()


def spend_already(app, usd_amount):
    """A run already recorded today that cost this much."""
    store = app.state.worker.store
    with store.transaction() as tx:
        tx.create(
            "run",
            {
                "task": "extract",
                "provider": "stub",
                "model": "scripted",
                "tier": "routine",
                "cost_usd": usd_amount,
                "outcome": "ok",
                "started_at": datetime.now(UTC).isoformat(),
            },
            WriteContext(actor="engine", trust="trusted", op="run.record"),
        )


def test_what_a_measuring_spends_is_recorded_as_runs_of_its_own_kind_and_counts_in_the_days_total(env, monkeypatch):
    ws, app, client, _priced = env
    priced_cases(monkeypatch)
    monkeypatch.setattr(switch_check, "evaluate_on", measuring_few(3))
    before = client.get(f"{api(ws)}/status").json()["spend"]
    assert before["today_usd"] == 0.0
    assert client.post(f"{api(ws)}/ai/skills/stub/measure", json={"confirmed": True}).status_code == 200
    finish(app)
    runs = runs_of(ws)
    assert len(runs) == 3 and {r["task"] for r in runs} == {"measurement"} and {r["provider"] for r in runs} == {"stub"}
    assert all(r["tier"] == "measurement" and r["outcome"] == "ok" for r in runs)
    assert sum(r["cost_usd"] for r in runs) == pytest.approx(3 * PRICE)
    # The total the limits read, and the one the status line shows, both include it.
    assert spent_today(ws) == pytest.approx(0.9)
    after = client.get(f"{api(ws)}/status").json()["spend"]
    assert after["today_usd"] == pytest.approx(0.9) and after["month_usd"] == pytest.approx(0.9)
    # And the estimate says what is left today.
    got = client.post(f"{api(ws)}/ai/skills/{OTHER}/estimate", json={"model": "harder"}).json()
    assert got["left_today_usd"] == pytest.approx(after["per_day_usd"] - 0.9)


def test_a_case_that_cost_nothing_known_adds_no_run(env, monkeypatch):
    ws, app, client, _priced = env
    priced_cases(monkeypatch, cost=0.0)
    monkeypatch.setattr(switch_check, "evaluate_on", measuring_few(2))
    client.post(f"{api(ws)}/ai/skills/stub/measure", json={"confirmed": True})
    finish(app)
    assert runs_of(ws) == [] and measure.read(ws) == {}


def test_a_measuring_stops_cleanly_at_the_daily_limit_keeps_what_it_measured_and_says_why(env, monkeypatch):
    ws, app, client, _priced = env
    set_budgets(ws, per_day_usd=0.5)
    priced_cases(monkeypatch)
    monkeypatch.setattr(switch_check, "evaluate_on", measuring_few(4))
    done = client.post(f"{api(ws)}/ai/skills/stub/measure", json={"confirmed": True})
    assert done.status_code == 200, done.text
    finish(app)
    # Two cases were made (0.30, then 0.60 passes the 0.50 limit); the next two were not.
    assert len(runs_of(ws)) == 2 and spent_today(ws) == pytest.approx(0.6)
    row, skills = skills_of(client, ws, "stub", "default")
    assert row["measure"] == "failed" and "daily spending limit" in row["measure_why"]
    assert "What was measured is kept" in row["measure_why"]
    assert any(s["measured"] and s["runs"] >= 1 for s in skills.values()), "what was measured stays in the matrix"
    # Asking again while the limit is used up is refused.
    again = client.post(f"{api(ws)}/ai/skills/stub/measure", json={"confirmed": True})
    assert again.status_code == 409 and "Paused until tomorrow" in again.json()["detail"]


def test_the_next_model_waiting_is_stopped_before_its_first_case_when_the_limit_was_reached(env, monkeypatch):
    ws, app, _client, _priced = env
    set_budgets(ws, per_day_usd=0.5)
    priced_cases(monkeypatch)
    store = app.state.worker.store
    measure.begin(ws, [f"{OTHER}/default", f"{OTHER}/harder"])
    measure.run_waiting(ws, {}, measuring_few(4), store=store)
    states = {ref: (v["state"], v["why"]) for ref, v in measure.read(ws).items()}
    assert states == {f"{OTHER}/default": ("failed", "limit-day"), f"{OTHER}/harder": ("failed", "limit-day")}
    assert len(runs_of(ws)) == 2, "the second model made no call at all"


def test_a_limit_used_up_refuses_a_measuring_before_it_starts_and_names_which_limit(env):
    ws, app, client, _priced = env
    spend_already(app, 2.0)  # the daily limit
    refused = client.post(f"{api(ws)}/ai/skills/{OTHER}/measure", json={"confirmed": True})
    assert refused.status_code == 409 and "Paused until tomorrow" in refused.json()["detail"]
    assert "$2.00" in refused.json()["detail"]
    assert measure.read(ws) == {} and app.state.worker._measuring is None
    spend_already(app, 28.0)  # and now the month's
    refused = client.post(f"{api(ws)}/ai/skills/{OTHER}/measure", json={"confirmed": True})
    assert refused.status_code == 409 and "this month's AI budget" in refused.json()["detail"]
    assert measure.read(ws) == {}


def test_an_estimate_above_what_is_left_today_waits_for_the_go_even_when_it_is_cheap(env, monkeypatch):
    ws, app, client, _priced = env
    monkeypatch.setattr(switch_check, "estimate", lambda *a, **k: (0.05, 3))  # under the amount asked about
    monkeypatch.setattr(switch_check, "evaluate_on", stub_measuring)
    spend_already(app, 1.98)  # $0.02 left today
    got = client.post(f"{api(ws)}/ai/skills/stub/estimate", json={}).json()
    assert got["left_today_usd"] == pytest.approx(0.02) and got["passes_limit"] is True and got["needs_go"] is True
    held = client.post(f"{api(ws)}/ai/skills/stub/measure", json={})
    assert held.status_code == 409 and "left of your daily limit" in held.json()["detail"]
    assert "$0.02" in held.json()["detail"] and "stops when the limit is reached" in held.json()["detail"]
    assert measure.read(ws) == {} and app.state.worker._measuring is None
    started = client.post(f"{api(ws)}/ai/skills/stub/measure", json={"confirmed": True})
    assert started.status_code == 200 and started.json()["started"] == ["default"]
    finish(app)


def test_an_estimate_within_what_is_left_needs_no_go_for_the_limit(env, monkeypatch):
    ws, app, client, _priced = env
    monkeypatch.setattr(switch_check, "estimate", lambda *a, **k: (0.05, 3))
    spend_already(app, 1.0)
    got = client.post(f"{api(ws)}/ai/skills/stub/estimate", json={}).json()
    assert got["left_today_usd"] == pytest.approx(1.0) and got["passes_limit"] is False and got["needs_go"] is False


def test_the_month_can_leave_less_than_the_day_and_the_estimate_says_so(env, monkeypatch):
    ws, app, client, _priced = env
    set_budgets(ws, per_day_usd=2.0, per_month_usd=2.5)
    spend_already(app, 1.0)
    # One run today costing 1.0: the day has 1.0 left and the month 1.5.
    got = client.post(f"{api(ws)}/ai/skills/stub/estimate", json={}).json()
    assert got["left_today_usd"] == pytest.approx(1.0)
    spend_already(app, 0.9)
    got = client.post(f"{api(ws)}/ai/skills/stub/estimate", json={}).json()
    assert got["left_today_usd"] == pytest.approx(0.1), "the month's 2.5 less 1.9 is nearer than the day's 2.0 less 1.9"


def test_the_meter_stays_stopped_once_a_limit_has_stopped_it(env):
    ws, app, _client, _priced = env
    store = app.state.worker.store
    cfg = load_config(ws.config_dir, env={})
    meter = measure.Meter(store, cfg)
    assert meter.stops() is False and meter.reason is None
    spend_already(app, 2.0)
    assert meter.stops() is True and meter.reason == measure.LIMIT_DAY
    assert measure.limit_reached(store, cfg) == measure.LIMIT_DAY
    assert measure.left(store, cfg).today_usd == 0.0


def test_the_pairs_are_counted_and_stopped_by_the_same_meter(env, monkeypatch):
    ws, app, _client, _priced = env
    set_budgets(ws, per_day_usd=0.5)

    def run_pair(template, item, n, **k):
        return RunResult(item["id"], n, True, cost_usd=PRICE, accounts=["stub/scripted"], models=["stub/scripted"])

    monkeypatch.setattr(pairs, "_run_pair", run_pair)
    monkeypatch.setattr(pairs, "_run_scenario", run_pair)
    meter = measure.Meter(app.state.worker.store, load_config(ws.config_dir, env={}))
    report = pairs.evaluate_pairs(DEMO_B, stub=True, runs=1, env={}, meter=meter)
    made = [r for r in report.results if not r.not_run]
    assert len(made) == 2 and all(r.not_run for r in report.results[2:]) and len(report.results) > 2
    assert report.results[2].error and "spending limit" in report.results[2].error
    assert len(runs_of(ws)) == 2 and meter.reason == measure.LIMIT_DAY


def test_a_check_run_gets_a_meter_when_its_evaluator_takes_one_and_is_called_as_it_is_otherwise(tmp_path):
    """The switch check and the model watch's check spend the person's money like a measuring, so they are metered."""
    seen = []

    def takes(account, cfg, ws, env, meter=None):
        seen.append(meter)

    def plain(account, cfg, ws, env):
        seen.append("plain")

    store, cfg = object(), object()
    measure.metered(takes, store, cfg)("a", cfg, None, {})
    measure.metered(plain, store, cfg)("a", cfg, None, {})
    assert isinstance(seen[0], measure.Meter) and seen[1] == "plain"

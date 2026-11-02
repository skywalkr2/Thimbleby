"""To-dos get dates (design 6.6, 6.7, P112): the assistant dates every to-do from the dates the input gives and the days
off of whoever does it; the rules only point. A to-do with no date, when the input has dates the rules can read and the
answer asks for none, goes back once (`undated-todo`); a due day that is a day off of everyone who owns the to-do goes
back once with the reason (`due-on-day-off`). Both are judgment lints: the second answer stands. Names, ids and days
come from the fixtures and the date the input was received."""

from __future__ import annotations

import json
from datetime import date

import pytest

from engine.ai.adapters.stub import set_responder
from engine.applier import JUDGMENT_LINTS, Context, Inputs, check
from engine.names import People
from engine.ops import CHANGESET
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records
from tests.test_evaluate_harness import case_of, run_edited
from tests.test_promises import run

CASE = "meeting-order-only-todos-all-dated"
RETURNED = "Your previous answer had these problems"
_SETUP = WriteContext(actor="pm", trust="trusted", op="test.undated")
#: Received on a Friday: "Tuesday" is the 13th and "Wednesday" the 14th.
NOTES = (
    "From: someone\n\nThe walkthrough is Tuesday and go-live is Wednesday.\n"
    "Sam will test the build after the walkthrough."
)


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path)
    yield ws, cfg, store
    store.close()
    set_responder(None)


def owner() -> dict:
    return next(p for p in fixture_records(DEMO_B, "person") if p.get("team") and p["id"] != "PER-1")


def todo(text="Test the build", *, owners=None, quote="Sam will test the build after the walkthrough", **more) -> dict:
    return {
        "op": "action.add",
        "text": text,
        "owners": owners if owners is not None else [owner()["id"]],
        "evidence": {"quote": quote},
        **more,
    }


def asks_for_date() -> dict:
    return {
        "op": "question.add",
        "to": "PER-1",
        "title": "Which day should the build test happen?",
        "text": "The notes order it after the walkthrough but give it no day.",
        "asks_about": "date",
    }


def rounds(*answers: list[dict]):
    """The assistant gives the first answer, then the next each time it is sent back; what it was sent is kept."""
    seen: list[str] = []

    def respond(task) -> str:
        seen.append(task.request)
        return json.dumps({"summary": "Notes.", "ops": answers[min(len(seen), len(answers)) - 1]})

    set_responder(respond)
    return seen


def returned(seen: list[str]) -> list[str]:
    return [r for r in seen if RETURNED in r]


def problems_of(
    env, ops: list[dict], text: str = NOTES, *, actor: str = "assistant", lint: str = "undated-todo"
) -> list:
    _, cfg, store = env
    cs = CHANGESET.validate_python({"ops": ops}, context={"op_models": store.plugins.ops})
    inputs = Inputs("REQ-1", None, text, text, "trusted")
    ctx = Context(store, cfg, People(store, cfg), tuple(store.plugins.ops), inputs, actor=actor)
    return [p for p in check(cs, ctx) if p.check == lint]


def test_both_lints_are_judgment_lints_so_the_answer_to_them_stands():
    assert {"undated-todo", "due-on-day-off"} <= JUDGMENT_LINTS


# ---- the golden case -----------------------------------------------------------------------------


def test_meeting_notes_that_give_only_an_order_get_every_to_do_dated_in_the_golden_set(monkeypatch):
    case = case_of(DEMO_B, CASE)
    assert "before the walkthrough" in case["pasted"] and "after the walkthrough" in case["pasted"]
    assert not any("due_words" in o for o in case["stub_answer"]["ops"]), "the dates come from the anchoring days"
    assert run_edited(monkeypatch, DEMO_B, CASE).passed
    undated = [{k: v for k, v in o.items() if k != "due"} for o in case["stub_answer"]["ops"]]
    result = run_edited(monkeypatch, DEMO_B, CASE, stub_answer={**case["stub_answer"], "ops": undated})
    assert not result.passed and len(result.missing) == 3


# ---- undated-todo --------------------------------------------------------------------------------


def test_an_undated_to_do_goes_back_once_with_the_dates_the_rules_read_and_the_second_answer_stands(env):
    _, _, store = env
    seen = rounds([todo()], [todo()])
    (outcome,), _ = run(env, pasted=NOTES)
    assert len(seen) == 2 and len(returned(seen)) == 1, "asked once more, never a third time"
    assert [r.data["tier"] for r in store.read().list("run")] == ["routine", "routine"]
    said = returned(seen)[0]
    assert "Test the build" in said and "Tuesday (2026-10-13)" in said and "Wednesday (2026-10-14)" in said
    assert "working day that fits" in said and "ask the person for its date" in said
    assert outcome["status"] == "applied"
    made = store.read().get("action", next(r["id"] for r in outcome["records"] if r["kind"] == "action")).data
    assert made["due"] is None, "the answer that stands is kept as it is: no date is made up by a rule"


def test_the_second_answer_may_give_the_day_and_nothing_more_is_asked(env):
    _, _, store = env
    seen = rounds([todo()], [todo(due="2026-10-14")])
    (outcome,), _ = run(env, pasted=NOTES)
    assert len(returned(seen)) == 1
    made = store.read().get("action", next(r["id"] for r in outcome["records"] if r["kind"] == "action")).data
    assert made["due"] == date(2026, 10, 14).isoformat()


def test_a_to_do_with_a_date_or_with_a_question_asking_for_it_is_not_sent_back(env):
    assert problems_of(env, [todo(due="2026-10-14")]) == []
    assert problems_of(env, [todo(), asks_for_date()]) == []
    # One question for all the undated to-dos of the input, not one each.
    assert problems_of(env, [todo(), todo("Update the plan", quote="go-live is Wednesday"), asks_for_date()]) == []


def test_an_input_with_no_date_the_rules_can_read_sends_nothing_back(env):
    assert problems_of(env, [todo()], "Sam will test the build after the walkthrough.") == []


def test_a_to_do_that_waits_for_something_or_carries_words_for_its_date_is_left_alone(env):
    assert problems_of(env, [todo(waiting_for="the build is ready")]) == []
    assert problems_of(env, [todo(due_words="once the keys arrive")]) == []
    assert len(problems_of(env, [todo()])) == 1


def test_each_undated_to_do_is_named_and_the_persons_own_changes_are_never_sent_back(env):
    found = problems_of(env, [todo(), todo("Update the plan", quote="go-live is Wednesday")])
    assert [p.op for p in found] == [0, 1] and "Update the plan" in found[1].message
    assert problems_of(env, [todo()], actor="pm") == []


def test_the_lint_can_be_turned_off(env):
    _, cfg, _ = env
    cfg.checks.lints["undated-todo"] = "off"
    assert problems_of(env, [todo()]) == []


# ---- due-on-day-off ------------------------------------------------------------------------------

DAY = "2026-11-26"  # Thanksgiving, a Thursday
SAID = "Sam will test the build on Thanksgiving."


def test_a_due_day_on_a_holiday_of_the_owners_team_goes_back_once_with_the_reason_and_the_answer_stands(env):
    _, _, store = env
    seen = rounds([todo(due=DAY, quote=SAID)], [todo(due=DAY, quote=SAID)])
    (outcome,), _ = run(env, pasted=SAID)
    assert len(seen) == 2 and len(returned(seen)) == 1
    said = returned(seen)[0]
    assert f"{owner()['full_name']}'s team is off on Thu 11/26 (Thanksgiving)" in said
    assert outcome["status"] == "applied"
    made = store.read().get("action", next(r["id"] for r in outcome["records"] if r["kind"] == "action")).data
    assert made["due"] == DAY


def test_a_working_day_a_person_with_no_team_and_an_owner_who_works_that_day_are_not_sent_back(env):
    lint = "due-on-day-off"
    assert problems_of(env, [todo(due="2026-11-25", quote=SAID)], SAID, lint=lint) == []
    alone = next(p for p in fixture_records(DEMO_B, "person") if not p.get("team"))["id"]
    assert problems_of(env, [todo(due=DAY, owners=[alone], quote=SAID)], SAID, lint=lint) == []
    other_team = next(p for p in fixture_records(DEMO_B, "person") if p.get("team") != owner()["team"])["id"]
    with env[2].transaction() as tx:
        found = tx.get("team", next(t for t in fixture_records(DEMO_B, "team") if other_team in t["members"])["id"])
        tx.update("team", found.id, {"holiday_calendar": "en-GB"}, _SETUP, read_version=found.version)
    # The owners are in two teams with two calendars: one of them works that day, so it isn't sent back.
    owners = [owner()["id"], other_team]
    assert problems_of(env, [todo(due=DAY, owners=owners, quote=SAID)], SAID, lint=lint) == []


def test_an_owners_own_away_period_and_a_closure_are_days_off_with_their_reasons(env):
    lint = "due-on-day-off"
    _, _, store = env
    who = owner()
    with store.transaction() as tx:
        found = tx.get("person", who["id"])
        tx.update(
            "person",
            who["id"],
            {"away": [{"start": "2026-11-18", "label": "vacation"}]},
            _SETUP,
            read_version=found.version,
        )
        team = tx.get("team", who["team"])
        closure = [{"start": "2026-11-19", "end": "2026-11-20", "label": "office move"}]
        tx.update("team", team.id, {"days_off": closure}, _SETUP, read_version=team.version)
    (away,) = problems_of(env, [todo(due="2026-11-18", quote=SAID)], SAID, lint=lint)
    assert f"{who['full_name']} is away on Wed 11/18 (vacation)" in away.message
    (closed,) = problems_of(env, [todo(due="2026-11-20", quote=SAID)], SAID, lint=lint)
    assert "team is off on Fri 11/20 (office move)" in closed.message


def test_a_moved_date_is_read_like_a_new_one_and_the_persons_own_change_is_not(env):
    lint = "due-on-day-off"
    _, _, store = env
    with store.transaction() as tx:
        target = tx.create("action", {"text": "Test the build", "owners": [{"person": owner()["id"]}]}, _SETUP).id
    move = {"op": "action.move", "id": target, "due": DAY, "evidence": {"quote": SAID}}
    (problem,) = problems_of(env, [move], SAID, lint=lint)
    assert "Thanksgiving" in problem.message and problem.severity == "return"
    assert problems_of(env, [move], SAID, actor="pm", lint=lint) == []


def test_the_lint_is_off_when_the_workspace_turns_it_off_and_a_language_with_no_calendar_has_no_holidays(env):
    lint = "due-on-day-off"
    _, cfg, _ = env
    ops = [todo(due=DAY, quote=SAID)]
    assert len(problems_of(env, ops, SAID, lint=lint)) == 1
    cfg.language.holiday_calendar = "de-DE"
    assert problems_of(env, ops, SAID, lint=lint) == []
    cfg.language.holiday_calendar = None
    cfg.checks.lints[lint] = "off"
    assert problems_of(env, ops, SAID, lint=lint) == []

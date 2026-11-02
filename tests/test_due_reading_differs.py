"""The assistant's date stands (design 6.33, P110 J2 and J3): the rules read an action's due words only to compare. When
their reading differs from what the assistant answered (another day, a day where it gave none, or a condition: waiting
for something, or tied to a calendar entry) the answer goes back once with both readings (`due-reading-differs`); the
second answer stands, and a date that still differs is kept marked "check this date". Names, ids and days come from the
fixtures and the date the test input was received."""

from __future__ import annotations

import json

import pytest

from engine.ai.adapters.stub import set_responder
from engine.applier import Context, Inputs, check
from engine.names import People
from engine.ops import CHANGESET
from engine.storage import Store
from engine.workspace import init_workspace
from tests.conftest import DEMO_B
from tests.test_promises import (  # noqa: F401
    NOW,
    action,
    event,
    made_action,
    open_action,
    run,
    someone,
)

LINT = "due-reading-differs"


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path)
    yield ws, cfg, store
    store.close()
    set_responder(None)


RETURNED = "Your previous answer had these problems"


def promise(words: str, *, due: str | None = None, hold: str | None = None, **more) -> dict:
    op = {
        "op": "action.add",
        "text": "Get back to us",
        "owners": [someone()["id"]],
        "due_words": words,
        "evidence": {"quote": "They will get back to us."},
        **more,
    }
    if due is not None:
        op["due"] = due
    if hold is not None:
        op["waiting_for"] = hold
    return op


def rounds(*answers: dict):
    """The assistant gives the first answer, then the next one each time its answer is sent back; the requests it
    received are returned so a test can read what was said to it."""
    seen: list[str] = []

    def respond(task) -> str:
        seen.append(task.request)
        return json.dumps({"summary": "Promises.", "ops": [answers[min(len(seen), len(answers)) - 1]]})

    set_responder(respond)
    return seen


def returned(seen: list[str]) -> list[str]:
    return [r for r in seen if RETURNED in r]


def applied(env, answer_ops: dict, *more: dict):
    _, _, store = env
    seen = rounds(answer_ops, *more)
    (outcome,), _ = run(env, pasted="They will get back to us.")
    return seen, outcome, made_action(store, outcome)


def test_a_date_the_rules_read_differently_goes_back_once_with_both_readings_and_the_second_answer_stands(env):
    seen, outcome, made = applied(env, promise("by the 25th", due="2026-10-30"))
    assert outcome["status"] == "applied" and len(seen) == 2 and len(returned(seen)) == 1
    # Asked exactly twice: the answer that stands is not sent to a stronger tier, nor sent back again.
    assert [r.data["tier"] for r in env[2].read().list("run")] == ["routine", "routine"]
    said = returned(seen)[0]
    assert "by the 25th" in said and "2026-10-25" in said and "2026-10-30" in said
    assert "received 2026-10-09" in said and "keep yours if you are sure" in said
    # It kept its own date, so the person is asked to check it.
    assert (made["due"], made["due_words"], made["due_check"]) == ("2026-10-30", "by the 25th", True)


def test_the_assistant_may_take_the_rules_day_on_the_second_answer_and_nothing_is_left_to_check(env):
    seen, _, made = applied(env, promise("by the 25th", due="2026-10-30"), promise("by the 25th", due="2026-10-25"))
    assert len(returned(seen)) == 1
    assert (made["due"], made["due_check"]) == ("2026-10-25", False)


def test_words_read_the_same_day_are_not_sent_back(env):
    seen, outcome, made = applied(env, promise("by the 25th", due="2026-10-25"))
    assert outcome["status"] == "applied" and len(seen) == 1 and returned(seen) == []
    assert (made["due"], made["due_check"]) == ("2026-10-25", False)


def test_no_date_where_the_rules_read_one_goes_back_once_and_a_second_answer_with_none_keeps_none(env):
    seen, _, made = applied(env, promise("by the 25th"))
    assert len(returned(seen)) == 1 and "you gave no date" in returned(seen)[0]
    assert (made["due"], made["due_words"]) == (None, "by the 25th")
    seen, _, made = applied(env, promise("by the 25th"), promise("by the 25th", due="2026-10-25"))
    assert (made["due"], made["due_check"]) == ("2026-10-25", False)


def test_a_condition_with_a_date_goes_back_once_and_the_assistants_choice_then_stands(env):
    seen, _, made = applied(env, promise("once the keys arrive", due="2026-10-20"))
    said = returned(seen)[0]
    assert len(returned(seen)) == 1 and "once the keys arrive" in said and "waiting for" in said
    assert "2026-10-20" in said
    # Sure of its date, the assistant keeps it: not held, and marked for the person to check.
    assert (made["due"], made["on_hold"], made["due_check"]) == ("2026-10-20", None, True)


def test_a_condition_the_assistant_then_holds_is_on_hold_with_no_date_to_check(env):
    held = promise("once the keys arrive", hold="the keys arrive")
    seen, _, made = applied(env, promise("once the keys arrive", due="2026-10-20"), held)
    assert len(returned(seen)) == 1
    assert (made["due"], made["due_check"]) == (None, False)
    assert made["on_hold"]["waiting_for"] == "the keys arrive"


def test_a_condition_the_assistant_already_holds_is_not_sent_back_and_the_rules_never_hold_it_for_it(env):
    seen, _, made = applied(env, promise("once the keys arrive", hold="the keys arrive"))
    assert returned(seen) == [] and made["on_hold"]["waiting_for"] == "the keys arrive"
    seen, _, made = applied(env, promise("after the workshop"), promise("after the workshop"))
    # Answered with no hold twice: it is not held by a rule, whatever the words read as.
    assert len(returned(seen)) == 1 and "waiting for" in returned(seen)[0]
    assert (made["due"], made["on_hold"]) == (None, None)


def test_before_a_known_entry_goes_back_once_naming_it_and_is_tied_only_when_the_assistant_says_so(env):
    _, _, store = env
    meeting = event(store, "2026-10-15T15:00", "Print sync")
    seen, _, made = applied(env, promise("before the print sync", due="2026-12-01"))
    said = returned(seen)[0]
    assert "tied to the calendar entry 'Print sync' on 2026-10-15" in said
    assert (made["due"], made["due_event"], made["due_check"]) == ("2026-12-01", None, True)
    tied = promise("before the print sync", event=meeting, due_at_event=True)
    seen, _, made = applied(env, promise("before the print sync", due="2026-12-01"), tied)
    assert (made["due"], made["due_event"], made["due_check"]) == ("2026-10-15", meeting, False)


def test_the_lint_can_be_turned_off_and_the_assistants_date_is_still_marked_to_check(env):
    _, cfg, _ = env
    cfg.checks.lints[LINT] = "off"
    seen, outcome, made = applied(env, promise("by the 25th", due="2026-10-30"))
    assert outcome["status"] == "applied" and len(seen) == 1
    assert (made["due"], made["due_check"]) == ("2026-10-30", True)
    seen, _, made = applied(env, promise("once the keys arrive", due="2026-10-20"))
    assert len(seen) == 1 and (made["due"], made["on_hold"], made["due_check"]) == ("2026-10-20", None, True)


def test_a_workspace_whose_language_the_rules_do_not_read_keeps_the_given_date_unchecked(env):
    _, cfg, _ = env
    cfg.workspace.language = "de-DE"
    seen, _, made = applied(env, promise("by the 25th", due="2026-10-30"))
    assert len(seen) == 1 and (made["due"], made["due_check"]) == ("2026-10-30", False)


def test_a_move_whose_day_the_rules_read_differently_is_sent_back_with_both_readings(env):
    _, _, store = env
    target = open_action(store)
    said = "The floor plan can go by the 25th."
    rounds(
        {
            "op": "action.move",
            "id": target,
            "due_words": "by the 25th",
            "due": "2026-10-30",
            "evidence": {"quote": said},
        }
    )
    (outcome,), _ = run(env, pasted=said)
    assert outcome["status"] in ("applied", "held")
    kept = action(store, target)
    if outcome["status"] == "applied":
        assert (kept["due"], kept["due_check"]) == ("2026-10-30", True)


def problems_of(env, ops: list[dict], *, actor: str = "assistant") -> list:
    _, cfg, store = env
    cs = CHANGESET.validate_python({"ops": ops}, context={"op_models": store.plugins.ops})
    ctx = Context(
        store,
        cfg,
        People(store, cfg),
        tuple(store.plugins.ops),
        Inputs("REQ-1", None, "", "They will get back to us.", "trusted"),
        actor=actor,
    )
    return [p for p in check(cs, ctx) if p.check == LINT]


@pytest.mark.parametrize("op", ["action.move", "action.unhold"])
def test_a_move_or_a_resume_is_read_like_a_new_action(env, op):
    _, _, store = env
    target = open_action(store)
    said = {"evidence": {"quote": "by the 25th"}}
    (problem,) = problems_of(env, [{"op": op, "id": target, "due_words": "by the 25th", "due": "2026-10-30", **said}])
    assert problem.severity == "return" and problem.op == 0 and "you gave 2026-10-30" in problem.message
    day = problem.message.split(" read as ")[1].split(" ")[0]
    assert problems_of(env, [{"op": op, "id": target, "due_words": "by the 25th", "due": day, **said}]) == []


def test_the_persons_own_changes_are_not_sent_back(env):
    ops = [promise("by the 25th", due="2026-10-30")]
    assert len(problems_of(env, ops)) == 1
    assert problems_of(env, ops, actor="pm") == []

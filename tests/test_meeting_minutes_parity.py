"""The meeting-minutes parity case (P110 (c)): one set of fictional minutes, handled as one run. The assistant records
each undefined word by what it can read (assumed) or can't (unknown) and asks about neither unless the answer matters,
records a fact for each decision listed, makes a to-do for each action with its owner and day (one for what is to be
written, and one nobody owns that waits for an owner), and asks at most one question. The case's ideal answer passes,
and each part of it is scored: leaving a part out, asking about the readable word or asking a second question fails."""

from __future__ import annotations

import json

import pytest

from engine import new_terms
from engine.evaluate import load_cases
from engine.storage import Store
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records
from tests.test_evaluate_harness import run_edited

CASE = "meeting-minutes-glossary-facts-and-one-question"


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"storage.backups.automatic": False})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()


READABLE, UNREADABLE = "UAT", "QRT"
_PEOPLE = fixture_records(DEMO_B, "person")
ME, SOMEONE = _PEOPLE[0]["full_name"], _PEOPLE[1]["full_name"]


def case():
    return next(c for c in load_cases(DEMO_B) if c["id"] == CASE)


def answer(*, drop=lambda op: False, add=()):
    ideal = case()["stub_answer"]
    return {**ideal, "ops": [op for op in ideal["ops"] if not drop(op)] + list(add)}


def run(monkeypatch, **answers):
    return run_edited(monkeypatch, DEMO_B, CASE, stub_answer=answer(**answers))


def test_the_ideal_answer_passes_with_nothing_extra(monkeypatch):
    result = run_edited(monkeypatch, DEMO_B, CASE)
    assert result.passed and result.missing == [] and result.forbidden == [] and result.extra_weight == 0


def test_the_minutes_are_of_the_shape_the_owners_original_handled():
    found = case()
    text = found["pasted"]
    assert text.count("\n- ") >= 8 and "Decisions" in text and "Actions" in text
    ops = found["stub_answer"]["ops"]
    assert sum(op["op"] == "fact" for op in ops) == 4  # a fact for each decision
    owners = {o for op in ops if op["op"] == "action.add" for o in op.get("owners", [])}
    assert len(owners) == 3 and any(op["op"] == "action.add" and not op.get("owners") for op in ops)
    assert [(w, c) for w, c in ((READABLE, "assumed"), (UNREADABLE, "unknown"))] == [
        (op["term"], op["confidence"]) for op in ops if op["op"] == "glossary.add"
    ]
    assert found["received"] and found["skills"]


def test_the_scan_lists_both_words_and_the_assistant_decides_which_to_ask_about(env):
    _, cfg, store = env
    assert sorted(w for w, _ in new_terms.unknown_words(store, cfg, case()["pasted"])) == [UNREADABLE, READABLE]


def test_a_word_it_can_read_that_is_asked_about_fails(monkeypatch):
    ask = {"op": "question.add", "to": ME, "title": "-", "term": READABLE}
    result = run(monkeypatch, add=[ask])
    assert not result.passed
    assert f"term_question={READABLE}" in result.forbidden and "op=question.add, more_than=1" in result.forbidden


def test_a_second_question_fails_even_about_the_word_it_cant_read(monkeypatch):
    result = run(
        monkeypatch,
        add=[{"op": "question.add", "to": ME, "title": "Who owns the labels?", "text": "Who orders them?"}],
    )
    assert not result.passed and result.forbidden == ["op=question.add, more_than=1"]


def test_each_word_is_scored_by_what_the_assistant_could_read(monkeypatch):
    swapped = [
        {**op, "confidence": "unknown" if op["confidence"] == "assumed" else "assumed"}
        if op["op"] == "glossary.add"
        else op
        for op in case()["stub_answer"]["ops"]
    ]
    result = run_edited(monkeypatch, DEMO_B, CASE, stub_answer={**case()["stub_answer"], "ops": swapped})
    assert not result.passed and len(result.missing) == 2 and all("glossary.add" in m for m in result.missing)
    none = run(monkeypatch, drop=lambda op: op["op"] == "glossary.add")
    assert not none.passed and len(none.missing) == 2


def test_a_decision_left_out_or_a_to_do_for_the_wrong_person_or_day_fails(monkeypatch):
    left_out = run(monkeypatch, drop=lambda op: op["op"] == "fact" and "matte" in op["text"])
    assert not left_out.passed and any("matte" in m for m in left_out.missing)
    late = json.loads(json.dumps(case()["stub_answer"]))
    next(op for op in late["ops"] if op["op"] == "action.add" and "announcement" in op["text"])["due"] = "2026-11-09"
    result = run_edited(monkeypatch, DEMO_B, CASE, stub_answer=late)
    assert not result.passed and any("announcement" in m for m in result.missing)
    ownerless = run(monkeypatch, drop=lambda op: op["op"] == "action.add" and "labels" in op["text"])
    assert not ownerless.passed and any("labels" in m for m in ownerless.missing)


def test_the_item_nobody_owns_is_not_given_an_owner_the_minutes_dont_name(monkeypatch):
    result = run(
        monkeypatch,
        drop=lambda op: op["op"] == "action.add" and "labels" in op["text"],
        add=[
            {
                "op": "action.add",
                "text": "Order the shipping labels",
                "owners": [SOMEONE],
                "due": "2026-11-04",
                "project": "PRJ-1",
                "evidence": {"quote": "The shipping labels still need to be ordered by Wednesday, November 4"},
            }
        ],
    )
    assert not result.passed and any("labels" in m for m in result.missing + result.forbidden)

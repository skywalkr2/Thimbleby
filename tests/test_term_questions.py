"""Questions about unknown words (design 6.8, 6.22): capped per day, shown on Today as one Review line, never raised
again once dropped, and asked only for words that may mean something particular here. Names and ids come from the
fixtures; the AI is the stub.
"""

from __future__ import annotations

from datetime import timedelta

import pytest

from engine import new_terms
from engine.ai.adapters.stub import set_responder
from engine.applier import apply_as_person
from engine.evaluate import load_cases as load_eval_cases
from engine.intake import hand_in
from engine.storage import Store
from engine.today_queue import queue
from engine.workspace import init_workspace
from tests.conftest import DEMO_A, DEMO_B
from tests.test_evaluate_harness import run_edited
from tests.test_learn_input import NOW, asked

CASE_IDS = ("common-words-raise-no-term-question", "acronym-with-local-meaning-on-file-is-never-asked")
#: Short abbreviations that often mean something particular where a person works.
AMBIGUOUS = ("hr", "pr", "qa", "it", "ceo", "cfo", "cto", "kpi", "roi", "pto", "api", "url")


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"storage.backups.automatic": False})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()
    set_responder(None)


def scan_at(env, text: str, now=NOW) -> list[str]:
    ws, cfg, store = env
    handed = hand_in(ws, store, pasted=text, now=now)
    return new_terms.scan(store, cfg, handed.request, text, now)


def test_the_day_has_a_cap_over_every_input_and_the_next_day_asks_again(env):
    _, cfg, store = env
    cfg.dispatch.knowledge.new_terms_per_input = 10
    assert cfg.dispatch.knowledge.new_terms_per_day == 3
    assert len(scan_at(env, "AAA, BBB, CCC, DDD and EEE are all new.")) == 3
    assert scan_at(env, "FFF and GGG are new too.") == []  # the day's questions are already asked
    tomorrow = NOW + timedelta(days=1)
    assert [new_terms.term_of(store.read().get("question", q)) for q in scan_at(env, "FFF and GGG.", tomorrow)] == [
        "FFF",
        "GGG",
    ]
    assert len(asked(store)) == 5


def test_a_cap_of_zero_per_day_asks_nothing(env):
    _, cfg, store = env
    cfg.dispatch.knowledge.new_terms_per_day = 0
    assert scan_at(env, "The XYZ gateway is new.") == [] and asked(store) == []


def test_the_days_term_questions_are_one_review_line_that_opens_them_together(env):
    ws, cfg, store = env
    cfg.dispatch.knowledge.new_terms_per_input = 10
    made = scan_at(env, "AAA, BBB and CCC are new.")
    lines = queue(ws, store, cfg, NOW)
    (line,) = [each for each in lines if each.kind == "terms"]
    assert (line.group, line.count, line.questions) == ("review", 3, made)
    # No question about a word is a line of its own.
    assert not {each.question for each in lines} & set(made)
    # Answering or dropping one takes it out of the line; with none left there is no line.
    apply_as_person(store, cfg, [{"op": "question.drop", "id": made[0], "reason": "Not needed"}], "Dropped")
    (line,) = [each for each in queue(ws, store, cfg, NOW) if each.kind == "terms"]
    assert line.questions == made[1:]
    for each in made[1:]:
        apply_as_person(store, cfg, [{"op": "question.drop", "id": each, "reason": "Not needed"}], "Dropped")
    assert not [each for each in queue(ws, store, cfg, NOW) if each.kind == "terms"]


def test_a_term_the_person_dropped_is_never_raised_again_whatever_the_day_or_the_input(env):
    _, cfg, store = env
    (qid,) = scan_at(env, "The HHH gateway is new.")
    apply_as_person(store, cfg, [{"op": "question.drop", "id": qid, "reason": "Not needed"}], "Dropped")
    assert store.read().get("question", qid).data["status"] == "dropped"
    assert new_terms.raised_terms(store.read()) == {"hhh"}
    month = NOW + timedelta(days=30)
    assert scan_at(env, "The HHH gateway is mentioned again, and again as hhh.", month) == []
    # Another word still gets its question, so the silence is for that one term.
    (other,) = scan_at(env, "The HHH and JJJ gateways.", month)
    assert new_terms.term_of(store.read().get("question", other)) == "JJJ"


def test_the_shipped_list_holds_only_unmistakable_names():
    data = new_terms.load_yaml(new_terms.KNOWN_TERMS_FILE.read_text(encoding="utf-8"))
    assert set(data) == {
        "countries",
        "time_zones",
        "mail_folders",
        "services",
        "file_types",
        "mail_abbreviations",
    }
    shipped = new_terms.shipped_known()
    assert not [word for word in AMBIGUOUS if word in shipped]
    assert {"usa", "utc", "inbox", "github"} <= shipped


def test_a_bare_state_code_in_a_note_is_asked_since_it_may_mean_something_here(env):
    _, _, store = env
    (qid,) = scan_at(env, "Ask the PA to book the room.")
    assert new_terms.term_of(store.read().get("question", qid)) == "PA"


def test_a_short_acronym_with_a_local_meaning_is_asked_unless_the_glossary_has_it(env):
    _, _, store = env
    (qid,) = scan_at(env, "Ask the BKR to book the room.")
    assert new_terms.term_of(store.read().get("question", qid)) == "BKR"


@pytest.mark.parametrize("template", [DEMO_A, DEMO_B])
def test_the_negative_cases_pass_in_both_workspaces_and_fail_when_the_rule_is_broken(monkeypatch, template):
    ids = {case["id"] for case in load_eval_cases(template)}
    assert set(CASE_IDS) <= ids
    for case_id in CASE_IDS:
        assert run_edited(monkeypatch, template, case_id).passed, case_id
    common, local = CASE_IDS
    # A made-up system name the list can't know is asked, so the common-words case fails on it.
    case = next(c for c in load_eval_cases(template) if c["id"] == common)
    broken = run_edited(monkeypatch, template, common, pasted=case["pasted"] + "\nThe QXZ gateway moved.")
    assert not broken.passed and broken.forbidden == ["term_question=True"]
    # Without the glossary entry on file, the acronym is asked about and the case fails.
    unfiled = run_edited(monkeypatch, template, local, given=[])
    assert not unfiled.passed and unfiled.forbidden == ["term_question=BKR"]


def test_a_question_about_a_word_is_never_a_top_priority(env):
    from engine.top_priorities import top_priorities

    _, cfg, store = env
    (qid,) = scan_at(env, "The XYZ gateway is new.")
    assert store.read().get("question", qid).data["status"] == "open"
    assert qid not in {line.question for line in top_priorities(store, cfg, NOW).lines}

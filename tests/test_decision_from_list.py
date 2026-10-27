"""A decision is a choice someone made; what a document lists is a fact (design 6.7): a fact whose evidence is a line a
document lists as decided, and that states the choice as true, goes back once to say that the document lists it. The
rule is on shipped words, with no AI, and the golden case holds the right answer. Names come from the fixtures."""

from __future__ import annotations

import re

import pytest

from engine.applier import Context, Inputs, check
from engine.decision_lines import shipped
from engine.names import People
from engine.ops import CHANGESET
from engine.storage import Store
from engine.workspace import init_workspace
from engine.yaml_load import load_yaml
from tests.conftest import DEMO_A, DEMO_B, fixture_records
from tests.test_evaluate_harness import run_edited

LINT = "decision-from-list"
CASE_ID = "listed-as-decided-is-a-fact"
CASE = load_yaml((DEMO_B / "evals" / f"{CASE_ID}.yaml").read_text(encoding="utf-8"))
PEOPLE = fixture_records(DEMO_B, "person")
ME = next(p for p in PEOPLE if p["id"] == "PER-1")
FIRST = ME["full_name"].split()[0]
LISTED = "Decided: the cover stays blue"
DOCUMENT = f"Notes from the Tuesday sync\n\n- {LISTED}\n- Decision: print the first run in two weeks\n"


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()


def fact(text: str, quote: str = LISTED, **more) -> dict:
    return {"op": "fact", "text": text, "evidence": {"quote": quote}, **more}


def found(env, ops: list[dict], *, raw: str = DOCUMENT, note: str = "", actor: str = "assistant") -> list:
    _, cfg, store = env
    cs = CHANGESET.validate_python({"ops": ops}, context={"op_models": store.plugins.ops})
    ctx = Context(
        store,
        cfg,
        People(store, cfg),
        tuple(store.plugins.ops),
        Inputs("REQ-1", "SRC-1", raw, note, "untrusted"),
        actor=actor,
    )
    return [p for p in check(cs, ctx) if p.check == LINT]


def test_a_listed_decision_stated_as_true_goes_back_to_say_the_document_lists_it(env):
    (problem,) = found(env, [fact("The cover stays blue.")])
    assert (problem.severity, problem.op) == ("return", 0)
    assert "what a document lists as decided" in problem.message and LISTED in problem.message
    assert "The notes list" in problem.message and problem.passage == LISTED


def test_a_fact_that_says_the_document_lists_it_passes(env):
    assert found(env, [fact("The notes list the cover staying blue as decided")]) == []
    assert found(env, [fact("According to the minutes the cover stays blue")]) == []


@pytest.mark.parametrize(
    "line",
    [
        "- Decided: the cover stays blue",
        "1. Decision: the cover stays blue",
        "| Agreed: | the cover stays blue |",
        "* [x] Resolved: the cover stays blue",
        "  > Decided: the cover stays blue",
        "DECIDED: the cover stays blue",
    ],
)
def test_a_list_line_in_any_common_form_counts(env, line):
    quote = re.sub(r"^[\s>*|\-\d.]*(\[[ xX]?\])?[\s|]*", "", line).rstrip(" |")
    assert found(env, [fact("The cover stays blue.", quote=quote)], raw=f"Notes\n{line}\n") != []


@pytest.mark.parametrize(
    "line",
    [
        "Decided by the group: the cover stays blue",
        "The group decided: the cover stays blue",
        f"{FIRST} decided that the cover stays blue",
        "Undecided: the cover colour",
        "We talked about it and decided the cover stays blue",
    ],
)
def test_a_line_that_names_who_chose_is_a_choice_and_is_left_alone(env, line):
    assert found(env, [fact("The cover stays blue.", quote=line)], raw=f"Notes\n{line}\n") == []


def test_the_persons_own_words_their_own_changes_and_a_quote_not_in_the_document_are_left_alone(env):
    assert found(env, [fact("The cover stays blue.")], raw="", note=LISTED) == []
    assert found(env, [fact("The cover stays blue.")], actor="pm") == []
    assert found(env, [fact("The cover stays blue.", quote="Decided: the spine is black")]) == []
    assert found(env, [fact("The cover stays blue.")], raw=f"{DOCUMENT}", note=f"Please file this: {LISTED}") == []


def test_other_ops_and_facts_without_a_listed_decision_are_left_alone(env):
    assert found(env, [{"op": "note", "text": LISTED}]) == []
    assert (
        found(env, [fact("Proofs arrive on Monday.", quote="Proofs arrive on Monday.")], raw="Proofs arrive on Monday.")
        == []
    )


def test_the_severity_and_a_projects_own_setting_decide_what_happens(env):
    _, cfg, _ = env
    project = fixture_records(DEMO_B, "project")[0]["id"]
    cfg.checks.projects[project] = {LINT: "warn"}
    (problem,) = found(env, [fact("The cover stays blue.", project=project)])
    assert problem.severity == "warn"
    cfg.checks.lints[LINT] = "off"
    cfg.checks.projects = {}
    assert found(env, [fact("The cover stays blue.")]) == []


def test_the_labels_and_listing_words_are_shipped_data_for_each_language():
    words = shipped("en-US")
    assert "decided" in words.labels and "lists" in words.listing
    assert shipped("xx") == words, "a language with no list of its own reads the default's"
    assert words.list_line("Plain sentence.") is None


# ---- the golden case ---------------------------------------------------------------------------------------------


@pytest.mark.parametrize("template", [DEMO_A, DEMO_B])
def test_the_golden_case_passes_with_the_right_answer(monkeypatch, template):
    assert run_edited(monkeypatch, template, CASE_ID).passed


@pytest.mark.parametrize("template", [DEMO_A, DEMO_B])
def test_the_golden_case_fails_for_a_decision_stated_as_true_or_asked_about(monkeypatch, template):
    stated = {"summary": "", "ops": [fact("The cover stays blue.")]}
    assert not run_edited(monkeypatch, template, CASE_ID, stub_answer=stated).passed
    asked = {
        "summary": "",
        "ops": [{"op": "question.add", "to": ME["id"], "title": "Should the cover stay blue?", "kind": "decision"}],
    }
    assert not run_edited(monkeypatch, template, CASE_ID, stub_answer=asked).passed


def test_the_stand_in_says_the_document_lists_it_and_the_persons_note_is_their_choice(env):
    from engine.ai.adapters.stand_in import read

    document = f'<untrusted source="notes.md">\n- {LISTED}\n</untrusted>'
    own = f"<note>\n{LISTED}\n</note>"
    (listed,) = [op for op in read(document)["ops"] if op["op"] == "fact"]
    assert listed["text"] == "The notes list that the cover stays blue." and listed["evidence"]["quote"] == LISTED
    (chosen,) = [op for op in read(own)["ops"] if op["op"] == "fact"]
    assert chosen["text"] == "The cover stays blue."
    assert found(env, [listed]) == []

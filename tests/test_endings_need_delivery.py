"""An ending needs delivery words to be done (design 6.33, endings): "mark this closed" isn't "done".

The rules read the words an ending quotes and tell the assistant what they suggest (the `ending-reading` judgment
lint); they rewrite nothing and write no question. The assistant's answer to the finding stands: it is put once, never
a second return and never a stronger tier. Delivery words close the action and credit its owners, a drop credits
nobody, and calling off what an owner was told about leaves no copyable line (the note to them is drafted as an
outward act, see test_drop_and_draft_note). A choice an earlier change held ("Done by <owner>, or no longer needed?")
still settles through `endings.answer`. Names, ids and words come from the fixtures and the settings.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime

import pytest
import yaml

from engine import endings, held_ask
from engine.ai.adapters.stub import set_responder
from engine.ai.router import Router
from engine.applier import Context, Inputs, Problem, apply_as_person, apply_changeset, check, release, undo
from engine.config.schema import LanguageFile
from engine.dispatcher import process
from engine.dispatcher import signal as record_signal  # noqa: F401  (the one place signals are written)
from engine.intake import hand_in
from engine.language_words import shipped
from engine.names import People
from engine.ops import CHANGESET
from engine.record_page import _completed
from engine.storage import Store, StoreError, WriteContext
from engine.today_queue import queue
from engine.workspace import init_workspace
from tests.conftest import DEMO_A, DEMO_B, fixture_records
from tests.test_corrections import pm_of, signals
from tests.test_knowledge_records import apply, request, source

_TEST = WriteContext(actor="pm", trust="trusted", op="test.endings")
NOW = datetime(2026, 10, 20, 9, 0, tzinfo=UTC)
ACTIONS = fixture_records(DEMO_B, "action")
OPEN = [a for a in ACTIONS if a.get("status", "open") == "open" and a.get("owners")]

DELIVERED = "She sent it yesterday"
CALLED_OFF = "The planning sessions will cover it"
CLOSED = "Mark it closed"
BOTH = "She sent it, and the planning sessions will cover the rest"


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()
    set_responder(None)


def someone_elses(cfg) -> dict:
    return next(a for a in OPEN if a["owners"][0]["person"] != pm_of(cfg))


def owners_of(action) -> list[str]:
    return [o["person"] for o in action["owners"]]


def data(store, record_id, kind="action") -> dict:
    return store.read().get(kind, record_id).data


def close_op(action_id, quote):
    return {"op": "action.close", "id": action_id, "evidence": {"quote": quote}}


def drop_op(action_id, quote, reason="Not needed"):
    return {"op": "action.drop", "id": action_id, "reason": reason, "evidence": {"quote": quote}}


def own_note(store, cfg, op, problems=()):
    """The op the assistant proposes from the person's own note, which holds the quote."""
    cs = CHANGESET.validate_python({"ops": [op]}, context={"op_models": store.plugins.ops})
    ctx = Context(
        store,
        cfg,
        People(store, cfg),
        tuple(store.plugins.ops),
        Inputs(request(store, "pm"), None, "", op["evidence"]["quote"], "trusted"),
    )
    cs_id = apply_changeset(cs, list(problems), ctx, run=None)
    return cs_id, [o["status"] for o in store.read().get("changeset", cs_id).data["ops"]]


def held_choice(store, cfg, op):
    """A choice an earlier change held for the person: "Done by <owner>, or no longer needed?"."""
    return own_note(store, cfg, op, [Problem(endings.CHOICE_CHECK, "hold", 0, endings.CHOICE_WAITS)])


def readings_of(store, cfg, op, *, actor="assistant"):
    """The `ending-reading` findings the check makes for one op, as the assistant's answer to an input or a note."""
    cs = CHANGESET.validate_python({"ops": [op]}, context={"op_models": store.plugins.ops})
    ctx = Context(
        store,
        cfg,
        People(store, cfg),
        tuple(store.plugins.ops),
        Inputs(request(store, "input"), source(store), op["evidence"]["quote"], "", "untrusted"),
        actor=actor,
    )
    return [p for p in check(cs, ctx) if p.check == "ending-reading"]


def from_input(store, cfg, op):
    return apply(
        store, cfg, [op], origin="input", trust="untrusted", source_id=source(store), raw=op["evidence"]["quote"]
    )


def linked(store, cs_id):
    """Tie the request the changeset was made for to it, as a run does, so Today shows its held items."""
    changeset = store.read().get("changeset", cs_id)
    with store.transaction() as tx:
        found = tx.get("request", changeset.data["request"])
        tx.update("request", found.id, {"changeset": cs_id}, _TEST, read_version=found.version)


def op_of(store, cs_id, index=0) -> dict:
    return store.read().get("changeset", cs_id).data["ops"][index]


# ---- reading the words ----------------------------------------------------------------------------------------------


def test_the_words_are_read_whole_and_each_kind_wins_only_alone(env):
    _, cfg, _ = env
    words = cfg.language
    assert endings.reading(DELIVERED, words) == "done"
    assert endings.reading(CALLED_OFF, words) == "called_off"
    assert endings.reading(CLOSED, words) == "choice"
    assert endings.reading(BOTH, words) == "choice"  # delivery and a call-off together are not one answer
    assert endings.reading("Mark it closed, it's moot", words) == "called_off"  # a call-off settles "closed"
    assert endings.reading("Mark it closed, she sent it", words) == "done"
    assert endings.reading("Thanks for checking in", words) is None  # no ending words at all: left as proposed
    assert endings.reading("It's undone", words) is None  # whole words only


# ---- the rule through the applier ----------------------------------------------------------------------------------


def test_done_with_delivery_words_credits_the_owner_from_the_persons_own_note_and_from_an_input(env):
    _, cfg, store = env
    target = someone_elses(cfg)
    cs_id, result = own_note(store, cfg, close_op(target["id"], DELIVERED))
    assert result == ["applied"]
    done = data(store, target["id"])
    assert done["status"] == "done" and done["done_by"] == owners_of(target)
    # From an input the same words wait for the person's Keep as an ending always did, and then credit the owner.
    other = next(a for a in OPEN if a["id"] != target["id"] and a["owners"][0]["person"] != pm_of(cfg))
    cs_id, result = from_input(store, cfg, close_op(other["id"], DELIVERED))
    assert result == ["held"]
    release(store, cfg, cs_id, 0)
    assert data(store, other["id"])["done_by"] == owners_of(other)


def test_a_drop_for_call_off_words_credits_nobody_leaves_nothing_in_the_history_and_undo_restores_it(env):
    _, cfg, store = env
    target = someone_elses(cfg)
    cs_id, result = own_note(store, cfg, drop_op(target["id"], CALLED_OFF, reason=CALLED_OFF))
    assert result == ["applied"]
    gone = data(store, target["id"])
    assert (gone["status"], gone["dropped_reason"]) == ("dropped", CALLED_OFF)
    assert gone["done_by"] == [] and gone["reported_by"] is None
    view = store.read()
    owner = target["owners"][0]["person"]
    assert _completed(view, "person", owner, lambda kind, ident: ident) == []  # nothing on the history others read
    assert undo(store, cs_id).restored == [0]
    assert data(store, target["id"])["status"] == "open"


def test_the_rules_never_rewrite_an_ending_or_write_a_question_for_it(env):
    _, cfg, store = env
    target, other = [a for a in OPEN if a["owners"][0]["person"] != pm_of(cfg)][:2]
    # Words that read as called off, a bare "closed": the assistant's own proposal is applied as it was made.
    cs_id, result = own_note(store, cfg, close_op(target["id"], CALLED_OFF))
    assert result == ["applied"] and op_of(store, cs_id)["op"]["op"] == "action.close"
    assert data(store, target["id"])["status"] == "done"
    cs_id, result = own_note(store, cfg, drop_op(other["id"], CLOSED, reason="Marked closed"))
    assert result == ["applied"] and op_of(store, cs_id)["op"]["op"] == "action.drop"
    assert data(store, other["id"])["status"] == "dropped"


def test_a_close_whose_words_read_as_no_longer_needed_is_flagged_with_what_they_suggest(env):
    _, cfg, store = env
    target = someone_elses(cfg)
    (found,) = readings_of(store, cfg, close_op(target["id"], CALLED_OFF))
    assert found.severity == "return" and found.op == 0
    assert found.message == (
        f"The quote '{CALLED_OFF}' reads as no longer needed rather than done: if so, answer with action.drop and "
        "the reason; if it was done, keep the close."
    )
    # A drop with those words and delivery words are not flagged, and nor is the person's own button.
    assert readings_of(store, cfg, drop_op(target["id"], CALLED_OFF)) == []
    assert readings_of(store, cfg, close_op(target["id"], DELIVERED)) == []
    assert readings_of(store, cfg, close_op(target["id"], CALLED_OFF), actor="pm") == []  # the person's button


@pytest.mark.parametrize("make", [close_op, drop_op])
@pytest.mark.parametrize("quote", [CLOSED, BOTH])
def test_closed_alone_or_with_both_kinds_of_words_asks_the_assistant_which_it_was(env, make, quote):
    _, cfg, store = env
    target = someone_elses(cfg)
    (found,) = readings_of(store, cfg, make(target["id"], quote))
    assert found.severity == "return"
    assert found.message == (
        f"The quote '{quote}' doesn't say whether it was done or no longer needed: say which (action.close if it was "
        "done, action.drop with the reason if it wasn't needed), or ask the person with question.add if you can't "
        "tell."
    )


def test_a_done_that_would_credit_someone_else_with_no_word_of_delivery_is_flagged_and_the_persons_own_is_not(env):
    _, cfg, store = env
    other = someone_elses(cfg)
    (found,) = readings_of(store, cfg, close_op(other["id"], "All good on that one"))
    people = People(store, cfg)
    assert found.message.startswith(f"Closing {other['id']} credits {people.name(other['owners'][0]['person'])}")
    assert "says nothing of it being delivered" in found.message
    mine = next((a for a in OPEN if all(o["person"] == pm_of(cfg) for o in a["owners"])), None)
    if mine is not None:
        assert readings_of(store, cfg, close_op(mine["id"], "All good on that one")) == []


def test_a_call_off_that_names_a_meeting_says_which_and_how_to_put_it_on_its_agenda(env):
    _, cfg, store = env
    target = someone_elses(cfg)
    with store.transaction() as tx:
        meeting = tx.create("event", {"title": "Planning sessions", "start": "2099-01-05", "trust": "trusted"}, _TEST)
    quote = "The planning sessions will cover it"
    (found,) = readings_of(store, cfg, drop_op(target["id"], quote))
    assert found.message == (
        f'This call-off names the meeting Planning sessions: if it belongs on its agenda, give the drop "event" '
        f"{meeting.id}."
    )
    # Naming it already, or words that name none, leave nothing to say.
    named = {**drop_op(target["id"], quote), "event": meeting.id}
    assert readings_of(store, cfg, named) == []
    assert readings_of(store, cfg, drop_op(target["id"], "The planning sessions are moot")) == []


# ---- the assistant's answer to the finding stands ------------------------------------------------------------


def in_turn(env, answers: list[dict], *, pasted="Mark it closed"):
    """Hand in a message; the model answers with these ops in turn (the last repeats): the changeset's outcomes and
    what the model was asked."""
    ws, cfg, store = env
    queue = [json.dumps({"summary": "An ending.", "ops": [op]}) for op in answers]
    tasks: list = []

    def responder(task):
        tasks.append(task)
        return queue.pop(0) if len(queue) > 1 else queue[0]

    set_responder(responder)
    handed = hand_in(ws, store, pasted=pasted, now=NOW)
    cs_id = process(ws, store, cfg, Router(cfg, store, env={}), handed.request, now=NOW)
    return cs_id, store.read().get("changeset", cs_id).data["ops"], tasks


def test_the_assistant_keeps_the_close_after_the_finding_and_it_closes_as_done_credited_to_the_owner(env):
    _, cfg, store = env
    target = someone_elses(cfg)
    said = f"{target['text']}: {CALLED_OFF}"
    cs_id, (outcome,), tasks = in_turn(env, [close_op(target["id"], said)], pasted=said)
    assert len(tasks) == 2  # one return with the finding, then its answer stands: no second return, no stronger tier
    assert f"The quote '{said}' reads as no longer needed rather than done" in tasks[1].request
    assert outcome["op"]["op"] == "action.close" and outcome["status"] == "held"  # an ending from an input waits
    release(store, cfg, cs_id, 0)
    assert data(store, target["id"])["done_by"] == owners_of(target)


def test_the_assistant_switches_to_a_drop_after_the_finding_and_it_is_dropped_with_nobody_credited(env):
    _, cfg, store = env
    target = someone_elses(cfg)
    said = f"{target['text']}: {CALLED_OFF}"
    answers = [close_op(target["id"], said), drop_op(target["id"], said, reason=CALLED_OFF)]
    cs_id, (outcome,), tasks = in_turn(env, answers, pasted=said)
    assert len(tasks) == 2
    assert outcome["op"]["op"] == "action.drop" and outcome["op"]["reason"] == CALLED_OFF
    release(store, cfg, cs_id, 0)
    gone = data(store, target["id"])
    assert (gone["status"], gone["dropped_reason"]) == ("dropped", CALLED_OFF) and gone["done_by"] == []


def test_a_bare_closed_goes_back_once_and_the_second_answer_applies_as_given(env):
    _, cfg, store = env
    target = someone_elses(cfg)
    said = f"{target['text']}: {CLOSED}"
    answers = [close_op(target["id"], said), close_op(target["id"], said)]
    cs_id, (outcome,), tasks = in_turn(env, answers, pasted=said)
    assert len(tasks) == 2 and f"The quote '{said}' doesn't say whether it was done" in tasks[1].request
    assert outcome["op"]["op"] == "action.close" and not [
        p for p in outcome.get("problems") or [] if p["check"] == endings.CHOICE_CHECK
    ]  # no rule-written question is held


def test_with_the_lint_off_the_first_answer_applies_with_no_return(env):
    _, cfg, store = env
    cfg.checks.lints["ending-reading"] = "off"
    target = someone_elses(cfg)
    said = f"{target['text']}: {CLOSED}"
    _, (outcome,), tasks = in_turn(env, [close_op(target["id"], said)], pasted=said)
    assert len(tasks) == 1 and outcome["op"]["op"] == "action.close"
    assert [p for p in outcome["problems"] if p["check"] == "ending-reading"] == []


# ---- a choice an earlier change held --------------------------------------------------------------------------------


def test_a_held_choice_still_shows_as_one_choice_on_the_item(env):
    ws, cfg, store = env
    target = someone_elses(cfg)
    cs_id, result = held_choice(store, cfg, close_op(target["id"], CLOSED))
    assert result == ["held"]
    assert data(store, target["id"])["status"] == "open" and data(store, target["id"])["done_by"] == []
    held = op_of(store, cs_id)
    assert endings.CHOICE_WAITS in held["reason"]
    linked(store, cs_id)
    line = next(
        line for line in queue(ws, store, cfg, NOW) if line.kind == "held" and line.changeset == cs_id and line.op == 0
    )
    assert line.held["ask"] == "ending"
    assert line.held["quote"] == CLOSED
    people = People(store, cfg)
    assert line.held["owners"] == [people.owner(o) for o in target["owners"]]
    assert line.held["item"] == target["text"]


def test_the_describe_of_a_plain_close_is_still_a_close(env):
    _, cfg, store = env
    target = someone_elses(cfg)
    shown = held_ask.describe(store.read(), People(store, cfg), close_op(target["id"], DELIVERED))
    assert shown is not None and shown["ask"] == "close"


def test_each_answer_applies_with_undo_and_records_its_signal(env):
    _, cfg, store = env
    first, second = [a for a in OPEN if a["owners"][0]["person"] != pm_of(cfg)][:2]
    done_cs, _ = held_choice(store, cfg, close_op(first["id"], CLOSED))
    off_cs, _ = held_choice(store, cfg, close_op(second["id"], CLOSED))

    endings.answer(store, cfg, done_cs, 0, "done", now=NOW)
    done = data(store, first["id"])
    assert done["status"] == "done" and done["done_by"] == owners_of(first)
    assert op_of(store, done_cs)["status"] == "applied"
    assert undo(store, done_cs).restored == [0]
    assert data(store, first["id"])["status"] == "open"

    endings.answer(store, cfg, off_cs, 0, "called_off", now=NOW)
    gone = data(store, second["id"])
    assert (gone["status"], gone["dropped_reason"]) == ("dropped", CLOSED)
    assert gone["done_by"] == [] and gone["reported_by"] is None
    assert op_of(store, off_cs)["op"]["op"] == "action.drop"
    assert undo(store, off_cs).restored == [0]
    assert data(store, second["id"])["status"] == "open"

    kept = signals(store, "answered_assistant")
    assert len(kept) == 2
    assert {s["refs"][0] for s in kept} == {first["id"], second["id"]}
    assert {s["note"] for s in kept} == {
        endings.ANSWER_DONE,
        endings.ANSWER_CALLED_OFF,
    }


def test_an_answer_needs_a_choice_that_still_waits(env):
    _, cfg, store = env
    target = someone_elses(cfg)
    plain, _ = from_input(store, cfg, close_op(target["id"], DELIVERED))
    with pytest.raises(StoreError):
        endings.answer(store, cfg, plain, 0, "called_off", now=NOW)  # an ordinary held ending isn't this choice
    asked, _ = held_choice(store, cfg, close_op(target["id"], CLOSED))
    endings.answer(store, cfg, asked, 0, "done", now=NOW)
    with pytest.raises(StoreError):
        endings.answer(store, cfg, asked, 0, "done", now=NOW)  # answered once


def test_the_persons_own_close_on_a_screen_is_not_read_for_words(env):
    _, cfg, store = env
    target = someone_elses(cfg)
    apply_as_person(store, cfg, [{"op": "action.close", "id": target["id"]}], "Mark done")
    assert data(store, target["id"])["status"] == "done"


# ---- an owner who was told ------------------------------------------------------------------------------------------


def test_calling_off_what_an_owner_was_told_leaves_no_copyable_line(env):
    _, cfg, store = env
    target = someone_elses(cfg)
    owner = target["owners"][0]["person"]
    with store.transaction() as tx:
        current = tx.get("action", target["id"])
        tx.update(
            "action", target["id"], {"told": {owner: NOW.date().isoformat()}}, _TEST, read_version=current.version
        )
    before = {q.id for q in store.read().list("question")}
    cs_id, result = own_note(store, cfg, drop_op(target["id"], CALLED_OFF, reason=CALLED_OFF))
    assert result == ["held"]  # the owner was already told: look at it first, as any drop of a told action
    release(store, cfg, cs_id, 0)
    assert data(store, target["id"])["status"] == "dropped"
    assert {q.id for q in store.read().list("question")} == before  # no drop makes the one-line notice
    assert undo(store, cs_id).restored == [0]
    assert data(store, target["id"])["status"] == "open"


def test_an_owner_who_was_never_told_gets_no_line_and_neither_does_the_person(env):
    _, cfg, store = env
    target = someone_elses(cfg)
    before = {q.id for q in store.read().list("question")}
    own_note(store, cfg, drop_op(target["id"], CALLED_OFF, reason=CALLED_OFF))
    mine = next(a for a in OPEN if a["owners"][0]["person"] == pm_of(cfg))
    with store.transaction() as tx:
        current = tx.get("action", mine["id"])
        told = {pm_of(cfg): NOW.date().isoformat()}  # the person is never drafted a line about their own action
        tx.update("action", mine["id"], {"told": told}, _TEST, read_version=current.version)
    apply_as_person(store, cfg, [{"op": "action.drop", "id": mine["id"], "reason": "Not needed"}], "Drop")
    assert {q.id for q in store.read().list("question")} == before


# ---- the settings ----------------------------------------------------------------------------------------------------


def test_the_settings_have_descriptions_defaults_and_demo_values_in_both_workspaces():
    for key in ("delivery_words", "called_off_words", "closed_words"):
        assert LanguageFile.model_fields[key].description
        assert shipped(key) and getattr(LanguageFile(), key) is None
    assert LanguageFile.model_fields["messages"].annotation.model_fields["called_off_notice"].description
    for template in (DEMO_A, DEMO_B):
        language = yaml.safe_load((template / "config" / "language.yaml").read_text())
        for key, default in (
            ("delivery_words", shipped("delivery_words")),
            ("called_off_words", shipped("called_off_words")),
            ("closed_words", shipped("closed_words")),
        ):
            assert language[key] == list(default)
        assert "{item}" in language["messages"]["called_off_notice"]
    for word in shipped("closed_words"):
        assert endings.reading(word, LanguageFile()) == "choice"  # each alone is neither done nor called off

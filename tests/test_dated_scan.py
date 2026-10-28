"""Dates in documents found by rules alone (design 6.32, "What arrives"): a full date beside the words for a deadline,
a renewal or an expiry, taken from the language lists, offered as a dated fact that waits for the person's yes, never
applied at once because the words are not the person's own. Names and days are made up here; the AI is the stub."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pytest

from engine import dated_scan
from engine.applier import Context, Inputs, apply_changeset, release
from engine.config.schema import LanguageFile
from engine.names import People
from engine.ops import CHANGESET
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B

NOW = datetime(2026, 10, 20, 9, 0, tzinfo=UTC)
TODAY = NOW.date()
_TEST = WriteContext(actor="pm", trust="trusted", op="test.dated-scan")


class Clock:
    def __call__(self) -> str:
        return NOW.isoformat(timespec="seconds")


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "UTC"})
    store = Store(ws.db_path, cfg=cfg, clock=Clock())
    yield ws, cfg, store
    store.close()


def read(cfg, text, today=TODAY):
    return dated_scan.read(cfg, text, today)


def test_a_full_date_beside_the_words_for_a_deadline_a_renewal_or_an_expiry_is_found(env):
    _, cfg, _ = env
    text = (
        "Your studio membership renews on 30 November 2026.\n"
        "The form is due 2026-11-02.\n"
        "The pass expires on Dec 5, 2026."
    )
    assert read(cfg, text) == [
        ("renewal", date(2026, 11, 30), "Your studio membership renews on 30 November 2026."),
        ("deadline", date(2026, 11, 2), "The form is due 2026-11-02."),
        ("expiry", date(2026, 12, 5), "The pass expires on Dec 5, 2026."),
    ]


@pytest.mark.parametrize(
    "text",
    [
        "The form is due on 2 November.",  # no year: never inferred
        "The form is due next Friday.",  # no date at all
        "The form was due 2026-10-01.",  # already past
        "The form is due 2026-11-02 and the pass expires 2026-12-05.",  # two dates, two kinds in one sentence
        "The plan renews on 2026-11-02 or 2026-11-09.",  # two dates
        "The plan may renew on 2026-11-02.",  # doubt
        "If it is approved the form is due 2026-11-02.",  # doubt
        "Please do not renew before 2026-11-02.",  # doubt
        "The meeting is on 2026-11-02.",  # no word for a kind of day
    ],
)
def test_nothing_is_found_from_words_that_are_not_a_full_future_date_with_one_kind_of_day_and_no_doubt(env, text):
    _, cfg, _ = env
    assert read(cfg, text) == []


def test_the_words_come_from_the_language_lists_and_a_workspace_list_replaces_the_shipped_one(env):
    _, cfg, _ = env
    text = "The lease lapses on 2026-12-01. The form is due 2026-11-02."
    assert [kind for kind, _, _ in read(cfg, text)] == ["deadline"]
    cfg.language = LanguageFile(dated_expiry_words=["lapses"], dated_deadline_words=[])
    assert [kind for kind, _, _ in read(cfg, text)] == ["expiry"]
    cfg.language = LanguageFile(dated_doubt_words=[])
    assert [kind for kind, _, _ in read(cfg, "The plan may renew on 2026-11-02.")] == ["renewal"]


def test_a_workspace_language_the_rules_do_not_read_finds_nothing(env):
    _, cfg, _ = env
    cfg.workspace.language = "fr-FR"
    assert read(cfg, "The form is due 2026-11-02.") == []


def test_the_proposals_are_held_facts_with_the_sentence_as_evidence_and_skip_what_the_answer_holds(env):
    _, cfg, store = env
    text = "The studio renews on 2026-11-30. The pass expires on 2026-12-05."
    view = store.read()
    found = dated_scan.proposals(cfg, view, text, "SRC-1", [], TODAY)
    assert [(op.op, op.on_kind, op.on, op.group) for op in found] == [
        ("fact", "renewal", date(2026, 11, 30), dated_scan.GROUP),
        ("fact", "expiry", date(2026, 12, 5), dated_scan.GROUP),
    ]
    assert found[0].evidence.quote == "The studio renews on 2026-11-30." and found[0].text == found[0].evidence.quote
    # The answer already has a fact for the first day: only the other is offered.
    own = CHANGESET.validate_python(
        {
            "ops": [
                {
                    "op": "fact",
                    "text": "The studio renews on 30 November",
                    "evidence": {"quote": "The studio renews on 2026-11-30"},
                    "on": "2026-11-30",
                    "on_kind": "renewal",
                }
            ]
        },
        context={"op_models": store.plugins.ops},
    ).ops
    assert [op.on for op in dated_scan.proposals(cfg, view, text, "SRC-1", list(own), TODAY)] == [date(2026, 12, 5)]
    cfg.steward.dates.find_most = 1
    assert len(dated_scan.proposals(cfg, view, text, "SRC-1", [], TODAY)) == 1
    cfg.steward.dates.find_by_rules = False
    assert dated_scan.proposals(cfg, view, text, "SRC-1", [], TODAY) == []


def hand_in(ws, cfg, store, text, ops=(), actor="assistant", task="notes", confirmed=False):
    """An answer to an input as the assistant gives it; returns the changeset's id."""
    with store.transaction() as tx:
        source = tx.create(
            "source",
            {
                "received_at": NOW.isoformat(),
                "kind": "pasted",
                "title": "A message",
                "content_hash": "0" * 64,
                "trust": "untrusted",
            },
            _TEST,
        ).id
        request = tx.create(
            "request",
            {"task": task, "origin": "input", "state": "done", "created_at": NOW.isoformat(), "source": source},
            _TEST,
        ).id
    cs = CHANGESET.validate_python({"summary": "Read it", "ops": list(ops)}, context={"op_models": store.plugins.ops})
    ctx = Context(
        store,
        cfg,
        People(store, cfg),
        tuple(store.plugins.ops),
        Inputs(request, source, text, "", "untrusted"),
        actor=actor,
        confirmed_by_pm=confirmed,
    )
    return apply_changeset(cs, [], ctx, run=None, now=NOW), source


def facts(store):
    return [f for f in store.read().list("fact") if f.data.get("on")]


def test_a_date_the_assistant_missed_is_held_for_the_persons_yes_and_kept_with_their_yes(env):
    ws, cfg, store = env
    text = "Hello,\n\nYour studio membership renews on 2026-11-30. Reply to cancel.\n"
    cs_id, source = hand_in(ws, cfg, store, text)
    outcomes = store.read().get("changeset", cs_id).data["ops"]
    (found,) = [o for o in outcomes if o["op"]["op"] == "fact"]
    assert found["status"] == "held" and "waits for your confirmation" in found["reason"]
    assert found["op"]["on"] == "2026-11-30" and found["op"]["on_kind"] == "renewal"
    assert found["op"]["evidence"]["quote"] == "Your studio membership renews on 2026-11-30."
    assert facts(store) == [], "nothing is applied at once"
    release(store, cfg, cs_id, found["index"])
    (made,) = facts(store)
    assert (made.data["on"], made.data["on_kind"], made.data["source"]) == ("2026-11-30", "renewal", source)
    assert made.data["trust"] == "untrusted"


def test_declining_the_held_date_adds_nothing(env):
    from engine.applier import decline_held

    ws, cfg, store = env
    cs_id, _ = hand_in(ws, cfg, store, "Your studio membership renews on 2026-11-30.")
    (found,) = [o for o in store.read().get("changeset", cs_id).data["ops"] if o["op"]["op"] == "fact"]
    decline_held(store, cs_id, found["index"])
    assert facts(store) == []


def test_the_assistants_own_dated_fact_is_applied_and_the_rules_add_nothing_for_that_day(env):
    ws, cfg, store = env
    own = {
        "op": "fact",
        "text": "The studio membership renews on 30 November",
        "evidence": {"quote": "renews on 2026-11-30"},
        "on": "2026-11-30",
        "on_kind": "renewal",
    }
    cs_id, _ = hand_in(ws, cfg, store, "Your studio membership renews on 2026-11-30.", [own])
    outcomes = store.read().get("changeset", cs_id).data["ops"]
    assert [(o["op"]["op"], o["status"]) for o in outcomes][0] == ("fact", "applied")
    assert all(o["op"].get("group") != dated_scan.GROUP for o in outcomes)
    assert len(facts(store)) == 1


@pytest.mark.parametrize("task", ["ask", "learn-correction"])
def test_only_the_reading_of_an_input_gets_the_pass(env, task):
    ws, cfg, store = env
    cs_id, _ = hand_in(ws, cfg, store, "Your studio membership renews on 2026-11-30.", task=task)
    assert not [o for o in store.read().get("changeset", cs_id).data["ops"] if o["op"]["op"] == "fact"]


def test_the_persons_own_words_and_an_automated_notice_get_no_proposal(env):
    ws, cfg, store = env
    cs_id, _ = hand_in(ws, cfg, store, "Your studio membership renews on 2026-11-30.", actor="pm")
    assert not [o for o in store.read().get("changeset", cs_id).data["ops"] if o["op"]["op"] == "fact"]
    notice = (
        "From: no-reply@example.com\nTo: me@example.com\nSubject: Your sign-in code\n\n"
        "Your code is 123456. It expires on 2026-11-30."
    )
    cs_id, _ = hand_in(ws, cfg, store, notice)
    assert not [o for o in store.read().get("changeset", cs_id).data["ops"] if o["op"]["op"] == "fact"]


def test_quoted_history_and_a_signature_are_not_read(env):
    ws, cfg, store = env
    text = (
        "From: Ana Example <ana@example.com>\nTo: me@example.com\nSubject: Re: the studio\n\n"
        "Thanks, noted.\n\n> Your studio membership renews on 2026-11-30.\n"
    )
    cs_id, _ = hand_in(ws, cfg, store, text)
    assert not [o for o in store.read().get("changeset", cs_id).data["ops"] if o["op"]["op"] == "fact"]


def test_a_date_already_past_when_the_input_is_read_is_not_offered(env):
    ws, cfg, store = env
    past = (TODAY - timedelta(days=3)).isoformat()
    cs_id, _ = hand_in(ws, cfg, store, f"Your studio membership renews on {past}.")
    assert not [o for o in store.read().get("changeset", cs_id).data["ops"] if o["op"]["op"] == "fact"]

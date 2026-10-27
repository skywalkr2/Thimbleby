"""Plain titles and facts (design 6.32, designer's answer F44): a note from mail is titled by its subject and sender,
set by the core, with "Re:" and "Fwd:" chains taken off and the body's first words when there is no subject; a note the
assistant wrote in its own words is left alone; "decided" is never written into a fact unless the words it rests on
show a choice. Names come from the fixtures."""

from __future__ import annotations

import pytest

from engine.applier import Context, Inputs, apply_changeset, check
from engine.names import People
from engine.note_titles import note_text, repeats_headers, title_of
from engine.ops import CHANGESET
from engine.storage import Store
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records

PEOPLE = fixture_records(DEMO_B, "person")
KNOWN = PEOPLE[1]
STRANGER = "Pat Marsh"


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()


def mail(subject: str | None, sender: str, body: str = "Thanks for the update. See you there.") -> str:
    head = f"New in Your inbox: {subject}\n\n" if subject is not None else "New in Your inbox: \n\n"
    return f"{head}From: {sender}\nReceived: Tue, Oct 27, 2026, 06:42\n\n{body}"


def dump(raw: str) -> str:
    return " ".join(raw.split())


def titled(env, raw: str, text: str | None = None) -> str:
    _, cfg, store = env
    return note_text(text or dump(raw), cfg, People(store, cfg), raw)


def test_a_note_that_repeats_the_headers_is_titled_by_subject_and_sender(env):
    raw = mail("Thanks", f"{STRANGER} <pat.marsh@example.com>")
    assert titled(env, raw) == f"Thanks · from {STRANGER}"


def test_a_known_sender_is_named_by_their_record(env):
    address = f"{KNOWN['id'].lower()}@example.com"
    _, cfg, store = env
    with store.transaction() as tx:
        person = tx.get("person", KNOWN["id"])
        from engine.storage import WriteContext

        tx.update(
            "person",
            person.id,
            {"how_to_reach": {"email": address}},
            WriteContext(actor="pm", trust="trusted", op="test.titles"),
            read_version=person.version,
        )
    raw = mail("Thanks", f"someone else <{address}>")
    assert titled(env, raw) == f"Thanks · from {KNOWN['full_name']}"


@pytest.mark.parametrize("subject", ["Re: Thanks", "RE: Re: Thanks", "Fwd: Re: Thanks", "Fw: Fwd: Re: Thanks"])
def test_reply_and_forward_chains_are_stripped(env, subject):
    assert titled(env, mail(subject, f"{STRANGER} <pat.marsh@example.com>")) == f"Thanks · from {STRANGER}"


def test_with_no_subject_the_first_words_of_the_body_title_it(env):
    raw = mail("", f"{STRANGER} <pat.marsh@example.com>", "Can we move the walk-through to Thursday afternoon?")
    assert titled(env, raw) == f"Can we move the walk-through to Thursday afternoon? · from {STRANGER}"
    long = mail("", f"{STRANGER} <pat.marsh@example.com>", "One two three four five six seven eight nine ten eleven.")
    assert titled(env, long) == f"One two three four five six seven eight… · from {STRANGER}"


def test_a_sender_with_only_an_address_is_named_from_it(env):
    assert titled(env, mail("Thanks", "pat.marsh@example.com")) == "Thanks · from Pat Marsh"


def test_no_header_block_survives_in_a_title(env):
    raw = mail("Thanks", f"{STRANGER} <pat.marsh@example.com>")
    found = titled(env, raw)
    assert not repeats_headers(found) and "From:" not in found and "Received:" not in found and "<" not in found


def test_a_note_in_the_assistants_own_words_and_a_non_message_are_left_as_written(env):
    raw = mail("Thanks", f"{STRANGER} <pat.marsh@example.com>")
    assert titled(env, raw, "Pat confirmed the walk-through.") == "Pat confirmed the walk-through."
    assert titled(env, "Just a pasted paragraph of text.", "From: nobody") == "From: nobody"
    _, cfg, store = env
    assert title_of(cfg, People(store, cfg), "Just a pasted paragraph.") is None


def apply_note(env, raw: str, text: str) -> str:
    _, cfg, store = env
    cs = CHANGESET.validate_python({"ops": [{"op": "note", "text": text}]}, context={"op_models": store.plugins.ops})
    ctx = Context(store, cfg, People(store, cfg), ("note",), Inputs("REQ-1", None, raw, "", "untrusted"))
    apply_changeset(cs, [], ctx, run=None)
    return store.read().list("note")[-1].data["text"]


def test_the_applier_sets_the_title_when_it_keeps_the_note(env):
    raw = mail("Re: Thanks", f"{STRANGER} <pat.marsh@example.com>")
    assert apply_note(env, raw, dump(raw)) == f"Thanks · from {STRANGER}"


# ---- "decided" in a fact ---------------------------------------------------------------------------------------------

LINT = "decided-as-fact"


def found(env, ops, *, raw="Sam: the offsite is on a Friday", note="", actor="assistant"):
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


def fact(text, quote="the offsite is on a Friday", **more):
    return {"op": "fact", "text": text, "evidence": {"quote": quote}, **more}


def test_a_fact_that_says_decided_with_no_choice_in_its_words_goes_back_once(env):
    (problem,) = found(env, [fact("The offsite was decided to be on a Friday.")])
    assert (problem.severity, problem.op) == ("return", 0) and "decided" in problem.message


def test_a_fact_that_states_the_world_passes(env):
    assert found(env, [fact("The offsite is on a Friday.")]) == []


def test_a_choice_someone_made_in_the_quoted_words_is_left_alone(env):
    quote = "Sam decided the offsite is on a Friday"
    assert found(env, [fact("The offsite is on a Friday, as Sam decided.", quote=quote)], raw=quote) == []


def test_a_listed_line_makes_no_one_the_chooser(env):
    quote = "Decided: the offsite is on a Friday"
    assert found(env, [fact("The offsite is on a Friday as decided.", quote=quote)], raw=f"- {quote}") != []


def test_the_persons_own_words_and_changes_are_left_alone(env):
    quote = "Decided: the offsite is on a Friday"
    assert found(env, [fact("The offsite is on a Friday as decided.", quote=quote)], raw="", note=quote) == []
    assert found(env, [fact("The offsite was decided for Friday.")], actor="pm") == []


def test_the_severity_is_a_setting_per_lint_and_per_project(env):
    _, cfg, _ = env
    cfg.checks.lints[LINT] = "off"
    assert found(env, [fact("The offsite was decided for Friday.")]) == []
    cfg.checks.lints[LINT] = "warn"
    (problem,) = found(env, [fact("The offsite was decided for Friday.")])
    assert problem.severity == "warn"

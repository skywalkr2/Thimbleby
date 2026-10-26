# ruff: noqa: F811
"""The assistant's display name is on nothing others read (design 6.7, 6.12): a test over every outward path. The names
are the one the person gave it now, one it went by before and the default, whole words in any case. Paths: the text of
a message, a calendar entry's title and its note, a file's folder and content, what goes out at the send step, a
follow-up message and a nudge, and the ops that write what others read. A new field of an act's target must be listed
below as read by others or not, so the test stops anyone adding a way out. Names and ids come from the fixtures; the
person's own screens may still say the assistant did something."""

from __future__ import annotations

import pytest

from engine import acts, outward
from engine.applier import apply_as_person, check
from engine.ops import OP_MODELS, ActTargetIn
from engine.storage import StoreError
from tests.test_publisher import _TEST, env  # noqa: F401


def current(env) -> str:
    return env.cfg.workspace.assistant_name


def former(env) -> str:
    """A name the assistant went by before: it is only in the settings history, as after a rename."""
    old = f"{current(env)} Mk1"
    with env.store.transaction() as tx:
        tx.create(
            "setting_change",
            {
                "key": outward.NAME_KEY,
                "before": old,
                "after": current(env),
                "was_default": False,
                "is_default": False,
                "at": env.clock.text(),
            },
            _TEST,
        )
    return old


def names(env) -> list[str]:
    return [current(env), former(env), outward.DEFAULT_NAME]


def calendar(env, **more) -> dict:
    target = {"kind": "calendar", "action": "create", "calendar": "work", "start": "2026-11-02T09:00:00+00:00"}
    target |= {"end": "2026-11-02T10:00:00+00:00", "title": "Planning session", **more.pop("target", {})}
    return {"op": "act.draft", "channel": "fake", "target": target, "parts": more.pop("parts", {}), **more}


def file_act(env, **more) -> dict:
    target = {"kind": "file", "action": "write", "folder": "shared/notes", **more.pop("target", {})}
    return {
        "op": "act.draft",
        "channel": "fake",
        "target": target,
        "parts": more.pop("parts", {"text": "Notes"}),
        **more,
    }


def drafted(env, op: dict) -> str:
    cs = apply_as_person(env.store, env.cfg, [op], "Drafted an act")
    return env.store.read().get("changeset", cs).data["ops"][0]["records"][0]["id"]


def refused(env, act_id: str, name: str) -> str:
    with pytest.raises(StoreError) as why:
        env.yes(act_id)
    assert name in str(why.value) and str(why.value).startswith("Held back"), str(why.value)
    assert env.act(act_id)["status"] == "draft" and env.fake.calls == []
    return str(why.value)


# ---- sent mail and drafts ----------------------------------------------------------------------------------------


@pytest.mark.parametrize("part", ["subject", "body"])
def test_no_part_of_a_message_to_someone_else_may_name_the_assistant_by_any_name_it_has_had(env, part):
    for name in names(env):
        parts = {"subject": "The proofs", "body": "They ship on Monday.", part: f"Hello from {name.upper()}"}
        why = refused(env, env.draft(parts=parts), name)
        assert f"({part})" in why, "the reason says which part names it"


def test_a_message_that_only_says_assistant_in_an_ordinary_sentence_is_not_held(env):
    ready = env.ready(parts={"subject": "The proofs", "body": "The assistant professor will bring the proofs."})
    assert env.act(ready)["status"] == "approved"


def test_a_calendar_entrys_title_may_not_name_the_assistant(env):
    for name in names(env):
        why = refused(env, drafted(env, calendar(env, target={"title": f"{name}'s sync"})), name)
        assert "(title)" not in why, "an event with no other part says only whom or what it is for"
    clean = drafted(env, calendar(env))
    env.yes(clean)
    assert env.act(clean)["status"] == "approved"


def test_a_calendar_entrys_note_may_not_name_the_assistant(env):
    for name in names(env):
        refused(env, drafted(env, calendar(env, parts={"description": f"Booked by {name}"})), name)


def test_a_files_folder_and_content_may_not_name_the_assistant(env):
    for name in names(env):
        refused(env, drafted(env, file_act(env, target={"folder": f"shared/{name}"})), name)
        refused(env, drafted(env, file_act(env, parts={"text": f"Written by {name}"})), name)


def test_what_was_approved_clean_is_stopped_at_the_send_step_when_a_rename_makes_it_name_the_assistant(env):
    word = "dock"
    message = env.ready(parts={"subject": "The proofs", "body": f"Meet at the {word}."})
    event = drafted(env, calendar(env, target={"title": f"Lunch at the {word}"}))
    env.yes(event)
    with env.store.transaction() as tx:
        tx.create(
            "setting_change",
            {
                "key": outward.NAME_KEY,
                "before": word,
                "after": current(env),
                "was_default": False,
                "is_default": False,
                "at": env.clock.text(),
            },
            _TEST,
        )
    for act_id in (message, event):
        with pytest.raises(StoreError, match="Held back"):
            env.publisher.send(act_id)
        assert env.act(act_id)["status"] == "approved"
    assert env.fake.calls == []


# ---- the fields an act's target holds ----------------------------------------------------------------------------

#: Every free-text field of an act's target, and whether others read it. A new one must be decided here.
TARGET_FIELDS_READ_BY_OTHERS = {
    "title": True,  # what a calendar entry is called
    "folder": True,  # where a file is written, in a place others may open
    "calendar": False,  # which of the person's own calendars
    "label": False,  # a label on the person's own mail
    "when": False,  # a day or time
    "start": False,
    "end": False,
    "proposed_start": False,
    "proposed_end": False,
    "action": False,
}


def test_every_text_field_of_an_acts_target_is_decided():
    text = {name for name, info in ActTargetIn.model_fields.items() if info.annotation == (str | None)}
    assert text == set(TARGET_FIELDS_READ_BY_OTHERS), "decide whether the new field is read by others and guard it"


def test_the_fields_decided_as_read_by_others_are_the_ones_the_check_reads(env):
    kinds = {"title": "calendar", "folder": "file"}
    for field, read in TARGET_FIELDS_READ_BY_OTHERS.items():
        data = {"target": {"kind": kinds.get(field, "calendar"), field: "a value"}, "parts": {}}
        checked = acts.part_labels(env.store.read(), env.cfg, data)
        assert ("a value" in checked.values()) is read, field


# ---- messages to others that aren't acts -----------------------------------------------------------------------


def test_a_follow_up_message_to_another_person_that_names_the_assistant_is_held_back(env):
    from engine import followups

    for name in names(env):
        with pytest.raises(StoreError) as why:
            followups.mark_sent(env.store, env.cfg, env.ana, sent_text=f"Following up, from {name}")
        assert name in str(why.value)


# ---- ops that write what others read ------------------------------------------------------------------------------


class FakeOp:
    def __init__(self, op: str, **fields):
        self.fields = {"op": op, **fields}

    def model_dump(self, mode: str = "json"):
        return dict(self.fields)


def test_every_op_field_listed_as_read_by_others_refuses_every_name(env):
    for op, fields in outward.READ_BY_OTHERS_OPS.items():
        for field in fields:
            for name in names(env):
                found = outward.op_problem(FakeOp(op, **{field: f"Written by {name}"}), names(env))
                assert found is not None and field in found, (op, field, name)
    for field in outward.SOURCE_FIELDS:
        assert outward.op_problem(FakeOp("fact", **{field: current(env)}), names(env)) is not None


def test_every_op_listed_as_read_by_others_is_a_real_op_with_those_fields():
    for op, fields in outward.READ_BY_OTHERS_OPS.items():
        assert op in OP_MODELS, f"{op} is no longer an op: take it out of the list"
        for field in fields:
            assert field in OP_MODELS[op].model_fields, f"{op} has no field {field}"


def test_the_assistant_acting_cannot_write_an_attribution_to_itself_in_what_others_read(env):
    quote = {"quote": "Proofs ship on Monday."}
    ops = [
        {"op": "note", "text": f"Said by {current(env)}, 10/20"},
        {"op": "action.add", "text": f"{current(env)} will follow up", "evidence": quote},
    ]
    changeset, ctx = env.as_assistant(ops, trust="untrusted")
    problems = check(changeset, ctx)
    refused = {p.op for p in problems if p.severity in ("refuse", "return") and "others read" in p.message}
    assert refused == {0, 1}, problems

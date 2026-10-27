"""Filing when unsure (design 6.32; the designer's answers F40 and F41): what the ranks can't place between Personal and
a side waits under Personal, one grouped question a day for each side offers moving it, Move is the person's own change
with Undo, Keep leaves it, and the same sender's items moved a second time propose a rule that states its reach. A note
from mail needs no project. Names, ids and words come from the fixtures of `tests/test_sides.py`."""

from __future__ import annotations

from datetime import timedelta

import pytest

from engine import filing, sides
from engine.applier import undo
from engine.records import Scope
from engine.unfiled import unfiled
from tests import test_sides as shared
from tests.conftest import DEMO_B
from tests.test_sides import (
    _PM,
    BUSINESS_ID,
    NOW,
    PERSONAL_ID,
    new_op,
    run_week,
)

# The workspace fixtures the sides tests build: each test here works on its own copy.
base, env = shared.base, shared.env


def sides_of(env, ops):
    _, cfg, store = env
    from engine.names import People

    return sides.file_by_people(ops, store.read(), cfg, People(store, cfg), None)


def test_what_no_signal_places_waits_under_personal_with_no_reason_kept(env):
    (got,) = sides_of(env, [new_op(text="Call about it")])
    assert got.project == PERSONAL_ID and got.filed_by is None


def test_without_a_personal_project_an_unplaced_item_stays_unfiled(env):
    ws, _, store = env
    cfg = shared.without(ws, "personal")
    from engine.names import People

    (got,) = sides.file_by_people([new_op(text="Call about it")], store.read(), cfg, People(store, cfg), None)
    assert got.project is None


def test_a_first_read_for_one_mailbox_serving_both_sides_ends_with_one_question_and_nothing_unfiled(env):
    _, cfg, store = env
    projects, _, _ = run_week(env)
    view = store.read()
    asked = filing.questions(view, cfg, NOW + timedelta(days=0))
    # one question, for the one other side, naming its items; the rest was placed by people or words
    assert len(asked) == 1 and asked[0].side == BUSINESS_ID
    unclear = {pid for mail_id, pid in projects.items() if pid == PERSONAL_ID}
    assert len(asked[0].items) >= 5 and unclear == {PERSONAL_ID}
    assert unfiled(view) == []  # no Unfiled row at all
    line = filing.summary(view, cfg, NOW)
    assert line is not None and line.count == len(asked[0].items) and line.subject == asked[0].name


def test_move_is_the_persons_own_change_with_undo_and_each_item_is_a_correction(env):
    _, cfg, store = env
    run_week(env)
    first = filing.questions(store.read(), cfg, NOW)[0]
    items = [(i.kind, i.id, i.version) for i in first.items[:2]]
    done = filing.move(store, cfg, first.side, items, NOW)
    view = store.read()
    assert done.count == 2
    assert all(view.get(kind, rid).data["project"] == BUSINESS_ID for kind, rid, _ in items)
    edits = [
        s for s in view.list("signal") if s.data["kind"] == "edited" and s.data["refs"][0] in {i[1] for i in items}
    ]
    assert len(edits) == 2  # every correction records a signal
    # the person's own change: it is a changeset made as the person
    assert view.get("changeset", done.changeset) is not None
    undo(store, done.changeset)
    again = store.read()
    assert all(again.get(kind, rid).data["project"] == PERSONAL_ID for kind, rid, _ in items)


def test_a_side_is_asked_once_a_day(env):
    _, cfg, store = env
    run_week(env)
    first = filing.questions(store.read(), cfg, NOW)[0]
    filing.move(store, cfg, first.side, [(i.kind, i.id, i.version) for i in first.items[:1]], NOW)
    assert filing.questions(store.read(), cfg, NOW) == []  # answered today: the rest wait
    assert filing.questions(store.read(), cfg, NOW + timedelta(days=1))  # and come back tomorrow


def test_keep_leaves_the_items_under_personal_and_they_are_never_asked_again(env):
    _, cfg, store = env
    run_week(env)
    first = filing.questions(store.read(), cfg, NOW)[0]
    kept = [(i.kind, i.id, i.version) for i in first.items]
    filing.keep(store, cfg, first.side, kept, NOW)
    view = store.read()
    assert all(view.get(kind, rid).data["project"] == PERSONAL_ID for kind, rid, _ in kept)
    assert filing.questions(view, cfg, NOW + timedelta(days=3)) == []


def test_a_move_is_refused_for_an_item_no_longer_under_personal(env):
    _, cfg, store = env
    run_week(env)
    first = filing.questions(store.read(), cfg, NOW)[0]
    item = first.items[0]
    filing.move(store, cfg, first.side, [(item.kind, item.id, item.version)], NOW)
    with pytest.raises(ValueError, match="meanwhile"):
        filing.move(store, cfg, first.side, [(item.kind, item.id, None)], NOW)
    with pytest.raises(ValueError, match="isn't one of your sides"):
        filing.move(store, cfg, "PRJ-999", [(item.kind, item.id, None)], NOW)


def mail_item(store, sender: str, key: str, text: str) -> str:
    """A to-do under Personal from a watched mail by a sender, the way a read of a mailbox leaves one."""
    with store.transaction() as tx:
        tx.create(
            "snapshot",
            {
                "source": "box",
                "key": key,
                "title": "Subject",
                "content_hash": key,
                "seen_at": NOW.isoformat(),
                "message": {"sender": f"Someone <{sender}>"},
            },
            _PM,
        )
        source = tx.create(
            "source",
            {
                "received_at": NOW.isoformat(),
                "kind": "watched:mail",
                "title": "Subject",
                "content_hash": key,
                "trust": "untrusted",
                "watched": {"source": "box", "key": key, "change": "new"},
            },
            _PM,
        )
    with store.transaction() as tx:
        # made by the assistant: the engine's own context
        from engine.storage import WriteContext

        made = tx.create(
            "action",
            {"text": text, "owners": [{"person": shared.ME}], "project": PERSONAL_ID, "source": source.id},
            WriteContext(actor="assistant", trust="untrusted", op="test.filing"),
        )
    return made.id


def test_a_rule_is_proposed_only_after_the_same_sender_is_moved_a_second_time(env):
    _, cfg, store = env
    sender = "pat.marsh@example.com"
    first = mail_item(store, sender, "m1", "Send the venue list")
    second = mail_item(store, sender, "m2", "Send the headcount")
    one = filing.move(store, cfg, BUSINESS_ID, [("action", first, None)], NOW)
    assert one.rule is None and store.read().list("rule") == []
    two = filing.move(store, cfg, BUSINESS_ID, [("action", second, None)], NOW + timedelta(hours=1))
    assert two.rule is not None
    rule = store.read().get("rule", two.rule)
    name = sides.side_list(store.read(), cfg)[0].name
    assert rule.data["status"] == "proposed" and rule.data["origin"] == "assistant"  # held for Keep
    assert sender in rule.data["text"] and name in rule.data["text"]  # it states its reach
    assert Scope.model_validate(rule.data["applies_to"]).scope == "workspace"


def test_a_move_that_was_undone_does_not_count_toward_the_rule(env):
    _, cfg, store = env
    sender = "pat.marsh@example.com"
    ids = [mail_item(store, sender, f"m{n}", f"Item {n}") for n in range(3)]
    one = filing.move(store, cfg, BUSINESS_ID, [("action", ids[0], None)], NOW)
    undo(store, one.changeset)
    two = filing.move(store, cfg, BUSINESS_ID, [("action", ids[1], None)], NOW + timedelta(hours=1))
    assert two.rule is None  # one move counts, the undone one does not
    three = filing.move(store, cfg, BUSINESS_ID, [("action", ids[2], None)], NOW + timedelta(hours=2))
    assert three.rule is not None


def test_a_rule_is_not_proposed_twice(env):
    _, cfg, store = env
    ids = [mail_item(store, "pat.marsh@example.com", f"m{n}", f"Item {n}") for n in range(3)]
    filing.move(store, cfg, BUSINESS_ID, [("action", ids[0], None)], NOW)
    assert filing.move(store, cfg, BUSINESS_ID, [("action", ids[1], None)], NOW).rule is not None
    assert filing.move(store, cfg, BUSINESS_ID, [("action", ids[2], None)], NOW).rule is None
    assert len(store.read().list("rule")) == 1


def test_a_note_from_mail_needs_no_project_and_takes_its_mails_side(env):
    _, cfg, store = env
    from engine.storage import WriteContext

    ids = {}
    with store.transaction() as tx:
        source = tx.create(
            "source",
            {
                "received_at": NOW.isoformat(),
                "kind": "watched:mail",
                "title": "Subject",
                "content_hash": "h",
                "trust": "untrusted",
                "watched": {"source": "box", "key": "k", "change": "new"},
            },
            _PM,
        )
        ctx = WriteContext(actor="assistant", trust="untrusted", op="test.filing")
        ids["note"] = tx.create("note", {"text": "Thanks for the update.", "source": source.id}, ctx).id
        ids["loose"] = tx.create("note", {"text": "A note nobody filed."}, ctx).id
    rows = {i.id for i in unfiled(store.read())}
    assert ids["note"] not in rows and ids["loose"] in rows  # a mail's note is never filing work
    # and when its to-do moves, the note moves with it (it takes its mail's side)
    with store.transaction() as tx:
        action = tx.create(
            "action",
            {"text": "Reply", "owners": [{"person": shared.ME}], "project": PERSONAL_ID, "source": source.id},
            WriteContext(actor="assistant", trust="untrusted", op="test.filing"),
        )
        note = tx.get("note", ids["note"])
        tx.update("note", note.id, {"project": PERSONAL_ID}, _PM, read_version=note.version)
    # it is never itself in the question: only the to-do is asked about
    assert [(i.kind, i.id) for i in filing.waiting(store.read(), cfg)] == [("action", action.id)]
    filing.move(store, cfg, BUSINESS_ID, [("action", action.id, None)], NOW)
    assert store.read().get("note", ids["note"]).data["project"] == BUSINESS_ID


def test_a_question_waits_under_personal_by_its_list_and_moves_by_it(env):
    _, cfg, store = env
    from engine.storage import WriteContext

    with store.transaction() as tx:
        asked = tx.create(
            "question",
            {"to": shared.ME, "title": "Which one?", "projects": [PERSONAL_ID]},
            WriteContext(actor="assistant", trust="untrusted", op="test.filing"),
        ).id
    assert [(i.kind, i.id) for i in filing.waiting(store.read(), cfg)] == [("question", asked)]
    filing.move(store, cfg, BUSINESS_ID, [("question", asked, None)], NOW)
    assert store.read().get("question", asked).data["projects"] == [BUSINESS_ID]


def test_a_source_serving_two_sides_offers_only_those_sides(env):
    ws, cfg, store = env
    from tests.test_many_sides import THIRD_NAME, a_watched_source, add_side, serve

    second = add_side(env, shared.OTHER_BUSINESS_NAME)
    add_side(env, THIRD_NAME)
    source = a_watched_source(env, serve(env, BUSINESS_ID, second))
    from engine.storage import WriteContext

    with store.transaction() as tx:
        tx.create(
            "action",
            {"text": "Look into it", "owners": [{"person": shared.ME}], "project": PERSONAL_ID, "source": source},
            WriteContext(actor="assistant", trust="untrusted", op="test.filing"),
        )
    (waiting,) = filing.waiting(store.read(), cfg)
    assert set(waiting.could_be) == {BUSINESS_ID, second}  # the third side isn't served, so it isn't offered
    asked = filing.questions(store.read(), cfg, NOW)
    assert {q.side for q in asked} == {BUSINESS_ID, second}
    assert filing.summary(store.read(), cfg, NOW).subject is None  # two sides asked: the line names none


def test_a_job_and_a_business_beside_personal_get_one_question_for_each_side_a_day_and_one_line_naming_neither(env):
    """Two sides beside Personal (design 6.32, check U15): what no signal places could be either side's, so each side is
    asked at most once a day, and Today says it in one line that names no single side while there are two."""
    import json

    from engine import today_queue
    from tests.test_many_sides import add_side

    ws, cfg, store = env
    job = add_side(env, "Weekday job", kind="job")
    run_week(env)
    view = store.read()
    asked = filing.questions(view, cfg, NOW)
    assert [q.side for q in asked] == [BUSINESS_ID, job]  # one question for each side, in the person's order
    both = {(i.kind, i.id) for i in asked[0].items}
    assert both and both == {(i.kind, i.id) for i in asked[1].items} and unfiled(view) == []
    # Today: one line for every question, counting each item once, naming neither side.
    shown = [x for x in today_queue.queue(ws, store, cfg, NOW) if x.kind == "unfiled" and x.state == "which_side"]
    assert len(shown) == 1 and shown[0].subject is None and shown[0].count == len(both)
    sheet = json.loads((DEMO_B.parents[1] / "web" / "src" / "wording" / "en.json").read_text(encoding="utf-8"))
    assert "{business}" not in sheet["queue.sides.many.other"] and "{business}" not in sheet["queue.sides.meta.many"]
    # Moving one item answers the business's question for today; the job's question stays for the rest, still once.
    first = asked[0].items[0]
    filing.move(store, cfg, BUSINESS_ID, [(first.kind, first.id, first.version)], NOW)
    after = filing.questions(store.read(), cfg, NOW)
    assert [q.side for q in after] == [job] and len(after[0].items) == len(both) - 1
    assert [q.side for q in filing.questions(store.read(), cfg, NOW + timedelta(days=1))] == [BUSINESS_ID, job]

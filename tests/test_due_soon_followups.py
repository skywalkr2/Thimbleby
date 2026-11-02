"""What is due soon (design 7.5, 7.7): the follow-up line names the to-dos that are overdue or due within the chase
window, earliest first, and each to-do on the Follow-ups screen says whether it is due soon, by
`ui.followups.soon_days`.
Names, ids and texts come from the fictional workspace's records."""

from __future__ import annotations

from datetime import timedelta

from engine.followups import sections
from tests import test_promise_lines
from tests.test_promise_lines import TODAY, lines, make, me

env = test_promise_lines.env  # the promise lines' workspace fixture


def someone(env) -> str:
    """A person other than the one asking who holds no action in the fixtures, so a case counts only what it makes."""
    _, cfg, store = env
    view = store.read()
    busy = {o["person"] for a in view.list("action") for o in a.data["owners"]}
    return next(p.id for p in view.list("person") if p.id != me(cfg) and p.id not in busy)


def due_soon(env, person: str) -> dict[str, bool]:
    _, cfg, store = env
    section = next(s for s in sections(store, cfg, TODAY) if s.person == person)
    return {a["id"]: a["due_soon"] for a in section.actions}


# ---- the follow-up line names what is due ----------------------------------------------------------------------------


def test_the_follow_up_line_names_overdue_and_soon_to_dos_earliest_first(env):
    _, cfg, store = env
    them = someone(env)
    window = cfg.ui.followups.action_due_within_days
    soon = make(
        store, [them], due=TODAY + timedelta(days=window), promised_to=[me(cfg)], basis="said", text="Order the signs"
    )
    late = make(store, [them], due=TODAY - timedelta(days=3), promised_to=[me(cfg)], basis="said", text="Book the room")
    (line,) = lines(env, kind="nudge", person=them)
    assert [(i["id"], i["text"], i["due"], i["overdue"]) for i in line.due_items] == [
        (late, "Book the room", (TODAY - timedelta(days=3)).isoformat(), True),
        (soon, "Order the signs", (TODAY + timedelta(days=window)).isoformat(), False),
    ]
    assert line.count == 2


def test_a_to_do_dated_beyond_the_window_or_with_a_date_to_check_is_not_named(env):
    _, cfg, store = env
    them = someone(env)
    window = cfg.ui.followups.action_due_within_days
    named = make(
        store, [them], due=TODAY - timedelta(days=2), promised_to=[me(cfg)], basis="said", text="Book the room"
    )
    make(store, [them], due=TODAY + timedelta(days=window + 5), promised_to=[me(cfg)], basis="said", text="Far off")
    make(
        store,
        [them],
        due=TODAY - timedelta(days=2),
        promised_to=[me(cfg)],
        basis="said",
        text="Unsure date",
        due_check=True,
    )
    (line,) = lines(env, kind="nudge", person=them)
    assert [i["id"] for i in line.due_items] == [named]


def test_a_follow_up_line_with_no_dated_to_do_names_none(env):
    _, cfg, store = env
    them = someone(env)
    make(store, [them], due=None, promised_to=[me(cfg)], text="Undated", made=TODAY - timedelta(days=40))
    (line,) = lines(env, kind="nudge", person=them)
    assert line.due_items == [] and line.count == 1


# ---- the Follow-ups screen marks what is due soon --------------------------------------------------------------------


def test_a_to_do_is_due_soon_when_overdue_due_today_or_within_the_setting(env):
    _, cfg, store = env
    them = someone(env)
    cfg.ui.followups.soon_days = 3
    ids = {n: make(store, [them], due=TODAY + timedelta(days=n), text=f"Item {n}") for n in (-2, 0, 1, 3, 4)}
    found = due_soon(env, them)
    assert {n: found[i] for n, i in ids.items()} == {-2: True, 0: True, 1: True, 3: True, 4: False}


def test_the_setting_changes_the_window_and_zero_turns_it_off(env):
    _, cfg, store = env
    them = someone(env)
    tomorrow = make(store, [them], due=TODAY + timedelta(days=1), text="Tomorrow")
    in_five = make(store, [them], due=TODAY + timedelta(days=5), text="In five")
    cfg.ui.followups.soon_days = 1
    assert (due_soon(env, them)[tomorrow], due_soon(env, them)[in_five]) == (True, False)
    cfg.ui.followups.soon_days = 5
    assert (due_soon(env, them)[tomorrow], due_soon(env, them)[in_five]) == (True, True)
    cfg.ui.followups.soon_days = 0
    assert set(due_soon(env, them).values()) == {False}


def test_a_to_do_with_no_date_or_a_date_to_check_is_never_due_soon(env):
    _, cfg, store = env
    them = someone(env)
    undated = make(store, [them], due=None, text="Undated")
    unsure = make(store, [them], due=TODAY - timedelta(days=1), text="Unsure", due_check=True)
    found = due_soon(env, them)
    assert (found[undated], found[unsure]) == (False, False)

"""No action on Today adds a line to Today (design 7.7, check U14; the designer's answer F39): whatever the person does
to a line (look it over, say all looks good, say it is not right, answer, keep, drop, snooze, put it off), the queue
never has more lines afterward. A correction that needs a follow-up goes into the same line or its details pane. Names
and ids come from the fixtures."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from engine.storage import WriteContext
from tests.test_open_items import PEOPLE, add_action, stamp
from tests.test_today_queue import api, hand_in  # noqa: F401  (the fixture and the helper)

_PM = WriteContext(actor="pm", trust="trusted", op="test.no-new-lines")
CASES = ("production-checkin", "decision-for-pm", "no-owner", "shared-first-name", "close-action")


def world(client, base, worker, store, cfg):
    """A Today with every kind of line the actions below act on: a review, a decision, a name to place, a held item
    and, with old to-dos, a suggestion."""
    for case_id in CASES:
        hand_in(client, base, worker, case_id)
    long_ago = datetime.now(UTC) - timedelta(days=cfg.ui.today.stale_after_days + 5)
    for text in ("Tidy the style sheet", "Sort the old proofs"):
        stamp(store, "action", add_action(store, text), long_ago)
    return client.get(f"{base}/today/queue").json()


def first(lines, kind):
    found = [line for line in lines if line["kind"] == kind]
    assert found, f"the world has no {kind} line: {sorted({line['kind'] for line in lines})}"
    return found[0]


def acts(client, base, lines):
    """Each way a person acts on a line, as the call it makes, by the name of the action."""
    review = first(lines, "review")
    decision = first(lines, "decision")
    who = first(lines, "who_is")
    held = first(lines, "held")
    stale = first(lines, "stale")
    person = PEOPLE[1]["id"]
    return {
        "look over": lambda: client.get(f"{base}/changes"),
        "all looks good": lambda: client.post(f"{base}/changesets/confirm", json={"changesets": review["changesets"]}),
        "not right": lambda: client.post(
            f"{base}/changesets/{review['changeset']}/send-back", json={"note": "Not a to-do.", "undo_first": True}
        ),
        "answer": lambda: client.post(f"{base}/questions/{decision['question']}/answer", json={"text": "Matte."}),
        "pick who": lambda: client.post(f"{base}/questions/{who['question']}/answer", json={"person": person}),
        "keep": lambda: client.post(
            f"{base}/changesets/{held['changeset']}/ops/{held['op']}/release", json={"person": None}
        ),
        "drop": lambda: client.post(f"{base}/changesets/{held['changeset']}/ops/{held['op']}/decline"),
        "keep a to-do": lambda: client.post(f"{base}/suggestions/choose", json={"key": stale["key"], "choice": "keep"}),
        "snooze": lambda: client.post(f"{base}/suggestions/choose", json={"key": stale["key"], "choice": "snooze"}),
        "not now": lambda: client.post(f"{base}/suggestions/not-now", json={"key": stale["key"]}),
        "undo": lambda: client.post(f"{base}/changesets/{review['changeset']}/undo", json={}),
    }


NAMES = (
    "look over",
    "all looks good",
    "not right",
    "answer",
    "pick who",
    "keep",
    "drop",
    "keep a to-do",
    "snooze",
    "not now",
    "undo",
)


@pytest.mark.parametrize("name", NAMES)
def test_no_action_on_today_adds_a_line_to_today(api, name):  # noqa: F811
    client, base, worker = api
    store = client.app_store
    lines = world(client, base, worker, store, store.plugins.cfg)
    before = len(lines)
    done = acts(client, base, lines)[name]()
    assert done.status_code == 200, (name, done.status_code, done.text)
    after = client.get(f"{base}/today/queue").json()
    assert len(after) <= before, (name, sorted(line["key"] for line in after))
    keys = [line["key"] for line in after]
    assert len(keys) == len(set(keys))


def test_every_action_above_is_tried_on_the_world_that_has_its_line(api):  # noqa: F811
    """The check isn't empty: the world has the lines the actions act on, and the actions that apply do change Today."""
    client, base, worker = api
    store = client.app_store
    lines = world(client, base, worker, store, store.plugins.cfg)
    assert {"review", "decision", "who_is", "held", "stale"} <= {line["kind"] for line in lines}
    assert acts(client, base, lines)["all looks good"]().status_code == 200
    after = client.get(f"{base}/today/queue").json()
    assert len(after) == len(lines) - 1


def test_keep_it_open_with_a_note_hands_the_note_in_and_a_refused_note_changes_nothing(api):  # noqa: F811
    client, base, worker = api
    store = client.app_store
    held = first(world(client, base, worker, store, store.plugins.cfg), "held")
    url = f"{base}/changesets/{held['changeset']}/ops/{held['op']}/decline"
    # A note on an op the changeset doesn't have is refused before anything changes: the item is still held.
    wrong = client.post(f"{base}/changesets/{held['changeset']}/ops/999/decline", json={"note": "Still needed"})
    assert wrong.status_code in (404, 409, 422), wrong.text
    assert any(line["key"] == held["key"] for line in client.get(f"{base}/today/queue").json())
    done = client.post(url, json={"note": "Still needed for the launch"})
    assert done.status_code == 200, done.text
    assert done.json()["request"], "the note is handed in as the person's own words"

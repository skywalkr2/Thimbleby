"""Today's queue and item titles (design 7.7, 7.14): ranked lines from the fixture cases, titles by the title rule.

Names come from the imprint fixture, never written out here.
"""

import json

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine.ai.adapters.stub import set_responder
from engine.evaluate import load_cases
from engine.language_words import shipped
from engine.names import Resolved
from engine.titles import first_line, title_for
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records

TOKEN = "test-token-value"
SKIP = shipped("title_skip")


def case(case_id: str) -> dict:
    return next(c for c in load_cases(DEMO_B) if c["id"] == case_id)


@pytest.fixture
def api(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"server.base_path": "/", "storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui")
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        client.app_store = app.state.store
        yield client, "/api", app.state.worker
    set_responder(None)


def hand_in(client, base, worker, case_id: str, *, topic: str | None = None) -> str:
    c = case(case_id)
    answer = dict(c["stub_answer"])
    if topic is not None:
        answer["topic"] = topic
    set_responder(lambda task: json.dumps(answer))
    r = client.post(f"{base}/handin", json={"note": c.get("note", ""), "pasted": c.get("pasted", "")})
    assert r.status_code == 200
    assert worker.run_pending() == 1
    return r.json()["request"]


class _People:
    def __init__(self, known: dict[str, str]):
        self.known = known

    def resolve(self, name: str) -> Resolved:
        pid = self.known.get(name)
        return Resolved("ok", pid) if pid else Resolved("unknown")


def test_a_pasted_message_is_titled_by_its_sender_and_subject():
    person = fixture_records(DEMO_B, "person")[0]
    head = f"From: {person['full_name']} <someone@example.com>\nSubject: Re: Proof dates\n\nHi team,\nThe proofs ship."
    title = title_for(
        {"origin": "pm"},
        {"trust": "untrusted"},
        None,
        people=_People({person["full_name"]: person["id"]}),
        skip=SKIP,
        head=head,
    )
    assert (title.kind, title.person, title.sender, title.topic) == ("email", person["id"], None, "Proof dates")


def test_the_persons_answer_to_a_question_is_titled_as_an_answer_not_as_a_note():
    """The words typed to answer a question are kept as a note for the assistant, but they are the person's answer."""
    source = {"trust": "trusted", "kind": "note:answered", "title": "Matte"}
    title = title_for({"origin": "pm"}, source, None, people=_People({}), skip=SKIP, head="Matte")
    assert title.kind == "answer"
    plain = title_for(
        {"origin": "pm"}, {"trust": "trusted", "kind": "note:wrote"}, None, people=_People({}), skip=SKIP, head="Matte"
    )
    assert plain.kind == "note"


def test_an_unknown_sender_is_kept_as_written_without_address_or_parenthesis():
    head = "From: A Sender (A Bookshop) <a@example.com>\n\nWe can host the reading."
    title = title_for({"origin": "pm"}, {"trust": "untrusted"}, None, people=_People({}), skip=SKIP, head=head)
    assert (title.kind, title.sender) == ("email", "A Sender")
    assert title.topic == "We can host the reading."


def test_greetings_headers_and_sign_offs_never_start_a_title():
    skipping = [__import__("re").compile(p, 2) for p in SKIP]
    text = "Hi team,\n\nTo: everyone\n--\nThe launch reading moves to December.\nThanks!"
    assert first_line(text, skipping) == "The launch reading moves to December."
    # A first line too long to show whole is never cut: there is no line to use.
    long = "Hi team,\n\nThe launch reading moves to the second week of December this year.\nThanks!"
    assert first_line(long, skipping) == ""


def test_the_assistants_topic_comes_before_the_first_line():
    title = title_for(
        {"origin": "pm"},
        {"trust": "untrusted"},
        {"topic": "launch reading guest list"},
        people=_People({}),
        skip=SKIP,
        head="Hi,\nEvents: a long line",
    )
    assert (title.kind, title.topic) == ("pasted", "launch reading guest list")


def test_the_persons_own_note_is_titled_as_their_note():
    title = title_for(
        {"origin": "pm", "note": "Hello\nCall the venue about chairs"}, None, None, people=_People({}), skip=SKIP
    )
    assert (title.kind, title.topic) == ("note", "Call the venue about chairs")


def test_a_watched_item_uses_its_kind_author_and_subject():
    source = {
        "trust": "untrusted",
        "title": "Fwd: Catalog copy",
        "watched": {"source": "mail", "key": "k", "author": "Someone"},
    }
    title = title_for({"origin": "input"}, source, None, people=_People({}), skip=SKIP, watched_kind="email")
    assert (title.kind, title.sender, title.topic) == ("email", "Someone", "Catalog copy")


def test_a_long_topic_from_the_assistant_is_cut_at_a_word():
    from engine.ops import CHANGESET, TOPIC_MAX

    cs = CHANGESET.validate_python({"summary": "s", "topic": "word " * 40, "ops": []})
    assert (
        len(cs.topic) <= TOPIC_MAX
        and not cs.topic.endswith(" ")
        and cs.topic.split() == ["word"] * len(cs.topic.split())
    )


def test_the_queue_ranks_decisions_first_then_reviews(api):
    client, base, worker = api
    review = hand_in(client, base, worker, "production-checkin", topic="production check-in notes")
    hand_in(client, base, worker, "decision-for-pm")
    lines = client.get(f"{base}/today/queue").json()
    groups = [line["group"] for line in lines]
    assert groups == sorted(groups, key=["decide", "risk", "review", "send"].index)
    decision = next(line for line in lines if line["kind"] == "decision")
    assert decision["group"] == "decide" and decision["question"] and decision["text"]
    line = next(line for line in lines if line["key"] == f"review:{review}")
    assert line["outcome"]["actions_added"] == 3 and line["count"] == 3
    assert line["title"]["kind"] == "pasted" and line["title"]["topic"] == "production check-in notes"
    assert line["untrusted"] is True
    # The same title shows on What changed.
    item = next(i for i in client.get(f"{base}/changes").json() if i["id"] == review)
    assert item["title"]["topic"] == "production check-in notes"


def test_a_name_the_assistant_couldnt_place_is_its_own_top_level_line(api):
    client, base, worker = api
    request = hand_in(client, base, worker, "shared-first-name")
    lines = client.get(f"{base}/today/queue").json()
    who = [line for line in lines if line["kind"] == "who_is"]
    assert len(who) == 1 and who[0]["group"] == "decide" and who[0]["request"] == request
    assert who[0]["changeset"] and who[0]["op"] is not None and who[0]["text"]
    assert lines.index(who[0]) < next(i for i, line in enumerate(lines) if line["group"] == "review")


def test_the_same_name_in_two_inputs_is_asked_once_and_the_answer_covers_both(api):
    client, base, worker = api
    hand_in(client, base, worker, "shared-first-name")
    hand_in(client, base, worker, "shared-first-name")
    who = [line for line in client.get(f"{base}/today/queue").json() if line["kind"] == "who_is"]
    assert len(who) == 1, "one line for the name, not one for each input"
    held = [
        o
        for item in client.get(f"{base}/changes").json()
        for o in (item.get("changeset") or {}).get("ops", [])
        if o["status"] == "held" and o.get("ask")
    ]
    assert len(held) == 2
    choice = held[0]["ask"]["options"][0]["id"]
    assert client.post(f"{base}/questions/{who[0]['question']}/answer", json={"person": choice}).status_code == 200
    after = [
        o
        for item in client.get(f"{base}/changes").json()
        for o in (item.get("changeset") or {}).get("ops", [])
        if o["status"] == "held" and o.get("ask")
    ]
    assert after == []


def test_an_action_without_an_owner_asks_for_one_on_its_own_line(api):
    client, base, worker = api
    hand_in(client, base, worker, "no-owner")
    lines = client.get(f"{base}/today/queue").json()
    owner = [line for line in lines if line["kind"] in ("owner", "who_is", "held")]
    assert owner and all(line["group"] == "decide" for line in owner)


def test_messages_to_send_are_one_line_per_person_with_their_name(api):
    client, base, worker = api
    hand_in(client, base, worker, "production-checkin")
    lines = client.get(f"{base}/today/queue").json()
    sends = [line for line in lines if line["kind"] == "send"]
    assert sends and all(line["person_name"] and line["count"] >= 1 for line in sends)
    assert len({line["person"] for line in sends}) == len(sends)


def test_the_live_stream_names_the_kinds_written(api):
    client, base, worker = api
    store = client.app_store
    position, _ = store.read().changed_kinds(0)
    hand_in(client, base, worker, "production-checkin")
    after, kinds = store.read().changed_kinds(position)
    assert after > position and {"request", "changeset", "action"} <= set(kinds)


def test_work_whose_every_change_was_refused_keeps_a_line_that_counts_the_refused(api):
    """A review line never counts zero: when every change was refused it counts those, so the work still has a line;
    with nothing applied, held or refused there is no line at all."""
    from engine.storage import WriteContext

    client, base, worker = api
    store = client.app_store
    request = hand_in(client, base, worker, "production-checkin", topic="production check-in notes")
    before = [line for line in client.get(f"{base}/today/queue").json() if line["kind"] == "review"]
    assert [line["request"] for line in before] == [request] and before[0]["count"] > 0

    changeset = before[0]["changeset"]
    found = store.read().get("changeset", changeset)
    refused = [{**o, "status": "refused"} for o in found.data["ops"]]
    with store.transaction() as tx:
        tx.update(
            "changeset",
            changeset,
            {"ops": refused},
            WriteContext(actor="engine", trust="trusted", op="test.queue"),
            read_version=found.version,
        )
    lines = client.get(f"{base}/today/queue").json()
    (line,) = [line for line in lines if line["kind"] == "review"]
    assert line["count"] == len(refused) and line["outcome"]["refused"] == len(refused)
    assert all(line["count"] > 0 for line in lines if line.get("count") is not None and line["kind"] != "rule_review")
    found = store.read().get("changeset", changeset)
    with store.transaction() as tx:
        tx.update(
            "changeset",
            changeset,
            {"ops": []},
            WriteContext(actor="engine", trust="trusted", op="test.queue"),
            read_version=found.version,
        )
    assert not [line for line in client.get(f"{base}/today/queue").json() if line["kind"] == "review"]


def test_a_line_that_holds_one_thing_carries_that_things_own_words_as_its_subject(api):
    """The screen titles a one-item line by the item itself, and keeps counted titles for lines that group several."""
    from datetime import date, timedelta

    from engine.storage import WriteContext

    client, base, worker = api
    store = client.app_store
    request = hand_in(client, base, worker, "production-checkin", topic="production check-in notes")
    (review,) = [line for line in client.get(f"{base}/today/queue").json() if line["key"] == f"review:{request}"]
    assert review["count"] > 1 and review["subject"] is None

    changeset = review["changeset"]
    found = store.read().get("changeset", changeset)
    first = found.data["ops"][0]
    with store.transaction() as tx:
        tx.update(
            "changeset",
            changeset,
            {"ops": [first]},
            WriteContext(actor="engine", trust="trusted", op="test.queue"),
            read_version=found.version,
        )
    (one,) = [line for line in client.get(f"{base}/today/queue").json() if line["key"] == f"review:{request}"]
    assert one["count"] == 1 and one["subject"]
    assert one["subject"] == (first.get("label") or first["op"].get("text") or first["op"].get("title"))

    # The person's own overdue to-dos: one gives its words, several give none.
    actions = [
        a
        for a in store.read().list("action")
        if a.data["status"] == "open" and a.data.get("owners") and not a.data.get("on_hold")
    ]
    mine = client.get(f"{base}/me").json()["person"]
    mine_open = [a for a in actions if any(o["person"] == mine for o in a.data["owners"])]
    assert len(mine_open) >= 2
    past = (date.today() - timedelta(days=400)).isoformat()
    future = (date.today() + timedelta(days=400)).isoformat()

    def set_due(due_by_id):
        for action_id, due in due_by_id.items():
            rec = store.read().get("action", action_id)
            with store.transaction() as tx:
                tx.update(
                    "action",
                    action_id,
                    {"due": due},
                    WriteContext(actor="pm", trust="trusted", op="test.queue"),
                    read_version=rec.version,
                )

    set_due({a.id: future for a in mine_open} | {mine_open[0].id: past})
    (overdue,) = [line for line in client.get(f"{base}/today/queue").json() if line["kind"] == "overdue"]
    assert overdue["count"] == 1 and overdue["subject"] == mine_open[0].data["text"]
    set_due({mine_open[1].id: past})
    (overdue,) = [line for line in client.get(f"{base}/today/queue").json() if line["kind"] == "overdue"]
    assert overdue["count"] == 2 and overdue["subject"] is None


def _keys(client, base) -> list[str]:
    return [line["key"] for line in client.get(f"{base}/today/queue").json()]


def _each_once(client, base) -> None:
    keys = _keys(client, base)
    assert len(keys) == len(set(keys)), sorted(k for k in keys if keys.count(k) > 1)


@pytest.mark.parametrize("case_id", ["production-checkin", "decision-for-pm", "no-owner", "shared-first-name"])
def test_no_line_key_repeats_on_today_after_each_kind_of_input(api, case_id):
    """Each item once (check C57): a decision, a question, a Pick an owner, a name to place and a review each show one
    line, whatever else is there."""
    client, base, worker = api
    _each_once(client, base)
    hand_in(client, base, worker, case_id)
    _each_once(client, base)
    hand_in(client, base, worker, "production-checkin")
    _each_once(client, base)


def test_no_line_key_repeats_with_overdue_to_dos_setup_open_and_mail_not_connected(api):
    from datetime import date, timedelta

    from engine.storage import WriteContext

    client, base, worker = api
    store = client.app_store
    for case_id in ("no-owner", "decision-for-pm", "production-checkin"):
        hand_in(client, base, worker, case_id)
    assert client.get(f"{base}/setup").json()["finished"] is False
    mine = client.get(f"{base}/me").json()["person"]
    past = (date.today() - timedelta(days=30)).isoformat()
    for a in store.read().list("action"):
        if a.data["status"] == "open" and any(o["person"] == mine for o in a.data.get("owners") or []):
            with store.transaction() as tx:
                tx.update(
                    "action",
                    a.id,
                    {"due": past},
                    WriteContext(actor="pm", trust="trusted", op="test.queue"),
                    read_version=a.version,
                )
    lines = client.get(f"{base}/today/queue").json()
    assert any(line["kind"] == "overdue" for line in lines)
    _each_once(client, base)


def test_an_item_that_would_fall_in_two_groups_stays_in_the_higher_one_only():
    from engine.today_queue import Line, once_each

    low = Line(key="same", group="send", kind="nudge")
    high = Line(key="same", group="decide", kind="question")
    other = Line(key="other", group="review", kind="review")
    assert once_each([low, other, high]) == [other, high]
    twin = Line(key="same", group="decide", kind="decision")
    assert once_each([high, twin]) == [high]


def test_the_overdue_summary_line_counts_the_to_dos_the_list_shows_as_overdue(api):
    """One summary line for the person's overdue to-dos; its button opens the to-dos list filtered to the overdue state,
    so the line's items are the rows that filter shows."""
    from datetime import date, timedelta

    from engine.storage import WriteContext

    client, base, worker = api
    store = client.app_store
    mine = client.get(f"{base}/me").json()["person"]
    past = (date.today() - timedelta(days=400)).isoformat()
    owned = [
        a
        for a in store.read().list("action")
        if a.data["status"] == "open" and any(o["person"] == mine for o in a.data.get("owners") or [])
    ]
    assert len(owned) >= 2
    others = [
        a
        for a in store.read().list("action")
        if a.data["status"] == "open"
        and a.data.get("owners")
        and not a.data.get("on_hold")
        and all(o["person"] != mine for o in a.data["owners"])
    ]
    assert others, "the fixture has an open to-do that is someone else's"
    for a in [*owned[:2], others[0]]:
        with store.transaction() as tx:
            tx.update(
                "action",
                a.id,
                {"due": past},
                WriteContext(actor="pm", trust="trusted", op="test.queue"),
                read_version=a.version,
            )
    lines = [line for line in client.get(f"{base}/today/queue").json() if line["kind"] == "overdue"]
    assert len(lines) == 1 and lines[0]["group"] == "risk" and lines[0]["key"] == "overdue"
    rows = [a for a in client.get(f"{base}/open-items").json()["actions"] if a["state"] == "overdue"]
    # Someone else's overdue to-do is in the list, so the link narrows it to the person's own, as the line does.
    assert others[0].id in {a["id"] for a in rows}
    shown = {a["id"] for a in rows if any(o["person"] == mine for o in a["owners"])}
    assert lines[0]["count"] == len(shown) >= 2
    assert set(lines[0]["actions"]) == shown
    assert others[0].id not in lines[0]["actions"]


def _held_ops(store) -> list[tuple[str, int]]:
    return [
        (cs.id, o["index"]) for cs in store.read().list("changeset") for o in cs.data["ops"] if o["status"] == "held"
    ]


def _has_a_line(lines: list[dict], changeset: str, index: int) -> bool:
    """Whether Today asks about this held op: its own line, or the one line of the project ending that holds it."""
    return any(
        line["changeset"] == changeset
        and (line["kind"] == "project_ending" or (line["kind"] in ("held", "who_is") and line["op"] == index))
        for line in lines
    )


def test_every_held_op_has_a_line_on_today_whatever_holds_it(api):
    """What changed shows a held item as information with a link to Today, so each held op, in a group of an answer
    or a project the assistant found included, has its own line there."""
    from engine.storage import WriteContext

    client, base, worker = api
    store = client.app_store
    hand_in(client, base, worker, "no-owner")
    hand_in(client, base, worker, "shared-first-name")
    person = fixture_records(DEMO_B, "person")[2]
    raw = "The Harvest " + "Fair needs a plan. Call me on 555 0100."
    ops = [
        {"op": "project.add", "name": "Harvest " + "Fair"},
        {
            "op": "person.contact",
            "person": person["id"],
            "kind": "phone",
            "value": "555 0100",
            "evidence": {"quote": "Call me on 555 0100"},
        },
    ]
    set_responder(lambda task: json.dumps({"summary": "Done.", "ops": ops}))
    client.post(f"{base}/handin", json={"note": "", "pasted": raw})
    assert worker.run_pending() == 1

    held = _held_ops(store)
    kinds = {o["op"]["op"] for cs in store.read().list("changeset") for o in cs.data["ops"] if o["status"] == "held"}
    assert {"project.add", "person.contact"} <= kinds and len(held) >= 3
    lines = client.get(f"{base}/today/queue").json()
    assert [h for h in held if not _has_a_line(lines, *h)] == []

    # The same ops, labeled as one group of an answer, are asked the same way.
    for cs in store.read().list("changeset"):
        ops = [{**o, "answer_group": "A group"} if o["status"] == "held" else o for o in cs.data["ops"]]
        found = store.read().get("changeset", cs.id)
        with store.transaction() as tx:
            tx.update(
                "changeset",
                cs.id,
                {"ops": ops},
                WriteContext(actor="engine", trust="trusted", op="test.queue"),
                read_version=found.version,
            )
    lines = client.get(f"{base}/today/queue").json()
    assert [h for h in held if not _has_a_line(lines, *h)] == []
    keys = [line["key"] for line in lines]
    assert len(keys) == len(set(keys))


def test_a_held_op_keeps_its_line_on_today_when_its_hand_in_is_dismissed(api):
    """Dismissing a hand-in sets its request aside; what the assistant held from it still waits for the person, and
    Today's line is the only place to answer, so every held op keeps a line whatever happened to the hand-in."""
    from engine.storage import WriteContext

    client, base, worker = api
    store = client.app_store
    person = fixture_records(DEMO_B, "person")[2]
    raw = "The Harvest " + "Fair needs a plan. Call me on 555 0100."
    ops = [
        {"op": "project.add", "name": "Harvest " + "Fair"},
        {
            "op": "person.contact",
            "person": person["id"],
            "kind": "phone",
            "value": "555 0100",
            "evidence": {"quote": "Call me on 555 0100"},
        },
    ]
    set_responder(lambda task: json.dumps({"summary": "Done.", "ops": ops}))
    request = client.post(f"{base}/handin", json={"note": "", "pasted": raw}).json()["request"]
    assert worker.run_pending() == 1
    held = _held_ops(store)
    assert held, "the hand-in holds something for the person"
    assert [h for h in held if not _has_a_line(client.get(f"{base}/today/queue").json(), *h)] == []

    # The request stops on a later try (the only states a hand-in can be dismissed in), still holding its changeset.
    found = store.read().get("request", request)
    with store.transaction() as tx:
        tx.update(
            "request",
            request,
            {"state": "needs_you", "waiting": "Stopped on a later try"},
            WriteContext(actor="engine", trust="trusted", op="test.queue"),
            read_version=found.version,
        )
    found = store.read().get("request", request)
    assert found.data["changeset"]
    done = client.post(f"{base}/requests/{request}/dismiss", json={"read_version": found.version})
    assert done.status_code == 200
    assert store.read().get("request", request).data["dismissed"] is True
    lines = client.get(f"{base}/today/queue").json()
    assert [h for h in held if not _has_a_line(lines, *h)] == []
    keys = [line["key"] for line in lines]
    assert len(keys) == len(set(keys))


def test_no_line_key_repeats_when_mail_was_handled_and_its_count_is_not_a_line_of_the_queue(tmp_path):
    """The count of what was handled for the person is a quiet line of the rail; the queue holds only what they do, so
    handled mail adds no line and repeats no key."""
    from tests.test_handled import SHOP_LIST, code_mail, promo, start

    _, _, store, client, base = start(tmp_path, [code_mail(1), promo("sale-a", SHOP_LIST, 2)])
    try:
        counts = client.get(f"{base}/handled/counts").json()
        assert counts["set_aside"] > 0 and counts["today"] >= 0
        keys = _keys(client, base)
        assert len(keys) == len(set(keys)) and not [k for k in keys if "handled" in k]
    finally:
        store.close()

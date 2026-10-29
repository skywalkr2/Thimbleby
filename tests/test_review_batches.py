"""A review happens on Today (design 7.7, 6.32; change log 234): one batch for what one read took in, holding only what
needs a look, confirmed in one step with a signal for each request, folded when left unopened, and no action on Today
ever adds a line to Today. Names and ids come from the fixtures; the AI is the stub."""

from __future__ import annotations

from datetime import timedelta

import pytest

from engine import review_batches, source_intake
from engine.today_queue import queue
from tests.test_source_intake import NOW, item, lines_of, mail, make, read, requests_of
from tests.test_source_intake import with_changeset as _with_changeset


@pytest.fixture
def env(tmp_path):
    ws, cfg, store = make(tmp_path, [mail("new", 2), mail("mid", 3), mail("old", 4), item("page")])
    yield ws, cfg, store
    store.close()


def batch(env):
    """The source's intake, read: one request for each item."""
    read(env)
    return requests_of(env[2], intake="m")


def with_changeset(store, request_id, ops):
    """The changeset the assistant would have made, its ops grouped as the applier groups them."""
    cs_id = _with_changeset(store, request_id, ops)
    found = store.read().get("changeset", cs_id)
    with store.transaction() as tx:
        tx.update(
            "changeset",
            cs_id,
            {"ops": [{**o, "group": f"g{o['index']}"} for o in found.data["ops"]]},
            review_batches._PM,
            read_version=found.version,
        )
    return cs_id


def finish(store, requests):
    """The requests that have nothing to show: done, so the batch is ready."""
    for r in requests:
        with store.transaction() as tx:
            cur = tx.get("request", r.id)
            tx.update("request", r.id, {"state": "done"}, review_batches._PM, read_version=cur.version)


def test_facts_sources_and_notes_are_filed_quietly_so_a_batch_of_them_has_no_line(env):
    ws, cfg, store = env
    requests = batch(env)
    for r in requests:
        with_changeset(store, r.id, [("fact", "applied"), ("note", "applied"), ("event.add", "applied")])
    assert lines_of(env, "review", "intake_review", "batches") == []
    # What changed says it was filed, not that it waits for a look.
    for r in requests:
        cs = store.read().get("changeset", store.read().get("request", r.id).data["changeset"])
        assert review_batches.review_of(cs.data) == "filed"


def test_only_what_needs_a_look_is_counted_and_listed_in_the_batch(env):
    ws, cfg, store = env
    first, second, third, *rest = batch(env)
    with_changeset(store, first.id, [("action.add", "applied"), ("fact", "applied"), ("note", "applied")])
    with_changeset(store, second.id, [("fact", "applied"), ("text.draft", "applied"), ("question.add", "applied")])
    with_changeset(store, third.id, [("note", "applied")])
    finish(store, rest)
    (line,) = lines_of(env, "intake_review")
    assert line.count == 2, "the request that filed only a note has nothing to look at"
    assert line.outcome == {"actions_added": 1, "drafts": 1, "questions": 1}
    assert [(i.kind, i.what) for i in line.items] == [
        ("batch_item", "action"),
        ("batch_item", "draft"),
        ("batch_item", "question"),
    ]
    assert len(line.changesets) == 2


def test_a_request_handed_in_alone_is_one_batch_of_what_needs_a_look(env):
    ws, cfg, store = env
    with store.transaction() as tx:
        plain = tx.create(
            "request",
            {"task": "notes", "origin": "pm", "state": "queued", "created_at": NOW.isoformat()},
            review_batches._PM,
        ).id
    with_changeset(store, plain, [("fact", "applied"), ("action.add", "applied"), ("action.add", "applied")])
    (line,) = lines_of(env, "review")
    assert (line.count, [i.what for i in line.items]) == (2, ["action", "action"])
    assert len(line.changesets) == 1


def test_all_looks_good_confirms_the_batch_with_one_confirmed_signal_for_each_request_and_the_line_leaves(env):
    ws, cfg, store = env
    first, second, third, *rest = batch(env)
    with_changeset(store, first.id, [("action.add", "applied")])
    with_changeset(store, second.id, [("question.add", "applied")])
    with_changeset(store, third.id, [("fact", "applied")])
    finish(store, rest)
    (line,) = lines_of(env, "intake_review")
    before = len(queue(ws, store, cfg, NOW))
    done = review_batches.confirm(store, line.changesets, NOW)
    assert len(done.changesets) == 2 and len(done.signals) == 2
    signals = [s.data for s in store.read().list("signal") if s.data["kind"] == "confirmed"]
    assert sorted(s["refs"][0] for s in signals) == sorted([first.id, second.id])
    assert all(s["note"] is None for s in signals)
    assert lines_of(env, "intake_review") == []
    assert len(queue(ws, store, cfg, NOW)) == before - 1
    # Pressing it again does nothing.
    again = review_batches.confirm(store, line.changesets, NOW)
    assert (again.changesets, again.signals) == ([], [])
    # Undo puts the batch back and marks the signals as taken back.
    assert review_batches.unconfirm(store, done.changesets, done.signals) == 2
    assert len(lines_of(env, "intake_review")) == 1
    assert {s.data["note"] for s in store.read().list("signal") if s.data["kind"] == "confirmed"} == {
        review_batches.TAKEN_BACK
    }


def test_opening_a_batch_marks_nothing_seen_and_never_splits_it(env):
    """The batch's requests stay one line until it is confirmed: nothing about reading it changes the records."""
    ws, cfg, store = env
    first, second, *rest = batch(env)
    with_changeset(store, first.id, [("action.add", "applied")])
    with_changeset(store, second.id, [("action.add", "applied")])
    finish(store, rest)
    before = [(x.key, x.count) for x in queue(ws, store, cfg, NOW)]
    assert source_intake.unseen(store.read()).get("m")
    assert [(x.key, x.count) for x in queue(ws, store, cfg, NOW)] == before
    assert len(lines_of(env, "intake_review")) == 1 and lines_of(env, "review") == []


def test_a_batch_that_still_waits_for_a_yes_keeps_its_line_for_that_alone_after_it_is_confirmed(env):
    ws, cfg, store = env
    first, *rest = batch(env)
    with_changeset(store, first.id, [("action.add", "applied"), ("project.add", "held")])
    finish(store, rest)
    (line,) = lines_of(env, "intake_review")
    assert sorted(i.kind for i in line.items) == ["batch_item", "held"]
    review_batches.confirm(store, line.changesets, NOW)
    (still,) = lines_of(env, "intake_review")
    assert [i.kind for i in still.items] == ["held"] and still.changesets == []
    assert still.outcome == {"held": 1}


def test_a_reply_sent_back_stays_in_its_batch_so_a_correction_adds_no_line(env):
    from engine.dispatcher import send_back

    ws, cfg, store = env
    first, second, *rest = batch(env)
    with_changeset(store, first.id, [("action.add", "applied")])
    with_changeset(store, second.id, [("action.add", "applied")])
    finish(store, rest)
    (line,) = lines_of(env, "intake_review")
    before = len(queue(ws, store, cfg, NOW))
    redo = send_back(store, store.read().get("request", first.id).data["changeset"], "Not a to-do", NOW)
    assert store.read().get("request", redo).data["intake"] == "m"
    assert len(queue(ws, store, cfg, NOW)) <= before
    (after,) = lines_of(env, "intake_review", "review")
    assert after.kind == "intake_review" and after.count == 1 and line.count == 2


def _old_batches(env, how_many, days):
    """Plain requests, each with a to-do to look at, handed in `days` days before now."""
    ws, cfg, store = env
    made = []
    for n in range(how_many):
        with store.transaction() as tx:
            made.append(
                tx.create(
                    "request",
                    {
                        "task": "notes",
                        "origin": "pm",
                        "state": "queued",
                        "created_at": (NOW - timedelta(days=days + n)).isoformat(),
                    },
                    review_batches._PM,
                ).id
            )
        with_changeset(store, made[-1], [("action.add", "applied")])
    return made


def test_batches_left_unopened_fold_into_one_line_oldest_first(env):
    ws, cfg, store = env
    cfg.ui.today.fold_batches_after_days = 3
    made = _old_batches(env, 3, 5)
    (line,) = lines_of(env, "batches", "review")
    assert line.kind == "batches" and line.count == 3 and line.group == "review"
    assert [p.request for p in line.parts] == list(reversed(made)), "the oldest first"
    assert len(line.changesets) == 3
    assert line.since == line.parts[0].since


def test_one_old_batch_and_a_new_one_are_not_folded(env):
    ws, cfg, store = env
    cfg.ui.today.fold_batches_after_days = 3
    _old_batches(env, 1, 5)
    _old_batches(env, 1, 0)
    assert sorted(x.kind for x in lines_of(env, "batches", "review")) == ["review", "review"]


def test_the_fold_can_be_turned_off(env):
    ws, cfg, store = env
    cfg.ui.today.fold_batches_after_days = 0
    _old_batches(env, 3, 9)
    assert [x.kind for x in lines_of(env, "batches", "review")] == ["review"] * 3


def test_the_routes_confirm_and_undo_a_batch_and_what_changed_reads_filed_checked_and_unchecked(tmp_path):
    from fastapi.testclient import TestClient

    from api.app import create_app
    from engine.ai.adapters.stub import set_responder
    from engine.workspace import init_workspace
    from tests.conftest import DEMO_B
    from tests.test_today_queue import TOKEN, hand_in

    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"server.base_path": "/", "storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui")
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        base, worker = "/api", app.state.worker
        request = hand_in(client, base, worker, "production-checkin")

        def line():
            return next((x for x in client.get(f"{base}/today/queue").json() if x["key"] == f"review:{request}"), None)

        def review():
            return next(i for i in client.get(f"{base}/changes").json() if i["id"] == request)["review"]

        shown = line()
        assert shown["count"] == 3 and len(shown["items"]) == 3 and shown["changesets"] == [shown["changeset"]]
        assert {i["kind"] for i in shown["items"]} == {"batch_item"}
        assert {i["what"] for i in shown["items"]} == {"action"}
        assert review() == "unchecked"
        done = client.post(f"{base}/changesets/confirm", json={"changesets": shown["changesets"]}).json()
        assert len(done["signals"]) == 1 and line() is None and review() == "checked"
        signal = app.state.store.read().get("signal", done["signals"][0]).data
        assert (signal["kind"], signal["refs"], signal["changeset"]) == ("confirmed", [request], shown["changeset"])
        back = client.post(f"{base}/changesets/unconfirm", json=done).json()
        assert back == {"reopened": 1} and line() is not None and review() == "unchecked"
        assert app.state.store.read().get("signal", done["signals"][0]).data["note"] == review_batches.TAKEN_BACK
        assert client.post(f"{base}/changesets/confirm", json={"changesets": ["CS-999"]}).status_code == 404
    set_responder(None)


def test_not_right_on_one_item_sends_back_that_item_alone_and_it_leaves_the_review_at_once(env):
    from engine.dispatcher import send_back

    ws, cfg, store = env
    with store.transaction() as tx:
        plain = tx.create(
            "request",
            {"task": "notes", "origin": "pm", "state": "queued", "created_at": NOW.isoformat()},
            review_batches._PM,
        ).id
    cs_id = with_changeset(store, plain, [("action.add", "applied"), ("action.add", "applied")])
    (line,) = lines_of(env, "review")
    assert [i.op for i in line.items] == [0, 1]
    redo = send_back(store, cs_id, "Not a to-do", NOW, ops=[0])
    # The rejected item is undone and gone from the review; its sibling still waits for a look, in the same change.
    outcomes = {o["index"]: o["status"] for o in store.read().get("changeset", cs_id).data["ops"]}
    assert outcomes == {0: "undone", 1: "applied"}
    (after,) = lines_of(env, "review")
    assert [i.op for i in after.items] == [1] and after.count == 1
    # The redo is told which item the note is about.
    note = store.read().get("request", redo).data["note"]
    assert "action.add 0" in note and "Not a to-do" in note


def test_a_to_do_in_a_review_carries_its_owner_and_project_beside_its_source(env):
    from engine.names import People

    ws, cfg, store = env
    view = store.read()
    me = People(store, cfg).pm
    project = view.list("project")[0].id
    first, *rest = batch(env)
    with store.transaction() as tx:
        todo = tx.create(
            "action",
            {"text": "Send the spine options", "owners": [{"person": me}], "project": project},
            review_batches._PM,
        ).id
    cs_id = with_changeset(store, first.id, [("action.add", "applied")])
    found = store.read().get("changeset", cs_id)
    ops = [{**found.data["ops"][0], "records": [{"kind": "action", "id": todo}]}]
    with store.transaction() as tx:
        tx.update("changeset", cs_id, {"ops": ops}, review_batches._PM, read_version=found.version)
    finish(store, rest)
    (line,) = lines_of(env, "intake_review")
    (row,) = line.items
    assert (row.person, row.project) == (me, project)
    assert row.title is not None, "the source the to-do came from"


def test_a_draft_in_a_review_carries_the_drafted_text(env):
    ws, cfg, store = env
    first, *rest = batch(env)
    cs_id = with_changeset(store, first.id, [("text.draft", "applied")])
    found = store.read().get("changeset", cs_id)
    ops = [{**found.data["ops"][0], "op": {"op": "text.draft", "text": "Week one: the spine."}}]
    with store.transaction() as tx:
        tx.update("changeset", cs_id, {"ops": ops}, review_batches._PM, read_version=found.version)
    finish(store, rest)
    (line,) = lines_of(env, "intake_review")
    assert [i.draft for i in line.items] == ["Week one: the spine."]

"""Helpful and Not helpful on an answer from Ask (design 6.20, 6.22): one click records one signal naming the answer,
standing in place of an opposite one, with an Undo that takes it back; both are counted on Quality beside the other
signals and teach nothing by themselves."""

from engine import answer_feedback
from engine.storage import Store
from tests.test_ask import BACKUP_WORDS, answer_with, app  # noqa: F401 - the fixture


def asked_and_answered(c, api, worker):
    answer_with({"op": "answer", "text": "Choose a backup folder in Settings.", "cites": [{"quote": BACKUP_WORDS}]})
    asked = c.post(f"{api}/ask", json={"question": "How do I set up backups?"}).json()["id"]
    worker.run_pending()
    return asked


def read(ws, fn):
    store = Store(ws.db_path, cfg=ws.config(env={}))
    try:
        return fn(store.read())
    finally:
        store.close()


def test_helpful_records_one_signal_naming_the_answer_and_the_run(app):  # noqa: F811
    ws, c, api, worker = app
    asked = asked_and_answered(c, api, worker)
    made = c.post(f"{api}/asks/{asked}/verdict", json={"helpful": True})
    assert made.status_code == 200, made.text
    found = read(ws, lambda v: (v.get("signal", made.json()["id"]), v.find("answer", {"request": asked})[-1].id))
    signal, answer = found
    assert signal.data["kind"] == answer_feedback.HELPFUL and signal.data["refs"] == [answer]
    assert signal.data["changeset"] == read(ws, lambda v: v.get("request", asked).data["changeset"])
    shown = next(a for a in c.get(f"{api}/asks").json() if a["id"] == asked)
    assert shown["verdict"] == "helpful" and shown["verdict_signal"] == signal.id


def test_clicking_the_same_verdict_again_changes_nothing_and_the_other_replaces_it(app):  # noqa: F811
    ws, c, api, worker = app
    asked = asked_and_answered(c, api, worker)
    first = c.post(f"{api}/asks/{asked}/verdict", json={"helpful": True}).json()["id"]
    assert c.post(f"{api}/asks/{asked}/verdict", json={"helpful": True}).json()["id"] == first
    second = c.post(f"{api}/asks/{asked}/verdict", json={"helpful": False}).json()["id"]
    assert second != first
    signals = read(ws, lambda v: {s.id: s.data for s in v.list("signal") if s.data["kind"] in answer_feedback.KINDS})
    assert (
        signals[first]["note"] == answer_feedback.TAKEN_BACK and signals[second]["kind"] == answer_feedback.NOT_HELPFUL
    )
    shown = next(a for a in c.get(f"{api}/asks").json() if a["id"] == asked)
    assert shown["verdict"] == "not_helpful"


def test_undo_takes_the_verdict_back_and_it_stops_counting(app):  # noqa: F811
    ws, c, api, worker = app
    asked = asked_and_answered(c, api, worker)
    made = c.post(f"{api}/asks/{asked}/verdict", json={"helpful": False}).json()["id"]
    assert c.post(f"{api}/asks/verdict/{made}/undo").status_code == 200
    assert c.post(f"{api}/asks/verdict/{made}/undo").status_code == 404  # nothing is left to take back
    shown = next(a for a in c.get(f"{api}/asks").json() if a["id"] == asked)
    assert shown["verdict"] is None and shown["verdict_signal"] is None
    assert c.get(f"{api}/quality").json()["answers"]["not_helpful"] == 0


def test_a_verdict_on_something_that_is_not_an_answer_is_refused(app):  # noqa: F811
    ws, c, api, worker = app
    assert c.post(f"{api}/asks/NOPE-1/verdict", json={"helpful": True}).status_code == 404
    assert c.post(f"{api}/asks/verdict/SIG-404/undo").status_code == 404


def test_both_verdicts_are_counted_on_quality_each_on_its_own(app):  # noqa: F811
    ws, c, api, worker = app
    first = asked_and_answered(c, api, worker)
    c.post(f"{api}/asks/{first}/verdict", json={"helpful": True})
    answer_with({"op": "answer", "text": "Another answer.", "cites": [{"quote": BACKUP_WORDS}]})
    second = c.post(f"{api}/ask", json={"question": "Where do backups go?"}).json()["id"]
    worker.run_pending()
    made = c.post(f"{api}/asks/{second}/verdict", json={"helpful": False})
    assert made.status_code == 200, made.text
    answers = c.get(f"{api}/quality").json()["answers"]
    assert (answers["helpful"], answers["not_helpful"]) == (1, 1)
    assert sum(w["helpful"] for w in answers["weeks"]) == 1 and sum(w["not_helpful"] for w in answers["weeks"]) == 1


def test_a_verdict_teaches_nothing_by_itself(app):  # noqa: F811
    from engine import learn

    ws, c, api, worker = app
    asked = asked_and_answered(c, api, worker)
    before = read(ws, lambda v: len([r for r in v.list("request") if r.data["task"] == learn.TASK]))
    c.post(f"{api}/asks/{asked}/verdict", json={"helpful": False})
    assert read(ws, lambda v: len([r for r in v.list("request") if r.data["task"] == learn.TASK])) == before
    assert answer_feedback.HELPFUL not in learn.TEACHES and answer_feedback.NOT_HELPFUL not in learn.TEACHES


def test_the_two_kinds_are_signal_kinds_the_guide_lists():
    from engine.records import Signal

    kinds = Signal.model_fields["kind"].annotation.__args__
    assert set(answer_feedback.KINDS) <= set(kinds)

"""Mail the assistant's sorting couldn't be run for (design 6.5, step 3) waits for the sorting: its request carries
`sort_pending`, the worker sorts every such request in one batch before any other run of it, a sales answer closes it as
set aside with no notes run, a work answer clears the mark and lets the notes run, and while the sorting still can't
run the request stays queued with no notes run."""

import json

import pytest

from engine.ai.adapters.stub import set_responder
from engine.ai.router import Router
from engine.ai.task import AiError
from engine.worker import Events, Worker, release_paused
from tests.test_mail_sorting import make, read, rows_of, unplaced
from tests.test_set_aside import NOW, requests_in

NOTES = json.dumps({"summary": "Nothing to do.", "ops": []})


class Account:
    """A scripted AI account: it answers a header run from a table of subject to answer, or fails it with a quota
    error while `broken`; a notes run gets an answer with no ops. It keeps the kinds of the runs it was asked for."""

    def __init__(self, answers=None):
        self.answers = answers or {}
        self.broken = False
        self.kinds = []

    def __call__(self, task):
        self.kinds.append(task.kind)
        if task.kind == "notes":
            return NOTES
        if self.broken:
            raise AiError("quota", "HTTP 402: no credit left")
        rows = [{"id": r["id"], "answer": self.answers.get(r["subject"], "work")} for r in rows_of(task)]
        return json.dumps({"answers": rows})


@pytest.fixture
def account():
    scripted = Account()
    set_responder(scripted)
    yield scripted
    set_responder(None)


def worker_of(ws, cfg, store):
    return Worker(
        ws, store, cfg, Events(), router_factory=lambda: Router(cfg, store, env={}, now=lambda: NOW), now=lambda: NOW
    )


def by_subject(store):
    out = {}
    for req in store.read().list("request"):
        source = store.read().get("source", req.data["source"])
        out[source.data["title"]] = req
    return out


def test_mail_the_sort_could_not_run_for_is_handed_in_queued_with_sort_pending_and_makes_no_notes_run(
    tmp_path, account
):
    account.broken = True
    ws, cfg, store = make(tmp_path, [unplaced(0), unplaced(1)])
    try:
        result = read(ws, store)
        assert len(result.new) == 2 and "weren't sorted by the assistant" in result.note
        queued = requests_in(store, "queued")
        assert len(queued) == 2 and all(r.data["sort_pending"] for r in queued)
        # The worker tries the sorting first; it still can't run, so the requests stay queued with no notes run.
        assert worker_of(ws, cfg, store).run_pending() == 0
        assert "notes" not in account.kinds
        queued = requests_in(store, "queued")
        assert len(queued) == 2 and all(r.data["sort_pending"] for r in queued)
        assert not store.read().has("changeset")
    finally:
        store.close()


def test_when_the_account_works_again_the_worker_sorts_first_sales_is_set_aside_and_work_runs(tmp_path, account):
    account.broken = True
    account.answers = {"Subject 0": "sales", "Subject 1": "work"}
    ws, cfg, store = make(tmp_path, [unplaced(0), unplaced(1)])
    try:
        read(ws, store)
        worker = worker_of(ws, cfg, store)
        worker.run_pending()
        assert "notes" not in account.kinds
        account.broken = False
        release_paused(store)  # an account that works again: its pause is lifted
        account.kinds.clear()
        worker.run_pending()
        assert account.kinds[0] == "sort-mail" and account.kinds.count("sort-mail") == 1, "one batch, before any run"
        assert account.kinds.count("notes") == 1, "only the work mail ran"
        requests = by_subject(store)
        aside, work = requests["Subject 0"], requests["Subject 1"]
        assert aside.data["state"] == "done" and aside.data["set_aside"]["section"] == "sales"
        assert not aside.data["sort_pending"]
        snaps = {s.data["key"]: s.data for s in store.read().list("snapshot")}
        assert snaps["thread-0"]["set_aside"]["section"] == "sales" and snaps["thread-1"]["set_aside"] is None
        assert not work.data["sort_pending"] and work.data["state"] != "queued"
    finally:
        store.close()


def test_mail_the_sort_answered_at_intake_has_no_sort_pending(tmp_path, account):
    account.answers = {"Subject 0": "sales"}
    ws, cfg, store = make(tmp_path, [unplaced(0), unplaced(1)])
    try:
        result = read(ws, store)
        assert result.note is None
        requests = list(store.read().list("request"))
        assert requests and not any(r.data["sort_pending"] for r in requests)
    finally:
        store.close()


def test_mail_held_for_the_persons_go_is_not_marked_so_it_never_waits_for_a_sort_nobody_can_start(tmp_path, account):
    """A stop that waits for the person (the first go, an amount to ask above) is theirs to lift: the mail is handed
    in as work under the same hold, and the first go's own sorting covers it. Only a stop on the accounts marks it."""
    ws, cfg, store = make(tmp_path, [unplaced(0)], ai=[("first_go: false", "first_go: true")])
    try:
        read(ws, store)
        (req,) = store.read().list("request")
        assert not req.data["sort_pending"]
        worker_of(ws, cfg, store).run_pending()
        held = store.read().get("request", req.id).data
        assert held["state"] == "needs_you" and held["approval"] == "required"
        assert account.kinds == []
    finally:
        store.close()


def test_mail_waiting_for_the_sort_on_an_account_out_of_credit_is_counted_on_todays_paused_line(tmp_path, account):
    """No silent stop: with only mail waiting for its sorting, Today still says the account is out of credit."""
    from engine.today_queue import queue

    account.broken = True
    ws, cfg, store = make(tmp_path, [unplaced(0), unplaced(1)])
    try:
        read(ws, store)
        worker_of(ws, cfg, store).run_pending()
        [line] = [x for x in queue(ws, store, cfg, NOW) if x.kind == "paused"]
        assert line.count == 2 and "out of credit" in line.waiting
    finally:
        store.close()

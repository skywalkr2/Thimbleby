"""Today's queue and the brief read the store a bounded number of times, however many to-dos there are: each request
reads what it needs once (the store's read scope) and never asks again for what it already has. A request that went
back to one query per lookup made Today slow for a person with a full workspace, and unusable when several screens
asked at once."""

from __future__ import annotations

import re
import threading

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B

TOKEN = "query-count-token"
_TEST = WriteContext(actor="pm", trust="trusted", op="test.query-count")

#: The most queries one request may make on the fixture below: it makes about 35 (it made over 1,000 without the read
#: scope), so a return to a query for each lookup fails here.
QUEUE_CEILING = 50
BRIEF_CEILING = 50
#: Forty more to-dos may add at most this many queries, never one each.
GROWTH_CEILING = 8


class Counter:
    """Counts the statements the store's connections run while it is on, per thread that ran them."""

    def __init__(self) -> None:
        self.on = False
        self.by_thread: dict[int, list[str]] = {}
        self._lock = threading.Lock()

    def trace(self, sql: str) -> None:
        if self.on:
            with self._lock:
                self.by_thread.setdefault(threading.get_ident(), []).append(re.sub(r"\s+", " ", sql))

    def total(self) -> int:
        return sum(len(v) for v in self.by_thread.values())

    def reset(self) -> None:
        self.by_thread.clear()


@pytest.fixture
def counted(tmp_path, monkeypatch):
    counter = Counter()
    import engine.storage.store as store_module

    real = store_module.connect

    def connect(path):
        conn = real(path)
        conn.set_trace_callback(counter.trace)
        return conn

    monkeypatch.setattr(store_module, "connect", connect)
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"server.base_path": "/"})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui")
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        yield client, counter, app.state.store, cfg


def _add_to_dos(store: Store, cfg, count: int) -> None:
    person = cfg.workspace.user.person
    with store.transaction() as tx:
        project = tx.create("project", {"name": "A project with many to-dos"}, _TEST).id
        for number in range(count):
            tx.create(
                "action",
                {"text": f"To-do {number} of many", "owners": [{"person": person}], "project": project},
                _TEST,
            )


def _queries(client: TestClient, counter: Counter, path: str) -> int:
    assert client.get(path).status_code == 200  # the first read, so nothing else is still starting up
    counter.reset()
    counter.on = True
    try:
        assert client.get(path).status_code == 200
    finally:
        counter.on = False
    return counter.total()


def test_a_queue_request_reads_the_store_a_bounded_number_of_times(counted):
    client, counter, store, cfg = counted
    _add_to_dos(store, cfg, 40)
    made = _queries(client, counter, "/api/today/queue")
    assert made <= QUEUE_CEILING, f"one queue request made {made} queries"


def test_a_brief_request_reads_the_store_a_bounded_number_of_times(counted):
    client, counter, store, cfg = counted
    _add_to_dos(store, cfg, 40)
    made = _queries(client, counter, "/api/brief")
    assert made <= BRIEF_CEILING, f"one brief request made {made} queries"


def test_more_to_dos_do_not_mean_more_queries(counted):
    client, counter, store, cfg = counted
    _add_to_dos(store, cfg, 10)
    few = _queries(client, counter, "/api/today/queue")
    _add_to_dos(store, cfg, 40)
    many = _queries(client, counter, "/api/today/queue")
    assert many <= few + GROWTH_CEILING, f"{few} queries with 10 to-dos, {many} with 50"


def test_the_queue_is_the_same_with_and_without_the_read_scope(counted):
    """The scope only saves reads: what the route answers is what reading without it gives."""
    client, counter, store, cfg = counted
    _add_to_dos(store, cfg, 12)
    scoped = client.get("/api/today/queue").json()
    scope = Store.read_scope
    try:
        Store.read_scope = lambda self: _no_scope()  # type: ignore[method-assign]
        plain = client.get("/api/today/queue").json()
    finally:
        Store.read_scope = scope  # type: ignore[method-assign]
    assert scoped == plain and scoped


def _no_scope():
    from contextlib import nullcontext

    return nullcontext()


def test_a_write_empties_what_a_read_scope_has_read(counted):
    _, _, store, cfg = counted
    person = cfg.workspace.user.person
    with store.read_scope():
        before = len(store.read().list("action"))
        assert store.read().get("action", "ACT-9999") is None
        with store.transaction() as tx:
            made = tx.create("action", {"text": "Written inside the scope", "owners": [{"person": person}]}, _TEST)
        assert len(store.read().list("action")) == before + 1
        assert store.read().get("action", made.id) is not None
    assert len(store.read().list("action")) == before + 1


def test_a_read_inside_a_transaction_sees_its_own_writes_and_leaves_nothing_behind(counted):
    _, _, store, cfg = counted
    person = cfg.workspace.user.person
    with store.read_scope():
        before = len(store.read().list("action"))
        try:
            with store.transaction() as tx:
                tx.create("action", {"text": "Rolled back", "owners": [{"person": person}]}, _TEST)
                assert len(store.read().list("action")) == before + 1  # what the transaction itself wrote
                raise RuntimeError("stop")
        except RuntimeError:
            pass
        assert len(store.read().list("action")) == before  # not what a rolled-back transaction wrote


def test_a_record_read_in_a_scope_is_the_callers_own(counted):
    """Each read gives a record of its own, so one caller changing what it got never changes what another reads."""
    _, _, store, _ = counted
    with store.read_scope():
        first = store.read().list("person")[0]
        first.data["full_name"] = "Changed by a caller"
        again = store.read().get("person", first.id)
    assert again.data.get("full_name") != "Changed by a caller"

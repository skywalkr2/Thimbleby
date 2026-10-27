"""Notes stored before the title rule (design 6.32, "Note titles and facts") are re-titled once, at start, through the
core's title function; a second run changes nothing, a note in the assistant's own words is left as written, and a note
whose message was not kept is titled from the header lines its own words repeat. Names come from the fixtures."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime

import pytest

from engine.note_titles import retitle_stored
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B

STRANGER = "Pat Marsh"
ENGINE = WriteContext(actor="engine", trust="trusted", op="test.notes")


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()


def message(subject: str) -> str:
    return (
        f"From: {STRANGER} <pat.marsh@example.com>\nTo: me@example.com\nSubject: {subject}\n"
        "Date: Tue, 27 Oct 2026 06:42:00 +0000\n\nThanks for the update. See you there."
    )


def keep_message(ws, store, raw: str) -> str:
    ws.sources_dir.mkdir(exist_ok=True)
    digest = hashlib.sha256(raw.encode()).hexdigest()
    (ws.sources_dir / f"{digest}.txt").write_text(raw, encoding="utf-8")
    with store.transaction() as tx:
        return tx.create(
            "source",
            {
                "received_at": datetime.now(UTC).isoformat(),
                "kind": "watched:mailbox",
                "title": "A message",
                "content_hash": digest,
                "trust": "untrusted",
            },
            ENGINE,
        ).id


def keep_note(store, text: str, source: str | None = None) -> str:
    with store.transaction() as tx:
        return tx.create("note", {"text": text, "source": source, "trust": "untrusted"}, ENGINE).id


def flat(raw: str, subject: str) -> str:
    return " ".join(f"New in Your inbox: {subject}\n\n{raw}".split())


def text_of(store, note_id: str) -> str:
    return store.read().get("note", note_id).data["text"]


def test_an_old_note_is_retitled_from_its_message_once_and_a_second_run_changes_nothing(env):
    ws, cfg, store = env
    raw = message("Re: Revised offsite budget")
    note = keep_note(store, flat(raw, "Re: Revised offsite budget"), keep_message(ws, store, raw))
    assert retitle_stored(ws, store, cfg) == 1
    assert text_of(store, note) == f"Revised offsite budget · from {STRANGER}"
    version = store.read().get("note", note).version
    assert retitle_stored(ws, store, cfg) == 0
    assert store.read().get("note", note).version == version


def test_a_note_whose_message_was_not_kept_is_titled_from_the_headers_its_words_repeat(env):
    ws, cfg, store = env
    words = (
        f"New in Your inbox: Venue list From: {STRANGER} <pat.marsh@example.com> Received: Tue, Oct 27, 06:42 Hello."
    )
    note = keep_note(store, words)
    assert retitle_stored(ws, store, cfg) == 1
    assert text_of(store, note) == f"Venue list · from {STRANGER}"


def test_a_note_in_the_assistants_own_words_is_left_as_written(env):
    ws, cfg, store = env
    raw = message("Venue list")
    own = keep_note(store, "Pat confirmed the venue list.", keep_message(ws, store, raw))
    assert retitle_stored(ws, store, cfg) == 0
    assert text_of(store, own) == "Pat confirmed the venue list."


def test_no_note_anywhere_a_person_reads_keeps_a_header_line(env):
    ws, cfg, store = env
    for subject in ("Venue list", "Re: Invoice"):
        raw = message(subject)
        keep_note(store, flat(raw, subject), keep_message(ws, store, raw))
    keep_note(store, "Pat confirmed the venue list.")
    retitle_stored(ws, store, cfg)
    from engine.note_titles import repeats_headers

    assert not [n for n in store.read().list("note") if repeats_headers(n.data["text"])]


def test_starting_the_app_retitles_stored_notes_and_the_notes_list_shows_the_new_titles(env, tmp_path):
    from starlette.testclient import TestClient

    from api.app import create_app

    ws, cfg, store = env
    raw = message("Venue list")
    keep_note(store, flat(raw, "Venue list"), keep_message(ws, store, raw))
    store.close()
    app = create_app(ws, ws.config(env={}), "t", ui_dist=tmp_path / "no-ui")
    with TestClient(app, headers={"Authorization": "Bearer t"}) as client:
        shown = [n["text"] for n in client.get("/api/notes").json()]
    assert shown == [f"Venue list · from {STRANGER}"]

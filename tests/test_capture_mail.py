"""Capture from anywhere through mail (design 6.32, "What arrives", S4): a mail source can be marked as holding the
person's own capture, either everything in a folder or label they move mail to, or mail to an address of theirs such
as an alias. Mail there from one of the person's own addresses is handed in as their own words, like a note they
typed; mail there from anyone else, and any other mail the source reads, stays outside content. Read through the core
mailbox connector against a stand-in server, so nothing reaches a network. Names and addresses are made up here."""

from __future__ import annotations

import imaplib
from datetime import UTC, datetime

import pytest
import yaml

from engine.ai.adapters.stub import set_responder
from engine.capture import CAPTURED
from engine.config import load_config
from engine.storage import Store
from engine.watch import refresh
from engine.workspace import init_workspace
from tests.conftest import DEMO_B

NOW = datetime(2030, 3, 4, 9, 0, tzinfo=UTC)
ME = "pat.example@example.com"
ALIAS = "pat.example+capture@example.com"
OTHER = "other.sender@example.com"
BOX = "mail.example.com"


def raw(key: str, sender: str, to: str, subject: str, body: str, cc: str = "") -> bytes:
    lines = [
        f"Message-ID: <{key}@mail.example.com>",
        f"From: {sender}",
        f"To: {to}",
        *([f"Cc: {cc}"] if cc else []),
        "Date: Mon, 04 Mar 2030 08:30:00 +0000",
        f"Subject: {subject}",
        "Content-Type: text/plain; charset=utf-8",
        "",
        body,
    ]
    return "\r\n".join(lines).encode()


class Server:
    """A stand-in IMAP server with some folders of messages."""

    folders: dict[str, dict[int, bytes]] = {}

    def __init__(self, host, port, ssl_context=None, timeout=None):
        self.folder = ""

    def login(self, user, password):
        pass

    def select(self, folder, readonly=False):
        self.folder = folder.strip('"')
        return ("OK", [b"1"]) if self.folder in Server.folders else ("NO", [b""])

    def response(self, name):
        return name, [b"1"]

    def uid(self, command, *args):
        messages = Server.folders[self.folder]
        if command == "SEARCH":
            return "OK", [b" ".join(str(u).encode() for u in messages)]
        return "OK", [(b"1 (BODY[] {10}", messages[int(args[0])]), b")"]

    def logout(self):
        pass


@pytest.fixture(autouse=True)
def _server(monkeypatch):
    monkeypatch.setattr(imaplib, "IMAP4_SSL", Server)
    monkeypatch.setenv("MAIL_PASSWORD", "app-password")
    Server.folders = {}
    yield
    set_responder(None)


def workspace(tmp_path, **source):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    mailbox = {
        "id": "notes-mail",
        "connector": "mailbox",
        "label": "Notes to myself",
        "first_run": "all",
        "settings": {"host": BOX, "user": ME, "password": "env:MAIL_PASSWORD", "folder": "Capture"},
        **source,
    }
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump({"version": 1, "sources": [mailbox]}))
    cfg = load_config(ws.config_dir, env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "UTC"})
    cfg.workspace.user.accounts.append(ME)
    return ws, cfg, Store(ws.db_path, cfg=cfg)


def inputs_of(store, result):
    return [store.read().get("source", store.read().get("request", r).data["source"]) for r in result.new]


def words_of(ws, source) -> str:
    return (ws.sources_dir / f"{source.data['content_hash']}.txt").read_text()


def test_mail_in_a_capture_folder_from_the_persons_own_address_is_handed_in_as_their_own_words(tmp_path):
    Server.folders = {
        "Capture": {
            1: raw("c1", f"Pat Example <{ME}>", ME, "Renew the parking permit", "Before the end of the month."),
        }
    }
    ws, cfg, store = workspace(tmp_path, capture=True)
    try:
        result = refresh(ws, store, cfg, "notes-mail", NOW)
        (request,) = [store.read().get("request", r) for r in result.new]
        assert (request.data["task"], request.data["origin"]) == ("notes", "pm")
        (source,) = inputs_of(store, result)
        assert source.data["trust"] == "trusted" and source.data["kind"] == "capture:mail"
        assert source.data["author"] == cfg.workspace.user.person
        assert source.data["title"] == "Renew the parking permit"
        # the words, never the headers
        assert words_of(ws, source) == "Renew the parking permit\n\nBefore the end of the month."
        assert "From:" not in words_of(ws, source) and ME not in words_of(ws, source)
        (snapshot,) = store.read().find("snapshot", {"source": "notes-mail"})
        assert snapshot.data["closed_by"] == CAPTURED and snapshot.data["key"] == "<c1@mail.example.com>"
    finally:
        store.close()


def test_mail_in_the_capture_folder_from_anyone_else_stays_untrusted_outside_content(tmp_path):
    Server.folders = {
        "Capture": {
            1: raw("c1", f"Pat Example <{ME}>", ME, "Call the dentist", "Friday morning."),
            2: raw("c2", f"Sender Two <{OTHER}>", ME, "Please send the quotes", "By Friday."),
        }
    }
    ws, cfg, store = workspace(tmp_path, capture=True)
    try:
        result = refresh(ws, store, cfg, "notes-mail", NOW)
        found = {s.data["title"]: s for s in inputs_of(store, result)}
        assert found["Call the dentist"].data["trust"] == "trusted"
        other = found["Please send the quotes"]
        assert other.data["trust"] == "untrusted" and other.data["kind"] == "watched:mailbox"
        assert sorted(store.read().get("request", r).data["origin"] for r in result.new) == ["input", "pm"]
        # and only the person's own is closed off as capture
        marks = {s.data["key"]: s.data["closed_by"] for s in store.read().find("snapshot", {"source": "notes-mail"})}
        assert marks == {"<c1@mail.example.com>": CAPTURED, "<c2@mail.example.com>": None}
    finally:
        store.close()


def test_mail_to_the_capture_address_from_the_persons_own_address_is_their_capture_and_other_mail_is_not(tmp_path):
    Server.folders = {
        "Capture": {
            1: raw("a1", ME, f"Pat Example <{ALIAS}>", "Book the van", "For the move on the 12th."),
            2: raw("a2", ME, OTHER, "Draft for someone", "Here is the draft."),
            3: raw("a3", OTHER, ALIAS, "Hello from the sender", "Writing to your capture address."),
            4: raw("a4", f"Pat Example <{ME.upper()}>", OTHER, "Cc'd capture", "Copied.", cc=ALIAS.upper()),
        }
    }
    ws, cfg, store = workspace(tmp_path, capture_address=ALIAS)
    try:
        result = refresh(ws, store, cfg, "notes-mail", NOW)
        found = {s.data["title"]: s.data for s in inputs_of(store, result)}
        assert found["Book the van"]["trust"] == "trusted" and found["Book the van"]["kind"] == "capture:mail"
        assert found["Cc'd capture"]["kind"] == "capture:mail"  # a copy to the alias counts, in any case
        assert (
            found["Draft for someone"]["trust"] == "untrusted"
        )  # the person's own mail to someone else is ordinary mail
        assert (
            found["Hello from the sender"]["trust"] == "untrusted"
        )  # anyone else's mail to the alias is outside content
    finally:
        store.close()


def test_a_source_not_marked_as_capture_reads_the_persons_own_mail_as_ordinary_mail(tmp_path):
    Server.folders = {"Capture": {1: raw("n1", ME, ME, "A note to myself", "Nothing special.")}}
    ws, cfg, store = workspace(tmp_path)
    try:
        result = refresh(ws, store, cfg, "notes-mail", NOW)
        (source,) = inputs_of(store, result)
        assert source.data["kind"] == "watched:mailbox" and source.data["trust"] == "untrusted"
    finally:
        store.close()


def test_a_captured_mail_is_taken_in_once_and_the_ordinary_mail_beside_it_is_read_as_usual(tmp_path):
    Server.folders = {"Capture": {1: raw("c1", ME, ME, "Order the filters", "Two of them.")}}
    ws, cfg, store = workspace(tmp_path, capture=True)
    try:
        assert len(refresh(ws, store, cfg, "notes-mail", NOW).new) == 1
        again = refresh(ws, store, cfg, "notes-mail", NOW)
        assert again.new == [] and again.changed == []
        Server.folders["Capture"][2] = raw("c2", OTHER, ME, "Quotes", "Attached.")
        later = refresh(ws, store, cfg, "notes-mail", NOW)
        assert len(later.new) == 1 and store.read().get("request", later.new[0]).data["origin"] == "input"
    finally:
        store.close()


def test_the_first_read_of_a_source_taken_in_quietly_still_hands_the_persons_capture_in_at_once(tmp_path):
    Server.folders = {
        "Capture": {
            1: raw("c1", ME, ME, "Water the plants", "Every Tuesday."),
            2: raw("c2", OTHER, ME, "An old thread", "Some time ago."),
        }
    }
    ws, cfg, store = workspace(tmp_path, capture=True, first_run="intake")
    try:
        result = refresh(ws, store, cfg, "notes-mail", NOW)
        # the capture went in as their own words and was not held; the other mail was taken in for a look
        mine = [r for r in result.new if store.read().get("request", r).data["origin"] == "pm"]
        assert len(mine) == 1
        held = [r for r in result.taken_in if store.read().get("request", r).data.get("intake")]
        assert held and mine[0] not in held
        sources = {
            store.read().get("source", store.read().get("request", r).data["source"]).data["title"] for r in held
        }
        assert sources == {"An old thread"}
    finally:
        store.close()


def test_the_setting_is_checked_with_the_source_and_both_keys_have_descriptions_and_defaults():
    from engine.config.schema import WatchSource

    fields = WatchSource.model_fields
    for name in ("capture", "capture_address"):
        assert fields[name].description and not fields[name].is_required()
    assert fields["capture"].default is False and fields["capture_address"].default is None

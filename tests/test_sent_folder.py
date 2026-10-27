"""A mailbox's sent folder is offered as a second source (design 6.33): the folders come from the server's own list, the
one it marks as sent is the suggestion, and adding it is a new source of the same mailbox with the person as its author,
taken in quietly like any new source. Nothing here reaches a network: the server is a stand-in."""

import imaplib

import pytest

from engine.config import load_config
from engine.config.yaml_edit import remove_key, set_key
from engine.connectors import ConnectorContext, ConnectorError
from engine.connectors.mailbox import MailboxSettings, find_sent, list_folders, parse_folders, read_mailbox
from tests.test_calendar_mail import N
from tests.test_setup import client, make
from tests.test_typed_secrets import sources

LISTING = [
    b'(\\HasNoChildren) "/" "INBOX"',
    b'(\\HasNoChildren \\Sent) "/" "Sent Items"',
    b'(\\HasNoChildren \\Drafts) "/" Drafts',
    b'(\\Noselect \\HasChildren) "/" "[Archive]"',
    b'(\\HasNoChildren) "/" "Team \\"A\\""',
    b"garbage",
]


def stand_in(monkeypatch, listing=LISTING, *, refuse: bytes | None = None):
    class Server:
        def __init__(self, host, port, ssl_context=None, timeout=None):
            pass

        def login(self, user, password):
            if refuse:
                raise imaplib.IMAP4.error(refuse)

        def list(self):
            return "OK", list(listing)

        def logout(self):
            pass

    monkeypatch.setattr(imaplib, "IMAP4_SSL", Server)
    monkeypatch.setenv("MAIL_PASSWORD", "unused")


def test_the_servers_list_gives_the_selectable_folders_and_the_one_it_marks_as_sent():
    found = parse_folders(LISTING)
    assert found.names == ("INBOX", "Sent Items", "Drafts", 'Team "A"')  # not the unselectable one, not the garbage
    assert found.sent == "Sent Items"
    assert parse_folders([b'(\\HasNoChildren) "/" "Sent"']).sent is None  # no mark, so the person picks


def test_listing_the_folders_changes_nothing_and_a_refusal_is_the_usual_one(monkeypatch):
    settings = MailboxSettings(host=N["mail_host"], user=N["mail_user"], password="env:MAIL_PASSWORD")
    stand_in(monkeypatch)
    assert list_folders(settings).sent == "Sent Items"
    stand_in(monkeypatch, refuse=b"[AUTHENTICATIONFAILED] no")
    with pytest.raises(ConnectorError) as refused:
        list_folders(settings)
    assert refused.value.kind == "auth"
    with pytest.raises(ConnectorError) as same:
        read_mailbox(settings, {}, ConnectorContext(None))
    assert same.value.kind == "auth"  # reading goes through the same sign-in as listing


def add_mailbox(c, api, monkeypatch):
    """Connect the mailbox while the server lists only the inbox, so nothing reads its sent folder yet, then let the
    server list every folder again."""
    stand_in(monkeypatch, [LISTING[0]])
    fingerprint = c.get(f"{api}/settings").json()["fingerprint"]
    added = c.post(
        f"{api}/watch/sources",
        json={
            "connector": "mailbox",
            "label": "Work mail",
            "settings": {"host": N["mail_host"], "user": N["mail_user"], "password": "env:MAIL_PASSWORD"},
            "fingerprint": fingerprint,
        },
    )
    assert added.status_code == 200, added.text
    stand_in(monkeypatch)
    return added.json()["fingerprint"]


def test_a_mailbox_source_offers_its_folders_with_the_sent_one_marked_and_what_is_already_read(tmp_path, monkeypatch):
    stand_in(monkeypatch)
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    add_mailbox(c, api, monkeypatch)
    got = c.get(f"{api}/watch/work-mail/folders")
    assert got.status_code == 200, got.text
    assert got.json() == {
        "folders": ["INBOX", "Sent Items", "Drafts", 'Team "A"'],
        "sent": "Sent Items",
        "taken": ["INBOX"],
        "listed": True,
    }
    assert c.get(f"{api}/watch/nope/folders").status_code == 404
    assert c.get(f"{api}/watch/{sources(ws)[0].id}/folders").status_code in (
        200,
        409,
    )  # a demo source may not be a mailbox


def test_adding_the_sent_folder_makes_a_source_of_the_same_mailbox_credited_to_the_person(tmp_path, monkeypatch):
    stand_in(monkeypatch)
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    fingerprint = add_mailbox(c, api, monkeypatch)
    added = c.post(
        f"{api}/watch/work-mail/sent-folder",
        json={"folder": "Sent Items", "label": "Work mail, sent", "fingerprint": fingerprint},
    )
    assert added.status_code == 200, added.text
    mine = next(s for s in sources(ws) if s.label == "Work mail, sent")
    assert mine.connector == "mailbox" and mine.settings["folder"] == "Sent Items"
    assert (mine.settings["host"], mine.settings["user"]) == (N["mail_host"], N["mail_user"])
    assert mine.settings["password"] == "env:MAIL_PASSWORD" and mine.author == cfg.workspace.user.person
    # Once it is read, the offer is over: that folder is taken.
    assert "Sent Items" in c.get(f"{api}/watch/work-mail/folders").json()["taken"]
    again = c.post(
        f"{api}/watch/work-mail/sent-folder",
        json={"folder": "Sent Items", "label": "Again", "fingerprint": added.json()["fingerprint"]},
    )
    assert again.status_code == 400


def test_a_folder_the_server_doesnt_list_is_refused(tmp_path, monkeypatch):
    stand_in(monkeypatch)
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    fingerprint = add_mailbox(c, api, monkeypatch)
    refused = c.post(
        f"{api}/watch/work-mail/sent-folder", json={"folder": "Nowhere", "label": "x", "fingerprint": fingerprint}
    )
    assert refused.status_code == 400 and not any(s.label == "x" for s in sources(ws))


def test_the_sent_folder_is_taken_by_the_servers_own_marking_when_none_is_named(tmp_path, monkeypatch):
    stand_in(monkeypatch)
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    fingerprint = add_mailbox(c, api, monkeypatch)
    added = c.post(f"{api}/watch/work-mail/sent-folder", json={"fingerprint": fingerprint})
    assert added.status_code == 200, added.text
    mine = next(s for s in sources(ws) if s.settings.get("folder") == "Sent Items")
    assert mine.author == cfg.workspace.user.person and "Sent Items" in mine.label
    again = c.post(f"{api}/watch/work-mail/sent-folder", json={"fingerprint": added.json()["fingerprint"]})
    assert again.status_code == 400  # read already: nothing is added twice


# ---- connecting a mailbox reads its sent folder too, with no folder to choose ---------------------------------------


def connect(c, api):
    """Connect the mailbox the way the walkthrough does: one source, the inbox, with no author and no folder chosen."""
    fingerprint = c.get(f"{api}/settings").json()["fingerprint"]
    added = c.post(
        f"{api}/watch/sources",
        json={
            "connector": "mailbox",
            "label": "Work mail",
            "settings": {"host": N["mail_host"], "user": N["mail_user"], "password": "env:MAIL_PASSWORD"},
            "fingerprint": fingerprint,
        },
    )
    assert added.status_code == 200, added.text
    return added


def read_here(ws):
    """The folders read by the sources that connecting made (the fixture workspace has mailboxes of its own)."""
    return [s.settings.get("folder") for s in sources(ws) if s.id.startswith("work-mail")]


def test_find_sent_takes_the_servers_mark_first_then_the_configured_names_in_order_ignoring_capitals():
    names = ["Sent", "Sent Items"]
    assert find_sent(parse_folders(LISTING), names) == "Sent Items"  # marked: the mark wins over the list
    plain = parse_folders([b'(\\HasNoChildren) "/" "INBOX"', b'(\\HasNoChildren) "/" "sent items"', b'() "/" "SENT"'])
    assert find_sent(plain, names) == "SENT"  # the first name in the list that the mailbox has
    assert find_sent(plain, ["Sent Items", "Sent"]) == "sent items"
    assert find_sent(parse_folders([b'(\\HasNoChildren) "/" "INBOX"']), names) is None
    assert find_sent(plain, []) is None


def test_connecting_a_mailbox_reads_the_folder_the_server_marks_as_sent_as_the_persons_own_mail(tmp_path, monkeypatch):
    stand_in(monkeypatch)
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    connect(c, api)
    mine = sources(ws)
    inbox = next(s for s in mine if s.label == "Work mail")
    sent = next(s for s in mine if s.settings.get("folder") == "Sent Items")
    assert inbox.author is None and inbox.settings.get("folder") is None  # the inbox: nothing chosen
    assert sent.connector == "mailbox" and sent.author == cfg.workspace.user.person
    assert (sent.settings["host"], sent.settings["user"]) == (N["mail_host"], N["mail_user"])
    assert sent.first_run == "intake" and sent.id != inbox.id
    # Nothing is left to offer: the sent folder is read already.
    assert "Sent Items" in c.get(f"{api}/watch/work-mail/folders").json()["taken"]


def test_a_server_that_marks_no_sent_folder_is_searched_by_the_configured_names(tmp_path, monkeypatch):
    stand_in(monkeypatch, [b'(\\HasNoChildren) "/" "INBOX"', b'(\\HasNoChildren) "/" "sent mail"'])
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    connect(c, api)
    assert read_here(ws) == [None, "sent mail"]
    # A workspace that names its own folder names finds a folder those names say.
    stand_in(monkeypatch, [b'(\\HasNoChildren) "/" "INBOX"', b'(\\HasNoChildren) "/" "Gesendet"'])
    ws, cfg, store = make(tmp_path / "other")
    set_names = ws.config_dir / "watch.yaml"
    set_names.write_text(
        set_key(set_names.read_text(encoding="utf-8"), ["sent_folder_names"], ["Gesendet"]), encoding="utf-8"
    )
    c, api = client(ws, load_config(ws.config_dir, env={}), store)
    connect(c, api)
    assert read_here(ws) == [None, "Gesendet"]


def test_a_mailbox_with_no_sent_folder_unreachable_or_with_no_person_is_connected_with_the_inbox_alone(
    tmp_path, monkeypatch
):
    stand_in(monkeypatch, [b'(\\HasNoChildren) "/" "INBOX"', b'(\\HasNoChildren) "/" "Elsewhere"'])
    ws, cfg, store = make(tmp_path / "none")
    c, api = client(ws, cfg, store)
    connect(c, api)
    assert read_here(ws) == [None]  # none found: nothing guessed

    stand_in(monkeypatch, refuse=b"[AUTHENTICATIONFAILED] no")
    ws, cfg, store = make(tmp_path / "refused")
    c, api = client(ws, cfg, store)
    connect(c, api)
    assert read_here(ws) == [None]  # the server can't be asked now: connecting still works

    stand_in(monkeypatch)
    ws, cfg, store = make(tmp_path / "nobody")
    path = ws.config_dir / "workspace.yaml"
    path.write_text(remove_key(path.read_text(encoding="utf-8"), ["user", "person"]), encoding="utf-8")
    c, api = client(ws, load_config(ws.config_dir, env={}), store)
    connect(c, api)
    assert read_here(ws) == [None]  # their sent mail can't be credited to anyone yet


def test_connecting_a_mailbox_is_one_save_so_one_undo_takes_both_sources_back(tmp_path, monkeypatch):
    stand_in(monkeypatch)
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    saved = connect(c, api).json()
    assert [ch["key"] for ch in saved["changes"]] == ["watch.sources"]
    assert read_here(ws) == [None, "Sent Items"]


def test_a_mailbox_already_read_doesnt_get_a_sent_folder_back_when_another_folder_is_added(tmp_path, monkeypatch):
    stand_in(monkeypatch)
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    added = connect(c, api).json()
    sent_id = next(s.id for s in sources(ws) if s.settings.get("folder") == "Sent Items")
    removed = c.post(
        f"{api}/watch/sources/{sent_id}/remove", json={"fingerprint": added["fingerprint"]}
    )  # the person took the sent folder out
    assert removed.status_code == 200, removed.text
    more = c.post(
        f"{api}/watch/sources",
        json={
            "connector": "mailbox",
            "label": "Work mail, projects",
            "settings": {
                "host": N["mail_host"],
                "user": N["mail_user"],
                "password": "env:MAIL_PASSWORD",
                "folder": "Drafts",
            },
            "fingerprint": removed.json()["fingerprint"],
        },
    )
    assert more.status_code == 200, more.text
    assert read_here(ws) == [None, "Drafts"]  # nothing brought the sent folder back

"""A mailbox, calendar link or file, feed or folder is read once before it is added (sweep X08): one that can't be read
is refused in plain words beside the setting it is about, decided from the kind of the error, and nothing is saved or
kept. The words are the screen's own wording sheet."""

import json
from pathlib import Path
from types import SimpleNamespace

import pytest
import yaml

from engine import source_trial
from engine.config import load_config
from engine.connectors import ConnectorError
from tests.test_calendar_mail import N
from tests.test_setup import client, make

WORDS = json.loads((Path(__file__).parents[1] / "web" / "src" / "wording" / "en.json").read_text("utf-8"))
ADVICE = yaml.safe_load((Path(__file__).parents[1] / "engine" / "defaults" / "source_advice.yaml").read_text("utf-8"))
KEYS = [k for k in ADVICE if k.startswith(("sources.refuse.", "sources.name."))]
PASSWORD = "typed-" + "secret-value-1"
#: Made-up addresses are built from this, so no address is written out whole.
WEB = "https" + "://"
MAIL, USER, CALENDAR, NEWS = N["mail_host"], N["mail_user"], N["calendar_host"], N["news_host"]
#: What no refusal may show: the operating system's words, a file's path or the word "errno".
RAW = ("Errno", "Traceback", "[", "no internet connection")


def add(c, api, connector, settings, **more):
    fingerprint = c.get(f"{api}/settings").json()["fingerprint"]
    return c.post(
        f"{api}/watch/sources",
        json={"connector": connector, "label": "Trial", "settings": settings, "fingerprint": fingerprint, **more},
    )


def saved(ws):
    return [s.id for s in load_config(ws.config_dir, env={}).watch.sources]


@pytest.fixture
def app(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    return ws, c, api, saved(ws)


def refused(response, key, **values):
    assert response.status_code == 400, response.text
    assert response.json()["detail"] == ADVICE[key].format(**values)
    assert not any(bad in response.json()["detail"] for bad in RAW)


def test_every_reason_is_in_both_sheets():
    for key in KEYS:
        assert WORDS[key] == ADVICE[key], key


def test_a_server_name_that_isnt_one_is_refused_beside_the_server_field(app):
    ws, c, api, before = app
    got = add(c, api, "mailbox", {"host": "zzz nonsense ???", "user": USER, "password": "env:X"})
    refused(got, "sources.refuse.not_a_server")
    assert got.headers["X-Cockpit-Field"] == "host" and saved(ws) == before


@pytest.mark.parametrize(
    ("kind", "key", "field"),
    [
        ("offline", "sources.refuse.unreachable", "host"),
        ("auth", "sources.refuse.mailbox_auth", "user"),
        ("no_access", "sources.refuse.mailbox_no_access", None),
        ("outage", "sources.refuse.not_answering", None),
        ("throttled", "sources.refuse.asked_to_wait", None),
    ],
)
def test_a_mailbox_that_cant_be_signed_in_to_says_why_by_the_kind_of_the_error(app, monkeypatch, kind, key, field):
    ws, c, api, before = app

    def fail(_settings):
        raise ConnectorError(kind, "[Errno -2] Name or service not known")

    monkeypatch.setattr(source_trial, "mailbox_folders", fail)
    got = add(c, api, "mailbox", {"host": MAIL, "user": USER}, secrets={"password": PASSWORD})
    refused(got, key, where=MAIL)
    assert got.headers.get("X-Cockpit-Field") == field
    # Nothing is saved, and the password typed for it is not kept.
    assert saved(ws) == before and not list((ws.private_dir / "keys").glob("*"))


def test_a_folder_the_mailbox_doesnt_have_is_refused_beside_the_folder_field(app, monkeypatch):
    ws, c, api, before = app
    monkeypatch.setattr(source_trial, "mailbox_folders", lambda _s: SimpleNamespace(names=("INBOX", "Sent"), sent=None))
    settings = {"host": MAIL, "user": USER, "password": "env:X", "folder": "Nope"}
    got = add(c, api, "mailbox", settings)
    refused(got, "sources.refuse.no_such_folder", folder="Nope")
    assert got.headers["X-Cockpit-Field"] == "folder" and saved(ws) == before
    assert add(c, api, "mailbox", {**settings, "folder": "sent"}).status_code == 200  # capitals don't matter


def test_a_calendar_link_that_isnt_a_web_address_is_refused_before_anything_is_reached(app):
    ws, c, api, before = app
    got = add(c, api, "calendar", {}, secrets={"address": "my calendar"})
    refused(got, "sources.refuse.not_a_link")
    assert got.headers["X-Cockpit-Field"] == "address" and saved(ws) == before


@pytest.mark.parametrize(
    ("kind", "key"),
    [
        ("not_found", "sources.refuse.link_nothing_there"),
        ("auth", "sources.refuse.link_refused"),
        ("no_access", "sources.refuse.link_refused"),
        ("outage", "sources.refuse.link_unexpected"),
        ("offline", "sources.refuse.unreachable"),
        ("throttled", "sources.refuse.asked_to_wait"),
    ],
)
def test_a_calendar_link_that_cant_be_read_says_why_without_showing_the_link(app, monkeypatch, kind, key):
    from engine.net import WebClient

    ws, c, api, before = app

    def fail(self, method, url, **kwargs):
        raise ConnectorError(kind, "couldn't connect: [Errno 111] Connection refused")

    monkeypatch.setattr(WebClient, "request", fail)
    got = add(c, api, "calendar", {}, secrets={"address": f"{WEB}{CALENDAR}/private/abc123/basic.ics"})
    refused(got, key, where=CALENDAR)
    assert "abc123" not in got.text and saved(ws) == before


def test_a_calendar_file_and_a_folder_that_arent_there_are_refused_with_their_place(app, tmp_path):
    ws, c, api, before = app
    missing = tmp_path / "nothing-here.ics"
    refused(add(c, api, "calendar", {"file": str(missing)}), "sources.refuse.file_missing", where=str(missing))
    folder = tmp_path / "no-such-folder"
    got = add(c, api, "folder", {"path": str(folder)})
    refused(got, "sources.refuse.folder_missing", where=str(folder))
    assert got.headers["X-Cockpit-Field"] == "path" and saved(ws) == before


def test_a_file_that_is_no_calendar_is_refused_and_a_real_one_is_added(app, tmp_path):
    ws, c, api, before = app
    notes = tmp_path / "notes.ics"
    notes.write_text("just words")
    refused(add(c, api, "calendar", {"file": str(notes)}), "sources.refuse.file_unusable")
    good = tmp_path / "good.ics"
    good.write_text("BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR\n")
    assert add(c, api, "calendar", {"file": str(good)}).status_code == 200
    folder = tmp_path / "docs"
    folder.mkdir()
    assert add(c, api, "folder", {"path": str(folder)}, label="Docs").status_code == 200


def test_a_change_to_a_sources_server_is_tried_too(app):
    ws, c, api, _ = app
    ok = add(c, api, "mailbox", {"host": MAIL, "user": USER, "password": "env:X"})
    assert ok.status_code == 200, ok.text
    source = next(s for s in saved(ws) if s.startswith("trial"))
    fingerprint = c.get(f"{api}/settings").json()["fingerprint"]
    got = c.post(
        f"{api}/watch/sources/{source}",
        json={
            "settings": {"host": "no server", "user": USER, "password": "env:X"},
            "fingerprint": fingerprint,
        },
    )
    refused(got, "sources.refuse.not_a_server")


def test_a_missing_value_and_a_rule_of_the_kind_are_said_in_plain_words_beside_their_field(app):
    ws, c, api, before = app
    empty = add(c, api, "mailbox", {"host": MAIL, "user": USER})
    refused(empty, "sources.refuse.fill_in")
    assert empty.headers["X-Cockpit-Field"] == "password"
    both = add(c, api, "calendar", {})
    assert both.status_code == 400 and both.json()["detail"].startswith("Give the calendar's link")
    assert "settings:" not in both.json()["detail"] and "Value error" not in both.json()["detail"]
    assert saved(ws) == before


def test_a_source_with_no_name_is_named_after_what_it_reads_never_after_its_kind_or_a_link(app, tmp_path):
    ws, c, api, _ = app
    fingerprint = lambda: c.get(f"{api}/settings").json()["fingerprint"]  # noqa: E731

    def added(connector, settings, **more):
        got = c.post(
            f"{api}/watch/sources",
            json={"connector": connector, "settings": settings, "fingerprint": fingerprint(), **more},
        )
        assert got.status_code == 200, got.text
        return got.json()["changes"][0]["after"][-1]["label"]

    assert added("mailbox", {"host": MAIL, "user": USER, "password": "env:X"}) == USER
    folder = tmp_path / "Meeting notes"
    folder.mkdir()
    assert added("folder", {"path": str(folder)}) == "Meeting notes"
    assert added("feed", {"url": f"{WEB}{NEWS}/private/abc123/feed.xml"}) == NEWS
    link = added("calendar", {}, secrets={"address": f"{WEB}{CALENDAR}/private/abc123/basic.ics"})
    assert link == f"Calendar at {CALENDAR}" and "abc123" not in link

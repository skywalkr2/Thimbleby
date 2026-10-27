"""Mail services offered by name (design 6.33, "Guided mailbox step"): the common services are a shipped list, a
workspace adds or replaces entries by id, a mailbox added with a service gets its server filled in and tries its sign-
in before anything is saved, the password is only ever kept as a private file, and no service is named in the core's
code or wording. Nothing here reaches a network: the mail server is a stand-in."""

import imaplib
import json
from pathlib import Path

import pytest
import yaml

from engine import mail_services
from engine.config import load_config
from engine.setup import secret_name
from tests.test_calendar_mail import N
from tests.test_sent_folder import LISTING
from tests.test_setup import client, make
from tests.test_typed_secrets import TYPED, everywhere_but_the_keys, sources

REPO = Path(mail_services.__file__).resolve().parents[1]
WORDS = json.loads((REPO / "web" / "src" / "wording" / "en.json").read_text(encoding="utf-8"))
ADVICE = yaml.safe_load((REPO / "engine" / "defaults" / "source_advice.yaml").read_text("utf-8"))


def stand_in(monkeypatch, *, refuse: bytes | None = None):
    """A mail server that records where it was asked to sign in, and lists its folders."""
    seen: list[tuple[str, int]] = []

    class Server:
        def __init__(self, host, port, ssl_context=None, timeout=None):
            seen.append((host, port))

        def login(self, user, password):
            if refuse:
                raise imaplib.IMAP4.error(refuse)

        def list(self):
            return "OK", list(LISTING)

        def logout(self):
            pass

    monkeypatch.setattr(imaplib, "IMAP4_SSL", Server)
    return seen


def test_the_shipped_list_loads_and_each_entry_is_complete():
    listed = mail_services.shipped()
    ids = [s.id for s in listed]
    assert len(listed) >= 1 and len(set(ids)) == len(ids)
    for s in listed:
        assert s.name.strip() and s.imap_host.strip() and 1 <= s.imap_port <= 65535, s.id
        assert len(s.app_password_steps) >= 3 and all(line.strip() for line in s.app_password_steps), s.id
        assert s.app_password_page and "://" not in s.app_password_page, s.id
        assert all(line.strip() for line in s.calendar_steps), s.id


def test_a_workspace_adds_its_own_service_after_the_shipped_ones_and_one_with_a_shipped_id_replaces_it(tmp_path):
    ws, _, _ = make(tmp_path)
    first = mail_services.shipped()[0]
    extra = [
        {"id": "ours", "name": "Our own mail", "imap_host": "mail.example.com", "app_password_steps": ["Make one."]},
        {"id": first.id, "name": "Renamed", "imap_host": "imap.example.com", "imap_port": 1993},
    ]
    cfg = load_config(ws.config_dir, env={"COCKPIT__WATCH__MAIL_SERVICES_EXTRA": json.dumps(extra)})
    offered = mail_services.offered(cfg)
    assert [s.id for s in offered][-1] == "ours"
    assert len([s for s in offered if s.id == first.id]) == 1
    replaced = mail_services.find(cfg, first.id)
    assert (replaced.name, replaced.imap_host, replaced.imap_port) == ("Renamed", "imap.example.com", 1993)
    assert len(offered) == len(mail_services.shipped()) + 1


def test_a_service_of_the_workspace_names_its_page_without_a_scheme(tmp_path):
    ws, _, _ = make(tmp_path)
    scheme = "http" + ":" + "//"
    bad = [{"id": "x", "name": "X", "imap_host": "mail.example.com", "app_password_page": scheme + "example.com"}]
    with pytest.raises(Exception, match="without its https"):
        load_config(ws.config_dir, env={"COCKPIT__WATCH__MAIL_SERVICES_EXTRA": json.dumps(bad)})


def test_the_core_names_no_mail_service_in_its_code_or_wording():
    names = {s.name.lower() for s in mail_services.shipped()} | {s.id.lower() for s in mail_services.shipped()}
    allowed = {REPO / "web" / "src" / "api" / "openapi.json"}
    found = []
    for root, suffixes in (("engine", {".py"}), ("api", {".py"}), ("web/src", {".ts", ".tsx", ".json", ".css"})):
        for path in (REPO / root).rglob("*"):
            if not path.is_file() or path.suffix not in suffixes or path in allowed or "node_modules" in path.parts:
                continue
            if path.name.endswith((".test.ts", ".test.tsx")) or "adapters" in path.parts:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore").lower()
            found += [f"{path.relative_to(REPO)}: {n}" for n in names if len(n) > 3 and n in text]
    assert found == []


def test_the_screen_is_offered_the_services_with_their_steps(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    got = c.get(f"{api}/watch/mail-services")
    assert got.status_code == 200
    first = mail_services.shipped()[0]
    view = next(s for s in got.json() if s["id"] == first.id)
    assert view["name"] == first.name and view["app_password_steps"] == first.app_password_steps
    assert view["app_password_page"] == first.page_url and view["app_password_page"].startswith("https:")
    assert view["calendar_steps"] == first.calendar_steps
    assert "imap_host" not in view  # the server's details are filled in on the server, not shown


def add(c, api, body):
    fingerprint = c.get(f"{api}/settings").json()["fingerprint"]
    return c.post(f"{api}/watch/sources", json={"connector": "mailbox", "fingerprint": fingerprint, **body})


def test_a_mailbox_added_with_a_service_gets_its_server_filled_in_and_its_password_kept_privately(
    tmp_path, monkeypatch
):
    seen = stand_in(monkeypatch)
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    service = next(s for s in mail_services.shipped() if s.sent_folder)
    added = add(
        c,
        api,
        {
            "service": service.id,
            "label": N["mail_user"],
            "settings": {"user": N["mail_user"]},
            "secrets": {"password": TYPED},
        },
    )
    assert added.status_code == 200, added.text
    assert TYPED not in added.text
    assert (service.imap_host, service.imap_port) in seen  # the sign-in was tried against the service's server
    source = next(s for s in sources(ws) if s.label == N["mail_user"])
    assert source.settings["host"] == service.imap_host and source.settings["user"] == N["mail_user"]
    assert source.settings.get("port", 993) == service.imap_port
    assert source.settings["sent_folder"] == service.sent_folder
    kept = ws.private_dir / "keys" / secret_name("source", source.id, "password")
    assert kept.read_text().strip() == TYPED
    assert source.settings["password"] == f"file:{kept.resolve()}"
    assert everywhere_but_the_keys(ws, TYPED) == []
    assert TYPED not in c.get(f"{api}/settings").text


def test_a_refused_sign_in_through_a_service_saves_nothing_and_names_the_services_steps(tmp_path, monkeypatch):
    stand_in(monkeypatch, refuse=b"[ALERT] Application-specific password required")
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    service = mail_services.shipped()[0]
    before = len(sources(ws))
    refused = add(
        c,
        api,
        {
            "service": service.id,
            "label": N["mail_user"],
            "settings": {"user": N["mail_user"]},
            "secrets": {"password": TYPED},
        },
    )
    assert refused.status_code == 400
    detail = refused.json()["detail"]
    assert service.name in detail and "app password" in detail and "above" in detail  # points at the steps shown
    assert TYPED not in refused.text
    assert len(sources(ws)) == before
    keys = ws.private_dir / "keys"
    assert not keys.exists() or list(keys.iterdir()) == []  # the password kept for the attempt is removed again


def test_a_service_cannot_be_unknown_or_given_with_a_server_or_for_another_kind_of_source(tmp_path, monkeypatch):
    stand_in(monkeypatch)
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    known = mail_services.shipped()[0].id
    assert add(c, api, {"service": "no-such-service", "settings": {"user": "a"}}).status_code == 404
    both = add(c, api, {"service": known, "settings": {"user": "a", "host": N["mail_host"]}})
    assert both.status_code == 400 and "not both" in both.json()["detail"]
    other = c.post(
        f"{api}/watch/sources",
        json={
            "connector": "calendar",
            "service": known,
            "fingerprint": c.get(f"{api}/settings").json()["fingerprint"],
        },
    )
    assert other.status_code == 400


def test_the_sentences_the_server_writes_are_the_same_in_the_wording_sheet():
    for key in ("sources.advice.service_app_password", "sources.guide.failed"):
        assert WORDS[key] == ADVICE[key], key


def test_another_mailbox_still_takes_a_server_typed_by_hand(tmp_path, monkeypatch):
    seen = stand_in(monkeypatch)
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    added = add(
        c,
        api,
        {
            "label": "Work mail",
            "settings": {"host": N["mail_host"], "port": 1143, "user": N["mail_user"]},
            "secrets": {"password": TYPED},
        },
    )
    assert added.status_code == 200, added.text
    source = next(s for s in sources(ws) if s.label == "Work mail")
    assert (source.settings["host"], source.settings["port"]) == (N["mail_host"], 1143)
    assert seen == [] or all(host == N["mail_host"] for host, _ in seen)


def test_the_plain_mailbox_is_named_as_the_persons_mailbox_not_a_folder():
    from engine.connectors import CORE

    label = CORE["mailbox"].label.lower()
    assert "mailbox" in label and "folder" not in label

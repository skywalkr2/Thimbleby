"""Trying a source before it is added (design 7.8, 7.11): a mailbox, a calendar link or file, a feed or a folder is read
once, in the way its connector reads it, so a source that can't be read is refused in plain words and nothing is saved,
rather than added and failing later with the wrong reason.

The reason is decided from the kind of the connector's error (never from its message text) and from what the source is
(a mailbox, an address, a file or a folder). Each reason is one sentence of the advice sheet
(`engine/defaults/source_advice.yaml`, the same sentences as the screen's wording sheet) and names the setting it is
about, so the screen can put it beside that field. A service that is down, or one whose sign-in the person has to renew,
is never a refusal for a connector an add-on provides: those are signed in as the person and say so when they are read.
Reading changes nothing.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from engine import watch
from engine.connectors import ConnectorError
from engine.secrets import SecretError, resolve_secret

#: A mail server's name: letters, digits, dots and hyphens, with no spaces.
_HOST = re.compile(r"[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?")


@dataclass(frozen=True)
class Refusal:
    """Why a source is refused: the setting it is about (none when it is about the source as a whole) and the
    sentence, in the advice sheet's words."""

    field: str | None
    text: str


def _say(key: str, field: str | None, **values: str) -> Refusal:
    return Refusal(field, watch.advice_sentence(key).format(**values))


def mailbox_folders(settings: Any) -> Any:
    """The folders of a mailbox, which tries its sign-in. The one place a trial reaches a mail server, so a test
    stands in for it here."""
    from engine.connectors.mailbox import list_folders

    return list_folders(settings)


def _from_error(shape: str, err: ConnectorError, where: str, field: str) -> Refusal:
    """The refusal for what a read said, by the kind of the error and what is being read (`shape`: mailbox, link, file
    or folder)."""
    kind = err.kind
    if kind == "offline":
        return _say("sources.refuse.unreachable", "host" if shape == "mailbox" else field, where=where)
    if kind == "throttled":
        return _say("sources.refuse.asked_to_wait", None, where=where)
    if shape == "mailbox":
        key = {
            "auth": "sources.refuse.mailbox_auth",
            "no_access": "sources.refuse.mailbox_no_access",
        }.get(kind, "sources.refuse.not_answering")
        return _say(key, "user" if kind == "auth" else None, where=where)
    if shape == "link":
        key = {
            "not_found": "sources.refuse.link_nothing_there",
            "auth": "sources.refuse.link_refused",
            "no_access": "sources.refuse.link_refused",
        }.get(kind, "sources.refuse.link_unexpected")
        return _say(key, field, where=where)
    if shape == "file":
        return _say(
            "sources.refuse.file_missing" if kind == "not_found" else "sources.refuse.file_unusable", field, where=where
        )
    return _say(
        "sources.refuse.folder_missing" if kind == "not_found" else "sources.refuse.folder_unusable", field, where=where
    )


def plain_reason(err: ConnectorError, where: str) -> str:
    """What a mail server's refusal or silence is, said in the sheet's words, for a screen that reaches the server
    after the source exists (its folder list)."""
    return _from_error("mailbox", err, where, "host").text


def _host_of(address: str) -> str:
    return (urlsplit(re.sub(r"^webcal://", "https://", address.strip(), flags=re.I)).hostname or "").lower()


def _address(ref: str) -> str:
    """A link as it is once its secret reference is read; empty when the reference can't be read (the read says why)."""
    try:
        return (resolve_secret(ref) or "").strip()
    except SecretError:
        return ""


def _is_web(address: str) -> bool:
    parts = urlsplit(re.sub(r"^webcal://", "https://", address.strip(), flags=re.I))
    return parts.scheme.lower() in ("http", "https") and bool(parts.hostname) and not re.search(r"\s", address)


def refusal_for(connector: str, settings: dict[str, Any], *, ws: Any, cfg: Any, store: Any) -> Refusal | None:
    """Why a source of a core kind can't be read, or None when its trial read went well (or the kind has none). The
    settings are the checked ones as they will be kept."""
    from engine.connectors import CORE

    found = CORE.get(connector)
    if found is None or connector == "fake":
        return None
    try:
        checked = found.settings.model_validate(settings)
    except ValueError:
        return None
    if connector == "mailbox":
        return _mailbox(checked)
    if connector == "calendar":
        return _calendar(found, checked, ws=ws, cfg=cfg, store=store)
    if connector == "feed":
        return _link(found, checked, checked.url, "url", ws=ws, cfg=cfg, store=store)
    if hasattr(checked, "path"):
        return _folder(checked, ws)
    return None


def _mailbox(settings: Any) -> Refusal | None:
    host = settings.host.strip()
    if not _HOST.fullmatch(host):
        return _say("sources.refuse.not_a_server", "host")
    try:
        listed = mailbox_folders(settings)
    except ConnectorError as err:
        return _from_error("mailbox", err, host, "host")
    wanted = settings.folder
    have = {n.lower() for n in listed.names}
    if wanted.lower() != "inbox" and wanted.lower() not in have:
        return _say("sources.refuse.no_such_folder", "folder", folder=wanted)
    return None


def _read_once(connector: Any, settings: Any, *, ws: Any, cfg: Any, store: Any) -> None:
    watch._poll(store, connector, settings, {}, ws, cfg, datetime.now(UTC))


def _calendar(connector: Any, settings: Any, *, ws: Any, cfg: Any, store: Any) -> Refusal | None:
    if settings.file.strip():
        path = Path(settings.file.strip()).expanduser()
        shown = str(path)
        try:
            _read_once(connector, settings, ws=ws, cfg=cfg, store=store)
        except ConnectorError as err:
            return _from_error("file", err, shown, "file")
        return None
    return _link(connector, settings, settings.address, "address", ws=ws, cfg=cfg, store=store)


def _link(connector: Any, settings: Any, ref: str, field: str, *, ws: Any, cfg: Any, store: Any) -> Refusal | None:
    address = _address(ref)
    if address and not _is_web(address):
        return _say("sources.refuse.not_a_link", field)
    try:
        _read_once(connector, settings, ws=ws, cfg=cfg, store=store)
    except ConnectorError as err:
        return _from_error("link", err, _host_of(address) or "that address", field)
    return None


def _folder(settings: Any, ws: Any) -> Refusal | None:
    folder = Path(settings.path).expanduser()
    if not folder.is_absolute():
        folder = ws.root / folder
    if not folder.is_dir():
        return _from_error("folder", ConnectorError("not_found"), str(folder), "path")
    return None


def default_label(connector: str, settings: dict[str, Any], kind_label: str) -> str:
    """The name a source takes when the person gives none: what it reads, as they know it (a mailbox's user name, a
    file's or folder's name, a link's or feed's host), else the kind's own name. A link's path is never part of it."""
    if connector == "mailbox" and settings.get("user"):
        return str(settings["user"])
    for key in ("file", "path"):
        if settings.get(key):
            name = Path(str(settings[key]).strip()).name
            if name:
                return name
    if connector == "calendar" and settings.get("address"):
        host = _host_of(_address(str(settings["address"])))
        if host:
            return watch.advice_sentence("sources.name.calendar_at").format(host=host)
    if connector == "feed" and settings.get("url"):
        host = _host_of(str(settings["url"]))
        if host:
            return host
    return kind_label

"""Sources a sign-in starts: once the person signs in, the core starts reading what the plugin declared for that
sign-in (the inbox, the main calendar), so signing in is the whole setup. Each account's sources are added once, and
only where the workspace reads nothing with that connector as that account yet; the person's later changes stand.
Which accounts have had theirs added is kept on this computer, beside the sign-ins themselves.

A declared source may be marked as holding the account's own sent mail (`sent`): it is started the same way, with the
person as its author, since what it holds is their own mail, so the promises they made in mail they sent are found
with no button to press. It waits until the workspace knows who the person is, and is started once that is so."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from engine import settings as config_screens
from engine.config import ConfigError, load_config
from engine.state_file import changing, write_whole

STATE = "sign-in-sources.json"


def _state_path(ws: Any) -> Path:
    return ws.private_dir / STATE


def _started(ws: Any) -> set[str]:
    try:
        return set(json.loads(_state_path(ws).read_text(encoding="utf-8")))
    except (OSError, ValueError):
        return set()


def _remember(ws: Any, names: set[str]) -> None:
    """Add `names` to the sign-ins that have had their sources added. The file is read again under its lock, so
    sign-ins finishing at the same moment each stay recorded."""
    with changing(_state_path(ws)):
        write_whole(_state_path(ws), json.dumps(sorted(_started(ws) | names)))


def _keys(ws: Any, sign_in: Any) -> Path:
    return ws.root / ".cockpit" / "keys" / sign_in.plugin


def _addresses(ws: Any, sign_in: Any) -> list[str | None]:
    """The addresses of the accounts signed in to a sign-in (None for one never named); one entry of None when no
    account is signed in, so a sign-in with nothing signed in is still looked at once."""
    from engine.sign_in import list_accounts

    return [a.address for a in list_accounts(_keys(ws, sign_in), sign_in)] or [None]


def accounts_of(ws: Any, store: Any, plugin: str) -> list[str] | None:
    """The addresses of the accounts signed in across a plugin's sign-ins that name their accounts, oldest first; None
    when the plugin has no such sign-in (its sources have no account to choose)."""
    from engine.sign_in import list_accounts

    own = [s for s in store.plugins.sign_ins().values() if s.plugin == plugin and s.account is not None]
    if not own:
        return None
    found: list[str] = []
    for sign_in in own:
        for a in list_accounts(_keys(ws, sign_in), sign_in):
            if a.address and a.address.lower() not in {f.lower() for f in found}:
                found.append(a.address)
    return found


def _reads(sources: list[Any], connector: str, address: str | None, only: str | None) -> bool:
    """Whether a source reads with this connector as this account: any account when it has no address; a source that
    names none reads the one account signed in (`only`, when there is exactly one)."""
    return any(
        (s["connector"] if isinstance(s, dict) else s.connector) == connector
        and (address is None or ((s["account"] if isinstance(s, dict) else s.account) or only) == address)
        for s in sources
    )


def declared_settings(wanted: dict[str, Any], connectors: dict[str, Any] | None) -> dict[str, Any]:
    """The settings a declared source starts with, as they are kept in the workspace's files (defaults left out)."""
    connector = (connectors or {}).get(wanted["connector"])
    if connector is None:
        return dict(wanted["settings"])
    return connector.settings.model_validate(wanted["settings"]).model_dump(mode="json", exclude_defaults=True)


def _own_sent(
    sources: list[Any],
    wanted: dict[str, Any],
    settings: dict[str, Any],
    address: str | None,
    only: str | None,
    person: str | None,
) -> bool:
    """Whether the workspace already reads the account's sent mail as the person's own: a source of the connector for
    this account with the same settings and the person as its author."""

    def get(source: Any, key: str) -> Any:
        return source.get(key) if isinstance(source, dict) else getattr(source, key)

    return bool(person) and any(
        get(s, "connector") == wanted["connector"]
        and (address is None or (get(s, "account") or only) == address)
        and get(s, "author") == person
        and dict(get(s, "settings") or {}) == settings
        for s in sources
    )


def _wanted_read(
    sources: list[Any],
    wanted: dict[str, Any],
    settings: dict[str, Any],
    address: str | None,
    only: str | None,
    person: str | None,
) -> bool:
    """Whether the workspace reads what a sign-in declared for this account: for the account's sent mail, a source that
    is the person's own with the same settings; for any other, any source of the connector for the account."""
    if wanted.get("sent"):
        return _own_sent(sources, wanted, settings, address, only, person)
    return _reads(sources, wanted["connector"], address, only)


def not_read(ws: Any, sign_in: Any, connectors: dict[str, Any] | None = None) -> list[str]:
    """The labels of the sign-in's declared sources the workspace reads nothing with yet for some signed-in account
    (none were added, or the person removed them), so the screens can offer to start them with one click. A declared
    sent-mail source is left out while the workspace doesn't know who the person is, since it can't be started yet."""
    try:
        current = load_config(ws.config_dir, env=dict(os.environ))
    except ConfigError:
        return []
    addresses = _addresses(ws, sign_in)
    only = addresses[0] if len(addresses) == 1 else None
    person = current.workspace.user.person
    return [
        s["label"]
        for s in sign_in.sources
        if (person or not s.get("sent"))
        and any(
            not _wanted_read(current.watch.sources, s, declared_settings(s, connectors), a, only, person)
            for a in addresses
        )
    ]


def start_sources(
    ws: Any, cfg: Any, store: Any, sign_in: Any, *, again: bool = False, accounts: list[str | None] | None = None
) -> list[str]:
    """Add the sign-in's declared sources the workspace doesn't read yet, for each account just signed in (`accounts`,
    by address; left out, every account signed in): once per account, or `again` when the person asks for them. Each
    source reads with the account it was started for. Returns the labels added. Sign-ins finishing at the same moment
    are handled one after the other, so the check that an account's sources were added and the adding itself never
    interleave."""
    with changing(_state_path(ws)):
        return _start_sources(ws, cfg, store, sign_in, again=again, accounts=accounts)


def _marker(sign_in: Any, address: str | None) -> str:
    from engine.sign_in import account_key

    return sign_in.name if address is None else f"{sign_in.name}#{account_key(address)}"


def _sent_marker(sign_in: Any, address: str | None) -> str:
    return f"{_marker(sign_in, address)}!sent"


def _done(started: set[str], sign_in: Any, address: str | None) -> bool:
    """Whether this account's sources were added. Sign-ins made before accounts were kept apart are marked by the
    sign-in's name alone, which covers the accounts that existed then."""
    if _marker(sign_in, address) in started:
        return True
    return sign_in.name in started and not any(m.startswith(sign_in.name + "#") for m in started)


def _start_sources(
    ws: Any, cfg: Any, store: Any, sign_in: Any, *, again: bool, accounts: list[str | None] | None
) -> list[str]:
    started = _started(ws)
    signed = _addresses(ws, sign_in)
    wanted_for = signed if accounts is None else accounts
    pending = [a for a in wanted_for if again or not _done(started, sign_in, a)]
    try:
        current = load_config(ws.config_dir, env=dict(os.environ))
    except ConfigError:
        return []
    # The account's own sent mail is started once the person is known, and once for each account.
    person = current.workspace.user.person
    pending_sent = (
        [a for a in wanted_for if again or _sent_marker(sign_in, a) not in started]
        if person and any(w.get("sent") for w in sign_in.sources)
        else []
    )
    sources = [s.model_dump(mode="json") for s in current.watch.sources]
    connectors = {
        name: connector
        for registrar in store.plugins.registrars.values()
        for name, connector in registrar.connectors.items()
    }
    # With a second account signed in, a source that names none would have to choose: it keeps the account it was
    # reading, the first one.
    named = [a for a in signed if a is not None]
    first = named[0] if named else None
    changed = False
    if len(named) > 1 and first is not None:
        for source in sources:
            if source["connector"].split("/", 1)[0] == sign_in.plugin and not source.get("account"):
                source["account"] = first
                changed = True
    only = signed[0] if len(signed) == 1 else None
    taken = {s["id"] for s in sources}
    added = []

    def add(wanted: dict[str, Any], address: str | None, settings: dict[str, Any], **more: Any) -> None:
        base = re.sub(r"[^a-z0-9]+", "-", wanted["label"].lower()).strip("-")[:40] or "source"
        source_id = (
            base if base not in taken else next(f"{base}-{n}" for n in range(2, 999) if f"{base}-{n}" not in taken)
        )
        taken.add(source_id)
        sources.append(
            {
                "id": source_id,
                "connector": wanted["connector"],
                "label": wanted["label"],
                "every_minutes": wanted["every_minutes"],
                # The first read is taken in quietly (one total, one go, one list to look over), not item by item.
                "first_run": "intake",
                "settings": settings,
                **({"account": address} if address else {}),
                **more,
            }
        )
        added.append(wanted["label"])

    for address in pending:
        for wanted in sign_in.sources:
            connector = connectors.get(wanted["connector"])
            if wanted.get("sent") or connector is None or _reads(sources, wanted["connector"], address, only):
                continue
            add(wanted, address, declared_settings(wanted, connectors))
    # What the account's sent mail holds is the person's own work, so its source is credited to them.
    for address in pending_sent:
        for wanted in sign_in.sources:
            settings = declared_settings(wanted, connectors)
            if (
                not wanted.get("sent")
                or wanted["connector"] not in connectors
                or _own_sent(sources, wanted, settings, address, only, person)
            ):
                continue
            add(wanted, address, settings, author=person)
    if added or changed:
        config_screens.save(
            ws,
            cfg,
            store,
            changes={"watch.sources": sources},
            reset=[],
            read_fingerprint=config_screens.fingerprint(ws.config_dir),
            env=dict(os.environ),
            allow=("watch.sources",),
        )
    if pending or pending_sent:
        _remember(ws, {*(_marker(sign_in, a) for a in pending), *(_sent_marker(sign_in, a) for a in pending_sent)})
    return added


def start_signed_in(ws: Any, cfg: Any, store: Any) -> list[str]:
    """At start-up, and when the person is first named: sources for sign-ins already signed in before their plugin
    declared any (or before this app started them), and the sent-mail source of an account signed in before the
    workspace knew who the person is. Returns the labels added."""
    from engine.sign_in import list_accounts

    added = []
    for registrar in store.plugins.registrars.values():
        if not store.plugins.active(registrar.name):
            continue
        for sign_in in registrar.sign_ins.values():
            if not sign_in.sources:
                continue
            keys = ws.root / ".cockpit" / "keys" / registrar.name
            started = _started(ws)
            wants_sent = bool(cfg.workspace.user.person) and any(w.get("sent") for w in sign_in.sources)
            fresh = [
                a.address
                for a in list_accounts(keys, sign_in)
                if not _done(started, sign_in, a.address)
                or (wants_sent and _sent_marker(sign_in, a.address) not in started)
            ]
            if fresh:
                added += start_sources(ws, cfg, store, sign_in, accounts=fresh)
    return added

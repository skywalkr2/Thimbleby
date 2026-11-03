"""Which mailbox a message to someone goes out from (design 7.5): the person's mailboxes, from the mail sources the
assistant reads, and the one the person's own conversation with them came through. A follow-up message is copied and
sent from the person's mail program, so this only says which mailbox to use; it sends nothing. Reads only."""

from __future__ import annotations

from email.utils import parseaddr
from typing import Any

from engine import watch
from engine.connectors import declared_reads, moment, reads
from engine.contacts import all_values


def _address(source: Any) -> str | None:
    """The address a mail source reads as: the account an add-on source signs in as, or a mailbox's own address."""
    found = source.account or source.settings.get("from_address") or source.settings.get("user")
    return str(found).strip() if found and "@" in str(found) else None


def _mail_sources(store: Any, cfg: Any) -> list[Any]:
    declared = declared_reads(watch.connectors(store))
    return [s for s in cfg.watch.sources if s.enabled and "mail" in reads(s.connector, declared)]


def sending_accounts(store: Any, cfg: Any) -> list[str]:
    """The mailboxes the person could send from, in the order their sources are listed, each once (the same address in
    another case or beside another folder is the same mailbox)."""
    found: dict[str, str] = {}
    for source in _mail_sources(store, cfg):
        if address := _address(source):
            found.setdefault(address.casefold(), address)
    return list(found.values())


def conversation_account(store: Any, cfg: Any, person: dict[str, Any]) -> str | None:
    """The mailbox the latest mail from this person was read in (any of their addresses), or none when no mail from
    them has been read. It is the mailbox their conversation with the person is in, so a reply goes out from it."""
    wanted = {v.strip().casefold() for v in all_values(person.get("how_to_reach")) if "@" in v}
    if not wanted:
        return None
    by_source = {s.id: _address(s) for s in _mail_sources(store, cfg)}
    best: tuple[Any, str] | None = None
    for snap in store.read().list("snapshot"):
        data = snap.data
        message = data.get("message") or {}
        if data.get("gone") or not message.get("received") or data.get("source") not in by_source:
            continue
        if parseaddr(message.get("sender") or "")[1].strip().casefold() not in wanted:
            continue
        try:
            when = moment(message["received"])
        except (TypeError, ValueError):
            continue
        if by_source[data["source"]] and (best is None or when > best[0]):
            best = (when, by_source[data["source"]] or "")
    return best[1] if best else None

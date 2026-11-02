"""Which connected mailboxes read no sent folder, so promises the person makes in their own mail can't be found (7.7).

A mailbox is the sources that read the same account: for the core's mailbox connector the same server and user name, for
an add-on's kind of mail source (one whose settings name a folder) the same kind and signed-in account. It reads a sent
folder when an enabled source of it reads a folder with one of the usual names (`watch.sent_folder_names`, ignoring
capitals and the part before the last separator), or reads another folder than the inbox as the person's own mail (the
source names an author). Today offers to add it, once per mailbox: Dismiss ends that for good. Nothing here reads a
mailbox or the network.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.state_file import changing, write_whole

STATE_FILE = "sent-folder-offers.json"
INBOX = "inbox"


@dataclass(frozen=True)
class Missing:
    source: str  # the id of the mailbox's first enabled source, which the line opens
    label: str  # what the mailbox is called on screen


def _path(private_dir: Path) -> Path:
    return Path(private_dir) / STATE_FILE


def dismissed(private_dir: Path) -> set[str]:
    """The sources whose offer the person dismissed for good."""
    try:
        data = json.loads(_path(private_dir).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return set()
    names = data.get("dismissed") if isinstance(data, dict) else None
    return {n for n in names if isinstance(n, str)} if isinstance(names, list) else set()


def dismiss(private_dir: Path, source: str, on: bool = True) -> None:
    """Dismiss the offer for this source's mailbox for good (or, with `on` false, bring it back)."""
    path = _path(private_dir)
    with changing(path):
        names = dismissed(private_dir)
        names = names | {source} if on else names - {source}
        write_whole(path, json.dumps({"dismissed": sorted(names)}, indent=2) + "\n")


def _folders_of(source: Any, connector: Any) -> list[str]:
    """The folders a source reads, as its settings give them (a kind's own default when they don't)."""
    if source.connector == "mailbox":
        return [str(source.settings.get("folder") or "INBOX")]
    if connector is None:
        return []
    for name, field in connector.settings.model_fields.items():
        if "folder" in name.lower():
            value = source.settings.get(name, field.default if isinstance(field.default, (str, list)) else None)
            return [str(v) for v in (value if isinstance(value, list) else [value]) if v]
    return []


def _identity(source: Any, connector: Any) -> tuple[str, ...] | None:
    """Which mailbox a source reads, or none when it isn't a mail source."""
    if source.connector == "mailbox":
        settings = source.settings
        return ("mailbox", str(settings.get("host", "")).casefold(), str(settings.get("user", "")).casefold())
    if "/" not in source.connector or connector is None:
        return None  # only an add-on's kind of source is a mail source besides the core's mailbox
    if not any("folder" in name.lower() for name in connector.settings.model_fields):
        return None
    return (source.connector, str(source.account or "").casefold())


def _is_sent(folder: str, names: set[str]) -> bool:
    low = folder.casefold()
    return low in names or low.replace(".", "/").rsplit("/", 1)[-1] in names


def missing(cfg: Any, connectors: dict[str, Any]) -> list[Missing]:
    """The connected mailboxes that read no sent folder, in the order their first source is listed."""
    names = {n.casefold() for n in cfg.watch.sent_folder_names}
    names |= {n.rsplit(".", 1)[-1] for n in names}
    boxes: dict[tuple[str, ...], list[Any]] = {}
    for source in cfg.watch.sources:
        if not source.enabled:
            continue
        identity = _identity(source, connectors.get(source.connector))
        if identity is not None:
            boxes.setdefault(identity, []).append(source)
    found: list[Missing] = []
    for sources in boxes.values():
        reads = False
        for source in sources:
            for folder in _folders_of(source, connectors.get(source.connector)):
                if _is_sent(folder, names) or (source.author and folder.casefold() != INBOX):
                    reads = True
        if not reads:
            found.append(Missing(sources[0].id, sources[0].label or sources[0].id))
    return found

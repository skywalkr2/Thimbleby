"""The folders and labels an account has, for Move to and Label (design 6.12).

A channel that files messages may list where they can go (`folders(account, context)`, plugin API 0.3.92). The core asks
only the channel that serves the account, only when the person opens Move to or Label, with a time limit, and keeps a
good answer for a short while so opening the form again doesn't ask the service again. A channel that can't answer, or
answers badly, or takes too long, leaves the person to type the name. The channel is read-only and never sees anything
but the account it is asked about.
"""

from __future__ import annotations

import threading
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from engine import act_accounts
from engine.channels import ChannelFailed, ChannelFolder

#: Why a channel gave no list: the kinds of `ChannelFailed`, or `unavailable` for a call that raised, took too long or
#: answered with anything but a list of folders.
PROBLEMS = ("auth", "refused", "outage", "offline", "unavailable")

_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="channel-folders")


@dataclass(frozen=True)
class FolderAnswer:
    """What asking an account's channel for its folders came to: `listed` is whether its channel lists folders at all;
    `folders` what it listed; `problem` why it gave no list (one of `PROBLEMS`), when it should have."""

    listed: bool = False
    folders: tuple[ChannelFolder, ...] = ()
    problem: str | None = None


def carrier(store: Any, account: str) -> tuple[str, Any] | None:
    """The channel that lists the folders of this account: one that serves its kind of account, files messages and
    lists folders. None when no channel does (a plain mailbox is listed by its source, not by a channel)."""
    kind = act_accounts.kind_of(account)
    found = [
        (name, channel)
        for name, channel in sorted(store.plugins.channels().items())
        if not channel.manual
        and channel.folders is not None
        and kind in channel.accounts
        and "mailbox" in channel.kinds
        and (channel.takes("mailbox", "move") or channel.takes("mailbox", "label"))
    ]
    return found[0] if found else None


def lists_folders(store: Any, account: str | None) -> bool:
    """Whether the channel serving this account can list its folders and labels."""
    return (
        bool(account) and act_accounts.kind_of(account) != act_accounts.MAILBOX and carrier(store, account) is not None
    )


def checked_list(answer: Any) -> tuple[tuple[ChannelFolder, ...], str | None]:
    """The list a channel gave, or the problem. A `ChannelFailed` is that kind; anything but a list of well-formed
    folders is `unavailable`."""
    if isinstance(answer, ChannelFailed):
        return (), answer.kind if answer.kind in PROBLEMS else "unavailable"
    if not isinstance(answer, (list, tuple)):
        return (), "unavailable"
    seen: dict[tuple[str, str], ChannelFolder] = {}
    for item in answer:
        if (
            not isinstance(item, ChannelFolder)
            or not isinstance(item.id, str)
            or not item.id.strip()
            or not isinstance(item.name, str)
            or not item.name.strip()
            or item.kind not in ("folder", "label")
        ):
            return (), "unavailable"
        seen.setdefault((item.kind, item.id), item)
    return tuple(seen.values()), None


class FolderLists:
    """Asks channels for their accounts' folders and keeps each good answer for `watch.folders_cache_minutes`. The
    limits are read when asked, so a change to either applies at once. One instance belongs to one workspace."""

    def __init__(self, store: Any, cfg: Any) -> None:
        self.store = store
        self.cfg = cfg
        self._kept: dict[str, tuple[datetime, tuple[ChannelFolder, ...]]] = {}
        self._lock = threading.Lock()

    def get(self, account: str, now: datetime) -> FolderAnswer:
        """The folders of the account at `now`: from the cache inside its time, else from its channel."""
        found = carrier(self.store, account) if act_accounts.kind_of(account) != act_accounts.MAILBOX else None
        if found is None:
            return FolderAnswer()
        key = account.lower()
        with self._lock:
            kept = self._kept.get(key)
        if kept is not None and now < kept[0]:
            return FolderAnswer(listed=True, folders=kept[1])
        name, channel = found
        context = self.store.plugins.channel_context(name, account, self.store.path.parent)
        future = _pool.submit(channel.folders, account, context)
        try:
            answer: Any = future.result(timeout=self.cfg.watch.folders_timeout_seconds)
        except FutureTimeout:
            future.cancel()
            context.log.warning("listing the folders of %s took longer than the limit", account)
            return FolderAnswer(listed=True, problem="unavailable")
        except Exception:  # a channel that raises counts as giving no list; the person types the name
            context.log.exception("listing the folders of %s failed", account)
            return FolderAnswer(listed=True, problem="unavailable")
        folders, problem = checked_list(answer)
        if problem is not None:
            return FolderAnswer(listed=True, problem=problem)
        minutes = self.cfg.watch.folders_cache_minutes
        with self._lock:
            if minutes > 0:
                self._kept[key] = (now + timedelta(minutes=minutes), folders)
            else:
                self._kept.pop(key, None)
        return FolderAnswer(listed=True, folders=folders)

    def named(self, account: str | None, kind: str, picked: str | None, now: datetime) -> str | None:
        """The name the person saw for the folder or label they picked (its id), when the account's list has it: what
        an approval shows in place of the id. None for a name typed by hand or an account with no list."""
        if not picked or not account or not lists_folders(self.store, account):
            return None
        for item in self.get(account, now).folders:
            if item.kind == kind and item.id == picked and item.name != picked:
                return item.name
        return None

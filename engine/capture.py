"""Capture folders (design 6.32, "What arrives"): a folder the person drops notes, documents and voice notes into.

A source of the core's capture kind is read like any folder, but what lands in it is the person's own: a note or a
document is handed in as their words (a trusted source authored by the person, like a note they type), and a sound
file is a voice note, stored and turned into text by an account that takes speech (`engine/transcribe.py`), whose words
are then read the same way. Nothing in it is triaged, set aside or read as outside content, and everything already in
the folder when the source is added is taken in the first time. A file that changes is handed in again; one that is
gone is only marked gone. Reads and writes only through the usual hand-in functions, so the usual cost rules apply."""

from __future__ import annotations

import contextlib
import hashlib
import logging
from dataclasses import replace
from datetime import datetime
from typing import Any

from engine import intake, transcribe
from engine.connectors import CAPTURE, SourceItem
from engine.extract.attached import with_files_read
from engine.own_accounts import own_names
from engine.storage import StoreError, WriteContext

log = logging.getLogger(__name__)

_WATCHER = WriteContext(actor="watcher", trust="untrusted", op="watch.read")
#: How a connector says it listed a file it did not read; such an item is noted, never handed in as words.
NOT_READ = "(not read"
#: What a mail source's snapshot of an item handed in as the person's own capture says closed it, so Today's inbox
#: leaves it out and a later read of the source doesn't take it for ordinary mail.
CAPTURED = "capture"


def is_capture(source: Any) -> bool:
    return source.connector == CAPTURE


def marks_mail(source: Any) -> bool:
    """Whether a mail source is marked as holding the person's own capture: a folder or label they move mail to, or an
    address mail to which is theirs."""
    return source.connector != CAPTURE and bool(source.capture or (source.capture_address or "").strip())


def _address(written: str | None) -> str:
    """The address in a name as a service writes it (`Name <name@example.com>`), lower case; a bare address as it is."""
    text = (written or "").strip()
    if "<" in text and ">" in text:
        text = text[text.rindex("<") + 1 : text.rindex(">")]
    return text.strip().lower()


def _is_the_persons(cfg: Any, written: str | None) -> bool:
    """Whether this sender is one of the person's own addresses or names (`workspace.user.accounts` and the accounts
    they signed in with), never one of the app's."""
    mine = {_address(n) for n in own_names(cfg)} | {" ".join(n.split()).lower() for n in own_names(cfg)}
    return bool(written) and (_address(written) in mine or " ".join(written.split()).lower() in mine)


def to_capture(source: Any, item: SourceItem) -> bool:
    """Whether a mail is in what the source marks as capture: everything it reads when it is a capture folder or label,
    else mail sent to its capture address."""
    if source.capture:
        return True
    alias = _address(source.capture_address)
    if not alias or item.message is None:
        return False
    return any(_address(p) == alias for p in item.message.participants)


def own_mail(cfg: Any, source: Any, item: SourceItem) -> bool:
    """Whether a mail is the person's own capture: in what the source marks as capture, and from one of their own
    addresses. Mail from anyone else stays outside content, marked untrusted like any mail."""
    sender = (item.message.sender if item.message is not None else None) or item.author
    return item.message is not None and to_capture(source, item) and _is_the_persons(cfg, sender)


def own_mail_keys(cfg: Any, source: Any, items: list[SourceItem]) -> set[str]:
    """The keys of the mail in a read that is the person's own capture; none for a source that isn't marked."""
    return {i.key for i in items if marks_mail(source) and own_mail(cfg, source, i)}


def _mail_words(item: SourceItem) -> str:
    """What the person wrote in a mail to themselves: its subject, then its body (the text after the header lines when
    the connector writes them)."""
    text = item.text.strip()
    head, gap, body = text.partition("\n\n")
    words = body.strip() if gap and head.lstrip().lower().startswith(("from:", "to:", "subject:")) else text
    subject = " ".join(item.title.split())
    return f"{subject}\n\n{words}".strip() if words and subject and subject not in words else (words or subject)


def _sound(item: SourceItem) -> tuple[list[Any], SourceItem]:
    """The sound files an item carries, and the item without them."""
    sound = [f for f in item.files if f.media_type.startswith("audio/")]
    return sound, replace(item, files=tuple(f for f in item.files if f not in sound))


def compare(ws: Any, store: Any, cfg: Any, source: Any, poll: Any, now: datetime, everything: Any = None) -> Any:
    """Hand in what is new or changed in a capture folder, as the person's own words or voice notes. Returns the
    watcher's result (the requests handed in, new and changed). For a mail source, `poll` holds only the mail that is
    the person's own capture and `everything` the keys of everything the read listed, so a captured mail that has gone
    from the source is marked gone and nothing else is touched."""
    from engine.watch import Result, _keep_text, data_level_of

    result = Result(source.id, "ok")
    mail = source.connector != CAPTURE
    seen = {s.data["key"]: s for s in store.read().find("snapshot", {"source": source.id}) if not s.data["gone"]}
    level = data_level_of(cfg, source)
    for polled in poll.items:
        sound, item = _sound(polled)
        item = with_files_read(ws, store, cfg, item, source.label or source.id)
        words = (_mail_words(item) if mail else item.text).strip()
        voices = [hashlib.sha256(f.data).hexdigest() for f in sound]
        marker = words if not voices else "\n".join([words, *(f"voice:{v}" for v in voices)]).strip()
        digest = _keep_text(ws, marker or item.title)
        before = seen.get(item.key)
        if before is not None and before.data["content_hash"] == digest:
            continue
        handed: list[str] = []
        try:
            if words and not words.startswith(NOT_READ):
                handed.append(
                    intake.own_words_in(
                        ws,
                        store,
                        cfg,
                        text=words,
                        title=item.title,
                        kind="mail" if mail else "folder",
                        project=source.project,
                        data_level=level,
                        now=now,
                    ).request
                )
            for file in sound:
                handed.append(
                    transcribe.hand_in(
                        store,
                        cfg,
                        file.data,
                        name=file.name,
                        media_type=file.media_type,
                        project=source.project,
                        data_level=level,
                        origin="input",
                        now=now,
                    )
                )
        except (StoreError, intake.IntakeError) as err:
            # One file that can't be handed in (too large, a kind of file not accepted) is left for the next read; the
            # rest of the folder is still taken in.
            log.warning("Capture folder %s: %s couldn't be handed in: %s", source.id, item.key, err)
            continue
        data = {
            "source": source.id,
            "key": item.key,
            "title": item.title,
            "content_hash": digest,
            "author": item.author if mail else None,
            "seen_at": now.isoformat(),
            "closed_by": CAPTURED if mail else None,
            "set_aside": None,
        }
        with store.transaction() as tx:
            if before is None:
                tx.create("snapshot", data, _WATCHER)
            else:
                tx.update("snapshot", before.id, data, _WATCHER, read_version=before.version)
        (result.new if before is None else result.changed).extend(handed)
    listed = {p.key for p in poll.items} | set(everything or ())
    # In a mail source only what was handed in as capture is this pass's to mark gone; the rest is the ordinary read's.
    ours = {k: s for k, s in seen.items() if not mail or s.data.get("closed_by") == CAPTURED}
    gone = [k for k in ours if k not in listed] if poll.complete else [k for k in poll.removed if k in ours]
    for key in gone:
        with contextlib.suppress(StoreError), store.transaction() as tx:
            tx.update("snapshot", ours[key].id, {"gone": True}, _WATCHER, read_version=ours[key].version)
    return result

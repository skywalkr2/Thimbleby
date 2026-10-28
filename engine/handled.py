"""What the app handled for the person (design 7.20): two lists on one screen, by whether the assistant read the item,
and the choices a row offers.

- **Set aside before reading**: what was sorted away before the assistant read it. Mail sorted away by a rule or by the
  sorting (`snapshot.set_aside`, not confirmed; the folder itself is `engine.set_aside`), and a change a triage rule
  closed (`request.auto_closed`), of any kind of item (mail, a file, a page, a calendar entry; `item_kind_of` says
  which). A row's `tab` says how it was handled (`set_aside` or `closed`), which decides the choices it offers.
- **Read, nothing to do**: mail the assistant read and found nothing to record or ask in. Its latest request is done,
  not dismissed, made by an outside input, and its changeset recorded no op and is marked looked over.

An item is in one list at most: a set-aside mail never has a read request closed that way, and a mail handed in again
leaves the second list as soon as its new request exists. Rows are grouped by kind (a mail by its kind, any other item
by its kind of item), by reason (the rule's own words) or by sender, newest first, filtered by the kind of item, and
searched by sender, subject, kind and reason. The tab `closed` of an earlier version reads as `set_aside`.

An item stays listed for `watch.handled_keep_days` after it was handled, then leaves the list. That is a filter made
when the list is read: no record is changed or deleted, so the ledger and Undo are whole, and the original stays
where it came from. Nothing here changes the mailbox.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from email.utils import parseaddr
from pathlib import Path
from typing import Any, Literal

from engine import closes, set_aside, sides
from engine.connectors import CORE, declared_reads, reads
from engine.mail_kinds import kind_of
from engine.storage import StoreError, WriteContext
from engine.watch import VERSION_RULE

Tab = Literal["set_aside", "closed", "read"]
#: The kinds of item a close can be of; the screen words each.
ITEM_KINDS = ("mail", "calendar", "file", "page", "action", "question", "other")
#: What a connector with no declaration of what it reads is, by its name.
_FILE_CONNECTORS = frozenset({"folder", "capture"})
_PAGE_CONNECTORS = frozenset({"feed"})
Grouping = Literal["kind", "reason", "sender"]
#: The two lists; `closed` is accepted as the first.
TABS: tuple[Literal["set_aside", "read"], ...] = ("set_aside", "read")
#: The kind a set-aside section is listed under, and the kind of mail the rules track. Personal stays for rows an
#: earlier version stored; nothing sets mail aside as personal now.
SECTION_KIND = {"personal": "personal", "sales": "sales", "notices": "notices"}
TRACKED_KIND = {"bill": "bills", "order": "orders", "shipping": "deliveries"}
OTHER = "other"
_PM = WriteContext(actor="pm", trust="trusted", op="handled.treat")
_UNDO = WriteContext(actor="pm", trust="trusted", op="handled.undo")


def _read_text(ws: Any, content_hash: str | None) -> str:
    if not content_hash:
        return ""
    path: Path = ws.sources_dir / f"{content_hash}.txt"
    return path.read_text(encoding="utf-8") if path.exists() else ""


def _moment(stamp: Any) -> datetime:
    """A sortable time: the mail's received time, else the epoch, so an unreadable one sorts last."""
    try:
        moment = datetime.fromisoformat(str(stamp))
    except (TypeError, ValueError):
        return datetime.min.replace(tzinfo=UTC)
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


def _stamp(value: Any) -> datetime | None:
    """A stored time as an aware time, or None when it is missing or unreadable."""
    try:
        moment = datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None
    return moment if moment.tzinfo else moment.replace(tzinfo=UTC)


def _rule_section(cfg: Any, section: str) -> str:
    """The section Always set aside mail like this files a row's sender under: the row's own, except for a mail an
    earlier version set aside as personal, which no rule sets aside, so the configured one."""
    return cfg.watch.handled_rule_section if section == "personal" else section


def kept_since(cfg: Any, now: datetime | None) -> datetime:
    """The oldest time a mail may have been handled at and still be listed: `watch.handled_keep_days` before now."""
    return (now or datetime.now(UTC)) - timedelta(days=cfg.watch.handled_keep_days)


def _expired(handled_at: Any, cutoff: datetime) -> bool:
    """Whether a mail handled at this time has been kept long enough. A time that can't be read never expires it, so
    nothing leaves the list for want of a date."""
    moment = _stamp(handled_at)
    return moment is not None and moment < cutoff


def _mail_requests(view: Any) -> dict[tuple[str, str], list[Any]]:
    """Every request for a watched item, by (source, key), oldest first."""
    watched_of = {
        s.id: s.data.get("watched") or {} for s in view.list("source") if (s.data.get("watched") or {}).get("key")
    }
    found: dict[tuple[str, str], list[Any]] = {}
    for req in view.list("request"):
        watched = watched_of.get(req.data.get("source") or "")
        if watched:
            found.setdefault((watched["source"], watched["key"]), []).append(req)
    for requests in found.values():
        requests.sort(key=lambda r: str(r.data["created_at"]))
    return found


def _read_nothing(view: Any, requests: list[Any]) -> Any | None:
    """The request that says this mail was read with nothing to do: the latest one that wasn't taken back, when it is
    done, came from an outside input, and its changeset recorded no op and was looked over. None otherwise."""
    live = [r for r in requests if not r.data.get("dismissed")]
    if not live:
        return None
    latest = live[-1]
    d = latest.data
    if d["state"] != "done" or d.get("origin") != "input" or d.get("set_aside") or d.get("auto_closed"):
        return None
    if d.get("folded_into") or not d.get("changeset"):
        return None
    cs = view.get("changeset", d["changeset"])
    if cs is None or cs.data["ops"] or not cs.data["reviewed"] or cs.data["status"] != "applied":
        return None
    return latest


def _row(
    ws: Any, cfg: Any, snap: Any, tab: Tab, kind: str, labels: dict[str, str], extra: dict[str, Any], view: Any = None
) -> dict[str, Any]:
    data = snap.data
    message = data["message"]
    address = set_aside.address_of(snap, ws)
    return {
        "id": snap.id,
        "version": snap.version,
        "tab": tab,
        "kind": kind,
        "title": data["title"],
        "sender": message.get("sender"),
        "source": labels.get(data["source"], data["source"]),
        "received": message.get("received"),
        "link": data.get("link"),
        "address": address,
        "domain": set_aside.offerable_domain(address, cfg),
        "item": "mail",
        "rule": None,
        "change": None,
        "side": sides.watch_source_side(view, cfg, data["source"]) if view is not None else None,
        **extra,
    }


def _closed_rows(view: Any, cfg: Any, labels: dict[str, str], said: dict[str, str | None], cutoff: datetime) -> list:
    """The changes a rule closed before the assistant read them, of any kind of item, each from when it was closed."""
    links = {(s.data["source"], s.data["key"]): s.data.get("link") for s in view.list("snapshot")}
    out = []
    for req in view.list("request"):
        mark = req.data.get("auto_closed")
        if not mark or _expired(req.data["created_at"], cutoff):
            continue
        source = view.get("source", req.data["source"]) if req.data.get("source") else None
        watched = (source.data.get("watched") if source else None) or {}
        out.append(
            {
                "id": req.id,
                "version": req.version,
                "tab": "closed",
                "kind": OTHER,
                "title": source.data["title"] if source else req.id,
                "sender": None,
                "source": labels.get(watched.get("source", ""), watched.get("source", "")),
                "received": str(req.data["created_at"]),
                "reason": mark["reason"],
                "link": links.get((watched.get("source"), watched.get("key"))),
                "saved": source.id if source else None,
                "address": "",
                "domain": None,
                "section": cfg.watch.handled_rule_section,
                "request": req.id,
                "item": item_kind_of(cfg, said, watched.get("source")),
                "rule": mark["rule"],
                "change": watched.get("change", "new"),
                "older_version": mark["rule"] == VERSION_RULE,
                "side": sides.watch_source_side(view, cfg, watched.get("source")),
                "handled_at": str(req.data["created_at"]),
            }
        )
    return out


def rows(ws: Any, store: Any, cfg: Any, tab: Tab, now: datetime | None = None) -> list[dict[str, Any]]:
    """The rows of one list, newest first, leaving out what was handled longer ago than `watch.handled_keep_days`: a
    set-aside mail from when the app first saw it (or the person set it aside), a change a rule closed from when it was
    closed, a mail read with nothing to do from when it was read. Leaving the list changes no record."""
    view = store.read()
    cutoff = kept_since(cfg, now)
    labels = {s.id: s.label or s.id for s in cfg.watch.sources}
    out: list[dict[str, Any]] = []
    requests = _mail_requests(view)
    if tab in ("set_aside", "closed"):
        out = _closed_rows(view, cfg, labels, declared(store), cutoff)
        for item in set_aside.folder(ws, store, cfg):
            snap = view.get("snapshot", item["id"])
            mark = snap.data.get("set_aside") or {}
            if _expired(mark.get("at") or snap.data.get("seen_at"), cutoff):
                continue
            held = requests.get((snap.data["source"], snap.data["key"]), [])
            out.append(
                _row(
                    ws,
                    cfg,
                    snap,
                    "set_aside",
                    SECTION_KIND.get(item["section"], OTHER),
                    labels,
                    {
                        "reason": item["reason"],
                        "section": _rule_section(cfg, item["section"]),
                        "saved": held[-1].data.get("source") if held else None,
                        "request": None,
                        "handled_at": mark.get("at") or snap.data.get("seen_at"),
                    },
                    view,
                )
            )
    else:
        for snap in view.list("snapshot"):
            data = snap.data
            if not data.get("message") or data.get("deleted") or data.get("gone") or data.get("set_aside"):
                continue
            made = _read_nothing(view, requests.get((data["source"], data["key"]), []))
            if made is None or _expired(made.data.get("created_at"), cutoff):
                continue
            text = _read_text(ws, data.get("content_hash"))
            tracked = kind_of(cfg.watch.mail_kinds, set_aside.address_of(snap, ws), data["title"], text)
            out.append(
                _row(
                    ws,
                    cfg,
                    snap,
                    "read",
                    TRACKED_KIND.get(tracked or "", OTHER),
                    labels,
                    {
                        "reason": None,
                        "section": cfg.watch.handled_rule_section,
                        "saved": made.data.get("source"),
                        "request": made.id,
                        "handled_at": made.data.get("created_at"),
                    },
                    view,
                )
            )
    out.sort(key=lambda r: _moment(r["received"]), reverse=True)
    return out


def sender_key(row: dict[str, Any]) -> tuple[str, str | None]:
    """The key rows are grouped under by sender, and the name to show: the address in lower case, else the sender as
    written, else one group of mail with no known sender (no name)."""
    address = str(row.get("address") or "")
    sender = str(row.get("sender") or "").strip()
    name = parseaddr(sender)[0].strip() or address or sender or None
    return (address or sender.lower() or "", name)


def matches(row: dict[str, Any], query: str) -> bool:
    """Every word of the search is in the row's sender, address, subject, kind or reason, in any case."""
    words = query.lower().split()
    if not words:
        return True
    hay = " ".join(str(row.get(k) or "") for k in ("sender", "address", "title", "kind", "item", "reason")).lower()
    return all(w in hay for w in words)


def declared(store: Any) -> dict[str, str | None]:
    """What each connector this install has says it reads, for `item_kind_of`."""
    return declared_reads({**CORE, **store.plugins.connectors()})


def item_kind_of(cfg: Any, said: dict[str, str | None], source_id: str | None) -> str:
    """What kind of item a watched source's items are: mail or a calendar entry when its connector says so, else a
    file (a folder), a page (a news feed) or other. A source that is no longer configured gives other."""
    source = next((s for s in cfg.watch.sources if s.id == source_id), None)
    if source is None:
        return "other"
    found = reads(source.connector, said)
    if found:
        return "mail" if found[0] == "mail" else "calendar" if found[0] == "calendar" else "other"
    if source.connector in _FILE_CONNECTORS:
        return "file"
    if source.connector in _PAGE_CONNECTORS:
        return "page"
    return "other"


def item_of_request(view: Any, cfg: Any, said: dict[str, str | None], request: Any) -> str:
    """The kind of item a request was made for: that of the source its input came from."""
    source = view.get("source", request.data["source"]) if request is not None and request.data.get("source") else None
    return item_kind_of(cfg, said, ((source.data.get("watched") or {}).get("source")) if source else None)


def item_of_close(view: Any, cfg: Any, said: dict[str, str | None], close: closes.Close) -> str:
    """The kind of item a close was of: mail for set-aside mail, the watched source's kind for a rule's close, and
    action or question for the assistant's own closes of those."""
    if close.kind == "set_aside":
        return "mail"
    if close.kind == "rule":
        return item_of_request(view, cfg, said, view.get("request", close.request or ""))
    kind = close.record[0] if close.record else ""
    return kind if kind in ("action", "question") else "other"


def kind_group(row: dict[str, Any]) -> tuple[str, str | None]:
    """The key rows are grouped under by kind, and the words to show (none: the screen words the key). A mail is
    grouped by its mail kind (`kind:bills`, `kind:other`, ...), any other item by its kind of item (`item:file`,
    `item:page`, ...), so a key names one group and no two kinds share one."""
    if row["item"] == "mail":
        return (f"kind:{row['kind']}", None)
    return (f"item:{row['item']}", None)


def reason_group(row: dict[str, Any]) -> tuple[str, str | None]:
    """The key rows are grouped under by reason, and the words to show. Set-aside and closed rows are grouped by why
    they were handled (the rule's own words); a mail read with nothing to do has no recorded reason, so it is grouped by
    what the mail is (a bill, an order, a delivery, other) and the screen words that."""
    if row["tab"] == "read":
        return (f"kind:{row['kind']}", None)
    reason = str(row.get("reason") or "").strip()
    return (reason, reason or None)


def listing(
    ws: Any,
    store: Any,
    cfg: Any,
    tab: Tab,
    group: Grouping,
    query: str,
    now: datetime | None = None,
    item: str | None = None,
    side: str | None = None,
) -> dict[str, Any]:
    """One list for the screen: the counts of both lists (whatever the search or kind), the kinds of item the chosen
    list holds with a count each, and the rows that match the search and the kind, in groups. A group is ordered by its
    newest row; rows in it are newest first. The tab `closed` reads as `set_aside`. With a `side`, only what came from
    a source that serves that side or no one side is listed and counted."""
    now = now or datetime.now(UTC)
    tab = "set_aside" if tab == "closed" else tab
    all_rows = {
        t: [r for r in rows(ws, store, cfg, t, now) if side is None or r.get("side") in (None, side)] for t in TABS
    }
    kinds: dict[str, int] = {}
    for found in all_rows[tab]:
        kinds[found["item"]] = kinds.get(found["item"], 0) + 1
    shown = [r for r in all_rows[tab] if matches(r, query) and (not item or r["item"] == item)]
    groups: dict[str, dict[str, Any]] = {}
    for row in shown:
        key, label = kind_group(row) if group == "kind" else reason_group(row) if group == "reason" else sender_key(row)
        found = groups.setdefault(key, {"key": key, "label": label, "items": []})
        found["items"].append(row)
    ordered = [{**g, "count": len(g["items"])} for g in groups.values()]
    return {
        "tab": tab,
        "group": group,
        "query": query,
        "item": item or None,
        "kept_days": cfg.watch.handled_keep_days,
        "page_rows": cfg.ui.handled_rows_shown,
        "counts": {t: len(found) for t, found in all_rows.items()},
        "kinds": [{"item": k, "count": n} for k, n in sorted(kinds.items(), key=lambda kv: (-kv[1], kv[0]))],
        "groups": ordered,
    }


def counts(ws: Any, store: Any, cfg: Any, now: datetime | None = None) -> dict[str, int]:
    """How many each of the two lists holds, and how many of the mail in both came in on the person's day (`today`),
    for a line that only counts."""
    from engine.today import zone

    now = now or datetime.now(UTC)
    here = zone(cfg)
    day = now.astimezone(here).date()
    found = {t: rows(ws, store, cfg, t, now) for t in TABS}
    came_today = sum(
        1
        for listed in found.values()
        for row in listed
        if row["item"] == "mail" and _moment(row["received"]).astimezone(here).date() == day
    )
    return {**{t: len(listed) for t, listed in found.items()}, "today": came_today}


def read_row(ws: Any, store: Any, cfg: Any, snapshot_id: str) -> dict[str, Any] | None:
    """The row of a mail in the Read, nothing to do list, or None when it isn't there."""
    return next((r for r in rows(ws, store, cfg, "read") if r["id"] == snapshot_id), None)


def treat_read(
    ws: Any, store: Any, cfg: Any, snapshot_id: str, *, project: str | None, now: datetime | None = None
) -> str:
    """Hand a mail the assistant read with nothing to do in back to it, as work (or, with `project`, filed under that
    project): a fresh request is queued, and the earlier read is the thing corrected. Returns the new request."""
    from engine.dispatcher import signal
    from engine.watch import hand_in_snapshot

    row = read_row(ws, store, cfg, snapshot_id)
    if row is None:
        raise StoreError("That isn't mail the assistant read with nothing to do.")
    earlier = store.read().get("request", row["request"])
    made = hand_in_snapshot(ws, store, cfg, snapshot_id, now)
    if made is None:
        raise StoreError("The source this message came from isn't set up any more, so it can't be read again.")
    if project:
        with store.transaction() as tx:
            req = tx.get("request", made)
            tx.update("request", made, {"project": project}, _PM, read_version=req.version)
    signal(
        store,
        "pulled_back",
        [earlier.id],
        "Read with nothing to do" + ("; treated as personal" if project else ""),
        changeset=earlier.data["changeset"],
    )
    return made


def take_back_read(store: Any, snapshot_id: str) -> None:
    """Undo `treat_read` while the new read hasn't started: the request is set aside without trying again, so the mail
    is listed as read with nothing to do again. Raises `StoreError` once the assistant has started on it."""
    view = store.read()
    snap = view.get("snapshot", snapshot_id)
    if snap is None or not snap.data.get("message"):
        raise StoreError("That isn't a message the app is holding.")
    requests = _mail_requests(view).get((snap.data["source"], snap.data["key"]), [])
    live = [r for r in requests if not r.data.get("dismissed")]
    latest = live[-1] if live else None
    if latest is None or latest.data["state"] != "queued":
        raise StoreError("The assistant has started reading it, so it can't be taken back.")
    with store.transaction() as tx:
        cur = tx.get("request", latest.id)
        tx.update(
            "request",
            cur.id,
            {"state": "done", "dismissed": True, "dismissed_from": "queued", "waiting": None},
            _UNDO,
            read_version=cur.version,
        )

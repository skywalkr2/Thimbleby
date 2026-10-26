"""Mail handled for the person (design 7.20): two lists on one screen, and the choices a row offers.

- **Set aside**: mail sorted away before the assistant read it, by a rule or by the sorting (`snapshot.set_aside`, not
  confirmed). The folder itself is `engine.set_aside`; this module only lists it with the other kind.
- **Read, nothing to do**: mail the assistant read and found nothing to record or ask in. Its latest request is done,
  not dismissed, made by an outside input, and its changeset recorded no op and is marked looked over.

A mail is in one list at most: a set-aside mail never has a read request closed that way, and a mail handed in again
leaves the second list as soon as its new request exists. Rows are grouped by kind (bills, orders, deliveries, sales,
personal, automated notices, other) or by sender, newest first, and searched by sender, subject and kind. Nothing here
changes the mailbox.
"""

from __future__ import annotations

from datetime import UTC, datetime
from email.utils import parseaddr
from pathlib import Path
from typing import Any, Literal

from engine import set_aside
from engine.mail_kinds import kind_of
from engine.storage import StoreError, WriteContext

Tab = Literal["set_aside", "read"]
Grouping = Literal["kind", "sender"]
TABS: tuple[Tab, ...] = ("set_aside", "read")
#: The kind a set-aside section is listed under, and the kind of mail the rules track.
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
    ws: Any, cfg: Any, snap: Any, tab: Tab, kind: str, labels: dict[str, str], extra: dict[str, Any]
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
        **extra,
    }


def rows(ws: Any, store: Any, cfg: Any, tab: Tab) -> list[dict[str, Any]]:
    """The rows of one list, newest first."""
    view = store.read()
    labels = {s.id: s.label or s.id for s in cfg.watch.sources}
    out: list[dict[str, Any]] = []
    requests = _mail_requests(view)
    if tab == "set_aside":
        for item in set_aside.folder(ws, store, cfg):
            snap = view.get("snapshot", item["id"])
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
                        "section": item["section"],
                        "saved": held[-1].data.get("source") if held else None,
                        "request": None,
                    },
                )
            )
    else:
        for snap in view.list("snapshot"):
            data = snap.data
            if not data.get("message") or data.get("deleted") or data.get("gone") or data.get("set_aside"):
                continue
            made = _read_nothing(view, requests.get((data["source"], data["key"]), []))
            if made is None:
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
                    },
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
    """Every word of the search is in the row's sender, address, subject or kind, in any case."""
    words = query.lower().split()
    if not words:
        return True
    hay = " ".join(str(row.get(k) or "") for k in ("sender", "address", "title", "kind")).lower()
    return all(w in hay for w in words)


def listing(ws: Any, store: Any, cfg: Any, tab: Tab, group: Grouping, query: str) -> dict[str, Any]:
    """One list for the screen: the counts of both lists (whatever the search), and the chosen list's rows that match
    the search, in groups. A group is ordered by its newest mail; rows in it are newest first."""
    all_rows = {t: rows(ws, store, cfg, t) for t in TABS}
    shown = [r for r in all_rows[tab] if matches(r, query)]
    groups: dict[str, dict[str, Any]] = {}
    for row in shown:
        if group == "kind":
            key, label = str(row["kind"]), None
        else:
            key, label = sender_key(row)
        found = groups.setdefault(key, {"key": key, "label": label, "items": []})
        found["items"].append(row)
    ordered = [{**g, "count": len(g["items"])} for g in groups.values()]
    return {
        "tab": tab,
        "group": group,
        "query": query,
        "counts": {t: len(all_rows[t]) for t in TABS},
        "groups": ordered,
    }


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

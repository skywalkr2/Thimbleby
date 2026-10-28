"""API routes for the outward act and the publisher (design 6.12): acts by state, one act with the fingerprint a yes
would cover, the person's yes, taking one back, sending (the yes and the send in one, after the yes) and the answers
for an act the app can't confirm went out.

Every change is the person's own click on that act, applied as theirs through the applier, so each is in the ledger.
The person also drafts an act here (a reply, a change to their mail, an answer to an invitation), and asks what can be
done about a saved message or an invitation and which times are free to propose.
Only the publisher calls a channel, and only for an act whose yes still covers it."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import ValidationError

from api.schemas import (
    AccountFoldersView,
    AccountFolderView,
    ActAboutView,
    ActAccountsView,
    ActAccountView,
    ActApproveIn,
    ActBatchIn,
    ActBatchOptionsView,
    ActBatchResultView,
    ActBatchSkipped,
    ActBatchView,
    ActBatchYesIn,
    ActCalendarOptionsView,
    ActChangeView,
    ActDraftIn,
    ActFailureView,
    ActListView,
    ActOptionsView,
    ActRecipientView,
    ActResultView,
    ActSendOptionsView,
    ActSettleIn,
    ActView,
    DropNoteDone,
    FreeSlotsView,
    FreeSlotView,
)
from engine import act_accounts, acts, own_accounts, propose_times, reply_recipients
from engine.applier import apply_as_person, release
from engine.channel_folders import FolderLists, lists_folders
from engine.channels import COPY
from engine.channels_mailbox import ANSWERS as MAILBOX_ANSWERS
from engine.channels_mailbox import NO_PROPOSE
from engine.config import Config
from engine.drop_notes import chosen_account, note_the_drops
from engine.drop_notes import serving as carrier_for
from engine.names import People
from engine.ops import ACT_ACTIONS, ACT_REPLY_ACTIONS, ActDraftOp
from engine.publisher import Publisher
from engine.reminder_content import OWN_CALENDAR
from engine.storage import Store, StoreError
from engine.worker import Events, Worker
from engine.workspace import Workspace


def build_act_router(ws: Workspace, cfg: Config, store: Store, events: Events, worker: Worker) -> APIRouter:
    r = APIRouter(prefix="/api")
    folder_lists = FolderLists(store, cfg)

    def guard(fn: Any) -> Any:
        try:
            return fn()
        except (StoreError, ValueError, KeyError) as err:
            raise HTTPException(status_code=409, detail=str(err)) from None

    def about_of(rid: str) -> ActAboutView:
        """One thing an act is about, labeled for the screen."""
        view = store.read()
        message = view.get("source", rid)
        if message is not None:
            data = message.data
            sent = data.get("sent_at") or data.get("received_at")
            return ActAboutView(
                id=rid,
                kind="message",
                title=data.get("title") or "",
                sender=(data.get("watched") or {}).get("author"),
                when=str(sent)[:10] if sent else None,
            )
        entry = view.get("event", rid)
        if entry is not None:
            return ActAboutView(
                id=rid, kind="event", title=entry.data["title"], when=entry.data["start"], end=entry.data.get("end")
            )
        return ActAboutView(id=rid, kind="missing", title="")

    def changes_of(view: Any, data: Any) -> list[ActChangeView]:
        """What is different now in a stale act from what the yes was given on: the exact content and target kept on the
        yes, set against the act as it resolves now."""
        was = data.get("was_approved") if data["status"] == "stale" else None
        if not was or not was.get("shown"):
            return []
        out = []
        for d in acts.differences(was["shown"], acts.current_shown(view, store.plugins, data)):
            before, after = d.before, d.after
            if d.part == "account":
                before, after = (act_accounts.label_of(store, cfg, v) if v else None for v in (before, after))
            elif d.part == "channel":
                before, after = (
                    (c.label if (c := acts.channel_of(store.plugins, v)) is not None else v) for v in (before, after)
                )
            out.append(ActChangeView(part=d.part, field=d.field, name=d.name, before=before, after=after))
        return out

    def view_of(found: Any) -> ActView:
        view = store.read()
        data = found.data
        people = People(store, cfg)
        called = {c.key: c.reasons for c in acts.callouts(view, people.pm, data, act_id=found.id)}
        recipients = []
        for rec in data["target"].get("recipients") or []:
            key = acts.recipient_key(rec.get("person"), rec["address"])
            address = acts.current_address(view, rec)
            recipients.append(
                ActRecipientView(
                    key=key,
                    person=rec.get("person"),
                    name=people.name(rec["person"]) if rec.get("person") else rec["address"],
                    address=address,
                    role=rec["role"],
                    reasons=list(called.get(key, ())),
                )
            )
        channel = acts.channel_of(store.plugins, data["channel"])
        target = data["target"]
        account = data.get("account")
        undo_channel = channel is not None and channel.undo is not None
        approval = data.get("approved")
        failure = data.get("failure")
        return ActView(
            id=found.id,
            version=found.version,
            channel=data["channel"],
            channel_label=channel.label if channel is not None else data["channel"],
            kind=target["kind"],
            action=acts.what(data),
            about=[about_of(rid) for rid in target.get("about") or []],
            account=account,
            account_label=act_accounts.label_of(store, cfg, account),
            acting=act_accounts.acting_on(cfg, account),
            copied_because="acting_off" if data.get("intended_channel") else None,
            intended_channel=data.get("intended_channel"),
            label=target.get("label"),
            start=target.get("start"),
            end=target.get("end"),
            title=target.get("title"),
            alarm_minutes=target.get("alarm_minutes"),
            answer=target.get("answer"),
            proposed_start=target.get("proposed_start"),
            proposed_end=target.get("proposed_end"),
            undoable=data["status"] == "sent"
            and data.get("sent_by") == "publisher"
            and undo_channel
            and acts.undoable(data)
            and not data.get("undo_requested_at"),
            undone_at=data.get("undone_at"),
            undo_failure=ActFailureView(**data["undo_failure"]) if data.get("undo_failure") else None,
            status=data["status"],
            parts=dict(data["parts"]),
            recipients=recipients,
            calendar=data["target"].get("calendar"),
            when=data["target"].get("when"),
            folder=data["target"].get("folder"),
            folder_name=data["target"].get("folder_name"),
            label_name=data["target"].get("label_name"),
            template=(data.get("template") or {}).get("name"),
            fingerprint=acts.current_fingerprint(view, store.plugins, data)[0],
            approved_by=approval["by"] if approval else None,
            approved_at=approval["at"] if approval else None,
            withheld=acts.name_problem(view, cfg, data),
            failure=ActFailureView(**failure) if failure else None,
            why=list(data.get("why") or []),
            changes=changes_of(view, data),
            changes_known=bool(data["status"] == "stale" and (data.get("was_approved") or {}).get("shown")),
            approved_before_by=(data.get("was_approved") or {}).get("by") if data["status"] == "stale" else None,
            approved_before_at=(data.get("was_approved") or {}).get("at") if data["status"] == "stale" else None,
            service_id=data.get("service_id"),
            sent_at=data.get("sent_at"),
            sent_by=data.get("sent_by"),
            made_by=data["made_by"],
            sensitivity=data["sensitivity"],
        )

    def need(act_id: str) -> Any:
        found = store.read().get("act", act_id)
        if found is None:
            raise HTTPException(status_code=404, detail=f"act {act_id} doesn't exist")
        return found

    def status_of(act_id: str) -> str:
        return store.read().get("act", act_id).data["status"]

    def serving(account: str, kind: str, action: str) -> tuple[str, Any] | None:
        return carrier_for(store, account, kind, action)

    def message_of(view: Any, record: str) -> str:
        """The saved message or entry a record stands for: a reply owed stands for the message that asked."""
        action = view.get("action", record)
        return (action.data.get("replies_to") or "") if action is not None else record

    def mine(entry: Any) -> bool:
        """Whether a calendar entry is the person's own on a connected calendar: it was read from one, it isn't called
        off, and it isn't an invitation from someone else."""
        data = entry.data
        if not data.get("source") or not data.get("key") or data.get("cancelled"):
            return False
        if not data.get("invitation"):
            return True
        organizer = ((data.get("organizer") or {}).get("address") or "").strip().casefold()
        return bool(organizer) and organizer in {n.casefold() for n in own_accounts.own_names(cfg)}

    @r.get("/acts/options")
    def options(record: str) -> ActOptionsView:
        """What the person can do about a saved message, a calendar entry or a reply owed: the account it came in on,
        whether acting is on for it, the actions its channel does and the ways an invitation can be answered."""
        view = store.read()
        rid = message_of(view, record)
        kind = "message" if view.get("source", rid) else "event" if view.get("event", rid) else None
        if kind is None:
            return ActOptionsView(record=record, kind="missing")
        account = act_accounts.of_record(view, store, cfg, rid)
        acting = act_accounts.acting_on(cfg, account)
        carrier = (
            serving(account, "message" if kind == "message" else "calendar", "reply" if kind == "message" else "answer")
            if account
            else None
        )
        channel = carrier[1] if carrier else None
        mailbox = account is not None and act_accounts.kind_of(account) == act_accounts.MAILBOX
        out = ActOptionsView(
            record=rid,
            kind=kind,
            account=account,
            account_label=act_accounts.label_of(store, cfg, account),
            acting=acting,
            channel_label=channel.label if channel else None,
        )
        if kind == "message":
            out.actions = list(ACT_REPLY_ACTIONS)
            out.can_act = bool(channel and acting and channel.takes("message", "reply"))
            # What files messages is the account's mailbox channel, which needn't be the one that replies.
            if account:
                serves = serving(account, "mailbox", "archive")
                mail = serves[1] if serves else None
                if mailbox:
                    out.folder_source = act_accounts.name_of(account)
                out.actions += [
                    a
                    for a in ("archive", "move", "label", "mark_read")
                    if mail is not None and mail.takes("mailbox", a)
                ]
                if not mailbox and lists_folders(store, account):
                    out.folders_account = account
                out.folders_listed = bool(out.folder_source or out.folders_account)
        elif channel is not None and channel.takes("calendar", "answer"):
            out.can_act = acting
            out.answers = list(MAILBOX_ANSWERS) if mailbox else ["accepted", "tentative", "declined", "propose"]
            out.propose_refusal = NO_PROPOSE if mailbox else None
        if kind == "event" and account and acting and mine(view.get("event", rid)):
            for a in ("move", "cancel"):
                carrier = serving(account, "calendar", a)
                if carrier is not None and carrier[1].takes("calendar", a):
                    out.event_actions.append(a)
        return out

    @r.get("/acts/calendar-options")
    def calendar_options() -> ActCalendarOptionsView:
        """The connected calendar accounts a new event can be put on after the person's yes: acting is on for the
        account and its channel declares `calendar: create`."""
        found = []
        for info in act_accounts.known(store, cfg):
            carrier = serving(info.id, "calendar", "create")
            if info.acting and carrier is not None and carrier[1].takes("calendar", "create"):
                sign_in = store.plugins.sign_ins().get(act_accounts.kind_of(info.id))
                found.append(
                    ActAccountView(
                        id=info.id,
                        label=info.label,
                        acting=True,
                        sign_in=sign_in.name if sign_in is not None else None,
                        can_act=True,
                    )
                )
        return ActCalendarOptionsView(accounts=found)

    @r.get("/acts/batch-options")
    def batch_options(record: Annotated[list[str], Query()]) -> ActBatchOptionsView:
        """What Move to can offer for several saved messages: the one account they all came in on and whether it lists
        its folders. Messages from several accounts get no list, since a folder belongs to one account."""
        view = store.read()
        accounts = {
            a.lower(): a for rid in record if (a := act_accounts.of_record(view, store, cfg, message_of(view, rid)))
        }
        if len(accounts) > 1:
            return ActBatchOptionsView(several_accounts=True)
        account = next(iter(accounts.values()), None)
        if account is None:
            return ActBatchOptionsView()
        listed = act_accounts.kind_of(account) == act_accounts.MAILBOX
        channel_lists = not listed and lists_folders(store, account)
        return ActBatchOptionsView(
            account=account,
            account_label=act_accounts.label_of(store, cfg, account),
            folder_source=act_accounts.name_of(account) if listed else None,
            folders_listed=listed or channel_lists,
            folders_account=account if channel_lists else None,
        )

    @r.get("/acts/accounts/{account:path}/folders")
    def account_folders(account: str) -> AccountFoldersView:
        """The folders and labels the account's channel lists, for Move to and Label: asked when the person opens the
        form and kept for `watch.folders_cache_minutes`. An account whose channel can't list them is `listed: false`;
        a channel that can but didn't (it failed, took longer than `watch.folders_timeout_seconds` or answered badly)
        gives no folders and its `reason`, and the person types the name."""
        if not any(act_accounts.same(info.id, account) for info in act_accounts.known(store, cfg)):
            return AccountFoldersView()
        answer = folder_lists.get(account, worker.now())
        return AccountFoldersView(
            listed=answer.listed,
            folders=[AccountFolderView(id=f.id, name=f.name, kind=f.kind) for f in answer.folders],
            reason=answer.problem,  # type: ignore[arg-type]
        )

    @r.post("/acts/batch")
    def draft_batch(body: ActBatchIn) -> ActBatchView:
        """The person drafts one change to their mail for several selected saved messages: an act for each message, on
        the account it came in on, all in one change that Undo takes back. A message that can't be acted on (it came in
        no account, acting is off for its account, the account's service doesn't do this) is skipped and named with
        the reason; nothing is carried out until the person's one yes at `/acts/batch/send`."""
        view = store.read()
        ops: list[dict[str, Any]] = []
        skipped: list[ActBatchSkipped] = []
        names: dict[tuple[str, str], str | None] = {}

        def named_once(account: str, kind: str, picked: str | None) -> str | None:
            """The picked folder's name, asked of the account's list once for the whole selection."""
            key = (account.lower(), kind)
            if key not in names:
                names[key] = folder_lists.named(account, kind, picked, worker.now())
            return names[key]

        for rid in dict.fromkeys(body.about):
            found = view.get("source", rid)
            title = (found.data.get("title") or "") if found is not None else ""
            account = act_accounts.of_record(view, store, cfg, rid) if found is not None else None
            label = act_accounts.label_of(store, cfg, account)
            if found is None:
                skipped.append(ActBatchSkipped(record=rid, why="gone"))
            elif account is None:
                skipped.append(ActBatchSkipped(record=rid, title=title, why="no_account"))
            elif not act_accounts.acting_on(cfg, account):
                skipped.append(ActBatchSkipped(record=rid, title=title, why="acting_off", account_label=label))
            elif (carrier := serving(account, "mailbox", body.action)) is None or not carrier[1].takes(
                "mailbox", body.action
            ):
                skipped.append(ActBatchSkipped(record=rid, title=title, why="cannot", account_label=label))
            else:
                target = {
                    "kind": "mailbox",
                    "action": body.action,
                    "about": [rid],
                    "folder": body.folder,
                    "label": body.label,
                    "folder_name": named_once(account, "folder", body.folder),
                    "label_name": named_once(account, "label", body.label),
                }
                ops.append(
                    {
                        "op": "act.draft",
                        "channel": carrier[0],
                        "account": account,
                        "target": {k: v for k, v in target.items() if v not in (None, [])},
                        "parts": {},
                    }
                )
        for op in ops[:1]:
            try:
                ActDraftOp.model_validate(op)
            except ValidationError as err:
                said = "; ".join(str(e["msg"]).removeprefix("Value error, ") for e in err.errors())
                raise HTTPException(status_code=409, detail=said) from None
        if not ops:
            return ActBatchView(acts=[], skipped=skipped)
        cs = guard(lambda: apply_as_person(store, cfg, ops, "Drafted acts"))
        events.changed()
        made = store.read().get("changeset", cs).data["ops"]
        return ActBatchView(acts=[view_of(need(m["records"][0]["id"])) for m in made], skipped=skipped, changeset=cs)

    @r.post("/acts/batch/send")
    def send_batch(body: ActBatchYesIn) -> ActBatchResultView:
        """The person's one yes on several acts, each with the fingerprint their screen showed: each is approved as its
        own act (its own change, each in the ledger) and then sent by the publisher, one after another. One that was
        different from what the person saw, or that the channel refused or couldn't do, says why and doesn't stop the
        others. Each sent one can be taken back with `/acts/{id}/undo` where its channel can."""
        for one in body.acts:
            need(one.id)
        results: list[ActResultView] = []
        for one in body.acts:
            found = need(one.id)
            cs: str | None = None
            try:
                if found.data["status"] != "approved":
                    op = {
                        "op": "act.approve",
                        "id": one.id,
                        "fingerprint": one.fingerprint,
                        "acknowledged": one.acknowledged,
                    }
                    cs = apply_as_person(store, cfg, [op], "Said yes to an act")
                elif found.data["approved"]["fingerprint"] != one.fingerprint:
                    raise StoreError("This act is different from the one you were shown.")
                sent = Publisher(store, cfg, now=worker.now).send(one.id)
                results.append(ActResultView(id=one.id, status=sent.status, reason=sent.reason, changeset=cs))
            except (StoreError, ValueError, KeyError) as err:
                results.append(ActResultView(id=one.id, status=status_of(one.id), reason=str(err), changeset=cs))
        events.changed()
        return ActBatchResultView(results=results)

    @r.get("/acts/send-options")
    def send_options() -> ActSendOptionsView:
        """Whether a new message can be carried out after the person's yes, and through which account: the account
        their latest act named when acting is on for it and a channel sends messages through it, else the only account
        that can. Several that could and none chosen is no account: nothing is picked for the person."""
        chosen = chosen_account(store, cfg)
        if chosen is None:
            return ActSendOptionsView()
        return ActSendOptionsView(can_act=True, account=chosen, account_label=act_accounts.label_of(store, cfg, chosen))

    @r.post("/changesets/{cs_id}/ops/{index}/release-with-note")
    def release_with_note(cs_id: str, index: int) -> DropNoteDone:
        """ "Drop it and tell them": apply a held drop of an action that reached someone, and draft a note to each
        person who was told, as an outward act (a message on the account that can carry it, else Copy) that waits for
        the person's yes on its exact content. Nothing is sent."""
        found = store.read().get("changeset", cs_id)
        if found is None:
            raise HTTPException(status_code=404, detail=f"changeset {cs_id} doesn't exist")
        if not 0 <= index < len(found.data["ops"]):
            raise HTTPException(status_code=404, detail="that item isn't in the change")
        held = found.data["ops"][index]
        op = held["op"]
        if held["status"] != "held" or op.get("op") != "action.drop":
            raise HTTPException(status_code=409, detail="That isn't a drop waiting for you.")
        guard(lambda: release(store, cfg, cs_id, index, ws=ws))
        drafted = note_the_drops(store, cfg, cs_id, [op["id"]])
        events.changed()
        return DropNoteDone(changesets=[cs_id, *drafted.changesets], acts=drafted.acts)

    @r.get("/acts/accounts")
    def accounts() -> ActAccountsView:
        """The accounts an act can go through, each with the person's switch for letting the assistant act on it after
        their yes (the `watch.acting` setting). `sign_in` names the sign-in a signed-in account belongs to, which the
        screen starts with `acting` to ask the service for the wider access; a plain mailbox has none."""
        sign_ins = store.plugins.sign_ins()
        found = []
        for info in act_accounts.known(store, cfg):
            sign_in = sign_ins.get(act_accounts.kind_of(info.id))
            found.append(
                ActAccountView(
                    id=info.id,
                    label=info.label,
                    acting=info.acting,
                    sign_in=sign_in.name if sign_in is not None else None,
                    can_act=sign_in is None or bool(sign_in.acting_scopes),
                )
            )
        return ActAccountsView(accounts=found)

    @r.get("/acts/free-slots")
    def free_slots(about: str) -> FreeSlotsView:
        """The free times to offer when proposing another time for the calendar entry `about`: each as long as the
        entry, starting a gap in the working week, earliest first."""
        found = propose_times.slots(store.read(), cfg, worker.now(), about)
        return FreeSlotsView(slots=[FreeSlotView(start=s.start.isoformat(), end=s.end.isoformat()) for s in found])

    @r.post("/acts")
    def draft(body: ActDraftIn) -> ActView:
        """The person drafts an act, applied as theirs with the account and channel chosen as the engine does: the
        account named, else the one the message or invitation came in on. Acting off for the account makes it a Copy
        act (`copied_because`). Nothing is sent. A draft its channel can't carry (proposing a time through a plain
        mailbox, a move the channel doesn't do) is refused with the reason."""
        view = store.read()
        what = body.action or ACT_ACTIONS[body.kind][0]
        account = body.account
        if account is None:
            ids = [body.in_reply_to] if what in ACT_REPLY_ACTIONS and body.in_reply_to else list(body.about)
            came_in = {a.lower(): a for rid in ids if (a := act_accounts.of_record(view, store, cfg, rid))}
            if len(came_in) > 1:
                raise HTTPException(status_code=409, detail="These came in on different accounts; draft one for each.")
            account = next(iter(came_in.values()), None)
            if account is None and what in ("send", "create"):
                account = act_accounts.last_picked(view)
        if body.answer == "propose" and account is not None and act_accounts.kind_of(account) == act_accounts.MAILBOX:
            raise HTTPException(status_code=409, detail=NO_PROPOSE)
        recipients = [r.model_dump(mode="json", exclude_none=True) for r in body.recipients]
        if body.kind == "message" and not recipients and what in ("reply", "reply_all") and body.in_reply_to:
            recipients = reply_recipients.of_message(ws, view, cfg, body.in_reply_to, what)
        target = {
            "kind": body.kind,
            "action": body.action,
            "recipients": recipients,
            "about": body.about,
            "folder": body.folder,
            "label": body.label,
            "folder_name": folder_lists.named(account, "folder", body.folder, worker.now())
            if body.kind == "mailbox"
            else None,
            "label_name": folder_lists.named(account, "label", body.label, worker.now())
            if body.kind == "mailbox"
            else None,
            "answer": body.answer,
            "proposed_start": body.proposed_start,
            "proposed_end": body.proposed_end,
            "calendar": body.calendar or (OWN_CALENDAR if body.kind == "calendar" and what == "create" else None),
            "when": body.when,
            "start": body.start,
            "end": body.end,
            "title": body.title,
            "alarm_minutes": body.alarm_minutes,
        }
        carrier = serving(account, body.kind, what) if account else None
        op: dict[str, Any] = {
            "op": "act.draft",
            "channel": carrier[0] if carrier else COPY.name,
            "target": {k: v for k, v in target.items() if v not in (None, [])},
            "parts": body.parts,
        }
        if account:
            op["account"] = account
        if body.in_reply_to:
            op["in_reply_to"] = body.in_reply_to
        try:
            ActDraftOp.model_validate(op)
        except ValidationError as err:
            # The rule's own words ("a move names the folder"), never the raw input the validator echoes.
            said = "; ".join(str(e["msg"]).removeprefix("Value error, ") for e in err.errors())
            raise HTTPException(status_code=409, detail=said) from None
        cs = guard(lambda: apply_as_person(store, cfg, [op], "Drafted an act"))
        events.changed()
        made = store.read().get("changeset", cs).data["ops"][0]["records"][0]["id"]
        return view_of(need(made))

    @r.get("/acts")
    def list_acts(
        status: Annotated[list[str] | None, Query()] = None, limit: Annotated[int | None, Query(ge=1)] = None
    ) -> ActListView:
        """The acts, newest first; with `status` (repeat it for several), only those in one of those states (Waiting to
        go out reads draft, approved, stale, failed and uncertain), and with `limit`, at most that many."""
        found = [a for a in store.read().list("act") if not status or a.data["status"] in status]
        found.sort(key=lambda a: int(a.id.rpartition("-")[2]), reverse=True)
        return ActListView(acts=[view_of(a) for a in found[:limit]])

    @r.get("/acts/{act_id}")
    def read_act(act_id: str) -> ActView:
        """One act: its exact content and target, the fingerprint a yes would cover and the recipients called out."""
        return view_of(need(act_id))

    @r.post("/acts/{act_id}/approve")
    def approve(act_id: str, body: ActApproveIn) -> ActResultView:
        """The person's yes on this exact act: the fingerprint their screen showed and the recipients called out they
        acknowledged. Nothing is sent. A different fingerprint, or a recipient not acknowledged, is refused."""
        need(act_id)
        op = {"op": "act.approve", "id": act_id, "fingerprint": body.fingerprint, "acknowledged": body.acknowledged}
        cs = guard(lambda: apply_as_person(store, cfg, [op], "Said yes to an act"))
        events.changed()
        return ActResultView(id=act_id, status=status_of(act_id), changeset=cs)

    @r.post("/acts/{act_id}/withdraw")
    def withdraw(act_id: str) -> ActResultView:
        """Take an act back: it will not go. Undo brings it back as it was."""
        need(act_id)
        cs = guard(lambda: apply_as_person(store, cfg, [{"op": "act.withdraw", "id": act_id}], "Took an act back"))
        events.changed()
        return ActResultView(id=act_id, status=status_of(act_id), changeset=cs)

    @r.post("/acts/{act_id}/send")
    def send(act_id: str, body: ActApproveIn) -> ActResultView:
        """Approve and send in one, after the yes. An act already approved is sent as it stands, and only when the
        fingerprint named is the one the yes covers. The publisher checks again at send time."""
        found = need(act_id)
        cs: str | None = None
        if found.data["status"] != "approved":
            op = {"op": "act.approve", "id": act_id, "fingerprint": body.fingerprint, "acknowledged": body.acknowledged}
            cs = guard(lambda: apply_as_person(store, cfg, [op], "Said yes to an act"))
        elif found.data["approved"]["fingerprint"] != body.fingerprint:
            raise HTTPException(status_code=409, detail="This act is different from the one you were shown.")
        sent = guard(lambda: Publisher(store, cfg, now=worker.now).send(act_id))
        events.changed()
        return ActResultView(id=act_id, status=sent.status, reason=sent.reason, changeset=cs)

    @r.post("/acts/{act_id}/undo")
    def undo(act_id: str) -> ActResultView:
        """Take back a sent act where its channel can (a mailbox act, an event it created): the person's request is
        recorded as theirs, then the channel is asked once. A refusal or no answer leaves the act sent, with the reason
        on it. A sent message, or a change or answer others were told of, is refused."""
        need(act_id)
        cs = guard(lambda: apply_as_person(store, cfg, [{"op": "act.undo", "id": act_id}], "Asked to take an act back"))
        result = guard(lambda: Publisher(store, cfg, now=worker.now).undo(act_id))
        events.changed()
        return ActResultView(id=act_id, status=status_of(act_id), reason=result.reason, changeset=cs)

    @r.post("/acts/{act_id}/settle")
    def settle(act_id: str, body: ActSettleIn) -> ActResultView:
        """The person's answer for an act the app can't confirm went out (or one they carried out themselves): `sent`
        marks it sent; `again` approves it again as it is and sends it, or, when what the yes covered changed, makes it
        stale and needs a new yes. Undo takes `sent` back."""
        need(act_id)
        name = "act.confirm_sent" if body.answer == "sent" else "act.resend"
        cs = guard(lambda: apply_as_person(store, cfg, [{"op": name, "id": act_id}], "Answered about an act"))
        events.changed()
        if body.answer == "again" and status_of(act_id) == "approved":
            sent = guard(lambda: Publisher(store, cfg, now=worker.now).send(act_id))
            events.changed()
            return ActResultView(id=act_id, status=sent.status, reason=sent.reason, changeset=cs)
        return ActResultView(id=act_id, status=status_of(act_id), changeset=cs)

    return r

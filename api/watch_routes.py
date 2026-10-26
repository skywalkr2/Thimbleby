"""API routes for watched sources (design 6.4): what the assistant keeps reading, how the last read went, and
reading one now."""

from __future__ import annotations

import os
from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException

from api.schemas import (
    AutoClosedView,
    CloseKindCountView,
    CloseMeasureView,
    Created,
    HandledCounts,
    HandledDone,
    HandledView,
    IntakeSeen,
    IntakeStarted,
    IntakeUnseen,
    IntakeUnseenIn,
    LookBackIn,
    LookBackView,
    ReadVersion,
    RecordRef,
    SetAsideDone,
    SetAsideFolder,
    SetAsideIn,
    SetAsideView,
    SettingChangeView,
    SilentCloseSeen,
    SilentClosesView,
    SilentCloseView,
    SourceSecretView,
    VersionAnswerIn,
    VersionApartIn,
    VersionChosen,
    VersionFile,
    VersionLinkIn,
    VersionsView,
    VersionUndoIn,
    WatchAuthorOption,
    WatchRunView,
    WatchSourceView,
)
from engine import closes, handled, set_aside, setup, sides, source_intake, version_choices, watch
from engine import settings as settings_screens
from engine.config import Config, ConfigError, load_config
from engine.connectors import declared_reads, reads
from engine.storage import Store, StoreError, WriteContext
from engine.worker import Events, Worker
from engine.workspace import Workspace

LISTED = 50


def build_watch_router(ws: Workspace, cfg: Config, store: Store, events: Events, worker: Worker) -> APIRouter:
    r = APIRouter(prefix="/api")

    def current() -> Config:
        """The settings as the files hold them now, so a change to the public mail domains applies at once."""
        try:
            return load_config(ws.config_dir, env=dict(os.environ))
        except ConfigError:
            return cfg

    def author_names() -> dict[str, str]:
        view = store.read()
        return {
            **{p.id: p.data["full_name"] for p in view.list("person")},
            **{t.id: t.data["name"] for t in view.list("team")},
        }

    def secret_states(connector: object, settings: dict[str, object]) -> list[SourceSecretView]:
        """Where each secret setting the source has set is read from: kept by the app, or a place the person named."""
        out = []
        for field in settings_screens.secret_fields(connector.settings) if connector else []:
            at: object = settings
            for part in field.split("."):
                at = at.get(part) if isinstance(at, dict) else None
            if not isinstance(at, str) or not at:
                continue
            where, name = setup.secret_where(ws, at)
            out.append(SourceSecretView(field=field, where=where, name=name))
        return out

    def view(source: object) -> WatchSourceView:
        known = watch.connectors(store)
        connector = known.get(source.connector)
        last = watch.last_run(store, source.id)
        read = watch.last_read(store, source.id)
        failures = watch.failures_in_a_row(store, source.id)
        items = [s for s in store.read().find("snapshot", {"source": source.id}) if not s.data["gone"]]
        problem = watch.problem_text(store, source.id)
        back_to = source_intake.back_to_of(store.read(), source.id)
        return WatchSourceView(
            id=source.id,
            label=source.label or source.id,
            connector=source.connector,
            connector_label=connector.label if connector else "",
            reads=reads(source.connector, declared_reads(known)),
            enabled=source.enabled,
            every_minutes=source.every_minutes,
            author=source.author,
            author_name=author_names().get(source.author or ""),
            account=source.account,
            items=len(items),
            last=WatchRunView(
                **{
                    k: last.data.get(k)
                    for k in ("outcome", "error_kind", "error", "error_advice", "new", "changed", "removed", "unsorted")
                },
                started_at=str(last.data["started_at"]),
                retry_at=str(last.data["retry_at"]) if last.data.get("retry_at") else None,
            )
            if last
            else None,
            read_at=str(read.data["started_at"]) if read else None,
            stale=watch.stale_since(store, cfg, source, worker.now()) is not None,
            failures=failures,
            problem=problem,
            looked_back_to=back_to,
            look_back_choices=list(current().watch.look_back_choices)
            if back_to and source_intake.can_look_back(source, store)
            else [],
            secrets=secret_states(connector, source.settings),
        )

    @r.get("/watch/authors")
    def authors() -> list[WatchAuthorOption]:
        """Who a source can be credited to: the person themselves first, then colleagues, then teams."""
        me = cfg.workspace.user.person
        view = store.read()
        people = sorted(
            (p for p in view.list("person") if p.data.get("status", "active") == "active"),
            key=lambda p: p.data["full_name"].lower(),
        )
        teams = sorted(view.list("team"), key=lambda t: t.data["name"].lower())
        return [
            *[WatchAuthorOption(id=p.id, name=p.data["full_name"], kind="you") for p in people if p.id == me],
            *[WatchAuthorOption(id=p.id, name=p.data["full_name"], kind="person") for p in people if p.id != me],
            *[WatchAuthorOption(id=t.id, name=t.data["name"], kind="team") for t in teams],
        ]

    @r.get("/watch")
    def sources() -> list[WatchSourceView]:
        return [view(source) for source in cfg.watch.sources]

    @r.post("/watch/{source_id}/read")
    def read_now(source_id: str) -> WatchSourceView:
        source = next((s for s in cfg.watch.sources if s.id == source_id), None)
        if source is None:
            raise HTTPException(status_code=404, detail=f"there is no source {source_id}")
        try:
            result = watch.refresh(ws, store, cfg, source_id)
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        if result.new or result.changed or result.removed or result.taken_in:
            worker.poke()
        return view(source)

    def need_source(source_id: str) -> None:
        if not any(s.id == source_id for s in cfg.watch.sources):
            raise HTTPException(status_code=404, detail=f"there is no source {source_id}")

    @r.post("/watch/{source_id}/intake/go")
    def intake_go(source_id: str) -> IntakeStarted:
        """The person's go for a newly added source's intake: the mail waiting for sorting is sorted, then every request
        held for the go starts."""
        need_source(source_id)
        try:
            started = source_intake.grant_go(ws, store, current(), source_id)
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        if started:
            worker.poke()
            events.changed()
        return IntakeStarted(started=started)

    @r.post("/watch/{source_id}/intake/seen")
    def intake_seen(source_id: str) -> IntakeSeen:
        """The person opened the list of what the intake found: its results show on Today one by one again if they
        still need a look. Undo is POST /api/watch/{source_id}/intake/unseen."""
        need_source(source_id)
        marked = source_intake.mark_seen(store, source_id)
        if marked:
            events.changed()
        return IntakeSeen(requests=marked)

    @r.post("/watch/{source_id}/intake/unseen")
    def intake_unseen(source_id: str, body: IntakeUnseenIn) -> IntakeUnseen:
        """Undo marking the intake seen: the results are one line on Today again."""
        need_source(source_id)
        restored = source_intake.mark_unseen(store, body.requests)
        if restored:
            events.changed()
        return IntakeUnseen(restored=restored)

    def look_back_view(found: source_intake.LookBack) -> LookBackView:
        return LookBackView(**vars(found))

    @r.get("/watch/{source_id}/look-back")
    def look_back_preview(source_id: str, days: int) -> LookBackView:
        """What looking `days` further back would take in and about what it would cost, and whether the source holds
        mail that far back. Writes nothing."""
        need_source(source_id)
        try:
            return look_back_view(source_intake.look_back_preview(ws, store, current(), source_id, days))
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None

    @r.post("/watch/{source_id}/look-back")
    def look_back(source_id: str, body: LookBackIn) -> LookBackView:
        """Look further back: the older mail the source already returned is taken in the same quiet way as its first
        read, under the same go rules, and the day it was looked back to moves."""
        need_source(source_id)
        try:
            found = source_intake.look_further_back(ws, store, current(), source_id, body.days)
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        if found.taken:
            worker.poke()
            events.changed()
        return look_back_view(found)

    @r.get("/auto-closed")
    def auto_closed() -> list[AutoClosedView]:
        view = store.read()
        labels = {s.id: s.label or s.id for s in cfg.watch.sources}
        closed = [q for q in view.list("request") if q.data.get("auto_closed")]
        closed.sort(key=lambda q: str(q.data["created_at"]), reverse=True)
        out = []
        for q in closed[:LISTED]:
            source = view.get("source", q.data["source"]) if q.data.get("source") else None
            watched = (source.data.get("watched") if source else None) or {}
            out.append(
                AutoClosedView(
                    id=q.id,
                    version=q.version,
                    title=source.data["title"] if source else q.id,
                    source=labels.get(watched.get("source", ""), watched.get("source", "")),
                    change=watched.get("change", "new"),
                    rule=q.data["auto_closed"]["rule"],
                    reason=q.data["auto_closed"]["reason"],
                    created_at=str(q.data["created_at"]),
                )
            )
        return out

    @r.get("/silent-closes")
    def silent_closes() -> SilentClosesView:
        """The closes nobody has seen (a rule's, the set-aside sorting's, the assistant's own drops and closes) in the
        configured quality window, newest first, and the measure: silent closes out of all closes."""
        view = store.read()
        until = worker.now()
        days = current().dispatch.knowledge.quality_window_days
        since = until - timedelta(days=days)
        found = closes.silent(view, since)
        measure = closes.measure(view, since)
        said = handled.declared(store)
        return SilentClosesView(
            count=len(found),
            closes=[
                SilentCloseView(
                    ref=c.ref,
                    kind=c.kind,
                    how=c.how,
                    title=c.title,
                    when=c.when,
                    why=c.why,
                    rule=c.rule,
                    run=c.run,
                    request=c.request,
                    changeset=c.changeset,
                    snapshot=c.snapshot,
                    record=RecordRef(kind=c.record[0], id=c.record[1]) if c.record else None,
                    item=handled.item_of_close(view, cfg, said, c),
                )
                for c in found
            ],
            measure=CloseMeasureView(
                days=days,
                since=since.isoformat(),
                until=until.isoformat(),
                total=measure.total,
                silent=measure.silent,
                by_person=measure.by_person,
                approved=measure.approved,
                rate=measure.rate,
                kinds=[
                    CloseKindCountView(kind=kind, total=count.total, silent=count.silent)
                    for kind, count in measure.by_kind.items()
                ],
            ),
        )

    @r.post("/silent-closes/seen")
    def silent_close_seen(body: SilentCloseSeen) -> Created:
        """The person saw a close and it stands. A rule's close is marked as seen; the assistant's is approved by
        looking over its change. Mail set aside is confirmed in its folder instead."""
        try:
            closes.mark_seen(store, body.ref)
        except closes.ReviewElsewhere as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        except StoreError as err:
            raise HTTPException(status_code=404, detail=str(err)) from None
        events.changed()
        return Created(id=body.ref)

    @r.post("/watch/{source_id}/recent")
    def recent(source_id: str) -> WatchSourceView:
        """Hand the assistant what the source holds from the recent past or near future that it hasn't seen yet (the
        last day's mail, today's meetings), after a first read that only noted what was there."""
        source = next((s for s in cfg.watch.sources if s.id == source_id), None)
        if source is None:
            raise HTTPException(status_code=404, detail=f"there is no source {source_id}")
        try:
            made = watch.hand_in_recent(ws, store, cfg, source_id)
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        if made:
            worker.poke()
        return view(source)

    @r.post("/requests/{request_id}/closer-look")
    def closer_look(request_id: str, body: ReadVersion) -> Created:
        """Hand in a change a triage rule closed after all; the correction is kept so rules can be tuned."""
        from engine.dispatcher import signal

        current = store.read().get("request", request_id)
        if current is None or not current.data.get("auto_closed"):
            raise HTTPException(status_code=404, detail="That isn't something a rule closed.")
        try:
            with store.transaction() as tx:
                tx.update(
                    "request",
                    request_id,
                    {"state": "queued", "waiting": "With the assistant, starting now", "auto_closed": None},
                    WriteContext("pm", "trusted", "triage.closer_look"),
                    read_version=body.read_version,
                )
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        rule = current.data["auto_closed"]["rule"]
        signal(store, "pulled_back", [request_id], f"Closed by {rule}: {current.data['auto_closed']['reason']}")
        _show_again(request_id)
        events.changed()
        worker.poke()
        return Created(id=request_id)

    @r.post("/requests/{request_id}/closer-look/undo")
    def closer_look_undo(request_id: str) -> Created:
        """Undo Take a closer look on a change a rule closed, while the assistant hasn't started on it."""
        try:
            closes.take_back_closer_look(store, request_id)
        except closes.NotAClose as err:
            raise HTTPException(status_code=404, detail=str(err)) from None
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        return Created(id=request_id)

    def _show_again(request_id: str) -> None:
        """A mail item handed in after all shows in Today's list of what came in again."""
        with store.transaction() as tx:
            request = tx.get("request", request_id)
            source = tx.get("source", request.data["source"]) if request and request.data.get("source") else None
            watched = (source.data.get("watched") if source else None) or {}
            for snap in tx.find("snapshot", {"source": watched.get("source", ""), "key": watched.get("key", "")}):
                if snap.data.get("closed_by"):
                    tx.update(
                        "snapshot",
                        snap.id,
                        {"closed_by": None},
                        WriteContext("pm", "trusted", "triage.closer_look"),
                        read_version=snap.version,
                    )

    # ---- mail set aside as not work ---------------------------------------------------------------------------

    def folder_view() -> SetAsideFolder:
        set_aside.purge_due(ws, store, cfg)
        return SetAsideFolder(
            items=[SetAsideView(**row) for row in set_aside.folder(ws, store, current())],
            deleted=set_aside.deleted_count(store),
        )

    @r.get("/set-aside")
    def set_aside_folder() -> SetAsideFolder:
        """The Set aside folder: mail kept away from the assistant, in two sections, newest first."""
        return folder_view()

    def mail_snapshot(snapshot_id: str):
        found = store.read().get("snapshot", snapshot_id)
        if found is None or not found.data.get("message") or found.data.get("deleted"):
            raise HTTPException(status_code=404, detail="That isn't a message the app is holding.")
        return found

    def done(snapshot_id: str, section: str) -> SetAsideDone:
        snap = store.read().get("snapshot", snapshot_id)
        address = set_aside.address_of(snap, ws)
        return SetAsideDone(
            id=snapshot_id,
            version=snap.version,
            section=section,
            address=address,
            domain=set_aside.offerable_domain(address, current()),
        )

    @r.post("/mail/{snapshot_id}/set-aside")
    def set_aside_mail(snapshot_id: str, body: SetAsideIn) -> SetAsideDone:
        """Move a mail item to the Set aside folder, as personal or sales mail, and close its request if one is
        waiting for the assistant."""
        from engine.dispatcher import signal

        mail_snapshot(snapshot_id)
        try:
            closed = set_aside.set_aside_item(store, snapshot_id, body.section)
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        result = done(snapshot_id, body.section)
        note = body.section + (", with a sorting rule offered for the sender" if result.address else "")
        signal(store, "set_aside", closed or [snapshot_id], note)
        events.changed()
        return result

    def hand_in_aside(snapshot_id: str, read_version: int, *, personal: bool) -> tuple[str | None, dict]:
        """Take a set-aside mail out of the folder and hand it in (filed under the Personal project when `personal`).
        Returns the request that is waiting and the mark it had."""
        snap = mail_snapshot(snapshot_id)
        mark = snap.data.get("set_aside")
        if not mark:
            raise HTTPException(status_code=404, detail="That isn't set aside.")
        if snap.version != read_version:
            raise HTTPException(status_code=409, detail="That message changed. Look at the folder again.")
        home = None
        if personal:
            home = sides.personal_project(store.read(), current())
            if home is None:
                raise HTTPException(status_code=409, detail="There is no Personal project to file it under.")
        try:
            waiting = set_aside.put_back(ws, store, cfg, snapshot_id, hand_in=True)
            if waiting and home:
                with store.transaction() as tx:
                    req = tx.get("request", waiting)
                    if req is not None and not req.data.get("project"):
                        tx.update(
                            "request",
                            waiting,
                            {"project": home},
                            WriteContext(actor="pm", trust="trusted", op="set_aside.personal"),
                            read_version=req.version,
                        )
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        return waiting, mark

    @r.post("/set-aside/{snapshot_id}/work")
    def set_aside_is_work(snapshot_id: str, body: ReadVersion) -> SetAsideDone:
        """This is work: hand the message in after all, as Take a closer look does, and keep the correction."""
        from engine.dispatcher import signal

        waiting, mark = hand_in_aside(snapshot_id, body.read_version, personal=False)
        signal(store, "pulled_back", [waiting or snapshot_id], f"Set aside: {mark['reason']}")
        events.changed()
        worker.poke()
        return done(snapshot_id, mark["section"])

    @r.post("/set-aside/{snapshot_id}/personal")
    def set_aside_is_personal(snapshot_id: str, body: ReadVersion) -> SetAsideDone:
        """Treat as personal: hand the message in after all, to be read for the Personal project, and keep the
        correction."""
        from engine.dispatcher import signal

        waiting, mark = hand_in_aside(snapshot_id, body.read_version, personal=True)
        signal(store, "pulled_back", [waiting or snapshot_id], f"Set aside: {mark['reason']}; treated as personal")
        events.changed()
        worker.poke()
        return done(snapshot_id, mark["section"])

    # ---- Handled for you: mail set aside and mail read with nothing to do (design 7.20) -------------------------

    @r.get("/handled")
    def handled_list(
        tab: Literal["set_aside", "closed", "read"] = "set_aside",
        group: Literal["reason", "sender"] | None = None,
        q: str = "",
        item: Literal["mail", "calendar", "file", "page", "action", "question", "other"] | None = None,
    ) -> HandledView:
        """One of the three lists of what was handled for the person, in groups: by reason or by sender (the
        configured grouping when none is asked for), newest first, narrowed by the words of `q` and by the kind of
        item, with the counts of all three lists."""
        set_aside.purge_due(ws, store, cfg)
        config = current()
        found = handled.listing(ws, store, config, tab, group or config.ui.handled_group, q.strip(), worker.now(), item)
        return HandledView.model_validate(found)

    @r.get("/handled/counts")
    def handled_counts() -> HandledCounts:
        """How many each of the three lists holds, for a line that only counts."""
        return HandledCounts.model_validate(handled.counts(ws, store, current(), worker.now()))

    def handled_done(snapshot_id: str, request: str | None = None) -> HandledDone:
        snap = store.read().get("snapshot", snapshot_id)
        address = set_aside.address_of(snap, ws)
        mark = snap.data.get("set_aside") or {}
        return HandledDone(
            id=snapshot_id,
            version=snap.version,
            section=mark.get("section") or current().watch.handled_rule_section,
            request=request,
            address=address,
            domain=set_aside.offerable_domain(address, current()),
        )

    def handled_choice(snapshot_id: str, read_version: int, *, personal: bool) -> HandledDone:
        """Treat as work or as personal for a mail on either list: a set-aside mail is handed in after all; a mail
        the assistant read with nothing to do is read again, filed under Personal when asked. Either records a
        correction."""
        from engine.dispatcher import signal

        snap = mail_snapshot(snapshot_id)
        if snap.data.get("set_aside"):
            waiting, mark = hand_in_aside(snapshot_id, read_version, personal=personal)
            note = f"Set aside: {mark['reason']}" + ("; treated as personal" if personal else "")
            signal(store, "pulled_back", [waiting or snapshot_id], note)
            events.changed()
            worker.poke()
            return handled_done(snapshot_id, waiting)
        if snap.version != read_version:
            raise HTTPException(status_code=409, detail="That message changed. Look at the list again.")
        home = None
        if personal:
            home = sides.personal_project(store.read(), current())
            if home is None:
                raise HTTPException(status_code=409, detail="There is no Personal project to file it under.")
        try:
            made = handled.treat_read(ws, store, cfg, snapshot_id, project=home)
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        worker.poke()
        return handled_done(snapshot_id, made)

    @r.post("/handled/{snapshot_id}/work")
    def handled_work(snapshot_id: str, body: ReadVersion) -> HandledDone:
        """Treat as work: a set-aside mail is handed in after all; a mail read with nothing to do is read again."""
        return handled_choice(snapshot_id, body.read_version, personal=False)

    @r.post("/handled/{snapshot_id}/personal")
    def handled_personal(snapshot_id: str, body: ReadVersion) -> HandledDone:
        """Treat as personal: as Treat as work, filed under the Personal project."""
        return handled_choice(snapshot_id, body.read_version, personal=True)

    @r.post("/handled/{snapshot_id}/undo")
    def handled_undo(snapshot_id: str, body: ReadVersion) -> HandledDone:
        """Undo Treat as work or Treat as personal on a mail read with nothing to do, while the assistant hasn't
        started on it: the mail is listed as read with nothing to do again."""
        snap = mail_snapshot(snapshot_id)
        if snap.version != body.read_version:
            raise HTTPException(status_code=409, detail="That message changed. Look at the list again.")
        try:
            handled.take_back_read(store, snapshot_id)
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        return handled_done(snapshot_id)

    # ---- files that are one document -----------------------------------------------------------------------------

    def versions_of(record_id: str) -> version_choices.Offer:
        found = version_choices.offer(store.read(), current(), record_id)
        if found.file is None:
            raise HTTPException(status_code=404, detail="That isn't a file in a watched folder.")
        return found

    def chosen(made: version_choices.Changed | list[dict], **more: str | None) -> VersionChosen:
        events.changed()
        worker.poke()
        changes = made.changes if isinstance(made, version_choices.Changed) else made
        return VersionChosen(changes=[SettingChangeView(**c) for c in changes], **more)

    @r.get("/versions/{record_id}")
    def versions_view(record_id: str) -> VersionsView:
        """What the person can say about a watched file: the files it can be linked to, and whether it can be split."""
        found = version_choices.offer(store.read(), current(), record_id)
        if found.file is None:
            return VersionsView(applicable=False)
        titles = {c.key: c.title for c in found.others}
        return VersionsView(
            applicable=True,
            file=found.file.title,
            others=[VersionFile(key=c.key, title=c.title) for c in found.others],
            can_split=found.can_split,
            family=[VersionFile(key=k, title=titles.get(k, k)) for k in found.family],
        )

    @r.post("/versions/{record_id}/same")
    def versions_same(record_id: str, body: VersionLinkIn) -> VersionChosen:
        """Same document as another file of the folder: the two (and the documents their names belong to) are one."""
        versions_of(record_id)
        try:
            made = version_choices.link(
                ws, current(), store, record_id, body.other, now=worker.now(), env=dict(os.environ)
            )
        except settings_screens.SettingsConflict as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        except StoreError as err:
            raise HTTPException(status_code=400, detail=str(err)) from None
        return chosen(made)

    @r.post("/versions/{record_id}/apart")
    def versions_apart(record_id: str, body: VersionApartIn) -> VersionChosen:
        """Not the same document: the file stands on its own. With the change a rule closed as an older version, that
        change is handed in after all."""
        versions_of(record_id)
        reopened = False
        try:
            if body.request and body.read_version:
                version_choices.reopen(store, body.request, body.read_version)
                reopened = True
            made = version_choices.split(
                ws, current(), store, record_id, now=worker.now(), closed=body.request, env=dict(os.environ)
            )
        except (settings_screens.SettingsError, StoreError) as err:
            if reopened:
                closes.take_back_closer_look(store, body.request)
            raise HTTPException(status_code=409, detail=str(err)) from None
        if body.request:
            _show_again(body.request)
        return chosen(made, request=body.request)

    @r.post("/versions/answer/{question_id}")
    def versions_answer(question_id: str, body: VersionAnswerIn) -> VersionChosen:
        """The answer to "Which copy is the current one?": the copy named is kept as the current one."""
        from engine.dispatcher import signal

        try:
            made = version_choices.keep_answer(ws, current(), store, question_id, body.file, env=dict(os.environ))
        except settings_screens.SettingsConflict as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        except StoreError as err:
            raise HTTPException(status_code=400, detail=str(err)) from None
        signal(store, "answered_assistant", [question_id], f"Chose {body.file} as the current copy", worker.now())
        return chosen(made, asked=question_id)

    @r.post("/versions/undo")
    def versions_undo(body: VersionUndoIn) -> VersionChosen:
        """Undo a choice about versions: the settings go back as they were, a change handed in after all is set aside
        again while the assistant hasn't started on it, and an answered question is open again."""
        try:
            if body.request:
                closes.take_back_closer_look(store, body.request)
            put = version_choices.undo(
                ws, current(), store, [c.model_dump() for c in body.changes], env=dict(os.environ)
            )
            if body.asked:
                version_choices.reopen_question(store, body.asked)
        except settings_screens.SettingsConflict as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        except closes.NotAClose as err:
            raise HTTPException(status_code=404, detail=str(err)) from None
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        return chosen(put)

    @r.post("/set-aside/{snapshot_id}/put-back")
    def set_aside_put_back(snapshot_id: str, body: ReadVersion) -> SetAsideDone:
        """Undo a set-aside the person made by hand: the message and its request go back as they were."""
        snap = mail_snapshot(snapshot_id)
        if snap.version != body.read_version:
            raise HTTPException(status_code=409, detail="That message changed. Look at it again.")
        mark = snap.data.get("set_aside") or {}
        try:
            set_aside.put_back(ws, store, cfg, snapshot_id, hand_in=False)
        except StoreError as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        events.changed()
        worker.poke()
        return done(snapshot_id, mark.get("section", "sales"))

    return r

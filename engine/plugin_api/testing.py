"""Testing a plugin: part of the plugin API, for plugins' own tests. A connector or a channel without a network
(`connector_context`, `channel_context`, `read`), everything else in a throwaway workspace (`plugin_workspace`), and a
packet function's context from one (`packet_context`).

    from engine.plugin_api.testing import Reply, connector_context, read

    def service(asked):
        if asked.path == "/v1/changes":
            return Reply(json={"items": [...], "next": "m2"})
        return Reply(status=404)

    context = connector_context(service, network=["api.example.com"], secrets={"client-id": "x"},
                                tokens={"myplugin/account": "token"})
    poll = read(my_poll, MySettings(), {}, context)

`service(asked)` answers every request the connector makes through `context.web`: `asked` has the method, url,
path (decoded; `raw_path` as sent), query (a dict of lists, blank values kept; `param(name)` gives the first value),
headers and body (text, and `form` / `json()` parsed). A `Reply()` with neither `json` nor `text` has an empty body;
answer `Reply(json={})` for a service that answers an empty JSON object. Only hosts in `network` are reached, over
HTTPS, as in the app. `secrets` answers `context.secret(name)` and records `context.keep_secret`; `tokens` answers
`context.access_token(name)`, and a sign-in missing from it raises `ConnectorError("auth")` as an expired sign-in
does; `account` is what `context.account` says, the address of the account the source reads with (left out, None);
`granted` answers `context.granted(name)` with each sign-in's allowed scopes (left out, `context.granted` is
None, as for a connector of a plugin with no sign-ins). `read` runs `poll` and checks its answer the way the
watcher does.
"""

from __future__ import annotations

import json as jsonlib
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlsplit

import httpx

from engine.channels import ChannelContext
from engine.connectors import ConnectorContext, ConnectorError, Poll, checked_poll
from engine.storage import StoreError

__all__ = [
    "Asked",
    "Reply",
    "connector_context",
    "channel_context",
    "read",
    "plugin_workspace",
    "packet_context",
    "PluginWorkspace",
    "Outcome",
    "GroupDone",
    "AskResult",
    "ActionResult",
    "PluginDidNotStart",
    "PluginState",
    "SavedWorkspace",
]


@dataclass(frozen=True)
class Asked:
    """One request a connector made."""

    method: str
    url: str
    path: str
    query: dict[str, list[str]]
    headers: dict[str, str]
    body: str
    raw_path: str = ""

    def param(self, name: str, default: str | None = None) -> str | None:
        """The first value of a query parameter, or `default` when it isn't there."""
        values = self.query.get(name)
        return values[0] if values else default

    @property
    def form(self) -> dict[str, list[str]]:
        """A form body, parsed, blank values kept."""
        return parse_qs(self.body, keep_blank_values=True)

    def json(self) -> Any:
        return jsonlib.loads(self.body) if self.body else None


@dataclass(frozen=True)
class Reply:
    """An answer: a status, and a JSON value or text, with headers (a Retry-After, say)."""

    status: int = 200
    json: Any = None
    text: str | None = None
    headers: dict[str, str] = field(default_factory=dict)


def _web(service: Callable[[Asked], Reply], network: list[str]) -> Any:
    """A web client limited to `network` whose requests are answered by `service`."""
    from engine.net import WebClient

    def answer(request: httpx.Request) -> httpx.Response:
        parts = urlsplit(str(request.url))
        asked = Asked(
            request.method,
            str(request.url),
            unquote(parts.path),
            parse_qs(parts.query, keep_blank_values=True),
            dict(request.headers),
            request.content.decode("utf-8", errors="replace"),
            parts.path,
        )
        reply = service(asked)
        if not isinstance(reply, Reply):
            raise TypeError("the service function answers with a Reply")
        if reply.json is not None:
            return httpx.Response(reply.status, json=reply.json, headers=reply.headers)
        return httpx.Response(reply.status, text=reply.text or "", headers=reply.headers)

    return WebClient(list(network), transport=httpx.MockTransport(answer))


def connector_context(
    service: Callable[[Asked], Reply],
    *,
    network: list[str],
    secrets: dict[str, str] | None = None,
    tokens: dict[str, str] | None = None,
    granted: dict[str, set[str]] | None = None,
    account: str | None = None,
    workspace_root: Path | str = ".",
) -> ConnectorContext:
    """A connector's context whose web client is answered by `service`. `kept` secrets land in `secrets`."""
    kept = secrets if secrets is not None else {}
    signed_in = dict(tokens or {})
    allowed = {name: set(scopes) for name, scopes in (granted or {}).items()}

    def access_token(name: str) -> str:
        if name not in signed_in:
            raise ConnectorError("auth", f"Sign in to {name} first.")
        return signed_in[name]

    return ConnectorContext(
        workspace_root=Path(workspace_root),
        web=_web(service, network),
        secret=kept.get,
        keep_secret=kept.__setitem__,
        access_token=access_token,
        granted=(lambda name: set(allowed.get(name, set()))) if granted is not None else None,
        account=account,
    )


def channel_context(
    service: Callable[[Asked], Reply],
    *,
    network: list[str],
    account: str | None = None,
    token: str | None = None,
    granted: set[str] | frozenset[str] | None = None,
) -> ChannelContext:
    """A channel's context whose web client is answered by `service`, as in `connector_context`: only hosts in
    `network` are reached. `account` is the act's account id, `token` what `access_token()` gives (None, as for a plain
    mailbox, when left out) and `granted` the scopes the account's sign-in holds.

        context = channel_context(service, network=["api.example.com"], account="myplugin/signin:me@example.com",
                                  token="token", granted={"Mail.Send"})
        answer = my_send(act, "attempt-key", context)
    """
    return ChannelContext(
        web=_web(service, network),
        access_token=lambda: token,
        account=account,
        granted=frozenset(granted or ()),
    )


def read(poll: Callable[..., Poll], settings: Any, state: dict[str, Any] | None, context: ConnectorContext) -> Poll:
    """Run a connector's `poll` and check its answer as the watcher does. A ConnectorError passes through."""
    return checked_poll(poll(settings, dict(state or {}), context))


# ---- a throwaway workspace with the plugin loaded --------------------------------------------------------------------


@dataclass(frozen=True)
class Outcome:
    """What became of a changeset: its id, its `status` (applied, held, rejected) and one entry per op (`op`,
    `status` applied/held/refused, `reason`). `refused` lists the reasons of the refused ops; `problems` are those of
    the changeset as a whole."""

    changeset: str
    status: str
    ops: list[dict[str, Any]]
    problems: list[dict[str, Any]]

    @property
    def applied(self) -> list[dict[str, Any]]:
        return [o["op"] for o in self.ops if o.get("status") == "applied"]

    @property
    def held(self) -> list[dict[str, Any]]:
        return [o["op"] for o in self.ops if o.get("status") == "held"]

    @property
    def refused(self) -> list[str]:
        return [str(o.get("reason") or "") for o in self.ops if o.get("status") == "refused"]

    @property
    def groups(self) -> list[dict[str, Any]]:
        """The groups the task kind gave its answer (`task_kind(groups=...)`), as the review lists them: each a dict
        with `id`, `label`, `ops` (their indexes) and how many of them are `applied`, `held`, `refused` and `undone`.
        Empty when the answer wasn't grouped."""
        from engine.answer_groups import groups_of

        return [dict(vars(group)) for group in groups_of(self.ops)]


@dataclass(frozen=True)
class GroupDone:
    """What keeping or dropping a group (or releasing all) did: the answer as it stands after (`outcome`), the ops
    `released`, `restored` (undone) and `declined` (held ops kept as they were), and `skipped`: ops left as they were,
    each a dict with `ops` and a plain `reason`."""

    outcome: Outcome
    released: list[int]
    restored: list[int]
    declined: list[int]
    skipped: list[dict[str, Any]]


@dataclass(frozen=True)
class AskResult:
    """A run of a task kind: the request's `state` (review: the answer waits for the person; needs_you: it was held,
    with `waiting` saying why) and the `outcome` of its changeset, when there is one."""

    request: str
    state: str
    waiting: str | None
    outcome: Outcome | None


@dataclass
class ActionResult:
    """A person action's proposal as the review shows it: `summary`, and `topic`, the few words that name it for the
    item's title (empty when the action gave none); `ops`, the ops it would apply, as dicts; `notes`, what the person
    should know; `items`, the changes the person keeps or drops, each a dict with `id`, `label`, `group` (the id of the
    group it sits under, or None), `kept` (the tick the review starts with) and `ops`; `groups`, the headings that
    gather choices and items, each a dict with `id`, `heading` and `explanation`; `requests`, the work it would queue,
    each a dict with `id`, `task`, `about` ({"kind", "id"}, or {"op"} or {"item"} for a record the proposal makes, or
    None), `note`, `part`, `tag`, `group` and `kept` (the tick it starts with); and `problems`, why ops outside the
    items would be refused if applied now. `apply(kept=..., requests=...)` applies it as the person would."""

    summary: str
    ops: list[dict[str, Any]]
    notes: list[str]
    items: list[dict[str, Any]]
    requests: list[dict[str, Any]]
    problems: list[str]
    _apply: Callable[..., Outcome]
    topic: str = ""
    groups: list[dict[str, Any]] = field(default_factory=list)

    def apply(self, kept: Mapping[str, bool] | None = None, requests: Sequence[int | str] | None = None) -> Outcome:
        """Apply the proposal as the person would (their own change, actor `pm`) and say what became of each op.

        `kept` maps an item's id to True (keep) or False (drop): the ticks the person sets on the review. An item left
        out keeps the tick it came with (`kept` on the item); an id that names no item raises StoreError, as it does on
        screen. With no `kept`, the proposal applies as it was proposed.

        `requests` names the requests to keep, each by its position in `requests` or by its id; the others are dropped
        as they are on screen, and nothing is queued for them. One that names no request raises StoreError. With no
        `requests`, every request keeps the tick it came with."""
        return self._apply(dict(kept) if kept is not None else None, list(requests) if requests is not None else None)


class PluginDidNotStart(RuntimeError):
    """A plugin given to `plugin_workspace` didn't start: `plugin` names it and `reason` says why, as its status on
    the Add-ons screen would."""

    def __init__(self, plugin: str, reason: str):
        super().__init__(f"the plugin {plugin} didn't start: {reason}")
        self.plugin, self.reason = plugin, reason


@dataclass(frozen=True)
class PluginState:
    """A plugin's status as the host keeps it: `state` (enabled, disabled, off), the `reason` it is off, `notes`
    (problems it was told about) and its declared programs' `tools` status."""

    state: str
    reason: str | None
    notes: list[str]
    tools: dict[str, str]


@dataclass(frozen=True)
class SavedWorkspace:
    """A workspace saved with `ws.save()`, to start tests from fresh copies of: `plugin_workspace(...,
    from_saved=saved)`."""

    path: Path


class PluginWorkspace:
    """A throwaway workspace (the fictional demo's data) with the plugins loaded, for a plugin's own tests. Use it
    through `plugin_workspace(...)`. Everything here goes through the same paths as the app: the applier, the
    dispatcher with a scripted answer, person actions, events, stage moves and the synced folder's layout.

    Its attributes: `root` (the workspace folder), `plugins` (the names of the plugins given, in order) and `cfg`
    (the workspace's settings as loaded). `store` and `ws` are the host's own objects: reach them only where no
    method here covers a test, since they change with the host.

    Opening a workspace runs the core's list setup, as the app does when it starts: the value lists the core and the
    started plugins declare exist in it (with their values and any a record already holds), so a test needn't create
    them before a record that takes its values from one."""

    def __init__(
        self,
        root: Path,
        folders: tuple[str | Path, ...],
        settings: dict[str, dict[str, Any]] | None,
        *,
        from_saved: SavedWorkspace | None = None,
        require_started: bool = True,
    ):
        import shutil

        import yaml

        from engine.cli import add_plugin
        from engine.config import load_config
        from engine.shipped import demo
        from engine.storage import Store
        from engine.workspace import Workspace, init_workspace
        from engine.yaml_load import load_yaml

        if from_saved is not None:
            shutil.copytree(from_saved.path, root, symlinks=True)
            self.ws = Workspace(root)
            self.plugins = list(load_yaml((root / ".plugin-workspace.yaml").read_text(encoding="utf-8")))
            self.cfg = load_config(self.ws.config_dir, env={})
            self.store = Store(self.ws.db_path, cfg=self.cfg)
            self._check_started(require_started)
            self._set_up_lists()
            return
        self.ws = init_workspace(root, template=demo("demo-b"), git=False)
        storage_path = self.ws.config_dir / "storage.yaml"
        storage = load_yaml(storage_path.read_text(encoding="utf-8")) or {}
        storage.setdefault("backups", {})["automatic"] = False
        storage_path.write_text(yaml.safe_dump(storage), encoding="utf-8")
        self.plugins = [add_plugin(self.ws, str(folder)) for folder in folders]
        for name, values in (settings or {}).items():
            (self.ws.config_dir / "plugins").mkdir(exist_ok=True)
            (self.ws.config_dir / "plugins" / f"{name}.yaml").write_text(yaml.safe_dump(values), encoding="utf-8")
        (self.ws.root / ".plugin-workspace.yaml").write_text(yaml.safe_dump(self.plugins), encoding="utf-8")
        self.cfg = load_config(self.ws.config_dir, env={})
        self.store = Store(self.ws.db_path, cfg=self.cfg)
        self._check_started(require_started)
        self._set_up_lists()

    def _set_up_lists(self) -> None:
        """The app creates the value lists a workspace lacks (the core's and every started plugin's) when it starts;
        the kit does the same, so a record that takes its values from a list is checked as it is in the app."""
        from engine.lists import ensure

        if all(self.store.plugins.active(name) for name in self.plugins):
            ensure(self.store)

    def _check_started(self, required: bool) -> None:
        if not required:
            return
        for name in self.plugins:
            if not self.store.plugins.active(name):
                status = self.store.plugins.status.get(name)
                reason = (status.reason if status is not None else None) or "it isn't installed"
                self.store.close()
                raise PluginDidNotStart(name, reason)

    def status(self, plugin: str | None = None) -> PluginState:
        """A plugin's status (the first plugin given, unless named), whether it started or not."""
        found = self.store.plugins.status.get(plugin or self.plugins[0])
        if found is None:
            return PluginState("off", "it isn't installed or turned on", [], {})
        return PluginState(found.state, found.reason, list(found.notes), dict(found.tools))

    def registered(self, plugin: str | None = None) -> dict[str, Any]:
        """What a plugin registered, by kind, read-only: {"sign_ins": {name: its declaration}, "connectors": ...,
        "triage_matchers", "setup_steps", "tiers", "actions", "tasks", "ops", "records", "panels", "today", "jobs",
        "stage_checks", "file_kinds", "lints", "extractors", "scorers", "drop_hooks"}, and "project_ending" (its
        hook, when it registered one). Empty kinds are left out. A started plugin only."""
        from types import MappingProxyType

        registrar = self.store.plugins.registrars.get(plugin or self.plugins[0])
        if registrar is None:
            return {}
        kinds = (
            ("sign_ins", "sign_ins"),
            ("connectors", "connectors"),
            ("triage_matchers", "triage_matchers"),
            ("setup_steps", "setup_steps"),
            ("tiers", "pack_tiers"),
            ("actions", "actions"),
            ("tasks", "tasks"),
            ("ops", "ops"),
            ("records", "records"),
            ("panels", "panels"),
            ("today", "today_lines"),
            ("jobs", "jobs"),
            ("stage_checks", "stage_checks"),
            ("file_kinds", "file_kinds"),
            ("lints", "lints"),
            ("extractors", "extractors"),
            ("scorers", "scorers"),
            ("drop_hooks", "drop_hooks"),
        )
        found: dict[str, Any] = {}
        for label, attribute in kinds:
            value = getattr(registrar, attribute, None)
            if value:
                found[label] = MappingProxyType(dict(value))
        if registrar.project_ending_hook is not None:
            found["project_ending"] = registrar.project_ending_hook
        return found

    def save(self, path: str | Path) -> SavedWorkspace:
        """Save this workspace as it is now (records, settings, the plugins linked in), so other tests start from
        fresh copies of it with `plugin_workspace(..., from_saved=saved)` instead of building it again. Saving closes
        the workspace's store and opens a new one, so a `ws.store` (or anything read through it) held from before the
        call is closed afterwards: read `ws.store` again, or use the methods here, which always take the current one."""
        import shutil

        target = Path(path)
        self.store.close()
        try:
            shutil.copytree(self.ws.root, target, symlinks=True)
        finally:
            from engine.storage import Store

            self.store = Store(self.ws.db_path, cfg=self.cfg)
        return SavedWorkspace(target)

    @property
    def root(self) -> Path:
        return self.ws.root

    def view(self, plugin: str | None = None) -> Any:
        """A ReadView as the plugin sees it (the first plugin given, unless named)."""
        from engine.plugin_api import ReadView

        return self.store.plugins._with_files(ReadView(self.store.read(), plugin or self.plugins[0]))

    def add_side(self, name: str, kind: str = "business") -> str:
        """Add a side to the person's life as the app does when they name their work: a new top-level project called
        `name`, listed in the workspace's sides with `kind` ("job" or "business"). Returns the project's id, which
        `view.sides()`, `view.side_of(...)` and a person's `sides` use. The workspace's settings read it at once."""
        from engine import sides
        from engine.config import load_config

        made = sides.set_business(self.ws, self.store, self.cfg, name, kind=kind, env={})
        self.cfg.files["workspace"] = load_config(self.ws.config_dir, env={}).files["workspace"]
        return made.project

    def _outcome(self, cs_id: str) -> Outcome:
        record = self.store.read().get("changeset", cs_id)
        return Outcome(cs_id, record.data["status"], list(record.data["ops"]), list(record.data.get("problems") or []))

    def apply(
        self, ops: list[dict[str, Any]], *, summary: str = "Test", as_person: bool = True, trusted: bool = True
    ) -> Outcome:
        """Apply ops as the person (their own change, applied at once) or as the assistant (checked by validators and
        lints first, `trusted=False` for work from outside content), and say what became of each."""
        from engine.applier import Context, Inputs, apply_changeset, check
        from engine.names import People
        from engine.ops import CHANGESET
        from engine.storage import WriteContext

        changeset = CHANGESET.validate_python(
            {"summary": summary, "ops": ops}, context={"op_models": self.store.plugins.ops}
        )
        with self.store.transaction() as tx:
            request = tx.create(
                "request",
                {"task": "notes", "origin": "pm", "state": "done", "note": summary, "created_at": self.store.clock()},
                WriteContext("pm", "trusted", "test"),
            )
        ctx = Context(
            self.store,
            self.cfg,
            People(self.store, self.cfg),
            tuple(self.store.plugins.ops),
            Inputs(request.id, None, "", summary, "trusted" if trusted else "untrusted"),
            confirmed_by_pm=as_person,
            actor="pm" if as_person else "assistant",
        )
        problems = [] if as_person else check(changeset, ctx)
        return self._outcome(apply_changeset(changeset, problems, ctx, run=None))

    def ask(
        self,
        task: str,
        *,
        answer: Any,
        about: tuple[str, str] | None = None,
        part: dict[str, Any] | None = None,
        note: str = "",
        tag: dict[str, Any] | None = None,
    ) -> AskResult:
        """Run a task kind with a scripted answer, through the dispatcher: the packet, the checks, the fix round and
        the review. `answer` is the answer's text, a dict (sent as JSON) or a function of the run's task, whose
        `request` carries the fix round's feedback, so it can answer differently each round. `tag` is the small mapping
        a plugin puts on a request (`queue_request(tag=)`)."""
        from datetime import UTC, datetime

        from engine.ai.adapters.stub import set_responder
        from engine.ai.router import Router
        from engine.dispatcher import process
        from engine.storage import WriteContext

        def respond(asked: Any) -> str:
            value = answer(asked) if callable(answer) else answer
            return value if isinstance(value, str) else jsonlib.dumps(value)

        data: dict[str, Any] = {
            "task": task,
            "origin": "pm",
            "state": "queued",
            "note": note,
            "created_at": datetime.now(UTC).isoformat(),
        }
        if about is not None:
            data["about"] = {"kind": about[0], "id": about[1]}
        if part is not None:
            data["part"] = part
        if tag is not None:
            from engine.tasks import flat_mapping

            try:
                data["tag"] = flat_mapping(tag, "a request's tag")
            except ValueError as err:
                raise StoreError(str(err)) from None
        with self.store.transaction() as tx:
            request = tx.create("request", data, WriteContext("pm", "trusted", "test"))
        set_responder(respond)
        try:
            process(self.ws, self.store, self.cfg, Router(self.cfg, self.store, env={}), request.id)
        finally:
            set_responder(None)
        done = self.store.read().get("request", request.id)
        cs_id = done.data.get("changeset")
        return AskResult(
            request.id, done.data["state"], done.data.get("waiting"), self._outcome(cs_id) if cs_id else None
        )

    def action(self, name: str, target: Any = None, choices: dict[str, Any] | None = None) -> ActionResult:
        """Run a person action on a record (a Stored, or (kind, id)) or the workspace, and get its proposal."""
        from engine import actions

        ref = None
        if target is not None:
            kind, record_id = (target.kind, target.id) if hasattr(target, "kind") else target
            ref = {"kind": kind, "id": record_id}
        pending = actions.preview(self.store, self.cfg, name, ref, choices)

        def apply(kept: dict[str, bool] | None, requests: list[int | str] | None = None) -> Outcome:
            kept_requests = None
            if requests is not None:
                ids = [r["id"] for r in pending.requests]
                named = set()
                for ref in requests:
                    if isinstance(ref, bool) or not isinstance(ref, (int, str)):
                        raise StoreError("name a request by its position or its id")
                    if isinstance(ref, int):
                        if not 0 <= ref < len(ids):
                            raise StoreError(f"there is no request {ref} in this review")
                        ref = ids[ref]
                    if ref not in ids:
                        raise StoreError(f"there is no request {ref} in this review")
                    named.add(ref)
                kept_requests = {each: each in named for each in ids}
            return self._outcome(actions.apply(self.store, self.cfg, pending.token, kept, kept_requests))

        return ActionResult(
            pending.summary,
            list(pending.ops),
            list(pending.notes),
            list(pending.items),
            list(pending.requests),
            list(pending.problems),
            apply,
            topic=pending.topic,
            groups=list(pending.groups),
        )

    def end_project(
        self, project: str, *, as_person: bool = True, quote: str = "the whole project is complete"
    ) -> Outcome:
        """End a project (set it to a status whose meaning is done) and say what became of each op, the core's drops
        and the ops the plugin's `project_ending` hook returned among them. As the person it applies at once, with one
        Undo (`undo(outcome)`); `as_person=False` reads it from outside content that says `quote`, so the ending and
        every drop wait together: see `ending_items`, `finish_ending` and `decline_ending`."""
        from engine.lists import core_lists, describe

        view = self.store.read()
        done = next(
            value
            for value in core_lists()["project-status"]["values"]
            if describe(view, "project-status", value).meaning == "done"
        )
        op: dict[str, Any] = {"op": "record.set", "kind": "project", "id": project, "field": "status", "value": done}
        if as_person:
            return self.apply([op])
        return self.apply([{**op, "evidence": {"quote": quote}}], summary=quote, as_person=False, trusted=False)

    def drop_action(self, action: str, *, as_person: bool = True, quote: str = "this is no longer needed") -> Outcome:
        """Drop an action and say what became of each op, the ops the plugin's `on_drop` hook returned among them. As
        the person it applies at once, with one Undo; `as_person=False` reads it from outside content that says
        `quote`, so the drop and the plugin's ops wait together."""
        op: dict[str, Any] = {"op": "action.drop", "id": action, "reason": quote}
        if as_person:
            return self.apply([op])
        return self.apply([{**op, "evidence": {"quote": quote}}], summary=quote, as_person=False, trusted=False)

    def ending_items(self, outcome: Outcome) -> list[dict[str, Any]]:
        """The project endings waiting in a changeset, as the screen lists them: for each, `index` (the held op that
        ends the project), `project`, and its `items`, each with `index`, `kind` ("action", "question", or "other" for
        an op a plugin's hook added, whose `text` is its `describe()` label), `id` and `text`."""
        from engine.endings import held_endings

        view = self.store.read()
        return [
            {
                "index": e.index,
                "project": e.project,
                "items": [{"index": i.index, "kind": i.kind, "id": i.id, "text": i.text} for i in e.items],
            }
            for e in held_endings(view, outcome.changeset, view.get("changeset", outcome.changeset).data["ops"])
        ]

    def finish_ending(self, outcome: Outcome, keep: list[int] | tuple[int, ...] = ()) -> Outcome:
        """Confirm the one waiting project ending in a changeset as the person would: the items whose `index` is in
        `keep` stay open (declined, one signal each), the ending and every other item apply."""
        from engine.endings import finish_ending

        (waiting,) = self.ending_items(outcome)
        finish_ending(self.store, self.cfg, outcome.changeset, waiting["index"], list(keep))
        return self._outcome(outcome.changeset)

    def decline_ending(self, outcome: Outcome) -> Outcome:
        """Keep the project as it is: the waiting ending and every item that waits with it are declined together."""
        from engine.endings import decline_ending

        (waiting,) = self.ending_items(outcome)
        decline_ending(self.store, outcome.changeset, waiting["index"])
        return self._outcome(outcome.changeset)

    def left_open(self, project: str, closing: list[str] | tuple[str, ...] = ()) -> list[dict[str, Any]]:
        """The records of running plugins that refer to a project, which the ending lists as left open for the plugin
        to close (`kind`, `id`, `title`); `closing` names records a waiting item already closes."""
        from engine.endings import left_behind

        return [
            {"kind": each.kind, "id": each.id, "title": each.title}
            for each in left_behind(self.store, project, closing)
        ]

    def undo(self, outcome: Outcome) -> Outcome:
        """Undo a whole changeset with one Undo, as the person would, and return it as it stands after."""
        from engine.dispatcher import undo_changeset

        undo_changeset(self.store, outcome.changeset)
        return self._outcome(outcome.changeset)

    def _group_id(self, outcome: Outcome, group: int | str) -> int:
        """A group of an answer by its label or its id."""
        for each in outcome.groups:
            if group in (each["id"], each["label"]) and not isinstance(group, bool):
                return each["id"]
        raise StoreError(f"there is no group {group!r} in this answer")

    def _group_done(self, outcome: Outcome, done: Any) -> GroupDone:
        return GroupDone(
            self._outcome(outcome.changeset),
            list(done.released),
            list(done.restored),
            list(done.declined),
            list(done.skipped),
        )

    def keep_group(self, outcome: Outcome, group: int | str) -> GroupDone:
        """Keep a group of an answer as the person would on the review (`group` is its label or its id from
        `outcome.groups`): its held ops are released as the person's own go."""
        from engine import answer_groups

        done = answer_groups.keep(self.store, self.cfg, outcome.changeset, self._group_id(outcome, group), ws=self.ws)
        return self._group_done(outcome, done)

    def drop_group(self, outcome: Outcome, group: int | str) -> GroupDone:
        """Drop a group of an answer: its applied ops are undone and its held ops kept as they were, each recorded as a
        signal like any other rejection of the assistant's work."""
        from engine import answer_groups

        done = answer_groups.drop(self.store, outcome.changeset, self._group_id(outcome, group))
        return self._group_done(outcome, done)

    def release_all(self, outcome: Outcome) -> GroupDone:
        """Release every held op of an answer together, as the person's own go (one Undo takes them all back); an op
        that waits on a choice only the person makes there is left and named in `skipped`."""
        from engine import answer_groups

        done = answer_groups.release_all(self.store, self.cfg, outcome.changeset, ws=self.ws)
        return self._group_done(outcome, done)

    def emit(self, event: str, payload: dict[str, Any]) -> list[dict[str, Any]]:
        """Raise an event as the core would and return the work the handlers queued: one dict per new request
        (`task`, `about`, `note`, `state`)."""
        before = {r.id for r in self.store.read().list("request")}
        self.store.plugins.publish(event, payload)
        return [
            {k: r.data.get(k) for k in ("task", "about", "note", "state")}
            for r in self.store.read().list("request")
            if r.id not in before
        ]

    def move_stage(self, record: Any, to: str) -> Outcome:
        """Move a record to a stage as the person would; a refusal (an entry check failing) raises StoreError."""
        from engine.applier import move_stage
        from engine.ops import StageMoveOp

        fresh = self.store.read().get(record.kind, record.id)
        cs_id = move_stage(
            self.store,
            StageMoveOp(record={"kind": record.kind, "id": record.id}, to=to, read_version=fresh.version),
        )
        return self._outcome(cs_id)

    def stage_status(self, record: Any) -> Any:
        return self.view(record.kind.split("/")[0] if "/" in record.kind else None).stage_status(record)

    def folder(self) -> dict[str, bytes]:
        """The files the synced folder would hold now, by path, as the core writes them (the plugin's layout,
        its generated files and the core's own)."""
        from engine.sync import Blob, readable_files

        files, _ = readable_files(self.store, self.store.read())
        return {path: data.path.read_bytes() if isinstance(data, Blob) else data for path, data in files.items()}

    def close(self) -> None:
        self.store.close()


def plugin_workspace(
    *folders: str | Path,
    settings: dict[str, dict[str, Any]] | None = None,
    root: str | Path | None = None,
    from_saved: SavedWorkspace | None = None,
    require_started: bool = True,
) -> Any:
    """A throwaway workspace with these plugins loaded (a plugin folder holding plugin.yaml, or an installed plugin's
    name), with `settings` per plugin as its settings file. A context manager: the workspace is made in `root` (a
    pytest `tmp_path`, say) or a temporary folder, and closed after. A plugin folder is linked into the workspace
    (copied where links aren't allowed), so a temporary copy of a folder works as well as the real one.

    `from_saved` starts from a fresh copy of a workspace saved with `ws.save(path)` (then `folders` and `settings`
    are those it was saved with). A plugin that doesn't start raises `PluginDidNotStart` (with `plugin` and
    `reason`); `require_started=False` opens the workspace anyway, to look at `ws.status()`.

        with plugin_workspace(PLUGIN_FOLDER, root=tmp_path) as ws:
            done = ws.apply([{"op": "myplugin/add", "title": "One"}])
            assert done.status == "applied"
    """
    import contextlib
    import tempfile

    @contextlib.contextmanager
    def opened() -> Any:
        with contextlib.ExitStack() as stack:
            base = Path(root) if root is not None else Path(stack.enter_context(tempfile.TemporaryDirectory()))
            workspace = PluginWorkspace(
                base / "workspace", folders, settings, from_saved=from_saved, require_started=require_started
            )
            try:
                yield workspace
            finally:
                workspace.close()

    return opened()


def packet_context(
    ws: PluginWorkspace,
    task: str,
    target: Any = None,
    *,
    origin: str = "pm",
    part: dict[str, Any] | None = None,
    project: str | None = None,
) -> Any:
    """The `PacketContext` the core would give a task kind's packet function for a run of `task` on `target` (a Stored,
    or (kind, id), or None), from this workspace: the read view, with the knowledge section the core would add
    (`context.knowledge(...)`, `context.knowledge_chars`) and the core's search (`context.search(...)`) wired exactly as
    in a run, at the data level of the record the run is about. `origin` is who started it ("pm", "input" or
    "schedule"), `part` the part of the record it names, `project` the request's project. Nothing is queued or run:

        context = packet_context(ws, "myplugin/read", ("myplugin/chapter", "CH-1"))
        parts = packet(record, context, settings, "")

    Test the packet function's own cap by returning `PacketParts(max_chars=...)`: the cap is enforced when a run's
    packet is built (`ws.ask`), where the core trims its own section first."""
    from engine.packet import _PackKnowledge, _PackSearch
    from engine.plugin_api import PacketContext
    from engine.storage import Stored
    from engine.today import zone

    host = ws.store.plugins
    kind = host.task_kind(task)
    ref = None
    if target is not None:
        found_kind, found_id = (target.kind, target.id) if hasattr(target, "kind") else target
        ref = {"kind": found_kind, "id": found_id}
    record = ws.store.read().get(ref["kind"], ref["id"]) if ref else None
    data: dict[str, Any] = {"task": task, "origin": origin, "project": project, "part": part, "source": None}
    if ref:
        data["about"] = ref
    request = Stored("request", "REQ-0", 1, False, data)
    context = host._with_files(
        PacketContext(ws.store.read(), task.split("/", 1)[0], origin, request=request.id, part=part)
    )
    reader = _PackKnowledge(ws.store, ws.cfg, kind, request, record, datetime.now(zone(ws.cfg)).date())
    context.read_knowledge = reader.read
    context.size_knowledge = reader.size
    context.run_search = _PackSearch(ws.ws, ws.store, ws.cfg, request)
    return context

"""Plugin API 0.3.90, part B2: actions offered only when other records allow it (195), a preview beside a data form
(187), a computed column's heading (189), the core's search in a pack's packet function (207), the knowledge section
against a pack's own packet cap (210), the test kit's packet context (209), a packet fitted to a model's context window
(191), the tier order (196) and stable failure codes (203). The pack is a fixture written here; names and ids come
from the workspace's fixtures."""

from __future__ import annotations

import base64
import copy
from datetime import UTC, datetime

import pytest
import yaml
from fastapi.testclient import TestClient

from engine.plugin_api import FAILURE_CODES, PluginMisuse, Registrar, RegistrationRefused
from engine.plugin_api.testing import packet_context, plugin_workspace
from engine.storage import StoreError, WriteContext
from tests.conftest import DEMO_B, fixture_records

PROJECT = fixture_records(DEMO_B, "project")[0]["id"]
_PM = WriteContext("pm", "trusted", "test")
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)

PACK = """
import threading
from typing import Annotated, ClassVar, Literal
from pydantic import BaseModel, Field
from engine.plugin_api import OpModel, PacketParts, Part, Preview, Proposal, Record, RefTo, Settings

PNG = __PNG__

class Config(Settings):
    mode: Literal["ok", "raise", "hang", "bad", "image", "big"] = Field("ok", description="What the preview does.")
    cap: int = Field(0, description="The packet's own cap in characters; 0 means none.")
    body: int = Field(200, description="How long the pack's own material is, in characters.")
    searches: int = Field(1, description="How many searches the packet function makes.")

class Note(Record):
    record_kind: ClassVar[str] = "pb/note"
    prefix: ClassVar[str] = "PBN"
    title: str
    status: Literal["open", "done"] = "open"

class Vault(Record):
    record_kind: ClassVar[str] = "pb/vault"
    prefix: ClassVar[str] = "PBV"
    data_level: ClassVar[str] = "restricted"
    title: str

class AddNote(OpModel):
    op: Literal["pb/add-note"] = "pb/add-note"
    writes: ClassVar[dict] = {"pb/note": ("*",)}
    title: str
    status: str = "open"

def add_note(op, writer, cfg):
    writer.create("pb/note", {"title": op.title, "status": op.status})

class FinishNote(OpModel):
    op: Literal["pb/finish"] = "pb/finish"
    writes: ClassVar[dict] = {"pb/note": ("status",)}
    id: str

def finish_note(op, writer, cfg):
    found = writer.get("pb/note", op.id)
    writer.update("pb/note", op.id, {"status": "done"}, read_version=found.version)

class AddVault(OpModel):
    op: Literal["pb/add-vault"] = "pb/add-vault"
    writes: ClassVar[dict] = {"pb/vault": ("*",)}
    title: str

def add_vault(op, writer, cfg):
    writer.create("pb/vault", {"title": op.title})

def archive(target, context, choices):
    return Proposal("Archive " + target.data["title"])

def another_is_open(view, target):
    return any(n.id != target.id and n.data["status"] == "open" for n in view.list("pb/note"))

def broken(view, target):
    if view.list("pb/note", title="break"):
        raise RuntimeError("broken on purpose")
    return False

def words(record, view, settings):
    return len(record.data["title"].split())

class Look(BaseModel):
    title: str = Field("Plain", description="What the look is called.")

def sample(view, settings, project, saved_file):
    if settings.mode == "raise":
        raise RuntimeError("the sample page couldn't be set")
    if settings.mode == "hang":
        threading.Event().wait(1.5)
    if settings.mode == "bad":
        return Preview("page.html", "text/html", b"<b>no</b>")
    if settings.mode == "big":
        return Preview("page.txt", "text/plain", b"x" * 25000)
    if settings.mode == "image":
        return Preview("page.png", "image/png", PNG, caption="Page one", alt="A page")
    where = project.id if project is not None else "the workspace"
    text = "# " + saved_file + "\\n\\nSet for " + where + "."
    return Preview("page.md", "text/markdown", text.encode(), caption="Sample")

def packet(target, view, settings, note):
    found = view.search(target.data["title"], kinds=("facts",), limit=5) if settings.searches else []
    know = view.knowledge(target.data["title"])
    mine = Part("Material", "M" * settings.body, trusted=True)
    seen = Part("Related", "\\n".join(r.id + ": " + r.text for r in found) or "nothing",
                trusted=not any(r.untrusted for r in found))
    return PacketParts(
        stable=[know.stable], request=[know.per_input, mine, seen], max_chars=settings.cap or None,
    )

def register(registrar):
    registrar.record_type(Note)
    registrar.record_type(Vault)
    registrar.op(AddNote, "data", add_note)
    registrar.op(AddVault, "data", add_vault)
    registrar.op(FinishNote, "data", finish_note)
    registrar.action("pb/archive", label="Archive", run=archive, on="pb/note", show_for=another_is_open)
    registrar.action("pb/hidden", label="Hidden", run=archive, on="pb/note", show_for=broken)
    registrar.panel(
        "pb/notes", title="Notes", kind="pb/note", columns=("title", "words", "status"),
        computed={"words": words}, computed_labels={"words": "panel.column.pb/words"},
    )
    registrar.data_form("pb/looks", label="Looks", folder="looks", schema=Look, preview=sample)
    registrar.task_kind("pb/read", label="Read", ops=("note",), on="pb/note", packet=packet)
    registrar.task_kind("pb/long", label="Read long", ops=("note",), on="pb/note", packet=packet, min_context=400000)
""".replace("__PNG__", repr(PNG))

PROVIDES = {
    "record_types": ["pb/note", "pb/vault"],
    "ops": ["pb/add-note", "pb/add-vault", "pb/finish"],
    "actions": ["pb/archive", "pb/hidden"],
    "panels": ["pb/notes"],
    "data_forms": ["pb/looks"],
    "ai_task_kinds": ["pb/read", "pb/long"],
    "wording": ["wording.yaml"],
    "data": "data",
}
WORDING = {
    "panel.column.pb/words": "Word count",
    "action.unavailable.pb/archive": "Another note has to be open before this one can be archived.",
}


def make_pack(tmp_path):
    path = tmp_path / "pb"
    (path / "data" / "looks").mkdir(parents=True)
    (path / "data" / "looks" / "classic.yaml").write_text(yaml.safe_dump({"title": "Classic"}))
    (path / "wording.yaml").write_text(yaml.safe_dump(WORDING))
    (path / "fixture.py").write_text(PACK)
    manifest = {
        "name": "pb",
        "version": "0.1.0",
        "plugin_api": ">=0.3,<0.4",
        "description": "A fixture pack",
        "entry": "fixture:register",
        "config_schema": "fixture:Config",
        "provides": PROVIDES,
        "requires": {"data_levels": ["internal", "restricted"]},
    }
    (path / "plugin.yaml").write_text(yaml.safe_dump(manifest))
    return path


def opened(tmp_path, **settings):
    return plugin_workspace(make_pack(tmp_path), root=tmp_path / "ws", settings={"pb": settings})


def note(ws, title, status="open"):
    ws.apply([{"op": "pb/add-note", "title": title, "status": status}])
    return ws.view().find("pb/note", title=title)


def make(ws, kind, data):
    with ws.store.transaction() as tx:
        return tx.create(kind, data, _PM).id


def fact(ws, text, **more):
    return make(ws, "fact", {"text": text, **more})


def client(ws):
    from api.app import create_app

    ws.store.close()
    c = TestClient(create_app(ws.ws, ws.cfg, "t", start_worker=False))
    c.headers["Authorization"] = "Bearer t"
    return c, ws.cfg.server.base_path.rstrip("/") + "/api"


# ---- 195: an action offered only when other records allow it ---------------------------------------------------------


def test_an_action_is_offered_only_while_its_show_for_holds_and_is_checked_again_when_started(tmp_path):
    from engine import actions

    with opened(tmp_path) as ws:
        only = note(ws, "Only note")
        names = lambda target: [a.name for a in actions.available(ws.store, "pb/note", target.id)]  # noqa: E731
        assert names(only) == []  # no other open note, so nothing is offered
        second = note(ws, "Second note")
        assert names(only) == ["pb/archive"] and names(second) == ["pb/archive"]
        assert ws.action("pb/archive", only).summary == "Archive Only note"
        # The second note is done, so the first can no longer be archived: starting it is refused in the pack's words.
        ws.apply([{"op": "pb/finish", "id": second.id}])
        with pytest.raises(StoreError, match="Another note has to be open"):
            ws.action("pb/archive", only)


def test_a_show_for_that_raises_hides_its_action_and_is_a_contained_failure_noted_on_the_pack(tmp_path):
    from engine import actions

    with opened(tmp_path) as ws:
        broken = note(ws, "break")
        note(ws, "Another note")
        shown = [a.name for a in actions.available(ws.store, "pb/note", broken.id)]
        assert shown == ["pb/archive"]  # the broken one is hidden, never an error
        assert any("show_for failed" in n for n in ws.status("pb").notes)
        assert ws.status("pb").state == "enabled"  # one failure is skipped, not fatal


def test_the_core_says_it_in_its_own_words_when_the_pack_sets_none_and_the_routes_list_and_start_it(tmp_path):
    with opened(tmp_path) as ws:
        only = note(ws, "Only note")
        note(ws, "Second note")
        with pytest.raises(StoreError, match=r"^Hidden isn't available for this .* now\.$"):
            ws.action("pb/hidden", only)
        c, api = client(ws)
        listed = c.get(f"{api}/plugin-actions", params={"kind": "pb/note", "id": only.id}).json()
        assert [a["name"] for a in listed] == ["pb/archive"]
        c.post(
            f"{api}/plugin-actions/pb/archive/preview",
            json={"target": {"kind": "pb/note", "id": only.id}, "choices": {}},
        ).raise_for_status()


def test_a_show_for_that_is_not_a_function_is_refused_at_registration():
    registrar = Registrar("pb", {}, None)
    with pytest.raises(RegistrationRefused) as err:
        registrar.action("pb/a", label="A", run=lambda t, c, ch: None, show_for="yes")
    assert err.value.code == "registration.action"


# ---- 189: a computed column's heading --------------------------------------------------------------------------------


def test_a_computed_columns_heading_is_the_wording_key_the_pack_names(tmp_path):
    with opened(tmp_path) as ws:
        note(ws, "Three plain words")
        assert ws.store.plugins.wording()["panel.column.pb/words"] == "Word count"
        c, api = client(ws)
        (panel,) = [p for p in c.get(f"{api}/panels").json() if p["name"] == "pb/notes"]
        assert panel["columns"] == ["title", "words", "status"]
        assert panel["column_labels"] == {"words": "panel.column.pb/words"}
        rows = c.get(f"{api}/panels/pb/notes/rows").json()
        assert rows[0]["values"]["words"] == 3


def test_a_label_names_a_computed_column_and_a_key_in_the_packs_own_namespace():
    registrar = Registrar("pb", {}, None)
    kind = dict(title="T", kind="pb/note", columns=("title", "n"), computed={"n": lambda r, v, s: 1})
    for bad in ({"title": "panel.column.pb/t"}, {"n": "panel.column.other/n"}, {"n": "heading"}, {"n": 3}):
        with pytest.raises(RegistrationRefused) as err:
            registrar.panel("pb/p", computed_labels=bad, **kind)
        assert err.value.code == "registration.panel"
    registrar.panel("pb/p", computed_labels={"n": "panel.column.pb/n"}, **kind)
    assert registrar.panels["pb/p"].computed_labels == {"n": "panel.column.pb/n"}


# ---- 187: a preview beside a data form -------------------------------------------------------------------------------


def preview(c, api, file="classic.yaml", project=None):
    params = {"path": file} | ({"project": project} if project else {})
    return c.get(f"{api}/data-forms/pb/looks/preview", params=params)


def test_a_preview_is_a_short_document_run_after_a_save_and_never_blocks_the_save(tmp_path):
    with opened(tmp_path) as ws:
        c, api = client(ws)
        forms = {f["name"]: f for f in c.get(f"{api}/data-forms").json()}
        assert forms["pb/looks"]["has_preview"] is True
        saved = c.post(
            f"{api}/data-forms/pb/looks/file",
            json={"file": "classic.yaml", "layer": "workspace", "changes": {"title": "B"}},
        )
        assert saved.status_code == 200
        shown = preview(c, api).json()
        assert shown["state"] == "ok" and shown["message"] == ""
        assert shown["preview"]["media_type"] == "text/markdown" and shown["preview"]["caption"] == "Sample"
        heading = shown["document"][0]
        assert heading["type"] == "heading" and heading["inlines"][0]["text"] == "classic.yaml"
        assert "Set for the workspace" in str(shown["document"])
        # It runs for a project's copy with that project in view.
        assert f"Set for {PROJECT}" in str(preview(c, api, project=PROJECT).json()["document"])


@pytest.mark.parametrize(
    "mode,state,said",
    [
        ("raise", "failed", "couldn't be set"),
        ("bad", "failed", "picture, text or a short document"),
        ("big", "failed", "longer than"),
        ("hang", "timeout", "longer than"),
    ],
)
def test_a_preview_that_fails_or_runs_out_of_time_says_so_and_the_save_still_works(tmp_path, mode, state, said):
    with opened(tmp_path, mode=mode) as ws:
        ws.cfg.workspace.plugins.preview_seconds = 0.2
        c, api = client(ws)
        shown = preview(c, api)
        assert shown.status_code == 200
        body = shown.json()
        assert body["state"] == state and said in body["message"] and body["preview"] is None
        saved = c.post(
            f"{api}/data-forms/pb/looks/file",
            json={"file": "classic.yaml", "layer": "workspace", "changes": {"title": "C"}},
        )
        assert saved.status_code == 200
        # A failing preview is never counted as the plugin failing: the plugin is still on.
        assert c.app.state.store.plugins.active("pb")


def test_an_image_preview_comes_back_as_the_packs_picture(tmp_path):
    with opened(tmp_path, mode="image") as ws:
        c, api = client(ws)
        shown = preview(c, api).json()
        assert shown["state"] == "ok" and shown["document"] is None
        assert shown["preview"]["media_type"] == "image/png" and shown["preview"]["alt"] == "A page"
        assert base64.b64decode(shown["preview"]["data_base64"]) == PNG


def test_the_time_a_preview_may_take_is_a_setting_with_a_default(tmp_path):
    from engine.config import load_config

    assert load_config(DEMO_B / "config", env={}).workspace.plugins.preview_seconds == 10


# ---- 207, 209: the core's search in a packet function, and the test kit's packet context ----------------------


def test_a_packet_function_searches_the_core_bounded_by_kind_project_and_limit(tmp_path):
    with opened(tmp_path) as ws:
        target = note(ws, "interior deadline")
        mine = fact(ws, "The interior deadline is the sixteenth", project=PROJECT)
        elsewhere = fact(ws, "The interior deadline moved twice")
        make(ws, "note", {"text": "Check the interior deadline", "project": PROJECT})
        context = packet_context(ws, "pb/read", target)
        found = context.search("interior deadline", kinds=("facts",))
        assert {r.id for r in found} == {mine, elsewhere}
        assert all(r.place == "facts" and r.kind == "fact" and r.text for r in found)
        assert [r.id for r in context.search("interior deadline", kinds=("facts",), limit=1)] == [found[0].id]
        in_project = context.search("interior deadline", kinds=("facts",), projects=("PRJ-NOT-HERE",))
        assert {r.id for r in in_project} == {elsewhere}  # material of that project and of none
        assert {r.place for r in context.search("interior deadline")} == {"facts", "records"}


def test_a_search_keeps_to_the_runs_data_level_and_marks_what_comes_from_outside(tmp_path):
    with opened(tmp_path) as ws:
        ws.apply([{"op": "pb/add-vault", "title": "the vault"}])
        vault = ws.view().find("pb/vault", title="the vault")
        target = note(ws, "ledger")
        quiet = make(
            ws,
            "source",
            {
                "received_at": datetime.now(UTC).isoformat(),
                "kind": "pasted",
                "title": "A quiet letter",
                "content_hash": "0" * 64,
                "trust": "untrusted",
                "sensitivity": "restricted",
            },
        )
        secret = fact(ws, "The ledger shows a quiet figure", source=quiet)
        plain = fact(ws, "The ledger is kept monthly")
        # A run on an internal record never gets what only a restricted run may see; one on a restricted record does,
        # and the outside-content fact comes back marked.
        assert {r.id for r in packet_context(ws, "pb/read", target).search("ledger", kinds=("facts",))} == {plain}
        found = packet_context(ws, "pb/read", vault).search("ledger", kinds=("facts",))
        assert {r.id: r.untrusted for r in found} == {plain: False, secret: True}


def test_a_search_with_nothing_to_search_for_or_the_wrong_shape_raises_a_coded_failure(tmp_path):
    with opened(tmp_path) as ws:
        context = packet_context(ws, "pb/read", note(ws, "anything"))
        for call in (
            lambda: context.search(""),
            lambda: context.search("x", kinds=("nowhere",)),
            lambda: context.search("x", projects="PRJ-1"),
            lambda: context.search("x", limit=0),
        ):
            with pytest.raises(PluginMisuse) as err:
                call()
            assert err.value.code == "bad_search"


def test_a_run_logs_what_its_packet_function_searched_for_and_what_it_was_sent(tmp_path):
    with opened(tmp_path) as ws:
        target = note(ws, "harbor map")
        found = fact(ws, "The harbor map is drawn in ink")
        asked = []

        def answer(task):
            asked.append(task)
            return {"summary": "Read it.", "ops": []}

        done = ws.ask("pb/read", about=("pb/note", target.id), answer=answer)
        assert done.state == "review", done.waiting
        assert found in asked[0].request
        (run,) = ws.store.read().list("run")
        searches = run.data["knowledge"]["pack_searches"]
        assert searches == [{"words": "harbor map", "kinds": ["facts"], "projects": [], "results": 1, "sent": [found]}]


def test_a_packet_function_may_search_only_as_often_as_the_setting_allows(tmp_path):
    with opened(tmp_path) as ws:
        context = packet_context(ws, "pb/read", note(ws, "again and again"))
        allowed = ws.cfg.dispatch.knowledge.pack_searches
        for _ in range(allowed):
            context.search("again")
        with pytest.raises(StoreError) as err:
            context.search("again")
        assert err.value.code == "search_limit"


def test_the_kits_packet_context_has_the_knowledge_section_the_core_would_add(tmp_path):
    with opened(tmp_path) as ws:
        target = note(ws, "interior deadline")
        before = packet_context(ws, "pb/read", target)
        assert before.origin == "pm" and before.request == "REQ-0" and before.part is None
        empty = before.knowledge_chars
        make(
            ws,
            "rule",
            {
                "name": "keep-it-short",
                "text": "Keep it short.",
                "applies_to": {},
                "origin": "person",
                "status": "active",
            },
        )
        fact(ws, "The interior deadline is the sixteenth", about=target.id)
        context = packet_context(ws, "pb/read", target, origin="input", part={"first": 1, "last": 2})
        assert context.origin == "input" and context.part == {"first": 1, "last": 2}
        # Before the pack reads the section, its size is what `knowledge()` with no words would give.
        assert context.knowledge_chars > empty
        section = context.knowledge("interior deadline")
        assert "Keep it short." in section.stable.text and "sixteenth" in section.per_input.text
        assert context.knowledge_chars == len(section.stable.text) + len(section.per_input.text)


# ---- 210: the knowledge section against a pack's own packet cap ------------------------------------------------------


def many_facts(ws, target, n=8):
    ids = [fact(ws, f"Fact {i} about {target.data['title']}: " + "detail " * 30, about=target.id) for i in range(n)]
    return ids


def test_over_the_packs_cap_the_core_trims_its_own_facts_and_never_the_packs_parts(tmp_path):
    with opened(tmp_path, cap=2200, body=300) as ws:
        target = note(ws, "harbor map")
        many_facts(ws, target)
        sent = []

        def answer(task):
            sent.append(task.stable + task.request)
            return {"summary": "Read it.", "ops": []}

        done = ws.ask("pb/read", about=("pb/note", target.id), answer=answer)
        assert done.state == "review", done.waiting
        assert "M" * 300 in sent[0]  # the pack's own material is whole
        (run,) = ws.store.read().list("run")
        log = run.data["knowledge"]
        assert log["facts_left_out"] > 0 and log["trimmed_chars"] > 0
        assert "more facts on this work; ask to search for them" in sent[0]


def test_without_a_cap_nothing_is_trimmed_and_a_packet_still_over_a_cap_fails_before_anything_is_sent(tmp_path):
    with opened(tmp_path, body=300) as ws:
        target = note(ws, "harbor map")
        many_facts(ws, target, 3)
        done = ws.ask("pb/read", about=("pb/note", target.id), answer={"summary": "Read it.", "ops": []})
        (run,) = ws.store.read().list("run")
        assert done.state == "review" and run.data["knowledge"]["trimmed_chars"] == 0
    with opened(tmp_path / "again", cap=500, body=900) as ws:
        target = note(ws, "harbor map")
        asked = []
        done = ws.ask(
            "pb/read", about=("pb/note", target.id), answer=lambda t: asked.append(t) or {"summary": "x", "ops": []}
        )
        assert done.state != "review" and "add-on's own limit" in done.waiting and "Nothing was sent" in done.waiting
        assert asked == [] and ws.store.read().list("run") == []


# ---- 191: a packet fitted to a model's context window ----------------------------------------------------------------


class Catalog:
    """What each model's listing says its window is, by model id."""

    def __init__(self, windows):
        self.windows = windows

    def model(self, provider, model_id, fetch):
        from engine.ai.task import ModelInfo

        return ModelInfo(context_tokens=self.windows.get(model_id))


def routed(cfg, store, windows, counter=None):
    from engine.ai.router import Router
    from tests.test_ai import KEYS, NOW

    class Adapter:
        name = "counting"

        def __init__(self):
            self.counted = []

        def run(self, task, model):
            from engine.ai.task import AiResult

            return AiResult(text="{}", model_served=model, seconds=0.0, input_tokens=10, output_tokens=5)

    adapter = Adapter()
    if counter is not None:

        def count_tokens(task, model):
            adapter.counted.append(model)
            return counter

        adapter.count_tokens = count_tokens
    models = {n: cfg.ai.providers[n].models for n in ("main", "backup")}
    window = {models[n][k]: windows[n] for n in windows for k in models[n]}
    router = Router(
        cfg,
        store,
        env=KEYS,
        adapter_factory=lambda name, settings, secret: adapter,
        now=lambda: NOW,
        catalogs=Catalog(window),
    )
    return router, adapter


def sized(chars, **more):
    from engine.ai.task import AiTask

    return AiTask(kind="notes", instructions="Do it.", stable="S" * chars, request="Input.", output_schema={}, **more)


def test_a_run_goes_only_to_an_account_whose_window_holds_the_packet_and_the_estimate_names_it(tmp_path):
    from engine.config import load_config
    from engine.storage import Store
    from tests.test_ai import AI_CONFIG

    cfg = load_config(AI_CONFIG, env={})
    store = Store(tmp_path / "ai.db")
    try:
        task = sized(40000, max_output=1000)  # about 10,000 tokens and a 1,000-token answer
        router, _ = routed(cfg, store, {"main": 5000, "backup": 200000})
        _, choice, _ = router.call(task, request_id="REQ-1")
        assert choice.provider == "backup"
        assert router.account_for(task).provider == "backup"
        router, _ = routed(cfg, store, {"main": 200000, "backup": 200000})
        assert router.account_for(task).provider == "main"
    finally:
        store.close()


def test_a_run_that_fits_nowhere_says_so_before_anything_is_sent(tmp_path):
    from engine.ai.router import NoProvider
    from engine.config import load_config
    from engine.storage import Store
    from tests.test_ai import AI_CONFIG

    cfg = load_config(AI_CONFIG, env={})
    store = Store(tmp_path / "ai.db")
    try:
        router, adapter = routed(cfg, store, {"main": 4000, "backup": 6000})
        with pytest.raises(NoProvider, match=r"too long for every account.*largest account reads 6,000"):
            router.call(sized(40000, max_output=1000), request_id="REQ-1")
        assert store.read().list("run") == []  # nothing was sent, so nothing was recorded
        assert router.account_for(sized(40000, max_output=1000)) is None
    finally:
        store.close()


def test_a_kinds_own_minimum_window_keeps_it_off_a_smaller_model_however_short_the_packet(tmp_path):
    from engine.ai.router import NoProvider
    from engine.config import load_config
    from engine.storage import Store
    from tests.test_ai import AI_CONFIG

    cfg = load_config(AI_CONFIG, env={})
    store = Store(tmp_path / "ai.db")
    try:
        short = sized(40, min_context=100000)
        router, _ = routed(cfg, store, {"main": 32000, "backup": 128000})
        assert router.account_for(short).provider == "backup"
        router, _ = routed(cfg, store, {"main": 32000, "backup": 64000})
        with pytest.raises(NoProvider, match="at least 100,000 tokens.*largest reads 64,000"):
            router.call(short, request_id="REQ-1")
    finally:
        store.close()


def test_the_accounts_own_count_decides_when_the_packet_is_near_the_windows_edge(tmp_path):
    from engine.config import load_config
    from engine.storage import Store
    from tests.test_ai import AI_CONFIG

    cfg = load_config(AI_CONFIG, env={})
    store = Store(tmp_path / "ai.db")
    try:
        # By the app's own count the packet fits the main account's window exactly (8,000 + 1,000 of 9,000), but its
        # service counts more, so the work goes to the backup account.
        task = sized(32000, max_output=1000)
        near = {"main": 9300, "backup": 200000}
        router, adapter = routed(cfg, store, near, counter=9000)
        assert router.account_for(task).provider == "backup"
        assert adapter.counted  # asked once, near the edge
        # Far from the edge nothing is asked: the app's own count stands.
        router, adapter = routed(cfg, store, {"main": 100000, "backup": 200000}, counter=9000)
        assert router.account_for(task).provider == "main" and adapter.counted == []
        # A service that counts fewer keeps the work on the main account.
        router, adapter = routed(cfg, store, near, counter=7000)
        assert router.account_for(task).provider == "main"
    finally:
        store.close()


def test_the_estimate_before_a_packet_exists_is_priced_on_the_first_account_whose_window_holds_the_work(tmp_path):
    from engine.config import load_config
    from engine.config.schema import TaskSettings
    from engine.storage import Store
    from tests.test_ai import AI_CONFIG

    cfg = load_config(AI_CONFIG, env={})
    cfg.ai.prices["backup/small"] = type(cfg.ai.prices["main/small"])(input_per_million=3.0, output_per_million=6.0)
    store = Store(tmp_path / "ai.db")
    try:
        router, _ = routed(cfg, store, {"main": 32000, "backup": 128000})
        assert router.estimate_for("notes", 1000, 100) == pytest.approx((1000 * 1.0 + 100 * 2.0) / 1e6)
        cfg.ai.tasks["notes"] = TaskSettings(min_context=100000)
        assert router.estimate_for("notes", 1000, 100) == pytest.approx((1000 * 3.0 + 100 * 6.0) / 1e6)
        assert router.estimate_for("notes", 200000, 100) is None  # fits nowhere: no price
    finally:
        store.close()


def test_a_task_kind_declares_its_minimum_window_and_the_workspace_may_set_it(tmp_path):
    from engine.config.schema import TaskSettings
    from engine.tasks import settings

    with opened(tmp_path) as ws:
        kind = ws.store.plugins.task_kind("pb/long")
        assert settings(ws.cfg, kind).min_context == 400000
        assert settings(ws.cfg, ws.store.plugins.task_kind("pb/read")).min_context == 0
        override = copy.deepcopy(ws.cfg)
        override.ai.tasks["pb/long"] = TaskSettings(min_context=1000)
        assert settings(override, kind).min_context == 1000


# ---- 196: the order of tiers -----------------------------------------------------------------------------------------


def test_the_tier_order_is_the_workspaces_then_the_kinds_own_then_its_roles_then_the_default(tmp_path):
    from engine.config.schema import TaskSettings
    from engine.tasks import default_tier, settings
    from engine.tasks import task_kind as core_kind

    with opened(tmp_path) as ws:
        plain = ws.store.plugins.task_kind("pb/read")
        learning = core_kind("learn-correction")  # declares "deep"
        cfg = copy.deepcopy(ws.cfg)
        assert settings(cfg, plain).tier == "routine" and default_tier(cfg, plain) == "routine"  # the default
        cfg.ai.roles.write.tier = "deep"
        assert settings(cfg, plain).tier == "deep" and default_tier(cfg, plain) == "deep"  # the role's tier
        cfg.ai.roles.write.tier = "routine"
        # A tier the kind declares is more specific than its role's: it wins over it.
        assert settings(cfg, learning).tier == "deep" and default_tier(cfg, learning) == "deep"
        # The workspace's own choice for the kind beats both.
        cfg.ai.tasks["learn-correction"] = TaskSettings(tier="routine")
        assert settings(cfg, learning).tier == "routine"


def test_a_pack_tier_a_kind_declares_wins_over_its_role_and_falls_back_until_it_is_mapped(tmp_path):
    from engine.ai.router import Router
    from engine.tasks import settings

    pack = make_pack(tmp_path)
    code = (
        (pack / "fixture.py")
        .read_text()
        .replace(
            '    registrar.task_kind("pb/long"',
            '    registrar.tier("pb/wide", label="Wide reading", falls_back_to="routine")\n'
            '    registrar.task_kind("pb/wide-read", label="Wide read", ops=("note",), tier="pb/wide")\n'
            '    registrar.task_kind("pb/long"',
        )
    )
    (pack / "fixture.py").write_text(code)
    manifest = yaml.safe_load((pack / "plugin.yaml").read_text())
    manifest["provides"]["tiers"] = ["pb/wide"]
    manifest["provides"]["ai_task_kinds"] = [*manifest["provides"]["ai_task_kinds"], "pb/wide-read"]
    (pack / "plugin.yaml").write_text(yaml.safe_dump(manifest))
    with plugin_workspace(pack, root=tmp_path / "ws") as ws:
        kind = ws.store.plugins.task_kind("pb/wide-read")
        cfg = copy.deepcopy(ws.cfg)
        cfg.ai.roles.write.tier = "deep"
        assert settings(cfg, kind).tier == "pb/wide"  # the declared pack tier beats the role's
        ws.cfg.ai.roles.write.tier = "deep"
        router = Router(ws.cfg, ws.store, env={})
        assert router._tier_for("pb/wide-read") == "routine"  # unmapped: the tier it falls back to, not the role's
        assert router._tier_for("pb/read") == "deep"  # a kind with none of its own follows its role


# ---- 203: stable failure codes ---------------------------------------------------------------------------------------


def test_a_failure_the_plugin_api_raises_carries_a_code_from_the_documented_table(tmp_path):
    with opened(tmp_path) as ws:
        view = ws.view()
        with pytest.raises(PluginMisuse) as other:
            view.get("qk/thing", "1")
        assert other.value.code == "undeclared_interface" and other.value.code in FAILURE_CODES
        with pytest.raises(StoreError) as file:
            view.file_bytes("FILE-404")
        assert file.value.code == "no_such_file"
        with pytest.raises(PluginMisuse) as ancestors:
            view.list("pb/note", project=None, ancestors=True)
        assert ancestors.value.code == "bad_argument"
        only = note(ws, "held")
        out = ws.apply([{"op": "pb/add-note", "title": only.data["title"], "status": "open"}])
        assert out.status == "applied"  # no unique group, so a second one is fine; the codes are for what fails


def test_the_cores_own_store_failures_have_codes_and_an_uncoded_failure_has_an_empty_one():
    from engine.storage import ConflictError, InvalidRecord

    assert ConflictError("pb/note", "PBN-1", ["title"]).code == "conflict"
    assert InvalidRecord("no").code == "invalid_record"
    assert StoreError("plain").code == "" and StoreError("coded", code="x").code == "x"
    assert {"conflict", "invalid_record"} <= set(FAILURE_CODES)


def test_every_declaration_the_registrar_refuses_is_a_value_error_with_the_method_in_its_code():
    registrar = Registrar("pb", {}, None)
    with pytest.raises(ValueError) as err:
        registrar.task_kind("pb/a", ops=())
    assert isinstance(err.value, RegistrationRefused) and err.value.code == "registration.task_kind"
    with pytest.raises(RegistrationRefused) as other:
        registrar.record_type(object)
    assert other.value.code == "registration.record_type"
    with pytest.raises(RegistrationRefused) as name:
        registrar.job("elsewhere/job", every_minutes=60, run=lambda c: None)
    assert name.value.code == "registration.name"


def test_the_codes_the_api_raises_are_all_in_the_table():
    import re
    from pathlib import Path

    import engine.plugin_api as api

    source = Path(api.__file__).read_text(encoding="utf-8")
    used = set(re.findall(r'code="([a-z_]+)"', source))
    assert used <= set(FAILURE_CODES), used - set(FAILURE_CODES)

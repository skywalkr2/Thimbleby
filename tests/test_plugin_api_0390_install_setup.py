"""Plugin API 0.3.90, part B3: setup steps that add to a list setting (183, 185), a plugin's own tiers (219), and the
corrections to the guide and the test kit (172, 184, 186, 206). A pack's own libraries (173) are in
test_pack_libraries.py."""

import pytest
import yaml
from fastapi.testclient import TestClient

from api.app import create_app
from engine.config import load_config
from tests.test_plugin_api_0329 import reopen, with_manifest
from tests.test_today_panels_jobs import FIXTURE, workspace

#: A type no workspace accepts by default, named by a file kind and by a setup step.
SHEET = "application/x-sheet-fixture"
EXTRA = "application/x-extra-fixture"

PACK = FIXTURE.replace(
    "    registrar.job(",
    '    registrar.tier("p18/long", label="Long reading", description="Reads a whole chapter at once.",\n'
    '                   falls_back_to="deep")\n'
    '    registrar.task_kind("p18/read", label="Read", ops=("note",), tier="p18/long")\n'
    f'    registrar.file_kind("p18/sheet", accept=("{SHEET}", "text/csv"), label="Sheet")\n'
    '    registrar.setup_step("p18/types", label="Take more files", done=lambda v, s: False,\n'
    f'                         adds={{"storage.files.accepted_types": ["{EXTRA}", "text/csv"]}})\n'
    "    registrar.job(",
)
PROVIDES = {
    "tiers": ["p18/long"],
    "ai_task_kinds": ["p18/plan", "p18/read"],
    "file_kinds": ["p18/sheet"],
    "setup_steps": ["p18/types"],
}


@pytest.fixture
def env(tmp_path):
    ws, cfg, store = workspace(tmp_path, PACK)
    store.close()
    with_manifest(ws, **PROVIDES)
    cfg, store = reopen(ws, cfg)
    yield ws, cfg, store
    store.close()


def web(ws, cfg, store):
    store.close()
    c = TestClient(create_app(ws, cfg, "t", start_worker=False))
    c.headers["Authorization"] = "Bearer t"
    return c, cfg.server.base_path.rstrip("/") + "/api"


def fingerprint(c, api):
    return c.get(f"{api}/settings").json()["fingerprint"]


# ---- 185 and 183: values added to a list setting ---------------------------------------------------------------------


def test_a_step_adds_values_to_the_persons_own_list_and_shows_only_what_is_missing(env):
    ws, cfg, store = env
    from engine import setup

    step = next(s for s in setup.steps(ws, cfg, store) if s.id == "p18/types")
    # "text/csv" is on the list already, so only the other value is offered.
    assert step.adds == {"storage.files.accepted_types": [EXTRA]} and step.settings == {}
    c, api = web(ws, cfg, store)
    shown = {s["id"]: s for s in c.get(f"{api}/setup").json()["steps"]}
    assert shown["p18/types"]["adds"] == {"storage.files.accepted_types": [EXTRA]}
    # The person's own list has an entry the step never heard of, and it keeps its place.
    mine = [*cfg.storage.files.accepted_types, "image/x-mine"]
    saved = c.post(
        f"{api}/settings", json={"changes": {"storage.files.accepted_types": mine}, "fingerprint": fingerprint(c, api)}
    )
    assert saved.status_code == 200, saved.text
    done = c.post(f"{api}/setup/p18/types/apply-settings", json={"fingerprint": fingerprint(c, api)})
    assert done.status_code == 200, done.text
    after = load_config(ws.config_dir, env={}).storage.files.accepted_types
    assert after == [*mine, EXTRA]
    # It is the person's own change: one entry in the settings change with its before and after, so Undo restores it.
    change = next(c_ for c_ in done.json()["changes"] if c_["key"] == "storage.files.accepted_types")
    assert change["before"] == mine and change["after"] == after
    undone = c.post(
        f"{api}/settings",
        json={"changes": {"storage.files.accepted_types": mine}, "fingerprint": done.json()["fingerprint"]},
    )
    assert undone.status_code == 200
    assert load_config(ws.config_dir, env={}).storage.files.accepted_types == mine
    again = {s["id"]: s for s in c.get(f"{api}/setup").json()["steps"]}
    assert again["p18/types"]["adds"] == {"storage.files.accepted_types": [EXTRA]}  # offered again after Undo


def test_a_step_reads_the_effective_list_and_a_list_with_everything_has_nothing_to_apply(env):
    ws, cfg, store = env
    from engine import setup

    seen = {}
    state = store.plugins.setup_state("p18", store.plugins.registrars["p18"].setup_steps["p18/types"])
    seen.update(state.settings)
    assert seen["storage.files.accepted_types"] == list(cfg.storage.files.accepted_types)
    c, api = web(ws, cfg, store)
    full = [*cfg.storage.files.accepted_types, EXTRA]
    assert (
        c.post(
            f"{api}/settings",
            json={"changes": {"storage.files.accepted_types": full}, "fingerprint": fingerprint(c, api)},
        ).status_code
        == 200
    )
    cfg = load_config(ws.config_dir, env={})
    from engine.storage import Store

    store = Store(ws.db_path, cfg=cfg)
    try:
        step = next(s for s in setup.steps(ws, cfg, store) if s.id == "p18/types")
        assert step.adds == {}
    finally:
        store.close()
    refused = c.post(f"{api}/setup/p18/types/apply-settings", json={"fingerprint": fingerprint(c, api)})
    assert refused.status_code == 404  # nothing left to suggest


def test_enabling_a_pack_with_file_kinds_offers_their_media_types_with_yes_and_undo(env):
    ws, cfg, store = env
    from engine import setup

    step = next(s for s in setup.steps(ws, cfg, store) if s.id == "p18/file-types")
    assert step.kind == "file_types" and step.plugin == "p18" and not step.done and step.applies
    assert step.adds == {"storage.files.accepted_types": [SHEET]}  # text/csv is accepted already
    assert not step.counted  # an optional extra: it never holds the walkthrough
    c, api = web(ws, cfg, store)
    done = c.post(f"{api}/setup/p18/file-types/apply-settings", json={"fingerprint": fingerprint(c, api)})
    assert done.status_code == 200, done.text
    assert SHEET in load_config(ws.config_dir, env={}).storage.files.accepted_types
    shown = {s["id"]: s for s in c.get(f"{api}/setup").json()["steps"]}
    assert shown["p18/file-types"]["done"] is True and shown["p18/file-types"]["applies"] is False


def test_a_step_may_only_add_to_a_list_setting_and_never_to_the_barred_ones(tmp_path):
    from engine.plugin_api import Registrar

    registrar = Registrar("p18", {}, None)
    with pytest.raises(ValueError, match="non-empty list"):
        registrar.setup_step("p18/a", label="A", done=lambda v, s: True, adds={"storage.files.accepted_types": []})
    with pytest.raises(ValueError, match="dotted keys"):
        registrar.setup_step("p18/b", label="B", done=lambda v, s: True, adds={"accepted_types": ["x"]})
    # A key that is not a list refuses the plugin at start, naming the step.
    ws, cfg, store = workspace(
        tmp_path,
        FIXTURE.replace(
            "    registrar.job(",
            '    registrar.setup_step("p18/bad", label="Bad", done=lambda v, s: True, adds={"workspace.name": ["x"]})\n'
            "    registrar.job(",
        ),
    )
    store.close()
    with_manifest(ws, setup_steps=["p18/bad"])
    from engine.storage import Store

    store = Store(ws.db_path, cfg=load_config(ws.config_dir, env={}))
    try:
        assert not store.plugins.active("p18")
        assert "isn't a list setting" in store.plugins.status["p18"].reason
    finally:
        store.close()
    barred = FIXTURE.replace(
        "    registrar.job(",
        '    registrar.setup_step("p18/barred", label="Barred", done=lambda v, s: False,\n'
        '                         adds={"workspace.plugins.enabled": ["other"]})\n'
        "    registrar.job(",
    )
    ws, cfg, store = workspace(tmp_path / "again", barred)
    store.close()
    with_manifest(ws, setup_steps=["p18/barred"])
    cfg, store = reopen(ws, cfg)
    c, api = web(ws, cfg, store)
    refused = c.post(f"{api}/setup/p18/barred/apply-settings", json={"fingerprint": fingerprint(c, api)})
    assert refused.status_code == 400


# ---- 219: a plugin's own tiers ---------------------------------------------------------------------------------------


def test_a_tier_is_declared_in_the_manifest_with_its_label_description_and_fallback(env):
    ws, cfg, store = env
    registered = store.plugins.registrars["p18"].pack_tiers["p18/long"]
    assert (registered.label, registered.falls_back_to) == ("Long reading", "deep")
    assert store.plugins.task_kind("p18/read").defaults["tier"] == "p18/long"
    assert store.plugins.tier_task_kinds("p18/long") == ["p18/read"]
    from engine.plugin_api import Registrar

    registrar = Registrar("p18", {}, None)
    for bad in ("p18/a.b", "other/x"):
        with pytest.raises(ValueError):
            registrar.tier(bad, label="X", falls_back_to="deep")
    with pytest.raises(ValueError, match="core tier"):
        registrar.tier("p18/x", label="X", falls_back_to="Not A Tier")
    registrar.tier("p18/x", label="X", falls_back_to="deep")
    with pytest.raises(ValueError, match="duplicate"):
        registrar.tier("p18/x", label="X again", falls_back_to="deep")
    with pytest.raises(ValueError, match="never another plugin's"):
        registrar.task_kind("p18/y", label="Y", ops=("note",), tier="other/x")


def test_the_manifest_and_the_registration_agree_on_tiers_and_a_task_names_only_its_own(tmp_path):
    ws, cfg, store = workspace(tmp_path, PACK)
    store.close()
    with_manifest(ws, ai_task_kinds=["p18/plan", "p18/read"], file_kinds=["p18/sheet"], setup_steps=["p18/types"])
    from engine.storage import Store

    store = Store(ws.db_path, cfg=load_config(ws.config_dir, env={}))
    try:
        assert not store.plugins.active("p18")
        assert "tiers does not match" in store.plugins.status["p18"].reason
    finally:
        store.close()
    undeclared = PACK.replace('registrar.tier("p18/long"', 'registrar.tier("p18/other"').replace(
        'falls_back_to="deep")\n    registrar.task_kind', 'falls_back_to="deep")\n    registrar.task_kind'
    )
    ws, cfg, store = workspace(tmp_path / "two", undeclared)
    store.close()
    with_manifest(ws, **{**PROVIDES, "tiers": ["p18/other"]})
    store = Store(ws.db_path, cfg=load_config(ws.config_dir, env={}))
    try:
        assert not store.plugins.active("p18")
        assert "names the tier p18/long, which the plugin doesn't declare" in store.plugins.status["p18"].reason
    finally:
        store.close()


def run_of(store, task):
    return [r for r in store.read().list("run") if r.data["task"] == task][-1]


def map_tier(ws, tier, use):
    path = ws.config_dir / "ai.yaml"
    data = yaml.safe_load(path.read_text())
    data["tiers"][tier] = {"use": use}
    path.write_text(yaml.safe_dump(data))


def test_an_unmapped_tier_runs_on_its_fallback_and_a_mapped_one_on_its_own_account(tmp_path):
    from engine.plugin_api.testing import plugin_workspace

    folder = tmp_path / "pack"
    folder.mkdir()
    (folder / "fixture.py").write_text(PACK)
    manifest = {
        **__import__("tests.test_today_panels_jobs", fromlist=["MANIFEST"]).MANIFEST,
        "provides": {
            **__import__("tests.test_today_panels_jobs", fromlist=["MANIFEST"]).MANIFEST["provides"],
            **PROVIDES,
        },
    }
    (folder / "plugin.yaml").write_text(yaml.safe_dump(manifest))
    answer = {"summary": "Read it.", "ops": [{"op": "note", "text": "Done reading."}]}
    with plugin_workspace(folder, root=tmp_path / "ws") as ws:
        assert ws.ask("p18/read", answer=answer).state in ("review", "done")
        assert run_of(ws.store, "p18/read").data["tier"] == "deep"  # the named fallback, one the person set up
        from engine import pack_tiers

        assert [t.id for t in pack_tiers.unmapped_in_use(ws.cfg, ws.store.plugins)] == ["p18/long"]
        # The person maps it: its own mapping is used from then on.
        map_tier(ws.ws, "p18/long", "stub/default")
        mapped = load_config(ws.ws.config_dir, env={})
        assert mapped.ai.tiers["p18/long"].use == "stub/default"
        ws.cfg = mapped
        assert ws.ask("p18/read", answer=answer).state in ("review", "done")
        assert run_of(ws.store, "p18/read").data["tier"] == "p18/long"
        assert pack_tiers.unmapped_in_use(mapped, ws.store.plugins) == []


def test_the_core_never_uses_a_plugins_tier_and_a_tier_is_used_only_by_its_own_plugins_work(tmp_path):
    from pydantic import ValidationError

    from engine.config.schema import AiFile

    base = {"providers": {"stub": {"adapter": "stub", "models": {"default": "x"}}}}
    tiers = {"routine": {"use": "stub/default"}, "deep": {"use": "stub/default"}, "p18/long": {"use": "stub/default"}}
    AiFile.model_validate({**base, "tiers": tiers, "tasks": {"p18/read": {"tier": "p18/long"}}})  # its own: fine
    for refused, why in (
        ({"roles": {"write": {"tier": "p18/long"}}}, "role"),
        ({"tasks": {"notes": {"tier": "p18/long"}}}, "another add-on"),
        ({"tasks": {"other/read": {"tier": "p18/long"}}}, "another add-on"),
        ({"routing": [{"when": {}, "tier": "p18/long"}]}, "an add-on's own work"),
        ({"routing": [{"when": {"task": "other/read"}, "tier": "p18/long"}]}, "an add-on's own work"),
        ({"tiers": {**tiers, "deep": {"use": "stub/default", "escalate_to": "p18/long"}}}, "a tier of an add-on"),
    ):
        with pytest.raises(ValidationError, match=why):
            AiFile.model_validate({**base, "tiers": tiers, **refused})
    AiFile.model_validate({**base, "tiers": tiers, "routing": [{"when": {"task": "p18/read"}, "tier": "p18/long"}]})


def test_one_line_on_today_says_a_tier_runs_on_its_fallback_and_goes_when_it_is_mapped(env):
    ws, cfg, store = env
    from datetime import UTC, datetime

    from engine.today_queue import queue

    now = datetime(2026, 10, 26, 9, 0, tzinfo=UTC)

    def lines(cfg_now):
        return [ln for ln in queue(ws, store, cfg_now, now) if ln.kind == "pack_tier"]

    found = lines(cfg)
    assert len(found) == 1
    line = found[0]
    assert (line.tier, line.subject, line.text, line.group, line.count) == (
        "p18/long",
        "Long reading",
        "deep",
        "decide",
        1,
    )
    from engine.config.schema import TierSettings

    cfg.ai.tiers["p18/long"] = TierSettings(use="stub/default")
    assert lines(cfg) == []  # the person mapped it
    # A tier left with no account is not mapped, and the line stays; the core's "no account" line never names it.
    cfg.ai.tiers["p18/long"] = TierSettings(use="")
    assert len(lines(cfg)) == 1
    assert all("/" not in n for ln in queue(ws, store, cfg, now) if ln.kind == "no_account" for n in ln.names)


def test_the_tiers_screen_lists_each_tier_under_its_pack_and_mapping_is_the_accounts_own_change(env):
    ws, cfg, store = env
    c, api = web(ws, cfg, store)
    listed = c.get(f"{api}/ai/pack-tiers")
    assert listed.status_code == 200, listed.text
    [tier] = listed.json()["tiers"]
    assert tier["id"] == "p18/long" and tier["plugin"] == "p18" and tier["label"] == "Long reading"
    assert tier["description"] == "Reads a whole chapter at once." and tier["falls_back_to"] == "deep"
    assert tier["mapped"] is False and tier["account"] is None and tier["used_by"] == ["Read"]
    assert tier["recommended"] is None and tier["recommended_why_not"] in ("no_cases", "not_measured")
    mapped = c.post(
        f"{api}/ai/accounts/stub",
        json={"use": {"p18/long": "default"}, "fingerprint": fingerprint(c, api)},
    )
    assert mapped.status_code == 200, mapped.text
    assert load_config(ws.config_dir, env={}).ai.tiers["p18/long"].use == "stub/default"
    [after] = c.get(f"{api}/ai/pack-tiers").json()["tiers"]
    assert (after["mapped"], after["account"], after["model"]) == (True, "stub", "default")
    # The routing screen lists the core's tiers only: a plugin's are mapped under the plugin.
    routing = c.get(f"{api}/ai/routing").json()
    assert [t["name"] for t in routing["tiers"]] == ["routine", "deep"]
    assert next(k for k in routing["kinds"] if k["name"] == "p18/read")["tier"] == "p18/long"
    steps = {s["id"]: s for s in c.get(f"{api}/setup").json()["steps"]}
    assert steps["p18/tiers"]["kind"] == "tiers" and steps["p18/tiers"]["done"] is True


def test_the_setup_guide_lists_the_tiers_to_map_under_the_pack_until_they_are_mapped(env):
    ws, cfg, store = env
    from engine import setup

    step = next(s for s in setup.steps(ws, cfg, store) if s.id == "p18/tiers")
    assert step.kind == "tiers" and step.plugin == "p18" and not step.done and step.applies and not step.counted
    assert step.adds == {} and step.settings == {}  # mapping is a choice of account and model, not a suggestion


# ---- 172, 184, 186, 206: the guide and the test kit ------------------------------------------------------------------

KIT = FIXTURE.replace(
    "def register(registrar):\n",
    "from engine.plugin_api import Group, Item\n\n"
    "def tidy_up(target, context, choices):\n"
    '    return Proposal("Tidy the goals", topic="Tidying", groups=[Group("g1", "Titles", "Shorter titles.")],\n'
    '                    items=[Item("a", "Add one", [{"op": "p18/add-goal", "title": "One"}], group="g1"),\n'
    '                           Item("b", "Add two", [{"op": "p18/add-goal", "title": "Two"}], group="g1",\n'
    "                                kept=False)])\n\n"
    "def register(registrar):\n"
    '    registrar.action("p18/tidy-up", label="Tidy", run=tidy_up)\n'
    '    registrar.value_list("p18/colors", label="Colors", values=["red", "green"])\n',
)
KIT_PROVIDES = {"actions": ["p18/close", "p18/tidy-up"], "value_lists": ["p18/colors"]}


def kit_folder(tmp_path):
    from tests.test_today_panels_jobs import MANIFEST

    folder = tmp_path / "kit"
    folder.mkdir()
    (folder / "fixture.py").write_text(KIT)
    (folder / "plugin.yaml").write_text(
        yaml.safe_dump({**MANIFEST, "provides": {**MANIFEST["provides"], **KIT_PROVIDES}})
    )
    return folder


def test_a_proposal_in_the_kit_has_its_topic_groups_and_items_as_the_review_shows_them(tmp_path):
    from engine.plugin_api.testing import plugin_workspace
    from engine.storage import StoreError

    with plugin_workspace(kit_folder(tmp_path), root=tmp_path / "ws") as ws:
        proposal = ws.action("p18/tidy-up")
        assert proposal.topic == "Tidying"
        assert proposal.groups == [{"id": "g1", "heading": "Titles", "explanation": "Shorter titles."}]
        assert [(i["id"], i["group"], i["kept"]) for i in proposal.items] == [("a", "g1", True), ("b", "g1", False)]
        assert {"id", "label", "group", "kept", "ops"} <= set(proposal.items[0])
        with pytest.raises(StoreError, match="no item zzz"):
            proposal.apply(kept={"zzz": True})
        ws.action("p18/tidy-up")  # a refused apply puts the proposal back; a fresh one works as well
        done = ws.action("p18/tidy-up").apply(kept={"a": False, "b": True})  # the ticks are the person's to flip
        assert [o["title"] for o in done.applied] == ["Two"]
        assert ws.action("p18/tidy-up").apply().applied[0]["title"] == "One"  # as proposed, when nothing is said


def test_the_kit_runs_the_cores_list_setup_so_lists_exist_when_a_workspace_opens(tmp_path):
    from engine.plugin_api.testing import plugin_workspace

    with plugin_workspace(kit_folder(tmp_path), root=tmp_path / "ws") as ws:
        lists = {r.data["name"]: r.data for r in ws.store.read().list("value_list")}
        assert lists["p18/colors"]["values"] == ["red", "green"]
        assert len(lists) > 1  # the core's own lists, as the app has them


def test_saving_a_kit_workspace_closes_the_old_store_and_the_kit_goes_on_with_a_new_one(tmp_path):
    from engine.plugin_api.testing import plugin_workspace

    with plugin_workspace(kit_folder(tmp_path), root=tmp_path / "ws") as ws:
        before = ws.store
        ws.save(tmp_path / "saved")
        assert ws.store is not before
        assert ws.view().find("p18/goal") is None  # the new store works


def test_a_stage_status_says_its_labels_and_leaves_one_out_only_where_there_is_no_stage(tmp_path):
    from engine.plugin_api.testing import plugin_workspace
    from tests.test_plugin_api_0349 import CODE, MANIFEST

    folder = tmp_path / "staged"
    folder.mkdir()
    (folder / "fixture.py").write_text(CODE)
    (folder / "plugin.yaml").write_text(
        yaml.safe_dump(
            {
                **MANIFEST,
                "provides": {
                    **MANIFEST["provides"],
                    "ai_task_kinds": ["p18/plan", "p18/review"],
                    "stages": ["p18/goal"],
                },
                "subscribes": ["record.changed"],
            }
        )
    )
    with plugin_workspace(folder, root=tmp_path / "ws") as ws:
        ws.apply([{"op": "p18/add-goal", "title": "Map"}])
        goal = ws.view().find("p18/goal", title="Map")
        before = ws.stage_status(goal)
        assert (before.current, before.current_label, before.next_label) == (None, None, "New")
        ws.move_stage(goal, "new")
        mid = ws.stage_status(ws.view().get("p18/goal", goal.id))
        assert (mid.current_label, mid.next_label) == ("New", "Done")
        ws.move_stage(ws.view().get("p18/goal", goal.id), "done")
        last = ws.stage_status(ws.view().get("p18/goal", goal.id))
        assert (last.current_label, last.next, last.next_label) == ("Done", None, None)


def test_a_request_waiting_for_the_go_is_needs_you_with_approval_required(tmp_path):
    from engine.plugin_api.testing import plugin_workspace

    with plugin_workspace(kit_folder(tmp_path), root=tmp_path / "ws") as ws:
        ws.cfg.ai.budgets.first_go = True
        ws.apply([{"op": "p18/add-goal", "title": "Map"}])
        goal = ws.view().find("p18/goal", title="Map")
        asked = ws.ask(
            "p18/plan", answer={"summary": "x", "ops": [{"op": "note", "text": "n"}]}, about=("p18/goal", goal.id)
        )
        request = ws.store.read().get("request", asked.request)
        assert (asked.state, request.data["state"], request.data["approval"]) == ("needs_you", "needs_you", "required")


def test_the_guide_says_what_the_answers_promised_it_would(tmp_path):
    from pathlib import Path

    guide = (Path(__file__).parents[1] / "docs" / "plugin-guide.md").read_text()
    assert "can't be a model validator" in guide  # 186
    assert "needs_you` with approval `required`" in guide  # 206
    assert "a label is None only when there is no such stage" in guide  # 172
    assert "Saving closes the workspace's store" in guide  # 172
    assert "proposal.apply(kept: Mapping[str, bool] | None = None" in guide  # 172
    assert "`provides.tiers`" in guide and "registrar.tier(" in guide  # 219
    assert "`adds` suggests values to add to a list setting" in guide  # 185

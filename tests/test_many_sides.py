"""Any number of sides (design 6.32, change log 228): the older single business reads as the first side, a person is on
the sides their record names, filing reads a watched source's sides after the people, on Personal the person is the
default owner, and plugins read the sides. Names and ids come from the fixtures."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from engine import sides
from engine.applier import Context, Inputs, apply_as_person, apply_changeset
from engine.config import load_config
from engine.config.yaml_edit import set_key
from engine.names import People
from engine.ops import CHANGESET
from engine.storage import StoreError, WriteContext
from engine.yaml_load import load_yaml
from tests import test_sides as shared
from tests.conftest import DEMO_B, fixture_records
from tests.test_sides import (
    _PM,
    BOTH_PERSON,
    BUSINESS_ID,
    BUSINESS_NAME,
    BUSINESS_PEOPLE,
    NO_SIDE_PERSON,
    OTHER_BUSINESS_NAME,
    PERSONAL_ID,
    PERSONAL_PEOPLE,
    PROJECTS,
    SIDE_WORDS,
    make_project,
    name_of,
    new_op,
)

# The workspace fixtures the sides tests build: each test here works on its own copy.
base, env, api, anytime = shared.base, shared.env, shared.api, shared.anytime

THIRD_NAME = fixture_records(DEMO_B, "organization")[2]["name"]


def add_side(env, name: str, kind: str = "job") -> str:
    """Make a top-level project and list it in the workspace's sides, as the person's own files would; the running
    settings take it in at once."""
    ws, cfg, store = env
    project = make_project(store, name)
    path = ws.config_dir / "workspace.yaml"
    held = [{"project": s.project, "kind": s.kind} for s in sides.side_list(store.read(), cfg)]
    entries = [*held, {"project": project, "kind": kind}]
    path.write_text(set_key(path.read_text(encoding="utf-8"), ["project", "sides"], entries), encoding="utf-8")
    cfg.files["workspace"] = load_config(ws.config_dir, env={}).files["workspace"]
    return project


def person_edit(env, person: str, fields: dict):
    _, cfg, store = env
    version = store.read().get("person", person).version
    op = {"op": "record.edit", "record": {"kind": "person", "id": person}, "fields": fields, "read_version": version}
    return apply_as_person(store, cfg, [op], "Changed on screen")


def put(env, person: str, **fields):
    """Write fields on a person's record directly, as stored data (no op), to set up a starting state."""
    _, _, store = env
    with store.transaction() as tx:
        tx.update("person", person, fields, _PM, read_version=tx.get("person", person).version)


# ---- the list of sides ----------------------------------------------------------------------------------------------


def test_the_older_single_business_setting_reads_as_one_side_and_the_file_is_not_rewritten(env):
    ws, cfg, store = env
    listed = sides.side_list(store.read(), cfg)
    assert [(s.project, s.kind, s.name) for s in listed] == [(BUSINESS_ID, "business", PROJECTS[0]["name"])]
    assert cfg.workspace.project.business == BUSINESS_ID
    assert "sides" not in load_yaml((ws.config_dir / "workspace.yaml").read_text(encoding="utf-8"))["project"]
    assert sides.business_project(store.read(), cfg) == BUSINESS_ID
    assert sides.side_ids(store.read(), cfg) == [PERSONAL_ID, BUSINESS_ID]


def test_two_sides_list_in_order_with_their_names_and_the_old_business_is_first_and_never_twice(env):
    ws, cfg, store = env
    second = add_side(env, OTHER_BUSINESS_NAME, "job")
    third = add_side(env, THIRD_NAME, "business")
    listed = sides.side_list(store.read(), cfg)
    assert [(s.project, s.kind, s.name) for s in listed] == [
        (BUSINESS_ID, "business", PROJECTS[0]["name"]),
        (second, "job", OTHER_BUSINESS_NAME),
        (third, "business", THIRD_NAME),
    ]
    # The older business, listed again in `sides`, is still one side, and "the" business stays the first.
    again = [e.project for e in cfg.workspace.project.sides]
    assert again.count(BUSINESS_ID) == 1 and sides.business_project(store.read(), cfg) == BUSINESS_ID
    assert sides.side_ids(store.read(), cfg) == [PERSONAL_ID, BUSINESS_ID, second, third]


def test_a_side_whose_project_is_gone_and_the_personal_project_are_left_out_of_the_list(env):
    ws, cfg, store = env
    second = add_side(env, OTHER_BUSINESS_NAME)
    with store.transaction() as tx:
        tx.delete("project", second, _PM, read_version=tx.get("project", second).version)
    assert [s.project for s in sides.side_list(store.read(), cfg)] == [BUSINESS_ID]
    path = ws.config_dir / "workspace.yaml"
    entries = [{"project": PERSONAL_ID, "kind": "job"}, {"project": BUSINESS_ID, "kind": "business"}]
    path.write_text(set_key(path.read_text(encoding="utf-8"), ["project", "sides"], entries), encoding="utf-8")
    cfg.files["workspace"] = load_config(ws.config_dir, env={}).files["workspace"]
    assert [s.project for s in sides.side_list(store.read(), cfg)] == [BUSINESS_ID]


def test_a_side_is_named_by_its_top_project_and_the_older_words_are_aliases_for_two_of_them(env):
    _, cfg, store = env
    second = add_side(env, OTHER_BUSINESS_NAME)
    child = make_project(store, "Second child", second)
    view = store.read()
    assert sides.side_of_project(view, cfg, child) == second
    assert sides.resolve_side(view, cfg, "personal") == PERSONAL_ID
    assert sides.resolve_side(view, cfg, "business") == BUSINESS_ID
    assert sides.resolve_side(view, cfg, second) == second
    assert sides.resolve_side(view, cfg, child) is None and sides.resolve_side(view, cfg, "other") is None
    assert [sides.side_word(view, cfg, s) for s in (PERSONAL_ID, BUSINESS_ID, second, child)] == [
        "personal",
        "business",
        "business",
        None,
    ]


# ---- people ---------------------------------------------------------------------------------------------------------


def test_stored_people_with_only_a_side_read_as_the_sides_it_means(env):
    _, cfg, store = env
    view = store.read()
    people = People(store, cfg)
    for person in BUSINESS_PEOPLE:
        assert sides.sides_of_person(view, cfg, people, person["id"]) == [BUSINESS_ID]
        assert sides.side_of_person(view, cfg, people, person["id"]) == "business"
    for person in PERSONAL_PEOPLE:
        assert sides.sides_of_person(view, cfg, people, person["id"]) == [PERSONAL_ID]
        assert sides.side_of_person(view, cfg, people, person["id"]) == "personal"
    assert sides.sides_of_person(view, cfg, people, BOTH_PERSON["id"]) == [PERSONAL_ID, BUSINESS_ID]
    assert sides.side_of_person(view, cfg, people, BOTH_PERSON["id"]) == "both"
    assert sides.sides_of_person(view, cfg, people, NO_SIDE_PERSON["id"]) == []
    assert sides.side_of_person(view, cfg, people, NO_SIDE_PERSON["id"]) is None
    assert (
        sides.sides_of_person(view, cfg, people, None) == []
        and sides.sides_of_person(view, cfg, people, "PER-999") == []
    )


def test_a_person_on_two_sides_is_stored_with_both_and_reads_as_both(env):
    _, cfg, store = env
    second = add_side(env, OTHER_BUSINESS_NAME)
    who = NO_SIDE_PERSON["id"]
    person_edit(env, who, {"sides": [second, PERSONAL_ID]})
    data = store.read().get("person", who).data
    assert data["sides"] == [PERSONAL_ID, second]  # in the order of the sides' list, whatever order was written
    assert data["side"] == "both"
    assert sides.side_of_person(store.read(), cfg, People(store, cfg), who) == "both"
    person_edit(env, who, {"sides": [BUSINESS_ID, second]})
    data = store.read().get("person", who).data
    assert data["sides"] == [BUSINESS_ID, second] and data["side"] == "business"
    person_edit(env, who, {"sides": []})
    assert store.read().get("person", who).data["side"] is None


def test_naming_a_side_that_is_not_one_is_refused(env):
    _, _, store = env
    with pytest.raises(StoreError, match="isn't one of your sides"):
        person_edit(env, NO_SIDE_PERSON["id"], {"sides": ["PRJ-999"]})
    assert store.read().get("person", NO_SIDE_PERSON["id"]).data["sides"] == []


def test_writing_a_side_while_there_is_at_most_one_other_keeps_the_sides_in_step(env):
    _, _, store = env
    who = NO_SIDE_PERSON["id"]
    person_edit(env, who, {"side": "business"})
    assert store.read().get("person", who).data["sides"] == [BUSINESS_ID]
    person_edit(env, who, {"side": "both"})
    assert store.read().get("person", who).data["sides"] == [PERSONAL_ID, BUSINESS_ID]
    person_edit(env, who, {"side": "personal"})
    assert store.read().get("person", who).data["sides"] == [PERSONAL_ID]
    person_edit(env, who, {"side": None})
    assert store.read().get("person", who).data["sides"] == []


def test_writing_business_or_both_with_two_other_sides_is_refused_in_words_that_say_to_name_the_side(env):
    _, cfg, store = env
    add_side(env, OTHER_BUSINESS_NAME)
    who = NO_SIDE_PERSON["id"]
    for word in ("business", "both"):
        with pytest.raises(StoreError) as refused:
            person_edit(env, who, {"side": word})
        assert "name the side" in str(refused.value) and OTHER_BUSINESS_NAME in str(refused.value)
    assert store.read().get("person", who).data["side"] is None
    person_edit(env, who, {"side": "personal"})  # naming Personal is still one side
    assert store.read().get("person", who).data["sides"] == [PERSONAL_ID]

    def set_field(field, value):
        cs = CHANGESET.validate_python(
            {"ops": [{"op": "record.set", "kind": "person", "id": who, "field": field, "value": value}]},
            context={"op_models": store.plugins.ops},
        )
        ctx = Context(store, cfg, People(store, cfg), ("record.set",), Inputs("REQ-1", None, "", "", "trusted"))
        op = store.read().get("changeset", apply_changeset(cs, [], ctx, run=None)).data["ops"][0]
        return op["status"], op.get("reason") or " ".join(p["message"] for p in op["problems"])

    status, why = set_field("side", "business")
    assert status != "applied" and "name the side" in why
    assert set_field("side", "personal")[0] == "applied"


def test_the_people_routes_refuse_business_with_two_sides_and_take_a_list_of_sides(api):
    client, ws, store = api
    first = client.post("/api/setup/business", json={"name": BUSINESS_NAME}).json()["project"]
    second = client.post("/api/setup/business", json={"name": OTHER_BUSINESS_NAME, "kind": "job"}).json()["project"]
    personal = ws.config(env={}).workspace.project.personal
    made = client.post("/api/people", json={"full_name": "Casey Example", "side": "business"})
    assert made.status_code == 409 and "name the side" in made.json()["detail"]
    made = client.post("/api/people", json={"full_name": "Casey Example", "sides": [second, personal]})
    assert made.status_code == 200, made.text
    pid = made.json()["id"]
    shown = {p["id"]: p for p in client.get("/api/people").json()}[pid]
    assert shown["sides"] == [personal, second] and shown["side"] == "both"
    refused = client.post(f"/api/people/{pid}", json={"side": "business"})
    assert refused.status_code == 409 and "name the side" in refused.json()["detail"]
    assert client.post(f"/api/people/{pid}", json={"sides": [first]}).status_code == 200
    shown = {p["id"]: p for p in client.get("/api/people").json()}[pid]
    assert shown["sides"] == [first] and shown["side"] == "business"


# ---- filing among several sides -------------------------------------------------------------------------------------


def file_ops(env, ops, raw=None, sender=None, source=None):
    _, cfg, store = env
    return sides.file_by_people(ops, store.read(), cfg, People(store, cfg), sender, raw, source=source)


def stamp(op):
    found = getattr(op, "filed_by", None)
    return op.project, found.by if found else None, found.word if found else None


def test_filing_by_people_picks_the_side_a_person_is_on_among_three_sides(env):
    second = add_side(env, OTHER_BUSINESS_NAME)
    third = add_side(env, THIRD_NAME)
    a, b = PERSONAL_PEOPLE
    put(env, a["id"], sides=[second])
    put(env, b["id"], sides=[third])
    assert stamp(file_ops(env, [new_op(owners=[name_of(a)])])[0]) == (second, "people", None)
    assert stamp(file_ops(env, [new_op(owners=[name_of(b)])])[0]) == (third, "people", None)
    # A person on the older word alone still files under the side that word means.
    assert stamp(file_ops(env, [new_op(owners=[name_of(BUSINESS_PEOPLE[0])])])[0]) == (BUSINESS_ID, "people", None)
    # Two people on different sides decide nothing; a person on two sides abstains.
    assert stamp(file_ops(env, [new_op(owners=[name_of(a), name_of(b)])])[0])[0] is None
    put(env, a["id"], sides=[second, third])
    assert stamp(file_ops(env, [new_op(owners=[name_of(a)])])[0])[0] is None
    assert stamp(file_ops(env, [new_op(owners=[name_of(a), name_of(b)])])[0]) == (third, "people", None)


def test_the_business_side_words_apply_only_while_there_is_exactly_one_other_side(env):
    word = SIDE_WORDS["business"][0]
    assert stamp(file_ops(env, [new_op(text=f"About {word}")])[0]) == (BUSINESS_ID, "word", word)
    add_side(env, OTHER_BUSINESS_NAME)
    assert stamp(file_ops(env, [new_op(text=f"About {word}")])[0])[0] is None
    personal_word = SIDE_WORDS["personal"][0]
    assert stamp(file_ops(env, [new_op(text=f"About {personal_word}")])[0]) == (PERSONAL_ID, "word", personal_word)


def a_watched_source(env, watch_id: str) -> str:
    """A saved input that a watched source's read handed in, by that source's id."""
    _, _, store = env
    with store.transaction() as tx:
        return tx.create(
            "source",
            {
                "received_at": "2026-10-19T14:00:00+00:00",
                "kind": "watched:folder",
                "title": "Something handed in",
                "content_hash": "0" * 64,
                "trust": "untrusted",
                "watched": {"source": watch_id, "key": "item-1", "change": "new"},
            },
            _PM,
        ).id


def serve(env, *projects: str) -> str:
    """Say which sides the first watched source serves, and return its id."""
    _, cfg, _ = env
    watch = cfg.watch.sources[0]
    watch.sides = list(projects)
    return watch.id


def test_a_source_serving_one_side_files_its_unplaced_mail_there_and_says_so(env):
    second = add_side(env, OTHER_BUSINESS_NAME)
    watch = serve(env, second)
    source = a_watched_source(env, watch)
    label = env[1].watch.sources[0].label
    got = file_ops(env, [new_op(text="Call about it")], source=source)
    assert stamp(got[0]) == (second, "source", label)
    # Without the source it is unplaced; the people still come first.
    assert stamp(file_ops(env, [new_op(text="Call about it")])[0])[0] is None
    owner = PERSONAL_PEOPLE[0]
    assert stamp(file_ops(env, [new_op(owners=[name_of(owner)])], source=source)[0]) == (PERSONAL_ID, "people", None)
    # A source that names no side that exists says nothing.
    serve(env, "PRJ-999")
    assert stamp(file_ops(env, [new_op(text="Call about it")], source=source)[0])[0] is None


def test_a_source_serving_two_sides_narrows_the_ranks_after_it_to_them(env):
    second = add_side(env, OTHER_BUSINESS_NAME)
    third = add_side(env, THIRD_NAME)
    in_personal = make_project(env[2], "Personal errand here", PERSONAL_ID)
    in_second = make_project(env[2], "Second errand here", second)
    in_third = make_project(env[2], "Third errand here", third)
    for project, code in ((in_personal, "qzx-per"), (in_second, "qzx-two"), (in_third, "qzx-three")):
        with env[2].transaction() as tx:
            tx.update("project", project, {"aliases": [code]}, _PM, read_version=tx.get("project", project).version)
    source = a_watched_source(env, serve(env, second, third))
    both = "qzx-two and qzx-per"
    # Two aliases of two sides decide nothing without the source; with it, only the sides it serves count.
    assert stamp(file_ops(env, [new_op(text=both)])[0])[0] is None
    assert stamp(file_ops(env, [new_op(text=both)], source=source)[0]) == (in_second, "alias", "qzx-two")
    assert stamp(file_ops(env, [new_op(text="qzx-two and qzx-three")], source=source)[0])[0] is None
    # What names only a side the source doesn't serve is left unplaced.
    assert stamp(file_ops(env, [new_op(text="Only qzx-per here")], source=source)[0])[0] is None
    assert stamp(file_ops(env, [new_op(text="Only qzx-per here")])[0])[:2] == (in_personal, "alias")


def test_a_filing_by_source_moves_to_personal_in_one_step_and_from_personal_only_when_one_other_side(env):
    _, cfg, store = env
    second = add_side(env, OTHER_BUSINESS_NAME)
    source = a_watched_source(env, serve(env, second))
    filed = file_ops(env, [new_op(text="Call about it")], source=source)[0]
    with store.transaction() as tx:
        action = tx.create(
            "action",
            {
                "text": "Call about it",
                "owners": [{"person": shared.ME}],
                "project": second,
                "filed_by": filed.filed_by.model_dump(),
            },
            _PM,
        )
    shown = sides.filed_view(store.read(), cfg, "action", store.read().get("action", action.id))
    assert shown["by"] == "source" and shown["move_to"] == PERSONAL_ID and shown["project"] == second
    with store.transaction() as tx:
        tx.update(
            "action",
            action.id,
            {"project": PERSONAL_ID, "filed_by": {"by": "word", "word": "x", "project": PERSONAL_ID}},
            _PM,
            read_version=tx.get("action", action.id).version,
        )
    shown = sides.filed_view(store.read(), cfg, "action", store.read().get("action", action.id))
    assert shown["move_to"] is None  # two other sides: which one is the person's to say


# ---- the person as the default owner on Personal --------------------------------------------------------------------


def apply_action(env, **fields) -> tuple[object, list]:
    _, cfg, store = env
    op = new_op(text="Send the proof to the printer today", **fields)
    cs = CHANGESET.validate_python(
        {"ops": [op.model_dump(mode="json", exclude_none=True)]}, context={"op_models": store.plugins.ops}
    )
    ctx = Context(store, cfg, People(store, cfg), ("action.add",), Inputs("REQ-1", None, "", "said so", "untrusted"))
    apply_changeset(cs, [], ctx, run=None)
    action = store.read().list("action")[-1]
    asked = [q for q in store.read().list("question") if (q.data.get("resolves") or {}).get("action") == action.id]
    return action, asked


def test_an_action_on_personal_that_names_nobody_is_the_persons_own_and_is_not_held(env):
    _, cfg, _ = env
    action, asked = apply_action(env, project=PERSONAL_ID)
    assert action.data["owners"] == [{"person": cfg.workspace.user.person, "team": None}]
    assert action.data["status"] == "open" and asked == []


def test_an_action_filed_under_personal_by_the_rules_is_the_persons_own_too(env):
    _, cfg, _ = env
    owner = PERSONAL_PEOPLE[0]
    action, asked = apply_action(env, promised_to=[name_of(owner)])
    assert action.data["project"] == PERSONAL_ID and action.data["status"] == "open" and asked == []
    assert [o["person"] for o in action.data["owners"]] == [cfg.workspace.user.person]


def test_an_action_naming_an_unknown_person_on_personal_still_waits_for_the_person_to_say_who(env):
    _, cfg, store = env
    before = len(store.read().list("action"))
    apply_action(env, project=PERSONAL_ID, owners=["Qzx Unknown"])
    assert len(store.read().list("action")) == before  # nothing is added as the person's own
    reasons = [op.get("reason") for cs in store.read().list("changeset") for op in cs.data["ops"]]
    assert "Waiting for you to say who this is" in reasons


def test_an_action_on_a_business_side_with_no_owner_is_still_held_for_an_owner(env):
    second = add_side(env, OTHER_BUSINESS_NAME)
    for project in (BUSINESS_ID, second):
        action, asked = apply_action(env, project=project)
        assert action.data["status"] == "held" and action.data["owners"] == []
        assert len(asked) == 1 and asked[0].data["title"].startswith("Pick an owner")


def test_with_no_other_side_an_unfiled_action_on_the_only_top_project_is_the_persons_own(tmp_path):
    from engine.storage import Store
    from engine.workspace import init_workspace

    ws = init_workspace(tmp_path / "fresh", git=False, you="Pat Example")
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    try:
        action, asked = apply_action((ws, cfg, store))
        assert action.data["project"] == cfg.workspace.project.personal
        assert [o["person"] for o in action.data["owners"]] == [cfg.workspace.user.person] and asked == []
    finally:
        store.close()


# ---- what Today and Follow-ups carry -----------------------------------------------------------------------------


def test_each_line_and_row_carries_the_id_of_its_side_with_two_sides_and_the_filter_has_the_state(anytime):
    client, ws, store = anytime
    cfg = ws.config(env={})
    me, personal = cfg.workspace.user.person, cfg.workspace.project.personal
    first = client.post("/api/setup/business", json={"name": BUSINESS_NAME}).json()["project"]
    second = client.post("/api/setup/business", json={"name": OTHER_BUSINESS_NAME, "kind": "job"}).json()["project"]
    homes = {"first": first, "second": second, "personal": personal, "none": None}
    with store.transaction() as tx:
        other = tx.create("person", {"full_name": "Casey Example"}, _PM).id
        ids = {}
        for name, home in homes.items():
            project = {"projects": [home]} if home else {}
            mine = tx.create(
                "question", {"to": me, "title": f"Decide the {name} thing?", "kind": "decision", **project}, _PM
            )
            theirs = tx.create("question", {"to": other, "title": f"Ask about the {name} thing?", **project}, _PM)
            ids[name] = (f"question:{mine.id}", theirs.id)
    lines = {line["key"]: line["side"] for line in client.get("/api/today/queue").json()}
    assert {name: lines[key] for name, (key, _) in ids.items()} == homes
    rows = {}
    for section in client.get("/api/followups").json():
        rows |= {row["id"]: row["side"] for row in section["questions"]}
    assert {name: rows[qid] for name, (_, qid) in ids.items()} == homes
    state = client.get("/api/setup/business").json()
    assert state["personal"] == personal and [s["project"] for s in state["sides"]] == [first, second]
    # The line that asks which side something belongs to names no one side while there are two.
    with store.transaction() as tx:
        tx.create(
            "note", {"text": "A loose note."}, WriteContext(actor="assistant", trust="untrusted", op="test.sides")
        )
    unfiled = [line for line in client.get("/api/today/queue").json() if line["kind"] == "unfiled"]
    assert unfiled and unfiled[0]["state"] == "which_side" and unfiled[0]["subject"] is None


def test_a_line_about_records_on_two_sides_is_on_neither(env):
    _, cfg, store = env
    second = add_side(env, OTHER_BUSINESS_NAME)
    with store.transaction() as tx:
        ids = [
            tx.create("action", {"text": f"On {home}", "owners": [{"person": shared.ME}], "project": home}, _PM).id
            for home in (PERSONAL_ID, BUSINESS_ID, second)
        ]
    view = store.read()
    of = lambda *actions: sides.side_of_line(view, cfg, SimpleNamespace(project=None, actions=list(actions)))  # noqa: E731
    assert of(ids[2], ids[2]) == second and of(ids[0], ids[2]) is None and of(ids[1], ids[2]) is None


# ---- plugin API 0.3.91 ----------------------------------------------------------------------------------------------


PACK = """
from engine.plugin_api import Settings

class Config(Settings):
    pass

def register(registrar):
    pass
"""


def a_plugin_folder(tmp_path):
    import yaml

    path = tmp_path / "sidepack"
    path.mkdir()
    (path / "fixture.py").write_text(PACK)
    manifest = {
        "name": "sidepack",
        "version": "0.1.0",
        "plugin_api": ">=0.3,<0.4",
        "description": "Reads the sides",
        "entry": "fixture:register",
        "config_schema": "fixture:Config",
    }
    (path / "plugin.yaml").write_text(yaml.safe_dump(manifest))
    return path


def test_a_plugin_reads_the_sides_the_side_of_a_record_and_a_persons_sides(tmp_path):
    from engine.plugin_api import PLUGIN_API_VERSION, Side
    from engine.plugin_api.testing import plugin_workspace

    assert PLUGIN_API_VERSION == "0.3.91"
    with plugin_workspace(a_plugin_folder(tmp_path), root=tmp_path / "ws") as ws:
        view = ws.view()
        personal = ws.cfg.workspace.project.personal
        personal_name = view.get("project", personal).data["name"]
        assert view.sides() == [Side(personal, "personal", personal_name)]
        first = ws.add_side(BUSINESS_NAME)
        second = ws.add_side(OTHER_BUSINESS_NAME, "job")
        view = ws.view()
        assert view.sides() == [
            Side(personal, "personal", personal_name),
            Side(first, "business", BUSINESS_NAME),
            Side(second, "job", OTHER_BUSINESS_NAME),
        ]
        child = ws.store.transaction()
        with child as tx:
            under = tx.create("project", {"name": "Under the second", "parent": second}, _PM).id
            note = tx.create("note", {"text": "A note.", "project": under}, _PM).id
            loose = tx.create("note", {"text": "A loose note."}, _PM).id
        view = ws.view()
        assert view.side_of(under) == second and view.side_of(view.get("project", under)) == second
        assert view.side_of(view.get("note", note)) == second and view.side_of(personal) == personal
        assert view.side_of(view.get("note", loose)) is None and view.side_of("PRJ-999") is None
        # A person's `sides` is a core record field plugins read, written through the core's own op.
        who = view.list("person")[0]
        done = ws.apply(
            [
                {
                    "op": "record.edit",
                    "record": {"kind": "person", "id": who.id},
                    "fields": {"sides": [second, personal]},
                    "read_version": who.version,
                }
            ]
        )
        assert done.status == "applied", done.problems
        data = ws.view().get("person", who.id).data
        assert data["sides"] == [personal, second] and data["side"] == "both"

"""A business or job is also an organization (design 6.32 and 5.1): adding a side makes or links the organization of the
same name, the side's project names it by id (`Project.organization`), the person the app is for works for it, and the
two keep one name. A side from before gets its organization once, at start. All of it is the person's own change in one
changeset, so Undo takes it back together."""

from __future__ import annotations

from engine import sides
from engine.names import People
from engine.organizations import link_sides
from engine.storage import WriteContext
from tests.test_sides import BUSINESS_NAME, OTHER_BUSINESS_NAME
from tests.test_walkthrough import _add_side, _fresh, _open

_PM = WriteContext(actor="pm", trust="trusted", op="test.side-organization")
MY_NAME = "Robin Example"


def _named(c, name=MY_NAME):
    made = c.post("/api/me", json={"full_name": name})
    assert made.status_code == 200, made.text
    return made.json()["person"]


def _orgs(c):
    return {o["name"]: o for o in c.get("/api/organizations").json()}


def _read(c):
    return c.app.state.store.read()


def test_adding_a_business_makes_its_organization_linked_by_id_and_the_person_works_for_it(tmp_path):
    ws, c = _fresh(tmp_path)
    me = _named(c)
    assert _orgs(c) == {}
    side = _add_side(c, BUSINESS_NAME, "business")
    found = _orgs(c)
    assert list(found) == [BUSINESS_NAME]
    org = found[BUSINESS_NAME]
    assert (org["side"], org["side_kind"]) == (side, "business")
    view = _read(c)
    assert view.get("project", side).data["organization"] == org["id"]
    assert view.get("person", me).data["org"] == org["id"]
    assert org["people"] == 1
    state = c.get("/api/setup/business").json()
    assert [s["organization"] for s in state["sides"]] == [org["id"]]
    # Saying it again changes nothing and makes nothing.
    assert c.post("/api/setup/business", json={"name": BUSINESS_NAME}).json()["created"] is False
    assert list(_orgs(c)) == [BUSINESS_NAME]


def test_the_organization_is_made_in_the_one_changeset_and_undo_takes_all_of_it_back(tmp_path):
    ws, c = _fresh(tmp_path)
    me = _named(c)
    made = c.post("/api/setup/business", json={"name": BUSINESS_NAME}).json()
    store = c.app.state.store
    ops = store.read().get("changeset", made["changeset"]).data["ops"]
    assert [o["status"] for o in ops] == ["applied", "applied"]
    assert c.post(f"/api/changesets/{made['changeset']}/undo", json={"ops": None}).status_code == 200
    assert _orgs(c) == {}
    assert not _read(c).get("person", me).data.get("org")
    assert c.get("/api/setup/business").json()["sides"] == []


def test_an_organization_with_that_name_or_alias_is_linked_not_repeated_and_a_person_who_names_another_keeps_it(
    tmp_path,
):
    ws, c = _fresh(tmp_path)
    store = c.app.state.store
    with store.transaction() as tx:
        known = tx.create("organization", {"name": BUSINESS_NAME}, _PM).id
        other = tx.create("organization", {"name": "Other Org", "aliases": [OTHER_BUSINESS_NAME.upper()]}, _PM).id
    me = _named(c)
    with store.transaction() as tx:
        tx.update("person", me, {"org": other}, _PM, read_version=tx.get("person", me).version)
    first = _add_side(c, BUSINESS_NAME, "business")
    second = _add_side(c, OTHER_BUSINESS_NAME, "business")
    view = _read(c)
    assert view.get("project", first).data["organization"] == known
    assert view.get("project", second).data["organization"] == other  # found by its alias
    assert len(view.list("organization")) == 2
    assert view.get("person", me).data["org"] == other  # who they already work for is left alone
    # The side's name is the organization's, however the alias was spelled.
    assert view.get("organization", other).data["name"] == OTHER_BUSINESS_NAME


def test_the_person_named_after_the_business_works_for_it_too(tmp_path):
    ws, c = _fresh(tmp_path)
    side = _add_side(c, BUSINESS_NAME, "business")
    me = _named(c)
    view = _read(c)
    assert view.get("person", me).data["org"] == view.get("project", side).data["organization"]


def test_renaming_either_renames_the_other_in_one_write_and_no_name_is_held_twice(tmp_path):
    ws, c = _fresh(tmp_path)
    side = _add_side(c, BUSINESS_NAME, "business")
    org = _orgs(c)[BUSINESS_NAME]["id"]
    assert c.post(f"/api/projects/{side}", json={"name": "Renamed Works"}).status_code == 200
    assert list(_orgs(c)) == ["Renamed Works"]
    assert c.post(f"/api/organizations/{org}", json={"name": "Renamed Again"}).status_code == 200
    view = _read(c)
    assert view.get("project", side).data["name"] == "Renamed Again"
    assert [o.data["name"] for o in view.list("organization")] == ["Renamed Again"]
    assert [s.name for s in sides.side_list(view, ws.config(env={}))] == ["Renamed Again"]


def test_a_side_from_before_gets_its_organization_once_at_start_and_a_later_start_changes_nothing(tmp_path):
    ws, c = _fresh(tmp_path)
    me = _named(c)
    side = _add_side(c, BUSINESS_NAME, "business")
    store = c.app.state.store
    # Make the workspace as it was before the link: no organization, and the person naming none.
    with store.transaction() as tx:
        project = tx.get("project", side)
        tx.update("project", side, {"organization": None}, _PM, read_version=project.version)
        person = tx.get("person", me)
        tx.update("person", me, {"org": None}, _PM, read_version=person.version)
        for org in tx.list("organization"):
            tx.delete("organization", org.id, _PM, read_version=org.version)
    assert _orgs(c) == {}
    c = _open(ws)
    found = _orgs(c)
    assert list(found) == [BUSINESS_NAME] and found[BUSINESS_NAME]["side"] == side
    assert _read(c).get("person", me).data["org"] == found[BUSINESS_NAME]["id"]
    versions = {
        (r.kind, r.id): r.version for kind in ("organization", "project", "person") for r in _read(c).list(kind)
    }
    assert link_sides(c.app.state.store, ws.config(env={})) == 0
    c = _open(ws)
    again = {(r.kind, r.id): r.version for kind in ("organization", "project", "person") for r in _read(c).list(kind)}
    assert again == versions


def test_only_the_person_links_a_project_to_an_organization(tmp_path):
    from engine.applier import Context, Inputs, apply_changeset
    from engine.ops import CHANGESET

    ws, c = _fresh(tmp_path)
    store, cfg = c.app.state.store, ws.config(env={})
    ops = [{"op": "project.add", "name": BUSINESS_NAME, "organization": BUSINESS_NAME}]
    cs = CHANGESET.validate_python({"ops": ops}, context={"op_models": store.plugins.ops})
    ctx = Context(store, cfg, People(store, cfg), tuple(store.plugins.ops), Inputs("REQ-1", None, "", "", "trusted"))
    outcome = store.read().get("changeset", apply_changeset(cs, [], ctx, run=None)).data["ops"][0]
    assert outcome["status"] == "held"  # a project from the assistant waits for the person
    assert store.read().list("organization") == []
    assert BUSINESS_NAME not in [p.data["name"] for p in store.read().list("project")]
    from engine.records import model_for

    assert model_for("project").needs_person("organization", "any")  # and so does setting the link on its own


def test_taking_the_business_back_out_in_setup_takes_its_organization_and_undo_brings_it_back(tmp_path):
    ws, c = _fresh(tmp_path)
    me = _named(c)
    side = _add_side(c, BUSINESS_NAME, "business")
    assert c.post(f"/api/setup/sides/{side}/remove").status_code == 200
    assert _orgs(c) == {}
    assert not _read(c).get("person", me).data.get("org")
    restored = c.post(f"/api/setup/sides/{side}/restore", json={"kind": "business", "position": 0})
    assert restored.status_code == 200, restored.text
    found = _orgs(c)
    assert list(found) == [BUSINESS_NAME] and found[BUSINESS_NAME]["side"] == side
    assert _read(c).get("person", me).data["org"] == found[BUSINESS_NAME]["id"]


def test_an_organization_other_people_work_for_stays_when_the_side_is_taken_out(tmp_path):
    ws, c = _fresh(tmp_path)
    side = _add_side(c, BUSINESS_NAME, "business")
    org = _orgs(c)[BUSINESS_NAME]["id"]
    with c.app.state.store.transaction() as tx:
        tx.create("person", {"full_name": "Colleague Example", "org": org}, _PM)
    assert c.post(f"/api/setup/sides/{side}/remove").status_code == 200
    found = _orgs(c)
    assert list(found) == [BUSINESS_NAME] and found[BUSINESS_NAME]["side"] is None


def test_mail_from_the_organizations_people_files_under_the_side_by_the_domain_rule(tmp_path):
    ws, c = _fresh(tmp_path)
    _named(c)
    side = _add_side(c, BUSINESS_NAME, "business")
    org = _orgs(c)[BUSINESS_NAME]["id"]
    store = c.app.state.store
    domain = "mail.example.com"
    with store.transaction() as tx:
        tx.create(
            "person",
            {
                "full_name": "Colleague Example",
                "org": org,
                "sides": [side],
                "how_to_reach": {"email": f"colleague@{domain}"},
            },
            _PM,
        )
    cfg = ws.config(env={})
    view = store.read()
    assert sides.domain_side(view, People(store, cfg), cfg, domain) == side


def test_the_organizations_page_loads_so_a_side_and_its_organization_can_name_each_other(tmp_path):
    ws, c = _fresh(tmp_path)
    side = _add_side(c, BUSINESS_NAME, "business")
    org = _orgs(c)[BUSINESS_NAME]["id"]
    record = c.get("/api/record", params={"kind": "organization", "id": org})
    assert record.status_code == 200 and record.json()["fields"]["name"] == BUSINESS_NAME
    assert c.get(f"/api/record-pages/{org}", params={"kind": "organization"}).json()["name"] == BUSINESS_NAME
    page = c.get(f"/api/record-pages/{side}", params={"kind": "project"}).json()
    detail = next(d for d in page["details"] if d["field"] == "organization")
    assert [(r["kind"], r["id"], r["name"]) for r in detail["refs"]] == [("organization", org, BUSINESS_NAME)]

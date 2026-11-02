"""A person's contact details: each kind holds any number of values, and mail from any of them is that person's
(design 5.1, 6.11, 7.14; sweep X40). Old records that hold one text for a kind read as a list of one, the person's page
adds and removes a value with Undo, and the lists survive export and import. Names and addresses are invented here."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine import audience
from engine.applier import undo
from engine.contacts import all_values, first_value, restate_stored, with_value, without_value
from engine.names import People
from engine.records import Person
from engine.storage import Store, WriteContext
from engine.storage.export import export_data, import_data
from engine.workspace import init_workspace
from tests.e2e_just_me import the_person

TOKEN = "contact-lists-token"
WORK = "work.person@example.com"
HOME = "home.person@example.net"
PHONE = "555 0100"
PHONE_TWO = "555 0111"
_TEST = WriteContext(actor="pm", trust="trusted", op="test.contacts")


@pytest.fixture
def served(tmp_path):
    ws = init_workspace(tmp_path / "ws", git=False, you=the_person())
    cfg = ws.config(env={}, flags={"storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        yield client, app.state.store, cfg, ws


def _person(client, name: str, **more) -> str:
    made = client.post("/api/people", json={"full_name": name, **more})
    assert made.status_code == 200, made.text
    return made.json()["id"]


def _view(client, person: str) -> dict:
    return next(p for p in client.get("/api/people").json() if p["id"] == person)


def _held(store, person: str) -> dict:
    return store.read().get("person", person).data["how_to_reach"]


# ---- the shapes ----------------------------------------


def test_an_old_single_value_is_read_as_a_list_of_one():
    old = Person.model_validate(
        {"id": "PER-9", "full_name": "Old Shape", "how_to_reach": {"email": WORK, "phone": PHONE}}
    )
    assert old.how_to_reach == {"email": [WORK], "phone": [PHONE]}
    new = Person.model_validate({"id": "PER-9", "full_name": "New Shape", "how_to_reach": {"email": [WORK, HOME]}})
    assert new.how_to_reach == {"email": [WORK, HOME]}
    assert first_value(old.how_to_reach, "email") == WORK and first_value(old.how_to_reach, "fax") == ""


def test_helpers_keep_values_distinct_and_drop_a_kind_left_empty():
    held = with_value({"email": WORK}, "email", WORK.upper())
    assert held == {"email": [WORK]}, "the same address in another case is the same address"
    held = with_value(held, "email", HOME)
    assert all_values(held) == [WORK, HOME]
    assert without_value(held, "email", WORK) == {"email": [HOME]}
    assert without_value({"email": [WORK]}, "email", WORK) == {}


def test_records_stored_with_one_text_become_lists_once_when_a_workspace_opens(tmp_path):
    store = Store(tmp_path / "a.db", cfg=init_workspace(tmp_path / "ws", git=False, you=the_person()).config(env={}))
    with store.transaction() as tx:
        old = tx.create("person", {"full_name": "Older Record"}, _TEST)
        new = tx.create("person", {"full_name": "Newer Record", "how_to_reach": {"email": [WORK]}}, _TEST)
        # What an earlier version stored: one text for each kind.
        tx.sql(
            "UPDATE records SET data = json_set(data, '$.how_to_reach', json(?)) WHERE kind='person' AND id=?",
            (json.dumps({"email": HOME, "phone": PHONE}), old.id),
        )
    assert store.read().get("person", old.id).data["how_to_reach"] == {"email": HOME, "phone": PHONE}
    assert restate_stored(store) == 1
    assert _held(store, old.id) == {"email": [HOME], "phone": [PHONE]}
    assert _held(store, new.id) == {"email": [WORK]}
    assert restate_stored(store) == 0, "later starts find nothing to change"
    # The change is in the ledger like any other.
    assert any(e["op"] == "migrate.contact_lists" for e in store.read().ledger() if e["record_id"] == old.id)
    store.close()


# ---- matching mail from any address ----------------------------------------


def test_mail_from_a_second_address_is_matched_to_the_person():
    records = {
        "PER-1": {"full_name": "The Owner"},
        "PER-2": {"full_name": "Dana Lark", "how_to_reach": {"email": [WORK, HOME], "phone": [PHONE]}},
        "PER-3": {"full_name": "Sam Reed", "how_to_reach": {"email": "sam.reed@example.com"}},
    }
    people = People.from_records(records, "PER-1")
    assert people.match_entries([f"Someone Else <{HOME.upper()}>"]) == {"PER-2"}, "the second address"
    assert people.match_entries([f"Someone Else <{WORK}>"]) == {"PER-2"}, "the first address"
    assert people.match_entries(["Another <sam.reed@example.com>"]) == {"PER-3"}, "an old single value still matches"
    assert people.match_entries(["Nobody <nobody@example.com>"]) == set()
    assert audience.addresses_of(people, "PER-2") == {WORK, HOME}


def test_a_new_person_cannot_take_an_address_someone_else_holds_in_a_list(served):
    client, *_ = served
    _person(client, "Dana Lark", how_to_reach={"email": [WORK, HOME]})
    refused = client.post("/api/people", json={"full_name": "Kit Lark", "how_to_reach": {"email": [HOME.upper()]}})
    assert refused.status_code == 409 and "Dana Lark" in refused.json()["detail"]


# ---- adding and removing, with Undo ----------------------------------------


def test_a_form_for_a_new_person_takes_more_than_one_value_of_a_kind(served):
    client, store, *_ = served
    who = _person(
        client, "Dana Lark", how_to_reach={"email": [WORK, " " + HOME + " ", ""], "phone": [PHONE, PHONE_TWO]}
    )
    assert _view(client, who)["how_to_reach"] == {"email": [WORK, HOME], "phone": [PHONE, PHONE_TWO]}
    assert _held(store, who) == {"email": [WORK, HOME], "phone": [PHONE, PHONE_TWO]}
    # A client that still sends one text per kind is understood.
    other = _person(client, "Sam Reed", how_to_reach={"email": "sam.reed@example.com"})
    assert _view(client, other)["how_to_reach"] == {"email": ["sam.reed@example.com"]}


def test_adding_and_removing_a_value_each_has_undo(served):
    client, store, cfg, ws = served
    who = _person(client, "Dana Lark", how_to_reach={"email": [WORK]})
    # Add a second address.
    added = client.post(f"/api/people/{who}", json={"how_to_reach": {"email": [WORK, HOME]}})
    assert added.status_code == 200, added.text
    assert _view(client, who)["how_to_reach"] == {"email": [WORK, HOME]}
    add_change = store.read().list("changeset")[-1].id
    # Remove the first one: the second becomes the one used when a single one is needed.
    removed = client.post(f"/api/people/{who}", json={"how_to_reach": {"email": [HOME]}})
    assert removed.status_code == 200, removed.text
    assert _view(client, who)["how_to_reach"] == {"email": [HOME]}
    remove_change = store.read().list("changeset")[-1].id
    assert remove_change != add_change
    # Undo of the removal brings the address back; Undo of the add takes the second away again.
    assert undo(store, remove_change).skipped == []
    assert _held(store, who) == {"email": [WORK, HOME]}
    assert undo(store, add_change).skipped == []
    assert _held(store, who) == {"email": [WORK]}


def test_a_confirmed_contact_detail_is_added_to_the_ones_the_person_has(served):
    from engine.applier import apply_as_person

    client, store, *_ = served
    who = _person(client, "Dana Lark", how_to_reach={"phone": [PHONE]})
    op = {"op": "person.contact", "person": who, "kind": "phone", "value": PHONE_TWO}
    cs = apply_as_person(store, served[2], [op], "Added a contact")
    assert _held(store, who) == {"phone": [PHONE, PHONE_TWO]}
    assert undo(store, cs).skipped == []
    assert _held(store, who) == {"phone": [PHONE]}


# ---- export and import ----------------------------------------


def test_lists_survive_export_and_import_and_an_old_export_loads_as_lists(served, tmp_path):
    client, store, cfg, ws = served
    who = _person(client, "Dana Lark", how_to_reach={"email": [WORK, HOME], "phone": [PHONE]})
    export_data(store, tmp_path / "out")
    fresh = Store(tmp_path / "fresh.db", cfg=cfg)
    import_data(fresh, tmp_path / "out")
    assert _held(fresh, who) == {"email": [WORK, HOME], "phone": [PHONE]}
    export_data(fresh, tmp_path / "again")
    assert (tmp_path / "out" / "person.json").read_bytes() == (tmp_path / "again" / "person.json").read_bytes()
    fresh.close()
    # An export written before a kind could hold several has one text each.
    old = json.loads((tmp_path / "out" / "person.json").read_text())
    for record in old:
        if record["id"] == who:
            record["how_to_reach"] = {"email": WORK, "phone": PHONE}
    (tmp_path / "old").mkdir()
    for path in (tmp_path / "out").iterdir():
        (tmp_path / "old" / path.name).write_bytes(path.read_bytes())
    (tmp_path / "old" / "person.json").write_text(json.dumps(old))
    loaded = Store(tmp_path / "loaded.db", cfg=cfg)
    import_data(loaded, tmp_path / "old")
    assert _held(loaded, who) == {"email": [WORK], "phone": [PHONE]}
    loaded.close()

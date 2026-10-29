"""People and record pages (design 6.32, 7.14): a person's contact details and sides can be added and changed after
setup, a to-do handed to someone is theirs to do and never "promised" to the person, and a record's own pages say each
fact once. Names come from the fixtures."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine.workspace import init_workspace
from tests.e2e_just_me import the_person
from tests.e2e_sides import seed_sides

TOKEN = "people-pages-token"


@pytest.fixture
def sided(tmp_path):
    """A workspace with Personal, a job and a business, as the side filter's server is made."""
    ws = init_workspace(tmp_path / "ws", git=False, you=the_person())
    cfg = ws.config(env={}, flags={"storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        seeded = seed_sides(client, app.state.store, cfg)
        app.state.worker.apply_live()
        yield client, app.state.store, cfg, seeded


def _person(client, name: str, **more) -> str:
    made = client.post("/api/people", json={"full_name": name, **more})
    assert made.status_code == 200, made.text
    return made.json()["id"]


def _view(client, person: str) -> dict:
    return next(p for p in client.get("/api/people").json() if p["id"] == person)


# ---- X40: contact details and sides, after setup --------------------------------------------------------------------


def test_a_person_is_added_with_an_email_and_a_phone_and_they_can_be_changed_later(sided):
    client, _store, _cfg, seeded = sided
    personal = seeded["sides"]["personal"]["id"]
    who = _person(
        client,
        "Hattie Fenn",
        sides=[personal],
        relation="my cousin",
        how_to_reach={"Email": " hattie@example.com ", "phone": "555 0100"},
    )
    # The kind is the workspace's own spelling and the value is kept as typed, without stray spaces.
    assert _view(client, who)["how_to_reach"] == {"email": "hattie@example.com", "phone": "555 0100"}
    changed = client.post(f"/api/people/{who}", json={"how_to_reach": {"email": "hf@example.com"}})
    assert changed.status_code == 200, changed.text
    # A change replaces the whole set: the phone the form no longer holds is gone.
    assert _view(client, who)["how_to_reach"] == {"email": "hf@example.com"}


def test_a_contact_kind_the_workspace_does_not_offer_is_refused_in_plain_words(sided):
    client, *_ = sided
    who = _person(client, "Ivo Marsh")
    refused = client.post(f"/api/people/{who}", json={"how_to_reach": {"carrier pigeon": "the loft"}})
    assert refused.status_code == 409
    assert "carrier pigeon" in refused.json()["detail"]


def test_an_address_someone_else_holds_is_refused_with_their_name(sided):
    client, *_ = sided
    first = _person(client, "June Alder", how_to_reach={"email": "june@example.com"})
    second = _person(client, "Kit Alder")
    refused = client.post(f"/api/people/{second}", json={"how_to_reach": {"email": "JUNE@example.com"}})
    assert refused.status_code == 409
    assert "June Alder" in refused.json()["detail"]
    assert _view(client, first)["how_to_reach"] == {"email": "june@example.com"}


def test_a_blank_contact_is_left_out(sided):
    client, *_ = sided
    who = _person(client, "Lena Cole", how_to_reach={"email": "lena@example.com", "phone": "  "})
    assert _view(client, who)["how_to_reach"] == {"email": "lena@example.com"}


def test_a_persons_sides_are_changed_after_they_are_added(sided):
    client, _store, _cfg, seeded = sided
    job = seeded["sides"]["job"]["id"]
    personal = seeded["sides"]["personal"]["id"]
    who = _person(client, "Mo Reed", sides=[personal])
    done = client.post(f"/api/people/{who}", json={"sides": [personal, job]})
    assert done.status_code == 200, done.text
    assert _view(client, who)["sides"] == [personal, job]
    assert _view(client, who)["side"] == "both"


# ---- X35: a to-do handed to someone is theirs to do, not something they promised -------------------------------------


def test_a_to_do_given_to_someone_is_not_listed_as_a_promise_they_made(sided):
    client, store, cfg, seeded = sided
    me = cfg.workspace.user.person
    todo = next(a for a in store.read().list("action") if a.data["text"] == seeded["todos"]["personal"])
    who = _person(client, "Nell Ward")
    done = client.post(
        "/api/records/edit",
        json={"kind": "action", "id": todo.id, "fields": {"owners": [{"person": who}]}, "read_version": todo.version},
    )
    assert done.status_code == 200, done.text
    assert me not in {o["person"] for o in store.read().get("action", todo.id).data["owners"]}
    memory = client.get(f"/api/people/{who}/memory").json()
    assert memory["promised_by"] == []
    # It is still open with them, on their page.
    page = client.get(f"/api/record-pages/{who}", params={"kind": "person"}).json()
    assert todo.id in {a["id"] for a in page["open_actions"]}


def test_a_promise_they_made_is_still_listed_as_theirs(sided):
    client, _store, _cfg, seeded = sided
    who = next(p for p in client.get("/api/people").json() if p["name"] == seeded["owed_by"]["personal"])["id"]
    assert [i["text"] for i in client.get(f"/api/people/{who}/memory").json()["promised_by"]] == [
        seeded["promises"]["personal"]
    ]


def test_what_the_person_promised_someone_is_open_with_them_on_their_page(sided):
    """The page lists everything open between the two of them, both ways: what they own, and what the person promised
    them (which the person owns), so none of it needs a second list."""
    client, store, cfg, _seeded = sided
    me = cfg.workspace.user.person
    who = _person(client, "Olive Hart")
    from engine.storage import WriteContext

    ctx = WriteContext(actor="pm", trust="trusted", op="test.promise")
    with store.transaction() as tx:
        promised = tx.create(
            "action", {"text": "Send Olive the invoice", "owners": [{"person": me}], "promised_to": [who]}, ctx
        ).id
        unrelated = tx.create("action", {"text": "Water the ferns", "owners": [{"person": me}]}, ctx).id
    page = client.get(f"/api/record-pages/{who}", params={"kind": "person"}).json()
    listed = {a["id"] for a in page["open_actions"]}
    assert promised in listed
    assert unrelated not in listed


def test_a_business_counts_the_people_who_are_on_its_side_as_well_as_those_who_name_it(sided):
    client, _store, _cfg, seeded = sided
    business = seeded["sides"]["business"]["id"]
    _person(client, "Pia Vale", sides=[business])
    org = next(o for o in client.get("/api/organizations").json() if o["side"] == business)
    assert org["people"] == 1

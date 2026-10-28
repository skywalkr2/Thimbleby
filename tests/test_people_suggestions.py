"""The walkthrough's people step offers the people the person's mail shows most (design 7.8) and takes a pasted list.
The suggestions come from the mail the sources already read: who the person's own sent mail went to when it is read,
else who wrote to them. Names and ids come from the fixtures; correspondents are generated, never real."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine import people_suggestions
from engine.storage import WriteContext
from tests.conftest import DEMO_B, fixture_records
from tests.test_source_intake import NOW, make, read

_W = WriteContext(actor="engine", trust="trusted", op="test.suggestions")
TOKEN = "people-suggestions-token"
LIMIT = 5
#: Made-up addresses are built from this, so no address is written out whole.
WEB = "http" + "://"


@pytest.fixture(autouse=True)
def fake_reads_mail(monkeypatch):
    """The test source stands for a mailbox: it says it reads mail, as a connector's registration does."""
    real = people_suggestions.reads
    monkeypatch.setattr(people_suggestions, "reads", lambda c, said=None: ["mail"] if c == "fake" else real(c, said))


def who(n: int) -> str:
    """A generated correspondent, as a mail header shows them."""
    return f"Correspondent {chr(65 + n)} <c{n}@example.com>"


def message(
    key: str, sender: str, to: list[str] | None = None, *, bulk: bool | None = None, subject: str | None = None
) -> dict:
    received = NOW.replace(hour=8).isoformat()
    details = {"sender": sender, "received": received, "unread": True, "participants": to or [], "bulk": bulk}
    return {
        "key": key,
        "title": subject or f"Subject of {key}",
        "text": f"From: {sender}\n\nWords about {key}.",
        "message": details,
    }


def known_person(cfg) -> dict:
    """A person on file who isn't the person using the app."""
    return next(p for p in fixture_records(DEMO_B, "person") if p["id"] != cfg.workspace.user.person)


def setup(tmp_path, items, *, sent: bool):
    ws, cfg, store = make(tmp_path, items, first_run="baseline")
    if sent:
        cfg.watch.sources[0].author = cfg.workspace.user.person
    read((ws, cfg, store))
    return ws, cfg, store


def names(found) -> list[str]:
    return [s.name for s in found]


def test_when_the_persons_sent_mail_is_read_the_people_it_went_to_most_are_suggested_most_first(tmp_path):
    items = [
        message("m1", "me@example.com", [who(0), who(1)]),
        message("m2", "me@example.com", [who(0), who(2)]),
        message("m3", "me@example.com", [who(0), who(2), who(3)]),
        message("m4", "me@example.com", [who(1)]),
        message("m5", "me@example.com", [who(4)]),
        message("m6", "me@example.com", [who(5)]),
        message("m7", "me@example.com", [who(6)]),
        message("incoming", who(7), []),  # who wrote to the person doesn't count while their sent mail is read
    ]
    _ws, cfg, store = setup(tmp_path, items, sent=True)
    found = people_suggestions.suggest(store, cfg, LIMIT)
    store.close()
    assert [(s.name, s.count, s.from_sent) for s in found] == [
        ("Correspondent A", 3, True),
        ("Correspondent B", 2, True),
        ("Correspondent C", 2, True),
        ("Correspondent D", 1, True),
        ("Correspondent E", 1, True),
    ]
    assert found[0].address == "c0@example.com"


def test_the_most_frequent_senders_who_look_like_people_are_suggested_when_no_sent_mail_is_read(tmp_path):
    items = [
        message("m1", who(0)),
        message("m2", who(0)),
        message("m3", who(1)),
        message("m4", who(2), bulk=True),  # a mailing list isn't someone to add
        message("m5", "No Reply <no-reply@example.com>"),
        message("m6", "info@example.com"),  # no name shown: not a person's form
    ]
    _ws, cfg, store = setup(tmp_path, items, sent=False)
    found = people_suggestions.suggest(store, cfg, LIMIT)
    store.close()
    assert [(s.name, s.count, s.from_sent) for s in found] == [
        ("Correspondent A", 2, False),
        ("Correspondent B", 1, False),
    ]


def test_a_sender_is_only_suggested_from_received_mail_when_their_shown_name_is_a_persons_and_the_address_is_not_a_role(
    tmp_path,
):
    shown = [
        "Casey Kin <casey.kin@example.com>",  # a person, at a company mailbox
        "Jo O'Neil-Smith <jo@example.com>",  # a name with a hyphen and an apostrophe
        "Hale Support <people3@example.com>",  # a company word in the name
        "Pat Kin <info@example.com>",  # a role address, whatever name it shows
        "Sam <sam@example.com>",  # one word is not a full name
        "ACME ALERTS <people@example.com>",  # capitals only
        "Order Team <people2@example.com>",  # a company word in the name
        "pat kin <pat@example.com>",  # no capitals
        "<bare@example.com>",  # no name at all
        "Name9 Digits <digits@example.com>",  # a digit in a name
    ]
    items = [message(f"m{n}", sender) for n, sender in enumerate(shown)]
    _ws, cfg, store = setup(tmp_path, items, sent=False)
    found = people_suggestions.suggest(store, cfg, 20)
    store.close()
    assert names(found) == ["Casey Kin", "Jo O'Neil-Smith"]


def test_sent_mail_suggests_only_real_people_not_no_reply_role_company_set_aside_or_tracked_kind_senders(tmp_path):
    from engine.config.schema import TriageRule

    ws, cfg, store = make(tmp_path, [], first_run="baseline")
    bill_word = cfg.watch.mail_kinds.bill.subject_words[0]
    store.close()
    keep = [who(0), "plain.person@example.com"]  # a name from the address is fine for someone written to
    leave = {
        "no-reply": "No Reply <no-reply@example.com>",
        "role": "Pat Kin <support@example.com>",
        "company": "Hale Support Desk <maria@example.com>",
        "rule sender": "Rule Sender <rule.sender@example.com>",
        "rule domain": "Domain Person <anyone@promos.example.com>",
        "set aside": "Set Aside <set.aside@example.com>",
        "bulk": "Bulk Sender <bulk.sender@example.com>",
        "kind": "Kind Sender <kind.sender@example.com>",
    }
    items = [
        message("sent1", "me@example.com", [*keep, *leave.values()]),
        message("sent2", "me@example.com", [who(0)]),
        message("set-aside", leave["set aside"]),
        message("bulk", leave["bulk"], bulk=True),
        message("kind", leave["kind"], subject=f"{bill_word} for May"),
    ]
    _ws, cfg, store = setup(tmp_path / "again", items, sent=True)
    cfg.watch.triage = [
        TriageRule(
            name="Sales mail you set aside",
            kind="sender-rule",
            set_aside="sales",
            params={"senders": ["rule.sender@example.com"], "domains": ["promos.example.com"]},
        )
    ]
    with store.transaction() as tx:
        snap = next(r for r in tx.list("snapshot") if r.data["key"] == "set-aside")
        tx.update(
            "snapshot",
            snap.id,
            {"set_aside": {"section": "sales", "rule": "r", "reason": "x"}},
            _W,
            read_version=snap.version,
        )
    found = people_suggestions.suggest(store, cfg, 20)
    store.close()
    assert names(found) == ["Correspondent A", "Plain Person"]


def test_with_nobody_to_suggest_the_list_is_empty(tmp_path):
    items = [message("m1", "No Reply <no-reply@example.com>"), message("m2", "info@example.com")]
    _ws, cfg, store = setup(tmp_path, items, sent=False)
    found = people_suggestions.suggest(store, cfg, LIMIT)
    store.close()
    assert found == []


def test_nobody_already_on_file_nor_the_person_themselves_is_suggested(tmp_path):
    ws, cfg, store = make(tmp_path, [], first_run="baseline")
    known = known_person(cfg)
    items = [
        message("m1", "me@example.com", [f"{known['full_name']} <elsewhere@example.com>", who(0)]),
        message("m2", "me@example.com", ["The Person <me@example.com>", who(0)]),
    ]
    store.close()
    _ws, cfg, store = setup(tmp_path / "again", items, sent=True)
    cfg.watch.sources[0].account = "me@example.com"
    found = people_suggestions.suggest(store, cfg, LIMIT)
    store.close()
    assert names(found) == ["Correspondent A"]


def test_the_limit_is_kept_and_zero_suggests_nobody(tmp_path):
    items = [message(f"m{n}", me, [who(n)]) for n, me in enumerate(["me@example.com"] * 4)]
    _ws, cfg, store = setup(tmp_path, items, sent=True)
    try:
        assert len(people_suggestions.suggest(store, cfg, 2)) == 2
        assert people_suggestions.suggest(store, cfg, 0) == []
    finally:
        store.close()


def test_the_number_suggested_is_a_setting_with_a_default_and_a_description(tmp_path):
    ws, cfg, store = make(tmp_path, [])
    store.close()
    field = type(cfg.ui.walkthrough).model_fields["suggested_people"]
    assert cfg.ui.walkthrough.suggested_people == LIMIT and field.description


# ---- a pasted list --------------------------------------------------------------------------------------------


def test_a_pasted_list_is_one_name_per_line_with_marks_addresses_blanks_and_repeats_dealt_with():
    pasted = """
    - Correspondent A
    2) Correspondent B <c1@example.com>,

    * "Correspondent C" <c2@example.com>
    correspondent a
    d.person@example.com
      Correspondent   E
    """
    pairs = [(x.name, x.address) for x in people_suggestions.parse_pasted(pasted)]
    assert pairs == [
        ("Correspondent A", None),
        ("Correspondent B", "c1@example.com"),
        ("Correspondent C", "c2@example.com"),
        ("D Person", "d.person@example.com"),
        ("Correspondent E", None),
    ]
    assert people_suggestions.parse_pasted("") == [] and people_suggestions.parse_pasted(" \n \n") == []


def test_a_pasted_list_is_bounded():
    pasted = "\n".join(f"Name {chr(65 + n // 26)}{chr(97 + n % 26)}" for n in range(500))
    assert len(people_suggestions.parse_pasted(pasted)) == 200


def test_a_pasted_list_keeps_only_lines_that_read_as_a_person_and_reads_a_relation_after_the_name():
    """The person's path: a pasted list with junk lines among real ones. Numbers, marks and web addresses are left out
    (and said so); `Name, relation`, `Name - relation` and `Name; relation` are a name with how they relate; a repeat of
    a name is merged."""
    pasted = "\n".join(
        [
            "12345",
            "!!!",
            WEB + "example.com",
            "Correspondent A, my sister",
            "Correspondent B - our neighbor",
            "Correspondent C; my accountant",
            "Correspondent B <c1@example.com>, our neighbor",
            "correspondent a",
            "Correspondent D <c3@example.com>",
        ]
    )
    found = people_suggestions.parse_list(pasted)
    assert [(x.name, x.relation, x.address) for x in found.people] == [
        ("Correspondent A", "my sister", None),
        ("Correspondent B", "our neighbor", "c1@example.com"),
        ("Correspondent C", "my accountant", None),
        ("Correspondent D", None, "c3@example.com"),
    ]
    assert found.left_out == ["12345", "!!!", WEB + "example.com"]


# ---- the routes -----------------------------------------------------------------------------------------------


@pytest.fixture
def api(tmp_path):
    today = datetime.now(UTC)
    sent = message("m1", "me@example.com", [who(0), who(1)])
    sent["message"]["received"] = today.isoformat()
    items = [sent]
    ws, cfg, store = make(tmp_path, items, first_run="baseline")
    cfg.watch.sources[0].author = cfg.workspace.user.person
    read((ws, cfg, store))
    store.close()
    application = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(application, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        yield client, application.state.store, cfg


def test_the_suggestions_route_lists_who_to_add_and_changes_nothing(api):
    client, store, cfg = api
    before = len(store.read().list("person"))
    body = client.get("/api/setup/people-suggestions").json()
    assert [(p["name"], p["address"], p["count"], p["from_sent"]) for p in body["people"]] == [
        ("Correspondent A", "c0@example.com", 1, True),
        ("Correspondent B", "c1@example.com", 1, True),
    ]
    assert len(store.read().list("person")) == before


def test_adding_a_suggested_person_through_the_people_route_takes_them_off_the_list(api):
    client, store, cfg = api
    added = client.post("/api/people", json={"full_name": "Correspondent A", "aliases": [], "side": "personal"})
    assert added.status_code == 200, added.text
    assert [p["name"] for p in client.get("/api/setup/people-suggestions").json()["people"]] == ["Correspondent B"]


def test_a_pasted_list_adds_each_name_with_no_relation_on_the_personal_side_and_skips_those_on_file(api):
    client, store, cfg = api
    known = known_person(cfg)["full_name"]
    pasted = f"Correspondent A\nCorrespondent B <c1@example.com>\n{known}\n"
    done = client.post("/api/setup/people-paste", json={"text": pasted, "side": "personal"})
    assert done.status_code == 200, done.text
    assert done.json() == {"added": ["Correspondent A", "Correspondent B"], "skipped": [known], "left_out": []}
    people = {p["name"]: p for p in client.get("/api/people").json()}
    for name in done.json()["added"]:
        assert people[name]["relation"] is None and people[name]["side"] == "personal"
    # Pasting the same list again adds nobody twice.
    again = client.post("/api/setup/people-paste", json={"text": pasted, "side": "personal"}).json()
    assert again["added"] == [] and again["skipped"] == ["Correspondent A", "Correspondent B", known]


def test_adding_a_suggested_person_keeps_their_address_so_a_later_message_from_it_is_known_to_be_theirs(api):
    from engine.names import People

    client, store, cfg = api
    (first, _second) = client.get("/api/setup/people-suggestions").json()["people"]
    added = client.post(
        "/api/setup/people-add",
        json={"full_name": first["name"], "aliases": [], "side": "personal", "address": first["address"]},
    )
    assert added.status_code == 200, added.text
    record = store.read().get("person", added.json()["id"]).data
    assert record["how_to_reach"] == {"email": first["address"]}
    # A hand-in from that address resolves to them by the header, with no question about who it is.
    found = People(store, cfg).match_entries([f"Someone Else <{first['address']}>"])
    assert found == {added.json()["id"]}
    # They leave the suggestions, and the address isn't given twice to another person.
    assert [p["address"] for p in client.get("/api/setup/people-suggestions").json()["people"]] == ["c1@example.com"]
    other = client.post(
        "/api/setup/people-add",
        json={"full_name": "Another Person", "aliases": [], "side": "personal", "address": first["address"]},
    )
    assert store.read().get("person", other.json()["id"]).data["how_to_reach"] == {}


def test_a_pasted_name_and_address_keeps_the_address(api):
    from engine.names import People

    client, store, cfg = api
    done = client.post(
        "/api/setup/people-paste",
        json={"text": "Pasted Person <Pasted.Person@Example.com>\nNo Address", "side": "personal"},
    ).json()
    assert done["added"] == ["Pasted Person", "No Address"]
    people = {p.data["full_name"]: p for p in store.read().list("person")}
    assert people["Pasted Person"].data["how_to_reach"] == {"email": "pasted.person@example.com"}
    assert not people["No Address"].data.get("how_to_reach")
    assert People(store, cfg).match_entries(["x <pasted.person@example.com>"]) == {people["Pasted Person"].id}


def test_the_paste_preview_shows_what_would_be_added_and_changes_nothing(api):
    client, store, cfg = api
    known = known_person(cfg)["full_name"]
    before = len(store.read().list("person"))
    text = f"12345\nCorrespondent A, my sister\n{known}\n{WEB}example.com"
    body = client.post("/api/setup/people-paste/preview", json={"text": text, "side": "personal"}).json()
    assert body["people"] == [
        {"name": "Correspondent A", "relation": "my sister", "address": None, "on_file": False},
        {"name": known, "relation": None, "address": None, "on_file": True},
    ]
    assert body["left_out"] == ["12345", WEB + "example.com"]
    assert len(store.read().list("person")) == before


def test_a_pasted_list_adds_the_people_with_their_relation_and_none_of_the_junk(api):
    client, store, cfg = api
    text = f"12345\n!!!\n{WEB}example.com\nCorrespondent A, my sister\nCorrespondent C; my accountant"
    done = client.post("/api/setup/people-paste", json={"text": text, "side": "personal"}).json()
    assert done["added"] == ["Correspondent A", "Correspondent C"]
    assert done["left_out"] == ["12345", "!!!", WEB + "example.com"]
    people = {p["name"]: p for p in client.get("/api/people").json()}
    assert people["Correspondent A"]["relation"] == "my sister"
    assert people["Correspondent C"]["relation"] == "my accountant"
    assert not any(name in people for name in ("12345", "!!!", WEB + "example.com"))

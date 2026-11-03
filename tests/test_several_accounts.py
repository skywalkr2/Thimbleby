"""A person with several accounts and sides (re-sweep X77 to X82): each source is told from its own account's state, an
invitation and a thread held by two accounts are listed once, sources are named by their account, a clash is on both
sides it is between, a source that serves sides never files to Personal for want of a signal, and the sides a source
serves can be changed after setup. Names and addresses come from the fixtures' own helpers and the fake add-on."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import yaml

from engine import sides, today, watch
from engine import sign_in as flow
from engine.config import load_config
from engine.names import People
from engine.storage import Store
from tests import test_many_sides as many
from tests import test_sign_in_accounts as accounts
from tests.test_many_sides import OTHER_BUSINESS_NAME, a_watched_source, add_side, file_ops, serve, stamp
from tests.test_sides import _PM, BUSINESS_ID, PERSONAL_ID, make_project, new_op
from tests.test_sign_in_accounts import ALICE, BOB, inboxes, sign_in, sources
from tests.test_today_dashboard import event, make, message
from tests.test_watch import NOW

# The workspace fixtures the sides tests and the sign-in tests build: each test here works on its own copy.
base, env, api, anytime = many.base, many.env, many.api, many.anytime
world = accounts.world

NOW_UTC = datetime.now(UTC)


def two_sources(tmp_path, first, second, **watch_options):
    """A workspace that reads two stand-in sources, "a" and "b", each with its own items."""
    ws, cfg, store = make(tmp_path, first, **watch_options)
    path = ws.config_dir / "watch.yaml"
    config = yaml.safe_load(path.read_text())
    config["sources"] = [
        {**config["sources"][0], "id": "a", "label": "First"},
        {**config["sources"][0], "id": "b", "label": "Second", "settings": {"items": second}},
    ]
    path.write_text(yaml.safe_dump(config))
    store.close()
    cfg = load_config(ws.config_dir, env={})
    return ws, cfg, Store(ws.db_path, cfg=cfg)


def as_started(ws):
    """The app as it starts now, so what the files hold is what its screens list (a running app takes new sources in
    through its worker)."""
    from fastapi.testclient import TestClient

    from api.app import create_app

    cfg = load_config(ws.config_dir, env={})
    client = TestClient(create_app(ws, cfg, "t", start_worker=False), follow_redirects=False)
    client.headers["Authorization"] = "Bearer t"
    return client


# ---- X78: one row for the same invitation and the same thread --------------------------------------------------


def test_the_same_invitation_in_two_accounts_is_one_agenda_item_naming_the_other_account(tmp_path):
    start, end = "2030-03-04T09:00:00+00:00", "2030-03-04T10:00:00+00:00"
    mine = event("review-a", start, end, uid="uid-review")
    theirs = event("review-b", "2030-03-04T10:00:00+01:00", "2030-03-04T11:00:00+01:00", uid="uid-review")
    other = event("lunch-b", "2030-03-04T12:00:00+00:00", "2030-03-04T13:00:00+00:00", uid="uid-lunch")
    ws, cfg, store = two_sources(tmp_path, [mine], [theirs, other])
    try:
        for source in ("a", "b"):
            watch.refresh(ws, store, cfg, source, NOW)
        found = today.agenda(store, cfg, NOW)
        review = [i for i in found if i.title.endswith("review-a") or i.title.endswith("review-b")]
        assert len(review) == 1, [(i.title, i.source) for i in found]
        assert review[0].source == "a" and review[0].also_in == ["b"]
        assert any(i.title.endswith("lunch-b") and i.also_in == [] for i in found)
    finally:
        store.close()


def test_an_invitation_with_no_identity_or_at_another_time_or_in_one_source_is_never_joined(tmp_path):
    same_time = ("2030-03-04T09:00:00+00:00", "2030-03-04T10:00:00+00:00")
    first = [
        event("no-uid-a", *same_time),
        event("twice-1", *same_time, uid="u"),
        event("twice-2", *same_time, uid="u"),
    ]
    second = [
        event("no-uid-b", *same_time),
        event("later", "2030-03-04T15:00:00+00:00", "2030-03-04T16:00:00+00:00", uid="u"),
    ]
    ws, cfg, store = two_sources(tmp_path, first, second)
    try:
        for source in ("a", "b"):
            watch.refresh(ws, store, cfg, source, NOW)
        found = today.agenda(store, cfg, NOW)
        assert len(found) == 5 and all(i.also_in == [] for i in found)
    finally:
        store.close()


def received(hours: int = 1) -> str:
    return (NOW_UTC - timedelta(hours=hours)).isoformat()


def test_a_message_copied_to_two_mailboxes_is_one_row_and_so_is_a_reply_that_names_it(tmp_path):
    shared = message(
        "lease-a", received(2), sender="Landlord <landlord@example.com>", message_id="<lease-1@example.com>"
    )
    copy = message("lease-b", received(2), sender="Landlord <landlord@example.com>", message_id="<LEASE-1@example.com>")
    reply = message("reply-b", received(1), sender="Me <me@example.com>", references=["<lease-1@example.com>"])
    alone = message("alone-b", received(3), sender="Pat <pat@example.com>", message_id="<alone@example.com>")
    unnamed = message("plain-b", received(4), sender="Sam <sam@example.com>")
    ws, cfg, store = two_sources(tmp_path, [shared], [copy, reply, alone, unnamed])
    try:
        for source in ("a", "b"):
            watch.refresh(ws, store, cfg, source, NOW_UTC)
        rows = today.arrived(store, cfg, NOW_UTC).items
        titles = {r.title: r for r in rows}
        # The first mailbox's copy is joined to the newest message of the thread in the second; the second mailbox's own
        # two messages stay two rows (one mailbox's messages are never joined).
        assert titles["Mail reply-b"].also_in == ["a"] and "Mail lease-a" not in titles
        assert titles["Mail lease-b"].also_in == []
        assert titles["Mail alone-b"].also_in == [] and titles["Mail plain-b"].also_in == []
        assert len(rows) == 4
    finally:
        store.close()


def test_two_messages_of_one_mailbox_are_never_joined_even_when_they_share_an_id(tmp_path):
    one = message("one", received(2), message_id="<x@example.com>")
    two = message("two", received(1), references=["<x@example.com>"])
    ws, cfg, store = two_sources(tmp_path, [one, two], [])
    try:
        watch.refresh(ws, store, cfg, "a", NOW_UTC)
        assert len(today.arrived(store, cfg, NOW_UTC).items) == 2
    finally:
        store.close()


# ---- X77 and X79: the state of each source from its own account, and a name for each -----------------------------


def test_a_second_account_names_every_source_by_its_account_and_a_name_the_person_gave_stands(world):
    ws, c, api = world
    sign_in(c, api, "alice")
    assert [s["label"] for s in sources(ws) if s["connector"] == "p18/inbox"] == ["Your inbox"]
    own = yaml.safe_load((ws.config_dir / "watch.yaml").read_text())
    next(x for x in own["sources"] if x.get("account") == ALICE)["label"] = "Work mail"
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump(own))
    sign_in(c, api, "bob")
    found = inboxes(ws)
    assert found[ALICE]["label"] == "Work mail"  # the person's own name stands
    assert found[BOB]["label"] == f"Your inbox, {BOB}"


def test_sources_made_before_a_second_account_are_named_by_their_account_at_start_up(world):
    ws, c, api = world
    sign_in(c, api, "alice")
    sign_in(c, api, "bob")
    config = yaml.safe_load((ws.config_dir / "watch.yaml").read_text())
    for source in config["sources"]:
        source["label"] = "Your inbox"  # as an earlier version named them
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump(config))
    from engine.sign_in_sources import start_signed_in

    cfg = load_config(ws.config_dir, env={})
    store = Store(ws.db_path, cfg=cfg)
    try:
        assert start_signed_in(ws, cfg, store) == []  # nothing is added
    finally:
        store.close()
    labels = {a: s["label"] for a, s in inboxes(ws).items()}
    assert labels == {ALICE: f"Your inbox, {ALICE}", BOB: f"Your inbox, {BOB}"}


def test_each_source_says_where_its_own_account_stands(world):
    ws, c, api = world
    sign_in(c, api, "alice")
    sign_in(c, api, "bob")
    by_account = inboxes(ws)
    app = as_started(ws)
    state = lambda address: next(  # noqa: E731
        s for s in app.get(f"{api}/watch").json() if s["id"] == by_account[address]["id"]
    )
    assert state(ALICE)["account_state"] == "signed_in" and state(BOB)["account_state"] == "signed_in"
    # Alice signs out: her source is not being read, so it must not say it is; Bob's is untouched.
    assert c.delete(f"{api}/sign-ins/p18/service?account={flow.account_key(ALICE)}").status_code == 200
    assert state(ALICE)["account_state"] == "signed_out" and state(BOB)["account_state"] == "signed_in"
    # The service refuses Bob's sign-in at a read: his tokens look valid here, but he has to sign in again.
    cfg = load_config(ws.config_dir, env={})
    store = Store(ws.db_path, cfg=cfg)
    try:
        watch._record(store, by_account[BOB]["id"], NOW_UTC, 0.0, "failed", error_kind="auth", error="refused")
    finally:
        store.close()
    assert state(BOB)["account_state"] == "expired" and state(ALICE)["account_state"] == "signed_out"
    row = as_started(ws).get(f"{api}/sign-ins").json()[0]
    assert [(a["address"], a["status"]) for a in row["accounts"]] == [(BOB, "expired")]


def test_a_folder_source_signs_in_to_nothing(world):
    ws, c, api = world
    config = yaml.safe_load((ws.config_dir / "watch.yaml").read_text())
    config["sources"] = [{"id": "docs", "connector": "folder", "label": "Docs", "settings": {"path": str(ws.root)}}]
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump(config))
    assert next(s for s in as_started(ws).get(f"{api}/watch").json() if s["id"] == "docs")["account_state"] is None


def test_one_failing_account_is_one_line_on_today_naming_the_account_and_not_one_per_source(world):
    ws, c, api = world
    sign_in(c, api, "alice")
    sign_in(c, api, "bob")
    config = yaml.safe_load((ws.config_dir / "watch.yaml").read_text())
    config["sources"] = [
        *config["sources"],
        {"id": "bob-more", "label": "More mail", "connector": "p18/inbox", "account": BOB, "settings": {"folder": "x"}},
    ]
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump(config))
    cfg = load_config(ws.config_dir, env={})
    store = Store(ws.db_path, cfg=cfg)
    long_ago = NOW_UTC - timedelta(days=3)
    try:
        failing = [s.id for s in cfg.watch.sources if s.account == BOB]
        assert len(failing) == 2
        for source_id in failing:
            watch._record(store, source_id, long_ago, 0.0, "failed", error_kind="auth", error="refused")
        from engine.today_queue import queue

        lines = [line for line in queue(ws, store, cfg, NOW_UTC) if line.kind == "source_unread"]
        assert len(lines) == 1
        assert lines[0].subject == BOB and lines[0].count == 2 and lines[0].problem_kind == "auth"
    finally:
        store.close()


def test_calendars_get_a_color_each_unless_the_person_picked_one(world):
    ws, c, api = world
    config = yaml.safe_load((ws.config_dir / "watch.yaml").read_text())
    calendar = {"connector": "calendar", "settings": {"address": "env:WORK_CALENDAR_ADDRESS"}}
    config["sources"] = [
        {"id": "one", "label": "One", **calendar},
        {"id": "two", "label": "Two", "color": "blue", **calendar},
        {"id": "three", "label": "Three", **calendar},
        {"id": "docs", "connector": "folder", "label": "Docs", "settings": {"path": str(ws.root)}},
    ]
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump(config))
    shown = {s["id"]: s["shown_color"] for s in as_started(ws).get(f"{api}/watch").json()}
    # The picked color is kept and the others take the first colors no calendar holds.
    assert shown == {"one": "teal", "two": "blue", "three": "green", "docs": None}


# ---- X80: a clash between two sides is on both ------------------------------------------------------------------


def entry(source: str, snapshot: str = "s", **more):
    from engine.today import AgendaItem

    return AgendaItem(snapshot, source, "t", "2030-03-04T09:00:00+00:00", None, False, None, None, False, **more)


def test_a_clash_between_calendars_of_two_sides_is_on_both_and_one_inside_a_side_is_on_one(env):
    second = add_side(env, OTHER_BUSINESS_NAME)
    _, cfg, store = env
    view = store.read()
    cfg.watch.sources = [
        *cfg.watch.sources,
        cfg.watch.sources[0].model_copy(update={"id": "mine", "sides": [BUSINESS_ID]}),
        cfg.watch.sources[0].model_copy(update={"id": "theirs", "sides": [second]}),
        cfg.watch.sources[0].model_copy(update={"id": "both", "sides": [BUSINESS_ID, second]}),
    ]
    assert sides.sides_of_entries(view, cfg, [entry("mine"), entry("theirs")]) == [BUSINESS_ID, second]
    assert sides.side_of_entries(view, cfg, [entry("mine"), entry("theirs")]) is None  # no one side
    assert sides.sides_of_entries(view, cfg, [entry("mine"), entry("mine")]) == []  # on one side: `side` says it
    assert sides.side_of_entries(view, cfg, [entry("mine"), entry("mine")]) == BUSINESS_ID
    # A calendar that serves both is on both whatever the other entry is.
    assert sides.sides_of_entries(view, cfg, [entry("both"), entry("mine")]) == [BUSINESS_ID, second]


def test_the_sides_a_mailbox_serves_are_listed_in_the_sides_order_and_unknown_ones_left_out(env):
    second = add_side(env, OTHER_BUSINESS_NAME)
    _, cfg, store = env
    cfg.watch.sources[0].sides = [second, BUSINESS_ID, "PRJ-999"]
    assert sides.watch_source_sides(store.read(), cfg, cfg.watch.sources[0].id) == [BUSINESS_ID, second]
    assert sides.watch_source_sides(store.read(), cfg, "nothing") == []


# ---- X81: a source that serves sides, none Personal, never files to Personal for want of a signal -----------------


def test_a_mailbox_serving_two_businesses_files_an_order_by_its_sides_and_never_under_personal(env):
    second = add_side(env, OTHER_BUSINESS_NAME)
    source = a_watched_source(env, serve(env, BUSINESS_ID, second))
    order = [new_op(text="Order for the second business")]
    # Nothing places it: it stays unfiled for the person's question, not under Personal.
    filed = file_ops(env, order, source=source)[0]
    assert stamp(filed) == (None, None, None)
    # The kind the assistant's sorting gave it (an order) does not send it to Personal either.
    _, cfg, store = env
    by_kind = sides.file_by_people(
        order, store.read(), cfg, People(store, cfg), None, None, source=source, mail_kind="order"
    )[0]
    assert stamp(by_kind)[0] is None
    # A code of a project of one of its two sides places it; a code of a side it doesn't serve places nothing.
    in_second = make_project(store, "Second errand here", second)
    in_personal = make_project(store, "Personal errand here", PERSONAL_ID)
    for project, code in ((in_second, "qzx-two"), (in_personal, "qzx-per")):
        with store.transaction() as tx:
            tx.update("project", project, {"aliases": [code]}, _PM, read_version=tx.get("project", project).version)
    placed = file_ops(env, [new_op(text="An order about qzx-two")], source=source)[0]
    assert stamp(placed)[:2] == (in_second, "alias")
    unserved = file_ops(env, [new_op(text="An order about qzx-per")], source=source)[0]
    assert stamp(unserved)[0] is None


def test_a_mailbox_that_serves_personal_among_others_still_defaults_to_personal(env):
    second = add_side(env, OTHER_BUSINESS_NAME)
    source = a_watched_source(env, serve(env, PERSONAL_ID, second))
    _, cfg, store = env
    got = sides.file_by_people(
        [new_op(text="Pay it")], store.read(), cfg, People(store, cfg), None, None, source=source, mail_kind="bill"
    )[0]
    assert stamp(got)[0] == PERSONAL_ID


def test_the_notes_packet_says_which_sides_the_source_serves_so_the_assistant_files_within_them(env):
    second = add_side(env, OTHER_BUSINESS_NAME)
    source = a_watched_source(env, serve(env, BUSINESS_ID, second))
    _, cfg, store = env
    line = sides.served_sides_text(store.read(), cfg, source)
    names = sides.side_names(store.read(), cfg)
    assert names[BUSINESS_ID] in line and names[second] in line and names[PERSONAL_ID] not in line
    serve(env)  # serves none: nothing to say
    assert sides.served_sides_text(store.read(), cfg, source) == ""
    assert sides.served_sides_text(store.read(), cfg, None) == ""


# ---- X82: the sides a source serves can be changed after setup --------------------------------------------------


def test_the_sides_a_source_serves_are_listed_changed_with_undo_and_a_side_that_is_not_one_is_refused(api):
    client, ws, store = api
    sides_made = [
        client.post("/api/setup/business", json={"name": name, "kind": kind}).json()["project"]
        for name, kind in ((OTHER_BUSINESS_NAME, "business"), ("Second Studio", "job"))
    ]
    folder = ws.root / "reading"
    folder.mkdir()
    fingerprint = client.get("/api/settings").json()["fingerprint"]
    added = client.post(
        "/api/watch/sources",
        json={"connector": "folder", "label": "Reading", "settings": {"path": str(folder)}, "fingerprint": fingerprint},
    )
    assert added.status_code == 200, added.text
    source = next(s for s in client.get("/api/watch").json() if s["label"] == "Reading")
    assert source["sides"] == []
    # Written out of order, kept in the sides' order.
    changed = client.post(
        f"/api/watch/sources/{source['id']}",
        json={"sides": [sides_made[1], sides_made[0]], "fingerprint": added.json()["fingerprint"]},
    )
    assert changed.status_code == 200, changed.text
    shown = next(s for s in client.get("/api/watch").json() if s["id"] == source["id"])
    assert shown["sides"] == sides_made
    refused = client.post(
        f"/api/watch/sources/{source['id']}", json={"sides": ["PRJ-999"], "fingerprint": changed.json()["fingerprint"]}
    )
    assert refused.status_code == 400 and "side" in refused.json()["detail"].lower()
    cleared = client.post(
        f"/api/watch/sources/{source['id']}", json={"sides": [], "fingerprint": changed.json()["fingerprint"]}
    )
    assert cleared.status_code == 200
    assert next(s for s in client.get("/api/watch").json() if s["id"] == source["id"])["sides"] == []


# ---- X85: a follow-up message says which mailbox it goes out from ------------------------------------------------


def test_a_follow_up_names_the_mailboxes_it_could_go_out_from_and_starts_on_the_one_the_conversation_is_in(world):
    from engine import send_accounts
    from engine.storage import WriteContext

    ws, c, api = world
    sign_in(c, api, "alice")
    sign_in(c, api, "bob")
    by_account = inboxes(ws)
    cfg = load_config(ws.config_dir, env={})
    store = Store(ws.db_path, cfg=cfg)
    ctx = WriteContext(actor="pm", trust="trusted", op="test.send_from")
    try:
        with store.transaction() as tx:
            person = tx.create(
                "person", {"full_name": "Pat Example", "how_to_reach": {"email": "pat@example.com"}}, ctx
            )
            other = tx.create("person", {"full_name": "Sam Example", "how_to_reach": {"email": "sam@example.com"}}, ctx)
            for key, sender, source in (
                ("hello", "Pat <pat@example.com>", by_account[BOB]["id"]),
                ("older", "Pat <pat@example.com>", by_account[ALICE]["id"]),
            ):
                tx.create(
                    "snapshot",
                    {
                        "source": source,
                        "key": key,
                        "title": key,
                        "content_hash": key,
                        "seen_at": NOW_UTC.isoformat(),
                        "message": {
                            "sender": sender,
                            "received": received(1 if key == "hello" else 48),
                        },
                    },
                    ctx,
                )
        assert send_accounts.sending_accounts(store, cfg) == [ALICE, BOB]
        assert send_accounts.conversation_account(store, cfg, person.data) == BOB  # the latest mail was read there
        assert send_accounts.conversation_account(store, cfg, other.data) is None  # no mail from them was read
    finally:
        store.close()


def test_the_follow_ups_list_carries_the_mailboxes_and_the_one_to_start_on(world):
    ws, c, api = world
    sign_in(c, api, "alice")
    sign_in(c, api, "bob")
    cfg = load_config(ws.config_dir, env={})
    store = Store(ws.db_path, cfg=cfg)
    from engine.storage import WriteContext

    ctx = WriteContext(actor="pm", trust="trusted", op="test.send_from")
    try:
        with store.transaction() as tx:
            other = tx.create("person", {"full_name": "Pat Example", "how_to_reach": {"email": "pat@example.com"}}, ctx)
            tx.create(
                "question",
                {"to": other.id, "title": "Which week suits?", "kind": "decision"},
                ctx,
            )
    finally:
        store.close()
    listed = as_started(ws).get(f"{api}/followups").json()
    pat = next(s for s in listed if s["name"] == "Pat Example")
    assert pat["send_from"] == [ALICE, BOB] and pat["send_from_default"] == ALICE  # no mail from them: the first

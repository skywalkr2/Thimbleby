"""A plain calendar entry needs no AI run (design 6.2, 6.32; the functional designer's answer F20, B-7).

An entry of a calendar file with no one else invited, no description and no change to a date a promise is due at is
kept in the app's calendar by rule: no run of the assistant and no Review line. One whose title starts with a task verb
(a language setting) is offered as a to-do with one click, by rule. One whose title names a known person is linked to
them by rule; one that names a promise's words on its day is only proposed to the promise, and the promise moves with
it once the person ties it (J8). The assistant still reads an invitation from
someone else, an entry with a description, and one that moved a date a promise is due at. Names, addresses and ids
come from the fixtures; the calendar is a file."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
import yaml
from fastapi.testclient import TestClient

from api.app import create_app
from engine.config import load_config
from engine.connectors import EventDetails
from engine.storage import Store, WriteContext
from engine.today import agenda
from engine.today_queue import queue
from engine.watch import hand_in_recent, refresh
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records

NOW = datetime(2030, 3, 4, 9, 0, tzinfo=UTC)
_TEST = WriteContext("pm", "trusted", "test")
TOKEN = "plain-entries-token"
PEOPLE = fixture_records(DEMO_B, "person")
ME = PEOPLE[0]
ME_ADDRESS = ME["full_name"].lower().replace(" ", ".") + "@example.com"
ORGANIZER = next(p for p in PEOPLE if (p.get("how_to_reach") or {}).get("email"))
ORGANIZER_ADDRESS = ORGANIZER["how_to_reach"]["email"]
_FIRSTS = [p["full_name"].split()[0] for p in PEOPLE]
KNOWN = next(p for p in PEOPLE[1:] if _FIRSTS.count(p["full_name"].split()[0]) == 1)  # a first name only they have
FIRST_NAME = KNOWN["full_name"].split()[0]
SHARED = next(f for f in _FIRSTS if _FIRSTS.count(f) > 1)  # a first name two people share
EMPTY = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Fictional//Calendar//EN\nEND:VCALENDAR\n"


def vevent(uid, title, *, day="20300309", hour="15", description=None, invited=False, with_me=False, status=None):
    lines = ["BEGIN:VEVENT", f"UID:{uid}@calendar.example.com", "DTSTAMP:20300301T080000Z"]
    lines += [f"DTSTART:{day}T{hour}0000Z", f"DTEND:{day}T{int(hour) + 1}0000Z", f"SUMMARY:{title}"]
    if status:
        lines.append(f"STATUS:{status}")
    if description:
        lines.append(f"DESCRIPTION:{description}")
    if invited:
        lines.append(f"ORGANIZER;CN={ORGANIZER['full_name']}:mailto:{ORGANIZER_ADDRESS}")
        lines.append(f"ATTENDEE;CN={ME['full_name']};PARTSTAT=NEEDS-ACTION:mailto:{ME_ADDRESS}")
    if with_me:
        lines.append(f"ATTENDEE;CN={ME['full_name']};PARTSTAT=ACCEPTED:mailto:{ME_ADDRESS}")
    lines.append("END:VEVENT")
    return "\n".join(lines)


def calendar(*events: str, method: str | None = None) -> str:
    head = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Fictional//Calendar//EN\n" + (
        f"METHOD:{method}\n" if method else ""
    )
    return head + "\n".join(events) + "\nEND:VCALENDAR\n"


def _build(tmp_path):
    path = tmp_path / "work.ics"
    sources = [
        {
            "id": "calendar",
            "connector": "calendar",
            "label": "Work calendar",
            "first_run": "baseline",
            "settings": {"file": str(path), "days_ahead": 30, "expand_days": 60},
        }
    ]
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump({"version": 1, "sources": sources}))
    cfg = load_config(ws.config_dir, env={})
    return ws, cfg, path


def _identify(store):
    with store.transaction() as tx:
        found = tx.get("person", ME["id"])
        reach = {**(found.data.get("how_to_reach") or {}), "email": ME_ADDRESS}
        tx.update("person", ME["id"], {"how_to_reach": reach}, _TEST, read_version=found.version)


@pytest.fixture
def cal(tmp_path):
    ws, cfg, path = _build(tmp_path)
    store = Store(ws.db_path, cfg=cfg)
    _identify(store)

    def put(text, at=NOW):
        path.write_text(text)
        return refresh(ws, store, cfg, "calendar", at)

    put(EMPTY, NOW - timedelta(hours=2))  # the first read only notes what is there
    yield ws, cfg, store, put
    store.close()


def entry_of(store, title):
    return next(e for e in store.read().find("event", {"source": "calendar"}) if e.data["title"] == title)


def requests(store):
    return store.read().list("request")


def open_actions():
    return [a for a in fixture_records(DEMO_B, "action") if a.get("status", "open") == "open"]


# ---- plain entries are filed by rule ----------------------------------------------------------------------


def test_a_plain_entry_is_kept_in_the_calendar_by_rule_with_no_run_and_no_review_line(cal):
    ws, cfg, store, put = cal
    result = put(calendar(vevent("a", "Planning reminder")))
    assert result.new == [] and result.changed == []
    assert requests(store) == []
    found = entry_of(store, "Planning reminder")
    assert found.data["plain"] is True and found.data["invitation"] is False
    assert [x for x in queue(ws, store, cfg, NOW) if x.kind in ("review", "decide", "go", "first_go")] == []
    assert [i.title for i in agenda(store, cfg, NOW, NOW.date() + timedelta(days=10))] == ["Planning reminder"]


def test_an_entry_with_only_the_person_on_the_attendee_list_is_still_plain(cal):
    ws, cfg, store, put = cal
    assert put(calendar(vevent("a", "Block out the morning", with_me=True))).new == []
    assert entry_of(store, "Block out the morning").data["plain"] is True


def test_an_invitation_from_someone_else_is_read_by_the_assistant(cal):
    ws, cfg, store, put = cal
    result = put(calendar(vevent("a", "Floor plan walkthrough", invited=True), method="REQUEST"))
    assert len(result.new) == 1 and entry_of(store, "Floor plan walkthrough").data["plain"] is False


def test_an_entry_with_a_description_is_read_by_the_assistant(cal):
    ws, cfg, store, put = cal
    result = put(calendar(vevent("a", "Planning reminder", description="Bring the proofs and the budget sheet")))
    assert len(result.new) == 1 and entry_of(store, "Planning reminder").data["plain"] is False


def test_a_connector_that_does_not_say_whether_an_entry_has_a_description_is_read_by_the_assistant():
    from engine.entry_rules import is_plain

    said = EventDetails(start="2030-03-09T15:00:00+00:00", entries=True, described=False)
    silent = EventDetails(start="2030-03-09T15:00:00+00:00", entries=True)
    assert is_plain(said, set(), set()) and not is_plain(silent, set(), set())


def test_a_changed_plain_entry_is_still_filed_by_rule_and_keeps_its_place(cal):
    ws, cfg, store, put = cal
    put(calendar(vevent("a", "Planning reminder")))
    first = entry_of(store, "Planning reminder")
    result = put(calendar(vevent("a", "Planning reminder", day="20300311")), NOW + timedelta(hours=1))
    assert result.changed == [] and requests(store) == []
    moved = entry_of(store, "Planning reminder")
    assert moved.id == first.id and moved.data["start"].startswith("2030-03-11")


def test_an_entry_that_moved_a_date_a_promise_is_due_at_is_read_by_the_assistant_and_the_promise_follows(cal):
    ws, cfg, store, put = cal
    put(calendar(vevent("a", "Planning reminder")))
    entry = entry_of(store, "Planning reminder")
    promise = open_actions()[0]["id"]
    with store.transaction() as tx:
        current = tx.get("action", promise)
        tx.update("action", promise, {"due_event": entry.id, "due": "2030-03-09"}, _TEST, read_version=current.version)
    result = put(calendar(vevent("a", "Planning reminder", day="20300312")), NOW + timedelta(hours=1))
    assert len(result.changed) == 1
    assert store.read().get("action", promise).data["due"] == "2030-03-12"


def test_a_called_off_plain_entry_is_filed_by_rule_and_still_tells_the_promise_due_at_it(cal):
    ws, cfg, store, put = cal
    put(calendar(vevent("a", "Planning reminder")))
    entry = entry_of(store, "Planning reminder")
    promise = open_actions()[0]["id"]
    with store.transaction() as tx:
        current = tx.get("action", promise)
        tx.update("action", promise, {"due_event": entry.id, "due": "2030-03-09"}, _TEST, read_version=current.version)
    put(calendar(vevent("a", "Planning reminder", status="CANCELLED")), NOW + timedelta(hours=1))
    assert entry_of(store, "Planning reminder").data["cancelled"] is True
    assert [n["text"] for n in store.read().get("action", promise).data["news"]] == [
        "Planning reminder on 2030-03-09 was called off"
    ]


def test_the_first_hand_in_of_what_a_source_holds_leaves_plain_entries_out(tmp_path):
    ws, cfg, path = _build(tmp_path)
    store = Store(ws.db_path, cfg=cfg)
    try:
        _identify(store)
        path.write_text(
            calendar(
                vevent("a", "Planning reminder", day="20300304"),
                vevent("b", "Budget review", day="20300304", description="Numbers for the printer"),
            )
        )
        refresh(ws, store, cfg, "calendar", NOW)  # the first read only notes what is there
        assert requests(store) == []
        assert len(hand_in_recent(ws, store, cfg, "calendar", NOW)) == 1  # only the one with a description
    finally:
        store.close()


# ---- a task-like title is offered as a to-do ----------------------------------------------------------------------


def offers(store, cfg):
    return {i.title: i.todo_offer for i in agenda(store, cfg, NOW, NOW.date() + timedelta(days=10))}


def test_a_plain_entry_whose_first_word_is_a_task_verb_is_offered_as_a_to_do_and_others_are_not(cal):
    ws, cfg, store, put = cal
    put(
        calendar(
            vevent("a", "Pay the deposit", day="20300307"),
            vevent("b", "Planning reminder", day="20300307"),
            vevent("c", "Pay the invoice", day="20300307", description="Use the card on file"),
            vevent("d", "Send the rota", day="20300307", invited=True),
        )
    )
    assert offers(store, cfg) == {
        "Pay the deposit": "Pay the deposit",
        "Planning reminder": None,
        "Pay the invoice": None,
        "Send the rota": None,
    }


def test_the_task_verbs_are_a_language_setting_with_a_description_and_demo_values(tmp_path):
    from engine.config.schema import LanguageFile
    from engine.language_words import language_words

    assert LanguageFile.model_fields["task_verbs"].description
    assert "pay" in language_words(LanguageFile(), "task_verbs") and "send" in language_words(
        LanguageFile(), "task_verbs"
    )
    for name in ("demo-a", "demo-b"):
        language = yaml.safe_load((DEMO_B.parent / name / "config" / "language.yaml").read_text())
        assert language["task_verbs"] == language_words(LanguageFile(), "task_verbs")


def test_changing_the_verbs_changes_what_is_offered(cal):
    ws, cfg, store, put = cal
    put(calendar(vevent("a", "Pay the deposit", day="20300307"), vevent("b", "Ponder the plan", day="20300307")))
    cfg.language.task_verbs = ["ponder"]
    assert offers(store, cfg) == {"Pay the deposit": None, "Ponder the plan": "Ponder the plan"}


REAL = datetime.now(UTC)
# Tomorrow where the workspace is, as the agenda counts days: in UTC it is already the next day for a few hours each
# evening there.
_HERE = ZoneInfo(yaml.safe_load((DEMO_B / "config" / "workspace.yaml").read_text())["user"]["timezone"])
TOMORROW = (REAL.astimezone(_HERE) + timedelta(days=1)).date()
THEN = TOMORROW.strftime("%Y%m%d")


@pytest.fixture
def api(tmp_path):
    ws, cfg, path = _build(tmp_path)
    cfg = load_config(ws.config_dir, env={}, flags={"server.base_path": "/", "storage.backups.automatic": False})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui", start_worker=False)
    with TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"}) as client:
        store = app.state.store
        _identify(store)
        path.write_text(EMPTY)
        refresh(ws, store, cfg, "calendar", REAL - timedelta(hours=2))
        path.write_text(calendar(vevent("a", "Pay the deposit", day=THEN), vevent("b", "Planning reminder", day=THEN)))
        refresh(ws, store, cfg, "calendar", REAL)
        yield client, store, cfg


def test_one_click_makes_the_to_do_for_the_person_due_at_the_entry_and_the_offer_goes(api):
    client, store, cfg = api
    entry = entry_of(store, "Pay the deposit")
    made = client.post(f"/api/events/{entry.id}/todo")
    assert made.status_code == 200, made.text
    action = store.read().get("action", made.json()["action"])
    assert action.data["text"] == "Pay the deposit" and action.data["status"] == "open"
    assert [o["person"] for o in action.data["owners"]] == [ME["id"]]
    assert (action.data["due"], action.data["due_event"]) == (TOMORROW.isoformat(), entry.id)
    assert action.data["event"] == entry.id
    rows = {r["title"]: r["todo_offer"] for r in client.get("/api/today/agenda").json()}
    assert rows["Pay the deposit"] is None
    assert client.post(f"/api/events/{entry.id}/todo").status_code == 409  # made once


def test_undoing_the_to_do_brings_the_offer_back(api):
    from engine.dispatcher import undo_changeset

    client, store, cfg = api
    entry = entry_of(store, "Pay the deposit")
    made = client.post(f"/api/events/{entry.id}/todo").json()
    undo_changeset(store, made["changeset"])
    assert store.read().get("action", made["action"]) is None
    rows = {r["title"]: r["todo_offer"] for r in client.get("/api/today/agenda").json()}
    assert rows["Pay the deposit"] == "Pay the deposit"


def test_the_to_do_follows_the_entry_when_the_calendar_moves_it(api):
    from engine.applier import follow_event

    client, store, cfg = api
    entry = entry_of(store, "Pay the deposit")
    action = client.post(f"/api/events/{entry.id}/todo").json()["action"]
    later = TOMORROW + timedelta(days=1)
    with store.transaction() as tx:
        tx.update(
            "event",
            entry.id,
            {"start": f"{later}T15:00:00+00:00", "end": f"{later}T16:00:00+00:00"},
            _TEST,
            read_version=tx.get("event", entry.id).version,
        )
        follow_event(tx, entry.id, _TEST)
    assert store.read().get("action", action).data["due"] == later.isoformat()


def test_an_entry_that_is_not_task_like_is_refused_a_to_do_and_an_unknown_one_is_not_found(api):
    client, store, cfg = api
    assert client.post(f"/api/events/{entry_of(store, 'Planning reminder').id}/todo").status_code == 409
    assert client.post("/api/events/EVT-NOPE/todo").status_code == 404


def test_the_agenda_api_carries_the_offer(api):
    client, store, cfg = api
    rows = client.get("/api/today/agenda").json()
    assert {r["title"]: r.get("todo_offer") for r in rows} == {
        "Pay the deposit": "Pay the deposit",
        "Planning reminder": None,
    }


# ---- linked to a known person, or to a promise's words ---------------------------------------------------------------


def test_an_entry_whose_title_names_a_known_person_has_them_proposed_as_a_guest_never_recorded_as_one(cal):
    ws, cfg, store, put = cal
    put(
        calendar(
            vevent("a", f"Lunch with {KNOWN['full_name']}", day="20300307"),
            vevent("b", f"Coffee with {FIRST_NAME}", day="20300307"),
            vevent("c", "Lunch with Nobody Known", day="20300307"),
        )
    )
    assert entry_of(store, f"Lunch with {KNOWN['full_name']}").data["proposed_guests"] == [KNOWN["id"]]
    assert entry_of(store, f"Coffee with {FIRST_NAME}").data["proposed_guests"] == [KNOWN["id"]]
    assert entry_of(store, "Lunch with Nobody Known").data["proposed_guests"] == []
    assert all(e.data["people"] == [] for e in store.read().find("event", {"source": "calendar"}))


def test_a_first_name_two_people_share_links_nobody_and_a_full_name_links_the_one(cal):
    ws, cfg, store, put = cal
    both = [p for p in PEOPLE if p["full_name"].split()[0] == SHARED]
    put(
        calendar(
            vevent("a", f"Coffee with {SHARED}", day="20300307"),
            vevent("b", f"Lunch with {both[0]['full_name']}", day="20300307"),
        )
    )
    assert entry_of(store, f"Coffee with {SHARED}").data["proposed_guests"] == []
    assert entry_of(store, f"Lunch with {both[0]['full_name']}").data["proposed_guests"] == [both[0]["id"]]


def test_the_person_themselves_named_in_a_title_links_nobody(cal):
    ws, cfg, store, put = cal
    put(calendar(vevent("a", f"Quiet time for {ME['full_name']}", day="20300307")))
    assert entry_of(store, f"Quiet time for {ME['full_name']}").data["proposed_guests"] == []


def promise(store, text, *, due):
    action = open_actions()[0]["id"]
    with store.transaction() as tx:
        current = tx.get("action", action)
        tx.update("action", action, {"text": text, "due": due, "due_event": None}, _TEST, read_version=current.version)
    return action


def moved_entry(day="20300310"):
    return calendar(vevent("a", "Return the signed contract", day=day))


def test_an_entry_naming_a_promises_words_on_its_day_is_proposed_not_linked_and_the_promise_stays_put(cal):
    ws, cfg, store, put = cal
    action = promise(store, "Return the signed contract to the printer", due="2030-03-07")
    put(calendar(vevent("a", "Return the signed contract", day="20300307")))
    entry = entry_of(store, "Return the signed contract")
    made = store.read().get("action", action).data
    assert (made["due_event"], made["proposed_event"]) == (None, entry.id)
    (line,) = [x for x in queue(ws, store, cfg, NOW) if x.kind == "tie"]
    assert (line.actions, line.entry, line.other, line.due) == ([action], entry.id, entry.data["title"], "2030-03-07")
    put(moved_entry(), NOW + timedelta(hours=1))
    assert store.read().get("action", action).data["due"] == "2030-03-07"  # a proposal follows nothing


def test_a_called_off_entry_tells_a_proposed_promise_nothing(cal):
    ws, cfg, store, put = cal
    action = promise(store, "Return the signed contract to the printer", due="2030-03-07")
    put(calendar(vevent("a", "Return the signed contract", day="20300307")))
    put(
        calendar(vevent("a", "Return the signed contract", day="20300307", status="CANCELLED")),
        NOW + timedelta(hours=1),
    )
    assert store.read().get("action", action).data["news"] == []
    assert [x for x in queue(ws, store, cfg, NOW) if x.kind == "tie"] == []  # called off, so nothing to tie


def test_tie_it_links_the_promise_with_undo_and_a_moved_entry_then_moves_its_date_and_a_called_off_one_tells_it(cal):
    from engine import entry_ties
    from engine.dispatcher import undo_changeset

    ws, cfg, store, put = cal
    action = promise(store, "Return the signed contract to the printer", due="2030-03-07")
    put(calendar(vevent("a", "Return the signed contract", day="20300307")))
    entry = entry_of(store, "Return the signed contract")
    changeset = entry_ties.tie(store, cfg, action)
    tied = store.read().get("action", action).data
    assert (tied["due_event"], tied["proposed_event"], tied["due"]) == (entry.id, None, "2030-03-07")
    assert [x for x in queue(ws, store, cfg, NOW) if x.kind == "tie"] == []
    put(moved_entry(), NOW + timedelta(hours=1))
    assert store.read().get("action", action).data["due"] == "2030-03-10"
    put(
        calendar(vevent("a", "Return the signed contract", day="20300310", status="CANCELLED")),
        NOW + timedelta(hours=2),
    )
    assert "called off" in store.read().get("action", action).data["news"][0]["text"]
    undo_changeset(store, changeset)
    assert store.read().get("action", action).data["due_event"] is None


def test_not_this_is_never_proposed_again_and_taking_it_back_shows_the_line_again(cal):
    from engine import entry_ties, suggestions

    ws, cfg, store, put = cal
    action = promise(store, "Return the signed contract to the printer", due="2030-03-07")
    put(calendar(vevent("a", "Return the signed contract", day="20300307")))
    signal = entry_ties.decline(store, cfg, action, NOW)
    assert [x for x in queue(ws, store, cfg, NOW) if x.kind == "tie"] == []
    # The same pair on a later read, and once the proposal field is cleared, is not proposed again.
    with store.transaction() as tx:
        current = tx.get("action", action)
        tx.update("action", action, {"proposed_event": None}, _TEST, read_version=current.version)
    put(calendar(vevent("a", "Return the signed contract", day="20300307")), NOW + timedelta(hours=1))
    put(calendar(vevent("a", "Return the signed contract", day="20300307", hour="16")), NOW + timedelta(hours=2))
    assert store.read().get("action", action).data["proposed_event"] is None
    assert [x for x in queue(ws, store, cfg, NOW) if x.kind == "tie"] == []
    assert suggestions.take_back(store, signal)
    put(calendar(vevent("a", "Return the signed contract", day="20300307", hour="17")), NOW + timedelta(hours=3))
    assert [x.kind for x in queue(ws, store, cfg, NOW) if x.kind == "tie"] == ["tie"]


def test_a_link_the_assistant_made_in_its_own_op_follows_the_entry(cal):
    ws, cfg, store, put = cal
    action = promise(store, "Return the signed contract to the printer", due="2030-03-07")
    put(calendar(vevent("a", "Return the signed contract", day="20300307")))
    entry = entry_of(store, "Return the signed contract")
    with (
        store.transaction() as tx
    ):  # what an `action.add` at an entry writes (tests/test_promises.py runs the op itself)
        current = tx.get("action", action)
        tx.update("action", action, {"due_event": entry.id}, _TEST, read_version=current.version)
    put(moved_entry(), NOW + timedelta(hours=1))
    assert store.read().get("action", action).data["due"] == "2030-03-10"


def test_a_promise_on_another_day_or_with_no_day_or_other_words_is_not_proposed(cal):
    ws, cfg, store, put = cal
    entries = calendar(
        vevent("a", "Return the signed contract", day="20300307"), vevent("b", "Book the room", day="20300307")
    )
    elsewhere = promise(store, "Return the signed contract to the printer", due="2030-03-20")
    put(entries)
    assert store.read().get("action", elsewhere).data["proposed_event"] is None
    undated = promise(store, "Return the signed contract to the printer", due=None)
    put(entries.replace("SUMMARY:Book the room", "SUMMARY:Book the large room"), NOW + timedelta(hours=1))
    assert store.read().get("action", undated).data["proposed_event"] is None
    other_words = promise(store, "Order the bookmarks", due="2030-03-07")
    put(entries, NOW + timedelta(hours=2))
    assert store.read().get("action", other_words).data["proposed_event"] is None


# ---- the person's answers to a proposal, through the routes ----------------------------------------------------------


def proposed_todo(store, entry):
    with store.transaction() as tx:
        return tx.create(
            "action",
            {
                "text": "Pay the deposit by card",
                "owners": [{"person": ME["id"]}],
                "due": TOMORROW.isoformat(),
                "proposed_event": entry.id,
            },
            _TEST,
        ).id


def test_the_to_dos_page_and_today_carry_the_proposal_and_tie_it_ties_it_with_undo(api):
    client, store, cfg = api
    entry = entry_of(store, "Pay the deposit")
    action = proposed_todo(store, entry)
    page = client.get(f"/api/record-pages/{action}?kind=action")
    assert page.status_code == 200, page.text
    assert page.json()["tie"] == {"entry": entry.id, "title": "Pay the deposit", "day": TOMORROW.isoformat()}
    lines = [x for x in client.get("/api/today/queue").json() if x["kind"] == "tie"]
    assert [(x["key"], x["actions"], x["entry"], x["other"]) for x in lines] == [
        (f"tie:{action}", [action], entry.id, "Pay the deposit")
    ]
    done = client.post(f"/api/actions/{action}/tie")
    assert done.status_code == 200, done.text
    tied = store.read().get("action", action).data
    assert (tied["due_event"], tied["proposed_event"]) == (entry.id, None)
    assert client.get(f"/api/record-pages/{action}?kind=action").json()["tie"] is None
    assert client.post(f"/api/actions/{action}/tie").status_code == 409  # nothing proposed any more
    assert client.post(f"/api/changesets/{done.json()['changeset']}/undo", json={"ops": None}).status_code == 200
    assert store.read().get("action", action).data["due_event"] is None


def test_not_this_through_the_route_hides_the_line_and_its_undo_brings_it_back(api):
    client, store, cfg = api
    entry = entry_of(store, "Pay the deposit")
    action = proposed_todo(store, entry)
    said = client.post(f"/api/actions/{action}/not-this")
    assert said.status_code == 200, said.text
    assert store.read().get("action", action).data["due_event"] is None
    assert [x for x in client.get("/api/today/queue").json() if x["kind"] == "tie"] == []
    assert client.get(f"/api/record-pages/{action}?kind=action").json()["tie"] is None
    assert client.post(f"/api/actions/{action}/not-this").status_code == 409
    assert client.post(f"/api/suggestions/not-now/{said.json()['signal']}/undo").status_code == 200
    assert [x["key"] for x in client.get("/api/today/queue").json() if x["kind"] == "tie"] == [f"tie:{action}"]
    assert client.post("/api/actions/ACT-NOPE/tie").status_code == 404

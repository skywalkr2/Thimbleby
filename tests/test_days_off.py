"""Days off and holidays for teams and people (design 5.1, 6.7): a team's calendar, working week and closures, a
person's away periods, what the person's own change and an input's stated period do, and what the assistant is told
about them. Names, ids and days come from the fixtures and the date the test input was received."""

from __future__ import annotations

import json
from datetime import date

import pytest

from engine import days_off
from engine import packet as packets
from engine.ai.adapters.stub import set_responder
from engine.applier import apply_as_person
from engine.dispatcher import undo_changeset
from engine.intake import hand_in
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records
from tests.test_promises import NOW, answer, run

_SETUP = WriteContext(actor="pm", trust="trusted", op="test.days_off")
TODAY = NOW.date()
THANKSGIVING = date(2026, 11, 26)


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path)
    yield ws, cfg, store
    store.close()
    set_responder(None)


def teams():
    return fixture_records(DEMO_B, "team")


def member(team: dict) -> dict:
    people = {p["id"]: p for p in fixture_records(DEMO_B, "person")}
    return people[team["members"][0]]


def edit(store, kind: str, record_id: str, **fields) -> None:
    with store.transaction() as tx:
        found = tx.get(kind, record_id)
        tx.update(kind, record_id, fields, _SETUP, read_version=found.version)


def days(found) -> dict[date, str]:
    return dict(found)


def test_a_team_takes_the_holidays_of_the_workspace_calendar_and_not_the_days_nobody_takes_off(env):
    _, cfg, store = env
    team = teams()[0]
    found = days(days_off.team_non_working(store.read(), cfg, team["id"], date(2026, 11, 1), date(2026, 12, 31)))
    assert found[THANKSGIVING] == "Thanksgiving" and found[date(2026, 12, 25)] == "Christmas"
    assert date(2026, 12, 24) not in found and date(2026, 12, 31) not in found  # marked as days people work
    # The weekly rest days of the workspace's own week are never listed.
    assert date(2026, 11, 7) not in found and date(2026, 11, 8) not in found


def test_a_team_with_its_own_calendar_working_week_and_closures(env):
    _, cfg, store = env
    team = teams()[0]
    edit(
        store,
        "team",
        team["id"],
        holiday_calendar="en-GB",
        working_days=["monday", "tuesday", "wednesday", "thursday"],
        days_off=[{"start": "2026-12-28", "end": "2026-12-30", "label": "year-end closure"}],
    )
    found = days(days_off.team_non_working(store.read(), cfg, team["id"], date(2026, 11, 1), date(2026, 12, 31)))
    assert THANKSGIVING not in found or found[THANKSGIVING] == "not a working day for the team"
    assert found[date(2026, 12, 26)] == "Boxing Day"
    assert found[date(2026, 11, 6)] == "not a working day for the team"  # a Friday the team doesn't work
    assert found[date(2026, 12, 28)] == "year-end closure" and found[date(2026, 12, 30)] == "year-end closure"
    assert found[date(2026, 12, 25)].startswith("Christmas")
    # A Saturday is the workspace's rest day, not a day this team lost.
    assert date(2026, 11, 7) not in found


def test_a_persons_days_off_are_their_teams_plus_their_own_away_and_a_person_with_no_team_has_only_their_own(env):
    _, cfg, store = env
    team = teams()[0]
    who = member(team)
    away = [{"start": "2026-11-20", "end": "2026-11-22", "label": "vacation"}]
    edit(store, "person", who["id"], away=away)
    found = days(days_off.non_working(store.read(), cfg, who["id"], date(2026, 11, 1), date(2026, 11, 30)))
    assert found[THANKSGIVING] == "Thanksgiving"
    assert [found[date(2026, 11, d)] for d in (20, 21, 22)] == ["vacation"] * 3
    # The same days from inside the team's own list of members, for someone whose record names no team.
    outsider = next(p for p in fixture_records(DEMO_B, "person") if not p.get("team"))
    assert days_off.non_working(store.read(), cfg, outsider["id"], date(2026, 11, 1), date(2026, 11, 30)) == []
    edit(store, "team", team["id"], members=[*team["members"], outsider["id"]])
    found = days(days_off.non_working(store.read(), cfg, outsider["id"], date(2026, 11, 1), date(2026, 11, 30)))
    assert found[THANKSGIVING] == "Thanksgiving"
    assert days_off.non_working(store.read(), cfg, "PER-9999", date(2026, 11, 1), date(2026, 11, 30)) == []


def test_the_reason_a_person_is_off_names_whose_day_off_it_is(env):
    _, cfg, store = env
    who = member(teams()[0])
    edit(store, "person", who["id"], away=[{"start": "2026-11-26", "label": "vacation"}])
    said = days_off.off_on(store.read(), cfg, who["id"], THANKSGIVING, "Sam")
    assert said == "Sam's team is off on Thu 11/26 (Thanksgiving); Sam is away on Thu 11/26 (vacation)"
    assert days_off.off_on(store.read(), cfg, who["id"], date(2026, 11, 25), "Sam") is None


def test_the_person_sets_a_teams_days_off_and_their_own_away_with_undo_and_a_wrong_order_is_refused(env):
    _, cfg, store = env
    team, who = teams()[0], member(teams()[0])
    version = store.read().get("team", team["id"]).version
    made = apply_as_person(
        store,
        cfg,
        [
            {
                "op": "record.edit",
                "record": {"kind": "team", "id": team["id"]},
                "fields": {"days_off": [{"start": "2026-12-28", "end": "2026-12-30", "label": "closed"}]},
                "read_version": version,
            }
        ],
        "Changed on screen",
    )
    assert store.read().get("team", team["id"]).data["days_off"][0]["label"] == "closed"
    undo_changeset(store, made)
    assert store.read().get("team", team["id"]).data["days_off"] == []
    with pytest.raises(Exception, match="can't come before"):
        apply_as_person(
            store,
            cfg,
            [
                {
                    "op": "record.edit",
                    "record": {"kind": "person", "id": who["id"]},
                    "fields": {"away": [{"start": "2026-11-24", "end": "2026-11-20"}]},
                    "read_version": store.read().get("person", who["id"]).version,
                }
            ],
            "Changed on screen",
        )


def test_the_holiday_calendar_of_a_team_is_a_list_to_pick_from(tmp_path):
    from fastapi.testclient import TestClient

    from api.app import create_app

    ws = init_workspace(tmp_path / "api-ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"server.base_path": "/", "storage.backups.automatic": False})
    app = create_app(ws, cfg, "days-off-token", ui_dist=tmp_path / "no-ui")
    with TestClient(app, headers={"Authorization": "Bearer days-off-token"}) as client:
        fields = client.get("/api/kinds/team").json()["fields"]
    field = next(f for f in fields if f["name"] == "holiday_calendar")
    assert field["type"] == "choice" and {"en-US", "en-GB"} <= set(field["options"])


# ---- an input that says someone is away ------------------------------------------------------------------------------


def away_op(person: str, quote: str, **more) -> dict:
    return {
        "op": "person.away",
        "person": person,
        "start": "2026-11-20",
        "end": "2026-11-24",
        "label": "vacation",
        "evidence": {"quote": quote},
        **more,
    }


def test_an_input_that_says_someone_is_away_is_a_data_op_with_its_words_and_undo_takes_it_back(env):
    ws, cfg, store = env
    who = member(teams()[0])
    said = f"{who['full_name']} is out Nov 20-24."
    answer(away_op(who["id"], said))
    (outcome,), cs_id = run(env, pasted=f"From: someone\n\n{said}")
    assert outcome["status"] == "applied"
    assert store.read().get("person", who["id"]).data["away"] == [
        {"start": "2026-11-20", "end": "2026-11-24", "label": "vacation"}
    ]
    # The same words again add nothing.
    answer(away_op(who["id"], said))
    run(env, pasted=f"From: someone else\n\n{said}")
    assert len(store.read().get("person", who["id"]).data["away"]) == 1
    undo_changeset(store, cs_id)
    assert store.read().get("person", who["id"]).data["away"] == []


def test_an_away_period_needs_the_words_that_say_it_and_a_person_that_exists(env):
    who = member(teams()[0])
    said = "Out of the office Nov 20-24."
    answer({k: v for k, v in away_op(who["id"], said).items() if k != "evidence"})
    (outcome,), _ = run(env, pasted=said)
    assert outcome["status"] == "refused" and "evidence" in json.dumps(outcome)
    answer(away_op(who["id"], "words that are not in the input"))
    (outcome,), _ = run(env, pasted=said)
    assert outcome["status"] == "refused" and "isn't in the input" in json.dumps(outcome)
    answer(away_op("PER-9999", said))
    (outcome,), _ = run(env, pasted=said)
    assert outcome["status"] == "refused" and "no person" in json.dumps(outcome)


# ---- what the assistant is told --------------------------------------------------------------------------------------


def request_text(env, pasted: str) -> str:
    ws, cfg, store = env
    handed = hand_in(ws, store, pasted=pasted, now=NOW, cfg=cfg)
    built = packets.build(ws, store, cfg, handed.request, NOW.date())
    return built.task.request


def test_the_packet_lists_the_days_off_ahead_of_the_people_the_input_names_after_the_stable_parts(env):
    ws, cfg, store = env
    me = cfg.workspace.user.person
    first, second = teams()
    who = next(p for p in fixture_records(DEMO_B, "person") if p["id"] in first["members"] and p["id"] != me)
    elsewhere = next(p for p in fixture_records(DEMO_B, "person") if p["id"] in second["members"])
    edit(store, "person", who["id"], away=[{"start": "2026-10-26", "end": "2026-10-28", "label": "vacation"}])
    edit(store, "person", elsewhere["id"], away=[{"start": "2026-10-26", "label": "leave"}])
    handed = hand_in(ws, store, pasted=f"Notes.\n{who['full_name']} will review the spine.", now=NOW, cfg=cfg)
    built = packets.build(ws, store, cfg, handed.request, NOW.date())
    text = built.task.request
    line = next(line for line in text.splitlines() if line.startswith(f"- {who['id']} "))
    # The weeks ahead of the day it was received, each run once, and the team's holiday with its own day.
    assert "2026-10-12 (Monday): Columbus Day" in line and "2026-10-26 to 2026-10-28: vacation" in line
    assert "Thanksgiving" not in line, "that is more than six weeks away"
    assert any(line.startswith(f"- {me} ") for line in text.splitlines()), "the person is always told theirs"
    assert not any(line.startswith(f"- {elsewhere['id']} ") for line in text.splitlines())
    assert "Days off ahead" not in built.task.stable and "Days off ahead" in text


def test_the_weeks_ahead_are_a_setting_and_zero_tells_the_assistant_none(env):
    _, cfg, store = env
    who = member(teams()[0])
    cfg.steward.dates.days_off_weeks = 1
    one = request_text(env, f"{who['full_name']} reviews it.")
    assert "Columbus Day" in one and "Veterans Day" not in one
    cfg.steward.dates.days_off_weeks = 5
    assert "Veterans Day" in request_text(env, f"{who['full_name']} reviews it.")
    cfg.steward.dates.days_off_weeks = 0
    assert "Days off ahead" not in request_text(env, f"{who['full_name']} reviews it.")


def test_the_notes_prompt_says_every_to_do_gets_a_date_and_one_question_asks_for_the_rest(env):
    ws, cfg, store = env
    handed = hand_in(ws, store, pasted="Notes.", now=NOW, cfg=cfg)
    said = " ".join(packets.build(ws, store, cfg, handed.request, TODAY).task.instructions.split())
    assert "Every to-do gets a due date" in said and 'leave "due" out and ask the user once' in said
    assert '"person.away"' in said
    stable = packets.build(ws, store, cfg, handed.request, TODAY).task.stable
    assert "person.away" in stable  # the op reference offers it

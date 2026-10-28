"""The meeting-prep note and the people-memory drafts read the same reach as every other draft (design 6.32, S4): a
draft about an entry in an area draws on that area, the projects inside it and the projects above it, and never on
what is filed under a sibling area. The entry's page and a person's page are the person's own and show everything.
Built on the meetings tests' workspace; names come from there."""

from __future__ import annotations

import pytest

from engine import areas, meeting_prep, people_memory
from engine import packet as packets
from engine.ai.adapters.stub import set_responder
from tests.test_areas import make
from tests.test_meetings_people import (  # noqa: F401  (the workspace and its helpers)
    NOW,
    TODAY,
    entry,
    env,
    fact,
    me,
    person,
    promise,
    question,
)


@pytest.fixture
def two_areas(env):  # noqa: F811
    ws, cfg, store = env
    personal = cfg.workspace.project.personal
    health = make(store, "project", name="Health", area=True, parent=personal)
    garden = make(store, "project", name="Garden", area=True, parent=personal)
    ana = person(store, "Ana Guest")
    return ws, cfg, store, {"personal": personal, "health": health, "garden": garden, "ana": ana}


def fill(store, cfg, ids):
    """What is open with Ana, in each area and in none, and a fact about her in each."""
    promise(
        store, cfg, ids["ana"], me(cfg), "Send the clinic form", "I will send the clinic form", project=ids["health"]
    )
    promise(
        store,
        cfg,
        ids["ana"],
        me(cfg),
        "Bring the rose cuttings",
        "I will bring the rose cuttings",
        project=ids["garden"],
    )
    promise(store, cfg, ids["ana"], me(cfg), "Return the library book", "I will return the library book")
    question(store, ids["ana"], "Which clinic day suits you?", projects=[ids["health"]])
    question(store, ids["ana"], "Which fence do you prefer?", projects=[ids["garden"]])
    fact(store, "Ana Guest likes early clinic visits", project=ids["health"])
    fact(store, "Ana Guest grows tomatoes", project=ids["garden"])


def test_an_entry_in_an_area_prepares_from_that_area_and_what_is_filed_under_none_and_not_from_a_sibling(two_areas):
    _, cfg, store, ids = two_areas
    fill(store, cfg, ids)
    found = entry(store, "Clinic visit", guests=[(ids["ana"], "accepted")], project=ids["health"])
    hide = areas.outside(areas.reach(store.read(), [ids["health"]]))
    shown = meeting_prep.facts(store, cfg, found, NOW, hide)
    assert "Send the clinic form" in shown and "Which clinic day suits you?" in shown
    assert "Return the library book" in shown  # filed under no project: not any area's, so not left out
    assert "rose cuttings" not in shown and "Which fence" not in shown
    # the entry's page is the person's own and shows both areas
    everything = meeting_prep.facts(store, cfg, found, NOW)
    assert "rose cuttings" in everything and "Which fence" in everything


def test_the_prep_note_packet_reads_the_entrys_area_and_lists_only_its_projects(two_areas):
    ws, cfg, store, ids = two_areas
    fill(store, cfg, ids)
    set_responder(lambda task: "A note.\n")
    found = entry(store, "Clinic visit", guests=[(ids["ana"], "accepted")], project=ids["health"])
    request = meeting_prep.ask_for_note(store, found)
    built = packets.build(ws, store, cfg, request, TODAY)
    text = built.task.stable + built.task.request
    assert "Send the clinic form" in text and "Health" in text
    for left in ("rose cuttings", "Which fence", "Garden", "grows tomatoes"):
        assert left not in text, left


def test_an_entry_in_no_area_is_prepared_from_everything_as_before(two_areas):
    ws, cfg, store, ids = two_areas
    fill(store, cfg, ids)
    set_responder(lambda task: "A note.\n")
    found = entry(store, "Catch-up", guests=[(ids["ana"], "accepted")])
    built = packets.build(ws, store, cfg, meeting_prep.ask_for_note(store, found), TODAY)
    assert "rose cuttings" in built.task.request and "Send the clinic form" in built.task.request


def test_a_person_memory_read_for_a_draft_stops_at_the_area_and_the_page_shows_all(two_areas):
    _, cfg, store, ids = two_areas
    fill(store, cfg, ids)
    hide = areas.outside(areas.reach(store.read(), [ids["garden"]]))
    drafted = people_memory.memory(store, cfg, ids["ana"], NOW, hide)
    assert sorted(i.text for i in drafted.promised_by) == ["Bring the rose cuttings", "Return the library book"]
    assert [i.text for i in drafted.asked_of] == ["Which fence do you prefer?"]
    assert [k.text for k in drafted.matters] == ["Ana Guest grows tomatoes"]
    page = people_memory.memory(store, cfg, ids["ana"], NOW)
    assert len(page.promised_by) == 3 and len(page.asked_of) == 2 and len(page.matters) == 2

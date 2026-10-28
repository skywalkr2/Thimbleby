"""The first day's activity (promise P77, part B): what setup wrote reads as the record being set up, never as a change
the person made. The record's making is one line, with the values that made it folded in; a link the app keeps between a
side and the people who work for it is bookkeeping and is no line at all. Names come from the fixtures."""

from __future__ import annotations

import pytest

from engine.workspace import init_workspace
from tests.test_sides import BUSINESS_NAME
from tests.test_walkthrough import _fresh, _open

MY_NAME = "Robin Example"
PROJECT = "First catalog"


def _page(c, kind, record_id):
    made = c.get(f"/api/record-pages/{record_id}", params={"kind": kind})
    assert made.status_code == 200, made.text
    return made.json()


def _first_day(c):
    """The business, a project in it and the person's own record, as setup makes them."""
    side = c.post(
        "/api/setup/business", json={"name": BUSINESS_NAME, "kind": "business", "summary": "A small publisher."}
    ).json()["project"]
    project = c.post("/api/projects", json={"name": PROJECT, "parent": side}).json()["id"]
    me = next(p["id"] for p in c.get("/api/people").json() if p["is_pm"])
    org = next(o["id"] for o in c.get("/api/organizations").json() if o["name"] == BUSINESS_NAME)
    return side, project, me, org


def _lines(page):
    return [(e["name"], e["made"], e["field"]) for e in page["activity"]]


@pytest.fixture
def made_with_a_name(tmp_path):
    """A workspace as `cockpit init` makes it with the person's name given."""
    ws = init_workspace(tmp_path / "ws", git=False, you=MY_NAME, name="Mine")
    return _open(ws)


def test_a_business_made_in_setup_is_one_added_line_not_a_change_of_its_target_date(made_with_a_name):
    c = made_with_a_name
    side, project, me, org = _first_day(c)
    page = _page(c, "project", side)
    assert _lines(page) == [(BUSINESS_NAME, "added", None)]
    assert _lines(_page(c, "project", project)) == [(PROJECT, "added", None)]


def test_the_person_made_by_setup_reads_as_set_up_and_their_link_to_the_business_is_no_change(made_with_a_name):
    c = made_with_a_name
    side, project, me, org = _first_day(c)
    assert _lines(_page(c, "person", me)) == [(MY_NAME, "setup", None)]


def test_the_organization_made_with_the_business_is_one_added_line(made_with_a_name):
    c = made_with_a_name
    side, project, me, org = _first_day(c)
    assert all(e["field"] is None and e["made"] for e in _page(c, "organization", org)["activity"])


def test_a_person_named_in_setup_after_the_business_has_no_change_lines_either(tmp_path):
    ws, c = _fresh(tmp_path)
    side = c.post("/api/setup/business", json={"name": BUSINESS_NAME, "kind": "business"}).json()["project"]
    me = c.post("/api/me", json={"full_name": MY_NAME}).json()["person"]
    assert _lines(_page(c, "person", me)) == [(MY_NAME, "added", None)]
    assert _lines(_page(c, "project", side)) == [(BUSINESS_NAME, "added", None)]


def test_a_later_edit_by_the_person_is_still_a_change_with_its_field(made_with_a_name):
    c = made_with_a_name
    side, project, me, org = _first_day(c)
    edited = c.post(f"/api/projects/{project}", json={"summary": "A first list of titles."})
    assert edited.status_code == 200, edited.text
    lines = _lines(_page(c, "project", project))
    assert (PROJECT, None, "summary") in lines and (PROJECT, "added", None) in lines


def test_every_yes_or_no_a_core_record_can_show_in_details_has_its_words_in_the_wording_sheet():
    """Details leave out a flag that is off and say one that is on in the sheet's phrase (`flag.<field>`), so a core
    record's flag with no phrase would read "Yes"."""
    import json
    from pathlib import Path

    from engine.records import REGISTRY

    sheet = json.loads(
        (Path(__file__).parent.parent / "web" / "src" / "wording" / "en.json").read_text(encoding="utf-8")
    )
    missing = []
    for kind, model in REGISTRY.items():
        if not (getattr(model, "layout", None) or kind in ("project", "organization")):
            continue
        for name, info in model.model_fields.items():
            if info.annotation is bool and f"flag.{name}" not in sheet:
                missing.append(f"{kind}.{name}")
    assert missing == []

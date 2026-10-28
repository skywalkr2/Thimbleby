"""One Today across the areas of life, each line tagged by the area it is in (design 6.32, S4): a line carries the id
and name of its project's area, a project inside an area is in that area, a line about records in several areas or
none is in no area, and a line about one action takes its area from that action's project. Built on the publisher
tests' workspace."""

from __future__ import annotations

from engine import areas, today_queue
from engine.storage import WriteContext
from tests.test_publisher import api  # noqa: F401  (the API fixture)

_TEST = WriteContext(actor="pm", trust="trusted", op="test.today-areas")


def make(store, kind: str, **data) -> str:
    with store.transaction() as tx:
        return tx.create(kind, data, _TEST).id


def line(key: str, **more) -> today_queue.Line:
    return today_queue.Line(key=key, group="risk", kind="overdue", count=1, since="a", **more)


def tree(api) -> dict[str, str]:  # noqa: F811
    personal = api.cfg.workspace.project.personal
    health = make(api.store, "project", name="Health", area=True, parent=personal)
    garden = make(api.store, "project", name="Garden", area=True, parent=personal)
    dental = make(api.store, "project", name="Dental plan", parent=health)
    plain = make(api.store, "project", name="Spring trip", parent=personal)
    return {"health": health, "garden": garden, "dental": dental, "plain": plain}


def tagged(api, monkeypatch, lines) -> dict[str, tuple[str | None, str | None]]:  # noqa: F811
    monkeypatch.setattr(today_queue, "_everything", lambda *a, **k: lines)
    return {x["key"]: (x["area"], x["area_name"]) for x in api.get("/api/today/queue").json()}


def test_each_line_carries_the_area_its_project_is_in_and_a_project_inside_an_area_is_in_it(api, monkeypatch):  # noqa: F811
    ids = tree(api)
    found = tagged(
        api,
        monkeypatch,
        [
            line("clinic", project=ids["health"]),
            line("fence", project=ids["garden"]),
            line("dentist", project=ids["dental"]),
            line("trip", project=ids["plain"]),
            line("none"),
        ],
    )
    assert found == {
        "clinic": (ids["health"], "Health"),
        "fence": (ids["garden"], "Garden"),
        "dentist": (ids["health"], "Health"),
        "trip": (None, None),
        "none": (None, None),
    }


def test_a_line_about_one_action_is_in_that_actions_area_and_one_about_several_areas_is_in_none(api, monkeypatch):  # noqa: F811
    ids = tree(api)
    me = api.cfg.workspace.user.person
    in_health = make(api.store, "action", text="Book the clinic", owners=[{"person": me}], project=ids["health"])
    in_garden = make(api.store, "action", text="Mend the fence", owners=[{"person": me}], project=ids["garden"])
    found = tagged(
        api,
        monkeypatch,
        [
            line("one", actions=[in_health]),
            line("both", actions=[in_health, in_garden]),
            line("same", actions=[in_health, in_health]),
        ],
    )
    assert found["one"] == (ids["health"], "Health")
    assert found["both"] == (None, None)
    assert found["same"] == (ids["health"], "Health")


def test_a_chain_of_projects_that_loops_or_leads_nowhere_is_in_no_area(api):  # noqa: F811
    ids = tree(api)
    assert areas.area_of_line(api.store.read(), line("x", project="PRJ-999")) is None
    assert areas.area_of_line(api.store.read(), line("x", project=ids["garden"])) == ids["garden"]

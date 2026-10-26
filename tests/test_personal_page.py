"""The Personal project's page reads as the person's own (design 6.32): no target day for it or an area, nothing
asked of it that a work project is asked, and a security notice from a no-reply sender is set aside and never a fact.
Names and ids come from the fixtures."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.app import create_app
from engine.applier import apply_as_person
from engine.mail_kinds import automated_notice_input
from engine.project_knows import knows
from engine.storage import Store
from engine.workspace import init_workspace
from tests.test_fact_basis import LINE, fact, from_outside
from tests.test_knowledge_records import app  # noqa: F401  (the fixture is used by name)

NOTICE = (
    "From: GitHub <noreply@example.com>\nSubject: A personal access token was added to your account\n\n"
    "A new personal access token was added to your account. If this was not you, reset it."
)
BILL = "From: Billing <noreply@example.com>\nSubject: Your statement is ready\n\nThe amount due is 20.00."


@pytest.fixture
def fresh(tmp_path):
    ws = init_workspace(tmp_path / "ws", git=False, you="Pat Example")
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, store, cfg
    store.close()


def client_for(ws, cfg, tmp_path):
    application = create_app(ws, cfg, "tok", ui_dist=tmp_path / "no-ui", start_worker=False)
    return TestClient(application, headers={"Authorization": "Bearer tok"})


def test_a_target_day_is_refused_on_the_personal_project_by_the_op_and_the_screen(fresh, tmp_path):
    ws, store, cfg = fresh
    prj = cfg.workspace.project.personal
    version = store.read().get("project", prj).version
    with pytest.raises(Exception, match="no target day"):
        apply_as_person(
            store,
            cfg,
            [
                {
                    "op": "record.edit",
                    "record": {"kind": "project", "id": prj},
                    "fields": {"target": "2027-01-01"},
                    "read_version": version,
                }
            ],
            "Changed on screen",
            all_or_nothing=True,
        )
    assert store.read().get("project", prj).data.get("target") is None
    client = client_for(ws, cfg, tmp_path)
    shown = next(p for p in client.get("/api/projects").json() if p["id"] == prj)
    assert shown["no_end"] is True
    refused = client.post(f"/api/projects/{prj}", json={"target": "2027-01-01"})
    assert refused.status_code == 409 and "no target day" in refused.json()["detail"]
    assert client.post(f"/api/projects/{prj}", json={"summary": "Mine"}).status_code == 200


def test_a_project_with_an_end_inside_personal_keeps_its_target_day(fresh, tmp_path):
    ws, store, cfg = fresh
    client = client_for(ws, cfg, tmp_path)
    made = client.post("/api/projects", json={"name": "Trip", "parent": cfg.workspace.project.personal})
    assert made.status_code == 200
    ok = client.post(f"/api/projects/{made.json()['id']}", json={"target": "2027-01-01"})
    assert ok.status_code == 200


def test_the_personal_project_lists_nothing_unknown_when_nobody_was_asked(fresh):
    _, store, cfg = fresh
    seen = knows(store.read(), cfg.workspace.project.personal, cfg)
    assert seen["unknown"] == []
    assert not any(u.get("field") for u in seen["unknown"])


def test_a_security_notice_is_an_automated_notice_and_a_bill_from_the_same_kind_of_sender_is_not(fresh):
    _, _, cfg = fresh
    assert automated_notice_input(cfg, NOTICE)
    assert not automated_notice_input(cfg, BILL)
    assert not automated_notice_input(cfg, f"From: Pat <pat@example.com>\nSubject: Lunch\n\n{LINE}")


def test_no_fact_comes_from_an_input_that_is_an_automated_notice(app):  # noqa: F811
    _, store, cfg, _ = app
    raw = f"{NOTICE}\n{LINE}"
    cs_id, statuses = from_outside(store, cfg, [fact()], raw=raw)
    assert statuses != ["applied"]
    assert not any(f.data["text"] == fact()["text"] for f in store.read().list("fact"))

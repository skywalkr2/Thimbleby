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
from tests.test_fact_basis import LINE
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
    # The kind the assistant's sorting gave decides when there is one: a bill it names is never a notice, and "none"
    # leaves the words' hint standing.
    assert not automated_notice_input(cfg, NOTICE, "bill") and automated_notice_input(cfg, NOTICE, "none")
    assert not automated_notice_input(cfg, f"From: Pat <pat@example.com>\nSubject: Lunch\n\n{LINE}")


@pytest.fixture
def noticed(tmp_path):
    from engine.ai.adapters.stub import set_responder
    from tests.conftest import DEMO_B

    ws = init_workspace(tmp_path / "noticed", template=DEMO_B, git=False)
    cfg = ws.config(env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "UTC"})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, store, cfg
    store.close()
    set_responder(None)


FACT_LINE = "A new personal access token was added to your account."
SENDER = "GitHub <noreply@example.com>"


def notice_fact():
    return {"op": "fact", "text": "A token was added to the account.", "evidence": {"quote": FACT_LINE}}


def ask_about(noticed, answers, text=NOTICE, mail_kind=None):
    """Hand in a pasted message; the model answers with these ops in turn (the last repeats). Returns what the model was
    asked, the changeset's outcome ops and the runs' tiers."""
    import json
    from datetime import UTC, datetime

    from engine.ai.adapters.stub import set_responder
    from engine.ai.router import Router
    from engine.dispatcher import process
    from engine.intake import hand_in
    from engine.storage import WriteContext

    ws, store, cfg = noticed
    now = datetime(2026, 11, 2, 12, 0, tzinfo=UTC)
    queue = [json.dumps({"summary": "A notice.", "ops": ops}) for ops in answers]
    tasks: list = []

    def responder(task):
        tasks.append(task)
        return queue.pop(0) if len(queue) > 1 else queue[0]

    set_responder(responder)
    try:
        handed = hand_in(ws, store, pasted=text, now=now)
        if mail_kind is not None:
            with store.transaction() as tx:
                req = tx.get("request", handed.request)
                tx.update(
                    "request",
                    req.id,
                    {"mail_kind": mail_kind},
                    WriteContext(actor="pm", trust="trusted", op="test.kind"),
                    read_version=req.version,
                )
        cs_id = process(ws, store, cfg, Router(cfg, store, env={}), handed.request, now=now)
    finally:
        set_responder(None)
    return tasks, store.read().get("changeset", cs_id).data["ops"], [r.data["tier"] for r in store.read().list("run")]


def kept(store):
    return [f for f in store.read().list("fact") if f.data["text"] == notice_fact()["text"]]


def test_a_fact_from_what_looks_like_a_notice_goes_back_once_with_its_sender_and_the_answer_then_stands(noticed):
    _, store, _ = noticed
    tasks, outcomes, tiers = ask_about(noticed, [[notice_fact()]])
    # Asked twice and no more, on one tier: the lint went back once, and keeping the fact stands.
    assert len(tasks) == 2 and len(set(tiers)) == 1
    assert (
        f"This came from an automated notice ('{SENDER}'): keep the fact only if it is something the person needs "
        "to know." in tasks[1].request
    )
    assert [o["status"] for o in outcomes] == ["applied"]
    assert [p for p in outcomes[0]["problems"] if p["severity"] == "refuse"] == []
    assert len(kept(store)) == 1


def test_when_the_assistant_leaves_the_fact_out_after_the_question_nothing_is_kept(noticed):
    _, store, _ = noticed
    tasks, _, _ = ask_about(noticed, [[notice_fact()], []])
    assert len(tasks) == 2 and kept(store) == []


def test_with_the_lint_off_the_first_answer_applies_with_no_return(noticed):
    _, store, cfg = noticed
    cfg.checks.lints["fact-from-notice"] = "off"
    tasks, outcomes, _ = ask_about(noticed, [[notice_fact()]])
    assert len(tasks) == 1 and [o["status"] for o in outcomes] == ["applied"] and len(kept(store)) == 1


def test_mail_the_sorting_named_a_bill_is_never_questioned_as_a_notice(noticed):
    _, store, _ = noticed
    tasks, outcomes, _ = ask_about(noticed, [[notice_fact()]], mail_kind="bill")
    assert len(tasks) == 1 and [o["status"] for o in outcomes] == ["applied"] and len(kept(store)) == 1

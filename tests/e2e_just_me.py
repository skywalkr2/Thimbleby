"""What the "Just me" journey's server is seeded with (`tests/e2e_server.py --just-me`), apart from the server so a test
can read it without starting one: a workspace made as a person with no work makes it (no template, no side beside
Personal), holding an area of life, a person with their relation and how to reach them, a to-do and a question on
Personal."""

from __future__ import annotations

from datetime import UTC, datetime

from engine.storage import WriteContext
from tests.conftest import DEMO_B, fixture_records

#: The area, the relation and the address a person is given: ordinary words of a personal life.
AREA = "Home"
RELATION = "my sister"
ADDRESS = "family.member@example.com"
TODO = "Book the dentist"
QUESTION = "Which week suits the dentist?"


def the_person() -> str:
    """The full name of the workspace's own person, read from the fixture."""
    return fixture_records(DEMO_B, "person")[0]["full_name"]


def seed_just_me(store, cfg):
    """An area under Personal, a person who is somebody to the person (with an address), and an open to-do and an open
    question on Personal. Returns what the browser test reads."""
    me = cfg.workspace.user.person
    personal = cfg.workspace.project.personal
    relative = fixture_records(DEMO_B, "person")[1]["full_name"]
    ctx = WriteContext(actor="pm", trust="trusted", op="e2e.just-me")
    with store.transaction() as tx:
        area = tx.create("project", {"name": AREA, "parent": personal, "area": True}, ctx).id
        person = tx.create(
            "person",
            {"full_name": relative, "relation": RELATION, "how_to_reach": {"email": ADDRESS}},
            ctx,
        ).id
        todo = tx.create("action", {"text": TODO, "owners": [{"person": me}], "project": area}, ctx).id
        question = tx.create(
            "question", {"to": me, "title": QUESTION, "kind": "decision", "projects": [personal]}, ctx
        ).id
    return {
        "personal": personal,
        "area": {"id": area, "name": AREA},
        "person": {"id": person, "name": relative, "relation": RELATION, "address": ADDRESS},
        "todo": {"id": todo, "text": TODO},
        "question": {"id": question, "title": QUESTION},
    }


def seed_first_go(store) -> str:
    """One run held for the person's first go, as a first read leaves it, so Today has the line that offers the go.
    Nothing else is made: the rest of the workspace is what a person has on the first day. Returns the request's id."""
    from engine.dispatcher import FIRST_GO

    ctx = WriteContext(actor="pm", trust="trusted", op="e2e.first-day")
    with store.transaction() as tx:
        return tx.create(
            "request",
            {
                "task": "notes",
                "origin": "input",
                "state": "needs_you",
                "waiting": FIRST_GO,
                "approval": "required",
                "estimate_usd": 0.3,
                "created_at": datetime.now(UTC).isoformat(),
            },
            ctx,
        ).id

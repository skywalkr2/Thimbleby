"""What the side filter's server is seeded with (`tests/e2e_server.py --sides`), apart from the server so a test can
read it without starting one: a workspace made as a person with no work makes it, then a job and a business added as
setup adds them, so there are three sides (Personal, the job, the business). Each side holds a to-do of the person's
own and a promise of someone else's; two calendars (one for each of the job and the business) are watched with the
side each serves, and two meetings on the business calendar clash. One to-do names no project, so it is on no side and
shows under every choice. Nothing here is read from a real service."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from engine.storage import WriteContext
from tests.conftest import DEMO_B, fixture_records

#: The ids the job and the business get: Personal is the first project a workspace made with no template holds, then the
#: two sides in the order they are added. The calendars' settings name them before the app runs.
JOB_ID = "PRJ-2"
BUSINESS_ID = "PRJ-3"
JOB_CALENDAR = "job-calendar"
BUSINESS_CALENDAR = "business-calendar"

#: What each side's to-do and the other person's promise say, by side; plain words the test reads back from here.
TODOS = {
    "personal": "Book the dentist",
    "job": "Send the headcount",
    "business": "Order the fabric samples",
    "none": "Renew the parking permit",
}
QUESTIONS = {
    "personal": "Which week suits the dentist?",
    "job": "Who covers the front desk?",
    "business": "Which fabric do you want first?",
}
PROMISES = {
    "personal": "Return the borrowed ladder",
    "job": "Share the rota",
    "business": "Confirm the print run",
}
MEETINGS = {
    "business": ("Supplier call", "Fitting appointment"),
    "job": ("Team planning",),
}


def names() -> tuple[str, str]:
    """The job's and the business's names, from the fixture's organizations."""
    orgs = fixture_records(DEMO_B, "organization")
    return orgs[0]["name"], orgs[2]["name"]


def calendar_sources() -> list[dict]:
    """The two calendars, each serving one side; never read (nothing here reaches a real service)."""
    return [
        {
            "id": JOB_CALENDAR,
            "connector": "calendar",
            "label": "Job calendar",
            "enabled": False,
            "every_minutes": 43200,
            "sides": [JOB_ID],
        },
        {
            "id": BUSINESS_CALENDAR,
            "connector": "calendar",
            "label": "Business calendar",
            "enabled": False,
            "every_minutes": 43200,
            "sides": [BUSINESS_ID],
        },
    ]


def seed_sides(client, store, cfg):
    """The to-dos, promises and meetings above, once the two sides are made through the setup route (as setup makes
    them). `client` is a test client of the running app. Returns what the browser test reads."""
    job_name, business_name = names()
    made = [
        client.post("/api/setup/business", json={"name": n, "kind": k})
        for n, k in ((job_name, "job"), (business_name, "business"))
    ]
    assert all(m.status_code == 200 for m in made), [m.text for m in made]
    job, business = (m.json()["project"] for m in made)
    assert (job, business) == (JOB_ID, BUSINESS_ID), "the calendars' settings name the sides by these ids"
    me = cfg.workspace.user.person
    personal = cfg.workspace.project.personal
    homes = {"personal": personal, "job": job, "business": business}
    people = [p for p in fixture_records(DEMO_B, "person") if p["id"] != me]
    ctx = WriteContext(actor="pm", trust="trusted", op="e2e.sides")
    with store.transaction() as tx:
        for side, home in homes.items():
            tx.create("action", {"text": TODOS[side], "owners": [{"person": me}], "project": home}, ctx)
        tx.create("action", {"text": TODOS["none"], "owners": [{"person": me}]}, ctx)
        for side, home in homes.items():
            tx.create("question", {"to": me, "title": QUESTIONS[side], "kind": "decision", "projects": [home]}, ctx)
        owed_by = {}
        for number, (side, home) in enumerate(homes.items()):
            owed_by[side] = f"{people[number]['full_name']} (side {number + 1})"
            other = tx.create("person", {"full_name": owed_by[side]}, ctx).id
            tx.create(
                "action",
                {"text": PROMISES[side], "owners": [{"person": other}], "promised_to": [me], "project": home},
                ctx,
            )
        # Tomorrow around midday, whatever zone the person is in: two meetings of the business calendar that overlap,
        # and one of the job calendar that clashes with nothing.
        noon = (datetime.now(UTC) + timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0)
        slots = [
            (BUSINESS_CALENDAR, "supplier", MEETINGS["business"][0], noon, noon + timedelta(hours=1)),
            (
                BUSINESS_CALENDAR,
                "fitting",
                MEETINGS["business"][1],
                noon + timedelta(minutes=30),
                noon + timedelta(hours=1, minutes=30),
            ),
            (JOB_CALENDAR, "planning", MEETINGS["job"][0], noon + timedelta(hours=3), noon + timedelta(hours=4)),
        ]
        for source, key, title, start, end in slots:
            tx.create(
                "snapshot",
                {
                    "source": source,
                    "key": key,
                    "title": title,
                    "content_hash": key,
                    "seen_at": datetime.now(UTC).isoformat(),
                    "event": {"start": start.isoformat(), "end": end.isoformat()},
                },
                ctx,
            )
    return {
        "sides": {
            "personal": {"id": personal, "name": "Personal"},
            "job": {"id": job, "name": job_name},
            "business": {"id": business, "name": business_name},
        },
        "todos": TODOS,
        "questions": QUESTIONS,
        "promises": PROMISES,
        "owed_by": owed_by,
        "meetings": MEETINGS,
        "day": (noon).date().isoformat(),
    }

"""What the quality page's server is seeded with (`tests/e2e_server.py --assistant-found`), apart from the server so a
test can read it without starting one: promises of the person's own that the assistant found, made at the server's own
clock so they fall inside the quality window whatever day the server starts, one of them closed as done. With none the
page says it is too early to tell and shows no figures."""

from __future__ import annotations

from engine.storage import WriteContext

#: What the found promises say; plain words, the same on every start.
PROMISES = ("Send the signed form", "Bring the receipts", "Call the plumber back")


def seed_found_promises(store, cfg):
    """Promises the assistant read out of the person's mail, each owned by the person and promised to someone else,
    and the first closed by the person. Returns what a test reads."""
    from tests.conftest import DEMO_B, fixture_records

    me = cfg.workspace.user.person
    other = next(p for p in fixture_records(DEMO_B, "person") if p["id"] != me)["id"]
    found = WriteContext(actor="assistant", trust="trusted", op="e2e.quality")
    closed = WriteContext(actor="pm", trust="trusted", op="e2e.quality")
    with store.transaction() as tx:
        made = [
            tx.create("action", {"text": text, "owners": [{"person": me}], "promised_to": [other]}, found)
            for text in PROMISES
        ]
    with store.transaction() as tx:
        first = tx.get("action", made[0].id)
        tx.update("action", first.id, {"status": "done"}, closed, read_version=first.version)
    return {"promises": [{"id": m.id, "text": t} for m, t in zip(made, PROMISES, strict=True)]}

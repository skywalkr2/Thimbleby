"""What `tests/e2e_server.py --all-clear` seeds, apart from the server so a test can read it without starting one: a
workspace in which every counted setup step is done the way the app records it and nothing waits on Today, so Today
shows its "Nothing needs you" card and not a line about setup.

- the person is named and answered the work question with Just me (the answer setup keeps);
- one AI account that is not the built-in stand-in passed its whole connection test, recorded as the app records one;
- two mail sources (an inbox and a sent folder) are on and were read a moment ago;
- a note was handed in and filed by a finished run;
- one backup was made to the folder the workspace names;
- two people besides the one the workspace is for are listed, so People counts.

Nothing patches a check: each step is made true through the store and the app's own record-keeping."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml

from engine import setup
from engine.ai import checked
from engine.ai.smoke import record, smoke_test
from engine.ai.task import AiResult
from engine.backup import run_backup
from engine.setup import keep_walkthrough, note_set_by_setup
from engine.storage import WriteContext
from engine.workspace import Workspace, init_workspace
from tests.conftest import DEMO_B, connection_answer, fixture_records
from tests.e2e_just_me import the_person

#: The one AI account: an ordinary service account (not the stand-in), whose address is never called because its test is
#: answered by the stand-in adapter the test servers use.
ACCOUNT = "checked"
#: The mail sources: one mailbox's inbox and its sent folder (a mailbox that reads no sent folder is offered one on
#: Today), each on and read once by the seed.
SOURCES = (("all-clear-mail", "Mail", "INBOX"), ("all-clear-sent", "Sent mail", "Sent"))
NOTE = "Remember to order the proofs."


def make_workspace(tmp: Path) -> Workspace:
    """A workspace as a person with no work has it after setup (named, walkthrough closed), whose one AI account is a
    service account and whose one mail source is on and set to be read rarely, so the worker leaves its read alone."""
    first = the_person().split()[0]
    ws = init_workspace(tmp / "ws", git=False, you=the_person(), name=f"{first}'s")
    note_set_by_setup(ws, {"workspace.name": f"{first}'s"})
    fixture = yaml.safe_load((DEMO_B / "config" / "ai.yaml").read_text(encoding="utf-8"))
    path = ws.config_dir / "ai.yaml"
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    stub = fixture["providers"]["stub"]
    # An ordinary service account, as the catalog of kinds of account names one (its address is never called).
    kinds = yaml.safe_load((Path(__file__).parents[1] / "catalog" / "ai-endpoints.yaml").read_text(encoding="utf-8"))
    service = next(
        k for k in kinds["endpoints"] if k.get("base_url") and not k.get("local") and k["adapter"] != "cli-agent"
    )
    data.setdefault("providers", {})[ACCOUNT] = {
        **stub,
        "adapter": service["adapter"],
        "label": "Test account",
        "base_url": service["base_url"],
    }
    data["tiers"] = {
        name: {**tier, "use": f"{ACCOUNT}/default"} if tier.get("use") else tier
        for name, tier in fixture["tiers"].items()
    }
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
    path = ws.config_dir / "watch.yaml"
    watch = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    login = {"host": "mail.example.com", "user": "rowan@example.com", "password": "env:ALL_CLEAR_PASSWORD"}
    watch["sources"] = [
        {
            "id": source,
            "connector": "mailbox",
            "label": label,
            "every_minutes": 43200,
            "settings": {**login, "folder": folder},
        }
        for source, label, folder in SOURCES
    ]
    path.write_text(yaml.safe_dump(watch, sort_keys=False), encoding="utf-8")
    # The backup folder is in the settings file (the backup reads the saved settings, not flags).
    (tmp / "offsite").mkdir(exist_ok=True)
    path = ws.config_dir / "storage.yaml"
    storage = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    storage.setdefault("backups", {})["targets"] = [{"path": str(tmp / "offsite"), "label": "test folder"}]
    storage["backups"]["automatic"] = False
    path.write_text(yaml.safe_dump(storage, sort_keys=False), encoding="utf-8")
    keep_walkthrough(ws, closed=True)
    return ws


def flags() -> dict[str, Any]:
    """The settings given as flags that differ from the other servers': the tiers use the service account."""
    return {"ai.tiers.routine.use": f"{ACCOUNT}/default", "ai.tiers.routine.fallback": []}


def _answering(_name: str, _settings: Any, _secret: str | None) -> Any:
    """The stand-in adapter the test servers use: it answers every call of the connection test the way a working account
    does."""

    class Answers:
        def run(self, task: Any, model: Any) -> AiResult:
            return AiResult(text=connection_answer(task), model_served="scripted", seconds=0)

    return Answers()


def seed_all_clear(ws: Workspace, cfg: Any, store: Any) -> dict[str, Any]:
    """Make each counted step done. Returns what was made, for the test to read."""
    now = datetime.now(UTC)
    setup.keep_work_choice(ws, "me")
    results = smoke_test(cfg, {}, _answering)
    record(ws, results, cfg)
    checked.remember(ws, cfg, results)
    ws.sources_dir.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(NOTE.encode()).hexdigest()
    (ws.sources_dir / f"{digest}.txt").write_text(NOTE, encoding="utf-8")
    others = [p["full_name"] for p in fixture_records(DEMO_B, "person")[1:3]]
    with store.transaction() as tx:
        for source, _label, _folder in SOURCES:
            tx.create(
                "watch_run",
                {
                    "source": source,
                    "started_at": now.isoformat(),
                    "outcome": "ok",
                    "new": 0,
                    "changed": 0,
                    "removed": 0,
                },
                WriteContext(actor="watcher", trust="trusted", op="watch.run"),
            )
        pasted = tx.create(
            "source",
            {
                "received_at": now.isoformat(),
                "kind": "pasted",
                "title": NOTE,
                "content_hash": digest,
                "trust": "untrusted",
                "sensitivity": "internal",
            },
            WriteContext(actor="pm", trust="trusted", op="e2e.all-clear"),
        ).id
        # The run that filed the note: Today says "Nothing needs you" only once the assistant has worked on something.
        tx.create(
            "run",
            {
                "task": "notes",
                "provider": ACCOUNT,
                "model": "default",
                "tier": "routine",
                "outcome": "ok",
                "started_at": now.isoformat(),
            },
            WriteContext(actor="engine", trust="trusted", op="e2e.all-clear"),
        )
        tx.create(
            "request",
            {
                "task": "notes",
                "source": pasted,
                "origin": "pm",
                "state": "done",
                "created_at": now.isoformat(),
            },
            WriteContext(actor="pm", trust="trusted", op="e2e.all-clear"),
        )
        for name in others:
            tx.create("person", {"full_name": name}, WriteContext(actor="pm", trust="trusted", op="e2e.all-clear"))
    run_backup(ws, cfg)
    return {"people": others, "sources": [s for s, _, _ in SOURCES]}

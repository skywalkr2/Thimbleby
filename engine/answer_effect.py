"""An answer or a correction to a question must change something (design 6.8, 6.32).

When the person answers a question, or asks for a change to one, the words go to the assistant as a note about that
question. A run that ends with nothing applied (no op applied or held, no setting suggested) is a silent stop: the
person said something and nothing followed. So the first such run goes back to the assistant once, told so, and a second
one stops with a Today line that quotes the person's words and asks them to look. Nothing is returned more than once,
and the return never runs on a stronger tier.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from engine.storage import Store, WriteContext

#: The routes whose note is the person's answer or correction to a question.
ROUTES = ("answered", "answered_for", "change_requested")
#: Questions whose answer is itself the change (who an item belongs to, a held op's release): no note adds one.
SELF_ACTING = ("owner", "held-op")
#: What the assistant is told when its run on the person's words changed nothing.
RETURN_LINE = (
    "The person's answer to {title} changed nothing: make the change it asks for (a record, a setting or a "
    "learning), or ask the person if it is unclear."
)

_ENGINE = WriteContext(actor="engine", trust="trusted", op="answer.effect")


def question_of(store: Store, request: dict[str, Any]) -> Any | None:
    """The question a request handles the person's answer or correction to, or None for any other request."""
    if request.get("task") != "notes" or request.get("origin") != "pm" or not request.get("source"):
        return None
    about = request.get("about") or {}
    if about.get("kind") != "question":
        return None
    source = store.read().get("source", request["source"])
    if source is None or source.data.get("kind") not in {f"note:{route}" for route in ROUTES}:
        return None
    question = store.read().get("question", about["id"])
    if question is None or (question.data.get("resolves") or {}).get("kind") in SELF_ACTING:
        return None
    return question


def changed(store: Store, request_id: str, changeset_id: str) -> bool:
    """Whether the run changed anything: an op applied or held for the person (a record, a setting or a learning kept),
    or a setting suggested. A changeset with no such op, only words saying what should happen, changed nothing."""
    reader = store.read()
    cs = reader.get("changeset", changeset_id)
    if cs is not None and any(o.get("status") in ("applied", "held") for o in cs.data["ops"]):
        return True
    return any(p.data.get("request") == request_id for p in reader.list("setting_proposal"))


def after_run(store: Store, request: Any, changeset_id: str, now: datetime) -> bool:
    """Called once a run on a request was applied. For a request that handles an answer or correction to a question
    and whose run changed nothing: the first time, the request is redone by a new one that tells the assistant so; the
    second time, it stops for the person (Today says so). Returns whether it did either."""
    question = question_of(store, request.data)
    if question is None or changed(store, request.id, changeset_id):
        return False
    with store.transaction() as tx:
        cs = tx.get("changeset", changeset_id)
        tx.update("changeset", changeset_id, {"reviewed": True}, _ENGINE, read_version=cs.version)
        cur = tx.get("request", request.id)
        if request.data.get("returned_from"):
            tx.update(
                "request",
                request.id,
                {
                    "state": "needs_you",
                    "no_effect": True,
                    "waiting": "Nothing changed after your answer. Look at what it asked for.",
                },
                _ENGINE,
                read_version=cur.version,
            )
            return True
        title = " ".join(str(question.data["title"]).split())
        redone = tx.create(
            "request",
            {
                "task": request.data["task"],
                "note": RETURN_LINE.format(title=f"“{title}”"),
                "source": request.data["source"],
                "about": request.data["about"],
                "origin": "pm",
                "state": "queued",
                "waiting": "With the assistant, next in line",
                "created_at": now.isoformat(),
                "returned_from": request.id,
                **{k: request.data[k] for k in ("project", "use", "sensitivity") if request.data.get(k)},
            },
            _ENGINE,
        )
        tx.update(
            "request",
            request.id,
            {"state": "done", "waiting": None, "superseded_by": redone.id},
            _ENGINE,
            read_version=cur.version,
        )
    return True

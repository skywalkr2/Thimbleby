"""Pictures handed in (design 6.32): a listed image-reading account turns a picture into outside text.

The upload is kept as a file and queued like any other AI work. Its estimate uses the task's configured image-token
count and the account's input price; the existing approval and budget rules decide whether it may run.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from engine.ai.router import (
    CANNOT_READ_IMAGES,
    AccountPaused,
    BudgetReached,
    CannotReadImages,
    NetworkOffline,
    NoProvider,
    Router,
)
from engine.ai.task import AiError, AiTask, Image
from engine.config import Config
from engine.files import add_file, read_bytes
from engine.intake import IntakeError
from engine.intake import hand_in as hand_in_words
from engine.money import usd
from engine.playbook import practice
from engine.prompts import render
from engine.records import RunKnowledge
from engine.storage import Store, WriteContext
from engine.workspace import Workspace

TASK = "read-image"
IMAGE_TYPES = frozenset({"image/png", "image/jpeg", "image/gif", "image/webp"})
IMAGE_EXTENSIONS = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

_PERSON = WriteContext(actor="pm", trust="trusted", op="capture.picture")
_STARTING = "With the assistant, starting now"
_TURNED = "Read as outside content and handed in."
_KEPT = "No AI account can read pictures. The picture has been kept in your files."


@dataclass(frozen=True)
class HandedPicture:
    status: Literal["queued", "kept"]
    request: str | None
    file: str
    reason: str | None


def image_type(name: str, media_type: str | None) -> str | None:
    """The supported picture type from the sender or its file ending; None when it isn't one."""
    sent = (media_type or "").split(";")[0].strip().lower()
    if sent in IMAGE_TYPES:
        return sent
    return IMAGE_EXTENSIONS.get(Path(name).suffix.lower()) if sent in ("", "application/octet-stream") else None


def hand_in(
    ws: Workspace,
    store: Store,
    cfg: Config,
    router: Router,
    data: bytes,
    *,
    name: str,
    media_type: str | None = None,
    note: str = "",
    project: str | None = None,
    data_level: str | None = None,
    now: datetime | None = None,
) -> HandedPicture:
    """Keep a picture and queue reading it when a listed account can; otherwise keep it and say so plainly."""
    found = image_type(name, media_type)
    if found is None:
        raise IntakeError(f"{name} isn't a kind of picture this app can read.")
    cap = cfg.storage.files.max_file_mb
    if len(data) > cap * 1024 * 1024:
        raise IntakeError(f"{name} is larger than {cap:g} MB, so it was not handed in.")

    now = now or datetime.now(UTC)
    try:
        router.image_readers(TASK, data_level or "internal")
    except (CannotReadImages, NoProvider):
        stored = add_file(
            store,
            cfg,
            data,
            name=name,
            media_type=found,
            project=project,
            data_level=data_level,
            origin="upload",
            now=now,
        )
        request = None
        if note.strip():
            request = hand_in_words(
                ws, store, note=note, project=project, data_level=data_level, cfg=cfg, now=now
            ).request
        return HandedPicture("kept", request, stored.id, _KEPT)

    stored = add_file(
        store,
        cfg,
        data,
        name=name,
        media_type=found,
        project=project,
        data_level=data_level,
        origin="upload",
        now=now,
    )
    with store.transaction() as tx:
        request = tx.create(
            "request",
            {
                "task": TASK,
                "about": {"kind": "file", "id": stored.id},
                "origin": "input",
                "state": "queued",
                "waiting": _STARTING,
                "created_at": now.isoformat(),
                "note": note.strip() or None,
                **({"sensitivity": data_level} if data_level else {}),
                **({"project": project} if project else {}),
            },
            _PERSON,
        )
    return HandedPicture("queued", request.id, stored.id, None)


def process(
    ws: Workspace, store: Store, cfg: Config, router: Router, request_id: str, *, now: datetime | None = None
) -> str | None:
    """Read one queued picture and apply the usual spending rules.

    The reading is handed in as outside text.
    """
    from engine.dispatcher import (
        FIRST_GO,
        UNPRICED_GO,
        _data_level,
        _data_level_cause,
        _set,
        about,
        needs_you,
        person_is_set,
        wait_for_network,
    )
    from engine.projects import budget_problem

    now = now or datetime.now(UTC)
    req = store.read().get("request", request_id)
    if req is None:
        raise KeyError(request_id)
    target = (req.data.get("about") or {}).get("id")
    stored = store.read().get("file", target) if target else None
    if stored is None:
        return needs_you(store, request_id, "The picture this was for is gone.")
    if not person_is_set(store, cfg):
        return needs_you(store, request_id, "Say who you are first", cause={"kind": "no_person"})
    level = _data_level(store, req.data)
    try:
        router.image_readers(TASK, level)
    except CannotReadImages:
        return needs_you(store, request_id, CANNOT_READ_IMAGES)
    except NoProvider as err:
        return needs_you(store, request_id, str(err), cause=_data_level_cause(err))

    _, data = read_bytes(store, stored.id)
    instructions = render(
        TASK,
        {"assistant_name": cfg.workspace.assistant_name},
        workspace_root=ws.root,
    )
    knowledge_section = "Knowledge section:\nNo workspace knowledge is needed to read the picture."
    stable = "\n\n".join(part for part in (practice(TASK), knowledge_section) if part)
    knowledge = RunKnowledge(stable_chars=len(knowledge_section))
    from engine.tasks import settings

    kind_settings = settings(cfg, store.plugins.tasks.get(TASK), TASK)
    task = AiTask(
        kind=TASK,
        instructions=instructions,
        stable=stable,
        request="Read all visible words in the picture and briefly describe other meaningful content.",
        output_schema={},
        temperature=kind_settings.temperature,
        max_output=kind_settings.max_output,
        output="text",
        expected_output=kind_settings.expected_output,
        knowledge=knowledge.model_dump(),
        image=Image(data, stored.data["media_type"], stored.data["name"]),
        min_context=kind_settings.min_context,
    )
    estimate = router.estimate(task, data_level=level)
    _set(store, request_id, range_usd=[round(estimate, 4), round(estimate, 4)] if estimate is not None else None)
    budgets = cfg.ai.budgets
    granted = req.data.get("approval") == "granted"
    if estimate is not None and estimate > budgets.per_run_usd:
        return needs_you(
            store,
            request_id,
            f"This would cost about {usd(estimate)}, above the per-run limit of {usd(budgets.per_run_usd)}. "
            "Raise “Most one run may cost” in Settings, AI spending.",
        )
    if over := budget_problem(store, req.data, estimate):
        return needs_you(store, request_id, over)
    if estimate is None and budgets.confirm_unpriced and not granted:
        _set(store, request_id, state="needs_you", approval="required", waiting=UNPRICED_GO)
        return None
    if budgets.first_go and not granted and (estimate is None or estimate > 0) and not store.read().has("run"):
        _set(store, request_id, state="needs_you", approval="required", waiting=FIRST_GO)
        return None
    if estimate is not None and estimate > budgets.confirm_above_usd and not granted:
        _set(
            store,
            request_id,
            state="needs_you",
            approval="required",
            estimate_usd=round(estimate, 4),
            waiting=f"{about(estimate, None)} Waiting for you to start it.",
        )
        return None
    _set(store, request_id, state="running", waiting="With the assistant now", cause=None)
    try:
        result, _, _ = router.call(
            task,
            request_id=request_id,
            data_level=level,
            spend_limit=budgets.per_run_usd if granted else min(budgets.per_run_usd, budgets.confirm_above_usd),
            unpriced_ok=not budgets.confirm_unpriced or granted,
        )
    except AccountPaused as err:
        cause = {"kind": "paused", "account": err.account, "until": err.until.isoformat(), "tier": err.tier or None}
        _set(store, request_id, state="queued", waiting=str(err), cause=cause)
        return None
    except NetworkOffline:
        return wait_for_network(store, cfg, request_id, now)
    except CannotReadImages:
        return needs_you(store, request_id, CANNOT_READ_IMAGES)
    except (BudgetReached, NoProvider) as err:
        return needs_you(store, request_id, str(err), cause=_data_level_cause(err))
    except AiError as err:
        return needs_you(store, request_id, f"Reading the picture didn't work: {err.detail or err.kind}.")

    reading = result.text.strip()
    if not reading:
        return needs_you(store, request_id, "No words or other meaningful content could be read in this picture.")
    handed = hand_in_words(
        ws,
        store,
        cfg=cfg,
        note=req.data.get("note") or "",
        pasted=f"Attached picture: {stored.data['name']}\n{reading}\nEnd of attached picture: {stored.data['name']}",
        project=req.data.get("project"),
        data_level=req.data.get("sensitivity") or stored.data.get("sensitivity"),
        now=now,
    )
    _set(store, request_id, state="done", waiting=_TURNED)
    return handed.request


def is_image_reading(request: dict[str, Any]) -> bool:
    return request.get("task") == TASK

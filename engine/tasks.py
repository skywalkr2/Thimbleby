"""AI task kinds: what each kind of work may return, which prompt and guidance it uses, what its runs see, and its
default settings (the workspace's `ai.tasks.<kind>` overrides any of them)."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from dataclasses import field as _field
from pathlib import Path
from typing import Any

from engine.ops import ACT_OPS, KNOWLEDGE_OPS, OP_MODELS, PERSON_ONLY_OPS

#: The knowledge ops reading notes offers, as the learning from an input that is part of its own run (design 6.22): a
#: term or name the input uses that isn't in the glossary can be recorded, or marked unknown, and who answers a kind of
#: question (or who doesn't) can be recorded as a routing entry. Each still applies as a proposal unless the words are
#: the person's own.
OFFERED_TO_NOTES = frozenset({"glossary.add", "routing.add"})
#: The one op only the person makes that reading notes is offered: filing an open question as already asked, which
#: the applier accepts only when the input is the person's own note.
PERSON_NOTE_OPS = frozenset({"question.mark_sent"})

#: Core ops reading notes never offers: deleting is the person's call, file.add is made only by person actions, the
#: ops only the person makes are theirs alone, and the ops that keep what the assistant learned belong to the work that
#: learns (design 6.22), except the ones in `OFFERED_TO_NOTES`.
NOT_FROM_NOTES = (
    (KNOWLEDGE_OPS - OFFERED_TO_NOTES)
    | (PERSON_ONLY_OPS - PERSON_NOTE_OPS)
    | {
        "record.delete",
        "file.add",
        "text.propose",
        "text.draft",
        "answer",
        "setting.propose",
        "report.draft",
        "reminder.entry",
    }
    # Drafting something to send is the person's, or an add-on's action they apply; outward acts are never offered to
    # the assistant's reading of notes (design 6.12).
    | ACT_OPS
)
#: Ops reading notes is offered that an ask is not: a project the input names, which waits for the person as a
#: system op, a person's part in a project, which waits the same way, and a contact detail from a signature, which
#: always waits.
NOTES_ONLY = frozenset({"project.add", "project.role", "person.contact"})
#: What an ask may do besides what reading notes does: answer, suggest a setting, draft a report to the maintainers.
ASK_OPS = ("answer", "setting.propose", "report.draft")
#: What learning from a correction may propose (design 6.22): one entry to keep, or a change to a lesson that should
#: have caught the mistake, or who a person is to the person (a stance, which waits for the person's Keep). None of
#: these depends on the account that runs it.
#: What a follow-on run may do (engine/follow_on.py): ask whoever decides whether a tied action's date should change or
#: whether a moved plan still holds, draft a correction for someone an item already reached, and leave a note. It never
#: changes an action's day or words.
FOLLOW_ON_OPS = ("question.add", "note")
LEARN_OPS = ("lesson.add", "lesson.update", "glossary.add", "routing.add", "style.add", "rule.add", "person.stance")


@dataclass(frozen=True)
class TaskKind:
    name: str
    ops: tuple[str, ...]
    prompt: str
    playbook: str
    label: str = ""
    on: str | None = None  # the record kind a run is about, if any (the first, for work about either of two kinds)
    kinds: tuple[str, ...] = ()  # every record kind a run may be about: empty, one, or two for work about either
    groups: Callable[..., Any] | None = None  # (op, view) -> label or None: how an answer's ops are grouped to review
    packet: Callable[..., Any] | None = None  # (target, view, settings, note) -> PacketParts, from a plugin
    defaults: dict[str, Any] = field(default_factory=dict)  # TaskSettings fields the plugin sets
    prompt_file: Path | None = None  # a plugin's own prompt template
    guidance_file: Path | None = None  # a plugin's own guidance
    output: str = "ops"  # "draft": the answer is prose for the long text field `field` of the record it is about
    field: str | None = None
    anchored: bool = False  # a draft that revises the current text, paragraph by paragraph, with ids
    questions: int = 0  # how many questions for the person a draft may end with
    role: str = "write"  # write, check (an independent second opinion) or research
    where: dict[str, tuple[Any, ...]] = _field(default_factory=dict)  # field values a record of kind `on` must have
    start_where: dict[str, tuple[Any, ...]] = _field(default_factory=dict)  # and, for runs the person starts, these
    all_or_nothing: bool = False  # the answer's ops apply together or not at all
    requires_ops: tuple[str, ...] = ()  # an answer must include at least one of these ops
    learning: str = "core"  # "own": the core's own learning steps don't run on this work (engine/learning.py)
    max_ops: int | None = None  # an answer may hold at most this many ops; more is refused as a whole

    @property
    def on_kinds(self) -> tuple[str, ...]:
        """The record kinds a run of this work may be about (none when it isn't about a record)."""
        return self.kinds or ((self.on,) if self.on else ())

    def offered_on(self, record: Any, texts: Callable[[str], bool | None] | None = None) -> bool:
        """Whether this work applies to a record (of kind `on`): every `where` field holds one of its values."""
        return where_matches(self.where, record, texts)

    def startable_on(self, record: Any, texts: Callable[[str], bool | None] | None = None) -> bool:
        """Whether the person may start this work on a record: `where` and `start_where` both match."""
        return self.offered_on(record, texts) and where_matches(self.start_where, record, texts)


#: The most a plugin's small flat mapping (a part's `address`, a request's `tag`) may hold: how many entries, how long a
#: key or a text value, and how many bytes in all, written as compact JSON.
FLAT_MAX_ENTRIES, FLAT_MAX_KEY, FLAT_MAX_TEXT, FLAT_MAX_BYTES = 20, 40, 200, 1024


def flat_mapping(value: Any, what: str) -> dict[str, Any] | None:
    """A plugin's small flat mapping, checked: short text keys and values that are short text, numbers or yes/no (no
    nesting, no empty value), at most 1 KB. Returns a copy, None for None; raises ValueError saying why."""
    import json

    if value is None:
        return None
    if not isinstance(value, dict) or not value:
        raise ValueError(f"{what} is a small mapping of names to short text, numbers or yes/no")
    if len(value) > FLAT_MAX_ENTRIES:
        raise ValueError(f"{what} holds at most {FLAT_MAX_ENTRIES} entries")
    for key, item in value.items():
        if not isinstance(key, str) or not key or len(key) > FLAT_MAX_KEY:
            raise ValueError(f"a name in {what} is short text, up to {FLAT_MAX_KEY} characters")
        ok = isinstance(item, (bool, int, float)) or (isinstance(item, str) and 0 < len(item) <= FLAT_MAX_TEXT)
        if not ok:
            raise ValueError(
                f"a value in {what} is short text (up to {FLAT_MAX_TEXT} characters), a number or yes/no: {key}"
            )
    if len(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()) > FLAT_MAX_BYTES:
        raise ValueError(f"{what} is larger than {FLAT_MAX_BYTES} bytes")
    return dict(value)


def where_matches(
    where: dict[str, tuple[Any, ...]], record: Any, texts: Callable[[str], bool | None] | None = None
) -> bool:
    """Whether a record passes a `where` filter: each field holds one of its values, where ANY means "has a value"
    and None "has none". For a long text field, `texts(field)` says whether the record has text in it (None for a
    field that isn't long text). A key `"<reference field>.<field>"` reads the field on the record the reference points
    at (`texts.through`, which `engine.texts.text_presence` gives): a reference that is empty or points at nothing has
    no value."""
    from engine.plugin_api import ANY

    for key, values in where.items():
        if "." in key:
            ref, _, sub = key.partition(".")
            through = getattr(texts, "through", None)
            has_text, value = through(ref, sub) if through is not None else (None, None)
        else:
            has_text = texts(key) if texts is not None else None
            value = record.data.get(key)
        present = has_text if has_text is not None else value not in (None, "", [], {})
        if not any(
            (v is ANY and present) or (v is None and not present) or (has_text is None and v is not ANY and v == value)
            for v in values
        ):
            return False
    return True


TASKS: dict[str, TaskKind] = {
    # Reading notes never deletes anything; deletion is the person's own act (or a plugin task that declares it).
    "notes": TaskKind(
        name="notes", ops=tuple(n for n in OP_MODELS if n not in NOT_FROM_NOTES), prompt="notes", playbook="notes"
    ),
    # A question from the PM about the app or the workspace (design 6.25), answered from the material it is given.
    "ask": TaskKind(
        name="ask",
        ops=(
            *ASK_OPS,
            *(n for n in OP_MODELS if n not in NOT_FROM_NOTES | OFFERED_TO_NOTES | NOTES_ONLY | PERSON_NOTE_OPS),
        ),
        prompt="ask",
        playbook="notes",
        label="Ask",
    ),
    # Sorting the mail the rules can't place (design 6.5): one run over a batch of headers, with no request and no
    # ops. It sees only sender, subject and category, so it is the low-cost tier's work (engine/mail_sorting.py).
    "sort-mail": TaskKind(
        name="sort-mail",
        ops=(),
        prompt="sort-mail",
        playbook="sort-mail",
        label="Sort mail",
        defaults={"max_output": 2000, "expected_output": 400},
    ),
    # Learning from one correction (design 6.22): at most one proposal, none, or one question to the person when the
    # correction's meaning is unclear. A bad lesson is in every later packet,
    # so this is the stronger tier's work (engine/learn.py).
    "learn-correction": TaskKind(
        name="learn-correction",
        ops=(*LEARN_OPS, "question.add"),
        prompt="learn-correction",
        playbook="learn-correction",
        label="Learning from a correction",
        defaults={"tier": "deep", "max_output": 2000, "expected_output": 400},
        max_ops=1,
    ),
    # One run when a dated record moves or a fact is replaced (design 6.7, follow-on changes): it brings the records
    # tied to the move and asks about them, and drafts a correction for anyone already reached (engine/follow_on.py).
    # An action handed to the assistant (engine/action_work.py): the person asks for the work it stands for (a message,
    # a list, a page), and the answer is prose filed as a pending draft of the action's `work` text. It changes nothing
    # else: the action stays the person's.
    "action-work": TaskKind(
        name="action-work",
        ops=("text.draft",),
        prompt="action-work",
        playbook="action-work",
        label="Drafting the work for an action",
        on="action",
        output="draft",
        field="work",
        where={"status": ("open",)},
        defaults={"max_output": 3000, "expected_output": 600},
    ),
    # The message to whoever the person reports to, from the week's records (engine/week_plan.py): prose filed as a
    # pending draft of the week's `message` text, unreviewed until the person copies it. It is never sent from here.
    "monday-message": TaskKind(
        name="monday-message",
        ops=("text.draft",),
        prompt="monday-message",
        playbook="monday-message",
        label="Drafting the Monday message",
        on="week_plan",
        output="draft",
        field="message",
        defaults={"max_output": 2000, "expected_output": 400},
    ),
    # A note to read before a calendar entry with other people on it, from who is coming and what is open with them
    # (engine/meeting_prep.py): prose filed as a pending draft of the entry's `prep` text, unreviewed until accepted.
    "meeting-prep": TaskKind(
        name="meeting-prep",
        ops=("text.draft",),
        prompt="meeting-prep",
        playbook="meeting-prep",
        label="Drafting the meeting prep",
        on="event",
        output="draft",
        field="prep",
        defaults={"max_output": 1500, "expected_output": 350},
    ),
    # A voice note turned into text (engine/transcribe.py): the sound in, the words out, on an account whose model is
    # listed as taking speech. It has no packet and no ops; the words go on to the notes work as the person's own.
    "transcribe": TaskKind(
        name="transcribe",
        ops=(),
        prompt="transcribe",
        playbook="transcribe",
        label="Turning a voice note into text",
        defaults={"max_output": 4000, "expected_output": 500},
    ),
    # Reading a picture (engine/read_image.py): its words and meaningful content are handed in as outside material.
    "read-image": TaskKind(
        name="read-image",
        ops=(),
        prompt="read-image",
        playbook="read-image",
        label="Reading a picture",
        defaults={"max_output": 4000, "expected_output": 500, "expected_image_tokens": 1600},
    ),
    "follow-on": TaskKind(
        name="follow-on",
        ops=FOLLOW_ON_OPS,
        prompt="follow-on",
        playbook="follow-on",
        label="Checking what is tied to a move",
        defaults={"max_output": 3000, "expected_output": 500},
    ),
}


def task_kind(name: str) -> TaskKind:
    try:
        return TASKS[name]
    except KeyError:
        raise KeyError(f"unknown task kind {name!r}") from None


def settings(cfg: Any, kind: TaskKind | None, name: str | None = None) -> Any:
    """A task kind's settings: the tier its role maps to (ai.roles), then the kind's own declared defaults (a tier it
    names wins over its role's, being the more specific), then whatever the workspace's ai.tasks.<kind> sets."""
    from engine.config.schema import TaskSettings

    key = kind.name if kind is not None else name
    configured = cfg.ai.tasks.get(key) if key else None
    values = {}
    role_tier = getattr(cfg.ai.roles, kind.role).tier if kind is not None else None
    if role_tier is not None:
        values["tier"] = role_tier
    if kind is not None:
        values.update(kind.defaults)
    if configured is not None:
        values.update({f: getattr(configured, f) for f in configured.model_fields_set})
    return TaskSettings.model_validate(values)


def default_tier(cfg: Any, kind: TaskKind) -> str:
    """The tier a kind of work uses while the workspace's `ai.tasks.<kind>.tier` says nothing: the tier the kind
    itself declares, else its role's tier (ai.roles) when that is set, else the usual one."""
    from engine.config.schema import TaskSettings

    role_tier = getattr(cfg.ai.roles, kind.role).tier
    return kind.defaults.get("tier") or role_tier or TaskSettings.model_fields["tier"].get_default()

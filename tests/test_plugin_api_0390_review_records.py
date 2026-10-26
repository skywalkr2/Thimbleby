"""Plugin API 0.3.90, part B1: reviewing and applying (170 groups of an answer, 194 `$new:<n>`, 201 the kit's
`apply(requests=)`, 205 `about: {item}` on an edit) and records, references and placement (197 `blocks_delete=False`,
200 `placed_by`, 204 `where` through a reference, 193 a task kind on either of two kinds, 199 a part's `address`,
188 a request's `tag`). The pack is a fixture written here; names and ids come from the workspace's fixtures."""

from __future__ import annotations

import pytest
import yaml

from engine.plugin_api import Registrar, Settings
from engine.plugin_api.testing import PluginDidNotStart, plugin_workspace
from engine.storage import StoreError

PACK = """
from typing import Annotated, ClassVar, Literal
from pydantic import Field
from engine.plugin_api import OpModel, PacketParts, Part, Proposal, Item, Record, RefTo, Settings

SEEN = {"packets": [], "origins": [], "events": [], "labels": []}

class Config(Settings):
    mode: Literal["ok", "raise", "long", "number"] = Field("ok", description="How the grouping behaves.")

class Book(Record):
    record_kind: ClassVar[str] = "rv/book"
    prefix: ClassVar[str] = "BKK"
    layout: ClassVar[str | None] = "books/{title}"
    title: str
    status: Literal["open", "closed"] = "open"
    project: Annotated[str | None, RefTo("project")] = None

class Chapter(Record):
    record_kind: ClassVar[str] = "rv/chapter"
    prefix: ClassVar[str] = "CHP"
    layout: ClassVar[str | None] = "chapters/{title}"
    person_only: ClassVar[dict] = {"status": ("final",)}
    title: str
    status: Literal["draft", "final"] = "draft"
    book: Annotated[str | None, RefTo("rv/book", blocks_delete=False)] = None
    project: Annotated[str | None, RefTo("project")] = None

class Note(Record):
    record_kind: ClassVar[str] = "rv/note"
    prefix: ClassVar[str] = "NTE"
    title: str
    chapter: Annotated[str | None, RefTo("rv/chapter")] = None

class Memo(Record):
    record_kind: ClassVar[str] = "rv/memo"
    prefix: ClassVar[str] = "MMO"
    layout: ClassVar[str | None] = "memos/{title}"
    title: str
    project: Annotated[str | None, RefTo("project")] = None

class AddBook(OpModel):
    op: Literal["rv/add-book"] = "rv/add-book"
    writes: ClassVar[dict] = {"rv/book": ("*",)}
    title: str
    status: str = "open"
    project: str | None = None

class AddChapter(OpModel):
    op: Literal["rv/add-chapter"] = "rv/add-chapter"
    writes: ClassVar[dict] = {"rv/chapter": ("*",)}
    title: str
    status: str = "draft"
    book: str | None = None
    project: str | None = None

class AddNote(OpModel):
    op: Literal["rv/add-note"] = "rv/add-note"
    writes: ClassVar[dict] = {"rv/note": ("*",)}
    title: str
    chapter: str | None = None

class AddMemo(OpModel):
    op: Literal["rv/add-memo"] = "rv/add-memo"
    writes: ClassVar[dict] = {"rv/memo": ("*",)}
    title: str
    project: str | None = None

class Rename(OpModel):
    op: Literal["rv/rename"] = "rv/rename"
    writes: ClassVar[dict] = {"rv/chapter": ("title",)}
    id: str
    title: str

def add_book(op, writer, cfg):
    writer.create("rv/book", {"title": op.title, "status": op.status, "project": op.project})

def add_chapter(op, writer, cfg):
    writer.create("rv/chapter", {"title": op.title, "status": op.status, "book": op.book, "project": op.project})

def add_note(op, writer, cfg):
    writer.create("rv/note", {"title": op.title, "chapter": op.chapter})

def add_memo(op, writer, cfg):
    writer.create("rv/memo", {"title": op.title, "project": op.project})

def rename(op, writer, cfg):
    found = writer.get("rv/chapter", op.id)
    writer.update("rv/chapter", op.id, {"title": op.title}, read_version=found.version)

def group_of(op, view, settings=None):
    SEEN["labels"].append(op.op)
    if op.op == "rv/add-note":
        return "Notes"
    if op.op in ("rv/add-chapter", "rv/add-book"):
        return "Structure"
    return None

def shaky(op, view):
    raise RuntimeError("broken on purpose")

def too_long(op, view):
    return "x" * 500

def not_a_label(op, view):
    return 3

def packet(target, view, settings, note):
    SEEN["packets"].append({"kind": view.target_kind, "part": view.part, "tag": view.tag, "request": view.request})
    body = target.data.get("title", "") if target is not None else ""
    return PacketParts(request=[Part("Material", body, trusted=True)])

def watch(op, view, origin):
    SEEN["origins"].append(origin)
    return []

def noticed(payload, context):
    context.queue_request("rv/sort", "Look again", tag={"chapter": "one", "round": 2, "urgent": True})

def tagged_bad(payload, context):
    context.queue_request("rv/sort", "Look again", tag={"nested": {"no": 1}})

def sees(payload, context):
    SEEN["events"].append((payload.get("part"), payload.get("tag")))

def make(target, context, choices):
    items = [
        Item("chapter", "Add a chapter", [{"op": "rv/add-chapter", "title": "Second", "book": "$new:0"}]),
        Item("note", "Add a note", [{"op": "rv/add-note", "title": "Aside", "chapter": "$new:1"}]),
    ]
    return Proposal("Make a book", ops=[{"op": "rv/add-book", "title": "Fresh"}], items=items)

def retitle(target, context, choices):
    items = [
        Item("edit", "Rename it", [{"op": "rv/rename", "id": target.id, "title": "Renamed"}]),
        Item("both", "Add and rename", [
            {"op": "rv/rename", "id": target.id, "title": "Twice"},
            {"op": "rv/add-chapter", "title": "Brand new"},
        ]),
    ]
    asks = [{"task": "rv/sort-one", "about": {"item": "edit"}}, {"task": "rv/sort-one", "about": {"item": "both"}}]
    return Proposal("Retitle", items=items, requests=asks)

def asks(target, context, choices):
    asks = [
        {"task": "rv/sort-one", "about": ("rv/chapter", target.id), "note": "first", "tag": {"n": 1}},
        {"task": "rv/sort-one", "about": ("rv/chapter", target.id), "note": "second", "tag": {"n": 2}},
        {"task": "rv/sort-one", "about": ("rv/chapter", target.id), "note": "third"},
    ]
    return Proposal("Ask three times", requests=asks)

def only_open(target, context, choices):
    return Proposal("Open")

def register(registrar):
    mode = registrar.config.mode
    registrar.record_type(Book)
    registrar.record_type(Chapter, placed_by="book")
    registrar.record_type(Note)
    registrar.record_type(Memo, placed_by=None)
    registrar.op(AddBook, "data", add_book)
    registrar.op(AddChapter, "data", add_chapter)
    registrar.op(AddNote, "data", add_note)
    registrar.op(AddMemo, "data", add_memo)
    registrar.op(Rename, "data", rename)
    registrar.op_validator("rv/add-note", watch)
    grouping = {"ok": group_of, "raise": shaky, "long": too_long, "number": not_a_label}[mode]
    registrar.task_kind(
        "rv/sort", label="Sort", ops=("rv/add-book", "rv/add-chapter", "rv/add-note", "note"), groups=grouping,
        packet=packet,
    )
    registrar.task_kind("rv/sort-one", label="Sort one", ops=("rv/rename", "note"), on="rv/chapter", packet=packet)
    registrar.task_kind(
        "rv/outline", label="Outline", ops=("note",), on=("rv/book", "rv/chapter"), packet=packet,
        where={"status": ("open", "draft", "closed", "final")},
    )
    registrar.task_kind(
        "rv/open-only", label="Open only", ops=("note",), on="rv/chapter", where={"book.status": "open"}, packet=packet
    )
    registrar.task_kind("rv/place", label="Place", ops=("note",), packet=packet)
    registrar.action("rv/make", label="Make a book", run=make)
    registrar.action("rv/retitle", label="Retitle", run=retitle, on="rv/chapter")
    registrar.action("rv/ask", label="Ask", run=asks, on="rv/chapter")
    registrar.action("rv/open", label="Open", run=only_open, on="rv/chapter", where={"book.status": "open"})
    registrar.subscribe("record.changed", noticed)
    registrar.subscribe("text.accepted", sees)
    registrar.subscribe("changeset.reviewed", sees)
"""

PROVIDES = {
    "record_types": ["rv/book", "rv/chapter", "rv/note", "rv/memo"],
    "ops": ["rv/add-book", "rv/add-chapter", "rv/add-note", "rv/add-memo", "rv/rename"],
    "op_validators": ["rv/add-note"],
    "ai_task_kinds": ["rv/sort", "rv/sort-one", "rv/outline", "rv/open-only", "rv/place"],
    "actions": ["rv/make", "rv/retitle", "rv/ask", "rv/open"],
}


def folder(
    tmp_path, code=PACK, provides=PROVIDES, subscribes=("record.changed", "text.accepted", "changeset.reviewed")
):
    path = tmp_path / "rv"
    path.mkdir(parents=True, exist_ok=True)
    (path / "fixture.py").write_text(code)
    manifest = {
        "name": "rv",
        "version": "0.1.0",
        "plugin_api": ">=0.3,<0.4",
        "description": "Reviewing and records fixture",
        "entry": "fixture:register",
        "config_schema": "fixture:Config",
        "provides": provides,
        "subscribes": list(subscribes),
    }
    (path / "plugin.yaml").write_text(yaml.safe_dump(manifest))
    return path


def seen(ws):
    import sys

    return [m for n, m in sys.modules.items() if n.endswith(".fixture") and hasattr(m, "SEEN")][-1].SEEN


def opened(tmp_path, mode="ok", code=PACK):
    return plugin_workspace(folder(tmp_path, code), root=tmp_path / "ws", settings={"rv": {"mode": mode}})


def a_project(ws):
    return next(p for p in ws.view().list("project") if p.data.get("name"))


def signals(ws):
    return [s.data["kind"] for s in ws.store.read().list("signal")]


# ---- 170: a task kind groups its answer; the person keeps or drops a whole group -----------------------------------

#: An answer with two notes, a book, a chapter only the person may set final (so it waits), and a plain note.
ANSWER = {
    "summary": "Sorted.",
    "ops": [
        {"op": "rv/add-note", "title": "First aside"},
        {"op": "rv/add-note", "title": "Second aside"},
        {"op": "rv/add-book", "title": "Shelf"},
        {"op": "rv/add-chapter", "title": "Closing", "status": "final"},
        {"op": "note", "text": "Looked at everything."},
    ],
}


def test_an_answer_is_shown_by_group_and_a_group_is_dropped_or_kept_as_a_whole(tmp_path):
    with opened(tmp_path) as ws:
        asked = ws.ask("rv/sort", answer=ANSWER)
        outcome = asked.outcome
        assert outcome is not None and asked.state == "review"
        groups = {g["label"]: g for g in outcome.groups}
        assert set(groups) == {"Notes", "Structure"}  # the plain note has no group
        assert groups["Notes"]["ops"] == [0, 1] and groups["Notes"]["applied"] == 2
        assert groups["Structure"]["ops"] == [2, 3] and (
            groups["Structure"]["applied"],
            groups["Structure"]["held"],
        ) == (1, 1)
        assert outcome.ops[4]["answer_group"] is None
        # Dropping a group undoes what it applied; the correction is a signal like any other rejection.
        dropped = ws.drop_group(outcome, "Notes")
        assert dropped.restored == [0, 1] and not dropped.skipped
        assert not ws.view().list("rv/note")
        assert "undone" in signals(ws)
        # Dropping the other group undoes its applied book and keeps its held chapter as it was (declined).
        before = len(signals(ws))
        kept_out = ws.drop_group(dropped.outcome, "Structure")
        assert kept_out.restored == [2] and kept_out.declined == [3]
        assert not ws.view().list("rv/book") and not ws.view().list("rv/chapter")
        assert "held_declined" in signals(ws)[before:]
        statuses = [o["status"] for o in kept_out.outcome.ops]
        assert statuses == ["undone", "undone", "undone", "undone", "applied"]


def test_keeping_a_group_releases_its_held_ops_and_release_all_is_one_undo(tmp_path):
    with opened(tmp_path) as ws:
        outcome = ws.ask("rv/sort", answer=ANSWER).outcome
        assert outcome is not None
        kept = ws.keep_group(outcome, "Structure")
        assert kept.released == [3] and not kept.skipped
        assert [c.data["title"] for c in ws.view().list("rv/chapter")] == ["Closing"]
        # A second held op, released together with everything else that waits.
        more = ws.ask(
            "rv/sort",
            answer={
                "summary": "More.",
                "ops": [
                    {"op": "rv/add-chapter", "title": "Epilogue", "status": "final"},
                    {"op": "rv/add-chapter", "title": "Appendix", "status": "final"},
                ],
            },
        ).outcome
        assert more is not None and len(more.held) == 2
        done = ws.release_all(more)
        assert done.released == [0, 1] and not done.skipped
        assert {c.data["title"] for c in ws.view().list("rv/chapter")} == {"Closing", "Epilogue", "Appendix"}
        undone = ws.undo(done.outcome)
        assert [o["status"] for o in undone.ops] == ["undone", "undone"]
        assert {c.data["title"] for c in ws.view().list("rv/chapter")} == {"Closing"}


def test_a_group_that_cannot_be_taken_back_without_overwriting_a_later_change_is_left_and_named(tmp_path):
    with opened(tmp_path) as ws:
        outcome = ws.ask("rv/sort", answer=ANSWER).outcome
        assert outcome is not None
        made = next(c for c in ws.view().list("rv/note") if c.data["title"] == "First aside")
        ws.apply([{"op": "rv/add-note", "title": "Refers", "chapter": None}])
        # A later person's edit of the note would be overwritten by taking the note back.
        ws.apply(
            [
                {
                    "op": "record.edit",
                    "record": {"kind": "rv/note", "id": made.id},
                    "fields": {"title": "Edited by the person"},
                    "read_version": made.version,
                }
            ]
        )
        dropped = ws.drop_group(outcome, "Notes")
        assert dropped.restored == [1] and [s["ops"] for s in dropped.skipped] == [[0]]
        assert "changed since" in dropped.skipped[0]["reason"]


def test_a_group_function_that_fails_leaves_the_answer_ungrouped_and_is_noted(tmp_path):
    for mode in ("raise", "long", "number"):
        with opened(tmp_path / mode, mode) as ws:
            outcome = ws.ask("rv/sort", answer=ANSWER).outcome
            assert outcome is not None and outcome.groups == []
            assert all(o["answer_group"] is None for o in outcome.ops)
            assert outcome.status in ("applied", "held")  # the ops still applied as usual
            assert any("groups" in note for note in ws.store.plugins.status["rv"].notes)


def test_a_task_kind_that_drafts_cannot_group_and_the_function_must_be_callable():
    registrar = Registrar("rv", Settings(), None)
    with pytest.raises(ValueError, match="groups"):
        registrar.task_kind("rv/a", label="A", ops=("note",), groups="not callable")
    with pytest.raises(ValueError, match="groups"):
        registrar.task_kind("rv/b", label="B", output="draft", field="body", on="rv/chapter", groups=lambda op, v: "x")


def test_the_review_screen_gets_the_groups_and_keeps_and_drops_them(tmp_path):
    from fastapi.testclient import TestClient

    from api.app import create_app

    with opened(tmp_path) as ws:
        asked = ws.ask("rv/sort", answer=ANSWER)
        cfg, root = ws.cfg, ws.ws
        ws.store.close()
        c = TestClient(create_app(root, cfg, "t", start_worker=False))
        c.headers["Authorization"] = "Bearer t"
        api = cfg.server.base_path.rstrip("/") + "/api"
        item = next(i for i in c.get(f"{api}/changes").json() if i["id"] == asked.request)
        shown = item["changeset"]["groups"]
        assert [(g["label"], g["ops"]) for g in shown] == [("Notes", [0, 1]), ("Structure", [2, 3])]
        assert shown[1]["held"] == 1 and item["changeset"]["ops"][0]["answer_group"] == "Notes"
        cs = item["changeset"]["id"]
        dropped = c.post(f"{api}/changesets/{cs}/groups/0/drop")
        assert dropped.status_code == 200 and dropped.json()["restored"] == [0, 1]
        kept = c.post(f"{api}/changesets/{cs}/groups/1/keep")
        assert kept.status_code == 200 and kept.json()["released"] == [3]
        assert c.post(f"{api}/changesets/{cs}/groups/9/keep").status_code == 409
        again = next(i for i in c.get(f"{api}/changes").json() if i["id"] == asked.request)
        assert [(g["label"], g["undone"], g["held"]) for g in again["changeset"]["groups"]] == [
            ("Notes", 2, 0),
            ("Structure", 0, 0),
        ]
        assert c.post(f"{api}/changesets/{cs}/release-all").json()["released"] == []


# ---- 194: `$new:<n>` names a record made earlier in the same answer or proposal ------------------------------------


def test_an_answer_refers_to_a_record_made_earlier_in_it_and_one_undo_takes_all_back(tmp_path):
    with opened(tmp_path) as ws:
        outcome = ws.ask(
            "rv/sort",
            answer={
                "summary": "Built.",
                "ops": [
                    {"op": "rv/add-book", "title": "Volume"},
                    {"op": "rv/add-chapter", "title": "One", "book": "$new:0"},
                    {"op": "rv/add-note", "title": "Aside", "chapter": "$new:1"},
                ],
            },
        ).outcome
        assert outcome is not None and outcome.status == "applied" and len(outcome.applied) == 3
        book = ws.view().find("rv/book", title="Volume")
        chapter = ws.view().find("rv/chapter", title="One")
        note = ws.view().find("rv/note", title="Aside")
        assert chapter.data["book"] == book.id and note.data["chapter"] == chapter.id
        # What is kept in the answer is the real id, so it reads the same later.
        assert outcome.ops[1]["op"]["book"] == book.id
        # A validator sees the id, never the placeholder.
        assert seen(ws)["origins"][-1]["task"] == "rv/sort"
        undone = ws.undo(outcome)
        assert [o["status"] for o in undone.ops] == ["undone"] * 3
        assert not ws.view().list("rv/book") and not ws.view().list("rv/chapter") and not ws.view().list("rv/note")


def test_an_op_naming_one_that_was_refused_waits_or_does_not_come_before_is_refused_saying_which(tmp_path):
    with opened(tmp_path) as ws:
        held = ws.ask(
            "rv/sort",
            answer={
                "summary": "Waits.",
                "ops": [
                    {"op": "rv/add-chapter", "title": "Final one", "status": "final"},
                    {"op": "rv/add-note", "title": "Depends", "chapter": "$new:0"},
                ],
            },
        ).outcome
        assert held is not None
        assert held.ops[0]["status"] == "held" and held.ops[1]["status"] == "refused"
        assert "change 0" in held.ops[1]["reason"] and "waiting for you" in held.ops[1]["reason"]
        refused = ws.ask(
            "rv/sort",
            answer={
                "summary": "Refused.",
                "ops": [
                    {"op": "rv/add-chapter", "title": "Pointing", "book": "BKK-999"},
                    {"op": "rv/add-note", "title": "Depends", "chapter": "$new:0"},
                ],
            },
        ).outcome
        assert refused is not None and [o["status"] for o in refused.ops] == ["refused", "refused"]
        assert "change 0 (rv/add-chapter)" in refused.ops[1]["reason"] and "was refused" in refused.ops[1]["reason"]
        forward = ws.ask(
            "rv/sort",
            answer={
                "summary": "Early.",
                "ops": [
                    {"op": "rv/add-note", "title": "Too early", "chapter": "$new:1"},
                    {"op": "rv/add-chapter", "title": "Later"},
                ],
            },
        ).outcome
        assert forward is not None and forward.ops[0]["status"] == "refused"
        assert "doesn't come before" in forward.ops[0]["reason"] and forward.ops[1]["status"] == "applied"
        no_record = ws.ask(
            "rv/sort",
            answer={
                "summary": "Nothing made.",
                "ops": [
                    {"op": "note", "text": "Only words."},
                    {"op": "rv/add-note", "title": "Depends", "chapter": "$new:0"},
                ],
            },
        ).outcome
        assert no_record is not None and no_record.ops[1]["status"] == "refused"


def test_core_ops_may_name_a_record_made_earlier_and_the_checks_find_it(tmp_path):
    with opened(tmp_path) as ws:
        done = ws.apply(
            [
                {"op": "project.add", "name": "Fresh start"},
                {"op": "note", "text": "First thought", "project": "$new:0"},
            ]
        )
        assert done.status == "applied" and [o["status"] for o in done.ops] == ["applied", "applied"]
        project = ws.view().find("project", name="Fresh start")
        note = next(n for n in ws.view().list("note") if n.data["text"] == "First thought")
        assert note.data["project"] == project.id and done.ops[1]["op"]["project"] == project.id
        # Only what a placeholder named is found by the checks: an id guessed for a record that doesn't exist yet is
        # still refused, however the dry run numbered it.
        guessed = ws.apply(
            [{"op": "project.add", "name": "Other start"}, {"op": "note", "text": "Guess", "project": "PRJ-99"}]
        )
        assert [o["status"] for o in guessed.ops] == ["applied", "refused"]
        assert [o["status"] for o in ws.undo(done).ops] == ["undone", "undone"]


def test_only_a_whole_value_is_replaced_never_words_that_contain_it(tmp_path):
    with opened(tmp_path) as ws:
        outcome = ws.ask(
            "rv/sort",
            answer={
                "summary": "Words.",
                "ops": [
                    {"op": "rv/add-chapter", "title": "One"},
                    {"op": "rv/add-note", "title": "About $new:0 in words"},
                ],
            },
        ).outcome
        assert outcome is not None and outcome.status == "applied"
        assert ws.view().find("rv/note", title="About $new:0 in words") is not None


def test_a_proposal_names_a_record_a_main_op_or_another_item_makes_and_a_dropped_one_refuses_its_dependants(tmp_path):
    with opened(tmp_path) as ws:
        review = ws.action("rv/make")
        assert review.problems == [] and all(not item.get("refused") for item in review.items)
        done = review.apply()
        assert done.status == "applied" and len(done.applied) == 3
        book = ws.view().find("rv/book", title="Fresh")
        chapter = ws.view().find("rv/chapter", title="Second")
        assert chapter.data["book"] == book.id
        assert ws.view().find("rv/note", title="Aside").data["chapter"] == chapter.id
        assert [o["status"] for o in ws.undo(done).ops] == ["undone"] * 3
        # The person drops the chapter: its note names it, so the note is refused, saying that change was left out.
        again = ws.action("rv/make").apply(kept={"chapter": False})
        statuses = {o["op"]["op"]: (o["status"], o.get("reason")) for o in again.ops}
        assert statuses["rv/add-book"][0] == "applied" and statuses["rv/add-note"][0] == "refused"
        assert "left out" in statuses["rv/add-note"][1]
        assert not ws.view().list("rv/chapter")


def test_a_proposal_may_not_name_an_op_that_does_not_come_before_it(tmp_path):
    early = PACK.replace('"book": "$new:0"}]),', '"book": "$new:2"}]),')
    with opened(tmp_path, code=early) as ws, pytest.raises(StoreError, match=r"\$new:2"):
        ws.action("rv/make")


# ---- 201: the kit applies a proposal with some of its requests kept ------------------------------------------------


def test_the_kit_applies_a_proposal_with_the_requests_it_names(tmp_path):
    with opened(tmp_path) as ws:
        ws.apply([{"op": "rv/add-chapter", "title": "Target"}])
        chapter = ws.view().find("rv/chapter", title="Target")
        review = ws.action("rv/ask", chapter)
        assert [r["id"] for r in review.requests] == ["r1", "r2", "r3"] and all(r["kept"] for r in review.requests)
        review.apply(requests=[1, "r3"])
        made = [r.data for r in ws.store.read().list("request") if r.data["task"] == "rv/sort-one"]
        assert sorted(r["note"] for r in made) == ["second", "third"]
        assert [r["tag"] for r in made if r["note"] == "second"] == [{"n": 2}]
        # Naming none drops them all; naming one that isn't there is refused, as on screen.
        ws.action("rv/ask", chapter).apply(requests=[])
        assert len([r for r in ws.store.read().list("request") if r.data["task"] == "rv/sort-one"]) == 2
        with pytest.raises(StoreError, match="no request"):
            ws.action("rv/ask", chapter).apply(requests=[7])
        with pytest.raises(StoreError, match="no request"):
            ws.action("rv/ask", chapter).apply(requests=["r9"])
        with pytest.raises(StoreError, match="position or its id"):
            ws.action("rv/ask", chapter).apply(requests=[True])
        # Items and requests together: the ticks and the request names both apply.
        ws.action("rv/retitle", chapter).apply(kept={"edit": False}, requests=["r1"])


# ---- 205: a request about an item is about the record the item creates or changes ----------------------------------


def test_a_request_about_an_item_is_about_the_record_it_changes_or_the_one_it_creates(tmp_path):
    with opened(tmp_path) as ws:
        ws.apply([{"op": "rv/add-chapter", "title": "Target"}])
        chapter = ws.view().find("rv/chapter", title="Target")
        ws.action("rv/retitle", chapter).apply()
        queued = {
            r.data["about"]["id"]
            for r in ws.store.read().list("request")
            if r.data["task"] == "rv/sort-one" and r.data.get("about")
        }
        # Both items change the chapter that exists; the second also creates another chapter, which the request about
        # that item prefers because the item made it.
        brand_new = ws.view().find("rv/chapter", title="Brand new")
        assert queued == {chapter.id, brand_new.id}
        about = {r.data["about"]["id"]: r.data["note"] for r in ws.store.read().list("request") if r.data.get("about")}
        assert set(about) == {chapter.id, brand_new.id}
        # An edit alone is about the record it changed, and a dropped item queues nothing.
        ws.action("rv/retitle", ws.view().get("rv/chapter", chapter.id)).apply(kept={"both": False})
        later = [r for r in ws.store.read().list("request") if r.data["task"] == "rv/sort-one"]
        assert len(later) == 3 and later[-1].data["about"]["id"] == chapter.id


# ---- 197: a reference that doesn't block deleting its target -------------------------------------------------------


def test_a_reference_that_doesnt_block_deletion_leaves_the_id_and_reads_as_a_missing_record(tmp_path):
    with opened(tmp_path) as ws:
        ws.apply([{"op": "rv/add-book", "title": "Volume"}])
        book = ws.view().find("rv/book", title="Volume")
        ws.apply([{"op": "rv/add-chapter", "title": "One", "book": book.id}])
        chapter = ws.view().find("rv/chapter", title="One")
        gone = ws.apply(
            [{"op": "record.delete", "record": {"kind": "rv/book", "id": book.id}, "read_version": book.version}]
        )
        assert gone.status == "applied"
        # The id stays on the chapter; reading the book finds nothing and raises nothing.
        again = ws.view().get("rv/chapter", chapter.id)
        assert again.data["book"] == book.id and ws.view().get("rv/book", book.id) is None
        # A reference that blocks still does: the chapter can't go while a note names it.
        ws.apply([{"op": "rv/add-note", "title": "Aside", "chapter": chapter.id}])
        refused = ws.apply(
            [{"op": "record.delete", "record": {"kind": "rv/chapter", "id": chapter.id}, "read_version": again.version}]
        )
        assert refused.refused and "still referred to" in refused.refused[0]
        # Writing a reference still needs its target to exist, and Undo of the delete brings the book back.
        missing = ws.apply([{"op": "rv/add-chapter", "title": "Two", "book": book.id}])
        assert missing.refused
        assert ws.undo(gone).ops[0]["status"] == "undone" and ws.view().get("rv/book", book.id) is not None


def test_the_record_page_says_a_referred_record_was_removed(tmp_path):
    from engine import record_page

    with opened(tmp_path) as ws:
        ws.apply([{"op": "rv/add-book", "title": "Volume"}])
        book = ws.view().find("rv/book", title="Volume")
        ws.apply([{"op": "rv/add-chapter", "title": "One", "book": book.id}])
        chapter = ws.view().find("rv/chapter", title="One")
        refs = lambda: next(  # noqa: E731
            d["refs"]
            for d in record_page.page(ws.store, "rv/chapter", chapter.id, pm=None)["details"]
            if d["field"] == "book"
        )
        assert refs() == [{"kind": "rv/book", "id": book.id, "name": "Volume", "removed": False}]
        ws.apply([{"op": "record.delete", "record": {"kind": "rv/book", "id": book.id}, "read_version": book.version}])
        assert refs() == [{"kind": "rv/book", "id": book.id, "name": "", "removed": True}]


def test_ref_marks_say_which_references_block():
    from typing import Annotated

    from engine.records import Record, RefTo, ref_fields, soft_ref_paths

    class Link(Record):
        record_kind = "x/link"
        prefix = "LNK"
        keeps: Annotated[str | None, RefTo("project")] = None
        lets_go: Annotated[str | None, RefTo("person", blocks_delete=False)] = None
        many: list[Annotated[str, RefTo("action", blocks_delete=False)]] = []

    assert dict(ref_fields(Link)) == {"keeps": "project", "lets_go": "person", "many[]": "action"}
    assert soft_ref_paths(Link) == {"lets_go", "many[]"}


# ---- 200: where a record is written --------------------------------------------------------------------------------


def test_placed_by_names_the_reference_that_places_a_record_and_none_means_the_workspace(tmp_path):
    from engine.sync import WORKSPACE, project_folders

    with opened(tmp_path) as ws:
        project = a_project(ws)
        other = next(p for p in ws.view().list("project") if p.id != project.id and p.data.get("name"))
        ws.apply([{"op": "rv/add-book", "title": "Volume", "project": project.id}])
        book = ws.view().find("rv/book", title="Volume")
        # The chapter's own `project` names another project, but `placed_by="book"` places it with its book.
        ws.apply([{"op": "rv/add-chapter", "title": "One", "book": book.id, "project": other.id}])
        ws.apply([{"op": "rv/add-chapter", "title": "Loose"}])
        ws.apply([{"op": "rv/add-memo", "title": "Memo", "project": project.id}])
        folders = project_folders(ws.view())
        files = ws.folder()
        paths = {p for p in files}
        assert f"{folders[project.id]}/books/Volume.yaml" in paths  # the default: the project field
        assert any(p == f"{folders[project.id]}/chapters/One.yaml" for p in paths)  # placed by the book's project
        assert not any(p.startswith(f"{folders[other.id]}/chapters/") for p in paths)
        assert f"{WORKSPACE}/chapters/Loose.yaml" in paths  # an empty placing reference: the workspace
        assert f"{WORKSPACE}/memos/Memo.yaml" in paths  # placed_by=None: always the workspace, project or not
        assert ws.store.plugins.placement("rv/chapter") == ("field", "book")
        assert ws.store.plugins.placement("rv/memo") == ("workspace", None)
        assert ws.store.plugins.placement("rv/book") == ("default", None)


def test_placed_by_must_name_a_field_holding_one_reference():
    registrar = Registrar("rv", Settings(), None)
    from typing import Annotated, ClassVar

    from engine.plugin_api import Record, RefTo

    class Plain(Record):
        record_kind: ClassVar[str] = "rv/plain"
        prefix: ClassVar[str] = "PLN"
        title: str
        many: list[Annotated[str, RefTo("project")]] = []
        one: Annotated[str | None, RefTo("project")] = None

    with pytest.raises(ValueError, match="isn't a field"):
        registrar.record_type(Plain, placed_by="title")
    with pytest.raises(ValueError, match="isn't a field"):
        registrar.record_type(Plain, placed_by="many")
    with pytest.raises(ValueError, match="isn't a field"):
        registrar.record_type(Plain, placed_by="nothing")
    registrar.record_type(Plain, placed_by="one")
    assert registrar.placements == {"rv/plain": "one"}


# ---- 204: where through one reference ------------------------------------------------------------------------------


def test_where_reads_a_field_through_one_reference_on_actions_and_on_runs(tmp_path):
    from engine import actions
    from engine.plugin_host import check_about

    with opened(tmp_path) as ws:
        ws.apply(
            [{"op": "rv/add-book", "title": "Open book"}, {"op": "rv/add-book", "title": "Shut", "status": "closed"}]
        )
        open_book = ws.view().find("rv/book", title="Open book")
        shut = ws.view().find("rv/book", title="Shut")
        ws.apply(
            [
                {"op": "rv/add-chapter", "title": "In open", "book": open_book.id},
                {"op": "rv/add-chapter", "title": "In shut", "book": shut.id},
                {"op": "rv/add-chapter", "title": "Alone"},
            ]
        )
        inside, outside, alone = (ws.view().find("rv/chapter", title=t) for t in ("In open", "In shut", "Alone"))
        offered = lambda record: [a.name for a in actions.available(ws.store, "rv/chapter", record.id)]  # noqa: E731
        assert "rv/open" in offered(inside) and "rv/open" not in offered(outside) and "rv/open" not in offered(alone)
        # Running it is refused where it isn't offered, with the action's own words.
        with pytest.raises(StoreError, match="isn't for this"):
            ws.action("rv/open", outside)
        assert ws.action("rv/open", inside).summary == "Open"
        # The same on a run: a request for a record the filter doesn't hold is refused.
        kind = ws.store.plugins.task_kind("rv/open-only")
        check_about(ws.store.read(), kind, {"kind": "rv/chapter", "id": inside.id}, ws.store)
        with pytest.raises(StoreError, match="isn't for this"):
            check_about(ws.store.read(), kind, {"kind": "rv/chapter", "id": outside.id}, ws.store)
        with pytest.raises(StoreError, match="isn't for this"):
            check_about(ws.store.read(), kind, {"kind": "rv/chapter", "id": alone.id}, ws.store)
        # Once the book is gone the chapter has no book to read: it no longer matches.
        ws.apply(
            [
                {
                    "op": "record.delete",
                    "record": {"kind": "rv/book", "id": open_book.id},
                    "read_version": open_book.version,
                }
            ]
        )
        with pytest.raises(StoreError, match="isn't for this"):
            check_about(ws.store.read(), kind, {"kind": "rv/chapter", "id": inside.id}, ws.store)


def test_a_path_may_go_one_step_and_only_through_a_reference_that_exists(tmp_path):
    registrar = Registrar("rv", Settings(), None)
    with pytest.raises(ValueError, match="one step"):
        registrar.task_kind("rv/a", label="A", ops=("note",), on="rv/chapter", where={"book.project.name": "x"})
    with pytest.raises(ValueError, match="one step"):
        registrar.action("rv/b", label="B", run=lambda t, c, ch: None, on="rv/chapter", where={".status": "x"})
    for where, why in (
        ({"title.x": "a"}, "isn't a field that refers to one record"),
        ({"book.nothing": "a"}, "has no field nothing"),
        ({"nothing.status": "a"}, "which it doesn't have"),
    ):
        broken = PACK.replace('where={"book.status": "open"}, packet=packet', f"where={where!r}, packet=packet")
        with pytest.raises(PluginDidNotStart) as raised, opened(tmp_path / why[:6], code=broken):
            pass
        assert why in raised.value.reason


# ---- 193: a task kind about either of two record kinds -------------------------------------------------------------


def test_a_task_kind_about_either_of_two_kinds_says_which_one_in_its_packet(tmp_path):
    with opened(tmp_path) as ws:
        ws.apply([{"op": "rv/add-book", "title": "Volume"}])
        book = ws.view().find("rv/book", title="Volume")
        ws.apply([{"op": "rv/add-chapter", "title": "One"}])
        chapter = ws.view().find("rv/chapter", title="One")
        note_answer = {"summary": "Outlined.", "ops": [{"op": "note", "text": "Seen."}]}
        assert ws.ask("rv/outline", answer=note_answer, about=("rv/book", book.id)).state in ("review", "done")
        assert ws.ask("rv/outline", answer=note_answer, about=("rv/chapter", chapter.id)).state in ("review", "done")
        assert [p["kind"] for p in seen(ws)["packets"][-2:]] == ["rv/book", "rv/chapter"]
        # A record of another kind, or none, is refused; the kind the task is about both ways is one set of prompts.
        memo = ws.apply([{"op": "rv/add-memo", "title": "Memo"}])
        note = ws.view().find("rv/memo", title="Memo")
        assert memo.status == "applied"
        from engine.plugin_host import check_about

        kind = ws.store.plugins.task_kind("rv/outline")
        assert kind.on_kinds == ("rv/book", "rv/chapter")
        with pytest.raises(StoreError, match="works on a .* or "):
            check_about(ws.store.read(), kind, {"kind": "rv/memo", "id": note.id}, ws.store)
        with pytest.raises(StoreError, match="works on a"):
            check_about(ws.store.read(), kind, None, ws.store)
        # The person can start it from a record of either kind (the list of work offered on a record).
        offered = [k.name for k in ws.store.plugins.tasks.values() if book.kind in k.on_kinds]
        assert "rv/outline" in offered and "rv/sort-one" not in offered


def test_a_pair_of_kinds_is_two_different_kinds_with_fields_both_have(tmp_path):
    registrar = Registrar("rv", Settings(), None)
    with pytest.raises(ValueError, match="pair of two different"):
        registrar.task_kind("rv/a", label="A", ops=("note",), on=("rv/book", "rv/book"))
    with pytest.raises(ValueError, match="pair of two different"):
        registrar.task_kind("rv/b", label="B", ops=("note",), on=("rv/book", "rv/chapter", "rv/note"))
    # `project` is a field of both kinds; a field only one has is a load error.
    ok = PACK.replace('where={"status": ("open", "draft", "closed", "final")}', 'where={"project": None}')
    with opened(tmp_path / "ok", code=ok):
        pass
    only_one = PACK.replace('where={"status": ("open", "draft", "closed", "final")}', 'where={"book": None}')
    with pytest.raises(PluginDidNotStart) as raised, opened(tmp_path / "bad", code=only_one):
        pass
    assert "narrows rv/book by book" in raised.value.reason


# ---- 199 and 188: a part's address and a request's tag -------------------------------------------------------------


def test_a_part_may_name_work_by_an_address_alone_and_the_packet_reads_it(tmp_path):
    from engine.tasks import TaskKind
    from engine.texts import check_part

    ops_work = TaskKind("p/x", ("note",), "notes", "notes")
    draft = TaskKind("p/y", (), "notes", "notes", output="draft", field="body")
    address = {"sheet": "S-9", "row": 4, "total": True, "unit": "usd"}
    assert check_part(ops_work, {"address": address, "label": "Row four"}) == {
        "address": address,
        "label": "Row four",
    }
    # With a span it rides along; a draft needs its span or place, and the address never replaces it.
    assert check_part(ops_work, {"first": 1, "last": 2, "address": {"k": "v"}})["address"] == {"k": "v"}
    assert check_part(draft, {"after": "end", "address": {"k": "v"}})["address"] == {"k": "v"}
    with pytest.raises(ValueError, match="after"):
        check_part(draft, {"address": {"k": "v"}})
    for bad, why in (
        ({"nested": {"a": 1}}, "a value in a part's address"),
        ({"empty": ""}, "a value in a part's address"),
        ({"none": None}, "a value in a part's address"),
        ({"k" * 50: 1}, "a name in a part's address"),
        ({"big": "x" * 201}, "a value in a part's address"),
        ({f"k{i}": 1 for i in range(21)}, "at most 20 entries"),
        ({f"k{i}": "x" * 100 for i in range(15)}, "larger than 1024 bytes"),
        ([], "small mapping"),
    ):
        with pytest.raises(ValueError, match=why):
            check_part(ops_work, {"address": bad})
    sent: list[str] = []

    def answer(task):
        sent.append(task.instructions + task.stable + task.request)
        return {"summary": "Looked.", "ops": [{"op": "note", "text": "Looked."}]}

    with opened(tmp_path) as ws:
        asked = ws.ask("rv/sort", answer=answer, part={"address": address, "label": "Row four"})
        assert seen(ws)["packets"][-1]["part"] == {"address": address, "label": "Row four"}
        request = ws.store.read().get("request", asked.request)
        assert request.data["part"]["address"] == address
        # The address is stored with the part and compares for equality; it is never in what a model reads.
        assert sent and "S-9" not in sent[0] and "usd" not in sent[0]


def test_a_request_keeps_the_tag_its_plugin_gave_it_and_returns_it_everywhere_it_may(tmp_path):
    with opened(tmp_path) as ws:
        ws.apply([{"op": "rv/add-chapter", "title": "One"}])
        chapter = ws.view().find("rv/chapter", title="One")
        queued = ws.emit("record.changed", {"kind": "rv/chapter", "id": chapter.id})
        assert [q["task"] for q in queued] == ["rv/sort"]
        request = next(r for r in ws.store.read().list("request") if r.data["task"] == "rv/sort")
        assert request.data["tag"] == {"chapter": "one", "round": 2, "urgent": True}
        # The kit runs a request with a tag: the packet and the validators get it back.
        sent: list[str] = []

        def answer(task):
            sent.append(task.instructions + task.stable + task.request)
            return {"summary": "Noted.", "ops": [{"op": "rv/add-note", "title": "Tagged"}]}

        asked = ws.ask("rv/sort", answer=answer, tag={"chapter": "one", "round": 2})
        assert sent and "round" not in sent[0] and "urgent" not in sent[0]  # a tag is never sent to a model
        assert seen(ws)["packets"][-1]["tag"] == {"chapter": "one", "round": 2}
        assert seen(ws)["origins"][-1]["tag"] == {"chapter": "one", "round": 2}
        # What the person reads of the request never carries it.
        assert "round" not in str(asked.outcome.ops) and "one" not in (asked.waiting or "")
        # Accepting the answer raises changeset.reviewed with the tag.
        from engine.dispatcher import looks_good

        looks_good(ws.store, asked.outcome.changeset)
        assert seen(ws)["events"][-1] == (None, {"chapter": "one", "round": 2})
        # No tag, no key: other requests say None.
        ws.ask("rv/sort", answer={"summary": "Plain.", "ops": [{"op": "note", "text": "x"}]})
        assert seen(ws)["packets"][-1]["tag"] is None


def test_a_tag_that_isnt_a_small_flat_mapping_skips_the_request_and_is_noted(tmp_path):
    noticing = 'context.queue_request("rv/sort", "Look again", tag={"chapter": "one", "round": 2, "urgent": True})'
    assert noticing in PACK
    bad = PACK.replace(noticing, 'context.queue_request("rv/sort", "Look again", tag={"nested": {"no": 1}})')
    with opened(tmp_path, code=bad) as ws:
        ws.apply([{"op": "rv/add-chapter", "title": "One"}])
        chapter = ws.view().find("rv/chapter", title="One")
        assert ws.emit("record.changed", {"kind": "rv/chapter", "id": chapter.id}) == []
        assert any("was skipped" in note and "tag" in note for note in ws.store.plugins.status["rv"].notes)
    with opened(tmp_path / "again") as ws, pytest.raises(StoreError, match="tag"):
        ws.ask("rv/sort", answer={"summary": "x", "ops": []}, tag={"deep": [1]})


def test_the_guide_says_what_the_answers_promised_it_would():
    from pathlib import Path

    guide = (Path(__file__).parents[1] / "docs" / "plugin-guide.md").read_text()
    assert "`groups(op, view) -> str | None` labels each op of an answer" in guide  # 170
    assert '`"$new:<n>"`, the whole value' in guide  # 194
    assert "requests: Sequence[int | str] | None = None) -> Outcome" in guide  # 201
    assert "`blocks_delete=False`" in guide  # 197
    assert '`placed_by="<field>"` names the reference field that places it' in guide  # 200
    assert '`"<reference field>.<field>"`' in guide  # 204
    assert '`on=("<kind a>", "<kind b>")` is work about either of two kinds' in guide  # 193
    assert 'A part may also carry `"address"`' in guide  # 199
    assert "`tag` is a small flat mapping" in guide  # 188

# ruff: noqa: F811
"""The person's own word on which files are one document (design 6.2): "Same document as", "Not the same document", the
question "Which copy is the current one?" asked once, and Undo for each. A choice is a change to the `watch.versions`
settings, so it needs no new field on any record. Names are fictional."""

from datetime import timedelta

import pytest

from engine import version_choices
from engine.config import load_config
from engine.storage import StoreError
from engine.watch import VERSION_RULE, refresh
from tests.test_versions import folder, requests, save  # noqa: F401
from tests.test_watch import NOW


def saved_of(store, title):
    """The saved copy (a `source` record) of a watched file, by its title."""
    return next(s for s in store.read().list("source") if s.data["title"] == title)


def digest(store, key):
    """The hash of a watched file's text, which is what a choice names it by."""
    return next(s.data["content_hash"] for s in store.read().list("snapshot") if s.data["key"] == key)


def read(root, ws, cfg, store, hours):
    return refresh(ws, store, cfg, "s", NOW + timedelta(hours=hours))


def current(ws):
    return load_config(ws.config_dir, env={})


def signals(store, kind):
    return [s for s in store.read().list("signal") if s.data["kind"] == kind]


def start(folder, *names):
    """A first read of a folder, then a read that finds `names` as new files, so each has a saved copy to act on."""
    root, ws, cfg, store = folder
    save(root, "First.md", "x", 1)
    refresh(ws, store, cfg, "s", NOW)
    for age, name in enumerate(names, 2):
        save(root, name, f"{name} one", age)
    refresh(ws, store, cfg, "s", NOW + timedelta(minutes=30))
    return root, ws, cfg, store


# ---- same document as -------------------------------------------------------------------------------------------


def test_files_with_unrelated_names_linked_by_hand_are_one_document(folder):
    root, ws, cfg, store = start(folder, "Budget plan.md", "Cost sheet v2.md")
    # without the link the two are separate documents: an edit to the plan is read
    save(root, "Budget plan.md", "plan edited", 10)
    got = read(root, ws, cfg, store, 1)
    assert not store.read().get("request", got.changed[0]).data.get("auto_closed")
    made = version_choices.link(ws, current(ws), store, saved_of(store, "Budget plan.md").id, "Cost sheet v2.md")
    assert [c["key"] for c in made.changes] == [version_choices.SAME]
    assert made.signal and signals(store, "edited")
    # now the plan is an older version of the cost sheet, and its next edit closes itself
    cfg = current(ws)
    save(root, "Budget plan.md", "plan edited again", 11)
    got = read(root, ws, cfg, store, 2)
    closed = store.read().get("request", got.changed[0]).data["auto_closed"]
    assert closed == {"rule": VERSION_RULE, "reason": "an older version; the current one is Cost sheet v2.md"}
    # a later version of either name follows the link
    save(root, "Cost sheet v3.md", "new", 12)
    got = read(root, ws, cfg, store, 3)
    assert not store.read().get("request", got.new[0]).data.get("auto_closed")
    save(root, "Cost sheet v2.md", "old, edited", 13)
    got = read(root, ws, cfg, store, 4)
    assert store.read().get("request", got.changed[0]).data["auto_closed"]["rule"] == VERSION_RULE


def test_linking_is_refused_for_a_file_that_is_not_in_the_folder(folder):
    root, ws, cfg, store = start(folder, "Budget plan.md")
    with pytest.raises(StoreError):
        version_choices.link(ws, current(ws), store, saved_of(store, "Budget plan.md").id, "Missing.md")


def test_undo_puts_the_old_settings_back(folder):
    root, ws, cfg, store = start(folder, "Budget plan.md", "Cost sheet v2.md")
    made = version_choices.link(ws, current(ws), store, saved_of(store, "Budget plan.md").id, "Cost sheet v2.md")
    assert current(ws).watch.versions.same_document
    version_choices.undo(ws, current(ws), store, made.changes)
    assert current(ws).watch.versions.same_document == []
    assert [c.data["key"] for c in store.read().list("setting_change")][-1] == version_choices.SAME


def test_undo_refuses_any_other_setting(folder):
    _, ws, _, store = start(folder)
    with pytest.raises(StoreError):
        version_choices.undo(ws, current(ws), store, [{"key": "ui.theme", "before": "x"}])


def test_the_offer_lists_the_files_of_the_same_top_folder(folder):
    root, ws, cfg, store = start(folder, "North/Plan.md", "North/Plan v2.md", "North/Costs.md", "South/Costs.md")
    found = version_choices.offer(store.read(), current(ws), saved_of(store, "Plan.md").id)
    assert found.file.key == "North/Plan.md"
    assert [c.key for c in found.others] == ["North/Costs.md", "North/Plan v2.md"]
    assert found.can_split and found.family == ["North/Plan v2.md"]
    alone = version_choices.offer(store.read(), current(ws), saved_of(store, "Costs.md").id)
    assert alone.can_split is False or alone.family == []


# ---- not the same document --------------------------------------------------------------------------------------


def test_a_file_the_name_rule_joined_wrongly_is_split_and_stays_split(folder):
    root, ws, cfg, store = start(folder, "Agenda 2030-03-01.md", "Agenda 2030-03-08.md")
    save(root, "Agenda 2030-03-01.md", "edited", 10)
    got = read(root, ws, cfg, store, 1)
    old = store.read().get("request", got.changed[0])
    assert old.data["auto_closed"]["rule"] == VERSION_RULE
    made = version_choices.split(ws, current(ws), store, saved_of(store, "Agenda 2030-03-01.md").id, closed=old.id)
    assert made.signal and signals(store, "pulled_back") and not signals(store, "edited")
    version_choices.reopen(store, old.id, store.read().get("request", old.id).version)
    assert store.read().get("request", old.id).data["state"] == "queued"
    assert store.read().get("request", old.id).data["auto_closed"] is None
    cfg = current(ws)
    assert cfg.watch.versions.not_same == {"s": [digest(store, "Agenda 2030-03-01.md")]}
    # the next edit of either file is read: they are two documents now, and a new date joins neither
    save(root, "Agenda 2030-03-01.md", "edited again", 11)
    save(root, "Agenda 2030-03-08.md", "edited too", 12)
    got = read(root, ws, cfg, store, 2)
    assert len(got.changed) == 2
    assert not any(store.read().get("request", r).data.get("auto_closed") for r in got.changed)


def test_a_split_leaves_a_group_the_person_made_and_undo_brings_everything_back(folder):
    root, ws, cfg, store = start(folder, "Budget plan.md", "Cost sheet v2.md")
    version_choices.link(ws, current(ws), store, saved_of(store, "Budget plan.md").id, "Cost sheet v2.md")
    made = version_choices.split(ws, current(ws), store, saved_of(store, "Budget plan.md").id)
    versions = current(ws).watch.versions
    assert versions.same_document == [] and versions.not_same == {"s": [digest(store, "Budget plan.md")]}
    assert signals(store, "edited")
    version_choices.undo(ws, current(ws), store, made.changes)
    versions = current(ws).watch.versions
    assert [(x.source, x.files) for x in versions.same_document] == [
        ("s", sorted([digest(store, "Budget plan.md"), digest(store, "Cost sheet v2.md")]))
    ]
    assert versions.not_same == {}


# ---- which copy is current ---------------------------------------------------------------------------------------


def questions(store):
    return [q for q in store.read().list("question") if (q.data.get("resolves") or {}).get("kind") == "version"]


def test_copies_that_cannot_be_told_apart_raise_one_question_and_nothing_closes(folder):
    root, ws, cfg, store = start(folder, "Plan.md", "Plan DRAFT.md")
    save(root, "Plan.md", "edited", 10)
    got = read(root, ws, cfg, store, 1)
    assert not store.read().get("request", got.changed[0]).data.get("auto_closed")
    (asked,) = questions(store)
    assert asked.data["to"] == cfg.workspace.user.person and asked.data["kind"] == "decision"
    assert asked.data["title"] == "Which copy of Plan is the current one?"
    assert asked.data["resolves"]["files"] == ["Plan DRAFT.md", "Plan.md"]
    save(root, "Plan DRAFT.md", "edited", 11)
    got = read(root, ws, cfg, store, 2)
    assert not store.read().get("request", got.changed[0]).data.get("auto_closed")
    assert len(questions(store)) == 1  # asked once


def test_the_answer_names_the_current_copy_and_the_other_closes_itself(folder):
    root, ws, cfg, store = start(folder, "Plan.md", "Plan DRAFT.md")
    save(root, "Plan.md", "edited", 10)
    read(root, ws, cfg, store, 1)
    (asked,) = questions(store)
    with pytest.raises(StoreError):
        version_choices.keep_answer(ws, current(ws), store, asked.id, "Other.md")
    version_choices.keep_answer(ws, current(ws), store, asked.id, "Plan.md")
    done = store.read().get("question", asked.id).data
    assert done["status"] == "answered" and done["answer"] == "Plan.md"
    cfg = current(ws)
    assert cfg.watch.versions.current == {"s": [digest(store, "Plan.md")]}
    save(root, "Plan DRAFT.md", "edited later", 12)
    got = read(root, ws, cfg, store, 2)
    closed = store.read().get("request", got.changed[0]).data["auto_closed"]
    assert closed["reason"] == "an older version; the current one is Plan.md"
    assert len(questions(store)) == 1


def test_a_question_set_aside_leaves_the_modified_time_to_decide(folder):
    root, ws, cfg, store = start(folder, "Plan.md", "Plan DRAFT.md")
    save(root, "Plan.md", "edited", 10)
    read(root, ws, cfg, store, 1)
    (asked,) = questions(store)
    with store.transaction() as tx:
        tx.update("question", asked.id, {"status": "dropped"}, version_choices._PM, read_version=asked.version)
    save(root, "Plan.md", "edited", 20)
    save(root, "Plan DRAFT.md", "edited", 11)
    got = read(root, ws, cfg, store, 2)
    # Plan.md was modified last, so Plan DRAFT.md is the older version; no second question
    older = [store.read().get("request", r).data.get("auto_closed") for r in got.changed]
    assert [x["reason"] for x in older if x] == ["an older version; the current one is Plan.md"]
    assert len(questions(store)) == 1


def test_a_family_where_version_and_date_disagree_is_asked_about(folder):
    root, ws, cfg, store = start(folder, "Plan v3 2030-01-01.md", "Plan v2 2030-01-02.md")
    save(root, "Plan v2 2030-01-02.md", "edited", 10)
    got = read(root, ws, cfg, store, 1)
    assert not store.read().get("request", got.changed[0]).data.get("auto_closed")
    (asked,) = questions(store)
    assert asked.data["resolves"]["why"] == "disagree"


def test_a_new_version_that_settles_it_needs_no_question(folder):
    root, ws, cfg, store = start(folder, "Plan.md")
    save(root, "Plan v2.md", "new", 10)
    save(root, "Plan v3.md", "newer", 11)
    read(root, ws, cfg, store, 1)
    assert questions(store) == []


def test_a_file_split_off_can_still_be_said_to_be_the_same_document_as_another(folder):
    root, ws, cfg, store = start(folder, "Agenda 2030-03-01.md", "Agenda 2030-03-08.md", "Minutes.md")
    split = saved_of(store, "Agenda 2030-03-01.md").id
    version_choices.split(ws, current(ws), store, split)
    version_choices.link(ws, current(ws), store, split, "Minutes.md")
    versions = current(ws).watch.versions
    assert versions.not_same == {"s": [digest(store, "Agenda 2030-03-01.md")]}
    assert [(x.source, x.files) for x in versions.same_document] == [
        ("s", sorted([digest(store, "Agenda 2030-03-01.md"), digest(store, "Minutes.md")]))
    ]
    # the split file is in Minutes' family now (the dated one, so the current copy); the other agenda stands alone
    save(root, "Minutes.md", "edited", 10)
    got = read(root, ws, current(ws), store, 1)
    closed = store.read().get("request", got.changed[0]).data["auto_closed"]
    assert closed["reason"] == "an older version; the current one is Agenda 2030-03-01.md"
    save(root, "Agenda 2030-03-08.md", "edited", 11)
    got = read(root, ws, current(ws), store, 2)
    assert not store.read().get("request", got.changed[0]).data.get("auto_closed")


# ---- a choice names a file by its content, not its path -----------------------------------------------------------


def move(root, old, new):
    """Rename or move a file inside the folder, as the person does."""
    target = root / new
    target.parent.mkdir(parents=True, exist_ok=True)
    (root / old).rename(target)


def test_a_link_survives_the_older_copy_moving_into_archive_and_the_current_copy_being_renamed(folder):
    root, ws, cfg, store = start(folder, "Budget plan.md", "Cost sheet v2.md")
    version_choices.link(ws, current(ws), store, saved_of(store, "Budget plan.md").id, "Cost sheet v2.md")
    # The person's own workflow: the older copy goes into an Archive folder and the current one is renamed.
    move(root, "Budget plan.md", "Archive/Budget plan.md")
    move(root, "Cost sheet v2.md", "Costs, final.md")
    read(root, ws, current(ws), store, 1)
    # Nothing was typed again: the two are still one document, so the renamed copy replaces the archived one.
    save(root, "Costs, final.md", "Cost sheet v2.md one, and a new line", 12)
    got = read(root, ws, current(ws), store, 2)
    text = store.read().get("request", got.changed[0]).data
    saved = next(s for s in store.read().list("source") if s.data["content_hash"] == _hash_of(store, text))
    assert "It replaces the earlier version Budget plan.md" in _text_of(ws, saved)
    assert current(ws).watch.versions.same_document[0].files  # still named, by the new hash after the edit


def _hash_of(store, request):
    return store.read().get("source", request["source"]).data["content_hash"]


def _text_of(ws, source):
    return (ws.sources_dir / f"{source.data['content_hash']}.txt").read_text(encoding="utf-8")


def test_the_answer_to_which_copy_is_current_survives_a_rename(folder):
    root, ws, cfg, store = start(folder, "Plan.md", "Plan DRAFT.md")
    save(root, "Plan.md", "edited", 10)
    read(root, ws, cfg, store, 1)
    (asked,) = questions(store)
    version_choices.keep_answer(ws, current(ws), store, asked.id, "Plan.md")
    move(root, "Plan.md", "Plan FINAL.md")  # still the same family by its name, but not at the path that was named
    read(root, ws, current(ws), store, 2)
    save(root, "Plan DRAFT.md", "edited later", 12)
    got = read(root, ws, current(ws), store, 3)
    closed = store.read().get("request", got.changed[0]).data["auto_closed"]
    assert closed["reason"] == "an older version; the current one is Plan FINAL.md"


def test_a_split_stays_split_when_the_file_is_renamed(folder):
    root, ws, cfg, store = start(folder, "Agenda 2030-03-01.md", "Agenda 2030-03-08.md")
    version_choices.split(ws, current(ws), store, saved_of(store, "Agenda 2030-03-01.md").id)
    move(root, "Agenda 2030-03-01.md", "Agenda 2030-03-01 moved.md")
    read(root, ws, current(ws), store, 1)
    save(root, "Agenda 2030-03-01 moved.md", "edited", 10)
    save(root, "Agenda 2030-03-08.md", "edited too", 11)
    got = read(root, ws, current(ws), store, 2)
    assert len(got.changed) == 2
    assert not any(store.read().get("request", r).data.get("auto_closed") for r in got.changed)


def test_a_file_edited_in_place_keeps_its_choices_and_the_settings_follow_it(folder):
    root, ws, cfg, store = start(folder, "Budget plan.md", "Cost sheet v2.md")
    version_choices.link(ws, current(ws), store, saved_of(store, "Budget plan.md").id, "Cost sheet v2.md")
    before = set(current(ws).watch.versions.same_document[0].files)
    save(root, "Budget plan.md", "plan edited", 10)
    got = read(root, ws, current(ws), store, 1)
    assert store.read().get("request", got.changed[0]).data["auto_closed"]  # still an older version of the cost sheet
    after = set(current(ws).watch.versions.same_document[0].files)
    assert after != before and digest(store, "Cost sheet v2.md") in after and digest(store, "Budget plan.md") in after


def test_choices_an_earlier_version_wrote_as_paths_are_turned_into_hashes_once(folder):
    root, ws, cfg, store = start(folder, "Budget plan.md", "Cost sheet v2.md")
    from engine.config.yaml_edit import set_key

    path = ws.config_dir / "watch.yaml"
    old = {
        "same_document": [{"source": "s", "files": ["Budget plan.md", "Cost sheet v2.md"]}],
        "not_same": {"s": ["First.md", "Gone.md"]},
        "current": {"s": ["Budget plan.md"]},
    }
    import json

    for name, value in old.items():
        path.write_text(set_key(path.read_text(encoding="utf-8"), ["versions", name], json.loads(json.dumps(value))))
    versions = current(ws).watch.versions
    assert versions.same_document[0].files == ["Budget plan.md", "Cost sheet v2.md"]
    changes = version_choices.migrate_to_hashes(ws, versions_cfg := current(ws), store)
    assert {c["key"] for c in changes} == {version_choices.SAME, version_choices.NOT_SAME, version_choices.CURRENT}
    now = current(ws).watch.versions
    assert now.same_document[0].files == [digest(store, "Budget plan.md"), digest(store, "Cost sheet v2.md")]
    assert now.not_same == {"s": sorted([digest(store, "First.md"), "Gone.md"])}  # a path no file has stays a path
    assert now.current == {"s": [digest(store, "Budget plan.md")]}
    assert version_choices.migrate_to_hashes(ws, current(ws), store) == []  # nothing left to turn
    assert versions_cfg
    version_choices.undo(ws, current(ws), store, changes)
    assert current(ws).watch.versions.same_document[0].files == ["Budget plan.md", "Cost sheet v2.md"]

"""Versions of one document in a watched folder (design 6.2): families, the current copy, older copies closing
themselves, and the current copy saying what it replaces. Names are fictional."""

import os
from datetime import timedelta

import pytest

from engine.versions import Families, copy_of, current_of
from engine.watch import VERSION_RULE, refresh
from tests.test_watch import NOW, make


class Item:
    def __init__(self, key, changed_at=None):
        self.key, self.changed_at = key, changed_at


def families(*keys):
    from engine.config.schema import VersionFamilies

    return Families([Item(k, f"2030-01-0{i + 1}") for i, k in enumerate(keys)], VersionFamilies())


def test_deck_versions_are_one_family_and_the_latest_is_current():
    f = families(
        "Harbor deck FOR REVIEW.md",
        "Harbor deck_v2_0.md",
        "Harbor deck_v2_1.md",
        "Harbor deck_v3.md",
        "Harbor deck_v3_1.md",
    )
    assert len({c.family for c in f.copies}) == 1
    assert current_of(f.copies).key == "Harbor deck_v3_1.md"


def test_dates_and_version_words_are_marks():
    f = families("Plan 2030-01-05.md", "Plan 20300110.md", "Plan DRAFT.md")
    assert len({c.family for c in f.copies}) == 1
    assert current_of(f.copies).key == "Plan 20300110.md"


def test_a_copy_in_an_archive_folder_is_the_same_family_and_never_current():
    f = families("Harbor deck_v3_1.md", "Archive/Harbor deck_v3_2.md", "Old/Harbor deck_v1.md")
    assert len({c.family for c in f.copies}) == 1
    assert current_of(f.copies).key == "Harbor deck_v3_1.md"
    assert current_of(f.copies).key != "Archive/Harbor deck_v3_2.md"
    assert f.older_than_current("Archive/Harbor deck_v3_2.md").endswith("Harbor deck_v3_1.md")


def test_documents_that_differ_only_by_an_id_stay_separate():
    f = families("Form 1234.md", "Form 5678.md")
    assert len({c.family for c in f.copies}) == 2
    assert f.older_than_current("Form 1234.md") is None
    assert f.older_than_current("Form 5678.md") is None


def test_the_same_name_in_another_top_folder_is_another_family():
    f = families("North/Plan_v1.md", "South/Plan_v2.md")
    assert len({c.family for c in f.copies}) == 2


def test_copies_with_the_same_version_and_date_are_unclear_and_nothing_is_closed():
    f = families("Plan.md", "Plan DRAFT.md")
    assert current_of(f.copies) is None
    assert f.older_than_current("Plan.md") is None and f.older_than_current("Plan DRAFT.md") is None
    family, copies, why = f.unclear("Plan.md")
    assert why == "tie" and {c.key for c in copies} == {"Plan.md", "Plan DRAFT.md"} and family.endswith("plan")


def test_the_modified_time_decides_only_as_the_last_resort():
    from engine.config.schema import VersionFamilies

    items = [Item("Plan.md", "2030-01-01"), Item("Plan DRAFT.md", "2030-01-09")]
    asking = Families(items, VersionFamilies(), "s")
    family = asking.unclear("Plan.md")[0]
    gave_up = Families(items, VersionFamilies(), "s", give_up={family})
    assert gave_up.decision("Plan.md").current.key == "Plan DRAFT.md"
    assert gave_up.older_than_current("Plan.md").endswith("Plan DRAFT.md")
    nobody_to_ask = Families(items, VersionFamilies(), "s", ask=False)
    assert nobody_to_ask.decision("Plan.md").current.key == "Plan DRAFT.md"


def test_the_version_comes_before_the_date_in_the_name():
    both = families("Plan v3 2030-01-01.md", "Plan v2 2030-01-02.md")
    # v3 is newer by its version and v2 by its date: they disagree, so nothing is decided
    assert current_of(both.copies) is None and both.unclear("Plan v3 2030-01-01.md")[2] == "disagree"
    one_date = families("Plan v3.md", "Plan v2 2030-05-01.md")
    assert current_of(one_date.copies).key == "Plan v3.md"  # one date only: nothing to disagree with
    agreeing = families("Plan v3 2030-01-05.md", "Plan v2 2030-01-02.md")
    assert current_of(agreeing.copies).key == "Plan v3 2030-01-05.md"


def test_a_pinned_copy_is_current_whatever_the_names_say():
    from engine.config.schema import VersionFamilies

    settings = VersionFamilies(current={"s": ["Plan.md"]})
    f = Families([Item("Plan.md", "2030-01-01"), Item("Plan v9.md", "2030-01-02")], settings, "s")
    assert f.decision("Plan v9.md").current.key == "Plan.md"
    assert f.older_than_current("Plan v9.md").endswith("Plan.md")


def test_copy_of_reads_marks():
    c = copy_of("Deck v2.0 FINAL.md", None, ["FINAL"], ["Archive"])
    assert c.rank[0] == (2, 0) and not c.archived


# ---- through a real folder read ---------------------------------------------------------------------------------


@pytest.fixture
def folder(tmp_path):
    root = tmp_path / "shared"
    root.mkdir()
    ws, cfg, store = make(
        tmp_path,
        [
            {
                "id": "s",
                "connector": "folder",
                "label": "Shared",
                "first_run": "baseline",
                "report_removed": True,
                "settings": {"path": str(root), "patterns": ["*.md"]},
            }
        ],
    )
    yield root, ws, cfg, store
    store.close()


def save(root, name, text, age=0):
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    stamp = 1_900_000_000 + age
    os.utime(path, (stamp, stamp))


def requests(store):
    return store.read().list("request")


def test_owner_sequence_closes_older_copies_and_names_what_the_current_one_replaces(folder):
    root, ws, cfg, store = folder
    save(root, "Harbor deck FOR REVIEW.md", "Budget: open", 1)
    refresh(ws, store, cfg, "s", NOW)
    # a new round: saved under a new name
    save(root, "Harbor deck_v2_0.md", "Budget: open, two risks", 2)
    got = refresh(ws, store, cfg, "s", NOW + timedelta(hours=1))
    current = [r for r in requests(store) if r.id in got.new][0]
    assert current.data["state"] == "queued"
    text = store.read().get("source", current.data["source"]).data
    assert "replaces the earlier version Harbor deck FOR REVIEW.md" in _text(ws, text)
    # the old one is edited after the new one exists: it is an older version
    save(root, "Harbor deck FOR REVIEW.md", "Budget: open (edited)", 3)
    got = refresh(ws, store, cfg, "s", NOW + timedelta(hours=2))
    (old,) = [r for r in requests(store) if r.id in got.changed]
    assert old.data["state"] == "done"
    assert old.data["auto_closed"] == {
        "rule": VERSION_RULE,
        "reason": "an older version; the current one is Harbor deck_v2_0.md",
    }
    # moved into Archive: closes itself, as does the removal of the old place
    (root / "Harbor deck FOR REVIEW.md").rename(root / "Harbor deck FOR REVIEW.md.tmp")
    save(root, "Archive/Harbor deck FOR REVIEW.md", "Budget: open (edited)", 3)
    (root / "Harbor deck FOR REVIEW.md.tmp").unlink()
    got = refresh(ws, store, cfg, "s", NOW + timedelta(hours=3))
    assert got.new and got.removed
    for rid in [*got.new, *got.removed]:
        assert store.read().get("request", rid).data["auto_closed"]["rule"] == VERSION_RULE
    # the next round is the current copy; v3 then v3_1
    save(root, "Harbor deck_v3.md", "Budget: closed", 4)
    save(root, "Harbor deck_v3_1.md", "Budget: closed, one risk", 5)
    got = refresh(ws, store, cfg, "s", NOW + timedelta(hours=4))
    states = {
        store.read().get("source", store.read().get("request", r).data["source"]).data["title"]: store.read()
        .get("request", r)
        .data.get("auto_closed")
        for r in got.new
    }
    assert states["Harbor deck_v3.md"] and states["Harbor deck_v3_1.md"] is None


def _text(ws, source):
    return (
        (ws.root / "sources" / source["content_hash"]).read_text()
        if False
        else __import__("engine.watch", fromlist=["x"])._read_text(ws, source["content_hash"])
    )


def test_a_deleted_file_is_never_current(folder):
    root, ws, cfg, store = folder
    save(root, "Plan_v1.md", "one", 1)
    save(root, "Plan_v2.md", "two", 2)
    refresh(ws, store, cfg, "s", NOW)
    (root / "Plan_v2.md").unlink()
    save(root, "Plan_v1.md", "one, edited", 3)
    got = refresh(ws, store, cfg, "s", NOW + timedelta(hours=1))
    changed = [r for r in requests(store) if r.id in got.changed]
    assert changed and not changed[0].data.get("auto_closed")


def test_two_ids_are_both_read(folder):
    root, ws, cfg, store = folder
    save(root, "Placeholder.md", "x", 1)
    refresh(ws, store, cfg, "s", NOW)
    save(root, "Form 1234.md", "a", 2)
    save(root, "Form 5678.md", "b", 3)
    got = refresh(ws, store, cfg, "s", NOW + timedelta(hours=1))
    assert len(got.new) == 2 and not any(store.read().get("request", r).data.get("auto_closed") for r in got.new)

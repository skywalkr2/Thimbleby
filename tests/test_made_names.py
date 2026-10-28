"""What a change made is named by its record's words, or by its kind in words, never by an id."""

from types import SimpleNamespace

from engine.made import made_by


class View:
    def __init__(self, records):
        self.records = records

    def get(self, kind, record_id):
        return self.records.get((kind, record_id))


def record(record_id, **data):
    return SimpleNamespace(id=record_id, data=data)


def draft_for(owner_kind, owner_id):
    return record("TXT-1", source="draft", status="pending", owner_kind=owner_kind, owner_id=owner_id)


def made(view):
    return made_by(view, [{"status": "applied", "records": [{"kind": "text_version", "id": "TXT-1"}]}])


def test_a_draft_for_a_record_with_words_is_named_by_them():
    view = View(
        {
            ("text_version", "TXT-1"): draft_for("action", "ACT-1"),
            ("action", "ACT-1"): record("ACT-1", text="Send the index"),
        }
    )
    assert [m.label for m in made(view)] == ["Send the index"]


def test_a_draft_for_a_record_with_no_words_is_named_by_its_kind_never_its_id():
    view = View(
        {("text_version", "TXT-1"): draft_for("week_plan", "WEEK-1"), ("week_plan", "WEEK-1"): record("WEEK-1")}
    )
    assert [m.label for m in made(view)] == ["this week's plan"]
    gone = View({("text_version", "TXT-1"): draft_for("week_plan", "WEEK-1")})
    assert [m.label for m in made(gone)] == ["this week's plan"]

"""The Settings cut (design 7.9): few settings on screen, each on a page or under a topic, labelled in plain words; the
rest kept in files with their key, schema and default; merged settings follow the one the screen shows; what the app can
work out it works out; a value setup wrote reads as set up."""

import json
import re
from pathlib import Path
from types import SimpleNamespace

from engine import settings
from engine.config import levels, load_config
from engine.config.schema import FILES
from engine.own_accounts import own_names
from tests.test_setup import client, make

WORDING = json.loads((Path(__file__).resolve().parents[1] / "web" / "src" / "wording" / "en.json").read_text("utf-8"))
#: What a label or a heading never names: a code prefix, an id, a key or a word of the files.
FILE_WORDS = re.compile(r"^Ui |^Watch |^Steward |PRJ-|PER-|tasks\.|json|tier")
MOST_LABEL = 60
PAGES = {"you", "ai", "today", "backups", "appearance", "business"}


def _shown():
    """Every setting the forms are given, in the order the app sends them."""
    return settings.describe(load_config(None, env={}))


# ---- the walk: how many, and where ---------------------------------------------------------------


def test_the_settings_walk_counts_at_most_26_basic_and_30_advanced():
    shown = _shown()
    basic = [s for s in shown if s.page in PAGES]
    advanced = [s for s in shown if s.page == "advanced"]
    without_business = [s for s in basic if s.page != "business"]
    assert len(without_business) <= 23 and len(basic) <= 26, len(basic)
    assert len(advanced) <= 30, len(advanced)
    assert {s.topic for s in advanced} == set(levels.TOPICS)
    assert all(s.topic is None for s in basic) and all(s.topic for s in advanced)


def test_a_setting_is_basic_or_advanced_or_a_part_of_a_screen_or_kept_in_files():
    shown = {s.key: s for s in _shown()}
    assert {s.page for s in shown.values() if s.page} <= PAGES | {"advanced"}
    for key in levels.OWN_PART:
        assert shown[key].page is None, key
    # What is kept only in files is not listed, whatever its kind.
    assert not set(levels.FILES_ONLY) & set(shown)
    assert all(s.basic == (s.page in PAGES) for s in shown.values())


def test_the_pages_list_their_settings_in_the_order_the_pages_do():
    shown = [s.key for s in _shown() if s.page in PAGES]
    assert shown == [k for k in levels.BASIC if k in shown]
    notices = [s.key for s in _shown() if s.page == "today"]
    assert notices[0] == "ui.notifications.enabled" and notices[-1] == "steward.reminders.where_account"


# ---- labels --------------------------------------------------------------------------------------


def test_every_setting_on_a_page_has_a_short_label_in_plain_words():
    for s in _shown():
        if s.page is None or s.key in levels.OWN_PART:
            continue
        label = WORDING.get(f"settings.key.{s.key}")
        assert label, f"{s.key} has no label in the wording sheet"
        assert len(label) <= MOST_LABEL, label
        assert not FILE_WORDS.search(label), label
        # The label is not the schema's description: the description is the hint.
        assert label != s.description


def test_no_page_or_topic_heading_names_a_code_prefix_or_a_word_of_the_files():
    headings = {key: text for key, text in WORDING.items() if key.startswith(("settings.section.", "settings.topic."))}
    assert set(f"settings.topic.{t}" for t in levels.TOPICS) <= set(headings)
    for key, text in headings.items():
        assert len(text) <= MOST_LABEL and not FILE_WORDS.search(text), (key, text)
    # Each page and topic the app names has its heading.
    for page in PAGES:
        assert f"settings.section.{page}" in WORDING


def test_what_a_choice_offers_has_no_code_word_either():
    for s in _shown():
        if s.page is None or s.type != "choice" or s.choices:
            continue
        for option in s.options:
            text = WORDING.get(f"settings.option.{s.key}.{option}")
            if text is not None:
                assert not FILE_WORDS.search(text), text


# ---- what leaves the screen keeps its key, schema and default ------------------------------------


def _model_field(key):
    model = FILES[key.split(".")[0]]
    for part in key.split(".")[1:-1]:
        model = settings._model_of(model.model_fields[part].annotation)
    return model.model_fields[key.split(".")[-1]]


def test_a_setting_kept_in_files_keeps_its_key_a_description_and_a_default():
    for key in levels.FILES_ONLY:
        field = _model_field(key)
        assert field.description, f"{key} has no description"
        assert field.default is not None or field.default_factory is not None or field.is_required() is False, key


def test_a_setting_kept_in_files_is_still_set_by_a_flag_and_read_back():
    cfg = load_config(None, env={}, flags={"ui.followups.undated_after_days": 30, "language.holiday_calendar": "en-GB"})
    assert cfg.ui.followups.undated_after_days == 30
    assert cfg.sources["ui.followups.undated_after_days"] == "flag"
    assert cfg.language.holiday_calendar == "en-GB"


# ---- merged settings follow the one the screen shows ---------------------------------------------


def test_quiet_hours_are_asked_once_and_the_notices_follow_them_unless_a_file_sets_them():
    shown = {s.key for s in _shown()}
    assert "steward.reminders.quiet_start" in shown and "ui.notifications.quiet_hours.start" not in shown
    cfg = load_config(
        None,
        env={"COCKPIT__STEWARD__REMINDERS__QUIET_START": "22:30", "COCKPIT__STEWARD__REMINDERS__QUIET_END": "06:15"},
    )
    assert (cfg.ui.notifications.quiet_hours.start, cfg.ui.notifications.quiet_hours.end) == ("22:30", "06:15")
    # A notice's own quiet hours, set by a file or a flag, are left as set.
    own = load_config(
        None,
        env={
            "COCKPIT__STEWARD__REMINDERS__QUIET_START": "22:30",
            "COCKPIT__UI__NOTIFICATIONS__QUIET_HOURS__START": "23:45",
        },
    )
    assert own.ui.notifications.quiet_hours.start == "23:45" and own.steward.reminders.quiet_start == "22:30"
    # Until the one on screen is set, each keeps its own default.
    plain = load_config(None, env={})
    assert plain.ui.notifications.quiet_hours.start == FILES["ui"]().notifications.quiet_hours.start


def test_one_snooze_list_is_shown_and_the_snooze_of_a_suggestion_follows_it():
    shown = {s.key for s in _shown()}
    assert "steward.people.snooze_days" in shown and "steward.patterns.snooze_days" not in shown
    cfg = load_config(None, env={"COCKPIT__STEWARD__PEOPLE__SNOOZE_DAYS": "[2, 5, 30]"})
    assert cfg.steward.patterns.snooze_days == 5
    short = load_config(None, env={"COCKPIT__STEWARD__PEOPLE__SNOOZE_DAYS": "[10, 20]"})
    assert short.steward.patterns.snooze_days == 10
    own = load_config(
        None, env={"COCKPIT__STEWARD__PEOPLE__SNOOZE_DAYS": "[2, 5]", "COCKPIT__STEWARD__PATTERNS__SNOOZE_DAYS": "3"}
    )
    assert own.steward.patterns.snooze_days == 3
    assert load_config(None, env={}).steward.patterns.snooze_days == FILES["steward"]().patterns.snooze_days


def test_one_chase_after_n_days_is_shown_and_the_other_three_follow_it_unless_a_file_sets_them():
    shown = {s.key for s in _shown()}
    assert "ui.followups.question_after_days" in shown
    for follower in (
        "ui.followups.action_due_within_days",
        "ui.followups.undated_after_days",
        "steward.people.quiet_promise_days",
    ):
        assert follower not in shown
    cfg = load_config(None, env={"COCKPIT__UI__FOLLOWUPS__QUESTION_AFTER_DAYS": "3"})
    assert cfg.ui.followups.action_due_within_days == 3
    assert cfg.ui.followups.undated_after_days == 3
    assert cfg.steward.people.quiet_promise_days == 3
    own = load_config(
        None,
        env={"COCKPIT__UI__FOLLOWUPS__QUESTION_AFTER_DAYS": "3", "COCKPIT__UI__FOLLOWUPS__UNDATED_AFTER_DAYS": "21"},
    )
    assert own.ui.followups.undated_after_days == 21 and own.ui.followups.action_due_within_days == 3
    # Until the one on screen is set, each chase keeps its own default.
    plain = load_config(None, env={})
    assert plain.ui.followups.undated_after_days == FILES["ui"]().followups.undated_after_days


# ---- what the app works out ----------------------------------------------------------------------


def test_dates_are_written_the_way_the_language_writes_them_unless_a_file_says_otherwise():
    us = load_config(None, env={})
    assert us.language.messages.date_format == FILES["language"]().messages.date_format
    gb = load_config(None, env={"COCKPIT__WORKSPACE__LANGUAGE": "en-GB"})
    assert gb.language.messages.date_format == "%a, %d %b"
    assert gb.language.messages.date_time_format == "%a, %d %b %Y, %H:%M"
    own = load_config(
        None, env={"COCKPIT__WORKSPACE__LANGUAGE": "en-GB", "COCKPIT__LANGUAGE__MESSAGES__DATE_FORMAT": "'%d.%m.%y'"}
    )
    assert own.language.messages.date_format == "%d.%m.%y"


def test_the_holiday_calendar_follows_the_time_zone_unless_a_file_names_one():
    london = load_config(None, env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "Europe/London"})
    assert london.language.holiday_calendar == "en-GB"
    chicago = load_config(None, env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "America/Chicago"})
    assert chicago.language.holiday_calendar == "en-US"
    indiana = load_config(None, env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "America/Indiana/Knox"})
    assert indiana.language.holiday_calendar == "en-US"
    # A zone the shipped calendars don't cover leaves the language's own calendar.
    other = load_config(None, env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "Asia/Tokyo"})
    assert other.language.holiday_calendar is None
    own = load_config(
        None,
        env={"COCKPIT__WORKSPACE__USER__TIMEZONE": "Europe/London", "COCKPIT__LANGUAGE__HOLIDAY_CALENDAR": "en-US"},
    )
    assert own.language.holiday_calendar == "en-US"


def test_the_persons_own_addresses_are_learned_from_the_accounts_they_signed_in_with():
    def cfg(accounts, sources):
        return SimpleNamespace(
            workspace=SimpleNamespace(user=SimpleNamespace(accounts=accounts)),
            watch=SimpleNamespace(sources=[SimpleNamespace(account=a) for a in sources]),
        )

    assert own_names(cfg([], ["ada@example.com", None, "work@example.com"])) == ["ada@example.com", "work@example.com"]
    # What a person set stays, and the same address from both is one.
    assert own_names(cfg(["Ada L", "Ada@Example.com"], ["ada@example.com"])) == ["Ada L", "Ada@Example.com"]
    assert own_names(cfg([], [])) == []


# ---- a value setup wrote is set up, not changed --------------------------------------------------


def _item(c, api, key):
    return next(i for i in c.get(f"{api}/settings").json()["items"] if i["key"] == key)


def test_a_value_setup_wrote_reads_as_set_up_until_the_person_changes_it(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    fp = c.get(f"{api}/settings").json()["fingerprint"]
    done = c.post(
        f"{api}/settings", json={"changes": {"workspace.name": "Orchard Press"}, "fingerprint": fp, "by_setup": True}
    )
    assert done.status_code == 200, done.text
    item = _item(c, api, "workspace.name")
    assert item["value"] == "Orchard Press" and item["by_setup"] is True
    # The person's own save of another value is theirs.
    own = c.post(
        f"{api}/settings",
        json={"changes": {"workspace.name": "Orchard Studio"}, "fingerprint": done.json()["fingerprint"]},
    )
    assert own.status_code == 200, own.text
    assert _item(c, api, "workspace.name")["by_setup"] is False
    # A value the person saved without setup was never set up.
    other = c.post(
        f"{api}/settings", json={"changes": {"workspace.language": "en-GB"}, "fingerprint": own.json()["fingerprint"]}
    )
    assert other.status_code == 200, other.text
    assert _item(c, api, "workspace.language")["by_setup"] is False


def test_a_value_setup_wrote_stops_reading_as_set_up_when_the_file_changes_underneath(tmp_path):
    from engine.config.yaml_edit import set_key

    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    fp = c.get(f"{api}/settings").json()["fingerprint"]
    done = c.post(
        f"{api}/settings", json={"changes": {"workspace.name": "Orchard Press"}, "fingerprint": fp, "by_setup": True}
    )
    assert done.status_code == 200, done.text
    target = ws.config_dir / "workspace.yaml"
    target.write_text(set_key(target.read_text("utf-8"), ["name"], "Edited in the file"), encoding="utf-8")
    assert _item(c, api, "workspace.name")["by_setup"] is False


def test_putting_a_value_setup_wrote_back_to_its_default_is_no_longer_set_up(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    fp = c.get(f"{api}/settings").json()["fingerprint"]
    done = c.post(
        f"{api}/settings", json={"changes": {"workspace.name": "Orchard Press"}, "fingerprint": fp, "by_setup": True}
    )
    reset = c.post(f"{api}/settings", json={"reset": ["workspace.name"], "fingerprint": done.json()["fingerprint"]})
    assert reset.status_code == 200, reset.text
    assert _item(c, api, "workspace.name")["by_setup"] is False

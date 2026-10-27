"""The language word lists are shipped data with the workspace's own setting laid over them (design 4.0, "Word lists").

`tests/fixtures/language/old_defaults.json` is every list the settings schema wrote out as a default before the lists
moved into `engine/defaults/language/en-US.yaml`: what a reader gets with nothing set must be exactly that.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
import yaml

from engine import language_words as lw
from engine.config import load_config
from engine.config.schema import LanguageFile, ReportedSpeech
from engine.intake import repeats_someone
from engine.language_words import language_words, shipped
from engine.worker import is_live

OLD_DEFAULTS = json.loads((Path(__file__).parent / "fixtures" / "language" / "old_defaults.json").read_text("utf-8"))
#: Lists whose default always was empty: the person's own additions, with nothing shipped.
OWN_ONLY = {"known_terms", "never_shown"}


def settings_for(key: str) -> tuple[object, str]:
    """The settings model and the name a key (`reported_speech.verbs` or `self_words`) is read by."""
    group, _, name = key.rpartition(".")
    model = getattr(LanguageFile(), group) if group else LanguageFile()
    return model, name


def test_every_moved_list_reads_the_same_through_the_function_as_the_old_default():
    for key, old in OLD_DEFAULTS.items():
        model, name = settings_for(key)
        assert getattr(model, name) is None, f"{key} is not set by default"
        assert language_words(model, name) == old, key


def list_settings() -> set[str]:
    """Every list or mapping setting of the language file, by dotted name."""

    def lists(model: type, group: str) -> set[str]:
        return {
            f"{group}{name}"
            for name, info in model.model_fields.items()
            if re.match(r"(list|dict)\[", str(info.annotation))
        }

    return lists(LanguageFile, "") | lists(ReportedSpeech, "reported_speech.")


def test_every_list_setting_has_a_shipped_list_and_the_shipped_file_has_nothing_else():
    assert list_settings() - OWN_ONLY == set(OLD_DEFAULTS), (
        "a list setting with no shipped list, or the other way round"
    )
    assert set(lw.names()) == set(OLD_DEFAULTS)
    for own in OWN_ONLY:
        assert getattr(LanguageFile(), own) == []


def test_a_list_set_in_the_workspace_replaces_the_shipped_one_whole_and_an_empty_one_counts():
    own = LanguageFile(self_words=["ego"], everyday_words=[])
    assert language_words(own, "self_words") == ["ego"]
    assert language_words(own, "everyday_words") == []
    assert language_words(own, "owed_words") == OLD_DEFAULTS["owed_words"]
    speech = ReportedSpeech(verbs=["quipped"])
    assert language_words(speech, "verbs") == ["quipped"]
    assert language_words(speech, "lead_words") == OLD_DEFAULTS["reported_speech.lead_words"]


def test_the_date_phrases_and_mappings_are_replaced_by_the_value_set_and_read_as_copies():
    own = LanguageFile(due_phrase_words={"noon": ["high noon"]}, due_number_words={"eleven": 11})
    assert language_words(own, "due_phrase_words") == {"noon": ["high noon"]}
    assert language_words(own, "due_number_words") == {"eleven": 11}
    first = language_words(LanguageFile(), "due_phrase_words")
    first["noon"].append("changed")
    first.pop("tonight")
    assert language_words(LanguageFile(), "due_phrase_words") == OLD_DEFAULTS["due_phrase_words"]
    listed = language_words(LanguageFile(), "self_words")
    listed.append("changed")
    assert shipped("self_words") == OLD_DEFAULTS["self_words"]


def test_a_setting_in_the_files_replaces_the_list_and_a_key_left_out_or_null_uses_the_shipped_one(tmp_path):
    (tmp_path / "language.yaml").write_text(
        "self_words: [ego]\nreported_speech:\n  verbs: [quipped]\nowed_words: null\n"
    )
    cfg = load_config(tmp_path, env={})
    assert language_words(cfg.language, "self_words") == ["ego"]
    assert language_words(cfg.language.reported_speech, "verbs") == ["quipped"]
    assert language_words(cfg.language, "owed_words") == OLD_DEFAULTS["owed_words"]
    assert language_words(cfg.language, "request_words") == OLD_DEFAULTS["request_words"]
    through_env = load_config(tmp_path, env={"COCKPIT__LANGUAGE__SELF_WORDS": '["alter"]'})
    assert language_words(through_env.language, "self_words") == ["alter"]


def test_a_reader_gets_a_changed_setting_at_the_next_use():
    cfg = load_config(None, env={})
    note = "Kit quipped that it ships on Friday"
    assert not repeats_someone(note, cfg.language.reported_speech)
    cfg.language.reported_speech.verbs = ["quipped"]
    assert repeats_someone(note, cfg.language.reported_speech)
    cfg.language.reported_speech.verbs = None
    assert not repeats_someone(note, cfg.language.reported_speech)
    assert repeats_someone("Kit said that it ships on Friday", cfg.language.reported_speech)


def test_every_list_applies_at_once_and_the_settings_that_are_not_lists_keep_their_own_rule():
    for key in OLD_DEFAULTS:
        assert is_live(f"language.{key}"), key
    assert is_live("language.due_phrase_words.noon") and is_live("language.reported_speech.chat_line_patterns")
    assert not is_live("language.title_min_words") and not is_live("language.known_terms")


def test_the_shipped_patterns_are_regular_expressions_and_the_values_are_what_the_readers_expect():
    for key in ("title_skip", "new_term_patterns", "version_patterns", "reported_speech.chat_line_patterns"):
        for pattern in shipped(key):
            re.compile(pattern)
    for pattern in shipped("date_patterns"):
        filled = pattern
        for name, sample in (("iso", "2026-01-02"), ("day", "2"), ("month", "January"), ("year", "2026")):
            filled = filled.replace("{" + name + "}", sample)
        re.compile(filled)
    assert all(isinstance(n, int) for n in shipped("due_number_words").values())
    assert set(shipped("time_zone_abbreviations").values()) <= {
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "UTC",
        "Europe/London",
    }
    for key in lw.names():
        found = shipped(key)
        assert all(isinstance(w, str) for w in (found if isinstance(found, list) else found.keys())), key


def test_the_shipped_file_is_grouped_and_commented_and_one_file_serves_each_language_tag():
    text = (lw.SHIPPED_DIR / "en-US.yaml").read_text(encoding="utf-8")
    assert yaml.safe_load(text)
    assert text.count("\n# ") >= 6, "each group has a header comment"
    assert shipped("self_words", "en-GB") == shipped("self_words", "en-US")
    assert shipped("self_words", "fr") == shipped("self_words", "en-US")
    assert sorted(p.stem for p in lw.SHIPPED_DIR.glob("*.yaml")) == ["en-US"]


@pytest.mark.parametrize("name", ["self_words", "reported_speech.verbs"])
def test_an_unknown_list_is_an_error_not_an_empty_list(name):
    with pytest.raises(KeyError):
        shipped(name + "_typo")


def test_mail_sorting_and_packets_still_read_the_playbook_once_its_guidance_folder_is_loaded_as_a_package():
    # Loading the folder as a package once replaced a function of the same name, so mail sorting failed by test order.
    # A fresh process loads the folder first, as a learning run can, and nothing here is reloaded.
    import subprocess
    import sys

    code = (
        "from importlib import resources; resources.files('engine.playbook.guidance');"
        "from engine import mail_sorting, packet, playbook;"
        "assert callable(playbook.practice) and callable(mail_sorting.practice) and callable(packet.practice)"
    )
    done = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, timeout=120)
    assert done.returncode == 0, done.stderr

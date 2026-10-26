"""One family of follow-up timing settings (design 4.0, 6.9, 6.33): the promise lines read the same
`ui.followups` numbers the follow-ups, Today's nudge lines and Top priorities read. The two `steward.chase_*_days`
names are still read for one release, from a file, an environment variable or a flag, and the config says which old
names are in use."""

from __future__ import annotations

from engine.config.loader import RENAMED_KEYS, load_config
from engine.config.schema import FILES

DATED, UNDATED = "steward.chase_dated_days", "steward.chase_undated_days"
WITHIN, AFTER = "ui.followups.action_due_within_days", "ui.followups.undated_after_days"


def write(folder, name, text):
    (folder / f"{name}.yaml").write_text(text, encoding="utf-8")


def test_the_steward_file_no_longer_has_its_own_pair():
    names = set(FILES["steward"].model_fields)
    assert "chase_dated_days" not in names and "chase_undated_days" not in names


def test_an_old_file_keeps_working_under_the_new_names_and_is_noted(tmp_path):
    write(tmp_path, "steward", "version: 1\nchase_dated_days: 3\nchase_undated_days: 9\n")
    cfg = load_config(tmp_path, env={})
    assert (cfg.value(WITHIN), cfg.value(AFTER)) == (3, 9)
    assert cfg.deprecated == {DATED: WITHIN, UNDATED: AFTER}
    assert cfg.sources[WITHIN] == "file" and DATED not in cfg.sources


def test_the_new_name_wins_when_both_are_set(tmp_path):
    write(tmp_path, "steward", "version: 1\nchase_dated_days: 3\n")
    write(tmp_path, "ui", "version: 1\nfollowups: {action_due_within_days: 5}\n")
    cfg = load_config(tmp_path, env={})
    assert cfg.value(WITHIN) == 5


def test_an_old_environment_variable_and_flag_are_read_under_the_new_name():
    cfg = load_config(None, env={"COCKPIT__STEWARD__CHASE_UNDATED_DAYS": "20"}, flags={DATED: 2})
    assert (cfg.value(AFTER), cfg.value(WITHIN)) == (20, 2)
    assert cfg.deprecated == {UNDATED: AFTER, DATED: WITHIN}
    assert cfg.sources[AFTER] == "env" and cfg.sources[WITHIN] == "flag"


def test_nothing_is_noted_when_only_the_new_names_are_used(tmp_path):
    write(tmp_path, "ui", "version: 1\nfollowups: {undated_after_days: 11}\n")
    cfg = load_config(tmp_path, env={})
    assert cfg.value(AFTER) == 11 and cfg.deprecated == {}


def test_every_renamed_key_points_at_a_real_setting():
    cfg = load_config(None, env={})
    for new in RENAMED_KEYS.values():
        assert cfg.value(new) is not None


def test_the_settings_screen_notes_an_old_name_and_saving_the_new_one_takes_it_out_of_the_file(tmp_path):
    from fastapi.testclient import TestClient

    from api.app import create_app
    from engine.config.yaml_edit import set_key
    from tests.test_setup import make

    old, chase = "ui.today.nudge_after_days", "ui.followups.question_after_days"
    ws, cfg, store = make(tmp_path)
    store.close()
    target = ws.config_dir / "ui.yaml"
    target.write_text(set_key(target.read_text(encoding="utf-8"), ["today", "nudge_after_days"], 3), encoding="utf-8")
    cfg = ws.config(env={})
    c = TestClient(create_app(ws, cfg, "t", start_worker=False))
    c.headers["Authorization"] = "Bearer t"
    api = cfg.server.base_path.rstrip("/") + "/api"
    shown = c.get(f"{api}/settings").json()
    items = {i["key"]: i for i in shown["items"]}
    assert items[chase]["renamed_from"] == old and items[chase]["value"] == cfg.value(chase) == 3
    saved = c.post(f"{api}/settings", json={"changes": {chase: 6}, "reset": [], "fingerprint": shown["fingerprint"]})
    assert saved.status_code == 200, saved.text
    assert "nudge_after_days" not in target.read_text(encoding="utf-8")
    again = {i["key"]: i for i in c.get(f"{api}/settings").json()["items"]}
    assert again[chase]["value"] == 6 and again[chase]["renamed_from"] is None

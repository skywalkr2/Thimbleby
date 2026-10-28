"""Settings > Backups reads where backups go, how the last one went, the newest copies and whether backups run on their
own from the settings and the folders themselves (design 5.0). Restoring a whole backup is `cockpit restore --backup`;
the screen says so, and restoring to a moment in time isn't built."""

from datetime import datetime

from tests.test_first_backup import _choose, _watching, make
from tests.test_setup import client


def test_with_no_folder_backups_are_not_made_on_their_own_and_the_page_says_so(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    body = c.get(f"{api}/backups").json()
    assert body["targets"] == [] and body["copies"] == []
    # The setting is still on, so choosing a folder turns backups on at once; until then nothing runs on its own.
    assert body["switch"] is True and body["schedule"] is False
    assert body["state"]["configured"] is False and body["state"]["needs_attention"] is True


def test_choosing_a_folder_and_backing_up_now_shows_the_last_backup_and_the_copy_made(tmp_path):
    """The person's path: they choose a folder in Settings, press Back up now, and the page shows the folder as there,
    the last backup and the dated copy with where to restore it from."""
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    started = _watching(c.app.state.worker)
    folder = tmp_path / "drive"
    folder.mkdir()
    assert _choose(c, api, folder).status_code == 200
    started[0].join(timeout=15)
    before = c.get(f"{api}/backups").json()
    assert c.post(f"{api}/backup").status_code == 200
    body = c.get(f"{api}/backups").json()
    assert body["schedule"] is True and body["switch"] is True
    [target] = body["targets"]
    assert target["path"].endswith("drive") and target["reachable"] is True and target["last_error"] is None
    assert target["last_success"] and body["state"]["last_success"] == target["last_success"]
    assert body["message"].startswith("Backed up") and body["state"]["needs_attention"] is False
    assert len(body["copies"]) >= len(before["copies"]) >= 1
    newest = body["copies"][0]
    assert newest["path"].startswith(str(folder)) and (folder / newest["name"] / "cockpit.db").is_file()
    assert newest["encrypted"] is False and datetime.fromisoformat(newest["made_at"])


def test_a_folder_that_is_gone_is_shown_as_not_there_with_why_the_backup_failed(tmp_path):
    ws, cfg, store = make(tmp_path)
    c, api = client(ws, cfg, store)
    started = _watching(c.app.state.worker)
    folder = tmp_path / "drive"
    folder.mkdir()
    assert _choose(c, api, folder).status_code == 200
    started[0].join(timeout=15)
    folder.rename(tmp_path / "unplugged")
    c.post(f"{api}/backup")
    [target] = c.get(f"{api}/backups").json()["targets"]
    assert target["reachable"] is False and target["last_error"]

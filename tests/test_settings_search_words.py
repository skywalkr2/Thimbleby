"""The words a beginner searches Settings by: shipped data, with the workspace's own list laid over it (7.9, 4.6)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from api.app import create_app
from engine.config import load_config
from engine.language_words import language_words, shipped
from engine.workspace import init_workspace
from tests.conftest import DEMO_B

TOKEN = "test-token-value"
#: What a person with no technical words types to find a thing, from the reviewer's walk.
BEGINNER_WORDS = ("password", "email", "money", "delete", "sign out")


def client_for(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"server.base_path": "/"})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui")
    return ws, TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"})


def test_the_shipped_list_covers_the_words_beginners_use_and_is_plain_data():
    words = shipped("settings_search_words")
    for word in BEGINNER_WORDS:
        assert words.get(word), word
    for word, related in words.items():
        assert word == word.lower().strip() and word, word
        assert related and all(isinstance(r, str) and r.strip() and r == r.lower() for r in related), word
        assert word not in related, f"{word} finds itself already"


def test_the_settings_screen_is_given_the_list_and_a_workspaces_own_list_replaces_it_whole(tmp_path):
    ws, client = client_for(tmp_path)
    with client:
        assert client.get("/api/settings").json()["search_words"] == shipped("settings_search_words")
        (ws.config_dir / "language.yaml").write_text("settings_search_words: {fiscal: [spend]}\n")
        assert client.get("/api/settings").json()["search_words"] == {"fiscal": ["spend"]}
        # An empty list turns the words off, and a key left out or null brings the shipped list back.
        (ws.config_dir / "language.yaml").write_text("settings_search_words: {}\n")
        assert client.get("/api/settings").json()["search_words"] == {}
        (ws.config_dir / "language.yaml").write_text("settings_search_words: null\n")
        assert client.get("/api/settings").json()["search_words"] == shipped("settings_search_words")


def test_the_list_is_read_at_the_moment_of_use_from_the_workspaces_files(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = load_config(ws.config_dir, env={})
    assert language_words(cfg.language, "settings_search_words") == shipped("settings_search_words")
    cfg.language.settings_search_words = {"x": ["y"]}
    assert language_words(cfg.language, "settings_search_words") == {"x": ["y"]}

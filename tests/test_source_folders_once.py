"""Choosing what an add-on's mail account reads (sweep X05): a folder the account doesn't have is refused in plain words
before anything is saved, the same folder of the same account is never read by two sources, and a message two sources
of one account both list is one item, not two. The words are the screen's own wording sheet."""

import json
from pathlib import Path

import yaml

from engine.config import load_config
from engine.storage import Store
from tests.test_sign_in import SIGNING
from tests.test_sign_in import signing as signing  # noqa: F401 - the fixture
from tests.test_sign_in_sources import _app, _with_sources, sign_in, sources

WORDS = json.loads((Path(__file__).parents[1] / "web" / "src" / "wording" / "en.json").read_text("utf-8"))
ADVICE = yaml.safe_load((Path(__file__).parents[1] / "engine" / "defaults" / "source_advice.yaml").read_text("utf-8"))
HAS = ("INBOX", "Archive")

READING = SIGNING.replace(
    '        scopes=["read", "offline"], params={"access_type": "offline"},\n',
    '        scopes=["read", "offline"], params={"access_type": "offline"},\n'
    '        sources=[{"connector": "p18/inbox", "label": "Your inbox", "settings": {}}],\n',
).replace(
    "def register(registrar):\n",
    "from pydantic import BaseModel, Field\n"
    "from engine.connectors import ConnectorError, MessageDetails, SourceItem\n"
    "from engine.plugin_api import Poll\n\n"
    "class InboxSettings(BaseModel):\n"
    "    folder: str = Field('INBOX', description='Which folder of the mailbox to read.')\n\n"
    "def poll_inbox(settings, state, context):\n"
    f"    if settings.folder not in {HAS!r}:\n"
    "        raise ConnectorError('not_found', 'there is no such folder')\n"
    "    # The first read finds nothing (the baseline); later ones find three messages.\n"
    "    if not state:\n"
    "        return Poll([], {'read': True})\n"
    "    when = '2030-01-02T09:00:00+00:00'\n"
    "    details = MessageDetails(sender='Sender <s@example.com>', received=when)\n"
    "    items = [SourceItem(key=f'm-{n}', title=f'Message {n}', text=f'Message {n} says hello', author='Sender',\n"
    "                        changed_at=when, message=details) for n in range(3)]\n"
    "    return Poll(items, {'read': True})\n\n"
    "def register(registrar):\n"
    "    registrar.connector('p18/inbox', label='Inbox', settings=InboxSettings, poll=poll_inbox)\n",
)


def _signed_in(signing):  # noqa: F811
    ws, cfg, store = signing[:3]
    store.close()
    _with_sources(ws, READING)
    c, api = _app(ws, cfg)
    sign_in(c, api)
    return ws, c, api


def _add(c, api, ws, folder: str | None, label: str = "Another folder"):
    inbox = next(s for s in sources(ws) if s["label"] == "Your inbox")
    settings = {} if folder is None else {"folder": folder}
    return c.post(
        f"{api}/watch/sources",
        json={
            "connector": "p18/inbox",
            "label": label,
            "every_minutes": 15,
            "account": inbox["account"],
            "settings": settings,
            "fingerprint": c.get(f"{api}/settings").json()["fingerprint"],
        },
    )


def test_the_sentences_are_in_both_sheets():
    for key in ("sources.refuse.same_folder", "sources.refuse.no_such_folder"):
        assert WORDS[key] == ADVICE[key], key


def test_the_same_folder_of_the_same_account_is_refused_however_it_is_named(signing):  # noqa: F811
    ws, c, api = _signed_in(signing)
    before = len(sources(ws))
    # The sign-in already reads the inbox: by its default name and by its name typed out.
    for folder in (None, "INBOX"):
        refused = _add(c, api, ws, folder)
        assert refused.status_code == 400, refused.text
        assert refused.json()["detail"] == ADVICE["sources.refuse.same_folder"].format(label="Your inbox")
    assert len(sources(ws)) == before
    # Another folder the account has is taken once, and then refused as the same.
    assert _add(c, api, ws, "Archive").status_code == 200
    again = _add(c, api, ws, "Archive", label="Archive again")
    assert again.status_code == 400 and "Another folder" in again.json()["detail"]
    assert len(sources(ws)) == before + 1


def test_a_folder_the_account_doesnt_have_is_refused_before_anything_is_saved(signing):  # noqa: F811
    ws, c, api = _signed_in(signing)
    before = sources(ws)
    refused = _add(c, api, ws, "Nonsense folder 123")
    assert refused.status_code == 400, refused.text
    assert refused.json()["detail"] == ADVICE["sources.refuse.no_such_folder"].format(folder="Nonsense folder 123")
    assert sources(ws) == before


def test_a_message_two_sources_of_one_account_both_list_is_one_item(signing):  # noqa: F811
    from engine import watch

    ws, c, api = _signed_in(signing)
    inbox = next(s for s in sources(ws) if s["label"] == "Your inbox")
    # A twin the review found already there: the same account and folder, read by a second source.
    config = yaml.safe_load((ws.config_dir / "watch.yaml").read_text())
    config["sources"].append({**inbox, "id": "twin", "label": "Twin of the inbox"})
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump(config))
    cfg = load_config(ws.config_dir, env={})
    store = Store(ws.db_path, cfg=cfg)
    try:
        for source in (inbox["id"], "twin"):
            assert watch.refresh(ws, store, cfg, source).new == []  # the baseline
        first = watch.refresh(ws, store, cfg, inbox["id"])
        second = watch.refresh(ws, store, cfg, "twin")
        assert len(first.new) == 3
        assert second.new == [], "the twin handed in the same messages again"
    finally:
        store.close()

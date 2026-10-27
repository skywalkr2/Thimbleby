"""Choosing the Sent folder for an add-on's mail (the reviewer's G4): where a service names no sent folder, the picker
is offered the usual folder names first and adds the folder as a source of its own, credited to the person, in setup
and after it, for an add-on's connector as it does for the plain mailbox. The add-on's setting that names the folder
is found by the connector's own settings, and nothing about one service is in the core."""

import yaml

from engine.config import load_config
from tests.test_sign_in import SIGNING
from tests.test_sign_in import signing as signing  # noqa: F401 - the fixture
from tests.test_sign_in_sources import _app, _with_sources, sign_in, sources

WEB = "https" + "://"
FOLDER_READING = SIGNING.replace(
    '        scopes=["read", "offline"], params={"access_type": "offline"},\n',
    '        scopes=["read", "offline"], params={"access_type": "offline"},\n'
    '        sources=[{"connector": "p18/inbox", "label": "Your inbox", "settings": {}}],\n',
).replace(
    "def register(registrar):\n",
    "from pydantic import BaseModel, Field\n"
    "from engine.plugin_api import Poll\n\n"
    "class InboxSettings(BaseModel):\n"
    "    folder: str = Field('INBOX', description='Which folder of the mailbox to read.')\n\n"
    "def poll_inbox(settings, state, context):\n"
    "    return Poll([], {})\n\n"
    "def register(registrar):\n"
    "    registrar.connector('p18/inbox', label='Inbox', settings=InboxSettings, poll=poll_inbox)\n",
)


def _inbox(ws):
    return next(s for s in sources(ws) if s["label"] == "Your inbox")


def _signed_in(signing):
    ws, cfg, store = signing[:3]
    store.close()
    _with_sources(ws, FOLDER_READING)
    c, api = _app(ws, cfg)
    sign_in(c, api)
    return ws, c, api


def _body(c, api, **more):
    return {"fingerprint": c.get(f"{api}/settings").json()["fingerprint"], **more}


def test_the_usual_folder_names_are_offered_first_for_an_add_ons_mail_and_say_they_are_not_a_list_of_the_mailboxs_own(
    signing,  # noqa: F811
):
    ws, c, api = _signed_in(signing)
    usual = list(load_config(ws.config_dir, env={}).watch.sent_folder_names)
    got = c.get(f"{api}/watch/{_inbox(ws)['id']}/folders")
    assert got.status_code == 200, got.text
    view = got.json()
    assert view["listed"] is False and view["folders"] == usual and view["sent"] == usual[0]
    assert view["taken"] == ["INBOX"]


def test_an_add_on_mails_sent_folder_is_added_as_a_source_of_its_own_credited_to_the_person(signing):  # noqa: F811
    ws, c, api = _signed_in(signing)
    inbox = _inbox(ws)
    person = load_config(ws.config_dir, env={}).workspace.user.person
    done = c.post(f"{api}/watch/{inbox['id']}/sent-folder", json=_body(c, api, folder="Sent Items"))
    assert done.status_code == 200, done.text
    (sent,) = [s for s in sources(ws) if s["id"] != inbox["id"] and s["connector"] == "p18/inbox"]
    assert sent["settings"] == {"folder": "Sent Items"} and sent["label"] == "Your inbox (Sent Items)"
    assert sent.get("author") == person and sent["every_minutes"] == inbox["every_minutes"]
    # Taking it again is refused in words, and so is a choice of nothing.
    again = c.post(f"{api}/watch/{inbox['id']}/sent-folder", json=_body(c, api, folder="Sent Items"))
    assert again.status_code == 400 and "Choose a folder" in again.json()["detail"]
    none = c.post(f"{api}/watch/{inbox['id']}/sent-folder", json=_body(c, api))
    assert none.status_code == 400 and "Choose a folder" in none.json()["detail"]
    assert len([s for s in sources(ws) if s["connector"] == "p18/inbox"]) == 2


def test_a_kind_of_source_with_no_folder_setting_has_nothing_to_choose(signing):  # noqa: F811
    ws, c, api = _signed_in(signing)
    config = yaml.safe_load((ws.config_dir / "watch.yaml").read_text())
    assert config["sources"], "the sign-in started its inbox"
    # A source of a kind that names no folder (the plain feed) is not offered folders.
    config["sources"].append(
        {"id": "a-feed", "connector": "feed", "label": "A feed", "settings": {"url": WEB + "example.com/f.xml"}}
    )
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump(config))
    c2, api2 = _app(ws, load_config(ws.config_dir, env={}))
    got = c2.get(f"{api2}/watch/a-feed/folders")
    assert got.status_code == 409

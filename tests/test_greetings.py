"""How a message opens (design 6.32): a message to a colleague opens as the greeting setting says; one to someone
who is only on the person's own life opens by how they relate to the person, from the wording sheet, and never like
a colleague's. Names come from the fixtures."""

from __future__ import annotations

import pytest

from engine import greetings, sides
from engine.followups import Section, compose
from engine.names import People
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.e2e_just_me import the_person
from tests.test_many_sides import add_side

_PM = WriteContext("pm", "trusted", "test.greetings")
FIRST_NAME = "Ottoline"


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", git=False, you=the_person())
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()


def person(store, name, **more) -> str:
    with store.transaction() as tx:
        return tx.create("person", {"full_name": name, **more}, _PM).id


def test_a_message_to_someone_on_the_own_life_opens_by_how_they_relate_to_the_person(env):
    _, cfg, store = env
    personal = cfg.workspace.project.personal
    sister = person(store, f"{FIRST_NAME} Marlowe", sides=[personal], relation="my sister")
    friend = person(store, "Gideon Haverly", sides=[personal], relation="my friend from school")
    unnamed = person(store, "Perpetua Corliss", sides=[personal], relation="someone I met")
    people = People(store, cfg)
    assert greetings.opening(cfg, people, sister) == sides.word(cfg, "greeting.relation.sister").format(
        first_name=FIRST_NAME
    )
    assert greetings.opening(cfg, people, friend) == sides.word(cfg, "greeting.relation.friend").format(
        first_name="Gideon"
    )
    assert greetings.opening(cfg, people, unnamed) == sides.word(cfg, "greeting.personal").format(first_name="Perpetua")


def test_none_of_these_opens_like_a_colleague(env):
    _, cfg, store = env
    personal = cfg.workspace.project.personal
    colleague_opening = cfg.language.messages.greeting
    for relation in (None, "my sister", "someone I met"):
        pid = person(store, f"{FIRST_NAME} Marlowe", sides=[personal], relation=relation)
        assert greetings.opening(cfg, People(store, cfg), pid) != colleague_opening.format(first_name=FIRST_NAME)


def test_someone_not_only_on_the_own_life_opens_as_the_greeting_setting_says(env):
    _, cfg, store = env
    personal = cfg.workspace.project.personal
    job = add_side(env, "Weekday job", kind="job")
    colleague = person(store, f"{FIRST_NAME} Marlowe", sides=[job], relation="my sister")
    both = person(store, "Gideon Haverly", sides=[personal, job])
    unknown = person(store, "Perpetua Corliss")
    people = People(store, cfg)
    for pid, first in ((colleague, FIRST_NAME), (both, "Gideon"), (unknown, "Perpetua")):
        assert greetings.opening(cfg, people, pid) == cfg.language.messages.greeting.format(first_name=first)


def test_the_follow_up_message_opens_with_it_and_the_workspace_can_change_it(env):
    _, cfg, store = env
    personal = cfg.workspace.project.personal
    sister = person(store, f"{FIRST_NAME} Marlowe", sides=[personal], relation="my sister")
    section = Section(sister, f"{FIRST_NAME} Marlowe", False)
    section.questions = [{"status": "open", "title": "Which week suits the dentist?", "text": "", "links": []}]
    first_line = compose(section, cfg, People(store, cfg)).splitlines()[0]
    assert first_line == sides.word(cfg, "greeting.relation.sister").format(first_name=FIRST_NAME)
    cfg.ui.wording["greeting.relation.sister"] = "Hi sis, {first_name}!"
    assert compose(section, cfg, People(store, cfg)).splitlines()[0] == f"Hi sis, {FIRST_NAME}!"

"""A conversation on a record brings in older history (design 6.25, 6.32, S5; plugin question 207): each message is
searched against the facts, past inputs, records and knowledge the workspace holds, with the core's own search, and the
best matches are sent as evidence: at the data level the answering accounts may see, never the record itself, only what
a draft about the record may draw on (its area), outside text marked as outside, and the search logged on the run. A
conversation on a saved input also has that input's words. The AI is the stub; names come from the fixtures."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from engine import conversation
from engine import packet as packets
from engine.ai.adapters.stub import set_responder
from engine.storage import Store, WriteContext
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records, without_first_go

NOW = datetime(2026, 10, 20, 12, 0, tzinfo=UTC)
ACTION = next(a for a in fixture_records(DEMO_B, "action") if a.get("status", "open") == "open")
_TEST = WriteContext(actor="pm", trust="trusted", op="test.history")
HEADING = "# Older things the workspace already holds that may matter"
WORDS = "What about the glacier lantern order?"


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    without_first_go(ws.config_dir)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()
    set_responder(None)


def make(store, record_kind, **data) -> str:
    with store.transaction() as tx:
        return tx.create(record_kind, data, _TEST).id


def fact(store, text, **more) -> str:
    return make(
        store, "fact", text=text, trust="trusted", basis="person", evidence={"source": "note", "quote": text}, **more
    )


def saved_input(ws, store, text, *, trust="untrusted", sensitivity="internal", title="Supplier mail", **more) -> str:
    import hashlib

    digest = hashlib.sha256(text.encode()).hexdigest()
    ws.sources_dir.mkdir(parents=True, exist_ok=True)
    (ws.sources_dir / f"{digest}.txt").write_text(text, encoding="utf-8")
    return make(
        store,
        "source",
        received_at="2026-10-01T09:00:00+00:00",
        kind="watched:mailbox",
        title=title,
        content_hash=digest,
        trust=trust,
        sensitivity=sensitivity,
        **more,
    )


def built(env, message=WORDS, kind="action", record=ACTION["id"]):
    ws, cfg, store = env
    return packets.build(ws, store, cfg, conversation.say(store, kind, record, message), NOW.date())


def test_the_best_matching_older_facts_and_inputs_come_with_the_message_as_evidence(env):
    ws, cfg, store = env
    old = fact(store, "The glacier lantern order ships in March from the harbor warehouse.")
    unrelated = fact(store, "The printer on the second floor jams on thick paper.")
    mail = saved_input(ws, store, "Hello, your glacier lantern order is delayed until the spring shipment arrives.")
    packet = built(env)
    text = packet.task.request
    assert HEADING in text
    assert f"- {old} (fact" in text and "ships in March" in text
    assert f'<untrusted source="{mail}">' in text and "delayed until the spring shipment" in text
    assert unrelated not in text
    # the evidence can be quoted by the answer
    assert "ships in March from the harbor warehouse" in packet.raw_input
    # and it comes before the question, after the record
    assert text.index("# The record this conversation is about") < text.index(HEADING) < text.index("<question>")


def test_the_record_itself_is_never_its_own_older_history(env):
    ws, cfg, store = env
    own = fact(store, "The glacier lantern order ships in March.")
    text = built(env, "Tell me about the glacier lantern order.", kind="fact", record=own).task.request
    assert HEADING not in text or f"- {own} " not in text


def test_outside_text_is_marked_and_makes_the_whole_packet_untrusted_while_the_persons_own_words_do_not(env):
    ws, cfg, store = env
    saved_input(ws, store, "Your glacier lantern order is delayed.", trust="untrusted")
    assert built(env).untrusted_material is True
    # with only the person's own text found, nothing outside came in
    ws2_store = store
    for found in ws2_store.read().list("source"):
        with ws2_store.transaction() as tx:
            tx.update("source", found.id, {"trust": "trusted"}, _TEST, read_version=found.version)
    packet = built(env)
    assert packet.untrusted_material is False and "<untrusted" not in packet.task.request.split(HEADING)[1]


def test_material_above_the_level_the_accounts_may_see_is_left_out(env):
    ws, cfg, store = env
    saved_input(ws, store, "Your glacier lantern order is delayed.", sensitivity="restricted", title="Private note")
    text = built(env).task.request
    assert "Private note" not in text and "delayed" not in text
    saved_input(ws, store, "The glacier lantern order is confirmed.", sensitivity="internal", title="Open note")
    assert "confirmed" in built(env).task.request


def test_a_conversation_in_an_area_finds_nothing_filed_under_a_sibling_area(env):
    ws, cfg, store = env
    personal = cfg.workspace.project.personal
    health = make(store, "project", name="Health", area=True, parent=personal)
    garden = make(store, "project", name="Garden", area=True, parent=personal)
    clinic = make(
        store, "action", text="Book the clinic visit", owners=[{"person": cfg.workspace.user.person}], project=health
    )
    fact(store, "The glacier lantern clinic is open on Fridays.", project=health)
    fact(store, "The glacier lantern hedge needs cutting in May.", project=garden)
    text = built(env, "What about the glacier lantern?", record=clinic).task.request
    assert "clinic is open on Fridays" in text
    assert "hedge needs cutting" not in text


def test_the_search_is_logged_on_the_run_with_what_was_searched_for_and_what_was_sent(env):
    ws, cfg, store = env
    old = fact(store, "The glacier lantern order ships in March.")
    packet = built(env)
    (searched,) = packet.knowledge.pack_searches
    assert searched.words.startswith(WORDS) and searched.results == 1 and searched.sent == [old]
    assert set(searched.kinds) == {"facts", "inputs", "records", "knowledge"}
    assert packet.task.knowledge["pack_searches"][0]["sent"] == [old]


def test_a_setting_of_zero_brings_in_nothing_and_the_limit_is_the_setting(env):
    ws, cfg, store = env
    for n in range(4):
        fact(store, f"The glacier lantern order number {n} ships in March.")
    cfg.steward.conversation.history_results = 2
    text = built(env).task.request
    assert text.split(HEADING)[1].split("<question>")[0].count("\n- ") == 2
    cfg.steward.conversation.history_results = 0
    packet = built(env)
    assert HEADING not in packet.task.request and not packet.knowledge.pack_searches


def test_nothing_matching_says_nothing_and_a_conversation_about_nothing_in_particular_searches_nothing(env):
    ws, cfg, store = env
    packet = built(env, "Zzyzx quuxbert?")
    assert HEADING not in packet.task.request
    assert packet.knowledge.pack_searches and packet.knowledge.pack_searches[0].results == 0


def test_a_conversation_on_a_saved_input_has_its_words_marked_as_outside_text(env):
    ws, cfg, store = env
    mail = saved_input(ws, store, "Please confirm the glacier lantern order by Friday.", title="Supplier mail")
    packet = built(env, "What does this ask of me?", kind="source", record=mail)
    text = packet.task.request
    assert "The words of it:" in text
    assert f'<untrusted source="{mail}">Please confirm the glacier lantern order by Friday.</untrusted>' in text
    assert packet.untrusted_material is True
    own = saved_input(ws, store, "Remember the glacier lantern order.", trust="trusted", title="My note")
    mine = built(env, "What does this say?", kind="source", record=own).task.request
    assert (
        "The words of it:\nRemember the glacier lantern order." in mine
        and "<untrusted" not in mine.split("The words of it:")[1].split("# ")[0]
    )


@pytest.mark.parametrize(
    "kind", ["organization", "team", "series", "source", "fact", "note", "rule", "lesson", "glossary_entry"]
)
def test_every_kind_of_record_with_a_page_can_be_talked_about(env, kind):
    ws, cfg, store = env
    found = next(iter(store.read().list(kind)), None)
    if found is None:
        pytest.skip(f"the fixtures have no {kind}")
    assert store.read().get("request", conversation.say(store, kind, found.id, "Tell me about it.")).data["about"] == {
        "kind": kind,
        "id": found.id,
    }

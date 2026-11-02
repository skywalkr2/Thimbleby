"""Questions about unknown words (design 6.8, 6.22): capped per day, shown on Today as one Review line, never raised
again once dropped, and asked only for words that may mean something particular here. Names and ids come from the
fixtures; the AI is the stub.
"""

from __future__ import annotations

from datetime import timedelta

import pytest

from engine import new_terms
from engine.ai.adapters.stub import set_responder
from engine.applier import apply_as_person
from engine.evaluate import load_cases as load_eval_cases
from engine.storage import Store
from engine.today_queue import queue
from engine.workspace import init_workspace
from tests.conftest import DEMO_A, DEMO_B, fixture_records
from tests.test_evaluate_harness import run_edited
from tests.test_learn_input import NOW, asked, scan

CASE_IDS = ("common-words-raise-no-term-question", "acronym-with-local-meaning-on-file-is-never-asked")
ASKED_ONCE = "unknown-acronym-asked-once"
#: Short abbreviations that often mean something particular where a person works.
AMBIGUOUS = ("hr", "pr", "qa", "it", "ceo", "cfo", "cto", "kpi", "roi", "pto", "api", "url")


@pytest.fixture
def env(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={}, flags={"storage.backups.automatic": False})
    store = Store(ws.db_path, cfg=cfg)
    yield ws, cfg, store
    store.close()
    set_responder(None)


def scan_at(env, text: str, now=NOW) -> list[str]:
    """The ids of the term questions an assistant that asks about every listed word makes for a note."""
    return scan(env, text, now)[1]


def test_the_day_has_a_cap_over_every_input_and_the_next_day_asks_again(env):
    _, cfg, store = env
    cfg.dispatch.knowledge.new_terms_per_input = 10
    assert cfg.dispatch.knowledge.new_terms_per_day == 3
    assert len(scan_at(env, "AAA, BBB, CCC, DDD and EEE are all new.")) == 3
    assert scan_at(env, "FFF and GGG are new too.") == []  # the day's questions are already asked
    tomorrow = NOW + timedelta(days=1)
    assert [new_terms.term_of(store.read().get("question", q)) for q in scan_at(env, "FFF and GGG.", tomorrow)] == [
        "FFF",
        "GGG",
    ]
    assert len(asked(store)) == 5


def test_a_cap_of_zero_per_day_asks_nothing(env):
    _, cfg, store = env
    cfg.dispatch.knowledge.new_terms_per_day = 0
    assert scan_at(env, "The XYZ gateway is new.") == [] and asked(store) == []


def test_the_days_term_questions_are_one_review_line_that_opens_them_together(env):
    ws, cfg, store = env
    cfg.dispatch.knowledge.new_terms_per_input = 10
    made = scan_at(env, "AAA, BBB and CCC are new.")
    lines = queue(ws, store, cfg, NOW)
    (line,) = [each for each in lines if each.kind == "terms"]
    assert (line.group, line.count, line.questions) == ("review", 3, made)
    # No question about a word is a line of its own.
    assert not {each.question for each in lines} & set(made)
    # Answering or dropping one takes it out of the line; with none left there is no line.
    apply_as_person(store, cfg, [{"op": "question.drop", "id": made[0], "reason": "Not needed"}], "Dropped")
    (line,) = [each for each in queue(ws, store, cfg, NOW) if each.kind == "terms"]
    assert line.questions == made[1:]
    for each in made[1:]:
        apply_as_person(store, cfg, [{"op": "question.drop", "id": each, "reason": "Not needed"}], "Dropped")
    assert not [each for each in queue(ws, store, cfg, NOW) if each.kind == "terms"]


def test_a_term_the_person_dropped_is_never_raised_again_whatever_the_day_or_the_input(env):
    _, cfg, store = env
    (qid,) = scan_at(env, "The HHH gateway is new.")
    apply_as_person(store, cfg, [{"op": "question.drop", "id": qid, "reason": "Not needed"}], "Dropped")
    assert store.read().get("question", qid).data["status"] == "dropped"
    assert new_terms.raised_terms(store.read()) == {"hhh"}
    month = NOW + timedelta(days=30)
    assert scan_at(env, "The HHH gateway is mentioned again, and again as hhh.", month) == []
    # Another word still gets its question, so the silence is for that one term.
    (other,) = scan_at(env, "The HHH and JJJ gateways.", month)
    assert new_terms.term_of(store.read().get("question", other)) == "JJJ"


def test_the_shipped_list_holds_only_unmistakable_names():
    data = new_terms.load_yaml(new_terms.KNOWN_TERMS_FILE.read_text(encoding="utf-8"))
    assert set(data) == {
        "countries",
        "time_zones",
        "mail_folders",
        "services",
        "file_types",
        "mail_abbreviations",
        "currencies",
        "places",
        "ordinary_words",
    }
    shipped = new_terms.shipped_known()
    assert not [word for word in AMBIGUOUS if word in shipped]
    assert {"usa", "utc", "inbox", "github"} <= shipped


def test_a_bare_state_code_in_a_note_is_asked_since_it_may_mean_something_here(env):
    _, _, store = env
    (qid,) = scan_at(env, "Ask the PA to book the room.")
    assert new_terms.term_of(store.read().get("question", qid)) == "PA"


def test_a_short_acronym_with_a_local_meaning_is_asked_unless_the_glossary_has_it(env):
    _, _, store = env
    (qid,) = scan_at(env, "Ask the BKR to book the room.")
    assert new_terms.term_of(store.read().get("question", qid)) == "BKR"


@pytest.mark.parametrize("template", [DEMO_A, DEMO_B])
def test_the_negative_cases_pass_in_both_workspaces_and_fail_when_the_rule_is_broken(monkeypatch, template):
    ids = {case["id"] for case in load_eval_cases(template)}
    assert set(CASE_IDS) <= ids
    for case_id in CASE_IDS:
        assert run_edited(monkeypatch, template, case_id).passed, case_id
    common, local = CASE_IDS
    # An assistant that asks about a made-up system name the input lists as unknown breaks the common-words case.
    case = next(c for c in load_eval_cases(template) if c["id"] == common)
    ask = {"op": "question.add", "to": "the user", "title": "-", "term": "QXZ"}
    broken = run_edited(
        monkeypatch,
        template,
        common,
        pasted=case["pasted"] + "\nThe QXZ gateway moved.",
        stub_answer={**case["stub_answer"], "ops": [ask]},
    )
    assert not broken.passed and broken.forbidden == ["term_question=True"]
    # Without the glossary entry on file, the acronym is listed, and an assistant that asks about it fails the case.
    case = next(c for c in load_eval_cases(template) if c["id"] == local)
    asks = {**case["stub_answer"], "ops": [{**ask, "term": "BKR"}]}
    unfiled = run_edited(monkeypatch, template, local, given=[], stub_answer=asks)
    assert not unfiled.passed and unfiled.forbidden == ["term_question=BKR"]
    # With the entry on file the word isn't listed, so the same answer is dropped and the case passes.
    assert run_edited(monkeypatch, template, local, stub_answer=asks).passed


@pytest.mark.parametrize("template", [DEMO_A, DEMO_B])
def test_the_case_for_an_unknown_acronym_passes_and_an_unlisted_word_is_never_asked(monkeypatch, template):
    assert run_edited(monkeypatch, template, ASKED_ONCE).passed
    case = next(c for c in load_eval_cases(template) if c["id"] == ASKED_ONCE)
    other = {**case["stub_answer"]["ops"][0], "term": "ZZZ", "title": "What does ZZZ mean here?"}
    made_up = run_edited(monkeypatch, template, ASKED_ONCE, stub_answer={**case["stub_answer"], "ops": [other]})
    assert not made_up.passed  # the word wasn't listed, so the question is left out and the expected one is missing


def test_a_question_about_a_word_is_never_a_top_priority(env):
    from engine.top_priorities import top_priorities

    _, cfg, store = env
    (qid,) = scan_at(env, "The XYZ gateway is new.")
    assert store.read().get("question", qid).data["status"] == "open"
    assert qid not in {line.question for line in top_priorities(store, cfg, NOW).lines}


# ---- the owner's noise: links, currencies, places, the sender, ordinary words (P106) --------------------------------

PAGE = fixture_records(DEMO_B, "project")[0]["links"][0]["url"]
HOST = PAGE.split("//", 1)[1].split("/", 1)[0]
MAIL_BODY = f"""From: Brightwater Utility <billing@brightwater-utility.{HOST}>
Subject: Your bill

Brightwater Utility has your bill. Pay USD 84.20 by AutoPay or visit
[Claim status]({PAGE}/UnclaimedProperty/Search?ClaimStatus=open) or <{PAGE}/ClaimStatus>.
Details: {HOST}/UnclaimedProperty/Search.aspx?ClaimStatus=open&Mode=Full and the page /UnclaimedProperty/ too.
Our MISSOURI and TEXAS offices answer. BRIGHTWATER thanks you.
"""


def test_text_in_a_link_a_path_or_a_query_string_raises_no_term(env):
    text = "\n".join(line for line in MAIL_BODY.splitlines() if not line.startswith(("From:", "Subject:")))
    found = [t for t, _ in new_terms.candidates(text, ["\\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\\b"], [])]
    assert found == ["AutoPay"]  # only the ordinary joining is left, which the scan then leaves out
    assert scan_at(env, MAIL_BODY) == []


def test_currency_codes_places_the_sender_and_ordinary_words_raise_no_term(env):
    _, _, store = env
    for text in (
        "Pay USD 84.20 or EUR 10.",
        "The MISSOURI office and the ONTARIO office.",
        "Switch on AutoPay and ClaimStatus for the account.",
        "CLAIM the UnclaimedProperty today.",
        MAIL_BODY,
    ):
        assert scan_at(env, text) == [], text
    assert not [q for q in store.read().list("question") if new_terms.term_of(q)]


def test_the_senders_own_name_is_not_a_term_but_an_unknown_word_in_the_same_note_still_is(env):
    _, _, store = env
    note = f"From: Brightwater Utility <billing@brightwater-utility.{HOST}>\n\nBRIGHTWATER says the QXZ desk calls."
    (qid,) = scan_at(env, note)
    assert new_terms.term_of(store.read().get("question", qid)) == "QXZ"


def test_the_ordinary_words_are_data_and_no_ambiguous_short_code_is_among_them():
    ordinary = new_terms.ordinary_words()
    assert {"auto", "pay", "claim", "status", "property", "unclaimed"} <= ordinary
    assert not [word for word in AMBIGUOUS if word in ordinary]
    assert {"usd", "eur", "missouri"} <= new_terms.shipped_known()
    assert new_terms.is_ordinary("AutoPay", ordinary) and not new_terms.is_ordinary("QxzPay", ordinary)


# ---- the assistant decides: the scan only lists, the request carries the list ----------------------------------------

COLLEAGUE = fixture_records(DEMO_B, "person")[1]


def packet_of(env, text: str):
    from engine.intake import hand_in
    from engine.packet import build

    ws, cfg, store = env
    handed = hand_in(ws, store, pasted=text, now=NOW)
    return build(ws, store, cfg, handed.request, NOW.date())


def test_the_scan_lists_candidates_and_makes_no_question(env):
    _, cfg, store = env
    text = "Can you send the QBR deck before the CAB review? FYI the USA team uses AutoPay."
    assert [w for w, _ in new_terms.unknown_words(store, cfg, text)] == ["QBR", "CAB"]
    assert asked(store) == []


def test_a_notes_request_holds_the_block_of_unknown_words_only_when_the_input_has_some(env):
    packet = packet_of(env, "Can you send the QBR deck before the CAB review?")
    assert '<unknown_words ask_at_most="3">\nQBR, CAB\n</unknown_words>' in packet.task.request
    quiet = packet_of(env, "Please send the deck before the review on Friday.")
    assert "unknown_words" not in quiet.task.request
    # The guidance on when to ask is the prompt's, not the code's.
    assert "<unknown_words" in packet.task.instructions and "ordinary name" in packet.task.instructions


def test_no_block_is_listed_when_the_limits_leave_no_room(env):
    _, cfg, store = env
    cfg.dispatch.knowledge.new_terms_per_day = 0
    assert "unknown_words" not in packet_of(env, "Can you send the QBR deck?").task.request


def test_a_word_the_person_dropped_is_left_out_of_the_block(env):
    _, _, store = env
    (qid,) = scan_at(env, "The QBR deck is late.")
    apply_as_person(store, env[1], [{"op": "question.drop", "id": qid, "reason": "Not a term"}], "Dropped")
    assert "unknown_words" not in packet_of(env, "The QBR deck is late again.").task.request


def test_mail_from_a_colleague_asks_what_its_acronyms_mean_and_says_whose_mail_it_was(env):
    _, _, store = env
    sender = f"{COLLEAGUE['full_name']} <{COLLEAGUE['how_to_reach']['email']}>"
    mail = f"From: {sender}\n\nCan you send the QBR deck before the CAB review?"
    made = scan_at(env, mail)
    questions = [store.read().get("question", q).data for q in made]
    assert [q["title"] for q in questions] == ["What does QBR mean here?", "What does CAB mean here?"]
    assert questions[0]["text"] == (
        f"It came up in mail from {COLLEAGUE['full_name']}: Can you send the QBR deck before the CAB review?"
    )


def test_a_product_name_in_the_persons_own_note_is_asked_and_says_it_is_from_their_notes(env):
    _, _, store = env
    (qid,) = scan_at(env, "Move the LoadHub rollout to next month.")
    data = store.read().get("question", qid).data
    assert data["title"] == "What does LoadHub mean here?"
    assert data["text"] == "It came up in your notes: Move the LoadHub rollout to next month."


def test_a_question_about_a_word_the_request_didnt_list_is_left_out(env):
    def asks_about_two(task):
        import json

        ops = [
            {"op": "question.add", "to": "x", "title": "-", "term": "LISTED"},
            {"op": "question.add", "to": "x", "title": "-", "term": "MADEUP"},
        ]
        return json.dumps({"summary": "Read.", "topic": "a topic", "ops": ops})

    _, made = scan(env, "The LISTED gateway is new.", responder=asks_about_two)
    assert [new_terms.term_of(env[2].read().get("question", q)) for q in made] == ["LISTED"]


def test_a_term_question_is_the_one_line_on_today_that_opens_the_words(env):
    ws, cfg, store = env
    made = scan_at(env, "The QBR and CAB are new.")
    (line,) = [each for each in queue(ws, store, cfg, NOW) if each.kind == "terms"]
    assert line.questions == made and line.count == 2

"""The assistant files its own items (design 6.32, P110 J10). A project it gives is kept as it is. When it leaves the
project empty and the rules' signals would file the item, the answer goes back once with the rules' best guess as a
hint (`project-unfiled`); its second answer stands, and a project still empty gets the guess, marked unsure
(`filed_by.unsure`) so the person's review of guessed items covers it. The person's own settled project is not a guess
and files without the question. Names and ids come from the fixtures."""

from __future__ import annotations

import json

from engine import filing, packet, sides
from engine.ai.adapters.stub import set_responder
from engine.ai.router import Router
from engine.applier import JUDGMENT_LINTS
from engine.dispatcher import process
from engine.intake import hand_in
from tests import test_sides as shared
from tests.test_sides import (
    BUSINESS_ID,
    BUSINESS_PEOPLE,
    NOW,
    PERSONAL_ID,
    PERSONAL_PEOPLE,
    WEEK_PERSON,
    address,
    make_project,
)

base, env = shared.base, shared.env  # a workspace with Personal, one business side and people on each side

RETURNED = "Your previous answer had these problems"
QUOTE = "Could you look at it this week?"
TEXT = "Look at the request"


def mail_from(person: dict) -> str:
    return (
        f"From: {person['full_name']} <{address(person)}>\nTo: {WEEK_PERSON['address']}\nSubject: A request\n\n{QUOTE}"
    )


def to_do(**more) -> dict:
    return {
        "op": "action.add",
        "text": TEXT,
        "owners": [WEEK_PERSON["name"]],
        "evidence": {"quote": QUOTE},
        **more,
    }


def run(env, pasted: str, *answers: dict, project: str | None = None):
    """Hand the text in; the assistant gives the first answer, then the next each time it is sent back. Returns the
    requests it received and the to-do that was made."""
    ws, cfg, store = env
    seen: list[str] = []

    def respond(task) -> str:
        seen.append(task.request)
        return json.dumps({"summary": "A request.", "ops": [answers[min(len(seen), len(answers)) - 1]]})

    set_responder(respond)
    handed = hand_in(ws, store, pasted=pasted, now=NOW, project=project)
    process(ws, store, cfg, Router(cfg, store, env={}), handed.request, now=NOW)
    (made,) = [a for a in store.read().list("action") if a.data["text"] == TEXT]
    return seen, made


def returned(seen: list[str]) -> list[str]:
    return [r for r in seen if RETURNED in r]


def test_the_lint_is_a_judgment_lint_put_once_and_returns_by_default(env):
    _, cfg, _ = env
    assert "project-unfiled" in JUDGMENT_LINTS and cfg.checks.lints["project-unfiled"] == "return"


def test_the_notes_packet_lists_each_project_with_its_other_names_and_its_side(env):
    _, cfg, store = env
    child = make_project(store, "Kitchen refit", PERSONAL_ID)
    record = store.read().get("project", child)
    with store.transaction() as tx:
        tx.update("project", child, {"aliases": ["the kitchen"]}, shared._PM, read_version=record.version)
    line = next(ln for ln in packet._projects(store, cfg).splitlines() if ln.startswith(f"- {child} "))
    assert "also called: the kitchen" in line and f"side: {sides.side_names(store.read(), cfg)[PERSONAL_ID]}" in line


def test_a_project_the_assistant_gave_is_kept_and_nothing_goes_back(env):
    _, _, store = env
    # The sender is on the business side; the assistant files it under Personal, and that stands.
    seen, made = run(env, mail_from(BUSINESS_PEOPLE[0]), to_do(project=PERSONAL_ID))
    assert len(seen) == 1 and returned(seen) == []
    assert made.data["project"] == PERSONAL_ID and made.data["filed_by"] is None


def test_a_project_left_empty_goes_back_once_with_the_rules_guess_and_the_second_answer_stands(env):
    _, cfg, store = env
    seen, made = run(env, mail_from(BUSINESS_PEOPLE[0]), to_do(), to_do(project=PERSONAL_ID))
    assert len(seen) == 2 and len(returned(seen)) == 1
    said = returned(seen)[0]
    business = sides.side_names(store.read(), cfg)[BUSINESS_ID]
    assert "You left the project empty for 'Look at the request'" in said
    assert f"The signals point to {business}" in said and "or leave it empty if you can't tell" in said
    # Asked exactly twice, never by a stronger tier; the project it then gave stands and is nobody's guess.
    assert [r.data["tier"] for r in store.read().list("run")] == ["routine", "routine"]
    assert made.data["project"] == PERSONAL_ID and made.data["filed_by"] is None


def test_a_project_still_empty_after_the_return_gets_the_guess_marked_unsure_and_joins_the_filing_review(env):
    _, cfg, store = env
    # A person on the personal side asks: the rules place it under Personal, where the filing review looks.
    seen, made = run(env, mail_from(PERSONAL_PEOPLE[0]), to_do(), to_do())
    assert len(seen) == 2 and len(returned(seen)) == 1
    assert made.data["project"] == PERSONAL_ID
    assert made.data["filed_by"] == {"by": "people", "word": None, "project": PERSONAL_ID, "unsure": True}
    assert made.id in [w.id for w in filing.waiting(store.read(), cfg)]


def test_a_guess_onto_a_side_is_applied_and_marked_unsure(env):
    _, _, store = env
    _, made = run(env, mail_from(BUSINESS_PEOPLE[0]), to_do(), to_do())
    assert made.data["project"] == BUSINESS_ID and made.data["filed_by"]["unsure"] is True


def test_nothing_to_guess_from_sends_nothing_back_and_keeps_the_existing_unsure_place(env):
    _, _, store = env
    nobody = f"From: Someone <someone@example.org>\nTo: {WEEK_PERSON['address']}\nSubject: Hello\n\n{QUOTE}"
    seen, made = run(env, nobody, to_do())
    assert len(seen) == 1 and returned(seen) == []
    assert made.data["project"] == PERSONAL_ID and made.data["filed_by"] is None


def test_the_project_the_person_settled_files_with_no_question_and_is_not_a_guess(env):
    _, _, store = env
    settled = make_project(store, "Settled by the person", BUSINESS_ID)
    seen, made = run(env, mail_from(PERSONAL_PEOPLE[0]), to_do(), project=settled)
    assert len(seen) == 1 and returned(seen) == []
    assert made.data["project"] == settled and made.data["filed_by"] is None

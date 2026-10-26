# ruff: noqa: F811
"""A retry may fix a failing op but never drop one (design 6.7, 6.16): when an answer is sent back for a failing op, the
corrected answer must carry every op that had no problem, unchanged, or it is refused and sent back again. Names come
from the fixtures; the stub AI stands in for a model."""

from __future__ import annotations

import json

from engine.ai.router import Router
from engine.applier import Problem
from engine.dispatcher import DROPPED, dropped_ops, fine_ops, parse, process
from engine.intake import hand_in
from tests.test_pipeline import NOW, answers, env, outcomes  # noqa: F401

INPUT = "The printer says proof copies will ship on November 5. The jacket proofs are due Friday."
GOOD = {"op": "fact", "text": "Proof ships Nov 5", "evidence": {"quote": "will ship on November 5"}}
JACKET = {"op": "fact", "text": "Jacket proofs due Friday", "evidence": {"quote": "jacket proofs are due Friday"}}
BAD = {"op": "fact", "text": "Proof ships Nov 6", "evidence": {"quote": "words nobody wrote"}}
FIXED = {"op": "fact", "text": "Proof ships Nov 5 for sure", "evidence": {"quote": "will ship on November 5"}}


def ops(*items):
    return parse(json.dumps({"ops": list(items)}))


def run(env, *replies, rounds=2):
    ws, cfg, store = env
    cfg.dispatch.fix_rounds = rounds
    asked = answers(*replies)
    handed = hand_in(ws, store, note="", pasted=INPUT, now=NOW)
    cs_id = process(ws, store, cfg, Router(cfg, store, env={}), handed.request, now=NOW)
    return asked, cs_id


def test_the_ops_that_had_no_problem_are_what_a_correction_must_keep():
    changeset = ops(GOOD, BAD, JACKET)
    problems = [Problem("evidence", "return", 1, "the quote isn't in the input")]
    fine = fine_ops(changeset, problems)
    assert len(fine) == 2
    corrected = ops(GOOD, FIXED, JACKET)
    assert dropped_ops(fine, corrected) == []
    shorter = ops(FIXED, JACKET)
    assert dropped_ops(fine, shorter) == ["fact"]
    changed = ops(GOOD, FIXED, {**JACKET, "text": "x"})
    assert dropped_ops(fine, changed) == ["fact"], "an op that was fine and came back different counts as dropped"
    twice = ops(GOOD, GOOD, FIXED)
    assert dropped_ops([fine[0], fine[0]], twice) == [], "each op is counted as often as it was"
    assert dropped_ops([fine[0], fine[0]], shorter) == ["fact", "fact"]


def test_a_problem_that_names_no_op_leaves_every_op_open_to_change():
    changeset = ops(GOOD, BAD)
    assert fine_ops(changeset, [Problem("shape", "return", None, "the answer as a whole")]) is None
    assert fine_ops(changeset, [Problem("tone", "warn", 1, "only a warning")]) == fine_ops(changeset, [])


def test_a_correction_that_keeps_every_op_that_was_fine_is_applied_whole(env):
    _, _, store = env
    asked, cs_id = run(env, {"ops": [GOOD, BAD, JACKET]}, {"ops": [GOOD, FIXED, JACKET]})
    assert len(asked) == 2 and DROPPED.split("{")[0] not in asked[1].request
    assert [o["status"] for o in outcomes(store, cs_id)] == ["applied"] * 3
    assert sorted(f.data["text"] for f in store.read().list("fact")) == sorted(
        [GOOD["text"], FIXED["text"], JACKET["text"]]
    )


def test_a_correction_that_drops_an_op_that_was_fine_is_sent_back_and_never_applied(env):
    _, _, store = env
    asked, cs_id = run(env, {"ops": [GOOD, BAD, JACKET]}, {"ops": [FIXED, JACKET]}, {"ops": [GOOD, FIXED, JACKET]})
    assert len(asked) == 3
    assert "left out these ops, which had no problem: fact" in asked[2].request
    assert "isn't in the input" in asked[2].request, "the problem is said again with the instruction to keep the rest"
    assert [o["status"] for o in outcomes(store, cs_id)] == ["applied"] * 3, (
        "the answer that kept everything is the one applied"
    )
    assert len(store.read().list("fact")) == 3
    assert [r.data["tier"] for r in store.read().list("run")] == ["routine"] * 3


def test_a_correction_that_still_drops_one_at_the_last_round_is_refused_and_the_stronger_tier_is_asked(env):
    _, _, store = env
    asked, cs_id = run(
        env, {"ops": [GOOD, BAD, JACKET]}, {"ops": [FIXED, JACKET]}, {"ops": [GOOD, FIXED, JACKET]}, rounds=1
    )
    tiers = [r.data["tier"] for r in store.read().list("run")]
    assert tiers == ["routine", "routine", "deep"], "the shortened answer wasn't applied: the stronger tier was asked"
    assert [o["status"] for o in outcomes(store, cs_id)] == ["applied"] * 3
    assert store.read().get("changeset", cs_id).data["run"] == store.read().list("run")[-1].id
    assert len(asked) == 3

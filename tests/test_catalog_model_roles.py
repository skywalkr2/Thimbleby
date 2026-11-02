"""The model picker's role words (design 7.14): every role the catalog gives an example is one of the three words
the screen offers, and names an example that entry lists. Read from the catalog file itself, not the loader."""

from __future__ import annotations

from pathlib import Path

import yaml

CATALOG = yaml.safe_load((Path(__file__).parent.parent / "catalog" / "ai-endpoints.yaml").read_text("utf-8"))
ROLE_WORDS = {"recommended", "stronger", "faster"}


def _entries() -> list[dict]:
    entries = CATALOG["endpoints"] if isinstance(CATALOG, dict) and "endpoints" in CATALOG else CATALOG
    return [e for e in entries if e.get("model_roles")]


def test_some_catalog_entry_gives_its_examples_roles():
    assert _entries()


def test_every_role_is_one_of_the_three_words_and_names_a_listed_example():
    for entry in _entries():
        examples = set(entry.get("model_examples") or [])
        for name, role in entry["model_roles"].items():
            assert role in ROLE_WORDS, f"{entry['id']}: {name} has role {role!r}"
            assert name in examples, f"{entry['id']}: role given to {name!r}, which the entry does not list"


def test_a_card_line_fits_a_card_and_an_entry_with_a_long_note_has_a_summary():
    """The card shows `summary` when an entry has one, else `note`: so whichever is shown is one short line."""
    from engine.setup import known_endpoints

    for entry in known_endpoints():
        shown = entry["summary"] or entry["note"]
        assert len(shown) <= 160, f"{entry['id']}: the card's line is {len(shown)} characters; give the entry a summary"
        assert shown.count(". ") <= 1, (
            f"{entry['id']}: the card's line is more than two sentences; give the entry a summary"
        )

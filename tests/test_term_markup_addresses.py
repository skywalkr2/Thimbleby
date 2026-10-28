"""Text that carries markup is read as text, and a postal address is read as an address (design 6.2, 6.22): no term
question asks what a state code, a street direction or a file type means, none shows markup, and a word that is really
unknown is still asked about. Names come from the fixtures; the addresses are invented."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
import yaml

from engine import addresses, new_terms
from engine.config import load_config
from engine.config.schema import LanguageFile
from engine.html_text import as_text, looks_like_html, to_text
from engine.intake import hand_in
from engine.language_words import language_words
from engine.packet import build
from engine.storage import Store
from engine.watch import refresh
from engine.workspace import init_workspace
from tests.conftest import DEMO_B, fixture_records

NOW = datetime(2030, 3, 4, 9, 0, tzinfo=UTC)
PEOPLE = fixture_records(DEMO_B, "person")
PAGE = fixture_records(DEMO_B, "project")[0]["links"][0]["url"]
SENDER = f"{PEOPLE[1]['full_name']} <{PEOPLE[1]['how_to_reach']['email']}>"
PATTERNS = language_words(LanguageFile(), "new_term_patterns")
IGNORE = language_words(LanguageFile(), "new_term_ignore")
POSTAL = addresses.address_patterns(LanguageFile())
MARKUP = '<table style="width: 648px; margin: 0"><tr><td style="padding: 4px">{}</td></tr></table>'


def found(text: str, shipped: bool = True) -> list[str]:
    """The terms the scan would raise in a text, with the core's well-known words left out as the app leaves them."""
    known = new_terms.shipped_known() if shipped else frozenset()
    return [t for t, _ in new_terms.candidates(text, PATTERNS, IGNORE, POSTAL) if t.lower() not in known]


# ---- markup ---------------------------------------------------------------------------------------------------------


def test_a_table_becomes_one_line_per_row_with_no_tags_and_the_words_kept():
    page = (
        '<html><head><title>Hidden</title><style>td { color: red }</style></head><body><table style="width: 648px">'
        '<tr><td style="padding: 4px">Thank you for filing a claim</td></tr>'
        "<tr><td>Claim&nbsp;number</td><td>12345 &amp; 67</td></tr></table>"
        f'<p>See <a href="{PAGE}/claims">your claim</a> or <a href="{PAGE}/">{PAGE.split("://", 1)[1]}</a>.'
        "</p><script>alert('x')</script><div>Last line</div><br><br><br><div>After a gap</div></body></html>"
    )
    assert to_text(page).splitlines() == [
        "Thank you for filing a claim",
        "Claim number 12345 & 67",
        f"See your claim ({PAGE}/claims) or {PAGE.split('://', 1)[1]}.",
        "Last line",
        "",
        "After a gap",
    ]


def test_text_with_no_markup_passes_through_unchanged_even_with_a_stray_angle_bracket():
    for text in (
        "Plain words.\n\n  Spaced   out\n",
        "if a<b and c>d then stop",
        "3 < 5 and 7 > 2",
        "Mail <me@example.com>",
    ):
        assert not looks_like_html(text)
        assert as_text(text) == text


def test_the_lines_before_the_first_tag_are_kept_as_they_are():
    text = f"From: {SENDER}\nSubject: A claim\n\n" + MARKUP.format("Your claim was received")
    assert as_text(text) == f"From: {SENDER}\nSubject: A claim\n\nYour claim was received"


# ---- addresses ------------------------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "text",
    [
        "Send it to 41 Quarry Lane, Fairhaven, MO 65810.",
        "Send it to 41 Quarry Lane NW\nFairhaven, MO 65810-1234\nUSA",
        "Where: 9 Harbor Row Suite 12, Port Alder, PA 19000, United States",
        "Where: 700 Fern Street, Mill Creek, ON K1A 0B1 Canada",
        "Where: Fairhaven, MO",
        "Mail to PO Box 114, Fairhaven, MO 65810",
        "Fairhaven, PA 19000",
    ],
)
def test_a_postal_address_raises_no_term_even_with_the_shipped_list_off(text):
    assert found(text, shipped=False) == []


def test_an_address_is_found_whole_over_one_line_or_two():
    one = "41 Quarry Lane NW, Fairhaven, MO 65810 USA"
    two = "41 Quarry Lane NW\nFairhaven, MO 65810\nUSA"
    for text in (one, two):
        assert addresses.blank(text, POSTAL).strip() == ""
    assert addresses.blank("Meet at 41 Quarry Lane, Fairhaven, MO 65810 about QXZ", POSTAL).split() == [
        "Meet",
        "at",
        "about",
        "QXZ",
    ]
    assert addresses.blank(two, POSTAL).count("\n") == two.count("\n")


def test_a_word_next_to_an_address_is_still_asked_and_a_state_code_in_prose_is_not_an_address():
    assert found("Ask QXZ about 41 Quarry Lane, Fairhaven, MO 65810.", shipped=False) == ["QXZ"]
    assert found("Hi Dana, PA will book the room.", shipped=False) == ["PA"]


def test_the_formats_are_data_a_workspace_can_replace():
    own = LanguageFile(address_patterns=[r"\bZONE[ \t]+{region}\b"], address_regions=["QQ"], address_countries=[])
    patterns = addresses.address_patterns(own)
    assert patterns == [r"\bZONE[ \t]+QQ\b"]
    assert addresses.blank("Go to ZONE QQ today", patterns).split() == ["Go", "to", "today"]
    assert addresses.address_patterns(LanguageFile(address_regions=[])) == [
        language_words(LanguageFile(), "address_patterns")[3]
    ]
    with pytest.raises(ValueError, match="regular expression"):
        LanguageFile(address_patterns=["(unclosed {region}"])


def test_the_shipped_list_knows_file_types_everyday_abbreviations_and_region_codes():
    shipped = new_terms.shipped_known()
    assert {
        "pdf",
        "docx",
        "xlsx",
        "csv",
        "jpg",
        "png",
        "zip",
        "faq",
        "eta",
        "rsvp",
        "asap",
        "fyi",
        "usa",
        "uk",
        "eu",
    } <= shipped
    assert {"am", "pm"} <= shipped
    assert not {"pa", "mo", "tx", "va", "ar", "md"} & shipped  # a bare region code may mean something particular
    assert not {"true", "false"} & shipped
    assert not {"hr", "qa", "it", "ceo", "kpi", "roi"} & shipped


# ---- the whole path: a watched mail and a watched calendar entry ----------------------------------------------------


def watch_workspace(tmp_path, items):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    source = {"id": "s", "connector": "fake", "label": "Board", "first_run": "all", "settings": {"items": items}}
    (ws.config_dir / "watch.yaml").write_text(yaml.safe_dump({"version": 1, "sources": [source]}))
    cfg = load_config(ws.config_dir, env={})
    return ws, cfg, Store(ws.db_path, cfg=cfg)


def questions(store) -> list[str]:
    return [str(new_terms.term_of(q)) for q in store.read().list("question") if new_terms.term_of(q)]


def read_in(tmp_path, items):
    """Read the items once; the stored text of each, the packet's input and the terms the scan asked about."""
    ws, cfg, store = watch_workspace(tmp_path, items)
    try:
        cfg.dispatch.knowledge.new_terms_per_input = 10
        cfg.dispatch.knowledge.new_terms_per_day = 10
        stored, asked = [], []
        for request_id in refresh(ws, store, cfg, "s", NOW).new:
            record = store.read().get("source", store.read().get("request", request_id).data["source"])
            stored.append((ws.sources_dir / f"{record.data['content_hash']}.txt").read_text())
            packet = build(ws, store, cfg, request_id, NOW.date())
            new_terms.scan(store, cfg, request_id, f"{packet.raw_input}\n{packet.note}", NOW, trust="untrusted")
            asked.append(packet.raw_input)
        quotes = [str(q.data["text"]) for q in store.read().list("question") if new_terms.term_of(q)]
        return stored, asked, questions(store), quotes
    finally:
        store.close()


def test_a_mail_whose_plain_part_is_a_table_is_stored_and_quoted_as_text_and_asks_only_what_is_unknown(tmp_path):
    body = MARKUP.format("Thank you for filing a claim. The attached PDF has the details.") + MARKUP.format(
        "Mail it to 41 Quarry Lane NW, Fairhaven, MO 65810, USA. Ask the QXZ desk first."
    )
    mail = {"key": "m1", "title": "Your claim", "text": f"From: {SENDER}\nSubject: Your claim\n\n{body}"}
    stored, shown, asked, quotes = read_in(tmp_path, [mail])
    body_of = lambda text: text.split("Subject: Your claim\n\n", 1)[1]  # noqa: E731 - the headers keep their brackets
    assert "<" not in body_of(stored[0]) and "<" not in body_of(shown[0])
    assert "Thank you for filing a claim" in stored[0] and "Fairhaven, MO 65810" in stored[0]
    assert asked == ["QXZ"]
    assert quotes and all("<" not in quote and "td" not in quote.split() for quote in quotes)
    assert quotes[0].endswith("Ask the QXZ desk first.") or "QXZ" in quotes[0]


def test_a_calendar_entry_whose_where_line_is_an_address_asks_nothing(tmp_path):
    entry = {
        "key": "e1",
        "title": "Site visit",
        "text": "Event: Site visit\nStarts: 2030-03-05 10:00\nWhere: 12 Maple Avenue, Port Alder, PA 19000",
    }
    _, _, asked, _ = read_in(tmp_path, [entry])
    assert asked == []


def test_the_status_words_the_app_writes_in_calendar_text_are_not_asked(tmp_path):
    entry = {
        "key": "e2",
        "title": "Site visit",
        "text": "Event: Site visit\nStarts: 2030-03-05 10:00\nStatus: CONFIRMED\nStatus: TENTATIVE\nStatus: CANCELLED",
    }
    _, _, asked, _ = read_in(tmp_path, [entry])
    assert asked == []
    assert found("Status: CONFIRMED", shipped=False) == []


def test_a_pasted_page_of_markup_is_kept_as_text(tmp_path):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    cfg = ws.config(env={})
    store = Store(ws.db_path, cfg=cfg)
    try:
        handed = hand_in(ws, store, pasted=MARKUP.format("Words &amp; more"), now=NOW)
        source = store.read().get("source", handed.source)
        assert (ws.sources_dir / f"{source.data['content_hash']}.txt").read_text() == "Words & more"
    finally:
        store.close()


def test_text_saved_before_markup_was_converted_is_not_handed_in_again_as_a_change(tmp_path, monkeypatch):
    from engine.extract import attached

    page = f"From: {SENDER}\n\n" + MARKUP.format("Your claim was received")
    mail = {"key": "m1", "title": "Your claim", "text": page}
    ws, cfg, store = watch_workspace(tmp_path, [mail])
    try:
        with monkeypatch.context() as old:
            old.setattr(attached, "as_text", lambda text: text)
            assert len(refresh(ws, store, cfg, "s", NOW).new) == 1
        again = refresh(ws, store, cfg, "s", NOW + timedelta(hours=1))
        assert again.new == [] and again.changed == []
        snapshot = store.read().list("snapshot")[0]
        assert (ws.sources_dir / f"{snapshot.data['content_hash']}.txt").read_text().endswith("Your claim was received")
        quiet = refresh(ws, store, cfg, "s", NOW + timedelta(hours=2))
        assert quiet.new == [] and quiet.changed == []
    finally:
        store.close()

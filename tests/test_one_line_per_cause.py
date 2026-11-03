"""One cause is one line on Today (design 7.7): requests that stopped for the same reason, and mailboxes missing the
same folder, are one line with a count and the things behind it."""

from types import SimpleNamespace

from engine import sent_folders, today_queue
from engine.today_queue import Line, _one_line_per_cause


def stopped(n: int, kind: str = "refused", waiting: str = "Say who you are first") -> Line:
    return Line(
        key=f"{kind}:r{n}", group="decide", kind=kind, request=f"r{n}", waiting=waiting, since=f"2026-01-{n:02d}"
    )


def test_thirteen_requests_with_one_cause_are_one_line_naming_the_count():
    members = [stopped(n) for n in range(1, 14)]
    lines = _one_line_per_cause({("refused", "decide", "no_person", "Say who you are first"): members})
    assert len(lines) == 1
    line = lines[0]
    assert line.count == 13 and line.kind == "refused" and line.state == "no_person"
    assert [m.request for m in line.items] == [m.request for m in members]
    assert line.since == "2026-01-01"


def test_a_request_that_stopped_alone_keeps_its_own_line_and_causes_stay_apart():
    alone = stopped(1)
    other = [stopped(2, waiting="Paused"), stopped(3, waiting="Paused")]
    lines = _one_line_per_cause(
        {
            ("refused", "decide", "no_person", "Say who you are first"): [alone],
            ("refused", "decide", "paused", "Paused"): other,
            ("failed", "risk", None, "Boom"): [stopped(4, "failed", "Boom")],
        }
    )
    assert lines[0] is alone
    assert lines[1].count == 2 and lines[1].state is None
    assert lines[2].request == "r4"
    assert len({line.key for line in lines}) == 3


def test_mailboxes_missing_the_sent_folder_are_one_line_with_their_names(monkeypatch, tmp_path):
    boxes = [sent_folders.Missing(f"s{n}", f"Mailbox {n}") for n in range(3)]
    monkeypatch.setattr(sent_folders, "missing", lambda cfg, connectors: boxes)
    monkeypatch.setattr(sent_folders, "dismissed", lambda private: set())
    monkeypatch.setattr(today_queue.watch, "connectors", lambda store: {})
    ws = SimpleNamespace(private_dir=tmp_path, root=tmp_path)
    cfg = SimpleNamespace(server=SimpleNamespace(mode="hosted"))
    lines = today_queue._folder_lines(ws, None, cfg)
    assert len(lines) == 1
    assert lines[0].count == 3 and lines[0].sources == ["s0", "s1", "s2"] and lines[0].names == [b.label for b in boxes]
    boxes[:] = boxes[:1]
    one = today_queue._folder_lines(ws, None, cfg)
    assert one[0].count == 1 and one[0].subject == "Mailbox 0" and one[0].source == "s0"

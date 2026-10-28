"""Markup turned into plain text, for text that arrives from any source (design 6.2, 6.22).

Some mail carries HTML in a part that is labeled as plain text, and a calendar description or a feed entry can too.
Whatever the source, the words are read as text: `as_text` leaves ordinary text as it is and converts text that holds
markup, so no question, quote, packet or stored text shows tags. Only the standard library reads the markup.

The conversion keeps one line per block element, a table row on one line, drops what the page never shows (scripts,
styles, the head), decodes entities, writes a link as "text (address)" only when the address differs from the text,
and collapses runs of blank lines. Lines before the first line that holds a tag (the headers of a mail) are kept as
they are.
"""

from __future__ import annotations

import re
from html.parser import HTMLParser

#: Tag names that mark text as markup. A tag with attributes counts only when an attribute has a value, so a stray
#: "<" and ">" around a few words of prose is not read as a tag.
_NAMES = (
    "html|head|body|meta|title|style|script|table|thead|tbody|tfoot|tr|td|th|div|p|br|hr|span|a|img|ul|ol|li|dl|dt|dd"
    "|h[1-6]|b|i|u|em|strong|font|center|blockquote|pre|section|article|header|footer|nav|form|label|small|sub|sup"
)
_TAG = re.compile(rf"</?(?:{_NAMES})(?:\s+[^<>]*=[^<>]*)?\s*/?>|<!doctype\s+html|<!--", re.IGNORECASE)
#: Elements whose start and end each begin a new line. A line break (`br`) adds a line of its own, so two in a row leave
#: a blank line; the boundaries of the elements below never do.
_BLOCKS = frozenset(
    {
        "address",
        "article",
        "aside",
        "blockquote",
        "body",
        "caption",
        "center",
        "dd",
        "details",
        "div",
        "dl",
        "dt",
        "fieldset",
        "figcaption",
        "figure",
        "footer",
        "form",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "hr",
        "html",
        "li",
        "main",
        "nav",
        "ol",
        "p",
        "pre",
        "section",
        "table",
        "tbody",
        "tfoot",
        "thead",
        "tr",
        "ul",
    }
)
_CELLS = frozenset({"td", "th"})
#: Elements whose content is never shown.
_HIDDEN = frozenset({"script", "style", "head", "template", "noscript"})
#: Characters that take no space on a page: zero-width marks and soft hyphens that mail adds as padding.
_INVISIBLE = dict.fromkeys(map(ord, "​‌‍‎‏⁠﻿͏­"))
_BOUNDARY = "\x00"
_BOUNDARIES = re.compile(r"(?:[ \t\xa0]*\x00)+")
_SPACES = re.compile(r"[ \t\r\f\v\xa0]+")
_SCHEME = re.compile(r"^(?:https?://|mailto:)", re.IGNORECASE)
_SKIPPED_LINKS = ("#", "javascript:", "tel:", "cid:", "data:")


def looks_like_html(text: str) -> bool:
    """Whether the text holds markup: a known tag, a doctype or a comment, not just a "<" in prose."""
    return _TAG.search(text) is not None


def _same(address: str, shown: str) -> bool:
    """Whether a link's address says nothing the link's text does not."""

    def plain(value: str) -> str:
        return _SCHEME.sub("", " ".join(value.split())).rstrip("/").lower()

    return plain(address) == plain(shown)


class _Reader(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.hidden = 0
        self.links: list[tuple[str, int]] = []
        self.pre = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in _HIDDEN:
            self.hidden += 1
        elif self.hidden:
            return
        elif tag == "br":
            self.parts.append("\n")
        elif tag in _BLOCKS:
            self.parts.append(_BOUNDARY)
            self.pre += tag == "pre"
        elif tag in _CELLS:
            self.parts.append(" ")
        elif tag == "a":
            self.links.append((dict(attrs).get("href") or "", len(self.parts)))

    def handle_endtag(self, tag: str) -> None:
        if tag in _HIDDEN:
            self.hidden = max(0, self.hidden - 1)
        elif self.hidden:
            return
        elif tag in _BLOCKS:
            self.parts.append(_BOUNDARY)
            self.pre = max(0, self.pre - (tag == "pre"))
        elif tag in _CELLS:
            self.parts.append(" ")
        elif tag == "a" and self.links:
            address, start = self.links.pop()
            shown = " ".join("".join(self.parts[start:]).split())
            address = address.strip()
            if address and not address.lower().startswith(_SKIPPED_LINKS) and not _same(address, shown):
                self.parts.append(f" ({address})" if shown else address)

    def handle_data(self, data: str) -> None:
        if not self.hidden:
            self.parts.append(data if self.pre else re.sub(r"\s+", " ", data))


def _lines(text: str) -> str:
    """Text with each line's spaces tidied and runs of blank lines made one blank line."""
    out: list[str] = []
    for line in _BOUNDARIES.sub("\n", text.translate(_INVISIBLE)).split("\n"):
        line = _SPACES.sub(" ", line).strip()
        if line or (out and out[-1]):
            out.append(line)
    return "\n".join(out).strip()


def to_text(markup: str) -> str:
    """The text a page of markup shows."""
    reader = _Reader()
    reader.feed(markup)
    reader.close()
    return _lines("".join(reader.parts))


def as_text(text: str) -> str:
    """The text itself when it holds no markup; otherwise its lines before the first one with a tag as they are, and
    the rest as the text the markup shows."""
    found = _TAG.search(text)
    if found is None:
        return text
    start = text.rfind("\n", 0, found.start()) + 1
    head, rest = text[:start], to_text(text[start:])
    return f"{head}{rest}" if rest else head.rstrip()

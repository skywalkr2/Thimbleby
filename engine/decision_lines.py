"""What a document lists as decided is a fact, never a choice someone made (design 6.7).

A line headed "Decided:" or "Decision:" in a list or table of a document is what the document lists: no one is said to
have chosen. The shipped words (`engine/defaults/decision_lines.yaml`) tell such a line from a sentence that names who
chose ("Kit decided to move the launch"), and a fact that says where it comes from ("The notes list the cover as
decided") from one that states the choice as true. The `decision-from-list` check (`engine.applier`) uses them; they
are read from the file the core ships beside the other defaults, one list for each language.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import cache
from pathlib import Path

from engine.yaml_load import load_yaml

WORDS_FILE = Path(__file__).parent / "defaults" / "decision_lines.yaml"
DEFAULT_LANGUAGE = "en"
#: What may stand before the label on a list line: spaces, bullets, a number, a checkbox, a quote mark, a table bar.
_MARKERS = r"[\s>*•·▪‣|\-–—]*(?:\d+[.)]\s*)?(?:\[[ xX]?\]\s*)?[\s|]*"


@dataclass(frozen=True)
class DecisionWords:
    labels: tuple[str, ...]
    listing: tuple[str, ...]

    def list_line(self, text: str) -> str | None:
        """The first line of `text` that is a list line headed by one of the labels and a colon ("- Decided: the cover
        stays blue"), else None. "Decided by Kit: ..." and "Kit decided: ..." name who chose, so they are not."""
        if not self.labels:
            return None
        pattern = re.compile(
            rf"^{_MARKERS}(?:{'|'.join(re.escape(w) for w in self.labels)})\s*:\s*\S", re.IGNORECASE | re.MULTILINE
        )
        found = pattern.search(text)
        if found is None:
            return None
        end = text.find("\n", found.start())
        return text[found.start() : end if end != -1 else len(text)].strip()

    def says_where_from(self, text: str) -> bool:
        """Whether a fact's words say a document lists it, by one of the listing words."""
        return any(re.search(rf"(?<!\w){re.escape(w)}(?!\w)", text, re.IGNORECASE) for w in self.listing)


@cache
def _shipped() -> dict[str, DecisionWords]:
    data = load_yaml(WORDS_FILE.read_text(encoding="utf-8")) or {}
    return {
        str(tag): DecisionWords(
            tuple(str(w) for w in (words or {}).get("labels") or ()),
            tuple(str(w) for w in (words or {}).get("listing") or ()),
        )
        for tag, words in data.items()
    }


def shipped(language: str = DEFAULT_LANGUAGE) -> DecisionWords:
    """The shipped words for a language tag (its primary part is used: `en-US` reads the `en` list); the default
    language's when none ships for it."""
    tag = language.split("-", 1)[0].lower()
    found = _shipped()
    return found.get(tag) or found.get(DEFAULT_LANGUAGE) or DecisionWords((), ())

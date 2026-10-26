"""The kinds of mail the app tracks for the person instead of setting aside (design 6.5, 6.32): a bill or statement, an
order, and a shipping or delivery notice. Rules read the sender's address and the words of the subject and text, with
no AI run; the words are settings (`watch.mail_kinds`). Mail of these kinds is never set aside and is never sorted by
the assistant's sorting: it goes to the assistant as work, filed under the Personal project.

A kind matches when the subject holds one of its `subject_words`, or when the sender's address starts with one of its
`senders` words and the subject or text holds one of its `words`. The kinds are tried in the order shipping, order,
bill, so "your order has shipped" is a shipping notice and updates the order it belongs to.
"""

from __future__ import annotations

import re
from email.utils import parseaddr
from typing import Any

#: The kinds, in the order they are tried.
KINDS = ("shipping", "order", "bill")
#: How much of the text is read for the words.
TEXT_CHARS = 2000


def _has(text: str, words: list[str]) -> bool:
    return any(w.strip().lower() in text for w in words if w and w.strip())


def kind_of(settings: Any, sender: str, subject: str, text: str) -> str | None:
    """The kind of mail this is (shipping, order or bill), or None. `settings` is `watch.mail_kinds`; `sender` is an
    address (or a sender line), `subject` and `text` are the message's."""
    if not settings.enabled:
        return None
    local = parseaddr(sender)[1].strip().lower().partition("@")[0]
    subject, text = subject.lower(), text[:TEXT_CHARS].lower()
    for name in KINDS:
        rule = getattr(settings, name)
        if _has(subject, rule.subject_words):
            return name
        from_sender = local and any(local.startswith(w.strip().lower()) for w in rule.senders if w.strip())
        if from_sender and (_has(subject, rule.words) or _has(text, rule.words)):
            return name
    return None


def kind_of_change(settings: Any, change: dict[str, Any]) -> str | None:
    """The kind of a watched mail change (the facts triage reads), or None for anything that is not a message."""
    from engine.triage import sender_address

    if not change.get("message"):
        return None
    return kind_of(settings, sender_address(change), str(change.get("title") or ""), str(change.get("now") or ""))


_FROM = re.compile(r"^from:\s*(.+)$", re.I | re.M)
_SUBJECT = re.compile(r"^subject:\s*(.+)$", re.I | re.M)
_TITLE = re.compile(r"^(?:New|Changed) in [^:\n]*:\s*(.+)$", re.M)


def kind_of_input(settings: Any, raw_input: str | None) -> str | None:
    """The kind of mail an input's text is, or None when it does not look like a message (it has no From line)."""
    text = raw_input or ""
    sender = _FROM.search(text)
    if sender is None:
        return None
    subject = _SUBJECT.search(text) or _TITLE.search(text)
    return kind_of(settings, sender.group(1), subject.group(1) if subject else "", text)

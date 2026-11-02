"""The kinds of mail the app tracks for the person instead of setting aside (design 6.5, 6.32): a bill or statement, an
order, and a shipping or delivery notice. Mail of these kinds is never set aside: it goes to the assistant as work,
filed under the Personal project.

Which mail is of a kind is the assistant's sorting to say (`engine/mail_sorting.py`, which answers a `kind` for each
message; it is stored on the request as `mail_kind`). The words here (`watch.mail_kinds`) only narrow what it looks at:
they give the sorting run a hint beside each header, and they stand in for it when no sorting runs (the workspace sorts
by rules only, or the run could not be made).

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
#: The kinds the sorting run names, as against the word list's own names: a shipping notice is a delivery.
HINT_NAME = {"shipping": "delivery"}
#: The kinds that are tracked for the person and never set aside, as the sorting run names them.
TRACKED = ("bill", "order", "delivery")
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


def hint_of_change(settings: Any, change: dict[str, Any]) -> str | None:
    """What the words suggest about a watched mail change, as the sorting run names the kinds (bill, order or
    delivery), or None. Only a hint: the run decides."""
    found = kind_of_change(settings, change)
    return HINT_NAME.get(found, found) if found else None


def is_tracked(kind: str | None) -> bool:
    """Whether a kind the sorting run gave is one that is tracked and never set aside."""
    return kind in TRACKED


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


def automated_notice_sender(cfg: Any, raw_input: str | None, kind: str | None = None) -> str | None:
    """The sender of an input's text when its words look like an automated notice (a one-time code, a sign-in or
    security notice from a no-reply sender), or None. Only a hint for the assistant to weigh: the rules decide
    nothing from it. `kind` is the kind the assistant's sorting gave the mail ("none" included); a bill, an order or
    a delivery is never one, by the sorting's word or, when no sorting gave one, by the word list's. An input with no
    From line is not one."""
    from engine.triage import automated_code_mail

    auto = cfg.watch.automated_mail
    text = raw_input or ""
    sender = _FROM.search(text)
    if sender is None or not auto.set_aside:
        return None
    # No sorting gave a kind (sorting off, or the run could not be made): the word list stands in for it.
    known = kind if kind is not None else kind_of_input(cfg.watch.mail_kinds, text)
    if known and known != "none":
        return None
    subject = _SUBJECT.search(text) or _TITLE.search(text)
    change = {"message": {"sender": sender.group(1).strip()}, "title": subject.group(1) if subject else "", "now": text}
    if automated_code_mail(change, {"senders": auto.senders, "words": auto.words}) is None:
        return None
    return sender.group(1).strip()


def automated_notice_input(cfg: Any, raw_input: str | None, kind: str | None = None) -> bool:
    """Whether an input's text looks like an automated notice (`automated_notice_sender`)."""
    return automated_notice_sender(cfg, raw_input, kind) is not None

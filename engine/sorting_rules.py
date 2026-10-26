"""The person's own sorting rules for mail (design 6.5): "always set aside mail from this sender or domain as sales (or
automated notices)" and "never set aside mail from ...". A rule an earlier version wrote for personal mail is still
read (it files the mail under the Personal project), and a sender moves out of it when the person chooses another.
They are rules of the triage list, written through the settings save path. The app keeps one rule of its own per
choice, so the list stays short: the sender and domain lists of that rule grow, and a sender or domain moves out of
the other rules when the person changes their mind.
"""

from __future__ import annotations

from typing import Any

#: The name of the rule the app keeps for each choice.
NAMES = {
    "personal": "Personal mail you set aside",
    "sales": "Sales mail you set aside",
    "notices": "Automated notices you set aside",
    "never": "Mail you keep",
}
#: What a rule can be made for. Personal mail is never set aside, so no new rule is made for it.
CHOICES = ("sales", "notices", "never")


def _managed(rule: dict[str, Any], choice: str) -> bool:
    return rule.get("kind") == "sender-rule" and rule.get("set_aside") == choice and rule.get("name") == NAMES[choice]


def with_sender_rules(
    triage: list[dict[str, Any]], choice: str, senders: list[str], domains: list[str]
) -> list[dict[str, Any]]:
    """The triage list with these senders and domains added to the app's rule for `choice` (sales, notices or
    never) and taken out of its rules for the other choices, including an older rule for personal mail. A choice to
    keep goes first in the list; one to set aside goes after every rule that keeps mail, so keeping always wins."""
    if choice not in CHOICES:
        raise ValueError("choose sales, notices or never")
    senders = _unique(s.strip().lower() for s in senders if s.strip())
    domains = _unique(d.strip().lower().removeprefix("@") for d in domains if d.strip())
    rules = [dict(r) for r in triage]
    for other in NAMES:
        if other == choice:
            continue
        for rule in rules:
            if _managed(rule, other):
                params = dict(rule.get("params") or {})
                params["senders"] = [s for s in params.get("senders", []) if s.lower() not in senders]
                params["domains"] = [d for d in params.get("domains", []) if d.lower() not in domains]
                rule["params"] = {k: v for k, v in params.items() if v}
    rules = [r for r in rules if not _emptied(r)]
    target = next((r for r in rules if _managed(r, choice)), None)
    if target is None:
        target = {"name": NAMES[choice], "kind": "sender-rule", "params": {}, "set_aside": choice}
        rules.insert(0 if choice == "never" else _after_keeps(rules), target)
    params = dict(target.get("params") or {})
    params["senders"] = _unique([*params.get("senders", []), *senders])
    params["domains"] = _unique([*params.get("domains", []), *domains])
    target["params"] = {k: v for k, v in params.items() if v}
    return rules


def _emptied(rule: dict[str, Any]) -> bool:
    params = rule.get("params") or {}
    return (
        rule.get("kind") == "sender-rule"
        and rule.get("name") in NAMES.values()
        and not params.get("senders")
        and not params.get("domains")
    )


def _after_keeps(rules: list[dict[str, Any]]) -> int:
    last = [i for i, r in enumerate(rules) if r.get("set_aside") == "never"]
    return last[-1] + 1 if last else 0


def _unique(values: Any) -> list[str]:
    seen: dict[str, None] = {}
    for value in values:
        seen.setdefault(value, None)
    return list(seen)

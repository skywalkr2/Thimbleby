"""The note to each person told about a to-do that is dropped (design 6.12, 7.6): one outward act per person, drafted
as the person's own change, that waits in Waiting to go out for their yes on its exact content and goes only through
the publisher. Every way of dropping a to-do that reached people uses this one helper (`note_the_drops`), so the
account chosen, the channel and the words are the same wherever the person drops it. Each draft's change is linked
from the change that dropped the to-dos (`followups`), so Undo of the drop takes the notes back with it. Nothing is
sent here."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine import act_accounts, endings
from engine.applier import apply_as_person
from engine.channels import COPY
from engine.config import Config
from engine.names import People
from engine.storage import Store, StoreError, WriteContext


def serving(store: Store, account: str, kind: str, action: str) -> tuple[str, Any] | None:
    """The channel that serves this kind of account and does this action, else the first that serves the account for
    this kind of target (so the draft is refused with its own reason); None when none serves the account."""
    kind_of = act_accounts.kind_of(account)
    found = [
        (name, channel)
        for name, channel in sorted(store.plugins.channels().items())
        if not channel.manual and channel.accounts and kind_of in channel.accounts and kind in channel.kinds
    ]
    return next(((n, c) for n, c in found if c.takes(kind, action)), found[0] if found else None)


def chosen_account(store: Store, cfg: Config) -> str | None:
    """The account a new message goes through after the person's yes: the account their latest act named when acting
    is on for it and a channel sends messages through it, else the only account that can. Several that could and none
    chosen is no account: nothing is picked for the person."""
    view = store.read()

    def can(account: str | None) -> bool:
        if account is None or not act_accounts.acting_on(cfg, account):
            return False
        carrier = serving(store, account, "message", "send")
        return carrier is not None and carrier[1].takes("message", "send")

    picked = act_accounts.last_picked(view)
    able = [a.id for a in act_accounts.known(store, cfg) if can(a.id)]
    return picked if can(picked) else able[0] if len(able) == 1 else None


@dataclass
class DraftedNotes:
    """What drafting the notes made: each draft's change (which Undo takes back), the act it made, and the people the
    notes are to (person ids), in the order they were drafted."""

    changesets: list[str] = field(default_factory=list)
    acts: list[str] = field(default_factory=list)
    people: list[str] = field(default_factory=list)


def _draft_to(store: Store, cfg: Config, made: DraftedNotes, person: str, body: str) -> None:
    """One note to one person as an outward act: a message on the account that can carry it, else Copy. Someone with no
    way to be reached gets no draft."""
    account = chosen_account(store, cfg)
    carrier = serving(store, account, "message", "send") if account else None
    draft_op: dict[str, Any] = {
        "op": "act.draft",
        "channel": carrier[0] if carrier else COPY.name,
        "target": {
            "kind": "message",
            "action": "send",
            "recipients": [{"person": person, "kind": "email", "role": "to"}],
        },
        "parts": {"subject": cfg.language.messages.called_off_subject, "body": body},
    }
    if account:
        draft_op["account"] = account
    try:
        cs = apply_as_person(store, cfg, [draft_op], "Drafted a note about a dropped action")
    except (StoreError, ValueError):
        return  # someone with no way to reach them gets no draft; the drop stands, with its Undo
    made.changesets.append(cs)
    made.acts.append(store.read().get("changeset", cs).data["ops"][0]["records"][0]["id"])
    made.people.append(person)


def draft_grouped_notes(store: Store, cfg: Config, action_ids: list[str]) -> DraftedNotes:
    """One note to each person told about any of these to-dos, listing every one of them they were told about, one line
    each (a person told about one gets exactly the note `draft_notes` makes). For a project ending, which drops many."""
    view = store.read()
    pm = People(store, cfg).pm
    lines: dict[str, list[str]] = {}
    for action_id in dict.fromkeys(action_ids):
        action = view.get("action", action_id)
        if action is None:
            continue
        line = endings.called_off_line(cfg, action)
        for person in endings.told_people(view, cfg, pm, action):
            lines.setdefault(person, []).append(line)
    made = DraftedNotes()
    for person, each in lines.items():
        _draft_to(store, cfg, made, person, "\n".join(each))
    return made


def dropped_actions(store: Store, changeset_id: str) -> list[str]:
    """The ids of the actions a change dropped (its applied drops), for the notes a project's ending owes the people
    told about them."""
    found = store.read().get("changeset", changeset_id)
    if found is None:
        return []
    return [o["op"]["id"] for o in found.data["ops"] if o["status"] == "applied" and o["op"].get("op") == "action.drop"]


def note_the_drops(store: Store, cfg: Config, changeset_id: str, action_ids: list[str]) -> DraftedNotes:
    """Draft the notes owed for these dropped to-dos (`draft_grouped_notes`) and link each draft change from the change
    that dropped them, so Undo of that change takes the notes back unless one has gone out."""
    made = draft_grouped_notes(store, cfg, action_ids)
    if made.changesets:
        with store.transaction() as tx:
            found = tx.get("changeset", changeset_id)
            if found is not None:
                linked = [*(found.data.get("followups") or []), *made.changesets]
                tx.update(
                    "changeset",
                    changeset_id,
                    {"followups": linked},
                    WriteContext(actor="pm", trust="trusted", op="changeset.followups"),
                    read_version=found.version,
                )
    return made

"""A channel lists an account's folders and labels (design 6.12, plugin API 0.3.92): what a plugin registers, how the
core asks (a time limit, a short cache, a failure that is "no list"), the route and the options views that tell the
screens, and the picked folder's id reaching the channel while the approval shows its name. Built on the draft tests'
workspace; the listing channel is the fake channel standing in for an add-on's, serving a signed-in kind of account.
Names and ids are fictional, and every address is on example.com."""

from __future__ import annotations

import threading
from datetime import UTC, datetime, timedelta

import pytest

from engine import act_accounts
from engine.act_accounts import AccountInfo
from engine.channel_folders import FolderLists
from engine.channels import ChannelContext, ChannelFailed, ChannelFolder, FakeChannel
from tests.test_act_draft_api import ACCOUNT, MAILBOX, SIGNED_IN, client, message  # noqa: F401  (fixtures and helpers)
from tests.test_publisher import api  # noqa: F401  (the API fixture the client builds on)

CHANNEL = "demo/mail"
KIND = SIGNED_IN.split(":", 1)[0]
LISTED = [
    ChannelFolder("fld-archive", "Projects/Archive", "folder"),
    ChannelFolder("fld-receipts", "Receipts", "folder"),
    ChannelFolder("lbl-waiting", "Waiting", "label"),
]
HOST = "api.example.com"
NOW = datetime(2026, 10, 28, 9, 0, tzinfo=UTC)


@pytest.fixture
def listing(client, monkeypatch):  # noqa: F811
    """A signed-in account whose channel lists its folders and labels, and a message that came in on it."""
    fake = FakeChannel(accounts=(KIND,), folder_answer=list(LISTED))
    client.store.plugins.core_channels[CHANNEL] = fake.registration(CHANNEL)
    del client.store.plugins.core_channels["fake"]
    client.cfg.watch.acting.append(SIGNED_IN)
    client.listing = fake
    known = [AccountInfo(SIGNED_IN, "Demo (pat@example.com)", True)]
    monkeypatch.setattr(act_accounts, "known", lambda store, cfg: known)
    monkeypatch.setattr(act_accounts, "of_record", lambda view, store, cfg, record_id: SIGNED_IN)
    return client


def asked(client, account: str = SIGNED_IN) -> dict:  # noqa: F811
    found = client.get(f"/api/acts/accounts/{account}/folders")
    assert found.status_code == 200, found.text
    return found.json()


# ---- what a plugin registers -------------------------------------------------------------------------------------


def test_a_plugin_registers_a_channel_with_folders_when_it_declares_a_move_or_a_label():
    from engine.plugin_api import ChannelFolder as Exported
    from engine.plugin_api import Registrar, RegistrationRefused, Settings

    assert Exported is ChannelFolder
    registrar = Registrar("demo", Settings())

    def folders(account, context):
        return [ChannelFolder("a", "A")]

    registrar.channel(
        "demo/mail",
        "Demo mail",
        ["mailbox"],
        send=lambda act, key, context: None,
        actions={"mailbox": ["archive", "label"]},
        accounts=["demo-service"],
        folders=folders,
    )
    assert registrar.channels["demo/mail"].folders is folders

    def attempt(**more):
        registrar.channel("demo/other", "Other", ["mailbox"], send=lambda a, k, c: None, **more)

    for bad in (
        {"folders": folders},  # no actions declared: only archive, which files nothing anywhere
        {"folders": folders, "actions": {"mailbox": ["archive", "mark_read"]}},
        {"folders": "not a function", "actions": {"mailbox": ["move"]}},
    ):
        with pytest.raises(RegistrationRefused):
            attempt(**bad)
    attempt(actions={"mailbox": ["archive"]})  # no folders is as before
    assert registrar.channels["demo/other"].folders is None


# ---- how the core asks -------------------------------------------------------------------------------------------


def test_the_list_comes_back_through_the_route_for_the_account_the_channel_serves(listing):
    found = asked(listing)
    assert found["listed"] is True and found["reason"] is None
    assert [(f["id"], f["name"], f["kind"]) for f in found["folders"]] == [(f.id, f.name, f.kind) for f in LISTED]
    ((account, context),) = listing.listing.folder_calls
    assert account == SIGNED_IN and isinstance(context, ChannelContext) and context.account == SIGNED_IN


def test_a_failure_the_channel_names_is_the_reason_and_no_list(listing):
    for kind in ("auth", "refused", "outage", "offline"):
        listing.listing.folder_answer = ChannelFailed(kind, "The service said something of its own.")
        found = asked(listing)
        assert found == {"listed": True, "folders": [], "reason": kind}  # its kind, never its words


def test_a_raised_exception_and_a_bad_answer_are_no_list(listing):
    for answer in (RuntimeError("boom"), "not a list", [ChannelFolder("", "Nameless")], ["Receipts"], None):
        listing.listing.folder_answer = answer
        # None leaves the channel without folders at registration, so register it again with the answer in place
        listing.store.plugins.core_channels[CHANNEL] = listing.listing.registration(CHANNEL)
        found = asked(listing)
        if answer is None:
            assert found == {"listed": False, "folders": [], "reason": None}
        else:
            assert found == {"listed": True, "folders": [], "reason": "unavailable"}


def test_a_call_that_takes_longer_than_the_limit_is_no_list(listing):
    release = threading.Event()
    listing.cfg.watch.folders_timeout_seconds = 0.05

    class Slow(FakeChannel):
        def folders(self, account, context=None):
            release.wait(5)
            return list(LISTED)

    slow = Slow(accounts=(KIND,), folder_answer=list(LISTED))
    listing.store.plugins.core_channels[CHANNEL] = slow.registration(CHANNEL)
    try:
        assert asked(listing) == {"listed": True, "folders": [], "reason": "unavailable"}
    finally:
        release.set()


def test_an_answer_is_kept_for_its_time_and_a_failure_is_not(listing):
    lists = FolderLists(listing.store, listing.cfg)
    first = lists.get(SIGNED_IN, NOW)
    assert first.listed and first.folders == tuple(LISTED) and len(listing.listing.folder_calls) == 1
    inside = NOW + timedelta(minutes=listing.cfg.watch.folders_cache_minutes) - timedelta(seconds=1)
    assert lists.get(SIGNED_IN.upper().replace("DEMO-SERVICE", KIND), inside).folders == tuple(LISTED)
    assert len(listing.listing.folder_calls) == 1  # the account's address in another case is the same account
    after = NOW + timedelta(minutes=listing.cfg.watch.folders_cache_minutes, seconds=1)
    lists.get(SIGNED_IN, after)
    assert len(listing.listing.folder_calls) == 2

    listing.listing.folder_answer = ChannelFailed("outage", "down")
    later = after + timedelta(minutes=listing.cfg.watch.folders_cache_minutes, seconds=1)
    assert lists.get(SIGNED_IN, later).problem == "outage"
    assert lists.get(SIGNED_IN, later).problem == "outage"  # not kept: it asks again
    assert len(listing.listing.folder_calls) == 4

    listing.cfg.watch.folders_cache_minutes = 0
    listing.listing.folder_answer = list(LISTED)
    lists.get(SIGNED_IN, later)
    lists.get(SIGNED_IN, later)
    assert len(listing.listing.folder_calls) == 6  # 0 asks every time


def test_an_account_whose_channel_lists_nothing_or_that_isnt_known_gets_no_list(listing):
    plain = FakeChannel(accounts=(KIND,))
    listing.store.plugins.core_channels[CHANNEL] = plain.registration(CHANNEL)
    assert asked(listing) == {"listed": False, "folders": [], "reason": None}
    listing.store.plugins.core_channels[CHANNEL] = listing.listing.registration(CHANNEL)
    assert asked(listing, f"{KIND}:someone.else@example.com")["listed"] is False
    assert asked(listing, ACCOUNT)["listed"] is False  # a plain mailbox is listed by its source, not a channel
    assert len(listing.listing.folder_calls) == 0


# ---- what the screens are told -----------------------------------------------------------------------------------


def test_the_options_say_which_account_lists_its_folders(listing):
    mail = message(listing, "listed")
    options = listing.get("/api/acts/options", params={"record": mail}).json()
    assert {"move", "label"} <= set(options["actions"])
    assert options["folders_listed"] is True and options["folders_account"] == SIGNED_IN
    assert options["folder_source"] is None
    batch = listing.get("/api/acts/batch-options", params={"record": [mail]}).json()
    assert batch["folders_listed"] is True and batch["folders_account"] == SIGNED_IN and batch["folder_source"] is None

    listing.store.plugins.core_channels[CHANNEL] = FakeChannel(accounts=(KIND,)).registration(CHANNEL)
    none = listing.get("/api/acts/options", params={"record": mail}).json()
    assert none["folders_listed"] is False and none["folders_account"] is None


def test_a_plain_mailbox_keeps_its_own_list(client):  # noqa: F811
    mail = message(client, "plain")
    options = client.get("/api/acts/options", params={"record": mail}).json()
    assert options["folder_source"] == MAILBOX and options["folders_listed"] is True
    assert options["folders_account"] is None
    batch = client.get("/api/acts/batch-options", params={"record": [mail]}).json()
    assert batch["folder_source"] == MAILBOX and batch["folders_account"] is None


# ---- the picked folder reaches the channel as its id, and the approval shows its name ------------------------------


def test_a_move_carries_the_picked_id_to_the_channel_and_the_approval_shows_the_name(listing):
    mail = message(listing, "to-move")
    drafted = listing.post(
        "/api/acts", json={"kind": "mailbox", "action": "move", "about": [mail], "folder": "fld-archive"}
    )
    assert drafted.status_code == 200, drafted.text
    shown = drafted.json()
    assert shown["folder"] == "fld-archive" and shown["folder_name"] == "Projects/Archive"
    assert shown["label"] is None and shown["label_name"] is None

    sent = listing.post(
        f"/api/acts/{shown['id']}/send", json={"fingerprint": shown["fingerprint"], "acknowledged": []}
    ).json()
    assert sent["status"] == "sent"
    ((act, _),) = listing.listing.delivered
    assert act.folder == "fld-archive" and act.label is None and act.action == "move"


def test_a_label_carries_the_picked_id_and_a_typed_name_has_no_other_name(listing):
    mail = message(listing, "to-label")
    labeled = listing.post(
        "/api/acts", json={"kind": "mailbox", "action": "label", "about": [mail], "label": "lbl-waiting"}
    ).json()
    assert labeled["label"] == "lbl-waiting" and labeled["label_name"] == "Waiting" and labeled["folder_name"] is None
    typed = listing.post(
        "/api/acts", json={"kind": "mailbox", "action": "move", "about": [mail], "folder": "Typed by hand"}
    ).json()
    assert typed["folder"] == "Typed by hand" and typed["folder_name"] is None
    # an id of the other kind is not named as this one
    wrong = listing.post(
        "/api/acts", json={"kind": "mailbox", "action": "move", "about": [mail], "folder": "lbl-waiting"}
    ).json()
    assert wrong["folder_name"] is None


def test_a_folder_name_from_anyone_but_the_person_on_a_screen_is_dropped(listing):
    """The approval shows the name of a picked folder; only the person's screen, which reads it from the account's own
    list, may give it. A draft from the assistant that names the folder gets no name, so the approval shows the id."""
    from tests.test_knowledge_records import apply

    mail = message(listing, "named-elsewhere")
    target = {"kind": "mailbox", "action": "move", "about": [mail], "folder": "fld-archive"}
    op = {"op": "act.draft", "channel": CHANNEL, "account": SIGNED_IN, "parts": {}}
    op["target"] = target | {"folder_name": "Inbox", "label_name": "Keep"}
    # the assistant drafting from the person's own note, applied on their yes (content from outside can't draft an act)
    cs_id, statuses = apply(
        listing.store, listing.cfg, [op], origin="pm", trust="trusted", actor="assistant", confirmed=True
    )
    from tests.test_knowledge_records import reasons

    assert statuses == ["applied"], (statuses, reasons(listing.store, cs_id))
    made = listing.store.read().get("changeset", cs_id).data["ops"][0]["records"][0]["id"]
    stored = listing.store.read().get("act", made).data["target"]
    assert stored["folder"] == "fld-archive" and stored["folder_name"] is None and stored["label_name"] is None


def test_the_name_does_not_change_what_the_yes_covers(listing):
    mail = message(listing, "covered")
    shown = listing.post(
        "/api/acts", json={"kind": "mailbox", "action": "move", "about": [mail], "folder": "fld-receipts"}
    ).json()
    listing.listing.folder_answer = [ChannelFolder("fld-receipts", "Receipts, renamed")]
    again = listing.get(f"/api/acts/{shown['id']}").json()
    assert again["fingerprint"] == shown["fingerprint"] and again["folder_name"] == "Receipts"


def test_a_selection_is_asked_once_and_each_act_carries_the_id_and_name(listing):
    ids = [message(listing, f"batch-{n}") for n in range(3)]
    made = listing.post("/api/acts/batch", json={"action": "move", "about": ids, "folder": "fld-receipts"})
    assert made.status_code == 200, made.text
    acts = made.json()["acts"]
    assert {(a["folder"], a["folder_name"]) for a in acts} == {("fld-receipts", "Receipts")} and len(acts) == 3
    assert len(listing.listing.folder_calls) == 1
    done = listing.post(
        "/api/acts/batch/send", json={"acts": [{"id": a["id"], "fingerprint": a["fingerprint"]} for a in acts]}
    ).json()
    assert [r["status"] for r in done["results"]] == ["sent"] * 3
    assert {act.folder for act, _ in listing.listing.delivered} == {"fld-receipts"}

    labels = listing.post("/api/acts/batch", json={"action": "label", "about": ids, "label": "lbl-waiting"}).json()
    assert {(a["label"], a["label_name"]) for a in labels["acts"]} == {("lbl-waiting", "Waiting")}


def test_a_channel_that_cannot_list_still_takes_a_typed_folder(listing):
    listing.listing.folder_answer = RuntimeError("down")
    listing.store.plugins.core_channels[CHANNEL] = listing.listing.registration(CHANNEL)
    mail = message(listing, "typed")
    shown = listing.post(
        "/api/acts", json={"kind": "mailbox", "action": "move", "about": [mail], "folder": "Receipts"}
    ).json()
    assert shown["folder"] == "Receipts" and shown["folder_name"] is None


# ---- the testing kit ----------------------------------------------------------------------------------------------


def test_the_testing_kit_calls_a_channels_folders_and_checks_the_answer():
    from engine.plugin_api import ConnectorError
    from engine.plugin_api.testing import Reply, channel_context, channel_folders

    def service(asked):
        if asked.path == "/v1/labels" and asked.headers.get("authorization") == "Bearer token":
            return Reply(json={"labels": [{"id": "Label_1", "name": "Receipts"}]})
        return Reply(status=401)

    def folders(account, context):
        try:
            found = context.web.get(
                f"https://{HOST}/v1/labels", headers={"Authorization": f"Bearer {context.access_token()}"}
            )
        except ConnectorError:
            return ChannelFailed("auth", "Sign in again.")
        return [ChannelFolder(item["id"], item["name"], "label") for item in found.json()["labels"]]

    account = "demo-service:pat@example.com"
    context = channel_context(service, network=[HOST], account=account, token="token")
    assert channel_folders(folders, account, context) == [ChannelFolder("Label_1", "Receipts", "label")]
    signed_out = channel_context(service, network=[HOST], account=account, token="other")
    assert channel_folders(folders, account, signed_out) == ChannelFailed("auth", "Sign in again.")
    with pytest.raises(ValueError):
        channel_folders(lambda account, context: ["Receipts"], account, context)
    with pytest.raises(RuntimeError):
        channel_folders(
            lambda account, context: (_ for _ in ()).throw(RuntimeError("seen by the test")), account, context
        )


# ---- an add-on's own account id, which names its plugin -----------------------------------------------------------

#: An add-on's sign-in account is `<plugin>/<sign-in>:<address>`: the slash must reach the routes whole.
ADDON_ACCOUNT = "demo/account:pat@example.com"


@pytest.fixture
def addon(client, monkeypatch):  # noqa: F811
    """A signed-in account of an add-on whose channel only files messages (no reply), and lists its folders."""
    fake = FakeChannel(
        accounts=("demo/account",),
        folder_answer=list(LISTED),
        kinds=("mailbox",),
    )
    client.store.plugins.core_channels[CHANNEL] = fake.registration(CHANNEL)
    del client.store.plugins.core_channels["fake"]
    client.cfg.watch.acting.append(ADDON_ACCOUNT)
    client.listing = fake
    known = [AccountInfo(ADDON_ACCOUNT, "Demo (pat@example.com)", True)]
    monkeypatch.setattr(act_accounts, "known", lambda store, cfg: known)
    monkeypatch.setattr(act_accounts, "of_record", lambda view, store, cfg, record_id: ADDON_ACCOUNT)
    return client


def test_an_add_on_accounts_folders_are_listed_through_its_slash(addon):
    from urllib.parse import quote

    found = addon.get(f"/api/acts/accounts/{quote(ADDON_ACCOUNT, safe='')}/folders")
    assert found.status_code == 200, found.text
    assert found.json()["listed"] is True
    assert [f["name"] for f in found.json()["folders"]] == [f.name for f in LISTED]


def test_a_channel_that_only_files_messages_offers_its_mailbox_acts(addon):
    mail = message(addon, "filed-only")
    offered = addon.get("/api/acts/options", params={"record": mail}).json()
    assert {"archive", "move", "label", "mark_read"} <= set(offered["actions"])
    assert offered["folders_listed"] is True and offered["folders_account"] == ADDON_ACCOUNT

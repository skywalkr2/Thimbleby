"""The several-accounts fakes (`tests.fake_services --accounts N --failing-account K`): each sign-in is a different
person with a mailbox and calendar of their own, the calendars and mailboxes interact in the ways a person with several
businesses sees, and one account can fail beside healthy ones. Every test goes through the calls the app makes: the
sign-in page, the token address, "who am I", and the mail and calendar reads.
With no flags the fakes answer as before."""

from datetime import datetime, timedelta

import pytest
from starlette.testclient import TestClient

from engine.clashes import Event, clashes
from tests import fake_services
from tests.fake_services import SECURE_SERVICES, State, build_app
from tests.test_fake_services import code_from, exchange, sign_in_page


def make(tmp_path, accounts=3, failing=0, how="expired"):
    state = State(tmp_path)
    state.accounts = accounts
    state.failing_account = failing
    state.failing_how = how
    return state, TestClient(build_app(state, 0, SECURE_SERVICES, helpers=False), follow_redirects=False)


def token_for(client, number):
    """Sign in as the numbered account (1 is the first), the way a popup that honours a login hint does."""
    hint = fake_services.account_address(number - 1)
    granted = exchange(client, code_from(sign_in_page(client, login_hint=hint, scope="mail.read calendar.read")))
    assert granted.status_code == 200
    return granted.json()["access_token"]


def get(client, path, token, **params):
    return client.get(path, params=params, headers={"Authorization": f"Bearer {token}"})


def mail(client, token):
    return get(client, "/mail/v1/messages", token).json()["messages"]


def calendar(client, token):
    return get(client, "/calendar/v1/events", token).json()["events"]


def test_with_no_flags_the_fakes_answer_as_before(tmp_path):
    state = State(tmp_path)
    client = TestClient(build_app(state, 0, SECURE_SERVICES, helpers=False), follow_redirects=False)
    token = exchange(client, code_from(sign_in_page(client))).json()["access_token"]
    assert get(client, "/account/v1/me", token).json() == {"email": fake_services.address_of(fake_services.people()[0])}
    now = state.moment
    assert mail(client, token) == fake_services.messages(now)
    assert calendar(client, token) == fake_services.events(now)
    # A sign-in hint changes nothing when there is one account, and the same person answers every time.
    again = exchange(client, code_from(sign_in_page(client, login_hint="anyone@example.com"))).json()["access_token"]
    assert get(client, "/account/v1/me", again).json() == get(client, "/account/v1/me", token).json()


def test_with_accounts_the_sign_in_page_offers_each_person_and_a_hint_picks_one(tmp_path):
    state, client = make(tmp_path)
    page = sign_in_page(client)
    assert page.status_code == 200 and page.headers["content-type"].startswith("text/html")
    for number in range(3):
        assert fake_services.account_address(number) in page.text
    assert sign_in_page(client, login_hint="nobody@example.com").status_code == 400


def test_two_sign_ins_give_two_different_accounts_each_with_its_own_mail_and_calendar(tmp_path):
    state, client = make(tmp_path)
    tokens = [token_for(client, n) for n in (1, 2, 3)]
    me = [get(client, "/account/v1/me", t).json()["email"] for t in tokens]
    assert me == [fake_services.account_address(n) for n in range(3)] and len(set(me)) == 3
    boxes = [{m["id"] for m in mail(client, t)} for t in tokens]
    days = [{e["id"] for e in calendar(client, t)} for t in tokens]
    assert all(boxes) and all(days)
    assert boxes[0].isdisjoint(boxes[1]) and days[0].isdisjoint(days[1]) and days[1].isdisjoint(days[2])


def test_a_renewed_token_stays_the_account_that_signed_in(tmp_path):
    _, client = make(tmp_path)
    hint = fake_services.account_address(1)
    granted = exchange(client, code_from(sign_in_page(client, login_hint=hint))).json()
    renewed = client.post(
        "/account/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": granted["refresh_token"],
            "client_id": "journey-mail-app",
        },
    ).json()
    assert get(client, "/account/v1/me", renewed["access_token"]).json() == {"email": hint}


def test_a_meeting_in_one_account_overlaps_one_in_another_and_shows_as_a_clash(tmp_path):
    _, client = make(tmp_path)
    found = []
    for number in (1, 2, 3):
        for e in calendar(client, token_for(client, number)):
            if e.get("all_day"):
                continue
            found.append(
                Event(
                    e["id"],
                    f"account-{number}",
                    datetime.fromisoformat(e["start"].replace("Z", "+00:00")),
                    datetime.fromisoformat(e["end"].replace("Z", "+00:00")),
                    "busy",
                )
            )
    report = clashes(found)
    across = [c for c in report.blocking if c.first.calendar_id != c.second.calendar_id]
    assert any({c.first.calendar_id, c.second.calendar_id} == {"account-1", "account-2"} for c in across)
    assert all(c.overlap_minutes > 0 for c in across)


def test_one_invitation_is_in_two_calendars_with_the_same_identity(tmp_path):
    _, client = make(tmp_path)
    first = {e["uid"]: e for e in calendar(client, token_for(client, 1)) if e.get("uid")}
    second = {e["uid"]: e for e in calendar(client, token_for(client, 2)) if e.get("uid")}
    shared = set(first) & set(second)
    assert len(shared) == 1
    (uid,) = shared
    one, two = first[uid], second[uid]
    assert (one["title"], one["start"], one["end"], one["organizer"]) == (
        two["title"],
        two["start"],
        two["end"],
        two["organizer"],
    )
    assert one["id"] != two["id"]


def test_the_calendars_hold_an_all_day_entry_and_a_read_only_entry(tmp_path):
    _, client = make(tmp_path)
    every = [e for n in (1, 2, 3) for e in calendar(client, token_for(client, n))]
    day = [e for e in every if e.get("all_day")]
    assert day and all(len(e["start"]) == 10 and len(e["end"]) == 10 for e in day)
    assert datetime.fromisoformat(day[0]["end"]) - datetime.fromisoformat(day[0]["start"]) == timedelta(days=1)
    locked = [e for e in every if e.get("read_only")]
    assert locked and all(not e.get("all_day") or e["read_only"] for e in locked)
    assert not all(e.get("read_only") for e in every)


def test_one_thread_is_copied_to_two_mailboxes(tmp_path):
    _, client = make(tmp_path)
    first = {m["thread"]: m for m in mail(client, token_for(client, 1)) if m.get("thread")}
    second = {m["thread"]: m for m in mail(client, token_for(client, 2)) if m.get("thread")}
    thread = set(first) & set(second)
    assert len(thread) == 1
    key = thread.pop()
    for field in ("subject", "body", "received", "from"):
        assert first[key][field] == second[key][field]
    assert first[key]["id"] != second[key]["id"]


def test_a_sender_writes_to_both_the_job_address_and_a_business_address(tmp_path):
    _, client = make(tmp_path)
    senders = []
    for number in (1, 2):
        own = fake_services.account_address(number - 1)
        senders.append(
            {m["from"]["address"] for m in mail(client, token_for(client, number)) if own in m.get("to", [])}
        )
    assert senders[0] & senders[1]


def test_the_failing_account_reports_its_state_beside_healthy_ones(tmp_path):
    state, client = make(tmp_path, failing=2)
    tokens = {n: token_for(client, n) for n in (1, 2, 3)}
    for n in (1, 2, 3):  # every account signs in and is known
        assert get(client, "/account/v1/me", tokens[n]).status_code == 200
    assert mail(client, tokens[1]) and calendar(client, tokens[3])
    refused = get(client, "/mail/v1/messages", tokens[2])
    assert refused.status_code == 401 and refused.json()["error"]["code"] == "InvalidAuthenticationToken"
    assert get(client, "/calendar/v1/events", tokens[2]).status_code == 401
    assert state.seen["unauthorized"] == 2
    hint = fake_services.account_address(1)
    granted = exchange(client, code_from(sign_in_page(client, login_hint=hint))).json()
    renewal = client.post(
        "/account/token",
        data={
            "grant_type": "refresh_token",
            "refresh_token": granted["refresh_token"],
            "client_id": "journey-mail-app",
        },
    )
    assert renewal.status_code == 400  # an expired sign-in is not renewed


def test_the_failing_account_can_be_one_the_service_is_retrying(tmp_path):
    _, client = make(tmp_path, failing=2, how="retrying")
    token = token_for(client, 2)
    answer = get(client, "/mail/v1/messages", token)
    assert answer.status_code == 503 and answer.headers["retry-after"]
    assert mail(client, token_for(client, 1))


def test_the_accounts_helper_lists_who_is_who_and_who_is_failing(tmp_path):
    state = State(tmp_path)
    state.accounts, state.failing_account, state.failing_how = 3, 2, "expired"
    helper = TestClient(build_app(state, 0))
    listed = helper.get("/__e2e/accounts").json()["accounts"]
    assert [a["address"] for a in listed] == [fake_services.account_address(n) for n in range(3)]
    assert [a["failing"] for a in listed] == [None, "expired", None]


def test_the_command_line_flags_set_the_state():
    state = fake_services.configure(["--port", "1", "--state", "/tmp/x", "--accounts", "3", "--failing-account", "2"])
    assert (state.accounts, state.failing_account, state.failing_how) == (3, 2, "expired")
    plain = fake_services.configure(["--port", "1", "--state", "/tmp/x"])
    assert (plain.accounts, plain.failing_account) == (0, 0)


def test_an_account_number_beyond_the_accounts_is_refused_at_start():
    with pytest.raises(SystemExit):
        fake_services.configure(["--port", "1", "--state", "/tmp/x", "--accounts", "2", "--failing-account", "3"])

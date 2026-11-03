"""Signing in again to one account, as another (design 7.9): the address the service answers with is checked against the
account being signed in again; a different one is refused, nothing is kept, and the person is told which address came
back and which one to sign in as. A sign-in started with no account named behaves as before."""

from urllib.parse import parse_qs, urlsplit

from tests.test_sign_in import landing
from tests.test_sign_in_accounts import ALICE, BOB, KEYS, inboxes, sign_in, sources, world  # noqa: F401


def start_for(c, api, account):
    url = c.post(f"{api}/sign-ins/p18/service/start", params={"account": account}).json()["url"]
    return parse_qs(urlsplit(url).query)["state"][0]


def test_signing_in_again_as_another_account_is_refused_and_keeps_nothing(world):  # noqa: F811
    ws, c, api = world
    sign_in(c, api, "alice")
    before = (KEYS(ws) / next(p.name for p in KEYS(ws).glob("sign-in-*"))).read_text()
    state = start_for(c, api, ALICE)
    where = landing(c.get(f"{api}/sign-ins/callback", params={"state": state, "code": "bob"}))
    query = parse_qs(urlsplit(where).query)
    assert query["sign_in"] == ["different"]
    assert query["address"] == [BOB] and query["expected"] == [ALICE]
    # The other account was not added, the first one's tokens were not replaced, and no source was started for it.
    row = c.get(f"{api}/sign-ins").json()[0]
    assert [a["address"] for a in row["accounts"]] == [ALICE]
    assert [p.read_text() for p in KEYS(ws).glob("sign-in-*")] == [before]
    assert set(inboxes(ws)) == {ALICE}


def test_signing_in_again_as_the_same_account_replaces_its_tokens_whatever_the_case(world):  # noqa: F811
    ws, c, api = world
    sign_in(c, api, "alice")
    state = start_for(c, api, ALICE.upper())
    assert "sign_in=done" in landing(c.get(f"{api}/sign-ins/callback", params={"state": state, "code": "alice2"}))
    assert "tok-alice2" in next(KEYS(ws).glob("sign-in-*")).read_text()
    assert len(sources(ws)) >= 1


def test_a_sign_in_that_names_no_account_adds_whoever_signs_in(world):  # noqa: F811
    ws, c, api = world
    sign_in(c, api, "alice")
    sign_in(c, api, "bob")
    row = c.get(f"{api}/sign-ins").json()[0]
    assert {a["address"] for a in row["accounts"]} == {ALICE, BOB}

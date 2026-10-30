# Test app and fake services

The browser tests and the reviewer run the app against local fakes (`tests/fake_services.py`: mail, calendar, sign-in, AI,
add-on catalog). Every flag below is off by default, so with none of them the fakes answer exactly as before.
All names are made up and every address is at `example.com`.

## One person with several businesses, mailboxes and calendars (area S5)

Flags of `tests.fake_services`:

| Flag | What it gives |
| --- | --- |
| `--accounts N` | N people can sign in. Each sign-in is one account with its own address, mailbox and calendar; `/account/v1/me` answers the account that signed in, also after a token renewal. Pick the person on the fake sign-in page (a list of addresses), or pass `login_hint=<address or number from 1>` to `/authorize`. The app's own sign-in popup passes no hint, so it shows the list. |
| (with `--accounts 3`) | Calendars that interact: a meeting in account 1 overlaps one in account 2; one invitation (same `uid`, title, time) sits in accounts 1 and 2 with different event ids; an all-day entry (date-only start/end, `all_day: true`) in account 2; a read-only entry (`read_only: true`) in account 3. Mail that interacts: one thread (same `thread` id, subject, body) copied to mailboxes 1 and 2; a supplier who writes to both account 1's and account 2's address; mailbox 3 holds mail for two businesses. |
| `--failing-account K` | Account K (from 1) signs in and answers `/me`, but its mail and calendar reads fail beside the healthy ones. |
| `--failing-how expired\|retrying` | `expired` (default): 401 `InvalidAuthenticationToken` and renewal refused. `retrying`: 503 with `Retry-After`. |

`GET /__e2e/accounts` on the plain-HTTP port lists each address and whether it fails (and how).

Flag of `tests.e2e_server`:

| Flag | What it gives |
| --- | --- |
| `--many-sides` | The "just me" workspace plus a job and three businesses added through the setup route (five sides with Personal); three names are 50+ characters. `GET /__e2e/many-sides` lists them. The two shipped demo workspaces are not changed. |

Read-only is data only (the engine has no read-only calendar concept), and `--many-sides` runs on `tests.e2e_server`,
which is a different app from the one wired to the fake sign-in (`tests.e2e_fresh_server`).

### Start everything for the reviewer

Fake services and the mail-connected app (two terminals, from the repository root; the app first, as it clears the state folder):

```
uv run python -m tests.e2e_fresh_server --port 8800 --state /tmp/s5-state --https-port 8802 --mail --add-ons
uv run python -m tests.fake_services --port 8801 --https-port 8802 --state /tmp/s5-state --catalog journey_mail --accounts 3 --failing-account 2
```

The side-by-side seed, with long business names (own port):

```
uv run python -m tests.e2e_server --port 8810 --base-path / --many-sides
```

Tests: `uv run pytest tests/test_fake_accounts.py tests/test_e2e_many_sides_seed.py tests/test_fake_services.py -n0`.

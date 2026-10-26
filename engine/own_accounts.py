"""The names the person is known by on watched sources (design 7.9, "The Settings cut").

They are learned from the accounts the person signed in with: a source that reads as a signed-in account names it by
address, and a change made under that address is the person's own work. Names set in `workspace.user.accounts` still
count, so nothing a person set is lost. The app's own names stay apart, in `workspace.our_accounts`.
"""

from __future__ import annotations

from typing import Any


def own_names(cfg: Any) -> list[str]:
    """The names set for the person, then the addresses of the accounts they signed in with, each once."""
    found: dict[str, str] = {}
    for name in [*cfg.workspace.user.accounts, *(s.account for s in cfg.watch.sources if s.account)]:
        found.setdefault(" ".join(str(name).split()).casefold(), name)
    return list(found.values())

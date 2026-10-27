"""The apps a notice can go to (design 7.19, "Named apps").

The common apps are a shipped list (`engine/defaults/notice_apps.yaml`): each has a name, the message its address takes
(JSON with the notice's words in it, or plain text) and one line on where to find the address. The person picks one by
name on the Notices settings (`ui.notifications.webhook_app`); a workspace adds entries of its own
(`ui.notifications.apps_extra`, an entry with a shipped id replacing it). The older `webhook_format` still works: json
is the generic chat shape and plain is plain text, read when no app is chosen or the one chosen is not in the list.
Nothing here names an app: the names are the file's."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from engine.yaml_load import load_yaml

APPS_FILE = Path(__file__).parent / "defaults" / "notice_apps.yaml"
#: What `webhook_format` meant, as the ids of the entries it now stands for.
FORMAT_APP = {"json": "generic-chat", "plain": "plain"}
#: Where the notice's words go in a shape.
PLACEHOLDER = "{text}"


def shipped() -> list[Any]:
    """The app's own list, in the order it is offered."""
    from engine.config.schema import NoticeApp

    data = load_yaml(APPS_FILE.read_text(encoding="utf-8")) or {}
    return [NoticeApp.model_validate(entry) for entry in data.get("apps", [])]


def offered(cfg: Any) -> list[Any]:
    """Every app the screen offers: the shipped ones (one the workspace gave an entry for is replaced by it, in place),
    then the workspace's own, then "Something else", which stays last."""
    own = {a.id: a for a in cfg.ui.notifications.apps_extra}
    listed = [own.pop(a.id, a) for a in shipped()]
    last = listed.pop() if listed and listed[-1].shape is None and listed[-1].id == FORMAT_APP["plain"] else None
    return [*listed, *own.values(), *([last] if last is not None else [])]


def chosen(cfg: Any) -> Any:
    """The app notices go to: the one named, else the one the older format means."""
    n = cfg.ui.notifications
    apps = {a.id: a for a in offered(cfg)}
    return apps.get(n.webhook_app or "") or apps[FORMAT_APP[n.webhook_format]]


def fill(app: Any, text: str) -> dict[str, Any] | str:
    """The message for an app: its shape with the notice's words in it, or the words alone for plain text."""
    return text if app.shape is None else _filled(app.shape, text)


def _filled(shape: Any, text: str) -> Any:
    if isinstance(shape, str):
        return shape.replace(PLACEHOLDER, text)
    if isinstance(shape, dict):
        return {key: _filled(value, text) for key, value in shape.items()}
    if isinstance(shape, list):
        return [_filled(value, text) for value in shape]
    return shape

"""The mail services a mailbox can be connected to by name (design 6.33, "Guided mailbox step").

The common services are a shipped list (`engine/defaults/mail_services.yaml`): each has a name, its incoming mail
server, the plain steps for making an app password and, where the service gives one, the steps for its calendar's
private address. The person picks one by name when connecting a mailbox, and only types an address and the app
password; a workspace adds entries of its own (`watch.mail_services_extra`, an entry with a shipped id replacing it).
"Another mailbox", with the server typed by hand, always stays. Nothing here names a service: the names are the
file's."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from engine.yaml_load import load_yaml

SERVICES_FILE = Path(__file__).parent / "defaults" / "mail_services.yaml"


def shipped() -> list[Any]:
    """The app's own list, in the order it is offered."""
    from engine.config.schema import MailService

    data = load_yaml(SERVICES_FILE.read_text(encoding="utf-8")) or {}
    return [MailService.model_validate(entry) for entry in data.get("services", [])]


def offered(cfg: Any) -> list[Any]:
    """Every service the screen offers: the shipped ones (one the workspace gave an entry for is replaced by it, in
    place), then the workspace's own."""
    own = {s.id: s for s in cfg.watch.mail_services_extra}
    return [*(own.pop(s.id, s) for s in shipped()), *own.values()]


def find(cfg: Any, service_id: str) -> Any | None:
    """The offered service with this id, or None."""
    return next((s for s in offered(cfg) if s.id == service_id), None)


def settings_for(service: Any, given: dict[str, Any]) -> dict[str, Any]:
    """A mailbox's settings with the service's server details filled in: the host and port, and the sent folder when
    the service has a usual one and none was given. The person's own entries (user name, folder) are kept."""
    filled = {**given, "host": service.imap_host, "port": service.imap_port}
    if service.sent_folder and "sent_folder" not in given:
        filled["sent_folder"] = service.sent_folder
    return filled

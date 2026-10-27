"""Playbooks: built-in good practice for a kind of work (design 3.8). The core's covers project support."""

from __future__ import annotations

from pathlib import Path

GUIDANCE = Path(__file__).parent / "guidance"


def practice(name: str) -> str:
    """The playbook's good practice for a kind of work, or nothing when it has none. Named apart from the `guidance`
    folder, which, once loaded as a package, would replace a function of the same name."""
    path = GUIDANCE / f"{name}.md"
    return path.read_text(encoding="utf-8").strip() if path.exists() else ""

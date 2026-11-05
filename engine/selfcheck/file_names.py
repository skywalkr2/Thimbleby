"""File names that work on every computer.

macOS and Windows usually treat names that differ only in capital letters as one name; Linux does not. Two such files
can't both be checked out there, and for the web code an import without its extension ("./Sheet") can open the other
file ("./sheet.ts" before "./Sheet.tsx"). Both fail only on those computers, so the check runs everywhere.
"""

from __future__ import annotations

from pathlib import Path

from engine.selfcheck.scans import REPO, Finding

# Folders that are made, not written (and hidden folders, which hold tools' own files).
SKIP = {"node_modules", "dist", "build", "__pycache__", "test-results", "playwright-report"}
MODULE_SUFFIXES = (".d.ts", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs")


def _stem(name: str) -> str:
    for suffix in MODULE_SUFFIXES:
        if name.endswith(suffix):
            return name[: -len(suffix)]
    return name


def check_name_case(root: Path = REPO) -> list[Finding]:
    findings: list[Finding] = []
    stack = [root]
    while stack:
        folder = stack.pop()
        try:
            entries = sorted(folder.iterdir())
        except OSError:
            continue
        seen: dict[str, str] = {}
        modules: dict[str, str] = {}
        for entry in entries:
            name = entry.name
            if entry.is_dir() and not entry.is_symlink() and name not in SKIP and not name.startswith("."):
                stack.append(entry)
            rel = str((folder / name).relative_to(root))
            other = seen.setdefault(name.lower(), name)
            if other != name:
                findings.append(Finding("names", rel, 0, f"differs from {other!r} only in capital letters"))
                continue
            stem = _stem(name)
            if stem == name or entry.is_dir():
                continue
            other = modules.setdefault(stem.lower(), stem)
            if other != stem:
                findings.append(
                    Finding("names", rel, 0, f"an import of {stem!r} can open {other!r} where capitals don't count")
                )
    return findings

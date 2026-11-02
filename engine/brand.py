"""The workspace's logo: a picture kept in its configuration folder, named by `ui.brand.logo`.

A picture is taken in only when its bytes are one the screen can show (PNG, JPEG, WebP, or an SVG with nothing that runs
in it) and no larger than `ui.brand.logo_max_kb`. It is stored under a name made from its content, so a new picture
never overwrites the one an Undo would put back, and the same picture sent twice is kept once. A setting that names a
file that is not there, or not a picture, is refused with its reason in plain words (`logo_problem`).
"""

from __future__ import annotations

import hashlib
import re
from pathlib import Path

#: The kinds of picture the screen shows, by the ending a stored file carries.
LOGO_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
}
_STORED_PREFIX = "logo-"


class LogoRefused(ValueError):
    """A picture that can't be used as the logo; the message says why in words for the person."""


def kind_of(data: bytes) -> str | None:
    """The ending a picture's own bytes call for ("png", "jpg", "webp", "svg"), or None when they are none of these."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    head = data[:2048].lstrip(b"\xef\xbb\xbf").lstrip().lower()
    if head.startswith((b"<svg", b"<?xml")) and b"<svg" in data[:4096].lower():
        return "svg"
    return None


def _runs_code(data: bytes) -> bool:
    """Whether a vector picture carries something that runs or reaches out, which a logo never does."""
    low = data.lower()
    if any(mark in low for mark in (b"<script", b"javascript:", b"<foreignobject", b"<iframe", b"<!entity")):
        return True
    # An event attribute (onload=, onclick=, ...) runs code too.
    return re.search(rb"\son[a-z]+\s*=", low) is not None


def check(data: bytes, max_kb: int) -> str:
    """The ending the picture is stored with, or LogoRefused with the reason."""
    if not data:
        raise LogoRefused("That file is empty. Choose a picture.")
    if len(data) > max_kb * 1024:
        raise LogoRefused(f"That picture is {len(data) // 1024 + 1} KB. A logo can be at most {max_kb} KB.")
    kind = kind_of(data)
    if kind is None:
        raise LogoRefused("That isn't a picture the app can show. Choose a PNG, JPEG, WebP or SVG file.")
    if kind == "svg" and _runs_code(data):
        raise LogoRefused("That picture has something in it that runs, which a logo can't have. Choose a plain one.")
    return kind


def save_logo(config_dir: Path, data: bytes, max_kb: int) -> str:
    """Keep a picture in the configuration folder and return the file name to put in `ui.brand.logo`."""
    kind = check(data, max_kb)
    name = f"{_STORED_PREFIX}{hashlib.sha256(data).hexdigest()[:12]}.{kind}"
    config_dir.mkdir(parents=True, exist_ok=True)
    target = config_dir / name
    if not target.is_file():
        temporary = target.with_suffix(target.suffix + ".saving")
        temporary.write_bytes(data)
        temporary.replace(target)
    return name


def logo_path(config_dir: Path, name: str | None) -> Path | None:
    """The logo file a setting names in the configuration folder, when it is there and is a picture type."""
    if not name:
        return None
    folder = config_dir.resolve()
    path = (folder / name).resolve()
    if path.parent != folder or not path.is_file() or path.suffix.lower() not in LOGO_TYPES:
        return None
    return path


def logo_problem(config_dir: Path, name: str, max_kb: int) -> str | None:
    """Why a logo the person just chose can't be used, in plain words, or None when it can."""
    found = logo_path(config_dir, name)
    if found is None:
        return "There is no logo picture by that name. Upload a picture instead."
    try:
        check(found.read_bytes(), max_kb)
    except OSError:
        return "The logo picture can't be read. Upload it again."
    except LogoRefused as err:
        return str(err)
    return None

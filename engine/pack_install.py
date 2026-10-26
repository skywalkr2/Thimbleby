"""Installing a pack from the Add-ons screen: download its release file from the address the catalog gives, check it
against the catalog's SHA-256 checksum, and install it beside the app. The pack's own wheel is pure Python. The
libraries it needs besides are the wheels its release lists (its dependencies and theirs, one build per platform, each
with its own checksum): exactly those are installed, never anything from a package index, and each must fit this
computer, be a built wheel and not clash with a package the app already has. A need the app and the listed libraries
don't meet is refused with what to do instead. Installing never turns a pack on, and the app uses it after the restart
the person chooses. Removing takes away only what an install from here put in place, and a library only once no
installed pack uses it."""

from __future__ import annotations

import csv
import hashlib
import io
import shutil
import sysconfig
import zipfile
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from email.message import Message
from email.parser import Parser
from importlib import metadata
from pathlib import Path, PurePosixPath
from typing import Any

from packaging.requirements import InvalidRequirement, Requirement
from packaging.tags import Tag, parse_tag, sys_tags
from packaging.utils import canonicalize_name, parse_wheel_filename

#: Written into an installed pack's metadata folder, so only what this app installed can be removed from here.
INSTALLER = "pm-cockpit"
#: The most a release file may be.
MAX_BYTES = 50 * 1024 * 1024
#: Written into a library's metadata folder: the packs that need it (one canonical name a line), so removing a pack
#: takes out only the libraries nothing else uses. A package without this file is a pack, or not a library of ours.
REQUIRED_BY = "REQUIRED_BY"


class InstallError(Exception):
    """A pack can't be installed or removed here; the message says why in plain words."""


class NeedsToken(InstallError):
    """The release file can't be read without a read token for the place it is kept (or the one given doesn't work)."""


@dataclass
class Installed:
    name: str
    version: str
    files: int
    libraries: list[str] = field(default_factory=list)  # each library the install brought or shared, "name version"


def target() -> Path:
    """Where packs are installed: the app's own place for pure Python packages."""
    return Path(sysconfig.get_paths()["purelib"])


def library_target() -> Path:
    """Where a library of compiled code goes: the app's own place for it (the same place on most computers)."""
    return Path(sysconfig.get_paths()["platlib"])


def supported() -> dict[Tag, int]:
    """The wheel tags this computer takes, each with its rank (0 is the best fit)."""
    return {tag: rank for rank, tag in enumerate(sys_tags())}


def _tags_of(filename: str) -> frozenset[Tag]:
    return parse_wheel_filename(filename)[3]


def select(libraries: Sequence[Any], fits: Mapping[Tag, int] | None = None) -> list[Any]:
    """From a release's libraries (anything with `name`, `version` and `url`), the one build of each that fits this
    computer: of those whose wheel takes a tag this computer takes, the best fit. A library with no build for this
    computer is refused, saying so."""
    from urllib.parse import urlsplit

    fits = supported() if fits is None else fits
    by_name: dict[str, list[Any]] = {}
    for library in libraries:
        by_name.setdefault(str(canonicalize_name(library.name)), []).append(library)
    chosen = []
    for builds in by_name.values():
        ranked = []
        for build in builds:
            tags = _tags_of(urlsplit(build.url).path.rsplit("/", 1)[-1])
            ranks = [fits[t] for t in tags if t in fits]
            if ranks:
                ranked.append((min(ranks), build))
        if not ranked:
            raise InstallError(
                f"{builds[0].name} has no build for this computer, so this add-on can't be installed from here"
            )
        chosen.append(min(ranked, key=lambda pair: pair[0])[1])
    return chosen


def to_add(libraries: Sequence[Any], place: Path | None = None) -> list[tuple[str, str]]:
    """The libraries (name and version) an install of these would add: those not already in place from an earlier
    install here at the same version, for the screen to say before anything is installed."""
    found = []
    for library in libraries:
        folder = _library_folder(library.name, _places(place))
        if folder is not None and _version_of(folder) == library.version:
            continue
        found.append((library.name, library.version))
    return found


def download(url: str, expected_sha256: str, token: str | None = None, client: Any = None) -> bytes:
    """The release file, checked against its checksum. A read token goes only to the release's own host; a
    redirect to another host gets no token."""
    import httpx

    headers = {"Accept": "application/octet-stream"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    own = client is None
    client = client or httpx.Client(timeout=60, follow_redirects=True)
    try:
        with client.stream("GET", url, headers=headers) as response:
            if response.status_code in (401, 403, 404):
                raise NeedsToken(
                    "the release file couldn't be read: it may be private, so the app needs a read token for the "
                    "place it is kept, or the address is wrong"
                )
            if response.status_code >= 400:
                raise InstallError(f"the release host answered {response.status_code}; try again later")
            chunks, size = [], 0
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > MAX_BYTES:
                    raise InstallError("the release file is larger than an add-on may be")
                chunks.append(chunk)
    except httpx.HTTPError:
        raise InstallError("the release file couldn't be downloaded; check the connection and try again") from None
    finally:
        if own:
            client.close()
    data = b"".join(chunks)
    if hashlib.sha256(data).hexdigest() != expected_sha256:
        raise InstallError("the downloaded file doesn't match the catalog's checksum, so it wasn't installed")
    return data


@dataclass
class _Wheel:
    """A wheel read and checked, not yet written."""

    zip: zipfile.ZipFile
    info: str
    name: str
    version: str
    meta: Message
    pure: bool  # its files go with the pure Python packages

    @property
    def requires(self) -> list[str]:
        return self.meta.get_all("Requires-Dist", [])


def _open(data: bytes, *, own: bool, fits: Mapping[Tag, int]) -> _Wheel:
    """Read a wheel and check what it holds. A pack's own wheel is pure Python; a library may hold compiled code when
    one of its tags is a tag this computer takes. Paths outside the package's own folders are refused."""
    try:
        wheel = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        raise InstallError("the release file isn't a package the app can install") from None
    names = wheel.namelist()
    info_dirs = {n.split("/", 1)[0] for n in names if n.split("/", 1)[0].endswith(".dist-info")}
    if len(info_dirs) != 1:
        raise InstallError("the release file isn't a package the app can install")
    info = info_dirs.pop()
    try:
        wheel_meta = Parser().parsestr(wheel.read(f"{info}/WHEEL").decode("utf-8"))
        meta = Parser().parsestr(wheel.read(f"{info}/METADATA").decode("utf-8"))
    except KeyError:
        raise InstallError("the release file isn't a package the app can install") from None
    pure = wheel_meta.get("Root-Is-Purelib", "").strip().lower() == "true"
    tags = {t for line in wheel_meta.get_all("Tag", []) for t in parse_tag(line.strip())}
    if own:
        if not pure or not any(tag.platform == "any" and tag.abi == "none" for tag in tags):
            raise InstallError("only add-ons of pure Python install from here; this one needs installing by hand")
    elif not any(tag in fits for tag in tags):
        raise InstallError(f"{meta['Name']} isn't built for this computer, so this add-on can't be installed from here")
    for member in names:
        path = PurePosixPath(member)
        if path.is_absolute() or ".." in path.parts or path.parts[0].endswith(".data"):
            raise InstallError("the release file holds paths the app won't install")
    return _Wheel(wheel, info, meta["Name"], meta["Version"], meta, pure)


def _satisfied(line: str, found: Mapping[str, str]) -> bool | None:
    """Whether a requirement line is met by the packages the app has or the ones about to be added (`found`, by
    canonical name); None when the line doesn't apply (an extra, or another platform)."""
    try:
        requirement = Requirement(line)
    except InvalidRequirement:
        return False
    if requirement.marker is not None and not requirement.marker.evaluate({"extra": ""}):
        return None
    name = str(canonicalize_name(requirement.name))
    if name in found:
        have: str | None = found[name]
    else:
        try:
            have = metadata.version(requirement.name)
        except metadata.PackageNotFoundError:
            return False
    return not requirement.specifier or requirement.specifier.contains(have, prereleases=True)


def _missing(requirements: list[str], adding: Mapping[str, str] | None = None) -> list[str]:
    """The requirements the app doesn't meet, even with the libraries about to be added (`adding`, name to version)."""
    found = []
    for line in requirements:
        ok = _satisfied(line, adding or {})
        if ok is None or ok:
            continue
        try:
            requirement = Requirement(line)
        except InvalidRequirement:
            found.append(line)
            continue
        key = str(canonicalize_name(requirement.name))
        if adding and key in adding:
            found.append(f"{requirement} (the release lists {adding[key]})")
            continue
        try:
            metadata.version(requirement.name)
            found.append(str(requirement))  # here, but not at a version that meets it
        except metadata.PackageNotFoundError:
            found.append(requirement.name)
    return found


def _places(place: Path | None) -> list[Path]:
    """The folders packages are installed in: the one given, or the app's places for pure and compiled packages."""
    if place is not None:
        return [place]
    return list(dict.fromkeys([target(), library_target()]))


def _library_folder(name: str, places: Sequence[Path]) -> Path | None:
    """The metadata folder of an installed library of ours (one that records which packs need it), in any place."""
    for place in places:
        folder = _info_dir(name, place)
        if folder is not None and (folder / REQUIRED_BY).is_file():
            return folder
    return None


def _version_of(folder: Path) -> str:
    return folder.name.removesuffix(".dist-info").split("-", 1)[-1]


def _users(folder: Path) -> set[str]:
    try:
        return {
            line.strip() for line in (folder / REQUIRED_BY).read_text(encoding="utf-8").splitlines() if line.strip()
        }
    except OSError:
        return set()


def _check_slot(library: _Wheel, pack: str, places: Sequence[Path]) -> None:
    """Refuse a library that clashes with something already on this computer: a package the app has, one installed
    another way, an add-on, or a library another add-on uses at a different version."""
    for place in places:
        folder = _info_dir(library.name, place)
        if folder is None:
            continue
        marker = folder / "INSTALLER"
        ours = marker.is_file() and marker.read_text(encoding="utf-8").strip() == INSTALLER
        if not ours:
            raise InstallError(
                f"{library.name} is already here as one of the app's own packages or installed another way, so this "
                "add-on can't bring its own copy"
            )
        if not (folder / REQUIRED_BY).is_file():
            raise InstallError(f"{library.name} is an add-on already installed here, so it can't also be a library")
        others = _users(folder) - {pack}
        if _version_of(folder) != library.version and others:
            raise InstallError(
                f"{library.name} {library.version} would replace {_version_of(folder)}, which "
                f"{', '.join(sorted(others))} still uses"
            )
        return
    try:
        metadata.version(library.name)
    except metadata.PackageNotFoundError:
        return
    raise InstallError(
        f"{library.name} is one of the app's own packages, so this add-on can't bring its own copy; "
        "it needs a release that doesn't list it"
    )


def _write(wheel: _Wheel, place: Path) -> list[str]:
    """Put a wheel's files in place, with the metadata that says it was installed from here."""
    written = []
    for member in wheel.zip.infolist():
        if member.is_dir():
            continue
        destination = place / member.filename
        destination.parent.mkdir(parents=True, exist_ok=True)
        with wheel.zip.open(member) as source, destination.open("wb") as out:
            shutil.copyfileobj(source, out)
        written.append(member.filename)
    (place / wheel.info / "INSTALLER").write_text(INSTALLER + "\n", encoding="utf-8")
    record = io.StringIO()
    writer = csv.writer(record)
    for path in [*written, f"{wheel.info}/INSTALLER"]:
        if path != f"{wheel.info}/RECORD":
            writer.writerow([path, "", ""])
    writer.writerow([f"{wheel.info}/RECORD", "", ""])
    (place / wheel.info / "RECORD").write_text(record.getvalue(), encoding="utf-8")
    return written


def install(
    data: bytes,
    place: Path | None = None,
    libraries: Sequence[bytes] = (),
    *,
    fits: Mapping[Tag, int] | None = None,
) -> Installed:
    """Install a pack's wheel of pure Python with the library wheels its release lists: check what each holds and
    needs, refuse a clash with what the app already has, take away an earlier install of the same pack made from
    here, then put the files in place. Nothing is written until every wheel has passed."""
    fits = supported() if fits is None else fits
    pack = _open(data, own=True, fits=fits)
    libs = [_open(blob, own=False, fits=fits) for blob in libraries]
    adding = {str(canonicalize_name(lib.name)): lib.version for lib in libs}
    if len(adding) != len(libs):
        raise InstallError("the release lists a library twice")
    pack_key = str(canonicalize_name(pack.name))
    if pack_key in adding:
        raise InstallError("the release lists the add-on itself as a library")
    for lib in libs:
        _check_slot(lib, pack_key, _places(place))
    missing = _missing(pack.requires, adding)
    for lib in libs:
        missing += [m for m in _missing(lib.requires, adding) if m not in missing]
    if missing:
        have = "the app or the add-on's own libraries" if libs else "the app"
        raise InstallError(
            f"this add-on needs {', '.join(missing)}, which {have} doesn't have; "
            + ("the release has to list it" if libs else "install it by hand")
        )
    pure_place = place or target()
    plat_place = place or library_target()
    _remove_earlier(pack.name, pure_place, place)
    done: list[tuple[_Wheel, Path]] = []
    try:
        for lib in libs:
            where = pure_place if lib.pure else plat_place
            folder = _library_folder(lib.name, [where])
            if folder is not None and _version_of(folder) == lib.version:
                _join(folder, pack_key)
                continue
            if folder is not None:  # an older version nothing else uses (the slot check refused the others)
                _remove_files(folder, where)
            _write(lib, where)
            _join(where / lib.info, pack_key)
            done.append((lib, where))
        written = _write(pack, pure_place)
        done.append((pack, pure_place))
    except OSError:
        for wheel, where in done:
            _remove_files(where / wheel.info, where)
        raise InstallError("the add-on couldn't be written to this computer; nothing was changed") from None
    return Installed(pack.name, pack.version, len(written), [f"{lib.name} {lib.version}" for lib in libs])


def _join(folder: Path, pack: str) -> None:
    """Record that a pack needs the library whose metadata folder this is."""
    folder.mkdir(parents=True, exist_ok=True)
    (folder / REQUIRED_BY).write_text("\n".join(sorted(_users(folder) | {pack})) + "\n", encoding="utf-8")


def _info_dir(name: str, place: Path) -> Path | None:
    wanted = name.replace("-", "_").lower()
    for folder in place.glob("*.dist-info"):
        if folder.name.split("-", 1)[0].lower() == wanted:
            return folder
    return None


def installed_here(name: str, place: Path | None = None) -> bool:
    """Whether a pack of this name was installed from here, so it can be removed from here."""
    folder = _info_dir(name, place or target())
    marker = folder / "INSTALLER" if folder is not None else None
    return marker is not None and marker.is_file() and marker.read_text(encoding="utf-8").strip() == INSTALLER


def _remove_earlier(name: str, place: Path, given: Path | None) -> None:
    folder = _info_dir(name, place)
    if folder is None:
        return
    marker = folder / "INSTALLER"
    if not marker.exists() or marker.read_text(encoding="utf-8").strip() != INSTALLER:
        raise InstallError(f"{name} was installed another way; update it the same way, or remove it first")
    remove(name, given)


def remove(name: str, place: Path | None = None) -> None:
    """Take away a pack installed from here: the files its record lists, and its metadata folder; then each library it
    needed that no other installed pack uses."""
    place = place or target()
    folder = _info_dir(name, place)
    if folder is None:
        raise InstallError(f"{name} isn't installed")
    installer = (folder / "INSTALLER").read_text(encoding="utf-8").strip() if (folder / "INSTALLER").exists() else ""
    if installer != INSTALLER:
        raise InstallError(f"{name} was installed another way, so it is removed the same way")
    _remove_files(folder, place)
    _release_libraries(str(canonicalize_name(name)), _places(None if place == target() else place))


def _release_libraries(pack: str, places: Sequence[Path]) -> None:
    """The libraries this pack needed stop being needed by it; one nothing else uses goes with it."""
    for place in places:
        for folder in sorted(place.glob("*.dist-info")):
            users = _users(folder)
            if pack not in users:
                continue
            if users - {pack}:
                (folder / REQUIRED_BY).write_text("\n".join(sorted(users - {pack})) + "\n", encoding="utf-8")
            else:
                _remove_files(folder, place)


def _remove_files(folder: Path, place: Path) -> None:
    """Delete the files a metadata folder's record lists, the compiled copies of them, and the folder."""
    record = folder / "RECORD"
    paths = [row[0] for row in csv.reader(record.read_text(encoding="utf-8").splitlines()) if row]
    for relative in paths:
        path = (place / relative).resolve()
        if path.is_relative_to(place.resolve()) and path.is_file():
            path.unlink()
    for relative in sorted({str(PurePosixPath(p).parent) for p in paths}, key=len, reverse=True):
        directory = place / relative
        if directory == place or not directory.is_dir():
            continue
        # The copies Python compiled of the package's own files aren't in its record; they go with it.
        cache = directory / "__pycache__"
        if cache.is_dir() and cache.resolve().is_relative_to(place.resolve()):
            shutil.rmtree(cache)
        if not any(directory.iterdir()):
            directory.rmdir()
    if folder.exists():
        shutil.rmtree(folder)


# ---- one file, several add-ons ----------------------------------------------------------------------------------


#: The add-ons a person removed while another add-on of the same package still used the package's files, kept in the
#: workspace's private folder: the files stay, and these read as not installed.
REMOVED_FILE = "pack-removed.json"


def _canonical(name: str) -> str:
    return name.replace("-", "_").replace(".", "_").lower()


def entries_in(package: str) -> list[str]:
    """The add-ons (by the name they run under) that an installed package provides: a package can hold several."""
    return sorted(
        {
            ep.name
            for ep in metadata.entry_points(group="pm_cockpit.plugins")
            if ep.dist is not None and _canonical(ep.dist.name) == _canonical(package)
        }
    )


def removed_entries(private_dir: Path) -> set[str]:
    """The add-ons removed while their package stayed for another add-on."""
    import json

    try:
        data = json.loads((private_dir / REMOVED_FILE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return set()
    return {str(n) for n in data} if isinstance(data, list) else set()


def set_removed(private_dir: Path, names: list[str], removed: bool) -> None:
    """Mark add-ons as removed (their package stays), or bring them back (a new install of the package, or the files
    having gone with the last of them)."""
    import json

    from engine.state_file import write_whole

    current = removed_entries(private_dir)
    changed = current | set(names) if removed else current - set(names)
    if changed != current:
        write_whole(private_dir / REMOVED_FILE, json.dumps(sorted(changed)))

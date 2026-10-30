"""API routes for the Add-ons screen (design 3.11): the packs catalog feeds list, with what each adds, reaches and
keeps and what its AI work costs here, and the plugins this install has."""

from __future__ import annotations

import os
from datetime import UTC, datetime
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException

from api.schemas import (
    InstalledPackView,
    PackFeedView,
    PackInstalled,
    PackLibrary,
    PackSummary,
    PacksView,
    PackView,
)
from engine import backup, pack_install, packs
from engine.config import Config, ConfigError, load_config
from engine.plugin_api import PLUGIN_API_VERSION
from engine.plugin_manifest import declared_plugins, shipped_plugins
from engine.shipped import is_shipped_catalog, product
from engine.storage import Store
from engine.worker import Worker
from engine.workspace import Workspace

#: The header an install refusal carries when a read token for the release's host would fix it, so the screen can ask
#: for one in place.
NEEDS = "X-Cockpit-Needs"


def _sentence(text: str) -> str:
    """A refusal as a sentence: capitalized, with its full stop."""
    text = text.strip()
    return (text[:1].upper() + text[1:]).rstrip(".") + "."


def _saved(ws: Workspace, cfg: Config) -> Config:
    """The settings as the files hold them now: an add-on turned off since the start is off here, though it runs until
    the restart."""
    try:
        return load_config(ws.config_dir, env=dict(os.environ))
    except ConfigError:
        return cfg


def entry_in(ws: Workspace, cfg: Config, pack_id: str, *, refresh: bool = False) -> packs.Entry:
    """The catalog entry for an add-on, from the catalogs as the settings list them now; `refresh` reads them again
    instead of using what was kept."""
    settings = _saved(ws, cfg).workspace.plugins.catalog
    feeds = packs.read_feeds(
        packs.feed_urls(_saved(ws, cfg), product()), ws.private_dir, settings.refresh_hours, refresh=refresh
    )
    for feed in feeds:
        for entry in feed.entries:
            if entry.id == pack_id:
                return entry
    raise HTTPException(status_code=404, detail=f"No catalog lists an add-on called {pack_id}.")


def build_pack_router(ws: Workspace, cfg: Config, store: Store, worker: Worker) -> APIRouter:
    r = APIRouter(prefix="/api")
    host = store.plugins

    def costs(entry: packs.Entry) -> list[dict]:
        from engine.ai.router import Router

        router = Router(cfg, store, env=os.environ)
        found = []
        for job in entry.ai_jobs:
            try:
                found.append(packs.job_cost(cfg, router, job))
            except Exception:  # noqa: BLE001 - a price that can't be looked up shows the job's size alone
                found.append(
                    {"label": job.label, "tokens": job.input_tokens + job.output_tokens, "usd": None, "account": True}
                )
        return found

    def libraries_of(entry: packs.Entry) -> tuple[list[tuple[str, str]], str | None]:
        """What an install of this entry would add besides the pack: its libraries that fit this computer and aren't in
        place already; or why none can be chosen (a library with no build for this computer)."""
        if entry.release is None or not entry.release.libraries:
            return [], None
        try:
            return pack_install.to_add(pack_install.select(entry.release.libraries)), None
        except pack_install.InstallError as err:
            return [], _sentence(str(err))

    def signed_in() -> dict[str, bool]:
        """For each running add-on that signs in, whether any of its sign-ins is signed in."""
        from engine.sign_in import status

        found: dict[str, bool] = {}
        for sign_in in host.sign_ins().values():
            ok = status(ws.root / ".cockpit" / "keys" / sign_in.plugin, sign_in) == "signed_in"
            found[sign_in.plugin] = found.get(sign_in.plugin, False) or ok
        return found

    def view(refresh: bool) -> PacksView:
        from importlib.metadata import entry_points

        # Which add-ons the app installed from this screen (and so can take away again), by the name they run under.
        mine = {
            ep.name
            for ep in entry_points(group="pm_cockpit.plugins")
            if ep.dist is not None and pack_install.installed_here(ep.dist.name)
        }
        now = _saved(ws, cfg)  # a catalog added since the start is listed at once
        settings = now.workspace.plugins.catalog
        product_facts = product()
        feeds = packs.read_feeds(
            packs.feed_urls(now, product_facts), ws.private_dir, settings.refresh_hours, refresh=refresh
        )
        # As saved now: an add-on just turned on shows as on (it starts after the restart the person chooses).
        try:
            enabled = set(load_config(ws.config_dir, env=dict(os.environ)).workspace.plugins.enabled)
        except ConfigError:
            enabled = set(cfg.workspace.plugins.enabled)
        on_disk = {m.name: m for m in declared_plugins(ws.config_dir, None)}
        shipped = shipped_plugins()
        # Removed while another add-on of the same file stayed: not installed, unless turned on again by hand.
        gone = pack_install.removed_entries(ws.private_dir) - enabled
        signed = signed_in()
        # What each running add-on calls its sign-ins, by id; a pack that isn't running has no label to read.
        labels = {name: sign_in.label for name, sign_in in host.sign_ins().items()}
        files = {e.id: e.release.sha256 for feed in feeds for e in feed.entries if e.release is not None}
        available = []
        for feed in feeds:
            for entry in feed.entries:
                adds, problem = libraries_of(entry)
                manifest = None if entry.id in gone else host.manifests.get(entry.id) or on_disk.get(entry.id)
                available.append(
                    PackView(
                        id=entry.id,
                        name=entry.name,
                        summary=entry.summary,
                        publisher=entry.publisher,
                        maintainers=entry.maintainers,
                        updated=entry.updated,
                        version=entry.version,
                        price=entry.price.model_dump(),
                        homepage=entry.homepage,
                        homepage_domain=urlsplit(entry.homepage).hostname if entry.homepage else None,
                        install=entry.install,
                        demo=entry.demo,
                        compatible=packs.compatible(entry, PLUGIN_API_VERSION),
                        installed_version=manifest.version if manifest else None,
                        enabled=entry.id in enabled,
                        what=PackSummary(**packs.summary(entry.provides, entry.requires, labels)),
                        installable=entry.release is not None and cfg.server.mode == "local" and problem is None,
                        libraries=[PackLibrary(name=n, version=v) for n, v in adds],
                        library_problem=problem,
                        removable=entry.id in mine and entry.id not in gone,
                        costs=costs(entry),
                        feed=urlsplit(feed.url).hostname or "",
                        release_host=(urlsplit(entry.release.url).hostname or None) if entry.release else None,
                        file=entry.release.sha256 if entry.release else None,
                        signed_in=signed.get(entry.id) if entry.id in enabled else None,
                    )
                )
        installed = [
            InstalledPackView(
                name=name,
                version=manifest.version,
                description=manifest.description,
                enabled=name in enabled,
                state=host.status[name].state if name in host.status else "off",
                reason=host.status[name].reason if name in host.status else None,
                what=PackSummary(**packs.manifest_summary(manifest, labels)),
                removable=name in mine,
                file=files.get(name),
                signed_in=signed.get(name) if name in enabled else None,
            )
            for name, manifest in sorted({**on_disk, **host.manifests}.items())
            # The app's own samples and kits show only when turned on, or in a sandbox workspace for trying them.
            if (name in enabled or name not in shipped or cfg.workspace.demo) and name not in gone
        ]
        return PacksView(
            enabled=settings.enabled,
            feeds=[
                PackFeedView(
                    domain=urlsplit(f.url).hostname or "",
                    error=f.error,
                    notes=f.notes,
                    read_at=datetime.fromtimestamp(f.read_at, UTC).isoformat() if f.read_at else None,
                    address=f.url,
                    removable=f.url in settings.feeds,
                    own=settings.shipped_feed and is_shipped_catalog(f.url, product_facts),
                )
                for f in feeds
            ],
            available=available,
            installed=installed,
        )

    @r.post("/packs/{pack_id}/install")
    def install(pack_id: str) -> PackInstalled:
        """Install (or update) an add-on from the release file its catalog entry names, checked against the entry's
        checksum. It isn't turned on; it is used after the restart the person chooses."""
        from engine.secrets import SecretError, resolve_secret

        if cfg.server.mode != "local":
            raise HTTPException(status_code=400, detail="A hosted app's add-ons are installed with its deployment.")
        entry = entry_in(ws, cfg, pack_id)
        if entry.release is None:
            raise HTTPException(
                status_code=409, detail=f"{entry.name} has no release the app can install: {entry.install}"
            )

        def fetch(current: packs.Entry) -> tuple[bytes, list[bytes]]:
            """The release and the libraries that fit this computer, downloaded and checked."""
            assert current.release is not None
            host_name = urlsplit(current.release.url).hostname or ""
            ref = _saved(ws, cfg).workspace.plugins.catalog.release_tokens.get(host_name)
            token = resolve_secret(ref) if ref else None
            chosen = pack_install.select(current.release.libraries)
            data = pack_install.download(current.release.url, current.release.sha256, token)
            # A read token goes only to the release's own host, never to another host a library is kept on.
            blobs = [
                pack_install.download(
                    lib.url, lib.sha256, token if (urlsplit(lib.url).hostname or "") == host_name else None
                )
                for lib in chosen
            ]
            return data, blobs

        try:
            try:
                data, blobs = fetch(entry)
            except pack_install.NeedsToken:
                # The catalog is kept for a while: when the release can't be reached or read, the catalog is read once
                # more, and a release that changed since is tried once. Never more than that.
                try:
                    fresh = entry_in(ws, cfg, pack_id, refresh=True)
                except HTTPException:
                    fresh = None
                if fresh is None or fresh.release is None or fresh.release == entry.release:
                    raise
                data, blobs = fetch(fresh)
            # An install or an update changes what the app runs, so a backup comes first; without one nothing changes.
            backup.backup_before(ws, backup.live(ws, cfg))
            done = pack_install.install(data, None, blobs)
        except backup.BackupFirstFailed as err:
            raise HTTPException(status_code=409, detail=str(err)) from None
        except SecretError:
            raise HTTPException(
                status_code=409,
                detail="The access key saved for this add-on isn't available, so its download can't be read.",
                headers={NEEDS: "read-token"},
            ) from None
        except pack_install.NeedsToken as err:
            raise HTTPException(status_code=409, detail=_sentence(str(err)), headers={NEEDS: "read-token"}) from None
        except pack_install.InstallError as err:
            raise HTTPException(status_code=409, detail=_sentence(str(err))) from None
        # The file is in place again for every add-on it holds, so none of them reads as removed any more.
        together = pack_install.entries_in(done.name)
        pack_install.set_removed(ws.private_dir, [pack_id, *together], False)
        if any(host.active(name) for name in {pack_id, *together}):
            # A running add-on was updated: work waits for the restart rather than mix old and new files.
            worker.add_ons_changed()
        return PackInstalled(
            name=done.name,
            version=done.version,
            needs_restart=True,
            libraries=[PackLibrary(name=n, version=v) for n, _, v in (item.partition(" ") for item in done.libraries)],
        )

    @r.post("/packs/{pack_id}/uninstall")
    def uninstall(pack_id: str) -> PackInstalled:
        """Remove an add-on installed from this screen. Its records and settings stay; turn it off first. When other
        installed add-ons come in the same file, only this one is taken away (it is left off and reads as not
        installed) and the file stays for the others; the file goes with the last of them."""
        from importlib.metadata import entry_points

        if pack_id in set(_saved(ws, cfg).workspace.plugins.enabled):
            raise HTTPException(status_code=409, detail="Turn it off first, then remove it.")
        found = next((ep for ep in entry_points(group="pm_cockpit.plugins") if ep.name == pack_id), None)
        if found is None or found.dist is None:
            raise HTTPException(status_code=404, detail=f"{pack_id} isn't installed as a package.")
        # Read before the files go: the package's metadata is among them.
        name, version = found.dist.name, found.dist.version
        if not pack_install.installed_here(name):
            raise HTTPException(
                status_code=409, detail=_sentence(f"{name} was installed another way, so it is removed the same way")
            )
        together = pack_install.entries_in(name)
        gone = pack_install.removed_entries(ws.private_dir)
        # Counted before anything is deleted: the other installed add-ons that use this file.
        using = [n for n in together if n != pack_id and n not in gone]
        if using:
            pack_install.set_removed(ws.private_dir, [pack_id], True)
            return PackInstalled(name=name, version=version, needs_restart=False, file_kept=True, still_used_by=using)
        # Turned off but still running until the restart: its files go now, so work waits for that restart.
        running = any(host.active(n) for n in {pack_id, *together})
        try:
            pack_install.remove(name)
        except pack_install.InstallError as err:
            raise HTTPException(status_code=409, detail=_sentence(str(err))) from None
        pack_install.set_removed(ws.private_dir, together, False)
        if running:
            worker.add_ons_changed()
        return PackInstalled(name=name, version=version, needs_restart=True)

    @r.get("/packs")
    def listed() -> PacksView:
        return view(refresh=False)

    @r.post("/packs/refresh")
    def refreshed() -> PacksView:
        return view(refresh=True)

    return r

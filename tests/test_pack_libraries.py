"""A pack's own libraries (plugin API 0.3.90, answer 173): a release lists every wheel the pack needs besides its own,
each with its checksum and a platform tag; install installs exactly those and never reads a package index, shows what
it will add first, refuses a clash with the app's own packages and anything that isn't a built wheel, and Remove takes
out only what no other installed pack uses."""

import hashlib
import io
import zipfile

import pytest
import yaml
from packaging.tags import parse_tag

from engine import pack_install, packs
from engine.pack_install import InstallError

WEB = "https" + "://"
HOST = f"{WEB}releases.example.com"
CATALOG = f"{WEB}c.example.com/p.yaml"
#: The tags a computer of the test takes: pure Python, and one build for a made-up platform.
HERE = {tag: i for i, tag in enumerate([*parse_tag("cp312-cp312-linux_fixture"), *parse_tag("py3-none-any")])}


def built(name, version="1.0.0", tag="py3-none-any", purelib=True, requires=(), files=None):
    """A wheel in memory: `files` are its files by path (a package folder named after the distribution by default)."""
    buffer = io.BytesIO()
    folder = name.replace("-", "_")
    info = f"{folder}-{version}.dist-info"
    with zipfile.ZipFile(buffer, "w") as z:
        for path, text in (files or {f"{folder}/__init__.py": "VALUE = 1\n"}).items():
            z.writestr(path, text)
        meta = f"Metadata-Version: 2.1\nName: {name}\nVersion: {version}\n"
        meta += "".join(f"Requires-Dist: {r}\n" for r in requires)
        z.writestr(f"{info}/METADATA", meta)
        z.writestr(f"{info}/WHEEL", f"Wheel-Version: 1.0\nRoot-Is-Purelib: {str(purelib).lower()}\nTag: {tag}\n")
        z.writestr(f"{info}/RECORD", "")
    return buffer.getvalue()


def pack(name="pack-demo", requires=()):
    return built(
        name,
        "0.1.0",
        requires=requires,
        files={f"{name.replace('-', '_')}/__init__.py": "def register(registrar):\n    pass\n"},
    )


def library(name, version="1.0.0", platform="any", tag="py3-none-any", sha="0" * 64):
    file = f"{name.replace('-', '_')}-{version}-{tag}.whl"
    return {"name": name, "version": version, "platform": platform, "url": f"{HOST}/{file}", "sha256": sha}


# ---- the catalog format ---------------------------------------------------------------------------------------------


def release(*libs, **more):
    return {"url": f"{HOST}/pack_demo-0.1.0-py3-none-any.whl", "sha256": "1" * 64, "libraries": list(libs), **more}


def test_a_release_lists_libraries_and_readers_ignore_fields_they_dont_know():
    entry = packs.Entry.model_validate(
        {
            "id": "demo",
            "name": "Demo",
            "release": release(
                {**library("alpha-lib"), "signed_by": "someone"},
                library("beta-lib", "2.1", platform="linux_fixture", tag="cp312-cp312-linux_fixture"),
                signature="ignored",
            ),
        }
    )
    assert [(lib.name, lib.version, lib.platform) for lib in entry.release.libraries] == [
        ("alpha-lib", "1.0.0", "any"),
        ("beta-lib", "2.1", "linux_fixture"),
    ]
    # An entry written before libraries existed still reads, with none.
    old = packs.Entry.model_validate(
        {"id": "old", "name": "Old", "release": {"url": release()["url"], "sha256": "2" * 64}}
    )
    assert old.release.libraries == []


@pytest.mark.parametrize(
    "bad, why",
    [
        ({**library("alpha-lib"), "url": f"{HOST}/alpha-lib-1.0.0.tar.gz"}, "built wheel"),
        ({**library("alpha-lib"), "url": "http" + "://releases.example.com/alpha_lib-1.0.0-py3-none-any.whl"}, "https"),
        ({**library("alpha-lib"), "sha256": "abc"}, "pattern"),
        ({**library("alpha-lib"), "version": "9.9"}, "doesn't match"),
        ({**library("alpha-lib"), "name": "other-lib"}, "doesn't match"),
        ({**library("alpha-lib"), "platform": "win_amd64"}, "isn't built for"),
    ],
    ids=["source", "not-https", "no-checksum", "wrong-version", "wrong-name", "wrong-platform"],
)
def test_a_library_must_be_a_built_wheel_with_a_checksum_that_its_file_name_agrees_with(bad, why):
    feed = packs.parse(
        CATALOG,
        yaml.safe_dump({"version": 1, "packs": [{"id": "demo", "name": "Demo", "release": release(bad)}]}),
    )
    assert feed.entries == [] and why in " ".join(feed.notes)


def test_a_library_listed_twice_for_one_platform_or_at_two_versions_leaves_the_entry_out():
    for libs, why in (
        ([library("alpha-lib"), library("alpha-lib")], "twice"),
        (
            [
                library("alpha-lib", "1.0"),
                library("alpha-lib", "2.0", platform="linux_fixture", tag="cp312-cp312-linux_fixture"),
            ],
            "more than one version",
        ),
    ):
        feed = packs.parse(
            CATALOG,
            yaml.safe_dump({"version": 1, "packs": [{"id": "demo", "name": "Demo", "release": release(*libs)}]}),
        )
        assert feed.entries == [] and why in " ".join(feed.notes)


# ---- choosing the build for this computer -------------------------------------------------------------------------


def test_the_build_that_fits_this_computer_is_chosen_and_a_library_with_none_is_refused():
    libs = packs.Release.model_validate(
        release(
            library("alpha-lib"),
            library("beta-lib", platform="linux_fixture", tag="cp312-cp312-linux_fixture"),
            library("beta-lib", platform="win_amd64", tag="cp312-cp312-win_amd64"),
        )
    ).libraries
    chosen = pack_install.select(libs, HERE)
    assert sorted((lib.name, lib.platform) for lib in chosen) == [("alpha-lib", "any"), ("beta-lib", "linux_fixture")]
    elsewhere = [lib for lib in libs if lib.platform == "win_amd64"]
    with pytest.raises(InstallError, match="no build for this computer"):
        pack_install.select(elsewhere, HERE)
    # A specific build is preferred to a pure one when both fit.
    both = packs.Release.model_validate(
        release(
            library("beta-lib", platform="any"),
            library("beta-lib", platform="linux_fixture", tag="cp312-cp312-linux_fixture"),
        )
    ).libraries
    assert [lib.platform for lib in pack_install.select(both, HERE)] == ["linux_fixture"]


# ---- installing and removing -----------------------------------------------------------------------------------------


def test_a_pack_installs_with_exactly_the_libraries_its_release_lists(tmp_path):
    alpha = built("alpha-lib", requires=["beta-lib>=2"])
    beta = built("beta-lib", "2.1")
    done = pack_install.install(pack(requires=["alpha-lib>=1", "beta-lib"]), tmp_path, [alpha, beta], fits=HERE)
    assert (done.name, sorted(done.libraries)) == ("pack-demo", ["alpha-lib 1.0.0", "beta-lib 2.1"])
    for folder in ("pack_demo", "alpha_lib", "beta_lib"):
        assert (tmp_path / folder / "__init__.py").is_file()
    users = (tmp_path / "alpha_lib-1.0.0.dist-info" / "REQUIRED_BY").read_text().split()
    assert users == ["pack-demo"]
    assert (tmp_path / "alpha_lib-1.0.0.dist-info" / "INSTALLER").read_text().strip() == "pm-cockpit"


def test_a_need_the_app_and_the_list_dont_meet_is_refused_and_nothing_is_written(tmp_path):
    with pytest.raises(InstallError, match="needs a-package-nobody-has"):
        pack_install.install(pack(requires=["a-package-nobody-has"]), tmp_path, [built("alpha-lib")], fits=HERE)
    with pytest.raises(InstallError, match="needs gamma-lib"):  # a library's own need
        pack_install.install(pack(), tmp_path, [built("alpha-lib", requires=["gamma-lib"])], fits=HERE)
    with pytest.raises(InstallError, match="alpha-lib>=5"):  # listed, but not at a version that meets the need
        pack_install.install(pack(requires=["alpha-lib>=5"]), tmp_path, [built("alpha-lib")], fits=HERE)
    assert list(tmp_path.iterdir()) == []


def test_a_library_that_clashes_with_the_apps_own_packages_is_refused(tmp_path):
    with pytest.raises(InstallError, match="pydantic is one of the app's own packages"):
        pack_install.install(pack(), tmp_path, [built("pydantic", "0.0.1")], fits=HERE)
    assert list(tmp_path.iterdir()) == []
    # One installed another way in the place is refused too.
    pack_install.install(pack(), tmp_path, [built("alpha-lib")], fits=HERE)
    (tmp_path / "alpha_lib-1.0.0.dist-info" / "INSTALLER").write_text("pip\n")
    with pytest.raises(InstallError, match="installed another way"):
        pack_install.install(pack("pack-two"), tmp_path, [built("alpha-lib")], fits=HERE)


def test_a_wheel_built_for_another_computer_or_holding_source_or_odd_paths_is_refused(tmp_path):
    for wheel_bytes, why in (
        (built("alpha-lib", tag="cp312-cp312-win_amd64", purelib=False), "isn't built for this computer"),
        (built("alpha-lib", files={"../escape.py": "x"}), "paths"),
        (built("alpha-lib", files={"alpha_lib-1.0.0.data/scripts/run": "x"}), "paths"),
        (b"not a zip", "isn't a package"),
    ):
        with pytest.raises(InstallError, match=why):
            pack_install.install(pack(), tmp_path, [wheel_bytes], fits=HERE)
    assert list(tmp_path.iterdir()) == []


def test_a_compiled_library_goes_in_its_own_place_for_compiled_packages(tmp_path):
    from unittest import mock

    pure, compiled = tmp_path / "pure", tmp_path / "plat"
    pure.mkdir()
    compiled.mkdir()
    fast = built("fast-lib", tag="cp312-cp312-linux_fixture", purelib=False)
    with (
        mock.patch.object(pack_install, "target", lambda: pure),
        mock.patch.object(pack_install, "library_target", lambda: compiled),
    ):
        pack_install.install(pack(), None, [fast, built("alpha-lib")], fits=HERE)
        assert (compiled / "fast_lib" / "__init__.py").is_file() and not (pure / "fast_lib").exists()
        assert (pure / "alpha_lib" / "__init__.py").is_file() and (pure / "pack_demo").is_dir()
        pack_install.remove("pack-demo")
    assert not list(pure.iterdir()) and not list(compiled.iterdir())


def test_remove_takes_out_only_what_no_other_installed_pack_uses(tmp_path):
    shared = built("alpha-lib")
    pack_install.install(pack("pack-one"), tmp_path, [shared, built("only-one-lib")], fits=HERE)
    pack_install.install(pack("pack-two"), tmp_path, [shared], fits=HERE)
    users = (tmp_path / "alpha_lib-1.0.0.dist-info" / "REQUIRED_BY").read_text().split()
    assert users == ["pack-one", "pack-two"]
    pack_install.remove("pack-one", tmp_path)
    assert (tmp_path / "alpha_lib" / "__init__.py").is_file()  # pack-two still uses it
    assert not (tmp_path / "only_one_lib").exists() and not (tmp_path / "pack_one").exists()
    assert (tmp_path / "alpha_lib-1.0.0.dist-info" / "REQUIRED_BY").read_text().split() == ["pack-two"]
    pack_install.remove("pack-two", tmp_path)
    assert list(tmp_path.iterdir()) == []


def test_an_update_replaces_the_pack_and_its_libraries_and_a_shared_one_at_another_version_is_refused(tmp_path):
    pack_install.install(pack("pack-one"), tmp_path, [built("alpha-lib", "1.0.0")], fits=HERE)
    pack_install.install(pack("pack-two"), tmp_path, [built("alpha-lib", "1.0.0")], fits=HERE)
    with pytest.raises(InstallError, match="would replace 1.0.0, which pack-two still uses"):
        pack_install.install(pack("pack-one"), tmp_path, [built("alpha-lib", "2.0.0")], fits=HERE)
    assert (tmp_path / "alpha_lib-1.0.0.dist-info").is_dir()  # nothing changed
    pack_install.remove("pack-two", tmp_path)
    updated = pack_install.install(pack("pack-one"), tmp_path, [built("alpha-lib", "2.0.0")], fits=HERE)
    assert updated.libraries == ["alpha-lib 2.0.0"]
    assert [p.name for p in tmp_path.glob("alpha_lib-*.dist-info")] == ["alpha_lib-2.0.0.dist-info"]


def test_what_an_install_would_add_is_what_is_not_in_place_already(tmp_path):
    libs = packs.Release.model_validate(release(library("alpha-lib"), library("beta-lib", "2.1"))).libraries
    assert pack_install.to_add(libs, tmp_path) == [("alpha-lib", "1.0.0"), ("beta-lib", "2.1")]
    pack_install.install(pack(), tmp_path, [built("alpha-lib")], fits=HERE)
    assert pack_install.to_add(libs, tmp_path) == [("beta-lib", "2.1")]


# ---- the Add-ons screen ---------------------------------------------------------------------------------------------


@pytest.fixture
def screen(tmp_path, monkeypatch):
    """The app with a catalog listing one pack with two libraries, the downloads faked (and recorded), and folders to
    install into."""
    from fastapi.testclient import TestClient

    from api.app import create_app
    from tests.test_setup import make

    alpha, beta = built("alpha-lib"), built("beta-lib", "2.1")
    data = pack(requires=["alpha-lib", "beta-lib"])
    by_url = {}
    libs = []
    for name, version, blob in (("alpha-lib", "1.0.0", alpha), ("beta-lib", "2.1", beta)):
        entry = library(name, version, sha=hashlib.sha256(blob).hexdigest())
        by_url[entry["url"].rsplit("/", 1)[-1]] = blob
        libs.append(entry)
    rel = release(*libs, sha256=hashlib.sha256(data).hexdigest())
    by_url[rel["url"].rsplit("/", 1)[-1]] = data
    entry = packs.Entry.model_validate({"id": "packdemo", "name": "Pack demo", "release": rel})
    monkeypatch.setattr(packs, "read_feeds", lambda *a, **k: [packs.Feed(HOST, [entry])])
    asked = []

    def download(url, sha, token=None, client=None):
        asked.append((url, token))
        return by_url[url.rsplit("/", 1)[-1]]

    monkeypatch.setattr(pack_install, "download", download)
    place = tmp_path / "site"
    place.mkdir()
    monkeypatch.setattr(pack_install, "target", lambda: place)
    monkeypatch.setattr(pack_install, "library_target", lambda: place)
    monkeypatch.setattr(pack_install, "supported", lambda: HERE)
    monkeypatch.syspath_prepend(str(place))
    ws, cfg, store = make(tmp_path)
    store.close()
    app = create_app(ws, cfg, "t", start_worker=False)
    c = TestClient(app)
    c.headers["Authorization"] = "Bearer t"
    return c, cfg.server.base_path.rstrip("/") + "/api", place, asked, ws


def test_the_screen_says_what_an_install_adds_before_it_installs_and_then_installs_exactly_those(screen):
    c, api, place, asked, ws = screen
    listed = {p["id"]: p for p in c.get(f"{api}/packs").json()["available"]}["packdemo"]
    assert listed["installable"] is True and listed["library_problem"] is None
    assert listed["libraries"] == [{"name": "alpha-lib", "version": "1.0.0"}, {"name": "beta-lib", "version": "2.1"}]
    assert asked == []  # looking asks nothing of the release host
    done = c.post(f"{api}/packs/packdemo/install")
    assert done.status_code == 200, done.text
    assert done.json()["libraries"] == listed["libraries"]
    # Exactly the release file and the listed libraries were fetched, in that order, and nothing else.
    assert [u.rsplit("/", 1)[-1] for u, _ in asked] == [
        "pack_demo-0.1.0-py3-none-any.whl",
        "alpha_lib-1.0.0-py3-none-any.whl",
        "beta_lib-2.1-py3-none-any.whl",
    ]
    assert (place / "alpha_lib" / "__init__.py").is_file() and (place / "beta_lib" / "__init__.py").is_file()
    after = {p["id"]: p for p in c.get(f"{api}/packs").json()["available"]}["packdemo"]
    assert after["libraries"] == []  # in place already, so nothing more would be added


def test_a_read_token_goes_only_to_the_releases_own_host_never_to_one_a_library_is_kept_on(screen, monkeypatch):
    c, api, place, asked, ws = screen
    mixed = packs.Entry.model_validate(
        {
            "id": "packdemo",
            "name": "Pack demo",
            "release": release(
                {**library("alpha-lib"), "url": f"{WEB}files.example.com/alpha_lib-1.0.0-py3-none-any.whl"},
                library("beta-lib", "2.1"),
            ),
        }
    )
    monkeypatch.setattr(packs, "read_feeds", lambda *a, **k: [packs.Feed(HOST, [mixed])])
    monkeypatch.setattr("engine.secrets.resolve_secret", lambda ref: "t0ken")
    path = ws.config_dir / "workspace.yaml"
    data = yaml.safe_load(path.read_text())
    data.setdefault("plugins", {}).setdefault("catalog", {})["release_tokens"] = {"releases.example.com": "env:T"}
    path.write_text(yaml.safe_dump(data))
    done = c.post(f"{api}/packs/packdemo/install")
    assert done.status_code == 200, done.text
    assert {u.split("/")[2]: t for u, t in asked} == {"releases.example.com": "t0ken", "files.example.com": None}


def test_a_library_with_no_build_for_this_computer_makes_the_pack_not_installable_here(screen, monkeypatch):
    c, api, place, asked, ws = screen
    elsewhere = packs.Entry.model_validate(
        {
            "id": "packdemo",
            "name": "Pack demo",
            "release": release(library("fast-lib", platform="win_amd64", tag="cp312-cp312-win_amd64")),
        }
    )
    monkeypatch.setattr(packs, "read_feeds", lambda *a, **k: [packs.Feed(HOST, [elsewhere])])
    listed = {p["id"]: p for p in c.get(f"{api}/packs").json()["available"]}["packdemo"]
    assert listed["installable"] is False and "no build for this computer" in listed["library_problem"]
    refused = c.post(f"{api}/packs/packdemo/install")
    assert refused.status_code == 409 and "no build for this computer" in refused.json()["detail"]
    assert asked == [] and list(place.iterdir()) == []


# ---- cockpit pack check ---------------------------------------------------------------------------------------------


def test_the_pack_check_verifies_the_list_of_libraries():
    from engine.pack_check import Report, _check_libraries

    rel = packs.Release.model_validate(
        release(
            library("alpha-lib"),
            library("beta-lib", platform="linux_fixture", tag="cp312-cp312-linux_fixture"),
            library("gamma-lib", platform="win_amd64", tag="cp312-cp312-win_amd64"),
        )
    )
    report = Report()
    _check_libraries(rel, "not-installed-here", report)
    assert not report.failed
    assert any("lists 3 libraries as built wheels with checksums" in p for p in report.passed)
    assert any("beta-lib has no build for win_amd64" in w for w in report.warned)
    assert any("isn't installed here" in w for w in report.warned)
    clash = Report()
    _check_libraries(packs.Release.model_validate(release(library("pydantic", "2.0.0"))), "x", clash)
    assert any("pydantic" in f and "clashes" in f for f in clash.failed)
    none = Report()
    _check_libraries(packs.Release.model_validate(release()), "x", none)
    assert none.ok and "lists no libraries" in none.passed[0]

"""The brand color, logo, theme and density reach the screen through the runtime config (design 7.12)."""

import re

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from api.app import create_app
from engine.config.schema import BrandSettings
from engine.workspace import init_workspace
from tests.conftest import DEMO_B

TOKEN = "test-token-value"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16


def client_for(tmp_path, flags):
    ws = init_workspace(tmp_path / "ws", template=DEMO_B, git=False)
    (ws.config_dir / "mark.png").write_bytes(PNG)
    cfg = ws.config(env={}, flags={"server.base_path": "/", **flags})
    app = create_app(ws, cfg, TOKEN, ui_dist=tmp_path / "no-ui")
    return TestClient(app, headers={"Authorization": f"Bearer {TOKEN}"})


def test_the_runtime_config_carries_the_appearance_settings(tmp_path):
    flags = {"ui.brand.color": "#225588", "ui.brand.logo": "mark.png", "ui.theme": "dark", "ui.density": "compact"}
    with client_for(tmp_path, flags) as client:
        rc = client.get("/api/runtime-config").json()
        assert (rc["brand_color"], rc["logo"], rc["theme"], rc["density"]) == ("#225588", True, "dark", "compact")
        logo = client.get("/api/brand/logo")
        assert logo.status_code == 200 and logo.content == PNG and logo.headers["content-type"] == "image/png"
        assert "default-src 'none'" in logo.headers["content-security-policy"]


def test_a_missing_logo_shows_the_monogram(tmp_path):
    with client_for(tmp_path, {"ui.brand.logo": "absent.svg"}) as client:
        assert client.get("/api/runtime-config").json()["logo"] is False
        assert client.get("/api/brand/logo").status_code == 404


@pytest.mark.parametrize("logo", ["../secret.png", "sub/mark.png", ".hidden.png", "mark.gif"])
def test_a_logo_is_an_image_file_in_the_config_folder_only(logo):
    with pytest.raises(ValidationError):
        BrandSettings(logo=logo)


def test_a_brand_color_is_a_hex_color():
    with pytest.raises(ValidationError):
        BrandSettings(color="indigo")


JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 16
NAMESPACE = "http" + "://www.w3.org/2000/svg"
SVG = f'<svg xmlns="{NAMESPACE}" viewBox="0 0 8 8"><rect width="8" height="8"/></svg>'.encode()


def upload(client, data, content_type="application/octet-stream"):
    return client.post("/api/brand/logo", content=data, headers={"content-type": content_type})


def save_setting(client, changes):
    fingerprint = client.get("/api/settings").json()["fingerprint"]
    return client.post("/api/settings", json={"changes": changes, "fingerprint": fingerprint})


def test_the_color_and_the_logo_are_a_picker_and_an_upload_on_the_settings_screen(tmp_path):
    with client_for(tmp_path, {}) as client:
        items = {i["key"]: i for i in client.get("/api/settings").json()["items"]}
        assert items["ui.brand.color"]["widget"] == "color" and items["ui.brand.logo"]["widget"] == "image"
        assert items["ui.theme"]["widget"] is None
        # No word of the file's own is on the screen: the picture is uploaded, never named.
        for key in ("ui.brand.color", "ui.brand.logo"):
            assert not any(word in items[key]["description"] for word in ("WCAG", "contrast", "by name", "#rrggbb"))


def test_an_uploaded_picture_is_kept_under_a_name_made_from_it_and_is_the_logo_once_saved(tmp_path):
    with client_for(tmp_path, {}) as client:
        ws_config = tmp_path / "ws" / "config"
        for kind, data in (("png", PNG), ("jpg", JPEG), ("svg", SVG)):
            kept = upload(client, data)
            assert kept.status_code == 200, kept.text
            name = kept.json()["name"]
            assert name.startswith("logo-") and name.endswith(f".{kind}")
            assert (ws_config / name).read_bytes() == data
            # The same picture is the same name, and nothing else was written.
            assert upload(client, data).json()["name"] == name
        # Uploading changes no setting: the logo is the one saved.
        assert client.get("/api/runtime-config").json()["logo"] is False
        name = upload(client, PNG).json()["name"]
        saved = save_setting(client, {"ui.brand.logo": name})
        assert saved.status_code == 200, saved.text
        assert client.get("/api/runtime-config").json()["logo"] is True
        served = client.get("/api/brand/logo")
        assert served.content == PNG and served.headers["content-type"] == "image/png"
        assert served.headers["x-content-type-options"] == "nosniff"


@pytest.mark.parametrize(
    ("data", "why"),
    [
        (b"", "empty"),
        (b"just some words", "isn't a picture"),
        (b"GIF89a" + b"\x00" * 16, "isn't a picture"),
        (f'<svg xmlns="{NAMESPACE}"><script>alert(1)</script></svg>'.encode(), "runs"),
        (f'<svg xmlns="{NAMESPACE}" onload="alert(1)"><rect/></svg>'.encode(), "runs"),
        (PNG + b"\x00" * (600 * 1024), "at most 512 KB"),
    ],
)
def test_a_file_that_cannot_be_a_logo_is_refused_with_its_reason_and_nothing_is_kept(tmp_path, data, why):
    with client_for(tmp_path, {}) as client:
        before = sorted(p.name for p in (tmp_path / "ws" / "config").iterdir())
        refused = upload(client, data)
        assert refused.status_code == 400
        assert why in refused.json()["detail"]
        assert refused.headers["x-cockpit-field"] == "ui.brand.logo"
        assert sorted(p.name for p in (tmp_path / "ws" / "config").iterdir()) == before


def test_the_most_a_picture_may_hold_is_a_setting(tmp_path):
    with client_for(tmp_path, {}) as client:
        ui = tmp_path / "ws" / "config" / "ui.yaml"
        ui.write_text(re.sub(r"^brand:.*$", "brand: {logo_max_kb: 16}", ui.read_text(), flags=re.M))
        assert upload(client, PNG + b"\x00" * (20 * 1024)).status_code == 400
        assert upload(client, PNG).status_code == 200


def test_a_logo_that_is_not_there_is_refused_when_it_is_chosen_with_a_plain_reason(tmp_path):
    with client_for(tmp_path, {}) as client:
        refused = save_setting(client, {"ui.brand.logo": "absent.png"})
        assert refused.status_code == 400
        assert refused.json()["detail"] == "There is no logo picture by that name. Upload a picture instead."
        assert refused.headers["x-cockpit-field"] == "ui.brand.logo"
        # A file in the folder that is not a picture is refused too, and no file name's ending makes it one.
        (tmp_path / "ws" / "config" / "notes.png").write_bytes(b"not a picture")
        again = save_setting(client, {"ui.brand.logo": "notes.png"})
        assert again.status_code == 400 and "isn't a picture" in again.json()["detail"]
        # Going back to the initials is a reset, which always saves.
        kept = upload(client, PNG).json()["name"]
        assert save_setting(client, {"ui.brand.logo": kept}).status_code == 200
        fingerprint = client.get("/api/settings").json()["fingerprint"]
        back = client.post("/api/settings", json={"reset": ["ui.brand.logo"], "fingerprint": fingerprint})
        assert back.status_code == 200
        assert client.get("/api/runtime-config").json()["logo"] is False

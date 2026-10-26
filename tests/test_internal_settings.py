"""A schema field marked internal is never listed for the Settings screens."""

from pydantic import BaseModel, Field

from engine import settings


def test_a_field_marked_internal_is_not_listed():
    class Part(BaseModel):
        shown: str = "a"
        address: str = Field("b", json_schema_extra={"internal": True})

    class Root(BaseModel):
        part: Part = Part()

    out: list = []
    settings._walk(Root, ["demo"], {}, {}, {}, out)
    assert [s.key for s in out] == ["demo.part.shown"]


def _described():
    out: list = []
    for name, model in settings.FILES.items():
        defaults = model().model_dump(mode="json")
        settings._walk(model, [name], defaults, defaults, {}, out)
    return out


def _all_keys():
    keys: list[str] = []

    def walk(model, path):
        for name, info in model.model_fields.items():
            inner = settings._model_of(info.annotation)
            if inner is not None:
                walk(inner, [*path, name])
            else:
                keys.append(".".join([*path, name]))

    for name, model in settings.FILES.items():
        walk(model, [name])
    return keys


def _extra(key):
    model = settings.FILES[key.split(".")[0]]
    path = key.split(".")[1:]
    for part in path[:-1]:
        model = settings._model_of(model.model_fields[part].annotation)
    extra = model.model_fields[path[-1]].json_schema_extra
    return extra if isinstance(extra, dict) else {}


def test_no_internal_field_is_listed_by_the_settings_forms():
    listed = {s.key for s in _described()}
    internal = [k for k in _all_keys() if _extra(k).get("internal") is True]
    assert internal, "some fields are kept only in files"
    assert not listed & set(internal)


def test_every_listed_field_is_basic_or_advanced():
    """More settings holds nothing in between: a field is on screen, behind Advanced, or only in files."""
    middle = [
        s.key
        for s in _described()
        if not s.basic
        and not s.advanced
        and not s.key.startswith(("ai.tasks", "ai.tiers", "ai.routing"))
        and s.type != "other"
    ]
    assert middle == [], f"place these in engine/config/levels.py: {middle}"

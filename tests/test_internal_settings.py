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

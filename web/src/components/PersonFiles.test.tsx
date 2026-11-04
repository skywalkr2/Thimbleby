import { screen, within } from "@testing-library/react";
import type { S } from "../lib/api";
import { fakeApi, renderApp } from "../test-utils";
import { FilesFromCard, filesFromPerson, usePersonFiles } from "./PersonFiles";

function file(id: string, name: string, extra: Partial<S["FileView"]> = {}): S["FileView"] {
  return {
    id,
    version: 1,
    name,
    media_type: "application/pdf",
    size: 2048,
    file_kind: "attachment",
    kind_label: "Attachment",
    project: null,
    meta: {},
    origin: "upload",
    replaces: null,
    from_person: null,
    added_at: "2026-10-09T14:00:00Z",
    data_level: "internal",
    ...extra,
  };
}

test("a file belongs to the person it records as where it came from, never to one a details key names", () => {
  const files = [
    file("FILE-1", "from-them.pdf", { from_person: "PER-1" }),
    file("FILE-2", "from-someone-else.pdf", { from_person: "PER-2" }),
    file("FILE-3", "from-no-one.pdf"),
    file("FILE-4", "details-only.pdf", { meta: { person: "PER-1" } }),
  ];
  expect(filesFromPerson(files, "PER-1").map((f) => f.name)).toEqual(["from-them.pdf"]);
  expect(filesFromPerson(undefined, "PER-1")).toEqual([]);
});

function Probe(props: { person: string }) {
  const files = usePersonFiles(props.person, true);
  return files.length ? <FilesFromCard name="Ada" files={files} onSeeAll={() => {}} limit={1} /> : <p>none</p>;
}

test("the card lists their files, newest first, with See all when there are more, and is not drawn for a person with none", async () => {
  fakeApi({
    "GET files": () => [
      file("FILE-2", "newer.pdf", { from_person: "PER-1" }),
      file("FILE-1", "older.pdf", { from_person: "PER-1" }),
    ],
  });
  const first = renderApp(<Probe person="PER-1" />);
  const card = await screen.findByRole("region", { name: /Ada/ });
  expect(within(card).getByRole("link", { name: /newer\.pdf/ })).toBeInTheDocument();
  expect(within(card).queryByText("older.pdf")).toBeNull();
  expect(within(card).getByRole("button", { name: "See all" })).toBeInTheDocument();
  first.unmount();
  renderApp(<Probe person="PER-9" />);
  expect(await screen.findByText("none")).toBeInTheDocument();
});

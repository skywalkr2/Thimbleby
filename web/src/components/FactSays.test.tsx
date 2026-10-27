// A fact that is one person's word keeps who said it where the assistant's work is listed (design 6.32, F44): "Pat says the
// offsite is on a Friday · Oct 27". A fact stated as settled reads as the world and carries no name.
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import type { S } from "../lib/api";
import { fakeApi, renderApp } from "../test-utils";
import { OpRow } from "./WhatChanged";

const cs: S["ChangesetView"] = { id: "CS-1", summary: "Read the mail.", status: "applied", reviewed: false, trust: "untrusted", ops: [], made: [] };

function fact(title: string, meta: S["OpMeta"]): S["OpView"] {
  return { index: 0, op: "fact", status: "applied", reason: null, group: "g", title, meta, evidence: { quote: "the offsite is on a Friday" } } as S["OpView"];
}

function show(op: S["OpView"]) {
  fakeApi({});
  renderApp(
    <ul>
      <OpRow op={op} cs={cs} source={null} />
    </ul>,
  );
}

test("a fact that is someone's word reads who said it and the day, not as settled", () => {
  show(fact("The offsite is on a Friday.", { owners: [], said_by: "Pat Example", as_of: "2026-10-27" }));
  expect(screen.getByText("Pat Example says the offsite is on a Friday")).toBeInTheDocument();
  expect(screen.getByText(/Oct 27/)).toBeInTheDocument();
});

test("a fact stated as settled keeps its words and names no one", () => {
  show(fact("The offsite is on a Friday.", { owners: [] }));
  expect(screen.getByText("The offsite is on a Friday.")).toBeInTheDocument();
  expect(screen.queryByText(/ says /)).toBeNull();
});

test("a name or acronym at the start of a said fact is not lower-cased", () => {
  show(fact("NASA is on a Friday.", { owners: [], said_by: "Pat Example", as_of: "2026-10-27" }));
  expect(screen.getByText("Pat Example says NASA is on a Friday")).toBeInTheDocument();
});

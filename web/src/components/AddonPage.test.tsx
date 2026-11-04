import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import type { S } from "../lib/api";
import { fakeApi, renderApp } from "../test-utils";
import { AddonPage } from "./AddonPage";

// An add-on's own page of Settings is never a blank under its title: it says what the add-on is and how it stands, and when
// it has nothing to set it says where its sign-in and what it reads are kept.

const NOTHING: S["PackSummary"] = {
  adds: { item_types: [], screens: 0, today: 0, ai_work: 0, actions: 0, setup_steps: 0, sources: 0 },
  reaches: { sign_ins: [], hosts: [], programs: [], keys: 0 },
  keeps: "open",
};

function show(signedIn: boolean | null = true) {
  fakeApi({
    "GET packs": () => ({
      enabled: true,
      feeds: [],
      available: [],
      installed: [{ name: "mail", version: "0.4.0", description: "Reads your mail, only reads.", enabled: true, state: "enabled", reason: null, removable: false, signed_in: signedIn, what: NOTHING }],
    }),
    "GET addon-secrets": () => [{ plugin: "mail", secrets: [] }],
  });
}

test("the page says how the add-on stands and what it is for, then that it has nothing to set, with the way to Connections", async () => {
  show();
  renderApp(<AddonPage plugin="mail" hasContent={false} />);
  expect(await screen.findByText("Reads your mail, only reads.")).toBeInTheDocument();
  expect(screen.getByText(/Version 0\.4\.0/)).toBeInTheDocument();
  expect(screen.getByText("On")).toBeInTheDocument();
  expect(screen.getByText("Nothing to set here")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open Connections" })).toHaveAttribute("href", expect.stringContaining("settings/connections"));
});

test("a page that has settings shows them under the header and no empty state", async () => {
  show();
  renderApp(
    <AddonPage plugin="mail" hasContent>
      <p>A setting of its own</p>
    </AddonPage>,
  );
  expect(await screen.findByText("Reads your mail, only reads.")).toBeInTheDocument();
  expect(screen.getByText("A setting of its own")).toBeInTheDocument();
  expect(screen.queryByText("Nothing to set here")).toBeNull();
});

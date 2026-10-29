import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test-utils";
import { ActivityList } from "./ActivityList";
import { AskAboutThis } from "./AskAboutThis";
import { Definition, DefinitionList } from "./DefinitionList";

test("a definition list holds a label and its value in each row, and a compact form for a card", () => {
  const { container } = renderApp(
    <>
      <DefinitionList aria-label="Facts">
        <Definition>
          <dt>Email</dt>
          <dd>someone@example.com</dd>
        </Definition>
        <Definition>
          <dd>A sentence the list carries</dd>
        </Definition>
      </DefinitionList>
      <DefinitionList inline aria-label="Card">
        <Definition>
          <dt>Due</dt>
          <dd>Mon</dd>
        </Definition>
      </DefinitionList>
    </>,
  );
  expect(container.querySelectorAll("[data-definition-list]")).toHaveLength(2);
  expect(container.querySelectorAll("dl > div[data-definition] > dt")).toHaveLength(2);
  expect(screen.getByText("someone@example.com").tagName).toBe("DD");
});

const at = (day: string, time = "09:00") => `${day}T${time}:00Z`;

test("an activity list groups its entries by day, shows the latest five, and asks for the rest", async () => {
  const user = userEvent.setup();
  const entries = [
    { key: "1", at: at("2026-10-12", "13:22"), body: "Emailed you" },
    { key: "2", at: at("2026-10-12", "13:23"), body: "Added a to-do" },
    { key: "3", at: at("2026-10-11", "16:10"), body: "Marked waiting" },
    { key: "4", at: at("2026-10-10"), body: "Edited the date" },
    { key: "5", at: at("2026-10-09"), body: "Filed a note" },
    { key: "6", at: at("2026-10-08"), body: "Made the record" },
  ];
  renderApp(<ActivityList entries={entries} label="Activity" />);
  const list = screen.getByRole("group", { name: "Activity" });
  expect(list.querySelectorAll("[data-activity-entry]")).toHaveLength(5);
  // The only list items are the entries: a day's heading is not one.
  expect(within(list).getAllByRole("listitem")).toHaveLength(5);
  // Two entries of the same day sit under one heading, with their times.
  expect(within(list).getAllByRole("heading", { level: 3 })).toHaveLength(4);
  expect(within(list).getByText("1:22 PM")).toBeInTheDocument();
  expect(within(list).queryByText("Made the record")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Show all activity" }));
  expect(list.querySelectorAll("[data-activity-entry]")).toHaveLength(6);
  expect(screen.getByRole("button", { name: "Show fewer" })).toHaveAttribute("aria-expanded", "true");
});

test("a short activity list has nothing to ask for", () => {
  renderApp(<ActivityList entries={[{ key: "1", at: at("2026-10-12"), body: "Only one" }]} />);
  expect(screen.queryByRole("button")).toBeNull();
});

test("the composer is one line with its send button inside: Enter sends, Shift+Enter starts a line, an empty box can't send", async () => {
  const user = userEvent.setup();
  const sent: string[] = [];
  function Harness() {
    const [value, setValue] = useState("");
    return <AskAboutThis label="Ask about this" placeholder="Ask about this person…" hint="Helper sees this." value={value} onChange={setValue} onSend={() => sent.push(value)} sendLabel="Send" />;
  }
  renderApp(<Harness />);
  const box = screen.getByRole("textbox", { name: "Ask about this" });
  expect(box).toHaveAttribute("placeholder", "Ask about this person…");
  expect(box).toHaveAccessibleDescription("Helper sees this.");
  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  await user.type(box, "What is open?{Enter}");
  expect(sent).toEqual(["What is open?"]);
  await user.type(box, " and more{Shift>}{Enter}{/Shift}next");
  expect(sent).toHaveLength(1);
  expect((box as HTMLTextAreaElement).value).toContain("\n");
  await user.click(screen.getByRole("button", { name: "Send" }));
  expect(sent).toHaveLength(2);
});

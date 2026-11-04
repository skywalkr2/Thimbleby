import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { dayAndTime } from "../lib/dates";
import type { View } from "../lib/views";
import { fakeApi, renderApp } from "../test-utils";
import { MAIL_LINK_MAX } from "../lib/mail";
import { Feedback } from "./Feedback";

const TO = "feedback@example.com";
const SUBJECT = "Feedback on Thimbleby";

type Problem = S["FeedbackProblem"];

function open(props: { to?: string | null; view?: View; version?: string; problems?: Problem[] } = {}) {
  fakeApi({
    "GET panels": () => [{ name: "plan", title: "The plan", tab: "work" }],
    ...(props.problems ? { "GET feedback/problems": () => ({ problems: props.problems }) } : {}),
  });
  const onClose = vi.fn();
  renderApp(<Feedback onClose={onClose} view={props.view ?? "records/files"} version={props.version ?? "9.8.7"} to={"to" in props ? props.to : TO} />);
  return { onClose, user: userEvent.setup() };
}

const message = () => screen.getByLabelText("What happened, or what would help?");
const preview = () => screen.getByLabelText("Message") as HTMLTextAreaElement;
// The technical lines, kept under a collapsed "Details for the makers"; what is sent is the preview, a blank line, that heading and these.
const details = () => screen.getByLabelText("Details for the makers") as HTMLTextAreaElement;
const VERSION = "App version: 9.8.7";
const sent = (plain: string, technical = VERSION) => `${plain}\n\nDetails for the makers\n${technical}`;

test("the dialog is named, the box has the focus and nothing can go until something is written", () => {
  open();
  expect(screen.getByRole("dialog", { name: "Write feedback" })).toBeInTheDocument();
  expect(message()).toHaveFocus();
  expect(message()).toBeRequired();
  expect(message()).toHaveAccessibleDescription("Nothing is sent from here: you send it from your own email app.");
  // The reason the buttons wait sits with the buttons, not above the box.
  expect(screen.getByRole("button", { name: "Open in your email app" })).toHaveAccessibleDescription("Write a few words to continue.");
  // Said once, beside the primary, not again beside Copy.
  expect(screen.getAllByText("Write a few words to continue.")).toHaveLength(1);
  // The preview, the subject and the counts are under one closed "What will be sent".
  expect(screen.getByText("What will be sent").closest("details")).not.toHaveAttribute("open");
  expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Open in your email app" })).toBeDisabled();
  expect(screen.queryByRole("link", { name: "Open in your email app" })).toBeNull();
});

test("the preview is the message and the screen in plain words, with the version under Details for the makers", async () => {
  const { user } = open();
  expect(screen.getByLabelText("Include the app version and the screen you were on")).toBeChecked();
  await user.type(message(), "The list is empty");
  expect(screen.getByLabelText("Subject")).toHaveValue(SUBJECT);
  expect(screen.getByLabelText("Subject")).toHaveAttribute("readonly");
  expect(preview()).toHaveAttribute("readonly");
  expect(preview().value).toBe("The list is empty\n\nScreen: Files");
  expect(details().value).toBe(VERSION);
  expect(details().closest("details")).not.toHaveAttribute("open");
  expect(screen.getByText("Details for the makers").tagName).toBe("SUMMARY");
});

test("before anything is written the preview starts with the facts, never with blank lines", () => {
  open();
  expect(preview().value).toBe("Screen: Files");
});

test("without the version lines the body is only what was written", async () => {
  const { user } = open();
  await user.type(message(), "Just this");
  await user.click(screen.getByLabelText("Include the app version and the screen you were on"));
  expect(preview().value).toBe("Just this");
  expect(preview().value).not.toMatch(/version|Screen/i);
  expect(screen.queryByText("Details for the makers")).toBeNull();
});

test("the screen is a plugin panel's title or a record page's general name", async () => {
  const first = open({ view: "work/panel/plan" });
  await first.user.type(message(), "x");
  await waitFor(() => expect(preview().value).toMatch(/Screen: The plan$/));
});

test("a record page is named in general terms, never by its record", async () => {
  const { user } = open({ view: "records/thing/abc" });
  await user.type(message(), "x");
  expect(preview().value).toMatch(/Screen: A project or person page$/);
  expect(preview().value).not.toMatch(/abc|thing/);
});

test("with an address the mail link is the main action, with the subject and body encoded", async () => {
  const { user } = open();
  await user.type(message(), "Line one\nLine & two");
  const link = screen.getByRole("link", { name: "Open in your email app" });
  const body = sent("Line one\nLine & two\n\nScreen: Files");
  expect(link).toHaveAttribute(
    "href",
    `mailto:${TO}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(body.replace(/\n/g, "\r\n"))}`,
  );
  expect(link).toHaveAttribute("data-variant", "primary");
  expect(screen.getByRole("button", { name: "Copy" })).not.toHaveAttribute("data-variant", "primary");
});

test("the version and screen lines are left out of the link when unchecked", async () => {
  const { user } = open();
  await user.type(message(), "Only this");
  await user.click(screen.getByLabelText("Include the app version and the screen you were on"));
  const href = screen.getByRole("link", { name: "Open in your email app" }).getAttribute("href")!;
  expect(href).toContain(`body=${encodeURIComponent("Only this")}`);
  expect(href).not.toContain("version");
});

test("a message too long for a mail link has no link and says to copy it", async () => {
  const { user } = open();
  await user.click(message());
  await user.paste("a".repeat(MAIL_LINK_MAX));
  expect(screen.queryByRole("link", { name: "Open in your email app" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Open in your email app" })).toBeNull();
  expect(screen.getByText(/too long for a mail link/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy" })).toHaveAttribute("data-variant", "primary");
});

test("without an address the email app still opens, and the hint says who to send it to", async () => {
  const { user } = open({ to: null });
  await user.type(message(), "Hello");
  const link = screen.getByRole("link", { name: "Open in your email app" });
  expect(link.getAttribute("href")).toMatch(/^mailto:\?subject=/);
  expect(screen.getByText(/send it to whoever gave you the app/)).toBeInTheDocument();
});

test("Copy puts the subject, a blank line and the body on the clipboard, and says so", async () => {
  const { user } = open({ to: null });
  await user.type(message(), "Hello");
  await user.click(screen.getByRole("button", { name: "Copy" }));
  expect(await navigator.clipboard.readText()).toBe(`${SUBJECT}\n\n${sent("Hello\n\nScreen: Files")}`);
  expect(await screen.findByText("Copied. Paste it into an email to send it.")).toBeInTheDocument();
});

test("when copying is blocked it says so and the text stays there to select", async () => {
  const { user } = open();
  await user.type(message(), "Hello");
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("blocked"));
  await user.click(screen.getByRole("button", { name: "Copy" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/Copying was blocked/);
  expect(screen.queryByText(/^Copied/)).toBeNull();
  expect(preview().value).toContain("Hello");
  expect(preview()).not.toBeDisabled();
});

test("Close and Escape close the dialog", async () => {
  const { user, onClose } = open();
  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  await user.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalledTimes(2);
});

const CALL: Problem = {
  at: "2026-10-21T09:30:00+10:00",
  doing: "task",
  what: "notes",
  service: "example-service",
  adapter: "example-adapter",
  program_version: null,
  params: { tier: "routine", model: "example-model", temperature: "0.2", max_output: "800", send_temperature: "yes" },
  status: 400,
  error_kind: "other",
  text: "bad key <secret> for <name> <address>",
};
const READ: Problem = {
  at: "2026-10-21T08:00:00Z",
  doing: "source_read",
  what: "folder",
  service: null,
  adapter: null,
  program_version: null,
  params: {},
  status: null,
  error_kind: "outage",
  text: "couldn't read <path>",
};
const CALL_LINES = [
  "2026-10-21 09:30 +10:00",
  "Doing: working on notes",
  "Service: example-service",
  "Adapter: example-adapter",
  "Request: level of work: routine; model: example-model; temperature: 0.2; output limit: 800; sends temperature: yes",
  "Status: 400",
  "Error: other",
  "Said: bad key <secret> for <name> <address>",
];
const READ_LINES = ["2026-10-21 08:00 UTC", "Doing: reading folder", "Error: outage", "Said: couldn't read <path>"];

test("the problems box appears only when there were problems, is ticked; the preview says them in words and the details hold the exact lines", async () => {
  const { user } = open({ problems: [CALL, READ] });
  const box = await screen.findByRole("checkbox", { name: "Add the last problems (2)" });
  expect(box).toBeChecked();
  await user.type(message(), "It failed");
  const plain = [
    "It failed",
    "",
    "Screen: Files",
    "",
    "The assistant ran into 2 problems lately:",
    `- ${dayAndTime(CALL.at)}: the assistant was working on notes, and it did not work.`,
    `- ${dayAndTime(READ.at)}: a folder source was being read, and the service could not be reached.`,
  ].join("\n");
  expect(preview().value).toBe(plain);
  // The words carry no raw date, no error code and no text the service gave; every one of those is still in the details.
  expect(preview().value).not.toMatch(/2026-10|\+10:00|UTC|Error:|Status:|outage|bad key|example-model/);
  const technical = [VERSION, "", "Recent problems", ...CALL_LINES, "", ...READ_LINES].join("\n");
  expect(details().value).toBe(technical);
  expect(details().closest("details")).not.toHaveAttribute("open");
  expect(screen.getByRole("link", { name: "Open in your email app" }).getAttribute("href")).toContain(encodeURIComponent(sent(plain, technical).replace(/\n/g, "\r\n")));
});

test("unticking the problems takes every one of their lines out of the preview and the link", async () => {
  const { user } = open({ problems: [CALL] });
  await user.type(message(), "It failed");
  await user.click(await screen.findByRole("checkbox", { name: "Add the last problems (1)" }));
  expect(preview().value).toBe("It failed\n\nScreen: Files");
  expect(details().value).toBe(VERSION);
  expect(screen.getByRole("link", { name: "Open in your email app" }).getAttribute("href")).not.toContain("Recent");
});

test("the problems are in the email link and on the clipboard exactly as the preview shows them", async () => {
  const { user } = open({ problems: [READ] });
  await user.type(message(), "Hello");
  await screen.findByRole("checkbox", { name: "Add the last problems (1)" });
  const body = sent(preview().value, details().value);
  expect(screen.getByRole("link", { name: "Open in your email app" })).toHaveAttribute("href", expect.stringContaining(encodeURIComponent(body.replace(/\n/g, "\r\n"))));
  await user.click(screen.getByRole("button", { name: "Copy" }));
  expect(await navigator.clipboard.readText()).toBe(`${SUBJECT}\n\n${body}`);
});

test("with no problems, or when they can't be fetched, there is no problems box", async () => {
  const none = open({ problems: [] });
  await none.user.type(message(), "x");
  await waitFor(() => expect(screen.queryByRole("checkbox", { name: /last problems/ })).toBeNull());
  expect(preview().value).toBe("x\n\nScreen: Files");
});

test("problems too long for a mail link leave the copy path", async () => {
  const long = { ...CALL, text: "x".repeat(MAIL_LINK_MAX) };
  const { user } = open({ problems: [long] });
  await user.type(message(), "Hello");
  await screen.findByRole("checkbox", { name: "Add the last problems (1)" });
  expect(screen.queryByRole("link", { name: "Open in your email app" })).toBeNull();
  expect(screen.getByText(/too long for a mail link/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy" })).toHaveAttribute("data-variant", "primary");
});

// ---- how often "Missed something?" was used (designer F8) -------------------------------------------------------------

const missedRow = (person: string, week: string, week_end: string, count: number): S["QualityMissedWeek"] => ({ person, person_name: `Person ${person}`, week, week_end, count });

function openWithMissed(rows: S["QualityMissedWeek"][] | "unreadable") {
  fakeApi({
    "GET panels": () => [],
    ...(rows === "unreadable" ? {} : { "GET quality": () => ({ missed: rows }) }),
  });
  renderApp(<Feedback onClose={() => {}} view="records/files" version="9.8.7" to={TO} />);
  return userEvent.setup();
}

test("the form shows how often Missed something? was used each week, and the message carries only those numbers", async () => {
  const user = openWithMissed([missedRow("PER-1", "2026-10-12", "2026-10-18", 4), missedRow("PER-1", "2026-10-19", "2026-10-25", 1)]);
  const box = await screen.findByLabelText("Add how often I used “Missed something?”, week by week");
  expect(box).toBeChecked();
  expect(box).toHaveAccessibleDescription(/Only the counts are added, never what you said\..*4 from Oct 12 to Oct 18.*1 from Oct 19 to Oct 25/);
  await user.type(message(), "It missed my call notes");
  expect(preview().value).toBe(
    "It missed my call notes\n\nScreen: Files\n\n“Missed something?” was used 4 from Oct 12 to Oct 18.\n“Missed something?” was used 1 from Oct 19 to Oct 25.",
  );
  await user.click(box);
  expect(preview().value).toBe("It missed my call notes\n\nScreen: Files");
});

test("the counts of the people in one week are added, and a week with none used says so", async () => {
  const user = openWithMissed([missedRow("PER-1", "2026-10-12", "2026-10-18", 2), missedRow("PER-2", "2026-10-12", "2026-10-18", 3)]);
  await screen.findByLabelText("Add how often I used “Missed something?”, week by week");
  await user.type(message(), "x");
  expect(preview().value).toMatch(/“Missed something\?” was used 5 from Oct 12 to Oct 18\.$/);
});

test("with nothing counted yet the form still says so", async () => {
  const user = openWithMissed([]);
  await screen.findByLabelText("Add how often I used “Missed something?”, week by week");
  await user.type(message(), "x");
  expect(preview().value).toMatch(/“Missed something\?” was not used in the weeks counted\.$/);
});

test("when the counts can't be read the form offers nothing about them", async () => {
  const user = openWithMissed("unreadable");
  await user.type(await screen.findByLabelText("What happened, or what would help?"), "x");
  expect(screen.queryByLabelText(/Missed something/)).toBeNull();
  expect(preview().value).toBe("x\n\nScreen: Files");
});

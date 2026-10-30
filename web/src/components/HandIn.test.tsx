import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { fakeApi, Refuse, renderApp } from "../test-utils";
import { HandIn } from "./HandIn";

const handed = () => ({ request: "REQ-1", source: null });

const project = (id: string, name: string, extra: Partial<S["ProjectView"]> = {}): S["ProjectView"] => ({
  id,
  name,
  no_end: false,
  side: false,
  group: null,
  status: null,
  phase: null,
  target: null,
  owner: null,
  owner_name: null,
  summary: null,
  language: "en-US",
  language_own: false,
  role: "run",
  completed: false,
  spent_usd: 0,
  open_actions: 0,
  open_questions: 0,
  ...extra,
});
const PROJECTS = [
  project("P-1", "Harbor"),
  project("P-2", "Lighthouse", { parent: "P-1" }),
  project("P-3", "Old dock", { status: "Done" }),
  project("P-4", "Ferry"),
];

async function setup(extra: Parameters<typeof fakeApi>[0] = {}) {
  const user = userEvent.setup();
  const calls = fakeApi({ "POST handin": handed, "GET projects": () => PROJECTS, ...extra });
  const onClose = vi.fn();
  renderApp(<HandIn onClose={onClose} />);
  return { user, calls, onClose };
}

const sent = (calls: Array<{ route: string; body: unknown }>) => calls.find((c) => c.route === "POST handin")?.body;

test("there is one box and it has the focus", async () => {
  await setup();
  const box = screen.getByLabelText("Paste or type it here");
  expect(box).toHaveFocus();
  expect(screen.getAllByRole("textbox")).toHaveLength(2); // the box and the optional line
});

test("someone else's words are the default and are sent as pasted content", async () => {
  const { user, calls, onClose } = await setup();
  expect(screen.getByRole("radio", { name: /Someone else's/ })).toBeChecked();
  await user.type(screen.getByLabelText("Paste or type it here"), "Subject: dates");
  await user.click(screen.getByRole("button", { name: "Hand in" }));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(sent(calls)).toEqual({ note: "", pasted: "Subject: dates" });
});

test("the optional line is the note that goes with someone else's words", async () => {
  const { user, calls } = await setup();
  await user.type(screen.getByLabelText("Paste or type it here"), "Subject: dates");
  await user.type(screen.getByLabelText("Anything to do with it? (optional)"), "file the dates");
  await user.click(screen.getByRole("button", { name: "Hand in" }));
  await waitFor(() => expect(sent(calls)).toEqual({ note: "file the dates", pasted: "Subject: dates" }));
});

test("choosing Mine sends the box as the note and takes the optional line away", async () => {
  const { user, calls } = await setup();
  await user.type(screen.getByLabelText("Anything to do with it? (optional)"), "ignored line");
  await user.click(screen.getByRole("radio", { name: "Mine" }));
  expect(screen.queryByLabelText("Anything to do with it? (optional)")).not.toBeInTheDocument();
  await user.type(screen.getByLabelText("Paste or type it here"), "remember the reading series");
  await user.click(screen.getByRole("button", { name: "Hand in" }));
  await waitFor(() => expect(sent(calls)).toEqual({ note: "remember the reading series", pasted: "" }));
});

test("nothing can be handed in with an empty box", async () => {
  const { user } = await setup();
  await user.type(screen.getByLabelText("Anything to do with it? (optional)"), "only a line");
  expect(screen.getByRole("button", { name: "Hand in" })).toBeDisabled();
});

test("the choice can be made from the keyboard", async () => {
  const { user, calls } = await setup();
  await user.type(screen.getByLabelText("Paste or type it here"), "my own words");
  await user.tab(); // Choose a file.
  await user.tab(); // The choice (a segmented control: arrows move along it, Space chooses).
  await user.keyboard("{ArrowRight} ");
  expect(screen.getByRole("radio", { name: "Mine" })).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Hand in" }));
  await waitFor(() => expect(sent(calls)).toEqual({ note: "my own words", pasted: "" }));
});

test("how sensitive it is starts at the usual and sends nothing about it", async () => {
  const { user, calls } = await setup();
  expect(screen.getByLabelText("Who may see this?")).toHaveValue("");
  expect(screen.getByRole("option", { name: "Normal" })).toBeInTheDocument();
  await user.type(screen.getByLabelText("Paste or type it here"), "Subject: dates");
  await user.click(screen.getByRole("button", { name: "Hand in" }));
  await waitFor(() => expect(sent(calls)).toEqual({ note: "", pasted: "Subject: dates" }));
  expect(sent(calls)).not.toHaveProperty("data_level");
});

test("Confidential and Private are sent as the level the person chose, in plain words", async () => {
  const { user, calls } = await setup();
  const choice = screen.getByLabelText("Who may see this?");
  expect(within(choice).getAllByRole("option").map((o) => o.textContent)).toEqual([
    "Normal",
    "Confidential",
    "Private",
  ]);
  await user.type(screen.getByLabelText("Paste or type it here"), "Subject: dates");
  await user.selectOptions(choice, "Confidential");
  await user.click(screen.getByRole("button", { name: "Hand in" }));
  await waitFor(() => expect(sent(calls)).toEqual({ note: "", pasted: "Subject: dates", data_level: "internal" }));
});

test("Private is sent with the person's own note too", async () => {
  const { user, calls } = await setup();
  await user.click(screen.getByRole("radio", { name: "Mine" }));
  await user.type(screen.getByLabelText("Paste or type it here"), "keep this quiet");
  await user.selectOptions(screen.getByLabelText("Who may see this?"), "Private");
  await user.click(screen.getByRole("button", { name: "Hand in" }));
  await waitFor(() => expect(sent(calls)).toEqual({ note: "keep this quiet", pasted: "", data_level: "restricted" }));
});

test("the project choice starts at not sure, lists every project with sub-projects after their parent, and sends none", async () => {
  const { user, calls } = await setup();
  const choice = screen.getByLabelText("Where does it belong?");
  expect(choice).toHaveValue("");
  expect(choice).toHaveAccessibleDescription("Helps Helper file things in the right place.");
  await waitFor(() =>
    expect(within(choice).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Not sure / several",
      "Harbor",
      "Harbor › Lighthouse",
      "Old dock",
      "Ferry",
    ]),
  );
  await user.type(screen.getByLabelText("Paste or type it here"), "Subject: dates");
  await user.click(screen.getByRole("button", { name: "Hand in" }));
  await waitFor(() => expect(sent(calls)).toEqual({ note: "", pasted: "Subject: dates" }));
  expect(sent(calls)).not.toHaveProperty("project");
});

test("a chosen project is sent by its id, and choosing not sure again takes it back", async () => {
  const { user, calls } = await setup();
  const choice = screen.getByLabelText("Where does it belong?");
  await screen.findByRole("option", { name: "Harbor › Lighthouse" });
  await user.type(screen.getByLabelText("Paste or type it here"), "Subject: dates");
  await user.selectOptions(choice, "Harbor › Lighthouse");
  await user.selectOptions(choice, "Not sure / several");
  await user.selectOptions(choice, "Ferry");
  await user.click(screen.getByRole("button", { name: "Hand in" }));
  await waitFor(() => expect(sent(calls)).toEqual({ note: "", pasted: "Subject: dates", project: "P-4" }));
});

// A pasted screenshot (design 7.6): the box takes words, and the assistant reads text. A picture on the clipboard is not
// dropped without a word: the box says plainly that it can't be read, and what was already there stays.

const picture = () => new File(["x"], "screenshot.png", { type: "image/png" });

test("a picture with no reading account is kept with a plain message and leaves the box as it was", async () => {
  const { user, calls } = await setup({
    "POST handin/image": () => ({
      status: "kept",
      request: null,
      file: "FILE-1",
      reason: "No AI account can read pictures. The picture has been kept in your files.",
    }),
  });
  const box = screen.getByRole("textbox", { name: "Paste or type it here" });
  await user.type(box, "Notes so far");
  fireEvent.paste(box, { clipboardData: { files: [picture()], types: ["Files"], getData: () => "" } });
  expect(
    await screen.findByText("No AI account can read pictures. The picture has been kept in your files."),
  ).toBeInTheDocument();
  expect(calls.some((call) => call.route.startsWith("POST handin/image?name=screenshot.png"))).toBe(true);
  expect(box).toHaveValue("Notes so far");
});

test("a dropped picture with a reading account is handed in for reading", async () => {
  const { user, calls } = await setup({
    "POST handin/image": () => ({ status: "queued", request: "REQ-9", file: "FILE-9", reason: null }),
  });
  const box = screen.getByRole("textbox", { name: "Paste or type it here" });
  await user.type(box, "Notes so far");
  fireEvent.drop(box, { dataTransfer: { files: [picture()] } });
  expect(await screen.findByText("Picture handed in for reading")).toBeInTheDocument();
  expect(calls.some((call) => call.route.startsWith("POST handin/image?name=screenshot.png"))).toBe(true);
  expect(box).toHaveValue("Notes so far");
});

test("a picture pasted along with its words keeps the words and says nothing about the picture", async () => {
  const { user } = await setup();
  const box = screen.getByRole("textbox", { name: "Paste or type it here" });
  await user.click(box);
  await user.paste("The words from the page");
  fireEvent.paste(box, { clipboardData: { files: [picture()], types: ["Files", "text/plain"], getData: () => "The words from the page" } });
  expect(screen.queryByText(/A picture can't be read yet/)).toBeNull();
});

test("a kept picture's message stays beside it when words are typed", async () => {
  const { user } = await setup({
    "POST handin/image": () => ({
      status: "kept",
      request: null,
      file: "FILE-1",
      reason: "No AI account can read pictures. The picture has been kept in your files.",
    }),
  });
  const box = screen.getByRole("textbox", { name: "Paste or type it here" });
  fireEvent.paste(box, { clipboardData: { files: [picture()], types: ["Files"], getData: () => "" } });
  await screen.findByText("No AI account can read pictures. The picture has been kept in your files.");
  await user.type(box, "What it said");
  expect(
    screen.getByText("No AI account can read pictures. The picture has been kept in your files."),
  ).toBeInTheDocument();
});

// A voice note dropped on the box (design 6.32): it is handed in at once as its own request, to be turned into text, and
// the words in the box stay as they were; a file that is neither text nor sound is still left out, and says so.

const voice = () => new File(["sound"], "walk.m4a", { type: "audio/mp4" });

test("a voice note dropped on the box is handed in as sound, and the box keeps its words", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({ "POST handin": handed, "POST handin/audio?name=walk.m4a": () => ({ request: "REQ-7", source: null }), "GET projects": () => PROJECTS });
  renderApp(<HandIn onClose={vi.fn()} />);
  const box = screen.getByRole("textbox", { name: "Paste or type it here" });
  await user.type(box, "Notes so far");
  fireEvent.drop(box, { dataTransfer: { files: [voice()] } });
  expect(await screen.findByText("Voice note walk.m4a handed in. It is turned into text first.")).toBeInTheDocument();
  expect(calls.some((c) => c.route === "POST handin/audio?name=walk.m4a" && c.headers && (c.headers as Record<string, string>)["content-type"] === "audio/mp4")).toBe(true);
  expect(box).toHaveValue("Notes so far");
  expect(screen.queryByText(/Only text files/)).toBeNull();
});

test("a dropped file that is neither text nor sound is left out and the box says so", async () => {
  const user = userEvent.setup();
  fakeApi({
    "POST handin": handed,
    "POST handin/file": () => ({
      name: "plan.epub",
      status: "kept",
      request: null,
      source: null,
      file: "FILE-1",
      reason: "files of this kind can't be read yet",
    }),
    "GET projects": () => PROJECTS,
  });
  renderApp(<HandIn onClose={vi.fn()} />);
  const box = screen.getByRole("textbox", { name: "Paste or type it here" });
  await user.click(box);
  fireEvent.drop(box, { dataTransfer: { files: [new File(["x"], "plan.epub", { type: "application/epub+zip" })] } });
  expect(await screen.findByText("Kept; can't be read yet")).toBeInTheDocument();
});

test("dropped, pasted, and picked files each get a row with their outcome", async () => {
  const user = userEvent.setup();
  const calls = fakeApi({
    "GET projects": () => PROJECTS,
    "POST handin/file": (_body, query) => {
      switch (query?.get("name")) {
        case "plan.pdf":
          return { name: "plan.pdf", status: "read", request: "REQ-8", source: "SRC-8", file: null, reason: null };
        case "archive.epub":
          return { name: "archive.epub", status: "kept", request: null, source: null, file: "FILE-8", reason: null };
        default:
          return new Refuse(413, "large.txt is larger than 50 MB");
      }
    },
  });
  renderApp(<HandIn onClose={vi.fn()} />);
  const box = screen.getByRole("textbox", { name: "Paste or type it here" });
  await user.type(box, "Notes so far");
  await user.type(screen.getByLabelText("Anything to do with it? (optional)"), "File these words");
  fireEvent.drop(box, { dataTransfer: { files: [new File(["pdf"], "plan.pdf", { type: "application/pdf" })] } });
  expect(await screen.findByText("Read and handed in")).toBeInTheDocument();

  fireEvent.paste(box, {
    clipboardData: { files: [new File(["archive"], "archive.epub", { type: "application/epub+zip" })], types: ["Files"], getData: () => "" },
  });
  expect(await screen.findByText("Kept; can't be read yet")).toBeInTheDocument();

  await user.upload(screen.getByLabelText("Choose a file"), new File(["large"], "large.txt", { type: "text/plain" }));
  expect(await screen.findByText(/Refused: large\.txt is larger than 50 MB/)).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(3);
  expect(box).toHaveValue("Notes so far");
  expect(calls.filter((call) => call.route.startsWith("POST handin/file")).map((call) => call.route)).toHaveLength(3);
  expect(calls.filter((call) => call.route.startsWith("POST handin/file")).every((call) => call.body instanceof File)).toBe(true);
});

test("handing in while Today waits for Start says it waits for Start, with a way to Today, and does not say the assistant is on it", async () => {
  const user = userEvent.setup();
  const firstGo = { key: "first_go", group: "decide", kind: "first_go", count: 2, untrusted: false, unpriced: 0, actions: [], questions: [], outcome: {} };
  fakeApi({ "POST handin": handed, "GET projects": () => PROJECTS, "GET today/queue": () => [firstGo] });
  renderApp(<HandIn onClose={vi.fn()} />);
  await user.type(screen.getByLabelText("Paste or type it here"), "Subject: dates");
  await user.click(screen.getByRole("button", { name: "Hand in" }));
  expect(await screen.findByText(/waits until you choose Start/)).toBeInTheDocument();
  expect(screen.queryByText(/is on it/)).toBeNull();
  expect(screen.getByRole("button", { name: "Go to Today" })).toBeInTheDocument();
});

test("handing in when nothing waits for Start still says the assistant is on it", async () => {
  const user = userEvent.setup();
  fakeApi({ "POST handin": handed, "GET projects": () => PROJECTS, "GET today/queue": () => [] });
  renderApp(<HandIn onClose={vi.fn()} />);
  await user.type(screen.getByLabelText("Paste or type it here"), "Subject: dates");
  await user.click(screen.getByRole("button", { name: "Hand in" }));
  expect(await screen.findByText(/is on it/)).toBeInTheDocument();
});

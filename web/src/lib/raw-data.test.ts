import { holdsRawData, leaksInternals } from "./raw-data";

test.each([
  '{"title": "Launch", "due": "2026-10-20"}',
  "Milestone {'name': 'Launch'} is due",
  "Milestone: {name: Launch, due: 2026-10-20}",
  'The fields are "title": and "due": in the data',
  'Review [{"id": 4}] before Friday',
])("data is caught: %s", (text) => {
  expect(holdsRawData(text)).toBe(true);
});

test.each([
  "Write the plan for {full_name} first.",
  "The folder is plan/chapters/{order:02}-{slug}.",
  'Ask "Is the index final?" before Friday',
  "Notes: the printer wants PDF files.",
  "Review the list [Launch, Ship] with Robin",
  "Read the section titled 'Costs': it is short.",
])("an ordinary line is not: %s", (text) => {
  expect(holdsRawData(text)).toBe(false);
});

test.each([
  "Filed under PRJ-12",
  "Reply to PER-3 about it",
  "Moved ACT-104 to Friday",
  "The record REQ-9 changed",
])("an id of the app's own is caught: %s", (text) => {
  expect(leaksInternals(text)).toBe(true);
});

test.each([
  "From: A. Sender <sender@example.com>",
  "New in Your inbox: Thanks From: A. Sender <sender@example.com> Received: Tue, Oct 27, 2026",
  "Message-ID: <abc@example.com>",
  "Reply-To: sender@example.com",
])("a raw mail header is caught: %s", (text) => {
  expect(leaksInternals(text)).toBe(true);
});

test.each([
  "Thanks · from A. Sender",
  "Read your mail from Monday",
  "UTF-8 text and WCAG 2.2 pages",
  "Send the invoice to the printer",
  "Subject to approval, the price is fixed",
])("an ordinary line holds no id and no header: %s", (text) => {
  expect(leaksInternals(text)).toBe(false);
});

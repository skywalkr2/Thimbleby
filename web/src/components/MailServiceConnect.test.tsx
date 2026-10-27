import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { S } from "../lib/api";
import { Refuse, fakeApi, renderApp } from "../test-utils";
import { MailServiceConnect } from "./MailServiceConnect";

// Built apart so no web address is written out in this file.
const SECURE = "https:";
const SERVICES: S["MailServiceView"][] = [
  {
    id: "svc-a",
    name: "Example Mail",
    user_hint: "Your full address.",
    app_password_steps: ["Turn on two-step sign-in.", "Open the page below.", "Make one and copy it."],
    app_password_page: `${SECURE}//accounts.example.com/app-passwords`,
    calendar_steps: ["Open the calendar's settings.", "Copy the private address."],
  },
  { id: "svc-b", name: "Plain Mail", user_hint: "", app_password_steps: ["Make one."], app_password_page: "", calendar_steps: [] },
];
const SAVED = { changes: [], fingerprint: "fp-2", needs_restart: false };
const base = () => ({
  "GET watch/mail-services": () => SERVICES,
  "GET settings": () => ({ fingerprint: "fp-1", items: [] }),
  "GET setup": () => ({ local: true }),
});

describe("MailServiceConnect", () => {
  test("picking a service shows its numbered steps, its page with the real domain, and two fields with the cursor in the address", async () => {
    const user = userEvent.setup();
    fakeApi(base());
    renderApp(<MailServiceConnect />);
    await user.selectOptions(await screen.findByLabelText("Mail service"), "svc-a");
    expect(screen.getByText("Turn on two-step sign-in.")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["1Turn on two-step sign-in.", "2Open the page below.", "3Make one and copy it."]);
    expect(screen.getByText("(accounts.example.com)")).toBeInTheDocument();
    expect(screen.getByLabelText("Your address")).toHaveFocus();
    expect(screen.getByLabelText("App password")).toHaveAttribute("type", "password");
    expect(screen.queryByLabelText(/server|port/i)).toBeNull();
  });

  test("Another mailbox tells the parent to show the full form, and with no service on offer nothing shows", async () => {
    const user = userEvent.setup();
    fakeApi(base());
    const picks: string[] = [];
    const first = renderApp(<MailServiceConnect onPick={(id) => picks.push(id)} />);
    await user.selectOptions(await screen.findByLabelText("Mail service"), "other");
    expect(picks).toContain("other");
    expect(screen.queryByLabelText("Your address")).toBeNull();
    first.unmount();
    const calls = fakeApi({ "GET watch/mail-services": () => [] });
    renderApp(<MailServiceConnect />);
    await waitFor(() => expect(calls.some((c) => c.route === "GET watch/mail-services")).toBe(true));
    expect(screen.queryByLabelText("Mail service")).toBeNull();
  });

  test("connecting sends the service, the address and the password apart, then offers the calendar when the service has steps for one", async () => {
    const user = userEvent.setup();
    const calls = fakeApi({ ...base(), "POST watch/sources": () => SAVED });
    const done = vi.fn();
    renderApp(<MailServiceConnect onConnected={done} />);
    await user.selectOptions(await screen.findByLabelText("Mail service"), "svc-a");
    await user.type(screen.getByLabelText("Your address"), "ada@example.com");
    await user.type(screen.getByLabelText("App password"), "app-pass-value");
    await user.click(screen.getByRole("button", { name: "Connect Example Mail" }));
    const offer = await screen.findByRole("group", { name: "Add your calendar too" });
    expect(offer).toBeInTheDocument();
    expect(done).not.toHaveBeenCalled();
    const sent = calls.find((c) => c.route === "POST watch/sources")!.body as S["WatchSourceIn"];
    expect(sent).toMatchObject({ connector: "mailbox", service: "svc-a", settings: { user: "ada@example.com" }, secrets: { password: "app-pass-value" } });
    expect(JSON.stringify(sent.settings)).not.toContain("app-pass-value");
    expect(screen.getByText("Copy the private address.")).toBeInTheDocument();
    const box = screen.getByLabelText("The calendar's private address");
    expect(box).toHaveFocus();
    await user.type(box, `${SECURE}//calendar.example.com/private`);
    await user.click(screen.getByRole("button", { name: "Add calendar" }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    const cal = calls.filter((c) => c.route === "POST watch/sources")[1].body as S["WatchSourceIn"];
    expect(cal).toMatchObject({ connector: "calendar", secrets: { address: `${SECURE}//calendar.example.com/private` } });
  });

  test("a service with no calendar steps finishes at once, and a refusal is shown in the server's words with the steps still on screen", async () => {
    const user = userEvent.setup();
    let refuse = true;
    fakeApi({
      ...base(),
      "POST watch/sources": () =>
        refuse ? new Refuse(400, "Couldn't connect to Plain Mail: nope. Follow the steps for Plain Mail above to make an app password.") : SAVED,
    });
    const done = vi.fn();
    renderApp(<MailServiceConnect onConnected={done} />);
    await user.selectOptions(await screen.findByLabelText("Mail service"), "svc-b");
    await user.type(screen.getByLabelText("Your address"), "ada@example.com");
    await user.type(screen.getByLabelText("App password"), "app-pass-value");
    await user.click(screen.getByRole("button", { name: "Connect Plain Mail" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Follow the steps for Plain Mail above");
    expect(screen.getByText("Make one.")).toBeInTheDocument();
    expect(done).not.toHaveBeenCalled();
    refuse = false;
    await user.click(screen.getByRole("button", { name: "Connect Plain Mail" }));
    await waitFor(() => expect(done).toHaveBeenCalled());
  });
});

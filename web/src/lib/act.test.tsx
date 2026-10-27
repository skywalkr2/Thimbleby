import "@testing-library/jest-dom/vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { fakeApi, renderApp } from "../test-utils";
import { ApiError } from "./api";
import { useAct } from "./act";

// A failed action says so in a toast that offers Try again, which runs the same call again (and says what happened this time).
fakeApi({});

function Doer(props: { run: () => Promise<string> }) {
  const act = useAct();
  return (
    <button type="button" onClick={() => void act(props.run, (made) => ({ message: `Made ${made}.` }))}>
      Do it
    </button>
  );
}

const region = () => screen.getByRole("region", { name: "Notifications" });

test("a failed action's toast offers Try again, which runs the same call again and then says it worked", async () => {
  const user = userEvent.setup();
  const run = vi
    .fn<() => Promise<string>>()
    .mockRejectedValueOnce(new ApiError(503, "The server is busy."))
    .mockResolvedValueOnce("the note");
  renderApp(<Doer run={run} />);
  await user.click(screen.getByRole("button", { name: "Do it" }));
  expect(await within(region()).findByText("That didn't work. The server is busy.")).toBeInTheDocument();
  await user.click(within(region()).getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(run).toHaveBeenCalledTimes(2));
  expect(await within(region()).findByText("Made the note.")).toBeInTheDocument();
  // The failed toast went when it was used.
  expect(within(region()).queryByText(/That didn't work/)).toBeNull();
});

test("Try again that fails again offers Try again once more", async () => {
  const user = userEvent.setup();
  const run = vi.fn<() => Promise<string>>().mockRejectedValue(new ApiError(500, "Still no."));
  renderApp(<Doer run={run} />);
  await user.click(screen.getByRole("button", { name: "Do it" }));
  await user.click(await within(region()).findByRole("button", { name: "Try again" }));
  await waitFor(() => expect(run).toHaveBeenCalledTimes(2));
  expect(await within(region()).findByRole("button", { name: "Try again" })).toBeInTheDocument();
});

test("a signed-out failure says so and offers no Try again, since a retry cannot help", async () => {
  const user = userEvent.setup();
  renderApp(<Doer run={() => Promise.reject(new ApiError(401, "no token"))} />);
  await user.click(screen.getByRole("button", { name: "Do it" }));
  expect(await within(region()).findByText(/You're signed out/)).toBeInTheDocument();
  expect(within(region()).queryByRole("button", { name: "Try again" })).toBeNull();
});

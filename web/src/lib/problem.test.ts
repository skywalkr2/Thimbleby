import { ApiError } from "./api";
import { problemText } from "./problem";

const t = (key: string, vars: Record<string, string | number> = {}) =>
  ({
    "error.failed": `That didn't work. ${vars.detail ?? ""}`,
    "error.failed_plain": "That didn't work. Try again in a moment. If it keeps happening, send feedback from your menu.",
    "error.signed_out": "Signed out.",
  })[key] ?? key;

test("a refusal says the server's own plain words, including a 400 and a 422", () => {
  expect(problemText(new ApiError(400, "Use at most 80 characters."), t)).toBe("Use at most 80 characters.");
  expect(problemText(new ApiError(422, "Use at most 80 characters."), t)).toBe("Use at most 80 characters.");
});

test("an answer with no words is never a bare 'That didn't work.'", () => {
  expect(problemText(new ApiError(500, ""), t)).toMatch(/Try again in a moment/);
  expect(problemText(new Error("x"), t)).toMatch(/send feedback/);
  expect(problemText(new ApiError(500, "The server is busy."), t)).toBe("That didn't work. The server is busy.");
});

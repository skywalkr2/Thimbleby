// Every button is a pill and an icon-only button is a circle (design 7.12). The shape comes from one token, so a
// change of look is one line; inputs, menus, panes and dialogs keep their own radius.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = join(__dirname, "..");
const css = (path: string) => readFileSync(join(src, path), "utf-8");
const rule = (text: string, selector: string) => {
  const found = text.split("\n").join(" ").match(new RegExp(`${selector.replace(/[.[\]]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
  return found?.[1] ?? "";
};
const radius = (declarations: string) => /border-radius:\s*([^;]+);/.exec(declarations)?.[1].trim();

test("the button radius is the full radius, one token", () => {
  const tokens = css("theme/tokens.css");
  expect(tokens).toMatch(/--radius-full:\s*999px/);
  expect(tokens).toMatch(/--radius-btn:\s*var\(--radius-full\)/);
});

test("the buttons, the filter chips and the segments take the button radius from that token", () => {
  expect(radius(rule(css("ui/Button.module.css"), ".btn"))).toBe("var(--radius-btn)");
  expect(radius(rule(css("ui/FilterChip.module.css"), ".chip") || css("ui/FilterChip.module.css"))).toBe("var(--radius-btn)");
  expect(radius(rule(css("ui/SegmentedControl.module.css"), ".segment"))).toBe("var(--radius-btn)");
  expect(radius(rule(css("styles.css"), ".filters button"))).toBe("var(--radius-btn)");
  expect(radius(rule(css("lib/toasts.module.css"), ".action"))).toBe("var(--radius-btn)");
});

test("an icon-only button is a circle", () => {
  expect(radius(rule(css("ui/Button.module.css"), ".icon-only"))).toBe("var(--radius-full)");
  expect(radius(rule(css("lib/toasts.module.css"), ".dismiss"))).toBe("var(--radius-full)");
});

test("inputs, menus and dialogs keep their own radius", () => {
  expect(radius(rule(css("ui/Select.module.css"), ".trigger") || css("ui/Select.module.css"))).not.toBe("var(--radius-btn)");
  expect(css("ui/MenuButton.module.css")).not.toMatch(/radius-btn/);
  expect(css("ui/DateField.module.css")).not.toMatch(/radius-btn/);
});

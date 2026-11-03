// The product's brand in the app (design 7.12, the visual review's VP16 and VP06): the mark and the name in the header, the display
// face for page titles and the interface face for everything else, both served by the app itself, the tab's icon, and Today passing
// the accessibility checks by day and by night. It runs at the root and at a nested base path, where every asset path is proved.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("?token=e2e-token");
  await expect(page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)/ })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Needs you" })).toBeVisible();
}

async function expectNoViolations(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const found = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(found).toEqual([]);
}

const family = (value: string) => value.replace(/["']/g, "").split(",")[0].trim();

test.describe("the brand", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("the header shows the mark beside the name, and the mark is decorative", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await signIn(page);
    const brand = page.getByRole("banner").getByRole("link", { name: /^Go to Today/ });
    const day = brand.locator('img[data-brand-mark="day"]');
    const night = brand.locator('img[data-brand-mark="night"]');
    await expect(day).toBeVisible();
    await expect(night).toBeHidden();
    await expect(day).toHaveAttribute("alt", "");
    // The picture loaded (it has a size), from the app's own address.
    expect(await day.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    // The name is text beside it, in the display face: the product's own name from the wording sheet, not the workspace's.
    const name = brand.locator("span").filter({ hasText: /\S/ }).first();
    await expect(name).toBeVisible();
    await expect(name).toHaveText("Thimbleby");
    await expect(page).toHaveTitle(/ · Thimbleby$/);
    expect(family(await name.evaluate((el) => getComputedStyle(el).fontFamily))).toBe("Fraunces Variable");
  });

  test("the mark follows the theme in force: the system's, and the person's own choice over it", async ({ page }) => {
    const brand = page.getByRole("banner").getByRole("link", { name: /^Go to Today/ });
    const shows = async (version: "day" | "night") => {
      await expect(brand.locator(`img[data-brand-mark="${version}"]`)).toBeVisible();
      await expect(brand.locator(`img[data-brand-mark="${version === "day" ? "night" : "day"}"]`)).toBeHidden();
    };
    await page.emulateMedia({ colorScheme: "dark" });
    await signIn(page);
    await shows("night");
    // The person chooses light from the user menu while the system is dark: the day mark.
    await page.getByRole("button", { name: /^Menu for / }).click();
    await page.getByRole("menuitemradio", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await shows("day");
    // And dark while the system is light.
    await page.emulateMedia({ colorScheme: "light" });
    await page.getByRole("button", { name: /^Menu for / }).click();
    await page.getByRole("menuitemradio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await shows("night");
  });

  test("page titles are in Fraunces and the body is in Inter, both from the app, and no request goes to a font host", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.emulateMedia({ colorScheme: "light" });
    await signIn(page);
    const title = page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)/ });
    expect(family(await title.evaluate((el) => getComputedStyle(el).fontFamily))).toBe("Fraunces Variable");
    expect(family(await page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily))).toBe("Inter Variable");
    // A row's text and a button are in the interface face too: the display face is for titles and the name only.
    const button = page.getByRole("banner").getByRole("button", { name: "Hand something in" });
    expect(family(await button.evaluate((el) => getComputedStyle(el).fontFamily))).toBe("Inter Variable");
    // Both faces are really loaded (not the system's fallback).
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, "")));
    expect(loaded).toEqual(expect.arrayContaining(["Fraunces Variable", "Inter Variable"]));
    // Everything the page asked for came from the app's own address; the font files are under its base path.
    const own = new URL(page.url());
    const base = new URL(".", own.origin + own.pathname).pathname;
    for (const url of requests) expect(new URL(url).origin, url).toBe(own.origin);
    const fonts = requests.filter((url) => /\.woff2(\?|$)/.test(url));
    expect(fonts.length).toBeGreaterThan(0);
    for (const url of fonts) expect(new URL(url).pathname.startsWith(base), url).toBe(true);
    expect(requests.some((url) => /fonts\.(googleapis|gstatic)\.com/.test(url))).toBe(false);
  });

  test("the tab's icon is the mark, served by the app", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await signIn(page);
    const icons = page.locator('head link[rel="icon"]');
    await expect(icons).toHaveCount(2);
    const links = await icons.evaluateAll((els) => els.map((el) => ({ href: (el as HTMLLinkElement).href, media: el.getAttribute("media") })));
    expect(links.map((l) => l.media)).toEqual([null, "(prefers-color-scheme: dark)"]);
    for (const link of links) {
      const answer = await page.request.get(link.href);
      expect(answer.ok(), link.href).toBe(true);
      expect(answer.headers()["content-type"]).toContain("image/svg+xml");
    }
    expect(links[0].href).not.toBe(links[1].href);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`Today, with the brand, passes the accessibility checks ${scheme === "light" ? "by day" : "by night"}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await signIn(page);
      await expect(page.locator("html")).toHaveCSS("color-scheme", scheme);
      await expectNoViolations(page);
      // The state colors are the product's own whatever the workspace's accent is: they have hues of their own, day and night.
      const danger = await page.locator("html").evaluate((el) => getComputedStyle(el).getPropertyValue("--danger").trim());
      expect(danger).toBe(scheme === "light" ? "#b93815" : "#ff8a75");
      const surface = await page.locator("html").evaluate((el) => getComputedStyle(el).getPropertyValue("--surface").trim());
      expect(surface).toBe(scheme === "light" ? "#fefdfb" : "#16171a");
    });
  }
});

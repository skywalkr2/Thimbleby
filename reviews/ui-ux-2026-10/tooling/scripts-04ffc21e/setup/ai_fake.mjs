// shared: fill AI step with the fake service and continue
export async function aiFake(page, I, { allow = true } = {}) {
  await page.getByRole("radio", { name: /Something else/ }).click(); await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Another service/ }).click(); await page.waitForTimeout(800);
  await page.getByRole("radio", { name: /^Another service that speaks/ }).click(); await page.waitForTimeout(800);
  await page.getByRole("textbox", { name: "Service address" }).fill(I.ai_base_url);
  await page.locator("#ai-key").fill("a-made-up-key"); await page.locator("#ai-key").blur(); await page.waitForTimeout(4000);
  await page.getByText("Advanced", { exact: true }).click(); await page.waitForTimeout(800);
  await page.getByLabel("AI model for everyday work").selectOption({ label: "fake-small" });
  await page.getByRole("radio", { name: allow ? /^Allow/ : /^Not my private/ }).click(); await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(3000);
}

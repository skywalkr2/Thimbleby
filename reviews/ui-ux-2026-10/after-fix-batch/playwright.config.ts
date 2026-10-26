// Config for capture.spec.ts; see index.md. Servers: the demo workspace (demo-b) and a fresh no-template workspace
// with the fake outside services, as the journeys serve them. Ports move by PW_PORT_OFFSET (default 40).
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const o = Number(process.env.PW_PORT_OFFSET ?? 40);
const root = join(__dirname, "..", "..", "..");
const state = join(tmpdir(), `cockpit-captures-${8785 + o}`);
process.env.CAP_DEMO = `http://127.0.0.1:${8781 + o}/`;
process.env.CAP_FRESH = `http://127.0.0.1:${8785 + o}/`;
process.env.CAP_STATE = state;
process.env.CAP_FAKE = String(8794 + o);

export default defineConfig({
  testDir: __dirname,
  testMatch: /capture\.spec\.ts/,
  timeout: 600_000,
  workers: 1,
  reporter: [["list"]],
  use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined } },
  webServer: [
    {
      command: `uv run python -m tests.e2e_server --port ${8781 + o} --base-path /`,
      cwd: root,
      url: `http://127.0.0.1:${8781 + o}/api/health`,
      timeout: 90_000,
    },
    {
      command: `uv run python -m tests.e2e_fresh_server --port ${8785 + o} --state "${state}" --https-port ${8795 + o} --add-ons --catalog-by-environment --log`,
      cwd: root,
      url: `http://127.0.0.1:${8785 + o}/api/health`,
      timeout: 120_000,
    },
    {
      command: `uv run python -m tests.fake_services --port ${8794 + o} --https-port ${8795 + o} --state "${state}" --catalog journey_mail`,
      cwd: root,
      url: `http://127.0.0.1:${8794 + o}/__e2e/info`,
      timeout: 60_000,
    },
  ],
});

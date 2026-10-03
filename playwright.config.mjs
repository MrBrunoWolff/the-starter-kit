import { defineConfig } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
const fixtures = process.env.STARTER_SMOKE_FIXTURES;
if (!fixtures && (!process.env.STARTER_VINEXT_FIXTURE || !process.env.STARTER_TANSTACK_FIXTURE)) {
  throw new Error(
    "Run test:smoke, then STARTER_SMOKE_FIXTURES=<printed directory> bun run test:e2e.",
  );
}
export default defineConfig({
  testDir: "./e2e",
  outputDir: join(process.env.RUNNER_TEMP ?? tmpdir(), "starter-kit-browser-results"),
  fullyParallel: false,
  workers: 1,
  use: {
    browserName: "chromium",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node node_modules/vite/bin/vite.js preview --port 4411",
      cwd: process.env.STARTER_VINEXT_FIXTURE ?? join(fixtures, "vinext-nav"),
      url: "http://localhost:4411",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "node node_modules/vite/bin/vite.js preview --port 4412",
      cwd: process.env.STARTER_TANSTACK_FIXTURE ?? join(fixtures, "tanstack-start-nav"),
      url: "http://localhost:4412",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});

import { defineConfig, devices } from "@playwright/test";

const localHosts = "127.0.0.1,localhost";
process.env.NO_PROXY = [process.env.NO_PROXY, localHosts].filter(Boolean).join(",");
process.env.no_proxy = [process.env.no_proxy, localHosts].filter(Boolean).join(",");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

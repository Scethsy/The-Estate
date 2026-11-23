import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "layout.spec.mjs",
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3100",
    env: { PORT: "3100" },
    reuseExistingServer: false,
    timeout: 30000,
  },
});

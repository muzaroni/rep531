import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  projects: [
    { name: "root", use: { baseURL: "http://127.0.0.1:4173/" } },
    {
      name: "github-pages-subpath",
      use: { baseURL: "http://127.0.0.1:4174/bbb/" },
    },
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "msedge",
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run preview -- --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run preview -- --port 4174 --base /bbb/",
      url: "http://127.0.0.1:4174/bbb/",
      reuseExistingServer: !process.env.CI,
    },
  ],
  reporter: "list",
});

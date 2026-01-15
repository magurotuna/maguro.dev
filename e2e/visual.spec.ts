import { test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const pages = [
  { name: "home", path: "/" },
  { name: "about", path: "/about/" },
  { name: "blog-post", path: "/blog/magurodev-tech-stack/" },
];

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
  { name: "mobile-small", width: 320, height: 568 },
];

const outputDir = process.env.SCREENSHOT_OUTPUT_DIR || "screenshots";

test.beforeAll(async () => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
});

for (const pageInfo of pages) {
  for (const viewport of viewports) {
    test(`screenshot: ${pageInfo.name} @ ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto(pageInfo.path);
      await page.waitForLoadState("networkidle");

      const filename = `${pageInfo.name}-${viewport.name}.png`;
      await page.screenshot({
        path: path.join(outputDir, filename),
        fullPage: true,
      });
    });
  }
}

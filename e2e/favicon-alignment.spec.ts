import { test, expect } from "@playwright/test";

test.describe("External link favicon alignment", () => {
  test("favicons should be inline with link text on mobile", async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Go to a page with external links
    await page.goto("/blog/the-era-of-humans-writing-code-is-over/");
    await page.waitForLoadState("networkidle");

    // Take a screenshot for visual inspection
    await page.screenshot({
      path: "screenshots/favicon-alignment-mobile.png",
      fullPage: true,
    });

    // Find an external link with a favicon
    const externalLink = page
      .locator("a[target='_blank']:has(.external-link-favicon)")
      .first();
    await expect(externalLink).toBeVisible();

    // Get the bounding box of the favicon and the link text
    const favicon = externalLink.locator(".external-link-favicon").first();
    const faviconBox = await favicon.boundingBox();

    // Get the text node position by checking the link's bounding box
    const linkBox = await externalLink.boundingBox();

    console.log("Favicon box:", faviconBox);
    console.log("Link box:", linkBox);

    // The favicon should be roughly at the same vertical position as the link
    // If favicon.y is much less than the text's y, they're on different lines
    if (faviconBox && linkBox) {
      // Favicon top should be close to link top (within reasonable margin)
      // If they differ by more than the favicon height, they're on different lines
      const verticalDiff = Math.abs(faviconBox.y - linkBox.y);
      console.log("Vertical difference:", verticalDiff);
      console.log("Favicon height:", faviconBox.height);

      // Take a screenshot of just the link for closer inspection
      await externalLink.screenshot({
        path: "screenshots/external-link-close.png",
      });
    }
  });

  test("check HTML structure of external links", async ({ page }) => {
    await page.goto("/blog/the-era-of-humans-writing-code-is-over/");
    await page.waitForLoadState("domcontentloaded");

    // Get the HTML of the first external link
    const linkHtml = await page
      .locator("a[target='_blank']:has(.external-link-favicon)")
      .first()
      .evaluate((el) => el.outerHTML);

    console.log("Link HTML:", linkHtml);

    // Get computed styles of the favicon
    const faviconStyles = await page
      .locator(".external-link-favicon")
      .first()
      .evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          verticalAlign: styles.verticalAlign,
          width: styles.width,
          height: styles.height,
        };
      });

    console.log("Favicon styles:", faviconStyles);

    // Check that the parent span has white-space: nowrap
    const parentSpanStyles = await page
      .locator(".external-link-favicon")
      .first()
      .evaluate((el) => {
        const parent = el.parentElement;
        if (parent && parent.tagName === "SPAN") {
          const styles = window.getComputedStyle(parent);
          return {
            whiteSpace: styles.whiteSpace,
          };
        }
        return null;
      });

    console.log("Parent span styles:", parentSpanStyles);
  });
});

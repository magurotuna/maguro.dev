import { test, expect } from "@playwright/test";

const postWithFootnotes = "/blog/leaving-comfort-zone/";

test.describe("Footnote preview", () => {
  test("shows the complete footnote on hover without changing the link", async ({
    page,
  }) => {
    await page.goto(postWithFootnotes);

    const reference = page.locator("[data-footnote-ref]").first();
    const preview = page.locator(".footnote-preview");

    await expect(preview).toBeHidden();
    await reference.hover();

    await expect(preview).toBeVisible();
    await expect(preview).toContainText(
      "「推し活」という言葉、当時はまだなかった気がする",
    );
    await expect(reference).toHaveAttribute(
      "href",
      "#user-content-fn-oshikatsu",
    );

    await reference.click();
    await expect(page).toHaveURL(/#user-content-fn-oshikatsu$/);
  });

  test("keeps the preview available while the pointer is over it", async ({
    page,
  }) => {
    await page.goto(postWithFootnotes);

    await page.locator("[data-footnote-ref]").first().hover();
    const preview = page.locator(".footnote-preview");
    await expect(preview).toBeVisible();

    await preview.hover();
    await page.waitForTimeout(200);
    await expect(preview).toBeVisible();
  });

  test("does not enable previews on a touch-only device", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();
    await page.goto(postWithFootnotes);

    await expect(page.locator(".footnote-preview")).toBeHidden();
    expect(
      await page
        .locator("[data-footnote-ref]")
        .first()
        .getAttribute("aria-expanded"),
    ).toBeNull();

    await context.close();
  });
});

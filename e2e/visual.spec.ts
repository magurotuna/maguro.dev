import { test, expect } from '@playwright/test';

const pages = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about/' },
  { name: 'blog-post', path: '/blog/magurodev-tech-stack/' },
];

for (const page of pages) {
  test(`visual: ${page.name}`, async ({ page: p }) => {
    await p.goto(page.path);
    await p.waitForLoadState('networkidle');

    await expect(p).toHaveScreenshot(`${page.name}.png`, {
      fullPage: true,
    });
  });
}

test('header does not break on narrow viewport', async ({ page }) => {
  // Test specifically for the header word-breaking issue
  await page.setViewportSize({ width: 320, height: 568 }); // iPhone SE (smallest common mobile)
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const siteTitle = page.locator('.site-title');
  const boundingBox = await siteTitle.boundingBox();

  // The site title should fit on a single line (height should be reasonable)
  // A single line of text at 1.25rem (~20px) shouldn't exceed ~30px with padding
  expect(boundingBox?.height).toBeLessThan(40);

  await expect(page).toHaveScreenshot('header-narrow.png', {
    fullPage: false,
  });
});

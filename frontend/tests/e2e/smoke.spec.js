import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

test('Public pages return 2xx', async ({ page }) => {
  const routes = ['/', '/demo', '/login', '/tarifs'];
  for (const route of routes) {
    const response = await page.goto(`${BASE}${route}`);
    expect(response.status()).toBeLessThan(400);
  }
});

test('Login form visible', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await expect(page.locator('input[type="email"]').or(page.locator('[placeholder*="mail"]'))).toBeVisible({ timeout: 5000 });
});

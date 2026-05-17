import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const API = 'http://localhost:9998/api';

const EMAIL = 'demo@courtia.fr';
const PASSWORD = 'CourtiaDemo2026!';

let token = '';

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  const body = await res.json();
  token = body.token;
});

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

test('Login API returns valid JWT', () => {
  expect(token).toBeTruthy();
});

test('Clients API returns 8 demo clients', async ({ request }) => {
  const res = await request.get(`${API}/clients`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.data.length).toBe(8);
});

test('Contrats API returns 8 demo contrats', async ({ request }) => {
  const res = await request.get(`${API}/contrats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.length).toBe(8);
});

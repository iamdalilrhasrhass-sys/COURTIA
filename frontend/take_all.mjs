import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1. LOGIN
await page.goto('http://localhost:4173/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
await page.fill('input[type="email"]', 'demo@courtia.fr');
await page.fill('input[type="password"]', 'Demo1234!');
await page.click('button[type="submit"]');

// Wait for dashboard (the login redirects here)
await page.waitForTimeout(5000);
console.log('AFTER LOGIN:', page.url());

// 2. Dashboard — we're already there after login
await page.waitForTimeout(2000);
await page.screenshot({ path: '/root/courtia-screenshots/app/dashboard.png', fullPage: true });
console.log('✅ dashboard');

// 3. Navigate to all pages using domcontentloaded (networkidle times out on SSE)
const pages = [
  'clients', 'devis', 'contrats', 'relances', 'opportunites',
  'rapports', 'abonnement', 'parametres'
];

for (const name of pages) {
  try {
    await page.goto('http://localhost:4173/' + name, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/root/courtia-screenshots/app/' + name + '.png', fullPage: true });
    console.log('✅ ' + name);
  } catch(e) {
    console.log('❌ ' + name + ': ' + e.message.substring(0, 60));
  }
}

await browser.close();
console.log('ALL DONE');

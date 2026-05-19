import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
console.log('URL:', page.url());

const fields = await page.evaluate(() => {
  const inputs = document.querySelectorAll('input');
  return Array.from(inputs).map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder, id: i.id }));
});
console.log('FIELDS:', JSON.stringify(fields, null, 2));

const buttons = await page.evaluate(() => {
  const btns = document.querySelectorAll('button, input[type="submit"]');
  return Array.from(btns).map(b => ({ text: b.textContent.trim().substring(0, 60), type: b.type }));
});
console.log('BUTTONS:', JSON.stringify(buttons, null, 2));

await page.screenshot({ path: '/root/courtia-screenshots/app/debug_fields.png' });
console.log('DONE');
await browser.close();

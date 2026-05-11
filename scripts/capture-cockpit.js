const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Login first (dev bypass if available, or just take public pages)
  console.log("Navigating to dashboard...");
  await page.goto('http://localhost:4173/dashboard');
  await page.waitForTimeout(5000); // Wait for hydration
  await page.screenshot({ path: '/tmp/cockpit-dashboard.png' });
  
  console.log("Navigating to de-vis...");
  await page.goto('http://localhost:4173/devis/nouveau');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/devis-wizard.png' });

  console.log("Navigating to sant-portefeuille...");
  await page.goto('http://localhost:4173/sante-portefeuille');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/sante-portefeuille.png' });
  
  await browser.close();
})();

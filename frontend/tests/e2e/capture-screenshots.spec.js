import { test } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CAPTURE_DIR = path.join(__dirname, "../../../docs/captures-video-finales/v2");

const pages = [
  { url: "/", name: "landing", fullPage: true },
  { url: "/login", name: "login", fullPage: false },
  { url: "/design-system", name: "design-system", fullPage: true },
  { url: "/tarifs", name: "tarifs", fullPage: true },
  { url: "/v2", name: "dashboard-v2", fullPage: false },
  { url: "/v2/clients", name: "clients-v2", fullPage: false },
  { url: "/v2/ark-watch", name: "ark-watch-v2", fullPage: false },
];

test.describe("Capture Screenshots", () => {
  for (const p of pages) {
    test(`Desktop capture ${p.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(p.url);
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: `${CAPTURE_DIR}/${p.name}-desktop.png`,
        fullPage: p.fullPage,
      });
    });
  }

  test("Mobile captures", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    await page.goto("/");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${CAPTURE_DIR}/landing-mobile.png`, fullPage: true });
    
    await page.goto("/login");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${CAPTURE_DIR}/login-mobile.png` });
    
    await page.goto("/tarifs");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${CAPTURE_DIR}/tarifs-mobile.png`, fullPage: true });
  });
});

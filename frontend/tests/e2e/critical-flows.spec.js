import { test, expect } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════
// LOT 17 — COURTIA E2E CRITICAL FLOWS
// Tests contre production courtia.vercel.app
// ═══════════════════════════════════════════════════════════════════════════

test.describe("COURTIA Critical Flows", () => {
  
  // Test 1 : Landing publique
  test("Landing publique charge — titre, CTA, chips visibles", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Vérifier présence titre COURTIA (premier élément)
    await expect(page.locator("text=COURTIA").first()).toBeVisible();

    // Vérifier CTA Essai gratuit
    const ctaButton = page.locator('a:has-text("Essai gratuit"), button:has-text("Essai gratuit")');
    await expect(ctaButton.first()).toBeVisible();

    // Screenshot landing
    await page.screenshot({ path: "../../docs/captures-video-finales/v2/landing-desktop.png", fullPage: true });
  });

  // Test 2 : Login page
  test("Login page — champ email et Google bouton présents", async ({ page }) => {
    await page.goto("/login");
    
    // Champ email ou password
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"], input[placeholder*="Email"]');
    await expect(emailInput.first()).toBeVisible({ timeout: 10000 });
    
    // Bouton Google
    const googleBtn = page.locator('button:has-text("Google"), [class*="google"], [aria-label*="Google"]');
    await expect(googleBtn.first()).toBeVisible();
    
    // Screenshot login
    await page.screenshot({ path: "../../docs/captures-video-finales/v2/login-desktop.png" });
  });

  // Test 3 : Design System page
  test("Design System — sections de composants", async ({ page }) => {
    await page.goto("/design-system");

    // Attendre que la page charge (lazy loading)
    await page.waitForTimeout(3000);

    // Vérifier présence de boutons ou contenu (design system)
    const hasContent = await page.locator("button, [role='button']").count();
    expect(hasContent).toBeGreaterThan(0);

    // Screenshot
    await page.screenshot({ path: "../../docs/captures-video-finales/v2/design-system-desktop.png", fullPage: true });
  });

  // Test 4 : Pages V2 (requièrent auth — vérifie au moins redirection ou présence)
  test("Dashboard V2 redirect ou affichage", async ({ page }) => {
    const response = await page.goto("/v2");
    
    // Soit on a un 200 (page affichée), soit redirection vers login
    expect([200, 301, 302]).toContain(response?.status() || 200);
    
    // Si redirigé vers login, c'est OK (auth requise)
    const url = page.url();
    const isOnV2 = url.includes("/v2") || url.includes("/login");
    expect(isOnV2).toBeTruthy();
    
    // Screenshot whatever we get
    await page.screenshot({ path: "../../docs/captures-video-finales/v2/dashboard-v2.png" });
  });

  // Test 5 : Clients V2
  test("Clients V2 accessibilité", async ({ page }) => {
    const response = await page.goto("/v2/clients");
    expect([200, 301, 302]).toContain(response?.status() || 200);
    
    await page.screenshot({ path: "../../docs/captures-video-finales/v2/clients-v2.png" });
  });

  // Test 6 : ARK Watch V2
  test("ARK Watch V2 accessibilité", async ({ page }) => {
    const response = await page.goto("/v2/ark-watch");
    expect([200, 301, 302]).toContain(response?.status() || 200);
    
    await page.screenshot({ path: "../../docs/captures-video-finales/v2/ark-watch-v2.png" });
  });

  // Test 7 : Mobile responsive
  test("Mobile responsive — viewport 390px", async ({ page }) => {
    // Définir viewport mobile
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/");
    await page.waitForTimeout(1500);

    // Vérifier que la page s'affiche correctement
    await expect(page.locator("text=COURTIA").first()).toBeVisible();

    // Screenshot mobile
    await page.screenshot({ path: "../../docs/captures-video-finales/v2/landing-mobile.png", fullPage: true });
  });

  // Test 8 : Tarifs page
  test("Tarifs publique — affichage", async ({ page }) => {
    const response = await page.goto("/tarifs");
    await page.waitForTimeout(2000);

    // Vérifie que la page charge (200 ou redirect)
    expect([200, 301, 302]).toContain(response?.status() || 200);

    await page.screenshot({ path: "../../docs/captures-video-finales/v2/tarifs-desktop.png", fullPage: true });
  });

  // Test 9 : API Health check depuis le navigateur
  test("API Health endpoint accessible", async ({ page }) => {
    const response = await page.request.get("https://api.courtiark.fr/health");
    expect(response.status()).toBe(200);
  });

});

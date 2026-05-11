/* ═══════════════════════════════════════════════════════════════════════════
   COURTIA — Service Worker Registration
   PWA Aurora-Bubble C
   ═══════════════════════════════════════════════════════════════════════════ */

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // Disable in dev to avoid hot-reload weirdness
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Auto-update lifecycle
        if (reg && reg.waiting) {
          reg.waiting.postMessage('SKIP_WAITING');
        }
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — apply on next nav
              newSW.postMessage('SKIP_WAITING');
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[SW] registration failed', err);
      });

    // Reload once when new SW takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      // Don't auto-reload in this build cycle to avoid UX disruption
      // window.location.reload();
    });
  });
}

export function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

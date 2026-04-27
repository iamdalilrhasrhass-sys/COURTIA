// ---------------------------------------------------------------------------
// interactions.js — Gestion fluide de la souris et du resize
// Exporte initInteractions() qui retourne { getMouse, onResize, destroy }
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// État interne du module
// ---------------------------------------------------------------------------

// Position brute normalisée de la souris (ou du touch) : [-1, 1] sur les deux axes
const mouseState = {
  target: { x: 0, y: 0 },    // position réelle normalisée (dernier événement)
  smoothed: { x: 0, y: 0 },  // position lissée par interpolation (Lerp)
};

// Callbacks enregistrés pour l'événement resize
const resizeCallbacks = [];

// ---------------------------------------------------------------------------
// Gestionnaires d'événements (fonctions nommées pour pouvoir les retirer)
// ---------------------------------------------------------------------------

/**
 * Met à jour la position cible de la souris à partir d'un événement mousemove.
 * Les coordonnées sont normalisées dans l'intervalle [-1, 1].
 *  - x:  -1 (bord gauche)  → +1 (bord droit)
 *  - y:  -1 (bord bas)     → +1 (bord haut)
 */
function onMouseMove(event) {
  mouseState.target.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouseState.target.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

/**
 * Même principe pour le tactile (touchmove).
 * On utilise le premier point de contact (touches[0]).
 */
function onTouchMove(event) {
  if (event.touches.length > 0) {
    mouseState.target.x = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
    mouseState.target.y = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
  }
}

/**
 * Appelé à chaque redimensionnement de la fenêtre.
 * Transmet les nouvelles dimensions (largeur, hauteur) à tous les callbacks enregistrés.
 */
function onResizeDispatch() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (const cb of resizeCallbacks) cb(w, h);
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/**
 * Initialise les interactions souris/touch et resize.
 * Doit être appelé une fois au démarrage de l'application.
 *
 * @returns {Object}  { getMouse, onResize, destroy }
 */
function initInteractions() {
  // Écouteurs passifs pour ne jamais bloquer le scroll
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('resize', onResizeDispatch, { passive: true });

  return { getMouse, onResize, destroy };
}

/**
 * Retourne la position actuelle de la souris, lissée par interpolation
 * linéaire (Lerp). À appeler à chaque frame de rendu pour un mouvement fluide.
 *
 * @returns {{ x: number, y: number }}  Coordonnées normalisées [-1, 1]
 */
function getMouse() {
  const factor = 0.07; // facteur de Lerp — plus il est bas, plus le lissage est fort
  mouseState.smoothed.x += (mouseState.target.x - mouseState.smoothed.x) * factor;
  mouseState.smoothed.y += (mouseState.target.y - mouseState.smoothed.y) * factor;
  return { x: mouseState.smoothed.x, y: mouseState.smoothed.y };
}

/**
 * Enregistre un callback appelé à chaque redimensionnement de la fenêtre.
 * Le callback reçoit (width, height) en pixels.
 *
 * @param {Function} callback  Fonction appelée avec (w, h)
 */
function onResize(callback) {
  resizeCallbacks.push(callback);
}

/**
 * Nettoie tous les écouteurs d'événements et vide la liste des callbacks resize.
 * À appeler lors du démontage de l'application.
 */
function destroy() {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('resize', onResizeDispatch);
  resizeCallbacks.length = 0;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export { initInteractions };

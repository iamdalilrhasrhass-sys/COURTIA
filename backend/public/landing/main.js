import { initScene } from './scene.js';
import { initInteractions } from './interactions.js';

document.addEventListener('DOMContentLoaded', () => {
  const { update, resize } = initScene('webgl');
  const { getMouse, onResize } = initInteractions();

  // Lier le redimensionnement des interactions à celui de la scène
  onResize(() => resize());

  let lastTime = performance.now();

  /**
   * Boucle d'animation principale.
   * Appelée à chaque frame via requestAnimationFrame.
   * Calcule le delta time et transmet la position de la souris à la scène.
   */
  function animate(currentTime) {
    requestAnimationFrame(animate);

    const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    const mouse = getMouse();
    update(delta, mouse.x, mouse.y);
  }

  requestAnimationFrame(animate);
  console.log('Courtia — point d\'entrée initialisé');
});

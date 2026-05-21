/* ═══════════════════════════════════════
   COURTIA — main.js
   Orchestration animation + resize + nav
═══════════════════════════════════════ */

let mouseX = 0, mouseY = 0;
let targetCameraX = 0, targetCameraY = 0;

function animate() {
  requestAnimationFrame(animate);

  const s = window.courtiaScene;
  if (!s || !s.renderer) return;

  const elapsed = s.clock.getElapsedTime();

  // Mise à jour uniforms bulle principale
  if (s.bubbleMaterial) {
    s.bubbleMaterial.uniforms.u_time.value = elapsed;
  }

  // Rotation lente de la bulle
  if (s.bubble) {
    s.bubble.rotation.y = elapsed * 0.08;
    s.bubble.rotation.x = Math.sin(elapsed * 0.12) * 0.05;
  }

  // Animation glow
  if (s.glow) {
    s.glow.material.opacity = 0.04 + Math.sin(elapsed * 0.6) * 0.02;
    s.glow.scale.setScalar(1.0 + Math.sin(elapsed * 0.4) * 0.015);
  }

  // Animation droplets
  s.droplets.forEach((d, i) => {
    d.material.uniforms.u_time.value = elapsed;
    const o = d.userData.origin;
    const sp = d.userData.speed;
    d.position.x = o.x + Math.sin(elapsed * sp + i) * 0.12;
    d.position.y = o.y + Math.cos(elapsed * sp * 0.8 + i * 1.3) * 0.10;
  });

  // Rotation particules
  if (s.particles) {
    s.particles.rotation.y = elapsed * 0.015;
    s.particles.rotation.x = elapsed * 0.008;
  }

  // Parallaxe caméra (lerp doux vers la souris)
  if (s.camera) {
    targetCameraX = -mouseX * 0.35;
    targetCameraY = mouseY * 0.25;
    s.camera.position.x += (targetCameraX - s.camera.position.x) * 0.04;
    s.camera.position.y += (targetCameraY - s.camera.position.y) * 0.04;
    s.camera.lookAt(0, 0, 0);
  }

  s.renderer.render(s.scene, s.camera);
}

function onResize() {
  const s = window.courtiaScene;
  if (!s || !s.camera || !s.renderer) return;
  s.camera.aspect = window.innerWidth / window.innerHeight;
  s.camera.updateProjectionMatrix();
  s.renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
}

// Nav scroll effect
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

// Init
window.addEventListener('resize', onResize);
window.addEventListener('mousemove', onMouseMove);
document.addEventListener('DOMContentLoaded', () => {
  // Attendre que la scène soit initialisée
  setTimeout(() => {
    initNav();
    animate();
  }, 100);
});

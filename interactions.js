/* ═══════════════════════════════════════
   COURTIA — interactions.js
   Touch, smooth scroll, cards hover
═══════════════════════════════════════ */

function initTouch() {
  let touchX = 0, touchY = 0;
  window.addEventListener('touchmove', (e) => {
    touchX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
    touchY = -(e.touches[0].clientY / window.innerHeight - 0.5) * 2;
    // Dispatch comme mousemove pour la parallaxe
    window.dispatchEvent(new CustomEvent('courtia-touch', {
      detail: { x: touchX, y: touchY }
    }));
  }, { passive: true });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function initCardHover() {
  document.querySelectorAll('.floating-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = card.style.transform + ' scale(1.03)';
      card.style.borderColor = 'rgba(175, 169, 236, 0.4)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    });
  });
}

function initFeatureCards() {
  document.querySelectorAll('.feature-card, .pricing-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
      card.style.transform = `perspective(1000px) rotateX(${-y}deg) rotateY(${x}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// Init tout
document.addEventListener('DOMContentLoaded', () => {
  initTouch();
  initSmoothScroll();
  initCardHover();
  initFeatureCards();
});

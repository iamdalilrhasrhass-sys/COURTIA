// COURTIA ARK — Content Script
// Detecte les formulaires et communique avec le service worker

let arkEnabled = false;
let detectedForms = [];
let arkOverlay = null;

// ── Detection des formulaires ───────────────────────────────────────

function detectForms() {
  const forms = document.querySelectorAll('form');
  detectedForms = [];

  forms.forEach((form, index) => {
    const inputs = form.querySelectorAll('input, select, textarea');
    const fields = [];

    inputs.forEach((input) => {
      // NE JAMAIS capturer les mots de passe
      if (input.type === 'password') return;
      // Ignorer les champs caches
      if (input.type === 'hidden') return;

      const field = {
        name: input.name || input.id || '',
        type: input.type || 'text',
        label: getFieldLabel(input),
        placeholder: input.placeholder || '',
        value: input.value || '',
        required: input.required,
        selector: getUniqueSelector(input),
        tag: input.tagName,
      };
      fields.push(field);
    });

    if (fields.length > 0) {
      detectedForms.push({
        index,
        action: form.action || document.URL,
        method: form.method || 'GET',
        fields,
        selector: getUniqueSelector(form),
        title: getFormTitle(form),
      });
    }
  });

  return detectedForms;
}

function getFieldLabel(input) {
  // Chercher un label associe
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.textContent.trim();
  }
  // Chercher un parent label
  const parent = input.closest('label');
  if (parent) return parent.textContent.trim();
  // Chercher un aria-label
  if (input.getAttribute('aria-label')) return input.getAttribute('aria-label');
  // Fallback: placeholder ou name
  return input.placeholder || input.name || input.id || 'Champ';
}

function getUniqueSelector(el) {
  if (el.id) return `#${el.id}`;
  const path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.tagName.toLowerCase();
    if (el.id) {
      path.unshift(`#${el.id}`);
      break;
    }
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (classes) selector += `.${classes}`;
    }
    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === el.tagName
      );
      if (siblings.length > 1) {
        selector += `:nth-of-type(${siblings.indexOf(el) + 1})`;
      }
    }
    path.unshift(selector);
    el = el.parentElement;
  }
  return path.join(' > ');
}

function getFormTitle(form) {
  // Chercher un titre proche du formulaire
  const heading = form.querySelector('h1, h2, h3, h4, legend');
  if (heading) return heading.textContent.trim();
  // Chercher dans les elements precedents
  let prev = form.previousElementSibling;
  while (prev) {
    if (['H1','H2','H3','H4'].includes(prev.tagName))
      return prev.textContent.trim();
    prev = prev.previousElementSibling;
  }
  return `Formulaire #${Array.from(document.forms).indexOf(form) + 1}`;
}

function getPageContext() {
  return {
    url: window.location.href,
    title: document.title,
    text: document.body.innerText.substring(0, 8000),
    forms: detectForms(),
    meta: {
      description: document.querySelector('meta[name="description"]')?.content || '',
      keywords: document.querySelector('meta[name="keywords"]')?.content || '',
    },
  };
}

// ── Overlay ARK flottant ────────────────────────────────────────────

function createArkButton() {
  if (document.getElementById('courtia-ark-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'courtia-ark-btn';
  btn.innerHTML = 'ARK';
  btn.title = 'COURTIA ARK — Analyser cette page';
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '2147483647',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#5B4DF5',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '900',
    fontFamily: 'Arial, sans-serif',
    boxShadow: '0 4px 16px rgba(91, 77, 245, 0.4)',
    border: '2px solid rgba(255,255,255,0.2)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    userSelect: 'none',
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.1)';
    btn.style.boxShadow = '0 6px 24px rgba(91, 77, 245, 0.6)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 4px 16px rgba(91, 77, 245, 0.4)';
  });
  btn.addEventListener('click', async () => {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (!resp.connected) {
      showToast('ARK non connecte. Ouvrez le popup pour vous connecter.', 'error');
      return;
    }
    analyzeCurrentPage();
  });

  document.body.appendChild(btn);

  // Toast container
  const toastContainer = document.createElement('div');
  toastContainer.id = 'courtia-toast-container';
  Object.assign(toastContainer.style, {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: '2147483647',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  });
  document.body.appendChild(toastContainer);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('courtia-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.textContent = message;
  Object.assign(toast.style, {
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: 'Arial, sans-serif',
    color: 'white',
    background: type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#5B4DF5',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    maxWidth: '360px',
    animation: 'slideIn 0.2s ease',
  });

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Analyse de page ─────────────────────────────────────────────────

async function analyzeCurrentPage() {
  showToast('ARK analyse la page...', 'info');

  const pageData = getPageContext();
  const resp = await chrome.runtime.sendMessage({
    type: 'ANALYZE_PAGE',
    pageData,
  });

  if (!resp.ok) {
    showToast(`Erreur: ${resp.data?.error || resp.error || 'Analyse echouee'}`, 'error');
    return;
  }

  showSuggestions(resp.data);
}

// ── Suggestions panel ───────────────────────────────────────────────

function showSuggestions(data) {
  // Enlever l'ancien overlay
  const old = document.getElementById('courtia-ark-panel');
  if (old) old.remove();

  const panel = document.createElement('div');
  panel.id = 'courtia-ark-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    bottom: '88px',
    right: '24px',
    zIndex: '2147483647',
    width: '380px',
    maxHeight: '500px',
    overflowY: 'auto',
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    border: '1px solid #f0f0f0',
    fontFamily: "'Inter', Arial, sans-serif",
    fontSize: '13px',
    color: '#111',
  });

  // Header
  const header = document.createElement('div');
  Object.assign(header.style, {
    padding: '14px 16px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    fontSize: '14px',
    color: '#5B4DF5',
  });
  header.innerHTML = '<span style="font-size:16px">&#9889;</span> ARK Assistant';
  panel.appendChild(header);

  // Contenu
  const content = document.createElement('div');
  Object.assign(content.style, { padding: '12px 16px' });

  if (data.analysis) {
    const analysisDiv = document.createElement('div');
    Object.assign(analysisDiv.style, {
      padding: '10px 12px',
      background: '#F9FAFB',
      borderRadius: '8px',
      marginBottom: '12px',
      fontSize: '12px',
      color: '#374151',
      lineHeight: '1.5',
    });
    analysisDiv.textContent = data.analysis;
    content.appendChild(analysisDiv);
  }

  // Suggestions de formulaire
  if (data.suggestions && data.suggestions.length > 0) {
    const suggestTitle = document.createElement('p');
    Object.assign(suggestTitle.style, {
      fontSize: '11px',
      fontWeight: '600',
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      margin: '0 0 8px',
    });
    suggestTitle.textContent = 'Suggestions de remplissage';
    content.appendChild(suggestTitle);

    data.suggestions.forEach((s, i) => {
      const card = document.createElement('div');
      Object.assign(card.style, {
        padding: '10px 12px',
        background: '#F0FDF4',
        borderRadius: '8px',
        marginBottom: '6px',
        border: '1px solid #BBF7D0',
        cursor: 'pointer',
        transition: 'background 0.12s',
      });
      card.innerHTML = `
        <div style="font-weight:600;font-size:12px;color:#065F46;margin-bottom:4px">
          ${s.field_label || s.field_name || 'Champ'}
        </div>
        <div style="font-size:12px;color:#047857">
          Suggestion: <strong>${s.suggested_value || '(valeur par defaut)'}</strong>
        </div>
        <div style="font-size:10px;color:#6B7280;margin-top:4px">
          Confiance: ${Math.round((s.confidence || 0.5) * 100)}%
        </div>
      `;

      card.addEventListener('click', () => {
        // Envoyer un message au content script pour remplir
        window.postMessage({
          type: 'COURTIA_FILL_FIELD',
          selector: s.selector,
          value: s.suggested_value,
        }, '*');
        showToast('Champ rempli ! Verifiez avant envoi.', 'success');
        card.style.background = '#D1FAE5';
      });

      card.addEventListener('mouseenter', () => {
        card.style.background = '#DCFCE7';
      });
      card.addEventListener('mouseleave', () => {
        card.style.background = '#F0FDF4';
      });

      content.appendChild(card);
    });
  }

  // Message de securite
  const security = document.createElement('div');
  Object.assign(security.style, {
    padding: '8px 12px',
    marginTop: '8px',
    fontSize: '10px',
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  });
  security.innerHTML = '&#128274; Validation humaine requise — aucun envoi automatique';
  content.appendChild(security);

  // Bouton fermer
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Fermer';
  Object.assign(closeBtn.style, {
    width: '100%',
    padding: '8px',
    marginTop: '8px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    background: '#fff',
    color: '#374151',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  });
  closeBtn.addEventListener('click', () => panel.remove());
  content.appendChild(closeBtn);

  panel.appendChild(content);
  document.body.appendChild(panel);
}

// ── Recevoir les ordres de remplissage du popup ─────────────────────

window.addEventListener('message', (event) => {
  if (event.data?.type === 'COURTIA_FILL_FIELD') {
    const { selector, value } = event.data;
    try {
      const el = document.querySelector(selector);
      if (el) {
        el.focus();
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.style.borderColor = '#10B981';
        el.style.boxShadow = '0 0 0 2px rgba(16,185,129,0.2)';
        showToast('Champ rempli par ARK — verifiez avant d'envoyer', 'success');
      }
    } catch (e) {
      showToast('Erreur remplissage: ' + e.message, 'error');
    }
  }
});

// ── Initialisation ──────────────────────────────────────────────────

function init() {
  createArkButton();

  // Envoyer les formulaires detectes au background
  const forms = detectForms();
  chrome.runtime.sendMessage({
    type: 'FORMS_DETECTED',
    count: forms.length,
    forms: forms,
  });
}

// Attendre que le DOM soit pret
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

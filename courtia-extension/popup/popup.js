// COURTIA ARK — Popup

const API_BASE = 'https://api.courtia.fr';
const FRONTEND_URL = 'https://courtia.vercel.app';

let currentTabId = null;

// ── Initialisation ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) currentTabId = tabs[0].id;

  await checkAuth();
  setupEventListeners();
  updateFormCount();
});

// ── Auth ─────────────────────────────────────────────────────────────

async function checkAuth() {
  const resp = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
  if (resp.connected) {
    showConnected(resp.user);
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('connected-view').classList.add('hidden');
}

function showConnected(user) {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('connected-view').classList.remove('hidden');

  if (user) {
    document.getElementById('user-name').textContent =
      (user.first_name || user.firstName || '') + ' ' +
      (user.last_name || user.lastName || '');
  }
}

async function doLogin(email, password) {
  const loginBtn = document.getElementById('login-btn');
  loginBtn.textContent = 'Connexion...';
  loginBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || data.message || 'Erreur de connexion');
      loginBtn.textContent = 'Se connecter';
      loginBtn.disabled = false;
      return;
    }

    // Stocker le token dans le service worker
    await chrome.runtime.sendMessage({
      type: 'LOGIN',
      token: data.token,
      user: data.user,
    });

    showConnected(data.user);
  } catch (err) {
    showError('Impossible de contacter le serveur');
    loginBtn.textContent = 'Se connecter';
    loginBtn.disabled = false;
  }
}

function doLogout() {
  chrome.runtime.sendMessage({ type: 'LOGOUT' });
  showLogin();
}

function showError(msg) {
  const errEl = document.getElementById('login-error');
  errEl.textContent = msg;
  errEl.classList.add('visible');
}

// ── Analyse ─────────────────────────────────────────────────────────

async function doAnalyze() {
  const btn = document.getElementById('analyze-btn');
  btn.textContent = 'Analyse en cours...';
  btn.disabled = true;

  try {
    // Injecter le content script si besoin
    if (currentTabId) {
      await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        files: ['content.js'],
      });
    }

    // Recuperer les donnees de la page via le content script
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      func: () => {
        // Fonction temporaire pour envoyer les donnees
        const forms = Array.from(document.forms).map((form, idx) => {
          const inputs = Array.from(form.querySelectorAll('input:not([type=password]):not([type=hidden]), select, textarea'));
          return {
            index: idx,
            action: form.action,
            title: form.querySelector('h1,h2,h3,legend')?.textContent?.trim() || 'Formulaire ' + (idx + 1),
            fields: inputs.map(inp => ({
              name: inp.name || inp.id,
              type: inp.type,
              label: inp.closest('label')?.textContent?.trim() || inp.placeholder || inp.name,
              value: inp.value,
              selector: '#' + (inp.id || '') || inp.name,
            })),
          };
        });
        return {
          url: location.href,
          title: document.title,
          text: document.body.innerText.substring(0, 5000),
          forms,
        };
      },
    });

    const pageData = result?.result || { title: '', url: '', text: '', forms: [] };

    const resp = await chrome.runtime.sendMessage({
      type: 'ANALYZE_PAGE',
      pageData,
    });

    showResult(resp);

  } catch (err) {
    showResult({ ok: false, error: err.message });
  }

  btn.textContent = '\u26a1 Analyser la page';
  btn.disabled = false;
}

function showResult(resp) {
  const area = document.getElementById('result-area');
  area.innerHTML = '';

  if (!resp.ok) {
    const card = document.createElement('div');
    card.className = 'result-card error';
    card.textContent = resp.data?.error || resp.error || 'Erreur analyse';
    area.appendChild(card);
    return;
  }

  const data = resp.data;

  if (data.analysis) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = '<strong>ARK:</strong> ' + data.analysis;
    area.appendChild(card);
  }

  if (data.suggestions && data.suggestions.length > 0) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = '<strong style="display:block;margin-bottom:6px">Suggestions (' + data.suggestions.length + '):</strong>';

    data.suggestions.forEach((s) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = '<span>' + (s.field_label || s.field_name || 'Champ') + ': <strong>' + (s.suggested_value || '') + '</strong></span>';
      item.addEventListener('click', () => {
        // Remplir le champ dans la page
        chrome.tabs.sendMessage(currentTabId, {
          type: 'FILL_FIELD',
          selector: s.selector,
          value: s.suggested_value,
        });
      });
      card.appendChild(item);
    });

    area.appendChild(card);
  }

  if (!data.analysis && (!data.suggestions || data.suggestions.length === 0)) {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.textContent = 'Page analysee. Aucune suggestion pour cette page.';
    area.appendChild(card);
  }
}

// ── Form count ──────────────────────────────────────────────────────

async function updateFormCount() {
  if (!currentTabId) return;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      func: () => document.forms.length,
    });
    document.getElementById('form-count').textContent = result?.result || 0;
  } catch {
    document.getElementById('form-count').textContent = '?';
  }
}

// ── Event listeners ─────────────────────────────────────────────────

function setupEventListeners() {
  document.getElementById('login-btn').addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (!email || !password) {
      showError('Email et mot de passe requis');
      return;
    }
    doLogin(email, password);
  });

  document.getElementById('logout-btn').addEventListener('click', doLogout);

  document.getElementById('analyze-btn').addEventListener('click', doAnalyze);

  document.getElementById('open-courtia-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: FRONTEND_URL });
  });

  // Entree pour login
  document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
  });
  document.getElementById('login-email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('login-password').focus();
  });
}

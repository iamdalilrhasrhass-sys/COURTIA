// COURTIA ARK — Background Service Worker
// Communication entre popup, content script et backend COURTIA

const API_BASE = 'https://api.courtia.fr';
const API_FALLBACK = 'https://courtia.vercel.app/api';

// ── Gestion du token ────────────────────────────────────────────────

async function getToken() {
  const result = await chrome.storage.local.get(['courtia_token', 'api_url']);
  return result.courtia_token || null;
}

async function getApiUrl() {
  const result = await chrome.storage.local.get(['api_url']);
  return result.api_url || API_BASE;
}

// ── Appels API ──────────────────────────────────────────────────────

async function apiCall(endpoint, method = 'GET', body = null) {
  const token = await getToken();
  const baseUrl = await getApiUrl();

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

// ── Analyse de page via ARK ─────────────────────────────────────────

async function analyzePage(pageData) {
  return apiCall('/api/ark/extension/analyze', 'POST', pageData);
}

async function getFillSuggestion(formData) {
  return apiCall('/api/ark/extension/fill', 'POST', formData);
}

// ── Vérification d'authentification ─────────────────────────────────

async function checkAuth() {
  const token = await getToken();
  if (!token) return { ok: false, error: 'Non connecte' };

  const res = await apiCall('/api/auth/me', 'GET');
  return res;
}

// ── Message handlers ────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_AUTH':
      checkAuth().then(sendResponse);
      return true;

    case 'LOGIN':
      chrome.storage.local.set({
        courtia_token: message.token,
        api_url: message.apiUrl || API_BASE,
        user: message.user || null
      }).then(() => sendResponse({ ok: true }));
      return true;

    case 'LOGOUT':
      chrome.storage.local.remove(['courtia_token', 'api_url', 'user'])
        .then(() => sendResponse({ ok: true }));
      return true;

    case 'ANALYZE_PAGE':
      analyzePage(message.pageData).then(sendResponse);
      return true;

    case 'GET_FILL':
      getFillSuggestion(message.formData).then(sendResponse);
      return true;

    case 'GET_STATUS':
      (async () => {
        const token = await getToken();
        const user = await chrome.storage.local.get(['user']);
        sendResponse({
          connected: !!token,
          user: user.user || null,
        });
      })();
      return true;

    default:
      sendResponse({ ok: false, error: 'Type inconnu' });
      return false;
  }
});

// ── Mise à jour du badge ────────────────────────────────────────────

async function updateBadge() {
  const token = await getToken();
  const color = token ? '#10B981' : '#6B7280';
  const text = token ? 'ON' : '';

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// Initialisation
chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
  console.log('[COURTIA ARK] Extension installee');
});

// Verifier le statut au demarrage
updateBadge();

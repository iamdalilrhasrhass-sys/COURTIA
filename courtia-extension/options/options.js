// COURTIA ARK — Options page

const API_BASE = 'https://api.courtia.fr';

document.addEventListener('DOMContentLoaded', async () => {
  // Charger les parametres
  const settings = await chrome.storage.local.get(['api_url']);
  document.getElementById('api-url').value = settings.api_url || API_BASE;

  await checkConnection();

  document.getElementById('check-connection').addEventListener('click', checkConnection);
  document.getElementById('logout-options-btn').addEventListener('click', doLogout);
  document.getElementById('save-settings').addEventListener('click', saveSettings);
});

async function checkConnection() {
  const resp = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
  const statusEl = document.getElementById('connection-status');
  const textEl = document.getElementById('status-text');

  if (resp.connected) {
    statusEl.className = 'status ok';
    statusEl.querySelector('.dot').className = 'dot green';
    textEl.textContent = 'Connecte' + (resp.user ? ' - ' + (resp.user.first_name || resp.user.firstName || '') : '');
  } else {
    statusEl.className = 'status ko';
    statusEl.querySelector('.dot').className = 'dot red';
    textEl.textContent = 'Non connecte';
  }
}

function doLogout() {
  chrome.runtime.sendMessage({ type: 'LOGOUT' });
  checkConnection();
}

async function saveSettings() {
  const apiUrl = document.getElementById('api-url').value.trim();
  if (!apiUrl) return;

  await chrome.storage.local.set({ api_url: apiUrl });

  const btn = document.getElementById('save-settings');
  btn.textContent = 'Enregistre !';
  btn.style.background = '#10B981';
  setTimeout(() => {
    btn.textContent = 'Enregistrer';
    btn.style.background = '#5B4DF5';
  }, 2000);
}

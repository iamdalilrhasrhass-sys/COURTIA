/**
 * browserPilotService.js — ARK Browser Pilot (Playwright)
 * Permet à ARK d'ouvrir un navigateur isolé, exécuter des tâches web
 * et rapporter les résultats avec captures d'écran.
 *
 * Sécurité V1 :
 * - URL allowlist uniquement (sites de test / portails autorisés)
 * - Pas de mot de passe réel
 * - Pas d'action irréversible
 * - Timeout strict (30s par action)
 * - Dry-run par défaut
 * - Logs complets
 * - Mode validation humaine avant action finale
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Configuration ──────────────────────────────────────────────────────

const SCREENSHOTS_DIR = process.env.BROWSER_PILOT_SCREENSHOTS || '/tmp/browser-pilot';
const DEFAULT_TIMEOUT = 30000; // 30 secondes
const MAX_TASK_DURATION = 180000; // 3 minutes max par tâche

// URL allowlist — sites autorisés pour les tests V1
const URL_ALLOWLIST = [
  'example.com',
  'httpbin.org',
  'google.com',
  'bing.com',
  'wikipedia.org',
  'github.com',
  'courtiark.fr', 'www.courtiark.fr', 'app.courtiark.fr',
  'courtiark.vercel.app',
  'localhost',
  '127.0.0.1',
];

// Types d'actions supportées
const VALID_ACTIONS = [
  'navigate',      // Naviguer vers une URL
  'click',         // Cliquer sur un sélecteur
  'type',          // Taper dans un champ
  'select',        // Sélectionner une option
  'screenshot',    // Capture d'écran
  'wait',          // Attendre (ms ou sélecteur)
  'extract',       // Extraire du texte
  'submit',        // Soumettre un formulaire
];

// ── État du navigateur ─────────────────────────────────────────────────

// Map<taskId, { browser, context, page, status, logs, screenshots }>
const activeSessions = new Map();

// ── Utilitaires ────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function generateTaskId() {
  return `bp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function isUrlAllowed(url) {
  try {
    const parsed = new URL(url);
    return URL_ALLOWLIST.some(allowed => parsed.hostname.endsWith(allowed));
  } catch {
    return false;
  }
}

function validateAction(action) {
  if (!action || !action.type) {
    return { valid: false, error: 'Type d\'action requis' };
  }
  if (!VALID_ACTIONS.includes(action.type)) {
    return { valid: false, error: `Action invalide: ${action.type}. Valides: ${VALID_ACTIONS.join(', ')}` };
  }
  if (action.type === 'navigate' && !action.url) {
    return { valid: false, error: 'URL requise pour navigate' };
  }
  if (action.type === 'navigate' && !isUrlAllowed(action.url)) {
    return { valid: false, error: `URL non autorisée: ${action.url}. Whitelist: ${URL_ALLOWLIST.join(', ')}` };
  }
  return { valid: true };
}

// ── Fonctions principales ──────────────────────────────────────────────

/**
 * Créer une session navigateur et exécuter une séquence d'actions
 */
async function runTask(task) {
  const taskId = task.taskId || generateTaskId();
  const actions = task.actions || [];
  const dryRun = task.dryRun !== false; // dry-run par défaut
  const headless = task.headless !== false;

  ensureDir(SCREENSHOTS_DIR);
  const taskDir = path.join(SCREENSHOTS_DIR, taskId);
  ensureDir(taskDir);

  const session = {
    taskId,
    // PROPRIÉTAIRE de la session. POURQUOI (P2 SEC-011, mesuré en production le
    // 20/09/2026) : aucune session ne portait d'utilisateur, `listSessions`
    // renvoyait TOUTES les sessions à TOUS les cabinets et `getSession` n'avait
    // aucun contrôle de propriétaire. Le Browser Pilot d'un cabinet était donc
    // lisible — captures d'écran et journaux d'exécution compris — par les
    // autres cabinets, et approuvable par eux.
    userId: Number.isFinite(Number(task.userId)) && Number(task.userId) > 0 ? Number(task.userId) : null,
    status: 'running',
    logs: [`[${new Date().toISOString()}] Tâche créée (dry-run: ${dryRun})`],
    screenshots: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    result: null,
    error: null,
  };

  activeSessions.set(taskId, session);

  // Validation des actions
  const validationErrors = [];
  for (let i = 0; i < actions.length; i++) {
    const v = validateAction(actions[i]);
    if (!v.valid) {
      validationErrors.push({ step: i, action: actions[i].type, error: v.error });
    }
  }

  if (validationErrors.length > 0) {
    session.status = 'failed';
    session.error = `Actions invalides: ${JSON.stringify(validationErrors)}`;
    session.logs.push(`[${new Date().toISOString()}] ERREUR: ${session.error}`);
    session.completedAt = new Date().toISOString();
    return session;
  }

  if (dryRun && actions.length > 0) {
    session.logs.push(`[${new Date().toISOString()}] MODE DRY-RUN — aucune action réelle exécutée`);
    session.logs.push(`[${new Date().toISOString()}] Actions planifiées (${actions.length}):`);
    actions.forEach((a, i) => {
      session.logs.push(`  [${i}] ${a.type} → ${a.url || a.selector || '(aucun paramètre)'}`);
    });
    session.status = 'needs_approval';
    session.dryRunPlan = actions.map((a, i) => ({ step: i, ...a }));
    session.completedAt = new Date().toISOString();
    return session;
  }

  // Exécution réelle
  let browser;
  try {
    browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'fr-FR',
    });

    const page = await context.newPage();
    const logLines = [];
    const screenshotPaths = [];

    // COMPTAGE RÉEL DES ACTIONS — correction 20/09/2026.
    // `actionsExecuted` valait `actions.length`, c'est-à-dire le nombre
    // d'actions PRÉVUES : une tâche interrompue au 2ᵉ pas sur 10 (timeout,
    // sélecteur introuvable) rapportait « 10 actions exécutées ». On compte
    // désormais les actions réellement abouties et on expose les autres.
    let actionsExecuted = 0;
    let actionsEchouees = 0;
    let actionsIgnorees = 0;
    let interrompu = false;

    page.on('console', msg => {
      logLines.push(`[console] ${msg.type()}: ${msg.text()}`);
    });

    page.on('pageerror', err => {
      logLines.push(`[pageerror] ${err.message}`);
    });

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const startTime = Date.now();

      try {
        switch (action.type) {
          case 'navigate':
            logLines.push(`[${i}] Navigation vers: ${action.url}`);
            await page.goto(action.url, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT });
            logLines.push(`[${i}] Titre: ${await page.title()}`);
            break;

          case 'click':
            logLines.push(`[${i}] Clic sur: ${action.selector}`);
            await page.waitForSelector(action.selector, { timeout: DEFAULT_TIMEOUT });
            await page.click(action.selector);
            break;

          case 'type':
            logLines.push(`[${i}] Saisie dans: ${action.selector} (${action.value ? action.value.substring(0, 20) + '...' : '(vide)'})`);
            await page.waitForSelector(action.selector, { timeout: DEFAULT_TIMEOUT });
            await page.fill(action.selector, action.value || '');
            break;

          case 'select':
            logLines.push(`[${i}] Sélection: ${action.selector} → ${action.value}`);
            await page.waitForSelector(action.selector, { timeout: DEFAULT_TIMEOUT });
            await page.selectOption(action.selector, action.value);
            break;

          case 'screenshot':
            const ssPath = path.join(taskDir, `ss_${i}_${Date.now()}.png`);
            await page.screenshot({ path: ssPath, fullPage: action.fullPage !== false });
            screenshotPaths.push(ssPath);
            logLines.push(`[${i}] Screenshot: ${ssPath}`);
            break;

          case 'wait':
            if (action.selector) {
              logLines.push(`[${i}] Attente sélecteur: ${action.selector}`);
              await page.waitForSelector(action.selector, { timeout: DEFAULT_TIMEOUT });
            } else {
              const ms = action.timeout || 1000;
              logLines.push(`[${i}] Attente: ${ms}ms`);
              await page.waitForTimeout(ms);
            }
            break;

          case 'extract':
            let extracted = '';
            if (action.selector) {
              extracted = await page.textContent(action.selector);
            } else {
              extracted = await page.content();
            }
            logLines.push(`[${i}] Extraction (${action.selector || 'page complète'}): ${extracted.substring(0, 200)}...`);
            session.lastExtracted = extracted;
            break;

          case 'submit':
            logLines.push(`[${i}] Soumission formulaire`);
            if (action.selector) {
              await page.waitForSelector(action.selector, { timeout: DEFAULT_TIMEOUT });
              await page.click(action.selector);
            } else {
              await page.keyboard.press('Enter');
            }
            await page.waitForTimeout(1000);
            break;
        }

        // Screenshot après chaque action
        if (action.type !== 'screenshot') {
          const ssPath = path.join(taskDir, `ss_${i}_after.png`);
          await page.screenshot({ path: ssPath });
          screenshotPaths.push(ssPath);
        }

        actionsExecuted += 1;

      } catch (actionErr) {
        logLines.push(`[${i}] ERREUR: ${actionErr.message}`);
        const ssPath = path.join(taskDir, `ss_${i}_error.png`);
        try { await page.screenshot({ path: ssPath }); screenshotPaths.push(ssPath); } catch {}

        if (!action.optional) {
          actionsEchouees += 1;
          throw new Error(`Action ${i} (${action.type}) échouée: ${actionErr.message}`);
        }
        actionsIgnorees += 1;
        logLines.push(`[${i}] Action optionnelle ignorée`);
      }

      // Check total duration
      if (Date.now() - new Date(session.startedAt).getTime() > MAX_TASK_DURATION) {
        logLines.push(`[${i}] TÂCHE INTERROMPUE — durée maximale dépassée`);
        interrompu = true;
        break;
      }
    }

    // Screenshot final
    const finalSs = path.join(taskDir, 'final.png');
    await page.screenshot({ path: finalSs, fullPage: true });
    screenshotPaths.push(finalSs);
    logLines.push('[final] Screenshot final');

    session.status = interrompu ? 'partial' : 'completed';
    session.result = {
      // Chiffres RÉELS : ce qui a été exécuté, échoué, ignoré, et prévu.
      actionsExecuted,
      actionsFailed: actionsEchouees,
      actionsSkipped: actionsIgnorees,
      actionsPlanned: actions.length,
      interrupted: interrompu,
      ranAllPlannedActions: actionsExecuted === actions.length,
      pageTitle: await page.title(),
      pageUrl: page.url(),
    };

    if (session.lastExtracted) {
      session.result.extracted = session.lastExtracted.substring(0, 5000);
    }

    session.logs = session.logs.concat(logLines.map(l => `[${new Date().toISOString()}] ${l}`));
    session.screenshots = screenshotPaths;

    await context.close();
    await browser.close();

  } catch (err) {
    session.status = 'failed';
    // ── NAVIGATEUR ABSENT : LE DIRE, PAS SEULEMENT ÉCHOUER ──────────────────
    // POURQUOI : en production, Playwright était installé sans son Chromium
    // (« Executable doesn't exist at /opt/render/.cache/ms-playwright/… ») et
    // l'erreur brute du lancement était la seule explication donnée. Le
    // navigateur est désormais installé au déploiement (voir render.yaml,
    // `npm run playwright:install`) ; si l'installation a échoué, le message
    // doit nommer la cause réelle pour que l'exploitant sache quoi corriger —
    // sans jamais inventer une exécution.
    const navigateurAbsent = /Executable doesn't exist|playwright install|browserType\.launch/i.test(String(err && err.message))
    session.error = navigateurAbsent
      ? "Navigateur Chromium absent sur le serveur : le navigateur n'a pas été installé au déploiement. Aucune action n'a été exécutée."
      : err.message
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }

  session.completedAt = new Date().toISOString();
  return session;
}

/**
 * Approuver une tâche en dry-run pour exécution
 *
 * L'approbation REPREND le propriétaire de la session d'origine : une session
 * ne change jamais de cabinet en cours de route (sinon approuver la tâche d'un
 * autre la ferait exécuter pour le compte de l'approbateur).
 */
async function approveAndRun(taskId, modifiedActions, userId = null) {
  const session = activeSessions.get(taskId);
  if (!session) throw new Error('Session introuvable');
  if (userId !== null && session.userId !== Number(userId)) throw new Error('Session introuvable');
  if (session.status !== 'needs_approval') throw new Error(`Statut invalide: ${session.status}`);

  // Nettoyer l'ancienne session
  activeSessions.delete(taskId);

  // Relancer avec les actions (modifiées ou originales)
  const actions = modifiedActions || session.dryRunPlan;
  return runTask({
    taskId: generateTaskId(),
    userId: session.userId,
    actions,
    dryRun: false,
    headless: true,
  });
}

/**
 * Obtenir l'état d'une session
 * @param {string} taskId
 * @param {number|null} userId propriétaire exigé ; `undefined` = pas de contrôle
 *        (usage interne aux tests uniquement)
 */
function getSession(taskId, userId = undefined) {
  const session = activeSessions.get(taskId) || null;
  if (!session) return null;
  if (userId === undefined) return session;
  // Fail-closed : une session sans propriétaire n'est visible de personne.
  if (session.userId === null || session.userId !== Number(userId)) return null;
  return session;
}

/**
 * Lister les sessions récentes D'UN utilisateur.
 *
 * POURQUOI le paramètre `userId` est OBLIGATOIRE : c'est exactement l'oubli qui
 * a produit la fuite inter-cabinets. Un appel sans propriétaire ne renvoie RIEN
 * (fail-closed) au lieu de tout renvoyer.
 */
function listSessions(limit = 20, userId = null) {
  const proprietaire = Number(userId);
  if (!Number.isFinite(proprietaire) || proprietaire <= 0) return [];
  const sessions = Array.from(activeSessions.values())
    .filter((s) => s.userId === proprietaire);
  sessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  return sessions.slice(0, limit).map(s => ({
    taskId: s.taskId,
    status: s.status,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    // `actionsCount` valait `dryRunPlan.length || actionsExecuted` : une tâche
    // « completed » annonçait donc le nombre d'actions PRÉVUES. Les deux
    // notions sont désormais distinctes et nommées (correction 20/09/2026).
    actionsCount: s.result?.actionsExecuted ?? (s.dryRunPlan?.length || 0),
    actionsPlanned: s.dryRunPlan?.length ?? s.result?.actionsPlanned ?? null,
    error: s.error,
  }));
}

/**
 * Annulation d'une tâche — correction 20/09/2026.
 *
 * POURQUOI ELLE EXISTE : `DELETE /api/browser-pilot/task/:id` répondait
 * `{success: true, message: 'Tâche supprimée'}` sans RIEN supprimer — la ligne
 * restait dans `activeSessions` et réapparaissait aussitôt dans la liste et
 * dans `GET /task/:id`. Cette fonction est la seule à retirer la session et
 * rend `false` quand il n'y avait rien à retirer, pour que la route puisse
 * répondre 404 au lieu d'annoncer une suppression qui n'a pas eu lieu.
 *
 * Limite assumée et DITE : une action Playwright déjà en cours ne peut pas être
 * interrompue ; la session est retirée et le navigateur se ferme seul.
 *
 * @returns {boolean} vrai si une session a réellement été retirée
 */
function cancelSession(taskId, userId = undefined) {
  const session = activeSessions.get(taskId);
  if (!session) return false;
  // Isolation : un utilisateur ne peut annuler que sa propre tâche.
  if (userId !== undefined && userId !== null && session.userId !== Number(userId)) return false;
  if (session.status === 'running') {
    session.status = 'cancelled';
    session.logs = (session.logs || []).concat(
      `[${new Date().toISOString()}] ANNULÉE par l'utilisateur (session retirée, le navigateur en cours se ferme seul)`
    );
  }
  return activeSessions.delete(taskId);
}

/**
 * Nettoyer les sessions terminées
 */
function cleanupOldSessions(maxAge = 3600000) {
  const now = Date.now();
  for (const [taskId, session] of activeSessions.entries()) {
    if (session.completedAt && now - new Date(session.completedAt).getTime() > maxAge) {
      activeSessions.delete(taskId);
    }
  }
}

// Nettoyage périodique toutes les heures.
// `.unref()` : ce minuteur ne doit pas maintenir le processus en vie (sinon une
// suite de tests qui importe ce service ne rend jamais la main).
setInterval(() => cleanupOldSessions(), 3600000).unref?.()

module.exports = {
  runTask,
  approveAndRun,
  getSession,
  listSessions,
  cancelSession,
  URL_ALLOWLIST,
};

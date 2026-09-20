/**
 * storagePaths.js — racine unique des chemins disque du backend.
 *
 * POURQUOI CE FICHIER
 * Des chemins absolus propres au VPS (`/srv/courtia/...`) étaient codés en dur
 * comme valeurs par défaut de plusieurs modules. Sur Render, le process
 * n'existe pas dans cet arborescence : `fs.mkdirSync('/srv/courtia/...')`,
 * exécuté au chargement du module, levait EACCES et tuait le démarrage. La
 * conséquence n'était pas un simple log : le déploiement échouait
 * (`update_failed`) et Render continuait à servir l'ancienne version.
 *
 * RÈGLE : tout chemin disque dérive de la racine du dépôt (donc identique en
 * local, sur le VPS et sur Render), reste surchargeable par variable
 * d'environnement, et aucune création de dossier ne fait planter le process.
 *
 * Variables d'environnement reconnues :
 *   UPLOADS_ROOT          (défaut <repo>/uploads)
 *   DOCUMENT_UPLOAD_DIR   (défaut <UPLOADS_ROOT>/documents)
 *   DDA_REPORTS_DIR       (défaut <backend>/reports/dda)
 */

const fs = require('fs');
const path = require('path');

// __dirname = <repo>/backend/src/lib
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');

const UPLOADS_ROOT = process.env.UPLOADS_ROOT || path.join(REPO_ROOT, 'uploads');
const DOCUMENTS_UPLOAD_DIR = process.env.DOCUMENT_UPLOAD_DIR || path.join(UPLOADS_ROOT, 'documents');
const DDA_REPORTS_DIR = process.env.DDA_REPORTS_DIR || path.join(BACKEND_ROOT, 'reports', 'dda');
// Stockage documentaire (documents clients) et dossiers de conformité composés.
// Les anciennes valeurs par défaut (/root/courtia/...) n'existaient sur aucune
// machine : elles sont remplacées par <repo>/storage/..., surchargeables.
const DOCUMENT_STORAGE_ROOT = process.env.DOCUMENT_STORAGE_PATH || path.join(REPO_ROOT, 'storage', 'documents');
const COMPOSE_STORAGE_ROOT = process.env.COMPOSE_STORAGE_PATH || path.join(REPO_ROOT, 'storage', 'compliance');

/**
 * Crée un dossier si besoin. Ne lève JAMAIS : un disque en lecture seule ou un
 * dossier interdit doit produire un avertissement, pas un crash de démarrage.
 * @returns {boolean} true si le dossier est utilisable
 */
function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch (err) {
    if (err && err.code === 'EEXIST') return true;
    const code = err && err.code ? err.code : 'ERR';
    console.warn(`[storage] dossier indisponible : ${dir} (${code})`);
    return false;
  }
}

module.exports = {
  BACKEND_ROOT,
  REPO_ROOT,
  UPLOADS_ROOT,
  DOCUMENTS_UPLOAD_DIR,
  DDA_REPORTS_DIR,
  DOCUMENT_STORAGE_ROOT,
  COMPOSE_STORAGE_ROOT,
  ensureDir,
};

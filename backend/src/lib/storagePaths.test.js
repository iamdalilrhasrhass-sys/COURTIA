/**
 * storagePaths.test.js — garde-fou contre le retour de chemins absolus de machine.
 *
 * Contexte : des valeurs par défaut du type `/srv/courtia/...` ou
 * `/root/courtia/...` ont été codées en dur. Exécutées hors du VPS (Render),
 * elles faisaient planter le process au chargement du module (mkdir EACCES),
 * ce qui faisait échouer le déploiement et laissait l'ancienne version en ligne.
 */

const fs = require('fs');
const path = require('path');

const storage = require('./storagePaths');

describe('storagePaths', () => {
  const chemins = Object.entries(storage).filter(([, v]) => typeof v === 'string');

  test('REPO_ROOT est bien la racine du dépôt', () => {
    expect(fs.existsSync(path.join(storage.BACKEND_ROOT, 'server.js'))).toBe(true);
    expect(fs.existsSync(path.join(storage.REPO_ROOT, 'package.json'))).toBe(true);
  });

  test('aucun chemin absolu de machine n’est codé en dur dans le code de stockage', () => {
    const fichiers = [
      'storagePaths.js',
      '../services/ddaAudit.js',
      '../services/documentInboxService.js',
      '../services/documentStorage.js',
      '../services/compose/composer.js',
    ];
    for (const fichier of fichiers) {
      const source = fs.readFileSync(path.join(__dirname, fichier), 'utf8');
      // Les commentaires sont ignorés : seuls les littéraux exécutés comptent.
      const code = source
        .split('\n')
        .filter((ligne) => !ligne.trim().startsWith('//') && !ligne.trim().startsWith('*'))
        .join('\n');
      expect({ fichier, code }).toEqual({ fichier, code: expect.not.stringMatching(/['"`]\/(srv|root)\//) });
    }
  });

  test('les chemins par défaut sont tous absolus et dérivés du dépôt', () => {
    for (const [nom, valeur] of chemins) {
      expect(path.isAbsolute(valeur)).toBe(true);
      expect(valeur.startsWith(storage.REPO_ROOT) || valeur.startsWith(storage.BACKEND_ROOT)).toBe(true);
    }
  });

  test('ensureDir ne lève jamais, même sur un chemin inutilisable', () => {
    // Un dossier sous un fichier ne peut pas être créé (ENOTDIR).
    expect(() => storage.ensureDir('/etc/hostname/interdit')).not.toThrow();
    expect(storage.ensureDir('/etc/hostname/interdit')).toBe(false);
  });

  test('ensureDir crée le dossier et renvoie true', () => {
    const cible = path.join('/tmp', `storagepaths_${Date.now()}`, 'a', 'b');
    expect(storage.ensureDir(cible)).toBe(true);
    expect(fs.existsSync(cible)).toBe(true);
    fs.rmSync(path.dirname(path.dirname(cible)), { recursive: true, force: true });
  });
});

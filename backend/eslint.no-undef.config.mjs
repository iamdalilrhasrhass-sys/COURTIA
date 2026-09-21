/**
 * eslint.no-undef.config.mjs — GARDE STATIQUE CONTRE LES IDENTIFIANTS NON DÉFINIS.
 *
 * POURQUOI (mesure du 21/09/2026) : une recherche systématique a trouvé 17
 * identifiants utilisés mais jamais déclarés dans 4 fichiers du backend. Aucun
 * test ne les couvrait ; en production, chacun produit une ReferenceError donc
 * un 500 opaque :
 *   - `src/routes/documentInbox.js` : `clauseJetonRecherche` non importé →
 *     le lien public de collecte de pièces répondait 500 (8 entrées de journal
 *     Render constatées, chemin `/api/document-inbox/public/request/:token`).
 *   - `src/routes/arkChat.js` : `messagePublic` importé dans le bloc `try` d'un
 *     middleware, invisible des handlers → le message métier était remplacé par
 *     une erreur interne.
 *   - `src/routes/integrations.js` : `pool` absent de 4 handlers → 500.
 *   - `src/services/aiCostManager.js` : `model` déclaré dans le `try`, utilisé
 *     dans le `catch` → la journalisation d'erreur levait elle-même une erreur.
 *
 * Usage : `npm run audit:no-undef` (doit rendre 0 problème).
 * Le fichier est volontairement autonome : aucune dépendance ajoutée au projet,
 * il lit la version d'ESLint via npx au moment de l'exécution.
 */
export default [{
  files: ['**/*.js'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
    globals: {
      require: 'readonly', module: 'readonly', exports: 'writable', process: 'readonly',
      console: 'readonly', __dirname: 'readonly', __filename: 'readonly', Buffer: 'readonly',
      setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
      setImmediate: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', TextEncoder: 'readonly',
      TextDecoder: 'readonly', AbortController: 'readonly', fetch: 'readonly', structuredClone: 'readonly',
      global: 'readonly', globalThis: 'readonly', queueMicrotask: 'readonly',
      describe: 'readonly', test: 'readonly', expect: 'readonly', jest: 'readonly',
      beforeAll: 'readonly', afterAll: 'readonly', beforeEach: 'readonly', afterEach: 'readonly', it: 'readonly',
    },
  },
  rules: { 'no-undef': 'error' },
}]

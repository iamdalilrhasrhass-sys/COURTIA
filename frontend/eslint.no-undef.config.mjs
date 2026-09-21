/**
 * eslint.no-undef.config.mjs — garde-fou RÉEL du frontend (aucune dépendance à installer).
 *
 * POURQUOI : le script `npm run lint` pointait sur une configuration qui importe
 * `@eslint/js`, `globals`, `eslint-plugin-react-hooks` et `eslint-plugin-react-refresh`
 * — aucun de ces paquets n'est installé dans le dépôt. Le lint échouait donc à
 * l'exécution, donnant l'illusion d'un contrôle qualité qui n'existait pas.
 *
 * CE QU'IL VÉRIFIE : la classe de défaut qui a réellement produit des incidents en
 * production — un identifiant non défini (import oublié, variable hors portée).
 * Exemples vécus : `clauseJetonRecherche` non importé (route publique en 500),
 * `pool` absent dans des gestionnaires de connecteurs (500), `model` hors portée.
 *
 * Entièrement autonome : n'importe aucun paquet externe, donc fonctionne avec
 * `npx --yes eslint@9` sans toucher aux dépendances du dépôt.
 */
/**
 * Greffon neutre : le code porte déjà des commentaires `eslint-disable react-hooks/...`
 * écrits pour la configuration complète (qui exige des paquets non installés ici).
 * Déclarer ces règles vides permet à ces commentaires de rester valides sans installer
 * le greffon — aucune règle n'est réellement appliquée, le contrôle reste `no-undef`.
 */
const greffonNeutre = {
  rules: {
    'exhaustive-deps': { create: () => ({}) },
    'set-state-in-effect': { create: () => ({}) },
  },
}

export default [
  { ignores: ['dist/**', 'node_modules/**', 'public/**', 'build/**'] },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        // Navigateur
        window: 'readonly', document: 'readonly', navigator: 'readonly', location: 'readonly',
        localStorage: 'readonly', sessionStorage: 'readonly', console: 'readonly',
        fetch: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', Blob: 'readonly',
        File: 'readonly', FileReader: 'readonly', FormData: 'readonly', Headers: 'readonly',
        Request: 'readonly', Response: 'readonly', AbortController: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly',
        clearInterval: 'readonly', requestAnimationFrame: 'readonly', queueMicrotask: 'readonly',
        alert: 'readonly', confirm: 'readonly', prompt: 'readonly', atob: 'readonly', btoa: 'readonly',
        CustomEvent: 'readonly', Event: 'readonly', EventTarget: 'readonly', MessageChannel: 'readonly',
        HTMLElement: 'readonly', Element: 'readonly', Node: 'readonly', NodeList: 'readonly',
        DOMParser: 'readonly', XMLHttpRequest: 'readonly', WebSocket: 'readonly',
        IntersectionObserver: 'readonly', ResizeObserver: 'readonly', MutationObserver: 'readonly',
        matchMedia: 'readonly', innerWidth: 'readonly', innerHeight: 'readonly',
        performance: 'readonly', crypto: 'readonly', structuredClone: 'readonly',
        Image: 'readonly', Audio: 'readonly', getComputedStyle: 'readonly', TextEncoder: 'readonly',
        TextDecoder: 'readonly', ReadableStream: 'readonly', CSS: 'readonly',
        cancelAnimationFrame: 'readonly', PopStateEvent: 'readonly', MediaRecorder: 'readonly',
        KeyboardEvent: 'readonly', Notification: 'readonly', getSelection: 'readonly',
        process: 'readonly', // remplacé par Vite à la compilation (import.meta.env)
        global: 'readonly',
        // Tests (vitest)
        describe: 'readonly', it: 'readonly', test: 'readonly', expect: 'readonly',
        vi: 'readonly', beforeAll: 'readonly', beforeEach: 'readonly',
        afterAll: 'readonly', afterEach: 'readonly',
      },
    },
    plugins: { 'react-hooks': greffonNeutre },
    rules: {
      // Le cœur du contrôle : tout identifiant utilisé sans déclaration ni import.
      'no-undef': 'error',
      // Le code porte déjà des commentaires `eslint-disable react-hooks/...`.
      // Sans le greffon installé, ESLint les signalerait comme règles inconnues :
      // on les déclare éteintes pour que ces commentaires restent valides.
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      // Convention du dépôt : `catch (_err)`, arguments et variables préfixés `_`
      // sont volontairement ignorés — le contrôle ne doit pas les signaler.
      // Volontairement en AVERTISSEMENT : le dépôt porte ~1 170 imports/variables
      // morts (dette de nettoyage, sans effet à l'exécution). Les passer en erreur
      // rendrait la commande rouge en permanence, donc ignorée — seul l'identifiant
      // non défini (qui plante réellement l'écran) doit faire échouer le contrôle.
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
]

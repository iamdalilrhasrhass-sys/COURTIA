/**
 * motDePasseInitial.test.js — garde-fou de la convention des identifiants remis
 * aux cabinets (décision du 20/09/2026) : mot de passe initial = nom du cabinet,
 * première lettre en majuscule, sans espace ni caractère spécial.
 *
 * POURQUOI CE TEST : l'exploitant se fie à cette convention pour annoncer les
 * identifiants. Une dérive silencieuse (« Century Finance SARL » qui devient
 * « CenturyFinanceSARL ») ferait perdre du temps des deux côtés.
 */
const {
  motDePasseInitialDepuisCabinet,
  longueurSuffisante,
  LONGUEUR_MINIMALE,
} = require('./motDePasseInitial');

describe('mot de passe initial dérivé du nom du cabinet', () => {
  test('les cas réels des deux cabinets en essai', () => {
    expect(motDePasseInitialDepuisCabinet('Century Finance')).toBe('CenturyFinance');
    expect(motDePasseInitialDepuisCabinet('Spondeo')).toBe('Spondeo');
  });

  test('la forme juridique ne fait pas partie du mot de passe', () => {
    expect(motDePasseInitialDepuisCabinet('Spondeo Sàrl')).toBe('Spondeo');
    expect(motDePasseInitialDepuisCabinet('Spondeo SARL')).toBe('Spondeo');
    expect(motDePasseInitialDepuisCabinet('MARTIN SA')).toBe('MARTIN');
    expect(motDePasseInitialDepuisCabinet('Cabinet Durand SAS')).toBe('CabinetDurand');
    expect(motDePasseInitialDepuisCabinet('Weber GmbH')).toBe('Weber');
  });

  test('les séparateurs et caractères spéciaux disparaissent', () => {
    expect(motDePasseInitialDepuisCabinet('Cabinet Dupont & Fils')).toBe('CabinetDupontFils');
    expect(motDePasseInitialDepuisCabinet("L'Assurance")).toBe('LAssurance');
    expect(motDePasseInitialDepuisCabinet('Alpha-2  Courtage')).toBe('Alpha2Courtage');
    expect(motDePasseInitialDepuisCabinet('  espaces  partout  ')).toBe('Espacespartout');
  });

  test('la première lettre est mise en majuscule, le reste est conservé', () => {
    expect(motDePasseInitialDepuisCabinet('century finance')).toBe('Centuryfinance');
    expect(motDePasseInitialDepuisCabinet('assurance Léman')).toBe('AssuranceLéman');
  });

  test('un nom inexploitable ne produit pas de mot de passe inventé', () => {
    expect(motDePasseInitialDepuisCabinet('SARL')).toBeNull();
    expect(motDePasseInitialDepuisCabinet('   ')).toBeNull();
    expect(motDePasseInitialDepuisCabinet('')).toBeNull();
    expect(motDePasseInitialDepuisCabinet(null)).toBeNull();
    expect(motDePasseInitialDepuisCabinet(42)).toBeNull();
  });

  test('la longueur minimale du produit est connue et signalable', () => {
    expect(LONGUEUR_MINIMALE).toBe(8);
    expect(longueurSuffisante('CenturyFinance')).toBe(true);
    expect(longueurSuffisante('Spondeo')).toBe(false); // 7 caractères : accepté à la remise, signalé
    expect(longueurSuffisante('')).toBe(false);
    expect(longueurSuffisante(null)).toBe(false);
  });
});

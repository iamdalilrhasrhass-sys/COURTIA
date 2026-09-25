/**
 * accessTemplates.test.js — garde-fou de l'e-mail d'accès « Votre espace COURTIA
 * est prêt. » (décision du 20/09/2026).
 *
 * CE QUI EST VÉRIFIÉ, ET POURQUOI
 *  - le bouton pointe RÉELLEMENT vers https://courtiark.fr/login (un lien
 *    d'aperçu ou de suivi qui se glisserait là enverrait le cabinet au mauvais
 *    endroit sans que personne ne le voie) ;
 *  - le logo est celui du produit, pas une image inventée ;
 *  - identifiant et mot de passe figurent dans le corps ;
 *  - la phrase sur Paramètres > Sécurité et la signature « L'équipe COURTIA »
 *    sont présentes ;
 *  - aucune donnée client n'est injectable telle quelle (échappement HTML).
 */
const { buildAccessTemplate, LOGIN_URL, LOGO_URL } = require('./accessTemplates');

const CAS = {
  email: 'fyakoubi@centuryfinance.ch',
  motDePasse: 'CenturyFinance',
  cabinet: 'Century Finance',
  contact: 'Fares',
  joursEssai: 7,
  finEssai: '2026-09-27T10:24:00.000Z',
};

describe("e-mail d'accès client", () => {
  const t = buildAccessTemplate(CAS);

  test('l objet annonce un espace prêt, sans promesse de vente', () => {
    expect(t.subject).toBe('COURTIA — Votre espace est prêt');
  });

  test('le titre demandé est présent, mot pour mot', () => {
    expect(t.html).toContain('Votre espace COURTIA est prêt.');
    expect(t.text).toContain('Votre espace COURTIA est prêt.');
  });

  test('le CTA pointe exactement vers la connexion COURTIA', () => {
    expect(LOGIN_URL).toBe('https://courtiark.fr/login');
    expect(t.html).toContain(`href="${LOGIN_URL}"`);
    expect(t.html).toContain('ACCÉDER À COURTIA');
    // Aucun lien d'aperçu, de suivi ou de redirection tierce.
    const liens = [...t.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(liens.length).toBeGreaterThan(0);
    for (const lien of liens) {
      expect([LOGIN_URL, `mailto:arkcourtia@gmail.com`]).toContain(lien);
    }
  });

  test('le logo est celui servi par le produit', () => {
    expect(LOGO_URL).toBe('https://courtiark.fr/icon-192.png');
    expect(t.html).toContain(LOGO_URL);
  });

  test('identifiant et mot de passe temporaire figurent en clair dans le corps', () => {
    expect(t.html).toContain('IDENTIFIANT');
    expect(t.html).toContain('fyakoubi@centuryfinance.ch');
    expect(t.html).toContain('MOT DE PASSE TEMPORAIRE');
    expect(t.html).toContain('CenturyFinance');
    expect(t.text).toContain('fyakoubi@centuryfinance.ch');
    expect(t.text).toContain('CenturyFinance');
    expect(t.text).toContain('MOT DE PASSE TEMPORAIRE');
  });

  test('la mention Paramètres > Sécurité et la signature officielle sont là', () => {
    expect(t.html).toContain('Paramètres &gt; Sécurité');
    expect(t.html).toContain("L'équipe COURTIA");
    expect(t.text).toContain('Paramètres > Sécurité');
    expect(t.text).toContain("L'équipe COURTIA");
  });

  test('la fin exacte de l essai est annoncée, à l heure de Paris', () => {
    // 2026-09-27T10:24:00Z = 12:24 heure de Paris (CEST).
    expect(t.html).toContain('dimanche 27 septembre 2026 à 12:24');
    expect(t.html).toContain('(heure de Paris)');
    expect(t.html).toContain('essai gratuit COURTIA');
    expect(t.text).toContain('dimanche 27 septembre 2026 à 12:24');
    expect(t.text).toContain('(heure de Paris)');
  });

  test('une échéance à l instant près est rendue telle quelle (02/10/2026 17:00 Paris)', () => {
    const t2 = buildAccessTemplate({
      email: 'contact@exemple.fr',
      motDePasse: 'LcCourtierEnAssurances',
      cabinet: 'LC COURTIER EN ASSURANCES',
      contact: 'Lalia',
      finEssai: '2026-10-02T15:00:00.000Z', // 17:00 à Paris
    });
    expect(t2.html).toContain('vendredi 2 octobre 2026 à 17:00');
    expect(t2.text).toContain('vendredi 2 octobre 2026 à 17:00');
    // Aucun nombre de jours trompeur quand l'instant fait foi.
    expect(t2.html).not.toContain('essai gratuit COURTIA de');
  });

  test('sans fin connue, la durée annoncée reste exprimée en jours', () => {
    const t3 = buildAccessTemplate({ email: 'a@b.fr', motDePasse: 'Xyzabcd', joursEssai: 7 });
    expect(t3.html).toContain('essai gratuit COURTIA de 7 jours');
    expect(t3.text).toContain('essai gratuit COURTIA de 7 jours');
  });

  test('identité visuelle Aurora Dark : fond sombre, CTA violet → magenta', () => {
    expect(t.html).toContain('#04050f'); // fond bleu-noir
    expect(t.html).toContain('#7c3aed'); // violet officiel
    expect(t.html).toContain('#d946ef'); // magenta officiel
    expect(t.html).toContain('#22d3ee'); // cyan officiel
  });

  test('aucune donnée injectée brute : le HTML est échappé', () => {
    const piege = buildAccessTemplate({
      email: 'x"><script>alert(1)</script>@exemple.ch',
      motDePasse: '<b>MotDePasse</b>',
      cabinet: 'Cabinet <img src=x onerror=alert(1)>',
    });
    // Aucune balise brute : tout ce qui ressemble à du code est neutralisé.
    expect(piege.html).not.toMatch(/<script/i);
    expect(piege.html).not.toContain('<img src=x'); // le seul <img> est le logo officiel
    expect(piege.html).toContain('&lt;script&gt;');
    expect(piege.html).toContain('&quot;&gt;');
  });

  test('aucun gabarit non résolu dans le rendu', () => {
    expect(t.html).not.toMatch(/\{\{|\}\}|undefined|NaN/);
    expect(t.text).not.toMatch(/\{\{|\}\}|undefined|NaN/);
  });
});

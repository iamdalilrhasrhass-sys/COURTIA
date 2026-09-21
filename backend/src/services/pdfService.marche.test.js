/**
 * pdfService.marche.test.js — LES RAPPORTS RÉGLEMENTAIRES SUIVENT LE MARCHÉ DU
 * CABINET ET NE CERTIFIENT RIEN (défaut P2 CH-034, 21/09/2026).
 *
 * DÉFAUT MESURÉ : `generateACPR` et `generateRGPD` produisaient, pour un cabinet
 * suisse, un « Rapport d'Audit ACPR » et une liste « RGPD Compliance » avec les
 * lignes auto-certifiantes « ✓ RGPD: Données personnelles conformes » et
 * « ✓ ACPR: Audit réglementaire OK » — l'ACPR n'a aucune compétence en Suisse,
 * le RGPD est un règlement de l'Union européenne, et aucune mesure de
 * conformité n'avait été prise pour affirmer cela.
 *
 * CONTRAT TESTÉ :
 *   (a) cabinet suisse → FINMA + nLPD, AUCUN « ACPR » ni « RGPD », aucun
 *       fichier « ACPR_… »/« RGPD_… », et une formulation factuelle
 *       (« contrôle effectué le …, sur les données du cabinet ») ;
 *   (b) cabinet français → référentiel historique conservé (ACPR + RGPD), sans
 *       auto-certification pour autant ;
 *   (c) le marché se résout depuis le CABINET de l'utilisateur
 *       (`lib/marcheCabinet`), pas depuis un libellé du fichier.
 *
 * Les PDF sont RÉELLEMENT générés : le test décompresse le flux de contenu
 * (FlateDecode) et y relit le texte que le moteur a écrit — aucune doublure.
 */
const fs = require('fs');
const zlib = require('zlib');

const pdfService = require('./pdfService');

/**
 * Table WinAnsi des octets 0x80-0x9F : pdfkit encode le texte en WinAnsi, un
 * décodage latin1 brut y laisserait des octets de contrôle à la place des
 * tirets longs et apostrophes typographiques.
 */
const WINANSI = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘',
  0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜',
  0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

function decoderWinAnsi(hex) {
  let texte = '';
  for (const octet of Buffer.from(hex, 'hex')) {
    texte += WINANSI[octet] !== undefined ? WINANSI[octet] : Buffer.from([octet]).toString('latin1');
  }
  return texte;
}

/** Texte réellement écrit dans le PDF (flux de contenu décompressé, opérateurs TJ). */
function texteDuPdf(chemin) {
  const buffer = fs.readFileSync(chemin);
  const lignes = [];
  let curseur = 0;
  while (true) {
    const debutStream = buffer.indexOf('stream', curseur);
    if (debutStream < 0) break;
    const finStream = buffer.indexOf('endstream', debutStream);
    if (finStream < 0) break;
    const debutDonnees = buffer.indexOf('\n', debutStream) + 1;
    try {
      const flux = zlib.inflateSync(buffer.subarray(debutDonnees, finStream)).toString('latin1');
      for (const bloc of flux.split('ET')) {
        let ligne = '';
        for (const tableau of bloc.match(/\[(.*?)\]\s*TJ/g) || []) {
          for (const chaine of tableau.matchAll(/<([0-9a-fA-F]+)>/g)) ligne += decoderWinAnsi(chaine[1]);
        }
        if (ligne) lignes.push(ligne);
      }
    } catch (_err) {
      // Flux non compressé (image, police) : sans texte à relire.
    }
    curseur = finStream + 1;
  }
  return lignes.join('\n');
}

const STATS_FR = { totalClients: 40, activeClients: 31, totalContracts: 52, totalRevenue: 78000, avgRiskScore: 24, avgLoyaltyScore: 68 };

const CLIENTS = [
  { first_name: 'Jean', last_name: 'Müller', email: 'jean@exemple.ch', phone: '079 000 00 00', status: 'actif' },
  { first_name: 'Anne', last_name: 'Dupont', email: 'anne@exemple.ch', phone: '078 000 00 00', status: 'actif' },
];

const fichiers = [];
async function generer(generateur, ...args) {
  const chemin = await generateur(...args);
  fichiers.push(chemin);
  return chemin;
}

afterAll(() => {
  for (const f of fichiers) {
    try { fs.unlinkSync(f); } catch (_err) { /* déjà supprimé */ }
  }
});

describe('pdfService — le référentiel d’un rapport est celui du marché du cabinet (P2 CH-034)', () => {
  test('(a) cabinet suisse : FINMA + nLPD, aucune mention ACPR ni RGPD, aucune auto-certification', async () => {
    const cheminRapport = await generer(pdfService.generateACPR, STATS_FR, { marche: 'CH' });
    const cheminDonnees = await generer(pdfService.generateRGPD, CLIENTS, { marche: 'CH' });

    const texte = texteDuPdf(cheminRapport) + '\n' + texteDuPdf(cheminDonnees);

    // L'autorité et le cadre de protection des données du marché suisse…
    expect(texte).toMatch(/FINMA/);
    expect(texte).toMatch(/nLPD/);
    // …et AUCUNE référence française ou européenne.
    expect(texte).not.toMatch(/ACPR/);
    expect(texte).not.toMatch(/RGPD/);
    expect(texte).not.toMatch(/ORIAS/);

    // Le nom de fichier non plus ne doit pas estampiller un référentiel étranger.
    expect(cheminRapport).not.toMatch(/ACPR/);
    expect(cheminDonnees).not.toMatch(/RGPD/);

    // Formulation factuelle : ce qui a été fait, quand, sur quelles données.
    expect(texte).toMatch(/Contrôle effectué le \d{2}\.\d{2}\.\d{4}, sur les données du cabinet/);

    // Plus aucune auto-certification de conformité.
    expect(texte).not.toMatch(/conformes?\b/i);
    expect(texte).not.toMatch(/réglementaire OK/i);
    expect(texte).not.toMatch(/✓/);
    expect(texte).toMatch(/Aucune conformité n'est certifiée/);
  });

  test('(b) cabinet français : référentiel historique conservé (ACPR + RGPD), toujours aucune certification', async () => {
    const cheminRapport = await generer(pdfService.generateACPR, STATS_FR, { marche: 'FR' });
    const cheminDonnees = await generer(pdfService.generateRGPD, CLIENTS, { marche: 'FR' });

    const texte = texteDuPdf(cheminRapport) + '\n' + texteDuPdf(cheminDonnees);

    expect(texte).toMatch(/Rapport d'audit ACPR/);
    expect(texte).toMatch(/ACPR/);
    expect(texte).toMatch(/RGPD/);
    expect(texte).toMatch(/ORIAS/);
    // Aucun référentiel suisse servi à un cabinet français.
    expect(texte).not.toMatch(/FINMA/);
    expect(texte).not.toMatch(/nLPD/);
    // Le comportement historique du fichier est conservé.
    expect(cheminRapport).toMatch(/ACPR_/);
    expect(cheminDonnees).toMatch(/RGPD_/);
    // …et la France ne certifie pas davantage.
    expect(texte).toMatch(/Contrôle effectué le \d{2}\/\d{2}\/\d{4}, sur les données du cabinet/);
    expect(texte).not.toMatch(/\bconformes?\b/i);
    expect(texte).not.toMatch(/✓/);
  });

  test('(c) le marché vient du CABINET de l’utilisateur (lib/marcheCabinet), pas du fichier', async () => {
    const requetes = [];
    const pool = {
      query: async (sql) => {
        const s = String(sql);
        requetes.push(s);
        if (/cabinet_members/.test(s)) {
          return { rows: [{ cabinet_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role: 'owner' }] };
        }
        if (/FROM cabinets WHERE/.test(s)) {
          return { rows: [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Cabinet Léman', country: 'CH', registre_type: 'FINMA' }] };
        }
        return { rows: [] };
      },
    };

    const chemin = await generer(pdfService.generateACPR, STATS_FR, { userId: 140, pool });
    const texte = texteDuPdf(chemin);

    expect(requetes.some((s) => /cabinet_members/.test(s))).toBe(true);
    expect(texte).toMatch(/FINMA/);
    expect(texte).not.toMatch(/ACPR/);
    expect(texte).not.toMatch(/RGPD/);
  });

  test('marché explicite prioritaire, marché illisible ou absent : France (jamais un référentiel étranger)', async () => {
    expect(pdfService.vocabulaireRapport('CH').autorite).toBe('FINMA');
    expect(pdfService.vocabulaireRapport('CH').donnees).toMatch(/nLPD/);
    expect(pdfService.vocabulaireRapport('CH').donnees).not.toMatch(/RGPD/);
    expect(pdfService.vocabulaireRapport('FR').autorite).toBe('ACPR');
    expect(pdfService.vocabulaireRapport('FR').donnees).toMatch(/RGPD/);
    for (const marche of [undefined, null, '', 'BE', 'ZZ', 'inconnu']) {
      expect(pdfService.vocabulaireRapport(marche).marche).toBe('FR');
      expect(pdfService.vocabulaireRapport(marche).autorite).toBe('ACPR');
    }
    // Un pool seul (signature historique `generateRGPD(liste, pool)`) ne bascule
    // personne : aucun marché lisible ⇒ France.
    const poolSansUtilisateur = { query: async () => ({ rows: [] }) };
    await expect(pdfService.marcheDuRapport(poolSansUtilisateur)).resolves.toBe('FR');
    // Le référentiel suisse ne contient aucun libellé français.
    const ch = pdfService.vocabulaireRapport('CH');
    expect(JSON.stringify(ch)).not.toMatch(/ACPR/);
    expect(JSON.stringify(ch)).not.toMatch(/RGPD/);
  });
});

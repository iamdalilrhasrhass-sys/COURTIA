/**
 * devisPdfService.js — production des documents PDF de devis.
 *
 * ÉTAT PRÉCÉDENT (corrigé le 20/09/2026) : ce fichier était écrit en syntaxe
 * ES module (`export const generateDevisPdf = …`) dans un backend CommonJS.
 * `require()` ne rendait donc AUCUN des symboles attendus par routes/devis.js
 * (`shortId`, `buildDevisPdf`, `buildPdfPath`) : la création d'un devis dans
 * l'assistant répondait 500 « shortId is not a function » (parcours
 * /devis/new impossible) et le relevé de commission échouait de la même façon.
 * Le fichier est réécrit en CommonJS avec les trois exports réellement appelés.
 *
 * Il ne contient plus AUCUNE donnée inventée : le pied de page n'imprime que les
 * identifiants réellement saisis par le cabinet (registre FINMA/ORIAS, UID).
 * L'ancien pied de page « ORIAS 12345678 • RC Pro AXA n°1234 » était un faux
 * numéro de registre et un faux assureur imprimés sur un document client.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const PDFDocument = require('pdfkit');

const COULEURS = { fond: '#050510', accent: '#5B4DF5', texte: '#333333', discret: '#888888' };

/** Référence courte et unique pour un devis (« DV-7K2M4Q »). */
function shortId(prefixe = 'DV') {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suite = '';
  for (let i = 0; i < 6; i += 1) {
    suite += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefixe}-${suite}`;
}

/** Chemin de sortie du PDF, dans le dossier temporaire du service. */
function buildPdfPath(userId, devisId) {
  const dossier = path.join(os.tmpdir(), 'courtia-devis');
  fs.mkdirSync(dossier, { recursive: true });
  return path.join(dossier, `devis-${userId || 'x'}-${devisId || 'x'}.pdf`);
}

function montant(valeur, devise = 'EUR') {
  const n = Number(valeur || 0);
  const unite = devise === 'CHF' ? 'CHF' : 'EUR';
  return `${n.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unite}`;
}

/** Lignes d'identification du cabinet : uniquement ce qui est réellement saisi. */
function lignesIdentification(cabinet = {}) {
  const lignes = [];
  if (cabinet.registreType && cabinet.registreNumero) {
    lignes.push(`${cabinet.registreType} ${cabinet.registreNumero}`);
  }
  if (cabinet.uid) lignes.push(`UID ${cabinet.uid}`);
  if (cabinet.orias) lignes.push(`ORIAS ${cabinet.orias}`);
  const ville = [cabinet.codePostal, cabinet.ville].filter(Boolean).join(' ');
  if (ville) lignes.push(ville);
  if (cabinet.phone) lignes.push(cabinet.phone);
  if (cabinet.email) lignes.push(cabinet.email);
  return lignes;
}

/**
 * buildDevisPdf — écrit le PDF d'une proposition et renvoie son chemin.
 * Reçoit { cabinet, client, devis, offers, outputPath } (voir routes/devis.js).
 */
async function buildDevisPdf({ cabinet = {}, client = {}, devis = {}, offers = [], outputPath }) {
  const chemin = outputPath || buildPdfPath(devis.userId, devis.id);
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  const devise = cabinet.devise === 'CHF' ? 'CHF' : 'EUR';

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const flux = fs.createWriteStream(chemin);
  doc.pipe(flux);

  // En-tête
  doc.rect(0, 0, 595, 100).fill(COULEURS.fond);
  doc.fillColor('white').fontSize(20).text('COURTIA', 50, 40);
  doc.fontSize(9).fillColor('#CCCCCC').text('Courtage en assurances', 50, 66);
  doc.fillColor('white').fontSize(14).text("Proposition d'assurance", 330, 40, { width: 215, align: 'right' });
  doc.fontSize(9).fillColor('#CCCCCC')
     .text(`Référence : ${devis.reference || '—'}`, 330, 62, { width: 215, align: 'right' });

  // Cabinet émetteur
  doc.fillColor(COULEURS.texte).fontSize(10).text(cabinet.name || 'COURTIA', 50, 120);
  let ligne = 134;
  for (const l of lignesIdentification(cabinet)) {
    doc.fontSize(8).fillColor(COULEURS.discret).text(l, 50, ligne);
    ligne += 11;
  }

  // Destinataire
  doc.fontSize(10).fillColor(COULEURS.texte).text(client.name || 'Client', 330, 120);
  let ligneClient = 134;
  for (const l of [client.address, client.email, client.phone].filter(Boolean)) {
    doc.fontSize(8).fillColor(COULEURS.discret).text(l, 330, ligneClient, { width: 215 });
    ligneClient += 11;
  }

  // Contexte
  let y = Math.max(ligne, ligneClient) + 24;
  doc.fontSize(9).fillColor(COULEURS.texte)
     .text(`Produit : ${devis.product || '—'}   •   Formule : ${devis.preset || '—'}   •   `
         + `Validité : ${devis.validity_days || 30} jours`, 50, y);
  y += 26;

  // Tableau des offres
  doc.rect(50, y, 495, 20).fill(COULEURS.accent);
  doc.fillColor('white').fontSize(9);
  doc.text('Assureur', 58, y + 6);
  doc.text('Couverture', 210, y + 6);
  doc.text('Prime annuelle', 380, y + 6, { width: 150, align: 'right' });
  y += 20;

  doc.fillColor(COULEURS.texte);
  offers.forEach((offre, i) => {
    doc.rect(50, y, 495, 20).fill(i % 2 === 0 ? '#F7F7FB' : '#FFFFFF');
    doc.fillColor(COULEURS.texte).fontSize(9);
    doc.text(String(offre.provider_name || offre.provider || '—'), 58, y + 6, { width: 145 });
    doc.text(String(offre.formule || offre.cover_label || '—'), 210, y + 6, { width: 160 });
    const prime = offre.prime_annuelle_chf ?? offre.prime_annuelle_eur ?? offre.prime_annuelle ?? offre.premium;
    doc.text(montant(prime, devise), 380, y + 6, { width: 150, align: 'right' });
    y += 20;
  });

  // Synthèse ARK (uniquement si elle est fournie)
  if (devis.ark_summary) {
    y += 18;
    doc.fontSize(9).fillColor(COULEURS.accent).text('Synthèse', 50, y);
    y += 14;
    doc.fontSize(9).fillColor(COULEURS.texte).text(String(devis.ark_summary), 50, y, { width: 495 });
  }

  // Pied de page : mentions du cabinet, jamais un identifiant inventé.
  doc.fontSize(7.5).fillColor(COULEURS.discret)
     .text(`${cabinet.name || 'COURTIA'} — document établi par le courtier, sans valeur contractuelle `
         + `de l'assureur.`, 50, 760, { width: 495, align: 'center' });

  doc.end();
  return new Promise((resolve, reject) => {
    flux.on('finish', () => resolve(chemin));
    flux.on('error', reject);
  });
}

/**
 * generateDevisPdf — signature historique conservée (devis, client, items),
 * réimplémentée au-dessus de buildDevisPdf pour ne rien casser.
 */
async function generateDevisPdf(devis = {}, client = {}, items = []) {
  return buildDevisPdf({
    cabinet: devis.cabinet || {},
    client: {
      name: client.full_name || [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Client',
      address: client.address || '',
      email: client.email || '',
      phone: client.phone || '',
    },
    devis,
    offers: (items || []).map((it) => ({
      provider_name: it.label,
      formule: it.plafond,
      prime_annuelle: it.prime,
    })),
    outputPath: buildPdfPath(devis.userId, devis.id || shortId('DV')),
  });
}

module.exports = { shortId, buildPdfPath, buildDevisPdf, generateDevisPdf };

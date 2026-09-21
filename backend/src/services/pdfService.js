const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// LE RÉFÉRENTIEL D'UN RAPPORT EST CELUI DU MARCHÉ DU CABINET
//
// DÉFAUT MESURÉ (P2 CH-034, 21/09/2026) : `generateACPR` et `generateRGPD`
// écrivaient en dur « Rapport d'Audit ACPR », « Liste Clients - RGPD
// Compliance », « ✓ RGPD: Données personnelles conformes » et
// « ✓ ACPR: Audit réglementaire OK », y compris pour un cabinet établi en
// Suisse, dont l'autorité est la FINMA et le cadre de protection des données la
// nLPD. Deux problèmes dans un seul écran :
//   1. une autorité de contrôle FRANÇAISE (l'ACPR n'a aucune compétence en
//      Suisse) et un règlement de l'Union européenne servis à un cabinet suisse ;
//   2. une AUTO-CERTIFICATION de conformité — un contenu à valeur juridique —
//      alors qu'aucune mesure de conformité n'a été prise. Le produit ne doit
//      jamais affirmer qu'un cabinet est conforme.
//
// LA RÈGLE
//   • le marché vient de `lib/marcheCabinet` (règle unique du produit : le
//     cabinet d'abord, le profil de l'appelant en repli) — jamais d'un libellé
//     recopié dans ce fichier pour un second usage ;
//   • le vocabulaire (autorité, registre, cadre de protection des données)
//     vient de `services/referentielConformite`, seule source des libellés
//     réglementaires. Ce module ne décide donc de rien : il rend le rapport
//     dans le référentiel qu'on lui désigne ;
//   • toute lecture impossible retombe sur la FRANCE (comportement historique) :
//     un cabinet français n'est jamais basculé vers un référentiel étranger sur
//     une donnée manquante ;
//   • les mentions remplacent l'auto-certification par un FAIT vérifiable :
//     « contrôle effectué le …, sur les données du cabinet ». Le rapport décrit
//     ce qu'il a lu, il ne certifie rien.
// ─────────────────────────────────────────────────────────────────────────────
let referentielConformite = null
try {
  referentielConformite = require('./referentielConformite')
} catch (_err) {
  referentielConformite = null
}
let marcheCabinet = null
try {
  marcheCabinet = require('../lib/marcheCabinet')
} catch (_err) {
  marcheCabinet = null
}
let deviseDuMarche = { symbole: (marche) => (String(marche).toUpperCase() === 'CH' ? 'CHF' : '€') }
try {
  deviseDuMarche = require('../lib/devise')
} catch (_err) {
  /* repli local ci-dessus : « CHF » en Suisse, « € » en France */
}

/**
 * Libellés propres au rapport, par marché. Les valeurs qui portent une
 * autorité ou un texte de loi ne sont PAS recopiées ici quand le référentiel
 * les connaît : elles sont lues dans `referentielConformite` (source unique) et
 * ces entrées ne servent que de repli si le référentiel est indisponible.
 */
const MARCHES_RAPPORTS = Object.freeze({
  FR: Object.freeze({
    code: 'FR',
    locale: 'fr-FR',
    // Titre historique conservé pour la France.
    titre_rapport: "Rapport d'audit ACPR",
    titre_donnees: 'Liste clients — protection des données (RGPD)',
    // Nom de fichier : identique à l'historique pour la France.
    prefixe_rapport: 'ACPR',
    prefixe_donnees: 'RGPD',
    autorite: 'ACPR',
    autorite_libelle: 'ACPR — Autorité de contrôle prudentiel et de résolution',
    registre: 'ORIAS — registre unique des intermédiaires en assurance',
    donnees: 'RGPD — Règlement (UE) 2016/679',
    // La France nomme ses référentiels, mais ne certifie rien pour autant.
    mention_legale: "Document confidentiel de travail interne. Aucune conformité ACPR ou RGPD n'est certifiée ni attestée par COURTIA.",
  }),
  CH: Object.freeze({
    code: 'CH',
    locale: 'fr-CH',
    // Aucune autorité française, aucune directive de l'Union européenne : le
    // titre reste descriptif de ce que le cabinet doit réunir.
    titre_rapport: 'Rapport de conformité du cabinet',
    titre_donnees: 'Liste clients — protection des données (nLPD)',
    // Le nom de fichier ne doit pas davantage estampiller « ACPR »/« RGPD ».
    prefixe_rapport: 'conformite',
    prefixe_donnees: 'donnees',
    autorite: 'FINMA',
    autorite_libelle: 'FINMA — Autorité fédérale de surveillance des marchés financiers',
    registre: "Registre des intermédiaires d'assurance tenu par la FINMA (référence : numéro UID/IDE du cabinet)",
    donnees: 'nLPD — nouvelle loi fédérale sur la protection des données',
    mention_legale: "Document confidentiel de travail interne du cabinet. Aucune conformité n'est certifiée ni attestée par COURTIA.",
  }),
})

/** Ramène un pays / une langue / un registre libre vers un marché connu. */
function normaliserMarcheRapport(marche) {
  if (referentielConformite && typeof referentielConformite.normaliserMarche === 'function') {
    const code = referentielConformite.normaliserMarche(marche)
    if (code) return code
  }
  const v = String(marche || '').trim().toLowerCase()
  if (!v) return null
  if (['ch', 'che', 'sui', 'suisse', 'switzerland', 'swiss', 'sz'].includes(v)) return 'CH'
  if (['fr', 'fra', 'france', 'français', 'francais'].includes(v)) return 'FR'
  if (v.startsWith('ch') || v.startsWith('suisse') || v.startsWith('switz')) return 'CH'
  if (v.startsWith('fr') || v.startsWith('france')) return 'FR'
  return null
}

/** Libellés du référentiel de conformité du marché, ou `null` s'il est indisponible. */
function libellesDuReferentiel(code) {
  try {
    if (referentielConformite && typeof referentielConformite.libellesConformite === 'function') {
      const libelles = referentielConformite.libellesConformite(code)
      if (libelles && libelles.marche) return libelles
    }
  } catch (_err) {
    /* référentiel indisponible : repli local ci-dessous, jamais un autre pays */
  }
  return null
}

/**
 * Vocabulaire d'un rapport réglementaire pour un marché donné.
 * FONCTION PURE — testée unitairement.
 *
 * @param {'FR'|'CH'|string} [marche]
 */
function vocabulaireRapport(marche = 'FR') {
  const code = normaliserMarcheRapport(marche) || 'FR'
  const base = MARCHES_RAPPORTS[code] || MARCHES_RAPPORTS.FR
  const referentiel = libellesDuReferentiel(code) || {}

  return Object.freeze({
    marche: code,
    locale: base.locale,
    pays: referentiel.pays || (code === 'CH' ? 'Suisse' : 'France'),
    // Autorité de tutelle : lue dans le référentiel (FINMA en Suisse, ACPR en
    // France). Un cabinet suisse ne peut donc JAMAIS recevoir l'ACPR.
    autorite: referentiel.autorite || base.autorite,
    autorite_libelle: referentiel.autorite_libelle || base.autorite_libelle,
    registre: referentiel.registre || base.registre,
    // Cadre de protection des données du marché (nLPD en Suisse, RGPD en France).
    donnees: referentiel.donnees || base.donnees,
    titre_rapport: base.titre_rapport,
    titre_donnees: base.titre_donnees,
    prefixe_rapport: base.prefixe_rapport,
    prefixe_donnees: base.prefixe_donnees,
    mention_legale: base.mention_legale,
    // Symbole monétaire du marché : « CHF » en Suisse, « € » en France.
    symbole: deviseDuMarche.symbole(code),
  })
}

/** Lecteur SQL à partir de `options` (fonction, `{ query }`, `{ pool }`, `{ lecteur }`). */
function lecteurSql(options) {
  if (typeof options === 'function') return options
  if (options && typeof options.query === 'function') return (sql, params) => options.query(sql, params)
  if (options && options.pool && typeof options.pool.query === 'function') return (sql, params) => options.pool.query(sql, params)
  if (options && typeof options.lecteur === 'function') return options.lecteur
  return undefined
}

/**
 * Marché d'un rapport : explicite d'abord (`options.marche`, choisi par une
 * route qui a déjà résolu la portée), sinon le marché du CABINET de
 * l'utilisateur via `lib/marcheCabinet` (jamais le seul profil local quand un
 * cabinet existe), sinon la France.
 *
 * @param {{marche?:string, userId?:number, pool?:object, query?:Function, lecteur?:Function}|object} [options]
 */
async function marcheDuRapport(options = {}) {
  const explicite = typeof options === 'string' ? options : (options && (options.marche || options.market))
  const codeExplicite = normaliserMarcheRapport(explicite)
  if (codeExplicite) return codeExplicite

  const userId = options && typeof options === 'object'
    ? (options.userId != null ? options.userId : options.user_id)
    : null
  if (userId && marcheCabinet && typeof marcheCabinet.marcheUtilisateur === 'function') {
    try {
      const lecteur = lecteurSql(options)
      const verdict = await marcheCabinet.marcheUtilisateur(
        userId,
        lecteur || ((sql, params) => require('../db').query(sql, params))
      )
      if (verdict && verdict.marche) return verdict.marche === 'CH' ? 'CH' : 'FR'
    } catch (_err) {
      // Lecture impossible : on ne bascule pas un cabinet vers un référentiel
      // étranger — on reste sur la France, comportement historique.
    }
  }
  return 'FR'
}

/** Ligne factuelle de contrôle : ce qui a été fait, quand, sur quelles données. */
function mentionControle(dateTexte, portee) {
  const details = String(portee || '').trim()
  const suffixe = details ? ` (${details})` : ''
  return `Contrôle effectué le ${dateTexte}, sur les données du cabinet${suffixe}. Aucune conformité n'est certifiée par COURTIA.`;
}

/** « 1 client » / « 4 clients » — un décompte lisible n'annonce pas « 1 clients ». */
function decompte(nombre, singulier, pluriel) {
  const n = Number(nombre) || 0
  return `${n} ${n > 1 ? pluriel : singulier}`
}

/** Montant du marché : « 45000€ » (France, historique) / « 45000 CHF » (Suisse). */
function montant(valeur, symbole) {
  return symbole === '€' ? `${valeur}€` : `${valeur} ${symbole}`
}

const pdfService = {
  // Generate DDA (Document Demande d'Assurance)
  async generateDDA(clientData, pool) {
    return new Promise(async (resolve, reject) => {
      try {
        const fileName = `DDA_${clientData.id}_${Date.now()}.pdf`;
        const filePath = path.join('/tmp', fileName);
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('COURTIA', 50, 50);
        doc.fontSize(10).font('Helvetica').text('Document Demande d\'Assurance', 50, 85);
        doc.moveTo(50, 100).lineTo(550, 100).stroke();

        // Client Info
        doc.fontSize(12).font('Helvetica-Bold').text('Client', 50, 120);
        doc.fontSize(10).font('Helvetica');
        doc.text(`${clientData.first_name} ${clientData.last_name}`, 50, 140);
        doc.text(`Email: ${clientData.email}`, 50, 158);
        doc.text(`Téléphone: ${clientData.phone}`, 50, 176);
        doc.text(`Adresse: ${clientData.address || 'N/A'}`, 50, 194);

        // Date
        doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 350, 140);

        // Contracts
        doc.fontSize(12).font('Helvetica-Bold').text('Contrats Actuels', 50, 250);
        doc.fontSize(10).font('Helvetica');

        let yPosition = 280;
        if (clientData.contracts && clientData.contracts.length > 0) {
          clientData.contracts.forEach(contract => {
            doc.text(`• ${contract.type}: ${contract.premium}€ (Expire: ${contract.end_date})`, 50, yPosition);
            yPosition += 20;
          });
        } else {
          doc.text('Aucun contrat', 50, yPosition);
        }

        // Footer
        doc.fontSize(8).text('Document généré par COURTIA - ' + new Date().toLocaleDateString('fr-FR'), 50, doc.page.height - 50, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Liste des clients + cadre de protection des données DU MARCHÉ DU CABINET.
   *
   * @param {Array} clientsList
   * @param {{marche?:string, userId?:number, pool?:object}|object} [options]
   *        `marche` déjà décidé, ou `userId` (+ lecteur SQL) pour lire le marché
   *        du cabinet. Repli : France.
   */
  async generateRGPD(clientsList, options = {}) {
    const liste = Array.isArray(clientsList) ? clientsList : []
    const vocab = vocabulaireRapport(await marcheDuRapport(options))
    const dateTexte = new Date().toLocaleDateString(vocab.locale)

    return new Promise((resolve, reject) => {
      try {
        const fileName = `${vocab.prefixe_donnees}_${Date.now()}.pdf`;
        const filePath = path.join('/tmp', fileName);
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('COURTIA', 50, 50);
        doc.fontSize(10).font('Helvetica').text(vocab.titre_donnees, 50, 85);
        doc.moveTo(50, 100).lineTo(550, 100).stroke();

        // Date + périmètre réellement lu + référentiels du marché
        doc.fontSize(10).text(`Généré le: ${dateTexte}`, 50, 120);
        doc.fontSize(10).text(`Total clients: ${liste.length}`, 50, 138);
        doc.fontSize(9).font('Helvetica').text(mentionControle(dateTexte, decompte(liste.length, 'client', 'clients')), 50, 156);
        doc.fontSize(9).text(`Cadre de protection des données: ${vocab.donnees}`, 50, 178);
        doc.fontSize(9).text(`Autorité de tutelle: ${vocab.autorite_libelle}`, 50, 192);
        doc.fontSize(9).text(`Registre: ${vocab.registre}`, 50, 206);

        // Table headers
        let yPosition = 240;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Nom', 50, yPosition);
        doc.text('Email', 180, yPosition);
        doc.text('Téléphone', 320, yPosition);
        doc.text('Statut', 450, yPosition);

        doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
        yPosition += 35;

        // Table rows
        doc.font('Helvetica').fontSize(9);
        liste.slice(0, 20).forEach((client) => {
          if (yPosition > 750) {
            doc.addPage();
            yPosition = 50;
          }

          doc.text(client.first_name + ' ' + client.last_name, 50, yPosition);
          doc.text(client.email || '-', 180, yPosition);
          doc.text(client.phone || '-', 320, yPosition);
          doc.text(client.status || 'actif', 450, yPosition);

          yPosition += 20;
        });

        // Footer : ce que le document EST (un document de travail), pas une
        // attestation de conformité.
        doc.fontSize(8).text(vocab.mention_legale, 50, doc.page.height - 50, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Rapport d'audit du cabinet, dans le référentiel de SON marché.
   *
   * @param {object} stats statistiques du cabinet (déjà lues pour ce cabinet)
   * @param {{marche?:string, userId?:number, pool?:object}|object} [options]
   */
  async generateACPR(stats = {}, options = {}) {
    const donnees = stats || {}
    const vocab = vocabulaireRapport(await marcheDuRapport(options))
    const dateTexte = new Date().toLocaleDateString(vocab.locale)
    const nombreClients = donnees.totalClients || 0
    const nombreContrats = donnees.totalContracts || 0

    return new Promise((resolve, reject) => {
      try {
        const fileName = `${vocab.prefixe_rapport}_${Date.now()}.pdf`;
        const filePath = path.join('/tmp', fileName);
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header — le titre suit le marché (jamais « ACPR » pour un cabinet suisse)
        doc.fontSize(24).font('Helvetica-Bold').text('COURTIA', 50, 50);
        doc.fontSize(10).font('Helvetica').text(vocab.titre_rapport, 50, 85);
        doc.moveTo(50, 100).lineTo(550, 100).stroke();

        // Date
        doc.fontSize(10).text(`Date: ${dateTexte}`, 50, 120);

        // Statistics
        doc.fontSize(12).font('Helvetica-Bold').text('Statistiques', 50, 160);
        doc.fontSize(10).font('Helvetica');

        const y = 190;
        doc.text(`Total clients: ${nombreClients}`, 50, y);
        doc.text(`Clients actifs: ${donnees.activeClients || 0}`, 50, y + 20);
        doc.text(`Total contrats: ${nombreContrats}`, 50, y + 40);
        doc.text(`Chiffre affaires: ${montant(donnees.totalRevenue || 0, vocab.symbole)}`, 50, y + 60);
        doc.text(`Score de risque moyen: ${donnees.avgRiskScore || 0}/100`, 50, y + 80);
        doc.text(`Score de fidélité moyen: ${donnees.avgLoyaltyScore || 0}/100`, 50, y + 100);

        // Référentiels du cabinet (source : services/referentielConformite)
        doc.fontSize(12).font('Helvetica-Bold').text('Référentiels du cabinet', 50, y + 150);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Autorité de tutelle: ${vocab.autorite_libelle}`, 50, y + 180);
        doc.text(`Registre: ${vocab.registre}`, 50, y + 198, { width: 480 });
        doc.text(`Protection des données: ${vocab.donnees}`, 50, y + 236, { width: 480 });
        doc.text('Sécurité de la plateforme: authentification par jeton JWT activée (propriété du produit COURTIA).', 50, y + 254, { width: 480 });

        // Contrôle : un FAIT daté et daté, jamais une certification
        doc.fontSize(12).font('Helvetica-Bold').text('Contrôle', 50, y + 300);
        doc.fontSize(10).font('Helvetica');
        doc.text(mentionControle(dateTexte, `${decompte(nombreClients, 'client', 'clients')}, ${decompte(nombreContrats, 'contrat', 'contrats')}`), 50, y + 330, { width: 480 });

        // Footer
        doc.fontSize(8).text(vocab.mention_legale, 50, doc.page.height - 50, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
};

// Exposés pour les routes appelantes et les tests : la décision de marché et le
// vocabulaire sont vérifiables sans générer de PDF.
pdfService.vocabulaireRapport = vocabulaireRapport;
pdfService.marcheDuRapport = marcheDuRapport;
pdfService.MARCHES_RAPPORTS = MARCHES_RAPPORTS;

module.exports = pdfService;

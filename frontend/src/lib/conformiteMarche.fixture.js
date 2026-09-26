/* ============================================================================
   conformiteMarche.fixture.js — CHARGES UTILES RÉELLES DE L'API CONFORMITÉ.
   ----------------------------------------------------------------------------
   POURQUOI CE FICHIER : deux tests doivent parler du MÊME contrat —
     • `lib/affichageConformite.test.js`  : ce que l'écran affiche par marché ;
     • `pages/Conformite.blocs.test.jsx`  : ce que le rendu des blocs produit.
   Recopier la charge utile dans les deux ferait diverger la preuve : une même
   valeur corrigée d'un côté seulement. Le contrat serveur est figé, lui, par
   `backend/src/routes/conformite.referentiel-marche.test.js` (le test HTTP de
   `GET /api/conformite/dashboard`).

   Ce ne sont pas des valeurs inventées : ce sont les champs servis par
   `backend/services/referentielConformite` et `referentielProduits` pour les
   deux marchés (FINMA/nLPD/LAMal pour la Suisse, ACPR/RGPD/CNIL/IARD pour la
   France). Aucune donnée du cabinet n'y figure : les éléments de protection des
   données sont `null` avec `a_renseigner: true` — c'est le cas réel d'un cabinet
   qui n'a encore rien déclaré, et c'est précisément ce que l'écran doit dire.
   ============================================================================ */

export const DASHBOARD_CH = {
  ok: true,
  total_clients: 4,
  marche: 'CH',
  conformite: {
    marche: 'CH',
    pays: 'Suisse',
    autorite: 'FINMA',
    autorite_libelle: 'FINMA — Autorité fédérale de surveillance des marchés financiers',
    registre: "Registre des intermédiaires d'assurance tenu par la FINMA",
    donnees: 'nLPD — nouvelle loi fédérale sur la protection des données',
    chapeau: 'Registre de conformité · KYC · Mandats · Audit logs · Export du registre de conformité',
    checklist_titre: 'Checklist de conformité du cabinet',
    export: {
      libelle: 'Export du registre de conformité',
      fichier: 'registre-conformite-2026.json',
      route: '/conformite/export-registre',
      sources: { finma: 'https://www.finma.ch' },
    },
    protection_donnees: {
      referentiel: 'nLPD',
      referentiel_libelle: 'nLPD — nouvelle loi fédérale sur la protection des données',
      libelle_ecran: '📋 nLPD & protection des données',
      autorite: 'PFPDT',
      autorite_libelle: 'PFPDT — Préposé fédéral à la protection des données et à la transparence',
      entree_en_vigueur: '1er septembre 2023',
      resume: "Sous la nLPD (en vigueur depuis le 1er septembre 2023), votre cabinet doit pouvoir documenter les éléments ci-dessous.",
      pages_legales: ['Mentions légales', 'CGV', 'CGU', 'Politique de confidentialité', 'DPA', 'Sous-traitants'],
      sources: { lpd: 'https://www.fedlex.admin.ch/eli/cc/2022/491/fr', pfpdt: 'https://www.edoeb.admin.ch/fr' },
      elements: [
        { cle: 'finalites', libelle: 'Finalités du traitement', reference: 'LPD, art. 12, al. 2, et art. 19, al. 2', valeur: null, a_renseigner: true, statut: 'a_renseigner' },
        { cle: 'categories_donnees', libelle: 'Catégories de données personnelles traitées', reference: 'LPD, art. 12, al. 2, et art. 19, al. 3', valeur: null, a_renseigner: true, statut: 'a_renseigner' },
        { cle: 'duree_conservation', libelle: 'Durée de conservation (ou critères qui la déterminent)', reference: 'LPD, art. 12, al. 2', valeur: null, a_renseigner: true, statut: 'a_renseigner' },
        { cle: 'droits_personne', libelle: 'Droits de la personne concernée (accès, rectification, effacement)', reference: 'LPD, art. 25 et art. 32', valeur: null, a_renseigner: true, statut: 'a_renseigner' },
        { cle: 'sous_traitants', libelle: 'Sous-traitants et destinataires des données', reference: 'LPD, art. 12, et art. 19, al. 2, let. c', valeur: null, a_renseigner: true, statut: 'a_renseigner' },
        { cle: 'localisation_donnees', libelle: 'Localisation des données et communication à l’étranger', reference: 'LPD, art. 16 et art. 17, et art. 19, al. 4', valeur: null, a_renseigner: true, statut: 'a_renseigner' },
      ],
    },
    produits: {
      marche: 'CH',
      pays: 'Suisse',
      familles: [
        { code: 'maladie_base', libelle: 'Assurance-maladie de base (LAMal)' },
        { code: 'complementaire_lca', libelle: 'Assurances complémentaires (LCA)' },
        { code: 'accidents_laa', libelle: 'Assurance-accidents (LAA)' },
        { code: 'prevoyance_professionnelle', libelle: 'Prévoyance professionnelle (LPP)' },
        { code: 'prevoyance_liee_3a', libelle: 'Prévoyance individuelle liée (pilier 3a)' },
        { code: 'vie', libelle: 'Assurance-vie' },
        { code: 'rc_menage', libelle: 'Responsabilité civile ménage' },
        { code: 'vehicule', libelle: 'Véhicule à moteur (responsabilité civile, casco)' },
        { code: 'voyage', libelle: 'Assurance voyage' },
        { code: 'protection_juridique', libelle: 'Protection juridique' },
      ],
      mots_cles: ['LAMal', 'LCA', 'LAA', 'LPP', '3e pilier', 'ménage', 'casco'],
      note: "Familles de produits d'assurance pratiquées sur ce marché. COURTIARK ne liste ni assureur, ni garantie, ni tarif.",
    },
  },
}

export const DASHBOARD_FR = {
  ok: true,
  total_clients: 12,
  marche: 'FR',
  conformite: {
    marche: 'FR',
    pays: 'France',
    autorite: 'ACPR',
    autorite_libelle: 'ACPR — Autorité de contrôle prudentiel et de résolution',
    registre: 'ORIAS — registre unique des intermédiaires en assurance',
    donnees: 'RGPD — Règlement (UE) 2016/679',
    chapeau: 'DDA · KYC · Mandats · Audit logs · Export ACPR',
    checklist_titre: 'Checklist DDA (Directive Distribution Assurance)',
    export: {
      libelle: 'Export ACPR',
      fichier: 'rapport-acpr-2026.json',
      route: '/conformite/export-acpr',
      sources: { acpr: 'https://acpr.banque-france.fr', orias: 'https://www.orias.fr' },
    },
    protection_donnees: {
      referentiel: 'RGPD',
      referentiel_libelle: 'RGPD — Règlement (UE) 2016/679',
      libelle_ecran: '📋 RGPD & Mentions légales',
      autorite: 'CNIL',
      autorite_libelle: 'CNIL — Commission nationale de l’informatique et des libertés',
      resume: 'Toutes les pages légales sont accessibles depuis le footer public.',
      pages_legales: ['Mentions légales', 'CGV', 'CGU', 'Politique de confidentialité', 'DPA', 'RGPD', 'Sous-traitants'],
      sources: { cnil: 'https://www.cnil.fr', rgpd: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj' },
      elements: [
        { cle: 'finalites', libelle: 'Finalités du traitement', reference: 'RGPD, art. 13, § 1, let. c', valeur: null, a_renseigner: true, statut: 'a_renseigner' },
        { cle: 'duree_conservation', libelle: 'Durée de conservation (ou critères qui la déterminent)', reference: 'RGPD, art. 13, § 2, let. a', valeur: null, a_renseigner: true, statut: 'a_renseigner' },
      ],
    },
    produits: {
      marche: 'FR',
      pays: 'France',
      familles: [
        { code: 'iard', libelle: 'Assurance IARD (incendie, accidents, risques divers)' },
        { code: 'auto', libelle: 'Assurance automobile' },
        { code: 'habitation', libelle: 'Assurance habitation (multirisque habitation)' },
        { code: 'sante', libelle: 'Complémentaire santé' },
        { code: 'prevoyance', libelle: 'Prévoyance (décès, invalidité, incapacité)' },
        { code: 'emprunteur', libelle: 'Assurance emprunteur' },
      ],
      mots_cles: ['IARD', 'auto', 'habitation', 'santé', 'prévoyance', 'emprunteur'],
      note: "Familles de produits d'assurance pratiquées sur ce marché. COURTIARK ne liste ni assureur, ni garantie, ni tarif.",
    },
  },
}

const assurance = {
  key: 'assurance',
  label: 'Courtage en assurance',
  field_labels: {
    first_name: 'Prenom',
    last_name: 'Nom',
    date_of_birth: 'Date de naissance',
    address: 'Adresse',
    phone: 'Telephone',
    email: 'Email',
    vehicle_registration: 'Immatriculation',
    vehicle_usage: 'Usage du vehicule',
    bonus_malus: 'Bonus-malus',
    claims_history_36m: 'Antecedents sinistres (36 mois)',
    primary_driver: 'Conducteur principal',
    property_type: 'Type de bien',
    surface_m2: 'Surface (m2)',
    rooms: 'Nombre de pieces',
    occupancy_status: "Statut d'occupation",
    security_features: 'Securite du logement',
    company_name: 'Raison sociale',
    siret: 'SIRET',
    activity: 'Activite',
    activity_detail: 'Activite detaillee',
    annual_revenue: "Chiffre d'affaires",
    headcount: 'Effectif',
    claims_history: 'Sinistralite',
    company_age: 'Anciennete',
    trades: 'Lots exerces',
    qualifications: 'Qualifications',
  },
  document_labels: {
    permis: 'Permis de conduire',
    carte_grise: 'Carte grise',
    releve_information: "Relevé d'information",
    rib: 'RIB',
    kbis: 'Extrait KBIS',
    attestation_precedente: 'Attestation precedente',
  },
  products: {
    auto: {
      label: 'Auto',
      required_fields: ['first_name', 'last_name', 'date_of_birth', 'address', 'phone', 'email', 'vehicle_registration', 'vehicle_usage', 'bonus_malus', 'claims_history_36m', 'primary_driver'],
      required_documents: ['permis', 'carte_grise', 'releve_information', 'rib'],
      blocking: ['releve_information', 'bonus_malus', 'vehicle_registration'],
    },
    habitation: {
      label: 'Habitation',
      required_fields: ['first_name', 'last_name', 'address', 'property_type', 'surface_m2', 'rooms', 'occupancy_status', 'security_features'],
      required_documents: ['rib'],
      blocking: ['address', 'surface_m2', 'occupancy_status'],
    },
    rc_pro: {
      label: 'RC Pro',
      required_fields: ['company_name', 'siret', 'activity', 'annual_revenue', 'headcount', 'claims_history'],
      required_documents: ['kbis', 'rib'],
      blocking: ['siret', 'activity', 'annual_revenue'],
    },
    decennale: {
      label: 'Decennale',
      required_fields: ['company_name', 'siret', 'activity_detail', 'company_age', 'annual_revenue', 'headcount', 'trades', 'claims_history', 'qualifications'],
      required_documents: ['kbis', 'attestation_precedente', 'rib'],
      blocking: ['siret', 'trades', 'claims_history'],
    },
  },
}

const credit_immobilier = {
  key: 'credit_immobilier',
  label: 'Courtage en credit immobilier',
  field_labels: {
    first_name: 'Prenom',
    last_name: 'Nom',
    date_of_birth: 'Date de naissance',
    revenus_mensuels: 'Revenus mensuels nets',
    situation_pro: 'Situation professionnelle',
    anciennete_pro: "Anciennete dans l'emploi",
    apport: 'Apport personnel',
    montant_emprunte: 'Montant emprunte',
    duree: 'Duree du pret',
    taux_endettement: "Taux d'endettement",
    co_emprunteur: 'Co-emprunteur',
    charges_mensuelles: 'Charges mensuelles',
    encours_credits: 'Encours de credits',
    bien_vise: 'Bien vise',
    type_projet: 'Type de projet',
  },
  document_labels: {
    piece_identite: "Piece d'identite",
    bulletins_salaire: '3 derniers bulletins de salaire',
    avis_imposition: "Avis d'imposition",
    releves_bancaires: '3 derniers releves bancaires',
    compromis_vente: 'Compromis de vente',
    justificatif_apport: "Justificatif d'apport",
    tableaux_amortissement: "Tableaux d'amortissement des credits en cours",
    kbis: 'Extrait KBIS',
    bilans: '2 derniers bilans',
  },
  products: {
    pret_immobilier: {
      label: 'Pret immobilier',
      required_fields: ['first_name', 'last_name', 'date_of_birth', 'revenus_mensuels', 'situation_pro', 'anciennete_pro', 'apport', 'montant_emprunte', 'duree', 'taux_endettement', 'bien_vise'],
      required_documents: ['piece_identite', 'bulletins_salaire', 'avis_imposition', 'releves_bancaires', 'compromis_vente', 'justificatif_apport'],
      blocking: ['revenus_mensuels', 'compromis_vente', 'avis_imposition'],
    },
    rachat_credit: {
      label: 'Rachat de credits',
      required_fields: ['first_name', 'last_name', 'revenus_mensuels', 'charges_mensuelles', 'encours_credits', 'situation_pro', 'taux_endettement'],
      required_documents: ['piece_identite', 'bulletins_salaire', 'avis_imposition', 'releves_bancaires', 'tableaux_amortissement'],
      blocking: ['encours_credits', 'tableaux_amortissement'],
    },
    pret_pro: {
      label: 'Pret professionnel',
      required_fields: ['first_name', 'last_name', 'revenus_mensuels', 'situation_pro', 'montant_emprunte', 'duree', 'type_projet'],
      required_documents: ['piece_identite', 'kbis', 'bilans', 'releves_bancaires'],
      blocking: ['kbis', 'bilans'],
    },
  },
}

const immobilier = {
  key: 'immobilier',
  label: 'Agent immobilier',
  field_labels: {
    owner_name: 'Nom du proprietaire',
    buyer_name: "Nom de l'acquereur",
    property_address: 'Adresse du bien',
    property_type: 'Type de bien',
    surface_m2: 'Surface (m2)',
    rooms: 'Nombre de pieces',
    asking_price: 'Prix de presentation',
    mandate_type: 'Type de mandat',
    monthly_rent: 'Loyer mensuel',
    charges: 'Charges',
    is_copro: 'En copropriete',
    sale_price: 'Prix de vente',
    financing_status: 'Financement acquereur',
  },
  document_labels: {
    titre_propriete: 'Titre de propriete',
    mandat_signe: 'Mandat signé',
    diagnostics: 'Dossier de diagnostics',
    taxe_fonciere: 'Derniere taxe fonciere',
    reglement_copro: 'Reglement de copropriete',
    compromis: 'Compromis de vente',
    offre_pret: "Offre de pret de l'acquereur",
    assurance_pno: 'Assurance proprietaire non occupant',
    piece_identite: "Piece d'identite",
  },
  products: {
    mandat_vente: {
      label: 'Mandat de vente',
      required_fields: ['owner_name', 'property_address', 'property_type', 'surface_m2', 'rooms', 'asking_price', 'mandate_type', 'is_copro'],
      required_documents: ['titre_propriete', 'mandat_signe', 'diagnostics', 'taxe_fonciere'],
      blocking: ['titre_propriete', 'mandat_signe', 'diagnostics'],
    },
    mandat_location: {
      label: 'Mandat de location',
      required_fields: ['owner_name', 'property_address', 'property_type', 'surface_m2', 'monthly_rent', 'charges'],
      required_documents: ['titre_propriete', 'mandat_signe', 'diagnostics', 'assurance_pno'],
      blocking: ['mandat_signe', 'diagnostics'],
    },
    transaction: {
      label: 'Transaction',
      required_fields: ['owner_name', 'buyer_name', 'property_address', 'sale_price', 'financing_status'],
      required_documents: ['compromis', 'diagnostics', 'offre_pret', 'piece_identite'],
      blocking: ['compromis', 'offre_pret'],
    },
  },
}

const VERTICALS = { assurance, credit_immobilier, immobilier }

function getVertical(key) {
  return VERTICALS[key] || null
}

function listVerticals() {
  return Object.values(VERTICALS).map((vertical) => ({
    key: vertical.key,
    label: vertical.label,
    products: Object.keys(vertical.products),
  }))
}

function getProductRequirements(verticalKey, productType) {
  const vertical = getVertical(verticalKey || 'assurance')
  if (!vertical) return null

  const product = vertical.products[productType]
  if (!product) return null

  return {
    ...product,
    field_labels: vertical.field_labels,
    document_labels: vertical.document_labels,
  }
}

module.exports = {
  VERTICALS,
  getVertical,
  listVerticals,
  getProductRequirements,
}

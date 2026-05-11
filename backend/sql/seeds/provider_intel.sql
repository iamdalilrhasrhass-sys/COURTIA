-- ============================================================
-- LOT 11 : Seed Enrichissement Intelligence Providers
-- Style de communication, pièces obligatoires, catalogue produits
-- ============================================================

-- ==================== APRIL ====================
UPDATE insurance_providers SET
  communication_style = 'Formel et technique. Préfère emails synthétiques avec pièces en annexe. Apprécie la précision des codes et références. Vouvoiement systématique.',
  mandatory_documents = '["carte_grise", "releve_information", "piece_identite", "justif_domicile", "permis_conduire"]'::jsonb,
  product_catalog = '{
    "auto": ["April Auto Confort", "April Auto Essentiel", "April Auto Tous Risques"],
    "habitation": ["April Habitat Confort", "April Habitat Essentiel"],
    "sante": ["April Santé Plus", "April Santé Confort", "April Santé Essentiel"],
    "prevoyance": ["April Prévoyance TNS", "April Indemnités Journalières"],
    "emprunteur": ["April Emprunteur Standard", "April Emprunteur Senior"]
  }'::jsonb,
  quote_email_template = 'Objet: [CODE_APPORTEUR] - Demande de devis {TYPE} - {NOM_CLIENT}\n\nMadame, Monsieur,\n\nVeuillez trouver ci-joint une demande de tarification pour notre client.\n\nCordialement,',
  specific_fields = '{
    "code_apporteur": {"type": "string", "required": true, "label": "Code Apporteur April"},
    "code_produit": {"type": "string", "required": true, "label": "Code Produit"},
    "referent_commercial": {"type": "string", "required": false, "label": "Référent Commercial"}
  }'::jsonb,
  preferred_format = 'email',
  response_time_hours = 48,
  contact_email = 'souscription@april.fr',
  submission_instructions = 'Envoi par email avec pièces en PDF. Mentionner le code apporteur en objet. Délai réponse 24-48h.'
WHERE code = 'april';

-- ==================== ALPTIS ====================
UPDATE insurance_providers SET
  communication_style = 'Professionnel et bienveillant. Style institutionnel mais accessible. Apprécie les dossiers complets. Mutualiste historique.',
  mandatory_documents = '["piece_identite", "justif_domicile", "attestation_secu", "bulletins_salaire"]'::jsonb,
  product_catalog = '{
    "sante": ["Alptis Santé Modulable", "Alptis Santé TNS", "Alptis Santé Senior"],
    "prevoyance": ["Alptis Prévoyance Individuelle", "Alptis Prévoyance TNS Pro"],
    "emprunteur": ["Alptis Emprunteur Classic", "Alptis Emprunteur Plus"],
    "dependance": ["Alptis Autonomie"]
  }'::jsonb,
  quote_email_template = 'Objet: Demande étude {TYPE} - {NOM_CLIENT} - Réf. courtier {REF}\n\nBonjour,\n\nNous sollicitons une étude tarifaire pour le profil ci-joint.\n\nBien cordialement,',
  specific_fields = '{
    "numero_courtier": {"type": "string", "required": true, "label": "N° Courtier Alptis"},
    "regime_social": {"type": "select", "options": ["TNS", "Salarié", "Fonctionnaire"], "required": true},
    "cpam_rattachement": {"type": "string", "required": false, "label": "CPAM de rattachement"}
  }'::jsonb,
  preferred_format = 'email',
  response_time_hours = 72,
  contact_email = 'devis.courtiers@alptis.org',
  submission_instructions = 'Dossier complet requis. Indiquer régime obligatoire du prospect. Réponse sous 48-72h.'
WHERE code = 'alptis';

-- ==================== SOLLY AZAR ====================
UPDATE insurance_providers SET
  communication_style = 'Dynamique et réactif. Ton commercial décontracté. Start-up spirit. Tutoiement accepté avec interlocuteurs réguliers. Direct et efficace.',
  mandatory_documents = '["carte_grise", "releve_information", "piece_identite", "photo_vehicule"]'::jsonb,
  product_catalog = '{
    "auto": ["Solly Auto Eco", "Solly Auto Confort", "Solly Auto Premium", "Solly Jeune Conducteur"],
    "moto": ["Solly Moto Classic", "Solly Scooter City"],
    "habitation": ["Solly Habitat", "Solly PNO Invest"],
    "mrp": ["Solly MRP Commerce", "Solly MRP Bureau"],
    "sante": ["Solly Santé Access", "Solly Santé Plus"]
  }'::jsonb,
  quote_email_template = 'Objet: 🚗 Devis {TYPE} - {NOM_CLIENT}\n\nHey !\n\nNouvelle demande de devis ci-joint. Merci pour un retour rapide !\n\nÀ+',
  specific_fields = '{
    "code_courtier": {"type": "string", "required": true, "label": "Code Courtier Solly"},
    "usage_vehicule": {"type": "select", "options": ["Privé", "Privé+Trajet", "Pro"], "required": true},
    "urgence": {"type": "boolean", "required": false, "label": "Demande urgente"}
  }'::jsonb,
  preferred_format = 'email',
  response_time_hours = 24,
  contact_email = 'devis@sollyazar.com',
  submission_instructions = 'Privilégier emails concis. Photos véhicule appréciées pour auto/moto. Réponses rapides (24h max).'
WHERE code = 'sollyazar';

-- ==================== NEOLIANE ====================
UPDATE insurance_providers SET
  communication_style = 'Chaleureux et familier. Proximité relationnelle. Style humain et empathique. Spécialiste santé individuelle. Vouvoiement respectueux.',
  mandatory_documents = '["piece_identite", "justif_domicile", "attestation_secu", "questionnaire_sante"]'::jsonb,
  product_catalog = '{
    "sante": ["Néoliane Initial", "Néoliane Essentiel", "Néoliane Confort", "Néoliane Premium", "Néoliane Senior+"],
    "prevoyance": ["Néoliane Prévoyance Indiv"],
    "obseques": ["Néoliane Sérénité Obsèques"],
    "dependance": ["Néoliane Autonomie Plus"]
  }'::jsonb,
  quote_email_template = 'Objet: Étude santé pour {NOM_CLIENT} - Courtier {NOM_COURTIER}\n\nBonjour,\n\nJe vous transmets le dossier de mon client qui recherche une complémentaire santé adaptée à ses besoins.\n\nMerci pour votre retour personnalisé.\n\nCordialement,',
  specific_fields = '{
    "num_orias": {"type": "string", "required": true, "label": "N° ORIAS Courtier"},
    "besoins_specifiques": {"type": "text", "required": false, "label": "Besoins spécifiques (optique, dentaire, hospi...)"},
    "medecin_traitant": {"type": "boolean", "required": false, "label": "Médecin traitant déclaré"}
  }'::jsonb,
  preferred_format = 'email',
  response_time_hours = 48,
  contact_email = 'partenaires@neoliane-sante.fr',
  submission_instructions = 'Préciser besoins spécifiques santé. Questionnaire médical simplifié possible. Contact téléphonique bienvenu.'
WHERE code = 'neoliane';

-- ==================== ECA ASSURANCES ====================
UPDATE insurance_providers SET
  communication_style = 'Pragmatique et commercial. Orienté solution. Style direct sans fioritures. Efficacité avant tout.',
  mandatory_documents = '["piece_identite", "justif_domicile", "releve_information", "kbis"]'::jsonb,
  product_catalog = '{
    "sante": ["ECA Santé Eco", "ECA Santé Equilibre", "ECA Santé Premium"],
    "prevoyance": ["ECA Prévoyance TNS", "ECA Prévoyance Famille"],
    "auto": ["ECA Auto Tiers", "ECA Auto Tous Risques"],
    "habitation": ["ECA Habitat", "ECA PNO"],
    "mrp": ["ECA Pro Commerce", "ECA Pro Artisan"]
  }'::jsonb,
  quote_email_template = 'Objet: Demande tarif {TYPE} - {NOM_CLIENT}\n\nBonjour,\n\nCi-joint demande de tarification.\nMerci de traiter en priorité.\n\nCdlt,',
  specific_fields = '{
    "code_partenaire": {"type": "string", "required": true, "label": "Code Partenaire ECA"},
    "type_client": {"type": "select", "options": ["Particulier", "TNS", "Entreprise"], "required": true},
    "budget_max": {"type": "number", "required": false, "label": "Budget mensuel max €"}
  }'::jsonb,
  preferred_format = 'email',
  response_time_hours = 36,
  contact_email = 'courtage@eca-assurances.com',
  submission_instructions = 'Format synthétique apprécié. Mentionner budget si connu. Réponse 24-36h en moyenne.'
WHERE code = 'eca';

-- ==================== WAZARI ====================
UPDATE insurance_providers SET
  communication_style = 'Digital native et tech. Communication moderne via plateforme. Emails brefs, processus automatisé. Spécialiste emprunteur.',
  mandatory_documents = '["piece_identite", "offre_pret", "tableau_amortissement", "questionnaire_sante_emprunteur"]'::jsonb,
  product_catalog = '{
    "emprunteur": ["Wazari Emprunteur Standard", "Wazari Emprunteur Premium", "Wazari Emprunteur Senior", "Wazari Emprunteur Investisseur"]
  }'::jsonb,
  quote_email_template = 'Objet: [URGENT] Devis emprunteur - {NOM_CLIENT} - Prêt {MONTANT}€\n\nBonjour,\n\nDemande de substitution/délégation emprunteur.\nDétails en PJ.\n\nMerci !',
  specific_fields = '{
    "montant_pret": {"type": "number", "required": true, "label": "Montant du prêt €"},
    "duree_pret_mois": {"type": "number", "required": true, "label": "Durée en mois"},
    "type_pret": {"type": "select", "options": ["Immobilier RP", "Immobilier Invest", "Conso"], "required": true},
    "banque_preteur": {"type": "string", "required": true, "label": "Banque prêteuse"}
  }'::jsonb,
  preferred_format = 'plateforme',
  response_time_hours = 24,
  contact_email = 'courtiers@wazari.fr',
  submission_instructions = 'Privilégier plateforme extranet. Tableau amortissement obligatoire. Réponse rapide < 24h.'
WHERE code = 'wazari';

-- ==================== ASSURONE ====================
UPDATE insurance_providers SET
  communication_style = 'Institutionnel et structuré. Communication formelle. Groupe historique. Process rigoureux. Documents normés.',
  mandatory_documents = '["piece_identite", "justif_domicile", "kbis", "releve_information", "bilan_comptable"]'::jsonb,
  product_catalog = '{
    "sante": ["AssurOne Santé Individuelle", "AssurOne Santé Collective"],
    "prevoyance": ["AssurOne Prévoyance TNS", "AssurOne Prévoyance Collective"],
    "auto": ["AssurOne Auto Pro", "AssurOne Flotte"],
    "mrp": ["AssurOne MRP Standard", "AssurOne MRP Sur-Mesure"],
    "rc_pro": ["AssurOne RC Pro", "AssurOne RC Mandataire"]
  }'::jsonb,
  quote_email_template = 'Objet: Demande étude n°{REF} - {TYPE} - {NOM_CLIENT}\n\nMadame, Monsieur,\n\nNous vous prions de bien vouloir trouver ci-joint notre demande d''étude tarifaire.\n\nDans l''attente de votre retour, nous vous prions d''agréer nos salutations distinguées.',
  specific_fields = '{
    "numero_agrement": {"type": "string", "required": true, "label": "N° Agrément AssurOne"},
    "chiffre_affaires": {"type": "number", "required": false, "label": "CA annuel € (si pro)"},
    "effectif": {"type": "number", "required": false, "label": "Effectif (si collectif)"}
  }'::jsonb,
  preferred_format = 'email',
  response_time_hours = 72,
  contact_email = 'souscription.courtage@assurone.com',
  submission_instructions = 'Dossier complet exigé. Bilan N-1 pour entreprises. Traitement 48-72h selon complexité.'
WHERE code = 'assurone';

-- ==================== ASSURIMO ====================
UPDATE insurance_providers SET
  communication_style = 'Expert immobilier. Ton technique et spécialisé. Connaît les problématiques bailleurs/copros. Vocabulaire métier.',
  mandatory_documents = '["piece_identite", "titre_propriete", "bail", "pv_ag_copropriete", "reglement_copropriete"]'::jsonb,
  product_catalog = '{
    "pno": ["Assurimo PNO Standard", "Assurimo PNO Premium", "Assurimo Multi-PNO"],
    "habitation": ["Assurimo Locataire", "Assurimo Propriétaire"],
    "copropriete": ["Assurimo Copro Small", "Assurimo Copro Medium", "Assurimo Copro Large"],
    "immeuble": ["Assurimo Immeuble Locatif", "Assurimo Immeuble Mixte"]
  }'::jsonb,
  quote_email_template = 'Objet: Étude {TYPE} - {ADRESSE_BIEN} - {NOM_CLIENT}\n\nBonjour,\n\nDemande de tarification pour le bien situé {ADRESSE_BIEN}.\nCaractéristiques et documents en annexe.\n\nCordialement,',
  specific_fields = '{
    "surface_m2": {"type": "number", "required": true, "label": "Surface en m²"},
    "nb_lots": {"type": "number", "required": false, "label": "Nombre de lots (copro)"},
    "annee_construction": {"type": "number", "required": true, "label": "Année de construction"},
    "valeur_bien": {"type": "number", "required": true, "label": "Valeur du bien €"}
  }'::jsonb,
  preferred_format = 'email',
  response_time_hours = 48,
  contact_email = 'devis@assurimo.fr',
  submission_instructions = 'Adresse exacte obligatoire. Photos appréciées pour immeubles anciens. Spécifier usage (location meublée/vide).'
WHERE code = 'assurimo';

-- ==================== SWISSLIFE ====================
UPDATE insurance_providers SET
  communication_style = 'Haut de gamme et premium. Communication soignée et personnalisée. Clientèle patrimoniale. Excellence du service.',
  mandatory_documents = '["piece_identite", "justif_domicile", "avis_imposition", "releve_patrimoine", "questionnaire_sante"]'::jsonb,
  product_catalog = '{
    "sante": ["SwissLife Santé Référence", "SwissLife Santé Excellence"],
    "prevoyance": ["SwissLife Prévoyance Dirigeant", "SwissLife Prévoyance Madelin"],
    "epargne": ["SwissLife Strategio", "SwissLife Multi-Supports"],
    "retraite": ["SwissLife PER Individuel", "SwissLife Article 83"],
    "vie": ["SwissLife Liberté", "SwissLife Patrimoine"]
  }'::jsonb,
  quote_email_template = 'Objet: Étude personnalisée {TYPE} - {NOM_CLIENT}\n\nMadame, Monsieur,\n\nJ''ai l''honneur de vous soumettre le dossier de mon client, {NOM_CLIENT}, pour une étude {TYPE}.\n\nVous remerciant par avance de l''attention portée à cette demande.\n\nRespectueux hommages,',
  specific_fields = '{
    "code_inspecteur": {"type": "string", "required": true, "label": "Code Inspecteur SwissLife"},
    "patrimoine_global": {"type": "number", "required": false, "label": "Patrimoine global estimé €"},
    "objectif_placement": {"type": "select", "options": ["Capitalisation", "Revenus", "Transmission"], "required": false},
    "horizon_placement": {"type": "select", "options": ["Court terme", "Moyen terme", "Long terme"], "required": false}
  }'::jsonb,
  preferred_format = 'email',
  response_time_hours = 72,
  contact_email = 'courtage.vie@swisslife.fr',
  submission_instructions = 'Présentation soignée attendue. Contexte patrimonial apprécié. RDV téléphonique possible pour dossiers importants.'
WHERE code = 'swisslife';

-- ==================== GENERALI ====================
UPDATE insurance_providers SET
  communication_style = 'International et professionnel. Process structurés. Multi-branches. Communication corporate mais efficace.',
  mandatory_documents = '["piece_identite", "justif_domicile", "kbis", "releve_information", "attestation_secu"]'::jsonb,
  product_catalog = '{
    "sante": ["Generali Santé Individuelle", "Generali Santé Entreprise"],
    "prevoyance": ["Generali Prévoyance Pro", "Generali Prévoyance Collective"],
    "auto": ["Generali Auto", "Generali Flotte Pro"],
    "habitation": ["Generali Habitation", "Generali PNO", "Generali Immeuble"],
    "vie": ["Generali Épargne", "Generali PER"],
    "rc_pro": ["Generali RC Pro", "Generali Décennale"]
  }'::jsonb,
  quote_email_template = 'Objet: [COURTAGE] Demande tarification {TYPE} - Réf. {REF} - {NOM_CLIENT}\n\nBonjour,\n\nVeuillez trouver en pièce jointe notre demande de tarification.\n\nNous restons à disposition pour tout complément.\n\nCordialement,',
  specific_fields = '{
    "code_courtier_generali": {"type": "string", "required": true, "label": "Code Courtier Generali"},
    "branche": {"type": "select", "options": ["IARD", "Vie", "Santé/Prévoyance"], "required": true},
    "convention_applicable": {"type": "string", "required": false, "label": "Convention collective (si entreprise)"}
  }'::jsonb,
  preferred_format = 'email',
  response_time_hours = 48,
  contact_email = 'courtage@generali.fr',
  submission_instructions = 'Préciser la branche concernée. Extranet disponible pour suivi. Délai variable selon complexité (24-72h).'
WHERE code = 'generali';

-- ============================================================
-- FIN SEED INTELLIGENCE PROVIDERS LOT 11
-- ============================================================

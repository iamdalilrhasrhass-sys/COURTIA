# Tuto — vendre avec Courtia / ARK

État réel au 8 juin 2026 :

- Front production : https://courtiark.fr
- API production : https://courtiark.fr/api/health
- Agents ARK : déployés sur `/ark-agents`
- Prospection ARK : déployée sur `/prospection`
- Backend VPS : `courtia-api` online sous PM2
- Les brouillons fonctionnent même sans clé Claude grâce au fallback local.
- L’envoi automatique email attend `BREVO_API_KEY` et `BREVO_SENDER_EMAIL`.
- La vraie génération IA attend `ANTHROPIC_API_KEY`.

## 1. Connexion

1. Va sur https://courtiark.fr/login
2. Connecte-toi avec ton compte courtier / admin.
3. Dans le menu, ouvre :
   - `Prospection ARK` pour importer et préparer des campagnes.
   - `Agents ARK` pour générer du contenu business.

## 2. Lancer une campagne de prospection

Va dans `Prospection ARK`.

### Étape A — importer le CSV

Colle un CSV comme ceci :

```csv
nom,email,societe,secteur
Jean Dupont,jean@agence.fr,Agence Dupont,immobilier
Sophie Martin,sophie@cabinet.fr,Cabinet Martin,assurance
```

Colonnes acceptées :

- `nom`, `email`, `societe`, `secteur`
- variantes acceptées : `courriel`, `société`, `telephone`, `téléphone`, `company`, `sector`
- séparateur accepté : virgule ou point-virgule

Clique `Importer`.

### Étape B — préparer la campagne

Renseigne :

- Secteur : `agents immobiliers indépendants`
- Proposition de valeur : `Courtia transforme un lead immobilier en dossiers crédit et assurance, sans ressaisie.`
- Objet email : `Question rapide sur votre suivi clients`

Clique `ARK rédige les brouillons`.

### Étape C — utiliser les brouillons

Les brouillons apparaissent dans l’écran.

- Si Brevo n’est pas encore branché : copie-colle les brouillons manuellement dans Gmail / Brevo / LinkedIn.
- Si Brevo est branché : clique `Valider les brouillons`, puis `Envoyer les validés`.

Rien ne part sans validation humaine.

## 3. Utiliser les 7 agents ARK

Va dans `Agents ARK`.

### ARK Marketing

À utiliser pour LinkedIn, Instagram, posts courts.

Exemple :

```txt
Prépare 3 posts LinkedIn pour vendre Courtia à des agents immobiliers indépendants.
Angle : ils perdent des clients après la transaction alors qu’ils pourraient générer crédit + assurance.
Ton : direct, premium, pas bullshit.
```

### ARK Visibilité

À utiliser pour SEO / articles.

Exemple :

```txt
Écris le plan d’un article SEO : "CRM immobilier assurance crédit : comment éviter la ressaisie client".
Cible : agents immobiliers indépendants.
```

### ARK Prospection

À utiliser pour séquences email / appel.

Exemple :

```txt
Crée une séquence de 2 emails et un script d’appel pour prospecter des agents immobiliers.
Promesse : un seul client immobilier peut devenir dossier crédit + assurance.
```

### ARK Finances

À utiliser pour piloter CA / commissions / priorités.

Exemple :

```txt
Analyse ces chiffres et donne-moi les 3 priorités commerciales de la semaine :
CA signé : 3200 €
Devis envoyés : 18
Relances en retard : 42
```

### ARK Juridique

À utiliser pour brouillons de CGV, mentions, clauses.

Exemple :

```txt
Prépare une clause simple expliquant que Courtia est un assistant logiciel et ne remplace pas la décision du courtier.
Liste aussi les points à faire valider par un juriste.
```

### ARK Recrutement

À utiliser pour annonces et entretiens.

Exemple :

```txt
Prépare une annonce pour recruter un alternant commercial Courtia.
Profil : autonome, à l’aise téléphone, goût pour assurance/immobilier.
```

### ARK Accueil

À utiliser pour qualifier un appel / message entrant.

Exemple :

```txt
Résume cet appel et dis s’il faut transférer à un humain :
"Bonjour, je cherche une assurance habitation rapidement, j’ai signé le compromis hier."
```

## 4. Script de démo courtier

Ordre de démonstration conseillé :

1. `Morning Brief` : “Chaque matin, Courtia te dit où est l’argent qui dort.”
2. `Prospection ARK` : “J’importe 20 agents immobiliers, ARK prépare les messages.”
3. `Agents ARK` : “Même moteur, 7 agents business en français.”
4. `Devoir de conseil` : “L’IA prépare, le courtier valide, la preuve est archivée.”
5. `Flywheel` : “Un lead immobilier devient crédit + assurance.”

Phrase à dire :

```txt
Limova te donne des agents généralistes. Courtia te donne des agents + un moteur métier assurance / crédit / immobilier, avec validation humaine et trace de conformité.
```

## 5. Première campagne aujourd’hui

Ne commence pas avec 2 000 leads.

Fais :

1. 30 prospects maximum.
2. Secteur unique : agents immobiliers indépendants.
3. Message court.
4. Envoi manuel si Brevo n’est pas configuré.
5. Mesure simplement :
   - réponses positives ;
   - demandes de démo ;
   - objections répétées ;
   - prix accepté.

Objectif du premier jour : obtenir 3 conversations, pas automatiser toute la France.

## 6. À brancher pour passer en automatique

Sur le VPS, ajoute dans `/root/courtia/backend/.env` :

```bash
ANTHROPIC_API_KEY=...
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...
PUBLIC_APP_URL=https://courtiark.fr
FRONTEND_URL=https://courtiark.fr
```

Puis :

```bash
ssh -i ~/.ssh/courtia_vps root@72.62.187.63
cd /root/courtia/backend
pm2 restart courtia-api --update-env
pm2 save
```

Après ça :

- `Agents ARK` utilise Claude au lieu du fallback local.
- `Prospection ARK` envoie vraiment les emails validés via Brevo.

## 7. Ce qu’il faut vendre maintenant

Offre simple :

```txt
Courtia transforme votre suivi client en cockpit IA :
relances, prospection, devoir de conseil, et flywheel immobilier → crédit → assurance.
Vous gardez la validation humaine ; ARK prépare le travail.
```

Prix test conseillé :

- 149 €/mois pour solo / petit cabinet.
- 299 €/mois si prospection + accompagnement setup.
- Setup possible : 490 € pour import portefeuille + première campagne.

La question à poser en démo :

```txt
Si Courtia vous récupère 2 dossiers par mois que vous auriez oubliés, est-ce que 149 €/mois devient évident ?
```

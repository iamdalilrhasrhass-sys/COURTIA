# Vérifications ARK Documents

Ces scripts sont les **preuves exécutables** de la lecture documentaire par ARK.
Ils ne tournent pas avec `jest` : ils ont besoin d'une base PostgreSQL réelle et
d'un fournisseur IA réel.

## 1. Test de bout en bout (base locale ou de recette)

```bash
# Serveur applicatif pointant sur la base de recette, avec la clé DeepSeek
DATABASE_URL=... JWT_SECRET=... DEEPSEEK_API_KEY=... NODE_ENV=test PORT=3999 node server.js

# Puis, dans un autre terminal :
node backend/qa/ark-documents/test_e2e_ark_documents.js http://127.0.0.1:3999
```

Couvre : PDF simple, PDF de 3 pages, champs absents, image (OCR), plusieurs documents
en un envoi, fichier invalide, fichier trop volumineux, isolation entre deux cabinets,
valeur existante non écrasée, application réelle en base, relecture, création du
contrat, absence de création sans demande explicite.

Le rapport est écrit dans `preuves/test_e2e_ark_documents.json` (côté poste de travail,
jamais dans le dépôt).

## 2. Test de production

```bash
python3 backend/qa/ark-documents/test_production_deepseek.py
```

Crée un compte de recette **isolé** (`ark.qa.<aléatoire>@courtia-qa.invalid`), un
dossier de recette, lit un PDF **synthétique**, vérifie qu'aucune donnée n'est écrite
avant validation, applique, relit, interroge ARK, puis rend un rapport.
**Aucun dossier client réel n'est touché** ; les identifiants créés sont rendus en fin
de sortie pour être supprimés.

## 3. Documents de test

`fixtures/generer_fixtures.py` régénère tous les documents synthétiques (aucune donnée
réelle). `fichier_vide.pdf` est téléchargeable via `generer_fixtures.py --volumineux`
(21 Mo, non versionné).

# COURTIA ARK — Extension Chrome V2 (MVP)

## Installation (mode développeur)

1. Ouvrir Chrome → `chrome://extensions`
2. Activer le **Mode développeur** (coin haut-droit)
3. Cliquer **Charger l'extension non empaquetée**
4. Sélectionner le dossier `courtia-extension/`

## Utilisation

1. Cliquer sur l'icône COURTIA dans la barre d'extensions
2. Se connecter avec son compte COURTIA
3. Naviguer sur n'importe quel site avec un formulaire
4. Cliquer sur le bouton flottant **ARK** (en bas à droite)
5. ARK analyse la page et propose des suggestions
6. Cliquer sur une suggestion pour remplir le champ
7. **Valider manuellement** avant d'envoyer le formulaire

## Sécurité

- ✅ Aucun mot de passe capturé (les champs `password` sont ignorés)
- ✅ Aucun envoi automatique — validation humaine obligatoire
- ✅ URL backend configurable dans les options
- ✅ Connexion via token JWT (stocké localement)
- ✅ Permissions minimales (activeTab, storage, scripting)
- ✅ Communication chiffrée (HTTPS)

## Permissions

| Permission | Raison |
|------------|--------|
| `activeTab` | Accéder à l'onglet actif pour analyser les formulaires |
| `storage` | Stocker le token JWT et les préférences |
| `scripting` | Injecter le content script pour détecter les formulaires |
| `host_permissions` | Communiquer avec l'API COURTIA |

## Architecture

```
popup/          → Interface de connexion et contrôle
options/        → Page de paramètres
background.js   → Service Worker (communication API)
content.js      → Injecté dans les pages (détection formulaires + overlay ARK)
manifest.json   → Configuration Manifest V3
```

## Développement

```bash
# Modifier les fichiers, puis dans Chrome:
chrome://extensions → Recharger
```

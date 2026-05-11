# Prompts IA Vidéo — COURTIA

**Générateurs cibles :** Sora (OpenAI), Runway Gen-3, Kling, Pika  
**Usage :** Créer des transitions, animations d'ambiance, et mouvements caméra sur les captures COURTIA  
**Date :** 11 mai 2026

---

## Règle absolue

**L'IA vidéo ne doit PAS inventer une interface différente.**  
**L'IA vidéo doit animer les captures existantes, pas créer de nouvelles pages.**  
**Ne pas modifier les textes des captures. Ne pas halluciner de fausse UI.**

---

## Prompt générique (contexte global)

```
Créer une vidéo promotionnelle premium pour un logiciel SaaS B2B français nommé COURTIA,
destiné aux courtiers en assurance.

Style visuel :
- Fond sombre premium (#02040c)
- Glassmorphism élégant
- Reflets bleu cyan et violet subtils
- Ambiance Aurora : halos lumineux doux, particules flottantes
- Cockpit digital futuriste mais sobre
- Pas de style crypto, pas de néons agressifs, pas de glitch

Utiliser les captures fournies comme source visuelle principale.
Ne pas modifier les textes de l'interface.
Ne pas inventer de nouvelles pages.
Ajouter uniquement :
- Mouvements caméra doux (zoom lent, parallax léger)
- Transitions lumineuses subtiles (fondu Aurora)
- Ambiance professionnelle et premium

La vidéo doit donner une impression de logiciel fiable, moderne et intelligent,
pas de publicité gadget ou crypto.
```

---

## Prompt par séquence

### Séquence 1 — Introduction / Problème
```
Plan d'ouverture sur fond sombre Aurora avec halos violets et cyan.
Texte "Trop de clients. Trop d'échéances. Trop de relances." apparaît en fondu,
en typographie Inter Light, blanc sur fond sombre.
Ambiance calme, légèrement dramatique. Particules lumineuses subtiles en arrière-plan.
Transition vers le plan suivant : fondu violet.
Durée : 5 secondes.
```

### Séquence 2 — Dashboard cockpit
```
Animation de la capture dashboard COURTIA.
Zoom lent avant (scale 100% → 108%) centré sur les KPIs.
Léger parallax : fond recule, cartes KPIs avancent.
Lueur violette subtile sur les indicateurs de performance.
Texte overlay : "Visualisez la santé de votre portefeuille" en bas à gauche.
Durée : 6 secondes.
```

### Séquence 3 — Morning Brief ARK
```
Animation de la capture Morning Brief ARK.
Zoom lent sur la carte de recommandation ARK (lueur violette #8B5CF6).
Effet de surbrillance douce qui pulse sur la recommandation "Relancer Martin Conseil".
Texte overlay : "ARK priorise vos actions" centré en haut.
Ambiance : montée en intensité, la musique accélère légèrement.
Durée : 8 secondes.
```

### Séquence 4 — Fiche client
```
Split screen : à gauche vue Clients bulles, à droite fiche client détaillée.
Transition slide horizontal fluide.
Zoom sur le score de risque et le panneau ARK dans la fiche client.
Texte overlay : "Clients à risque et opportunités" en bas.
Durée : 6 secondes.
```

### Séquence 5 — Contrats / Devis / Documents
```
Enchaînement rapide de 3 captures : Contrats → Devis → Documents.
Chaque plan : 1.5 secondes, zoom léger, transition cut.
Texte overlay change à chaque plan : "Contrats" → "Devis" → "Documents".
Rythme plus dynamique.
Durée : 6 secondes.
```

### Séquence 6 — Relances + Opportunités
```
Split screen vertical : Relances en haut, Opportunités en bas.
Transition slide vertical.
Léger glow sur les montants et priorités.
Texte overlay : "Relancez mieux. Vendez plus intelligemment."
Durée : 6 secondes.
```

### Séquence 7 — Final Logo
```
Zoom arrière lent depuis le dashboard vers le logo COURTIA.
Fond Aurora sombre avec halos.
Logo centré, slogan "Le cockpit intelligent des courtiers en assurance."
CTA : "courtiark.fr — Demander une démo"
Fondu noir final.
Durée : 3 secondes.
```

---

## Recommandations techniques par outil

### Runway Gen-3
- Mode : Image to Video
- Motion Brush : appliquer sur les zones KPIs pour zoom ciblé
- Camera Motion : "Slow Zoom In" ou "Parallax"
- Prompt additionnel : "cinematic, professional SaaS, dark theme, glassmorphism, subtle glow"

### Sora (OpenAI)
- Fournir les captures comme images de référence
- Prompt : "Animate this SaaS dashboard screenshot with a slow cinematic zoom. Dark premium theme with subtle violet and cyan halos. Professional, elegant, no flashy effects. French insurance broker software."
- Style : "Cinematic corporate, dark elegance, subtle motion"

### Kling / Pika
- Image-to-video avec prompt "slow zoom, professional SaaS, dark theme, subtle parallax"
- Durée par clip : 3-6 secondes
- Assembler ensuite dans CapCut/Premiere

---

## À éviter absolument

- ❌ Générer une fausse UI qui n'existe pas
- ❌ Ajouter des textes en anglais
- ❌ Style "crypto" ou "NFT" avec néons agressifs
- ❌ Transitions trop rapides ou agressives
- ❌ Musique trop dramatique ou cheap
- ❌ Voix off robotique — utiliser ElevenLabs ou voix humaine
- ❌ Montrer des pages vides, des erreurs, ou le login

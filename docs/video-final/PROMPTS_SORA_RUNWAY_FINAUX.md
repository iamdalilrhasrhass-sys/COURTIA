# Prompts Sora / Runway — COURTIA

**Date :** 11 mai 2026

---

## Règle fondamentale

L'IA vidéo ne doit PAS inventer une nouvelle interface. Elle doit animer les captures existantes.

---

## Prompt principal

```
Créer une vidéo promotionnelle premium pour COURTIA, logiciel SaaS B2B français
destiné aux courtiers en assurance.

Style visuel :
- Fond sombre premium (#02040c)
- Glassmorphism élégant
- Reflets bleu cyan et violet subtils
- Ambiance Aurora : halos lumineux doux
- Cockpit digital futuriste mais sobre
- Pas de style crypto, pas de néons agressifs

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

## Prompts par séquence

### Intro problème (0-5s)
```
Plan d'ouverture : fond sombre Aurora avec halos violets et cyan.
Texte "Trop de clients. Trop d'échéances. Trop de relances." en typographie Inter Light.
Ambiance calme, légèrement dramatique. Particules lumineuses subtiles.
Transition : fondu violet.
```

### Dashboard cockpit (5-16s)
```
Animation capture dashboard : zoom lent avant centré KPIs.
Léger parallax fond/cartes. Lueur violette sur indicateurs.
Texte overlay : "Centralisez votre cabinet" puis "Pilotez votre portefeuille".
```

### Fiche client (16-22s)
```
Split screen : clients bulles à gauche, fiche client augmentée à droite.
Zoom sur score de risque et panneau ARK.
Texte : "Identifiez les clients à risque et à fort potentiel."
```

### Morning Brief ARK (28-36s)
```
Animation Morning Brief. Zoom lent sur recommandation ARK.
Surbrillance violette pulsée. 
Texte : "ARK priorise vos actions."
Musique monte en intensité.
```

### Relances + Opportunités (36-42s)
```
Split vertical : relances haut, opportunités bas.
Glow sur montants et priorités.
Texte : "Relancez mieux. Vendez plus intelligemment."
```

### Final (42-45s)
```
Zoom arrière vers logo COURTIA. Fond Aurora.
Texte : "COURTIA — Le cockpit intelligent des courtiers en assurance."
Fondu noir.
```

---

## Outils recommandés

| Outil | Mode | Usage |
|-------|------|-------|
| Runway Gen-3 | Image to Video, Motion Brush | Zooms ciblés, parallax |
| Sora | Image reference + prompt | Transitions d'ambiance |
| Kling | Image to Video | Animation simple |
| Pika | Image to Video | Mouvements caméra |

---

## À éviter

- Générer une fausse UI
- Ajouter des textes en anglais
- Style crypto/NFT
- Transitions agressives
- Voix off robotique (utiliser ElevenLabs)
- Montrer des pages vides ou le login

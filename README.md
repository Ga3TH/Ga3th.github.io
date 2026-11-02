# Portfolio de Gaéthan Prual

Site statique publié avec GitHub Pages : [https://ga3th.github.io/](https://ga3th.github.io/).

## Publication

Le fichier `index.html` est le point d'entrée du site et utilise `cv-gaethan-prual.css` pour son style. Les deux fichiers doivent rester à la racine du dépôt.

Dans **Settings → Pages**, configure la publication depuis la branche `main`, dossier `/ (root)`. Après un push, GitHub Pages publie automatiquement le site.

## Flux de veille

Le panneau GitHub affiche les pushs publics récents du compte `Ga3TH` (l’API GitHub conserve environ 90 jours d’événements publics). Le panneau IA regroupe les flux RSS d’OpenAI, Google DeepMind, Anthropic (via Google Actualités) et arXiv. Le fichier `feeds.json` est actualisé chaque jour par GitHub Actions ; le script peut aussi être lancé localement avec `python scripts/update-feeds.py`.

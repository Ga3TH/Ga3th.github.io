# Portfolio de Gaéthan Prual

Site statique publié avec GitHub Pages : [https://ga3th.github.io/](https://ga3th.github.io/).

## Publication

Le fichier `index.html` est le point d'entrée du site et utilise `cv-gaethan-prual.css` pour son style. Les deux fichiers doivent rester à la racine du dépôt.

Dans **Settings → Pages**, configure la publication depuis la branche `main`, dossier `/ (root)`. Après un push, GitHub Pages publie automatiquement le site.

## Flux de veille

Le bouton animé à côté de la disponibilité ouvre un résumé des pushs publics des 14 derniers jours, regroupés par dépôt ; les trois dépôts les plus actifs sont affichés. L’API publique de GitHub ne fournit que les événements récents (environ 90 jours, au plus 300 événements) : des pushs privés ou plus anciens ne sont pas inclus.

Le panneau IA regroupe les flux RSS d’OpenAI, Google DeepMind, Anthropic (via Google Actualités) et arXiv. Le fichier `feeds.json` est actualisé chaque jour par GitHub Actions ; le script peut aussi être lancé localement avec `python scripts/update-feeds.py`.

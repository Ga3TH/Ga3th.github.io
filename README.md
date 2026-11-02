# Portfolio de Gaéthan Prual

Site statique publié avec GitHub Pages : [https://ga3th.github.io/](https://ga3th.github.io/).

## Publication

Le fichier `index.html` est le point d'entrée du site et utilise `cv-gaethan-prual.css` pour son style. Les deux fichiers doivent rester à la racine du dépôt.

Dans **Settings → Pages**, configure la publication depuis la branche `main`, dossier `/ (root)`. Après un push, GitHub Pages publie automatiquement le site.

## Flux de veille

Le panneau GitHub classe les trois dépôts publics les plus actifs sur les 14 derniers jours à partir des commits attribués à `Ga3TH` sur leur branche principale. Le relevé est mis en cache et actualisé toutes les six heures par GitHub Actions. Il compte des commits, pas des pushs (un push peut contenir plusieurs commits).

Le bouton animé à côté de la disponibilité ouvre la veille sur l’intelligence artificielle.

La veille IA regroupe les flux RSS d’OpenAI, Google DeepMind, Anthropic (via Google Actualités) et arXiv. Le fichier `feeds.json` est actualisé chaque jour par GitHub Actions ; le script peut aussi être lancé localement avec `python scripts/update-feeds.py`.

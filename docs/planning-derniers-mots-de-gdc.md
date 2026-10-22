# Le planning du chantier : derniers mots de GDC avant le travail

De l'architecte de GDC à l'atelier des maquettes, le 22 octobre 2026. Ce fichier répond à « Le planning du chantier : le retour de l'atelier et son plan ». Il est court : tout est accepté. Il complète la dernière passe sur cinq points pratiques. Ensuite, chacun travaille de son côté.

## 1. Accepté tel quel

- **`panel-rail`**, avec le périmètre de ta section 2.1. Le rail reçoit `open`, émet `gdc-toggle` et, côté ouvert, `gdc-resize`. Il ne retient rien : c'est le panneau de GDC qui garde l'état et la hauteur.
- **Les sept états ajoutés à `site-schedule`** (section 2.2), en plus de la liste de la dernière passe.
- **`{ id, evt }` sans `ref`.** Cette ligne entre dans la table de la section 6 de la dernière passe. Le fil défile jusqu'à l'action, le planning marque son trait, la carte et l'arbre ne changent pas.
- **Les deux pistes et leur ordre** (section 4), et `defect-sign` qui reçoit `disparait`.

## 2. Cinq précisions pratiques

### 2.1 Les séquences suivent `index.json`, sans motif de fichier

Chaque pas de `index.json` nommera ses trois fichiers :

```json
{ "numero": 7, "titre": "…", "actions": ["…"],
  "fichier": "07-permis-attendu.json",
  "chronologie": "07-permis-attendu.chronologie.json",
  "depuis": "07-permis-attendu.depuis.json" }
```

- `fichier` garde son nom actuel : rien ne casse dans la galerie.
- Au premier pas, `depuis` est une chronologie complète marquée `"complet": true`, la même règle que pour un événement inconnu.
- Tu peux donc charger par `index.json` seulement, et laisser tomber le motif `fixtures/*/[0-9]*.json` ; c'est plus sûr que trois motifs.

### 2.2 La séquence `volume` a quatre pas

Ses quatre pas sont 25, 50, 75 puis 100 fiches, pas un pas par fiche. Elle est jouée avec le vrai binaire, en quelques minutes : tout tombe donc **le même jour**. Elle sert à la liste virtuelle et à la fluidité. Les plis des jours vides se jugent sur `projet-long`. Ainsi, le contrôle de la carte reste raisonnable sans contrôle à part, mais garde ta mesure.

### 2.3 `projet-long` est marquée

Son `index.json` porte `"horloge": "decalee"`, avec une phrase qui dit comment les heures ont été décalées. Ne t'en sers pas pour juger un fait (une durée, un ordre fin entre deux événements), seulement pour l'allure du planning.

### 2.4 La mesure de D-1 « sur la scène d'AuditApp »

L'atelier n'a pas la scène d'AuditApp, et il n'a pas à l'avoir dans son dépôt : ce sont les fiches réelles d'un projet en exploitation. Fais la mesure de référence sur `volume` et `trois-applications`. Si Pierre-Alain veut la mesure sur AuditApp, il lance `gdc scene` dans AuditApp et te passe le fichier pour une mesure **locale**, jamais commitée.

### 2.5 Un schéma inconnu

`gdc chronologie` porte `"schema": 1`. Tout autre numéro met `site-schedule` dans l'état « données illisibles ». Le planning ne devine jamais un champ. Un champ inconnu dans le schéma 1 est ignoré, comme la carte le fait déjà.

## 3. La suite

- GDC livre la 0.20.0 et dépose les quatre séquences dans `fixtures/`, régénérées par `scripts/sequences-maquette.mjs` de GDC, comme pour la 0.19.0. Pierre-Alain en est prévenu au dépôt.
- I-6 et I-7 démarrent à ce dépôt ; tout le reste démarre maintenant.
- Plus rien n'est attendu de toi avant ce dépôt. Si une fiche bute sur le contrat en cours de route, écris-le dans un fichier du même genre : Pierre-Alain me le passe.

# Les séquences de la ville et du planning

Des scènes et des chronologies réelles, produites par le binaire GDC sur un projet d'essai (`scripts/sequences-maquette.mjs` du dépôt GDC), pour construire et régler la ville et le planning avant le panneau du chantier C6. Ne pas les modifier à la main : les régénérer depuis GDC (`node scripts/sequences-maquette.mjs ../gdc-maquettes/fixtures`).

Depuis GDC 0.20.0. Le schéma 3 de la scène (ADR 0013 de GDC) et le schéma 1 de la chronologie (`gdc chronologie`) sont décrits dans `docs/maquette.md` du dépôt GDC. Le contrat du planning a été arrêté avec l'atelier : « Le planning du chantier : dernière passe » et « derniers mots » (`chantier-v2/livrables/` du dépôt GDC).

## Les quatre séquences

- `projet-type/` : un projet, de l'ouverture à la mise en production, en vingt-cinq pas. Il passe par :
  - une décision « On continue » refusée avec son motif, puis accordée ;
  - les gabarits, le feu vert, les fondations avec l'essai rouge, la structure ;
  - un lot abandonné, puis l'enveloppe et le camion pour une nouvelle dépendance ;
  - le second œuvre, la réception et la remise des clés ;
  - une deuxième fiche dont la mise en production échoue (un défaut), une troisième ouverte pour la réparer (`gdc demarre --repare`) qui ferme le défaut ;
  - le permis périmé.
- `trois-applications/` : la suite, avec trois applications à des étapes différentes, en neuf pas : l'administration existante surélevée, une consultation, deux feux verts attendus (une pause), un contrôle d'Hélène, l'application de bureau surélevée, puis une fiche abandonnée dont l'étage s'enlève.
- `projet-long/` : `projet-type` étalé sur plusieurs semaines, avec des jours vides, pour juger les plis du planning. **Ses heures sont décalées après coup** : le binaire n'a pas d'horloge réglable, puisqu'une heure du journal est une preuve. Son `index.json` le dit (`"horloge": "decalee"` et `horloge_explication`). Ses scènes sont celles de `projet-type`. Il sert à l'allure du planning, jamais à juger un fait.
- `volume/` : huit applications et cent fiches à des stades variés, en quatre pas (25, 50, 75, 100 fiches), jouées avec le vrai binaire en quelques minutes. Tout tombe donc le même jour. Il sert à la liste virtuelle et à la fluidité ; à charger à la demande.

## Les fichiers de chaque pas

`index.json` nomme, pour chaque pas, son titre, ses actions en clair et ses trois fichiers :

```json
{ "numero": 7, "titre": "…", "actions": ["…"],
  "fichier": "07-….json",
  "chronologie": "07-….chronologie.json",
  "depuis": "07-….depuis.json" }
```

- `fichier` : la scène complète et ses `actions` depuis le pas précédent. Chaque action porte sa `cause`, l'identifiant complet du fait qui l'a produite (`evt:<journal>/<id>`). Sans fait, `cause` vaut `null` et `deduit` dit pourquoi : `silence`, `delai` ou `dossier`.
- `chronologie` : la chronologie complète à ce pas (`gdc chronologie`).
- `depuis` : ce qui a changé depuis le dernier fait du pas précédent (`gdc chronologie --depuis`). Au premier pas d'une séquence, ou quand le pas précédent n'avait aucun fait, c'est la chronologie complète marquée `"complet": true`.

Charger par `index.json` seulement, jamais par un motif de nom de fichier.

## Ce que la 0.20.0 ajoute au contrat de la dernière passe

Trois précisions apparues en le codant, sans rien retirer :
- **Une étape 1 à 3 peut être `sans_trace`** : un projet commencé avant que GDC tienne son dossier (repris, ou plus ancien que GDC 0.16) n'a jamais fait ces étapes au journal. C'est le cas d'AuditApp.
- **`deduit` a trois valeurs** : `silence` (la fermeture, une pause faute d'activité), `delai` (un effet qui finit avec sa durée : la grue, le camion, Hélène, la fête d'un agent) et `dossier` (un changement des pièces ou du profil, qui vit dans des fichiers).
- **Quelques champs de plus** :
  - `livree` (date et fait) sur la ligne d'une fiche à l'étape 8 ;
  - `derive_de` sur un jalon de remise des clés déduit de la réception (mode go) ;
  - `source: "fichiers"` sur une barre quand la scène, qui regarde les preuves d'aujourd'hui, voit un autre stade que le rejeu.

La règle de lecture de la ville reste dans `docs/ville.md` : GDC dit quoi et où ; la ville dit comment, par des chemins et des animations. Rien ne bouge sans une action ; la vie d'ambiance naît de l'état reçu et n'ajoute aucun fait.

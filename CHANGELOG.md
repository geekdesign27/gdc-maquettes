# Journal des versions

## Non publiée, après 0.2.0

- Bible WORKSITE 1.2 : fiche DA de production (section 18). Recette de lumière « 3D douce » et cube étalon, cotes communes, classes de chanfrein, taille minimale d'un détail, bibliothèque de matériaux, socle maquette, scène de référence.
- Palette : 30 matériaux (terre, bois, caoutchouc, verre, acier corrigé, aluminium, tissus d'équipe, peaux, cheveux) ; section `personnages`.
- Lumière (`src/lumiere.json`) : recette 1.2 et cibles du cube étalon.
- Galerie : cube étalon et nuancier avec la mesure des faces, bascules « Silhouette » et « Niveaux de gris ».
- Atelier Blender : `npm run atelier -- etalon` mesure le calage ; ciel corrigé pour éclairer comme Three.js ; plus de sol de studio.
- Affichage de référence (portable de 13 à 14 pouces, 25 px par mètre) et ancrage en Suisse romande (bible, 18.7) ; `PX_PAR_METRE` de l'atelier passe de 24 à 25.
- Le chantier romand (bible, 18.8) : casques de la couleur d'équipe, clôture, conteneurs, bennes de tri, gilet orange fluo (`MAT_FABRIC_HIVIS`), vigilance de signalétique.
- Équipe « site » en #EBCB2E (jaune franc), plus loin de l'orange des engins (bible, 18.8).
- Catalogue : trois éléments séparés au lot G1 (`site-fence`, `site-container`, `waste-skip`) ; la bibliothèque de matériaux est livrée.
- La grue est reconstruite (palette et bible 1.2).
- Kit de bâtiment `BLD_KIT_A_v001`, premier étalon (validé sur planche par Pierre-Alain le 18 octobre 2026) : 11 pièces sur la trame de 3 m (poteau, dalle, rive et angle de dalle, murs en corail et en crépi, fenêtre, porte, garde-corps, échafaudage), 1 744 triangles, 8 matériaux. Restent à faire avant « livré » : fondations, toitures, escaliers, enseignes.
- Kit de bâtiment complété : semelle, longrine et attentes, poutre, acrotère, toit à deux pans et pignon, escalier à deux volées avec garde-corps de trémie, perron, marquise, totem d'enseigne sans texte ; 23 pièces, 4 160 triangles, 8 matériaux. La démonstration passe sur trois socles : l'immeuble, la maison, les fondations. Outil Blender `prisme`.
- Le kit de bâtiment (`building-kit`) est livré : validé sur planche par Pierre-Alain le 18 octobre 2026.
- Outils Blender : `chanfreine` (faces de contact vives) et `perce` (baies) ; l'atelier et `construit.py` montent et écrivent la démonstration d'un kit. La grue est reconstruite (GLB identique, empreinte des outils changée).
- Galerie : entrée « Le kit de bâtiment : démonstration », assemblée depuis le GLB du kit ; ombre du soleil avec `normalBias` 0,02 (`src/lumiere.json`) contre l'acné d'ombre. Le cube étalon reste conforme (218, 186, 142).

## 0.2.0, 18 octobre 2026

- Bible WORKSITE 1.1 (`docs/bible/bible-worksite.md`) : la version 1.0 de Pierre-Alain et ses amendements (états du bâtiment, familles devenues les lieux du parcours, couleurs d'état réservées à l'interface, animations `blocked` et `unknown`, polices locales, production par script Blender, ancres, budgets).
- Chaîne Blender : outils communs (`blender/gdc_blender/commun.py`), constructeur (`blender/construit.py`), `npm run blender -- <id>`, provenance dans `asset.json`.
- Contrat : modèles 3D déclarés dans `meta.assets`, chargés par l'hôte et reçus par `ctx.assets` ; ressources partagées jamais libérées par le composant ; ancres `ANCHOR_*`.
- Contrôle : lecture des GLB (noms, matériaux, animations, ressources externes, caméras et lumières, extensions, budget), provenance (script, outils communs, palette, GLB), instance chargée avec ses modèles.
- Galerie : chargement des modèles, lumière revue, planche comparative.
- Palette unique (`src/palette.json`), lue par Blender et Three.js.
- Catalogue 2 : kits (`building-kit`, `character-kit`), baraque du conducteur de travaux, états du bâtiment et du personnage, budgets de la bible, mode de production de chaque élément, polices.
- Exemple : la grue (`crane`), modèle Blender animé.

## Non publiée

- Mise en place du projet : contrat, catalogue, galerie, contrôle, deux composants d'exemple (`ground`, `selection-ring`).

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
- Personnage maître et équipe (`character-kit`), deuxième étalon : `CHR_BASE_MASTER` (1,70 m, 5 têtes, variante féminine par clé de forme, visage, casque, squelette `RIG_CHR_BASE`, onze animations, ancres `label` et `badge`), `CHR_HAIR_KIT` (sept coiffures, barbe, lunettes), une tenue `CHR_OUTFIT_<MÉTIER>` par métier (onze), `PRP_CHR_TOOLS` (douze outils) ; `equipe.json` décrit les 20 personnes du tableau. Chaque personne tient dans 8 000 triangles et 6 matériaux.
- Composant `character` : un agent dans son état (onze clips sur place, `unknown` grisé et immobile, `reducedMotion`, `facing`, ancres). Il prend les paramètres d'apparence (`body`, `skin`, `hair`, `hairColor`, `beard`, `glasses`, `tool`) en plus de `trade` et `team`.
- Chaîne Blender : un kit peut produire plusieurs GLB (`VARIANTES`), avec leurs empreintes dans `asset.json` ; le contrôle n'exige les animations que dans le fichier principal. Jetons : `ctx.tokens.personnages`.
- Galerie : planche « L'équipe », les 20 personnes jouées par le composant `character`.
- Le personnage maître (`character-kit`) et le personnage (`character`) sont livrés : validés par Pierre-Alain le 19 octobre 2026.
- Grue v002 (`VEH_TOWER_CRANE_A_v002`), troisième étalon, d'après MB_08 :
  - mât en tronçons de treillis de 1,5 m, empilés selon le paramètre `height` (6 à 30 m) ;
  - flèche en treillis triangulaire, pointe en A et tirants ;
  - contre-flèche à garde-corps, contrepoids en blocs de béton, cabine claire vitrée ;
  - socle béton à deux gradins, moufle graphite et palette de briques ;
  - en qualité basse, des caissons pleins remplacent le treillis (bible 18.3) ;
  - 8 488 triangles à 14 m, 14 824 à 30 m, 2 212 en qualité basse ; 8 matériaux.
- La grue (`crane`, v002) est livrée : validée sur planche par Pierre-Alain le 19 octobre 2026. Les trois étalons (kit de bâtiment, personnage, grue) sont validés ; le lot G1 peut commencer.
- Catalogue, lot G1 : les bureaux sont des conteneurs de chantier aménagés (décision de Pierre-Alain du 19 octobre 2026). Nouvelle fiche `container-kit` (ordre 1 : conteneur de 20 pieds agrandi × 1,2, soit 7,20 × 3,00 × 3,00 m, et mobilier commun) ; `site-container` passe à l'ordre 2 ; `site-container` et les cinq bureaux passent en `mixte` sur ce kit. `design-office` remplace `size` par `desks` (1 à 8, défaut 8, deux postes par conteneur) ; `architect-office` perd `size` ; ancres `desk:*` sur les deux. `control-office` est un conteneur équipé de matériel, sans poste occupé. Prompts MB_13 à MB_16 ajoutés au mood board (images à générer).
- Outils Blender : `rattache` met la scène à jour avant de lire la position monde. Un pivot ou une ancre créé avec un parent ne saute plus à l'origine de son parent, et le contournement de la grue disparaît. Tout est reconstruit : le kit de bâtiment et le personnage ressortent identiques à l'octet près (seul leur `asset.json` change, ils gardent leur version).
- Grue v003 (`VEH_TOWER_CRANE_A_v003`, composant 2.1.0) : la v002 dont le pivot du chariot et celui du crochet sont posés à leur vraie place, au lieu de l'origine. La géométrie, les ancres et l'animation sont les mêmes à l'écran.
- Kit de conteneur `ENV_CONTAINER_KIT_A_v001` (`container-kit`) : le conteneur de chantier en pièces (cadre graphite, panneaux blanc cassé, liseré bleu tech, nervures), sa coque coupée des bureaux en maison de poupée (sans toit, mur avant coupé à 0,90 m, sans longeron haut avant), porte de bout, marches, escalier et coursive, et le mobilier des cinq bureaux ; 9 904 triangles, 9 matériaux. Livré : validé sur planche par Pierre-Alain le 19 octobre 2026.

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

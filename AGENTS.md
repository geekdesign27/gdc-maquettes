# Règles de l'atelier des maquettes

Ce fichier vaut pour tout agent qui travaille ici, avec Claude Code ou Codex. Il est court exprès : le détail est dans `docs/`.

## Ce qu'on fabrique

Des composants visuels pour le panneau de chantier de GDC, listés dans `catalogue.json` (la source unique : nom, but, paramètres, états, ancres, budget, critères d'acceptation). Un composant est fini quand `npm run check` passe, qu'il a été vu dans la galerie dans tous ses états, et que son statut est passé à « livré ».

## Règles qui ne se discutent pas

1. **Le contrat** (`docs/contrat-composant.md`) : `meta` et `create`, Three.js injecté, aucune logique métier, aucun texte dans la 3D, animation pilotée par `update(dt)`, tout libéré par `dispose()`.
2. **Rien d'extérieur** : ni réseau, ni fichier, ni stockage, ni dépendance ajoutée sans accord de Pierre-Alain. Aucun modèle ou image repris sans licence CC0 ou MIT notée dans la fiche.
3. **Le style** : la bible WORKSITE (`docs/bible/bible-worksite.md`, version 1.2) et `src/palette.json`. Les couleurs d'état ne vivent que dans l'interface, jamais sur un objet de la scène.
4. **La signalétique** : celle de `docs/signaletique.md` : couleur, forme et icône pour chaque état ; rien ne clignote en continu.
5. **Le budget** : triangles et matériaux sous le plafond de la fiche ; en qualité basse, moins encore.
6. **Langue** : le code (noms de fonctions, de paramètres, d'états, de fichiers) en anglais ; la documentation, les commentaires et les noms affichés en français.
7. **Un composant à la fois**, dans l'ordre du catalogue sauf décision de Pierre-Alain ; jamais de modification d'un composant livré sans nouvelle version et sans ligne au journal des versions.
8. **Jamais d'invention** : si une fiche du catalogue est floue, on demande à Pierre-Alain au lieu de deviner. Une difficulté de modélisation se règle par un amendement proposé de la bible, jamais par une exception silencieuse.
9. **Blender par script** : tout modèle livré sort de son script `blender/assets/<id>.py` (`npm run blender -- <id>`) ; un GLB ne se retouche jamais à la main. Le connecteur Blender (MCP) sert à explorer ; ce qui est retenu est réécrit dans le script. Voir `blender/README.md`.

## Les rôles

| Rôle | Ce qu'il fait | Fichier (Claude Code) |
|---|---|---|
| Le directeur artistique | Tient le mood board et les décisions de style ; relit chaque composant pour la cohérence visuelle | `.claude/agents/directeur-artistique.md` |
| Le modeleur | Fabrique les lieux, les kits de bâtiment, les bâtiments, les engins et les intérieurs : scripts Blender et composants | `.claude/agents/modeleur.md` |
| L'animateur | Fabrique le personnage maître, son squelette, ses tenues et ses animations ; anime les engins : scripts Blender et composants | `.claude/agents/animateur.md` |
| L'intégrateur d'interface | Fabrique les éléments d'interface (lot G6) et les illustrations (lot G7) | `.claude/agents/integrateur-interface.md` |
| Le contrôleur | Fait passer le contrôle, mesure le budget, vérifie l'accessibilité ; ne corrige pas, signale | `.claude/agents/controleur.md` |

Avec Codex, ces rôles se donnent dans la demande (« en tant que modeleur, fabrique… ») : le contenu des fichiers de rôle s'applique de la même façon.

## Méthodes

Les façons de faire sont dans `docs/` et `blender/README.md`. Avec Claude Code, quatre skills les appliquent (`.claude/skills/`) : `charte-worksite` (les règles de style à relire avant de produire), `fabrique-asset` (le parcours complet d'un élément), `blender-live` (la boucle de l'atelier et le connecteur Blender), `revue-planche` (la revue visuelle). Avec Codex, demander de suivre le fichier `SKILL.md` correspondant.

## Commandes

`npm run atelier -- <id>` (essai sans export et captures), `npm run blender -- <id>` (modèle 3D), `npm run dev` (galerie), `npm run check` (contrôle), `npm run catalogue` (catalogue lisible), `npm run build` (bibliothèque pour GDC).

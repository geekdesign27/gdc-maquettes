# GDC 0.22 : ce qui change pour l'atelier, et deux propositions

De GDC (l'architecte du harnais), le 25 octobre 2026, avec l'accord de Pierre-Alain (décision D6 de l'analyse d'ensemble de la V2). Les séquences de `fixtures/` sont régénérées avec GDC 0.22.3 sur la branche `gdc-0.22-sequences`. Le contrat de la scène et du planning ne change pas : aucun champ retiré, aucun renommé.

## Ce qui change dans les faits que GDC envoie

1. **Moins de feux verts.** Par défaut, une fiche ne demande plus le feu vert du plan que si le travail sort du cadre du permis : une table créée ou supprimée, des données détruites, une règle d'accès retirée, ou le plan d'ouvrage modifié. Les séquences gardent leurs feux verts, parce qu'elles les demandent explicitement ; dans un vrai projet, le panneau du feu vert sera plus rare.
2. **Le stade d'une fiche sans feu vert (F-32).** Avant la 0.22, une fiche sans feu vert à demander (R1, R2) restait en gabarits pendant toute sa construction, jusqu'à la réception. Désormais elle ne garde ses gabarits que pendant le cadrage, puis passe au terrassement, aux fondations et ainsi de suite, comme les autres. Rien à changer côté atelier : les stades et leur ordre sont les mêmes ; ce sont les fixtures qui montrent maintenant la construction de ces fiches.
3. **Une décision peut venir de la conversation.** Un événement `gate` porte maintenant `par: "conversation"` quand Pierre-Alain a décidé en écrivant le code court dans la conversation, au lieu de `par: "humain"` dans son terminal. La scène ne change pas : le panneau de décision, le bureau du client et le jalon du planning se comportent pareil.
4. **Le code court d'une décision attendue.** Un `gate` en attente porte un champ `code` (trois signes, par exemple `K7P`). C'est ce que Pierre-Alain écrit pour décider. Il peut s'afficher sur le panneau de décision ou dans le panneau de l'élément choisi : à l'atelier de juger s'il sert.

## Deux propositions (à fabriquer quand l'atelier le décide, par une nouvelle version)

Ce sont des propositions, pas des commandes : ce sont des modifications de composants déjà livrés, qui demandent une nouvelle version et une ligne au journal des versions (règle 7 de l'atelier).

**P1. Les trois natures du « prouvé », dans le panneau de l'élément choisi (`inspector`).** GDC distinguera bientôt, pour une fiche, trois natures de preuve :
- **le processus** : le journal est lisible, les décisions sont signées, les délégations relues, les lots finis ;
- **le fonctionnel** : chaque critère prouvé par une action réelle ; demain, la réception d'Anne ;
- **la sécurité** : les contrôles verts, les constats soldés.

Proposition : trois lignes dans la section « réussites » du panneau, chacune verte, en attente ou bloquée, avec la forme, la couleur et l'icône de la signalétique. Les champs viendront de `gdc etat` (version 0.23, schéma annoncé avant).

**P2. L'outil qui travaille, dans la fenêtre d'un agent (`agent-popup`).** Pierre-Alain passe de Claude Code à Codex quand ses limites sont atteintes. Le journal sait quel outil a travaillé (`bail.outil` : `claude-code` ou `codex`). Proposition : une ligne discrète dans la fenêtre d'un agent, « avec Claude Code » ou « avec Codex », en texte, sans logo de marque.

## Réponse de l'atelier (25 octobre 2026, décisions de Pierre-Alain)

**P1, les trois natures du prouvé : accepté, sans nouvelle version.** L'inspecteur 1.0.0 l'affiche déjà : trois lignes de la section « réussites », `{ label, value, state }`, avec `label` à « Processus », « Fonctionnel » et « Sécurité », et `state` pris dans la signalétique (`done`, `waiting`, `blocked`, `unknown`). L'atelier ajoutera l'exemple à la galerie quand le schéma de `gdc etat` 0.23 sera publié.

**P2, l'outil qui travaille : accepté, `agent-popup` 1.2.0** (la 1.1.0 est celle du portrait). Nouvelle entrée `tool` : `claude-code` affiche « avec Claude Code », `codex` affiche « avec Codex » ; absente, vide ou autre valeur, rien ne s'affiche. Une ligne discrète, en texte, sans logo. À GDC : porter `bail.outil` sur l'objet de l'agent dans la scène (les séquences 0.22.3 ne le portent pas).

**Le code court : dans l'inspecteur seulement.** Ni sur le panneau 3D (pas de texte dans la 3D), ni dans le badge (jusqu'à six codes à la fois sur la carte). Quand on choisit un panneau de décision, la section « actions attendues » porte une ligne « Code à écrire » dont la valeur est le code, par exemple `K7P`. Sans nouvelle version de l'inspecteur. À GDC : porter `code` sur l'objet `decision-sign` de la scène tant que la décision est attendue (les séquences 0.22.3 ne le portent pas).

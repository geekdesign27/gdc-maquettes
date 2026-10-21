# Les polices (`fonts`)

Trois polices variables, sous-ensemble latin (couvre le français : é, à, ç, œ, « », €, espace fine insécable). Elles sont copiées dans le projet et intégrées à `dist/maquettes.js` : le panneau ne fait aucune requête vers un service de polices et fonctionne hors ligne (bible, 17.5).

| Rôle | Famille | Fichier | Graisses | Taille | Licence |
|---|---|---|---|---|---|
| Titres | Manrope | `manrope-latin-wght-normal.woff2` | 200 à 800 | 24 836 o | `LICENSE-manrope.txt` |
| Interface et données | Inter | `inter-latin-wght-normal.woff2` | 100 à 900 | 48 256 o | `LICENSE-inter.txt` |
| Identifiants et références | JetBrains Mono | `jetbrains-mono-latin-wght-normal.woff2` | 100 à 800 | 40 404 o | `LICENSE-jetbrains-mono.txt` |

## Licence

SIL Open Font License 1.1 (OFL-1.1) pour les trois, vérifiée dans chaque fichier `LICENSE-*.txt` :

- Inter : Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter) ;
- Manrope : Copyright 2019 The Manrope Project Authors (https://github.com/sharanda/manrope) ;
- JetBrains Mono : Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono).

L'OFL n'est ni CC0 ni MIT (règle 2 d'`AGENTS.md`) : Pierre-Alain l'a acceptée, ainsi que le téléchargement, le 21 octobre 2026. Elle permet d'intégrer les polices à un logiciel et de les redistribuer avec lui, à condition de joindre la licence et de ne pas vendre les polices seules. Les fichiers ne sont pas modifiés.

## Provenance

Paquets npm Fontsource 5.3.0 (publiés le 19 juillet 2026), téléchargés une fois depuis jsDelivr le 21 octobre 2026 :

- `@fontsource-variable/manrope@5.3.0/files/manrope-latin-wght-normal.woff2`
- `@fontsource-variable/inter@5.3.0/files/inter-latin-wght-normal.woff2`
- `@fontsource-variable/jetbrains-mono@5.3.0/files/jetbrains-mono-latin-wght-normal.woff2`
- et le `LICENSE` de chaque paquet.

Empreintes SHA-256 :

```
a30ddcd349703aff7464c34bef3fffdff405ee50c113440d7c8693c02d210972  manrope-latin-wght-normal.woff2
3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62  inter-latin-wght-normal.woff2
18be452724bfdc236c074ca94a249a7f41a86752c7d04ab258ce9ed5651f6a7e  jetbrains-mono-latin-wght-normal.woff2
```

## Utilisation

`src/interface.js` déclare les trois `@font-face` avec les fichiers intégrés et les variables `--gdc-font-title`, `--gdc-font-ui` et `--gdc-font-mono`. Un élément d'interface n'écrit jamais un nom de police : il lit ces variables.

# HELIOS

*Digital twin open source pour les systèmes de support vie en boucle fermée destinés aux habitats lunaires et martiens.*

HELIOS simule une boucle ECLSS complète qui convertit le CO2 expiré en méthane et oxygène par la réaction de Sabatier couplée à l'électrolyse de l'eau. Le système distribue vingt-huit agents autonomes sur les équipements du procédé, déployables sans modification sur microcontrôleur, dans un digital twin Unreal, ou dans l'environnement de conception. Une couche de direction de scénario pilotée par modèle de langage génère des scénarios d'entraînement crise adaptatifs.

Construit sur la pile open source SpikyPanda + CyanMycelium. Licence Apache 2.0. Non-ITAR par construction.

Ce répertoire est autonome. Il rassemble toute la documentation HELIOS et peut être extrait tel quel vers un dépôt séparé (cible : `github.com/iofmars/helios`).

## Structure du répertoire

```
helios/
├── README.md                      ce fichier
├── project-overview.fr.md         fiche projet complète
├── embodied-ai-architecture.fr.md cadre conceptuel IA incarnée multi-niveau
├── isimgraph-v2-notes.fr.md       design du framework de simulation
├── agent-manifest-v1.fr.md        spec des 28 agents distribués
├── website-brief.fr.md            brief de design du site web
├── website-copy.fr-en.md          contenu rédigé du site (FR/EN)
├── website-visuals-specs.fr.md    specs des visuels du site
├── figures/
│   └── pfd.png                    schéma du procédé (PFD)
└── private/                       docs de travail privés (non versionnés)
    └── conference-abstract.md
```

## Documents et ordre de lecture

Pour découvrir le projet, lire dans cet ordre :

1. **`project-overview.fr.md`** : la fiche projet complète. Contexte, architecture, roadmap, glossaire. Point d'entrée principal, autosuffisant.
2. **`embodied-ai-architecture.fr.md`** : le cadre conceptuel. Décrit HELIOS comme une architecture d'IA incarnée multi-niveau. C'est la contribution intellectuelle de fond du projet.
3. **`isimgraph-v2-notes.fr.md`** : le design technique du framework de simulation ISimGraph v2 sur lequel HELIOS est construit. Stratégie solveur, outils spectraux, roadmap en 13 sprints, glossaire de tous les acronymes.
4. **`agent-manifest-v1.fr.md`** : la spec exhaustive des 28 agents distribués (inputs, outputs, rôle, criticité par nœud).

Pour la production du site web :

- **`website-brief.fr.md`** : brief de design (personas, ton, direction visuelle, architecture des pages).
- **`website-copy.fr-en.md`** : contenu rédigé des 6 pages en français et anglais.
- **`website-visuals-specs.fr.md`** : specs des visuels à produire.

## Dépendances externes

Ce répertoire est autonome pour la documentation HELIOS. Quelques documents de contexte restent dans le repo SpikyPanda et ne sont pas inclus ici :

- `world-models-and-regulation` : distinction dynamics model vs world model, leçons du démo CO2 MPC.
- `from-single-loop-to-coupled-systems` : positionnement SpikyPanda sur les systèmes couplés.
- `graph-runtime-architecture` : référence du compute layer CyanMycelium (ComputeGraph, pipeline ONNX, quantization).

Ces documents sont cités là où ils sont pertinents. Ils ne sont pas nécessaires pour comprendre HELIOS, ils en éclairent le contexte technique.

## Statut

Projet en phase de conception. La documentation d'architecture est établie. L'implémentation suit la roadmap en 13 sprints décrite dans `isimgraph-v2-notes.fr.md`.

## Licence

Apache 2.0.

# HELIOS - Fiche projet

*CO2 → CH4 Closed Loop Life Support with Distributed Autonomous Agents*

---

## Résumé exécutif

HELIOS est un **digital twin de référence pour les systèmes de support vie en boucle fermée** destinés aux habitats lunaires et martiens. Le système combine trois capacités rarement réunies dans un même projet : simulation physique crédible d'une boucle ECLSS complète (capture CO2 → production CH4 + O2), distribution d'agents autonomes d'IA sur chaque équipement, et interface VR/AR conçue pour la recherche en interaction humain-système autonome.

Le projet est positionné comme **plateforme de recherche ouverte** (open source, non-ITAR par construction) et vise une compatibilité native avec les roadmaps NASA ECLSS Forward, NextSTEP et la prochaine génération de processeurs spaceflight HPSC.

Construit au-dessus de l'écosystème SpikyPanda + CyanMycelium, HELIOS sert simultanément trois usages : véhicule de recherche académique (cyber-physical systems, control, space architecture), démonstrateur technologique (VR/AR pour pitches industriels et institutionnels), et préfiguration d'un système opérationnel déployable sur matériel embarqué qualifié vol.

---

## Contexte et motivation

### Le problème ECLSS

Les missions spatiales de longue durée (Lune Artemis, Mars Sample Return, missions habitées Mars) exigent une autonomie complète en matière d'air, eau et alimentation. Les ECLSS actuels en orbite basse (ISS) fonctionnent en boucle quasi-ouverte avec ravitaillement régulier. Pour la Lune et Mars, une **vraie boucle fermée** devient impérative : recycler le CO2 expiré pour produire O2 respirable et CH4 carburant, recycler l'eau, et idéalement utiliser les ressources locales (ISRU).

Le procédé chimique de référence pour fermer le cycle carbone est la **réaction de Sabatier** (1902, Prix Nobel 1912) :

```
CO2 + 4 H2 → CH4 + 2 H2O    ΔH = -165 kJ/mol (exothermique)
```

Couplée à l'électrolyse de l'eau (qui régénère H2 et O2), elle ferme le cycle complet :

```
H2O → H2 + ½ O2      (électrolyse, endothermique)
CO2 + 4 H2 → CH4 + 2 H2O    (Sabatier, exothermique)
```

L'oxygène alimente la respiration de l'équipage, le méthane devient carburant pour propulsion ou pile à combustible, l'eau retourne au cycle. C'est le procédé que NASA cible pour Mars, et c'est ce que HELIOS simule.

### Le gap actuel des digital twins ECLSS

Les outils existants se classent en deux familles :

- **CFD lourde** (Computational Fluid Dynamics) : précis mais lent, non-interactif, inutilisable pour de la supervision opérationnelle ou de la formation équipage.
- **Simulations comportementales simples** : interactives mais pas crédibles physiquement, donc inutilisables pour de la validation.

HELIOS vise le milieu non-occupé : **physique suffisamment crédible** (modèles compartmentaux avec cinétique Arrhenius pour le Sabatier) **+ inférence agent embarquable** (agents distribués déployables sur MCU, comme dans le système final) **+ interaction temps réel** (VR/AR pour supervision et formation).

### Pourquoi maintenant

Trois fenêtres se chevauchent :

1. **Maturité matériel embarqué ML** : les MCU modernes (STM32H7, ESP32-S3) supportent l'inférence ONNX quantisée native. Les processeurs spaceflight de nouvelle génération (HPSC, livraison production 2026-2027) intègrent des accélérateurs ML.
2. **Maturité interfaces XR** : Meta Quest 3 et Apple Vision Pro ont apporté l'AR/VR à un niveau de qualité utilisable pour applications professionnelles, pas seulement gaming.
3. **Programmes NASA actifs** : ECLSS Forward, NextSTEP, HRP, STMD Game Changing Development cherchent activement des partenaires sur ces sujets.

Les briques techniques sont là, les besoins programmatiques sont là, il manquait une plateforme intégrée. C'est l'opportunité que HELIOS adresse.

---

## Architecture du système

### 1. Procédé physique de référence : PFD CO2 → CH4

Le Process Flow Diagram (PFD) de HELIOS modélise une boucle fermée complète avec 10 unités opératoires et 13 tags d'équipement.

![PFD HELIOS : boucle fermée CO2 vers CH4 (support vie + production carburant)](figures/helios-pfd.png)

Schéma complet du procédé en 10 sections numérotées, avec légende de flux par espèce (eau/vapeur, hydrogène, oxygène, CO2, méthane, air N2/O2, mélanges). Les fenêtres opératoires typiques de chaque équipement (température, pression) sont indiquées sur le schéma, ainsi que les principaux catalyseurs et conditions de capture (habitat basse concentration vs Mars haute concentration).

| Tag | Unité | Section |
|---|---|---|
| W-101 | Purification eau | 1. Préparation eau |
| E-201 | Électrolyseur PEM | 2. Électrolyse |
| V-201 | Sécheur H2 | 3A. Séchage H2 |
| V-202 | Sécheur O2 + buffer | 3B. Conditionnement O2 |
| C-301 | Capture CO2 (air habitat) | 4. Capture habitat |
| C-302 | Capture CO2 (atmosphère externe) | 4. Capture externe |
| K-401 | Compresseur CO2 | 5. Compression |
| M-501 | Mélangeur stœchiométrique | 6. Mixing |
| R-601 | Réacteur Sabatier | 7. Sabatier (nœud critique) |
| E-701 | Condenseur eau | 8. Condensation |
| V-701 | Knockout eau | 8. Knockout |
| V-801 | Séparateur gaz | 9. Séparation |
| V-901 | Purification CH4 (PSA) | 10. Purification CH4 |

**Caractéristiques structurelles** :

- **Boucles de recyclage vraies** : condensat eau de V-701 retourne à W-101, gaz non convertis (H2 + CO2) de V-801 retournent au mélangeur M-501. Le graphe est intrinsèquement cyclique.
- **Flux multi-espèces** : chaque arête porte une composition (H2O, H2, O2, CO2, CH4, N2) plus l'état thermodynamique (température, pression, débit).
- **Échelles de temps séparées** : compression et mélange en millisecondes, thermique des cuves en minutes, cinétique Sabatier en secondes, vieillissement catalyseur en semaines à mois. Quatre ordres de grandeur dans le même graphe.
- **Invariants de sécurité** : la pureté O2 vers habitat doit rester dans la fenêtre 21-30 %. La validation devient une propriété du graphe entier, pas d'un nœud isolé.

### 2. Variante ISRU : zéolithe lunaire + nickel recyclable

Une variante avancée du système exploite les ressources locales pour réduire la masse à transporter depuis la Terre.

**Principe** : au lieu d'importer le catalyseur Sabatier complet (Ni/Al2O3, typiquement 15-30 % Ni sur support alumine), on synthétise le support sur place à partir du régolithe lunaire (route hydrothermale NaOH sur anorthite, produisant des zéolithes de type ZSM-5 ou zéolithe-A, surface spécifique 200-400 m²/g, documenté par Mukai et al. JAXA), et on n'importe que le **nickel métallique**.

**Avantages** :

- Le nickel est dense (8.9 g/cm³), compact, **recyclable indéfiniment** par leaching et redéposition.
- ~85 % de la masse catalyseur est le support. Économie logistique majeure.
- Bouclage supplémentaire : le cycle de vie catalyseur devient une 4e boucle du système (synthèse zéolithe → imprégnation Ni → vieillissement → régénération oxydative ou vapeur → récupération Ni). Boucle lente (semaines à mois) couplée aux boucles rapides du procédé.

**Choix Ni vs Ru** : le ruthénium est 4-5× plus actif comme catalyseur Sabatier, mais coûte ~1000× plus cher et n'existe pas sur la Lune. Le nickel est l'industriel standard depuis Sabatier lui-même (1902). Pas d'ambiguïté pour un contexte ISRU.

**Implications pour la simulation** :

- Un nouvel invariant à conserver : **l'inventaire global de Ni** dans le système doit rester constant à la précision numérique. Toute fuite ou dérive numérique est détectée gratuitement par ce contrôle.
- Le réacteur R-601 devient explicitement stateful : il porte les variables `{Ni_actif, surface_active, dépôt_carbone, activité_relative(t)}`.
- Le frittage thermique (Ni à 400°C coalesce en quelques centaines d'heures) et le cokage (dépôt carbone, dépend du ratio H2/CO2 local) sont les principales causes de désactivation, modélisés explicitement.

### 3. Framework de simulation : ISimGraph v2

HELIOS est construit au-dessus du framework générique **ISimGraph v2** (graphe de simulation par composition fractale, voir `isimgraph-v2-notes.fr.md` pour le design détaillé).

**Décisions architecturales** :

- **Nœuds stateful** : chaque nœud porte un état interne explicite et une fonction `rhs(t, state, inputs) → dstate_dt`. Modèle inspiré de Modelica et Simscape.
- **Composition fractale** : `ISimGraph extends ISimNode`. Un graphe est lui-même un nœud, ce qui permet d'encapsuler des sous-systèmes (le sous-graphe ISRU, par exemple) et de les utiliser comme nœuds dans un graphe parent.
- **Format JSON portable** : la topologie complète d'un système se sérialise en JSON, sans recompilation pour les variantes. Un éditeur visuel peut produire les fichiers.
- **Ports typés** : observation (l'agent lit) et action (l'agent écrit), séparés du flux physique. Garantit que les agents n'altèrent jamais directement l'état physique, seulement via leur port d'action consommé par le `rhs`.
- **Solveur abstrait** : interface `ISolver`, implémentations RK4 adaptatif (Cash-Karp / Dormand-Prince) pour démarrer, montée vers Boost.odeint (Rosenbrock stiff) puis SUNDIALS (BDF, DAE) selon nécessité.

**Niveaux de fidélité** :

| Niveau | Description | Solveur requis | Cas d'usage |
|---|---|---|---|
| 0 | Gain statique + composition fixe | Algébrique | Validation topologie graphe |
| 1 | 1er ordre par compartiment + bilan espèces | ODE explicite (RK4) | Validation archi ISimGraph |
| 2 | CSTR avec cinétique Arrhenius + thermique | ODE raide (BDF, Rosenbrock) | Sabatier réaliste |
| 3 | DAE complet avec thermo (Peng-Robinson, NRTL) | DAE (IDA) | Calibration industrielle |

Démarrage volontairement au **niveau 1**, montée selon besoin démontré.

### 4. Outils spectraux natifs

Le framework intègre nativement trois outils d'analyse spectrale qui exploitent la structure du graphe :

- **Analyse modale du système linéarisé** : `graph.linearize(operating_point) → J`, puis `graph.spectrum() → eigenvalues`. Donne instantanément les modes propres, les constantes de temps, le stiffness ratio, et détecte les bifurcations de Hopf annonciatrices d'instabilités en boucle fermée.
- **DMD (Dynamic Mode Decomposition)** sur les trajectoires : approche data-driven extrayant modes spatiaux et fréquences complexes depuis les snapshots de simulation. Approximation finie de l'opérateur de Koopman. Détection précoce d'instabilités. Particulièrement utile pour identifier les modes dominants à fin de réduction d'ordre.
- **Spectral GNN** (optionnel, plus tard) : extension de l'approche FNO (Fourier Neural Operator) au cas du graphe arbitraire via décomposition propre du laplacien. Pour les surrogate models avancés.

Ces outils transforment le simulateur en un instrument de diagnostic dynamique, pas seulement de prédiction.

### 5. Agents distribués : le manifest HELIOS

HELIOS définit **28 agents autonomes** distribués sur les équipements du PFD (voir `helios-agent-manifest-v1.fr.md` pour la spec complète).

**Répartition par criticité** :

| Nœud | Nb agents | Criticité |
|---|---|---|
| W-101 | 2 | Moyenne |
| E-201 | 3 | Haute |
| V-201 | 1 | Moyenne |
| V-202 | 2 | Haute (survie) |
| C-301 | 2 | Haute |
| C-302 | 2 | Moyenne |
| K-401 | 2 | Moyenne |
| M-501 | 1 | Haute |
| **R-601** | **6** | **Critique** |
| E-701 | 1 | Moyenne |
| V-701 | 1 | Faible |
| V-801 | 1 | Moyenne |
| V-901 | 1 | Haute |
| Cross-nœuds | 3 | Critique |
| **Total** | **28** | |

**Le réacteur Sabatier R-601 concentre 6 agents** parce qu'il est le nœud le plus critique (réaction exothermique, risque d'emballement thermique, dégradation irréversible du catalyseur en cas d'excès thermique) :

1. **R601-THERMAL-REGULATION** : surveille le profil thermique axial, détecte les points chauds, anticipe l'emballement.
2. **R601-HEAT-RECOVERY** : optimise la récupération de chaleur vers E-201 et le système eau.
3. **R601-CATALYST-HEALTH** : estime l'activité catalytique résiduelle, détecte le frittage et l'empoisonnement soufre.
4. **R601-CONVERSION-EFFICIENCY** : mesure le rendement temps réel, corrèle avec température et pression.
5. **R601-RUNAWAY-PREVENTION** : agent de sécurité temps réel, seul autorisé à émettre `emergency_shutdown`.
6. **R601-RECYCLE-BALANCE** : surveille la boucle de recyclage H2 + CO2 non convertis.

**Quatre types d'agents** dans le schéma manifest :

- **Observer** : pure fonction d'observation, produit des scores et alertes, aucune action sur le système.
- **Advisor** : produit des recommandations pour opérateur humain ou autre agent.
- **Controller** : agit directement sur le port d'action d'un nœud (boucle fermée).
- **Safety** : controller à autorité supérieure, override les autres en cas d'urgence.

**Agents cross-nœuds** (au nombre de 3, agrégateurs globaux) :

- **LOOP-MASS-BALANCE** : bilan massique global, conservation par espèce. Implémente l'invariant de conservation du framework.
- **LOOP-ENERGY-BALANCE** : bilan énergétique global, ratio énergie consommée / CH4 produit.
- **THERMAL-CHAIN** : surveille la chaîne de récupération thermique Sabatier → condenseur → électrolyseur.

**Arbitrage** : quand plusieurs agents ont une opinion sur le même actuateur d'un même nœud (cas typique R-601 avec 6 agents), un arbitrator résout via une politique configurable (priority, blend, vote). R601-RUNAWAY-PREVENTION a autorité absolue sur tous les autres en cas d'alerte.

**Multi-backend** : un agent peut être une formule déterministe (E201-EFFICIENCY = formule de Faraday), une règle (M501-STOICHIO-RATIO = simple division avec seuils), ou un modèle ML (K401-BEARING-HEALTH = CNN sur signature vibratoire). Pas de surutilisation de ML là où une règle suffit.

### 6. Topologie de déploiement : trois runtimes, un format portable

```
┌─────────────────────────────────────────────────────┐
│         SPIKYPANDA (DESIGN + TRAINING)              │
│                                                     │
│  - SimGraph complet (ODE solveur, spectral, DMD)    │
│  - Conception et entraînement des agents            │
│  - Validation par solveur de référence              │
│  - Génération ONNX + manifest JSON portable         │
└──────────────┬───────────────────────┬──────────────┘
               │                       │
               │ export                │ export
               ▼                       ▼
   ┌──────────────────────┐   ┌─────────────────────────┐
   │  CYANMYCELIUM MCU    │   │  CYANMYCELIUM UNREAL    │
   │                      │   │                         │
   │  - Inference ONNX    │   │  - Inference ONNX       │
   │  - Vrais capteurs    │   │  - Twin simulé          │
   │  - Bus CAN / MQTT    │   │  - 3D / AR / VR         │
   │  - Actuateurs        │   │  - Scénarios scriptés   │
   └──────────┬───────────┘   └────────────┬────────────┘
              │                            │
              │  télémétrie                │  télémétrie
              └────────────┬───────────────┘
                           ▼
                ┌──────────────────────┐
                │  SPIKYPANDA          │
                │  (monitoring/replay) │
                │  boucle retraining   │
                └──────────────────────┘
```

**Runtime 1 : SpikyPanda** (TypeScript + WebGPU). Environnement de design et d'entraînement. Pas de contraintes de footprint. Contient l'intégralité du framework (simulation, training, diagnostic spectral, génération artifacts).

**Runtime 2 : CyanMycelium MCU** (C++14 portable). Cible matérielle physique. Inférence ONNX quantisée int8, footprint typique 50-300 KB par MCU pour l'ensemble des agents d'un équipement. Cibles défauts : STM32H7, ESP32-S3. **Code portable HPSC-ready** : aucun intrinsic spécifique, aucune dépendance OS, prêt pour migration RISC-V multicore avec accélérateur ML quand HPSC devient accessible (production silicon 2026-2027).

**Runtime 3 : CyanMycelium Unreal plugin** (C++ + Blueprint). Cible démonstrative et étude utilisateur. Plugin Unreal Engine 5 hébergeant CyanMycelium et un SimGraph C++ minimal. **Surface Blueprint riche** : chaque type d'agent, port, alerte, scénario est exposé comme nœud Blueprint utilisable sans écrire de C++. Ce choix est dimensionnant pour l'accessibilité de la plateforme aux contributeurs non-C++.

**Format portable** : un seul manifest JSON consommé identiquement par les trois runtimes. SpikyPanda l'utilise pour la simulation, MCU pour le pilotage matériel, Unreal pour le digital twin. Pas de divergence possible entre simulation et déploiement.

**Bus de télémétrie** : MQTT par défaut. Les runtimes déployés remontent observations capteurs, sorties agents et métriques de performance vers SpikyPanda pour monitoring, replay, et déclenchement de retraining quand drift détecté.

### 7. Couche expérience VR/AR

Pour la supervision opérationnelle et la formation équipage, HELIOS intègre une couche immersive en deux phases.

**Phase 1 : VR sur Meta Quest 3**

- Immersion totale dans le digital twin.
- Visualisation 3D du PFD avec animations de flux fluides, indicateurs d'état couleur par équipement.
- HUD montrant état des 28 agents en temps réel, alertes hiérarchisées, contrôles tactiles.
- Bibliothèque de scénarios scriptables : nominal, dégradation filtre, runaway thermique, perte de capture CO2, etc.
- Cible : démonstrations, formations groupées, présentations programmatiques.

**Phase 2 : AR sur Apple Vision Pro**

- Superposition sur l'environnement physique réel ou maquette.
- Interaction multi-modale (voice + gesture + gaze).
- Cible : usage opérationnel par équipage devant le vrai équipement, formation procédurale haute fidélité.

**Conception research-grade** (élément différenciant) : la couche VR/AR n'est pas qu'une démo, c'est un instrument de recherche.

- **Logging des interactions utilisateur** : gestes, fixations oculaires, commandes vocales, latences. Format compatible avec outils d'analyse user research standards.
- **NASA-TLX et SAGAT intégrés en outils natifs** : Task Load Index pour mesurer la charge cognitive, Situation Awareness Global Assessment Technique pour mesurer la conscience situationnelle. Permet de conduire des études comparatives reproductibles.
- **Scénarios scriptables et reproductibles** : mêmes conditions exactes entre sujets d'études, déclenchables par script.
- **IRB-ready** : pipeline de collecte conforme aux normes éthiques universitaires (consent forms, anonymisation, opt-out).

Sans ces éléments, la couche VR/AR resterait une démo. Avec, elle devient un instrument d'expérience scientifique défendable en publication HCI ou architecture spatiale.

### 8. Direction de scénario via LLM et MCP

Une formation à la gestion de crise demande des scénarios qui restent imprévisibles après quelques sessions. Une vingtaine de scripts écrits à la main suffit pour un cycle de formation, pas pour un programme qui tourne en continu. HELIOS confie cette tâche à un modèle de langage, qui pilote la simulation via une surface MCP dédiée plutôt qu'en touchant directement la physique.

Le LLM décide en termes narratifs (« simuler une dégradation catalyseur progressive sur 72h pendant le shift de nuit »), et l'adapter MCP traduit ces intentions en modifications cohérentes du SimGraph : ajustement des paramètres internes de R-601, drift injecté sur les sondes concernées, événements de communication avec la latence Mars de 22 minutes si le scénario le justifie. Toute action LLM passe par une validation préalable. C'est ce qui garantit que la simulation reste physiquement cohérente même quand le LLM improvise.

La surface MCP exposée regroupe l'injection de perturbations (pannes, anomalies chimiques, conditions environnementales), la gestion d'objectifs et de contraintes dynamiques visibles dans le HUD VR, les communications simulées entre équipage et sol, la lecture des actions équipage et des états des agents observers, l'ajustement de difficulté avec mise en pause pour debrief, et un mécanisme de snapshot/restore pour rejouer un scénario à partir d'un point précis.

Un exemple concret. Briefing en début de session : « mois 8 d'une mission lunaire, vous êtes ingénieur de quart, R601-CATALYST-HEALTH signale une dégradation de 15% sur 72h attribuée à un possible empoisonnement soufre, NASA Houston répond avec 5 secondes de latence ». Pendant la session, le LLM observe que l'équipage active l'agent catalyseur mais oublie LOOP-MASS-BALANCE. Il décide d'injecter une question Houston : « avez-vous vérifié le bilan massique global avant de planifier la régénération ? ». Si la réponse n'intègre pas le point, il déclenche une cascade. La régénération met le système offline pendant 4h, révèle une fuite cachée que la dégradation catalyseur masquait, le buffer O2 commence à chuter. La pression sur l'équipage monte, le scénario reste physiquement cohérent à chaque étape.

À la fin, le LLM produit un debrief. Il pointe les décisions prises, les signaux ignorés, les sources d'information non consultées, et propose les alternatives qui auraient été envisageables au regard de l'état observable du système. Ce debrief ne remplace pas un instructeur humain expérimenté qui apporte un contexte mission réel et une lecture clinique des comportements équipage. Il rend possible une rétroaction par session même quand aucun instructeur n'est disponible, ce qui n'existe pas aujourd'hui dans les programmes NASA équivalents.

Trois rôles légitimes pour le LLM dans HELIOS : la direction de scénario en simulation d'entraînement (le cœur de l'usage, décrit ici), l'évaluation post-session et le debrief, et l'assistance à la conception en amont (exploration de variantes, screening rapide avant validation par solveur de référence). Le LLM n'intervient pas dans la boucle de contrôle des agents safety, pas dans l'intégration physique du SimGraph, et pas dans la fermeture en temps réel d'une action sur un actuateur d'un système déployé.

Sur le déploiement du LLM lui-même. En phase initiale et pour les études universitaires, l'inférence se fait via API cloud (Claude ou GPT). La latence d'une seconde reste acceptable pour de la direction de scénario, et la qualité de raisonnement disponible en cloud reste supérieure aux modèles locaux quantisés. Pour un usage opérationnel à terme (simulateurs isolés, éventuellement en orbite), le portage vers un modèle local quantisé (Llama 3.x ou équivalent) est prévu. L'interface entre HELIOS et le LLM est abstraite derrière un provider, donc le basculement reste transparent côté code applicatif.

Une limite à connaître. La qualité du scenario director dépend largement de la bibliothèque de scénarios fournie comme exemples au LLM. Sans un effort initial sérieux (10 à 20 scénarios narratifs détaillés avec annotations pédagogiques explicites), le LLM tend à générer des variantes superficielles ou physiquement implausibles. Cet effort de seed est probablement le plus gros risque de la feature, plus que la latence ou le coût d'inférence.

Côté positionnement programmatique, la direction de scénario adaptative est la capacité de HELIOS qu'on retrouve le moins ailleurs dans les simulateurs ECLSS actuels. Combinée à la couche AR/VR, elle ouvre des terrains d'étude HRP (Human Research Program) sur la prise de décision équipage sous stress qui sont aujourd'hui limités par le coût de production de scénarios variés.

---

## Décisions de cadrage

### Open source et non-ITAR par construction

**Open source dès le premier commit**, licence permissive (Apache 2.0 ou MIT recommandée). Cette décision est **structurelle, pas tactique** : une fois publié sous licence permissive, le code reste réutilisable même si le projet évolue. Pas de période propriétaire « le temps de stabiliser ».

**Zéro contenu ITAR par construction**. Le PFD ECLSS et le réacteur Sabatier sont des procédés industriels civils non couverts par l'ITAR. La modélisation doit éviter tout équipement à dual-use militaire (capteurs haute précision défense, propulseurs, charges utiles classifiées). Cela préserve :

- La possibilité pour des contributeurs internationaux de travailler sur le projet.
- L'hébergement sur GitHub public.
- La citabilité et la réutilisation académique mondiale.

Cette double décision (open source + non-ITAR) maximise l'impact scientifique et le potentiel de collaboration, tout en simplifiant les questions de gouvernance et d'IP.

### Compatibilité programmes de recherche spatiale

L'architecture vise une compatibilité native avec les programmes publics suivants, sans contractualisation initiale (compatibilités de design, pas engagements) :

- **NASA ECLSS Forward** : roadmap support vie pour Artemis et Mars. Le PFD CO2 → CH4 est dans le scope direct.
- **STMD Game Changing Development** : technologies en maturation, incluant ISRU. La variante zéolithe/Ni est dans ce scope.
- **NextSTEP** (Next Space Technologies for Exploration Partnerships) : habitats commerciaux cislunaires. La couche VR/AR + ECLSS coche les cases attendues.
- **HRP** (Human Research Program) : santé et performance équipage, mission ops training. L'interface AR/VR pour supervision est un cas d'usage HRP direct.
- **HPSC** (High Performance Spaceflight Computing) : prochaine génération processeur spaceflight, RISC-V multicore avec accélérateur ML, production silicon attendue 2026-2027. CyanMycelium est conçu portable pour cette cible.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend design | TypeScript, WebGPU (SpikyPanda) |
| Runtime kernel | C++14 portable (CyanMycelium) |
| Modèles ML | ONNX (quantisation int8 pour MCU) |
| Format manifest | JSON |
| MCU cible | STM32H7, ESP32-S3 (HPSC compatible) |
| Visualisation 3D | Unreal Engine 5 + Blueprint |
| VR | Meta Quest 3 (phase 1) |
| AR | Apple Vision Pro (phase 2) |
| Télémétrie | MQTT |
| Solveur ODE phase 1 | RK4 adaptatif (Dormand-Prince) maison |
| Solveur ODE phase 2 | Boost.odeint (Rosenbrock4) |
| Solveur ODE phase 3 | SUNDIALS (BDF, IDA pour DAE) |
| Algèbre linéaire | Eigen (analyse modale, DMD) |
| Direction scénario | MCP adapter + LLM client cloud (Claude/GPT), abstraction provider pour portage local ultérieur |

---

## Roadmap (13 sprints)

### Phase A : fondations (sprints 1-3)

**Sprint 1** : Socle ISimGraph v2 (extension ISimNode avec ports observation/action, composition fractale, loader JSON, assemblage état plat, solveur RK4 adaptatif maison, hook conservation). Refactorisation PMSM existant via la nouvelle interface, comportement préservé.

**Sprint 2** : Cas test PFD niveau 1 (12 types de nœuds, IChemicalStream multi-espèces, JSON configuration complète avec recyclages, validation conservation sur 24h simulés).

**Sprint 3** : Outillage spectral (linéarisation par différences finies, spectrum via Eigen, module DMD, visualisation modes).

### Phase B : agents, expérience et direction (sprints 4-8)

**Sprint 4** : Runtime agents générique (schéma manifest formel étendu, loader, arbitrator avec 3 politiques, bus d'alertes, pipeline ONNX export depuis SpikyPanda).

**Sprint 5** : Agents HELIOS priorité 1 (pipeline e2e R601-CONVERSION + LOOP-MASS-BALANCE, sécurité R601-RUNAWAY + R601-THERMAL-REG avec arbitrage validé, cross-node LOOP-ENERGY + THERMAL-CHAIN, diagnostic ML K401-BEARING + E201-GAS-PURITY + C302-CRYO).

**Sprint 6** : Plugin Unreal Blueprint MVP (plugin UE5 hébergeant CyanMycelium + SimGraph C++ minimal, surface Blueprint catégorisée, loader manifest depuis Blueprint, tick 60 Hz, bus MQTT, démo PFD complet visualisé).

**Sprint 7** : Couche expérience VR phase 1 (cible Meta Quest 3, assets 3D PFD instrumentés, HUD VR, logging interactions, scénarios scriptables, NASA-TLX et SAGAT intégrés).

**Sprint 8** : Direction de scénario via MCP et LLM. Extension de l'adapter MCP existant pour exposer les outils utilisés par le scenario director (injection de pannes, objectifs dynamiques, communications simulées, lecture actions équipage, snapshot/restore). Intégration d'un LLM client en cloud (Claude ou GPT) derrière une abstraction provider. Bibliothèque initiale de 10 à 15 scénarios narratifs détaillés servant d'exemples au LLM. Validation sur 30-50 sessions test que les scénarios générés restent physiquement cohérents et pédagogiquement pertinents.

### Phase C : maturité physique et AR (sprints 9-11)

**Sprint 9** : Montée niveau 2 (cinétique Arrhenius dans R-601, validation explosion stiffness ratio, intégration Boost.odeint Rosenbrock4, re-validation conservation, validation agents continuent de fonctionner).

**Sprint 10** (optionnel) : Variante ISRU (sous-graphe zéolithe + impregnation + récupération Ni, couplage avec PFD principal, invariant inventaire Ni, simulation longue durée semaines avec vieillissement catalyseur).

**Sprint 11** (optionnel) : Couche expérience AR phase 2 (cible Apple Vision Pro, migration assets VR vers AR avec anchors, interaction multi-modale voice + gesture + gaze, mode opérationnel overlay).

### Phase D : exploration et space-grade (sprints 12-13)

**Sprint 12** (optionnel) : Surrogate exploratoire (génération dataset 1000 trajectoires, entraînement GNN time-stepper, validation gain vitesse vs erreur conservation, usage exploration paramétrique pour design habitat).

**Sprint 13** (optionnel) : Portage HPSC (portage CyanMycelium runtime sur RISC-V HPSC quand eval kit accessible, validation accélérateur ML embarqué, benchmark vs MCU standard, documentation pattern pour future certification vol).

---

## Livrables

À l'issue des phases A et B (sprints 1-8), HELIOS dispose de son framework ISimGraph v2 sous licence ouverte, du PFD CO2 → CH4 simulé en niveau 1, des 28 agents du manifest déployables, du plugin Unreal Blueprint MVP avec démo VR Meta Quest 3, et du scenario director LLM connecté via MCP avec sa bibliothèque initiale de scénarios. La documentation (design doc, manifest, project overview, glossaire) et l'outillage études utilisateur (NASA-TLX, SAGAT, logging) sont en place. C'est l'état « démontrable » du projet.

La phase C (sprints 9-11) ajoute la maturité physique : cinétique Arrhenius dans R-601, variante ISRU avec invariant Ni vérifié sur simulations longue durée, et la couche AR sur Apple Vision Pro.

La phase D (sprints 12-13) couvre les extensions exploratoires : surrogate GNN pour l'exploration paramétrique de design, et portage CyanMycelium sur HPSC quand le matériel devient accessible.

---

## Pièges à éviter (capitalisés depuis l'analyse design)

- **Ne pas ajouter de constante de temps `tau` partout** par réflexe : seulement quand physiquement motivé. Sinon le système devient artificiellement raide.
- **Ne pas accepter de prédiction surrogate sans vérification de conservation** : les NN ne préservent pas mass / énergie / Ni par défaut. Hook conservation obligatoire en post-step.
- **Ne pas sauter sur SUNDIALS prématurément** : RK4 maison suffit pour valider l'archi en niveau 1.
- **Ne pas baker le stepping dans les nœuds** : sépare assemblage et solveur dès le début pour pouvoir brancher des solveurs implicites plus tard.
- **Ne pas mettre un LLM dans la boucle de simulation** : HELIOS est un simulateur déterministe, pas une boucle agentique. LLMs restent outside, comme outils de conception et analyse.
- **Ne pas confondre dynamics model et world model** : un world model décide, un dynamics model prédit. La différence est la fonction de coût.
- **Ne pas oublier la non-stationnarité** : FFT classique suppose stationnarité, fausse pendant démarrage, régen, perturbation. Utiliser STFT ou wavelets pour le non-stationnaire.
- **Tout n'a pas besoin d'être ONNX** : E201-EFFICIENCY = formule de Faraday, M501-STOICHIO = simple division. Backends multiples (formula, rule, ONNX) évitent le ML inutile et améliorent l'auditabilité.

---

## Documents associés (dans ce repo)

- [`isimgraph-v2-notes.fr.md`](isimgraph-v2-notes.fr.md) : design détaillé du framework ISimGraph v2, stratégie solveur, outils spectraux, glossaire multi-niveau de tous les acronymes utilisés.
- [`helios-agent-manifest-v1.fr.md`](helios-agent-manifest-v1.fr.md) : spec complète des 28 agents (inputs, outputs, role par agent, criticité par nœud).
- [`world-models-and-regulation.fr.md`](world-models-and-regulation.fr.md) : leçons du démo CO2 MPC sur la distinction dynamics model vs world model. Pertinent pour le design des agents controllers.
- [`from-single-loop-to-coupled-systems.fr.md`](from-single-loop-to-coupled-systems.fr.md) : positionnement SpikyPanda sur la conception de systèmes couplés multi-sous-systèmes, contexte direct pour HELIOS.
- [`graph-runtime-architecture.md`](graph-runtime-architecture.md) : référence du compute layer existant (ComputeGraph, pipeline ONNX, quantization int8). Base technique pour le runtime CyanMycelium.

---

## Références scientifiques principales

- Sabatier P. & Senderens J.B., 1902, *Comptes Rendus* 134, 514. Découverte de la réaction.
- Mukai et al., publications JAXA sur synthèse de zéolithes à partir de régolithe simulé.
- NASA TM-2007 et publications successives sur ISRU lunaire.
- Hairer & Wanner, *Solving Ordinary Differential Equations I, II*, Springer 1996.
- Brunton & Kutz, *Data-Driven Science and Engineering*, Cambridge 2019 (DMD, Koopman, surrogate models).
- Li et al., *Fourier Neural Operator for Parametric PDEs*, ICLR 2021.
- Chen et al., *Neural Ordinary Differential Equations*, NeurIPS 2018.

---

*Document maintenu en parallèle de l'évolution du projet. Pour les décisions techniques détaillées, voir le design doc associé. Pour la spec exhaustive des agents, voir le manifest.*

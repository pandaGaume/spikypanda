# HELIOS Website - Site copy (FR/EN)

*Contenu rédigé des 6 pages principales du site `helios.iofmars.com`, en français et anglais, prêt à intégrer dans les mockups par le designer. À relire et corriger avant publication.*

---

## Mode d'emploi

Chaque page est présentée en deux versions strictement parallèles (français puis anglais). Les blocs sont identifiés par balise (`[HERO]`, `[SECTION : titre]`, etc.) pour faciliter la mise en correspondance avec les mockups. Les passages entre crochets `[xxx]` sont des notes au designer ou des éléments à confirmer.

Paramètres globaux utilisés :

- URL site : `helios.iofmars.com`
- URL repo : `github.com/iofmars/helios` (org à créer)
- Email contact : `contact@iofmars.com`
- Licence : Apache 2.0

---

## Éléments globaux (header, footer, navigation)

### Header (les deux langues)

```
Logo HELIOS                        Mission · System · Research · Resources · About    [FR | EN]
```

### Footer

**FR**

```
HELIOS est construit sur la pile open source SpikyPanda + CyanMycelium.
Licence Apache 2.0. Repo : github.com/iofmars/helios
Ce site n'utilise aucun tracker, ne dépose aucun cookie tiers, et ne stocke aucune donnée personnelle.
Contact : contact@iofmars.com
```

**EN**

```
HELIOS is built on the SpikyPanda + CyanMycelium open source stack.
Apache 2.0 license. Repo: github.com/iofmars/helios
This site uses no trackers, sets no third-party cookies, and stores no personal data.
Contact: contact@iofmars.com
```

---

## Page : Home (/)

### Version FR

**[HERO]**

```
HELIOS

Simulation et entraînement de boucles support vie autonomes
pour habitats lunaires et martiens.

Un digital twin open source du procédé Sabatier en boucle fermée,
vingt-huit agents distribués, et une couche d'expérience VR/AR
pilotée par LLM pour la formation crise d'équipages.

[Lien discret : Explore le système →]
```

**[VISUEL HERO]** : le PFD HELIOS (`figures/helios-pfd.png`), grande taille, sobre, en surimpression légère le titre et le sous-titre. Pas d'animation.

**[SECTION : Pourquoi HELIOS]**

Les missions habitées de longue durée vers la Lune et Mars exigent une autonomie complète en matière d'air, d'eau et de carburant. Les ECLSS actuels en orbite basse fonctionnent en boucle quasi-ouverte, avec ravitaillement régulier depuis la Terre. Pour Artemis, et a fortiori pour Mars, il faut une vraie boucle fermée : recycler le CO2 expiré pour produire l'oxygène respirable et le méthane carburant, recycler l'eau, et idéalement utiliser les ressources locales.

Les outils de simulation existants se classent en deux familles. La CFD lourde est précise mais lente, non interactive, inutilisable pour de la supervision opérationnelle ou de la formation. Les simulations comportementales simples sont interactives mais pas crédibles physiquement, donc inutilisables pour de la validation.

HELIOS vise le milieu non-occupé : physique compartmentale crédible (jusqu'à la cinétique Arrhenius du Sabatier en niveau 2), agents distribués déployables sur MCU comme dans le système final, et interaction temps réel via VR/AR pour la supervision et l'entraînement.

**[SECTION : Le système en un coup d'œil]**

[Visuel : schéma topologie 3 runtimes, sobre, dans la palette de référence]

Trois environnements connectés par un manifest JSON unique. SpikyPanda pour la conception et l'entraînement des agents. CyanMycelium pour le déploiement matériel sur MCU. CyanMycelium plugin Unreal pour l'expérience VR/AR. Une quatrième couche, orthogonale, pilote les scénarios d'entraînement via un LLM connecté en MCP.

**[SECTION : Capacités principales]**

[4 cards sobres, palette ambre sur noir, icônes monochromes]

**Card 1 : Simulation physique**
> Simulation déterministe d'une boucle Sabatier complète : électrolyse, capture CO2, compression, réaction catalytique, condensation, séparation. Conservation par espèce vérifiée à chaque pas. Solveur ODE adaptatif en niveau 1, montée vers BDF stiff quand la cinétique Arrhenius l'exige.
> [Lien : Détails techniques →]

**Card 2 : Agents distribués**
> Vingt-huit agents autonomes répartis sur les équipements du PFD. Six agents sur le seul réacteur Sabatier, dont un agent de sécurité avec autorité absolue. Backends multiples par agent (formule, règle, ONNX) selon ce qui est physiquement justifié.
> [Lien : Manifest complet →]

**Card 3 : Expérience VR/AR**
> Plugin Unreal Blueprint exposant le système en VR (Meta Quest 3 en phase 1) puis en AR (Apple Vision Pro en phase 2). Instruments research-grade intégrés (NASA-TLX, SAGAT) pour conduire des études utilisateur reproductibles.
> [Lien : Couche expérience →]

**Card 4 : Scenario director LLM**
> Direction de scénarios d'entraînement crise par modèle de langage, via une surface MCP qui valide chaque action avant injection dans la simulation. Le LLM joue le rôle de game master adaptatif, jamais celui de contrôleur ou d'agent safety.
> [Lien : Mécanisme MCP →]

**[SECTION : Positionnement institutionnel]**

HELIOS est conçu pour s'aligner sur les programmes publics de recherche spatiale : NASA ECLSS Forward (roadmap support vie pour Artemis et Mars), NextSTEP (habitats commerciaux cislunaires), Human Research Program (formation équipage et performance), STMD Game Changing Development (in-situ resource utilization), et la prochaine génération de processeurs spaceflight HPSC.

Ces compatibilités sont des caractéristiques de design, pas des engagements contractuels. Toute collaboration formelle passe par les voies institutionnelles normales.

**[SECTION : Open source par construction]**

Code source ouvert dès le premier commit sous licence Apache 2.0. Pas de contenu ITAR. Conçu pour permettre la collaboration internationale, la réutilisation académique, et l'audit indépendant.

[Lien : Repo GitHub →] [Lien : Comment contribuer →]

---

### Version EN

**[HERO]**

```
HELIOS

Simulation and crew training for autonomous life support loops
in lunar and Martian habitats.

An open source digital twin of the closed loop Sabatier process,
twenty-eight distributed agents, and an LLM-directed VR/AR experience
layer for crisis training.

[Discreet link : Explore the system →]
```

**[VISUEL HERO]** : same as FR version.

**[SECTION : Why HELIOS]**

Long-duration crewed missions to the Moon and Mars require complete autonomy in air, water, and propellant. Current ECLSS in low Earth orbit operate as quasi-open loops with regular resupply from Earth. For Artemis, and even more so for Mars, a genuine closed loop is required : recycling exhaled CO2 to produce breathable oxygen and methane propellant, recycling water, and ideally drawing on local resources.

Existing simulation tools split into two families. Heavy CFD is accurate but slow, non-interactive, unsuitable for operational supervision or training. Lightweight behavioral simulations are interactive but not physically credible, so unsuitable for validation.

HELIOS targets the empty middle ground : credible compartmental physics (up to Arrhenius kinetics for Sabatier at fidelity level 2), distributed agents deployable on the same MCUs as in the final system, and real-time interaction via VR/AR for supervision and training.

**[SECTION : The system at a glance]**

[Visual : 3-runtime topology diagram, sober, in the reference palette]

Three connected environments sharing a single JSON manifest. SpikyPanda for agent design and training. CyanMycelium for hardware deployment on MCU. CyanMycelium Unreal plugin for the VR/AR experience. A fourth orthogonal layer drives training scenarios via an LLM connected through MCP.

**[SECTION : Core capabilities]**

[4 sober cards, amber on black, monochrome icons]

**Card 1 : Physical simulation**
> Deterministic simulation of a complete Sabatier closed loop : electrolysis, CO2 capture, compression, catalytic reaction, condensation, separation. Per-species conservation verified at every step. Adaptive ODE solver at level 1, scaling to stiff BDF when Arrhenius kinetics demand it.
> [Link : Technical details →]

**Card 2 : Distributed agents**
> Twenty-eight autonomous agents distributed across the PFD equipment. Six agents on the Sabatier reactor alone, including a safety agent with absolute authority. Multiple backends per agent (formula, rule, ONNX) based on what is physically justified.
> [Link : Full manifest →]

**Card 3 : VR/AR experience**
> Unreal Blueprint plugin exposing the system in VR (Meta Quest 3 in phase 1) then AR (Apple Vision Pro in phase 2). Research-grade instruments integrated (NASA-TLX, SAGAT) for reproducible user studies.
> [Link : Experience layer →]

**Card 4 : LLM scenario director**
> LLM-directed crisis training scenarios via an MCP surface that validates every action before injection into the simulation. The LLM acts as an adaptive game master, never as a controller or safety agent.
> [Link : MCP mechanism →]

**[SECTION : Institutional positioning]**

HELIOS is designed for alignment with public space research programs : NASA ECLSS Forward (life support roadmap for Artemis and Mars), NextSTEP (commercial cislunar habitats), Human Research Program (crew training and performance), STMD Game Changing Development (in-situ resource utilization), and the next generation of HPSC spaceflight processors.

These compatibilities are design characteristics, not contractual engagements. Any formal collaboration goes through standard institutional channels.

**[SECTION : Open source by construction]**

Source code open from the first commit under Apache 2.0 license. No ITAR-controlled content. Designed to enable international collaboration, academic reuse, and independent audit.

[Link : GitHub repo →] [Link : How to contribute →]

---

## Page : Mission (/mission)

### Version FR

**[TITLE]** Mission

**[SUBTITLE]** Pourquoi HELIOS existe et quel problème il résout.

**[SECTION : Le verrou ECLSS pour les missions longue durée]**

Une mission lunaire de 30 jours peut s'accommoder d'un ravitaillement régulier. Une mission martienne de 900 jours ne le peut pas. Le coût de transport d'un kilogramme d'eau ou d'oxygène vers Mars rend toute logistique non-fermée économiquement et techniquement impossible.

Fermer le cycle support vie veut dire trois choses concrètes : recycler l'eau (déjà fait à 90% sur l'ISS, à pousser au-delà de 98%), recycler l'oxygène respiratoire via le cycle carbone (CO2 expiré reconverti en O2), et idéalement produire du carburant pour les mouvements internes et les retours d'échantillons. Le procédé chimique central de cette fermeture est la réaction de Sabatier.

**[SECTION : Le procédé Sabatier]**

Découvert par Paul Sabatier en 1902 (Prix Nobel 1912 pour ses travaux sur l'hydrogénation catalytique), le procédé combine CO2 et hydrogène sur un catalyseur métallique pour produire méthane et eau :

```
CO2 + 4 H2 → CH4 + 2 H2O    ΔH = -165 kJ/mol (exothermique)
```

Couplé à l'électrolyse de l'eau, il ferme le cycle :

```
H2O → H2 + ½ O2          (électrolyse, endothermique)
CO2 + 4 H2 → CH4 + 2 H2O  (Sabatier, exothermique)
```

L'oxygène alimente la respiration de l'équipage. Le méthane devient carburant ou stockage énergie. L'eau retourne au cycle. C'est le procédé que NASA cible pour Mars Sample Return et pour les architectures Mars habitées, sous le programme ECLSS Forward.

[Visuel : schéma simple des deux réactions couplées avec flux entrants et sortants]

**[SECTION : Pourquoi les outils actuels ne suffisent pas]**

Les digital twins ECLSS existants se classent en deux catégories, dont aucune ne couvre ce que le développement opérationnel demande.

La première catégorie est la CFD haute fidélité (ANSYS Fluent, COMSOL, OpenFOAM avec packages cinétiques). Précision excellente pour valider un design d'équipement isolé. Mais une simulation de boucle complète sur 24h prend des heures de calcul sur cluster. Inutilisable pour de l'interaction temps réel, pour de l'entraînement équipage, ou pour explorer rapidement des variantes de design.

La seconde catégorie est la simulation comportementale simple (Simulink, Modelica avec modèles simplifiés). Rapide, interactive, mais pas physiquement crédible : pas de conservation rigoureuse, pas de cinétique réaliste, pas de couplage thermique-chimique correct. Suffisant pour de la pédagogie introductive, pas pour de la validation.

**[SECTION : Ce qu'HELIOS apporte]**

HELIOS occupe le milieu : physique compartmentale crédible (conservation par espèce vérifiée à chaque pas, cinétique Arrhenius pour le Sabatier en niveau 2), exécution temps réel possible (le solveur adaptatif tient des simulations 24h en quelques minutes), agents distribués qui sont identiques entre la simulation et le déploiement matériel final, et interaction VR/AR pour la supervision et la formation.

Le tout open source, sans contenu ITAR, conçu pour être utilisé par des laboratoires académiques et des intégrateurs industriels sans contrainte juridique.

[Lien vers System : Voir l'architecture technique →]

---

### Version EN

**[TITLE]** Mission

**[SUBTITLE]** Why HELIOS exists and what problem it addresses.

**[SECTION : The ECLSS bottleneck for long-duration missions]**

A 30-day lunar mission can rely on regular resupply. A 900-day Mars mission cannot. The cost of transporting one kilogram of water or oxygen to Mars makes any non-closed logistics economically and technically impossible.

Closing the life support loop means three concrete things : recycling water (already at 90% on the ISS, target above 98%), recycling respiratory oxygen via the carbon cycle (exhaled CO2 converted back to O2), and ideally producing propellant for internal movements and sample returns. The central chemical process of this closure is the Sabatier reaction.

**[SECTION : The Sabatier process]**

Discovered by Paul Sabatier in 1902 (Nobel Prize 1912 for his work on catalytic hydrogenation), the process combines CO2 and hydrogen over a metallic catalyst to produce methane and water :

```
CO2 + 4 H2 → CH4 + 2 H2O    ΔH = -165 kJ/mol (exothermic)
```

Coupled with water electrolysis, it closes the loop :

```
H2O → H2 + ½ O2          (electrolysis, endothermic)
CO2 + 4 H2 → CH4 + 2 H2O  (Sabatier, exothermic)
```

Oxygen feeds crew respiration. Methane becomes propellant or energy storage. Water returns to the cycle. This is the process NASA targets for Mars Sample Return and for crewed Mars architectures, under the ECLSS Forward program.

[Visual : simple schematic of the two coupled reactions with input and output streams]

**[SECTION : Why current tools fall short]**

Existing ECLSS digital twins fall into two categories, neither of which covers what operational development requires.

The first category is high-fidelity CFD (ANSYS Fluent, COMSOL, OpenFOAM with kinetics packages). Excellent accuracy for validating individual equipment designs. But a full-loop simulation over 24 hours takes hours of cluster compute time. Unusable for real-time interaction, crew training, or rapid exploration of design variants.

The second category is simple behavioral simulation (Simulink, Modelica with simplified models). Fast, interactive, but not physically credible : no rigorous conservation, no realistic kinetics, no proper thermal-chemical coupling. Sufficient for introductory pedagogy, not for validation.

**[SECTION : What HELIOS brings]**

HELIOS occupies the middle ground : credible compartmental physics (per-species conservation verified at every step, Arrhenius kinetics for Sabatier at fidelity level 2), real-time execution possible (the adaptive solver handles 24-hour simulations in minutes), distributed agents identical between simulation and final hardware deployment, and VR/AR interaction for supervision and training.

All open source, no ITAR-controlled content, designed to be used by academic laboratories and industrial integrators without legal constraints.

[Link to System : See the technical architecture →]

---

## Page : System (/system)

### Version FR

**[TITLE]** System

**[SUBTITLE]** L'architecture technique de HELIOS, par couche.

**[SECTION : Le procédé physique]**

[Visuel : `figures/helios-pfd.png` en très grand]

HELIOS modélise une boucle CO2 vers CH4 complète à travers dix unités opératoires reliées par treize tags d'équipement. Les flux entre unités portent une composition multi-espèces (H2O, H2, O2, CO2, CH4, N2) avec température et pression, pas un simple scalaire de débit.

Le graphe est intrinsèquement cyclique. Le condensat eau du knockout V-701 retourne à la purification W-101. Les gaz non convertis (H2 et CO2) du séparateur V-801 retournent au mélangeur M-501 pour un passage supplémentaire dans le réacteur Sabatier R-601. Plus la chaîne de récupération thermique qui boucle la chaleur du réacteur vers l'électrolyseur. Quatre boucles physiques distinctes, toutes à respecter pour que le bilan ferme.

[Tableau des équipements, mêmes 13 lignes que dans le project overview]

**[SECTION : Boucles de conservation]**

Quatre invariants doivent être maintenus à chaque pas de simulation pour que le système reste physiquement cohérent.

Le bilan de masse par espèce est l'invariant le plus fondamental : pour chaque espèce chimique, ce qui entre dans le système moins ce qui sort moins ce qui s'accumule doit être nul à la précision numérique. Une dérive de 0.1% par heure sur le bilan H2O signale un bug, pas une approximation acceptable.

Le bilan énergétique global suit. La chaleur produite par le Sabatier exothermique, l'énergie consommée par l'électrolyse endothermique, et les pertes thermiques par les parois doivent s'équilibrer aux fuites près que tu déclares explicitement.

Pour la variante ISRU (zéolithe lunaire + nickel recyclable), l'inventaire de nickel devient un troisième invariant : tout le Ni présent dans le système (actif sur le catalyseur, en synthèse, en recyclage, ou perdu) doit rester constant. C'est un test d'intégrité gratuit qui détecte instantanément toute fuite.

Le quatrième invariant est plus opérationnel que physique : la pureté O2 vers habitat doit rester dans la fenêtre 21-30%. C'est une contrainte de sécurité dont la violation déclenche le scénario d'urgence.

**[SECTION : Framework de simulation ISimGraph v2]**

[Lien discret : Design doc complet pour ISimGraph v2 →]

Les nœuds du graphe sont stateful. Chaque nœud porte un état interne explicite et expose une fonction `rhs(t, state, inputs) → dstate_dt`. La composition est fractale : `ISimGraph extends ISimNode`, donc un sous-graphe complet (la variante ISRU par exemple) s'insère comme un nœud dans un graphe parent sans plomberie spécifique.

Les ports sont typés. Les ports observation et action sont séparés du flux physique, ce qui garantit que les agents n'altèrent jamais directement l'état physique, seulement via leur port d'action consommé par le `rhs` au pas suivant.

Le solveur est abstrait derrière une interface `ISolver`. RK4 adaptatif maison (Cash-Karp / Dormand-Prince) pour démarrer, montée vers Boost.odeint (Rosenbrock4 stiff) quand la cinétique Arrhenius rend le système raide, et SUNDIALS (BDF, IDA) si on passe en DAE acausal.

Quatre niveaux de fidélité explicites, du gain statique au DAE complet avec thermo Peng-Robinson. Le démarrage se fait délibérément en niveau 1.

**[SECTION : Agents distribués]**

[Lien discret : Manifest complet des 28 agents →]

Vingt-huit agents autonomes répartis sur les équipements du PFD. La répartition suit la criticité, pas la complexité d'équipement.

Le réacteur Sabatier R-601 concentre six agents parce qu'il est le nœud le plus critique du système : R601-THERMAL-REGULATION surveille le profil thermique axial du lit catalytique, R601-HEAT-RECOVERY optimise la récupération de chaleur vers l'électrolyseur, R601-CATALYST-HEALTH estime l'activité résiduelle, R601-CONVERSION-EFFICIENCY mesure le rendement temps réel, R601-RUNAWAY-PREVENTION agit en agent de sécurité avec autorité absolue, R601-RECYCLE-BALANCE surveille la boucle des gaz non convertis.

Trois agents cross-nœuds tournent en supervision globale : LOOP-MASS-BALANCE et LOOP-ENERGY-BALANCE implémentent les invariants de conservation, THERMAL-CHAIN surveille la chaîne de récupération thermique.

Le schéma manifest distingue quatre natures d'agents : observers (pure fonction d'observation), advisors (recommandations pour humain ou autre agent), controllers (action directe sur un actuateur), safety (autorité supérieure pouvant overrider les autres). Les conflits entre agents sur un même actuateur sont résolus par un arbitrator configurable (priority, blend, vote).

Et tout n'est pas du machine learning. Pour certains agents (E201-EFFICIENCY = formule de Faraday, M501-STOICHIO-RATIO = division simple), une formule déterministe ou une règle métier est plus appropriée qu'un NN. Le manifest supporte plusieurs backends (formula, rule, ONNX) pour éviter le ML inutile et améliorer l'auditabilité.

**[SECTION : Topologie de déploiement]**

[Visuel : schéma 3 runtimes avec connexions, dans la palette de référence]

HELIOS cible un déploiement à trois runtimes, un seul format portable entre les trois.

SpikyPanda est l'environnement de design et d'entraînement. SimGraph complet avec solveur ODE, outils spectraux (analyse modale, DMD), pipeline d'entraînement des agents, validation par solveur de référence. Génère les artefacts de déploiement (ONNX quantisés + manifest JSON).

CyanMycelium MCU est la cible matérielle physique. Inférence ONNX quantisée int8, footprint typique 50-300 KB par MCU pour tous les agents d'un équipement. Cibles défauts STM32H7 et ESP32-S3. Code C++14 portable, prêt pour migration HPSC (RISC-V multicore avec accélérateur ML intégré) quand le matériel devient accessible.

CyanMycelium plugin Unreal est la cible démonstrative et études utilisateur. Plugin Unreal Engine 5 avec surface Blueprint riche, chaque type d'agent et port exposé comme nœud Blueprint sans écrire de C++. Le SimGraph C++ minimal tourne derrière, Unreal lit l'état via tick et s'occupe de la 3D et de l'interaction.

Les runtimes déployés remontent leurs observations vers SpikyPanda via MQTT pour monitoring, replay et retraining.

**[SECTION : Couche expérience VR/AR]**

Pour la supervision opérationnelle et la formation équipage, HELIOS intègre une couche immersive en deux phases.

La phase 1 cible Meta Quest 3 en immersion VR totale. Visualisation 3D du PFD avec animations de flux, indicateurs d'état par équipement, HUD avec les 28 agents en temps réel, bibliothèque de scénarios scriptables. Usage : démonstrations, formations groupées, présentations programmatiques.

La phase 2 cible Apple Vision Pro en AR opérationnelle. Superposition sur l'environnement physique réel ou maquette, interaction multi-modale (voice, gesture, gaze). Usage : équipage devant le vrai équipement, formation procédurale haute fidélité.

La couche est conçue research-grade. Logging des interactions utilisateur (gestes, fixations oculaires, commandes vocales, latences) au format compatible avec les outils d'analyse user research. Instruments NASA-TLX (Task Load Index) et SAGAT (Situation Awareness Global Assessment Technique) intégrés en outils natifs. Pipeline de collecte IRB-ready (consent forms, anonymisation, opt-out).

**[SECTION : Direction de scénario LLM via MCP]**

Une formation à la gestion de crise demande des scénarios qui restent imprévisibles après quelques sessions. Une vingtaine de scripts à la main suffit pour un cycle, pas pour un programme continu. HELIOS confie cette tâche à un modèle de langage qui pilote la simulation via une surface MCP dédiée.

Le LLM décide en termes narratifs (« simuler une dégradation catalyseur progressive sur 72h pendant le shift de nuit »), et l'adapter MCP traduit ces intentions en modifications cohérentes du SimGraph (ajustement paramètres R-601, drift sur sondes concernées, événements communication avec latence Mars 22 minutes). Toute action LLM passe par une validation préalable, ce qui garantit que la simulation reste physiquement cohérente même quand le LLM improvise.

La surface MCP couvre l'injection de perturbations, les objectifs dynamiques, les communications simulées entre équipage et sol, la lecture des actions équipage et des états des agents observers, l'ajustement de difficulté, et un mécanisme snapshot/restore pour rejouer un scénario depuis un point précis.

À la fin d'une session, le LLM produit un debrief automatique pointant les décisions prises, les signaux ignorés, et les alternatives qui auraient été envisageables. Ce debrief ne remplace pas un instructeur humain expérimenté mais rend possible une rétroaction par session même quand aucun instructeur n'est disponible.

Le LLM est explicitement exclu de trois boucles : l'intégration physique du SimGraph, les agents safety qui ont autorité sur des actuateurs réels, et la fermeture en temps réel d'une action sur un système déployé. La frontière passe entre « simuler l'environnement de décision » et « prendre la décision technique à la place du système ».

---

### Version EN

**[TITLE]** System

**[SUBTITLE]** HELIOS technical architecture, by layer.

**[SECTION : The physical process]**

[Visual : `figures/helios-pfd.png` very large]

HELIOS models a complete CO2 to CH4 loop across ten unit operations linked by thirteen equipment tags. Streams between units carry multi-species composition (H2O, H2, O2, CO2, CH4, N2) with temperature and pressure, not a simple scalar flow rate.

The graph is intrinsically cyclic. Water condensate from knockout V-701 returns to purification W-101. Unconverted gases (H2 and CO2) from separator V-801 return to mixer M-501 for another pass through Sabatier reactor R-601. Plus the heat recovery chain that loops reactor heat back to the electrolyzer. Four distinct physical loops, all to be respected for the balance to close.

[Equipment table, same 13 rows as in project overview]

**[SECTION : Conservation loops]**

Four invariants must hold at every simulation step for the system to remain physically coherent.

Per-species mass balance is the most fundamental : for each chemical species, what enters the system minus what leaves minus what accumulates must be zero to numerical precision. A 0.1% per hour drift on the H2O balance signals a bug, not acceptable approximation.

Global energy balance follows. Heat produced by exothermic Sabatier, energy consumed by endothermic electrolysis, and thermal losses through walls must balance to the leaks you explicitly declare.

For the ISRU variant (lunar zeolite + recyclable nickel), nickel inventory becomes a third invariant : all Ni present in the system (active on catalyst, in synthesis, in recycling, or lost) must remain constant. A free integrity test that instantly detects any leak.

The fourth invariant is more operational than physical : O2 purity to habitat must stay in the 21-30% window. A safety constraint whose violation triggers the emergency scenario.

**[SECTION : ISimGraph v2 simulation framework]**

[Discreet link : Full ISimGraph v2 design doc →]

Graph nodes are stateful. Each node carries explicit internal state and exposes a function `rhs(t, state, inputs) → dstate_dt`. Composition is fractal : `ISimGraph extends ISimNode`, so a complete subgraph (the ISRU variant for example) plugs into a parent graph as a single node, no special plumbing.

Ports are typed. Observation and action ports are separated from the physical flow, which guarantees that agents never alter physical state directly, only via their action port consumed by `rhs` at the next step.

The solver is abstracted behind an `ISolver` interface. Adaptive RK4 in-house (Cash-Karp / Dormand-Prince) to start, scaling to Boost.odeint (Rosenbrock4 stiff) when Arrhenius kinetics make the system stiff, and SUNDIALS (BDF, IDA) if moving to acausal DAE.

Four explicit fidelity levels, from static gain to full DAE with Peng-Robinson thermodynamics. Startup is deliberately at level 1.

**[SECTION : Distributed agents]**

[Discreet link : Full 28-agent manifest →]

Twenty-eight autonomous agents distributed across PFD equipment. Distribution follows criticality, not equipment complexity.

The Sabatier reactor R-601 concentrates six agents because it is the most critical node : R601-THERMAL-REGULATION monitors the axial thermal profile of the catalyst bed, R601-HEAT-RECOVERY optimizes heat recovery to the electrolyzer, R601-CATALYST-HEALTH estimates residual activity, R601-CONVERSION-EFFICIENCY measures real-time yield, R601-RUNAWAY-PREVENTION acts as safety agent with absolute authority, R601-RECYCLE-BALANCE watches the unconverted gas loop.

Three cross-node agents run global supervision : LOOP-MASS-BALANCE and LOOP-ENERGY-BALANCE implement conservation invariants, THERMAL-CHAIN watches the heat recovery chain.

The manifest schema distinguishes four agent kinds : observers (pure observation function), advisors (recommendations for human or other agent), controllers (direct action on an actuator), safety (higher authority, can override others). Conflicts between agents on the same actuator are resolved by a configurable arbitrator (priority, blend, vote).

And not everything is machine learning. For some agents (E201-EFFICIENCY = Faraday formula, M501-STOICHIO-RATIO = simple division), a deterministic formula or business rule is more appropriate than an NN. The manifest supports multiple backends (formula, rule, ONNX) to avoid unnecessary ML and improve auditability.

**[SECTION : Deployment topology]**

[Visual : 3-runtime diagram with connections, in reference palette]

HELIOS targets a three-runtime deployment, with a single portable format across all three.

SpikyPanda is the design and training environment. Full SimGraph with ODE solver, spectral tools (modal analysis, DMD), agent training pipeline, validation against reference solver. Generates deployment artifacts (quantized ONNX + JSON manifest).

CyanMycelium MCU is the physical hardware target. Quantized int8 ONNX inference, typical footprint 50-300 KB per MCU for all agents on one equipment. Default targets STM32H7 and ESP32-S3. Portable C++14 code, ready for HPSC migration (RISC-V multicore with integrated ML accelerator) when the hardware becomes accessible.

CyanMycelium Unreal plugin is the demonstrative and user study target. Unreal Engine 5 plugin with rich Blueprint surface, every agent type and port exposed as a Blueprint node without writing C++. The minimal SimGraph C++ runs behind, Unreal reads state via tick and handles 3D and interaction.

Deployed runtimes send their observations back to SpikyPanda via MQTT for monitoring, replay, and retraining.

**[SECTION : VR/AR experience layer]**

For operational supervision and crew training, HELIOS integrates an immersive layer in two phases.

Phase 1 targets Meta Quest 3 in full VR immersion. 3D visualization of the PFD with flow animations, equipment status indicators, HUD with the 28 agents in real time, scriptable scenario library. Use case : demonstrations, group training, programmatic presentations.

Phase 2 targets Apple Vision Pro in operational AR. Overlay on real physical environment or mockup, multi-modal interaction (voice, gesture, gaze). Use case : crew in front of real equipment, high-fidelity procedural training.

The layer is designed research-grade. User interaction logging (gestures, eye fixations, voice commands, latencies) in formats compatible with user research analysis tools. NASA-TLX (Task Load Index) and SAGAT (Situation Awareness Global Assessment Technique) instruments integrated as native tools. IRB-ready collection pipeline (consent forms, anonymization, opt-out).

**[SECTION : LLM scenario director via MCP]**

Crisis training requires scenarios that remain unpredictable after a few sessions. Twenty hand-written scripts suffice for one cycle, not for a continuous program. HELIOS delegates this task to a language model that drives the simulation through a dedicated MCP surface.

The LLM decides in narrative terms (« simulate a progressive catalyst degradation over 72h during the night shift »), and the MCP adapter translates these intentions into coherent SimGraph modifications (R-601 parameter adjustments, drift on relevant probes, communication events with 22-minute Mars latency). Every LLM action goes through prior validation, ensuring that simulation remains physically coherent even when the LLM improvises.

The MCP surface covers perturbation injection, dynamic objectives, simulated crew-ground communications, reading crew actions and observer agent states, difficulty adjustment, and a snapshot/restore mechanism to replay a scenario from a specific point.

At session end, the LLM produces an automatic debrief pointing out decisions made, signals ignored, and alternatives that would have been viable. This debrief does not replace an experienced human instructor but makes per-session feedback possible even when no instructor is available.

The LLM is explicitly excluded from three loops : SimGraph physical integration, safety agents with authority over real actuators, and real-time closure of an action on a deployed system. The boundary lies between « simulating the decision environment » and « taking the technical decision in place of the system ».

---

## Page : Research (/research)

### Version FR

**[TITLE]** Research

**[SUBTITLE]** Plateforme de recherche ouverte, conçue pour la collaboration académique et institutionnelle.

**[SECTION : Plateforme de recherche ouverte]**

HELIOS est conçu comme une plateforme de recherche, pas comme un produit fermé. Trois décisions prises avant le premier commit pour que cette posture tienne dans le temps.

Open source dès le premier commit sous licence Apache 2.0. Permissive, compatible commercial et académique, pas de période propriétaire « le temps de stabiliser ».

Instrumentation pour la réutilisation académique : reproductibilité par graine RNG, logging structuré horodaté (JSON Lines), capacité de replay bit-à-bit, métriques exposées (conservation, stiffness, taux d'inférence, latence), configurations de référence versionnées pour comparer les résultats entre publications.

Zéro contenu ITAR par construction. Le PFD ECLSS et le réacteur Sabatier sont des procédés industriels civils non couverts. Cette posture préserve la possibilité pour des contributeurs internationaux de travailler sur le projet et la possibilité d'héberger sur GitHub public.

**[SECTION : Angles de recherche supportés]**

La plateforme rend possible plusieurs directions de recherche. Liste non exhaustive de ce qu'un laboratoire peut faire avec HELIOS comme cadre :

Arbitrage entre agents distribués sur systèmes safety-critical. Le cas R-601 avec six agents indépendants pose un problème formel d'arbitrage hiérarchique avec garanties de sécurité, prouvable par model checking.

Surrogate models physics-informed pour ECLSS. Construire des NN qui respectent strictement les invariants de conservation sur horizons de mission longue durée, avec architectures contraintes type Hamiltonian NN ou projection layers.

Adaptive autonomy pour vieillissement système. Apprentissage en ligne pour les agents qui doivent s'adapter à la dégradation lente (catalyseur, filtres, capteurs) sans intervention humaine.

Human-AI collaboration en supervision spatiale. Comment l'équipage supervise et intervient sur des systèmes autonomes via interfaces AR, transparence des décisions agents, mixed-initiative control.

Spatial cognition pour systèmes cyber-physiques distribués. Comment le layout d'un habitat affecte la compréhension équipage et l'intervention sur les systèmes autonomes intégrés.

Mission-time digital twins comme outils unifiés de design et d'opérations. Un même digital twin servant à concevoir l'habitat (architecture) et à l'opérer (control), avec workflow design-to-operations validé.

Ces angles ne sont pas pré-décidés. Ils sont rendus possibles par la plateforme. Le choix appartient à chaque équipe de recherche.

**[SECTION : Compatibilité programmes NASA]**

HELIOS est aligné par design avec plusieurs programmes de recherche spatiale publics. Ces alignements sont des choix de conception, pas des engagements contractuels actuels.

**NASA ECLSS Forward** : roadmap support vie pour Artemis et Mars. Le PFD CO2 vers CH4 est directement dans le scope.

**NextSTEP** (Next Space Technologies for Exploration Partnerships) : habitats commerciaux cislunaires. La couche VR/AR combinée à l'ECLSS coche les attentes du programme.

**HRP** (Human Research Program) : santé et performance équipage, mission ops training. L'interface AR/VR et le scenario director LLM sont des cas d'usage HRP directs.

**STMD Game Changing Development** : technologies en maturation. La variante ISRU (zéolithe lunaire + nickel recyclable) y trouve sa place.

**HPSC** (High Performance Spaceflight Computing) : prochaine génération de processeur spaceflight, RISC-V multicore avec accélérateur ML, production silicon attendue 2026-2027. CyanMycelium est conçu portable pour cette cible.

**[SECTION : Comment collaborer]**

Plusieurs voies sont possibles, selon le contexte institutionnel du partenaire.

Pour les universités et laboratoires académiques : collaborative research agreement formelle, ou simple usage open source du code + citation. HELIOS peut servir de plateforme commune pour des projets multi-institutions.

Pour les industriels aerospace : utilisation directe du repo, contribution de modules spécifiques (modèles d'équipement, scénarios), ou intégration dans des proposals communs à NASA / ESA / JAXA.

Pour les contributeurs individuels : pull requests sur le repo, issues GitHub, propositions de scénarios d'entraînement.

Contact direct : [contact@iofmars.com](mailto:contact@iofmars.com)

---

### Version EN

**[TITLE]** Research

**[SUBTITLE]** Open research platform, designed for academic and institutional collaboration.

**[SECTION : Open research platform]**

HELIOS is designed as a research platform, not a closed product. Three decisions made before the first commit to make this stance hold over time.

Open source from the first commit under Apache 2.0. Permissive, compatible with commercial and academic use, no proprietary period « while we stabilize ».

Instrumentation for academic reuse : RNG seed reproducibility, structured timestamped logging (JSON Lines), bit-exact replay capability, exposed metrics (conservation, stiffness, inference throughput, latency), versioned reference configurations for comparing results across publications.

Zero ITAR-controlled content by construction. The ECLSS PFD and Sabatier reactor are civilian industrial processes not covered by ITAR. This posture preserves the ability for international contributors to work on the project and the ability to host on public GitHub.

**[SECTION : Supported research directions]**

The platform enables several research directions. A non-exhaustive list of what a laboratory can do with HELIOS as a framework :

Arbitration between distributed agents on safety-critical systems. The R-601 case with six independent agents poses a formal hierarchical arbitration problem with provable safety properties via model checking.

Physics-informed surrogate models for ECLSS. Building NNs that strictly respect conservation invariants over long mission horizons, with constrained architectures like Hamiltonian NN or projection layers.

Adaptive autonomy for system aging. Online learning for agents that must adapt to slow degradation (catalyst, filters, sensors) without human intervention.

Human-AI collaboration in space supervision. How crew supervise and intervene on autonomous systems via AR interfaces, agent decision transparency, mixed-initiative control.

Spatial cognition for distributed cyber-physical systems. How habitat layout affects crew understanding and intervention on integrated autonomous systems.

Mission-time digital twins as unified design and operations tools. A single digital twin serving both habitat design (architecture) and operation (control), with validated design-to-operations workflow.

These directions are not pre-decided. They are made possible by the platform. The choice belongs to each research team.

**[SECTION : NASA program compatibility]**

HELIOS aligns by design with several public space research programs. These alignments are design choices, not current contractual engagements.

**NASA ECLSS Forward** : life support roadmap for Artemis and Mars. The CO2 to CH4 PFD is directly in scope.

**NextSTEP** (Next Space Technologies for Exploration Partnerships) : commercial cislunar habitats. The VR/AR layer combined with ECLSS matches program expectations.

**HRP** (Human Research Program) : crew health and performance, mission ops training. The AR/VR interface and LLM scenario director are direct HRP use cases.

**STMD Game Changing Development** : maturing technologies. The ISRU variant (lunar zeolite + recyclable nickel) fits this scope.

**HPSC** (High Performance Spaceflight Computing) : next generation spaceflight processor, RISC-V multicore with ML accelerator, production silicon expected 2026-2027. CyanMycelium is designed portable for this target.

**[SECTION : How to collaborate]**

Several paths are possible, depending on the partner's institutional context.

For universities and academic laboratories : formal collaborative research agreement, or simple open source use of the code with citation. HELIOS can serve as a common platform for multi-institution projects.

For aerospace industry : direct use of the repo, contribution of specific modules (equipment models, scenarios), or integration into joint proposals to NASA / ESA / JAXA.

For individual contributors : pull requests on the repo, GitHub issues, scenario proposals for training.

Direct contact : [contact@iofmars.com](mailto:contact@iofmars.com)

---

## Page : Resources (/resources)

### Version FR

**[TITLE]** Resources

**[SUBTITLE]** Documentation, code, publications et matériel à télécharger.

**[SECTION : Documentation]**

Documents principaux de la plateforme, maintenus dans le repo et synchronisés avec le code.

- [**HELIOS Project Overview**](https://github.com/iofmars/helios/blob/main/docs/architecture/helios-project-overview.fr.md) : fiche projet complète, contexte, architecture, roadmap.
- [**ISimGraph v2 Design**](https://github.com/iofmars/helios/blob/main/docs/architecture/isimgraph-v2-notes.fr.md) : design détaillé du framework de simulation, stratégie solveur, outils spectraux.
- [**Agent Manifest**](https://github.com/iofmars/helios/blob/main/docs/architecture/helios-agent-manifest-v1.fr.md) : spec des 28 agents (inputs, outputs, roles, criticité).
- [**Glossaire technique**](https://github.com/iofmars/helios/blob/main/docs/architecture/isimgraph-v2-notes.fr.md#glossaire) : tous les acronymes et termes (PFD, ISRU, ECLSS, MCP, BDF, DMD, Koopman, etc.).

**[SECTION : Code]**

Repo GitHub : [github.com/iofmars/helios](https://github.com/iofmars/helios)

Licence : Apache 2.0
Langages principaux : TypeScript (SpikyPanda), C++ (CyanMycelium kernel), Blueprint (Unreal plugin)
Cibles de déploiement : STM32H7, ESP32-S3 (production), HPSC RISC-V (roadmap 2026-2027), Meta Quest 3 (phase 1 VR), Apple Vision Pro (phase 2 AR)

[Badge build status] [Badge license] [Badge contributors]

**[SECTION : Publications]**

Papiers en préparation. Cette section sera mise à jour à mesure que des publications sortent.

**[SECTION : Présentations]**

Slides et matériel pour talks publics, à venir.

**[SECTION : Datasets et scénarios]**

Configurations de référence du PFD HELIOS et bibliothèque initiale de scénarios d'entraînement seront publiées avec la première release du runtime.

---

### Version EN

**[TITLE]** Resources

**[SUBTITLE]** Documentation, code, publications, and downloadable materials.

**[SECTION : Documentation]**

Primary platform documents, maintained in the repo and synced with the code.

- [**HELIOS Project Overview**](https://github.com/iofmars/helios/blob/main/docs/architecture/helios-project-overview.fr.md) : complete project sheet, context, architecture, roadmap.
- [**ISimGraph v2 Design**](https://github.com/iofmars/helios/blob/main/docs/architecture/isimgraph-v2-notes.fr.md) : detailed simulation framework design, solver strategy, spectral tools.
- [**Agent Manifest**](https://github.com/iofmars/helios/blob/main/docs/architecture/helios-agent-manifest-v1.fr.md) : 28-agent spec (inputs, outputs, roles, criticality).
- [**Technical glossary**](https://github.com/iofmars/helios/blob/main/docs/architecture/isimgraph-v2-notes.fr.md#glossaire) : all acronyms and terms (PFD, ISRU, ECLSS, MCP, BDF, DMD, Koopman, etc.).

**[SECTION : Code]**

GitHub repo : [github.com/iofmars/helios](https://github.com/iofmars/helios)

License : Apache 2.0
Primary languages : TypeScript (SpikyPanda), C++ (CyanMycelium kernel), Blueprint (Unreal plugin)
Deployment targets : STM32H7, ESP32-S3 (production), HPSC RISC-V (2026-2027 roadmap), Meta Quest 3 (phase 1 VR), Apple Vision Pro (phase 2 AR)

[Build status badge] [License badge] [Contributors badge]

**[SECTION : Publications]**

Papers in preparation. This section will be updated as publications come out.

**[SECTION : Presentations]**

Slides and materials for public talks, to come.

**[SECTION : Datasets and scenarios]**

HELIOS PFD reference configurations and initial training scenario library will be published with the first runtime release.

---

## Page : About (/about)

### Version FR

**[TITLE]** About

**[SUBTITLE]** Le projet, la pile technique, et comment entrer en contact.

**[SECTION : Le projet]**

HELIOS est un projet de recherche ouvert sur les systèmes de support vie autonomes pour habitats spatiaux. Le projet vise à fournir une plateforme commune (simulation + agents + interaction VR/AR) que des laboratoires académiques et des intégrateurs industriels peuvent réutiliser et étendre sans contrainte juridique.

Le projet n'est pas une entreprise commerciale et n'a pas de modèle de revenu direct. Il est positionné comme contribution à l'écosystème de recherche aerospace, avec une philosophie de facilitation : fournir des outils, ne pas chercher à exploiter contractuellement les usages qui en sont faits.

**[SECTION : Pile technique]**

HELIOS est construit sur deux briques open source pré-existantes :

[**SpikyPanda**](https://github.com/spikypanda) est le framework de conception de graphes de calcul et de simulation. ComputeGraph pour les modèles ML, graphes de simulation pour les systèmes physiques, pipeline d'export ONNX vers cibles edge.

[**CyanMycelium**](https://github.com/cyanmycelium) est le runtime d'inférence ONNX portable, optimisé pour cibles embarquées (MCU, accélérateurs ML embarqués). C'est le runtime commun entre la simulation, le déploiement MCU et le plugin Unreal.

HELIOS ajoute par-dessus ces briques : le framework ISimGraph v2 (simulation par graphe à composition fractale), l'application PFD CO2 vers CH4 et son manifest d'agents, le plugin Unreal Blueprint, et la couche MCP scenario director.

**[SECTION : Contributors]**

Liste des contributeurs au projet. [À remplir au fil du temps. Pour le moment : section vide ou mention « Project initiated by [SpikyPanda](https://github.com/spikypanda). Contributors welcome via GitHub. »]

**[SECTION : Contact]**

Pour toute question, proposition de collaboration, ou retour sur la plateforme :

[contact@iofmars.com](mailto:contact@iofmars.com)

Les contributions techniques se font directement via le repo GitHub (issues, pull requests, discussions).

---

### Version EN

**[TITLE]** About

**[SUBTITLE]** The project, the technical stack, and how to get in touch.

**[SECTION : The project]**

HELIOS is an open research project on autonomous life support systems for space habitats. The project aims to provide a common platform (simulation + agents + VR/AR interaction) that academic laboratories and industrial integrators can reuse and extend without legal constraints.

The project is not a commercial venture and has no direct revenue model. It is positioned as a contribution to the aerospace research ecosystem, with a facilitation philosophy : provide tools, do not seek to contractually capture the uses made of them.

**[SECTION : Technical stack]**

HELIOS is built on two pre-existing open source bricks :

[**SpikyPanda**](https://github.com/spikypanda) is the design framework for compute and simulation graphs. ComputeGraph for ML models, simulation graphs for physical systems, ONNX export pipeline to edge targets.

[**CyanMycelium**](https://github.com/cyanmycelium) is the portable ONNX inference runtime, optimized for embedded targets (MCU, embedded ML accelerators). It is the common runtime across simulation, MCU deployment, and the Unreal plugin.

HELIOS adds on top of these bricks : the ISimGraph v2 framework (fractal composition simulation graph), the CO2 to CH4 PFD application and its agent manifest, the Unreal Blueprint plugin, and the MCP scenario director layer.

**[SECTION : Contributors]**

List of project contributors. [To be filled over time. For now : empty section or mention « Project initiated by [SpikyPanda](https://github.com/spikypanda). Contributors welcome via GitHub. »]

**[SECTION : Contact]**

For any question, collaboration proposal, or feedback on the platform :

[contact@iofmars.com](mailto:contact@iofmars.com)

Technical contributions happen directly via the GitHub repo (issues, pull requests, discussions).

---

## Notes pour le designer

### Hiérarchie typographique attendue

- H1 (titre de page) : utilisé une fois par page, dans le hero.
- H2 (section principale) : un par bloc [SECTION : ...].
- H3 : pour les sous-sections quand utiles (rare).
- Corps : largeur de ligne 60-75 caractères, pas plus.

### Liens internes

Le pattern « [Lien : Détails techniques →] » indique un lien interne vers une autre page du site (typiquement /system pour les détails techniques, /research pour les angles de recherche, /resources pour la documentation). Le designer choisit la mise en forme (texte simple, bouton discret, lien avec chevron).

### Visuels mentionnés

- Le PFD : `figures/helios-pfd.png` (fourni)
- Schéma topologie 3 runtimes : à produire, ASCII actuellement dans le project overview, à transformer en schéma vectoriel sobre.
- Schéma réactions Sabatier + électrolyse : à produire, simple, deux boîtes et des flèches.
- Schéma 28 agents en overlay sur le PFD : optionnel pour V1, fort impact visuel si fait.

### Contenu manquant à compléter ultérieurement

- Section Publications (vide jusqu'aux premiers papiers).
- Section Présentations (vide jusqu'aux premiers talks).
- Section Datasets et scénarios (vide jusqu'à la première release).
- Section Contributors (commence vide ou mention initiale).

### Décisions à valider

- Mention exacte de SpikyPanda dans le footer : actuellement « built on SpikyPanda + CyanMycelium open source stack ». À confirmer.
- Forme de la section Contributors initiale : vide, ou mention « Project initiated by SpikyPanda » ?
- Repo URL définitif : `github.com/iofmars/helios` proposé, dépend de la création de l'org iofmars.

---

*Document de contenu site, à relire et corriger avant intégration finale. Toute modification doit être reflétée à l'identique dans les deux langues.*

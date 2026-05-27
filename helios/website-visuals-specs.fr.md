# HELIOS Website - Specs visuels complémentaires

*Spécifications détaillées des visuels à produire pour le site HELIOS, complémentaires au PFD principal déjà disponible (`figures/pfd.png`). Chaque visuel est documenté avec son objectif, son style, son contenu, ses dimensions, un prompt pour Claude design ou outil IA équivalent, et un brief pour illustrateur humain. Cohérent avec le brief site web (`website-brief.fr.md`).*

---

## Charte visuelle commune à tous les visuels

Cette charte s'applique à tous les diagrammes produits pour le site. Elle reprend les décisions du brief site web.

### Palette stricte

```
Fond sombre (défaut)
  background       #0A0A0F    (noir très profond, légèrement bleuté)
  surface          #14141C    (surfaces légèrement remontées)
  text-primary     #F0F0F5    (blanc cassé pour le texte principal)
  text-secondary   #8A8A9A    (gris moyen pour labels secondaires)
  accent-primary   #E8762D    (ambre chaud, unique highlight)
  accent-ok        #5A8B5A    (vert sodium désaturé, états nominaux)
  accent-warn      #B84A3C    (rouge brique désaturé, alertes)
  rule-line        #2A2A35    (gris pour traits techniques)

Fond clair (variante optionnelle, mêmes valeurs inversées en luminance)
  background       #F5F5F0
  surface          #EAEAE5
  text-primary     #14141C
  text-secondary   #5A5A6A
  accent-primary   #C85A20    (ambre plus saturé sur fond clair)
  accent-ok        #4A7B4A
  accent-warn      #983A2C
  rule-line        #CACAD5
```

Pas de gradient. Pas de transparence inutile (max 80% opacity sur des éléments rares pour la profondeur). Couleurs plates.

### Typographie

- Labels et titres : sans-serif moderne type **IBM Plex Sans** ou **Söhne**.
- Codes équipement, formules, données : mono type **IBM Plex Mono** ou **JetBrains Mono**.
- Tailles minimum : 11pt pour labels secondaires, 13pt pour labels principaux, 16pt+ pour titres dans le diagramme.

### Style des traits et formes

- Traits techniques : épaisseur 1.5px pour les lignes principales, 1px pour les secondaires.
- Coins : légèrement arrondis (radius 4px max) ou strictement droits. Pas de pill shapes (capsules très arrondies = startup signal).
- Flèches : style technique, têtes de flèche fines (pas d'emoji-arrow), longueur tête 8px.
- Pas d'ombre portée. Pas de glow. Pas de bevel.

### Format de livraison

- **SVG vectoriel** comme format principal. Permet zoom infini, mode sombre/clair via CSS, accessibilité.
- PNG de fallback à 2x et 3x résolution pour les rendus rapides ou les cas où SVG ne marche pas.
- Source éditable (Figma, Illustrator AI, ou Excalidraw si plus simple) livrée à côté.

### Référence d'inspiration visuelle

Pour la lecture stylistique générale, regarder les schémas de :

- [NASA Technical Reports Server](https://ntrs.nasa.gov) : schémas techniques d'instruments des années 1960-1980, sobres, denses.
- [Modelica standard library documentation](https://doc.modelica.org/Modelica%204.0.0/Resources/helpDymola/Modelica.html) : style schématique d'ingénierie.
- [Stripe Press](https://press.stripe.com) : pour la sobriété typographique générale.

Référence à NE PAS imiter : tout diagramme avec dégradés violet/bleu, isométrie 3D, ou éléments « floating cards with shadow ».

---

## Visuel 1 : Topologie 3 runtimes

### Objectif et emplacement

Schéma central pour expliquer l'architecture de déploiement HELIOS. Affiché dans la section « Le système en un coup d'œil » de la home page, et en grand dans la section « Topologie de déploiement » de la page System. Doit être immédiatement lisible en 5 secondes pour Persona A (program manager), tout en supportant un examen plus approfondi.

### Contenu à représenter

Trois zones principales liées par des flèches directionnelles, plus une quatrième zone orthogonale.

**Zone supérieure : SpikyPanda (Design + Training)**

Encadré horizontal, étiqueté `SPIKYPANDA - DESIGN ENVIRONMENT`. À l'intérieur, quatre items listés en colonnes ou en bullets sobres :

- SimGraph (ODE solver + spectral tools)
- Agent training pipeline
- Reference solver validation
- ONNX + JSON manifest export

**Zones inférieures gauche et droite : les deux runtimes de déploiement**

Deux encadrés côte à côte, mêmes dimensions.

Gauche : `CYANMYCELIUM - MCU RUNTIME`. Contenu :
- Quantized int8 ONNX inference
- Physical sensors and actuators
- CAN / MQTT bus
- Targets: STM32H7, ESP32-S3, HPSC

Droite : `CYANMYCELIUM - UNREAL PLUGIN`. Contenu :
- Quantized ONNX inference (same kernel)
- Simulated twin physics
- 3D / VR / AR rendering
- Targets: Quest 3 (VR), Vision Pro (AR)

**Zone latérale : MCP / LLM Scenario Director**

Petit encadré sur la droite ou en haut à droite, distinct visuellement (couleur ou cadre légèrement différent pour marquer qu'il est orthogonal aux autres). Contenu :

- LLM Scenario Director
- MCP-bounded actions only
- Game master role, never controller

**Flèches**

- Du SpikyPanda vers chaque runtime (descendant) : libellé sur la flèche `ONNX + manifest export`.
- De chaque runtime vers SpikyPanda (remontant, plus discret) : libellé `MQTT telemetry`.
- Du MCP director vers le runtime Unreal (latérale) : libellé `Scenario injection (validated)`.
- Du MCP director vers le runtime SpikyPanda (en simulation) : libellé `Same surface`.

### Dimensions

- SVG natif : viewport 1600 × 1000 px (ratio 16:10), responsive en CSS.
- PNG fallback : 1600 × 1000 (1x), 3200 × 2000 (2x).
- Lisible jusqu'à 800px de largeur sur mobile (en réduisant les labels secondaires, gardant la structure).

### Prompt Claude design (ou outil IA)

```
Generate a technical engineering diagram in SVG showing a 3-runtime deployment
topology for a software platform named HELIOS.

Visual style: sober institutional engineering schematic, similar to NASA
technical drawings from the 1960-1980 era. Strict palette only: dark background
#0A0A0F, primary text white #F0F0F5, secondary text gray #8A8A9A, accent amber
#E8762D used only for highlights and labels on connecting arrows, gray lines
#2A2A35 for box outlines. No gradients, no shadows, no glow effects, no rounded
pill shapes.

Layout:
- Top: one wide horizontal box labeled "SPIKYPANDA - DESIGN ENVIRONMENT"
  containing four bullet items: SimGraph (ODE solver + spectral tools), Agent
  training pipeline, Reference solver validation, ONNX + JSON manifest export.
- Bottom left: box labeled "CYANMYCELIUM - MCU RUNTIME" with four items:
  Quantized int8 ONNX inference, Physical sensors and actuators, CAN / MQTT
  bus, Targets: STM32H7 / ESP32-S3 / HPSC.
- Bottom right: box labeled "CYANMYCELIUM - UNREAL PLUGIN" with four items:
  Quantized ONNX inference (same kernel), Simulated twin physics, 3D / VR / AR
  rendering, Targets: Quest 3 (VR) / Vision Pro (AR).
- Right side, smaller box, slightly offset: "MCP / LLM SCENARIO DIRECTOR" with
  three items: LLM-driven scenarios, MCP-bounded actions only, Game master
  role never controller.

Arrows:
- From SpikyPanda down to MCU runtime: thin amber arrow with label
  "ONNX + manifest export"
- From SpikyPanda down to Unreal plugin: same style
- From MCU runtime up to a small "monitoring" badge near SpikyPanda: thin gray
  arrow with label "MQTT telemetry"
- From Unreal plugin up to monitoring badge: same style
- From Scenario Director to Unreal plugin: amber arrow with label "Scenario
  injection (validated)"
- From Scenario Director to SpikyPanda: same style, label "Same surface"

Typography: sans-serif monospace blend, IBM Plex Sans for general labels,
IBM Plex Mono for runtime names (in uppercase).

Output: clean SVG, 1600x1000 viewport, accessible (text in actual text
elements, not raster).
```

### Brief illustrateur humain

Demander :
- Maquette Figma ou Illustrator avec les éléments listés ci-dessus
- Strict respect de la palette (fournir les codes hex)
- Livraison SVG + sources éditables
- Une variante fond clair (même contenu, palette inversée)
- Une variante simplifiée mobile (3 boîtes empilées verticalement, MCP director sous Unreal plutôt qu'orthogonal)

Délai indicatif : 4-6 heures pour un illustrateur expérimenté, V1 + 1 itération.

---

## Visuel 2 : Réactions Sabatier + Électrolyse couplées

### Objectif et emplacement

Visuel pédagogique central pour la page Mission, section « Le procédé Sabatier ». Doit montrer en un seul schéma comment les deux réactions chimiques se complètent pour fermer le cycle carbone.

### Contenu à représenter

Deux boîtes-réacteurs reliées par des flux moléculaires.

**Boîte gauche : Électrolyseur (PEM)**

- Libellé : `ELECTROLYSIS - E-201`
- Sous-libellé : `Endothermic`
- Entrée : `H2O` (libellé sur flèche entrante depuis le haut)
- Entrée : `Electrical energy (ΔH > 0)` (libellé sur flèche d'énergie, par exemple un éclair stylisé ou simple flèche)
- Sorties : `H2` vers la droite (flèche vers la boîte Sabatier), `½ O2` vers le haut (flèche vers un petit nuage labellisé `To habitat (life support)`)

**Boîte droite : Réacteur Sabatier**

- Libellé : `SABATIER - R-601`
- Sous-libellé : `Exothermic`
- Entrées : `H2` venant de gauche, `CO2` venant du haut (flèche entrante labellisée `From CO2 capture`)
- Sorties : `CH4` vers le bas (flèche labellisée `Fuel / energy storage`), `2 H2O` vers le bas-gauche en boucle (flèche labellisée `Recycle to electrolyzer`)
- Sortie d'énergie : `Heat (ΔH < 0)` (flèche labellisée vers un petit indicateur de récupération thermique)

**Équations affichées**

Au-dessus ou en-dessous de chaque réacteur, en mono :

```
E-201:   H2O → H2 + ½ O2     (ΔH > 0, electrical)
R-601:   CO2 + 4 H2 → CH4 + 2 H2O    ΔH = -165 kJ/mol
```

**Boucle de fermeture du cycle**

Une flèche en arc retournant les `2 H2O` produits par le Sabatier vers l'entrée de l'électrolyseur, fermant explicitement la boucle. Cette flèche doit être visuellement le focus, légèrement épaissie ou colorée amber pour marquer « voici la fermeture du cycle ».

### Dimensions

- SVG natif : viewport 1400 × 900 px.
- PNG fallback : mêmes dimensions et 2x.

### Prompt Claude design

```
Generate a clean engineering schematic in SVG showing two chemical reactors
coupled in a closed loop for spacecraft life support: electrolysis and
Sabatier reaction.

Visual style: sober technical schematic, NASA report style. Strict palette:
dark background #0A0A0F, white labels #F0F0F5, secondary gray #8A8A9A, amber
accent #E8762D used only for the closing loop arrow, gray lines #2A2A35.

Layout: two rectangular reactor boxes side by side, separated horizontally.

Left box: "ELECTROLYSIS - E-201", subtitled "Endothermic".
- Input arrow from top: H2O
- Input arrow from left: electrical energy (small lightning glyph or simple
  arrow), labeled "Electrical energy (ΔH > 0)"
- Output arrow to right going into the right box: H2
- Output arrow upward to a small habitat icon or cloud: ½ O2, labeled "To
  habitat (life support)"

Right box: "SABATIER - R-601", subtitled "Exothermic".
- Input arrow from left (coming from electrolyzer): H2
- Input arrow from top, labeled "From CO2 capture": CO2
- Output arrow downward: CH4, labeled "Fuel / energy storage"
- Output arrow downward-left curving back to electrolyzer input: 2 H2O,
  labeled "Recycle to electrolyzer"
- Heat output arrow to right or upper right: labeled "Heat (ΔH < 0)"

Above or below each box, monospace equations:
- E-201:   H2O → H2 + ½ O2     (ΔH > 0, electrical)
- R-601:   CO2 + 4 H2 → CH4 + 2 H2O    ΔH = -165 kJ/mol

The recycle arrow (2 H2O from Sabatier back to electrolyzer) should be
visually emphasized in amber color #E8762D, with slightly thicker line, to
mark the loop closure.

Output: clean SVG, 1400x900 viewport, text in real SVG text elements.
```

### Brief illustrateur humain

Mêmes consignes que visuel 1. Particularité : la boucle de fermeture doit être visuellement immédiate (le lecteur doit voir « ah, l'eau du Sabatier retourne dans l'électrolyseur, c'est ça la boucle »). Si nécessaire, l'illustrateur peut épaissir cette flèche ou ajouter un libellé `CLOSED LOOP` en arc autour.

---

## Visuel 3 : 28 agents en overlay sur le PFD (optionnel mais fort impact)

### Objectif et emplacement

Visuel principal pour la section « Agents distribués » de la page System. Reprend le PFD existant et superpose la position et le type de chaque agent. Permet de visualiser immédiatement la concentration des agents sur R-601 (6 agents) et la répartition générale.

### Contenu à représenter

Base : le PFD existant `figures/pfd.png`, en fond, en niveau de gris ou avec opacité réduite (par exemple 40%) pour servir de toile de fond sans capturer l'attention.

Surimpression : pour chaque équipement, un ou plusieurs badges circulaires (ou hexagonaux) positionnés sur ou à côté de l'équipement, identifiant les agents qui le supervisent.

**Code couleur des badges par type d'agent** :

- Observer : badge bleu-gris désaturé (`#4A6A8A`)
- Advisor : badge gris neutre (`#7A7A85`)
- Controller : badge ambre (`#E8762D`)
- Safety : badge rouge brique (`#B84A3C`)

**Libellé du badge** : code abrégé de l'agent en mono blanc sur le badge (par exemple `R601-RWY` pour R601-RUNAWAY-PREVENTION, `LOOP-MB` pour LOOP-MASS-BALANCE).

**Cluster R-601** : les 6 badges autour du réacteur doivent être groupés visuellement (cercle ou cluster compact) pour rendre explicite que c'est le nœud le plus instrumenté.

**Agents cross-nœuds** : représentés différemment, en bas du diagramme ou en haut, dans une zone séparée, avec des lignes pointillées vers les équipements qu'ils supervisent (LOOP-MASS-BALANCE pointe vers E-201, M-501, R-601, V-801, etc.).

**Légende** : un petit encart en bas-droite expliquant le code couleur des 4 types d'agents.

### Dimensions

- SVG natif si refait entièrement : viewport adapté au PFD original (~2400 × 1500 px probablement).
- Plus simple : générer en composite (PFD PNG en fond + overlay SVG par-dessus), permettant de garder la qualité du PFD original.

### Prompt Claude design (en mode hybride)

```
Take the existing PFD diagram (figures/pfd.png) and create an overlay layer
showing 28 distributed agents positioned on their respective equipment tags.

Base layer: the existing PFD, displayed at 40% opacity or converted to
desaturated grayscale so it serves as background context.

Overlay layer: circular badges placed on or near each equipment tag.

Color coding for badge type:
- Observer agents: muted blue-gray badge #4A6A8A
- Advisor agents: neutral gray badge #7A7A85
- Controller agents: amber badge #E8762D
- Safety agents: brick red badge #B84A3C

Each badge contains a short code label in white monospace text.

Agents to place by equipment:
- W-101: W101-FLOW (observer), W101-FILT (observer)
- E-201: E201-EFF (observer), E201-TH (observer), E201-GAS (observer)
- V-201: V201-SAT (observer)
- V-202: V202-PUR (observer), V202-BUF (observer)
- C-301: C301-CAP (observer), C301-REG (observer)
- C-302: C302-CRY (observer), C302-EN (observer)
- K-401: K401-PR (observer), K401-BR (observer)
- M-501: M501-STO (observer)
- R-601 (cluster of 6, group them visually):
  - R601-THERM (controller, amber)
  - R601-HEAT (advisor, gray)
  - R601-CAT (observer, blue)
  - R601-CONV (observer, blue)
  - R601-RWY (safety, red, slightly larger)
  - R601-RCY (controller, amber)
- E-701: E701-CD (observer)
- V-701: V701-WR (observer)
- V-801: V801-SEP (observer)
- V-901: V901-PUR (observer)

Cross-node agents at the bottom in a separate band, with dashed lines
pointing to the equipment they monitor:
- LOOP-MB (observer): points to E-201, M-501, R-601, V-801
- LOOP-EB (observer): points to E-201, K-401, C-302, R-601, E-701
- TH-CHAIN (advisor): points to R-601, E-701, E-201, V-701

Legend in bottom-right corner explaining the 4 agent types.

Output: SVG overlay + composite PNG showing the result.
```

### Brief illustrateur humain

Travail plus créatif que les deux précédents. Le défi est lisibilité : 28 badges sur un PFD peuvent saturer visuellement. L'illustrateur doit chercher l'équilibre, par exemple :

- Réduire la taille des badges des observers (les plus nombreux) pour ne pas surcharger.
- Faire ressortir le cluster R-601 (taille légèrement supérieure, ou cadre groupant les 6 badges).
- Utiliser les lignes pointillées pour les cross-node agents sans surcharger (limiter à 4-5 lignes par cross-node agent, et utiliser une couleur très discrète).

Si la lisibilité est trop compliquée, alternative : produire un visuel séparé par « famille » (un overlay pour les observers, un autre pour les controllers + safety, etc.) et permettre au site de basculer entre eux via un toggle.

---

## Visuel 4 : Focus R-601 (zoom sur le réacteur Sabatier et ses 6 agents)

### Objectif et emplacement

Visuel complémentaire pour la section « Agents distribués » de la page System, mis en regard du visuel 3. Permet de zoomer sur le nœud le plus critique du système et d'expliciter pourquoi 6 agents y travaillent.

### Contenu à représenter

Au centre, une représentation schématique du réacteur Sabatier R-601 : cylindre vertical, lit catalytique au milieu, entrée de gaz en haut (mélange H2 + CO2 venant de M-501), sortie en bas (CH4 + H2O + non convertis), entrée de coolant sur le côté, gradient thermique axial indiqué.

Autour du réacteur, les 6 agents disposés en couronne, chacun pointant vers la zone du réacteur qu'il supervise :

- **R601-THERMAL-REGULATION** (controller, ambre) : pointe vers le lit catalytique et le système coolant. Libellé : « Profil thermique axial, point chaud, ajustement coolant ».
- **R601-HEAT-RECOVERY** (advisor, gris) : pointe vers la sortie chaude. Libellé : « Récupération chaleur vers E-201 ».
- **R601-CATALYST-HEALTH** (observer, bleu) : pointe vers le lit catalytique. Libellé : « Activité résiduelle, frittage, empoisonnement ».
- **R601-CONVERSION-EFFICIENCY** (observer, bleu) : pointe vers la sortie. Libellé : « Rendement temps réel, écart équilibre thermo ».
- **R601-RUNAWAY-PREVENTION** (safety, rouge, légèrement plus grand) : pointe vers l'ensemble du réacteur. Libellé : « Détection signature emballement, seul à autoriser emergency_shutdown ».
- **R601-RECYCLE-BALANCE** (controller, ambre) : pointe vers la sortie et la boucle de recyclage. Libellé : « Surveillance gaz non convertis recyclés vers M-501 ».

En bas du visuel, encart sobre rappelant la réaction et ses paramètres clés :

```
Sabatier reaction
CO2 + 4 H2 → CH4 + 2 H2O    ΔH = -165 kJ/mol (exothermique)
Catalyseur: Ni/Al2O3 ou Ru/Al2O3
Conditions: 300-400°C, 5-30 bar
```

### Dimensions

- SVG natif : viewport 1200 × 1400 px (orientation portrait pour mettre le réacteur au centre verticalement).

### Prompt Claude design

```
Generate a technical schematic in SVG showing a Sabatier reactor (R-601) with
6 supervising agents arranged around it.

Visual style: sober engineering schematic, NASA report aesthetic. Strict
palette: dark background #0A0A0F, white text #F0F0F5, gray secondary #8A8A9A,
amber accent #E8762D, brick red #B84A3C for safety, blue-gray #4A6A8A for
observers, neutral gray #7A7A85 for advisors.

Center: vertical schematic of a tubular catalytic reactor.
- Cylindrical body, taller than wide
- Inlet at top: gas mixture H2 + CO2 (label "from M-501")
- Outlet at bottom: CH4 + H2O + unconverted gases (label "to E-701")
- Coolant inlet on left side, coolant outlet on right side (small arrows)
- Catalyst bed shown as a textured zone in the middle (hatched or dotted
  pattern, not photographic)
- Axial thermal gradient indicated by a subtle color band on the side of the
  reactor (cool blue at top, gradually warming through amber)

Around the reactor in a crown arrangement, 6 agent badges with pointer lines
to the reactor zone they monitor:

- Top-left: R601-THERMAL-REGULATION (amber badge, controller), pointing to
  catalyst bed and coolant system. Label below badge: "Axial thermal profile,
  hotspot detection, coolant adjustment"

- Top-right: R601-HEAT-RECOVERY (gray badge, advisor), pointing to hot outlet.
  Label: "Heat recovery to E-201"

- Middle-left: R601-CATALYST-HEALTH (blue-gray badge, observer), pointing to
  catalyst bed. Label: "Residual activity, sintering, poisoning"

- Middle-right: R601-CONVERSION-EFFICIENCY (blue-gray badge, observer),
  pointing to outlet. Label: "Real-time yield, thermo equilibrium delta"

- Bottom-center, slightly larger: R601-RUNAWAY-PREVENTION (red badge, safety),
  pointing to the entire reactor body with multiple thin lines. Label: "Runaway
  signature detection, sole authority for emergency_shutdown"

- Bottom-right: R601-RECYCLE-BALANCE (amber badge, controller), pointing to
  outlet and a small loop-back arrow toward M-501. Label: "Unconverted gas
  recycle to M-501"

Bottom of image, a small text box with the reaction equation and key
parameters in monospace:

  Sabatier reaction
  CO2 + 4 H2 → CH4 + 2 H2O    ΔH = -165 kJ/mol (exothermic)
  Catalyst: Ni/Al2O3 or Ru/Al2O3
  Conditions: 300-400°C, 5-30 bar

Output: SVG, 1200x1400 viewport (portrait), text in real SVG text elements.
```

### Brief illustrateur humain

Le visuel doit être lisible mais ne pas tomber dans le réalisme. Le réacteur n'a pas besoin d'être un rendu 3D photoréaliste, un schéma technique stylisé suffit et reste plus cohérent avec la charte graphique. Inspiration : les schémas d'instruments NASA des années 1970, ou les coupes techniques dans les manuels Modelica.

---

## Récapitulatif et priorités

Quatre visuels documentés, à produire dans cet ordre de priorité :

1. **Topologie 3 runtimes** (visuel 1) : indispensable, utilisé dans home et page System.
2. **Réactions Sabatier + électrolyse** (visuel 2) : indispensable pour la page Mission, simple à produire.
3. **PFD avec 28 agents en overlay** (visuel 3) : fort impact visuel, complexe, peut être retardé en V2 du site si le délai presse.
4. **Focus R-601** (visuel 4) : complément du visuel 3, optionnel en V1.

Pour un sprint design serré, viser les visuels 1 et 2 en priorité absolue, ajouter visuel 4 si possible, faire visuel 3 en V2.

### Workflow recommandé

1. Lancer Claude design (ou outil équivalent) avec les prompts ci-dessus pour générer une V1 rapide.
2. Itérer sur la V1 pour ajuster les détails (positions, libellés, équilibre visuel).
3. Faire repasser par un illustrateur humain pour le polish final (typographie propre, alignements précis, optimisation SVG).
4. Livrer SVG + PNG 2x + sources éditables.

Délai indicatif total pour les 4 visuels : 2-3 jours avec itérations, en alternant IA et finition humaine.

---

*Document de specs visuels, complémentaire du brief site web et de la copy. Toute question sur l'interprétation visuelle d'un élément du contenu doit être adressée avant de démarrer le visuel concerné.*

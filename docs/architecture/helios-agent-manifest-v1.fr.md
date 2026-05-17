# HELIOS - Agent Manifest
## CO₂ → CH₄ Closed Loop Life Support System
*Document de référence pour génération de modèles et distribution sur digital twin*

![PFD HELIOS : équipements ciblés par les agents listés ci-dessous](figures/helios-pfd.png)

---

## Format

Chaque agent est un nœud déployable indépendamment.
```
agent_id       : identifiant unique
node           : équipement cible (ref PFD)
inputs         : DataPoints consommés (Measurement : unité)
outputs        : DataPoints produits
role           : comportement surveillé
```

---

## W-101 — Water Purification

### W101-FLOW-MONITOR
```
node     : W-101
inputs   : VolumetricFlowRate:L/min, Pressure:bar
outputs  : flow_anomaly:bool, flow_trend:float
role     : détecte chute ou irrégularité de débit entrant,
           signal précoce d'obstruction filtre
```

### W101-FILTER-HEALTH
```
node     : W-101
inputs   : PressureDifferential:bar, Temperature:°C
outputs  : filter_degradation_score:float [0-1]
role     : estime l'état de colmatage par différentiel de pression,
           anticipe le besoin de remplacement
```

---

## E-201 — PEM Electrolyzer

### E201-EFFICIENCY
```
node     : E-201
inputs   : Voltage:V, Current:A, Temperature:°C,
           H2_flow_wet:L/min, O2_flow_wet:L/min
outputs  : faradaic_efficiency:float, efficiency_trend:float
role     : surveille le rendement faradaïque,
           détecte dégradation membrane par écart au rendement nominal
```

### E201-THERMAL
```
node     : E-201
inputs   : Temperature:°C, Current:A, Pressure:bar
outputs  : thermal_state:enum{nominal,stress,critical},
           overheat_risk:float
role     : surveille la montée thermique sous charge,
           détecte déséquilibre cellule
```

### E201-GAS-PURITY
```
node     : E-201
inputs   : H2_humidity:%, O2_humidity:%, Pressure:bar
outputs  : crossover_risk:float, purity_alert:bool
role     : détecte crossover membranaire H₂/O₂
           (risque sécurité direct)
```

---

## V-201 — H₂ Dryer (Desiccant)

### V201-SATURATION
```
node     : V-201
inputs   : inlet_humidity:%, outlet_humidity:%,
           Temperature:°C, Pressure:bar
outputs  : desiccant_saturation:float [0-1],
           regeneration_needed:bool
role     : estime saturation desiccant par delta humidité,
           anticipe cycle de régénération
```

---

## V-202 — O₂ Dryer + Buffer

### V202-PURITY
```
node     : V-202
inputs   : O2_concentration:%, outlet_humidity:%,
           buffer_pressure:bar
outputs  : o2_purity_score:float, supply_risk:bool
role     : surveille la pureté O₂ vers habitat (cible 21–30%),
           alerte si pureté hors fenêtre de sécurité
```

### V202-BUFFER-LEVEL
```
node     : V-202
inputs   : buffer_pressure:bar, consumption_rate:L/min
outputs  : buffer_autonomy_hours:float, refill_urgency:float
role     : estime l'autonomie du buffer O₂,
           déclenche alerte si < seuil critique
```

---

## C-301 — CO₂ Capture (Habitat Air)

### C301-CAPTURE-EFFICIENCY
```
node     : C-301
inputs   : CO2_inlet_concentration:ppm,
           CO2_outlet_concentration:ppm,
           Temperature:°C, Pressure:bar
outputs  : capture_efficiency:float, sorbent_score:float
role     : mesure efficacité de capture par delta concentration,
           détecte saturation sorbant
```

### C301-REGEN-CYCLE
```
node     : C-301
inputs   : sorbent_score:float, Temperature:°C,
           cycle_time:s
outputs  : regen_recommended:bool, cycle_anomaly:bool
role     : surveille les cycles de régénération thermique,
           détecte allongement anormal de cycle
```

---

## C-302 — CO₂ Capture (Mars Atmosphere)

### C302-CRYO-STABILITY
```
node     : C-302
inputs   : Temperature:°C, Pressure:bar,
           CO2_inlet_concentration:%
outputs  : cryo_stability:enum{nominal,drift,critical},
           capture_rate:float
role     : surveille la stabilité cryogénique (-120 à -50°C),
           détecte dérive thermique qui dégrade la capture
```

### C302-ENERGY-EFFICIENCY
```
node     : C-302
inputs   : PowerConsumption:W, CO2_captured:g/min,
           Temperature:°C
outputs  : energy_per_gram:float, efficiency_trend:float
role     : surveille le coût énergétique de capture,
           détecte dégradation progressive du système cryogénique
```

---

## K-401 — CO₂ Compressor

### K401-PRESSURE-RATIO
```
node     : K-401
inputs   : inlet_pressure:bar, outlet_pressure:bar,
           PowerConsumption:W
outputs  : compression_efficiency:float, pressure_anomaly:bool
role     : surveille le ratio de compression,
           détecte fuite ou perte d'étanchéité
```

### K401-BEARING-HEALTH
```
node     : K-401
inputs   : VibrationX:g, VibrationY:g, RotationalSpeed:rpm,
           Temperature:°C
outputs  : bearing_degradation_score:float,
           failure_horizon_hours:float
role     : détecte dégradation roulement par signature vibratoire,
           estime horizon de panne
```

---

## M-501 — Gas Mixer

### M501-STOICHIO-RATIO
```
node     : M-501
inputs   : H2_flow:L/min, CO2_flow:L/min
outputs  : h2_co2_ratio:float,
           ratio_deviation:float,
           ratio_alert:bool
role     : surveille le ratio H₂/CO₂ en entrée Sabatier
           (cible stœchiométrique 4:1),
           alerte si déviation > seuil (impact direct rendement Sabatier)
```

---

## R-601 — Sabatier Reactor ★ Focus

Le réacteur Sabatier est le nœud le plus critique du système.
Réaction exothermique (CO₂ + 4H₂ → CH₄ + 2H₂O, ΔH = -165 kJ/mol).
La chaleur produite doit être dissipée et récupérée sans tuer le catalyseur.
Un excès thermique dégrade irréversiblement le catalyseur Ni/Al₂O₃ ou Ru/Al₂O₃.

Six agents distincts couvrent ce nœud.

### R601-THERMAL-REGULATION
```
node     : R-601
inputs   : Temperature_inlet:°C, Temperature_bed:°C,
           Temperature_outlet:°C, Pressure:bar,
           coolant_flow:L/min
outputs  : thermal_state:enum{nominal,hot,critical},
           bed_hotspot_score:float,
           coolant_adjustment:float
role     : surveille le profil thermique axial du lit catalytique,
           détecte formation de point chaud (hotspot),
           anticipe emballement thermique (runaway)
```

### R601-HEAT-RECOVERY
```
node     : R-601
inputs   : Temperature_outlet:°C, heat_exchanger_flow:L/min,
           recovered_heat:W, E201_temp:°C
outputs  : recovery_efficiency:float,
           heat_available:W,
           recovery_anomaly:bool
role     : surveille l'efficacité de récupération de chaleur
           vers l'électrolyseur E-201 ou le système eau,
           détecte perte de transfert thermique
           (fouling échangeur, débit insuffisant)
```

### R601-CATALYST-HEALTH
```
node     : R-601
inputs   : CO2_conversion_rate:%, CH4_yield:%,
           Temperature_bed:°C, time_on_stream:h
outputs  : catalyst_activity:float [0-1],
           deactivation_rate:float,
           poisoning_risk:bool
role     : estime l'activité catalytique par suivi du taux de conversion,
           détecte désactivation progressive (frittage, empoisonnement soufre),
           estime durée de vie résiduelle catalyseur
```

### R601-CONVERSION-EFFICIENCY
```
node     : R-601
inputs   : CO2_inlet:L/min, CH4_outlet:L/min,
           H2_inlet:L/min, H2O_outlet:L/min,
           Temperature:°C, Pressure:bar
outputs  : CO2_conversion:%, selectivity_CH4:%,
           efficiency_trend:float
role     : mesure le rendement de conversion en temps réel,
           corrèle avec température et pression pour détecter
           écart par rapport à l'équilibre thermodynamique attendu
```

### R601-RUNAWAY-PREVENTION
```
node     : R-601
inputs   : Temperature_bed:°C, dT_dt:°C/s,
           coolant_flow:L/min, H2_CO2_ratio:float
outputs  : runaway_risk:float [0-1],
           emergency_shutdown:bool,
           corrective_action:enum{increase_coolant,
                                  reduce_H2_feed,
                                  emergency_stop}
role     : agent de sécurité temps réel,
           détecte signature d'emballement thermique
           (montée en température + ratio H₂ excédentaire),
           seul agent autorisé à émettre emergency_shutdown
```

### R601-RECYCLE-BALANCE
```
node     : R-601
inputs   : H2_unconverted:L/min, CO2_unconverted:L/min,
           recycle_flow:L/min, mixer_pressure:bar
outputs  : recycle_efficiency:float,
           recycle_anomaly:bool,
           mixer_feed_correction:float
role     : surveille la boucle de recyclage H₂+CO₂ non convertis
           vers M-501,
           détecte accumulation anormale de gaz non réactifs
```

---

## E-701 — Condenser

### E701-CONDENSATION
```
node     : E-701
inputs   : inlet_temp:°C, outlet_temp:°C,
           coolant_temp:°C, H2O_condensed:L/min
outputs  : condensation_efficiency:float,
           fouling_score:float
role     : surveille l'efficacité de condensation eau,
           détecte encrassement échangeur par dégradation ΔT
```

---

## V-701 — Water Knockout

### V701-WATER-RECOVERY
```
node     : V-701
inputs   : water_level:L, inlet_flow:L/min,
           carryover_humidity:%
outputs  : recovery_rate:float, carryover_alert:bool
role     : surveille la récupération eau vers W-101,
           détecte entraînement liquide vers séparateur gaz
```

---

## V-801 — Gas Separator

### V801-SEPARATION
```
node     : V-801
inputs   : CH4_concentration:%, H2O_residual:%,
           Pressure:bar, Temperature:°C
outputs  : separation_efficiency:float,
           CH4_purity:%, contamination_alert:bool
role     : surveille la qualité de séparation CH₄/H₂O,
           détecte humidité résiduelle excessive
           (impact pureté carburant)
```

---

## V-901 — CH₄ Purification

### V901-PURITY
```
node     : V-901
inputs   : CH4_purity:%, CO2_residual:ppm,
           H2_residual:ppm, Pressure:bar
outputs  : fuel_grade:enum{off_spec,acceptable,fuel_grade},
           psa_cycle_health:float
role     : surveille la pureté finale CH₄ pour stockage carburant,
           détecte dégradation des cycles PSA/membrane
```

---

## Agent cross-nœuds (SpikyPanda)

Ces agents ne sont pas déployés sur un seul nœud, ils tournent dans SpikyPanda et agrègent des DataPoints de plusieurs équipements.

### LOOP-MASS-BALANCE
```
nodes    : E-201, M-501, R-601, V-801
inputs   : H2_produced:mol/h, CO2_captured:mol/h,
           CH4_produced:mol/h, H2O_recovered:mol/h
outputs  : mass_balance_error:%, loop_integrity:bool
role     : bilan massique global de la boucle,
           détecte fuite ou perte matière non localisée
```

### LOOP-ENERGY-BALANCE
```
nodes    : E-201, K-401, C-302, R-601, E-701
inputs   : power_electrolyzer:W, power_compressor:W,
           power_cryo:W, heat_recovered:W
outputs  : energy_efficiency:float, energy_anomaly:bool
role     : bilan énergétique global,
           surveille le ratio énergie consommée / CH₄ produit
```

### THERMAL-CHAIN
```
nodes    : R-601, E-701, E-201, V-701
inputs   : R601_heat_available:W, E701_condensation:W,
           E201_temp:°C, water_temp:°C
outputs  : thermal_chain_efficiency:float,
           recovery_opportunity:float
role     : surveille la chaîne de récupération thermique
           Sabatier → condenseur → électrolyseur,
           identifie les pertes et opportunités de réutilisation
```

---

## Lecture par la direction de scénario

Les agents observers de cette liste (W101-FLOW-MONITOR, R601-CATALYST-HEALTH, K401-BEARING-HEALTH, etc.) ont un second usage au-delà du monitoring opérationnel : leurs sorties sont lisibles par le scenario director LLM décrit dans `helios-project-overview.fr.md` section 8. Le LLM s'en sert pour évaluer ce que l'équipage en formation a remarqué dans la situation simulée. Un agent qui signale une dégradation ignorée par l'équipage informe le LLM que l'objectif pédagogique a été manqué ; il peut alors décider d'introduire une alerte plus visible, ou au contraire laisser la situation se dégrader pour observer la suite des décisions.

Les agents controllers et safety ne sont pas dans ce périmètre. Le LLM peut lire leurs états (utile pour le debrief), mais il n'a aucune autorité pour les modifier, les inhiber, ou court-circuiter leur arbitrage. Cette séparation est ce qui rend le scenario director compatible avec un système où la sécurité réelle doit rester gouvernée par les agents safety, pas par le narrateur.

---

## Résumé

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
| Cross-nœuds (SpikyPanda) | 3 | Critique |
| **Total** | **28** | |

---

*Ce document est la source pour la génération des manifests agents et la distribution sur le digital twin CyanMycelium/UE5.*
*Chaque entrée correspond à un fichier ONNX + manifest JSON déployable indépendamment.*

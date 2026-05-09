# Projet Motor PMSM Phase 1 : atlas gravite x defauts

**Date initiale :** 2026-05-07
**Statut :** projet, en cours de cadrage. Renomme depuis `scientific_agent_architecture.md` le 2026-05-09.
**Objectif domaine :** caracteriser comment le contexte gravitationnel (1g terrestre vs microgravite, orientation moteur) modifie la signature des defauts D1-D5 sur un PMSM ECX PRIME, produire le dataset DotVision et le modele NN edge correspondant.

---

## Note de lecture (2026-05-09)

Ce document est anterieur a l'implementation MCP. Il decrit le **projet de recherche moteur PMSM** (matrice experimentale, pipeline ML, methodologie). L'**infrastructure** generique d'agent scientifique qui a ete construite pour porter ce projet (et tous les futurs) est documentee separement dans `docs/research_agent_architecture.md`.

### Mapping de l'architecture decrite ci-dessous vers l'implem actuelle

| Brouillon initial | Implementation actuelle |
|---|---|
| `McpSpikypandaBehavior` (1 behavior monolithique) | 4 behaviors decouples : `SpkScenarioBehavior`, `SpkSimBehavior`, `SpkMeasureBehavior`, `SpkProjectBehavior`, plus `SpkResearchBehavior` (Node) |
| `spk_configure_scenario` | `scenario_configure_node` (cible un noeud par id ou opId, ne mentionne aucun moteur) |
| `spk_run_simulation` | `sim_run` |
| `spk_read_amplitudes` | `measure_read_amplitudes` |
| `spk_read_fft_peak` | `measure_read_fft_peak` |
| `spk_export_dataset` | `measure_export_data` |
| `spk_toggle_gravity` | `sim_toggle_gravity` |
| `spk_set_fault` (D1..D5 hardcoded) | `scenario_configure_node({opId: "spk.FaultPmsm.<X>", config: {severity}})` (resolution dynamique via OPS_V1) |
| `spk_reset` | `sim_reset` |
| `spk_graph_status` | `sim_status` + ressource `spk://scenario` |
| Composant 4 : matrice JSON ad-hoc | `project.matrix.factors` persiste sous `<research-dir>/projects/<id>/project.json` |
| Composant 5 : pipeline ML Python | A faire ; emplacement reserve `<research-dir>/projects/<id>/training/` |
| Composant 3 : system prompt agent | A faire via grammar profiles `domains/motor-pmsm/physics-{fr,en}.json` + `generic/autonomy-{fr,en}.json` |

### Ce qui reste valide tel quel dans le doc

- La **methodologie gravity_sensitivity** (compare ON/OFF, calcule le delta par feature)
- La **matrice 80 cells** (5 fautes x 4 severites x 2 gravite x 2 orientations)
- Le **pipeline ML Python cible** (GBM, MLP, 1D-CNN, LSTM, MLP+FiLM)
- Les **metriques de selection** (`gravity_gap` comme metrique cle)
- L'**ordre des sprints** (Sprint 1-2 fait dans une autre forme ; Sprint 3-5 a venir)

### Comment ce projet se materialise dans l'infra actuelle

```
1. Page http://localhost:8080/samples/nodeeditor/research-projects.html
2. "New project" -> name="motor-pmsm-phase1", goal="..."
3. L'agent appelle : project_define_prerequisites, project_define_hypotheses,
                     project_set_matrix avec la matrice 80 cells ci-dessous
4. Une fois prereqs verts -> project_set_status("active")
5. Boucle d'agent : pour chaque cell -> sim_toggle_gravity + scenario_configure_node
                                         + sim_run + measure_read_* + log_experiment
                                         + project_record_artifact(type="experiment")
6. Pipeline ML Python (a coder Sprint 4) : lit le dataset, entraine, ecrit sous training/
7. write_report({projectId, name: "atlas", content: "..."}) -> rapport final
```

---

## Architecture initialement proposee (conservee pour reference)

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SCIENTIFIC AGENT  (Claude / GPT-4 / Gemini)                            │
│                                                                         │
│  1. Generate experiment plan (JSON)                                     │
│  2. Call MCP tools to configure + run simulation                        │
│  3. Call MCP tools to read results                                      │
│  4. Analyze, form hypothesis, update knowledge base                     │
│  5. Call ML pipeline (Python subprocess or MCP tool)                    │
│  6. Select best model, document conclusions                             │
└───────────────────┬─────────────────────────────────────────────────────┘
                    │  MCP protocol (stdio or HTTP/SSE)
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  McpSpikypandaBehavior  (mcp-for-babylon pattern)                       │
│                                                                         │
│  Tools:                                                                 │
│   spk_configure_scenario  - set motor params, gravity, faults           │
│   spk_run_simulation      - play for N seconds, wait for stabilization  │
│   spk_read_amplitudes     - read sync detect outputs (all channels)     │
│   spk_read_fft_peaks      - read FFT peak at specified Hz               │
│   spk_export_dataset      - export CSV/JSON to disk                     │
│   spk_toggle_gravity      - enable/disable WorldGravity at runtime      │
│   spk_set_fault           - activate/deactivate fault with severity     │
│   spk_reset               - stop and reset graph to baseline            │
│   spk_graph_status        - report node states and connections          │
└───────────────────┬─────────────────────────────────────────────────────┘
                    │  WebSocket tunnel (mcp-for-babylon)
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser (SpikyPanda node editor)                                       │
│                                                                         │
│  window.__spk  (SpikyPanda Control API, injected at page load)          │
│   .configure(scenario)                                                  │
│   .run(seconds)                                                         │
│   .readAmplitudes()                                                     │
│   .readFftPeak(channel, freqHz)                                         │
│   .exportData(format)                                                   │
│   .toggleGravity(enabled)                                               │
│   .setFault(faultId, severity)                                          │
│   .reset()                                                              │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Python ML Pipeline  (spikypanda/ml/)                                   │
│                                                                         │
│   dataset.py     - load/validate CSV exports                            │
│   features.py    - lock-in bank, FFT features, statistics               │
│   models.py      - MLP, CNN, LSTM, GBM definitions                     │
│   train.py       - train + cross-validate + report                     │
│   gravity_gap.py - 1g vs 0g accuracy delta per fault class             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Composant 1 : SpikyPanda Control API (browser-side JS)

Fichier a ajouter : `packages/host/www/js/spk-control-api.js`

```javascript
window.__spk = (function () {

    // ── Scenario configuration ──────────────────────────────────────────
    // scenario : {
    //   gravityEnabled: bool,
    //   gravityMagnitude: float,       // m/s^2, default 9.81
    //   orientation: "horizontal" | "verticalUp" | "verticalDown" | "custom",
    //   roll: float, pitch: float, yaw: float,  // if orientation == "custom"
    //   faults: [ { id: "D1"|"D2"|"D3"|"D4"|"D5", severity: 0..1 } ],
    //   speedRpm: float,               // default 3000
    //   loadTorque: float,             // N.m, default 0
    // }
    function configure(scenario) { /* ... */ }

    // ── Run for N seconds, returns Promise<void> ────────────────────────
    function run(seconds) { /* ... */ }

    // ── Read all sync detect amplitudes (returns object) ────────────────
    // Returns: { accel_x_1x: float, iq_1x: float, accel_x_2x: float, ... }
    function readAmplitudes() { /* ... */ }

    // ── Read FFT peak near freqHz (returns float) ───────────────────────
    function readFftPeak(channel, freqHz, windowHz) { /* ... */ }

    // ── Export raw scope data as JSON ───────────────────────────────────
    function exportData() { /* returns JSON string */ }

    // ── Convenience wrappers ────────────────────────────────────────────
    function toggleGravity(enabled) { /* ... */ }
    function setFault(faultId, severity) { /* ... */ }
    function reset() { /* ... */ }
    function graphStatus() { /* returns object with node states */ }

    return { configure, run, readAmplitudes, readFftPeak,
             exportData, toggleGravity, setFault, reset, graphStatus };
})();
```

---

## Composant 2 : McpSpikypandaBehavior (TypeScript, mcp-for-babylon pattern)

Fichier : `mcp-for-babylon/packages/dev/spikypanda/src/mcp.behavior.spikypanda.ts`

Suit exactement le meme pattern que `McpCameraBehavior` (Cesium).
Chaque outil appelle `window.__spk.*` via le tunnel WebSocket existant.

```typescript
export class McpSpikypandaBehavior extends McpBehaviorBase {

    getTools(): McpTool[] {
        return [
            {
                name: "spk_configure_scenario",
                description: "Configure motor scenario: gravity, orientation, faults, speed.",
                inputSchema: {
                    type: "object",
                    properties: {
                        gravityEnabled:    { type: "boolean" },
                        gravityMagnitude:  { type: "number" },
                        orientation:       { type: "string", enum: ["horizontal","verticalUp","verticalDown"] },
                        faults:            { type: "array",
                                             items: { type: "object",
                                                      properties: { id: { type: "string" }, severity: { type: "number" } } } },
                        speedRpm:          { type: "number" },
                        loadTorque:        { type: "number" },
                    }
                }
            },
            {
                name: "spk_run_simulation",
                description: "Start motor and run for the specified duration (seconds). Waits for completion.",
                inputSchema: { type: "object",
                               properties: { seconds: { type: "number" } },
                               required: ["seconds"] }
            },
            {
                name: "spk_read_amplitudes",
                description: "Read all sync-detect lock-in amplitudes. Returns { accel_x_1x, iq_1x, ... } in SI units.",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "spk_read_fft_peak",
                description: "Read FFT peak amplitude near a specified frequency on a named channel.",
                inputSchema: { type: "object",
                               properties: {
                                   channel:  { type: "string", enum: ["accel_x","accel_y","i_q","i_d","torque_em"] },
                                   freqHz:   { type: "number" },
                                   windowHz: { type: "number", default: 2 }
                               },
                               required: ["channel","freqHz"] }
            },
            {
                name: "spk_export_dataset",
                description: "Export current scope buffers as JSON. Returns the exported data as a string.",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "spk_toggle_gravity",
                description: "Enable or disable the WorldGravity node at runtime.",
                inputSchema: { type: "object",
                               properties: { enabled: { type: "boolean" } },
                               required: ["enabled"] }
            },
            {
                name: "spk_set_fault",
                description: "Activate or deactivate a PMSM fault node (D1..D5) with a severity between 0 and 1.",
                inputSchema: { type: "object",
                               properties: { faultId:  { type: "string", enum: ["D1","D2","D3","D4","D5"] },
                                             severity: { type: "number", minimum: 0, maximum: 1 } },
                               required: ["faultId","severity"] }
            },
            {
                name: "spk_reset",
                description: "Stop the simulation and reset all nodes to baseline state.",
                inputSchema: { type: "object", properties: {} }
            },
        ];
    }

    async executeToolAsync(toolName: string, args: unknown): Promise<McpToolResult> {
        // Calls window.__spk.* via the WebSocket tunnel
        const result = await this._tunnel.evalAsync(`window.__spk.${/* ... */}`);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
}
```

---

## Composant 3 : Agent scientifique (system prompt)

Le LLM reçoit ce system prompt pour se comporter comme un agent scientifique :

```
You are a scientific agent for the DotVision project.
Your goal is to characterize how gravitational context affects PMSM fault signatures.

You have access to these MCP tools:
- spk_configure_scenario  : set up motor conditions
- spk_run_simulation      : run for N seconds
- spk_read_amplitudes     : read lock-in outputs (SI units)
- spk_read_fft_peak       : read FFT peak at Hz
- spk_export_dataset      : save raw data
- spk_toggle_gravity      : toggle gravity ON/OFF
- spk_set_fault           : activate fault with severity
- spk_reset               : reset to baseline

METHODOLOGY:
1. For each experiment cell in your test matrix:
   a. spk_configure_scenario (set conditions)
   b. spk_run_simulation(seconds=4)
   c. spk_read_amplitudes  (record all channels)
   d. spk_toggle_gravity(false), wait 2s
   e. spk_read_amplitudes  (record gravity-off baseline)
   f. Compute gravity_sensitivity = (on - off) / on
   g. spk_reset

2. After each fault type is complete, formulate a hypothesis:
   "For fault D{N} at severity {S}, the gravity sensitivity index
    on accel_x_1x is {X}%, confirming / refuting the prediction that..."

3. After the full matrix, propose the best feature set and NN architecture
   based on observed separability, and call the Python ML pipeline.

OUTPUT FORMAT per experiment:
{
  "experiment_id": "D1_sev0.5_1g_horizontal",
  "conditions": { ... },
  "results_gravity_on":  { "accel_x_1x": ..., "iq_1x": ... },
  "results_gravity_off": { "accel_x_1x": ..., "iq_1x": ... },
  "gravity_sensitivity": { "accel_x_1x": "XX%", "iq_1x": "XX%" },
  "hypothesis": "..."
}
```

---

## Composant 4 : Test matrix (Phase 1)

```json
{
  "matrix": [
    { "label": "baseline_1g",      "faults": [],                              "gravity": true,  "orientation": "horizontal" },
    { "label": "baseline_0g",      "faults": [],                              "gravity": false, "orientation": "horizontal" },
    { "label": "D1_mild_1g",       "faults": [{ "id":"D1", "severity":0.3 }], "gravity": true,  "orientation": "horizontal" },
    { "label": "D1_mild_0g",       "faults": [{ "id":"D1", "severity":0.3 }], "gravity": false, "orientation": "horizontal" },
    { "label": "D1_severe_1g",     "faults": [{ "id":"D1", "severity":0.8 }], "gravity": true,  "orientation": "horizontal" },
    { "label": "D2_mild_1g",       "faults": [{ "id":"D2", "severity":0.3 }], "gravity": true,  "orientation": "horizontal" },
    { "label": "D2_mild_0g",       "faults": [{ "id":"D2", "severity":0.3 }], "gravity": false, "orientation": "horizontal" },
    { "label": "D3_mild_1g",       "faults": [{ "id":"D3", "severity":0.3 }], "gravity": true,  "orientation": "horizontal" },
    { "label": "D3_mild_0g",       "faults": [{ "id":"D3", "severity":0.3 }], "gravity": false, "orientation": "horizontal" },
    { "label": "D4_mild_1g",       "faults": [{ "id":"D4", "severity":0.3 }], "gravity": true,  "orientation": "horizontal" },
    { "label": "D4_mild_0g",       "faults": [{ "id":"D4", "severity":0.3 }], "gravity": false, "orientation": "horizontal" },
    { "label": "D5_mild_1g",       "faults": [{ "id":"D5", "severity":0.3 }], "gravity": true,  "orientation": "horizontal" },
    { "label": "D5_mild_0g",       "faults": [{ "id":"D5", "severity":0.3 }], "gravity": false, "orientation": "horizontal" },
    { "label": "D1_vertical_up",   "faults": [{ "id":"D1", "severity":0.3 }], "gravity": true,  "orientation": "verticalUp"   },
    { "label": "D2_vertical_down", "faults": [{ "id":"D2", "severity":0.3 }], "gravity": true,  "orientation": "verticalDown" }
  ]
}
```

80 experiment cells total (5 faults x 4 severity levels x 2 gravity x 2 orientations).
At 6 seconds per cell: ~8 minutes of unattended simulation time.

---

## Composant 5 : Pipeline ML (Python)

```
spikypanda/ml/
  dataset.py       - load CSV/JSON exports, validate schema, train/test split
  features.py      - extract lock-in bank, FFT peaks, statistical moments
  models.py        - MLP, 1D-CNN, LSTM, GBM (scikit-learn + PyTorch)
  train.py         - train all architectures, 5-fold CV, report metrics
  gravity_gap.py   - compute accuracy ON vs OFF gravity per fault class
  select.py        - compare models, produce selection report
```

### Architectures a evaluer

| Architecture | Rationale | Input |
|-------------|-----------|-------|
| GBM (LightGBM) | Baseline, tres efficace sur features engineered | Lock-in bank (16 features) + context (4) |
| MLP 3 couches | Standard, bon compromis | Lock-in bank + MCSA + context |
| 1D-CNN | Capte motifs spectraux locaux | FFT spectrum (512 bins) |
| LSTM | Motifs temporels, utile si signal varie | Sequence de magnitudes lock-in |
| MLP conditionne (FiLM) | Encode explicitement l'effet gravite | Lock-in bank + gravity conditioning |

### Metriques de selection

```python
metrics = {
    "accuracy_1g":        float,   # precision globale en conditions terrestres
    "accuracy_0g":        float,   # precision en microgravite
    "gravity_gap":        float,   # accuracy_1g - accuracy_0g (la metrique cle)
    "per_fault_gap":      dict,    # gravity_gap par classe D1..D5
    "params":             int,     # nb de parametres
    "inference_ms":       float,   # temps d inference sur CPU
}
```

Le modele retenu minimise `gravity_gap` tout en maintenant `accuracy_1g >= 0.90`.

---

## Ordre d'implementation

### Sprint 1 (2-3 jours) : Control API + MCP tools

1. Ecrire `spk-control-api.js` et l'injecter dans `nodeeditor/index.html`
2. Valider manuellement via la console browser que `window.__spk.run(3)` fonctionne
3. Ecrire `McpSpikypandaBehavior` dans mcp-for-babylon en suivant le pattern Cesium
4. Connecter via MCP Inspector et tester les 8 outils

### Sprint 2 (1 jour) : Agent loop

5. Ecrire le system prompt scientifique
6. Lancer l'agent sur 5 experiments manuels (1 par fault type, 1g vs 0g)
7. Verifier que les JSONs de sortie sont coherents avec les observations deja faites

### Sprint 3 (2 jours) : Dataset generation

8. Lancer l'agent sur la matrice complete (80 cells)
9. Valider le CSV export (8192 samples x N channels x 80 runs)

### Sprint 4 (2-3 jours) : ML pipeline

10. Ecrire `features.py`, `models.py`, `train.py`
11. Entrainer GBM et MLP sur le dataset simule
12. Mesurer `gravity_gap` par fault class
13. Produire le tableau de selection

### Sprint 5 (1 jour) : Documentation

14. L'agent genere le rapport final (hypotheses confirmes/infirmes, tableau de
    performance, modele selectionne, recommandations pour Phase 2)

---

## Ce que l'agent sait faire seul

Une fois les 4 premiers composants en place, l'agent peut executer ce cycle
sans intervention humaine :

```
LOOP:
  1. Choisir le prochain experiment dans la matrice (ou generer une nouvelle
     hypothese a tester si la matrice est epuisee)
  2. spk_configure_scenario + spk_run_simulation
  3. spk_read_amplitudes + spk_read_fft_peak (sur tous les canaux)
  4. Comparer avec l'experiment baseline (gravite OFF)
  5. Calculer gravity_sensitivity, confirmer/infirmer l'hypothese courante
  6. Si une anomalie est detectee : proposer un experiment supplementaire
  7. Appeler le pipeline ML si suffisamment de donnees
  8. Documenter en Markdown : hypothese, protocole, resultats, conclusion
  9. Committer sur git
```

C'est un agent scientifique complet : plan -> experiment -> observation ->
hypothese -> test -> modele -> documentation. Tout ce qu'un doctorant
ferait en 3 mois, en quelques heures de simulation.

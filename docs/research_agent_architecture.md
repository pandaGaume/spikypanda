# Research Agent Architecture (framework)

**Date :** 2026-05-09
**Statut :** infrastructure beta livree. Sessions et autonomie : v1 valide, en attente d'implementation.
**Scope :** documentation generique de la couche MCP + project lifecycle qui porte les agents scientifiques de SpikyPanda. Domain-agnostic. Les contenus specifiques (motor PMSM, IMU driver detection, KWS, etc.) vivent dans des projets et grammars dedies.

---

## Pourquoi ce framework

Un agent scientifique R&D doit pouvoir, en autonomie bornee :

1. Comprendre une demande utilisateur, en extraire un objectif structure
2. Lister les prerequisites a verifier avant de commencer (ops disponibles, formules documentees, dataset minimal, etc.)
3. Definir des hypotheses falsifiables et une matrice experimentale
4. Iterer par cycles : configure -> run -> mesure -> log -> hypothesise -> repete
5. Demander un arbitrage utilisateur uniquement aux bifurcations strategiques, avec une option par defaut
6. Produire un livrable (rapport, dataset, modele entraine) et trace de tout

L'infrastructure decrite ci-dessous fournit les **primitives** ; le **comportement** est encode dans des grammar profiles + prompts.

---

## Vue d'ensemble

```
                      ┌──────────────────────────────────────────────┐
                      │           Scientific Agent (LLM)             │
                      │  Claude Code / GPT-4 / Gemini  ...           │
                      └───────┬────────────────────────────┬─────────┘
                              │ MCP (SSE / stdio)          │ MCP
                  spikypanda-sim                    spikypanda-projects
                  spikypanda-research               spikypanda-sessions  (post-v1)
                              │                            │
   ┌──────────────────────────┴────────────────────────────┴───────────┐
   │ server.mjs : single-process host                                  │
   │                                                                   │
   │   WsTunnel (port 8080)                                            │
   │     /provider/<name>     <- providers connect via WS              │
   │     /<name>/mcp          -> SSE endpoint for Claude               │
   │     /                    -> static www/                           │
   │                                                                   │
   │   In-process providers connected to the tunnel as WS clients :    │
   │     - "research" (filesystem-backed, mutable root)                │
   │     - "projects" (filesystem-backed, shares research root)        │
   │                                                                   │
   │   Browser providers connected via the page :                      │
   │     - "nodeeditor" (when nodeeditor-mcp.html or                   │
   │                     research-project.html has Connect engaged)    │
   │                                                                   │
   │   Admin HTTP (port 8081)                                          │
   │     /admin/research-dir              GET / POST                   │
   │     /admin/projects                  GET / POST                   │
   │     /admin/projects/:id              GET / PATCH / DELETE         │
   │     /admin/projects/:id/status       POST                         │
   │     /admin/projects/:id/prereqs      PUT                          │
   │     /admin/projects/:id/prereq/:pid  POST (result or /ack)        │
   │     /admin/projects/:id/hypotheses   PUT                          │
   │     /admin/projects/:id/matrix       PUT                          │
   └───────────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │ Filesystem (research root, default ~/spikypanda-research)          │
   │                                                                   │
   │   experiments/        global JSON entries                         │
   │   hypotheses/         global markdown documents                   │
   │   reports/            global markdown documents                   │
   │   dataset/manifest.json                                           │
   │                                                                   │
   │   projects/<id>/                                                  │
   │     project.json      goal, prereqs, hypotheses, matrix, stats    │
   │     experiments/      project-tagged experiment records           │
   │     hypotheses/                                                   │
   │     reports/                                                      │
   │     training/         place reserved for ML training artifacts    │
   │     sessions/<sid>/   (post-v1)                                   │
   │       session.json    mode, status, working memory, decisions     │
   │       journal.jsonl   append-only research log                    │
   └───────────────────────────────────────────────────────────────────┘
```

---

## Couche 1 : Browser MCP (sim)

**Provider name :** `nodeeditor` (configurable via the page UI)
**Endpoint Claude :** `http://localhost:8080/nodeeditor/mcp`

Hosted in the browser, behind the page `nodeeditor-mcp.html` (or `research-project.html` for project-bound work). The provider only runs while the page is open and Connect is engaged.

### Behaviors and tools

| Behavior | Tools |
|---|---|
| `SpkScenarioBehavior` | `scenario_list_nodes`, `scenario_list_ops`, `scenario_describe_op`, `scenario_configure_node` |
| `SpkSimBehavior` | `sim_status`, `sim_run`, `sim_reset`, `sim_toggle_gravity` |
| `SpkMeasureBehavior` | `measure_read_amplitudes`, `measure_read_fft_peak`, `measure_export_data` |
| `McpGrammarBehavior` | `grammar_list`, `grammar_read`, `grammar_set`, `grammar_delete`, `grammar_import`, `grammar_export` |

### Resources

- `spk://scenario`     live graph snapshot (nodes, ops, configs, running flags)
- `spk://simulation`   simulation status (mode, sample rate, running source ids)
- `spk://measurement`  current amplitudes
- `spk://ops`          full op registry derived from `window.__spkOps` (OPS_V1)
- `spk://scenario/node/{nodeId}`, `spk://ops/{opId}`  templates

### Generic-by-construction

The behaviors never hardcode any op id. `scenario_configure_node` accepts `nodeId` or `opId`, validates it against the live op registry, and forwards the config keys verbatim. Adding a new op in `spikypanda-ops.js` automatically extends the surface (op registry exposed as a resource, op list as `enum` in the relevant tool inputSchemas) without modifying the MCP package.

---

## Couche 2 : Node-side MCP (research, projects)

Both providers run inside `server.mjs`. They connect to the WsTunnel as if they were external WebSocket providers, which keeps the routing logic uniform with the browser provider.

### `SpkResearchBehavior`

Filesystem-backed. The root directory is mutable at runtime via `/admin/research-dir` (GET/POST) ; the page header has a "Research dir" input that calls this endpoint. When changed, every research surface (research + projects) follows the new root.

Tools :

| Tool | Effect |
|---|---|
| `log_experiment(scenario, measurements, notes, projectId?)` | writes JSON to `experiments/<id>.json` ; if `projectId`, also dual-writes to `projects/<id>/experiments/<id>.json` |
| `get_experiments(limit?, since?)` | newest-first listing |
| `write_hypothesis(name, content, projectId?)` | project-local when projectId is set ; otherwise global |
| `update_hypothesis(...)` | alias of write_hypothesis |
| `list_hypotheses` |  |
| `write_report(name, content, projectId?)` | same project-local rule |
| `read_report(name, projectId?)` |  |
| `list_reports` |  |
| `add_dataset_entry(label, features, source, projectId?)` | appends to global manifest, tagged with projectId when set |
| `get_dataset_manifest` |  |

### `SpkProjectBehavior`

Filesystem-backed under `<research-root>/projects/<id>/`. One project = one directory.

Project schema :

```typescript
interface Project {
    id, name, goal, notes, status: "draft" | "ready" | "active" | "closed";
    createdAt, updatedAt;
    hypotheses:    [{ id, statement, falsifyIf, status, notes? }];
    prerequisites: [{ id, type: "auto"|"manual", category, description,
                       check?: { kind, args }, remediation?,
                       status: "pending"|"pass"|"fail"|"acked",
                       lastRun?, message?, ackedBy?, ackedAt? }];
    matrix:        { factors: { <name>: [...] }, replicates?, totalRuns? } | null;
    artifacts:     [{ id, type, path, createdAt, metadata? }];
    stats:         { runsCompleted, datasetEntries, reportCount, trainingRuns };
}
```

Tools :

`project_list`, `project_get`, `project_create`, `project_update`, `project_delete`, `project_set_status`, `project_define_prerequisites`, `project_set_prereq_result`, `project_ack_prereq`, `project_define_hypotheses`, `project_set_hypothesis_status`, `project_set_matrix`, `project_record_artifact`, `project_list_check_kinds`.

### Prereq engine

Two execution sites :

1. **Browser** (`window.SpkPrereqChecks`) for everything that needs the live runtime : op registry, active graph state, op port shapes, library presence.
2. **Node** (admin HTTP) for filesystem-only checks : research dir writable, dataset entry count.

The agent picks one of the catalogue `kind` values (returned by `project_list_check_kinds`) when defining auto prereqs ; the page runs them and posts the result back via `project_set_prereq_result`. Manual prereqs require an `ack` posted from the page or by the agent itself once the remediation is done.

Built-in catalogue v1 :

| kind | runs on | args | meaning |
|---|---|---|---|
| `spk_api_available` | browser | - | window.__spk loaded |
| `op_registered` | browser | `opId` | op id present in OPS_V1 |
| `op_in_active_graph` | browser | `opId` | active graph has at least one node of that op |
| `port_present` | browser | `opId, port, direction` | op exposes a named port |
| `graph_in_library` | browser | `name` | static fixture file exists under `/data/graphs/` |
| `research_dir_writable` | browser | - | admin endpoint reachable + writable |
| `dataset_min_entries` | browser | `n` | (placeholder for v2 ; admin manifest endpoint pending) |

The catalogue is open : adding a new kind is one entry in `BUILT_IN_CHECK_KINDS` (Node side, for the schema enum) plus one function in `window.SpkPrereqChecks` (browser side).

---

## Couche 3 : Pages web

| Page | Role |
|---|---|
| `nodeeditor-mcp.html` | scratch console : connect to sim provider, run prereq checks ad-hoc, agent log |
| `research-projects.html` | list of projects + creation form (name, goal, notes) |
| `research-project.html?id=<id>` | per-project workspace : prereqs (with Run / Ack), hypotheses, matrix, stats, status transitions |
| `research-session.html?project=<pid>&session=<sid>` | (post-v1) live session view : journal stream, working memory, pending decisions, mode selector |

All pages share the same hidden node-editor stack (`#editor-container`, `#toolbar`, `#ne-play-panel`) so `window.__spk` and `window.__spkOps` are available wherever the page runs.

---

## Couche 4 : Grammar profiles

Grammar is the layer where domain expertise lives. Tools and parameters carry baseline English fallback descriptions in their TypeScript source ; grammars override them per session with richer or domain-specific text.

### Layout cible (en cours de generalisation)

```
packages/dev/mcp/grammars/
  generic/
    autonomy-fr.json     research-loop rules, interrupt criteria, default-behavior
    autonomy-en.json
  domains/
    motor-pmsm/
      physics-fr.json    BPFO formulas, ECX constants, lock-in conventions
      physics-en.json
    imu-driver-edge/     (future)
      physics-fr.json    quaternions, accel norm, ZUPT, edge model constraints
      physics-en.json
    kws/                 (future)
      physics-fr.json    MFCC, spectrogram, RNN/CNN edge
      physics-en.json
```

Resolution : at session start, the server merges `domains/<project.domain>/physics-<lang>` + `generic/autonomy-<lang>` into the session grammar via the existing `McpGrammarStore` plumbing. Both layers are JSON, hot-reloadable, and addressable from the agent itself via `grammar_set` if it wants to refine its own descriptions in-flight.

### v1 effective layout (single domain, no generic split yet)

```
packages/dev/mcp/grammars/
  physics-fr.json
  physics-en.json
  projects-fr.json
```

To migrate to the cible layout : split `physics-*` into `domains/motor-pmsm/physics-*`, add the field `Project.domain`, extract the autonomy rules from `physics-*` into `generic/autonomy-*`. Pure data move, no code change.

---

## Sessions, journal, autonomie (v1 valide, a implementer)

Cible : un agent peut ouvrir une **session** de recherche sur un projet, travailler en cycles, log un journal append-only, lever des **decisions** non bloquantes (avec option par defaut + deadline), et fermer avec un livrable. Trois modes d'autonomie : `copilot`, `supervised` (defaut), `autonomous`. Les decisions non resolues au deadline sont auto-resolues cote Node avec le default propose.

Le scope, le schema data, les tools et l'UI sont specifies en detail dans la conversation de planification (voir `git log` autour du 2026-05-09). Implementation a venir.

---

## Comment porter un nouveau domaine sur ce framework

Le scenario de reference : "trouver un modele d'IA leger pour detecter le conducteur d'une voiture en utilisant un MCU avec une IMU 6 axes".

1. **Creer un projet** via la page : name="imu-driver-detection", goal="..."
2. **Ecrire la grammar** `domains/imu-driver-edge/physics-fr.json` (formules domain : norm acceleration, jerk, ZUPT, MFCC si signal vibration, contraintes edge MCU < 200 ko, etc.)
3. **Etendre le check kind catalogue** si besoin : ex. `model_in_onnx_library` (verifie qu'un .onnx candidat est present), `mcu_target_size` (verifie une borne sur le binaire genere)
4. **Le LLM definit lui-meme les prereqs** depuis le projet en s'appuyant sur le catalogue
5. **Ajouter des tools custom** uniquement si les actions sortent du perimetre actuel (ex. `train_onnx_on_cuda` : Python subprocess via une nouvelle behavior server-side, pour le round-trip CUDA training)

Aucun changement requis sur les behaviors existants. Tout ce qui est pose au-dessus de SpikyPanda est generique par construction.

---

## Roadmap

| Phase | Statut | Contenu |
|---|---|---|
| MCP bridge (Control API + 4 behaviors) | livre beta | `nodeeditor.js` -> `window.__spk`, scenario/sim/measure/projects/research |
| Pages projets + prereq engine | livre beta | research-projects.html, research-project.html, prereq-checks.js |
| Sessions + journal + decisions + autonomie | v1 valide | a implementer (extension SpkProjectBehavior + research-session.html) |
| Grammar splitting (generic + domain) | a faire | `domains/<dom>/` + `generic/autonomy-*` ; migrer motor-pmsm |
| Autonomy grammar (interrupt rules) | a faire | extraire du physics-* + completer |
| Pipeline ML Python (CUDA round-trip) | a faire | `project_generate_training_script`, `project_run_training`, `__spk.applyOnnxWeights` |
| First domain run : motor-pmsm phase 1 | a faire | apres sessions livrees, voir `project_motor_pmsm_phase1.md` |

---

## Conventions

- Tous les chemins utilisateur (research dir, project dirs, exports) sont sous une **racine unique mutable** (`<research-dir>`)
- Les tools sont **namespace** par behavior (`scenario_*`, `sim_*`, `measure_*`, `project_*`, `research_*` (via tool names like log_experiment), `session_*` post-v1)
- Les ops du graphe sont **toujours** identifies par leur opId (`spk.MotorPMSM`, `spk.FaultPmsm.Imbalance`, ...) ; aucune indirection moteur dans le framework
- Une experience peut etre **globale** (sans projectId) ou **liee** a un projet (avec projectId, dual-write en v1) ; l'agent decide
- Les grammars sont **donnees pures**, jamais du code ; modifiables a chaud via `grammar_set` ou en editant le JSON et reconnectant

# SpikyPanda Documentation Index

## Architecture and Vision

| Document | Description |
|---|---|
| [Structural Plasticity Vision](architecture/plasticity-vision.md) | Core differentiator of SpikyPanda: online structural adaptation (synaptogenesis, pruning, Hebbian learning). Why tensor frameworks cannot do this. |
| [World Models and Regulation](architecture/world-models-and-regulation.md) ([FR](architecture/world-models-and-regulation.fr.md)) | Why dynamics alone is not a world model. The cost function is what turns prediction into decision. Lessons from the CO2 MPC demo and the connection to factor graphs / STAG. |
| [From Single-Loop to Coupled Systems](architecture/from-single-loop-to-coupled-systems.md) ([FR](architecture/from-single-loop-to-coupled-systems.fr.md)) | Narrative arc connecting the CO2 demo to upcoming coupled-system work. Why single-objective control does not justify MPC but multi-subsystem arbitration does. The position SpikyPanda takes. |
| [Graph Pipelines (v0.5 beta)](architecture/graph-pipelines.md) | Visual-programming layer over the sample tree. Node editor produces `.spikypanda` graphs that a standalone graph runner executes; sink pages (Scope, DatasetCapture) subscribe to streams via a SharedWorker bus. Stream protocol, op interface, runtime contract, and the recipe for adding new ops. |
| [Graph, Runtime and Validation Architecture](architecture/graph-runtime-architecture.md) ([FR](architecture/graph-runtime-architecture.fr.md)) | End-to-end reference for the compute layer: the graph hierarchy (ComputeGraph, MLP/CNN/RNN domain graphs, QuantizedCnnGraph, OnnxGraph), the runtime algorithms (`readyQueueDispatch`, CNN per-layer accumulation, LSTM/GRU state, ONNX `infer`), the quantization pipeline (Phase 7: CyanMycelium conventions, calibration, QLinear export, fake-quant TS import), and the four-layer validation strategy that culminates in bit-perfect cross-validation against Python onnxruntime. |
| [HELIOS Project Overview (FR)](architecture/helios-project-overview.fr.md) | Complete public-facing project sheet for HELIOS: CO2-to-CH4 closed loop life support digital twin with distributed autonomous agents and LLM-directed crisis training scenarios. Covers context and motivation, Sabatier chemistry, ISRU variant (zeolite from lunar regolith + recyclable Ni), the four conservation loops, 28-agent distribution with R-601 reactor focus, three-runtime deployment topology, VR/AR research-grade experience layer, MCP scenario director (LLM as game master with bounded MCP surface, never touching physics or safety agents), open source / non-ITAR positioning, NASA program compatibility (ECLSS Forward, NextSTEP, HRP, STMD, HPSC), full 13-sprint roadmap with deliverables. Self-contained reference for any new contributor, advisor, or institutional partner. |
| [HELIOS Website Brief (FR)](architecture/helios-website-brief.fr.md) | Complete design brief for the bilingual (FR/EN) HELIOS public website. Targets institutional readability (NASA, Axiom, ESA) with SF atmosphere, sober technical density over startup-style splash. Covers personas, tone of voice with vocabulary do/don't, dark-mode SF visual direction with amber accent, six-page IA, page-by-page content briefs, bilingual strategy, technical specs (Astro static + Cloudflare Pages, no server infrastructure), explicit anti-patterns to avoid, reference sites (Astrobotic, Voyager Space, Synchron, Sierra Space, Axiom, Anthropic, DeepMind, etc.), and ready-to-use copy in both languages for hero, meta, cards, footer. Direct input for Claude design or external studio. |
| [HELIOS Website Copy (FR/EN)](architecture/helios-website-copy.fr-en.md) | Full rendered content for the 6 HELIOS website pages (Home, Mission, System, Research, Resources, About) in French and English, ready to drop into mockups. Structured page-by-page with `[HERO]`, `[SECTION]` markers for designer cross-reference. Derived rigorously from the project overview, design framework, and agent manifest. Uses agreed parameters: domain helios.iofmars.com, repo github.com/iofmars/helios, contact contact@iofmars.com, Apache 2.0 license, NASA programs framed as design compatibility not contractual engagement, footer mentions SpikyPanda + CyanMycelium without nominative attribution. |
| [HELIOS Website Visuals Specs (FR)](architecture/helios-website-visuals-specs.fr.md) | Detailed specifications for the 4 missing visuals needed by the website (3-runtime topology diagram, coupled Sabatier + electrolysis reactions, PFD with 28 agents overlay, R-601 focus zoom). Includes strict palette and typography reference, ready-to-use prompts for Claude design (or equivalent AI tools), parallel briefs for human illustrators, target dimensions, output formats (SVG primary + PNG fallback), and priority order. Workflow recommendation: AI for V1, human polish for final SVG. Estimated 2-3 days for all four. |
| [ISimGraph v2 Notes (FR)](architecture/isimgraph-v2-notes.fr.md) | Design and implementation strategy for the v2 simulation graph framework (replacement of hardcoded PmsmSimulation with JSON-loaded fractal `ISimGraph extends ISimNode`). HELIOS as reference application: lunar habitat CO2-to-CH4 closed loop PFD with optional ISRU variant. Covers open-source / non-ITAR positioning, three-runtime deployment topology (SpikyPanda design + CyanMycelium MCU + CyanMycelium Unreal Blueprint plugin), stateful node architecture, phased solver strategy (RK4 -> Boost.odeint -> SUNDIALS), surrogate models, native spectral tooling (modal analysis, DMD), conservation invariants, VR/AR research-grade experience layer (Quest 3 phase 1 -> Vision Pro phase 2), 12-sprint roadmap, and a multi-level glossary (PFD, ISRU, HPSC, ECLSS, NASA-TLX, SAGAT, ODE/DAE, BDF, FNO, DMD, MCSA, Koopman, etc.). |
| [HELIOS Agent Manifest v1 (FR)](architecture/helios-agent-manifest-v1.fr.md) | First-pass agent distribution over the CO2-to-CH4 PFD: 28 agents (25 per-node + 3 cross-node) covering monitoring, advisory, control and safety roles. R-601 Sabatier reactor concentrates 6 agents (thermal regulation, heat recovery, catalyst health, conversion efficiency, runaway prevention, recycle balance). Cross-node agents implement the mass/energy conservation invariants from the ISimGraph v2 design. Each agent intended for deployment as ONNX + JSON manifest pair on the CyanMycelium/UE5 digital twin. |
| [README](README.md) | Project overview, architecture summary, available modules |

## Vision - LiDAR Perception

| Document | Description |
|---|---|
| [LiDAR Autoencoder](vision/lidar/lidar-autoencoder.md) | CNN autoencoder for 64x64x6 LiDAR occupancy grids. Known limitation: CNN fails on sparse channels (Z max, Velocity) |
| [MAE LiDAR Results](vision/lidar/mae-lidar-results.md) | ViT Masked Autoencoder per-patch reconstruction. Solves sparse channel preservation |
| [SAT LiDAR Results](vision/lidar/sat-lidar-results.md) | Spatial Attention Transformer: local attention (R=1) outperforms global attention. 10-run statistical validation + multi-scale benchmark |
| [LiDAR Data Pipeline](vision/lidar/lidar-data-pipeline.md) | Python script for projecting nuScenes LiDAR point clouds to 64x64x6 grids |

## Vision - ViT and Spatial Attention

| Document | Description |
|---|---|
| [Vision Transformers in SpikyPanda](vision/vit-sat/vision-transformers-spikypanda.md) | ViT implementation, comparison with CNN, attention mechanism analysis |
| [ViT Benchmark Results](vision/vit-sat/vit-benchmark-results.md) | MNIST classification: CNN 93% vs ViT 74% (data efficiency gap confirmed) |
| [Bottlenecks and Opportunities](vision/vit-sat/bottlenecks-and-opportunities.md) | Framework performance analysis: where SpikyPanda is limited and where it can innovate |

## Vision - Stereo Depth Estimation

| Document | Description |
|---|---|
| [Stereo CNN Progress](vision/stereo/stereo-cnn-progress.md) | Cross-synapse stereo matching: implementation, bug fixes, results (multiple obstacles MSE 0.0065). Includes honest state-of-art comparison |
| [Cross-Synapse Architecture (SVG)](vision/stereo/stereo-cross-synapse-architecture.svg) | Diagram of our approach: siamese branches with learned inter-branch synapses |
| [Cost Volume Architecture (SVG)](vision/stereo/stereo-cost-volume-architecture.svg) | Diagram of state-of-art approach: external cost volume correlation |

## Research

| Document | Description |
|---|---|
| [Comprehensive Benchmark](research/benchmark-results-comprehensive.md) | Full benchmark: CNN vs ViT vs SAT at 16x16, 32x32, 64x64 with sparse metrics (F1, ERR, Contrast Preservation). Honest assessment of what is proven vs not |
| [SAT Research Review Package](research/sat-research-review-package.md) | Complete reproduction guide for SAT results, designed for academic review |

## Structure

```
docs/
  INDEX.md                          <-- you are here
  README.md                         <-- project overview
  architecture/
    plasticity-vision.md            <-- core vision: structural plasticity
  vision/
    lidar/
      lidar-autoencoder.md          <-- CNN autoencoder
      mae-lidar-results.md          <-- ViT MAE per-patch reconstruction
      sat-lidar-results.md          <-- spatial attention results
      lidar-data-pipeline.md        <-- nuScenes data preparation
    vit-sat/
      vision-transformers-spikypanda.md  <-- ViT analysis
      vit-benchmark-results.md      <-- MNIST benchmark
      bottlenecks-and-opportunities.md   <-- performance analysis
    stereo/
      stereo-cnn-progress.md        <-- cross-synapse stereo (active)
      stereo-cross-synapse-architecture.svg
      stereo-cost-volume-architecture.svg
  research/
    benchmark-results-comprehensive.md   <-- full quantitative results
    sat-research-review-package.md       <-- reproduction guide
```

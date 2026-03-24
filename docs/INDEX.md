# SpikyPanda Documentation Index

## Architecture and Vision

| Document | Description |
|---|---|
| [Structural Plasticity Vision](architecture/plasticity-vision.md) | Core differentiator of SpikyPanda: online structural adaptation (synaptogenesis, pruning, Hebbian learning). Why tensor frameworks cannot do this. |
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

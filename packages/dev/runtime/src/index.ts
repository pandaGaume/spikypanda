// ═══════════════════════════════════════════════════════════════════════════
// @spiky-panda/runtime
//
// ONNX-like compute graph runtime for SpikyPanda neural networks.
//
// Provides a typed DAG execution engine where:
//   - Nodes are processing stages (IComputeNode)
//   - Edges carry typed data tensors (IDataLink)
//   - The graph executes in topological order (Kahn's algorithm)
//
// Designed as a foundation for future ONNX import/export support.
//
// Modules:
//   compute/  : ITensor, IComputeNode, ComputeGraph, built-in nodes
// ═══════════════════════════════════════════════════════════════════════════

export * from "./compute/index";

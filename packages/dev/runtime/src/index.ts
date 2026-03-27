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
// Modules:
//   compute/  : ITensor, IComputeNode, ComputeGraph, built-in nodes
//   onnx/     : Protobuf reader, ONNX parser (zero-dependency)
// ═══════════════════════════════════════════════════════════════════════════

export * from "./compute/index";
export * from "./onnx/index";

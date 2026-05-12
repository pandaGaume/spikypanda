// ═══════════════════════════════════════════════════════════════════════════
// OnnxGraph : ComputeGraph specialised for ONNX model inference.
//
// An ONNX model is by spec a pure forward DAG of operators with no
// feedback, no event-driven gating, and a fixed evaluation order. The
// Kahn topological order computed once at session init drives the
// fastest path through the runtime, so OnnxGraph hardcodes
// mode="static". Use ComputeGraph directly if you need a dynamic-mode
// compute graph for some other reason (closed-loop control, async
// pacing).
// ═══════════════════════════════════════════════════════════════════════════

import { ComputeGraph, IComputeNode, IDataLink } from "spikypanda-core";

export class OnnxGraph extends ComputeGraph {
    public constructor(nodes: IComputeNode[], links: IDataLink[]) {
        super(nodes, links, "static");
    }
}

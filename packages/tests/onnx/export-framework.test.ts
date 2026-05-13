/**
 * Phase 1 framework tests.
 *
 * Builds a tiny ComputeGraph of trivial Identity / Add kernels,
 * registers their ONNX serializers, exports to protobuf bytes via
 * the new framework, then parses the bytes back via OnnxParser and
 * checks that the resulting model has the expected shape (right
 * number of nodes, declared inputs / outputs, initializers absent
 * since there are no weights).
 *
 * The test does NOT exercise the import-side runtime (no
 * OnnxGraphBuilder execution); that round-trip is the job of
 * Phase 4 (cardriver). Phase 1 only validates the writer pipeline.
 */
import {
    ComputeGraph,
    DataLink,
    Kernel,
    Kernel as _Kernel,
    ITensor,
} from "spikypanda-core";
import {
    OnnxExportRegistry,
    OnnxGraphExporter,
    OnnxParser,
} from "spikypanda-onnx";

// ─── Trivial kernels ─────────────────────────────────────────────────────

class IdentityKernel extends Kernel {
    public readonly nodeType = "test_identity";
    public readonly outputShapes: number[][] = [[1]];
    public execute(inputs: ITensor[]): ITensor[] {
        return inputs.length > 0 ? [inputs[0]] : [];
    }
}

class AddKernel extends Kernel {
    public readonly nodeType = "test_add";
    public readonly outputShapes: number[][] = [[1]];
    public execute(inputs: ITensor[]): ITensor[] {
        const a = inputs[0].data;
        const b = inputs[1].data;
        const out = new Float32Array(a.length);
        for (let i = 0; i < a.length; i++) out[i] = a[i] + b[i];
        return [{ data: out, shape: inputs[0].shape, name: "sum" }];
    }
}

// ─── Registry helper ─────────────────────────────────────────────────────

function makeRegistry(): OnnxExportRegistry {
    const r = new OnnxExportRegistry();
    r.register("test_identity", (_kernel, naming, ctx) => {
        ctx.makeNode({
            opType: "Identity",
            inputs: [...naming.inputNames],
            outputs: [...naming.outputNames],
        });
    });
    r.register("test_add", (_kernel, naming, ctx) => {
        ctx.makeNode({
            opType: "Add",
            inputs: [...naming.inputNames],
            outputs: [...naming.outputNames],
        });
    });
    return r;
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("OnnxGraphExporter (framework)", () => {
    test("missing serializer raises with a helpful message", () => {
        const orphan = new IdentityKernel();
        orphan.id = "orphan";
        const graph = new ComputeGraph([orphan], []);
        const registry = new OnnxExportRegistry();
        expect(() => OnnxGraphExporter.export(graph, { registry })).toThrow(
            /no serializer registered for nodeType "test_identity"/
        );
    });

    test("single-kernel graph exports as one Identity node, with declared input & output", () => {
        const id = new IdentityKernel();
        id.id = "the_id";
        const graph = new ComputeGraph([id], []);
        const registry = makeRegistry();
        const bytes = OnnxGraphExporter.export(graph, {
            registry,
            graphName: "single",
            inputNames: new Map([[id, ["x_in"]]]),
            outputNames: new Map([[id, ["y_out"]]]),
            inputShapes: new Map([[id, [[1]]]]),
            outputShapes: new Map([[id, [[1]]]]),
        });

        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        if (!parsed) return;

        expect(parsed.graphName).toBe("single");
        expect(parsed.nodes).toHaveLength(1);
        expect(parsed.nodes[0].opType).toBe("Identity");
        expect(parsed.nodes[0].inputs).toEqual(["x_in"]);
        expect(parsed.nodes[0].outputs).toEqual(["y_out"]);
        expect(parsed.inputs.map((v) => v.name)).toEqual(["x_in"]);
        expect(parsed.outputs.map((v) => v.name)).toEqual(["y_out"]);
        expect(parsed.initializers).toHaveLength(0);
    });

    test("two-input add graph: topology and naming flow end-to-end", () => {
        // a_in ─Identity─┐
        //                ├─Add─> sum_out
        // b_in ─Identity─┘
        const idA = new IdentityKernel(); idA.id = "idA";
        const idB = new IdentityKernel(); idB.id = "idB";
        const add = new AddKernel();      add.id = "add";

        const linkA = new DataLink(idA, add, 0);
        const linkB = new DataLink(idB, add, 1);
        const graph = new ComputeGraph([idA, idB, add], [linkA, linkB]);

        const registry = makeRegistry();
        const bytes = OnnxGraphExporter.export(graph, {
            registry,
            graphName: "add2",
            inputNames: new Map([
                [idA, ["a_in"]],
                [idB, ["b_in"]],
            ]),
            outputNames: new Map([[add, ["sum_out"]]]),
        });

        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        if (!parsed) return;

        // 3 nodes (two Identity, one Add).
        expect(parsed.nodes).toHaveLength(3);

        // Graph inputs / outputs are declared with the supplied names.
        expect(parsed.inputs.map((v) => v.name).sort()).toEqual(["a_in", "b_in"]);
        expect(parsed.outputs.map((v) => v.name)).toEqual(["sum_out"]);

        // The Add node consumes both Identity outputs and produces sum_out.
        const addNode = parsed.nodes.find((n) => n.opType === "Add");
        expect(addNode).toBeDefined();
        if (!addNode) return;
        expect(addNode.outputs).toEqual(["sum_out"]);
        // Identity outputs become Add inputs — names are deterministic per kernel id.
        const identNodes = parsed.nodes.filter((n) => n.opType === "Identity");
        const identOutputs = identNodes.flatMap((n) => n.outputs).sort();
        expect(addNode.inputs.length).toBe(2);
        expect(addNode.inputs.slice().sort()).toEqual(identOutputs);
    });

    test("topological order is respected (downstream node appears after upstream)", () => {
        const idA = new IdentityKernel(); idA.id = "idA";
        const idB = new IdentityKernel(); idB.id = "idB";
        const link = new DataLink(idA, idB, 0);
        const graph = new ComputeGraph([idA, idB], [link]);

        const registry = makeRegistry();
        const bytes = OnnxGraphExporter.export(graph, {
            registry,
            inputNames: new Map([[idA, ["x"]]]),
            outputNames: new Map([[idB, ["y"]]]),
        });
        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        if (!parsed) return;

        const ops = parsed.nodes.map((n) => n.outputs[0]);
        // idA's output ("idA_out_0") must appear before idB's output ("y").
        expect(ops[0]).toBe("idA_out_0");
        expect(ops[1]).toBe("y");
    });

    test("intermediate tensor names are unique and link source-kernel outputs to consumer inputs", () => {
        const idA = new IdentityKernel(); idA.id = "idA";
        const idB = new IdentityKernel(); idB.id = "idB";
        const link = new DataLink(idA, idB, 0);
        const graph = new ComputeGraph([idA, idB], [link]);

        const bytes = OnnxGraphExporter.export(graph, {
            registry: makeRegistry(),
            inputNames: new Map([[idA, ["a"]]]),
            outputNames: new Map([[idB, ["b"]]]),
        });
        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        if (!parsed) return;

        const [nodeA, nodeB] = parsed.nodes;
        // idA reads a, writes its intermediate name.
        expect(nodeA.inputs).toEqual(["a"]);
        // idB reads the same intermediate, writes b.
        expect(nodeB.inputs).toEqual(nodeA.outputs);
        expect(nodeB.outputs).toEqual(["b"]);
    });

    test("attribute lists (intsAttrs) roundtrip via makeNode → writer → parser", () => {
        class AttrKernel extends Kernel {
            public readonly nodeType = "test_attr";
            public readonly outputShapes: number[][] = [[1]];
            public execute(_inputs: ITensor[]): ITensor[] { return []; }
        }
        const k = new AttrKernel(); k.id = "attr";
        const graph = new ComputeGraph([k], []);
        const registry = new OnnxExportRegistry();
        registry.register("test_attr", (_kernel, naming, ctx) => {
            ctx.makeNode({
                opType: "Conv",
                inputs: [...naming.inputNames],
                outputs: [...naming.outputNames],
                intsAttrs: { kernel_shape: [1, 3], strides: [1, 1], pads: [0, 0, 0, 0] },
            });
        });
        const bytes = OnnxGraphExporter.export(graph, {
            registry,
            inputNames: new Map([[k, ["X"]]]),
            outputNames: new Map([[k, ["Y"]]]),
        });
        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        if (!parsed) return;

        const conv = parsed.nodes[0];
        expect(conv.opType).toBe("Conv");
        // Scalar fallback: first value of each list.
        expect(conv.attributes.get("kernel_shape")).toBe(1);
        expect(conv.attributes.get("strides")).toBe(1);
        expect(conv.attributes.get("pads")).toBe(0);
        // Full lists in listAttributes.
        expect(conv.listAttributes).toBeDefined();
        expect(conv.listAttributes!.get("kernel_shape")).toEqual([1, 3]);
        expect(conv.listAttributes!.get("strides")).toEqual([1, 1]);
        expect(conv.listAttributes!.get("pads")).toEqual([0, 0, 0, 0]);
    });
});

/**
 * Hardened "push model at runtime" channel for the ONNX editor model
 * node: OnnxModelGraph.loadModelValidated must be atomic (double-bank).
 *
 * Covered here:
 *   - the dependency-free sha256Hex helper against known FIPS vectors,
 *   - a valid load (report contents + the model actually infers),
 *   - a correct/wrong sha256 gate (wrong sha fails BEFORE parsing and
 *     leaves the previously loaded model fully usable),
 *   - garbage bytes (parse failure and empty-model both rejected),
 *   - declared input shape and output count expectations.
 *
 * The candidate .onnx bytes are synthesized in-test with the public
 * OnnxGraphExporter (same pattern as packages/tests/onnx/
 * export-framework.test.ts) using ops the SpikyPanda import registry
 * knows (Identity, Add), so the loaded model is runnable end-to-end.
 */
import { ComputeGraph, DataLink, Kernel } from "spikypanda-core";
import type { ITensor } from "spikypanda-core";
import { OnnxExportRegistry, OnnxGraphExporter } from "spikypanda-onnx";
import { OnnxModelGraph } from "../../dev/plugins/onnx/src/graphs/model.graph";
import { sha256Hex } from "../../dev/plugins/onnx/src/graphs/sha256";

// ─── Tiny export-side kernels (structure only; execution happens in the
//     re-imported ONNX ops, not in these classes) ─────────────────────────

class IdentityKernel extends Kernel {
    public readonly nodeType = "test_identity";
    public readonly outputShapes: number[][] = [[1, 4]];
    public execute(inputs: ITensor[]): ITensor[] {
        return inputs.length > 0 ? [inputs[0]] : [];
    }
}

class AddKernel extends Kernel {
    public readonly nodeType = "test_add";
    public readonly outputShapes: number[][] = [[1, 4]];
    public execute(inputs: ITensor[]): ITensor[] {
        const a = inputs[0].data;
        const b = inputs[1].data;
        const out = new Float32Array(a.length);
        for (let i = 0; i < a.length; i++) out[i] = a[i] + b[i];
        return [{ data: out, shape: [...inputs[0].shape] }];
    }
}

function makeExportRegistry(): OnnxExportRegistry {
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

/**
 * a_in ─Identity─┐
 *                ├─Add─> sum_out          (shape [1, 4] everywhere)
 * b_in ─Identity─┘
 */
function buildAddModelBytes(): Uint8Array {
    const idA = new IdentityKernel();
    idA.id = "idA";
    const idB = new IdentityKernel();
    idB.id = "idB";
    const add = new AddKernel();
    add.id = "add";
    const graph = new ComputeGraph([idA, idB, add], [new DataLink(idA, add, 0), new DataLink(idB, add, 1)]);
    return OnnxGraphExporter.export(graph, {
        registry: makeExportRegistry(),
        graphName: "validated-add",
        inputNames: new Map([
            [idA, ["a_in"]],
            [idB, ["b_in"]],
        ]),
        inputShapes: new Map([
            [idA, [[1, 4]]],
            [idB, [[1, 4]]],
        ]),
        outputNames: new Map([[add, ["sum_out"]]]),
        outputShapes: new Map([[add, [[1, 4]]]]),
    });
}

/** Copy a Uint8Array into a fresh, exactly-sized ArrayBuffer. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
}

/** Run the loaded model and return sum_out's data. */
function inferSum(graph: OnnxModelGraph, a: number[], b: number[]): Float32Array {
    const result = graph.infer(
        new Map<string, ITensor>([
            ["a_in", { data: Float32Array.from(a), shape: [1, a.length], name: "a_in" }],
            ["b_in", { data: Float32Array.from(b), shape: [1, b.length], name: "b_in" }],
        ])
    );
    const sum = result.get("sum_out");
    expect(sum).toBeDefined();
    return sum!.data;
}

/** Assert the graph still exposes the add-model topology and infers. */
function expectAddModelIntact(graph: OnnxModelGraph, modelName: string): void {
    expect(graph.isLoaded).toBe(true);
    expect(graph.modelName).toBe(modelName);
    expect(graph.inputs.map((n) => n.id)).toEqual(["a_in", "b_in"]);
    expect(graph.inputPorts).toHaveLength(2);
    expect(graph.outputs).toHaveLength(1);
    expect(Array.from(inferSum(graph, [1, 2, 3, 4], [10, 20, 30, 40]))).toEqual([11, 22, 33, 44]);
}

// ─── sha256 helper ────────────────────────────────────────────────────────

describe("sha256Hex (dependency-free)", () => {
    test("empty input", () => {
        expect(sha256Hex(new Uint8Array(0))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });

    test('"abc"', () => {
        expect(sha256Hex(new TextEncoder().encode("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    });

    test("56-byte input (padding spills into a second block)", () => {
        const msg = "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq";
        expect(sha256Hex(new TextEncoder().encode(msg))).toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
    });

    test("one million 'a' (multi-block, exercises the length trailer)", () => {
        const msg = new Uint8Array(1_000_000).fill(0x61);
        expect(sha256Hex(msg)).toBe("cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0");
    });
});

// ─── loadModelValidated ───────────────────────────────────────────────────

describe("OnnxModelGraph.loadModelValidated", () => {
    test("valid load: ok report, ports exposed, model infers", () => {
        const graph = new OnnxModelGraph();
        const bytes = buildAddModelBytes();

        const report = graph.loadModelValidated(bytes, { name: "add.onnx" });

        expect(report.ok).toBe(true);
        expect(report.error).toBeUndefined();
        expect(report.sha256).toBe(sha256Hex(bytes));
        expect(report.inputNames).toEqual(["a_in", "b_in"]);
        expect(report.outputNames).toEqual(["sum_out"]);
        expect(graph.loadError).toBeNull();
        expectAddModelIntact(graph, "add.onnx");
    });

    test("correct sha256 (case-insensitive) passes the gate", () => {
        const graph = new OnnxModelGraph();
        const bytes = buildAddModelBytes();

        const report = graph.loadModelValidated(bytes, {
            name: "add.onnx",
            sha256: sha256Hex(bytes).toUpperCase(),
        });

        expect(report.ok).toBe(true);
        expect(graph.loadError).toBeNull();
        expectAddModelIntact(graph, "add.onnx");
    });

    test("wrong sha256 fails before parsing and leaves the previous model intact", () => {
        const graph = new OnnxModelGraph();
        const bytes = buildAddModelBytes();
        expect(graph.loadModelValidated(bytes, { name: "first.onnx" }).ok).toBe(true);

        const report = graph.loadModelValidated(bytes, {
            name: "evil.onnx",
            sha256: "0".repeat(64),
        });

        expect(report.ok).toBe(false);
        expect(report.error).toMatch(/SHA-256 mismatch/);
        expect(report.sha256).toBe(sha256Hex(bytes));
        expect(report.inputNames).toEqual([]);
        expect(report.outputNames).toEqual([]);
        expect(graph.loadError).toBe(report.error);
        // The FIRST model is still loaded, still exposes its ports, still infers.
        expectAddModelIntact(graph, "first.onnx");
    });

    test("garbage bytes (unparsable) fail and leave the previous model intact", () => {
        const graph = new OnnxModelGraph();
        expect(graph.loadModelValidated(buildAddModelBytes(), { name: "first.onnx" }).ok).toBe(true);

        const garbage = new TextEncoder().encode("definitely not an onnx model");
        const report = graph.loadModelValidated(garbage, { name: "garbage.onnx" });

        expect(report.ok).toBe(false);
        expect(report.error).toBe("Failed to parse ONNX model");
        expect(graph.loadError).toBe(report.error);
        expectAddModelIntact(graph, "first.onnx");
    });

    test("bytes that parse to an empty model are rejected (no silent blank swap)", () => {
        const graph = new OnnxModelGraph();
        expect(graph.loadModelValidated(buildAddModelBytes(), { name: "first.onnx" }).ok).toBe(true);

        // All-0xFF never yields a complete varint, so the protobuf tag
        // loop ends at EOF with an empty (but non-null) parse result.
        const report = graph.loadModelValidated(new Uint8Array(32).fill(0xff), { name: "blank.onnx" });

        expect(report.ok).toBe(false);
        expect(report.error).toBe("ONNX model contains no nodes");
        expectAddModelIntact(graph, "first.onnx");
    });

    test("wrong expectOutputCount fails and leaves the previous model intact", () => {
        const graph = new OnnxModelGraph();
        const bytes = buildAddModelBytes();
        expect(graph.loadModelValidated(bytes, { name: "first.onnx" }).ok).toBe(true);

        const report = graph.loadModelValidated(bytes, { name: "second.onnx", expectOutputCount: 2 });

        expect(report.ok).toBe(false);
        expect(report.error).toMatch(/Output count mismatch: model declares 1, expected 2/);
        expectAddModelIntact(graph, "first.onnx");
    });

    test("matching expectOutputCount passes", () => {
        const graph = new OnnxModelGraph();
        const report = graph.loadModelValidated(buildAddModelBytes(), { expectOutputCount: 1 });
        expect(report.ok).toBe(true);
    });

    test("expectInputShape: exact match and wildcard dynamic dims pass", () => {
        const bytes = buildAddModelBytes();

        const exact = new OnnxModelGraph().loadModelValidated(bytes, { expectInputShape: [1, 4] });
        expect(exact.ok).toBe(true);

        // Expected dim <= 0 acts as a wildcard (dynamic batch).
        const wildcard = new OnnxModelGraph().loadModelValidated(bytes, { expectInputShape: [0, 4] });
        expect(wildcard.ok).toBe(true);
    });

    test("expectInputShape: rank or dimension mismatch fails, previous model intact", () => {
        const graph = new OnnxModelGraph();
        const bytes = buildAddModelBytes();
        expect(graph.loadModelValidated(bytes, { name: "first.onnx" }).ok).toBe(true);

        const wrongRank = graph.loadModelValidated(bytes, { expectInputShape: [4] });
        expect(wrongRank.ok).toBe(false);
        expect(wrongRank.error).toMatch(/Input shape mismatch on "a_in"/);
        expect(wrongRank.error).toMatch(/rank/);

        const wrongDim = graph.loadModelValidated(bytes, { expectInputShape: [1, 8] });
        expect(wrongDim.ok).toBe(false);
        expect(wrongDim.error).toMatch(/Input shape mismatch on "a_in"/);

        expectAddModelIntact(graph, "first.onnx");
    });

    test("expectOutputShape: exact match and wildcard dynamic dims pass", () => {
        const bytes = buildAddModelBytes();

        const exact = new OnnxModelGraph().loadModelValidated(bytes, { expectOutputShape: [1, 4] });
        expect(exact.ok).toBe(true);

        // Expected dim <= 0 acts as a wildcard (dynamic batch), the
        // exact rule expectInputShape already follows.
        const wildcard = new OnnxModelGraph().loadModelValidated(bytes, { expectOutputShape: [0, 4] });
        expect(wildcard.ok).toBe(true);
    });

    test("expectOutputShape: rank or dimension mismatch fails, previous model intact", () => {
        const graph = new OnnxModelGraph();
        const bytes = buildAddModelBytes();
        expect(graph.loadModelValidated(bytes, { name: "first.onnx" }).ok).toBe(true);

        const wrongRank = graph.loadModelValidated(bytes, { name: "evil.onnx", expectOutputShape: [4] });
        expect(wrongRank.ok).toBe(false);
        expect(wrongRank.error).toMatch(/Output shape mismatch on "sum_out"/);
        expect(wrongRank.error).toMatch(/rank/);

        const wrongDim = graph.loadModelValidated(bytes, { name: "evil.onnx", expectOutputShape: [1, 8] });
        expect(wrongDim.ok).toBe(false);
        expect(wrongDim.error).toMatch(/Output shape mismatch on "sum_out"/);

        // The FIRST model stays fully active: no half-committed swap.
        expectAddModelIntact(graph, "first.onnx");
    });

    test("a successful load after a rejection clears loadError", () => {
        const graph = new OnnxModelGraph();
        const bytes = buildAddModelBytes();
        expect(graph.loadModelValidated(bytes, { sha256: "0".repeat(64) }).ok).toBe(false);
        expect(graph.loadError).not.toBeNull();

        const report = graph.loadModelValidated(bytes, { name: "add.onnx" });
        expect(report.ok).toBe(true);
        expect(graph.loadError).toBeNull();
        expectAddModelIntact(graph, "add.onnx");
    });

    test("ArrayBuffer input is accepted like Uint8Array", () => {
        const bytes = buildAddModelBytes();
        const graph = new OnnxModelGraph();
        const report = graph.loadModelValidated(toArrayBuffer(bytes), { name: "ab.onnx" });
        expect(report.ok).toBe(true);
        expect(report.sha256).toBe(sha256Hex(bytes));
        expectAddModelIntact(graph, "ab.onnx");
    });

    test("legacy loadModel keeps its public behavior (success and parse failure)", () => {
        const bytes = buildAddModelBytes();

        const ok = new OnnxModelGraph();
        ok.loadModel(toArrayBuffer(bytes), "legacy.onnx");
        expect(ok.loadError).toBeNull();
        expectAddModelIntact(ok, "legacy.onnx");

        const bad = new OnnxModelGraph();
        const garbage = new TextEncoder().encode("definitely not an onnx model");
        bad.loadModel(toArrayBuffer(garbage), "bad.onnx");
        expect(bad.loadError).toBe("Failed to parse ONNX model");
        expect(bad.isLoaded).toBe(false);
        expect(bad.modelName).toBe("");
    });
});

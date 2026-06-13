/**
 * Streaming an OnnxModelGraph embedded as a node in a parent
 * RuntimeGraph session (fractal boundary ports, editor wiring
 * convention: channel.slot = SOURCE output port name, channel.toSlot =
 * DESTINATION input port name; model inputs are addressed by their
 * ONNX tensor name as the toSlot).
 *
 * Covered here:
 *   - single-input single-output streaming over several ticks,
 *   - a two-input model fed from two producers (including the
 *     staggered case: the model waits until both inputs arrived),
 *   - model swap at runtime (loadModelValidated with a different
 *     model while embedded: streaming follows the new model, stale
 *     ports do not leak),
 *   - infer() keeps working on the same embedded instance,
 *   - an UNLOADED model node does not break session.run (tokens are
 *     dropped, and a later load starts streaming mid-session).
 *
 * The candidate .onnx bytes are synthesized in-test with the public
 * OnnxGraphExporter (same pattern as model-validated.test.ts) using
 * ops the SpikyPanda import registry knows (Identity, Add).
 */
import { Channel, ComputeGraph, DataLink, Kernel, RuntimeGraph, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, IRuntimeNode, ISession, ITensor } from "spikypanda-core";
import { OnnxExportRegistry, OnnxGraphExporter } from "spikypanda-onnx";
import { OnnxModelGraph } from "../../dev/plugins/onnx/src/graphs/model.graph";

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

/** x_in ─Identity─> y_out (shape [1, 4]). */
function buildIdentityModelBytes(): Uint8Array {
    const id = new IdentityKernel();
    id.id = "id";
    const graph = new ComputeGraph([id], []);
    return OnnxGraphExporter.export(graph, {
        registry: makeExportRegistry(),
        graphName: "streaming-identity",
        inputNames: new Map([[id, ["x_in"]]]),
        inputShapes: new Map([[id, [[1, 4]]]]),
        outputNames: new Map([[id, ["y_out"]]]),
        outputShapes: new Map([[id, [[1, 4]]]]),
    });
}

/** x_in ─Identity─> t; y_out = Add(t, t) = 2x. Same ports as identity. */
function buildDoubleModelBytes(): Uint8Array {
    const id = new IdentityKernel();
    id.id = "id";
    const add = new AddKernel();
    add.id = "add";
    const graph = new ComputeGraph([id, add], [new DataLink(id, add, 0), new DataLink(id, add, 1)]);
    return OnnxGraphExporter.export(graph, {
        registry: makeExportRegistry(),
        graphName: "streaming-double",
        inputNames: new Map([[id, ["x_in"]]]),
        inputShapes: new Map([[id, [[1, 4]]]]),
        outputNames: new Map([[add, ["y_out"]]]),
        outputShapes: new Map([[add, [[1, 4]]]]),
    });
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
        graphName: "streaming-add",
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

/**
 * x_in ─Identity─┐
 *                ├─Add─> y_out            (shape [1, 4] everywhere)
 * b_in ─Identity─┘
 *
 * PARTIAL port overlap with the identity model (x_in / y_out match,
 * b_in is new): the swap-while-partially-wired repro.
 */
function buildPartialOverlapAddModelBytes(): Uint8Array {
    const idA = new IdentityKernel();
    idA.id = "idA";
    const idB = new IdentityKernel();
    idB.id = "idB";
    const add = new AddKernel();
    add.id = "add";
    const graph = new ComputeGraph([idA, idB, add], [new DataLink(idA, add, 0), new DataLink(idB, add, 1)]);
    return OnnxGraphExporter.export(graph, {
        registry: makeExportRegistry(),
        graphName: "streaming-partial-overlap",
        inputNames: new Map([
            [idA, ["x_in"]],
            [idB, ["b_in"]],
        ]),
        inputShapes: new Map([
            [idA, [[1, 4]]],
            [idB, [[1, 4]]],
        ]),
        outputNames: new Map([[add, ["y_out"]]]),
        outputShapes: new Map([[add, [[1, 4]]]]),
    });
}

/**
 * out ─Identity─> y_out (shape [1, 4]). The input tensor is named
 * "out" ON PURPOSE: it collides with the SOURCE slot name the parent
 * producer uses, so a legacy slot-retry would misroute tokens that
 * were addressed (via toSlot) to a port this model does not declare.
 */
function buildCoincidentalOutModelBytes(): Uint8Array {
    const id = new IdentityKernel();
    id.id = "id";
    const graph = new ComputeGraph([id], []);
    return OnnxGraphExporter.export(graph, {
        registry: makeExportRegistry(),
        graphName: "streaming-coincidental-out",
        inputNames: new Map([[id, ["out"]]]),
        inputShapes: new Map([[id, [[1, 4]]]]),
        outputNames: new Map([[id, ["y_out"]]]),
        outputShapes: new Map([[id, [[1, 4]]]]),
    });
}

// ─── Parent-graph fabric: tensor producer / consumer runtime nodes ───────

/** Publishes its `value` tensor once per tick when one is staged. */
class TensorProducer extends RuntimeNode {
    public value: ITensor | null = null;
    public override isReady(_s: ISession): boolean {
        return this.enabled && this.value !== null;
    }
    public override fire(session: ISession, _t: number): void {
        if (!this.value) return;
        const out = this.onsc<IChannel>()[0];
        const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(out);
        session.publish(idx, this.value);
        this.value = null;
    }
}

/** Collects every tensor delivered on its (single) incoming channel. */
class TensorConsumer extends RuntimeNode {
    public received: ITensor[] = [];
    public override fire(session: ISession, _t: number): void {
        const inc = this.opsc<IChannel>()[0];
        const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(inc);
        const tensor = session.consume(idx) as ITensor | undefined;
        if (tensor) {
            this.received.push(tensor);
        }
    }
    public override reset(_s: ISession): void {
        this.received = [];
    }
}

function tensor(values: number[]): ITensor {
    return { data: Float32Array.from(values), shape: [1, values.length] };
}

/** Copy a Uint8Array into a fresh, exactly-sized ArrayBuffer. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
}

/**
 * Wire producer ─(toSlot)─> model ─(outSlot)─> consumer in a dynamic
 * parent graph. The channel INTO the model follows the editor
 * convention: slot = the producer's output port name ("out"), toSlot =
 * the model's ONNX input name.
 */
function buildSingleInputParent(model: OnnxModelGraph, toSlot: string, outSlot: string): { session: Session; producer: TensorProducer; consumer: TensorConsumer } {
    const producer = new TensorProducer();
    const consumer = new TensorConsumer();
    const intoModel = new Channel(producer, model, "out", false, undefined, true, toSlot);
    const fromModel = new Channel(model, consumer, outSlot);
    const parent = new RuntimeGraph<IRuntimeNode, IChannel>([producer, model, consumer], [intoModel, fromModel], "dynamic");
    return { session: new Session(parent), producer, consumer };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("OnnxModelGraph streaming in a parent RuntimeGraph session", () => {
    test("single-input single-output: one output token per published input over several ticks", () => {
        const model = new OnnxModelGraph();
        model.loadModel(toArrayBuffer(buildIdentityModelBytes()), "identity.onnx");
        const { session, producer, consumer } = buildSingleInputParent(model, "x_in", "y_out");

        const ticks = [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12],
        ];
        for (let t = 0; t < ticks.length; t++) {
            producer.value = tensor(ticks[t]);
            session.run(t);
        }

        expect(consumer.received).toHaveLength(3);
        for (let t = 0; t < ticks.length; t++) {
            expect(Array.from(consumer.received[t].data)).toEqual(ticks[t]);
        }
    });

    test("model node exposes the ONNX tensor names as wirable ports", () => {
        const model = new OnnxModelGraph();
        const report = model.loadModelValidated(buildAddModelBytes(), { name: "add.onnx" });
        expect(report.ok).toBe(true);

        expect(model.inputPorts.map((p) => p.slot)).toEqual(["a_in", "b_in"]);
        expect(model.outputPorts.map((p) => p.slot)).toEqual(["sum_out"]);
    });

    test("two-input model fed from two producers, each addressed by ONNX input name", () => {
        const model = new OnnxModelGraph();
        model.loadModel(toArrayBuffer(buildAddModelBytes()), "add.onnx");

        const pa = new TensorProducer();
        const pb = new TensorProducer();
        const consumer = new TensorConsumer();
        const parent = new RuntimeGraph<IRuntimeNode, IChannel>(
            [pa, pb, model, consumer],
            [new Channel(pa, model, "out", false, undefined, true, "a_in"), new Channel(pb, model, "out", false, undefined, true, "b_in"), new Channel(model, consumer, "sum_out")],
            "dynamic"
        );
        const session = new Session(parent);

        // Tick 0: both inputs present, one sum out.
        pa.value = tensor([1, 2, 3, 4]);
        pb.value = tensor([10, 20, 30, 40]);
        session.run(0);
        expect(consumer.received).toHaveLength(1);
        expect(Array.from(consumer.received[0].data)).toEqual([11, 22, 33, 44]);

        // Tick 1: only a_in arrives; the model waits (no output).
        pa.value = tensor([100, 100, 100, 100]);
        session.run(1);
        expect(consumer.received).toHaveLength(1);

        // Tick 2: b_in arrives; the buffered a_in pairs with it.
        pb.value = tensor([1, 1, 1, 1]);
        session.run(2);
        expect(consumer.received).toHaveLength(2);
        expect(Array.from(consumer.received[1].data)).toEqual([101, 101, 101, 101]);
    });

    test("model swap at runtime: streaming follows the new model through the same wiring", () => {
        const model = new OnnxModelGraph();
        model.loadModel(toArrayBuffer(buildIdentityModelBytes()), "identity.onnx");
        const { session, producer, consumer } = buildSingleInputParent(model, "x_in", "y_out");

        producer.value = tensor([1, 2, 3, 4]);
        session.run(0);
        expect(Array.from(consumer.received[0].data)).toEqual([1, 2, 3, 4]);

        // Swap to the doubling model (same port names) WHILE embedded.
        const report = model.loadModelValidated(buildDoubleModelBytes(), { name: "double.onnx" });
        expect(report.ok).toBe(true);

        producer.value = tensor([1, 2, 3, 4]);
        session.run(1);
        expect(consumer.received).toHaveLength(2);
        expect(Array.from(consumer.received[1].data)).toEqual([2, 4, 6, 8]);
    });

    test("model swap to different port names: stale ports do not leak, session keeps running", () => {
        const model = new OnnxModelGraph();
        model.loadModel(toArrayBuffer(buildIdentityModelBytes()), "identity.onnx");
        const { session, producer, consumer } = buildSingleInputParent(model, "x_in", "y_out");

        producer.value = tensor([1, 2, 3, 4]);
        session.run(0);
        expect(consumer.received).toHaveLength(1);

        // The add model declares a_in/b_in/sum_out; the parent wiring
        // (x_in/y_out) matches nothing anymore.
        const report = model.loadModelValidated(buildAddModelBytes(), { name: "add.onnx" });
        expect(report.ok).toBe(true);
        expect(model.inputPorts.map((p) => p.slot)).toEqual(["a_in", "b_in"]);
        expect(model.outputPorts.map((p) => p.slot)).toEqual(["sum_out"]);

        // Unmatched tokens are dropped; no output, no throw, no livelock.
        producer.value = tensor([5, 6, 7, 8]);
        session.run(1);
        session.run(2);
        expect(consumer.received).toHaveLength(1);
    });

    test("infer() keeps working on the same embedded instance, before and after streaming ticks", () => {
        const model = new OnnxModelGraph();
        model.loadModel(toArrayBuffer(buildDoubleModelBytes()), "double.onnx");
        const { session, producer, consumer } = buildSingleInputParent(model, "x_in", "y_out");

        // Streaming tick first.
        producer.value = tensor([1, 1, 1, 1]);
        session.run(0);
        expect(Array.from(consumer.received[0].data)).toEqual([2, 2, 2, 2]);

        // Classic named-tensor inference on the very same instance.
        const result = model.infer(new Map<string, ITensor>([["x_in", { ...tensor([1, 2, 3, 4]), name: "x_in" }]]));
        const out = result.get("y_out");
        expect(out).toBeDefined();
        expect(Array.from(out!.data)).toEqual([2, 4, 6, 8]);

        // Streaming still works afterwards (channel tokens win over the
        // pendingInput left behind by infer()).
        producer.value = tensor([3, 3, 3, 3]);
        session.run(1);
        expect(consumer.received).toHaveLength(2);
        expect(Array.from(consumer.received[1].data)).toEqual([6, 6, 6, 6]);
    });

    test("PARTIALLY wired two-input model: tokens are dropped, repeated ticks never overflow the inner session", () => {
        const model = new OnnxModelGraph();
        model.loadModel(toArrayBuffer(buildAddModelBytes()), "add.onnx");

        // Only a_in is wired; b_in is left dangling on purpose.
        const pa = new TensorProducer();
        const consumer = new TensorConsumer();
        const parent = new RuntimeGraph<IRuntimeNode, IChannel>(
            [pa, model, consumer],
            [new Channel(pa, model, "out", false, undefined, true, "a_in"), new Channel(model, consumer, "sum_out")],
            "dynamic"
        );
        const session = new Session(parent);

        // Each tick used to half-feed the inner static graph: the Add
        // op's a-slot stayed full (capacity 1) and tick 1 threw
        // '[Session] channel overflow' out of parent session.run.
        for (let t = 0; t < 3; t++) {
            pa.value = tensor([t + 1, t + 1, t + 1, t + 1]);
            expect(() => session.run(t)).not.toThrow();
        }

        // All-or-nothing on declared input ports: nothing fired, the
        // half-fed tokens were dropped, no output reached the consumer.
        expect(consumer.received).toEqual([]);
    });

    test("loadModelValidated swap to a model with PARTIAL port overlap keeps the session alive (no overflow)", () => {
        const model = new OnnxModelGraph();
        model.loadModel(toArrayBuffer(buildIdentityModelBytes()), "identity.onnx");
        const { session, producer, consumer } = buildSingleInputParent(model, "x_in", "y_out");

        producer.value = tensor([1, 2, 3, 4]);
        session.run(0);
        expect(consumer.received).toHaveLength(1);

        // Swap WHILE embedded: x_in / y_out still match, b_in is a new
        // unwired input port.
        const report = model.loadModelValidated(buildPartialOverlapAddModelBytes(), { name: "partial.onnx" });
        expect(report.ok).toBe(true);

        // Streaming x_in alone used to half-feed the new Add op and
        // throw '[Session] channel overflow' from tick 2 onward.
        for (let t = 1; t < 4; t++) {
            producer.value = tensor([5, 6, 7, 8]);
            expect(() => session.run(t)).not.toThrow();
        }
        expect(consumer.received).toHaveLength(1);
    });

    test("model swap: a distinct toSlot that matches nothing is NOT retried against a same-named internal port", () => {
        const model = new OnnxModelGraph();
        model.loadModel(toArrayBuffer(buildIdentityModelBytes()), "identity.onnx");
        // Editor convention: slot = "out" (producer's output port),
        // toSlot = "x_in" (the model input the user wired).
        const { session, producer, consumer } = buildSingleInputParent(model, "x_in", "y_out");

        producer.value = tensor([1, 2, 3, 4]);
        session.run(0);
        expect(consumer.received).toHaveLength(1);

        // Swap to a model whose input is coincidentally named "out".
        // The wiring still addresses "x_in", which no longer exists;
        // the token must be dropped, NOT misrouted into "out".
        const report = model.loadModelValidated(buildCoincidentalOutModelBytes(), { name: "coincidental.onnx" });
        expect(report.ok).toBe(true);

        producer.value = tensor([5, 6, 7, 8]);
        session.run(1);
        session.run(2);
        expect(consumer.received).toHaveLength(1);
    });

    test("infer() pendingInput is consumed on read: a partially wired model never mixes it with fresh channel tokens", () => {
        const model = new OnnxModelGraph();
        model.loadModel(toArrayBuffer(buildAddModelBytes()), "add.onnx");

        // Parent wires ONLY a_in (and the output); b_in stays unwired.
        const pa = new TensorProducer();
        const consumer = new TensorConsumer();
        const parent = new RuntimeGraph<IRuntimeNode, IChannel>(
            [pa, model, consumer],
            [new Channel(pa, model, "out", false, undefined, true, "a_in"), new Channel(model, consumer, "sum_out")],
            "dynamic"
        );
        const session = new Session(parent);

        // Classic named-tensor inference injects pendingInput on BOTH
        // source kernels of the inner graph.
        const result = model.infer(
            new Map<string, ITensor>([
                ["a_in", { ...tensor([1, 2, 3, 4]), name: "a_in" }],
                ["b_in", { ...tensor([10, 20, 30, 40]), name: "b_in" }],
            ])
        );
        expect(Array.from(result.get("sum_out")!.data)).toEqual([11, 22, 33, 44]);

        // The gather that fed the infer run consumes pendingInput;
        // nothing stale may linger on the source kernels afterwards.
        for (const src of model.inputs) {
            expect(src.bag?.pendingInput).toBeUndefined();
        }

        // One streamed tick on the partially wired model: the fresh
        // a_in token must NOT pair with a stale b_in left behind by
        // infer() and produce a silently mixed sum.
        pa.value = tensor([100, 100, 100, 100]);
        session.run(0);
        expect(consumer.received).toEqual([]);
    });

    test("an UNLOADED model node does not break session.run, and a later load starts streaming", () => {
        const model = new OnnxModelGraph();
        const { session, producer, consumer } = buildSingleInputParent(model, "x_in", "y_out");

        // Unloaded: tokens are consumed and dropped, runs terminate.
        producer.value = tensor([1, 2, 3, 4]);
        session.run(0);
        producer.value = tensor([5, 6, 7, 8]);
        session.run(1);
        expect(consumer.received).toEqual([]);

        // Load mid-session: the model's internal session is rebuilt
        // lazily and streaming starts on the next tick.
        model.loadModel(toArrayBuffer(buildIdentityModelBytes()), "identity.onnx");
        producer.value = tensor([9, 9, 9, 9]);
        session.run(2);
        expect(consumer.received).toHaveLength(1);
        expect(Array.from(consumer.received[0].data)).toEqual([9, 9, 9, 9]);
    });
});

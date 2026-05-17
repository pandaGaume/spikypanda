/**
 * Phase 7.2 — CalibrationRunner + MinMaxStrategy tests.
 *
 * Validates:
 *   - MinMaxStrategy accumulates min/max correctly across multiple
 *     update() calls, and finalize() produces asymmetric params that
 *     keep real 0 representable.
 *   - reset() clears the strategy state.
 *   - CalibrationRunner observes a real ComputeGraph end-to-end:
 *     each kernel's output is collected, named inputs are tracked.
 *   - Edge case: a constant-value sample yields degenerate but valid
 *     params (scale = 1 with the dtype's lo as zero_point).
 */
import {
    ActivationFunctions,
    CalibrationRunner,
    CnnBuilder,
    CnnInferenceRuntime,
    ComputeGraph,
    ITensor,
    Kernel,
    MinMaxStrategy,
    Uniform,
} from "spikypanda-core";

// ─── Trivial Kernel that wraps a CnnInferenceRuntime ─────────────────────

class CnnWrapperKernel extends Kernel {
    public readonly nodeType = "test_cnn_wrap";
    public readonly outputShapes: number[][];
    private readonly _runtime: CnnInferenceRuntime;

    public constructor(runtime: CnnInferenceRuntime, outputSize: number) {
        super();
        this._runtime = runtime;
        this.outputShapes = [[outputSize]];
    }

    public execute(inputs: ITensor[]): ITensor[] {
        const inp = inputs[0];
        const out = this._runtime.run(Array.from(inp.data));
        return [{ data: Float32Array.from(out), shape: [out.length], name: "cnn_out" }];
    }
}

// ─── MinMaxStrategy ──────────────────────────────────────────────────────

describe("MinMaxStrategy", () => {
    test("tracks running min / max across updates", () => {
        const s = new MinMaxStrategy();
        s.update({ data: Float32Array.from([1, 2, 3]), shape: [3] });
        s.update({ data: Float32Array.from([-1, 5]), shape: [2] });
        s.update({ data: Float32Array.from([0.5]), shape: [1] });
        expect(s.min).toBe(-1);
        expect(s.max).toBe(5);
        expect(s.count).toBe(6);
    });

    test("finalize() produces asymmetric per_tensor params with real 0 representable", () => {
        const s = new MinMaxStrategy();
        s.update({ data: Float32Array.from([-1, 1]), shape: [2] });
        const params = s.finalize("int8");
        expect(params.scheme).toBe("per_tensor");
        expect(params.dtype).toBe("int8");
        expect(params.scales.length).toBe(1);
        expect(params.zeroPoints.length).toBe(1);
        // Balanced range: zero_point at the origin (0).
        expect(params.zeroPoints[0]).toBe(0);
        // scale = (max - min) / (127 - -128) = 2 / 255.
        expect(params.scales[0]).toBeCloseTo(2 / 255, 5);
        expect(params.symmetric).toBe(false);
    });

    test("reset() clears the strategy state", () => {
        const s = new MinMaxStrategy();
        s.update({ data: Float32Array.from([5, -5]), shape: [2] });
        expect(s.min).toBe(-5);
        s.reset();
        expect(s.min).toBe(Infinity);
        expect(s.max).toBe(-Infinity);
        expect(s.count).toBe(0);
    });

    test("finalize() with no observations falls back to (0, 0)", () => {
        const s = new MinMaxStrategy();
        const params = s.finalize("int8");
        // Degenerate range yields scale = 1, zp at the dtype's lo.
        expect(params.scales[0]).toBe(1);
        expect(params.zeroPoints[0]).toBe(-128);
    });
});

// ─── CalibrationRunner integration ───────────────────────────────────────

function makeWindowSample(kernelId: string, t: number): Map<string, ITensor> {
    // Deterministic mock window. Different shape per channel so each
    // kernel's output range is meaningful.
    const data = Float32Array.from([
        Math.sin(t * 0.3),
        Math.cos(t * 0.4) * 2,
        -0.5 + 0.1 * t,
        Math.sin(t * 0.7) + 1,
    ]);
    return new Map([[kernelId, { data, shape: [4], name: kernelId }]]);
}

describe("CalibrationRunner", () => {
    function buildTinyGraph(): {
        graph: ComputeGraph;
        wrap: CnnWrapperKernel;
    } {
        const cnn = new CnnBuilder()
            .withInputLayer(4, 1, 1)
            .withConvLayer({
                filters: 2,
                kernelSize: [1, 2],
                activation: ActivationFunctions.relu,
                weightInitializer: new Uniform(-0.1, 0.1),
                biasInit: 0,
            })
            .withFlattenLayer()
            .withDenseLayer({
                units: 2,
                activation: ActivationFunctions.linear,
                weightInitializer: new Uniform(-0.1, 0.1),
                biasInit: 0,
            })
            .build();
        const runtime = new CnnInferenceRuntime(cnn, ActivationFunctions.relu);

        const wrap = new CnnWrapperKernel(runtime, 2);
        wrap.id = "cnn_wrap";
        const graph = new ComputeGraph([wrap], [], "static");
        return { graph, wrap };
    }

    test("observes graph inputs and kernel outputs across N samples", () => {
        const { graph, wrap } = buildTinyGraph();
        const runner = new CalibrationRunner(graph);
        const samples = Array.from({ length: 10 }, (_, t) => makeWindowSample("cnn_wrap", t));
        runner.observe(samples);

        expect(runner.runs).toBe(10);

        // Inputs were observed.
        const inputParams = runner.getInputParams();
        expect(inputParams.has("cnn_wrap")).toBe(true);
        const xParams = inputParams.get("cnn_wrap")!;
        expect(xParams.scheme).toBe("per_tensor");
        expect(xParams.dtype).toBe("int8");
        expect(xParams.scales[0]).toBeGreaterThan(0);

        // The wrap kernel's outputs were observed.
        const actParams = runner.getActivationParams();
        expect(actParams.has(wrap)).toBe(true);
        const wrapParams = actParams.get(wrap)!;
        expect(wrapParams).toHaveLength(1);
        expect(wrapParams[0].scheme).toBe("per_tensor");
        expect(wrapParams[0].scales[0]).toBeGreaterThan(0);
    });

    test("reset clears all accumulated stats", () => {
        const { graph } = buildTinyGraph();
        const runner = new CalibrationRunner(graph);
        runner.observe([makeWindowSample("cnn_wrap", 0)]);
        expect(runner.runs).toBe(1);
        runner.reset();
        expect(runner.runs).toBe(0);
        // After reset, getActivationParams returns finalized
        // strategies — but with no observations, they fall back to
        // the degenerate (0, 0) range.
        for (const params of runner.getActivationParams().values()) {
            for (const p of params) {
                expect(p.scales[0]).toBe(1);
            }
        }
    });

    test("constant-valued samples produce degenerate but valid params", () => {
        const { graph } = buildTinyGraph();
        const runner = new CalibrationRunner(graph);
        // Feed the same constant tensor 5 times.
        const constSample = new Map<string, ITensor>([
            ["cnn_wrap", { data: Float32Array.from([0, 0, 0, 0]), shape: [4], name: "cnn_wrap" }],
        ]);
        runner.observe([constSample, constSample, constSample, constSample, constSample]);

        const xp = runner.getInputParams().get("cnn_wrap")!;
        // The input is the constant 0 → min = max = 0 → degenerate
        // range; scale falls back to 1, zp lands at the dtype's lo.
        expect(xp.scales[0]).toBe(1);
        expect(xp.zeroPoints[0]).toBe(-128);
    });

    test("custom strategy factory is honoured", () => {
        const { graph, wrap } = buildTinyGraph();
        let factoryCalls = 0;
        const runner = new CalibrationRunner(graph, () => {
            factoryCalls++;
            return new MinMaxStrategy();
        });
        runner.observe([makeWindowSample("cnn_wrap", 0)]);
        // One factory call for the named input + one per kernel output slot.
        expect(factoryCalls).toBeGreaterThanOrEqual(2);
        expect(runner.getActivationParams().has(wrap)).toBe(true);
    });
});

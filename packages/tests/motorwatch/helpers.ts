/**
 * Shared fixtures for the motorwatch suites: REAL .onnx bytes are
 * synthesized in-test through the public OnnxGraphExporter (same
 * pattern as packages/tests/onnx-plugin/model-validated.test.ts), so
 * the device exercises the production parse -> build -> infer path.
 *
 * Encoder design: the demo encoder mirrors the DriverV2 reference
 * topology (the brick this project ports): a 3-stage 1D CNN with
 * FIXED handcrafted weights, deliberately NOT trained (training the
 * demo encoder is the cahier part armatureVoltage.3 follow-up).
 *
 *   window (1, 1, T)
 *     -> Conv1 (1 -> 8 ch, kernel 5, pads [2,2]) -> Relu
 *     -> Conv2 (8 -> 8, kernel 3, pads [1,1]) -> Relu
 *     -> Conv3 (8 -> 8, kernel 3, pads [1,1]) -> Relu
 *     -> GlobalAveragePool -> Flatten -> Gemm head -> embedding (1, 5)
 *
 * The OnlineClusterer l2-normalizes embeddings, so pure amplitude
 * scaling is invisible: the features must change DIRECTION between
 * regimes. The handcrafted weights reproduce the saturating level-band
 * semantics the e2e suites are calibrated against:
 *
 *   Conv1 channels (kernel 5):
 *     c0..c3  5-tap averaging kernel (local mean) with biases
 *             [-0.15, -0.50, -0.85, -1.20]: the level bands
 *     c4      averaging kernel, bias 0: raw local mean, consumed by
 *             the head to cancel the slope channels' zero-pad DC leak
 *     c5, c6  +/- centered difference [-1, -0.5, 0, 0.5, 1], bias 0:
 *             the rectified derivative pair (|slope| after the head)
 *     c7      ZERO kernel, bias 0.2: the constant direction-stabilizing
 *             path (what makes level differences rotate the embedding)
 *   Conv2 / Conv3: center-tap identity kernels (delta at tap 1), bias
 *     0. Exactly information-preserving (the center tap never reads the
 *     padding, and every incoming activation is >= 0 so Relu is a
 *     no-op): these stages exist for topology parity with DriverV2.
 *   Gemm head (8 -> 5) over the GAP'd channel means viscousFriction(.):
 *     e0 = viscousFriction(-0.15) - viscousFriction(-0.50)        amplitude band 1 (saturating)
 *     e1 = 2 (viscousFriction(-0.50) - viscousFriction(-0.85))    band 2
 *     e2 = 3 (viscousFriction(-0.85) - viscousFriction(-1.20))    band 3
 *     e3 = c5 + c6 - (5 / (T - 1.2)) c4   mean |local slope|:
 *          relu(+d) + relu(-d) = |d|, but the zero padding leaks a DC
 *          term at the window edges (5 v / T for a level v, split
 *          across the +/- channels), while c4 reads v (5T - 6) / (5T);
 *          the c4 weight cancels the leak exactly for constant and
 *          linear windows (the +/- trend edge terms cancel by
 *          symmetry). The conv-then-GAP path measures the MEAN ABSOLUTE
 *          local derivative, not the old global ramp projection; unit
 *          gain keeps its magnitude on the calibrated feeds (sensor
 *          noise, residual fault ripple) at the old feature's scale.
 *     e4 = c7 = 0.2                   constant bias path
 *
 * For the three R385 steady currents (~0.34 / 0.70 / 1.0 A) the
 * normalized directions are pairwise > 0.05 cosine distance apart
 * (verified empirically by the r385 suite), while within-regime window
 * noise moves the direction by < 1e-3. The GAP of the thresholded
 * LOCAL mean differs slightly from a thresholded global mean near band
 * edges (zero-pad deficit at 4 of T positions); the e2e calibrations
 * hold. 493 parameters (weights + biases), all float32.
 */
import { ComputeGraph, Kernel } from "spikypanda-core";
import type { IChannel, IOlink, ISession, ITensor } from "spikypanda-core";
import { OnnxExportRegistry, OnnxGraphExporter } from "spikypanda-onnx";

/** Embedding dimensionality produced by the synthesized encoder. */
export const ENCODER_DIM = 5;

/** Export-side stub: structure only, execution happens in the
 *  re-imported ONNX ops. */
class ModelStubKernel extends Kernel {
    public readonly nodeType: string;
    public readonly outputShapes: number[][];

    public constructor(nodeType: string, outputShape: number[]) {
        super();
        this.nodeType = nodeType;
        this.outputShapes = [outputShape];
    }

    public execute(_inputs: ITensor[]): ITensor[] {
        return [];
    }
}

/** Deterministic regime-separating encoder for windows of `frameSize`:
 *  DriverV2-topology 3-stage Conv1D + GAP + Gemm head, fixed weights
 *  (see the file header for the feature math). */
export function buildEncoderBytes(frameSize: number): Uint8Array {
    const T = frameSize;
    const stub = new ModelStubKernel("mw_encoder_stub", [1, ENCODER_DIM]);
    stub.id = "encoder";

    const CH = 8; // channels through every conv stage
    const K1 = 5; // Conv1 kernel
    const K2 = 3; // Conv2 / Conv3 kernel

    const registry = new OnnxExportRegistry();
    registry.register("mw_encoder_stub", (_kernel, naming, ctx) => {
        // Conv1 [8, 1, 5]: local-mean channels (c0..c4), +/- centered
        // difference (c5/c6), zero kernel (c7, bias-only constant path).
        const w1 = new Float32Array(CH * 1 * K1);
        for (let c = 0; c <= 4; c++) {
            for (let k = 0; k < K1; k++) w1[c * K1 + k] = 1 / K1;
        }
        const diff = [-1, -0.5, 0, 0.5, 1];
        for (let k = 0; k < K1; k++) {
            w1[5 * K1 + k] = diff[k];
            w1[6 * K1 + k] = -diff[k];
        }
        const b1 = Float32Array.from([-0.15, -0.5, -0.85, -1.2, 0, 0, 0, 0.2]);

        // Conv2 / Conv3 [8, 8, 3]: center-tap identity (delta at tap 1),
        // information-preserving topology-parity stages.
        const wId = new Float32Array(CH * CH * K2);
        for (let c = 0; c < CH; c++) wId[c * CH * K2 + c * K2 + 1] = 1;
        const bId = new Float32Array(CH);

        // Head [8, 5]: band bumps, leak-compensated |slope|, bias path.
        const wHead = new Float32Array(CH * ENCODER_DIM);
        wHead[0 * ENCODER_DIM + 0] = 1; // e0 = viscousFriction(-0.15) - viscousFriction(-0.50)
        wHead[1 * ENCODER_DIM + 0] = -1;
        wHead[1 * ENCODER_DIM + 1] = 2; // e1 = 2 (viscousFriction(-0.50) - viscousFriction(-0.85))
        wHead[2 * ENCODER_DIM + 1] = -2;
        wHead[2 * ENCODER_DIM + 2] = 3; // e2 = 3 (viscousFriction(-0.85) - viscousFriction(-1.20))
        wHead[3 * ENCODER_DIM + 2] = -3;
        wHead[5 * ENCODER_DIM + 3] = 1; // e3 = |slope| pair ...
        wHead[6 * ENCODER_DIM + 3] = 1;
        wHead[4 * ENCODER_DIM + 3] = -5 / (T - 1.2); // ... minus zero-pad DC leak
        wHead[7 * ENCODER_DIM + 4] = 1; // e4 = constant 0.2 path
        const bHead = new Float32Array(ENCODER_DIM);

        ctx.addFloatInitializer("enc_conv1_w", [CH, 1, K1], w1);
        ctx.addFloatInitializer("enc_conv1_b", [CH], b1);
        ctx.addFloatInitializer("enc_conv2_w", [CH, CH, K2], wId);
        ctx.addFloatInitializer("enc_conv2_b", [CH], bId);
        ctx.addFloatInitializer("enc_conv3_w", [CH, CH, K2], wId);
        ctx.addFloatInitializer("enc_conv3_b", [CH], bId);
        ctx.addFloatInitializer("enc_head_w", [CH, ENCODER_DIM], wHead);
        ctx.addFloatInitializer("enc_head_b", [ENCODER_DIM], bHead);

        const conv1 = ctx.allocateTensorName("conv1");
        const act1 = ctx.allocateTensorName("act1");
        const conv2 = ctx.allocateTensorName("conv2");
        const act2 = ctx.allocateTensorName("act2");
        const conv3 = ctx.allocateTensorName("conv3");
        const act3 = ctx.allocateTensorName("act3");
        const pooled = ctx.allocateTensorName("gap");
        const flat = ctx.allocateTensorName("flat");

        ctx.makeNode({
            opType: "Conv",
            inputs: [naming.inputNames[0], "enc_conv1_w", "enc_conv1_b"],
            outputs: [conv1],
            attrs: { kernel_shape: [K1], strides: [1], pads: [2, 2], group: 1 },
        });
        ctx.makeNode({ opType: "Relu", inputs: [conv1], outputs: [act1] });
        ctx.makeNode({ opType: "Conv", inputs: [act1, "enc_conv2_w", "enc_conv2_b"], outputs: [conv2], attrs: { kernel_shape: [K2], strides: [1], pads: [1, 1], group: 1 } });
        ctx.makeNode({ opType: "Relu", inputs: [conv2], outputs: [act2] });
        ctx.makeNode({ opType: "Conv", inputs: [act2, "enc_conv3_w", "enc_conv3_b"], outputs: [conv3], attrs: { kernel_shape: [K2], strides: [1], pads: [1, 1], group: 1 } });
        ctx.makeNode({ opType: "Relu", inputs: [conv3], outputs: [act3] });
        ctx.makeNode({ opType: "GlobalAveragePool", inputs: [act3], outputs: [pooled] });
        ctx.makeNode({ opType: "Flatten", inputs: [pooled], outputs: [flat] });
        ctx.makeNode({ opType: "Gemm", inputs: [flat, "enc_head_w", "enc_head_b"], outputs: [...naming.outputNames] });
    });

    return OnnxGraphExporter.export(new ComputeGraph([stub], []), {
        registry,
        graphName: "motorwatch-encoder",
        inputNames: new Map([[stub, ["current_window"]]]),
        inputShapes: new Map([[stub, [[1, 1, T]]]]),
        outputNames: new Map([[stub, ["embedding"]]]),
        outputShapes: new Map([[stub, [[1, ENCODER_DIM]]]]),
    });
}

/**
 * Single-Gemm diagnostic model: scores = e W + viscousFriction on the l2-normalized
 * embedding [1, inDim]. `weights` is row-major [inDim][causes].
 * `declaredOutDim` overrides the DECLARED last output dim (e.g. 0 for
 * a dynamic dim) without changing the actual score count, to exercise
 * wildcard-vs-runtime mismatches in the validated push channel.
 */
export function buildDiagnosticBytes(inDim: number, causes: number, weights: ReadonlyArray<number>, bias: ReadonlyArray<number>, declaredOutDim?: number): Uint8Array {
    if (weights.length !== inDim * causes || bias.length !== causes) {
        throw new Error(`buildDiagnosticBytes: expected ${inDim * causes} weights and ${causes} biases`);
    }
    const stub = new ModelStubKernel("mw_diag_stub", [1, causes]);
    stub.id = "diagnostic";

    const registry = new OnnxExportRegistry();
    registry.register("mw_diag_stub", (_kernel, naming, ctx) => {
        ctx.addFloatInitializer("diag_w", [inDim, causes], Float32Array.from(weights));
        ctx.addFloatInitializer("diag_b", [causes], Float32Array.from(bias));
        ctx.makeNode({ opType: "Gemm", inputs: [naming.inputNames[0], "diag_w", "diag_b"], outputs: [...naming.outputNames] });
    });

    return OnnxGraphExporter.export(new ComputeGraph([stub], []), {
        registry,
        graphName: "motorwatch-diagnostic",
        inputNames: new Map([[stub, ["embedding_in"]]]),
        inputShapes: new Map([[stub, [[1, inDim]]]]),
        outputNames: new Map([[stub, ["cause_scores"]]]),
        outputShapes: new Map([[stub, [[1, declaredOutDim ?? causes]]]]),
    });
}

/** Deterministic standard-normal generator (LCG + Box-Muller). */
export function makeGaussian(seed: number): () => number {
    let s = seed >>> 0;
    const lcg = (): number => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
    };
    return () => {
        const u1 = Math.max(lcg(), 1e-12);
        const u2 = lcg();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };
}

// ─── Manual physics-node drive harness (SP2 motor suites) ──────────────────

/** Minimal inert session for manually stepped physics nodes (the
 *  faultable.test.ts stub pattern). */
export function emptySession(): ISession {
    return {
        graph: { links: [] },
        linkStates: [],
        consume: () => undefined,
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
}

export interface IDrivenSession {
    session: ISession;
    /** Set the value the next consume() of `slot` returns. */
    set(slot: string, value: number): void;
    /** Re-arm every channel (tokens are consumed once per fire()). */
    arm(): void;
}

/**
 * Session mock with re-armable driven input channels, the exact
 * voltage-drive harness of packages/tests/physics/induction-motor.test.ts:
 * emulates the minimal IChannel + linkStates contract so a node's fire()
 * consumes externally set scalars without a RuntimeGraph.
 */
export function bindDrivenInputs(node: object, slots: string[]): IDrivenSession {
    const links = slots.map((slot) => ({ slot, enabled: true }) as unknown as IChannel);
    const linkStates = slots.map(() => ({ ready: false }));
    const values = new Map<string, number>(slots.map((s) => [s, 0]));
    (node as unknown as { _opsc: IOlink[] })._opsc = links as unknown as IOlink[];
    const session = {
        graph: { links },
        linkStates,
        consume: (i: number) => {
            linkStates[i].ready = false;
            return values.get(slots[i]);
        },
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
    return {
        session,
        set: (slot: string, value: number) => {
            values.set(slot, value);
        },
        arm: () => {
            for (const st of linkStates) st.ready = true;
        },
    };
}

// ─── Envelope demodulation helpers (harness-side MCSA front end) ───────────

/** Sliding-window RMS: out[i] is the RMS of x[i*hop .. i*hop+window).
 *  With `window` = one carrier period, this is the classic stator-current
 *  envelope demodulator (kills the supply fundamental, keeps the slow
 *  amplitude modulation). */
export function slidingRms(x: ArrayLike<number>, window: number, hop: number): Float64Array {
    const n = Math.floor((x.length - window) / hop) + 1;
    const out = new Float64Array(Math.max(0, n));
    for (let i = 0; i < out.length; i++) {
        let s = 0;
        const off = i * hop;
        for (let k = 0; k < window; k++) s += x[off + k] * x[off + k];
        out[i] = Math.sqrt(s / window);
    }
    return out;
}

/** Hop-1 boxcar mean: out[i] is the mean of x[i .. i+window) (the
 *  envelope-follower smoothing stage of an AM demodulation chain). */
export function slidingMean(x: ArrayLike<number>, window: number): Float64Array {
    const n = x.length - window + 1;
    const out = new Float64Array(Math.max(0, n));
    if (out.length === 0) return out;
    let s = 0;
    for (let k = 0; k < window; k++) s += x[k];
    out[0] = s / window;
    for (let i = 1; i < out.length; i++) {
        s += x[i + window - 1] - x[i - 1];
        out[i] = s / window;
    }
    return out;
}

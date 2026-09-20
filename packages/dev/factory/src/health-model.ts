/**
 * The `affine-residual` model family: the scrubber health model.
 *
 *     expected = intercept + slope * duty_n        the current the motor should draw at that duty
 *     residual = | expected - current_n |           how far it actually is from it
 *
 * The residual is the clogging indicator: a fouled impeller changes the
 * torque, hence the current at a given duty. The line is affine and not
 * through the origin because most of the current is friction and iron loss,
 * which do not scale with duty; forcing the line through zero left a
 * systematic error at low duty that a threshold could not tell from a fault.
 *
 * The ONNX layout is the one the scrubber firmware already loads
 * (`CyanMycelium/tools/make_health_onnx.py`), byte for byte in its weights:
 * one Gemm (3 -> 4), one Relu, one Gemm (4 -> 2). The absolute value is
 * relu(d) + relu(-d), so the whole model stays within Gemm and Relu, the two
 * operators every runtime in the chain has. Input `features` [1,3] is
 * (duty_n, current_n, senseSpan_n); the third input is carried with zero
 * weight so a trained successor can use it without changing the contract.
 * Output `health` [1,2] is (expected, residual).
 *
 * Normalisation is NOT in the model: it belongs to the board (shunt, motor
 * rating, ADC range), which declares the same full scales on its side.
 */
import { createDefaultRegistry, OnnxDataType, OnnxGraphBuilder, OnnxLinkType, OnnxParser, OnnxWriter } from "spikypanda-onnx";
import type { OnnxParseResult } from "spikypanda-onnx";
import type { ITensor } from "spikypanda-core";

export const HEALTH_GRAPH_NAME = "scrubber_health";
export const HEALTH_INPUT = "features";
export const HEALTH_OUTPUT = "health";
export const HEALTH_INPUT_SHAPE = [1, 3] as const;
export const HEALTH_OUTPUT_SHAPE = [1, 2] as const;

export interface AffineCoefficients {
    readonly slope: number;
    readonly intercept: number;
}

/** Least squares line through (duty_n, current_n) pairs. Refuses fewer than two distinct duties. */
export function fitAffine(duty: ArrayLike<number>, current: ArrayLike<number>): AffineCoefficients {
    const n = duty.length;
    if (n < 2 || current.length !== n) throw new Error(`affine fit needs at least 2 points with matching lengths, got ${n} and ${current.length}`);
    let mx = 0;
    let my = 0;
    for (let i = 0; i < n; i++) {
        mx += duty[i];
        my += current[i];
    }
    mx /= n;
    my /= n;
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
        sxx += (duty[i] - mx) * (duty[i] - mx);
        sxy += (duty[i] - mx) * (current[i] - my);
    }
    if (sxx === 0) throw new Error("affine fit: every point shares the same duty, the slope is undefined");
    const slope = sxy / sxx;
    return { slope, intercept: my - slope * mx };
}

export interface HealthPrediction {
    readonly expected: number;
    readonly residual: number;
}

/** What the model computes, in double precision: the reference for parity. */
export function predictHealth(c: AffineCoefficients, dutyN: number, currentN: number): HealthPrediction {
    const expected = c.intercept + c.slope * dutyN;
    return { expected, residual: Math.abs(expected - currentN) };
}

function initializer(name: string, dims: number[], values: number[]): OnnxParseResult["initializers"][number] {
    // raw_data (little-endian float32), the form the firmware's reader takes;
    // the reference generator writes the same field.
    const raw = new Uint8Array(new Float32Array(values).buffer);
    return { name, dataType: OnnxDataType.FLOAT, dims, rawData: raw };
}

/** The in-memory model, ready for `OnnxWriter.serialize`. */
export function buildHealthModel({ slope, intercept }: AffineCoefficients): OnnxParseResult {
    // Layer 1, 3 inputs -> 4 hidden, Gemm with transB=1 so W is [out, in]:
    //   h0 =  expected - current   (positive when the motor draws too little)
    //   h1 = -expected + current   (positive when it draws too much)
    //   h2 =  expected             (passed through; Relu is a no-op for expected >= 0)
    //   h3 =  0                    (unused, keeps the shape even)
    const w1 = [slope, -1, 0, -slope, 1, 0, slope, 0, 0, 0, 0, 0];
    const b1 = [intercept, -intercept, intercept, 0];
    // Layer 2, 4 hidden -> 2 outputs: out0 = h2 = expected, out1 = h0 + h1 = |expected - current|.
    const w2 = [0, 0, 1, 0, 1, 1, 0, 0];
    const b2 = [0, 0];
    const transB = new Map<string, number>([["transB", 1]]);
    return {
        irVersion: 8,
        graphName: HEALTH_GRAPH_NAME,
        nodes: [
            { name: "fc1", opType: "Gemm", inputs: [HEALTH_INPUT, "w1", "b1"], outputs: ["h"], attributes: transB },
            { name: "act1", opType: "Relu", inputs: ["h"], outputs: ["hr"], attributes: new Map() },
            { name: "fc2", opType: "Gemm", inputs: ["hr", "w2", "b2"], outputs: [HEALTH_OUTPUT], attributes: new Map(transB) },
        ],
        initializers: [initializer("w1", [4, 3], w1), initializer("b1", [4], b1), initializer("w2", [2, 4], w2), initializer("b2", [2], b2)],
        inputs: [{ name: HEALTH_INPUT, type: OnnxLinkType.INPUT, elemType: OnnxDataType.FLOAT, shape: [...HEALTH_INPUT_SHAPE] }],
        outputs: [{ name: HEALTH_OUTPUT, type: OnnxLinkType.OUTPUT, elemType: OnnxDataType.FLOAT, shape: [...HEALTH_OUTPUT_SHAPE] }],
        valueInfos: [],
    };
}

export function serializeHealthModel(c: AffineCoefficients): Uint8Array {
    return OnnxWriter.serialize(buildHealthModel(c));
}

/**
 * Run the serialized bytes through the SpikyPanda ONNX engine, one row at a
 * time, exactly as a device would: parse, build, infer. Returns (expected,
 * residual) per row in float32.
 */
export type HealthRunner = (rows: ReadonlyArray<readonly [dutyN: number, currentN: number, senseSpanN: number]>) => HealthPrediction[];

/** Parse and build once; the returned function runs the graph on rows, one inference per row. */
export function loadHealthModel(bytes: Uint8Array): HealthRunner {
    const parsed = OnnxParser.parse(bytes);
    if (!parsed) throw new Error("the serialized health model does not parse");
    const { graph, inputNames, outputNames } = new OnnxGraphBuilder(createDefaultRegistry()).build(parsed);
    if (inputNames[0] !== HEALTH_INPUT || outputNames[0] !== HEALTH_OUTPUT) {
        throw new Error(`unexpected model interface: inputs ${inputNames.join(",")} outputs ${outputNames.join(",")}`);
    }
    return (rows) => {
        const out: HealthPrediction[] = [];
        for (const [d, c, s] of rows) {
            const features: ITensor = { data: new Float32Array([d, c, s]), shape: [...HEALTH_INPUT_SHAPE], name: HEALTH_INPUT };
            const results = graph.infer(new Map([[HEALTH_INPUT, features]]));
            const health = results.get(HEALTH_OUTPUT) ?? [...results.values()][0];
            if (!health || health.data.length < 2) throw new Error("the health model produced no [1,2] output");
            out.push({ expected: health.data[0], residual: health.data[1] });
        }
        return out;
    };
}

export function runHealthModel(bytes: Uint8Array, rows: ReadonlyArray<readonly [dutyN: number, currentN: number, senseSpanN: number]>): HealthPrediction[] {
    return loadHealthModel(bytes)(rows);
}

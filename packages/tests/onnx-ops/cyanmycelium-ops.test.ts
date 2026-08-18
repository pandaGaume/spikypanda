/**
 * Tests for ai.cyanmycelium.ConvWIO.
 *
 * The op exists to let convolution weights stay aliased in mapped flash
 * on the embedded runtime, by shipping them already permuted from
 * OIW [C_out, C_in, kL] to WIO [kL, C_in, C_out].
 *
 * What matters here is that the permutation is SEMANTICALLY neutral:
 * ConvWIO fed permuted weights must produce, bit for bit within float
 * tolerance, what Conv produces fed the originals. Everything else the
 * op could get right while still being wrong.
 *
 * The two guards are tested too, because a layout mix-up raises no
 * shape error on its own: a WIO tensor read as OIW keeps a matching
 * channel count, since in a network the output of one layer feeds the
 * next. Without the guards the graph would build and return a
 * plausible, entirely wrong answer.
 */
import type { ITensor } from "spikypanda-core";
import { OnnxOpRegistry } from "../../dev/onnx/src/onnx/registry";
import { registerConvOps } from "../../dev/onnx/src/onnx/ops/conv";
import { registerCyanMyceliumOps } from "../../dev/onnx/src/onnx/ops/ext/vendors/cyanmycelium";

const WIO_OP = "ai.cyanmycelium.ConvWIO";

let registry: OnnxOpRegistry;

beforeAll(() => {
    registry = new OnnxOpRegistry();
    registerConvOps(registry);
    registerCyanMyceliumOps(registry);
});

function makeNode(opType: string, attrs: Record<string, number>, inputs: string[], domain?: string) {
    const info = {
        opType,
        domain,
        name: "",
        inputs,
        outputs: ["y"],
        attributes: new Map(Object.entries(attrs)),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return registry.create(info as any, new Map()) as any;
}

function tensor(data: ArrayLike<number>, shape: number[]): ITensor {
    return { data: data instanceof Float32Array ? data : new Float32Array(data), shape };
}

/** Deterministic pseudo-random fill, so a failure is reproducible. */
function filled(n: number, seed: number): Float32Array {
    const out = new Float32Array(n);
    let s = seed >>> 0;
    for (let i = 0; i < n; i++) {
        s = (s * 1664525 + 1013904223) >>> 0;
        out[i] = (s / 0xffffffff) * 2 - 1;
    }
    return out;
}

/** OIW [M, C, kL] -> WIO [kL, C, M]. */
function toWio(w: Float32Array, m: number, c: number, kl: number): Float32Array {
    const out = new Float32Array(w.length);
    for (let o = 0; o < m; o++) {
        for (let ci = 0; ci < c; ci++) {
            for (let k = 0; k < kl; k++) {
                out[(k * c + ci) * m + o] = w[o * (c * kl) + ci * kl + k];
            }
        }
    }
    return out;
}

describe("ai.cyanmycelium.ConvWIO", () => {
    // The three driverv2 convolutions, plus a strided-and-padded case and a
    // degenerate one, so the equivalence is not established on a single shape.
    const cases: Array<[number, number, number, number, number, number]> = [
        // [C_in, C_out, kL, L, stride, pad]
        [5, 16, 5, 50, 1, 0],
        [16, 24, 5, 46, 1, 0],
        [24, 32, 3, 42, 1, 0],
        [3, 7, 4, 20, 2, 1],
        [1, 1, 1, 8, 1, 0],
    ];

    it.each(cases)(
        "matches Conv for C_in=%i C_out=%i kL=%i L=%i stride=%i pad=%i",
        (cIn, cOut, kL, L, stride, pad) => {
            const x = tensor(filled(cIn * L, 1234 + L), [1, cIn, L]);
            const wOiw = filled(cOut * cIn * kL, 99 + cOut);
            const b = filled(cOut, 7 + cOut);

            const conv = makeNode("Conv", { kernel_shape: kL, strides: stride, pads: pad }, ["x", "w", "b"]);
            const ref = conv.execute([x, tensor(wOiw, [cOut, cIn, kL]), tensor(b, [cOut])])[0];

            const wio = makeNode(WIO_OP, { kernel_shape: kL, strides: stride, pads: pad }, ["x", "w", "b"]);
            const got = wio.execute([x, tensor(toWio(wOiw, cOut, cIn, kL), [kL, cIn, cOut]), tensor(b, [cOut])])[0];

            expect(got.shape).toEqual(ref.shape);
            let worst = 0;
            for (let i = 0; i < ref.data.length; i++) {
                worst = Math.max(worst, Math.abs(ref.data[i] - got.data[i]));
            }
            expect(worst).toBeLessThan(1e-4);
        },
    );

    it("is not trivially satisfied: unpermuted weights give a different answer", () => {
        // Without this, a ConvWIO that quietly read OIW would pass every
        // test above, and the whole op would be decoration.
        const [cIn, cOut, kL, L] = [4, 6, 3, 20];
        const x = tensor(filled(cIn * L, 5), [1, cIn, L]);
        const wOiw = filled(cOut * cIn * kL, 6);

        const conv = makeNode("Conv", { kernel_shape: kL, strides: 1, pads: 0 }, ["x", "w"]);
        const ref = conv.execute([x, tensor(wOiw, [cOut, cIn, kL])])[0];

        const wio = makeNode(WIO_OP, { kernel_shape: kL, strides: 1, pads: 0 }, ["x", "w"]);
        // Same bytes, relabelled as WIO. Shapes happen to be compatible.
        const got = wio.execute([x, tensor(wOiw, [kL, cIn, cOut])])[0];

        let worst = 0;
        for (let i = 0; i < ref.data.length; i++) {
            worst = Math.max(worst, Math.abs(ref.data[i] - got.data[i]));
        }
        expect(worst).toBeGreaterThan(1e-3);
    });

    it("rejects a weight tensor whose channel axis does not match the input", () => {
        const x = tensor(filled(4 * 20, 11), [1, 4, 20]);
        const wio = makeNode(WIO_OP, { kernel_shape: 3, strides: 1, pads: 0 }, ["x", "w"]);
        // [kL, C_in, C_out] with C_in = 9 while the input carries 4.
        expect(() => wio.execute([x, tensor(filled(3 * 9 * 6, 12), [3, 9, 6])])).toThrow(/channel axis/);
    });

    it("rejects weights still in OIW when kernel_shape betrays them", () => {
        // driverv2's first convolution: OIW [16, 5, 5], WIO [5, 5, 16].
        // The channel axis is 5 either way, so guard one cannot see it;
        // kernel_shape=5 against a leading axis of 16 is what catches it.
        const x = tensor(filled(5 * 50, 21), [1, 5, 50]);
        const wio = makeNode(WIO_OP, { kernel_shape: 5, strides: 1, pads: 0 }, ["x", "w"]);
        expect(() => wio.execute([x, tensor(filled(16 * 5 * 5, 22), [16, 5, 5])])).toThrow(/never permuted/);
    });

    it("rejects a rank-2 input", () => {
        const x = tensor(filled(20, 31), [1, 20]);
        const wio = makeNode(WIO_OP, { kernel_shape: 3, strides: 1, pads: 0 }, ["x", "w"]);
        expect(() => wio.execute([x, tensor(filled(3 * 4 * 6, 32), [3, 4, 6])])).toThrow(/rank-3 input/);
    });

    it("is registered under its domain-qualified name", () => {
        expect(registry.has(WIO_OP)).toBe(true);
        expect(registry.getActiveBackend(WIO_OP)).toBe("ai.cyanmycelium");
    });

    // The standard spelling is domain="ai.cyanmycelium", opType="ConvWIO".
    // The registry keys on the qualified name, so a node written that way
    // and one carrying the domain inside its opType string resolve to the
    // same entry. Both are exercised, because files of both kinds exist.
    it("resolves the standard spelling: domain field plus bare opType", () => {
        const node = makeNode("ConvWIO", { kernel_shape: 3, strides: 1, pads: 0 }, ["x", "w"], "ai.cyanmycelium");
        expect(node).toBeDefined();
        expect(node.opType).toBe("ConvWIO");
    });

    it("resolves the legacy spelling: domain baked into opType", () => {
        const node = makeNode(WIO_OP, { kernel_shape: 3, strides: 1, pads: 0 }, ["x", "w"]);
        expect(node).toBeDefined();
    });

    it("both spellings compute the same thing", () => {
        const [cIn, cOut, kL, L] = [4, 6, 3, 20];
        const x = tensor(filled(cIn * L, 41), [1, cIn, L]);
        const w = tensor(toWio(filled(cOut * cIn * kL, 42), cOut, cIn, kL), [kL, cIn, cOut]);

        const std = makeNode("ConvWIO", { kernel_shape: kL, strides: 1, pads: 0 }, ["x", "w"], "ai.cyanmycelium");
        const legacy = makeNode(WIO_OP, { kernel_shape: kL, strides: 1, pads: 0 }, ["x", "w"]);
        const a = std.execute([x, w])[0];
        const b = legacy.execute([x, w])[0];
        expect(Array.from(a.data)).toEqual(Array.from(b.data));
    });

    it("a custom domain does NOT fall back to the default-domain op of the same name", () => {
        // The trap the qualified key closes. Conv exists in the default
        // domain; a node claiming ai.cyanmycelium.Conv must not silently
        // run it.
        expect(() => makeNode("Conv", { kernel_shape: 3 }, ["x", "w"], "ai.cyanmycelium")).toThrow(
            /No ONNX op implementation for: ai\.cyanmycelium\.Conv/,
        );
    });
});

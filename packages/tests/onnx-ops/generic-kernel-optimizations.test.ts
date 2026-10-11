import type { ITensor } from "spikypanda-core";
import { createRegistry } from "../../dev/onnx/src/onnx/ops";
import { binaryTensor, broadcastIndex, broadcastShape, strides } from "../../dev/onnx/src/onnx/ops/tensor-utils";

function tensor(shape: number[], seed: number): ITensor {
    return { shape, data: Float32Array.from({ length: shape.reduce((a, b) => a * b, 1) }, (_, i) => (((i * 37 + seed) % 61) - 30) / 7) };
}
function equalBits(a: Float32Array, b: Float32Array): void {
    expect(Array.from(new Uint32Array(a.buffer, a.byteOffset, a.length))).toEqual(Array.from(new Uint32Array(b.buffer, b.byteOffset, b.length)));
}

describe("Generic optimized tensor kernels", () => {
    test("binary operations preserve reference order for all compatible shape pairs", () => {
        const shapes = [[], [1], [3], [2, 3], [1, 3], [2, 1], [2, 1, 3], [1, 4, 1], [2, 4, 3], [0], [0, 3], [1, 0, 3], [2, 1, 0, 3]];
        const operations = [(a: number, b: number) => a + b, (a: number, b: number) => a * b, (a: number, b: number) => a / b, (a: number, b: number) => a - b];
        for (const sa of shapes)
            for (const sb of shapes) {
                const a = tensor(sa, 3),
                    b = tensor(sb, 17);
                let shape: number[];
                try {
                    shape = broadcastShape(sa, sb);
                } catch {
                    expect(() => binaryTensor(a, b, operations[0])).toThrow();
                    continue;
                }
                for (const fn of operations) {
                    const expected = new Float32Array(shape.reduce((a, b) => a * b, 1));
                    for (let i = 0; i < expected.length; i++) expected[i] = fn(a.data[broadcastIndex(i, shape, sa)], b.data[broadcastIndex(i, shape, sb)]);
                    const actual = binaryTensor(a, b, fn);
                    expect(actual.shape).toEqual(shape);
                    equalBits(actual.data, expected);
                }
            }
    });
    test("scalar placement keeps subtraction and division direction and IEEE special values", () => {
        const a: ITensor = { shape: [2, 3], data: Float32Array.from([0, -0, Infinity, -Infinity, NaN, 1]) };
        const b: ITensor = { shape: [], data: Float32Array.from([-0]) };
        for (const fn of [(a: number, b: number) => a / b, (a: number, b: number) => a - b])
            for (const [x, y] of [
                [a, b],
                [b, a],
            ]) {
                const expected = Float32Array.from(a.data, (_, i) => fn(x.data[x.shape.length ? i : 0], y.data[y.shape.length ? i : 0]));
                const actual = binaryTensor(x, y, fn).data;
                for (let i = 0; i < actual.length; i++) expect(Object.is(actual[i], expected[i])).toBe(true);
            }
    });
    test("transpose matches arbitrary-rank reference across permutations, zeros and tile tails", () => {
        function permutations(a: number[]): number[][] {
            return a.length ? a.flatMap((v, i) => permutations(a.filter((_, j) => j !== i)).map((p) => [v, ...p])) : [[]];
        }
        const shapes = [[], [3], [2, 3], [35, 37], [2, 1, 3], [2, 3, 4], [2, 1, 3, 4], [2, 0, 3], [0, 7]];
        for (const shape of shapes)
            for (const perm of permutations(shape.map((_, i) => i))) {
                const x = tensor(shape, 7),
                    outputShape = perm.map((i) => shape[i]),
                    src = strides(shape),
                    dst = strides(outputShape);
                const expected = new Float32Array(x.data.length);
                for (let i = 0; i < expected.length; i++) {
                    let index = 0;
                    for (let d = 0; d < shape.length; d++) index += (Math.floor(i / dst[d]) % outputShape[d]) * src[perm[d]];
                    expected[i] = x.data[index];
                }
                const node = createRegistry().create(
                    { name: "transpose", opType: "Transpose", inputs: ["x"], outputs: ["y"], attributes: new Map(), listAttributes: new Map([["perm", perm]]) },
                    new Map(),
                );
                const actual = node.execute([x])[0];
                expect(actual.shape).toEqual(outputShape);
                equalBits(actual.data, expected);
            }
    });
});

/** ONNX MatMul shape planning, independent of CPU data and device APIs. */
export interface IMatMulPlan {
    readonly shape: number[];
    readonly m: number;
    readonly n: number;
    readonly k: number;
    readonly batches: number;
    readonly offsets: Uint32Array;
    readonly aElements: number;
    readonly bElements: number;
}
function size(shape: readonly number[]): number {
    if (shape.some((d) => !Number.isSafeInteger(d) || d < 0)) throw new Error("Invalid MatMul shape");
    const count = shape.reduce((a, b) => a * b, 1);
    if (!Number.isSafeInteger(count) || count > 0xffffffff) throw new Error("MatMul exceeds 32-bit device addressing");
    return count;
}
export function planMatMul(a: readonly number[], b: readonly number[]): IMatMulPlan {
    if (!a.length || !b.length) throw new Error("MatMul requires rank >= 1");
    const aElements = size(a),
        bElements = size(b);
    const av = a.length === 1,
        bv = b.length === 1;
    const as = av ? [1, ...a] : [...a],
        bs = bv ? [...b, 1] : [...b];
    const [m, k] = as.slice(-2),
        [bk, n] = bs.slice(-2);
    if (k !== bk) throw new Error("MatMul inner dimensions differ");
    const ab = as.slice(0, -2),
        bb = bs.slice(0, -2);
    const rank = Math.max(ab.length, bb.length);
    const batch = Array.from({ length: rank }, (_, i) => {
        const x = ab[i - rank + ab.length] ?? 1,
            y = bb[i - rank + bb.length] ?? 1;
        if (x !== y && x !== 1 && y !== 1) throw new Error("MatMul batch dimensions cannot broadcast");
        return x === 1 ? y : x;
    });
    const batches = size(batch);
    size([...batch, m, n]);
    const offsets = new Uint32Array(batches * 2);
    const index = (t: number, source: number[]): number => {
        let result = 0,
            stride = 1;
        for (let i = rank - 1; i >= 0; i--) {
            const c = t % batch[i];
            t = Math.floor(t / batch[i]);
            const j = i - rank + source.length;
            if (j >= 0) {
                if (source[j] !== 1) result += c * stride;
                stride *= source[j];
            }
        }
        return result;
    };
    for (let t = 0; t < batches; t++) {
        offsets[t * 2] = index(t, ab) * m * k;
        offsets[t * 2 + 1] = index(t, bb) * k * n;
    }
    return { shape: [...batch, ...(av ? [] : [m]), ...(bv ? [] : [n])], m, n, k, batches, offsets, aElements, bElements };
}

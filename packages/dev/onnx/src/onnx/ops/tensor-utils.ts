import type { ITensor } from "spikypanda-core";
import { makeTensor, shapeSize } from "../registry";

export function normalizeAxis(axis: number, rank: number): number {
    const result = axis < 0 ? rank + axis : axis;
    if (!Number.isInteger(result) || result < 0 || result >= rank) throw new Error(`Invalid axis ${axis} for rank ${rank}`);
    return result;
}

export function strides(shape: number[]): number[] {
    const result = new Array<number>(shape.length);
    let stride = 1;
    for (let i = shape.length - 1; i >= 0; i--) {
        result[i] = stride;
        stride *= shape[i];
    }
    return result;
}

export function broadcastShape(a: number[], b: number[]): number[] {
    const rank = Math.max(a.length, b.length);
    return Array.from({ length: rank }, (_, i) => {
        const da = a[i - rank + a.length] ?? 1;
        const db = b[i - rank + b.length] ?? 1;
        if (da !== db && da !== 1 && db !== 1) throw new Error(`Cannot broadcast [${a}] and [${b}]`);
        return da === 1 ? db : da;
    });
}

export function broadcastIndex(index: number, shape: number[], sourceShape: number[]): number {
    let result = 0;
    let sourceStride = 1;
    for (let axis = shape.length - 1; axis >= 0; axis--) {
        const coordinate = index % shape[axis];
        index = Math.floor(index / shape[axis]);
        const sourceAxis = axis - shape.length + sourceShape.length;
        if (sourceAxis >= 0) {
            if (sourceShape[sourceAxis] !== 1) result += coordinate * sourceStride;
            sourceStride *= sourceShape[sourceAxis];
        }
    }
    return result;
}

export function binaryTensor(a: ITensor, b: ITensor, fn: (x: number, y: number) => number): ITensor {
    const shape = broadcastShape(a.shape, b.shape);
    const data = new Float32Array(shapeSize(shape));
    const ad = a.data,
        bd = b.data;
    if (!data.length) return makeTensor(data, shape);
    if (a.shape.length === b.shape.length && a.shape.every((d, i) => d === b.shape[i])) {
        for (let i = 0; i < data.length; i++) data[i] = fn(ad[i], bd[i]);
    } else if (shapeSize(a.shape) === 1) {
        const value = ad[0];
        for (let i = 0; i < data.length; i++) data[i] = fn(value, bd[i]);
    } else if (shapeSize(b.shape) === 1) {
        const value = bd[0];
        for (let i = 0; i < data.length; i++) data[i] = fn(ad[i], value);
    } else {
        // Effective strides are zero on broadcast axes. Advance coordinates
        // once per row instead of dividing and taking modulo per element.
        const rank = shape.length,
            width = shape[rank - 1];
        const effective = (source: number[]): number[] => {
            const raw = strides(source),
                pad = rank - source.length;
            return shape.map((_, i) => (i < pad || source[i - pad] === 1 ? 0 : raw[i - pad]));
        };
        const as = effective(a.shape),
            bs = effective(b.shape),
            coordinates = new Array<number>(rank).fill(0);
        const aStep = as[rank - 1],
            bStep = bs[rank - 1];
        let ai = 0,
            bi = 0;
        for (let offset = 0; offset < data.length; offset += width) {
            for (let j = 0; j < width; j++) data[offset + j] = fn(ad[ai + j * aStep], bd[bi + j * bStep]);
            for (let axis = rank - 2; axis >= 0; axis--) {
                coordinates[axis]++;
                ai += as[axis];
                bi += bs[axis];
                if (coordinates[axis] < shape[axis]) break;
                coordinates[axis] = 0;
                ai -= as[axis] * shape[axis];
                bi -= bs[axis] * shape[axis];
            }
        }
    }
    return makeTensor(data, shape);
}

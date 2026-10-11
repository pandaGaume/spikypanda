import { ComputeGraph, DataLink, Kernel, Session } from "spikypanda-core";
import type { ITensor, IKernelExecutionContext, IKernel } from "spikypanda-core";
import { createRegistry } from "../../dev/onnx/src/onnx/ops";
import type { OnnxNodeInfo } from "../../dev/onnx/src/onnx/onnx-types";

function transpose(perm: number[] = [1, 0]) {
    const info: OnnxNodeInfo = { name: "transpose", opType: "Transpose", inputs: ["x"], outputs: ["y"], attributes: new Map(), listAttributes: new Map([["perm", perm]]) };
    return createRegistry().create(info, new Map()) as IKernel;
}
function context(node: ReturnType<typeof transpose>): IKernelExecutionContext {
    return { nodeState: node.createNodeState!() };
}
function cache(ctx: IKernelExecutionContext): unknown {
    return (ctx.nodeState as unknown as { transposeCache?: unknown }).transposeCache;
}

describe("Transpose session cache", () => {
    test("reuse validates mutable inputs and protects against output mutation", () => {
        const node = transpose(),
            ctx = context(node);
        const input: ITensor = { data: Float32Array.from([1, 2, 3, 4, 5, 6]), shape: [2, 3], cacheable: true };
        const first = node.execute([input], ctx)[0],
            saved = cache(ctx);
        expect(Array.from(first.data)).toEqual([1, 4, 2, 5, 3, 6]);
        first.data.fill(99);
        first.shape[0] = 99;
        const next = node.execute([input], ctx)[0];
        expect(cache(ctx)).toBe(saved);
        expect(next.shape).toEqual([3, 2]);
        expect(Array.from(next.data)).toEqual([1, 4, 2, 5, 3, 6]);
        input.data[0] = 10;
        expect(node.execute([input], ctx)[0].data[0]).toBe(10);
        expect(cache(ctx)).not.toBe(saved);
        input.shape = [3, 2];
        expect(Array.from(node.execute([input], ctx)[0].data)).toEqual([10, 3, 5, 2, 4, 6]);
    });
    test("buffer views, replacement buffers, negative zero and NaN payloads remain exact", () => {
        const node = transpose(),
            ctx = context(node);
        const bits = new Uint32Array([123, 0x80000000, 0x7fc00001, 0x3f800000, 0x40000000, 123]);
        const input: ITensor = { data: new Float32Array(bits.buffer, 4, 4), shape: [2, 2], cacheable: true };
        node.execute([input], ctx);
        const saved = cache(ctx);
        const out = node.execute([input], ctx)[0];
        expect(Array.from(new Uint32Array(out.data.buffer))).toEqual([0x80000000, 0x3f800000, 0x7fc00001, 0x40000000]);
        expect(cache(ctx)).toBe(saved);
        bits[1] = 0;
        expect(Object.is(node.execute([input], ctx)[0].data[0], -0)).toBe(false);
        input.data = Float32Array.from([5, 6, 7, 8]);
        expect(Array.from(node.execute([input], ctx)[0].data)).toEqual([5, 7, 6, 8]);
    });
    test("direct execution and unhinted inputs stay stateless; permutation changes invalidate", () => {
        const perm = [1, 0],
            node = transpose(perm),
            ctx = context(node);
        const input: ITensor = { data: Float32Array.from([1, 2, 3, 4]), shape: [2, 2] };
        node.execute([input], ctx);
        expect(cache(ctx)).toBeUndefined();
        input.cacheable = true;
        node.execute([input], ctx);
        const saved = cache(ctx);
        perm.splice(0, 2, 0, 1);
        expect(Array.from(node.execute([input], ctx)[0].data)).toEqual([1, 2, 3, 4]);
        expect(cache(ctx)).not.toBe(saved);
        expect(Array.from(node.execute([input])[0].data)).toEqual([1, 2, 3, 4]);
        perm.splice(0, 2, 0, 0);
        expect(() => node.execute([input], ctx)).toThrow("Invalid Transpose");
    });
    test("native sync/async dispatch uses separate session states and reset releases cache", async () => {
        class Source extends Kernel {
            readonly nodeType = "source";
            readonly outputShapes = [[2, 2]];
            execute(): ITensor[] {
                return [{ data: Float32Array.from([1, 2, 3, 4]), shape: [2, 2], cacheable: true }];
            }
        }
        const source = new Source(),
            node = transpose();
        const graph = new ComputeGraph([source, node], [new DataLink(source, node, 0, 0)]);
        const session = new Session(graph);
        graph.run(0, session);
        const first = { nodeState: session.nodeStateOf(node) };
        expect(cache(first)).toBeDefined();
        const saved = cache(first);
        await graph.runAsync(0, session);
        expect(cache(first)).toBe(saved);
        const second = new Session(graph);
        second.run(0);
        const other = { nodeState: second.nodeStateOf(node) };
        expect(cache(other)).toBeDefined();
        expect(cache(other)).not.toBe(saved);
        second.reset();
        expect(cache(other)).toBeUndefined();
        expect(cache(first)).toBe(saved);
    });
});

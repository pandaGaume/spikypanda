/**
 * Tests for DSP.Tensor:transpose (TransposeNode):
 *
 *   - row-major [A, B] -> [B, A] correctness on an asymmetric shape;
 *   - add_batch_dim emits [1, B, A] with the same data layout;
 *   - non-rank-2 input throws;
 *   - end-to-end relayout: buffer [T, C] frames -> transpose with
 *     add_batch_dim -> (1, C, T), the layout expected by ONNX encoder
 *     models.
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { ITensor } from "spikypanda-core";
import { TransposeNode } from "../../dev/plugins/dsp/src/tensor/transpose.node";
import { ScalarBufferNode } from "../../dev/plugins/dsp/src/stream/buffer.node";
import { FrameCollector, TokenSource, row } from "./helpers";

function runTranspose(tokens: unknown[], addBatchDim: boolean): { sink: FrameCollector; node: TransposeNode; run: () => void } {
    const source = new TokenSource(tokens);
    const node = new TransposeNode();
    node.add_batch_dim = addBatchDim;
    const sink = new FrameCollector();
    const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
        .withMode("dynamic")
        .withNodes(source, node, sink)
        .withChannel(source, node, "out", "tensor")
        .withChannel(node, sink, "transposed")
        .build();
    const session = new Session(graph);
    return {
        sink,
        node,
        run: () => {
            for (let k = 0; k < tokens.length; k++) session.run(k);
        },
    };
}

describe("TransposeNode", () => {
    test("transposes an asymmetric [2, 3] into [3, 2] (row-major)", () => {
        // [[1, 2, 3], [4, 5, 6]] -> [[1, 4], [2, 5], [3, 6]]
        const input: ITensor = { data: Float32Array.from([1, 2, 3, 4, 5, 6]), shape: [2, 3] };
        const { sink, node, run } = runTranspose([input], false);
        run();
        expect(sink.frames.length).toBe(1);
        expect(sink.frames[0].shape).toEqual([3, 2]);
        expect(sink.frames[0].values).toEqual([1, 4, 2, 5, 3, 6]);
        expect(node.lastShape).toBe("3x2");
    });

    test("add_batch_dim emits [1, B, A] with the same data layout", () => {
        const input: ITensor = { data: Float32Array.from([1, 2, 3, 4, 5, 6]), shape: [2, 3] };
        const { sink, node, run } = runTranspose([input], true);
        run();
        expect(sink.frames.length).toBe(1);
        expect(sink.frames[0].shape).toEqual([1, 3, 2]);
        expect(sink.frames[0].values).toEqual([1, 4, 2, 5, 3, 6]);
        expect(node.lastShape).toBe("1x3x2");
    });

    test("a non-rank-2 input throws", () => {
        const input: ITensor = { data: Float32Array.from([1, 2, 3, 4, 5, 6]), shape: [6] };
        const { run } = runTranspose([input], false);
        expect(run).toThrow(/rank-2/);
    });

    test("buffer [T, C] -> transpose(add_batch_dim) yields the (1, C, T) ONNX encoder layout", () => {
        // 3 rows of 2 channels -> buffer emits [3, 2] = [[1, 10],
        // [2, 20], [3, 30]] -> transposed (1, 2, 3): channel 0 = [1, 2, 3],
        // channel 1 = [10, 20, 30].
        const rows = [row([1, 10]), row([2, 20]), row([3, 30])];
        const source = new TokenSource(rows);
        const buffer = new ScalarBufferNode();
        buffer.frameSize = 3;
        buffer.hopLength = 3;
        const transpose = new TransposeNode();
        transpose.add_batch_dim = true;
        const sink = new FrameCollector();
        const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
            .withMode("dynamic")
            .withNodes(source, buffer, transpose, sink)
            .withChannel(source, buffer, "out", "value")
            .withChannel(buffer, transpose, "frame", "tensor")
            .withChannel(transpose, sink, "transposed")
            .build();
        const session = new Session(graph);
        for (let k = 0; k < rows.length; k++) session.run(k);

        expect(sink.frames.length).toBe(1);
        expect(sink.frames[0].shape).toEqual([1, 2, 3]);
        expect(sink.frames[0].values).toEqual([1, 2, 3, 10, 20, 30]);
    });
});

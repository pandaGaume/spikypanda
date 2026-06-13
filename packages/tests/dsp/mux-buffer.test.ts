/**
 * Tests for DSP.Stream:mux (ChannelMuxNode) and the multi-channel
 * upgrade of DSP.Stream:buffer (ScalarBufferNode):
 *
 *   - mux assembles one [N] tensor per tick from N float inputs, with
 *     in_k mapping to data[k], and reuses its Float32Array across
 *     ticks while N is stable;
 *   - buffer scalar mode regression: [frameSize] frames, hop slide;
 *   - buffer tensor mode: [C] rows accumulate into [frameSize, C]
 *     frames with the same hop semantics;
 *   - the first sample after reset fixes the layout; later mismatches
 *     throw;
 *   - the canonical mux -> buffer chain produces [frameSize, N].
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IPluginContext } from "spikypanda-nodeeditor";
import dspPlugin from "../../dev/plugins/dsp/src/index";
import { ChannelMuxNode } from "../../dev/plugins/dsp/src/stream/mux.node";
import { ScalarBufferNode } from "../../dev/plugins/dsp/src/stream/buffer.node";
import { FrameCollector, TokenSource, row } from "./helpers";

describe("DSP plugin registration", () => {
    test("aggregates the DSP.Detect / DSP.Tensor sub-plugins and registers the new type ids", () => {
        const keys = Object.keys(dspPlugin.subPlugins);
        expect(keys).toEqual(expect.arrayContaining(["DSP.Stream", "DSP.Detect", "DSP.Tensor"]));

        const registered: string[] = [];
        const ctx = { nodes: { register: (typeId: string) => registered.push(typeId) }, assetUrl: (p: string) => p } as unknown as IPluginContext;
        dspPlugin.subPlugins["DSP.Stream"].activate(ctx);
        dspPlugin.subPlugins["DSP.Detect"].activate(ctx);
        dspPlugin.subPlugins["DSP.Tensor"].activate(ctx);
        expect(registered).toEqual(["DSP.Stream:buffer", "DSP.Stream:mux", "DSP.Detect:steadystate", "DSP.Tensor:transpose"]);
    });
});

describe("ChannelMuxNode", () => {
    test("assembles [N] from N inputs, in_k -> data[k]", () => {
        const s0 = new TokenSource([1, 4]);
        const s1 = new TokenSource([2, 5]);
        const s2 = new TokenSource([3, 6]);
        const mux = new ChannelMuxNode();
        const sink = new FrameCollector();
        const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
            .withMode("dynamic")
            .withNodes(s0, s1, s2, mux, sink)
            .withChannel(s0, mux, "out", "in_0")
            .withChannel(s1, mux, "out", "in_1")
            .withChannel(s2, mux, "out", "in_2")
            .withChannel(mux, sink, "frame")
            .build();
        const session = new Session(graph);
        session.run(0);
        session.run(1);

        expect(sink.frames.length).toBe(2);
        expect(sink.frames[0].shape).toEqual([3]);
        expect(sink.frames[0].values).toEqual([1, 2, 3]);
        expect(sink.frames[1].shape).toEqual([3]);
        expect(sink.frames[1].values).toEqual([4, 5, 6]);

        // Allocation contract: the Float32Array is REUSED while N is
        // stable, so both frames carry the same reference and a late
        // read through it sees the latest values.
        expect(sink.frames[0].ref.data).toBe(sink.frames[1].ref.data);
        expect(Array.from(sink.frames[0].ref.data)).toEqual([4, 5, 6]);
    });
});

describe("ScalarBufferNode (scalar regression)", () => {
    function runScalar(samples: number[], frameSize: number, hop: number): FrameCollector {
        const source = new TokenSource(samples);
        const buffer = new ScalarBufferNode();
        buffer.frameSize = frameSize;
        buffer.hopLength = hop;
        const sink = new FrameCollector();
        const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
            .withMode("dynamic")
            .withNodes(source, buffer, sink)
            .withChannel(source, buffer, "out", "value")
            .withChannel(buffer, sink, "frame")
            .build();
        const session = new Session(graph);
        for (let k = 0; k < samples.length; k++) session.run(k);
        return sink;
    }

    test("non-overlapping frames keep the historical [frameSize] shape", () => {
        const sink = runScalar([1, 2, 3, 4, 5, 6, 7, 8], 4, 4);
        expect(sink.frames.length).toBe(2);
        expect(sink.frames[0].shape).toEqual([4]);
        expect(sink.frames[0].values).toEqual([1, 2, 3, 4]);
        expect(sink.frames[1].values).toEqual([5, 6, 7, 8]);
    });

    test("hop < frameSize produces overlapping frames", () => {
        const sink = runScalar([1, 2, 3, 4, 5, 6, 7, 8], 4, 2);
        expect(sink.frames.length).toBe(3);
        expect(sink.frames[0].values).toEqual([1, 2, 3, 4]);
        expect(sink.frames[1].values).toEqual([3, 4, 5, 6]);
        expect(sink.frames[2].values).toEqual([5, 6, 7, 8]);
    });
});

describe("ScalarBufferNode (tensor [C] mode)", () => {
    function runRows(tokens: unknown[], frameSize: number, hop: number): { sink: FrameCollector; run: () => void } {
        const source = new TokenSource(tokens);
        const buffer = new ScalarBufferNode();
        buffer.frameSize = frameSize;
        buffer.hopLength = hop;
        const sink = new FrameCollector();
        const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
            .withMode("dynamic")
            .withNodes(source, buffer, sink)
            .withChannel(source, buffer, "out", "value")
            .withChannel(buffer, sink, "frame")
            .build();
        const session = new Session(graph);
        return {
            sink,
            run: () => {
                for (let k = 0; k < tokens.length; k++) session.run(k);
            },
        };
    }

    test("[C] rows accumulate into row-major [frameSize, C] frames", () => {
        const rows = [row([1, 10]), row([2, 20]), row([3, 30]), row([4, 40]), row([5, 50]), row([6, 60])];
        const { sink, run } = runRows(rows, 3, 3);
        run();
        expect(sink.frames.length).toBe(2);
        expect(sink.frames[0].shape).toEqual([3, 2]);
        expect(sink.frames[0].values).toEqual([1, 10, 2, 20, 3, 30]);
        expect(sink.frames[1].shape).toEqual([3, 2]);
        expect(sink.frames[1].values).toEqual([4, 40, 5, 50, 6, 60]);
    });

    test("hop semantics are preserved in tensor mode (row-wise slide)", () => {
        const rows = [row([1, 10]), row([2, 20]), row([3, 30]), row([4, 40]), row([5, 50])];
        const { sink, run } = runRows(rows, 3, 1);
        run();
        expect(sink.frames.length).toBe(3);
        expect(sink.frames[0].values).toEqual([1, 10, 2, 20, 3, 30]);
        expect(sink.frames[1].values).toEqual([2, 20, 3, 30, 4, 40]);
        expect(sink.frames[2].values).toEqual([3, 30, 4, 40, 5, 50]);
    });

    test("a channel-count mismatch after the first sample throws", () => {
        const { run } = runRows([row([1, 2]), row([1, 2, 3])], 4, 4);
        expect(run).toThrow(/channel-count mismatch/);
    });

    test("a scalar sample after a tensor layout throws", () => {
        const { run } = runRows([row([1, 2]), 5], 4, 4);
        expect(run).toThrow(/layout was fixed to tensor/);
    });

    test("a tensor sample after a scalar layout throws", () => {
        const { run } = runRows([5, row([1, 2])], 4, 4);
        expect(run).toThrow(/layout was fixed to scalar/);
    });
});

describe("mux -> buffer chain", () => {
    test("N scalar streams become [frameSize, N] frames", () => {
        const s0 = new TokenSource([1, 3]);
        const s1 = new TokenSource([2, 4]);
        const mux = new ChannelMuxNode();
        const buffer = new ScalarBufferNode();
        buffer.frameSize = 2;
        buffer.hopLength = 2;
        const sink = new FrameCollector();
        const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
            .withMode("dynamic")
            .withNodes(s0, s1, mux, buffer, sink)
            .withChannel(s0, mux, "out", "in_0")
            .withChannel(s1, mux, "out", "in_1")
            .withChannel(mux, buffer, "frame", "value")
            .withChannel(buffer, sink, "frame")
            .build();
        const session = new Session(graph);
        session.run(0);
        session.run(1);

        // The buffer must have copied each mux row on ingest (the mux
        // reuses its Float32Array), so the frame holds both ticks.
        expect(sink.frames.length).toBe(1);
        expect(sink.frames[0].shape).toEqual([2, 2]);
        expect(sink.frames[0].values).toEqual([1, 2, 3, 4]);
    });
});

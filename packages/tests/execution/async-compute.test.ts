import { ComputeGraph, DataLink, ITensor, Kernel } from "spikypanda-core";

class OpaqueTensor implements ITensor {
    public shape = [1];
    public constructor(public readonly value: number) {}
    public get data(): Float32Array { throw new Error("Unexpected tensor materialization"); }
}

class AsyncSource extends Kernel {
    public readonly nodeType = "async-source";
    public readonly outputShapes = [[1]];
    public readonly outputNames = ["source"];
    public execute(): ITensor[] { throw new Error("Synchronous execution is forbidden"); }
    public async executeAsync(inputs: ITensor[]): Promise<ITensor[]> {
        await Promise.resolve();
        return [new OpaqueTensor(inputs[0].data[0])];
    }
}

class AsyncTransform extends Kernel {
    public readonly nodeType = "async-transform";
    public readonly outputShapes = [[1]];
    public readonly outputNames = ["result"];
    public execute(): ITensor[] { throw new Error("Synchronous execution is forbidden"); }
    public async executeAsync(inputs: ITensor[]): Promise<ITensor[]> {
        expect(inputs[0]).toBeInstanceOf(OpaqueTensor);
        expect((inputs[0] as OpaqueTensor).value).toBeGreaterThan(0);
        await Promise.resolve();
        return [new OpaqueTensor((inputs[0] as OpaqueTensor).value * 2)];
    }
}

test("Async graph delivers awaited outputs and preserves opaque tensors over successive inputs", async () => {
    const source = new AsyncSource(); source.id = "input";
    const middle = new AsyncTransform();
    const sink = new AsyncTransform();
    const graph = new ComputeGraph([sink, middle, source], [new DataLink(source, middle, 0), new DataLink(middle, sink, 0)]);
    for (const value of [3, 7]) {
        const result = (await graph.inferAsync(new Map([["input", { shape: [1], data: new Float32Array([value]) }]]))).get("result")!;
        expect(result).toBeInstanceOf(OpaqueTensor);
        expect((result as OpaqueTensor).value).toBe(value * 4);
        expect(result.name).toBe("result");
        expect(() => result.data).toThrow("Unexpected tensor materialization");
    }
});

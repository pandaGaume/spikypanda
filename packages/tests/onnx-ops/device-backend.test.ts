import { ComputeGraph, DataLink, DeviceTensor, Kernel, Session, readTensor } from "spikypanda-core";
import type { ITensor, ITensorStorage, IKernelNodeState } from "spikypanda-core";
import { DeviceMatMulNode, TensorDownloadNode, attachComputeBackend, registerDeviceMatMul } from "../../dev/onnx/src/onnx/backends/device.backend";
import type { IComputeBackend } from "../../dev/onnx/src/onnx/backends/device.backend";
import { planMatMul } from "../../dev/onnx/src/onnx/backends/matmul.plan";
import { createRegistry } from "../../dev/onnx/src/onnx/ops";
import type { OnnxNodeInfo } from "../../dev/onnx/src/onnx/onnx-types";

const info = (output = "Y"): OnnxNodeInfo => ({ opType: "MatMul", inputs: ["A","B"], outputs: [output], attributes: new Map(), listAttributes: new Map(), name: output });
const tensor = (value: number): ITensor => ({ shape: [1,1], data: new Float32Array([value]) });
class Input extends Kernel {
    public readonly nodeType = "input";
    public readonly outputShapes: number[][] = [];
    public constructor(id: string) { super(); this.id = id; }
    public execute(inputs: ITensor[]): ITensor[] { return inputs; }
}
class TestStorage implements ITensorStorage {
    public readonly location = "test";
    public readonly dtype = "float32";
    public readonly byteLength: number;
    public reads = 0;
    public disposed = false;
    public constructor(public readonly values: Float32Array) { this.byteLength = values.byteLength; }
    public async read(): Promise<Float32Array> {
        if (this.disposed) throw new Error("disposed");
        this.reads++;
        return this.values.slice();
    }
    public dispose(): void { this.disposed = true; }
}
function backend(id = "test"): IComputeBackend {
    return {
        id,
        upload(tensor) { return tensor.storage ? tensor : new DeviceTensor(tensor.shape, new TestStorage(tensor.data.slice())); },
        async execute(op, inputs) {
            expect(op).toBe("MatMul");
            // A delayed backend deliberately interleaves two native sessions.
            await new Promise(resolve => setTimeout(resolve, 2));
            const values = inputs.map(t => t.storage instanceof TestStorage ? t.storage.values : t.data);
            return [new DeviceTensor([1,1], new TestStorage(new Float32Array([values[0][0]*values[1][0]])))];
        },
        async dispose() {},
    };
}
function graph() {
    const a = new Input("A"), b = new Input("B"), node = new DeviceMatMulNode(info(), "test");
    const graph = new ComputeGraph([node,a,b],[new DataLink(a,node,0),new DataLink(b,node,1)]);
    return { graph, node };
}

test("Opaque storage requires an explicit read and preserves the device allocation", async () => {
    const storage = new TestStorage(new Float32Array([4]));
    const device = new DeviceTensor([1], storage, "resident");
    expect(() => device.data).toThrow("explicit download");
    const cpu = await readTensor(device);
    expect(cpu.data[0]).toBe(4);
    expect(cpu.storage).toBeUndefined();
    cpu.data[0] = 9;
    expect((await readTensor(device)).data[0]).toBe(4);
    expect(storage.disposed).toBe(false);
    storage.dispose();
    await expect(readTensor(device)).rejects.toThrow("disposed");
    expect(() => new DeviceTensor([2], new TestStorage(new Float32Array(1)))).toThrow("size differs");
});
test("Device factory registration is local and does not capture a backend instance", () => {
    const cpu = createRegistry(), gpu = createRegistry();
    registerDeviceMatMul(gpu,"test");
    expect(gpu.getActiveBackend("MatMul")).toBe("test");
    expect(cpu.getActiveBackend("MatMul")).toBe("generic");
    const node = gpu.create(info(),new Map());
    expect(node).toBeInstanceOf(DeviceMatMulNode);
    expect(() => node.execute([])).toThrow("async runtime");
});
test("A device capability is mandatory, attachable, and detachable on native session state", async () => {
    const {graph: g,node} = graph(), session = new Session(g);
    const values = new Map([["A",tensor(2)],["B",tensor(3)]]);
    await expect(g.inferAsync(values,session)).rejects.toThrow("not attached");
    session.reset();
    const resource = backend(), detach = attachComputeBackend(session,resource);
    expect(() => attachComputeBackend(session,backend())).toThrow("already attached");
    const result = (await g.inferAsync(values,session)).get("Y")!;
    expect((await readTensor(result)).data[0]).toBe(6);
    session.reset();
    expect((await readTensor((await g.inferAsync(values,session)).get("Y")!)).data[0]).toBe(6);
    detach();
    await expect(node.executeAsync([tensor(2),tensor(3)],{nodeState:session.nodeStateOf(node)})).rejects.toThrow("not attached");
    await expect(node.executeAsync([tensor(2),tensor(3)])).rejects.toThrow("not attached");
});
test("Two parallel sessions on one topology retain their own input, capability and output", async () => {
    const {graph:g} = graph(), first = new Session(g), second = new Session(g);
    attachComputeBackend(first,backend()); attachComputeBackend(second,backend());
    const [a,b] = await Promise.all([
        g.inferAsync(new Map([["A",tensor(2)],["B",tensor(3)]]),first),
        g.inferAsync(new Map([["A",tensor(5)],["B",tensor(7)]]),second),
    ]);
    expect((await readTensor(a.get("Y")!)).data[0]).toBe(6);
    expect((await readTensor(b.get("Y")!)).data[0]).toBe(35);
    const other = graph();
    await expect(g.inferAsync(undefined,new Session(other.graph))).rejects.toThrow("another graph");
});
test("Device tensors traverse native links; only the download node reads their storage", async () => {
    const a = new Input("A"), b = new Input("B"), c = new Input("C");
    const first = new DeviceMatMulNode(info("middle"),"test"), second = new DeviceMatMulNode(info("device"),"test");
    const download = new TensorDownloadNode({...info("Y"),opType:"Download",inputs:["device"]});
    const g = new ComputeGraph([a,b,c,first,second,download],[
        new DataLink(a,first,0),new DataLink(b,first,1),new DataLink(first,second,0),new DataLink(c,second,1),new DataLink(second,download,0),
    ]);
    const session = new Session(g);
    attachComputeBackend(session,backend());
    const result=(await g.inferAsync(new Map([["A",tensor(2)],["B",tensor(3)],["C",tensor(5)]]),session)).get("Y")!;
    expect(result.data[0]).toBe(30);
    expect(first.bag?.lastOutputs).toBeUndefined();
    expect(second.bag?.lastOutputs).toBeUndefined();
    expect(((session.nodeStateOf(first) as IKernelNodeState).lastOutputs![0].storage as TestStorage).reads).toBe(0);
    expect(((session.nodeStateOf(second) as IKernelNodeState).lastOutputs![0].storage as TestStorage).reads).toBe(1);
});

test("Device MatMul plans vector promotion, batches, broadcast, zero dimensions and invalid shapes", () => {
    expect(planMatMul([3],[3]).shape).toEqual([]);
    expect(planMatMul([3],[3,7]).shape).toEqual([7]);
    expect(planMatMul([5,3],[3]).shape).toEqual([5]);
    const plan=planMatMul([2,1,3,5],[1,4,5,7]);
    expect(plan.shape).toEqual([2,4,3,7]);
    expect(Array.from(plan.offsets)).toEqual([0,0,0,35,0,70,0,105,15,0,15,35,15,70,15,105]);
    expect(planMatMul([2,0],[0,3]).shape).toEqual([2,3]);
    expect(planMatMul([0,3],[3,2]).batches).toBe(1);
    expect(planMatMul([0,2,3],[1,3,2]).batches).toBe(0);
    expect(() => planMatMul([],[1])).toThrow("rank");
    expect(() => planMatMul([2,3],[4,2])).toThrow("dimensions");
    expect(() => planMatMul([2,2,3],[3,3,2])).toThrow("broadcast");
    expect(() => planMatMul([2,-1],[1,2])).toThrow("Invalid");
    expect(() => planMatMul([2**32,1],[1,1])).toThrow("addressing");
});

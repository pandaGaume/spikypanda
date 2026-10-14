import { DeviceTensor } from "spikypanda-core";
import type { ITensor, ITensorStorage } from "spikypanda-core";
import type { IComputeBackend } from "../device.backend";
import { planMatMul } from "../matmul.plan";
import type { IWebGpuBuffer, IWebGpuDevice, IWebGpuPipeline } from "./webgpu.interfaces";
import type { OnnxNodeInfo } from "../../onnx-types";
import { planWebGpuOperator } from "./operators.shader";
import { MATMUL_WGSL } from "./matmul.shader";

const MAP_READ = 1,
    COPY_SRC = 4,
    COPY_DST = 8,
    UNIFORM = 64,
    STORAGE = 128;
class WebGpuStorage implements ITensorStorage {
    public readonly location = "webgpu";
    public readonly dtype = "float32";
    public disposed = false;
    public constructor(
        public readonly owner: WebGpuBackend,
        public readonly buffer: IWebGpuBuffer,
        public readonly byteLength: number
    ) {}
    public read(): Promise<Float32Array> {
        return this.owner.read(this);
    }
    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.owner.release(this.buffer);
    }
}

/** One backend per native runtime session. The supplied GPUDevice is borrowed. */
export class WebGpuBackend implements IComputeBackend {
    public readonly id = "webgpu";
    private readonly buffers = new Set<IWebGpuBuffer>();
    private closed = false;
    private busy = false;
    public readonly stats = { uploads: 0, uploadedBytes: 0, downloads: 0, dispatches: 0 };
    private failure?: string;
    private readonly pipelines = new Map<string, IWebGpuPipeline>();
    private readonly pending = new Set<Promise<unknown>>();
    private constructor(
        private readonly device: IWebGpuDevice,
        private readonly pipeline: IWebGpuPipeline
    ) {
        void device.lost.then((info) => {
            this.failure = info.message || "WebGPU device lost";
        });
    }
    public static async create(device: IWebGpuDevice): Promise<WebGpuBackend> {
        const module = device.createShaderModule({ code: MATMUL_WGSL });
        const info = await module.getCompilationInfo();
        const errors = info.messages.filter((m) => m.type === "error");
        if (errors.length) throw new Error(errors.map((m) => m.message).join("\n"));
        const pipeline = await device.createComputePipelineAsync({ layout: "auto", compute: { module, entryPoint: "main" } });
        return new WebGpuBackend(device, pipeline);
    }
    private check(): void {
        if (this.closed) throw new Error("WebGPU backend is closed");
        if (this.failure) throw new Error(this.failure);
    }
    private buffer(bytes: number, usage: number): IWebGpuBuffer {
        this.check();
        const size = Math.max(4, bytes);
        if (size > this.device.limits.maxBufferSize || (usage & STORAGE && size > this.device.limits.maxStorageBufferBindingSize))
            throw new Error("Tensor exceeds WebGPU buffer/binding limits; prepare a sharded model for this device");
        const buffer = this.device.createBuffer({ size, usage });
        this.buffers.add(buffer);
        return buffer;
    }
    public release(buffer: IWebGpuBuffer): void {
        if (this.buffers.delete(buffer)) buffer.destroy();
    }
    private owned(tensor: ITensor): WebGpuStorage {
        const storage = tensor.storage;
        if (!(storage instanceof WebGpuStorage) || storage.owner !== this || storage.disposed) throw new Error("Tensor belongs to a different or disposed WebGPU backend");
        this.check();
        if (tensor.shape.reduce((a, b) => a * b, 1) * 4 !== storage.byteLength) throw new Error("Device tensor data and shape differ");
        return storage;
    }
    /** Explicit upload. Reuse the returned tensor to keep weights resident; no cache based on mutable CPU arrays. */
    public upload(tensor: ITensor): ITensor {
        if (tensor.storage) {
            this.owned(tensor);
            return tensor;
        }
        const count = tensor.shape.reduce((a, b) => a * b, 1);
        if (tensor.shape.some((d) => !Number.isSafeInteger(d) || d < 0) || !Number.isSafeInteger(count) || count !== tensor.data.length)
            throw new Error("CPU tensor data and shape differ");
        const data = tensor.data;
        const buffer = this.buffer(data.byteLength, STORAGE | COPY_DST | COPY_SRC);
        try {
            if (data.byteLength) this.device.queue.writeBuffer(buffer, 0, data);
            this.stats.uploads++;
            this.stats.uploadedBytes += data.byteLength;
            return new DeviceTensor(tensor.shape, new WebGpuStorage(this, buffer, data.byteLength), tensor.name);
        } catch (error) {
            this.release(buffer);
            throw error;
        }
    }
    public async execute(operator: string, inputs: readonly ITensor[], info?: OnnxNodeInfo): Promise<ITensor[]> {
        this.check();
        if (this.busy) throw new Error("A WebGPU backend belongs to one sequential runtime; use separate backends for parallel sessions");
        this.busy = true;
        try {
            return operator === "MatMul" ? await this.executeMatMul(operator, inputs) : await this.executeOperator(operator, inputs, info);
        } finally {
            this.busy = false;
        }
    }
    private async executeMatMul(operator: string, inputs: readonly ITensor[]): Promise<ITensor[]> {
        this.check();
        if (operator !== "MatMul" || inputs.length !== 2) throw new Error("WebGPU backend currently supports two-input MatMul only");
        const plan = planMatMul(inputs[0].shape, inputs[1].shape);
        const limits = this.device.limits;
        if ([Math.ceil(plan.n / 8), Math.ceil(plan.m / 8), plan.batches].some((n) => n > limits.maxComputeWorkgroupsPerDimension))
            throw new Error("MatMul dispatch exceeds WebGPU device limits");
        const transient: IWebGpuBuffer[] = [];
        let output: IWebGpuBuffer | undefined;
        this.device.pushErrorScope("validation");
        let scopeOpen = true;
        try {
            const a = this.upload(inputs[0]);
            if (!inputs[0].storage) transient.push(this.owned(a).buffer);
            const b = this.upload(inputs[1]);
            if (!inputs[1].storage) transient.push(this.owned(b).buffer);
            const count = plan.batches * plan.m * plan.n;
            output = this.buffer(count * 4, STORAGE | COPY_SRC);
            if (count) {
                const params = this.buffer(16, UNIFORM | COPY_DST);
                const offsets = this.buffer(plan.offsets.byteLength, STORAGE | COPY_DST);
                transient.push(params, offsets);
                this.device.queue.writeBuffer(params, 0, new Uint32Array([plan.m, plan.n, plan.k, plan.batches]));
                this.device.queue.writeBuffer(offsets, 0, plan.offsets);
                const group = this.device.createBindGroup({
                    layout: this.pipeline.getBindGroupLayout(0),
                    entries: [this.owned(a).buffer, this.owned(b).buffer, output, params, offsets].map((buffer, binding) => ({ binding, resource: { buffer } })),
                });
                const encoder = this.device.createCommandEncoder();
                const pass = encoder.beginComputePass();
                pass.setPipeline(this.pipeline);
                pass.setBindGroup(0, group);
                pass.dispatchWorkgroups(Math.ceil(plan.n / 8), Math.ceil(plan.m / 8), plan.batches);
                pass.end();
                this.device.queue.submit([encoder.finish()]);
                this.stats.dispatches++;
            }
            scopeOpen = false;
            const validation = await this.device.popErrorScope();
            if (validation) throw new Error(validation.message);
            const done = this.device.queue.onSubmittedWorkDone().then(() => {
                for (const buffer of transient) this.release(buffer);
            });
            this.pending.add(done);
            void done.then(
                () => this.pending.delete(done),
                (error) => {
                    this.failure = String(error);
                    this.pending.delete(done);
                }
            );
            return [new DeviceTensor(plan.shape, new WebGpuStorage(this, output, count * 4))];
        } catch (error) {
            if (scopeOpen) await this.device.popErrorScope();
            for (const buffer of transient) this.release(buffer);
            if (output) this.release(output);
            throw error;
        }
    }
    private async executeOperator(operator: string, inputs: readonly ITensor[], info?: OnnxNodeInfo): Promise<ITensor[]> {
        const plan = planWebGpuOperator(operator, inputs, info, this.device.limits.maxComputeWorkgroupsPerDimension);
        if (Math.ceil(plan.groups / this.device.limits.maxComputeWorkgroupsPerDimension) > this.device.limits.maxComputeWorkgroupsPerDimension) throw new Error("Operator dispatch exceeds WebGPU limits");
        const transient: IWebGpuBuffer[] = [],
            outputs: IWebGpuBuffer[] = [];
        this.device.pushErrorScope("validation");
        let scopeOpen = true;
        try {
            let pipeline = this.pipelines.get(plan.code);
            if (plan.groups && !pipeline) {
                const module = this.device.createShaderModule({ code: plan.code });
                const compilation = await module.getCompilationInfo();
                const errors = compilation.messages.filter((m) => m.type === "error");
                if (errors.length) throw new Error(errors.map((m) => m.message).join("\n"));
                pipeline = await this.device.createComputePipelineAsync({ layout: "auto", compute: { module, entryPoint: "main" } });
                // Bound specialization cache for dynamic sequence lengths.
                if (this.pipelines.size >= 64) this.pipelines.delete(this.pipelines.keys().next().value!);
                this.pipelines.set(plan.code, pipeline);
            }
            const uploaded = plan.inputs.map((input) => {
                const resident = this.upload(input);
                if (!input.storage) transient.push(this.owned(resident).buffer);
                return this.owned(resident).buffer;
            });
            for (const shape of plan.shapes) outputs.push(this.buffer(shape.reduce((a, b) => a * b, 1) * 4, STORAGE | COPY_SRC));
            if (plan.groups && pipeline) {
                const group = this.device.createBindGroup({
                    layout: pipeline.getBindGroupLayout(0),
                    entries: [...uploaded, ...outputs].map((buffer, binding) => ({ binding, resource: { buffer } })),
                });
                const encoder = this.device.createCommandEncoder(),
                    pass = encoder.beginComputePass();
                pass.setPipeline(pipeline);
                pass.setBindGroup(0, group);
                pass.dispatchWorkgroups(Math.min(plan.groups, this.device.limits.maxComputeWorkgroupsPerDimension), Math.ceil(plan.groups / this.device.limits.maxComputeWorkgroupsPerDimension));
                pass.end();
                this.device.queue.submit([encoder.finish()]);
                this.stats.dispatches++;
            }
            scopeOpen = false;
            const validation = await this.device.popErrorScope();
            if (validation) throw new Error(validation.message);
            const done = this.device.queue.onSubmittedWorkDone().then(() => {
                for (const buffer of transient) this.release(buffer);
            });
            this.pending.add(done);
            void done.then(
                () => this.pending.delete(done),
                (error) => {
                    this.failure = String(error);
                    this.pending.delete(done);
                }
            );
            return plan.shapes.map((shape, i) => new DeviceTensor(shape, new WebGpuStorage(this, outputs[i], shape.reduce((a, b) => a * b, 1) * 4)));
        } catch (error) {
            if (scopeOpen) await this.device.popErrorScope();
            for (const buffer of [...transient, ...outputs]) this.release(buffer);
            throw error;
        }
    }
    public async read(storage: WebGpuStorage): Promise<Float32Array> {
        this.check();
        if (storage.owner !== this || storage.disposed) throw new Error("Disposed or foreign WebGPU tensor");
        this.stats.downloads++;
        if (!storage.byteLength) return new Float32Array();
        const staging = this.buffer(storage.byteLength, MAP_READ | COPY_DST);
        try {
            const encoder = this.device.createCommandEncoder();
            encoder.copyBufferToBuffer(storage.buffer, 0, staging, 0, storage.byteLength);
            this.device.queue.submit([encoder.finish()]);
            await staging.mapAsync(MAP_READ);
            const result = new Float32Array(staging.getMappedRange().slice(0));
            staging.unmap();
            return result;
        } finally {
            this.release(staging);
        }
    }
    /** Allocation diagnostics after submitted work and transient release complete. */
    public async inspect(): Promise<{ liveAllocations: number }> {
        this.check();
        await this.device.queue.onSubmittedWorkDone();
        await Promise.all(this.pending);
        return { liveAllocations: this.buffers.size };
    }
    public async dispose(): Promise<void> {
        if (this.closed) return;
        if (this.busy) throw new Error("Stop runtime execution before disposing its WebGPU backend");
        this.closed = true;
        this.pipelines.clear();
        try {
            await this.device.queue.onSubmittedWorkDone();
            await Promise.all(this.pending);
        } finally {
            for (const buffer of [...this.buffers]) this.release(buffer);
        }
    }
}

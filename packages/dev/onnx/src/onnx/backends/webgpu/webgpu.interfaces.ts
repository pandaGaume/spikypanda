/** Minimal structural WebGPU surface used by this backend.
 * Browser GPUDevice implementations satisfy this interface; no browser globals are loaded at import.
 */
export interface IWebGpuBuffer {
    mapAsync(mode: number): Promise<void>;
    getMappedRange(): ArrayBuffer;
    unmap(): void;
    destroy(): void;
}
export interface IWebGpuPass {
    setPipeline(pipeline: IWebGpuPipeline): void;
    setBindGroup(index: number, group: unknown): void;
    dispatchWorkgroups(x: number, y?: number, z?: number): void;
    end(): void;
}
export interface IWebGpuEncoder {
    beginComputePass(): IWebGpuPass;
    copyBufferToBuffer(source: IWebGpuBuffer, sourceOffset: number, destination: IWebGpuBuffer, destinationOffset: number, size: number): void;
    finish(): unknown;
}
export interface IWebGpuPipeline {
    getBindGroupLayout(index: number): unknown;
}
export interface IWebGpuDevice {
    readonly limits: { readonly maxBufferSize: number; readonly maxStorageBufferBindingSize: number; readonly maxComputeWorkgroupsPerDimension: number };
    readonly lost: Promise<{ message: string }>;
    readonly queue: {
        writeBuffer(buffer: IWebGpuBuffer, offset: number, data: ArrayBuffer | ArrayBufferView): void;
        submit(commands: unknown[]): void;
        onSubmittedWorkDone(): Promise<void>;
    };
    createBuffer(descriptor: { size: number; usage: number }): IWebGpuBuffer;
    createShaderModule(descriptor: { code: string }): {
        getCompilationInfo(): Promise<{ messages: readonly { type: string; message: string }[] }>;
    };
    createComputePipelineAsync(descriptor: { layout: "auto"; compute: { module: unknown; entryPoint: string } }): Promise<IWebGpuPipeline>;
    createBindGroup(descriptor: { layout: unknown; entries: { binding: number; resource: { buffer: IWebGpuBuffer } }[] }): unknown;
    createCommandEncoder(): IWebGpuEncoder;
    pushErrorScope(filter: "validation"): void;
    popErrorScope(): Promise<{ message: string } | null>;
}

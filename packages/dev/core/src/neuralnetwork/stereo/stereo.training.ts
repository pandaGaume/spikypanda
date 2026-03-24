import { IBackpropSynapseContext, ILossFunction, IOptimizer, ITrainingContext } from "../nn.training";
import {
    CnnLayerType,
    ICnnNeuron,
    ICnnSynapse,
    IKernel,
    PoolingType,
} from "../cnn/cnn.interfaces";
import { ICnnBackpropNeuronContext, KernelWeightSlot, KernelBiasSlot } from "../cnn/training/cnn.training.interfaces";
import { IStereoCnnGraph } from "./stereo.interfaces";
import { StereoInferenceRuntime } from "./stereo.inference";

/// <summary>
/// Training runtime for stereo CNN graphs.
/// Handles backpropagation with shared kernels between L and R branches.
/// Shared kernels accumulate gradients from both branches into the same kernel weights.
/// Cross-kernel gradients also accumulate normally through the KernelWeightSlot pattern.
/// </summary>
export class StereoTrainingRuntime {
    private _context: ITrainingContext = { iteration: 0 };

    private _kernelWeightSlots: Map<IKernel, KernelWeightSlot[]> = new Map();
    private _kernelBiasSlots: Map<IKernel, KernelBiasSlot> = new Map();
    private _kernelNeuronMap: Map<IKernel, ICnnNeuron[]> = new Map();

    public constructor(
        public readonly graph: IStereoCnnGraph,
        public readonly runtime: StereoInferenceRuntime,
        public readonly lossFn: ILossFunction,
        public readonly learningRate: number,
        public readonly optimizer: IOptimizer
    ) {
        this._initKernelMaps();
    }

    private _initKernelMaps(): void {
        for (const kernel of this.graph.kernels) {
            // Weight slots
            const slots: KernelWeightSlot[] = [];
            for (let i = 0; i < kernel.weights.length; i++) {
                slots.push(new KernelWeightSlot(kernel, i));
            }
            this._kernelWeightSlots.set(kernel, slots);

            // Bias slot
            this._kernelBiasSlots.set(kernel, new KernelBiasSlot(kernel));

            // Neuron map
            this._kernelNeuronMap.set(kernel, []);
        }

        // Map conv neurons to their kernels (from both L and R branches + cross)
        for (const desc of this.graph.layerDescriptors) {
            if (desc.type === CnnLayerType.Conv) {
                for (const neuron of desc.neurons) {
                    const inSynapses = neuron.opsc<ICnnSynapse>() ?? [];
                    for (const syn of inSynapses) {
                        if (syn.kernel) {
                            const arr = this._kernelNeuronMap.get(syn.kernel);
                            if (arr && !arr.includes(neuron)) {
                                arr.push(neuron);
                            }
                            break;
                        }
                    }
                }
            }
        }
    }

    /// <summary>
    /// Performs one training step: forward pass, loss computation, backpropagation, and weight update.
    /// </summary>
    /// <param name="leftPixels">Left input image pixels (flat, channel-major)</param>
    /// <param name="rightPixels">Right input image pixels (flat, channel-major)</param>
    /// <param name="targetDisparity">Ground truth disparity map (flat array matching output size)</param>
    /// <returns>Total loss for this step</returns>
    public trainStep(leftPixels: number[], rightPixels: number[], targetDisparity: number[]): number {
        const outputs = this.runtime.run(leftPixels, rightPixels);
        const loss = this._backpropagate(outputs, targetDisparity);
        this._applyGradients();
        this._context.iteration++;
        return loss;
    }

    private _backpropagate(outputs: number[], expected: number[]): number {
        let totalLoss = 0;

        // Initialize backprop context for all neurons
        for (const neuron of this.graph.nodes) {
            const bag = neuron.bag as ICnnBackpropNeuronContext;
            bag.error = 0;
            bag.gradient = 0;
        }

        // STEP 1 -- Output layer: compute loss and gradient
        const hasChannelWeights = typeof (this.lossFn as any).setCurrentIndex === "function";
        for (let i = 0; i < this.graph.outputs.length; i++) {
            const neuron = this.graph.outputs[i];
            const bag = neuron.bag as ICnnBackpropNeuronContext;
            const o = bag.activation;
            const y = expected[i];

            if (hasChannelWeights) (this.lossFn as any).setCurrentIndex(i);
            totalLoss += this.lossFn.loss(o, y);

            const dLoss = this.lossFn.dLoss(o, y);
            const activationPrime = (neuron.activationFn ?? this.runtime.mainActivation).derivative;
            bag.gradient = dLoss * activationPrime(o);
            bag.error = y - o;
        }

        // STEP 2 -- Hidden layers in reverse order
        const descs = this.graph.layerDescriptors;
        for (let layerIdx = descs.length - 2; layerIdx >= 1; layerIdx--) {
            const desc = descs[layerIdx];

            switch (desc.type) {
                case CnnLayerType.Dense:
                case CnnLayerType.Conv:
                    this._backpropActivationLayer(desc.neurons);
                    break;
                case CnnLayerType.Flatten:
                case CnnLayerType.Upsample:
                case CnnLayerType.Reshape:
                    this._backpropFlatten(desc.neurons);
                    break;
                case CnnLayerType.Pool:
                    this._backpropPool(desc.neurons);
                    break;
            }
        }

        return totalLoss;
    }

    private _backpropActivationLayer(neurons: ICnnNeuron[]): void {
        for (const neuron of neurons) {
            const bag = neuron.bag as ICnnBackpropNeuronContext;
            const activation = bag.activation;
            const activationPrime = (neuron.activationFn ?? this.runtime.mainActivation).derivative;

            let downstreamSum = 0;
            for (const syn of neuron.onsc<ICnnSynapse>() ?? []) {
                const target = syn.ofin as ICnnNeuron;
                const targetBag = target.bag as ICnnBackpropNeuronContext;

                if (target.layerType === CnnLayerType.Pool) {
                    continue;
                }

                downstreamSum += syn.weight * (targetBag.gradient ?? 0);
            }

            const poolGrad = bag.gradient;
            bag.gradient = activationPrime(activation) * downstreamSum + poolGrad;
        }
    }

    private _backpropFlatten(neurons: ICnnNeuron[]): void {
        for (const neuron of neurons) {
            const bag = neuron.bag as ICnnBackpropNeuronContext;

            let downstreamSum = 0;
            for (const syn of neuron.onsc<ICnnSynapse>() ?? []) {
                const target = syn.ofin as ICnnNeuron;
                const targetBag = target.bag as ICnnBackpropNeuronContext;
                downstreamSum += syn.weight * (targetBag.gradient ?? 0);
            }

            bag.gradient = downstreamSum;
        }
    }

    private _backpropPool(neurons: ICnnNeuron[]): void {
        for (const neuron of neurons) {
            const bag = neuron.bag as ICnnBackpropNeuronContext;

            let downstreamSum = 0;
            for (const syn of neuron.onsc<ICnnSynapse>() ?? []) {
                const target = syn.ofin as ICnnNeuron;
                const targetBag = target.bag as ICnnBackpropNeuronContext;

                if (target.layerType === CnnLayerType.Pool) {
                    continue;
                }

                downstreamSum += syn.weight * (targetBag.gradient ?? 0);
            }
            for (const syn of neuron.onsc<ICnnSynapse>() ?? []) {
                const target = syn.ofin as ICnnNeuron;
                if (target.layerType === CnnLayerType.Flatten) {
                    const targetBag = target.bag as ICnnBackpropNeuronContext;
                    downstreamSum += targetBag.gradient ?? 0;
                }
            }
            bag.gradient = downstreamSum;

            // Route gradient to inputs
            const inSynapses = neuron.opsc<ICnnSynapse>() ?? [];

            if (neuron.poolType === PoolingType.Max) {
                let maxActivation = -Infinity;
                let maxNeuron: ICnnNeuron | null = null;
                for (const syn of inSynapses) {
                    const src = syn.oini as ICnnNeuron;
                    const srcBag = src.bag as ICnnBackpropNeuronContext;
                    if (srcBag.activation > maxActivation) {
                        maxActivation = srcBag.activation;
                        maxNeuron = src;
                    }
                }
                if (maxNeuron) {
                    const maxBag = maxNeuron.bag as ICnnBackpropNeuronContext;
                    maxBag.gradient += bag.gradient;
                }
            } else {
                const n = inSynapses.length;
                for (const syn of inSynapses) {
                    const src = syn.oini as ICnnNeuron;
                    const srcBag = src.bag as ICnnBackpropNeuronContext;
                    srcBag.gradient += bag.gradient / n;
                }
            }
        }
    }

    private _applyGradients(): void {
        // 1. Kernel weight gradients -- accumulate and apply
        for (const kernel of this.graph.kernels) {
            const slots = this._kernelWeightSlots.get(kernel)!;
            const neurons = this._kernelNeuronMap.get(kernel)!;

            const weightGrads = new Array(kernel.weights.length).fill(0);
            let biasGrad = 0;

            for (const neuron of neurons) {
                const neuronBag = neuron.bag as ICnnBackpropNeuronContext;
                biasGrad += neuronBag.gradient;

                for (const syn of neuron.opsc<ICnnSynapse>() ?? []) {
                    if (syn.kernel === kernel) {
                        const src = syn.oini as ICnnNeuron;
                        const srcBag = src.bag as ICnnBackpropNeuronContext;
                        weightGrads[syn.kernelIndex] += neuronBag.gradient * srcBag.activation;
                    }
                }
            }

            // Apply optimizer to each kernel weight
            for (let i = 0; i < kernel.weights.length; i++) {
                this.optimizer.apply(slots[i] as any, this.learningRate, weightGrads[i], this._context);
            }

            // Apply optimizer to kernel bias, then sync to neurons
            const biasSlot = this._kernelBiasSlots.get(kernel)!;
            this.optimizer.apply(biasSlot as any, this.learningRate, biasGrad, this._context);
            for (const neuron of neurons) {
                neuron.bias = kernel.bias;
            }
        }

        // 2. Dense synapse weights
        for (const syn of this.graph.links) {
            if (syn.kernel !== null) continue;

            const target = syn.ofin as ICnnNeuron;
            if (target.layerType !== CnnLayerType.Dense) continue;

            const src = syn.oini as ICnnNeuron;
            const srcBag = src.bag as ICnnBackpropNeuronContext;
            const targetBag = target.bag as ICnnBackpropNeuronContext;

            const gradient = targetBag.gradient * srcBag.activation;
            const synBag = (syn.bag ??= {}) as IBackpropSynapseContext;
            synBag.gradient = gradient;

            this.optimizer.apply(syn as any, this.learningRate, gradient, this._context);
        }

        // 3. Dense neuron biases
        for (const desc of this.graph.layerDescriptors) {
            if (desc.type !== CnnLayerType.Dense) continue;
            for (const neuron of desc.neurons) {
                const bag = neuron.bag as ICnnBackpropNeuronContext;
                if (bag.gradient !== undefined) {
                    neuron.bias -= this.learningRate * bag.gradient;
                }
            }
        }
    }

    public get trainingContext(): Readonly<ITrainingContext> {
        return this._context;
    }

    public clearContext(): void {
        for (const neuron of this.graph.nodes) {
            const bag = neuron.bag as ICnnBackpropNeuronContext | undefined;
            if (bag) {
                bag.error = 0;
                bag.gradient = 0;
            }
        }
        for (const syn of this.graph.links) {
            const bag = syn.bag as IBackpropSynapseContext | undefined;
            if (bag) {
                bag.gradient = 0;
            }
        }
    }

    public deleteContext(): void {
        for (const neuron of this.graph.nodes) {
            neuron.bag = undefined;
        }
        for (const syn of this.graph.links) {
            syn.bag = undefined;
        }
    }
}

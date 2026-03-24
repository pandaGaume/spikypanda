import { Cartesian3 } from "../../geometry";
import { ActivationFunctions } from "../ann/mlp/mlp.activation";
import { He } from "../nn.weights";
import {
    CnnLayerType,
    ICnnLayerDescriptor,
    ICnnNeuron,
    ICnnSynapse,
    IKernel,
    PaddingType,
} from "../cnn/cnn.interfaces";
import { CnnGraph } from "../cnn/cnn.graph";
import { Kernel } from "../cnn/cnn.kernel";
import { IStereoConfig, IStereoCnnGraph, IStereoCnnNeuron, IStereoCnnSynapse, MergeStrategy } from "./stereo.interfaces";
import { StereoCnnNeuron } from "./stereo.neuron";
import { StereoCnnSynapse } from "./stereo.synapse";

function computeOutputSize(inputSize: number, kernelSize: number, stride: number, padding: PaddingType): number {
    if (padding === PaddingType.Same) {
        return Math.ceil(inputSize / stride);
    }
    return Math.floor((inputSize - kernelSize) / stride) + 1;
}

function computePadding(inputSize: number, kernelSize: number, stride: number, padding: PaddingType): number {
    if (padding === PaddingType.Same) {
        const outSize = Math.ceil(inputSize / stride);
        const totalPad = Math.max((outSize - 1) * stride + kernelSize - inputSize, 0);
        return Math.floor(totalPad / 2);
    }
    return 0;
}

/// <summary>
/// Builds a stereo CNN graph with two parallel branches (left and right) sharing kernels,
/// cross-branch synapses for disparity matching, and a merge layer for output.
/// </summary>
export class StereoCnnBuilder {
    private _config!: IStereoConfig;

    public constructor(config: IStereoConfig) {
        this._config = config;
    }

    public build(): IStereoCnnGraph {
        const config = this._config;
        const allNeurons: IStereoCnnNeuron[] = [];
        const allSynapses: IStereoCnnSynapse[] = [];
        const sharedKernels: IKernel[] = [];
        const crossKernels: IKernel[] = [];
        const leftDescriptors: ICnnLayerDescriptor[] = [];
        const rightDescriptors: ICnnLayerDescriptor[] = [];

        let layerDepth = 0;

        // ── Input layers ────────────────────────────────────────────────
        const leftInputDesc = this._buildInputLayer("left", allNeurons, layerDepth);
        const rightInputDesc = this._buildInputLayer("right", allNeurons, layerDepth + 0.5);
        leftDescriptors.push(leftInputDesc);
        rightDescriptors.push(rightInputDesc);
        layerDepth++;

        let prevLeft: ICnnLayerDescriptor = leftInputDesc;
        let prevRight: ICnnLayerDescriptor = rightInputDesc;

        // ── Conv layers with shared kernels ─────────────────────────────
        for (let i = 0; i < config.filters.length; i++) {
            const filters = config.filters[i];
            const kernelSize = config.kernelSizes[i];

            // Create shared kernels for this conv layer (one per filter)
            const layerKernels: Kernel[] = [];
            const kH = kernelSize;
            const kW = kernelSize;
            for (let f = 0; f < filters; f++) {
                const fanIn = kH * kW * prevLeft.channels;
                const initializer = new He(fanIn);
                const kernel = new Kernel(kH, kW, prevLeft.channels, initializer, 0);
                layerKernels.push(kernel);
                sharedKernels.push(kernel);
            }

            // Build conv layer for left branch using shared kernels
            const leftConvDesc = this._buildConvLayer(
                "left", prevLeft, layerKernels, filters, kernelSize,
                allNeurons, allSynapses, layerDepth
            );
            leftDescriptors.push(leftConvDesc);

            // Build conv layer for right branch using SAME shared kernels
            const rightConvDesc = this._buildConvLayer(
                "right", prevRight, layerKernels, filters, kernelSize,
                allNeurons, allSynapses, layerDepth + 0.5
            );
            rightDescriptors.push(rightConvDesc);

            // ── Cross-synapses if this layer is in crossLayers ──────────
            if (config.crossLayers.includes(i)) {
                // Create a cross-kernel for this layer: shape (1 × 1 × channels)
                // One weight per disparity channel combination
                const crossChannels = leftConvDesc.channels;
                const crossFanIn = crossChannels * (config.maxDisparity + 1);
                const crossInitializer = new He(crossFanIn);
                const crossKernel = new Kernel(1, 1, crossChannels, crossInitializer, 0);
                crossKernels.push(crossKernel);

                this._buildCrossSynapses(
                    leftConvDesc, rightConvDesc, crossKernel,
                    config.maxDisparity, allSynapses
                );
            }

            prevLeft = leftConvDesc;
            prevRight = rightConvDesc;
            layerDepth++;
        }

        // ── Merge layer ─────────────────────────────────────────────────
        layerDepth++;
        const mergeDesc = this._buildMergeLayer(
            prevLeft, prevRight, config.mergeStrategy,
            allNeurons, allSynapses, layerDepth
        );

        // ── Flatten ─────────────────────────────────────────────────────
        layerDepth++;
        const flattenDesc = this._buildFlattenLayer(
            mergeDesc, allNeurons, allSynapses, layerDepth
        );

        // ── Dense output layer ──────────────────────────────────────────
        layerDepth++;
        const outputUnits = config.outputWidth * config.outputHeight;
        const outputDesc = this._buildDenseLayer(
            flattenDesc, outputUnits, allNeurons, allSynapses, layerDepth
        );

        // ── Assemble graph ──────────────────────────────────────────────
        const inputNeurons = [...leftInputDesc.neurons, ...rightInputDesc.neurons] as IStereoCnnNeuron[];
        const outputNeurons = outputDesc.neurons as IStereoCnnNeuron[];
        const hiddenNeurons = allNeurons.filter(
            (n) => !inputNeurons.includes(n) && !outputNeurons.includes(n)
        );

        // Combine all layer descriptors for the unified graph
        const allDescriptors: ICnnLayerDescriptor[] = [];
        // Interleave: input(L+R), then conv layers, then merge, flatten, dense
        allDescriptors.push({
            type: CnnLayerType.Input,
            width: config.width,
            height: config.height,
            channels: config.channels * 2,
            neurons: [...leftInputDesc.neurons, ...rightInputDesc.neurons],
        });
        for (let i = 0; i < config.filters.length; i++) {
            allDescriptors.push({
                type: CnnLayerType.Conv,
                width: leftDescriptors[i + 1].width,
                height: leftDescriptors[i + 1].height,
                channels: leftDescriptors[i + 1].channels * 2,
                neurons: [...leftDescriptors[i + 1].neurons, ...rightDescriptors[i + 1].neurons],
            });
        }
        allDescriptors.push(mergeDesc);
        allDescriptors.push(flattenDesc);
        allDescriptors.push(outputDesc);

        const allKernels = [...sharedKernels, ...crossKernels];

        const graph = new CnnGraph(
            allNeurons as ICnnNeuron[],
            allSynapses as ICnnSynapse[],
            inputNeurons as ICnnNeuron[],
            outputNeurons as ICnnNeuron[],
            hiddenNeurons as ICnnNeuron[],
            allKernels,
            allDescriptors
        );

        // Pre-compute intraSynapseCount for each neuron (excludes cross-synapses)
        for (const neuron of allNeurons) {
            const all = (neuron as StereoCnnNeuron).opsc<IStereoCnnSynapse>() ?? [];
            (neuron as StereoCnnNeuron).intraSynapseCount = all.filter(s => !s.cross).length;
        }

        // Return as IStereoCnnGraph with extra metadata
        const stereoGraph = graph as unknown as IStereoCnnGraph;
        (stereoGraph as any).config = config;
        (stereoGraph as any).leftInputs = leftInputDesc.neurons;
        (stereoGraph as any).rightInputs = rightInputDesc.neurons;
        (stereoGraph as any).leftLayerDescriptors = leftDescriptors;
        (stereoGraph as any).rightLayerDescriptors = rightDescriptors;
        (stereoGraph as any).mergeLayerDescriptor = mergeDesc;
        (stereoGraph as any).sharedKernels = sharedKernels;
        (stereoGraph as any).crossKernels = crossKernels;

        return stereoGraph;
    }

    private _buildInputLayer(
        branch: "left" | "right",
        allNeurons: IStereoCnnNeuron[],
        layerDepth: number
    ): ICnnLayerDescriptor {
        const { width, height, channels } = this._config;
        const neurons: IStereoCnnNeuron[] = [];

        for (let c = 0; c < channels; c++) {
            for (let r = 0; r < height; r++) {
                for (let col = 0; col < width; col++) {
                    const neuron = new StereoCnnNeuron(
                        branch, CnnLayerType.Input, r, col, c,
                        0, undefined, undefined, null, null,
                        new Cartesian3(col, r, layerDepth)
                    );
                    neurons.push(neuron);
                    allNeurons.push(neuron);
                }
            }
        }

        return {
            type: CnnLayerType.Input,
            width, height, channels,
            neurons: neurons as ICnnNeuron[],
        };
    }

    private _buildConvLayer(
        branch: "left" | "right",
        prev: ICnnLayerDescriptor,
        kernels: Kernel[],
        filters: number,
        kernelSize: number,
        allNeurons: IStereoCnnNeuron[],
        allSynapses: IStereoCnnSynapse[],
        layerDepth: number
    ): ICnnLayerDescriptor {
        const kH = kernelSize;
        const kW = kernelSize;
        const sH = 1;
        const sW = 1;
        const padding = PaddingType.Valid;
        const activation = ActivationFunctions.relu;

        const outH = computeOutputSize(prev.height, kH, sH, padding);
        const outW = computeOutputSize(prev.width, kW, sW, padding);
        const padH = computePadding(prev.height, kH, sH, padding);
        const padW = computePadding(prev.width, kW, sW, padding);

        const neurons: IStereoCnnNeuron[] = [];

        for (let f = 0; f < filters; f++) {
            const kernel = kernels[f];
            for (let r = 0; r < outH; r++) {
                for (let col = 0; col < outW; col++) {
                    const neuron = new StereoCnnNeuron(
                        branch, CnnLayerType.Conv, r, col, f,
                        kernel.bias, activation, undefined, null, null,
                        new Cartesian3(col, r, layerDepth)
                    );
                    neurons.push(neuron);
                    allNeurons.push(neuron);

                    // Connect to receptive field in previous layer
                    for (let ic = 0; ic < prev.channels; ic++) {
                        for (let kr = 0; kr < kH; kr++) {
                            for (let kc = 0; kc < kW; kc++) {
                                const srcRow = r * sH + kr - padH;
                                const srcCol = col * sW + kc - padW;

                                if (srcRow < 0 || srcRow >= prev.height || srcCol < 0 || srcCol >= prev.width) {
                                    continue;
                                }

                                const srcNeuron = this._getNeuronAt(prev, srcRow, srcCol, ic);
                                const kernelIndex = ic * kH * kW + kr * kW + kc;
                                const synapse = new StereoCnnSynapse(
                                    srcNeuron, neuron, kernel, kernelIndex, 0, false, 0
                                );
                                allSynapses.push(synapse);
                            }
                        }
                    }
                }
            }
        }

        return {
            type: CnnLayerType.Conv,
            width: outW,
            height: outH,
            channels: filters,
            neurons: neurons as ICnnNeuron[],
        };
    }

    private _buildCrossSynapses(
        leftDesc: ICnnLayerDescriptor,
        rightDesc: ICnnLayerDescriptor,
        crossKernel: Kernel,
        maxDisparity: number,
        allSynapses: IStereoCnnSynapse[]
    ): void {
        const { width, height, channels } = leftDesc;

        // Cross-synapses ARE in the graph (for gradient computation) but the
        // inference runtime uses StereoCnnNeuron.getIntraInputCount() instead
        // of opsc().length for the ready-queue, excluding cross-synapses.

        for (let ch = 0; ch < channels; ch++) {
            for (let r = 0; r < height; r++) {
                for (let col = 0; col < width; col++) {
                    const leftNeuron = this._getNeuronAt(leftDesc, r, col, ch);

                    for (let d = 0; d <= maxDisparity; d++) {
                        const rightCol = col - d;
                        if (rightCol < 0 || rightCol >= rightDesc.width) continue;

                        const rightNeuron = this._getNeuronAt(rightDesc, r, rightCol, ch);
                        const kernelIndex = ch;

                        // L -> R
                        const synLR = new StereoCnnSynapse(
                            leftNeuron, rightNeuron, crossKernel, kernelIndex, 0, true, d
                        );
                        allSynapses.push(synLR);

                        // R -> L (bidirectional)
                        const synRL = new StereoCnnSynapse(
                            rightNeuron, leftNeuron, crossKernel, kernelIndex, 0, true, d
                        );
                        allSynapses.push(synRL);
                    }
                }
            }
        }
    }

    private _buildMergeLayer(
        leftDesc: ICnnLayerDescriptor,
        rightDesc: ICnnLayerDescriptor,
        strategy: MergeStrategy,
        allNeurons: IStereoCnnNeuron[],
        allSynapses: IStereoCnnSynapse[],
        layerDepth: number
    ): ICnnLayerDescriptor {
        const { width, height, channels } = leftDesc;
        const neurons: IStereoCnnNeuron[] = [];

        if (strategy === MergeStrategy.Concat) {
            // Concatenate: channels doubled
            const mergeChannels = channels * 2;

            // First half: left channels
            for (let c = 0; c < channels; c++) {
                for (let r = 0; r < height; r++) {
                    for (let col = 0; col < width; col++) {
                        const neuron = new StereoCnnNeuron(
                            "merge", CnnLayerType.Flatten, r, col, c,
                            0, undefined, undefined, null, null,
                            new Cartesian3(col, r, layerDepth)
                        );
                        neurons.push(neuron);
                        allNeurons.push(neuron);

                        const srcNeuron = this._getNeuronAt(leftDesc, r, col, c);
                        const synapse = new StereoCnnSynapse(srcNeuron, neuron, null, -1, 1, false, 0);
                        allSynapses.push(synapse);
                    }
                }
            }

            // Second half: right channels
            for (let c = 0; c < channels; c++) {
                for (let r = 0; r < height; r++) {
                    for (let col = 0; col < width; col++) {
                        const neuron = new StereoCnnNeuron(
                            "merge", CnnLayerType.Flatten, r, col, channels + c,
                            0, undefined, undefined, null, null,
                            new Cartesian3(col, r, layerDepth)
                        );
                        neurons.push(neuron);
                        allNeurons.push(neuron);

                        const srcNeuron = this._getNeuronAt(rightDesc, r, col, c);
                        const synapse = new StereoCnnSynapse(srcNeuron, neuron, null, -1, 1, false, 0);
                        allSynapses.push(synapse);
                    }
                }
            }

            return {
                type: CnnLayerType.Flatten,
                width, height,
                channels: mergeChannels,
                neurons: neurons as ICnnNeuron[],
            };
        } else {
            // Diff: |L - R| — each merge neuron receives L(+1) and R(-1)
            for (let c = 0; c < channels; c++) {
                for (let r = 0; r < height; r++) {
                    for (let col = 0; col < width; col++) {
                        const neuron = new StereoCnnNeuron(
                            "merge", CnnLayerType.Flatten, r, col, c,
                            0, ActivationFunctions.relu, undefined, null, null,
                            new Cartesian3(col, r, layerDepth)
                        );
                        neurons.push(neuron);
                        allNeurons.push(neuron);

                        const leftNeuron = this._getNeuronAt(leftDesc, r, col, c);
                        const rightNeuron = this._getNeuronAt(rightDesc, r, col, c);

                        // L with weight +1
                        const synL = new StereoCnnSynapse(leftNeuron, neuron, null, -1, 1, false, 0);
                        allSynapses.push(synL);

                        // R with weight -1
                        const synR = new StereoCnnSynapse(rightNeuron, neuron, null, -1, -1, false, 0);
                        allSynapses.push(synR);
                    }
                }
            }

            return {
                type: CnnLayerType.Flatten,
                width, height,
                channels,
                neurons: neurons as ICnnNeuron[],
            };
        }
    }

    private _buildFlattenLayer(
        prev: ICnnLayerDescriptor,
        allNeurons: IStereoCnnNeuron[],
        allSynapses: IStereoCnnSynapse[],
        layerDepth: number
    ): ICnnLayerDescriptor {
        const totalUnits = prev.width * prev.height * prev.channels;
        const neurons: IStereoCnnNeuron[] = [];

        let idx = 0;
        for (let c = 0; c < prev.channels; c++) {
            for (let r = 0; r < prev.height; r++) {
                for (let col = 0; col < prev.width; col++) {
                    const neuron = new StereoCnnNeuron(
                        "merge", CnnLayerType.Flatten, 0, idx, 0,
                        0, undefined, undefined, null, null,
                        new Cartesian3(idx, 0, layerDepth)
                    );
                    neurons.push(neuron);
                    allNeurons.push(neuron);

                    const srcNeuron = this._getNeuronAt(prev, r, col, c);
                    const synapse = new StereoCnnSynapse(srcNeuron, neuron, null, -1, 1, false, 0);
                    allSynapses.push(synapse);
                    idx++;
                }
            }
        }

        return {
            type: CnnLayerType.Flatten,
            width: totalUnits,
            height: 1,
            channels: 1,
            neurons: neurons as ICnnNeuron[],
        };
    }

    private _buildDenseLayer(
        prev: ICnnLayerDescriptor,
        units: number,
        allNeurons: IStereoCnnNeuron[],
        allSynapses: IStereoCnnSynapse[],
        layerDepth: number
    ): ICnnLayerDescriptor {
        // Sigmoid output for disparity in [0,1] range
        const activation = ActivationFunctions.sigmoid;
        const fanIn = prev.neurons.length;
        const initializer = new He(fanIn);
        const neurons: IStereoCnnNeuron[] = [];

        for (let i = 0; i < units; i++) {
            const neuron = new StereoCnnNeuron(
                "merge", CnnLayerType.Dense, 0, i, 0,
                0, activation, undefined, null, null,
                new Cartesian3(i, 0, layerDepth)
            );
            neurons.push(neuron);
            allNeurons.push(neuron);

            for (const srcNeuron of prev.neurons) {
                const synapse = new StereoCnnSynapse(
                    srcNeuron, neuron, null, -1, initializer.next(), false, 0
                );
                allSynapses.push(synapse);
            }
        }

        return {
            type: CnnLayerType.Dense,
            width: units,
            height: 1,
            channels: 1,
            neurons: neurons as ICnnNeuron[],
        };
    }

    private _getNeuronAt(desc: ICnnLayerDescriptor, row: number, col: number, channel: number): ICnnNeuron {
        const index = channel * desc.height * desc.width + row * desc.width + col;
        return desc.neurons[index];
    }
}

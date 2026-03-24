import type { ICartesian } from "../../geometry";
import { cloneable, IOlink } from "../../graph";
import { Nullable } from "../../types";
import { CnnNeuron } from "../../neuralnetwork/cnn/cnn.neuron";
import { CnnLayerType, PoolingType } from "../../neuralnetwork/cnn/cnn.interfaces";
import type { IActivationFunction } from "../../neuralnetwork/ann/mlp/mlp.interfaces";
import { IStereoCnnNeuron, IStereoCnnSynapse, StereoBranch } from "./stereo.interfaces";

/// <summary>
/// A neuron in a stereo CNN graph. Extends CnnNeuron with branch identifier.
/// Tracks the count of non-cross input synapses for the ready-queue.
/// Cross-synapses contribute to the sum but don't gate readiness.
/// </summary>
export class StereoCnnNeuron extends CnnNeuron implements IStereoCnnNeuron {
    @cloneable public branch: StereoBranch;

    /// <summary>
    /// Number of non-cross input synapses. Set by the builder after all synapses are created.
    /// Used by the inference runtime instead of opsc().length for remainingInputs.
    /// </summary>
    public intraSynapseCount: number = -1;

    public constructor(
        branch: StereoBranch,
        layerType: CnnLayerType,
        row: number = 0,
        col: number = 0,
        channel: number = 0,
        bias: number = 0,
        activationFn?: IActivationFunction,
        poolType?: PoolingType,
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian
    ) {
        super(layerType, row, col, channel, bias, activationFn, poolType, onsc, opsc, position);
        this.branch = branch;
    }

    /// <summary>
    /// Returns the number of intra-branch (non-cross) input synapses.
    /// If not explicitly set, counts from opsc().
    /// </summary>
    public getIntraInputCount(): number {
        if (this.intraSynapseCount >= 0) return this.intraSynapseCount;
        const all = this.opsc<IStereoCnnSynapse>() ?? [];
        return all.filter(s => !s.cross).length;
    }
}

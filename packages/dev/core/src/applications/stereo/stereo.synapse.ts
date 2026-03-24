import { INode } from "../../graph";
import { CnnSynapse } from "../../neuralnetwork/cnn/cnn.synapse";
import { IKernel } from "../../neuralnetwork/cnn/cnn.interfaces";
import { IStereoCnnSynapse } from "./stereo.interfaces";

/// <summary>
/// A synapse in a stereo CNN graph. Extends CnnSynapse with cross-branch metadata.
/// cross=true means this synapse connects neurons from different branches (L to R or R to L).
/// disparity is the horizontal offset for cross-synapses (0 to maxDisparity).
/// </summary>
export class StereoCnnSynapse extends CnnSynapse implements IStereoCnnSynapse {
    public cross: boolean;
    public disparity: number;

    public constructor(
        oini: INode,
        ofin: INode,
        kernel: IKernel | null = null,
        kernelIndex: number = -1,
        directWeight: number = 0,
        cross: boolean = false,
        disparity: number = 0
    ) {
        super(oini, ofin, kernel, kernelIndex, directWeight);
        this.cross = cross;
        this.disparity = disparity;
    }
}

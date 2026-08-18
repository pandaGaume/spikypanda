/**
 * CyanMycelium custom ONNX operators.
 *
 * Registered under the "ai.cyanmycelium" domain convention, encoded in
 * the op_type name like the DotVision ops, since the protobuf writer
 * does not yet support the domain field on NodeProto.
 *
 * Operators:
 *
 *   ai.cyanmycelium.ConvWIO
 *     1D convolution whose weights are ALREADY laid out channels-last,
 *     WIO [kL, C_in, C_out], instead of the ONNX-canonical OIW
 *     [C_out, C_in, kL].
 *
 *     WHY THIS EXISTS
 *
 *     The CyanMycelium C++ runtime permutes Conv weights OIW -> WIO at
 *     load time, because that is the layout its im2col + GEMM kernel
 *     reads. On the driverv2 encoder that permutation copies 18 496
 *     bytes into RAM on a target with no PSRAM. Shipping the weights
 *     pre-permuted lets them stay aliased in mapped flash, which frees
 *     32 % of the inference service.
 *
 *     WHY A DISTINCT OP AND NOT AN ATTRIBUTE ON Conv
 *
 *     A pre-permuted weight tensor read as OIW raises NO shape error.
 *     On the three driverv2 convolutions the input channel count still
 *     matches, because in a network the output of one layer feeds the
 *     next:
 *
 *       features.0  WIO 5x5x16   read as OIW -> C=5   input has 5 channels
 *       features.2  WIO 5x16x24  read as OIW -> C=16  previous layer emits 16
 *       features.4  WIO 3x24x32  read as OIW -> C=24  previous layer emits 24
 *
 *     The graph would build and return a perfectly plausible unit
 *     vector that is entirely wrong. An unknown op_type, by contrast,
 *     fails to instantiate: a hard error. Safety therefore rests on the
 *     operator NAME, not on an attribute a reader may ignore.
 *
 *     This is also why onnxruntime refuses such a file, which is the
 *     intended behaviour: the reference embedding must keep coming from
 *     the standard graph, so the WIO file is verified against something
 *     independent rather than against itself.
 *
 *     Attributes:
 *       kernel_shape (int): kernel length, default 3
 *       strides (int):      stride, default 1
 *       pads (int):         symmetric padding, default 0
 *       weight_layout (str): "WIO", documentary only, nothing reads it
 *
 *     Input:  X [N, C_in, L]     ONNX-canonical, unchanged
 *             W [kL, C_in, C_out] the only thing that differs
 *             B [C_out]          optional bias
 *     Output: Y [N, C_out, L_out] ONNX-canonical, unchanged
 *
 *     Only the WEIGHT layout changes. X and Y keep the standard layout
 *     so the node stays a drop-in replacement inside an otherwise
 *     ordinary graph.
 *
 *     Specification: CyanMycelium/doc/wio_custom_node.md
 *     Producer:      driverv2/python/wio_node.py
 */

import type { ITensor, IPortDescriptor } from "spikypanda-core";
import type { OnnxNodeInfo } from "../../../onnx-types";
import { OnnxOpNode, makeTensor, OnnxOpRegistry } from "../../../registry";

const DOMAIN = "ai.cyanmycelium";
const PRIORITY = 100;

// ---------------------------------------------------------------------------
// ConvWIO operator
// ---------------------------------------------------------------------------

export class ConvWioNode extends OnnxOpNode {
    private readonly _kernelShape: number;
    private readonly _strides: number;
    private readonly _pads: number;
    readonly outputShapes: number[][] = [];

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._kernelShape = this.attrInt("kernel_shape", 3);
        this._strides = this.attrInt("strides", 1);
        this._pads = this.attrInt("pads", 0);
    }

    protected override _buildInputPorts(info: OnnxNodeInfo): ReadonlyArray<IPortDescriptor> {
        // X (required), W (required), B (optional bias). Same fan-in as Conv.
        return info.inputs.map((_, i) => ({
            slot: i,
            optional: i === 2,
            type: "tensor",
        }));
    }

    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0]; // [N, C_in, L]
        const W = inputs[1]; // [kL, C_in, C_out]  <- the whole point
        const B = inputs.length > 2 ? inputs[2] : null;

        if (X.shape.length !== 3) {
            throw new Error(`${DOMAIN}.ConvWIO: expected a rank-3 input [N, C_in, L], got rank ${X.shape.length}`);
        }
        if (W.shape.length !== 3) {
            throw new Error(`${DOMAIN}.ConvWIO: expected rank-3 WIO weights [kL, C_in, C_out], got rank ${W.shape.length}`);
        }

        const N = X.shape[0];
        const C_in = X.shape[1];
        const L = X.shape[2];
        const kL = W.shape[0];
        const C_out = W.shape[2];

        // Two guards, because a layout mix-up is the failure this whole op
        // exists to prevent, and it does not announce itself.
        //
        // 1. The channel axis. In WIO it sits in the middle; a tensor left
        //    in OIW puts C_out there instead.
        if (W.shape[1] !== C_in) {
            throw new Error(
                `${DOMAIN}.ConvWIO: weight channel axis is ${W.shape[1]} but the input has ${C_in} channels. ` +
                    `Expected WIO [kL, C_in, C_out]; a tensor still in OIW [C_out, C_in, kL] would land here.`,
            );
        }
        // 2. The declared kernel length against the leading axis. This is
        //    the check that catches the case guard 1 cannot: on driverv2's
        //    first convolution OIW is [16, 5, 5] and WIO is [5, 5, 16], so
        //    the channel axis matches either way and only kernel_shape
        //    tells them apart. The attribute survives the permutation
        //    untouched, which is precisely what makes it a witness.
        if (this.attributes.has("kernel_shape") && kL !== this._kernelShape) {
            throw new Error(
                `${DOMAIN}.ConvWIO: leading axis is ${kL} but kernel_shape declares ${this._kernelShape}. ` +
                    `The weights look like they were never permuted to WIO.`,
            );
        }

        const stride = this._strides;
        const pad = this._pads;
        const outL = Math.floor((L + 2 * pad - kL) / stride) + 1;
        if (outL <= 0) {
            throw new Error(`${DOMAIN}.ConvWIO: input length ${L} is too short for a kernel of ${kL}`);
        }

        // Same accumulation as ConvNode; only the weight indexing differs.
        //   OIW : W[co * (C_in * kL) + ci * kL + kk]
        //   WIO : W[(kk * C_in + ci) * C_out + co]
        //
        // The WIO form is the row-major flattening the embedded kernel
        // consumes: cm_im2col_lc_f32_ansi loops ki outer and c inner, so
        // K = ki * C_in + ci, and cm_conv1d_lc_f32_ansi passes the weights
        // as the [K, N] B matrix of its GEMM.
        const out = new Float32Array(N * C_out * outL);
        for (let n = 0; n < N; n++) {
            for (let co = 0; co < C_out; co++) {
                for (let ol = 0; ol < outL; ol++) {
                    let sum = 0;
                    for (let ci = 0; ci < C_in; ci++) {
                        for (let kk = 0; kk < kL; kk++) {
                            const il = ol * stride - pad + kk;
                            if (il >= 0 && il < L) {
                                sum += X.data[n * C_in * L + ci * L + il] * W.data[(kk * C_in + ci) * C_out + co];
                            }
                        }
                    }
                    if (B) sum += B.data[co];
                    out[n * C_out * outL + co * outL + ol] = sum;
                }
            }
        }
        return [makeTensor(out, [N, C_out, outL])];
    }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerCyanMyceliumOps(registry: OnnxOpRegistry): void {
    registry.register(`${DOMAIN}.ConvWIO`, (info) => new ConvWioNode(info), PRIORITY, DOMAIN);
}

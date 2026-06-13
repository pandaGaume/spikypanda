import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, ITensor, Nullable } from "spikypanda-core";

/** Structural guard for an ITensor token arriving on `tensor`. */
function isTensorToken(v: unknown): v is ITensor {
    if (!v || typeof v !== "object") return false;
    const t = v as Partial<ITensor>;
    return t.data instanceof Float32Array && Array.isArray(t.shape);
}

/**
 * 2D tensor transpose: [A, B] in, [B, A] out (row-major both sides).
 *
 * The motivating use is the layout adapter in front of ONNX encoder
 * models: a multi-channel frame pipeline produces [T, C] (T rows of C
 * channels, ScalarBufferNode's natural accumulation order) while conv
 * encoders expect channels-first (C, T). With `add_batch_dim` enabled
 * the output shape becomes [1, B, A] (same data layout as [B, A] with
 * a leading 1), i.e. the (1, C, T) batch-of-one the ONNX runner wants.
 *
 * Editables:
 *   add_batch_dim   prepend a leading 1 to the output shape
 *                   (default false)
 *
 * Input must be rank-2; anything else throws (a silent pass-through
 * would push a wrong layout into the model and fail far from here).
 *
 * The output is a fresh Float32Array per frame, mirroring the
 * ScalarBufferNode snapshot contract: this node runs at frame cadence
 * (1 / hopLength ticks), and consumers may hold the reference.
 */
export class TransposeNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "tensor", optional: false, type: "tensor" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "transposed", optional: false, type: "tensor" }];

    @cloneable private _add_batch_dim: boolean = false;

    // Last emitted output shape, for the property panel ("2x256" or
    // "1x2x256"). Diagnostic only, not serialised semantics.
    private _lastShape: string = "";

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("boolean")
    public get add_batch_dim(): boolean {
        return this._add_batch_dim;
    }
    public set add_batch_dim(v: boolean) {
        this.setField("add_batch_dim", this._add_batch_dim, v, (b) => {
            this._add_batch_dim = b;
        });
    }

    /** Shape of the most recently emitted tensor, "AxB"-formatted. */
    @viewable("string") public get lastShape(): string {
        return this._lastShape;
    }

    public override reset(_session: ISession): void {
        this._lastShape = "";
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Drain every queued tensor on `tensor` this tick (burst-safe,
        // same ingestion pattern as ScalarBufferNode): each one is
        // transposed and republished, preserving 1:1 token cadence.
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (slot !== "tensor") continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                const v = session.consume(idx);
                if (!isTensorToken(v)) continue;
                this._transposeAndPublish(v, session);
            }
        }
    }

    private _transposeAndPublish(input: ITensor, session: ISession): void {
        if (input.shape.length !== 2) {
            throw new Error(`[Transpose] expects a rank-2 tensor [A, B]; got shape [${input.shape.join(", ")}].`);
        }
        const a = input.shape[0];
        const b = input.shape[1];
        if (input.data.length < a * b) {
            throw new Error(`[Transpose] data too short: shape [${a}, ${b}] needs ${a * b} values, got ${input.data.length}.`);
        }

        // Fresh output per frame (see class doc: frame cadence, and
        // consumers may hold the reference across ticks).
        const out = new Float32Array(a * b);
        for (let i = 0; i < a; i++) {
            for (let j = 0; j < b; j++) {
                out[j * a + i] = input.data[i * b + j];
            }
        }
        const shape = this._add_batch_dim ? [1, b, a] : [b, a];
        const tensor: ITensor = { data: out, shape };
        this._lastShape = shape.join("x");

        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "transposed" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, tensor);
        }
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createTransposeNode(): TransposeNode {
    return new TransposeNode();
}

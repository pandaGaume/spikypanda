import { IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, ITensor, Nullable } from "spikypanda-core";

/**
 * Slot prefix for the variadic input bank. Mirrors the convention used
 * by MakeArrayNode (`item_`) and FaultableNode (`fault_`): only `in_0`
 * is declared statically, the editor grows `in_1`, `in_2`, ... as the
 * user wires additional channels.
 */
const IN_SLOT_PREFIX = "in_";

/** Returns the channel index when `slot` looks like `in_<int>`, -1 otherwise. */
function muxSlotIndex(slot: string): number {
    if (slot.indexOf(IN_SLOT_PREFIX) !== 0) return -1;
    const idxStr = slot.slice(IN_SLOT_PREFIX.length);
    if (idxStr.length === 0) return -1;
    const n = Number(idxStr);
    return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : -1;
}

/**
 * Scalar multiplexer: assembles N parallel float streams into one
 * multi-channel sample per fire.
 *
 *     in_0 ──┐
 *     in_1 ──┼─► frame  { data: Float32Array[N], shape: [N] }
 *     in_2 ──┘
 *
 * `in_k` maps to `data[k]`, so the channel order in the tensor is the
 * wiring order, not the arrival order. N is `maxWiredIndex + 1` (the
 * editor keeps the bank contiguous, so in practice N = number of
 * connected inputs); a slot with no token this tick reads 0.
 *
 * Pairs with ScalarBufferNode's multi-channel mode: `mux.frame ->
 * buffer.value` accumulates [N] rows into [frameSize, N] frames, the
 * input layout expected by multi-channel encoders.
 *
 * Allocation contract: the output Float32Array is PREALLOCATED and
 * REUSED across fires while N is stable (reallocated only when the
 * wired-channel count changes), so this node is per-tick allocation
 * free. Consumers that hold a frame across ticks must copy it;
 * ScalarBufferNode copies on ingest, so the canonical mux -> buffer
 * chain is safe.
 */
export class ChannelMuxNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "in_0", optional: true, type: "float" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "frame", optional: false, type: "tensor" }];

    // Reused output storage. `_n` mirrors `_data.length`; 0 means
    // "nothing allocated yet" (cold or no wired inputs). The tensor
    // wrapper and its shape array are part of the same reuse contract,
    // keeping the steady-state fire path fully allocation free.
    private _data: Float32Array = new Float32Array(0);
    private _n: number = 0;
    private _tensor: ITensor = { data: this._data, shape: [0] };

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    public override reset(_session: ISession): void {
        // Keep the allocation (N rarely changes across resets); just
        // clear stale channel values so the first frame after reset
        // doesn't leak the previous run's tail.
        this._data.fill(0);
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Pass 1: width scan. N = maxWiredIndex + 1 so `in_k` always
        // lands at data[k] even if the editor left a hole in the bank.
        let n = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const k = muxSlotIndex(String(inSlotOf(link)));
            if (k >= 0 && k + 1 > n) n = k + 1;
        }
        if (n === 0) return;
        if (n !== this._n) {
            // Reallocate only on width change (a wire added/removed in
            // the editor); the steady-state fire path reuses `_data`.
            this._data = new Float32Array(n);
            this._n = n;
            this._tensor = { data: this._data, shape: [n] };
        }

        // Pass 2: read one token per wired slot (same consume pattern
        // as ScalarBufferNode). Slots without a ready token, or whose
        // token is not a number, default to 0 for this frame.
        this._data.fill(0);
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const k = muxSlotIndex(String(inSlotOf(link)));
            if (k < 0) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx);
            if (typeof v !== "number") continue;
            this._data[k] = v;
        }

        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "frame" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, this._tensor);
        }
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createChannelMuxNode(): ChannelMuxNode {
    return new ChannelMuxNode();
}

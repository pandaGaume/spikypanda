import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, ITensor, Nullable } from "spikypanda-core";
import { assessSeverity, zoneIndex, IIsoVerdict, MachineGroup, SupportType } from "./iso20816.js";

/**
 * `ISO.Severity:iso20816` — ISO 20816-3 broadband vibration-severity node.
 *
 * Consumes a vibration `signal` tensor and emits a standards-anchored verdict:
 * the broadband velocity RMS (mm/s) over the ISO 10-1000 Hz band, classified
 * into zone A/B/C/D for the configured machine group + support type. It READS
 * the signal's physical unit from `tensor.unit` (the unit-tag convention) and
 * REFUSES (status "refused", zone output -1) when the unit is undeclared, of a
 * non-vibration quantity, undersampled for the band, or the machine is out of
 * ISO scope. It never guesses the unit from amplitude.
 *
 * The heavy lifting is in the pure `assessSeverity` (iso20816.ts); this node is
 * the graph wrapper. Complements a learned severity score: the ISO zone is an
 * auditable, standards-backed corroboration channel.
 *
 * Inputs:
 *   signal   tensor, required. A 1-D vibration window carrying `unit`
 *            (quantity Acceleration or Speed) + sampleRateHz.
 * Outputs:
 *   assessment  any    the full IIsoVerdict (assessed or refused). Capacity 4.
 *   rms_mm_s    float   broadband velocity RMS (mm/s), or -1 when refused.
 *   zone        float   A=0, B=1, C=2, D=3, refused=-1.
 * Editables: machine_group (1|2), flexible_support, operating_rpm (0=unknown),
 *   power_kw (0=unknown). Viewables: last_zone, last_rms.
 */
export class Iso20816SeverityNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "signal", optional: false, type: "tensor" },
    ];
    public override readonly controlInputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "_enable", optional: true, type: "boolean" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "assessment", optional: false, type: "any", capacity: 4 },
        { slot: "rms_mm_s", optional: false, type: "float" },
        { slot: "zone", optional: false, type: "float" },
    ];

    @cloneable private _machineGroup: number = 2;
    @cloneable private _flexibleSupport: boolean = false;
    @cloneable private _operatingRpm: number = 0;
    @cloneable private _powerKw: number = 0;

    @cloneable private _lastZone: number = -1;
    @cloneable private _lastRms: number = 0;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /** Machine group: 1 (large, > 300 kW) or 2 (medium, 15-300 kW). */
    @editable("number")
    public get machine_group(): number {
        return this._machineGroup;
    }
    public set machine_group(v: number) {
        const next = v >= 1.5 ? 2 : 1;
        this.setField("machine_group", this._machineGroup, next, (n) => {
            this._machineGroup = n;
        });
    }

    /** Support type: false = rigid, true = flexible. */
    @editable("boolean")
    public get flexible_support(): boolean {
        return this._flexibleSupport;
    }
    public set flexible_support(v: boolean) {
        this.setField("flexible_support", this._flexibleSupport, !!v, (n) => {
            this._flexibleSupport = n;
        });
    }

    /** Operating speed (rpm). 0 = unknown; below 600 rpm drops the band edge to 2 Hz. */
    @editable("number", { unit: { quantity: "Frequency", unit: "rpm" } })
    public get operating_rpm(): number {
        return this._operatingRpm;
    }
    public set operating_rpm(v: number) {
        const next = Math.max(0, v);
        this.setField("operating_rpm", this._operatingRpm, next, (n) => {
            this._operatingRpm = n;
        });
    }

    /** Declared shaft power (kW). 0 = unknown; below 15 kW refuses (out of ISO scope). */
    @editable("number", { unit: { quantity: "Power", unit: "kwatt" } })
    public get power_kw(): number {
        return this._powerKw;
    }
    public set power_kw(v: number) {
        const next = Math.max(0, v);
        this.setField("power_kw", this._powerKw, next, (n) => {
            this._powerKw = n;
        });
    }

    /** Zone index of the last assessment (A=0..D=3, refused=-1). */
    @viewable("number")
    public get last_zone(): number {
        return this._lastZone;
    }

    /** Broadband velocity RMS (mm/s) of the last assessment. */
    @viewable("number")
    public get last_rms(): number {
        return this._lastRms;
    }

    /**
     * Assess one signal tensor. Reads its `unit` tag + `data`, applies the
     * configured machine metadata, and returns the ISO verdict. Pure w.r.t. the
     * session (no publish): the directly-testable core of `fire`.
     */
    public assess(tensor: ITensor): IIsoVerdict {
        return assessSeverity(tensor.data, tensor.unit, {
            group: (this._machineGroup >= 1.5 ? 2 : 1) as MachineGroup,
            support: (this._flexibleSupport ? "flexible" : "rigid") as SupportType,
            rpm: this._operatingRpm > 0 ? this._operatingRpm : undefined,
            powerKw: this._powerKw > 0 ? this._powerKw : undefined,
        });
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            if (inSlotOf(link) !== "signal") continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                const t = tensorOf(session.consume(idx));
                if (t === null) continue;
                const v = this.assess(t);
                const rms = v.status === "assessed" ? (v.rmsVelocityMmS as number) : -1;
                const zi = zoneIndex(v);
                this._publishOn(session, "assessment", v);
                this._publishOn(session, "rms_mm_s", rms);
                this._publishOn(session, "zone", zi);
                this.setField("last_zone", this._lastZone, zi, (n) => {
                    this._lastZone = n;
                });
                this.setField("last_rms", this._lastRms, rms, (n) => {
                    this._lastRms = n;
                });
            }
        }
    }

    private _publishOn(session: ISession, slot: string, value: unknown): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== slot || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, value);
        }
    }
}

/** Lenient tensor reader: accepts a canonical ITensor (numeric `data`) so a
 *  stray token cannot corrupt the assessment. */
function tensorOf(raw: unknown): Nullable<ITensor> {
    if (raw === null || raw === undefined) return null;
    const t = raw as ITensor;
    if (t.data && (ArrayBuffer.isView(t.data) || Array.isArray(t.data))) return t;
    return null;
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createIso20816SeverityNode(): Iso20816SeverityNode {
    return new Iso20816SeverityNode();
}

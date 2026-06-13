import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Space Vector PWM modulator, averaged (no switching ripple). Faithful
 * port of the legacy `sensors` SvpwmModulator, the validation oracle.
 *
 * Maps the stator voltage reference (V_alpha, V_beta) produced by the FOC
 * into three duty cycles (duty_a, duty_b, duty_c) in [minDuty, maxDuty],
 * which the inverter turns back into line-neutral phase voltages.
 *
 * Algorithm (min-max zero-sequence injection, equivalent to the standard
 * 7-segment SVPWM in the averaged sense):
 *
 *   1. Inverse Clarke: (V_alpha, V_beta) -> (v_a, v_b, v_c) phase refs.
 *   2. Saturation: if |V_ref| > v_bus / sqrt(3), scale the reference down
 *      to that circle (the linear-modulation boundary).
 *   3. Zero-sequence injection: v_zero = -(max + min) / 2. Adding v_zero
 *      to all three references centers the duties around 0.5 and extends
 *      the linear range to v_bus / sqrt(3).
 *   4. Duty cycles: duty_k = 0.5 + (v_k + v_zero) / v_bus, clamped.
 *
 * Round-trip property (the validation invariant): averaged over a PWM
 * cycle, the inverter recovers (V_alpha, V_beta) exactly when |V_ref| <=
 * v_bus / sqrt(3), regardless of the zero-sequence injection, because the
 * zero-sequence content is common-mode and cancels through the line-
 * neutral reference.
 *
 * Stateless: each fire reads inputs and computes duties; no integration,
 * no allocation in the hot path. Decomposition C: the FOC, this modulator
 * and the inverter are separate nodes.
 */
export class PmsmSvpwmNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _pwmFrequencyHz: number = 20000;
    @cloneable private _minDuty: number = 0;
    @cloneable private _maxDuty: number = 1;
    @cloneable private _vBus: number = 24;

    @cloneable private _dutyA: number = 0.5;
    @cloneable private _dutyB: number = 0.5;
    @cloneable private _dutyC: number = 0.5;
    @cloneable private _saturated: boolean = false;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "V_alpha", optional: true, type: "float" },
        { slot: "V_beta", optional: true, type: "float" },
        { slot: "v_bus", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "duty_a", optional: false, type: "float" },
        { slot: "duty_b", optional: false, type: "float" },
        { slot: "duty_c", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
    @editable("number", { unit: "Hz" }) public get pwmFrequencyHz(): number {
        return this._pwmFrequencyHz;
    }
    public set pwmFrequencyHz(v: number) {
        this.setField("pwmFrequencyHz", this._pwmFrequencyHz, v, (n) => (this._pwmFrequencyHz = n));
    }
    @editable("number") public get minDuty(): number {
        return this._minDuty;
    }
    public set minDuty(v: number) {
        this.setField("minDuty", this._minDuty, v, (n) => (this._minDuty = n));
    }
    @editable("number") public get maxDuty(): number {
        return this._maxDuty;
    }
    public set maxDuty(v: number) {
        this.setField("maxDuty", this._maxDuty, v, (n) => (this._maxDuty = n));
    }
    @editable("number", { unit: "V" }) public get vBus(): number {
        return this._vBus;
    }
    public set vBus(v: number) {
        this.setField("vBus", this._vBus, v, (n) => (this._vBus = n));
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number") public get duty_a(): number {
        return this._dutyA;
    }
    @viewable("number") public get duty_b(): number {
        return this._dutyB;
    }
    @viewable("number") public get duty_c(): number {
        return this._dutyC;
    }
    @viewable("boolean") public get saturated(): boolean {
        return this._saturated;
    }

    public override reset(_session: ISession): void {
        this._dutyA = 0.5;
        this._dutyB = 0.5;
        this._dutyC = 0.5;
        this._saturated = false;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let vAlpha = 0,
            vBeta = 0,
            vBus = this._vBus;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "V_alpha") vAlpha = value;
            else if (slot === "V_beta") vBeta = value;
            else if (slot === "v_bus") vBus = value;
        }

        this._modulate(vAlpha, vBeta, vBus);

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "duty_a":
                    session.publish(idx, this._dutyA);
                    break;
                case "duty_b":
                    session.publish(idx, this._dutyB);
                    break;
                case "duty_c":
                    session.publish(idx, this._dutyC);
                    break;
            }
        }
    }

    // Numerically identical to the legacy SvpwmModulator.advance().
    private _modulate(vAlpha: number, vBeta: number, vBus: number): void {
        if (vBus <= 0) {
            this._dutyA = 0.5;
            this._dutyB = 0.5;
            this._dutyC = 0.5;
            this._saturated = false;
            return;
        }

        // Step 1: inverse Clarke to line-neutral phase references.
        const half = 0.5;
        const sqrt3Over2 = 0.5 * Math.sqrt(3);
        let vA = vAlpha;
        let vB = -half * vAlpha + sqrt3Over2 * vBeta;
        let vC = -half * vAlpha - sqrt3Over2 * vBeta;

        // Step 2: saturation in the alpha-beta plane.
        const vMagSq = vAlpha * vAlpha + vBeta * vBeta;
        const vMax = vBus / Math.sqrt(3);
        if (vMagSq > vMax * vMax) {
            const scale = vMax / Math.sqrt(vMagSq);
            vA *= scale;
            vB *= scale;
            vC *= scale;
            this._saturated = true;
        } else {
            this._saturated = false;
        }

        // Step 3: zero-sequence (min-max) injection.
        const vMaxLN = Math.max(vA, vB, vC);
        const vMinLN = Math.min(vA, vB, vC);
        const vZero = -0.5 * (vMaxLN + vMinLN);

        // Step 4: duty cycles.
        this._dutyA = clamp(0.5 + (vA + vZero) / vBus, this._minDuty, this._maxDuty);
        this._dutyB = clamp(0.5 + (vB + vZero) / vBus, this._minDuty, this._maxDuty);
        this._dutyC = clamp(0.5 + (vC + vZero) / vBus, this._minDuty, this._maxDuty);
    }
}

function clamp(x: number, lo: number, hi: number): number {
    return x < lo ? lo : x > hi ? hi : x;
}

export function createPmsmSvpwmNode(): PmsmSvpwmNode {
    return new PmsmSvpwmNode();
}

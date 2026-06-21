import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Space Vector PWM modulator, averaged (no switching ripple). Faithful
 * port of the legacy `sensors` SvpwmModulator, the validation oracle.
 *
 * Maps the stator voltage reference (voltageAlpha, voltageBeta) produced by the FOC
 * into three dutyCycle cycles (dutyCycleA, dutyCycleB, dutyCycleC) in [minDutyCycle, maxDutyCycle],
 * which the inverter turns back into line-neutral phase voltages.
 *
 * Algorithm (min-max zero-sequence injection, equivalent to the standard
 * 7-segment SVPWM in the averaged sense):
 *
 *   1. Inverse Clarke: (voltageAlpha, voltageBeta) -> (phaseVoltageA, phaseVoltageB, phaseVoltageC) phase refs.
 *   2. Saturation: if |V_ref| > dcBusVoltage / sqrt(3), scale the reference down
 *      to that circle (the linear-modulation boundary).
 *   3. Zero-sequence injection: v_zero = -(max + min) / 2. Adding v_zero
 *      to all three references centers the duties around 0.5 and extends
 *      the linear range to dcBusVoltage / sqrt(3).
 *   4. Duty cycles: duty_k = 0.5 + (v_k + v_zero) / dcBusVoltage, clamped.
 *
 * Round-trip property (the validation invariant): averaged over a PWM
 * cycle, the inverter recovers (voltageAlpha, voltageBeta) exactly when |V_ref| <=
 * dcBusVoltage / sqrt(3), regardless of the zero-sequence injection, because the
 * zero-sequence content is common-mode and cancels through the line-
 * neutral reference.
 *
 * Stateless: each fire reads inputs and computes duties; no integration,
 * no allocation in the hot path. Decomposition C: the FOC, this modulator
 * and the inverter are separate nodes.
 */
export class PmsmSvpwmNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _pwmFrequencyHz: number = 20000;
    @cloneable private _minDutyCycle: number = 0;
    @cloneable private _maxDutyCycle: number = 1;
    @cloneable private _dcBusVoltage: number = 24;

    @cloneable private _dutyA: number = 0.5;
    @cloneable private _dutyB: number = 0.5;
    @cloneable private _dutyC: number = 0.5;
    @cloneable private _saturated: boolean = false;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "voltageAlpha", optional: true, type: "float" },
        { slot: "voltageBeta", optional: true, type: "float" },
        { slot: "dcBusVoltage", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "dutyCycleA", optional: false, type: "float" },
        { slot: "dutyCycleB", optional: false, type: "float" },
        { slot: "dutyCycleC", optional: false, type: "float" },
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
    @editable("number") public get minDutyCycle(): number {
        return this._minDutyCycle;
    }
    public set minDutyCycle(v: number) {
        this.setField("minDutyCycle", this._minDutyCycle, v, (n) => (this._minDutyCycle = n));
    }
    @editable("number") public get maxDutyCycle(): number {
        return this._maxDutyCycle;
    }
    public set maxDutyCycle(v: number) {
        this.setField("maxDutyCycle", this._maxDutyCycle, v, (n) => (this._maxDutyCycle = n));
    }
    @editable("number", { unit: "V" }) public get dcBusVoltage(): number {
        return this._dcBusVoltage;
    }
    public set dcBusVoltage(v: number) {
        this.setField("dcBusVoltage", this._dcBusVoltage, v, (n) => (this._dcBusVoltage = n));
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number") public get dutyCycleA(): number {
        return this._dutyA;
    }
    @viewable("number") public get dutyCycleB(): number {
        return this._dutyB;
    }
    @viewable("number") public get dutyCycleC(): number {
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
            dcBusVoltage = this._dcBusVoltage;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "voltageAlpha") vAlpha = value;
            else if (slot === "voltageBeta") vBeta = value;
            else if (slot === "dcBusVoltage") dcBusVoltage = value;
        }

        this._modulate(vAlpha, vBeta, dcBusVoltage);

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "dutyCycleA":
                    session.publish(idx, this._dutyA);
                    break;
                case "dutyCycleB":
                    session.publish(idx, this._dutyB);
                    break;
                case "dutyCycleC":
                    session.publish(idx, this._dutyC);
                    break;
            }
        }
    }

    // Numerically identical to the legacy SvpwmModulator.advance().
    private _modulate(vAlpha: number, vBeta: number, dcBusVoltage: number): void {
        if (dcBusVoltage <= 0) {
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
        const vMax = dcBusVoltage / Math.sqrt(3);
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

        // Step 4: dutyCycle cycles.
        this._dutyA = clamp(0.5 + (vA + vZero) / dcBusVoltage, this._minDutyCycle, this._maxDutyCycle);
        this._dutyB = clamp(0.5 + (vB + vZero) / dcBusVoltage, this._minDutyCycle, this._maxDutyCycle);
        this._dutyC = clamp(0.5 + (vC + vZero) / dcBusVoltage, this._minDutyCycle, this._maxDutyCycle);
    }
}

function clamp(x: number, lo: number, hi: number): number {
    return x < lo ? lo : x > hi ? hi : x;
}

export function createPmsmSvpwmNode(): PmsmSvpwmNode {
    return new PmsmSvpwmNode();
}

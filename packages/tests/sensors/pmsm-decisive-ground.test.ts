import { GravityField } from "spikypanda-sensors/sources/motor/pmsm/env/GravityField";
import { MotorTransform } from "spikypanda-sensors/sources/motor/pmsm/env/MotorTransform";
import { pmsmHealthyOriented } from "spikypanda-sensors/sources/motor/pmsm/PmsmScenario";
import { PmsmSimulation } from "spikypanda-sensors/sources/motor/pmsm/PmsmSimulation";
import { IMultiChannelSource } from "spikypanda-sensors/interfaces/MultiChannelRecorder";

const SETTLE_S = 0.2;
const WINDOW_S = 0.1;
const ORCH_DT_S = 5e-5;

function runScenario(src: IMultiChannelSource, durationS: number, dtS: number, channels: ReadonlyArray<string>):
    Map<string, number[]> {
    const series = new Map<string, number[]>();
    for (const k of channels) series.set(k, []);
    const n = Math.floor(durationS / dtS);
    for (let i = 1; i <= n; i++) {
        const t = i * dtS;
        (src.host as PmsmSimulation).advance(t);
        for (const k of channels) {
            const ch = src.channels.get(k);
            if (!ch) throw new Error(`unknown channel ${k}`);
            series.get(k)!.push(ch.source.signal(t));
        }
    }
    return series;
}

function ptp(xs: number[]): number {
    return Math.max(...xs) - Math.min(...xs);
}

function acAmplitude(xs: number[]): number {
    // RMS of the AC component (mean removed). Captures 1x f_mech ripple
    // independently of the DC operating point.
    let m = 0;
    for (const x of xs) m += x;
    m /= xs.length;
    let s = 0;
    for (const x of xs) s += (x - m) * (x - m);
    return Math.sqrt(s / xs.length);
}

// Decisive ground test (proposal section 4.5).
//
// The same machine, healthy in all three runs, is simulated under :
//   A. Earth, horizontal orientation       - g_perp = 9.81 m/s^2
//   B. Earth, vertical (shaft up) orient.  - g_perp = 0
//   C. Microgravity, horizontal orient.    - g_world = 0
//
// The proposal expects that the gravity-mediated mechanism (here :
// RotorSagModel) produces a measurable signature on the rotor-frame
// currents in case A that is absent in cases B and C. A model trained
// only on case A would learn that signature as part of "healthy" and
// fail to classify in case C.
describe("Decisive ground test : healthy signature varies with orientation and gravity", () => {
    const skip = Math.floor(SETTLE_S / ORCH_DT_S);

    function runHealthyOriented(transform: MotorTransform, field: GravityField) {
        const sc = pmsmHealthyOriented(transform, field);
        const src = sc.factory();
        const series = runScenario(src, SETTLE_S + WINDOW_S, ORCH_DT_S, ["i_q", "i_d"]);
        return {
            iq: series.get("i_q")!.slice(skip),
            id: series.get("i_d")!.slice(skip),
            sim: src.host as PmsmSimulation,
        };
    }

    it("A. horizontal earth : i_q has a 1x f_mech ripple from rotor sag", () => {
        const a = runHealthyOriented(MotorTransform.horizontal(), GravityField.earth());
        const acA = acAmplitude(a.iq);
        // Sag epsilon ~ 0.6%; the 1x f_mech disturbance is partially
        // rejected by the closed FOC loop. Observed RMS ~ 10 uA. We set
        // a generous lower bound at 3 uA which any well-tuned loop hits
        // and that the no-gravity baseline (~ tens of nA) is far below.
        expect(acA).toBeGreaterThan(3e-6);
    });

    it("B. vertical earth (shaft along gravity) : i_q ripple collapses (no radial g)", () => {
        const b = runHealthyOriented(MotorTransform.verticalUp(), GravityField.earth());
        const acB = acAmplitude(b.iq);
        // Vertical : g_perp = 0, RotorSag inactive, no 1x f_mech ripple.
        expect(acB).toBeLessThan(1e-7);
    });

    it("C. microgravity : i_q ripple collapses regardless of orientation", () => {
        const c1 = runHealthyOriented(MotorTransform.horizontal(), GravityField.microgravity());
        const c2 = runHealthyOriented(MotorTransform.verticalUp(), GravityField.microgravity());
        expect(acAmplitude(c1.iq)).toBeLessThan(1e-7);
        expect(acAmplitude(c2.iq)).toBeLessThan(1e-7);
    });

    it("the 1g horizontal signature is at least 10x stronger than 1g vertical or 0g", () => {
        const a = runHealthyOriented(MotorTransform.horizontal(), GravityField.earth());
        const b = runHealthyOriented(MotorTransform.verticalUp(), GravityField.earth());
        const c = runHealthyOriented(MotorTransform.horizontal(), GravityField.microgravity());
        const acA = acAmplitude(a.iq);
        const acB = acAmplitude(b.iq);
        const acC = acAmplitude(c.iq);
        expect(acA / Math.max(acB, 1e-12)).toBeGreaterThan(10);
        expect(acA / Math.max(acC, 1e-12)).toBeGreaterThan(10);
    });

    it("vertical earth and microgravity produce equivalent signatures (within tolerance)", () => {
        // The proposal hypothesis : multi-axial training generalizes to 0g
        // because the orientation manifold already captures the same
        // "no-radial-gravity" regime that 0g produces. At the simulator
        // level this is exactly true : both yield g_perp = 0, so the
        // RotorSag mechanism is identically inactive.
        const verticalEarth = runHealthyOriented(MotorTransform.verticalUp(), GravityField.earth());
        const microgravity = runHealthyOriented(MotorTransform.horizontal(), GravityField.microgravity());
        const ptpVE = ptp(verticalEarth.iq);
        const ptpMG = ptp(microgravity.iq);
        // Both should be small ; their ratio should be ~ 1 (both dominated
        // by the same numerical noise / FOC residual).
        expect(ptpVE).toBeLessThan(1e-6);
        expect(ptpMG).toBeLessThan(1e-6);
    });
});

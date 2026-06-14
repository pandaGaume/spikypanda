// Physics-plugin current engine for the DC current sample.
//
// Replaces the removed @spiky-panda/sensors library: the live current signal
// is now produced by an UNDERLYING PHYSICS GRAPH, built with the runtime
// (RuntimeGraphBuilder + Session) and the physics plugin, and ticked at the
// sensor sample rate. The chain is:
//
//   ConstSource(V) -----> DC steady motor .V        (base operating-point current)
//   ConstSource(tau) ---> DC steady motor .tau_load
//   motor.i -> Fault:modulator (commutation ripple)
//           -> Fault:modulator (PWM chopper, if duty < 1)
//           -> Fault:modulator (gravity eccentricity, if enabled)
//           -> Fault:modulator (one per enabled user fault)
//           -> Current Sensor .i  (noise + quantization) -> i_measured
//
// Each Fault:modulator adds amplitude*sin(2*pi*freq*t + phase) onto its
// signal_in, the same additive-on-top model the legacy demo used; here the
// nodes are the ported Physics.Mechanical.Fault:modulator +
// Physics.Electric.Motor.DC:steady + currentSensor. All run in a plain
// dynamic Session (the steady motor is algebraic and the modulators are
// Euler-in-fire, so no IIntegrable solver is needed).
//
// Globals: window.SpikypandaCore (RuntimeGraphBuilder, Session, RuntimeNode)
// and window.SpkPluginPhysics (node factories), loaded by <script> before
// this module.

const C = window.SpikypandaCore;
const P = window.SpkPluginPhysics;
if (!C || !P) {
    throw new Error("graph-engine: SpikypandaCore and SpkPluginPhysics bundles must be loaded first.");
}

// ── Sensors-compat shim: the pure UI utilities the page still uses ──────
export const MotorFaultType = Object.freeze({
    MISALIGNMENT: 0,
    BEARING_DEFECT: 1,
    BROKEN_BAR: 2,
    ECCENTRICITY: 3,
    BRUSH_FAULT: 4,
});
const FAULT_LABELS = ["Misalignment", "Bearing defect", "Broken rotor bar", "Eccentricity", "Brush fault"];
export function motorFaultLabel(type) {
    return FAULT_LABELS[type] || "Fault " + type;
}
export function makeMotorFault(params) {
    return Object.assign({ severity: 0.5 }, params, { displayName: motorFaultLabel(params.type) });
}
export function contiguousBrokenBars(total, n) {
    const out = [];
    for (let i = 0; i < Math.min(n, total); i++) out.push(i);
    return out;
}
export function evenlyDistributedBrokenBars(total, n) {
    if (n <= 0 || total <= 0) return [];
    const out = [];
    for (let i = 0; i < n; i++) out.push(Math.round((i * total) / n) % total);
    return Array.from(new Set(out));
}
export const compat = { MotorFaultType, motorFaultLabel, makeMotorFault, contiguousBrokenBars, evenlyDistributedBrokenBars };

// ── Underlying physics graph engine ─────────────────────────────────────
class ConstSource extends C.RuntimeNode {
    constructor(v) {
        super();
        this._v = v;
    }
    isReady() {
        return this.enabled;
    }
    fire(session) {
        const links = session.graph.links;
        for (const link of this.onsc()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, this._v);
        }
    }
}

// Map a fault config to a (freqHz, amplitude) sinusoidal current signature,
// derived from the motor speed + commutator geometry. Approximation of the
// legacy MotorFaultSource sufficient for the live-spectrum demo.
function faultModulation(cfg, motor) {
    const rps = motor.motorSpeedRps;
    const B = motor.commutatorBars || 1;
    const nom = motor.nominalCurrent || 1;
    const sev = Math.max(0, Math.min(1, cfg.severity != null ? cfg.severity : 0.5));
    switch (cfg.type) {
        case MotorFaultType.MISALIGNMENT:
            return { freqHz: rps, amplitude: sev * 0.12 * nom };
        case MotorFaultType.BEARING_DEFECT:
            return { freqHz: 3.6 * rps, amplitude: sev * 0.06 * nom };
        case MotorFaultType.BROKEN_BAR: {
            const frac = cfg.totalBars ? (cfg.brokenIndices || []).length / cfg.totalBars : sev;
            return { freqHz: B * rps, amplitude: (0.3 + 0.7 * sev) * frac * 0.5 * nom };
        }
        case MotorFaultType.ECCENTRICITY:
            return { freqHz: 2 * rps, amplitude: sev * 0.08 * nom };
        case MotorFaultType.BRUSH_FAULT:
            return { freqHz: B * rps, amplitude: sev * 0.1 * nom };
        default:
            return { freqHz: rps, amplitude: sev * 0.1 * nom };
    }
}

export function createCurrentEngine(motor, sensor, faults) {
    const builder = new C.RuntimeGraphBuilder().withMode("dynamic");

    // Base current: DC steady motor at the operating point. tau_load is set so
    // the steady torque balance yields ~ the preset nominal current.
    const motorNode = P.createDcMotorSteadyNode();
    const Ke = motor.backEmfConstant;
    motorNode.R = motor.resistance;
    motorNode.Ke = Ke;
    motorNode.Kt = Ke; // SI: Kt = Ke for a DC machine
    motorNode.b = 1e-4;
    const V = motor.supplyVoltage * (motor.pwmDutyCycle != null ? motor.pwmDutyCycle : 1);
    const tau = Ke * (motor.nominalCurrent || 0) * (motor.loadFactor != null ? motor.loadFactor : 1);
    const vSrc = new ConstSource(V);
    const tauSrc = new ConstSource(tau);

    const rps = motor.motorSpeedRps;
    const B = motor.commutatorBars || 1;
    const nom = motor.nominalCurrent || 1;

    const mods = [];
    const addMod = (freqHz, amplitude, phase) => {
        if (!(amplitude > 0)) return;
        const m = P.createFaultModulatorNode();
        m.freqHz = freqHz;
        m.amplitude = amplitude;
        m.phase = phase || 0;
        mods.push(m);
    };
    addMod(B * rps, (motor.rippleFactor || 0) * nom, 0); // commutation ripple
    if (motor.pwmDutyCycle != null && motor.pwmDutyCycle < 1) {
        addMod(motor.pwmFrequencyHz || 10000, 0.03 * nom, 0); // PWM chopper
    }
    if (motor.gravityEnabled && motor.bearingRadialStiffness && motor.airGap) {
        const delta = (motor.rotorMass * 9.80665) / motor.bearingRadialStiffness;
        addMod(rps, (nom * delta) / motor.airGap, 0); // gravity eccentricity (1x)
    }
    (faults || []).forEach((f) => {
        if (!f.enabled) return;
        const mod = faultModulation(f.cfg, motor);
        addMod(mod.freqHz, mod.amplitude, 0);
    });

    // Current sensor: noise + quantization. LPF bypassed (bandwidthHz=0) so the
    // result does not depend on session.dt. Bias/gain applied in JS below.
    const cs = P.createDcMotorCurrentSensorNode();
    cs.bandwidthHz = 0;
    cs.noiseStd = sensor.noiseStd || 0;
    cs.resolution = 0;
    cs.seed = sensor.rngSeed || 1;

    const nodes = [vSrc, tauSrc, motorNode, ...mods, cs];
    builder.withNodes(...nodes);
    builder.withChannel(vSrc, motorNode, "out", "V");
    builder.withChannel(tauSrc, motorNode, "out", "tau_load");
    let prev = motorNode;
    let slot = "i";
    for (const m of mods) {
        builder.withChannel(prev, m, slot, "signal_in");
        prev = m;
        slot = "signal_out";
    }
    builder.withChannel(prev, cs, slot, "i");

    const session = new C.Session(builder.build());
    for (const n of nodes) if (typeof n.reset === "function") n.reset(session);

    const gain = sensor.gain != null ? sensor.gain : 1;
    const bias = sensor.bias != null ? sensor.bias : 0;

    return {
        // Tick the graph to time t (seconds), return { value } = measured current.
        next(t) {
            session.run(t);
            return { value: cs.i_measured * gain + bias };
        },
        // The set operating speed the signatures are built around (the demo
        // treats motorSpeedRps as the commanded speed; the DC steady node
        // supplies the base current magnitude, not the displayed speed).
        get omega() {
            return 2 * Math.PI * motor.motorSpeedRps;
        },
        dispose() {},
    };
}

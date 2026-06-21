/**
 * SP1 end-to-end, fully headless: an R385 DC motor simulation drives a
 * MotorwatchDevice through three successive load regimes; the device
 * discovers each regime online (open-set clustering on ONNX embeddings
 * of steady-state current windows), raises NEW_REGIME to the central
 * station, which pushes a 3-cause diagnostic ONNX model AT RUNTIME,
 * labels the regimes and propagates the labels back to the device and
 * across sites (federated catalog merge).
 *
 * Harness choices (documented):
 *   - The motor (IIntegrable) is stepped manually with the
 *     RK4AdaptiveSolver (packages/tests/physics/motor-dc.test.ts
 *     pattern); loadTorque is driven DIRECTLY on a wrapper leaf rather
 *     than through LoadTorqueNode instances: the three profiles are
 *     two constants and one quadratic fan law read off motor.angularVelocity
 *     once per macro step (quasi-static, dt = 0.1 ms).
 *   - DECIMATION: the solver runs at 10 kHz (dt 1e-4, well under the
 *     electrical pole tau_e = armatureInductance/armatureResistance = 0.82 ms); the device is fed every
 *     10th sample, armatureCurrent.e. a 1 kHz current sensor.
 *   - Sensor noise: deterministic Gaussian (sigma 3 mA) added at
 *     sampling time. Same imperfection the DC current sensor node
 *     models, applied inline so the sim needs no signal-channel wiring.
 *   - COLD-START SEMANTIC (device contract): the first profile (k = 1)
 *     is the baseline and does NOT alarm; regimes 2 and 3 alarm exactly
 *     once each, so 3 regimes <=> k == 3 and 2 NEW_REGIME alarms.
 */
import { RK4AdaptiveSolver } from "spikypanda-core";
import type { IIntegrable, IIntegrationInputs, ISession } from "spikypanda-core";
import { DcMotorDynamicNode } from "spikypanda-plugin-physics";
import { sha256Hex } from "spikypanda-plugin-onnx";
import { CentralStation, InProcessDeviceServer, MotorwatchDevice, RegimeCatalog, mergeCatalogs } from "spikypanda-applications-motorwatch";
import type { IDeviceAlarm, IRegimeCurrentResult } from "spikypanda-applications-motorwatch";
import { ENCODER_DIM, buildDiagnosticBytes, buildEncoderBytes, makeGaussian } from "./helpers";

// ─── Simulation constants ───────────────────────────────────────────────────

/** R385 parameters (plugin defaults are NOT the R385). */
const R385 = { armatureResistance: 1.22, armatureInductance: 1e-3, torqueConstant: 8.22e-3, backEmfConstant: 8.22e-3, rotorInertia: 6e-7, viscousFriction: 1.03e-6 };

/** PWM-average armature voltage, held constant. */
const PWM_AVG_V = 7.0;

const DT = 1e-4; // 10 kHz solver macro step
const DECIMATION = 10; // -> 1 kHz current sensor
const NOISE_STD = 0.003; // 3 mA sensor noise

/** Regime schedule: low constant load, ~2.5x step, quadratic fan law. */
const T_REGIME2 = 1.2;
const T_REGIME3 = 2.4;
const T_TOTAL = 3.8;
const TAU_LOW = 2e-3; // Nm
const TAU_STEP = 5e-3; // Nm (2.5x)
const K_FAN = 1.5e-8; // Nm s^2 (tau = K_FAN angularVelocity^2)

const FRAME_SIZE = 64;

/** Diagnostic causes and their Gemm weights over the normalized 5-d
 *  embedding [band1, 2 band2, 3 band3, |slope|, 0.2] (row-major
 *  [ENCODER_DIM][3]): regime 2 scores "overload_step" with a wide
 *  margin, regime 3 scores "fan_quadratic". */
const CAUSES = ["overload_step", "fan_quadratic", "load_shed"];
// prettier-ignore
const DIAG_W = [
    0, 0, 2,
    2, 0, -2,
    -4, 4, -2,
    0, 0, 0,
    0, 0, 0,
];
const DIAG_B = [0, 0, 0];

// ─── Manual-solver harness (motor-dc.test.ts pattern) ───────────────────────

function emptySession(): ISession {
    return {
        graph: { links: [] },
        linkStates: [],
        consume: () => undefined,
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
}

/**
 * IIntegrable wrapper delegating to the motor's rhs with directly
 * driven armatureVoltage / loadTorque (no signal channels needed for a headless sim).
 */
class DrivenMotorLeaf implements IIntegrable {
    public readonly stateSize = 2;
    public readonly stateNames: ReadonlyArray<string> = ["armatureCurrent", "angularVelocity"];

    public armatureVoltage = 0;
    public tauLoad = 0;

    private readonly _motor: DcMotorDynamicNode;
    private readonly _inputs: IIntegrationInputs;

    public constructor(motor: DcMotorDynamicNode) {
        this._motor = motor;
        this._inputs = {
            get: (port: string) => (port === "armatureVoltage" ? this.armatureVoltage : port === "loadTorque" ? this.tauLoad : undefined),
            has: (port: string) => port === "armatureVoltage" || port === "loadTorque",
            sumPrefix: () => 0,
        };
    }

    /** The solver casts leaves to IRuntimeNode to snapshot channel
     *  inputs; an empty channel list keeps that path inert. */
    public opsc<T>(): T[] {
        return [];
    }

    public gatherState(y: Float64Array, offset: number): void {
        this._motor.gatherState(y, offset);
    }

    public writeState(y: Float64Array, offset: number): void {
        this._motor.writeState(y, offset);
    }

    public rhs(t: number, y: Float64Array, offset: number, _inputs: IIntegrationInputs, dydt: Float64Array): void {
        this._motor.rhs(t, y, offset, this._inputs, dydt);
    }
}

/** Simulate the R385 through the three regimes; returns the 1 kHz
 *  noisy current samples the edge sensor would deliver. */
function simulateR385Current(): number[] {
    const motor = new DcMotorDynamicNode();
    motor.armatureResistance = R385.armatureResistance;
    motor.armatureInductance = R385.armatureInductance;
    motor.torqueConstant = R385.torqueConstant;
    motor.backEmfConstant = R385.backEmfConstant;
    motor.rotorInertia = R385.rotorInertia;
    motor.viscousFriction = R385.viscousFriction;
    motor.reset(emptySession());

    const leaf = new DrivenMotorLeaf(motor);
    leaf.armatureVoltage = PWM_AVG_V;

    const solver = new RK4AdaptiveSolver({ tolerance: 1e-5, maxStep: DT });
    solver.initialize([leaf], 0);

    const session = emptySession();
    const gauss = makeGaussian(0x5b1ca);
    const samples: number[] = [];
    const steps = Math.round(T_TOTAL / DT);
    for (let k = 0; k < steps; k++) {
        const t = k * DT;
        leaf.tauLoad = t < T_REGIME2 ? TAU_LOW : t < T_REGIME3 ? TAU_STEP : K_FAN * motor.angularVelocity * motor.angularVelocity;
        solver.step(DT, session);
        if ((k + 1) % DECIMATION === 0) {
            samples.push(motor.armatureCurrent + NOISE_STD * gauss());
        }
    }
    return samples;
}

// ─── The end-to-end scenario ────────────────────────────────────────────────

describe("motorwatch R385 end-to-end (SP1)", () => {
    it("discovers 3 regimes, alarms twice, gets diagnosed + labeled at runtime, federates the labels", () => {
        // (a) Physics: three-regime R385 current trace.
        const samples = simulateR385Current();
        expect(samples.length).toBe(Math.round(T_TOTAL / DT / DECIMATION));

        // (viscousFriction) Edge device with the synthesized deterministic encoder.
        const device = new MotorwatchDevice({ frameSize: FRAME_SIZE, deviceId: "edge-r385" });
        const encoderBytes = buildEncoderBytes(FRAME_SIZE);
        const encoderReport = device.loadEncoder(encoderBytes, { sha256: sha256Hex(encoderBytes), name: "r385-encoder.onnx" });
        expect(encoderReport.ok).toBe(true);
        expect(encoderReport.inputNames).toEqual(["current_window"]);

        // Central station wired BEFORE the data flows, with the 3-cause
        // diagnostic bank registered for runtime push.
        const server = new InProcessDeviceServer(device);
        const station = new CentralStation("site-A");
        const diagBytes = buildDiagnosticBytes(ENCODER_DIM, CAUSES.length, DIAG_W, DIAG_B);
        station.registerDiagnostic("default", { bytes: diagBytes, sha256: sha256Hex(diagBytes), causes: CAUSES, name: "r385-diag.onnx" });
        station.connect(server);

        const alarms: IDeviceAlarm[] = [];
        device.onAlarm((alarm) => alarms.push(alarm));

        // (c) Stream the current trace through the device (1 sample per
        // tick at the 1 kHz sensor rate).
        device.feedSamples(samples);

        // ── Open-set discovery ────────────────────────────────────
        const status = device.status();
        expect(status.k).toBe(3); // 3 distinct regimes, no over-segmentation
        expect(status.windowsSeen).toBeGreaterThan(20); // the gate let plenty of steady windows through
        expect(status.state).toBe("steady");

        // Cold start suppressed, then exactly one alarm per discovery.
        expect(alarms).toHaveLength(2);
        expect(alarms[0].detail.k).toBe(2);
        expect(alarms[1].detail.k).toBe(3);
        expect(alarms[0].detail.distance).toBeGreaterThan(0.05); // truly open-set: far from every centroid
        expect(alarms[1].detail.distance).toBeGreaterThan(0.05);
        expect(alarms[0].detail.centroid).toHaveLength(ENCODER_DIM);

        // ── Runtime diagnosis + labeling ──────────────────────────
        expect(station.history).toHaveLength(2);
        const [overload, fan] = station.history;
        expect(overload.error).toBeUndefined();
        expect(overload.diagnostic).toBeDefined();
        expect(overload.diagnostic!.margin).toBeGreaterThan(station.labelMargin);
        expect(overload.label).toBe("overload_step");
        expect(fan.label).toBe("fan_quadratic");
        expect(fan.fromCatalog).toBeUndefined(); // both went through the diagnostic path

        // The device referenced the labels locally: resolution is
        // on-device, no central round-trip.
        expect(device.labelCount).toBe(2);
        expect(device.labelFor(alarms[1].detail.centroid)!.label).toBe("fan_quadratic");
        const current = server.callTool("regime_current") as IRegimeCurrentResult;
        expect(current.label).toBe("fan_quadratic"); // still running the fan regime at the end
        expect(current.k).toBe(3);

        // Diagnostic bank really lives on the device now.
        expect(device.status().diagnostic).toMatchObject({ loaded: true, name: "r385-diag.onnx", causes: CAUSES });

        // ── Federation ────────────────────────────────────────────
        expect(station.catalog.size).toBe(2);

        // Export -> (JSON wire) -> import at a second site, which
        // re-applies the entries under its own site id.
        const exported = JSON.parse(JSON.stringify(station.catalog.export()));
        const reimported = RegimeCatalog.import(exported);
        expect(reimported.lookup(alarms[0].detail.centroid)!.label).toBe("overload_step");

        const siteB = new RegimeCatalog("site-B");
        for (const entry of reimported.entries) {
            siteB.applyLabel(entry.centroid, entry.label, entry.diagnosis, "site-B");
        }

        const merged = mergeCatalogs([station.catalog, siteB]);
        expect(merged.size).toBe(2); // duplicates merged, k respected
        const hit = merged.lookup(alarms[0].detail.centroid);
        expect(hit).not.toBeNull();
        expect(hit!.label).toBe("overload_step");
        expect(hit!.entry.count).toBe(2); // counts summed across sites
        expect(hit!.entry.site).toBe("site-A,site-B");
        expect(merged.lookup(alarms[1].detail.centroid)!.label).toBe("fan_quadratic");
    });
});

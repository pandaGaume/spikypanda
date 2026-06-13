/**
 * Physics.Environment.Gravity:* validation against the legacy sensors env
 * oracle (GravityField + MotorTransform + GravityVector + RotorSagModel +
 * BearingPreloadModel + MountingComplianceModel).
 *
 *   1. GravityVector node == legacy projection (g_body, radial/axial/angle)
 *      to 1e-9 across orientations.
 *   2. RotorSag node flux_envelope == legacy preStep envelope across a
 *      theta_m sweep; UMP force_y/z == legacy postStep; vanishes in
 *      microgravity / vertical shaft.
 *   3. BearingPreload node == legacy effective preloads.
 *   4. MountingCompliance node force == legacy m*g_body.
 */
import { Cartesian3, Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { GravityField } from "spikypanda-sensors/sources/motor/pmsm/env/GravityField";
import { MotorTransform } from "spikypanda-sensors/sources/motor/pmsm/env/MotorTransform";
import { GravityVector } from "spikypanda-sensors/sources/motor/pmsm/env/GravityVector";
import { RotorSagModel } from "spikypanda-sensors/sources/motor/pmsm/env/RotorSagModel";
import { BearingPreloadModel } from "spikypanda-sensors/sources/motor/pmsm/env/BearingPreloadModel";
import { MountingComplianceModel } from "spikypanda-sensors/sources/motor/pmsm/env/MountingComplianceModel";
import { SceneItem } from "../../dev/plugins/physics/src/scene/scene.item";
import {
    createGravityVectorNode,
    createRotorSagNode,
    createBearingPreloadNode,
    createMountingComplianceNode,
    RotorSagNode,
} from "../../dev/plugins/physics/src/environment/gravity/index";

const DT = 1e-3;

class FuncSource extends RuntimeNode {
    public constructor(private readonly _f: (t: number) => unknown) {
        super();
    }
    public override isReady(_s: ISession): boolean {
        return this.enabled;
    }
    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, this._f(t));
        }
    }
}

// Build a session that drives `node` from constant FuncSources (one per
// input slot) and run it one tick.
function runNode(node: RuntimeNode, inputs: Record<string, number>): void {
    const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
    const srcs: FuncSource[] = [];
    const slots: string[] = [];
    for (const slot of Object.keys(inputs)) {
        const s = new FuncSource(() => inputs[slot]);
        srcs.push(s);
        slots.push(slot);
    }
    builder.withNodes(node, ...srcs);
    for (let i = 0; i < srcs.length; i++) builder.withChannel(srcs[i], node, "out", slots[i]);
    const session = new Session(builder.build());
    node.reset(session);
    session.run(0);
    session.run(DT);
}

function legacyGravity(g: { x: number; y: number; z: number }, yaw: number, pitch: number, roll: number): GravityVector {
    const field = GravityField.custom(new Cartesian3(g.x, g.y, g.z));
    const gv = new GravityVector(field, MotorTransform.fromEulerZyx(yaw, pitch, roll));
    gv.advance(0);
    return gv;
}

// Minimal scene resolver: no wired publisher sources.
function noResolver() {
    return {
        resolveNumberSource: () => null,
        resolveCartesian3Source: () => null,
        resolveQuaternionSource: () => null,
        aggregateEffectiveHz: () => 60,
        resolveAtmosphere: () => null,
    };
}

// Body -> world 4x4 (column-major) from the legacy 3x3 (row-major rows).
function localFromTransform(tf: MotorTransform): number[] {
    const R = tf.bodyToWorldMatrix();
    return [R[0][0], R[1][0], R[2][0], 0, R[0][1], R[1][1], R[2][1], 0, R[0][2], R[1][2], R[2][2], 0, 0, 0, 0, 1];
}

describe("GravityVector node == legacy projection (scene gravity + transform orientation)", () => {
    const cases: Array<[string, { x: number; y: number; z: number }, number, number, number]> = [
        ["horizontal earth", { x: 0, y: 0, z: -9.80665 }, 0, 0, 0],
        ["vertical up", { x: 0, y: 0, z: -9.80665 }, 0, -Math.PI / 2, 0],
        ["vertical down", { x: 0, y: 0, z: -9.80665 }, 0, Math.PI / 2, 0],
        ["arbitrary euler", { x: 1.5, y: -3.2, z: -9.0 }, 0.7, -0.4, 1.1],
    ];
    it.each(cases)("%s", (_name, g, yaw, pitch, roll) => {
        const tf = MotorTransform.fromEulerZyx(yaw, pitch, roll);
        const node = createGravityVectorNode();
        const local = localFromTransform(tf);

        // World gravity comes from the Scene; orientation from the local
        // transform wired in.
        const scene = new SceneItem();
        scene.gravity = new Cartesian3(g.x, g.y, g.z);
        const view = scene.buildStateView(noResolver());
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
        const sLocal = new FuncSource(() => local);
        builder.withNodes(node, sLocal).withChannel(sLocal, node, "out", "local");
        const session = new Session(builder.build());
        session.sceneStateView = view;
        node.reset(session);
        session.run(0);
        session.run(DT);

        const gv = legacyGravity(g, yaw, pitch, roll);
        const body = gv.motorFrameGravity();
        expect(Math.abs(node.g_x - body.x)).toBeLessThan(1e-9);
        expect(Math.abs(node.g_y - body.y)).toBeLessThan(1e-9);
        expect(Math.abs(node.g_z - body.z)).toBeLessThan(1e-9);
        expect(Math.abs(node.g_radial - gv.radialMagnitude())).toBeLessThan(1e-9);
        expect(Math.abs(node.g_axial - gv.axialMagnitude())).toBeLessThan(1e-9);
        if (gv.radialMagnitude() > 1e-9) {
            expect(Math.abs(node.g_angle - gv.radialAngle())).toBeLessThan(1e-9);
        }
    });
});

describe("RotorSag node == legacy oracle", () => {
    const cfg = { rotorMass: 0.0076, bearingRadialStiffness: 1e5, airGap: 5e-4 };

    function legacyEnvelope(sag: RotorSagModel, thetaM: number): number {
        let captured = 1;
        const machine = {
            thetaM,
            omegaM: 0,
            thetaE: 0,
            setPhaseResistance() {},
            setPhaseInductance() {},
            addFluxEnvelope(s: number) {
                captured = s;
            },
        };
        sag.preStep(0, machine);
        return captured;
    }

    it("flux_envelope matches legacy across a theta_m sweep (horizontal earth)", () => {
        const gv = legacyGravity({ x: 0, y: 0, z: -9.80665 }, 0, 0, 0);
        const sag = new RotorSagModel(cfg, gv);
        const gRadial = gv.radialMagnitude();
        const gAngle = gv.radialAngle();
        let maxErr = 0;
        for (let k = 0; k <= 32; k++) {
            const thetaM = (2 * Math.PI * k) / 32;
            const node: RotorSagNode = createRotorSagNode();
            node.rotorMass = cfg.rotorMass;
            node.bearingRadialStiffness = cfg.bearingRadialStiffness;
            node.airGap = cfg.airGap;
            runNode(node, { g_radial: gRadial, g_angle: gAngle, theta_m: thetaM });
            maxErr = Math.max(maxErr, Math.abs(node.flux_envelope - legacyEnvelope(sag, thetaM)));
        }
        expect(maxErr).toBeLessThan(1e-12);
        // sanity: a non-trivial modulation actually happened
        expect(new RotorSagModel(cfg, gv).currentEpsilon()).toBeGreaterThan(0);
    });

    it("UMP force_y / force_z match legacy postStep", () => {
        const gv = legacyGravity({ x: 0, y: 0, z: -9.80665 }, 0, 0, 0);
        const ump = 1e4;
        const sag = new RotorSagModel({ ...cfg, umpRadialStiffness: ump }, gv);
        const thetaM = 1.234;
        const forces = [0, 0, 0];
        const machine = { thetaM, omegaM: 0, thetaE: 0, setPhaseResistance() {}, setPhaseInductance() {}, addFluxEnvelope() {} };
        const housing = {
            addForce(axis: 0 | 1 | 2, f: number) {
                forces[axis] += f;
            },
        };
        sag.postStep(0, machine, housing);

        const node = createRotorSagNode();
        node.rotorMass = cfg.rotorMass;
        node.bearingRadialStiffness = cfg.bearingRadialStiffness;
        node.airGap = cfg.airGap;
        node.umpRadialStiffness = ump;
        runNode(node, { g_radial: gv.radialMagnitude(), g_angle: gv.radialAngle(), theta_m: thetaM });
        expect(Math.abs(node.force_y - forces[1])).toBeLessThan(1e-12);
        expect(Math.abs(node.force_z - forces[2])).toBeLessThan(1e-12);
    });

    it("envelope is unity in microgravity and along a vertical shaft", () => {
        const micro = createRotorSagNode();
        runNode(micro, { g_radial: 0, g_angle: 0, theta_m: 0.5 });
        expect(micro.flux_envelope).toBe(1);
        expect(micro.force_y).toBe(0);
        expect(micro.force_z).toBe(0);

        // vertical shaft: legacy GravityVector radialMagnitude == 0
        const gvVert = legacyGravity({ x: 0, y: 0, z: -9.80665 }, 0, -Math.PI / 2, 0);
        expect(gvVert.radialMagnitude()).toBeLessThan(1e-9);
    });
});

describe("BearingPreload node == legacy oracle", () => {
    it("effective preloads match legacy", () => {
        const gv = legacyGravity({ x: 1.5, y: -3.2, z: -9.0 }, 0.7, -0.4, 1.1);
        const cfg = { rotorMass: 0.0076, nominalAxialPreload: 5, nominalRadialPreload: 0.5 };
        const legacy = new BearingPreloadModel(cfg, gv);

        const node = createBearingPreloadNode();
        node.rotorMass = cfg.rotorMass;
        node.nominalAxialPreload = cfg.nominalAxialPreload;
        node.nominalRadialPreload = cfg.nominalRadialPreload;
        runNode(node, { g_axial: gv.motorFrameGravity().x, g_radial: gv.radialMagnitude() });
        expect(Math.abs(node.F_axial_eff - legacy.effectiveAxialPreload())).toBeLessThan(1e-12);
        expect(Math.abs(node.F_radial_eff - legacy.effectiveRadialPreload())).toBeLessThan(1e-12);
    });
});

describe("MountingCompliance node == legacy oracle", () => {
    it("static force matches legacy m*g_body", () => {
        const gv = legacyGravity({ x: 1.5, y: -3.2, z: -9.0 }, 0.7, -0.4, 1.1);
        const legacy = new MountingComplianceModel({ motorMass: 0.066 }, gv);
        const f = legacy.staticForce();
        const body = gv.motorFrameGravity();

        const node = createMountingComplianceNode();
        node.motorMass = 0.066;
        runNode(node, { g_x: body.x, g_y: body.y, g_z: body.z });
        expect(Math.abs(node.force_x - f.x)).toBeLessThan(1e-12);
        expect(Math.abs(node.force_y - f.y)).toBeLessThan(1e-12);
        expect(Math.abs(node.force_z - f.z)).toBeLessThan(1e-12);
    });
});

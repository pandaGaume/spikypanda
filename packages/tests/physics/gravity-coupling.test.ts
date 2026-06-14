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

// Body -> world 4x4 (column-major) for an intrinsic ZYX Euler rotation
// R = Rz(yaw) Ry(pitch) Rx(roll) (the legacy MotorTransform convention).
function eulerLocal(yaw: number, pitch: number, roll: number): number[] {
    const cz = Math.cos(yaw),
        sz = Math.sin(yaw);
    const cy = Math.cos(pitch),
        sy = Math.sin(pitch);
    const cx = Math.cos(roll),
        sx = Math.sin(roll);
    const r00 = cz * cy,
        r01 = cz * sy * sx - sz * cx,
        r02 = cz * sy * cx + sz * sx;
    const r10 = sz * cy,
        r11 = sz * sy * sx + cz * cx,
        r12 = sz * sy * cx - cz * sx;
    const r20 = -sy,
        r21 = cy * sx,
        r22 = cy * cx;
    return [r00, r10, r20, 0, r01, r11, r21, 0, r02, r12, r22, 0, 0, 0, 0, 1];
}

// Load a committed golden fixture (captured from the now-removed legacy oracle).
function loadFixture<T>(name: string): T {
    const fs = require("fs");
    const p = require("path").join(__dirname, "__fixtures__", name + ".json");
    return JSON.parse(fs.readFileSync(p, "utf8"));
}

interface GSample {
    x: number;
    y: number;
    z: number;
    radial: number;
    axial: number;
    angle: number;
}

// Body-frame gravity scalars: the legacy GravityVector projection captured
// as a golden fixture. Serves both as the GravityVector-node oracle and as
// the input values for the downstream gravity-coupling node tests.
function gravitySample(name: string, ..._ignored: unknown[]): GSample {
    return loadFixture<GSample>(name);
}

describe("GravityVector node == legacy projection (scene gravity + transform orientation)", () => {
    const cases: Array<[string, { x: number; y: number; z: number }, number, number, number]> = [
        ["horizontal earth", { x: 0, y: 0, z: -9.80665 }, 0, 0, 0],
        ["vertical up", { x: 0, y: 0, z: -9.80665 }, 0, -Math.PI / 2, 0],
        ["vertical down", { x: 0, y: 0, z: -9.80665 }, 0, Math.PI / 2, 0],
        ["arbitrary euler", { x: 1.5, y: -3.2, z: -9.0 }, 0.7, -0.4, 1.1],
    ];
    it.each(cases)("%s", (_name, g, yaw, pitch, roll) => {
        const node = createGravityVectorNode();
        const local = eulerLocal(yaw, pitch, roll);

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

        const s = gravitySample("grav-" + _name.replace(/\s+/g, "-"), g, yaw, pitch, roll);
        expect(Math.abs(node.g_x - s.x)).toBeLessThan(1e-9);
        expect(Math.abs(node.g_y - s.y)).toBeLessThan(1e-9);
        expect(Math.abs(node.g_z - s.z)).toBeLessThan(1e-9);
        expect(Math.abs(node.g_radial - s.radial)).toBeLessThan(1e-9);
        expect(Math.abs(node.g_axial - s.axial)).toBeLessThan(1e-9);
        if (s.radial > 1e-9) {
            expect(Math.abs(node.g_angle - s.angle)).toBeLessThan(1e-9);
        }
    });
});

describe("RotorSag node == legacy oracle", () => {
    const cfg = { rotorMass: 0.0076, bearingRadialStiffness: 1e5, airGap: 5e-4 };

    it("flux_envelope matches legacy across a theta_m sweep (horizontal earth)", () => {
        const s = gravitySample("grav-horizontal-earth", { x: 0, y: 0, z: -9.80665 }, 0, 0, 0);
        const gRadial = s.radial;
        const gAngle = s.angle;
        const oracle = loadFixture<number[]>("rotorsag-envelope");
        let maxErr = 0;
        for (let k = 0; k <= 32; k++) {
            const thetaM = (2 * Math.PI * k) / 32;
            const node: RotorSagNode = createRotorSagNode();
            node.rotorMass = cfg.rotorMass;
            node.bearingRadialStiffness = cfg.bearingRadialStiffness;
            node.airGap = cfg.airGap;
            runNode(node, { g_radial: gRadial, g_angle: gAngle, theta_m: thetaM });
            maxErr = Math.max(maxErr, Math.abs(node.flux_envelope - oracle[k]));
        }
        expect(maxErr).toBeLessThan(1e-12);
        // sanity: a non-trivial modulation actually happened
        expect((cfg.rotorMass * gRadial) / (cfg.bearingRadialStiffness * cfg.airGap)).toBeGreaterThan(0);
    });

    it("UMP force_y / force_z match legacy postStep", () => {
        const ump = 1e4;
        const thetaM = 1.234;
        const s = gravitySample("grav-horizontal-earth", { x: 0, y: 0, z: -9.80665 }, 0, 0, 0);
        const forces = loadFixture<[number, number]>("rotorsag-ump");

        const node = createRotorSagNode();
        node.rotorMass = cfg.rotorMass;
        node.bearingRadialStiffness = cfg.bearingRadialStiffness;
        node.airGap = cfg.airGap;
        node.umpRadialStiffness = ump;
        runNode(node, { g_radial: s.radial, g_angle: s.angle, theta_m: thetaM });
        expect(Math.abs(node.force_y - forces[0])).toBeLessThan(1e-12);
        expect(Math.abs(node.force_z - forces[1])).toBeLessThan(1e-12);
    });

    it("envelope is unity in microgravity and along a vertical shaft", () => {
        const micro = createRotorSagNode();
        runNode(micro, { g_radial: 0, g_angle: 0, theta_m: 0.5 });
        expect(micro.flux_envelope).toBe(1);
        expect(micro.force_y).toBe(0);
        expect(micro.force_z).toBe(0);

        // vertical shaft: the body-frame radial gravity component is 0.
        const sv = gravitySample("grav-vertical-up", { x: 0, y: 0, z: -9.80665 }, 0, -Math.PI / 2, 0);
        expect(sv.radial).toBeLessThan(1e-9);
    });
});

describe("BearingPreload node == legacy oracle", () => {
    it("effective preloads match legacy", () => {
        const cfg = { rotorMass: 0.0076, nominalAxialPreload: 5, nominalRadialPreload: 0.5 };
        const s = gravitySample("grav-arbitrary-euler", { x: 1.5, y: -3.2, z: -9.0 }, 0.7, -0.4, 1.1);
        const oracle = loadFixture<[number, number]>("bearing-preloads");

        const node = createBearingPreloadNode();
        node.rotorMass = cfg.rotorMass;
        node.nominalAxialPreload = cfg.nominalAxialPreload;
        node.nominalRadialPreload = cfg.nominalRadialPreload;
        runNode(node, { g_axial: s.x, g_radial: s.radial });
        expect(Math.abs(node.F_axial_eff - oracle[0])).toBeLessThan(1e-12);
        expect(Math.abs(node.F_radial_eff - oracle[1])).toBeLessThan(1e-12);
    });
});

describe("MountingCompliance node == legacy oracle", () => {
    it("static force matches legacy m*g_body", () => {
        const s = gravitySample("grav-arbitrary-euler", { x: 1.5, y: -3.2, z: -9.0 }, 0.7, -0.4, 1.1);
        const oracle = loadFixture<[number, number, number]>("mounting-forces");

        const node = createMountingComplianceNode();
        node.motorMass = 0.066;
        runNode(node, { g_x: s.x, g_y: s.y, g_z: s.z });
        expect(Math.abs(node.force_x - oracle[0])).toBeLessThan(1e-12);
        expect(Math.abs(node.force_y - oracle[1])).toBeLessThan(1e-12);
        expect(Math.abs(node.force_z - oracle[2])).toBeLessThan(1e-12);
    });
});

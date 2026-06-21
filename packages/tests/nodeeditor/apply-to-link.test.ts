/**
 * ApplyTo structural link in node-editor-v2 (Phase 4, Part B).
 *
 * A fault OPERATOR (RotorSag) carries a single `fault`-typed apply output. Drawn
 * onto a motor's variadic `fault_N` input, the editor must:
 *   1. ACCEPT the drop and DERIVE a "structural" link (not a data channel);
 *   2. BUILD it into the runtime as a core `ApplyTo` link, so the model's fire()
 *      drives `fault.applyTo(model, ctx)` and the fault applies its physics.
 *
 * The viewer is duck-typed (nodes / connections only), the session-builder
 * pattern from session-builder.test.ts — no DOM, no hand-rolled graph JSON.
 * The fault's effect is checked through the gravity-signature thesis: under
 * Earth the sag drives a flux modulation, under microgravity it vanishes.
 */
import { buildSessionFromViewer, disposeChannels } from "../../dev/nodeeditor/src/graph-session-builder";
import { deriveLinkKind } from "../../dev/nodeeditor/src/connection";
import { arePortTypesCompatible } from "../../dev/nodeeditor/src/types";
import type { GraphViewer } from "../../dev/nodeeditor/src/components/graph-viewer";
import { DcMotorDynamicNode } from "../../dev/plugins/physics/src/electric/motor-dc/index";
import { RotorSagFaultNode } from "../../dev/plugins/physics/src/mechanical/fault/rotor-sag.node";
import { createEarthSceneItem, createOrbitalSceneItem, SceneItem } from "../../dev/plugins/physics/src/scene/index";

interface FakePort {
    name: string;
    type: string;
}
function fakeNode(id: string, typeId: string, data: unknown, inputs: FakePort[], outputs: FakePort[]) {
    return { id, label: id, typeId, item: { data }, inputs, outputs, controlInputs: [] as FakePort[], controlOutputs: [] as FakePort[] };
}

/** Build a viewer: real motor + real rotor-sag fault + the REAL Scene node
 *  (Earth or Orbital preset), with a STRUCTURAL (fault.applyTo -> motor.fault_0)
 *  connection. The viewer object itself is duck-typed (nodes/connections), the
 *  session-builder.test.ts pattern; every NODE is a real instance. */
function buildViewer(scene: SceneItem): { viewer: GraphViewer; motor: DcMotorDynamicNode } {
    const motor = new DcMotorDynamicNode();
    motor.umpRadialStiffness = 4000;
    motor.initialRotorAngle = -Math.PI / 2; // align with the Earth sag direction (body -Z) -> cos(0)=1
    const sag = new RotorSagFaultNode();

    const sagOut: FakePort = { name: "applyTo", type: "fault" };
    const motorFault0: FakePort = { name: "fault_0", type: "any" };
    const motorUi = fakeNode("motor", "Physics.Electric.Motor.DC:dynamic", motor, [motorFault0], []);
    const sagUi = fakeNode("sag", "Physics.Mechanical.Fault:rotor-sag", sag, [], [sagOut]);
    // The real Scene node is the root scene: the session-builder binds its
    // buildStateView onto session.sceneStateView, which the motor reads.
    const sceneUi = fakeNode("scene", "Physics.Scene:earth", scene, [], []);

    const viewer = {
        nodes: [motorUi, sagUi, sceneUi],
        connections: [{ linkKind: deriveLinkKind(sagOut.type as never, motorFault0.type as never), from: sagOut, to: motorFault0 }],
    } as unknown as GraphViewer;
    return { viewer, motor };
}

describe("ApplyTo structural link (editable graph, Part B)", () => {
    test("the editor accepts a fault -> fault_N drop and derives a STRUCTURAL link", () => {
        // The fault apply output ("fault") connects to the model's "any" fault_N.
        expect(arePortTypesCompatible("fault", "any")).toBe(true);
        expect(deriveLinkKind("fault", "any")).toBe("structural");
        // A legacy descriptor fault (float output) stays an ordinary data channel.
        expect(deriveLinkKind("float", "any")).toBe("data");
        // A fault output cannot land on a typed data input.
        expect(arePortTypesCompatible("fault", "float")).toBe(false);
    });

    test("buildSessionFromViewer turns the structural connection into an ApplyTo link that drives the fault (Earth)", () => {
        const { viewer, motor } = buildViewer(createEarthSceneItem());
        const { session } = buildSessionFromViewer(viewer);
        session.run(0);
        // The sag read the motor's mass + the scene gravity and contributed an
        // air-gap eccentricity; the motor turned it into a flux modulation.
        const delta = (motor.rotorMass * 9.81) / motor.bearingRadialStiffness;
        expect(motor.fluxModulation).toBeCloseTo(delta / motor.airGap, 9);
        expect(Math.abs(motor.fluxModulation)).toBeGreaterThan(0);
    });

    test("the same editable graph produces NO fault signature in microgravity", () => {
        const { viewer, motor } = buildViewer(createOrbitalSceneItem());
        const { session } = buildSessionFromViewer(viewer);
        session.run(0);
        expect(motor.fluxModulation).toBe(0);
    });

    test("rebuilding the session (Play/Stop) does not accumulate duplicate ApplyTo links", () => {
        const { viewer, motor } = buildViewer(createEarthSceneItem());
        const expected = ((motor.rotorMass * 9.81) / motor.bearingRadialStiffness / motor.airGap) as number;
        for (let i = 0; i < 3; i++) {
            const { session, channels } = buildSessionFromViewer(viewer);
            session.run(0);
            // If a rebuild accumulated N ApplyTo links the eccentricity (and thus
            // the flux) would be N x; disposeChannels tears the prior link off the
            // nodes so it stays single-applied across Play/Stop cycles.
            expect(motor.fluxModulation).toBeCloseTo(expected, 9);
            disposeChannels(channels);
        }
    });
});

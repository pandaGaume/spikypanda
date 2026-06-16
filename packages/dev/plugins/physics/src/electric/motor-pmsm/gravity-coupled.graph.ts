/**
 * `Physics.Electric.Motor.PMSM:gravity-coupled` - a gravity-coupled PMSM
 * as a SPECIALIZED graph node.
 *
 * The gravity-coupled motor is not a leaf: it is an ASSEMBLY of existing
 * nodes (a FOC drive in closed loop with the dq machine, a gravity
 * payload on the shaft, a resonant housing fed by the machine's UMP
 * vibration). Like `OnnxModelGraph`, this is a declared specialized node
 * that inherits from graph: its interior is INSTANTIATED AT CONSTRUCTION,
 * so it is represented in a saved document JUST by its typeId (plus its
 * own @cloneable editables) and rebuilt by the factory on load. The
 * interior arrays stay non-@cloneable; nothing serializes the assembly
 * node-by-node. This is the opposite of a generic user-built
 * `Sim.Graph:graph`, whose interior is persisted as `subGraphJson`.
 *
 * It extends `SimGraphNode` (not a bare RuntimeGraph) to inherit the sim
 * layer the gravity study needs: live Scene inheritance
 * (InheritedSceneStateView, so an Earth->Orbital swap reaches the inner
 * machine with no rewire), multi-rate sub-stepping (the inner electrical
 * leaves advertise a high requiredHz; the container sub-steps K per
 * parent tick), and the "graph is a TransformNode" placement (its own
 * `local` / `world` ports).
 *
 * Placement (no Transform fan-out): the inner machine / payload / housing
 * leave `parent_world` UNWIRED and inherit this container's `world`
 * through the inherited Scene (TransformNode reads getScene().worldTransform
 * when parent_world is unwired). The body orientation that matters for
 * the gravity study (motor yaw vs gravity) enters through the container's
 * own `local` port, fed by a single external attitude->transform. There
 * is therefore no inner transform broadcasting one matrix to three ports
 * (the geometry Transform publishes to its first output only).
 *
 * Boundary contract (matches the palette registration):
 *   input  : `speed_target` -> foc.speed_target
 *   outputs: `i_q`, `omega`, `force_y`, `force_z` (machine),
 *            `accel_y`, `accel_z` (housing)
 *   native : `local` (placement) in, `world` out - handled by SimGraphNode.
 * The Scene is inherited from the enclosing session; no Scene node lives
 * inside, so headless drives with no bound Scene stay gravity-free.
 */
import { RuntimeGraphBuilder, SimGraphNode } from "spikypanda-core";
import type { IChannel, IRuntimeNode } from "spikypanda-core";
import { createPmsmFocNode, type PmsmFocNode } from "./foc.node.js";
import { createPmsmMachineDqNode } from "./machine-dq.node.js";
import { createGravityPayloadLoadNode } from "../../mechanical/load/gravity-payload.node.js";
import { createHousingMechanicsNode } from "../../mechanical/housing/housing-mechanics.node.js";

/** ECX-PRIME-class FOC tuning: 1 kHz current loop, 100 Hz speed loop,
 *  derived from the machine's R / L / lambda. Baked at construction so
 *  the motor ships pre-tuned; speed itself arrives live on speed_target. */
function configureFoc(foc: PmsmFocNode): void {
    const wI = 2 * Math.PI * 1000;
    const wW = 2 * Math.PI * 100;
    const kt = 1.5 * 1 * 2e-3;
    foc.P = 1;
    foc.currentKp = wI * 3e-4;
    foc.currentKi = wI * 2;
    foc.speedKp = (wW * 1e-6) / kt;
    foc.speedKi = (wW * 1e-7) / kt;
    foc.iMax = 5;
    foc.vMaxPerAxis = 12;
    foc.vBus = 24;
}

export class GravityCoupledPmsmGraph extends SimGraphNode {
    public constructor() {
        super();
        this._buildInterior();
    }

    /**
     * Instantiate and wire the fixed interior, then graft it onto this
     * graph. Cycles (FOC<->machine current/speed loop, payload<->machine
     * load torque) are broken with unit-delay channels so the dynamic
     * scheduler sees an acyclic graph; the consumer reads the previous
     * tick's value (Z^-1), the standard discrete-time closed-loop form.
     */
    private _buildInterior(): void {
        const foc = createPmsmFocNode();
        configureFoc(foc);
        const machine = createPmsmMachineDqNode();
        const payload = createGravityPayloadLoadNode();
        payload.payloadMass = 0.05;
        payload.armRadius = 0.01;
        const housing = createHousingMechanicsNode();

        const interior = new RuntimeGraphBuilder<IRuntimeNode, IChannel>()
            .withMode("dynamic")
            .withNodes(foc, machine, payload, housing)
            // Forward edges.
            .withChannel(foc, machine, "V_a")
            .withChannel(foc, machine, "V_b")
            .withChannel(foc, machine, "V_c")
            .withChannel(machine, payload, "theta_m")
            .withChannel(machine, housing, "force_y")
            .withChannel(machine, housing, "force_z")
            // Closed loops broken by a unit delay (Z^-1).
            .withDelayedChannel(machine, foc, "i_d", 0)
            .withDelayedChannel(machine, foc, "i_q", 0)
            .withDelayedChannel(machine, foc, "omega", 0)
            .withDelayedChannel(machine, foc, "theta_m", 0)
            .withDelayedChannel(payload, machine, "tau_load", 0)
            // Boundary ports (public names = inner slot names).
            .withInputPort(foc, "speed_target")
            .withOutputPort(machine, "i_q")
            .withOutputPort(machine, "omega")
            .withOutputPort(machine, "force_y")
            .withOutputPort(machine, "force_z")
            .withOutputPort(housing, "accel_y")
            .withOutputPort(housing, "accel_z")
            .build();

        this.adoptTopologyFrom(interior);
    }
}

/** Factory invoked by the sub-plugin registration. The interior is built
 *  by the constructor, so `registry.create(typeId)` alone reconstructs
 *  the whole assembly on load. */
export function createGravityCoupledPmsmGraph(): GravityCoupledPmsmGraph {
    return new GravityCoupledPmsmGraph();
}

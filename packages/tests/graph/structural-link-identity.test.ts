/**
 * Structural relations must be recognised across copies of core.
 *
 * A page can hold two copies of this module: the node editor bundles core
 * inline, the plugins externalise it to a global. A link built on one side is
 * then not an `instanceof` the class the other side holds, even though its
 * endpoints are correct and its ontology id is correct.
 *
 * The failure is silent, which is what makes it worth a test. A fault link
 * built by the editor was attached to the right nodes, carried
 * `type === "applyTo"`, and was skipped by the model's filter. Every fault went
 * inert, the motor ran at its no-load speed, and nothing was logged. It looked
 * like a healthy machine.
 *
 * The foreign classes below are the whole point: they stand in for the second
 * copy of core, and they must be accepted.
 */
import { ApplyTo, Child, FaultableNode, GraphOLink, isApplyToRelation, isChildRelation, type IFault, type IFaultContext } from "spikypanda-core";

/** What a second copy of core produces: same shape, same id, different class. */
class ForeignApplyTo extends GraphOLink {
    public constructor(fault: object, target: object) {
        super(fault as never, target as never);
        this.type = "applyTo";
    }
}
class ForeignChild extends GraphOLink {
    public constructor(parent: object, child: object) {
        super(parent as never, child as never);
        this.type = "child";
    }
}

class Model extends FaultableNode {
    public rotorMass = 0.013;
    public applied = 0;
    public readTau(): number {
        let tau = 0;
        this.forEachFault((target, value) => {
            if (target === "tau") tau += value;
        });
        return tau;
    }
}

class Fault extends FaultableNode implements IFault {
    public calls = 0;
    public applyTo(_target: object, ctx: IFaultContext): void {
        this.calls += 1;
        ctx.accumulate("tau", 0.25);
    }
}

describe("structural link identity", () => {
    it("recognises a relation by its ontology id, not by its class", () => {
        const model = new Model();
        const fault = new Fault();
        expect(isApplyToRelation(new ApplyTo(fault, model))).toBe(true);
        expect(isApplyToRelation(new ForeignApplyTo(fault, model))).toBe(true);
        expect(isChildRelation(new Child(model, fault))).toBe(true);
        expect(isChildRelation(new ForeignChild(model, fault))).toBe(true);
    });

    it("does not mistake an unrelated link for a structural relation", () => {
        const a = new Model();
        const b = new Model();
        const plain = new GraphOLink(a as never, b as never);
        expect(isApplyToRelation(plain)).toBe(false);
        expect(isChildRelation(plain)).toBe(false);
        expect(isApplyToRelation(null)).toBe(false);
        expect(isApplyToRelation(undefined)).toBe(false);
        // A child relation is not an apply-to relation and the reverse.
        expect(isApplyToRelation(new Child(a, b))).toBe(false);
        expect(isChildRelation(new ApplyTo(a, b))).toBe(false);
    });

    it("attaches a foreign link to the same place a native one goes", () => {
        const native = new Model();
        const foreign = new Model();
        const fault = new Fault();
        new ApplyTo(fault, native);
        new ForeignApplyTo(fault, foreign);
        // The target surfaces its incoming relation through `opsc`, so both
        // models must see exactly one.
        expect(native.opsc(isApplyToRelation).length).toBe(1);
        expect(foreign.opsc(isApplyToRelation).length).toBe(1);
    });

    it("drives a fault whose link came from another copy of core", () => {
        const model = new Model();
        const fault = new Fault();
        new ForeignApplyTo(fault, model);

        const session = { dt: 1e-3, graph: { links: [] }, linkStates: [] as unknown[] };
        model.fire(session as never, 0);

        // This is the assertion the bug would have failed: the fault ran and
        // its torque reached the model's accumulator.
        expect(fault.calls).toBe(1);
        expect(model.readTau()).toBeCloseTo(0.25, 12);
    });
});

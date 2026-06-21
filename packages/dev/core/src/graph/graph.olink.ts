import { Nullable } from "../types";
import { GraphItem } from "./graph.graphItem";
import { INode, IOlink } from "./graph.interfaces";

export class GraphOLink<B = unknown> extends GraphItem<B> implements IOlink<B> {
    private _oini: Nullable<INode> = null;
    public _ofin: Nullable<INode> = null;

    public constructor(oini?: INode, ofin?: INode) {
        super();
        this.oini = oini ?? null;
        this.ofin = ofin ?? null;
    }

    public get oini(): Nullable<INode> {
        return this._oini;
    }

    public set oini(n: Nullable<INode>) {
        if (this._oini !== n) {
            this._oini?.remove(this);
            this._oini = n;
            this._oini?.add(this);
        }
    }

    public get ofin(): Nullable<INode> {
        return this._ofin;
    }

    public set ofin(n: Nullable<INode>) {
        if (this._ofin !== n) {
            this._ofin?.remove(this);
            this._ofin = n;
            this._ofin?.add(this);
        }
    }

    public dispose(): void {
        this._oini?.remove(this);
        this._ofin?.remove(this);
        super.dispose();
    }
}

/**
 * `Child` relation: a STRUCTURAL link (not a dataflow channel) expressing the
 * generic 1/N parent -> child hierarchy. Directed parent (`oini`) -> child
 * (`ofin`), so the SAME link surfaces both directions through the node
 * adjacency: a node's `onsc` filtered to `Child` gives its children (N), its
 * `opsc` filtered to `Child` gives its parent (1).
 *
 * It carries no port / payload; its `type` is the ontology id "child"
 * (`isBindingRelation: false`, so it never renders as a config cable and is
 * skipped by the per-slot routing cache). `IHasTransform.parent` is DERIVED
 * (lazily cached) from the incoming `Child` link: the 3D transform tree is one
 * consumer of this generic graph relation, scene-context resolution another.
 * Idiomatic alongside the typed link subclasses already in the codebase
 * (CnnSynapse / RnnSynapse / VitSynapse all extend GraphOLink).
 */
export class Child<B = unknown> extends GraphOLink<B> {
    public constructor(parent?: INode, child?: INode) {
        // oini = parent, ofin = child. super() wires both ends, registering this
        // link on each node's onsc/opsc; the child side invalidates its derived
        // parent cache. `type` is set after (the routing cache + the parent-cache
        // invalidation key off `instanceof Child`, robust during construction).
        super(parent, child);
        this.type = "child";
    }
}

/**
 * `ApplyTo` relation: a STRUCTURAL link (not a dataflow channel) by which a
 * FAULT (or any operator node, `oini`) APPLIES its physics to a TARGET model
 * (`ofin`). Directed source -> target; the target surfaces its incoming
 * `ApplyTo` links via `opsc` filtered to `ApplyTo`, then drives them with
 * `link.oini.applyTo(this, ctx)` (the fault reads the target model's
 * PROPERTIES directly, e.g. `motor.rotorMass` / `motor.airGap`, and accumulates
 * its effect). Properties are read from the model, NOT published as ports; a
 * port is a runtime DATA relation, an `ApplyTo` is a MODEL-consumption relation.
 *
 * Carries no payload; `type` is the ontology id "applyTo" (`isBindingRelation:
 * false`, structural). Idiomatic alongside the other typed link subclasses
 * (Child, CnnSynapse, ...). The fault keeps its own tuning editables (severity,
 * defect counts, ...); the target validates acceptance (`acceptFault`).
 */
export class ApplyTo<B = unknown> extends GraphOLink<B> {
    public constructor(fault?: INode, target?: INode) {
        // oini = fault (source), ofin = target model. super() wires both ends.
        super(fault, target);
        this.type = "applyTo";
    }
}

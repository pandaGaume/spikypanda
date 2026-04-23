// ═══════════════════════════════════════════════════════════════════════════
// Model Predictive Control (MPC) nodes
//
// Implements the "future graph" concept from STAG (Sense-Think-Act with Graphs).
// The dynamics model is a standard ComputeGraph that maps (state, action)
// to next_state. MPC nodes wrap this dynamics graph to:
//
//   - RolloutNode              : unroll the dynamics N steps forward
//   - ObjectiveNode            : score a trajectory with a cost function
//   - ShootingSelectorNode     : random-shooting MPC, pick best first action
//
// These nodes let you run full MPC loops on a microcontroller using the
// same inference engine as the perception (past graph).
// ═══════════════════════════════════════════════════════════════════════════
import { ComputeGraph } from "./compute.graph";
import { ComputeNodeBase } from "./compute.node.base";
import { ITensor } from "./compute.interfaces";

// ─── RolloutNode ─────────────────────────────────────────────────────────────

/**
 * Unroll a dynamics sub-graph over a fixed horizon.
 *
 * Inputs:
 *   inputs[0] = initial state, shape [stateDim]
 *   inputs[1] = action sequence, shape [horizon * actionDim] (flattened)
 *
 * Outputs:
 *   trajectory, shape [(horizon+1) * stateDim] (flattened)
 *
 * The dynamics graph is expected to accept a single input tensor of shape
 * [stateDim + actionDim] (concatenated state and action) and return a single
 * output tensor of shape [stateDim] (the state delta OR the next state,
 * controlled by the `deltaMode` flag).
 */
export class RolloutNode extends ComputeNodeBase {
    public readonly nodeType = "mpc_rollout";
    public readonly outputShapes: number[][];

    private readonly _dynamics: ComputeGraph;
    private readonly _dynamicsInputName: string;
    private readonly _horizon: number;
    private readonly _stateDim: number;
    private readonly _actionDim: number;
    private readonly _deltaMode: boolean;

    public constructor(opts: {
        dynamics: ComputeGraph;
        dynamicsInputName: string;
        horizon: number;
        stateDim: number;
        actionDim: number;
        deltaMode?: boolean;
    }) {
        super();
        this._dynamics = opts.dynamics;
        this._dynamicsInputName = opts.dynamicsInputName;
        this._horizon = opts.horizon;
        this._stateDim = opts.stateDim;
        this._actionDim = opts.actionDim;
        this._deltaMode = opts.deltaMode ?? false;
        this.outputShapes = [[(opts.horizon + 1) * opts.stateDim]];
    }

    public execute(inputs: ITensor[]): ITensor[] {
        const initialState = inputs[0].data;
        const actions = inputs[1].data;

        const S = this._stateDim;
        const A = this._actionDim;
        const H = this._horizon;
        const trajectory = new Float32Array((H + 1) * S);

        // Seed trajectory with initial state
        for (let i = 0; i < S; i++) {
            trajectory[i] = initialState[i];
        }

        const stateActionBuf = new Float32Array(S + A);
        const externalInputs = new Map<string, ITensor>();

        for (let t = 0; t < H; t++) {
            // Build dynamics input: state concatenated with action
            const stateOff = t * S;
            const actionOff = t * A;
            for (let i = 0; i < S; i++) stateActionBuf[i] = trajectory[stateOff + i];
            for (let j = 0; j < A; j++) stateActionBuf[S + j] = actions[actionOff + j];

            const input: ITensor = {
                data: stateActionBuf.slice(),
                shape: [1, S + A],
                name: this._dynamicsInputName,
            };
            externalInputs.clear();
            externalInputs.set(this._dynamicsInputName, input);

            const results = this._dynamics.run(externalInputs);
            const outTensor = results.values().next().value as ITensor;

            const nextOff = (t + 1) * S;
            if (this._deltaMode) {
                // Model predicts delta -> add to current state
                for (let i = 0; i < S; i++) {
                    trajectory[nextOff + i] = trajectory[stateOff + i] + outTensor.data[i];
                }
            } else {
                for (let i = 0; i < S; i++) {
                    trajectory[nextOff + i] = outTensor.data[i];
                }
            }
        }

        return [{
            data: trajectory,
            shape: [H + 1, S],
            name: "trajectory",
        }];
    }
}

// ─── ObjectiveNode ───────────────────────────────────────────────────────────

/**
 * Scalar cost for a trajectory.
 *
 * Inputs:
 *   inputs[0] = trajectory, shape [(horizon+1), stateDim]
 *   inputs[1] = action sequence, shape [horizon, actionDim]
 *
 * Outputs:
 *   cost, shape [1]
 *
 * The cost is computed via a user-supplied function receiving the raw
 * Float32Arrays and dimensions. This lets the demo define domain-specific
 * cost functions (e.g. CO2 threshold penalty + energy) without baking them
 * into the node type.
 */
export type TrajectoryCostFn = (
    trajectory: Float32Array,
    actions: Float32Array,
    stateDim: number,
    actionDim: number,
    horizon: number,
) => number;

export class ObjectiveNode extends ComputeNodeBase {
    public readonly nodeType = "mpc_objective";
    public readonly outputShapes: number[][] = [[1]];

    private readonly _costFn: TrajectoryCostFn;
    private readonly _stateDim: number;
    private readonly _actionDim: number;
    private readonly _horizon: number;

    public constructor(opts: {
        costFn: TrajectoryCostFn;
        stateDim: number;
        actionDim: number;
        horizon: number;
    }) {
        super();
        this._costFn = opts.costFn;
        this._stateDim = opts.stateDim;
        this._actionDim = opts.actionDim;
        this._horizon = opts.horizon;
    }

    public execute(inputs: ITensor[]): ITensor[] {
        const trajectory = inputs[0].data;
        const actions = inputs[1].data;
        const cost = this._costFn(trajectory, actions,
            this._stateDim, this._actionDim, this._horizon);
        return [{ data: new Float32Array([cost]), shape: [1], name: "cost" }];
    }
}

// ─── ShootingSelectorNode ────────────────────────────────────────────────────

/**
 * Random-shooting MPC.
 *
 * Generates K candidate action sequences, evaluates each via rollout + cost,
 * returns the first action of the best sequence.
 *
 * Inputs:
 *   inputs[0] = initial state, shape [stateDim]
 *
 * Outputs:
 *   outputs[0] = best first action, shape [actionDim]
 *   outputs[1] = best cost, shape [1]
 *   outputs[2] = all candidate costs, shape [K]
 *
 * The node is constructed with:
 *   - a RolloutNode         (to unroll candidates)
 *   - an ObjectiveNode      (to score trajectories)
 *   - an action sampler     (produces a [horizon * actionDim] sequence)
 *   - K (number of candidates)
 */
export type ActionSamplerFn = (
    horizon: number,
    actionDim: number,
    rng: () => number,
) => Float32Array;

export class ShootingSelectorNode extends ComputeNodeBase {
    public readonly nodeType = "mpc_shooting";
    public readonly outputShapes: number[][];

    private readonly _rollout: RolloutNode;
    private readonly _objective: ObjectiveNode;
    private readonly _sampler: ActionSamplerFn;
    private readonly _numCandidates: number;
    private readonly _horizon: number;
    private readonly _actionDim: number;
    private readonly _rng: () => number;

    public constructor(opts: {
        rollout: RolloutNode;
        objective: ObjectiveNode;
        sampler: ActionSamplerFn;
        numCandidates: number;
        horizon: number;
        stateDim: number;
        actionDim: number;
        rng?: () => number;
    }) {
        super();
        this._rollout = opts.rollout;
        this._objective = opts.objective;
        this._sampler = opts.sampler;
        this._numCandidates = opts.numCandidates;
        this._horizon = opts.horizon;
        this._actionDim = opts.actionDim;
        this._rng = opts.rng ?? Math.random;
        // stateDim is accepted for API consistency but the selector does not use it
        // directly; it is inferred from the initial state tensor at execute time.
        void opts.stateDim;
        this.outputShapes = [[opts.actionDim], [1], [opts.numCandidates]];
    }

    public execute(inputs: ITensor[]): ITensor[] {
        const initialState = inputs[0];

        let bestCost = Infinity;
        let bestActions: Float32Array | null = null;
        const allCosts = new Float32Array(this._numCandidates);

        for (let k = 0; k < this._numCandidates; k++) {
            const actions = this._sampler(this._horizon, this._actionDim, this._rng);
            const actionsTensor: ITensor = {
                data: actions,
                shape: [this._horizon, this._actionDim],
                name: "actions",
            };

            const [trajectory] = this._rollout.execute([initialState, actionsTensor]);
            const [costTensor] = this._objective.execute([trajectory, actionsTensor]);
            const cost = costTensor.data[0];
            allCosts[k] = cost;

            if (cost < bestCost) {
                bestCost = cost;
                bestActions = actions;
            }
        }

        const firstAction = new Float32Array(this._actionDim);
        if (bestActions) {
            for (let j = 0; j < this._actionDim; j++) firstAction[j] = bestActions[j];
        }

        return [
            { data: firstAction, shape: [this._actionDim], name: "best_action" },
            { data: new Float32Array([bestCost]), shape: [1], name: "best_cost" },
            { data: allCosts, shape: [this._numCandidates], name: "all_costs" },
        ];
    }
}

// ─── Built-in samplers ───────────────────────────────────────────────────────

/**
 * Uniform random discrete action sequence sampler.
 *
 * Produces one-hot encoded actions over `numActions` categories.
 * Useful for discrete action spaces like scrubber-off/low/medium/high.
 */
export function makeDiscreteOneHotSampler(numActions: number): ActionSamplerFn {
    return (horizon, actionDim, rng) => {
        if (actionDim !== numActions) {
            throw new Error(`actionDim (${actionDim}) must match numActions (${numActions}) for one-hot sampler`);
        }
        const out = new Float32Array(horizon * actionDim);
        for (let t = 0; t < horizon; t++) {
            const choice = Math.floor(rng() * numActions);
            out[t * actionDim + choice] = 1.0;
        }
        return out;
    };
}

/**
 * Piecewise constant sampler: holds a random action for a random duration,
 * then picks a new one. Produces smoother trajectories than per-step random.
 */
export function makePiecewiseConstantSampler(
    numActions: number,
    minSegment: number = 3,
    maxSegment: number = 15,
): ActionSamplerFn {
    return (horizon, actionDim, rng) => {
        if (actionDim !== numActions) {
            throw new Error(`actionDim (${actionDim}) must match numActions (${numActions})`);
        }
        const out = new Float32Array(horizon * actionDim);
        let t = 0;
        while (t < horizon) {
            const segLen = minSegment + Math.floor(rng() * (maxSegment - minSegment + 1));
            const choice = Math.floor(rng() * numActions);
            const end = Math.min(t + segLen, horizon);
            for (let i = t; i < end; i++) {
                out[i * actionDim + choice] = 1.0;
            }
            t = end;
        }
        return out;
    };
}

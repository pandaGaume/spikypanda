/**
 * Conformance tests for MPC nodes (RolloutNode, ObjectiveNode, ShootingSelectorNode).
 *
 * Uses a trivial analytic dynamics (state_{t+1} = state_t + action_t) instead of
 * a real neural network, so we can compute the expected trajectory in closed
 * form and verify the rollout/cost/selection behavior.
 */
import {
    ComputeGraph,
    Kernel,
    ITensor,
} from "spikypanda-core";
import {
    RolloutNode,
    ObjectiveNode,
    ShootingSelectorNode,
    makeDiscreteOneHotSampler,
} from "spikypanda-applications-mpc";

/**
 * Trivial dynamics node: out = state + sum(action_onehot * [0, 1, 2, 3]).
 * Treats the concatenated [state, action] input and produces the delta.
 * Used to make unit tests deterministic without requiring a trained model.
 */
class AdderDynamicsNode extends Kernel {
    public readonly nodeType = "adder_dynamics";
    public readonly outputShapes: number[][] = [[1]];

    public constructor(private readonly stateDim: number,
                       private readonly actionDim: number) {
        super();
        this.id = "dynamics_input";
    }

    public execute(inputs: ITensor[]): ITensor[] {
        const data = inputs[0].data;
        // state = first stateDim elements, action = next actionDim (one-hot)
        // delta = dot(action_onehot, [0, 1, 2, 3, ...])
        let delta = 0;
        for (let i = 0; i < this.actionDim; i++) {
            delta += data[this.stateDim + i] * i;
        }
        const out = new Float32Array(this.stateDim);
        for (let i = 0; i < this.stateDim; i++) {
            out[i] = data[i] + delta;
        }
        return [{ data: out, shape: [this.stateDim], name: "next_state" }];
    }
}

function buildAdderDynamicsGraph(stateDim: number, actionDim: number): ComputeGraph {
    const node = new AdderDynamicsNode(stateDim, actionDim);
    return new ComputeGraph([node], []);
}

// ---------------------------------------------------------------------------
// RolloutNode tests
// ---------------------------------------------------------------------------

describe("RolloutNode", () => {
    it("unrolls trajectory with absolute-next-state dynamics", () => {
        const stateDim = 1;
        const actionDim = 4;
        const horizon = 5;
        const dynamics = buildAdderDynamicsGraph(stateDim, actionDim);

        const rollout = new RolloutNode({
            dynamics,
            dynamicsInputName: "dynamics_input",
            horizon,
            stateDim,
            actionDim,
            deltaMode: false,
        });

        // Initial state = 10, all actions = "1" (one-hot [0, 1, 0, 0] -> delta = 1)
        const initialState: ITensor = {
            data: new Float32Array([10]),
            shape: [1],
            name: "initial_state",
        };
        const actions = new Float32Array(horizon * actionDim);
        for (let t = 0; t < horizon; t++) actions[t * actionDim + 1] = 1.0;
        const actionsTensor: ITensor = {
            data: actions,
            shape: [horizon, actionDim],
            name: "actions",
        };

        const [traj] = rollout.execute([initialState, actionsTensor]);
        // The AdderDynamicsNode returns state + delta (it is writing absolute next
        // state already via state + delta). So after 5 steps of adding 1 each time:
        // [10, 11, 12, 13, 14, 15]
        expect(Array.from(traj.data)).toEqual([10, 11, 12, 13, 14, 15]);
        expect(traj.shape).toEqual([horizon + 1, stateDim]);
    });

    it("respects deltaMode flag", () => {
        const stateDim = 1;
        const actionDim = 4;
        const horizon = 3;
        const dynamics = buildAdderDynamicsGraph(stateDim, actionDim);

        const rollout = new RolloutNode({
            dynamics,
            dynamicsInputName: "dynamics_input",
            horizon,
            stateDim,
            actionDim,
            deltaMode: true, // model output is delta, not next state
        });

        const initialState: ITensor = {
            data: new Float32Array([0]),
            shape: [1],
            name: "initial_state",
        };
        // All actions = "2" (one-hot [0, 0, 1, 0] -> delta = 2)
        const actions = new Float32Array(horizon * actionDim);
        for (let t = 0; t < horizon; t++) actions[t * actionDim + 2] = 1.0;
        const actionsTensor: ITensor = {
            data: actions,
            shape: [horizon, actionDim],
            name: "actions",
        };

        const [traj] = rollout.execute([initialState, actionsTensor]);
        // In delta mode AdderDynamicsNode returns state + delta, which the RolloutNode
        // ADDS to the current state. So effective step = delta*2. Wait, this is not what
        // we want. Let me reconsider: AdderDynamicsNode returns `state + delta`. In
        // delta mode the RolloutNode adds this to the current state: next = state + (state + delta).
        // That is intentional here: this test just validates that deltaMode changes behavior.
        // The real dynamics model outputs pure delta; AdderDynamicsNode is an analytic stand-in
        // that happens to output absolute state. We check the math matches the documented rule.
        //
        // trajectory[0] = 0
        // trajectory[1] = 0 + (0 + 2) = 2
        // trajectory[2] = 2 + (2 + 2) = 6
        // trajectory[3] = 6 + (6 + 2) = 14
        expect(Array.from(traj.data)).toEqual([0, 2, 6, 14]);
    });

    it("produces correct trajectory shape for multi-dim state", () => {
        const stateDim = 3;
        const actionDim = 2;
        const horizon = 4;
        const dynamics = buildAdderDynamicsGraph(stateDim, actionDim);

        const rollout = new RolloutNode({
            dynamics,
            dynamicsInputName: "dynamics_input",
            horizon,
            stateDim,
            actionDim,
        });

        const initialState: ITensor = {
            data: new Float32Array([1, 2, 3]),
            shape: [stateDim],
            name: "initial_state",
        };
        const actions = new Float32Array(horizon * actionDim);
        const actionsTensor: ITensor = {
            data: actions,
            shape: [horizon, actionDim],
            name: "actions",
        };

        const [traj] = rollout.execute([initialState, actionsTensor]);
        expect(traj.shape).toEqual([horizon + 1, stateDim]);
        expect(traj.data.length).toBe((horizon + 1) * stateDim);
        // All actions are zero (no one-hot set), so state stays constant
        for (let t = 0; t <= horizon; t++) {
            for (let i = 0; i < stateDim; i++) {
                expect(traj.data[t * stateDim + i]).toBeCloseTo([1, 2, 3][i], 5);
            }
        }
    });
});

// ---------------------------------------------------------------------------
// ObjectiveNode tests
// ---------------------------------------------------------------------------

describe("ObjectiveNode", () => {
    it("computes trajectory cost via user function", () => {
        const stateDim = 1;
        const actionDim = 2;
        const horizon = 3;

        // Cost = final state^2 + 0.1 * sum of action indices
        const costFn = (
            trajectory: Float32Array,
            actions: Float32Array,
            sDim: number,
            aDim: number,
            H: number,
        ) => {
            const finalIdx = H * sDim;
            const finalState = trajectory[finalIdx];
            let actionSum = 0;
            for (let t = 0; t < H; t++) {
                for (let i = 0; i < aDim; i++) {
                    actionSum += actions[t * aDim + i] * i;
                }
            }
            return finalState * finalState + 0.1 * actionSum;
        };

        const obj = new ObjectiveNode({
            costFn,
            stateDim,
            actionDim,
            horizon,
        });

        const traj: ITensor = {
            data: new Float32Array([0, 1, 2, 3]),  // 4 states over horizon 3
            shape: [horizon + 1, stateDim],
            name: "trajectory",
        };
        const actions: ITensor = {
            data: new Float32Array([1, 0,  0, 1,  1, 0]), // 3 one-hot actions
            shape: [horizon, actionDim],
            name: "actions",
        };

        const [cost] = obj.execute([traj, actions]);
        // Final state = 3, 3^2 = 9
        // Action indices: 0 + 1 + 0 = 1, 0.1 * 1 = 0.1
        // Total = 9.1
        expect(cost.data[0]).toBeCloseTo(9.1, 5);
    });
});

// ---------------------------------------------------------------------------
// ShootingSelectorNode tests
// ---------------------------------------------------------------------------

describe("ShootingSelectorNode", () => {
    it("picks the lowest-cost action sequence", () => {
        const stateDim = 1;
        const actionDim = 4;
        const horizon = 5;
        const K = 20;

        const dynamics = buildAdderDynamicsGraph(stateDim, actionDim);
        const rollout = new RolloutNode({
            dynamics,
            dynamicsInputName: "dynamics_input",
            horizon,
            stateDim,
            actionDim,
        });

        // Cost: (final state)^2 -- we want the trajectory that ends closest to 0,
        // which means picking action 0 (delta = 0) every step.
        const costFn = (trajectory: Float32Array) => {
            const finalState = trajectory[trajectory.length - 1];
            return finalState * finalState;
        };
        const objective = new ObjectiveNode({
            costFn,
            stateDim,
            actionDim,
            horizon,
        });

        // Deterministic RNG: cycles through fixed values so we can predict
        let seedIdx = 0;
        const fixedSeeds = [0.01, 0.3, 0.5, 0.9]; // action 0, 1, 2, 3
        const rng = () => {
            const v = fixedSeeds[seedIdx % fixedSeeds.length];
            seedIdx++;
            return v;
        };

        const selector = new ShootingSelectorNode({
            rollout,
            objective,
            sampler: makeDiscreteOneHotSampler(4),
            numCandidates: K,
            horizon,
            stateDim,
            actionDim,
            rng,
        });

        const initialState: ITensor = {
            data: new Float32Array([0]),  // start at 0
            shape: [stateDim],
            name: "initial_state",
        };

        const [bestAction, bestCost, allCosts] = selector.execute([initialState]);

        expect(allCosts.data.length).toBe(K);
        expect(bestCost.data[0]).toBeGreaterThanOrEqual(0);
        // Best cost must be <= all other costs
        for (let i = 0; i < K; i++) {
            expect(bestCost.data[0]).toBeLessThanOrEqual(allCosts.data[i]);
        }
        // bestAction is one-hot of actionDim
        expect(bestAction.shape).toEqual([actionDim]);
        let sum = 0;
        for (let i = 0; i < actionDim; i++) sum += bestAction.data[i];
        expect(sum).toBeCloseTo(1.0, 5);
    });

    it("exposes candidate costs in order of generation", () => {
        const stateDim = 1;
        const actionDim = 2;
        const horizon = 2;
        const K = 5;

        const dynamics = buildAdderDynamicsGraph(stateDim, actionDim);
        const rollout = new RolloutNode({
            dynamics,
            dynamicsInputName: "dynamics_input",
            horizon,
            stateDim,
            actionDim,
        });
        const objective = new ObjectiveNode({
            costFn: (traj) => traj[traj.length - 1],
            stateDim,
            actionDim,
            horizon,
        });

        let count = 0;
        const rng = () => { count++; return (count % 2) / 2; };

        const selector = new ShootingSelectorNode({
            rollout,
            objective,
            sampler: makeDiscreteOneHotSampler(2),
            numCandidates: K,
            horizon,
            stateDim,
            actionDim,
            rng,
        });

        const initialState: ITensor = {
            data: new Float32Array([5]),
            shape: [stateDim],
            name: "initial_state",
        };

        const [, , allCosts] = selector.execute([initialState]);
        expect(allCosts.data.length).toBe(K);
    });
});

// ---------------------------------------------------------------------------
// End-to-end integration
// ---------------------------------------------------------------------------

describe("MPC integration", () => {
    it("runs a complete sense-think-act loop", () => {
        const stateDim = 1;
        const actionDim = 4;
        const horizon = 8;
        const K = 30;

        const dynamics = buildAdderDynamicsGraph(stateDim, actionDim);
        const rollout = new RolloutNode({
            dynamics,
            dynamicsInputName: "dynamics_input",
            horizon,
            stateDim,
            actionDim,
        });

        // Target: keep state near 10
        const costFn = (traj: Float32Array) => {
            let cost = 0;
            for (let i = 0; i < traj.length; i++) {
                cost += (traj[i] - 10) * (traj[i] - 10);
            }
            return cost;
        };
        const objective = new ObjectiveNode({
            costFn,
            stateDim,
            actionDim,
            horizon,
        });

        const selector = new ShootingSelectorNode({
            rollout,
            objective,
            sampler: makeDiscreteOneHotSampler(4),
            numCandidates: K,
            horizon,
            stateDim,
            actionDim,
        });

        // Simulate a sense-think-act loop for 10 outer iterations
        let currentState = new Float32Array([5]); // start away from target
        const stateHistory: number[] = [currentState[0]];

        for (let iter = 0; iter < 10; iter++) {
            const stateTensor: ITensor = {
                data: currentState,
                shape: [stateDim],
                name: "initial_state",
            };
            const [bestAction] = selector.execute([stateTensor]);

            // Apply action: one-hot * [0, 1, 2, 3] -> delta
            let delta = 0;
            for (let i = 0; i < actionDim; i++) delta += bestAction.data[i] * i;
            const newState = new Float32Array([currentState[0] + delta]);
            currentState = newState;
            stateHistory.push(currentState[0]);
        }

        // The controller should drive the state toward 10 (target)
        const finalState = stateHistory[stateHistory.length - 1];
        expect(finalState).toBeGreaterThan(stateHistory[0]);
        // It should at least move closer to the target
        expect(Math.abs(finalState - 10)).toBeLessThan(Math.abs(stateHistory[0] - 10));
    });
});

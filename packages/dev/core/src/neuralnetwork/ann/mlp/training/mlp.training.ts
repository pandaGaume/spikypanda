import { IMlpGraph, IMlpNeuron, IMlpSynapse } from "../mlp.interfaces";
import { MLPRuntime } from "../mlp.runtime";
import { IBackpropNeuronContext, IBackpropSynapseContext, ILossFunction, IOptimizer, ITrainingContext } from "./mlp.interfaces.training";

/// <summary>
/// Handles backpropagation and weight updates for an MLP graph.
/// </summary>
export class MLPTraining {
    private context: ITrainingContext = { iteration: 0 };

    constructor(
        private readonly graph: IMlpGraph,
        private readonly runtime: MLPRuntime,
        private readonly lossFn: ILossFunction,
        private readonly learningRate: number,
        private readonly optimizer: IOptimizer
    ) {}

    /// <summary>
    /// Runs a forward + backward pass and updates weights.
    /// </summary>
    trainStep(inputs: number[], expected: number[]): number {
        const outputs = this.runtime.run(inputs);
        const loss = this._backpropagate(outputs, expected);
        this._applyGradients();
        this.context.iteration++;
        return loss;
    }

    /// <summary>
    /// Performs backpropagation and stores gradients in neuron and synapse bags.
    /// This version assumes:
    /// + The graph is feedforward (no cycles)
    /// + Activations are already computed (via MLPRuntime.run())
    /// + Each neuron uses an activationFn with a known derivative
    /// </summary>
    private _backpropagate(outputs: number[], expected: number[]): number {
        let totalLoss = 0;

        // STEP 1 – Output layer: compute error and delta
        for (let i = 0; i < this.graph.outputs.length; i++) {
            const neuron = this.graph.outputs[i] as IMlpNeuron;
            const y = expected[i];
            const o = (neuron.bag as IBackpropNeuronContext).activation;

            const loss = this.lossFn.loss(o, y);
            totalLoss += loss;

            const dLoss = this.lossFn.dLoss(o, y); // ∂L/∂o
            const activationPrime = (neuron.activationFn ?? this.runtime.mainActivation).derivative;
            const delta = dLoss * activationPrime(o); // ∂L/∂z

            const bag = (neuron.bag ??= {}) as IBackpropNeuronContext;
            bag.error = y - o;
            bag.gradient = delta;
        }

        // STEP 2 – Hidden layers: propagate error backward
        // Reverse topological order (no cycle assumed)
        for (let i = this.graph.nodes.length - 1; i >= 0; i--) {
            const neuron = this.graph.nodes[i] as IMlpNeuron;
            const bag = neuron.bag as IBackpropNeuronContext;
            if (!bag || bag.gradient === undefined) continue;

            const activation = bag.activation;
            const activationPrime = (neuron.activationFn ?? this.runtime.mainActivation).derivative;

            // If it's not an output neuron, compute its delta from its downstream connections
            if (!this.graph.outputs.includes(neuron)) {
                let downstreamGradientSum = 0;
                const outgoing = neuron.onsc<IMlpSynapse>() ?? [];

                for (const syn of outgoing) {
                    const target = syn.ofin as IMlpNeuron;
                    const targetBag = target.bag as IBackpropNeuronContext;
                    downstreamGradientSum += syn.weight * (targetBag?.gradient ?? 0);
                }

                bag.gradient = activationPrime(activation) * downstreamGradientSum;
            }

            // STEP 3 – Accumulate gradient into incoming synapses
            const incoming = neuron.opsc<IMlpSynapse>() ?? [];
            for (const syn of incoming) {
                const from = syn.oini as IMlpNeuron;
                const fromBag = from.bag as IBackpropNeuronContext;

                const g = bag.gradient ?? 0;
                const a = fromBag?.activation ?? 0;

                const synBag = (syn.bag ??= { gradient: 0 }) as IBackpropSynapseContext;
                synBag.gradient = g * a;
            }
        }

        return totalLoss;
    }

    /// <summary>
    /// Applies weight updates using the selected optimizer.
    /// </summary>
    private _applyGradients(): void {
        for (const synapse of this.graph.links) {
            const ctx = synapse.bag as IBackpropSynapseContext;
            if (ctx?.gradient !== undefined) {
                this.optimizer.apply(synapse, this.learningRate, ctx.gradient, this.context);
            }
        }
    }

    get trainingContext(): Readonly<ITrainingContext> {
        return this.context;
    }
}

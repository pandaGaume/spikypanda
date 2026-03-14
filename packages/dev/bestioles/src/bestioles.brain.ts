import {
    ActivationFunctions,
    Glorot,
    IMlpGraph,
    LayerConnectionBuilder,
    LayerConnectionType,
    MLPInferenceRuntime,
    MlpSynapse,
    PerceptronBuilder,
    SynapseBuilder,
} from "spikypanda-core";
import { SimConfig } from "./bestioles.config";
import { ICreatureBrain } from "./bestioles.interfaces";

/**
 * Number of sensor inputs the brain receives each tick.
 * 18 sensors cover: self-state (5), group center (5),
 * nearest neighbor (4), neighbor alignment (1),
 * neighbor heading steering cues (2), wall proximity (1).
 * See `CreatureWorld._buildSensors()` for the exact layout.
 */
export const SENSOR_COUNT = 18;

/**
 * Neural network brain for a single creature.
 *
 * **Architecture: 18 → 10 → 3 (MLP)**
 *
 * - **Input layer** (18 neurons, linear activation):
 *   Receives raw sensor values (already normalized to ~[−1,1] or [0,1]).
 *   Linear activation passes them through unchanged — no information loss.
 *
 * - **Hidden layer** (10 neurons, tanh activation):
 *   10 neurons is a sweet spot for this problem: enough capacity to learn
 *   complex steering behaviors (turn toward group, avoid walls, match
 *   neighbors) but small enough for fast inference at 60fps × 100 creatures.
 *   Tanh (range [−1,+1]) was chosen over ReLU because:
 *     - Sensor values span [−1,+1], so tanh matches the data distribution
 *     - Symmetric around 0: negative sensor values produce meaningful
 *       negative activations (e.g., "neighbor is to my left" vs "right")
 *     - Bounded output prevents activation explosion during mutation
 *
 * - **Output layer** (3 neurons, sigmoid activation):
 *   Sigmoid (range [0,1]) maps naturally to the three motor controls:
 *     - Output[0] → speed: 0 = stopped, 1 = maxSpeed
 *     - Output[1] → yaw turn: 0.5 = straight, 0/1 = max left/right
 *     - Output[2] → pitch turn: 0.5 = level, 0/1 = max down/up
 *   Sigmoid ensures outputs are always bounded — no need for clamping.
 *
 * **Weight initialization**: Glorot (Xavier) — scales initial random weights
 * by sqrt(2 / (fan_in + fan_out)). This keeps activations from saturating
 * in the first generation, giving mutation a reasonable starting point.
 *
 * **Why not deeper?** A single hidden layer is sufficient for the boid-like
 * mappings needed (essentially weighted sums of angles and distances).
 * More layers would add latency and make mutation less effective (changes
 * in early layers get diluted through multiple non-linearities).
 */
export class CreatureBrain implements ICreatureBrain {
    /**
     * Factory: builds a fresh 18→10→3 MLP graph with Glorot-initialized
     * weights. Called both for first-generation creatures and for cloning
     * (we create a new graph then copy weights, because the underlying
     * graph library's clone() has issues with shared references).
     */
    static createCreatureGraph(): IMlpGraph {
        const createConnBuilder = function (fanin: number, fanout: number) {
            // Each connection layer uses fully-connected topology:
            // every neuron in layer N connects to every neuron in layer N+1.
            // Glorot initialization scales weights by sqrt(2/(fanin+fanout))
            // to maintain variance across layers.
            const synapseBuilder = new SynapseBuilder().withType(MlpSynapse) as SynapseBuilder;
            return new LayerConnectionBuilder().withSynapseBuilder(synapseBuilder).withType(LayerConnectionType.FullyConnected).withWeightInitializer(new Glorot(fanin, fanout));
        };

        const builder = new PerceptronBuilder()
            .withInputLayer(SENSOR_COUNT, 0, ActivationFunctions.linear) // 18 sensors, pass-through
            .withHiddenLayer(10, 0, ActivationFunctions.tanh) // 10 hidden, tanh ∈ [−1,+1]
            .withConnectionBuilder(createConnBuilder(SENSOR_COUNT, 10)) // 18×10 = 180 weights
            .withOutputLayer(3, 0, ActivationFunctions.sigmoid) // 3 outputs, sigmoid ∈ [0,1]
            .withConnectionBuilder(createConnBuilder(10, 3)); // 10×3 = 30 weights
        // Total trainable parameters: 180 + 30 weights + 10 + 3 biases = 223

        return builder.build();
    }

    private _graph: IMlpGraph;
    private _runtime: MLPInferenceRuntime;

    /**
     * @param other  If provided, copies all weights and biases from the
     *               source brain (used during reproduction). A fresh graph
     *               is always created first to avoid shared-reference bugs
     *               in the graph library's clone() method.
     */
    public constructor(other?: ICreatureBrain) {
        this._graph = CreatureBrain.createCreatureGraph();

        if (other) {
            // Copy synapse weights from parent → child graph.
            // Links are in consistent order (input→hidden, hidden→output),
            // so index-based copy is safe.
            const srcLinks = other.graph.links;
            const dstLinks = this._graph.links;
            for (let i = 0; i < srcLinks.length && i < dstLinks.length; i++) {
                dstLinks[i].weight = srcLinks[i].weight;
            }
            // Copy neuron biases from parent → child graph.
            // Biases shift the activation threshold — inherited biases
            // preserve the parent's learned behavior before mutation.
            const srcNodes = other.graph.nodes;
            const dstNodes = this._graph.nodes;
            for (let i = 0; i < srcNodes.length && i < dstNodes.length; i++) {
                dstNodes[i].bias = srcNodes[i].bias;
            }
        }

        // Pre-compile the inference runtime for fast per-frame evaluation.
        // This caches the layer topology so run() is a tight loop of
        // matrix multiplies + activation functions.
        this._runtime = new MLPInferenceRuntime(this._graph);
    }

    public get graph(): IMlpGraph {
        return this._graph;
    }

    public get runtime(): MLPInferenceRuntime {
        return this._runtime;
    }

    /**
     * Feed-forward inference: sensors → motor outputs.
     * @param sensors  Array of 18 floats (see SENSOR_COUNT).
     * @returns        Array of 3 floats in [0,1]: [speed, yawTurn, pitchTurn].
     */
    public evaluate(sensors: number[]): number[] {
        return this._runtime.run(sensors);
    }

    /**
     * Apply random perturbations to all weights and biases.
     * This is the sole "genetic operator" — no crossover, just mutation.
     *
     * Each weight gets: w += uniform(−1,+1) × mutationWeightScale
     * Each bias gets:   b += uniform(−1,+1) × mutationBiasScale
     *
     * The scale values are read from SimConfig at mutation time, so
     * they can be tuned live via the UI. Larger scales = more
     * exploration but less inheritance; smaller = more conservative.
     *
     * Bias mutation is intentionally smaller than weight mutation
     * (default 0.05 vs 0.1) because biases have outsized effect:
     * shifting a tanh neuron's bias by 0.5 can flip its output sign.
     */
    public mutate(): void {
        for (const syn of this._graph.links) {
            syn.weight += (Math.random() * 2 - 1) * SimConfig.mutationWeightScale;
        }
        for (const node of this._graph.nodes) {
            node.bias += (Math.random() * 2 - 1) * SimConfig.mutationBiasScale;
        }
    }
}

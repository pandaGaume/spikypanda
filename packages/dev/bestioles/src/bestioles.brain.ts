import { ActivationFunctions, Glorot, IMlpGraph, LayerConnectionType, MLPInferenceRuntime, PerceptronBuilder } from "spikypanda-core";
import { ICreatureBrain } from "./bestioles.interfaces";
import { LayerConnectionBuilder, SynapseBuilder } from "core/neuralnetwork/nn.builders";
import { MlpSynapse } from "core/neuralnetwork/ann/mlp/mlp.synapse";

export function createCreatureGraph(): IMlpGraph {
    const createConnBuilder = function (fanin: number, fanout: number) {
        const synapseBuilder = new SynapseBuilder().withType(MlpSynapse) as SynapseBuilder;
        return new LayerConnectionBuilder().withSynapseBuilder(synapseBuilder).withType(LayerConnectionType.FullyConnected).withWeightInitializer(new Glorot(fanin, fanout));
    };

    const builder = new PerceptronBuilder()
        .WithInputLayer(40, 0, ActivationFunctions.linear)
        .WithHiddenLayer(25, 0, ActivationFunctions.tanh)
        .WithConnectionBuilder(createConnBuilder(40, 25))
        .WithOutputLayer(3, 0, ActivationFunctions.sigmoid)
        .WithConnectionBuilder(createConnBuilder(25, 3));

    return builder.build();
}

export function createCreatureBrain(): ICreatureBrain {
    const graph = createCreatureGraph();
    const runtime = new MLPInferenceRuntime(graph);

    return {
        graph,
        runtime,
        evaluate(inputs: number[]) {
            return runtime.run(inputs);
        },
        mutate() {
            for (const syn of graph.links) {
                syn.weight += (Math.random() * 2 - 1) * 0.1; // small mutation
            }
            for (const node of graph.nodes) {
                node.bias += (Math.random() * 2 - 1) * 0.05;
            }
        },
    };
}

export function evaluateFitness(creature: ICreatureBrain, inputSequence: number[][]): number {
    let distance = 0;
    let position = { x: 0, y: 0 };

    for (const inputs of inputSequence) {
        const [tx, ty, theta] = creature.evaluate(inputs);
        const dx = Math.cos(theta * 2 * Math.PI - Math.PI) * tx;
        const dy = Math.sin(theta * 2 * Math.PI - Math.PI) * ty;

        position.x += dx;
        position.y += dy;

        distance += Math.sqrt(dx * dx + dy * dy);
    }

    return distance;
}

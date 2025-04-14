import { ActivationFunctions, Glorot, IMlpGraph, LayerConnectionBuilder, LayerConnectionType, MLPInferenceRuntime, MlpSynapse, PerceptronBuilder, SynapseBuilder } from "spikypanda-core";
import { ICreatureBrain } from "./bestioles.interfaces";


export class CreatureBrain implements ICreatureBrain {
    static createCreatureGraph(): IMlpGraph {
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

    private _graph: IMlpGraph;
    private _runtime: MLPInferenceRuntime;

    public constructor(other?: ICreatureBrain) {
        if (other) {
            this._graph = other.graph.clone();
        } else {
            this._graph = CreatureBrain.createCreatureGraph();
        }
        this._runtime = new MLPInferenceRuntime(this._graph);
    }

    public get graph(): IMlpGraph {
        return this._graph;
    }

    public get runtime(): MLPInferenceRuntime {
        return this._runtime;
    }

    public evaluate(inputs: number[]): number[] {
        return this._runtime.run(inputs);
    }

    public mutate(): void {
        for (const syn of this._graph.links) {
            syn.weight += (Math.random() * 2 - 1) * 0.1; // small mutation
        }
        for (const node of this._graph.nodes) {
            node.bias += (Math.random() * 2 - 1) * 0.05;
        }
    }

    public evaluateAndTrack(inputSequence: number[][]): {
        trajectory: { x: number, y: number }[],
        fitness: number
    } {
        const trajectory: { x: number, y: number }[] = [];
        let position = { x: 0, y: 0 };
        let fitness = 0;
    
        for (const inputs of inputSequence) {
            const [tx, ty, theta] = this.evaluate(inputs);
            const dx = Math.cos(theta * 2 * Math.PI - Math.PI) * tx;
            const dy = Math.sin(theta * 2 * Math.PI - Math.PI) * ty;
    
            position = {
                x: position.x + dx,
                y: position.y + dy
            };
    
            fitness += Math.sqrt(dx * dx + dy * dy);
            trajectory.push({ ...position });
        }
    
        return { trajectory, fitness };
    }
    
}

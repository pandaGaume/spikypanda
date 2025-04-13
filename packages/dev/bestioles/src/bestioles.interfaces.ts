import { IMlpGraph, MLPInferenceRuntime } from "spikypanda-core";

export interface ICreatureBrain {
    graph: IMlpGraph;
    runtime: MLPInferenceRuntime;
    evaluate(inputs: number[]): number[];
    mutate(): void;
}

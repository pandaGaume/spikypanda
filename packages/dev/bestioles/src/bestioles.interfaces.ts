import { IMlpGraph, MLPInferenceRuntime } from "spikypanda-core";

export interface IWorldBounds {
    width: number;
    height: number;
    depth: number;
}

export interface ICreatureBrain {
    graph: IMlpGraph;
    runtime: MLPInferenceRuntime;
    evaluate(sensors: number[]): number[];
    mutate(): void;
}

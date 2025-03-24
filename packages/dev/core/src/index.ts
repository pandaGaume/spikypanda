export * from "./types";
export * from "./geometry";
export * from "./graph";
export * from "./layout";
export * from "./neuralnetwork";

// ensure that the global namespace is defined
if (typeof window !== "undefined") {
    (<any>window).SPIKYPANDA = (<any>window).SPIKYPANDA || {};

    // Assign S only if it is not already defined
    if (!(<any>window).S) {
        (<any>window).S = (<any>window).SPIKYPANDA;
    }
}

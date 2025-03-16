export * from "./types";
export * from "./geometry";
export * from "./graph";

(<any>window).SPIKYPANDA = (<any>window).SPIKYPANDA || {};

// Assign S only if it is not already defined
if (!(<any>window).S) {
    (<any>window).S = (<any>window).SPIKYPANDA;
}

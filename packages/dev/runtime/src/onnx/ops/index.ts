export { registerMathOps } from "./math";
export { registerActivationOps } from "./activations";
export { registerMatrixOps } from "./matrix";
export { registerConvOps } from "./conv";
export { registerNormOps } from "./normalization";
export { registerRecurrentOps } from "./recurrent";
export { registerMiscOps } from "./misc";
export { registerSpikyPandaOps } from "./spikypanda";
export { registerDspOps, enroll, serializeTemplate, deserializeTemplate, templateToTensor } from "./dsp";
export type { MfccParams, DtwTemplate } from "./dsp";

import { OnnxOpRegistry } from "../registry";
import { registerMathOps } from "./math";
import { registerActivationOps } from "./activations";
import { registerMatrixOps } from "./matrix";
import { registerConvOps } from "./conv";
import { registerNormOps } from "./normalization";
import { registerRecurrentOps } from "./recurrent";
import { registerMiscOps } from "./misc";
import { registerSpikyPandaOps } from "./spikypanda";
import { registerDspOps } from "./dsp";

/**
 * Create a registry with all generic ONNX ops registered.
 */
export function createDefaultRegistry(): OnnxOpRegistry {
    const registry = new OnnxOpRegistry();
    registerMathOps(registry);
    registerActivationOps(registry);
    registerMatrixOps(registry);
    registerConvOps(registry);
    registerNormOps(registry);
    registerRecurrentOps(registry);
    registerMiscOps(registry);
    registerDspOps(registry);
    return registry;
}

/**
 * Create a registry with all ops + SpikyPanda native overrides at higher priority.
 */
export function createSpikyPandaRegistry(): OnnxOpRegistry {
    const registry = createDefaultRegistry();
    registerSpikyPandaOps(registry);
    return registry;
}

export { registerMathOps } from "./math";
export { registerActivationOps } from "./activations";
export { registerMatrixOps } from "./matrix";
export { registerConvOps, ConvNode } from "./conv";
export { registerNormOps } from "./normalization";
export { registerRecurrentOps } from "./recurrent";
export { registerMiscOps } from "./misc";
export { registerDotVisionOps } from "./ext/vendors/dotvision";
export { registerCyanMyceliumOps, ConvWioNode } from "./ext/vendors/cyanmycelium";
export { registerDspOps, enroll, serializeTemplate, deserializeTemplate, templateToTensor } from "./dsp";
export type { MfccParams, DtwTemplate } from "./dsp";
export { registerQuantOps } from "./quant";

import { OnnxOpRegistry } from "../registry";
import { registerMathOps } from "./math";
import { registerActivationOps } from "./activations";
import { registerMatrixOps } from "./matrix";
import { registerConvOps } from "./conv";
import { registerNormOps } from "./normalization";
import { registerRecurrentOps } from "./recurrent";
import { registerMiscOps } from "./misc";
import { registerDotVisionOps } from "./ext/vendors/dotvision";
import { registerCyanMyceliumOps } from "./ext/vendors/cyanmycelium";
import { registerDspOps } from "./dsp";
import { registerQuantOps } from "./quant";

/**
 * Create a registry pre-populated with the canonical implementation of
 * every supported op. There is one implementation per op (no priority
 * overrides): Conv comes from conv.ts, Gemm from math.ts, LSTM/GRU
 * from recurrent.ts, DSP-specific SpikyPanda ops from dsp.ts, etc.
 *
 * Domain extensions are also registered so research use-cases work out
 * of the box without a second factory: DotVision MCSA, and CyanMycelium
 * whose ConvWIO carries convolution weights already permuted to the
 * layout its embedded kernel reads.
 */
export function createRegistry(): OnnxOpRegistry {
    const registry = new OnnxOpRegistry();
    registerMathOps(registry);
    registerActivationOps(registry);
    registerMatrixOps(registry);
    registerConvOps(registry);
    registerNormOps(registry);
    registerRecurrentOps(registry);
    registerMiscOps(registry);
    registerDspOps(registry);
    registerQuantOps(registry);
    registerDotVisionOps(registry);
    registerCyanMyceliumOps(registry);
    return registry;
}

/** @deprecated Use createRegistry(). Kept as an alias for back-compat. */
export const createDefaultRegistry = createRegistry;
/** @deprecated Use createRegistry(). Kept as an alias for back-compat. */
export const createSpikyPandaRegistry = createRegistry;

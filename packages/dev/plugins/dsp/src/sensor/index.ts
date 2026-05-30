import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createTransducerNode, TransducerNode } from "./transducer.node.js";

export { TransducerNode, createTransducerNode };

/**
 * `DSP.Sensor` — generic signal-conditioning models.
 *
 *   transducer  generic 1st-order LPF + Gaussian noise + quantization +
 *               linear drift, configurable per sensor type. Use as a
 *               sensor stand-in: feed the true value, get a realistic
 *               noisy/lagged/quantized reading.
 *
 * Sits in plugin-dsp because it's signal-side processing (same family
 * as DSP.Filter and DSP.Window) — the "what physical instrument" framing
 * (thermocouple, pressure, flow) becomes thin wrappers on top of the
 * generic transducer with sensible default editables.
 */
export const dspSensorSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("DSP.Sensor:transducer", () => createTransducerNode() as never, {
            label: "Transducer",
            category: "DSP.Sensor",
            inputPorts: [
                { slot: "value", optional: false, type: "float" },
                { slot: "t", optional: true, type: "float" },
            ],
            outputPorts: [{ slot: "measured", optional: false, type: "float" }],
        });
    },
};

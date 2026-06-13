import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createDaqNode, DaqNode } from "./daq.node.js";

export { DaqNode, createDaqNode };

/**
 * `DSP.Acquire` - block-based data acquisition.
 *
 * V1 ships one node:
 *   daq   generic DAQ front-end with its OWN sim-time sampling clock,
 *         decoupled from the session tick rate. Samples the
 *         (optionally anti-aliased) `value` line at sample_rate_hz
 *         and publishes fixed-size blocks (tensor + block RMS) every
 *         block_size / sample_rate_hz seconds of SIM time. Defaults
 *         implement the IEC 61430 / 61407 acquisition profile as
 *         specified by the project owner: 10.24 kHz, 200 ms blocks,
 *         2048 samples (fs / N = 5 Hz spectral resolution).
 *
 * Pure runtime nodes (not ONNX-backed): like DSP.Stream, this family
 * is about streaming acquisition mechanics, not batch tensor math.
 */
export const dspAcquireSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("DSP.Acquire:daq", () => createDaqNode() as never, {
            label: "DAQ (block acquisition)",
            docPath: {
                "en-US": ctx.assetUrl("docs/dsp/acquire/daq.en-US.md"),
                "fr-FR": ctx.assetUrl("docs/dsp/acquire/daq.fr-FR.md"),
            },
            category: "DSP.Acquire",
            inputPorts: [{ slot: "value", optional: true, type: "float" }],
            outputPorts: [
                { slot: "block", optional: false, type: "tensor", capacity: 4 },
                { slot: "rms", optional: true, type: "float", capacity: 4 },
            ],
        });
    },
};

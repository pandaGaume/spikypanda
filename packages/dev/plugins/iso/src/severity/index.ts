import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createIso20816SeverityNode, Iso20816SeverityNode } from "./iso20816.node.js";

export { Iso20816SeverityNode, createIso20816SeverityNode };
export * from "./iso20816.js"; // pure numerics + types (assessSeverity, classifyZone, ...)

/**
 * `ISO.Severity`: standards-anchored vibration-severity assessment.
 *
 * V1 ships one node:
 *   iso20816   ISO 20816-3 broadband velocity-RMS severity (zone A/B/C/D)
 *              over the 10-1000 Hz band, reading the signal's unit tag and
 *              refusing (never guessing) on undeclared units / undersampling /
 *              out-of-scope machines.
 *
 * The pure `assessSeverity` / `classifyZone` are exported so headless pipelines
 * can grade without instantiating a graph.
 */
export const isoSeveritySubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("ISO.Severity:iso20816", () => createIso20816SeverityNode() as never, {
            label: "ISO 20816-3 Severity",
            docPath: ctx.assetUrl("docs/iso/severity/iso20816.md"),
            category: "ISO.Severity",
            inputPorts: [{ slot: "signal", optional: false, type: "tensor" }],
            outputPorts: [
                { slot: "assessment", optional: false, type: "any", capacity: 4 },
                { slot: "rms_mm_s", optional: false, type: "float" },
                { slot: "zone", optional: false, type: "float" },
            ],
        });
    },
};

/**
 * enrichNodeDefFromMeta: the load-path counterpart of the palette-drop
 * NodeDef construction. A saved graph only carries port name/type
 * lists (whose ORDER its connections index into); the registry meta is
 * the source of truth for split-view anchors, authoritative port
 * types, control ports, variadic descriptors and standards.
 *
 * Regression target: a loaded Feedback Channel must keep its two
 * anchors (anchorCount) and per-port anchor routing, and a stale saved
 * port type (e.g. DSP.Stream:buffer "value" saved as "float" before it
 * was widened to "any") must be overridden by the meta.
 */
import type { INodeMeta } from "spikypanda-core";
import { enrichNodeDefFromMeta } from "../../dev/nodeeditor/src/node-def";
import type { NodeDef } from "../../dev/nodeeditor/src/types";

const FEEDBACK_META: INodeMeta = {
    type: "Control.Feedback:channel",
    label: "Feedback Channel",
    category: "Control.Feedback",
    anchorCount: 2,
    inputPorts: [{ slot: "input", optional: true, type: "any", anchor: 0 } as never],
    outputPorts: [{ slot: "output", optional: false, type: "any", anchor: 1 } as never],
};

const BUFFER_META: INodeMeta = {
    type: "DSP.Stream:buffer",
    label: "Scalar Buffer",
    category: "DSP.Stream",
    inputPorts: [{ slot: "value", optional: true, type: "any" }],
    outputPorts: [{ slot: "frame", optional: false, type: "tensor" }],
};

const MUX_META: INodeMeta = {
    type: "DSP.Stream:mux",
    label: "Channel Mux",
    category: "DSP.Stream",
    inputPorts: [{ slot: "in_0", optional: true, type: "float" }],
    outputPorts: [{ slot: "frame", optional: false, type: "tensor" }],
    variadicInput: { prefix: "in_", type: "float" },
};

function fileDef(partial: Partial<NodeDef> & Pick<NodeDef, "inputs" | "outputs">): NodeDef {
    return { label: "n", ...partial } as NodeDef;
}

describe("enrichNodeDefFromMeta", () => {
    test("split-view: anchorCount and per-port anchor routing come back from the meta", () => {
        const def = fileDef({
            typeId: "Control.Feedback:channel",
            inputs: [{ name: "input", type: "any" }],
            outputs: [{ name: "output", type: "any" }],
        });
        const enriched = enrichNodeDefFromMeta(def, FEEDBACK_META);
        expect(enriched.anchorCount).toBe(2);
        expect((enriched.inputs[0] as { anchor?: number }).anchor).toBe(0);
        expect((enriched.outputs[0] as { anchor?: number }).anchor).toBe(1);
    });

    test("stale saved port type is overridden by the meta (buffer value float -> any)", () => {
        const def = fileDef({
            typeId: "DSP.Stream:buffer",
            inputs: [{ name: "value", type: "float" }],
            outputs: [{ name: "frame", type: "tensor" }],
        });
        const enriched = enrichNodeDefFromMeta(def, BUFFER_META);
        expect(enriched.inputs[0].type).toBe("any");
        expect(enriched.outputs[0].type).toBe("tensor");
    });

    test("grown variadic ports unknown to the meta keep their file order and type", () => {
        const def = fileDef({
            typeId: "DSP.Stream:mux",
            inputs: [
                { name: "in_0", type: "float" },
                { name: "in_1", type: "float" },
                { name: "in_2", type: "float" },
            ],
            outputs: [{ name: "frame", type: "tensor" }],
        });
        const enriched = enrichNodeDefFromMeta(def, MUX_META);
        expect(enriched.inputs.map((p) => p.name)).toEqual(["in_0", "in_1", "in_2"]);
        expect(enriched.inputs.every((p) => p.type === "float")).toBe(true);
        expect(enriched.variadicInput).toEqual({ prefix: "in_", type: "float" });
    });

    test("control ports: runtime instance wins, then meta, then the _enable default", () => {
        const def = fileDef({ inputs: [], outputs: [] });
        const fromDefault = enrichNodeDefFromMeta(def, BUFFER_META);
        expect(fromDefault.controlInputs).toEqual([{ name: "_enable", type: "boolean" }]);
        expect(fromDefault.controlOutputs).toEqual([{ name: "_enabled", type: "boolean" }]);

        const runtime = {
            controlInputPorts: [
                { slot: "_enable", type: "boolean" },
                { slot: "_start", type: "trigger" },
            ],
            controlOutputPorts: [{ slot: "_enabled", type: "boolean" }],
        };
        const fromRuntime = enrichNodeDefFromMeta(def, BUFFER_META, runtime as never);
        expect(fromRuntime.controlInputs).toEqual([
            { name: "_enable", type: "boolean" },
            { name: "_start", type: "trigger" },
        ]);
    });

    test("file-side overrides are preserved (label, color, existing anchorCount)", () => {
        const def = fileDef({
            label: "Custom name",
            color: "#5A8B5A",
            anchorCount: 3,
            inputs: [{ name: "input", type: "any" }],
            outputs: [{ name: "output", type: "any" }],
        });
        const enriched = enrichNodeDefFromMeta(def, FEEDBACK_META);
        expect(enriched.label).toBe("Custom name");
        expect(enriched.color).toBe("#5A8B5A");
        expect(enriched.anchorCount).toBe(3);
    });
});

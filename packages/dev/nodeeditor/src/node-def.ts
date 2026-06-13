import type { INodeMeta, IRuntimeNode } from "spikypanda-core";
import type { NodeDef, PortDef, PortType } from "./types";

/**
 * Enrich a file-derived NodeDef with the registry's metadata for the
 * same typeId. Pure function, unit-testable without any DOM.
 *
 * Why enrichment and not replacement: a saved graph is the ONLY source
 * of truth for the PORT ORDER its connections index into (variadic
 * groups may have grown extra ports, e.g. a Channel Mux saved with
 * in_0..in_2), so the file's port lists must be kept as-is. But the
 * registry metadata is the only source of truth for everything the
 * save format does not carry:
 *
 *   - `anchorCount` and the per-port `anchor` routing of split-view
 *     nodes (Feedback Channel renders as two half-widgets; without
 *     this a loaded feedback collapses into one box and the loop
 *     wires the split view exists to hide get fully drawn),
 *   - the authoritative port TYPE (a stale save keeps the type a port
 *     had when it was written; the registry reflects the node as it
 *     is compiled today, e.g. DSP.Stream:buffer's `value` widened
 *     from "float" to "any" when it learned tensor rows),
 *   - control-plane ports (sourced from the live runtime instance
 *     when available, mirroring the palette-drop path),
 *   - variadic descriptors and standards badges.
 *
 * Ports present in the file but unknown to the metadata (grown
 * variadic ports, legacy extras) are preserved untouched.
 */
export function enrichNodeDefFromMeta(def: NodeDef, meta: INodeMeta, runtimeNode?: IRuntimeNode | null): NodeDef {
    const inMeta = new Map(meta.inputPorts.map((p) => [String(p.slot), p]));
    const outMeta = new Map(meta.outputPorts.map((p) => [String(p.slot), p]));

    const enrich = (ports: ReadonlyArray<Omit<PortDef, "direction">>, lookup: Map<string, { type?: string; anchor?: number }>) =>
        ports.map((p) => {
            const m = lookup.get(p.name);
            if (!m) return p;
            return { ...p, type: (m.type ?? p.type) as PortType, anchor: m.anchor };
        });

    // Control ports: prefer the live runtime instance (RunnableNode
    // adds _start/_stop on top of the base _enable), then the meta
    // declaration, then the conservative default. Same precedence as
    // the host's palette-drop path.
    const rn = runtimeNode as
        | { controlInputPorts?: ReadonlyArray<{ slot: string | number; type?: string }>; controlOutputPorts?: ReadonlyArray<{ slot: string | number; type?: string }> }
        | null
        | undefined;
    const ctrlIn = rn?.controlInputPorts ?? meta.controlInputPorts ?? [{ slot: "_enable", type: "boolean" }];
    const ctrlOut = rn?.controlOutputPorts ?? meta.controlOutputPorts ?? [{ slot: "_enabled", type: "boolean" }];
    const toPortDefs = (ports: ReadonlyArray<{ slot: string | number; type?: string }>) => ports.map((p) => ({ name: String(p.slot), type: (p.type ?? "boolean") as PortType }));

    return {
        ...def,
        inputs: enrich(def.inputs, inMeta),
        outputs: enrich(def.outputs, outMeta),
        controlInputs: def.controlInputs ?? toPortDefs(ctrlIn),
        controlOutputs: def.controlOutputs ?? toPortDefs(ctrlOut),
        // INodeMeta declares variadic port types as plain strings; the
        // editor narrows them to PortType (same values, looser source).
        variadicInput: def.variadicInput ?? (meta.variadicInput as NodeDef["variadicInput"]),
        variadicOutput: def.variadicOutput ?? (meta.variadicOutput as NodeDef["variadicOutput"]),
        standards: def.standards ?? meta.standards?.map((s) => (typeof s === "string" ? s : s.id)),
        anchorCount: def.anchorCount ?? meta.anchorCount,
    };
}

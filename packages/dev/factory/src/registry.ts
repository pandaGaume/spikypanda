/**
 * The node registry a job runs against: every plugin the demo graphs use,
 * activated against a context that has no editor and no DOM.
 *
 * What differs from the editor's registry, and why:
 *
 *   - Geometry nodes are registered from their classes, not through the
 *     plugin index: that index also registers the attitude-3d editor, which
 *     pulls a 3D engine into a process that draws nothing. The port
 *     declarations mirror the plugin's, so a document saved by the editor
 *     resolves identically.
 *   - Viz.Plot:* nodes are stubs that drain their input. Their real
 *     implementations collect for a repaint that never happens headless;
 *     draining keeps the channel semantics (a plot is a consumer) without
 *     the rendering libraries.
 *   - Lifecycle Start / Stop come from the same registration the editor
 *     uses, so a saved marker keeps its typeId.
 */
import { LinkRegistry, NodeRegistry, RuntimeNode } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import physicsPlugin from "spikypanda-plugin-physics";
import dspPlugin from "spikypanda-plugin-dsp";
import mlPlugin from "spikypanda-plugin-ml";
import logicPlugin from "spikypanda-plugin-logic";
import controlPlugin from "spikypanda-plugin-control";
import onnxPlugin from "spikypanda-plugin-onnx";
import { registerLifecycleNodes } from "spikypanda-nodeeditor/lifecycle-nodes";
import { Cartesian3Node } from "spikypanda-plugin-geometry/nodes/cartesian3";
import { Cartesian3SplitNode } from "spikypanda-plugin-geometry/nodes/cartesian3-split";
import { Transform as GeometryTransform } from "spikypanda-plugin-geometry/nodes/transform";
import { Attitude as GeometryAttitude } from "spikypanda-plugin-geometry/nodes/attitude";

/** Consumes anything on its single input; stands in for Viz.Plot:*. */
class VizStubNode extends RuntimeNode {
    public consumed = 0;

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                session.consume(idx);
                this.consumed++;
            }
        }
    }
}

interface IPluginModule {
    subPlugins?: Record<string, { activate(ctx: unknown): void }>;
    activate?(ctx: unknown): void;
}

const FLOAT_IN = { optional: true, type: "float" } as const;

/** Build the registry every job instantiates its document against. */
export function buildJobRegistry(): NodeRegistry {
    const nodes = new NodeRegistry();
    const links = new LinkRegistry();
    const ctx = {
        id: "spikypanda-factory",
        nodes,
        links,
        editors: { register: () => undefined },
        assetUrl: (p: string) => p,
    };
    const plugins: IPluginModule[] = [physicsPlugin, dspPlugin, mlPlugin, logicPlugin, controlPlugin, onnxPlugin as unknown as IPluginModule];
    for (const plugin of plugins) {
        if (plugin.subPlugins) {
            for (const sub of Object.values(plugin.subPlugins)) sub.activate(ctx);
        } else if (typeof plugin.activate === "function") {
            plugin.activate(ctx);
        }
    }
    registerLifecycleNodes(nodes);

    nodes.register("spk.geometry:cartesian3", () => new Cartesian3Node() as never, {
        label: "Cartesian3",
        category: "geometry",
        inputPorts: [
            { slot: "x", ...FLOAT_IN },
            { slot: "y", ...FLOAT_IN },
            { slot: "z", ...FLOAT_IN },
        ],
        outputPorts: [{ slot: "vec3", optional: false, type: "vec3" }],
    });
    nodes.register("spk.geometry:cartesian3-split", () => new Cartesian3SplitNode() as never, {
        label: "Cartesian3 Split",
        category: "geometry",
        inputPorts: [{ slot: "vec3", optional: true, type: "vec3" }],
        outputPorts: [
            { slot: "x", optional: false, type: "float" },
            { slot: "y", optional: false, type: "float" },
            { slot: "z", optional: false, type: "float" },
        ],
    });
    nodes.register("spk.geometry:transform", () => new GeometryTransform() as never, {
        label: "Transform",
        category: "geometry",
        inputPorts: [
            { slot: "translation", optional: true, type: "vec3" },
            { slot: "rotation", optional: true, type: "vec4" },
        ],
        outputPorts: [{ slot: "matrix", optional: false, type: "matrix44" }],
    });
    nodes.register("spk.geometry:attitude", () => new GeometryAttitude() as never, {
        label: "Attitude",
        category: "geometry",
        inputPorts: [
            { slot: "yaw", ...FLOAT_IN },
            { slot: "pitch", ...FLOAT_IN },
            { slot: "roll", ...FLOAT_IN },
        ],
        outputPorts: [{ slot: "rotation", optional: false, type: "vec4" }],
    });

    // Port slot per plot type matches the viz plugin: line consumes `value`
    // (a scalar f(t)); spectrum / waterfall consume `magnitudes` (an FFT frame).
    const vizPorts: Record<string, string> = { "Viz.Plot:line": "value", "Viz.Plot:spectrum": "magnitudes", "Viz.Plot:waterfall": "magnitudes" };
    for (const [typeId, slot] of Object.entries(vizPorts)) {
        nodes.register(typeId, () => new VizStubNode() as never, {
            label: `${typeId} (headless stub)`,
            category: "Viz.Plot",
            inputPorts: [{ slot, optional: true, type: "any" }],
            outputPorts: [],
        });
    }
    return nodes;
}

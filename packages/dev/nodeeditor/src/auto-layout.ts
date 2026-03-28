import type { NodeEditor } from "./editor.js";

const COL_WIDTH = 220;
const ROW_HEIGHT = 80;
const PADDING_X = 60;
const PADDING_Y = 60;

export type LayoutStrategy = (editor: NodeEditor) => void;

/**
 * Default topological layered layout (simplified Sugiyama).
 * Assigns layers via Kahn's algorithm, then positions nodes in columns.
 */
export function defaultLayout(editor: NodeEditor): void {
    if (editor.nodes.length === 0) return;

    // Build adjacency: nodeId → set of successor nodeIds
    const successors = new Map<string, Set<string>>();
    const predecessors = new Map<string, Set<string>>();
    for (const n of editor.nodes) {
        successors.set(n.id, new Set());
        predecessors.set(n.id, new Set());
    }

    for (const c of editor.connections) {
        const fromNode = editor.nodes.find((n) => n.outputs.includes(c.from));
        const toNode = editor.nodes.find((n) => n.inputs.includes(c.to));
        if (fromNode && toNode && fromNode.id !== toNode.id) {
            successors.get(fromNode.id)!.add(toNode.id);
            predecessors.get(toNode.id)!.add(fromNode.id);
        }
    }

    // Kahn's algorithm → layer assignment
    const inDegree = new Map<string, number>();
    for (const n of editor.nodes) {
        inDegree.set(n.id, predecessors.get(n.id)!.size);
    }

    const layers: string[][] = [];
    const remaining = new Set(editor.nodes.map((n) => n.id));

    while (remaining.size > 0) {
        const layer: string[] = [];
        for (const id of remaining) {
            if (inDegree.get(id)! <= 0) {
                layer.push(id);
            }
        }

        if (layer.length === 0) {
            // Cycle detected — place all remaining in one layer
            layers.push([...remaining]);
            break;
        }

        // Sort within layer by original node order for stability
        layer.sort((a, b) => {
            const ia = editor.nodes.findIndex((n) => n.id === a);
            const ib = editor.nodes.findIndex((n) => n.id === b);
            return ia - ib;
        });

        layers.push(layer);

        for (const id of layer) {
            remaining.delete(id);
            for (const succ of successors.get(id)!) {
                inDegree.set(succ, inDegree.get(succ)! - 1);
            }
        }
    }

    // Position nodes
    const nodeMap = new Map(editor.nodes.map((n) => [n.id, n]));
    for (let col = 0; col < layers.length; col++) {
        const layer = layers[col];
        for (let row = 0; row < layer.length; row++) {
            const node = nodeMap.get(layer[row]);
            if (node) {
                node.setPosition(
                    PADDING_X + col * COL_WIDTH,
                    PADDING_Y + row * ROW_HEIGHT,
                );
            }
        }
    }

    editor.updateConnections();
}

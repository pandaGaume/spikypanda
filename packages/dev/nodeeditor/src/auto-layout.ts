import type { NodeEditor } from "./editor.js";
import type { NodeUI } from "./node-ui.js";
import type { NodeDef } from "./types.js";

const COL_GAP = 60;
const NODE_GAP = 30;
const PADDING_X = 60;
const PADDING_Y = 60;
const MIN_NODE_HEIGHT = 60;
const MIN_COL_WIDTH = 200;
const CLONE_OPACITY = 0.65;

export type LayoutStrategy = (editor: NodeEditor) => void;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reliable node height — forces reflow, uses a sane minimum. */
function nodeHeight(node: NodeUI): number {
    // Force layout reflow so the browser computes the real size
    const h = node.el.getBoundingClientRect().height;
    return Math.max(h, MIN_NODE_HEIGHT);
}

/** Reliable node width. */
function nodeWidth(node: NodeUI): number {
    return node.el.getBoundingClientRect().width;
}

/**
 * Reconstruct a NodeDef from an existing NodeUI so we can create clones.
 */
function nodeDefFrom(node: NodeUI): NodeDef {
    return {
        label: node.label,
        color: node.color,
        inputs: node.inputs.map((p) => ({ name: p.name, type: p.type })),
        outputs: node.outputs.map((p) => ({ name: p.name, type: p.type })),
    };
}

/**
 * Duplicate leaf-input nodes that feed multiple consumers.
 * Each consumer gets its own clone so that long cross-graph links disappear.
 * The original node is removed after clones take over all its connections.
 * Clones are rendered at reduced opacity so users can tell them apart from
 * unique nodes.
 */
function duplicateLeafInputs(editor: NodeEditor): void {
    // Snapshot the current nodes — we'll mutate the list
    const snapshot = [...editor.nodes];

    for (const node of snapshot) {
        // Only leaf inputs (no incoming connections)
        const hasIncoming = editor.connections.some((c) =>
            node.inputs.some((p) => c.to === p),
        );
        if (hasIncoming) continue;

        // Collect outgoing connections grouped per consumer node
        const outConns = editor.connections.filter((c) =>
            node.outputs.some((p) => c.from === p),
        );
        if (outConns.length <= 1) continue; // single consumer — no need to duplicate

        const def = nodeDefFrom(node);

        // For each outgoing connection, create a clone and redirect
        for (const conn of outConns) {
            // Find which output port index was used
            const outIdx = node.outputs.indexOf(conn.from);
            if (outIdx < 0) continue;

            // Create clone
            const clone = editor.addNode(def, node.x, node.y);
            clone.el.style.opacity = String(CLONE_OPACITY);

            // Connect clone's matching output → same consumer input
            editor.connect(clone.outputs[outIdx], conn.to);

            // Remove original connection
            editor.removeConnection(conn);
        }

        // Remove the now-disconnected original
        editor.removeNode(node);
    }
}

/** Build adjacency maps from connections. */
function buildAdjacency(editor: NodeEditor) {
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
    return { successors, predecessors };
}

/** Kahn's algorithm — assign nodes to layers (columns). */
function assignLayers(
    editor: NodeEditor,
    successors: Map<string, Set<string>>,
    predecessors: Map<string, Set<string>>,
): string[][] {
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
            // Cycle — dump remaining into one layer
            layers.push([...remaining]);
            break;
        }

        // Stable sort by original node order
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

    return layers;
}

/**
 * Move leaf inputs (no predecessors, e.g. constants / initializers) to the
 * layer immediately before their earliest consumer.  This avoids piling
 * every input in layer 0 when it only feeds a single node deeper in the
 * graph.  Nodes that feed multiple consumers at different depths stay in
 * the earliest required layer so they never appear *after* a consumer.
 */
function promoteLeafInputs(
    layers: string[][],
    successors: Map<string, Set<string>>,
    predecessors: Map<string, Set<string>>,
): void {
    // Build a quick id → layer-index lookup
    const layerOf = new Map<string, number>();
    for (let i = 0; i < layers.length; i++) {
        for (const id of layers[i]) {
            layerOf.set(id, i);
        }
    }

    // Collect leaf-input ids that sit in a layer earlier than necessary
    const toMove: { id: string; from: number; to: number }[] = [];

    for (let li = 0; li < layers.length; li++) {
        for (const id of layers[li]) {
            const preds = predecessors.get(id)!;
            if (preds.size > 0) continue; // not a leaf input

            const succs = successors.get(id)!;
            if (succs.size === 0) continue; // isolated node — leave it

            // Find the earliest consumer layer
            let minSuccLayer = layers.length;
            for (const s of succs) {
                const sl = layerOf.get(s)!;
                if (sl < minSuccLayer) minSuccLayer = sl;
            }

            const targetLayer = minSuccLayer - 1;
            if (targetLayer > li) {
                toMove.push({ id, from: li, to: targetLayer });
            }
        }
    }

    // Apply moves
    for (const { id, from, to } of toMove) {
        const idx = layers[from].indexOf(id);
        if (idx !== -1) {
            layers[from].splice(idx, 1);
            layers[to].push(id);
            layerOf.set(id, to);
        }
    }

    // Remove any layers that became empty
    for (let i = layers.length - 1; i >= 0; i--) {
        if (layers[i].length === 0) {
            layers.splice(i, 1);
        }
    }
}

/**
 * Barycenter heuristic — reorder nodes within each layer to reduce
 * edge crossings by sorting on the average position of connected
 * neighbors in the adjacent layer.
 *
 * When a node has no neighbors in the primary direction (e.g. a leaf
 * input during the forward sweep), the opposite direction is used as
 * fallback so that constants/initializers get sorted by the position
 * of the consumer they feed into.
 */
function barycenterOrdering(
    layers: string[][],
    successors: Map<string, Set<string>>,
    predecessors: Map<string, Set<string>>,
    sweeps = 4,
): void {
    const posInLayer = new Map<string, number>();

    const updatePositions = () => {
        for (const layer of layers) {
            for (let i = 0; i < layer.length; i++) {
                posInLayer.set(layer[i], i);
            }
        }
    };

    const avgPos = (id: string, neighbors: Map<string, Set<string>>): number | undefined => {
        const nbrs = neighbors.get(id);
        if (!nbrs || nbrs.size === 0) return undefined;
        let sum = 0;
        let count = 0;
        for (const nbr of nbrs) {
            const pos = posInLayer.get(nbr);
            if (pos !== undefined) {
                sum += pos;
                count++;
            }
        }
        return count > 0 ? sum / count : undefined;
    };

    const sortByBarycenter = (
        layer: string[],
        primary: Map<string, Set<string>>,
        fallback: Map<string, Set<string>>,
    ) => {
        const bary = new Map<string, number>();
        for (const id of layer) {
            const val = avgPos(id, primary) ?? avgPos(id, fallback) ?? (posInLayer.get(id) ?? 0);
            bary.set(id, val);
        }
        layer.sort((a, b) => bary.get(a)! - bary.get(b)!);
    };

    for (let s = 0; s < sweeps; s++) {
        updatePositions();
        // Forward sweep: order layer[i] by predecessors, fallback to successors
        for (let i = 1; i < layers.length; i++) {
            sortByBarycenter(layers[i], predecessors, successors);
        }
        updatePositions();
        // Backward sweep: order layer[i] by successors, fallback to predecessors
        for (let i = layers.length - 2; i >= 0; i--) {
            sortByBarycenter(layers[i], successors, predecessors);
        }
    }
}

/**
 * Position nodes using actual DOM dimensions.
 * Column widths adapt to the widest node in each layer.
 * Vertical spacing uses real node heights.
 * Shorter layers are vertically centered.
 */
function positionNodes(
    layers: string[][],
    nodeMap: Map<string, NodeUI>,
): void {
    // Compute per-layer column widths (widest node + gap)
    const colWidths: number[] = [];
    for (const layer of layers) {
        let maxW = MIN_COL_WIDTH;
        for (const id of layer) {
            const w = nodeWidth(nodeMap.get(id)!);
            if (w > maxW) maxW = w;
        }
        colWidths.push(maxW);
    }

    // Compute X offset for each layer (cumulative widths + gaps)
    const colX: number[] = [];
    let xAccum = PADDING_X;
    for (let col = 0; col < layers.length; col++) {
        colX.push(xAccum);
        xAccum += colWidths[col] + COL_GAP;
    }

    // Compute per-layer total heights
    const layerHeights: number[] = [];
    for (const layer of layers) {
        let totalH = 0;
        for (const id of layer) {
            totalH += nodeHeight(nodeMap.get(id)!) + NODE_GAP;
        }
        layerHeights.push(totalH > 0 ? totalH - NODE_GAP : 0);
    }

    const maxHeight = Math.max(...layerHeights, 0);

    // Position each node with vertical centering per layer
    for (let col = 0; col < layers.length; col++) {
        const offsetY = (maxHeight - layerHeights[col]) / 2;
        let y = PADDING_Y + offsetY;
        for (const id of layers[col]) {
            const node = nodeMap.get(id)!;
            node.setPosition(colX[col], y);
            y += nodeHeight(node) + NODE_GAP;
        }
    }
}

/**
 * Reorder ports on each node so that connections don't cross.
 * Input ports are sorted by the Y-position of the source node.
 * Output ports are sorted by the Y-position of the destination node.
 */
function reorderPorts(editor: NodeEditor): void {
    for (const node of editor.nodes) {
        // --- Reorder inputs by source-node Y ---
        if (node.inputs.length > 1) {
            const inputOrder: { portIndex: number; sourceY: number }[] = [];
            for (let i = 0; i < node.inputs.length; i++) {
                const port = node.inputs[i];
                const conn = editor.connections.find((c) => c.to === port);
                if (conn) {
                    const srcNode = editor.nodes.find((n) =>
                        n.outputs.includes(conn.from),
                    );
                    inputOrder.push({
                        portIndex: i,
                        sourceY: srcNode ? srcNode.y : node.y,
                    });
                } else {
                    inputOrder.push({ portIndex: i, sourceY: node.y });
                }
            }
            inputOrder.sort((a, b) => a.sourceY - b.sourceY);
            node.reorderInputs(inputOrder.map((o) => o.portIndex));
        }

        // --- Reorder outputs by destination-node Y ---
        if (node.outputs.length > 1) {
            const outputOrder: { portIndex: number; destY: number }[] = [];
            for (let i = 0; i < node.outputs.length; i++) {
                const port = node.outputs[i];
                // A single output port can feed multiple destinations — use average Y
                const conns = editor.connections.filter((c) => c.from === port);
                if (conns.length > 0) {
                    let sumY = 0;
                    for (const c of conns) {
                        const dstNode = editor.nodes.find((n) =>
                            n.inputs.includes(c.to),
                        );
                        sumY += dstNode ? dstNode.y : node.y;
                    }
                    outputOrder.push({
                        portIndex: i,
                        destY: sumY / conns.length,
                    });
                } else {
                    outputOrder.push({ portIndex: i, destY: node.y });
                }
            }
            outputOrder.sort((a, b) => a.destY - b.destY);
            node.reorderOutputs(outputOrder.map((o) => o.portIndex));
        }
    }
}

// ---------------------------------------------------------------------------
// Public layout
// ---------------------------------------------------------------------------

/**
 * Default topological layered layout (Sugiyama-style).
 *
 * 1. Assign layers via Kahn's algorithm
 * 2. Reduce edge crossings with barycenter heuristic
 * 3. Position using real DOM dimensions + vertical centering
 * 4. Reorder ports to minimize link crossings
 */
export function defaultLayout(editor: NodeEditor): void {
    if (editor.nodes.length === 0) return;

    // Duplicate leaf inputs that fan out to multiple consumers
    duplicateLeafInputs(editor);

    const { successors, predecessors } = buildAdjacency(editor);
    const layers = assignLayers(editor, successors, predecessors);

    // Move leaf inputs (constants, initializers) next to their consumers
    promoteLeafInputs(layers, successors, predecessors);

    // Reduce edge crossings
    barycenterOrdering(layers, successors, predecessors);

    // After ordering, push leaf inputs (constants/initializers) to the top
    // of their layer, sorted among themselves by the position of the
    // successor they feed into (so they visually align with their consumer)
    const posInLayer = new Map<string, number>();
    for (const layer of layers) {
        for (let i = 0; i < layer.length; i++) {
            posInLayer.set(layer[i], i);
        }
    }
    for (const layer of layers) {
        const leaves: string[] = [];
        const nonLeaves: string[] = [];
        for (const id of layer) {
            if (predecessors.get(id)!.size === 0) {
                leaves.push(id);
            } else {
                nonLeaves.push(id);
            }
        }
        // Sort leaves by their successor's position in the next layer
        leaves.sort((a, b) => {
            const succsA = successors.get(a)!;
            const succsB = successors.get(b)!;
            const avgA = succsA.size > 0
                ? [...succsA].reduce((s, id) => s + (posInLayer.get(id) ?? 0), 0) / succsA.size
                : 0;
            const avgB = succsB.size > 0
                ? [...succsB].reduce((s, id) => s + (posInLayer.get(id) ?? 0), 0) / succsB.size
                : 0;
            return avgA - avgB;
        });
        layer.length = 0;
        layer.push(...leaves, ...nonLeaves);
    }

    // Position with real DOM dimensions
    const nodeMap = new Map(editor.nodes.map((n) => [n.id, n]));
    positionNodes(layers, nodeMap);

    // Reorder ports to straighten connections
    reorderPorts(editor);

    editor.updateConnections();
}

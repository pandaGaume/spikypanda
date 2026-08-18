import {
    LIF_NEURON_TYPE_ID,
    LifNeuronNode,
    LinkRegistry,
    NodeRegistry,
    RuntimeGraph,
    RuntimeNode,
    SPIKE_SYNAPSE_TYPE_ID,
    SpikeSynapse,
    materializeSubGraphInto,
    registerSessionSnnTypes,
} from "spikypanda-core";
import type { IDeclaresPorts, IPortDescriptor, IRuntimeNode, ISession, ISpike } from "spikypanda-core";
import { buildSessionFromViewer, disposeChannels } from "../../dev/nodeeditor/src/graph-session-builder";
import { GraphViewer } from "../../dev/nodeeditor/src/components/graph-viewer";
import type { Connection } from "../../dev/nodeeditor/src/connection";
import { UIItemBase } from "../../dev/nodeeditor/src/inspectable";
import type { NodeUI } from "../../dev/nodeeditor/src/node-ui";
import type { NodeDef, PortDef } from "../../dev/nodeeditor/src/types";

interface FakePort {
    name: string;
    type: string;
}

function fakeNode(id: string, data: RuntimeNode, inputs: FakePort[], outputs: FakePort[]) {
    return { id, label: id, typeId: `Test:${id}`, item: { data }, inputs, outputs, controlInputs: [] as FakePort[], controlOutputs: [] as FakePort[] };
}

const SPIKE_SOURCE_TYPE_ID = "Test:scheduled-spike-source";

class ScheduledSpikeSourceNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "spike", type: "spike", optional: true, kind: "stream", capacity: 1024 }];
    public readonly schedule = new Map<number, number[]>();

    public override fire(session: ISession, t: number): void {
        for (const amplitude of this.schedule.get(session.tickIndex) ?? []) {
            const spike: ISpike = { timestamp: t, amplitude, source: this };
            this.publishAll(session, "spike", spike);
        }
    }
}

interface HarnessPort {
    name: string;
    type: string;
    direction: "input" | "output";
    getCenter(): { x: number; y: number };
}

interface HarnessAnchor {
    x: number;
    y: number;
}

interface HarnessNode {
    id: string;
    label: string;
    typeId?: string;
    color?: string;
    inputs: HarnessPort[];
    outputs: HarnessPort[];
    controlInputs: HarnessPort[];
    controlOutputs: HarnessPort[];
    item: UIItemBase<unknown>;
    anchors: HarnessAnchor[];
    readonly x: number;
    readonly y: number;
    setAnchorPosition(index: number, x: number, y: number): void;
}

interface GraphViewerHarnessState {
    nodes: HarnessNode[];
    connections: Connection[];
    svg: SVGSVGElement;
    currentProfile: { connectionStroke: string };
    dashboard: null;
    onConnectionAdded: null;
    clear(): void;
    addNode(def: NodeDef, x: number, y: number): NodeUI;
}

function createGraphViewerLoadHarness(): GraphViewer {
    const viewer = Object.create(GraphViewer.prototype) as GraphViewer;
    const state = viewer as unknown as GraphViewerHarnessState;
    state.nodes = [];
    state.connections = [];
    state.svg = {
        appendChild: () => undefined,
        createSVGPoint: () => ({
            x: 0,
            y: 0,
            matrixTransform: () => ({ x: 0, y: 0 }),
        }),
        getScreenCTM: () => null,
    } as unknown as SVGSVGElement;
    state.currentProfile = { connectionStroke: "#ffffff" };
    state.dashboard = null;
    state.onConnectionAdded = null;
    state.clear = () => {
        state.nodes.length = 0;
        state.connections.length = 0;
    };

    let nextNodeId = 0;
    state.addNode = (def: NodeDef, x: number, y: number): NodeUI => {
        const port = (definition: Omit<PortDef, "direction">, direction: "input" | "output"): HarnessPort => ({
            name: definition.name,
            type: definition.type,
            direction,
            getCenter: () => ({ x: 0, y: 0 }),
        });
        const anchors: HarnessAnchor[] = [{ x, y }];
        const node: HarnessNode = {
            id: `loaded_${nextNodeId++}`,
            label: def.label,
            typeId: def.typeId,
            color: def.color,
            inputs: def.inputs.map((p) => port(p, "input")),
            outputs: def.outputs.map((p) => port(p, "output")),
            controlInputs: (def.controlInputs ?? []).map((p) => port(p, "input")),
            controlOutputs: (def.controlOutputs ?? []).map((p) => port(p, "output")),
            item: new UIItemBase(def.data),
            anchors,
            get x(): number {
                return anchors[0].x;
            },
            get y(): number {
                return anchors[0].y;
            },
            setAnchorPosition(index: number, nextX: number, nextY: number): void {
                anchors[index] = { x: nextX, y: nextY };
            },
        };
        state.nodes.push(node);
        return node as unknown as NodeUI;
    };
    return viewer;
}

function installConnectionDocumentStub(): () => void {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
    const documentStub = {
        createElementNS: () => ({
            setAttribute: () => undefined,
            classList: { add: () => undefined },
            remove: () => undefined,
        }),
    };
    Object.defineProperty(globalThis, "document", { configurable: true, value: documentStub });
    return () => {
        if (previous) {
            Object.defineProperty(globalThis, "document", previous);
        } else {
            delete (globalThis as unknown as { document?: Document }).document;
        }
    };
}

describe("typed links at the runtime boundary", () => {
    test("GraphViewer.save writes link typeId and data beside endpoints", () => {
        const definition = new SpikeSynapse();
        definition.weight = 0.7;
        definition.delay = 2;
        const outPort = { name: "spike", type: "spike", direction: "output" };
        const inPort = { name: "spike", type: "spike", direction: "input" };
        const source = {
            id: "source",
            label: "Source",
            typeId: "Test:source",
            x: 0,
            y: 0,
            anchors: [{}],
            inputs: [],
            outputs: [outPort],
            controlInputs: [],
            controlOutputs: [],
            item: { serialize: () => ({}) },
        };
        const target = {
            id: "target",
            label: "Target",
            typeId: "SNN:lif-neuron",
            x: 100,
            y: 0,
            anchors: [{}],
            inputs: [inPort],
            outputs: [],
            controlInputs: [],
            controlOutputs: [],
            item: { serialize: () => ({}) },
        };
        const connection = {
            from: outPort,
            to: inPort,
            typeId: SPIKE_SYNAPSE_TYPE_ID,
            item: { serialize: () => definition.serialize() },
        };
        const viewer = {
            nodes: [source, target],
            connections: [connection],
            dashboard: null,
            _fromNodeOf: () => source,
            _toNodeOf: () => target,
            _serializeConnEndpoints: () => ({ fromNodeId: "source", fromPortIndex: 0, toNodeId: "target", toPortIndex: 0 }),
        };

        const saved = JSON.parse(GraphViewer.prototype.save.call(viewer as unknown as GraphViewer));
        expect(saved.version).toBe(4);
        expect(saved.model.connections[0]).toMatchObject({
            id: "source:spike->target:spike",
            typeId: SPIKE_SYNAPSE_TYPE_ID,
            data: { weight: 0.7, delay: 2 },
            from: { node: "source", port: "spike" },
            to: { node: "target", port: "spike" },
        });
    });

    test("GraphViewer save/load restores a SpikeSynapse that executes in Session", () => {
        const nodes = new NodeRegistry();
        const links = new LinkRegistry();
        registerSessionSnnTypes(nodes, links);
        nodes.register(SPIKE_SOURCE_TYPE_ID, () => new ScheduledSpikeSourceNode(), {
            label: "Scheduled Spike Source",
            category: "Test",
            inputPorts: [],
            outputPorts: [{ slot: "spike", type: "spike", optional: true, kind: "stream", capacity: 1024 }],
        });

        const sourceDefinition = new ScheduledSpikeSourceNode();
        const neuronDefinition = new LifNeuronNode();
        neuronDefinition.threshold = 0.4;
        const synapseDefinition = new SpikeSynapse();
        synapseDefinition.weight = 0.5;
        synapseDefinition.delay = 2;
        synapseDefinition.plasticity = true;

        const sourcePort = { name: "spike", type: "spike", direction: "output" as const };
        const targetPort = { name: "spike", type: "spike", direction: "input" as const };
        const source = {
            id: "source",
            label: "Source",
            typeId: SPIKE_SOURCE_TYPE_ID,
            x: 20,
            y: 40,
            anchors: [{}],
            inputs: [],
            outputs: [sourcePort],
            controlInputs: [],
            controlOutputs: [],
            item: new UIItemBase<IRuntimeNode>(sourceDefinition),
        };
        const neuron = {
            id: "neuron",
            label: "Neuron",
            typeId: LIF_NEURON_TYPE_ID,
            x: 240,
            y: 40,
            anchors: [{}],
            inputs: [targetPort],
            outputs: [],
            controlInputs: [],
            controlOutputs: [],
            item: new UIItemBase<IRuntimeNode>(neuronDefinition),
        };
        const connection = {
            from: sourcePort,
            to: targetPort,
            typeId: SPIKE_SYNAPSE_TYPE_ID,
            item: new UIItemBase(synapseDefinition),
        };
        const originalViewer = {
            nodes: [source, neuron],
            connections: [connection],
            dashboard: null,
            _fromNodeOf: () => source,
            _toNodeOf: () => neuron,
            _serializeConnEndpoints: () => ({ fromNodeId: "source", fromPortIndex: 0, toNodeId: "neuron", toPortIndex: 0 }),
        };
        const saved = GraphViewer.prototype.save.call(originalViewer as unknown as GraphViewer);

        const loaded = createGraphViewerLoadHarness();
        const restoreDocument = installConnectionDocumentStub();
        try {
            loaded.load(saved, nodes, links);
        } finally {
            restoreDocument();
        }

        expect(loaded.nodes).toHaveLength(2);
        expect(loaded.connections).toHaveLength(1);
        const loadedConnection = loaded.connections[0];
        const loadedDefinition = loadedConnection.item.data as SpikeSynapse;
        expect(loadedConnection.typeId).toBe(SPIKE_SYNAPSE_TYPE_ID);
        expect(loadedDefinition).toBeInstanceOf(SpikeSynapse);
        expect(loadedDefinition).not.toBe(synapseDefinition);
        expect(loadedDefinition).toMatchObject({ weight: 0.5, delay: 2, plasticity: true });
        expect(loadedDefinition.oini).toBeNull();
        expect(loadedDefinition.ofin).toBeNull();

        // This is the same mutation performed by PropertyEditor widgets.
        loadedDefinition.weight = 0.75;
        loadedDefinition.delay = 1;
        loadedDefinition.plasticity = false;
        const editedJson = loaded.save();
        const editedDocument = JSON.parse(editedJson);
        expect(editedDocument.model.connections[0]).toMatchObject({
            typeId: SPIKE_SYNAPSE_TYPE_ID,
            data: { weight: 0.75, delay: 1, plasticity: false },
        });

        const reloaded = createGraphViewerLoadHarness();
        const restoreReloadDocument = installConnectionDocumentStub();
        try {
            reloaded.load(editedJson, nodes, links);
        } finally {
            restoreReloadDocument();
        }
        const reloadedDefinition = reloaded.connections[0].item.data as SpikeSynapse;
        expect(reloadedDefinition).toBeInstanceOf(SpikeSynapse);
        expect(reloadedDefinition).not.toBe(loadedDefinition);
        expect(reloadedDefinition).toMatchObject({ weight: 0.75, delay: 1, plasticity: false });

        const reloadedSource = reloaded.nodes.find((node) => node.typeId === SPIKE_SOURCE_TYPE_ID)?.item.data as ScheduledSpikeSourceNode;
        const reloadedNeuron = reloaded.nodes.find((node) => node.typeId === LIF_NEURON_TYPE_ID)?.item.data as LifNeuronNode;
        expect(reloadedSource).toBeInstanceOf(ScheduledSpikeSourceNode);
        expect(reloadedNeuron).toBeInstanceOf(LifNeuronNode);
        expect(reloadedNeuron.threshold).toBe(0.4);
        reloadedSource.schedule.set(1, [1]);

        const { session, channels } = buildSessionFromViewer(reloaded);
        const runtimeLink = session.graph.links[0] as SpikeSynapse;
        expect(runtimeLink).toBeInstanceOf(SpikeSynapse);
        expect(runtimeLink).not.toBe(reloadedDefinition);
        expect(runtimeLink).toMatchObject({ weight: 0.75, delay: 1, plasticity: false });
        session.run(0);
        expect(session.deferred).toHaveLength(1);
        expect(reloadedNeuron.stateOf(session)?.spikeCount).toBe(0);
        session.run(1);
        expect(reloadedNeuron.stateOf(session)?.spikeCount).toBe(1);
        disposeChannels(channels);
    });

    test("buildSessionFromViewer clones the persisted specialized link", () => {
        const source = new RuntimeNode();
        const target = new RuntimeNode();
        const outPort = { name: "spike", type: "spike" };
        const inPort = { name: "spike", type: "spike" };
        const definition = new SpikeSynapse();
        definition.weight = 0.42;
        definition.delay = 3;

        const viewer = {
            nodes: [fakeNode("source", source, [], [outPort]), fakeNode("target", target, [inPort], [])],
            connections: [
                {
                    linkKind: "data",
                    typeId: SPIKE_SYNAPSE_TYPE_ID,
                    item: { data: definition },
                    from: outPort,
                    to: inPort,
                },
            ],
        } as unknown as GraphViewer;

        const { session, channels } = buildSessionFromViewer(viewer);
        const runtimeLink = session.graph.links[0] as SpikeSynapse;
        expect(runtimeLink).toBeInstanceOf(SpikeSynapse);
        expect(runtimeLink).not.toBe(definition);
        expect(runtimeLink.weight).toBe(0.42);
        expect(runtimeLink.delay).toBe(3);
        expect(runtimeLink.oini).toBe(source);
        expect(runtimeLink.ofin).toBe(target);
        expect(definition.oini).toBeNull();
        expect(definition.ofin).toBeNull();
        disposeChannels(channels);
    });

    test("sub-graph materialization restores the concrete link and data", () => {
        const nodes = new NodeRegistry();
        const links = new LinkRegistry();
        registerSessionSnnTypes(nodes, links);
        const host = new RuntimeGraph();
        const document = JSON.stringify({
            version: 4,
            model: {
                nodes: [
                    { id: "a", typeId: "Test:node" },
                    { id: "b", typeId: "Test:node" },
                ],
                connections: [
                    {
                        id: "a:spike->b:spike",
                        typeId: SPIKE_SYNAPSE_TYPE_ID,
                        data: { weight: -0.2, delay: 5, plasticity: true },
                        from: { node: "a", port: "spike" },
                        to: { node: "b", port: "spike" },
                    },
                ],
            },
        });

        const result = materializeSubGraphInto(
            host,
            document,
            () => new RuntimeNode(),
            (typeId) => links.create(typeId) ?? null
        );
        const runtimeLink = host.links[0] as SpikeSynapse;
        expect(result.missingLinkTypeIds).toEqual([]);
        expect(runtimeLink).toBeInstanceOf(SpikeSynapse);
        expect(runtimeLink.weight).toBe(-0.2);
        expect(runtimeLink.delay).toBe(5);
        expect(runtimeLink.plasticity).toBe(true);
        expect(runtimeLink.slot).toBe("spike");
        expect(runtimeLink.toSlot).toBe("spike");
    });
});

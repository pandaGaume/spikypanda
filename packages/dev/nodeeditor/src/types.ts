export type PortDirection = "input" | "output";

export type PortType = "float" | "vec2" | "vec3" | "vec4" | "tensor" | "any";

export const PORT_COLORS: Record<PortType, string> = {
    float: "#8cf",
    vec2: "#8f8",
    vec3: "#ff8",
    vec4: "#f8f",
    tensor: "#f88",
    any: "#ccc",
};

export interface PortDef {
    name: string;
    type: PortType;
    direction: PortDirection;
}

export interface NodeDef {
    label: string;
    inputs: Omit<PortDef, "direction">[];
    outputs: Omit<PortDef, "direction">[];
    color?: string;
    data?: unknown;
}

export interface Vec2 {
    x: number;
    y: number;
}

export interface SerializedPort {
    name: string;
    type: PortType;
    direction: PortDirection;
}

export interface SerializedNode {
    id: string;
    label: string;
    x: number;
    y: number;
    inputs: SerializedPort[];
    outputs: SerializedPort[];
    color?: string;
}

export interface SerializedConnection {
    fromNodeId: string;
    fromPortIndex: number;
    toNodeId: string;
    toPortIndex: number;
}

export interface SerializedGraph {
    nodes: SerializedNode[];
    connections: SerializedConnection[];
}

export interface ExportProfile {
    background?: string;
    nodeBody: string;
    nodeBorder: string;
    headerText: string;
    portLabel: string;
    portStroke: string;
    connectionStroke: string;
}

export const EXPORT_PROFILES: Record<string, ExportProfile> = {
    dark: {
        background: "#111",
        nodeBody: "#16213e",
        nodeBorder: "#0f3460",
        headerText: "#fff",
        portLabel: "#888",
        portStroke: "rgba(255,255,255,0.3)",
        connectionStroke: "#fff",
    },
    light: {
        background: "#fff",
        nodeBody: "#f4f5f7",
        nodeBorder: "#d0d5dd",
        headerText: "#fff",
        portLabel: "#555",
        portStroke: "rgba(0,0,0,0.2)",
        connectionStroke: "#333",
    },
    transparent_dark: {
        nodeBody: "#16213e",
        nodeBorder: "#0f3460",
        headerText: "#fff",
        portLabel: "#888",
        portStroke: "rgba(255,255,255,0.3)",
        connectionStroke: "#fff",
    },
    transparent_light: {
        nodeBody: "#f4f5f7",
        nodeBorder: "#d0d5dd",
        headerText: "#fff",
        portLabel: "#555",
        portStroke: "rgba(0,0,0,0.2)",
        connectionStroke: "#333",
    },
};

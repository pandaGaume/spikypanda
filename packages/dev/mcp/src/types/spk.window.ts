/**
 * Ambient typing for the globals that {@link nodeeditor.js} publishes when
 * the editor module finishes booting.
 *
 * - `window.__spk`     : control surface (run, configure, readAmplitudes...).
 * - `window.__spkOps`  : full op registry (the OPS_V1 array). The simulation
 *                        adapter iterates this list to derive tool schemas.
 *
 * The adapter never imports the editor module directly; it reads these two
 * globals at runtime so the MCP package stays decoupled from the static
 * web-app source tree.
 */

export interface SpkAttrSchemaOption {
    value: string | number;
    label?: string;
}

export interface SpkAttrSchemaEntry {
    key: string;
    label?: string;
    type: "number" | "int" | "string" | "boolean" | "select";
    min?: number;
    max?: number;
    step?: number;
    options?: SpkAttrSchemaOption[];
}

export interface SpkOpPort {
    name: string;
    type: string;
}

export interface SpkOpDef {
    id: string;
    domain?: string;
    opset?: number;
    kind: "source" | "processor" | "sink";
    category?: string;
    label?: string;
    color?: string;
    inputs?: SpkOpPort[];
    outputs?: SpkOpPort[];
    variadicInput?: { prefix: string; type: string };
    defaultConfig?: Record<string, unknown>;
    attrSchema?: SpkAttrSchemaEntry[];
    detailPage?: string;
}

export interface SpkGraphStatusNode {
    id: string;
    op: string;
    label: string;
    running?: boolean;
    config?: Record<string, unknown>;
}

export interface SpkGraphStatusStream {
    streamId: string;
    nodeId: string;
    op: string;
    port: string;
    count?: number;
}

export interface SpkGraphStatus {
    mode: "edit" | "play";
    sampleRateHz?: number;
    nodes: SpkGraphStatusNode[];
    streams: SpkGraphStatusStream[];
}

export interface SpkScenarioConfig {
    gravity?: boolean;
    speedRps?: number;
    faults?: Record<string, number>;
    nodes?: Array<{
        id?: string;
        op?: string;
        config?: Record<string, unknown>;
    }>;
}

export interface SpkControlApi {
    configure(scenario: SpkScenarioConfig): boolean;
    run(seconds: number): Promise<void>;
    readAmplitudes(): Record<string, number> | null;
    readFftPeak(nodeId: string, freqHz: number, windowHz?: number): number | null;
    exportData(): string | null;
    toggleGravity(enabled: boolean): boolean;
    setFault(faultId: string, severity: number): boolean;
    reset(): Promise<void>;
    graphStatus(): SpkGraphStatus | null;
    /** Returns a base64 PNG data URL of the scope widget with the given title,
     *  or null when no matching widget is found or the canvas is empty. */
    captureScope(label: string): string | null;
    /** Returns a self-contained SVG string for the scope widget with the given
     *  title (600x200 viewBox, same colours as the canvas renderer), or null
     *  when no matching widget is found. */
    captureScopeSvg(label: string): string | null;
    /** Returns an SVG string representation of the current node graph, using
     *  the specified theme profile ("dark" | "light" | "transparent_dark" |
     *  "transparent_light"). Returns null when the editor is not available. */
    exportGraphSvg(profile?: string): string | null;
}

declare global {
    interface Window {
        __spk?: SpkControlApi;
        __spkOps?: SpkOpDef[];
    }
}

export {};

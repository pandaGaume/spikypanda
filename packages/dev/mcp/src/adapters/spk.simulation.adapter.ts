import { McpAdapterBase, McpResourceContent, McpToolResult, McpToolResults, JsonRpcMimeType } from "@cyanmycelium/mcp-core";
import type { SpkControlApi, SpkGraphStatus, SpkOpDef } from "../types/spk.window.js";

/**
 * Adapter that bridges the MCP behaviors to {@link window.__spk} (the control
 * API installed by `nodeeditor.js`) and to {@link window.__spkOps} (the full
 * op registry). All resource reads and tool executions are routed through
 * these two globals; the adapter holds no state of its own.
 *
 * Resource map served by the adapter:
 *
 * - `spk://scenario`   the live graph: nodes, configs, connections, gravity
 *                      state, faults. Read by the agent before configuring.
 * - `spk://simulation` runtime status: play mode, sample rate, running nodes.
 * - `spk://measurement` placeholder for the measurement resource; behaviors
 *                      typically use tools rather than resource reads here.
 * - `spk://ops`        the static op registry (every op with its attrSchema).
 */
export class SpkSimulationAdapter extends McpAdapterBase {
    public static readonly DOMAIN = "spk";

    public static readonly URI_SCENARIO    = "spk://scenario";
    public static readonly URI_SIMULATION  = "spk://simulation";
    public static readonly URI_MEASUREMENT = "spk://measurement";
    public static readonly URI_OPS         = "spk://ops";

    public constructor() {
        super(SpkSimulationAdapter.DOMAIN);
    }

    // ── Live globals ─────────────────────────────────────────────────────

    /** Returns the control API or `null` when nodeeditor.js has not booted yet. */
    public getSpk(): SpkControlApi | null {
        const w = (typeof globalThis !== "undefined" ? (globalThis as unknown as Window) : undefined);
        return (w && w.__spk) || null;
    }

    /** Returns the static op registry, or an empty array when missing. */
    public getOps(): SpkOpDef[] {
        const w = (typeof globalThis !== "undefined" ? (globalThis as unknown as Window) : undefined);
        return (w && w.__spkOps) || [];
    }

    /** Returns the current graph status, or `null` when the API is missing. */
    public getStatus(): SpkGraphStatus | null {
        return this.getSpk()?.graphStatus() ?? null;
    }

    /** Looks up an op definition by id (e.g. "spk.MotorPMSM"). */
    public findOp(opId: string): SpkOpDef | undefined {
        return this.getOps().find((o) => o.id === opId);
    }

    // ── IMcpBehaviorAdapter ──────────────────────────────────────────────

    public async readResourceAsync(uri: string): Promise<McpResourceContent | undefined> {
        switch (uri) {
            case SpkSimulationAdapter.URI_SCENARIO:
                return this._readScenario(uri);
            case SpkSimulationAdapter.URI_SIMULATION:
                return this._readSimulation(uri);
            case SpkSimulationAdapter.URI_OPS:
                return this._readOps(uri);
            case SpkSimulationAdapter.URI_MEASUREMENT:
                return this._readMeasurement(uri);
            default:
                return undefined;
        }
    }

    public async executeToolAsync(_uri: string, toolName: string, _args: Record<string, unknown>): Promise<McpToolResult> {
        // Tools are dispatched inside each behavior. The adapter is a passive
        // service object; it would only be reached if a behavior forwarded an
        // unknown tool, which signals a routing bug.
        return McpToolResults.error(`SpkSimulationAdapter: tool not handled at adapter level: "${toolName}"`);
    }

    // ── Resource readers ─────────────────────────────────────────────────

    private _readScenario(uri: string): McpResourceContent {
        const status = this.getStatus();
        const nodes = (status?.nodes ?? []).map((n) => {
            const opDef = this.findOp(n.op);
            return {
                id: n.id,
                op: n.op,
                label: n.label,
                running: n.running ?? false,
                config: n.config ?? {},
                category: opDef?.category,
                kind: opDef?.kind,
            };
        });
        const body = {
            uri,
            mode: status?.mode ?? "edit",
            sampleRateHz: status?.sampleRateHz ?? null,
            nodeCount: nodes.length,
            nodes,
        };
        return { uri, mimeType: JsonRpcMimeType, text: JSON.stringify(body) };
    }

    private _readSimulation(uri: string): McpResourceContent {
        const status = this.getStatus();
        const running = (status?.nodes ?? []).filter((n) => n.running).map((n) => n.id);
        const body = {
            uri,
            mode: status?.mode ?? "edit",
            sampleRateHz: status?.sampleRateHz ?? null,
            runningNodeIds: running,
            streamCount: status?.streams?.length ?? 0,
        };
        return { uri, mimeType: JsonRpcMimeType, text: JSON.stringify(body) };
    }

    private _readMeasurement(uri: string): McpResourceContent {
        const spk = this.getSpk();
        const amps = spk ? spk.readAmplitudes() : null;
        const body = {
            uri,
            available: !!spk,
            amplitudes: amps ?? {},
        };
        return { uri, mimeType: JsonRpcMimeType, text: JSON.stringify(body) };
    }

    private _readOps(uri: string): McpResourceContent {
        const ops = this.getOps().map((op) => ({
            id: op.id,
            kind: op.kind,
            category: op.category ?? null,
            label: op.label ?? op.id,
            inputs: op.inputs ?? [],
            outputs: op.outputs ?? [],
            attrSchema: op.attrSchema ?? [],
            defaultConfig: op.defaultConfig ?? {},
        }));
        const body = { uri, count: ops.length, ops };
        return { uri, mimeType: JsonRpcMimeType, text: JSON.stringify(body) };
    }
}

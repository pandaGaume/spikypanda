/**
 * The runtime's MCP surface: the catalogue, documents and sessions, with no
 * editor behind them. What a Node host publishes on a broker (the factory's
 * container, a twin), and what the studio's surface contains as a subset.
 * Schemas only; the adapter executes through `RuntimeController`.
 */
import { McpAdapterBase, McpBehavior, McpToolResults, type McpBehaviorOptions, type McpResource, type McpResourceContent, type McpTool, type McpToolResult } from "@cyanmycelium/mcp-core";
import type { NodeRegistry } from "spikypanda-core";
import { runtimeTools } from "./runtime.tools.js";
import { URI_REGISTRY } from "./resource.uri.js";
import { RuntimeController, URI_DOCUMENTS, type RuntimeControllerOptions } from "./runtime.controller.js";

const SCHEME = "spk";

export class RuntimeAdapter extends McpAdapterBase {
    public readonly controller: RuntimeController;

    public constructor(registry: NodeRegistry, options: RuntimeControllerOptions = {}) {
        super(SCHEME);
        this.controller = new RuntimeController(registry, options);
    }

    public async readResourceAsync(uri: string): Promise<McpResourceContent | undefined> {
        const value = this.controller.readResource(uri);
        return value === undefined ? undefined : { uri, mimeType: "application/json", text: JSON.stringify(value) };
    }

    public async executeToolAsync(_uri: string, toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
        const result = await this.controller.executeToolAsync(toolName, args ?? {});
        return result.ok ? McpToolResults.json(result.data) : McpToolResults.error(result.error);
    }
}

export class RuntimeBehavior extends McpBehavior {
    public static readonly NAMESPACE = "spk";

    public constructor(adapter: RuntimeAdapter, options: McpBehaviorOptions = {}) {
        super(adapter, { ...options, namespace: options.namespace ?? RuntimeBehavior.NAMESPACE });
    }

    /** A behavior on a registry, with the default in-memory document store. */
    public static on(registry: NodeRegistry, options: RuntimeControllerOptions & McpBehaviorOptions = {}): RuntimeBehavior {
        const { documents, maxSamples, maxTicks, ...behavior } = options;
        return new RuntimeBehavior(new RuntimeAdapter(registry, { documents, maxSamples, maxTicks }), behavior);
    }

    protected override _buildResources(): McpResource[] {
        return [
            { uri: URI_REGISTRY, name: "Node catalogue", description: "Every node type the registry holds, with ports, signature and documentation", mimeType: "application/json" },
            { uri: URI_DOCUMENTS, name: "Documents", description: "The names of the documents the store holds, built or given, that document_instantiate and session_run read by name", mimeType: "application/json" },
        ];
    }

    protected override _buildTools(): McpTool[] {
        return runtimeTools();
    }
}

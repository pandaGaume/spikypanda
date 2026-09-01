/**
 * Adapter: the MCP surface over `GraphController`.
 *
 * Nothing but translation lives here. Every operation is the controller's, and
 * this maps its neutral results onto MCP tool results and forwards its change
 * notifications onto the resource-changed signal. Keeping the bridge this thin
 * is what lets the controller be tested without a transport, and what would let
 * a different protocol reuse it unchanged.
 */
import { McpAdapterBase, McpToolResults, type McpResourceContent, type McpToolResult } from "@cyanmycelium/mcp-core";
import { GraphController, type ControllerResult } from "./graph.controller.js";
import type { GraphRunner } from "spikypanda-nodeeditor";

/** Scheme this adapter answers for, without the slashes. */
const SCHEME = "spk";

function toToolResult(result: ControllerResult): McpToolResult {
    return result.ok ? McpToolResults.json(result.data) : McpToolResults.error(result.error);
}

export class GraphAdapter extends McpAdapterBase {
    private readonly _controller: GraphController;

    public constructor(runner: GraphRunner) {
        super(SCHEME);
        this._controller = new GraphController(runner);
        this._controller.onChanged = (uri) => this._forwardResourceContentChanged(uri);
    }

    /** The controller, for callers that want it without the MCP envelope. */
    public get controller(): GraphController {
        return this._controller;
    }

    public async readResourceAsync(uri: string): Promise<McpResourceContent | undefined> {
        return this._controller.readResourceAsync(uri);
    }

    public async executeToolAsync(uri: string, toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
        return toToolResult(await this._controller.executeToolAsync(uri, toolName, args));
    }
}

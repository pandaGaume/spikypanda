#!/usr/bin/env node
/**
 * Stdio MCP server for the SpikyPanda research store.
 *
 * Spawned by Claude Code (or any MCP client) via the `command + args` shape
 * declared in `.mcp.json`. The process speaks JSON-RPC framed by newlines
 * over stdin/stdout; diagnostics are written to stderr only so they never
 * mix with protocol traffic.
 *
 * The server registers two behaviors:
 *
 * - {@link SpkResearchBehavior} : the actual research store.
 * - {@link McpGrammarBehavior}  : runtime grammar mutations so the agent can
 *                                 patch its own tool descriptions in-session.
 */
import { McpServerBuilder, McpGrammarBehavior, McpGrammarStore } from "@dev/core";
import { SpkResearchAdapter } from "./spk.research.adapter.js";
import { SpkResearchBehavior } from "./spk.research.behavior.js";
import { StdioTransport } from "./stdio.transport.js";

async function main(): Promise<void> {
    const adapter = new SpkResearchAdapter(process.env["SPK_RESEARCH_DIR"]);
    await adapter.ensureInitialized();
    process.stderr.write(`[spk-research] root=${adapter.rootDirectory}\n`);

    const grammarStore = new McpGrammarStore();

    const transport = new StdioTransport();

    const server = new McpServerBuilder()
        .withName("spikypanda-research")
        .withTransport(transport)
        .withGrammarStore(grammarStore)
        .withInitializer({
            initialize() {
                return {
                    protocolVersion: "2024-11-05",
                    serverInfo: { name: "spikypanda-research", version: "0.1.0" },
                    instructions:
                        "Persistent research store for SpikyPanda scientific agents. " +
                        "Use log_experiment after every measurement, write_hypothesis to " +
                        "track open questions, write_report to capture conclusions, and " +
                        "add_dataset_entry to grow the labeled training set.",
                };
            },
        })
        .register(
            new SpkResearchBehavior(adapter),
            new McpGrammarBehavior(grammarStore),
        )
        .build();

    await server.start();
    process.stderr.write(`[spk-research] ready on stdio\n`);

    const shutdown = async (signal: string): Promise<void> => {
        process.stderr.write(`[spk-research] received ${signal}, shutting down\n`);
        try { await server.stop(); } catch { /* ignore */ }
        process.exit(0);
    };
    process.on("SIGINT",  () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
    process.stderr.write(`[spk-research] fatal: ${err && err.message ? err.message : String(err)}\n`);
    process.exit(1);
});

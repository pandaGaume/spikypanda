/**
 * Publishing the studio into a broker slot.
 *
 * A browser cannot be an MCP server in the ordinary sense: it listens on
 * nothing. The broker inverts the connection. The studio dials out over a
 * WebSocket and registers itself in a named slot, and clients reach that slot
 * through the broker's own endpoints. The broker relays and holds no state, so
 * it can be restarted, replaced or bypassed without any of the layers below
 * knowing.
 *
 * `DirectTransport`, not `MultiplexTransport`. The studio publishes exactly one
 * server into one slot, and the slot has its own URL, `/provider/<slot>`, so the
 * broker sends plain messages on it. Multiplex wraps everything in a named
 * envelope for sharing one socket between several servers; pointed at a single
 * slot URL it registers fine and then never answers, because the messages it
 * receives are not the shape it expects. The symptom is precise and misleading:
 * the broker reports the provider connected, and every request sits in its
 * pending queue forever.
 *
 * The transport lives in `@cyanmycelium/mcp-broker-provider`, not in
 * `mcp-core`. That split is deliberate on the library's side, the tunnel being
 * CyanMycelium topology rather than protocol, and it is why the broker is a
 * process to run (`npx @cyanmycelium/mcp-broker`) and not a dependency to
 * bundle.
 */
import { DirectTransport } from "@cyanmycelium/mcp-broker-provider";
import { McpGrammar } from "@cyanmycelium/mcp-core";
import { McpServerBuilder } from "@cyanmycelium/mcp-core/server";
import grammarEn from "../grammars/spk-en.json";
import grammarFr from "../grammars/spk-fr.json";
import type { GraphRunner } from "spikypanda-nodeeditor";
import { GraphAdapter } from "./graph.adapter.js";
import { GraphBehavior } from "./graph.behavior.js";

/** Where the studio publishes itself, and under what name. */
export interface PublishOptions {
    /**
     * Slot name. Clients reach the studio at `<broker>/<slot>/mcp`, and a
     * stdio bridge selects it with `MCP_BROKER_STDIO_PROVIDER=<slot>`.
     */
    readonly slot?: string;
    /**
     * Broker tunnel URL. Defaults to the broker's own default port on
     * localhost. Note the broker must list this page's origin in
     * `MCP_BROKER_ALLOWED_ORIGINS`, or the browser is refused on the client
     * endpoint.
     */
    readonly tunnelUrl?: string;
    /** Server name announced during the MCP handshake. */
    readonly name?: string;
    /** How long to wait for the tunnel to open before failing. Default 5000 ms. */
    readonly connectTimeoutMs?: number;
    /**
     * Locale for tool descriptions, "en" or "fr". Defaults to English.
     *
     * Selection is per session in mcp-core, resolved from the connecting
     * client, so this only sets the fallback when the client says nothing.
     */
    readonly locale?: string;
}

/** A running publication, and the handle to take it down. */
export interface Publication {
    readonly adapter: GraphAdapter;
    readonly behavior: GraphBehavior;
    /**
     * What the transport reports about its own connection.
     *
     * Cross-check it against the broker's own view when it matters: a second
     * connection to `/provider/<slot>` closing with code 1008 and "already
     * connected" proves the slot is held, and the broker's `provider_status`
     * tool reports the same from the outside.
     */
    isConnected(): boolean;
    /** Stops the server and releases the slot. */
    stop(): Promise<void>;
}

const DEFAULT_SLOT = "spikypanda";
const DEFAULT_TUNNEL = "ws://localhost:3000/provider";

/**
 * Resolve once the transport reports itself open, or on timeout.
 *
 * Polled rather than event-driven because the transport's `onOpen` may already
 * have fired by the time we look, and a listener registered after the fact
 * would wait forever for an event that has been and gone.
 */
async function waitForOpen(transport: { isOpen: boolean }, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (transport.isOpen) return true;
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return transport.isOpen;
}

/**
 * Publish a studio's graph into a broker slot.
 *
 * Takes the runner the editor is already driving, so the session exposed is the
 * one on screen. Nothing is created behind the user's back: if the runner has
 * no session yet, tools that need one say so rather than starting it.
 */
export async function publishToBroker(runner: GraphRunner, options: PublishOptions = {}): Promise<Publication> {
    const slot = options.slot ?? DEFAULT_SLOT;
    const tunnelUrl = options.tunnelUrl ?? DEFAULT_TUNNEL;

    const adapter = new GraphAdapter(runner);
    const behavior = new GraphBehavior(adapter);

    // Grammars override the behavior's own descriptions; a tool without an
    // entry keeps the schema's wording, which is why only the tools that
    // needed sharpening have one.
    const fallback = options.locale === "fr" ? "fr" : "en";
    const transport = new DirectTransport(`${tunnelUrl}/${slot}`);
    const server = new McpServerBuilder()
        .withName(options.name ?? "spikypanda-studio")
        .withTransport(transport)
        .withGrammar("en", McpGrammar.fromJSON(grammarEn))
        .withGrammar("fr", McpGrammar.fromJSON(grammarFr))
        .withGrammarResolver(() => fallback)
        .register(behavior)
        .build();

    await server.start();

    // `start()` resolves whether or not the socket came up, so the tunnel is
    // given a bounded moment to report itself open. The check is deliberately
    // lenient: `isOpen` has been seen reading false on a tunnel the broker
    // considered live, so failing hard on it would reject working setups. What
    // it does catch is the loud case, no broker listening at all.
    await waitForOpen(transport, options.connectTimeoutMs ?? 5000);

    return {
        adapter,
        behavior,
        isConnected: () => transport.isOpen,
        stop: () => server.stop(),
    };
}

/**
 * Browser entry point for the SpikyPanda MCP package.
 *
 * Webpack bundles this file into bundle/mcp-spikypanda.js with a UMD wrapper
 * exposing every export as `window.McpSpikyPanda.*`. The bundle is loaded
 * by nodeeditor-mcp.html after mcp-core.js and mcp-server.js.
 *
 * The research adapter and the stdio bin live under src/research/ and are
 * compiled separately for Node.js. They are intentionally NOT re-exported
 * here so they never end up in the browser bundle.
 */

import "./types/spk.window.js";

export { SpkSimulationAdapter } from "./adapters/spk.simulation.adapter.js";
export { SpkScenarioBehavior } from "./behaviors/spk.scenario.behavior.js";
export { SpkSimBehavior }      from "./behaviors/spk.sim.behavior.js";
export { SpkMeasureBehavior }  from "./behaviors/spk.measure.behavior.js";

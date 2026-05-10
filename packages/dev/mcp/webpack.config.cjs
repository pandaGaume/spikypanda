/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

// ---------------------------------------------------------------------------
// Bundle factory for the SpikyPanda MCP browser package.
//
// Output: bundle/mcp-spikypanda.js, exposing window.McpSpikyPanda which holds
// the simulation adapter and the four browser-side behaviors. Loaded after
// mcp-core.js and mcp-server.js (provided by mcp-for-babylon) inside
// nodeeditor-mcp.html.
//
// @dev/core classes (McpBehavior, McpAdapterBase, McpServerBuilder) live in
// the mcp-server.js bundle as window.McpServer. The webpack externals below
// rewrite every `import { ... } from "@dev/core"` into a reference to that
// global, mirroring the pattern used by mcp-babylon.js in mcp-for-babylon.
// ---------------------------------------------------------------------------
module.exports = (env, argv) => {
    const isProd = argv.mode === "production";
    return {
        entry: "./src/browser-index.ts",
        output: {
            filename: "mcp-spikypanda.js",
            path: path.resolve(__dirname, "../../host/www/bundle"),
            library: {
                name: "McpSpikyPanda",
                type: "umd",
            },
            globalObject: "globalThis",
        },
        target: "web",
        devtool: isProd ? "source-map" : "inline-source-map",
        resolve: {
            extensions: [".ts", ".tsx", ".js"],
            extensionAlias: {
                ".js": [".ts", ".js"],
            },
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: "ts-loader",
                    exclude: /node_modules/,
                    options: {
                        transpileOnly: true,
                        configFile: path.resolve(__dirname, "tsconfig.build.json"),
                    },
                },
            ],
        },
        externals: [
            ({ request }, callback) => {
                if (request && request.match(/^@dev\/core/)) {
                    return callback(null, "McpServer");
                }
                callback();
            },
        ],
    };
};

/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

module.exports = (env, argv) => {
    const isProd = argv.mode === "production";
    return {
        entry: "./src/index.ts",
        output: {
            filename: "SpkMcp.js",
            path: path.resolve(__dirname, "bundle"),
            library: {
                name: "SpkMcp",
                type: "umd",
            },
            globalObject: "globalThis",
        },
        target: "web",
        devtool: isProd ? "source-map" : "inline-source-map",
        resolve: {
            extensions: [".ts", ".tsx", ".js"],
            extensionAlias: { ".js": [".ts", ".js"] },
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
        // Core and the node editor are already on the page as UMD globals, and
        // the controller must bind to *those* instances: a second copy of the
        // registry or of the runner would be a different graph, which is the
        // one thing this design refuses.
        //
        // mcp-core and the broker provider are NOT external. They are bundled
        // in, because nothing else on the page carries them and there is no
        // shared instance to preserve.
        externals: [
            ({ request }, callback) => {
                if (request && request.match(/^spikypanda-core/)) return callback(null, "SpikypandaCore");
                if (request && request.match(/^spikypanda-nodeeditor/)) return callback(null, "NODEEDITOR");
                callback();
            },
        ],
    };
};

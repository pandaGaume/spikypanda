/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const webpack = require("webpack");

module.exports = (env, argv) => {
    const isProd = argv.mode === "production";
    return {
        entry: "./src/index.ts",
        output: {
            filename: "SpkPluginGeometry.js",
            path: path.resolve(__dirname, "bundle"),
            library: {
                name: "SpkPluginGeometry",
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
        externals: [
            ({ request }, callback) => {
                if (request && request.match(/^spikypanda-core/))       return callback(null, "SpikypandaCore");
                if (request && request.match(/^spikypanda-nodeeditor/)) return callback(null, "NODEEDITOR");
                callback();
            },
        ],
        // Babylon imports are pulled in by the attitude-3d editor; keep
        // the plugin a single UMD file so the host's <script> tag is
        // enough to boot it (no chunk runtime, no public-path setup).
        // LimitChunkCountPlugin collapses Babylon's dynamic-import chunks
        // back into the entry — otherwise we'd ship dozens of side files.
        optimization: {
            splitChunks: false,
            runtimeChunk: false,
        },
        plugins: [
            new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
        ],
        performance: { hints: false },
    };
};

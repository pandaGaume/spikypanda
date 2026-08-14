const path = require("path");

module.exports = {
    entry: "./src/index.ts",
    output: {
        path: path.resolve(__dirname, "bundle"),
        filename: "SpkPluginIso.js",
        library: { name: "SpkPluginIso", type: "umd" },
        globalObject: "globalThis",
    },
    resolve: {
        extensions: [".ts", ".js"],
        // Sub-plugin TS files import siblings via the ESM-canonical ".js"
        // suffix; webpack needs the alias to map those back to ".ts" sources.
        extensionAlias: { ".js": [".ts", ".js"] },
    },
    module: {
        rules: [{
            test: /\.ts$/,
            use: { loader: "ts-loader", options: { transpileOnly: true, configFile: path.resolve(__dirname, "tsconfig.build.json") } },
            exclude: /node_modules/,
        }],
    },
    // core + nodeeditor are provided as globals by the host (loaded before
    // this bundle); never bundle them in.
    externals: {
        "spikypanda-core": {
            root: "SpikypandaCore", amd: "spikypanda-core",
            commonjs: "spikypanda-core", commonjs2: "spikypanda-core",
        },
        "spikypanda-nodeeditor": {
            root: "NODEEDITOR", amd: "spikypanda-nodeeditor",
            commonjs: "spikypanda-nodeeditor", commonjs2: "spikypanda-nodeeditor",
        },
    },
};

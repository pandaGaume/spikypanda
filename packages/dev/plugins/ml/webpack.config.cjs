const path = require("path");

module.exports = {
    entry: "./src/index.ts",
    output: {
        path: path.resolve(__dirname, "bundle"),
        filename: "SpkPluginMl.js",
        library: { name: "SpkPluginMl", type: "umd" },
        globalObject: "globalThis",
    },
    resolve: {
        extensions: [".ts", ".js"],
        // Mirror the TS/ESM convention used in the source: relative
        // imports written as "./foo.js" must resolve to "./foo.ts" at
        // bundle time. Without this alias, webpack only knows about
        // the literal `.js` suffix and fails to find the `.ts` source.
        extensionAlias: { ".js": [".ts", ".js"] },
    },
    module: {
        rules: [{
            test: /\.ts$/,
            use: { loader: "ts-loader", options: { transpileOnly: true, configFile: path.resolve(__dirname, "tsconfig.build.json") } },
            exclude: /node_modules/,
        }],
    },
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

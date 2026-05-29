const path = require("path");

module.exports = {
    entry: "./src/index.ts",
    output: {
        path: path.resolve(__dirname, "bundle"),
        filename: "SpkPluginViz.js",
        library: { name: "SpkPluginViz", type: "umd" },
        globalObject: "globalThis",
    },
    resolve: {
        extensions: [".ts", ".js"],
        // Mirror the TS/ESM convention used in the source: relative
        // imports written as "./foo.js" must resolve to "./foo.ts" at
        // bundle time.
        extensionAlias: { ".js": [".ts", ".js"] },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: { loader: "ts-loader", options: { transpileOnly: true, configFile: path.resolve(__dirname, "tsconfig.build.json") } },
                exclude: /node_modules/,
            },
            // uPlot ships its own CSS; we inline it via style-loader so
            // the plugin stays a single self-contained .js file and no
            // separate <link> tag is needed in the host HTML.
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
        ],
    },
    // uPlot is bundled IN (not externalized) — it's the viz tile's
    // implementation detail. Future tile types (PixiJS, ECharts) will be
    // bundled in similarly, with tree-shaking keeping the cost
    // proportional to the registered tile types.
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

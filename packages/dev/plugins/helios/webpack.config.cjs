const path = require("path");

module.exports = {
    entry: "./src/index.ts",
    output: {
        path: path.resolve(__dirname, "bundle"),
        filename: "SpkPluginHelios.js",
        library: { name: "SpkPluginHelios", type: "umd" },
        globalObject: "globalThis",
    },
    resolve: {
        extensions: [".ts", ".js"],
        extensionAlias: { ".js": [".ts", ".js"] },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: { loader: "ts-loader", options: { transpileOnly: true, configFile: path.resolve(__dirname, "tsconfig.build.json") } },
                exclude: /node_modules/,
            },
        ],
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

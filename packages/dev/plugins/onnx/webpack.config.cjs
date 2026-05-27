const path = require("path");

module.exports = {
    entry: "./src/index.ts",
    output: {
        path: path.resolve(__dirname, "bundle"),
        filename: "SpkPluginOnnx.js",
        library: { name: "SpkPluginOnnx", type: "umd" },
        globalObject: "globalThis",
    },
    resolve: { extensions: [".ts", ".js"] },
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
        "spikypanda-onnx": {
            root: "SpikypandaOnnx", amd: "spikypanda-onnx",
            commonjs: "spikypanda-onnx", commonjs2: "spikypanda-onnx",
        },
    },
};

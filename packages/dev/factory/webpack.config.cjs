// One file for the whole job: core, the plugins and the runner, targeting
// Node. The emitted dist/ of the workspace packages keeps the path aliases
// and extensionless relative imports that Node cannot resolve, so the only
// artifact that runs outside a bundler is this bundle. It is what the
// container ships and what `spikypanda-job` points at.
const path = require("path");
const webpack = require("webpack");

const PKG = path.resolve(__dirname, "..");
const alias = (name, dir) => ({
    [`${name}$`]: path.resolve(PKG, dir, "src/index.ts"),
    [name]: path.resolve(PKG, dir, "src"),
});

module.exports = {
    context: __dirname,
    target: "node",
    // Two bundles from the same sources: the CLI (`spikypanda-job`) and the
    // library (`spikypanda-factory`, the API for scripts and slots that drive
    // jobs in process).
    entry: { "spikypanda-job": "./src/bin.ts", "spikypanda-factory": "./src/lib.ts" },
    output: {
        path: path.resolve(__dirname, "bundle"),
        filename: "[name].js",
        library: { type: "commonjs2" },
    },
    resolve: {
        extensions: [".ts", ".js"],
        extensionAlias: { ".js": [".ts", ".js"] },
        alias: {
            ...alias("spikypanda-core", "core"),
            ...alias("spikypanda-onnx", "onnx"),
            ...alias("spikypanda-nodeeditor", "nodeeditor"),
            ...alias("spikypanda-plugin-control", "plugins/control"),
            ...alias("spikypanda-plugin-dsp", "plugins/dsp"),
            ...alias("spikypanda-plugin-geometry", "plugins/geometry"),
            ...alias("spikypanda-plugin-logic", "plugins/logic"),
            ...alias("spikypanda-plugin-ml", "plugins/ml"),
            ...alias("spikypanda-plugin-onnx", "plugins/onnx"),
            ...alias("spikypanda-plugin-physics", "plugins/physics"),
        },
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
    plugins: [
        new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true, include: /spikypanda-job/ }),
        new webpack.DefinePlugin({ __FACTORY_VERSION__: JSON.stringify(require("./package.json").version) }),
    ],
    // Keep the output readable enough to debug in a container log.
    optimization: { minimize: false },
    devtool: false,
    node: { __dirname: false, __filename: false },
};

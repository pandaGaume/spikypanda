/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

module.exports = (env, argv) => {
    const isProd = argv.mode === "production";
    return {
        entry: "./src/index.ts",
        output: {
            filename: "SpkPluginChemistry.js",
            path: path.resolve(__dirname, "bundle"),
            library: {
                name: "SpkPluginChemistry",
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
    };
};

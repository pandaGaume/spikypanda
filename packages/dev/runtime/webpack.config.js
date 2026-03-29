const path = require("path");

module.exports = (env, argv) => {
    const isProd = argv.mode === "production";
    return {
        entry: "./src/index.ts",
        output: {
            filename: "spikypanda-runtime.js",
            path: path.resolve(__dirname, "bundle"),
            library: "SpikypandaRuntime",
            libraryTarget: "umd",
            globalObject: "globalThis",
        },
        target: "web",
        devtool: isProd ? "source-map" : "inline-source-map",
        resolve: {
            extensions: [".ts", ".tsx", ".js"],
            extensionAlias: {
                ".js": [".ts", ".js"],
            },
            alias: {
                "spikypanda-core": path.resolve(__dirname, "../core/src"),
            },
            fallback: {
                fs: false,
                path: false,
                zlib: false,
                https: false,
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
                        configFile: path.resolve(__dirname, "../../../tsconfig.build.json"),
                    },
                },
            ],
        },
        externals: {},
    };
};

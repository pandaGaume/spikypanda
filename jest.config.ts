import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/packages/tests"],
    moduleFileExtensions: ["ts", "js", "json"],
    transform: {
        "^.+\\.ts$": ["ts-jest",{
        tsconfig: "tsconfig.build.json"}]
    },
    testRegex: ".*\\.test\\.ts$",
    moduleNameMapper: {
        // CSS imports are webpack-only; jest stubs them with an empty
        // module so workspace entry points that `import "./foo.css"`
        // (e.g. spikypanda-nodeeditor) load without error.
        "\\.css$":                      "<rootDir>/jest-css-mock.js",
        // GridStack ships ESM-only, which ts-jest does not transform
        // since it lives in node_modules. Stub it with the same empty
        // module pattern as CSS — tests don't drive the Dashboard
        // class directly, they only need the imports to resolve.
        "^gridstack$":                  "<rootDir>/jest-css-mock.js",
        "^gridstack/(.*)$":             "<rootDir>/jest-css-mock.js",
        // Relative imports written with the ESM ".js" extension (the
        // canonical TS-with-ESM-target style used by recent plugins like
        // physics) must be resolved to the .ts source for jest. Catches
        // "./foo.js", "../bar/baz.js", etc.
        "^(\\.{1,2}/.*)\\.js$":         "$1",
        "^spikypanda-core$":            "<rootDir>/packages/dev/core/src/index.ts",
        "^spikypanda-core/(.*)$":       "<rootDir>/packages/dev/core/src/$1",
        "^spikypanda-onnx$":         "<rootDir>/packages/dev/onnx/src/index.ts",
        "^spikypanda-onnx/(.*)$":    "<rootDir>/packages/dev/onnx/src/$1",
        "^spikypanda-sensors$":         "<rootDir>/packages/dev/sensors/src/index.ts",
        "^spikypanda-sensors/(.*)$":    "<rootDir>/packages/dev/sensors/src/$1",
        "^spikypanda-nodeeditor$":      "<rootDir>/packages/dev/nodeeditor/src/index.ts",
        "^spikypanda-nodeeditor/(.*)$": "<rootDir>/packages/dev/nodeeditor/src/$1",
        "^spikypanda-applications-stereo$":      "<rootDir>/packages/dev/applications/stereo/src/index.ts",
        "^spikypanda-applications-stereo/(.*)$": "<rootDir>/packages/dev/applications/stereo/src/$1",
        "^spikypanda-applications-mpc$":      "<rootDir>/packages/dev/applications/mpc/src/index.ts",
        "^spikypanda-applications-mpc/(.*)$": "<rootDir>/packages/dev/applications/mpc/src/$1",
        "^spikypanda-applications-cardriver$":      "<rootDir>/packages/dev/applications/privates/cardriver/src/index.ts",
        "^spikypanda-applications-cardriver/(.*)$": "<rootDir>/packages/dev/applications/privates/cardriver/src/$1",
        "^spikypanda-applications-driverv2$":      "<rootDir>/packages/dev/applications/privates/driverv2/src/index.ts",
        "^spikypanda-applications-driverv2/(.*)$": "<rootDir>/packages/dev/applications/privates/driverv2/src/$1",
        "^spikypanda-applications-motorwatch$":      "<rootDir>/packages/dev/applications/motorwatch/src/index.ts",
        "^spikypanda-applications-motorwatch/(.*)$": "<rootDir>/packages/dev/applications/motorwatch/src/$1",
        "^spikypanda-plugin-dsp$":          "<rootDir>/packages/dev/plugins/dsp/src/index.ts",
        "^spikypanda-plugin-dsp/(.*)$":     "<rootDir>/packages/dev/plugins/dsp/src/$1",
        "^spikypanda-plugin-ml$":           "<rootDir>/packages/dev/plugins/ml/src/index.ts",
        "^spikypanda-plugin-ml/(.*)$":      "<rootDir>/packages/dev/plugins/ml/src/$1",
        "^spikypanda-plugin-onnx$":         "<rootDir>/packages/dev/plugins/onnx/src/index.ts",
        "^spikypanda-plugin-onnx/(.*)$":    "<rootDir>/packages/dev/plugins/onnx/src/$1",
        "^spikypanda-plugin-physics$":      "<rootDir>/packages/dev/plugins/physics/src/index.ts",
        "^spikypanda-plugin-physics/(.*)$": "<rootDir>/packages/dev/plugins/physics/src/$1",
        // Some sensors source files import the published package name
        // "@spiky-panda/core" instead of the path alias spikypanda-core. The
        // node-resolved dist/index.js ships ESM syntax and lives under
        // node_modules, which jest does not transform by default; redirect
        // to the TS source so ts-jest compiles it like any other workspace
        // file.
        "^@spiky-panda/core$":          "<rootDir>/packages/dev/core/src/index.ts",
        "^@spiky-panda/core/(.*)$":     "<rootDir>/packages/dev/core/src/$1",
    },
};

export default config;

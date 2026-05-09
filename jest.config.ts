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
        "^spikypanda-core$":            "<rootDir>/packages/dev/core/src/index.ts",
        "^spikypanda-core/(.*)$":       "<rootDir>/packages/dev/core/src/$1",
        "^spikypanda-runtime$":         "<rootDir>/packages/dev/runtime/src/index.ts",
        "^spikypanda-runtime/(.*)$":    "<rootDir>/packages/dev/runtime/src/$1",
        "^spikypanda-sensors$":         "<rootDir>/packages/dev/sensors/src/index.ts",
        "^spikypanda-sensors/(.*)$":    "<rootDir>/packages/dev/sensors/src/$1",
        "^spikypanda-nodeeditor$":      "<rootDir>/packages/dev/nodeeditor/src/index.ts",
        "^spikypanda-nodeeditor/(.*)$": "<rootDir>/packages/dev/nodeeditor/src/$1",
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

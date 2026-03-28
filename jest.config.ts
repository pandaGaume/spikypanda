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
        "^spikypanda-core$": "<rootDir>/packages/dev/core/src/index.ts",
        "^spikypanda-core/(.*)$": "<rootDir>/packages/dev/core/src/$1",
        "^spikypanda-runtime$": "<rootDir>/packages/dev/runtime/src/index.ts",
        "^spikypanda-runtime/(.*)$": "<rootDir>/packages/dev/runtime/src/$1",
        "^spikypanda-nodeeditor$": "<rootDir>/packages/dev/nodeeditor/src/index.ts",
        "^spikypanda-nodeeditor/(.*)$": "<rootDir>/packages/dev/nodeeditor/src/$1",
    },
};

export default config;

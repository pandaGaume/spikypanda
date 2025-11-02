import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/packages/tests"],
    moduleFileExtensions: ["ts", "js", "json"],
    transform: {
        "^.+\\.ts$": ["ts-jest",{
        tsconfig: "tsconfig.json"}]
    },
    testRegex: ".*\\.test\\.ts$",
    moduleNameMapper: {
        "^tensegrity$": "<rootDir>/packages/dev/tensegrity/src/index.ts",
        "^tensegrity/(.*)$": "<rootDir>/packages/dev/tensegrity/src/$1",
        "^spikypanda-core$": "<rootDir>/packages/dev/core/src/index.ts",
        "^spikypanda-core/(.*)$": "<rootDir>/packages/dev/core/src/$1",
    },
};

export default config;

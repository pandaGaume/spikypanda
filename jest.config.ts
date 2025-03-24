import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/packages/tests"],
    moduleFileExtensions: ["ts", "js", "json"],
    transform: {
        "^.+\\.ts$": "ts-jest",
    },
    testRegex: ".*\\.test\\.ts$",
    globals: {
        "ts-jest": {
            tsconfig: "<rootDir>/tsconfig.json",
        },
    },
    moduleNameMapper: {
        "^@core$": "<rootDir>/packages/dev/core/src/index.ts",
        "^@core/(.*)$": "<rootDir>/packages/dev/core/src/$1",
    },
};

export default config;

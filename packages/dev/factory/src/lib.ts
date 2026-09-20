/**
 * The factory as a library, bundled: the same code as the CLI, exported for
 * the scripts and slots that drive jobs in process (the demo builds its twin
 * documents with it). `reflect-metadata` first, as in bin.ts: core declares
 * no side effects, and the decorators need the polyfill before any node class
 * is evaluated.
 */
import "reflect-metadata";
export * from "./index.js";

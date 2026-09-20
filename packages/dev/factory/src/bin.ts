/**
 * The bundle entry: run the CLI on the process arguments and set the exit code.
 *
 * `reflect-metadata` is imported here, first, on purpose. Core imports it at
 * the top of its index, but a bundler that trusts `sideEffects: false` may
 * hoist a decorated class above that import, and the decorators then run
 * against a bare `Reflect`. The entry is the one place evaluation order is
 * certain.
 */
import "reflect-metadata";
import { main } from "./cli.js";

process.exitCode = main(process.argv.slice(2));

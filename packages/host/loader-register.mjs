// Tiny attachment point for the custom resolution hook.
// Used via `node --import ./packages/host/loader-register.mjs server.mjs`.
import { register } from "node:module";

register("./loader.mjs", import.meta.url);

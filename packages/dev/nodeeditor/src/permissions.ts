/**
 * Immutable rwx-style permission set for editor components.
 *
 * Flags are independent (Unix-style), not hierarchical: `read` + `execute`
 * without `write` is a valid combination (e.g. inspect-and-run a model
 * without the ability to modify its topology).
 *
 * Set once at component construction. A future user/role system layers
 * on top by swapping a fresh `Permissions` instance into a newly-created
 * editor; existing instances do not mutate.
 *
 * Notation: a 3-character shorthand where each position is the flag
 * letter when granted or "-" when denied. Positions are read / write /
 * execute, in order:
 *
 *   "rwx"  full access
 *   "r--"  read-only viewer
 *   "rw-"  authoring without runtime
 *   "r-x"  run-and-inspect (no editing)
 *   "---"  no access (rare; useful as a sentinel)
 *
 * What each flag governs (interpreted by the consuming component):
 *   - read:    rendering the graph and selecting nodes / connections.
 *              Always required; without it the editor is effectively
 *              blank. Pan, zoom, exports (SVG / save) are read.
 *   - write:   any mutation: drag, port connect/disconnect, delete,
 *              property edits, NEW / LOAD, palette drop.
 *   - execute: runtime affordances: Play / Pause / Stop / Step.
 *
 * UI interactions are gated by these flags; programmatic API calls on
 * GraphViewer are trusted (the orchestrator is responsible for not
 * calling addNode/connect when modelling a read-only viewer).
 */
export class Permissions {
    public readonly read: boolean;
    public readonly write: boolean;
    public readonly execute: boolean;

    public constructor(spec: string | { read?: boolean; write?: boolean; execute?: boolean }) {
        if (typeof spec === "string") {
            if (spec.length !== 3) {
                throw new Error(`Permissions: shorthand must be exactly 3 chars (e.g. "rwx", "r-x"), got "${spec}"`);
            }
            this.read = spec[0] === "r";
            this.write = spec[1] === "w";
            this.execute = spec[2] === "x";
        } else {
            this.read = !!spec.read;
            this.write = !!spec.write;
            this.execute = !!spec.execute;
        }
    }

    public can(flag: "read" | "write" | "execute"): boolean {
        return this[flag];
    }

    public toString(): string {
        return (this.read ? "r" : "-") + (this.write ? "w" : "-") + (this.execute ? "x" : "-");
    }

    public static readonly NONE = new Permissions("---");
    public static readonly READ_ONLY = new Permissions("r--");
    public static readonly READ_WRITE = new Permissions("rw-");
    public static readonly FULL = new Permissions("rwx");
}

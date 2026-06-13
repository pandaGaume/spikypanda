import { Channel, editor } from "spikypanda-core";
import type { ComputeGraph, IDataLink, IKernel, ITensor } from "spikypanda-core";
import { OnnxGraph, OnnxParser, OnnxGraphBuilder, createSpikyPandaRegistry } from "spikypanda-onnx";
import type { OnnxParseResult } from "spikypanda-onnx";
import { sha256Hex } from "./sha256.js";

/**
 * Candidate model parsed and built into local structures, not yet
 * swapped into the live graph (the staging bank of the double-bank
 * load). Holds the parse result so validation can inspect the declared
 * graph inputs/outputs before any commit, plus the kernels backing
 * each declared input/output so the commit can wire boundary port
 * channels by ONNX tensor name.
 */
interface StagedModel {
    parsed: OnnxParseResult;
    graph: ComputeGraph;
    inputNames: string[];
    outputNames: string[];
    inputNodes: Map<string, IKernel>;
    outputNodes: Map<string, IKernel>;
}

/** Options accepted by {@link OnnxModelGraph.loadModelValidated}. */
export interface OnnxModelLoadOptions {
    /** Display name stored as modelName on success. */
    name?: string;
    /** Expected SHA-256 of the bytes, lowercase or uppercase hex. */
    sha256?: string;
    /** Expected shape of the first declared graph input. */
    expectInputShape?: number[];
    /** Expected number of declared graph outputs. */
    expectOutputCount?: number;
    /** Expected shape of the first declared graph output (same
     *  wildcard rule as expectInputShape: dims <= 0 match anything). */
    expectOutputShape?: number[];
}

/** Outcome report returned by {@link OnnxModelGraph.loadModelValidated}. */
export interface OnnxModelLoadReport {
    ok: boolean;
    error?: string;
    /** SHA-256 of the candidate bytes, always computed (lowercase hex). */
    sha256: string;
    /** Declared graph input names on success; empty on failure. */
    inputNames: string[];
    /** Declared graph output names on success; empty on failure. */
    outputNames: string[];
}

/**
 * OnnxModelGraph: an OnnxGraph that loads its contents from a .onnx file.
 * Since OnnxGraph already implements IRuntimeNode (fractal composition
 * from RuntimeGraph), there is no wrapper node: this graph IS the node
 * in the parent graph. The drag-and-drop editor (registered under the
 * "onnx-model" kind) parses the .onnx bytes and replaces this graph's
 * nodes/links in place, then notifies the property panel so it can
 * re-render the new port topology.
 */
@editor("onnx-model")
export class OnnxModelGraph extends OnnxGraph {
    private _modelName = "";
    private _loadError: string | null = null;

    public constructor() {
        super([], []);
    }

    public get modelName(): string {
        return this._modelName;
    }
    public get loadError(): string | null {
        return this._loadError;
    }
    public get isLoaded(): boolean {
        return this.nodes.length > 0;
    }

    public loadModel(bytes: ArrayBuffer, name = "model.onnx"): void {
        const prev = this._modelName;
        this._loadError = null;

        const staged = OnnxModelGraph._stage(new Uint8Array(bytes));
        if (!staged) {
            this._loadError = "Failed to parse ONNX model";
            this.notifyPropertyChanged("modelName", prev, "");
            return;
        }

        this._commit(staged, name);
    }

    /**
     * Validated, atomic variant of loadModel for the push-model-at-
     * runtime channel (double-bank load). The candidate is parsed and
     * built into LOCAL staging structures; the live topology is swapped
     * only after every check passes, so a rejected push can never leave
     * the graph half-loaded. On ANY failure the currently loaded model
     * stays fully intact and the reason is surfaced on the same
     * loadError field the editor already watches.
     *
     * Checks, in order:
     *   1. sha256           : when given, must equal the digest of the
     *      bytes (case-insensitive hex compare; checked BEFORE parsing).
     *   2. parse + build    : the bytes must parse into a non-empty graph.
     *   3. expectInputShape : when given, compared against the FIRST
     *      declared (non-initializer) graph input. Comparison rule:
     *      ranks must be equal, and each dimension must match exactly
     *      UNLESS either side is <= 0, which acts as a wildcard (the
     *      parser stores symbolic/dynamic dims as 0, and callers may
     *      pass 0 or -1 to mean "any", e.g. a dynamic batch dim).
     *   4. expectOutputCount: when given, must equal the number of
     *      declared graph outputs.
     *   5. expectOutputShape: when given, compared against the FIRST
     *      declared graph output with the same wildcard rule as
     *      expectInputShape (either side <= 0 matches anything).
     */
    public loadModelValidated(bytes: ArrayBuffer | Uint8Array, opts: OnnxModelLoadOptions = {}): OnnxModelLoadReport {
        const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        const digest = sha256Hex(u8);

        // 1. Integrity gate: cheap to check, so it runs before any
        //    protobuf work touches the bytes.
        if (opts.sha256 !== undefined && opts.sha256.toLowerCase() !== digest) {
            return this._reject(`SHA-256 mismatch: expected ${opts.sha256}, computed ${digest}`, digest);
        }

        // 2. Stage into local variables. The builder can throw on
        //    structurally broken initializers; treat that as a normal
        //    rejection rather than letting it escape half-way.
        let staged: StagedModel | null = null;
        try {
            staged = OnnxModelGraph._stage(u8);
        } catch (e) {
            return this._reject(`Failed to build ONNX model: ${e instanceof Error ? e.message : String(e)}`, digest);
        }
        if (!staged) {
            return this._reject("Failed to parse ONNX model", digest);
        }
        if (staged.graph.nodes.length === 0) {
            return this._reject("ONNX model contains no nodes", digest);
        }
        const model = staged;

        // 3. Declared input shape vs expectation.
        if (opts.expectInputShape) {
            const first = model.inputNames.length > 0 ? model.parsed.inputs.find((vi) => vi.name === model.inputNames[0]) : undefined;
            if (!first) {
                return this._reject("Input shape check failed: model declares no graph inputs", digest);
            }
            const mismatch = OnnxModelGraph._shapeMismatch(first.shape, opts.expectInputShape);
            if (mismatch) {
                return this._reject(`Input shape mismatch on "${first.name}": ${mismatch}`, digest);
            }
        }

        // 4. Declared output count vs expectation.
        if (opts.expectOutputCount !== undefined && model.outputNames.length !== opts.expectOutputCount) {
            return this._reject(`Output count mismatch: model declares ${model.outputNames.length}, expected ${opts.expectOutputCount}`, digest);
        }

        // 5. Declared output shape vs expectation. Still staging-side:
        //    a score-dimension mismatch must reject BEFORE the bank
        //    swap, or a runtime push could half-commit.
        if (opts.expectOutputShape) {
            const first = model.outputNames.length > 0 ? model.parsed.outputs.find((vi) => vi.name === model.outputNames[0]) : undefined;
            if (!first) {
                return this._reject("Output shape check failed: model declares no graph outputs", digest);
            }
            const mismatch = OnnxModelGraph._shapeMismatch(first.shape, opts.expectOutputShape);
            if (mismatch) {
                return this._reject(`Output shape mismatch on "${first.name}": ${mismatch}`, digest);
            }
        }

        // All checks passed: swap banks.
        const prevError = this._loadError;
        this._loadError = null;
        this.notifyPropertyChanged("loadError", prevError, null);
        this._commit(model, opts.name ?? "model.onnx");
        return { ok: true, sha256: digest, inputNames: model.inputNames, outputNames: model.outputNames };
    }

    // ── Shared load machinery ─────────────────────────────────────────

    /**
     * Parse + build the candidate bytes into local (staged) structures.
     * Returns null when the bytes do not parse as an ONNX model. Never
     * touches `this`.
     */
    private static _stage(bytes: Uint8Array): StagedModel | null {
        const parsed = OnnxParser.parse(bytes);
        if (!parsed) {
            return null;
        }
        const built = new OnnxGraphBuilder(createSpikyPandaRegistry()).build(parsed);
        return {
            parsed,
            graph: built.graph,
            inputNames: built.inputNames,
            outputNames: built.outputNames,
            inputNodes: built.inputNodes,
            outputNodes: built.outputNodes,
        };
    }

    /** Swap the live topology for the staged one and notify the panel. */
    private _commit(staged: StagedModel, name: string): void {
        const prev = this._modelName;

        // Boundary port channels (fractal embedding contract): one
        // dangling input channel per declared ONNX input and one
        // dangling output channel per declared output, slot = tensor
        // name. Created on the staged bank, AFTER its ComputeGraph
        // constructor derived inputs[]/outputs[] from the pure op
        // topology, so that derivation is undisturbed and a rejected
        // load never leaves half-wired ports. The previous model's
        // boundary channels leave with the previous links array below.
        const links = staged.graph.links;
        for (const inputName of staged.inputNames) {
            const node = staged.inputNodes.get(inputName);
            if (node) {
                links.push(new Channel<ITensor>(undefined, node, inputName) as unknown as IDataLink);
            }
        }
        for (const outputName of staged.outputNames) {
            const node = staged.outputNodes.get(outputName);
            if (node) {
                links.push(new Channel<ITensor>(node, undefined, outputName) as unknown as IDataLink);
            }
        }

        // Replace topology in place. RuntimeGraph's inputPorts/outputPorts
        // getters derive from the boundary port channels (ONNX tensor
        // names), while inputs[]/outputs[] keep carrying the source/sink
        // kernels for the classic infer() path.
        this.nodes = staged.graph.nodes;
        this.links = staged.graph.links;
        this.inputs = staged.graph.inputs;
        this.outputs = staged.graph.outputs;
        this.hiddens = staged.graph.hiddens;

        // Drop topology-derived caches: the memoized port maps, the
        // lazy default session behind infer(), and (lazily, via the
        // version stamp) the internal sessions of any parent session
        // currently embedding this node.
        this.invalidateTopology();

        this._modelName = name;
        this.notifyPropertyChanged("modelName", prev, name);
    }

    /**
     * Shared failure path for loadModelValidated: surface the message
     * on the same loadError field loadModel uses (the editor watches it
     * through onPropertyChanged) WITHOUT touching the live topology or
     * modelName, and build the failure report.
     */
    private _reject(error: string, digest: string): OnnxModelLoadReport {
        const prev = this._loadError;
        this._loadError = error;
        this.notifyPropertyChanged("loadError", prev, error);
        return { ok: false, error, sha256: digest, inputNames: [], outputNames: [] };
    }

    /**
     * Compare a declared ONNX input shape against an expected one.
     * Ranks must be equal; dimension i matches when the two values are
     * equal OR when either side is <= 0 (wildcard for dynamic dims).
     * Returns null on match, a human-readable reason otherwise.
     */
    private static _shapeMismatch(declared: number[], expected: number[]): string | null {
        if (declared.length !== expected.length) {
            return `declared rank ${declared.length} ([${declared.join(",")}]), expected rank ${expected.length} ([${expected.join(",")}])`;
        }
        for (let i = 0; i < declared.length; i++) {
            if (declared[i] > 0 && expected[i] > 0 && declared[i] !== expected[i]) {
                return `declared [${declared.join(",")}], expected [${expected.join(",")}] (dim ${i})`;
            }
        }
        return null;
    }
}

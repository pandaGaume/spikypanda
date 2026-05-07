// GraphExecutor — reusable runtime for a SpikyPanda graph.
//
// Originally lived inside samples/graph-runner/runner.js; extracted so
// the same code can drive the standalone runner page AND the editor's
// in-editor Play mode. Hosts pass in a StreamBus (so multiple executors
// in the same tab can share one bus client) and get back a small object
// with start / pause / stop / setNodeRunning controls + a streams view.
//
// Design notes:
//   - Sinks are NOT executed here. They live in detail-page tabs (or in
//     editor Play widgets) and subscribe to streams via the bus.
//   - Topological sort uses Kahn's algorithm on the runtime subgraph.
//     Cycles among runtime nodes throw on build().
//   - Sample rate is captured from the first source node's config; if
//     the graph has none, defaults to 5 kHz.
//   - Per-source `setRunning(false)` causes that source to emit zeros
//     while keeping its time clock advancing (so resume picks up from
//     the right phase rather than restarting transients).

import { SpikypandaGraph } from "./spikypanda-graph.js";
import { OPS_V1, findOp } from "./spikypanda-ops.js";
import { OP_RUNTIMES, hasRuntime } from "./op-runtimes.js";

const DEFAULT_SAMPLE_RATE = 5000;

export class GraphExecutor {
    /**
     * @param {string} graphJson - serialized .spikypanda content.
     * @param {object} opts
     * @param {object} opts.bus              - StreamBus instance.
     * @param {function} [opts.onError]      - called with Error on a build/runtime fault.
     * @param {function} [opts.onLog]        - called with a status string for host UI.
     * @param {function} [opts.onStreamUpdate] - called after each tick with the streams[] array.
     */
    constructor(graphJson, opts = {}) {
        this._graphJson = graphJson;
        this._bus = opts.bus;
        this._onError = opts.onError || function () {};
        this._onLog = opts.onLog || function () {};
        this._onStreamUpdate = opts.onStreamUpdate || function () {};

        // Built state.
        this._graph = null;             // SpikypandaGraph
        this._order = [];               // [{id, op, config, label}] in topo order
        this._instances = new Map();    // nodeId -> runtime
        this._lastOutputs = new Map();  // nodeId -> { portName: payload }
        this._streams = [];             // [{ streamId, nodeId, op, port, count, subs }]
        this._streamsById = new Map();
        this._sampleRateHz = 0;
        this._sourceRunning = new Map();  // nodeId -> bool, only for controllable nodes
        // Pending exec events queued by setNodeRunning() / pause toggle.
        // Flushed by _processN() into the node's output map on the next tick
        // so downstream nodes receive the pulse once via their inputs map.
        this._pendingEvents = new Map();  // nodeId -> "started" | "stopped" | "paused"
        // Manual pause state for any runtime node (toggled by "pause" exec input).
        // When true, data outputs are zeroed (muted) each tick until un-paused.
        this._nodePaused = new Map();     // nodeId -> bool
        // Last-known muted state per node, derived from its data outputs.
        // true when at least one data output carried muted:true on the last tick.
        // Used by the editor to drive the per-node green/red LED indicator.
        this._nodeMuted = new Map();      // nodeId -> bool

        // Lifecycle.
        this._running = false;
        this._raf = null;
        this._lastFrameMs = 0;
        this._built = false;

        // Bus listeners we own (so we can drop them on destroy).
        this._busOffStreamsUpdated = null;
    }

    // ---- Lifecycle ------------------------------------------------------

    build() {
        if (this._built) return true;
        if (!this._bus) {
            this._onError(new Error("GraphExecutor: no bus provided"));
            return false;
        }
        try {
            this._graph = SpikypandaGraph.parse(this._graphJson);
        } catch (e) {
            this._onError(e);
            return false;
        }
        try {
            this._order = topoSort(this._graph);
        } catch (e) {
            this._onError(e);
            return false;
        }
        this._sampleRateHz = 0;
        this._order.forEach((n) => {
            const Ctor = OP_RUNTIMES[n.op];
            let inst;
            if (Ctor) {
                inst = new Ctor();
                inst.init(n.config);
            } else {
                // Config-only nodes (e.g. fault descriptors) have no runtime.
                // Provide a passthrough so _sourceRunning gets an entry and
                // IToggableNode enable/disable works correctly.
                inst = { init() {}, process() { return {}; } };
            }
            this._instances.set(n.id, inst);
            const op = findOp(n.op);
            // The "controllable" node set is broader than just sources:
            // faults and environment processors also accept enable/disable
            // toggles from the editor's Play panel. They share the same
            // running flag mechanic — the executor zeros their outputs
            // when paused/disabled so downstream sees silence.
            const controllable = !!op && (
                op.kind === "source" ||
                op.category === "Fault" ||
                op.category === "Environment"
            );
            if (controllable) {
                // All controllable nodes start paused. For sources, BeginPlay
                // fan-out (via a StartRuntime node in the graph) will activate
                // those with autoStart=true. Faults and environment processors
                // start enabled (true) immediately since they do not produce
                // data on their own; they only modulate the signal when active.
                //
                // Sources flagged op.noStartStop (e.g. Constant) are
                // "always on" : they have no start exec input and are not
                // expected to receive a BeginPlay trigger. We start them
                // running so they emit immediately.
                const startPaused = op.kind === "source" && !op.noStartStop;
                this._sourceRunning.set(n.id, !startPaused);
            }
            if (n.config && typeof n.config.sampleRateHz === "number" && !this._sampleRateHz) {
                this._sampleRateHz = n.config.sampleRateHz;
            }
        });
        if (!this._sampleRateHz) this._sampleRateHz = DEFAULT_SAMPLE_RATE;

        // Fault and Environment nodes have no runtime class, so topoSort
        // excludes them from _order. Register them in _sourceRunning here
        // so isNodeRunning() and setNodeRunning() work for the editor's
        // enable/disable toggle. They start enabled (true).
        this._graph.listNodes().forEach((n) => {
            if (this._sourceRunning.has(n.id)) return;
            const op = findOp(n.op);
            if (!op) return;
            if (op.category === "Fault" || op.category === "Environment") {
                this._sourceRunning.set(n.id, true);
            }
        });

        // Register one stream per output port. Use the graph's ACTUAL port list
        // (n.outputs from the serialized node) rather than the op descriptor so
        // dynamically-added exec ports (started / stopped) are also registered.
        this._streams = [];
        this._streamsById = new Map();
        const self = this;
        this._order.forEach((n) => {
            // n.outputs comes from getNode() which reads the serialized port list.
            const portList = n.outputs && n.outputs.length ? n.outputs : (findOp(n.op) || {}).outputs || [];
            portList.forEach((port) => {
                const sid = self._graph.streamId(n.id, port.name);
                const row = {
                    streamId: sid, nodeId: n.id, op: n.op,
                    port: port.name, count: 0, subs: 0,
                };
                self._streams.push(row);
                self._streamsById.set(sid, row);
                self._bus.registerStream(sid, {
                    name: n.label + " (" + port.name + ")",
                    meta: {
                        nodeId: n.id, op: n.op,
                        portName: port.name, portType: port.type,
                        sampleRateHz: self._sampleRateHz,
                    },
                });
            });
        });

        // Track subscriber counts via the bus's broadcast.
        this._busOffStreamsUpdated = this._bus.on("streams-updated", function (m) {
            (m.streams || []).forEach(function (s) {
                const row = self._streamsById.get(s.streamId);
                if (row) row.subs = s.subscribers;
            });
            self._onStreamUpdate(self._streams.slice());
        });

        this._built = true;
        this._onLog("Graph built: " + this._order.length + " runtime node(s), fs=" +
            this._sampleRateHz + " Hz, " + this._streams.length + " stream(s).");
        this._onStreamUpdate(this._streams.slice());
        return true;
    }

    /** Start the rAF tick loop. Auto-builds if not built yet. */
    start() {
        if (!this._built && !this.build()) return false;
        if (this._running) return true;
        this._running = true;
        this._lastFrameMs = performance.now();
        // Fire the BeginPlay event before the first tick. Modeled after
        // UE Blueprint's Event BeginPlay: any spk.StartRuntime node in the
        // graph emits its `started` exec to its outbound edges, switching
        // the wired source nodes to running=true regardless of autoStart.
        this._fireBeginPlay();
        const self = this;
        const tick = function (now) {
            if (!self._running) return;
            let dtSec = (now - self._lastFrameMs) / 1000;
            if (dtSec > 0.05) dtSec = 0.05;  // cap on tab-switch backlog
            self._lastFrameMs = now;
            const n = Math.max(0, Math.floor(dtSec * self._sampleRateHz));
            if (n > 0) self._processN(n);
            self._raf = requestAnimationFrame(tick);
        };
        this._raf = requestAnimationFrame(tick);
        this._onLog("Running.");
        return true;
    }

    /** Stop ticking but keep streams registered (subscribers see no new data). */
    pause() {
        if (!this._running) return;
        this._running = false;
        if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
        this._onLog("Paused.");
    }

    /** Pause + dispose runtimes + unregister all streams. */
    stop() {
        this.pause();
        this._instances.forEach((inst) => {
            try { if (inst && inst.dispose) inst.dispose(); } catch (_e) { /* ignore */ }
        });
        this._instances.clear();
        this._streams.forEach((row) => {
            try { this._bus.unregisterStream(row.streamId); } catch (_e) { /* ignore */ }
        });
        this._streams = [];
        this._streamsById = new Map();
        this._lastOutputs = new Map();
        this._sourceRunning = new Map();
        this._pendingEvents = new Map();
        this._nodePaused = new Map();
        this._nodeMuted = new Map();
        this._order = [];
        this._graph = null;
        this._built = false;
        if (this._busOffStreamsUpdated) {
            this._busOffStreamsUpdated();
            this._busOffStreamsUpdated = null;
        }
        this._onLog("Stopped.");
        this._onStreamUpdate([]);
    }

    /** Pause/resume an individual controllable node. No-op for others. */
    setNodeRunning(nodeId, running) {
        if (!this._sourceRunning.has(nodeId)) return false;
        const was = this._sourceRunning.get(nodeId);
        const now = !!running;
        this._sourceRunning.set(nodeId, now);
        // Notify the runtime instance if it cares (optional hook).
        const inst = this._instances.get(nodeId);
        if (inst && typeof inst.setRunning === "function") inst.setRunning(now);
        // Queue exec event for the NEXT tick so downstream nodes see it.
        // Only queue when the state actually changes.
        if (was !== now) {
            this._pendingEvents.set(nodeId, now ? "started" : "stopped");
        }
        return true;
    }

    isNodeRunning(nodeId) {
        return this._sourceRunning.get(nodeId) === true;
    }

    /** True when the node's last data output carried muted:true (source stopped or paused). */
    isNodeMuted(nodeId) {
        return this._nodeMuted.get(nodeId) === true;
    }

    listSourceNodes() {
        const list = [];
        this._order.forEach((n) => {
            const op = findOp(n.op);
            if (op && op.kind === "source") list.push({ id: n.id, label: n.label, op: n.op });
        });
        return list;
    }

    // ---- Getters --------------------------------------------------------

    get streams() { return this._streams.slice(); }
    get isRunning() { return this._running; }
    get sampleRateHz() { return this._sampleRateHz; }
    get graph() { return this._graph; }

    /** Return the live runtime instance for a node, or null if not built. */
    getNodeInstance(nodeId) {
        return this._instances.get(nodeId) || null;
    }

    // ---- Internals ------------------------------------------------------

    // BeginPlay: pre-populate the "started" exec output of every
    // spk.StartRuntime node so that on the very first _processN tick, any
    // node whose "start" input is wired to StartRuntime.started will see
    // the pulse and activate itself.
    //
    // StartRuntime has no runtime class, so _processN never overwrites its
    // _lastOutputs entry; the one-shot cleanup pass at the end of the first
    // tick clears it so the pulse fires exactly once.
    //
    // Sources NOT wired to any StartRuntime start fully paused and must be
    // activated by the user via the on-node play button (or by wiring a
    // future event source to their "start" exec input).
    _fireBeginPlay() {
        if (!this._graph) return;
        const startNodes = this._graph.listNodes().filter(function (n) {
            return n.op === "spk.StartRuntime";
        });
        if (!startNodes.length) return;
        const self = this;
        startNodes.forEach(function (sn) {
            self._lastOutputs.set(sn.id, { started: { pulse: true } });
        });
        this._onLog("BeginPlay fired (" + startNodes.length + " start node(s)).");
    }

    _processN(n) {
        const dt = 1 / this._sampleRateHz;
        for (let i = 0; i < this._order.length; i++) {
            const node = this._order[i];
            const op = findOp(node.op);
            const inputs = new Map();
            // Use the serialized port list for input collection so exec-type
            // inputs (start / stop / pause and custom decision ports) are included.
            const inputPorts = node.inputs && node.inputs.length
                ? node.inputs
                : (op && op.inputs || []);
            inputPorts.forEach((port) => {
                const inb = this._graph.getInbound(node.id, port.name);
                if (!inb.length) return;
                const e = inb[0];
                const up = this._lastOutputs.get(e.from.nodeId);
                if (!up) return;
                const payload = up[e.from.port];
                if (payload) inputs.set(port.name, payload);
            });

            // ── Exec control: consume start / stop / pause / resume pulses ─
            // These take effect BEFORE inst.process() so the running/paused
            // state is correct for this tick's output generation.
            const startPulse  = inputs.get("start");
            const stopPulse   = inputs.get("stop");
            const pausePulse  = inputs.get("pause");
            const resumePulse = inputs.get("resume");
            if (startPulse && startPulse.pulse && this._sourceRunning.has(node.id)) {
                this.setNodeRunning(node.id, true);
            }
            if (stopPulse && stopPulse.pulse && this._sourceRunning.has(node.id)) {
                this.setNodeRunning(node.id, false);
            }
            if (pausePulse && pausePulse.pulse) {
                const wasPaused = this._nodePaused.get(node.id) || false;
                if (!wasPaused) {
                    this._nodePaused.set(node.id, true);
                    // Queue "paused" so downstream nodes learn about the
                    // transition on this same tick.
                    this._pendingEvents.set(node.id, "paused");
                }
            }
            if (resumePulse && resumePulse.pulse) {
                const wasPaused = this._nodePaused.get(node.id) || false;
                if (wasPaused) {
                    this._nodePaused.set(node.id, false);
                    this._pendingEvents.set(node.id, "resumed");
                }
            }

            const inst = this._instances.get(node.id);
            let outputs;
            try {
                outputs = inst.process(inputs, n, dt);
            } catch (err) {
                this._onError(new Error("Node " + node.id + " (" + node.op + ") threw: " + err.message));
                this.pause();
                return;
            }

            // ── Zeroing: silence data outputs when a node is stopped/paused.
            // Exec (event) ports are NOT zeroed: "stopped" / "paused" events
            // must still reach downstream on the tick the state changes.
            const stopped  = this._sourceRunning.has(node.id) && !this.isNodeRunning(node.id);
            const manPause = this._nodePaused.get(node.id) === true;
            if (stopped || manPause) {
                const allOutputPorts = node.outputs && node.outputs.length
                    ? node.outputs : (op && op.outputs || []);
                const dataOutputDefs = allOutputPorts.filter(function (p) {
                    return p.type !== "exec";
                });
                const zeroed = zeroOutputs(dataOutputDefs, n, dt);
                // Preserve any exec payloads already emitted by the runtime.
                if (outputs) {
                    allOutputPorts.forEach(function (p) {
                        if (p.type === "exec" && outputs[p.name] != null) {
                            zeroed[p.name] = outputs[p.name];
                        }
                    });
                }
                outputs = zeroed;
            }

            // Inject pending exec events (started / stopped / paused) queued
            // by setNodeRunning() or the pause toggle above. These fire
            // exactly once on the first tick after the state transition.
            const pendingEvent = this._pendingEvents.get(node.id);
            if (pendingEvent) {
                this._pendingEvents.delete(node.id);
                if (!outputs) outputs = {};
                outputs[pendingEvent] = { pulse: true };
            }
            this._lastOutputs.set(node.id, outputs || {});
            // Track muted state for the per-node LED indicator.
            let isMuted = false;
            if (outputs) {
                for (const portName in outputs) {
                    if (!Object.prototype.hasOwnProperty.call(outputs, portName)) continue;
                    const payload = outputs[portName];
                    if (payload && payload.muted === true) { isMuted = true; break; }
                }
            }
            this._nodeMuted.set(node.id, isMuted);
            if (outputs) {
                for (const portName in outputs) {
                    if (!Object.prototype.hasOwnProperty.call(outputs, portName)) continue;
                    const payload = outputs[portName];
                    if (!payload) continue;
                    const sid = this._graph.streamId(node.id, portName);
                    this._bus.publish(sid, payload);
                    const row = this._streamsById.get(sid);
                    if (row) row.count += n;
                }
            }
        }
        this._onStreamUpdate(this._streams.slice());

        // One-shot cleanup: clear exec outputs from nodes that have no
        // runtime (e.g. StartRuntime). Their _lastOutputs entries were
        // pre-populated by _fireBeginPlay and should propagate for exactly
        // one tick, then be cleared so the pulse does not re-fire.
        const toDelete = [];
        for (const nodeId of this._lastOutputs.keys()) {
            if (!this._instances.has(nodeId)) toDelete.push(nodeId);
        }
        for (const nodeId of toDelete) this._lastOutputs.delete(nodeId);
    }
}

// ---- Helpers ----------------------------------------------------------

// Topological sort over runtime-only nodes. Edges that cross into sinks
// are ignored (sinks live elsewhere and connect via the bus).
function topoSort(graph) {
    const nodes = graph.listNodes();
    const runtimeIds = new Set();
    nodes.forEach((n) => { if (hasRuntime(n.op)) runtimeIds.add(n.id); });
    const indeg = new Map();
    runtimeIds.forEach((id) => indeg.set(id, 0));
    graph.edges.forEach((e) => {
        if (runtimeIds.has(e.from.nodeId) && runtimeIds.has(e.to.nodeId)) {
            indeg.set(e.to.nodeId, indeg.get(e.to.nodeId) + 1);
        }
    });
    const queue = [];
    indeg.forEach((d, id) => { if (d === 0) queue.push(id); });
    const order = [];
    while (queue.length) {
        const id = queue.shift();
        order.push(id);
        graph.getOutbound(id).forEach((e) => {
            if (!runtimeIds.has(e.to.nodeId)) return;
            const d = indeg.get(e.to.nodeId) - 1;
            indeg.set(e.to.nodeId, d);
            if (d === 0) queue.push(e.to.nodeId);
        });
    }
    if (order.length !== runtimeIds.size) {
        throw new Error("Graph has a cycle among runtime nodes; cannot topo-sort.");
    }
    return order.map((id) => graph.getNode(id));
}

// Build zero-filled payloads matching the declared shape of each output
// port. Used when a source is paused so downstream nodes see a clean
// silent stream rather than the last live sample frozen in place.
// All payloads carry `muted: true` so downstream processors can propagate
// silence without adding noise or other contributions on top of zeros.
function zeroOutputs(outputDefs, n, dt) {
    const out = {};
    outputDefs.forEach((p) => {
        if (p.type === "vec2") {
            out[p.name] = {
                theta: new Float32Array(n), omega: new Float32Array(n),
                firstT: 0, dt: dt, muted: true,
            };
        } else if (p.type === "vec3") {
            out[p.name] = {
                x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n),
                firstT: 0, dt: dt, muted: true,
            };
        } else if (p.type === "matrix44") {
            const m = new Float32Array(16);
            m[0] = m[5] = m[10] = m[15] = 1;
            out[p.name] = { m, firstT: 0, dt: dt, muted: true };
        } else {
            out[p.name] = { samples: new Float32Array(n), firstT: 0, dt: dt, muted: true };
        }
    });
    return out;
}

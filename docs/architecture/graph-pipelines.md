# SpikyPanda Graph Pipelines (v0.5 beta)

> **Status: v0.5 beta.** The architecture is stable; the surface area
> is small and intentional. Several pieces are deliberately deferred
> (workers, real ONNX protobuf, ML nodes). Read the *Known
> limitations* section before assuming a feature exists.

## What is it

A small visual-programming layer on top of the SpikyPanda sample tree.
You design a sensing-and-processing pipeline as a graph in the **node
editor**; you save it as a `.spikypanda` file (an op-aware JSON envelope);
a standalone **graph runner** loads that file, executes every non-sink
node at sample rate, and publishes outputs on a SharedWorker bus that any
**sink page** (Scope, DatasetCapture, future CNN-Infer) can subscribe to.

The point is to stop baking pipelines into bespoke HTML pages. A
"motor + faults + sensor + scope" setup is now seven nodes, six edges,
and zero lines of HTML. Adding a new sensor kind, a new fault, or a new
DSP block is a descriptor + a runtime — no UI work required.

## One-page overview

```
                    +---------------------+
                    |   Node Editor       |   designs the graph,
                    | samples/nodeeditor/ |   saves .spikypanda
                    +----------+----------+
                               |
                               | "Run" → blob URL + BroadcastChannel snapshot
                               |
            +------------------+--------------------+
            |                                       |
            v                                       v
  +-------------------+                  +-------------------+
  |   Graph Runner    |                  |   Sink Pages      |
  | samples/graph-    |  publish via     | samples/scope/    |
  | runner/           |---bus----------->| samples/dataset/  |
  | (sources +        |                  | samples/<future>/ |
  |  processors)      |                  |                   |
  +-------------------+                  +-------------------+
            |                                       ^
            +-------- SharedWorker bus -------------+
                  (registry-worker.js)
                  - registers / unregisters streams
                  - fans out data messages to subscribers

            +-------- BroadcastChannel -------------+
                  ("spikypanda.graph")
                  - editor pushes graph snapshots
                  - sink/runner tabs request snapshots
```

Two communication channels, two purposes:
- **Stream bus** (SharedWorker): the data plane. High-frequency sample
  payloads, fan-out from one producer to N subscribers.
- **Graph channel** (BroadcastChannel): the config plane. Low-frequency
  graph snapshots so detail pages can read their bound config.

## Mental model in three rules

1. **The editor never holds the runtime.** You can close the editor
   tab; the runner and sink tabs keep working. The editor's only output
   is a `.spikypanda` file (or a blob URL pointing to one).
2. **Every node has a stable identity (`nodeId`) and a canonical
   stream id (`node.<nodeId>.<port>`).** Producers register under that
   id; consumers subscribe to it. No name-resolution, no aliasing.
3. **Sinks live in their own tabs; everything else lives in the
   runner.** The runner ticks sources + processors; sinks are passive
   observers/recorders subscribing to the bus.

## Components

### Stream Bus

Two files, one runtime concept.

| File | Role |
|---|---|
| [`www/js/registry-worker.js`](../../packages/host/www/js/registry-worker.js) | SharedWorker hosting the stream registry. Dispatches `data` messages from a stream's producer port to its subscriber ports. |
| [`www/js/stream-bus.js`](../../packages/host/www/js/stream-bus.js) | Client-side ES module wrapping the SharedWorker port. `registerStream`, `subscribe`, `publish`, `on`, `onData`. |

Worker → client message types:

| Type | When |
|---|---|
| `connected` | First message after the SharedWorker port opens. |
| `streams` | Reply to `list-streams`. Carries the full registry list. |
| `streams-updated` | Broadcast whenever streams are registered/unregistered or subscribers change. |
| `data` | One sample-batch payload from a stream this client is subscribed to. |
| `registered` / `subscribed` / `not-found` / `error` | Acknowledgements / failures. |

Client → worker:

| Type | Effect |
|---|---|
| `register-stream` | Caller becomes the producer of `streamId`. |
| `unregister-stream` | Caller drops a stream they own. |
| `subscribe` / `unsubscribe` | Manage this port's subscription set. |
| `data` | Producer publishes one sample-batch on a stream they own. |
| `list-streams` | Request a one-shot snapshot. |

**Stream id convention**: `node.<nodeId>.<portName>`. Helper:
`SpikypandaGraph.streamId(nodeId, port)` builds it. Multi-output nodes
(e.g. `MotorDC` exposing both `current` and `kinematics`) just use
multiple ids under the same `nodeId`.

### Graph Channel

[`www/js/spikypanda-graph.js`](../../packages/host/www/js/spikypanda-graph.js)
exports a `GraphChannel` class wrapping a
`BroadcastChannel("spikypanda.graph")`. Same-origin tabs only; no server
involvement. Two message types:

```js
// Editor → all
{ type: "snapshot", schemaVersion, graph: <stringified .spikypanda> }
// Late joiner → editor (asks for a fresh snapshot)
{ type: "request" }
```

The editor publishes a snapshot every time the user clicks **Open** or
**Run**. Detail pages and the runner request a snapshot on init if the
`?graph=` blob URL is unreachable (e.g. after a tab refresh closed the
blob).

### Editor

[`samples/nodeeditor/`](../../packages/host/www/samples/nodeeditor/) —
the design surface.

What it does:
- Builds toolbar buttons from `OPS_V1` (one per op type).
- Stores per-node config in `node.item.data.config`. The data blob
  implements `Inspectable` so the editor's `PropertyPanel` renders
  editable rows automatically from each op's `attrSchema`.
- Saves graphs via the registered `.spikypanda` file handler (the
  editor's v2 JSON format with our op-shaped `data` payload inside).
- **Open** button (single-node action): builds
  `<detailPage>?nodeId=<id>&graph=<blobUrl>` and `window.open`s it.
- **Run** button (graph-level action): saves the graph, opens the
  runner, then opens every sink node's detail page in its own tab.

### Op Set

[`www/js/spikypanda-ops.js`](../../packages/host/www/js/spikypanda-ops.js) —
the source of truth for what nodes exist.

Each `OpDescriptor`:

```js
{
    id: "spk.MotorDC",          // unique, namespaced (spk.* = SpikyPanda v1)
    domain: "spikypanda.ai",    // for future ONNX export
    opset: 1,                   // bump on breaking attr changes
    kind: "source" | "processor" | "sink",
    label: "Motor (DC)",        // editor toolbar + node header
    color: "#2a6",              // node header tint
    inputs:  [{ name, type }],  // type ∈ float|vec2|vec3|vec4|tensor|any
    outputs: [{ name, type }],
    detailPage: "scope/",       // optional, source/sink only; relative to samples/
    defaultConfig: { ... },     // applied when a fresh node is created
    attrSchema: [               // drives the property panel
        { key, label, type: "number"|"int"|"string"|"boolean", min?, max?, step? },
        ...
    ],
}
```

Current v1 op set:

| Op | Kind | Notes |
|---|---|---|
| `spk.MotorDC` | source | Atomic healthy DC motor. Two outputs: `current` (clean) + `kinematics` (theta, omega). Carries the chain's `sampleRateHz`. |
| `spk.MotorCurrentDC` | source | **Legacy composite.** Whole motor+sensor+faults baked into one node, opens the old all-in-one source page. Kept for quick-start; will likely be deprecated. |
| `spk.MisalignmentFault` | processor | Reads kinematics, emits 1x + 2x fMech current contribution. |
| `spk.BearingFault` | processor | BPFO/BPFI sidebands. *Descriptor only; no runtime yet.* |
| `spk.BrokenBarFault` | processor | MCSA sidebands. *Descriptor only; no runtime yet.* |
| `spk.EccentricityFault` | processor | *Descriptor only; no runtime yet.* |
| `spk.BrushFault` | processor | *Descriptor only; no runtime yet.* |
| `spk.GravityModulation` | processor | 1x fMech amplitude modulation from horizontal-axis gravity sag. *Descriptor only; no runtime yet.* |
| `spk.Sum` | processor | 4-input adder. Cascade for >4 contributions. |
| `spk.Sensor` | processor | Gain + bias + Gaussian noise. Inherits sample rate from input. |
| `spk.Scope` | sink | Live time-domain view at `samples/scope/`. |
| `spk.DatasetCapture` | sink | Labeled-window recorder at `samples/dataset/`. Has a passthrough `dataset` output for future ML training nodes. |

### Runtime Registry

[`www/js/op-runtimes.js`](../../packages/host/www/js/op-runtimes.js) —
maps op id → runtime constructor. The runner does
`new OP_RUNTIMES[node.op]()` once per node and ticks each instance per
animation frame.

Runtime contract (vanilla JS, no classes — just constructor + prototype):

```js
function MyOpRuntime() { /* fields */ }
MyOpRuntime.prototype.init = function (cfg /* node.config */) {
    // Cache anything heavy. Allocate buffers if you reuse them per tick.
};
MyOpRuntime.prototype.process = function (inputs, n, dt) {
    // inputs: Map<portName, payload>
    // n:      sample count for this tick (chosen by the runner)
    // dt:     sample period in seconds (1 / sampleRateHz)
    // Return: Map-shaped object { portName: payload, ... }
    return { out: { samples: out, firstT, dt } };
};
MyOpRuntime.prototype.dispose = function () {
    // Optional. Called on graph teardown.
};
```

### Graph Runner

[`samples/graph-runner/`](../../packages/host/www/samples/graph-runner/) —
the standalone runtime page.

Lifecycle:

1. **Load**: `?graph=<blobUrl>` is fetched, or a file is dropped, or a
   `BroadcastChannel` snapshot is received.
2. **Build**:
   - Parse via `SpikypandaGraph.parse()`.
   - Filter to runtime nodes (those with an entry in `OP_RUNTIMES`).
     Sinks are skipped — they live in detail tabs.
   - Topologically sort (Kahn's algorithm) ignoring edges to/from
     sinks.
   - Instantiate one runtime per node, call `init(node.config)`.
   - Capture `sampleRateHz` from any source's config (first one wins);
     defaults to 5 kHz if no source declares one.
   - For every output port of every runtime node, call
     `bus.registerStream(streamId, { name, meta })`.
3. **Tick** (per `requestAnimationFrame`):
   - `n = floor(elapsedSec * sampleRateHz)`.
   - For each node in topo order:
     - Build the inputs map by walking inbound edges and reading the
       upstream's last output.
     - Call `node.process(inputs, n, dt)`.
     - Cache the output for downstream nodes.
     - Publish each output port to the bus via
       `bus.publish(streamId, payload)`.
4. **Stop / Teardown**: dispose runtimes, `unregisterStream` everything.

The runner tracks per-stream counts and subscriber counts (from
`streams-updated` broadcasts) and shows them in a status table.

### Sink Pages

A sink is just a normal browser page that subscribes to a single stream
(or a few) on the bus and does something with the samples. Two
implementations today:

| Page | What it does |
|---|---|
| [`samples/scope/`](../../packages/host/www/samples/scope/) | Renders one stream as a live time-domain canvas. Bound via `?nodeId=` + `?graph=`. |
| [`samples/dataset/`](../../packages/host/www/samples/dataset/) | Records labeled windows from one stream and writes a `.json` or `.csv` file. Currently has its own stream picker (graph-binding follow-up pending). |

A sink page's job in graph-bound mode is short:

1. Read `?nodeId=` from the URL.
2. Fetch the graph from `?graph=` (blob URL) or via
   `graphChannel.requestSnapshot()`.
3. Find the inbound edge to its `in` port:
   `graph.upstreamStreamId(nodeId, "in")`.
4. `bus.subscribe(<streamId>)` and start consuming.

## Data Shapes

### Stream payloads

The bus is type-agnostic; the runtime just passes structured-clonable
objects. Conventions:

| Port type | Payload |
|---|---|
| `float` | `{ samples: Float32Array, firstT: number, dt: number }` |
| `vec2` (kinematics) | `{ theta: Float32Array, omega: Float32Array, firstT: number, dt: number }` |
| `tensor` (DatasetCapture output, future) | TBD; likely `{ windows: Array<{ samples, label, meta }>, ... }` |

`firstT` is the simulation timestamp of the first sample in the batch;
`dt` is the per-sample period. `firstT + i*dt` is the timestamp of
`samples[i]`. Per-frame batching keeps `postMessage` overhead low even
at multi-kHz sample rates.

### `.spikypanda` file format

Today: the node-editor library's v2 JSON envelope, just renamed from
`.json` to `.spikypanda`. Structure (abridged):

```json
{
  "version": 2,
  "layout": { "nodes": [ ... positions, ports ... ], "connections": [ ... ] },
  "model": {
    "nodes": [
      {
        "id": "node-uuid",
        "label": "Motor (DC)",
        "data": {
          "op": "spk.MotorDC",
          "domain": "spikypanda.ai",
          "opset": 1,
          "nodeId": "motordc_l8x12_1",
          "config": { "sampleRateHz": 5000, "supplyVoltage": 24.0, ... }
        }
      },
      ...
    ],
    "connections": [
      { "id": "...", "from": { "node": "n0", "port": "current" },
                     "to":   { "node": "n2", "port": "in_0" } },
      ...
    ]
  }
}
```

Every SpikyPanda node carries a `data` blob with `{ op, domain, opset,
nodeId, config }`. Consumers (runtime, detail pages) only need `op` and
`config`; the rest is for traceability and future ONNX export.

**Roadmap**: v1.0 will swap the JSON envelope for real ONNX protobuf
with `domain="spikypanda.ai"`, so the same file can be inspected in
Netron and consumed by the SpikyPanda runtime alike.

## URL Contract for Detail Pages

Every detail page understands two query params:

```
<page>?nodeId=<id>          // identifies which node this tab represents
       &graph=<blobUrl>     // points at the graph the editor produced
```

When `nodeId` is present, the page binds itself to the graph: applies
config, registers/subscribes to the right streams, hides irrelevant
controls. When it's absent, the page operates **standalone** with its
own controls (manual stream picker, manual config form, ...).

This dual mode is intentional. The editor flow is the headline, but the
old free-form pages remain useful for one-off exploration.

## How to Add a New Op

The full recipe, using a hypothetical `spk.MyFilter` as the example:

1. **Add the descriptor** in `www/js/spikypanda-ops.js`:

   ```js
   const MY_FILTER = {
       id: "spk.MyFilter",
       domain: "spikypanda.ai",
       opset: 1,
       kind: "processor",
       label: "My filter",
       color: "#446",
       inputs:  [{ name: "in",  type: "float" }],
       outputs: [{ name: "out", type: "float" }],
       defaultConfig: { cutoffHz: 100, order: 2 },
       attrSchema: [
           { key: "cutoffHz", label: "Cutoff (Hz)", type: "number", min: 1, step: 10 },
           { key: "order",   label: "Order",       type: "int",    min: 1, max: 8 },
       ],
   };

   // Add to the OPS_V1 array.
   export const OPS_V1 = [..., MY_FILTER];
   ```

2. **Add the runtime** in `www/js/op-runtimes.js`:

   ```js
   function MyFilterRuntime() { this._cfg = null; this._state = null; }
   MyFilterRuntime.prototype.init = function (cfg) {
       this._cfg = cfg;
       this._state = new Float32Array(cfg.order);
   };
   MyFilterRuntime.prototype.process = function (inputs, n, dt) {
       const inp = inputs.get("in");
       const out = new Float32Array(n);
       if (!inp || !inp.samples) {
           return { out: { samples: out, firstT: 0, dt } };
       }
       // ... actual filter logic ...
       return { out: { samples: out, firstT: inp.firstT, dt } };
   };
   MyFilterRuntime.prototype.dispose = function () { this._state = null; };

   export const OP_RUNTIMES = { ..., "spk.MyFilter": MyFilterRuntime };
   ```

That's it for processors. Source/sink ops additionally:
- **Source**: include `sampleRateHz` in `defaultConfig` (the first
  source's rate sets the chain's cadence). Inputs is `[]`.
- **Sink**: write a detail page at the path you put in `detailPage`.
  Outputs is `[]` (or a passthrough). No runtime needed unless the
  sink also publishes a derived stream.

The editor automatically picks up new ops on reload — toolbar buttons
are generated from `OPS_V1`.

## Standalone Mode vs Graph-Bound Mode

| Aspect | Standalone | Graph-bound (?nodeId= present) |
|---|---|---|
| How streams are picked | Manual picker on the page | Auto from inbound edge |
| Where config comes from | The page's own form | `node.config` in the graph |
| Lifecycle | Tab open → tab close | Editor's Run button → tab close (or graph removes the node) |
| Use case | Exploration, one-off captures | Designed pipelines, reproducible experiments |

Both modes coexist. The dataset page today supports only standalone;
the scope page today supports only graph-bound. Bringing each into the
other mode is a follow-up — the protocol (URL params + bus contract)
already supports both.

## Known Limitations (v0.5 beta)

These are tracked but deferred. None are architectural blockers.

| Area | Limitation | Mitigation / Roadmap |
|---|---|---|
| Runner threading | Everything runs on the main thread of the runner tab | Move processors into a DedicatedWorker when CPU bites. The op-runtime contract was designed for this; no callers need to change. |
| Op coverage | Only 4 of 12 ops have runtimes (`MotorDC`, `MisalignmentFault`, `Sum`, `Sensor`) | Phase 3 follow-up: port the rest of the fault types from `MotorFaultSource.ts`. |
| Scope visualization | Time canvas only, no FFT, no fixed-spectrum overlay | Phase 3 follow-up: port the FFT block from the original source page. |
| Standalone Scope | `samples/scope/` requires a `?nodeId=` to do anything | Phase 3 follow-up: copy the picker pattern from `dataset.js`. |
| Refresh resilience | Reloading a runner/scope tab loses the blob URL | Cache the latest snapshot in `localStorage` keyed by `graphId`; fetch on init if `?graph=` fails. |
| `Sum` fan-in | Capped at 4 inputs | Editor library change: dynamic ports. Cascade Sums in the meantime. |
| Property labels | Panel shows raw config keys (`supplyVoltage` not "Supply (V)") | Editor-library change: add `entry.label` to `PropertyEntry`. Friendly labels are already stored in `attrSchema`. |
| ONNX format | `.spikypanda` is JSON with a renamed extension | Phase 4-ish: real ONNX protobuf encoder once the v1 op set stabilizes. |
| Error reporting | A node throw stops the runner with a single log line | Better diagnostics: per-node error highlighting on the running graph. |

## Roadmap

Short-term, in order:

1. **Phase 3 follow-ups**: full fault library, Scope FFT, standalone
   Scope picker, friendly property labels, refresh resilience.
2. **Phase 4 — DSP nodes**: `spk.Bandpass`, `spk.FFT`, `spk.RMS`,
   `spk.PeakDetector`. Same pattern as the motor ops; reuses the FFT
   already in `spikypanda-runtime.js`.
3. **Phase 4 — ML nodes**: `spk.CnnInfer` (subscribes to a feature
   stream, emits class predictions as a stream), `spk.CnnTrain` (sink
   that consumes a `dataset` stream and exports an ONNX model).

Medium-term:

4. Worker-based runner; one DedicatedWorker per processor (or one
   shared worker scheduling all of them).
5. Real ONNX protobuf for `.spikypanda` files.
6. Editor "Run" UX: window-popup permission handling, sequencing the
   tab opens so the runner registers before sinks subscribe, error
   reporting on blocked popups.
7. Live indicator on running nodes in the editor (subscriber count,
   bytes published).

Long-term:

8. Cross-domain ops (vibration, MOX, lidar, KWS) — same architecture,
   new op packs.
9. MCU export: a subset of the op set compiles to the C++ runtime via
   the existing `@spiky-panda/sensors` → C++ path.

## Files reference

```
docs/architecture/graph-pipelines.md          # this document

packages/host/www/
  js/
    stream-bus.js                              # bus client
    registry-worker.js                         # SharedWorker registry
    spikypanda-graph.js                        # graph data layer + GraphChannel
    spikypanda-ops.js                          # OPS_V1 descriptors
    op-runtimes.js                             # runtime registry + impls
  samples/
    nodeeditor/                                # design surface
    graph-runner/                              # standalone runtime page
    scope/                                     # time-domain sink
    dataset/                                   # labeled-capture sink
    motor/current/DC/source/                   # legacy composite source page
```

## Appendix — Reference seed graph

What the editor seeds on first load:

```
MotorDC ──current────────────→ Sum.in_0 ──→ Sensor ──→ Scope
       └─kinematics─→ MisalignmentFault.kinematics
                        └────current────→ Sum.in_1
```

Click **Run** → two tabs open: the runner (which spawns Motor +
Misalignment + Sum + Sensor) and the Scope (subscribed to
`node.<sensorId>.out`). Adjust any node's config in the editor and
re-run to apply.

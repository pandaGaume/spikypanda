# Physical Neuromorphic Phase 1 Code Review

Review date: 2026-08-18

Status: blocking architecture review completed. No Phase 1 production implementation has started.

## Executive conclusion

The repository contains a strong TypeScript graph, dataflow, and continuous-simulation base, but it does not contain one finished component named `GraphV2`. The name currently overlaps three things:

1. the generic `IGraph` and `RuntimeGraph` implementation in core;
2. version 2 and version 3 editor save envelopes;
3. the HELIOS `ISimGraph v2` design documents, whose header still says that the draft is not implemented even though several proposed pieces have since landed.

The implemented `IGraph` plus `RuntimeGraph` plus `Channel` stack is the best available canonical candidate for a Physical Neuromorphic Graph. It already represents non-neural physical nodes, typed runtime ports, structural relations, hierarchical executable graphs, continuous-time leaves, solver attachment, and spatial pose. ONNX is a specialization of this stack rather than a dependency of it.

It is not yet a lossless canonical format, but the required representation evolution is now decided:

- a link must become a first-class persisted model item, following the same pattern as a node: stable `typeId`, serialized `data`, identity, and graph endpoints;
- this is a crucial evolution of the graph model, not a physical-neuromorphic-specific workaround;
- compatibility with older endpoint-only graph files is desirable only when cheap and must not complicate the new link model.

SNN scope decision recorded on 2026-08-18: the existing `SNNRuntime` remained a proof of concept, and the rest of SpikyPanda developed without it. It is not a second candidate runtime and does not impose backward-compatibility architecture. Phase 1 SNN behavior must be unified directly on `Session`, `RuntimeGraph`, `RuntimeNode`, and the existing scheduler. The missing LIF, spike, delay, and visualization capabilities are implementation work on that canonical runtime, not a reason to preserve the POC execution model.

Scope decision recorded on 2026-08-18: the CyanMycelium C++ runtime belongs to a related external project and must not be touched for now. Its boundary is therefore deferred rather than treated as a Phase 1 implementation blocker. Phase 1 remains TypeScript-only, while avoiding choices that would unnecessarily close a future interoperability path.

The edge-persistence direction is resolved. This review still stops before an implementation plan because the remaining hybrid timing and state-separation decisions are major architectural choices.

## Existing architecture

### Repository shape

This is an npm workspace monorepo. The relevant top-level areas are:

| Area | Role |
| --- | --- |
| `packages/dev/core` | Graph topology, execution, simulation traits and solvers, neural runtimes, geometry, compute graphs |
| `packages/dev/nodeeditor` | Active 2D graph editor, graph persistence, runtime session construction, runner, inspector, dashboard |
| `packages/dev/onnx` | ONNX parser, writer, builder, operators, and compute-graph exporter |
| `packages/dev/babylonjs` | Babylon renderer for the Bestioles simulation |
| `packages/dev/plugins/*` | Physics, control, DSP, logic, geometry, ML, ONNX, visualization, chemistry, and HELIOS node packs |
| `packages/dev/applications/*` | End-user applications and experiments |
| `packages/host/www` | Browser host and standalone samples, including the Brain 3D sample and an older graph pipeline |
| `packages/tests` | Jest and ts-jest test suites grouped by subsystem |
| `packages/dev/tools/benchmarks` | Existing neural architecture benchmark scripts and JSON/CSV results |
| `data` | MNIST and UAH driving accelerometer/GPS data |
| `docs` | Architecture, research, and validation notes |
| `helios` | ISimGraph v2 design material and HELIOS system documents |
| `internals` | Research notes and isolated prototypes |

The workspace includes core, node editor, ONNX, Babylon, multiple applications, and domain plugins. `packages/tests` is the only Jest root configured by `jest.config.ts`.

### Implemented layer relationship

```text
GraphItem / GraphNode / GraphOLink
                 |
                 v
       RuntimeNode / Channel
                 |
                 v
            RuntimeGraph
                 |
                 v
       Session + Scheduler
          |             |
          |             +-> ComputeGraph -> OnnxGraph
          v
 IIntegrable + solver attachment
          |
          v
   physics/control/chemistry plugins

GraphViewer + NodeRegistry
          |
          +-> builds a fresh RuntimeGraph and Session for Play
          +-> saves node state and connection endpoints
          +-> drives 2D inspection and dashboard renderables
```

Several older or parallel paths coexist:

- MLP, CNN, RNN, and SNN domain graphs under `core/src/neuralnetwork`;
- the older `readyQueueDispatch` neural execution helper;
- the standalone `packages/host/www` v2 graph pipeline and stream bus;
- the newer `RuntimeGraph` and `Session` path used by the active `GraphViewer`;
- ONNX `ComputeGraph`, which is a typed `RuntimeGraph` specialization.

The newer execution stack is the relevant base for Phase 1. The legacy SNN path is not currently connected to it.

## Relevant components

### Graph and type system

| File | Implemented role |
| --- | --- |
| `packages/dev/core/src/graph/graph.interfaces.ts` | `IGraphItem`, `INode`, `IOlink`, `IGraph`, enable flags, clone metadata |
| `packages/dev/core/src/graph/graph.graphItem.ts` | `GraphItem`, property observation, clone, node-field serialization |
| `packages/dev/core/src/graph/graph.node.ts` | Adjacency, optional pose, transform hierarchy, cached world transforms |
| `packages/dev/core/src/graph/graph.olink.ts` | `GraphOLink`, `Child`, and `ApplyTo` relations |
| `packages/dev/core/src/graph/graph.graph.ts` | Generic in-memory graph and clone support |
| `packages/dev/core/src/graph/graph.registry.ts` | `NodeRegistry`, type factories, ports, categories, standards, docs, editor metadata |
| `packages/dev/core/src/graph/graph.ontology.ts` | Controlled semantic type registry for nodes and relations |
| `packages/dev/core/src/graph/graph.dataflow.ts` | Legacy ready-queue dispatch used by neural family runtimes |

### Execution and simulation

| File | Implemented role |
| --- | --- |
| `packages/dev/core/src/execution/execution.interfaces.ts` | Runtime graph, node, channel, port, session, state, and event contracts |
| `packages/dev/core/src/execution/execution.node.ts` | `RuntimeNode`, readiness, fire/reset hooks, port helpers |
| `packages/dev/core/src/execution/execution.channel.ts` | `Channel`, slots, delayed seed, initial value, enable state |
| `packages/dev/core/src/execution/execution.graph.ts` | `RuntimeGraph`, graph-as-node composition, boundary routing, per-parent internal session |
| `packages/dev/core/src/execution/execution.session.ts` | Per-node buffers and signals, event queue, integer deferred-event clock, solver phase |
| `packages/dev/core/src/execution/execution.scheduler.ts` | Dynamic FIFO scheduling and static Kahn scheduling |
| `packages/dev/core/src/execution/execution.builder.ts` | Runtime graph and channel builder, including dangling boundary ports |
| `packages/dev/core/src/sim/sim.interfaces.ts` | Simulation phases, `IIntegrable`, sample-rate and solver contracts |
| `packages/dev/core/src/sim/rk4-adaptive.solver.ts` | Float64 Cash-Karp adaptive integrator |
| `packages/dev/core/src/sim/solver.registry.ts` | Solver factories, default options, option merging |
| `packages/dev/core/src/sim/solver.attachment.ts` | Groups direct graph leaves by `solverKind` and creates solvers |
| `packages/dev/core/src/sim/sim-graph.node.ts` | Hierarchical simulation graph, scene binding, inner substeps |
| `packages/dev/core/src/sim/sim.session.ts` | Optional PreStep, Step, and PostStep dispatch loop |
| `packages/dev/core/src/sim/sub-graph.materialize.ts` | Recursive materialization from saved model nodes and named endpoints |

### SNN and neural execution

| File | Implemented role |
| --- | --- |
| `packages/dev/core/src/neuralnetwork/snn/spike.interfaces.ts` | Spike, spike-neuron state, spike-synapse, and SNN graph interfaces |
| `packages/dev/core/src/neuralnetwork/snn/spike.runtime.ts` | Minimal direct membrane accumulation, threshold firing, propagation, and STDP |
| `packages/dev/core/src/neuralnetwork/snn/spike.stdp.ts` | STDP rule helpers |
| `packages/dev/core/src/neuralnetwork/nn.interfaces.ts` | Legacy neuron and synapse contracts |
| `packages/dev/core/src/neuralnetwork/ann/mlp/*` | Concrete MLP implementation used by the Brain 3D sample |
| `packages/dev/core/src/neuralnetwork/nn.runner.ts` | Adapter for legacy neural inference families inside `RuntimeGraph` |

No concrete LIF neuron, refractory-period model, membrane leak, spike encoder, or readout-neuron implementation was found. There are also no SNN-specific Jest tests.

### Physics, geometry, and data

| File or area | Implemented role |
| --- | --- |
| `packages/dev/plugins/physics/src/mechanical/housing/housing-mechanics.node.ts` | Three independent second-order structural modes with implicit Euler substeps |
| `packages/dev/plugins/physics/src/mechanical/vibration/imu.node.ts` | Three-axis IMU with pose-aware gravity and deterministic seeded noise |
| `packages/dev/plugins/physics/src/electric/sensor/power-meter.node.ts` | Electrical power and energy measurement for a three-phase system |
| `packages/dev/core/src/geometry/geometry.interfaces.ts` | Optional position, orientation, scale, parent, and transform contracts |
| `packages/dev/core/src/geometry/geometry.spatial.ts` | Point quadtree/octree with radius and nearest-neighbor queries |
| `data/UAH/UAH-DRIVESET-v1` | Recorded vehicle accelerometer and GPS traces |

The housing model is the closest existing mathematical primitive to the requested resonator. It implements `m*x'' + c*x' + k*x = F`, but it is not `IIntegrable`, does not expose Q, phase, or stored energy, and models three uncoupled axes inside one node.

### Editor, persistence, visualization, and debugging

| File or area | Implemented role |
| --- | --- |
| `packages/dev/nodeeditor/src/components/graph-viewer.ts` | Active editor, version 3 save/load, registry rehydration, connection endpoints |
| `packages/dev/nodeeditor/src/graph-session-builder.ts` | Converts the current canvas to a dynamic `RuntimeGraph` and `Session` |
| `packages/dev/nodeeditor/src/graph-runner.ts` | Browser `requestAnimationFrame` driver with free and fixed-realtime modes |
| `packages/dev/nodeeditor/src/property-panel.ts` | Decorator-driven editable/viewable inspector |
| `packages/dev/nodeeditor/src/live-binder.ts` | Design-time observable property propagation |
| `packages/dev/nodeeditor/src/dashboard.ts` | `IRenderable` dashboard contract and rAF repaint loop |
| `packages/dev/plugins/viz/src/plot/*` | Line, spectrum, waterfall, stem, and related dashboard nodes |
| `packages/dev/nodeeditor/src/debug-bus.ts` | Process-local editor debug log bus |
| `packages/dev/babylonjs/src/bestioles.renderer.ts` | Domain-specific Babylon Solid Particle System renderer |
| `packages/host/www/samples/brain3d/brain3d.js` | Standalone Babylon MLP visualizer |
| `packages/dev/plugins/geometry/src/editors/attitude-3d.ts` | Small Babylon editor embedded in a property editor |

### ONNX and C++ boundary

| File or area | Implemented role |
| --- | --- |
| `packages/dev/core/src/compute/compute.graph.ts` | Static tensor `ComputeGraph` over `RuntimeGraph` |
| `packages/dev/onnx/src/onnx/graph-builder.ts` | Builds compute nodes from parsed ONNX |
| `packages/dev/onnx/src/onnx/onnx.graph.ts` | `OnnxGraph` specialization |
| `packages/dev/onnx/src/onnx/export/export.exporter.ts` | Exports `IComputeGraph` kernels through registered serializers |
| `packages/dev/onnx/src/onnx/onnx-parser.ts` | Zero-dependency TypeScript ONNX parser ported from CyanMycelium code |
| `packages/tests/onnx-ops` | TypeScript operator conformance against onnxruntime |

Only two C++ source files were found, both under `packages/dev/applications/privates/driverv2/cpp`. They implement and test an isolated maneuver detector, not the graph or neuromorphic runtime. Documentation refers to a CyanMycelium C++ runtime and an existing embedded path, but its source and integration contract are external to this checkout.

## Graph V2

### What Graph V2 represents in this checkout

There is no exported `GraphV2` class or interface. The implemented central architecture is:

- `IGraphItem`: identity, tag, optional ontology type, runtime bag, clone and disposal;
- `INode`: graph item plus incoming/outgoing adjacency and optional spatial transform;
- `IOlink`: graph item plus source and target endpoints;
- `IGraph`: also a node, with node/link/input/output/hidden sets;
- `IRuntimeNode`: executable node with readiness, fire, reset, enable state, and optional per-session state factory;
- `IChannel`: executable link with source and destination slots, enable state, delayed seed, and initial value;
- `IRuntimeGraph`: an executable graph that is also an executable node.

`helios/sim-framework-api-v2.draft.md` is useful design history, not a reliable status ledger. Its header says `NOT implemented`, but `IIntegrable`, solver attachment, adaptive RK4, scene binding, and multi-rate `SimGraphNode` behavior now exist in code. The implementation must be treated as authority where it differs from that document.

### Capability answers

| Question | Finding |
| --- | --- |
| What is a node? | A `GraphNode` with adjacency and an optional transform. A `RuntimeNode` adds executable behavior, enable state, and optional per-session state. Node registry metadata supplies stable type IDs and port declarations. |
| What is an edge? | A `GraphOLink` with source and target endpoints. `Channel` adds runtime port identity and delay seed semantics. Domain subclasses include `DataLink`, neural synapses, `Child`, and `ApplyTo`. |
| Can nodes have custom typed state? | Yes through TypeScript subclasses, fields, decorators, interfaces such as `IIntegrable`, and `createNodeState`. There is no generic runtime schema that independently describes arbitrary state. |
| Can edges have custom typed properties? | Yes in memory through `GraphOLink` or `Channel` subclasses and `@cloneable` fields. The active editor does not persist or reconstruct those edge instances, so this is not currently a round-trip guarantee. |
| Are multiple edge types supported? | Yes in core. The editor recognizes data, config, and structural visual link kinds, while the runtime builder normally creates generic `Channel` objects and special-cases `ApplyTo`. |
| Can nodes execute custom dynamics? | Yes through `RuntimeNode.fire`, legacy neural runtimes, or the optional `IIntegrable.rhs` contract. |
| Can edges introduce delays? | `Channel.delayed` seeds a feedback channel with an initial token. Any node can publish an event with a future integer `validAtTick`. There is no general edge delay in seconds, and `ISpikeSynapse.delay` is unused. |
| Are events timestamped? | The scheduler event carrier has an optional integer delivery tick, not a continuous timestamp. `fire` receives continuous `t`. `ISpike` stores an integer counter timestamp generated by `SNNRuntime`. |
| Is execution synchronous or event-driven? | Both modes exist. Dynamic mode is a synchronous FIFO drain of queued publish events and readiness checks. Static mode is a synchronous Kahn traversal. `runAsync` exists for static async node calls, but there is no independently advancing asynchronous event service. |
| Is spatial position part of the graph model? | Yes. Every node optionally has a pose and transform parent. Editor canvas `x,y` is separate layout state. |
| Are hierarchical graphs supported? | Yes. `RuntimeGraph` is a node, exposes dangling-channel boundary ports, owns an internal session per parent session, and can be recursively materialized. |
| Are graph subtypes and extensions supported? | Yes through generic interfaces, class inheritance, builder factory overrides, node registry factories, plugins, ontology types, and specialization such as `ComputeGraph`. |
| How is serialization handled? | `GraphItem.serialize` writes `@cloneable` node fields. `GraphViewer.save` writes a version 3 envelope with layout, node type IDs, node data, endpoint-only connections, and dashboard layout. IDs and labels are handled by the editor envelope rather than `GraphItem`. |
| How are schemas versioned? | The editor envelope has a numeric version and compatibility handling for older saves. There is no graph migration registry, per-node schema version, or per-edge schema version. Node registry standards metadata is not a persistence migration mechanism. |
| Can it represent non-neural physical systems? | Yes. Physics, control, chemistry, scenes, transforms, signals, streams, solvers, and structural relations already use it. |
| How tightly is it coupled to ONNX? | The generic graph is not coupled to ONNX. ONNX is a static tensor-flow specialization via `ComputeGraph`, `Kernel`, and `DataLink`. |
| What is runtime-neutral? | Core identity, adjacency, ontology type, optional pose, graph nesting, and subclassable links. `RuntimeNode`, `Channel`, and `Session` are TypeScript runtime-specific. |
| What is visualization-only? | Canvas coordinates, anchors, colors, palette categories, dashboard layout, and renderable/editor metadata. Physical pose is not visualization-only. |
| What is embedded-runtime compatible? | ONNX compute operators have a documented and tested portability story. Generic runtime nodes, physical solvers, SNN events, decorators, editor JSON, and graph relations have no demonstrated embedded compatibility in this checkout. |

### Serialization and persistence limitations

`GraphItem.serialize` only includes `@cloneable` fields. It intentionally does not support typed arrays in its current implementation. It also does not distinguish immutable graph definition from runtime state. Several physics nodes mark accumulators and current state as cloneable, which means a graph file can capture live state while other runtime state remains omitted.

`GraphViewer.save` persists model connections as:

```text
from node and port name -> to node and port name
```

It does not persist the `Channel` or a domain edge object. `graph-session-builder.ts` and `sub-graph.materialize.ts` recreate generic channels through `RuntimeGraphBuilder.withChannel`, losing fields such as:

- delayed and initial value;
- synaptic weight and plasticity;
- distance, attenuation, coupling, phase shift, or energy cost;
- a custom edge type ID;
- edge runtime counters or metadata.

The in-memory graph can model such properties. The active persisted graph cannot yet round-trip them.

Architecture decision recorded on 2026-08-18: link persistence must mirror node persistence. A persisted model link must have the conceptual shape:

```text
{
  id,
  typeId,
  data: link.serialize(),
  from: { node, port },
  to: { node, port }
}
```

Loading must instantiate the typed link through a link factory or registry and restore `data` through `deserialize`, just as `NodeRegistry` plus `GraphItem.deserialize` does for nodes. The root graph builder and recursive subgraph materializer must consume the same typed link record.

Backward compatibility is not a primary constraint. A cheap fallback from an old endpoint-only record to a generic `Channel` is acceptable, but a complex migration layer must not weaken or delay the first-class link design. A clean graph-file version increment is acceptable if required.

### Canonical representation decision

Recommendation: adopt the implemented generic graph and execution stack as the structural basis. The current editor file is not yet canonical, but its successor can become the canonical persisted representation once typed links mirror typed nodes. Legacy `ISnnGraph` is not part of that canonical path.

The canonical representation should remain a versioned, runtime-neutral definition derived from the existing node and link semantics, with explicit node and edge type IDs and lossless configuration. The required link-persistence pattern is now decided; implementation and round-trip verification remain.

## Runtime

### Active TypeScript runtime

The active editor execution path is:

```text
GraphViewer canvas
  -> buildSessionFromViewer
  -> RuntimeGraphBuilder(mode = dynamic)
  -> generic Channel objects plus special ApplyTo links
  -> Session
  -> GraphRunner
  -> Session.run(t)
  -> solver integration phase
  -> dynamic or static scheduler dispatch
```

`buildSessionFromViewer` reuses the exact node objects held by the editor and constructs fresh channels for each play session. It binds scene context and solvers, then `GraphRunner` drives the session from browser `requestAnimationFrame`.

The dataflow runtime supports two destination port kinds:

- `stream`: FIFO discrete tokens, destructive consumption, readiness gating, capacity limits;
- `signal`: zero-order-hold values, overwrite on publish, non-destructive reads, no FIFO gating.

The dynamic scheduler is an ordered synchronous queue, not a parallel runtime. It alternates link delivery and node readiness checks until the queue is empty. Static scheduling computes Kahn order over enabled, non-delayed edges and visits each node once.

No worker, thread pool, WebGPU compute, CUDA, or WebAssembly simulation path was found. Babylon uses the GPU for rendering only.

### Legacy neural runtime divergence

MLP, CNN, RNN, and SNN family implementations still carry their own graph types and runtimes. `NNRunner` adapts some legacy inference runtimes into a `RuntimeNode`; the SNN code has no equivalent adapter. This creates semantic divergence:

- legacy graph state often lives directly on neurons or in `bag`;
- `Session` state lives in per-node buffers and signals, but many domain nodes also retain mutable state on the node instance;
- the legacy SNN runtime propagates directly through adjacency rather than through `Session` events.

Project decision: the SNN branch is a POC that the production architecture did not adopt. Phase 1 must not add an adapter that preserves its private propagation loop as a parallel runtime. Its useful formulas or vocabulary may be reused selectively, but LIF nodes and spike delivery belong on the existing `Session` execution path.

### C++ runtime boundary, deferred

Scope decision: CyanMycelium is a related external project, and this Phase 1 work must not inspect, modify, or integrate its C++ runtime for now. Its absence from this checkout is expected and is not an immediate Phase 1 blocker.

Documentation says CyanMycelium can execute certain compute graphs, and the ONNX parser was ported from CyanMycelium code. The only verifiable interoperability mechanism in this checkout is ONNX for supported compute kernels, backed by operator conformance tests. That evidence is useful as a future compatibility reference, not as an authorization to change the external runtime.

As expected for an external project, this checkout contains no evidence for:

- a C++ implementation of `IGraph`, `RuntimeGraph`, `Session`, SNN, or the simulation solver;
- a shared physical graph schema;
- TypeScript-to-C++ code generation;
- FFI, N-API, WebAssembly, or a live bridge;
- a compatibility test that loads one physical or SNN graph in both runtimes;
- a hardware backend contract for substituting a simulated node.

The private DriverV2 C++ maneuver detector is independent and does not supply this boundary. Any detailed C++ compatibility contract is deferred to a later phase or a separate cross-project review.

### ONNX relevance

ONNX is useful for portable tensor compute islands and learned readout models. It is not currently a suitable lossless format for the whole Physical Neuromorphic Graph because the exporter accepts `IComputeGraph`, requires a registered serializer per kernel, assumes tensor naming and topological compute semantics, and has no standard representation for mechanical solvers, spike events, spatial coupling, energy accounting, or arbitrary structural relations.

## Simulator

### Clock and scheduling model

`Session` maintains two clocks:

- `currentTick`: continuous simulation time supplied by the host as a JavaScript number;
- `tickIndex`: integer count incremented once for every `Session.run` call.

`dt` is `currentTick - lastT`. Scalar JavaScript values use double precision. The adaptive solver stores its shared state and scratch arrays in `Float64Array`. Tensor and signal subsystems often use `Float32Array`.

Each `Session.run(t)` performs:

1. update the clocks and increment `tickIndex`;
2. call attached solvers for a positive finite `dt`;
3. promote due integer-tick events;
4. synchronously drain the selected scheduler.

This is already a hybrid outline, continuous integration followed by discrete dispatch, so a separate scheduler is not automatically required.

### Fixed and variable timestep

`GraphRunner` selects:

- `free`: one tick per animation frame using variable wall-clock delta, explicitly non-deterministic;
- `fixed-realtime`: constant `1/simRate` ticks accumulated from wall time.

Fixed-realtime gives identical numerical `dt` per executed tick, but it caps work at `maxTicksPerFrame` and discards backlog after browser throttling. Therefore a wall-clock-duration run is not guaranteed to execute the same number of ticks on every machine. An offline driver that advances a known sequence of `t` values is needed for strict experiment reproducibility.

### Continuous state

`IIntegrable` provides a shared Float64 state vector, state gather/write hooks, a pure RHS contract, optional Jacobian, solver selection, and per-leaf solver options. `RK4AdaptiveSolver` implements an explicit non-stiff Cash-Karp method with tolerance and step bounds. Input signals are snapshotted once per macro-step and held constant during adaptive microsteps.

This is a strong basis for a reduced-order resonator. Relevant limitations are:

- stream events are ignored by the solver input snapshot;
- solver integration occurs before discrete dispatch;
- a spike dispatched during tick N cannot affect the integration window that already ran for tick N;
- continuous inputs are zero-order-held from a previous publish state;
- the leaf API has no supported way to resolve another leaf's state-vector offset, so strongly coupled modes across separate leaves require a coupling contract or one composite integrable node;
- solver attachment only scans direct `graph.nodes`; nested `SimGraphNode` instances manage their own inner sessions separately.

### Delayed and asynchronous events

`Session.publish` can attach `validAtTick`, and future events remain in a deferred array until the integer tick is due. This supports deterministic tick-relative delays. It does not support continuous-time event ordering within an integration window.

`Channel.delayed` is a feedback-cycle initialization feature, not a general propagation-delay model. A future event scan is linear in the number of deferred events. There is no priority queue keyed by continuous timestamp.

### Simulation phases

`SimSession` loops through PreStep, Step, and PostStep by invoking `Session.run(t)` once per phase. This increments `tickIndex` once per phase, and only the first phase at a new `t` sees a positive `dt`. Future tick delays therefore advance by phase count rather than outer simulation-step count when multi-phase mode is used. This behavior needs an explicit semantic decision before it is used for spike timing.

### State lifecycle and replay

The architecture contains two state locations:

- per-session buffers, signals, queues, and graph-node state;
- mutable fields on node objects, including several physical and neural states.

The solver gathers from and writes back to node fields. The editor also reuses those node instances across session builds. This does not consistently satisfy the requirement that simulation state be separate from graph definition, and it weakens the claim that one graph instance can safely serve concurrent sessions.

`Logic.Sim:snapshot` and `restore` store arbitrary payload references in a process-local map. They do not serialize an entire `Session`, queue, deferred events, solver state, random-generator state, or nested sessions. There is no deterministic event-log replay service.

### Determinism

Determinism is achievable for a constrained headless run when all of these are fixed:

- graph node and link order;
- sequence of `Session.run(t)` calls;
- solver options and floating-point environment;
- deterministic sources and per-node seeds;
- no browser wall-clock free mode;
- no unordered external input or asynchronous side effect.

The repository includes deterministic seeded patterns such as `RngSeedNode` and the IMU local LCG. Other utilities and benchmark generators still use `Math.random`, and there is no session-wide seed service that can audit all randomness.

### Telemetry, energy, and performance instrumentation

There is no first-class simulation telemetry pipeline. Available pieces are:

- node property observation and `@viewable` fields;
- editor `DebugBus` and debug console;
- dashboard plots with internal buffers;
- RK4 last-step diagnostics;
- a neural-only `Profiler` for phase wall time and FLOPS;
- a domain-specific electrical `PowerMeterNode`;
- benchmark scripts that already write JSON and CSV.

There is no generic event counter, per-node execution timer, per-edge activity counter, energy ledger, energy-cost interface, telemetry sampling policy, or replay log. The electrical power meter measures modeled plant energy, not computational or neuromorphic operation costs.

### Test and benchmark evidence

The project uses Jest 29 with ts-jest and searches `packages/tests/**/*.test.ts`. Relevant existing suites cover dynamic/static execution, boundary ports, nested graphs, RK4 integration, physics, IMU behavior, and spatial queries. No SNN test suite was found.

The following focused command was run during this review:

```text
npm test -- --runInBand
  packages/tests/execution/dynamic.test.ts
  packages/tests/execution/nested.test.ts
  packages/tests/execution/boundary-ports.test.ts
  packages/tests/control/rk4-solver.test.ts
  packages/tests/physics/housing-mechanics.test.ts
  packages/tests/physics/imu.test.ts
  packages/tests/geometry/geometry.spatial.test.ts
  packages/tests/control/feedback.test.ts
  packages/tests/sim/sim-session.test.ts
```

Result across the two invocations: 7 suites passed, 2 suites failed, 81 tests passed, and 3 tests failed.

The failures are in the current checkout and are directly relevant:

- `dynamic.test.ts`: disabled-channel delivery produces `undefined`, and a delayed preseed plus producer publish overflows a capacity-one slot;
- `sim-session.test.ts`: a phased consumer that intentionally retains data receives another publish and overflows the capacity-one slot.

These failures indicate that enable semantics, delayed initialization ordering, phase retention, and buffer capacity are not currently internally consistent.

Existing performance benchmarks focus on CNN, ViT, SAT, and LiDAR workloads. They do not measure scheduler events per second, mechanical integration cost, graph traversal, memory for large SNNs, or Babylon overhead independently.

## Visualization

### Active 2D editor

The active visualization and inspection surface is `GraphViewer`, not Babylon. It already offers:

- typed ports and connection compatibility;
- node type factories and categories;
- editable and viewable property metadata;
- reactive property inspection;
- graph navigation into serialized subgraphs;
- dashboard tiles with persisted layout;
- plot nodes that keep DOM/rendering work outside `fire`;
- editor-local debug logging.

These are directly useful for node and edge inspection, but edge objects are not currently exposed or persisted as rich model items.

### Babylon stack

The Babylon package is domain-specific. `BestiolesRenderer` uses a Solid Particle System for batched creature rendering and directly advances `CreatureWorld` inside its render loop. It is not a renderer for `IGraph`, `RuntimeGraph`, or `Session`.

The Brain 3D sample is also standalone. It builds an MLP XOR graph, executes `MLPInferenceRuntime`, reads neural activations, creates one Babylon mesh per neuron, and colors a line system from synaptic weights. Its HTML describes thin instances, but the JavaScript implementation creates individual sphere meshes. It does not use SNN spikes or the active editor runtime.

The geometry plugin's attitude editor shows that a Babylon canvas can be embedded as a custom editor. The dashboard `IRenderable` split between `fire` buffering and `repaint` is the cleanest existing separation for simulation versus rendering.

No generic Babylon graph-scene adapter, spike animation service, physical-mode renderer, or performance benchmark was found.

## Trace of one existing spike

The complete path requested by the brief does not exist. The actual TypeScript SNN path is:

```text
number[] input
  -> SNNRuntime.prepareInputs(graph, inputData)
  -> graph.inputs mapped to { neuron, amplitude }
  -> SNNRuntime.pulse(inputSpikes)
  -> neuron.membranePotential += amplitude
  -> threshold comparison
  -> SNNRuntime._fireNeuron(neuron)
  -> increment private integer _tick
  -> append ISpike to neuron.spikes
  -> reset membranePotential to 0
  -> set lastSpikeTime
  -> while-loop over active spikes
  -> spike.source.onsc<ISpikeSynapse>()
  -> target.membranePotential += spike.amplitude * synapse.weight
  -> target threshold comparison
  -> target _fireNeuron
  -> optional STDP on the active synapse
```

Exact modules and types:

- input and runtime: `packages/dev/core/src/neuralnetwork/snn/spike.runtime.ts`, `SNNRuntime.prepareInputs`, `pulse`, `_fireNeuron`, `_applySTDP`;
- graph and state: `packages/dev/core/src/neuralnetwork/snn/spike.interfaces.ts`, `ISnnGraph`, `ISpikeNeuron`, `ISpike`, `ISpikeSynapse`;
- topology: legacy `IGraph`, `INode`, and `IOlink` adjacency;
- plasticity: `packages/dev/core/src/neuralnetwork/snn/spike.stdp.ts`.

Breaks in the requested chain:

- there is no concrete LIF class, membrane leak, refractory period, or continuous-time update;
- there is no concrete SNN graph builder or registered editor node family in the inspected path;
- `ISpikeSynapse.delay` is declared but ignored;
- spike propagation bypasses `RuntimeGraph`, `Session`, and `Scheduler`;
- timestamps are a private integer counter that is incremented both by firing and by propagation-loop progress;
- no spike encoder connects sensor signals to this runtime;
- no `NNRunner` adapter exposes `SNNRuntime` to the active graph session;
- no Babylon or dashboard visualization subscribes to this spike state;
- the Brain 3D sample visualizes MLP activation, not spikes;
- no C++ spike path can be traced from the repository.

Therefore the trace ends after target-neuron mutation. There is no existing end-to-end path from input through Graph V2, runtime scheduling, LIF state, delayed synapse, target neuron, and simulation visualization.

## Reusable components

### Reuse directly

| Component | Why it is reusable |
| --- | --- |
| `GraphItem`, `GraphNode`, `GraphOLink` | Stable generic topology and property-observation base |
| `RuntimeNode`, `RuntimeGraph`, `Session`, `Scheduler` | Executable graph, dynamic events, signal semantics, and hierarchy |
| `NodeRegistry` and plugin activation | Stable type IDs, factories, ports, docs, palette integration |
| `IIntegrable`, solver registry, `RK4AdaptiveSolver` | Reduced-order continuous dynamics and diagnostics |
| `SimGraphNode` and boundary ports | Nested multi-rate simulation and graph-as-node composition |
| `IHasTransform` and `Child` | Physical placement and hierarchy independent of editor layout |
| `PointSpatialTree` radius query | Candidate broad-phase lookup for distance-based coupling |
| editable/viewable decorators and property panel | Immediate parameter and live-state inspection |
| dashboard `IRenderable` | Keeps simulation state independent from repaint work |
| seeded RNG patterns | Reproducible sensor noise and Monte Carlo building blocks |
| Jest test organization | Appropriate place for new physics and hybrid-runtime tests |
| benchmark JSON/CSV output patterns | Reusable report plumbing, not reusable workload logic |

### Reuse with adaptation

| Component | Required adaptation |
| --- | --- |
| `HousingMechanicsNode` | Extract or re-express its validated oscillator math, add Q/phase/energy/coupling semantics, and decide between a composite state vector or separate modes |
| `SNNRuntime` and spike interfaces | Treat as POC reference only. Reuse formulas or vocabulary selectively, while implementing LIF state and spike delivery directly on `Session` and `RuntimeGraph` |
| `Channel` subclasses | Suitable for semantic edges in memory, but persistence and registry reconstruction must be extended first |
| Spatial tree | Add node-to-position mapping and index maintenance when nodes move; `kNearest` currently collects and sorts all entries |
| Brain 3D sample | Reuse visual vocabulary and line-system ideas, not its MLP coupling or per-neuron mesh scaling strategy |
| Bestioles renderer | Reuse batched-rendering and lifecycle patterns, not its domain-specific world update loop |
| ONNX compute graph | Embed learned or tensor readout subgraphs; do not force physical topology into ONNX |
| UAH accelerometer data | Useful recorded motion input, but labels describe driving behavior rather than the eight proposed wrist classes |

### Do not treat as canonical without further evidence

- legacy `ISnnGraph` and direct `SNNRuntime` execution;
- editor endpoint-only connection records;
- HELIOS v2 draft status claims;
- external CyanMycelium behavior described only in documents;
- Babylon samples as a generic visualization framework.

## Extension points

These are existing seams, not an implementation plan:

1. Node types naturally enter through a plugin and `NodeRegistry` factories, with `RuntimeNode.fire` for events or `IIntegrable.rhs` for continuous state.
2. Domain edges naturally extend `GraphOLink` or `Channel`, and their builders can override `_createChannel`.
3. Per-session node state can enter through `createNodeState`, although current physical nodes do not consistently use it.
4. Continuous mechanics naturally enter the session solver phase and expose observations during dispatch.
5. Discrete spikes naturally fit `stream` ports and future integer-tick `validAtTick` delivery after the timing contract is defined.
6. Coupled mechanical modes can be represented inside one `IIntegrable` state vector today. Separate coupled leaves need an explicit coupling/offset design.
7. Spatial coupling laws can sit above `IHasTransform` and `PointSpatialTree`; the graph core should not hardcode a material law.
8. Inspector fields naturally use `@editable` and `@viewable` with units.
9. Dashboard visualization naturally uses `IRenderable`; Babylon can provide a renderer behind that contract or a custom editor.
10. ONNX can remain an optional subgraph for learned tensor inference and embedded compute export.

## Architectural risks

| Severity | Risk | Evidence and impact |
| --- | --- | --- |
| High, required evolution | Edge semantic loss exists in current files, but the target design is resolved | Links must mirror nodes with `typeId`, `data`, identity, and endpoints. Compatibility with endpoint-only files is secondary when costly. |
| High | Integrated LIF/SNN capability is absent, but its direction is resolved | The POC bypasses `Session` and is not canonical. Phase 1 must implement the required behavior on the existing runtime rather than preserve a parallel SNN engine. |
| Deferred | C++ runtime contract is external | CyanMycelium must not be touched in Phase 1. TypeScript work should avoid unnecessary incompatibilities, but no cross-runtime implementation or validation is required now. |
| High | Hybrid causality is undefined | Solvers run before event dispatch and ignore stream inputs. Spike impulses need an explicit macro-step boundary or continuous timestamp policy. |
| High | Coupled continuous leaves lack a supported shared-state lookup | Separate mode nodes cannot safely access each other's current solver slices through the public contract. A composite node works but changes graph granularity. |
| High | Definition and execution state are mixed | Node fields contain live physics/neural state and some are serialized. Per-session state is not the sole source of mutable execution state. |
| High | Scheduler tests currently fail | Disabled, delayed, phased, and capacity-one buffer behavior is inconsistent in three focused tests. |
| High | Graph V2 identity is ambiguous | Design documents, editor versions, and implemented runtime concepts use overlapping V2 terminology. |
| High | Determinism depends on the driver and node discipline | Fixed `dt` is available, but browser catch-up can drop ticks and randomness is not governed by a session seed. |
| Medium | No first-class energy or telemetry model | Existing power and profiling code is domain-specific and does not cover neuromorphic operations. |
| Medium | No full replay/snapshot | Payload snapshot nodes do not capture session or solver state. |
| Medium | Spatial index is not graph-maintained | Movement does not automatically update the index; nearest-neighbor search is not optimized. |
| Medium | Babylon paths are not graph-generic | Existing samples are domain-specific, and the Brain 3D implementation does not match its thin-instance description. |
| Medium | Schema evolution is weak | Numeric envelope versioning exists, but there is no migration framework for node and edge semantic changes. The new link model may use a clean file-version break instead of an expensive migration layer. |
| Medium | Multiple graph/runtime families remain | Legacy neural graphs, host pipeline graphs, compute graphs, and editor runtime graphs can diverge in timing and persistence semantics. |
| Medium | Existing benchmark tooling is not deterministic by default | The comprehensive benchmark uses `Math.random` and targets unrelated neural workloads. |

## Unknowns and unanswered questions

These cannot be resolved safely from the checkout:

1. What are the required units for delay, phase, coupling, displacement, mechanical energy, and spike amplitude?
2. Should a spike be an impulse at a continuous timestamp, a tick-boundary event, or a finite-width drive signal?
3. Should mechanical coupling be solved as one assembled global system or as graph-local zero-order-held interactions?
4. Is lossless serialization expected to include current simulation state, or only graph definition and initial conditions?
5. What deterministic floating-point tolerance is required across TypeScript, browser engines, and Node.js for Phase 1?
6. Which existing host/editor is the product surface for Phase 1, given that both the current TypeScript editor and older standalone host graph pipeline remain?
7. Is UAH vehicle motion acceptable for the first baseline, or is a wrist-wearable dataset required?
8. What physical calibration data exists for piezo excitation, damping, energy, and harvesting parameters?

Deferred external questions, explicitly outside the present scope:

- which exact graph or ONNX schema the production CyanMycelium runtime consumes;
- which LIF, spike scheduling, delay, spatial, or energy capabilities CyanMycelium already implements;
- whether a future C++ target executes the whole physical graph or only an exported neural/readout subset.

## Recommendation

Use the implemented core graph and execution stack as the foundation, with typed-link persistence recorded as a crucial Architecture Decision Record item.

The recommended architectural direction from the evidence is:

- canonical topology based on `IGraph` and typed node/link identities;
- link save/load modeled directly on node save/load, including `typeId`, `data`, identity, and endpoints;
- execution based on `RuntimeGraph`, `Session`, signals, streams, and solver attachment;
- LIF and spike behavior implemented directly as `RuntimeNode` and `Session` semantics, with the old `SNNRuntime` retained only as a POC reference;
- physical nodes as ordinary registered runtime nodes with optional `IIntegrable` behavior;
- physical pose through the existing transform contract;
- ONNX as an optional compute-subgraph interchange, not as the full physical graph format;
- visualization as a consumer of runtime state through the editor/dashboard/Babylon layers, never as a state owner.

Before a Phase 1 implementation plan can be responsibly proposed, the project must determine:

1. the discrete-to-continuous spike timing and impulse policy;
2. the intended state separation and replay contract;
3. whether coupled modes are one assembled integrable system or independently addressable mode nodes.

The CyanMycelium C++ boundary is intentionally deferred and is not part of this prerequisite list.

This is a required stop point. No production code was modified as part of this review.

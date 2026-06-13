# ONNX Model

`spk.onnx:model`

Loadable ONNX model as a single graph node. The node IS an OnnxGraph (fractal composition: a RuntimeGraph that implements IRuntimeNode), preloaded from the contents of a `.onnx` file and run as a static forward DAG inside the parent graph. Use it to embed a trained network (encoder, classifier, filter) in an editor pipeline without re-implementing it op by op. Carries the `onnx` standard badge.

## Ports are DERIVED from the loaded model

The node registers with NO input or output ports: a freshly dropped ONNX Model has none until a model loads. On load, one boundary input port is created per declared (non-initializer) ONNX graph input and one boundary output port per declared graph output, each named after its TENSOR NAME. Swapping models replaces the port set and invalidates the internal topology caches; existing cables whose tensor names no longer match go to the drop path (see the firing policy below), they are never silently rerouted to a coincidentally same-named port.

## Loading a model

Property panel ("onnx-model" editor): drop a `.onnx` file on the dashed zone or click it to browse. On success the status line shows `name | N in, N out, N ops`; on failure the zone turns red with the parse error. Non-`.onnx` filenames are ignored.

Programmatic / push channel: `loadModelValidated(bytes, opts)` is the hardened variant for pushing a model at runtime. Checks run IN ORDER, all against staged (local) structures:

1. `sha256`: when given, must equal the digest of the bytes (case-insensitive hex compare, checked BEFORE any protobuf work).
2. parse + build: the bytes must parse and produce a non-empty graph.
3. `expectInputShape`: compared against the FIRST declared graph input. Ranks must be equal; each dimension must match exactly UNLESS either side is <= 0, which is a wildcard (the parser stores symbolic/dynamic dims as 0; pass 0 or -1 to mean "any", e.g. a dynamic batch dim).
4. `expectOutputCount`: when given, must equal the number of declared graph outputs.
5. `expectOutputShape`: FIRST declared graph output, same wildcard rule.

Double-bank atomic swap: the candidate is parsed and built into a staging bank, and the live topology is swapped only after every check passes. On ANY failure the previously loaded model stays fully intact and runnable; the reason lands on the same `loadError` field the editor watches. The returned report carries `ok`, `error`, the always-computed lowercase `sha256`, and the declared `inputNames` / `outputNames` on success.

`loadModel(bytes, name)` is the unvalidated editor path: same staging machinery, no expectation checks.

## Wiring contract (tensor names)

- INTO the model: the cable's destination slot (`toSlot`) is the ONNX INPUT tensor name. The editor sets this automatically when you wire onto a derived input port.
- OUT of the model: the cable's source slot (`fromSlot`) is the ONNX OUTPUT tensor name. One output port may fan out to several parent cables: the value is read once and published to every consumer.

## All-or-nothing input gate

An embedded model fires all-or-nothing on its declared input ports: before anything is published into the inner session, EVERY derived input port must be covered by a ready parent token in that fire. If the cover is partial, the ready tokens are consumed and DROPPED and the inner run is skipped (a half-fed fire would leave a joining op's capacity-1 slot full inside the inner session and overflow the parent on the next fire). Tokens addressed to a slot that matches no internal port (e.g. any token sent to an UNLOADED model) are likewise consumed and dropped.

## Pitfalls

- An unloaded model node is a silent sink: no ports, and any token addressed to it is dropped without an error. Load first, wire second.
- Partially wired multi-input models never run and never error: every wired token is dropped each fire. Watch for "the model consumes but nothing comes out" and check that ALL declared inputs are fed in the same fire.
- The shape expectations only inspect the FIRST declared input/output; multi-input models need `expectOutputCount` plus conventions, not per-tensor shape checks.
- A rejected push keeps the OLD model serving: check the report's `ok` (or the red `loadError` in the panel) rather than assuming the new bytes are live.

# ONNX Parser: Zero-Dependency Protobuf Reader

## Origin

This module is a TypeScript port of the C++ protobuf reader originally written
for **CyanMycelium** (BlueSteelLadyBug library). It parses ONNX model files
(.onnx) without any external dependency (no `protobuf.js`, no `protoc`,
no code generation).

## Architecture

```
.onnx file (binary protobuf)
       |
       v
  MemoryStream (Uint8Array wrapper)
       |
       v
  PBReader (wire format decoder: varint, fixed32/64, length-delimited)
       |
       v
  OnnxParser (maps protobuf fields to ONNX structures)
       |
       v
  OnnxParseResult { nodes, initializers, inputs, outputs }
```

## File structure

```
packages/dev/runtime/src/onnx/
  pb/
    stream.ts        IInputStream, MemoryStream, StreamView
    reader.ts        PBReader, PBSubReader, WireType
    index.ts
  onnx-types.ts      OnnxDataType, protobuf field constants, parsed types
  onnx-parser.ts     OnnxParser: binary -> OnnxParseResult
  index.ts
```

## Protobuf wire format

Protobuf encodes data as a flat sequence of (tag, value) pairs:

```
tag = (fieldNumber << 3) | wireType

wireType 0 : varint        (int32, int64, bool, enum)
wireType 1 : fixed 64-bit  (double, fixed64)
wireType 2 : length-delim  (string, bytes, sub-message, packed arrays)
wireType 5 : fixed 32-bit  (float, fixed32)
```

The PBReader decodes these primitives. The OnnxParser knows the ONNX
.proto field numbers and uses PBReader to extract typed values.

## Stream abstraction

| Class | Purpose |
|---|---|
| `MemoryStream` | Wraps a `Uint8Array` with position tracking and seeking |
| `StreamView` | Bounded window over another stream (for sub-messages) |

Both implement `IInputStream` with `read()`, `readByte()`, `seek()`,
`getPosition()`, `getRemainingBytes()`.

## PBReader

Pull-style parser. Caller drives the read loop:

```typescript
const reader = new PBReader(new MemoryStream(bytes));
while (reader.readTag()) {
    switch (reader.fieldNumber) {
        case 1: version = reader.readInt32(); break;
        case 7: subReader = reader.getSubMessageReader(); break;
        default: reader.skip(); break;
    }
}
```

Key features:
- **Save/restore**: snapshot stack for two-pass parsing (e.g., read op_type
  before other fields, as ONNX puts it at field index 4)
- **Sub-message readers**: `getSubMessageReader()` returns a PBSubReader
  scoped to the current length-delimited field via a StreamView
- **Packed arrays**: `readPackedFloat32()`, `readPackedInt32()` for
  efficient bulk reads of tensor data

## OnnxParser

Stateless parser that produces an `OnnxParseResult`:

```typescript
const result = OnnxParser.parse(onnxBytes);

result.irVersion    // ONNX IR version
result.graphName    // graph name
result.nodes        // OnnxNodeInfo[] : opType, inputs, outputs, attributes
result.initializers // OnnxTensorInfo[] : name, dims, floatData
result.inputs       // OnnxValueInfo[] : name, elemType, shape
result.outputs      // OnnxValueInfo[] : name, elemType, shape
```

The parser is data-only. It does not build a ComputeGraph. A future
`OnnxGraphBuilder` will map `OnnxNodeInfo.opType` values (Conv, Relu,
MatMul, Add...) to SpikyPanda compute nodes.

## Supported ONNX features

| Feature | Status |
|---|---|
| Graph topology (nodes, inputs, outputs) | Supported |
| Node attributes (int, float) | Supported |
| Float32 initializers (packed + raw_data) | Supported |
| Tensor shapes and types | Supported |
| Int64 / string / double initializers | Not yet |
| Subgraphs (If, Loop operators) | Not yet |
| Quantization annotations | Skipped |
| Sparse initializers | Skipped |

## C++ to TypeScript mapping

| C++ (CyanMycelium) | TypeScript (SpikyPanda) |
|---|---|
| `lb_byte_t*` + `memcpy` | `Uint8Array` + `DataView` |
| `union { uint32; byte[4]; }` | `DataView.getFloat32(0, true)` |
| `lb_uint64_t` varints | `number` (safe to 2^53, sufficient for ONNX) |
| C++ templates for packed reads | Typed methods (`readPackedFloat32`, `readPackedInt32`) |
| `goto _error` pattern | Early return with `null` / `false` |
| `OnnxGraphBuilder -> Graph*` | `OnnxParser -> OnnxParseResult` (data, not graph) |

## Next steps

1. **OnnxGraphBuilder**: convert `OnnxParseResult` into a `ComputeGraph`
   by mapping ONNX op types to SpikyPanda compute nodes
2. **Op registry**: pluggable mapping from op type string to node constructor
3. **Int64 / raw_data support**: extend initializer parsing for all data types
4. **Round-trip**: export a ComputeGraph back to ONNX binary

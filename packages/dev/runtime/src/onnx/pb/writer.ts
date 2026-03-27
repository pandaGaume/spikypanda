// ═══════════════════════════════════════════════════════════════════════════
// Protobuf wire format writer
//
// Symmetric counterpart to reader.ts.
// Writes protobuf-encoded binary data without requiring generated code or
// external dependencies.
//
// Supports:
//   - Varint, fixed32, fixed64 wire types
//   - Length-delimited fields (strings, bytes, sub-messages)
//   - Packed repeated fields
//   - Sub-message writers with automatic length prefixing
// ═══════════════════════════════════════════════════════════════════════════

import { WireType } from "./reader";

// ─── Default buffer size ─────────────────────────────────────────────────

const DEFAULT_CAPACITY = 256;
const GROWTH_FACTOR = 2;

// ─── Scratch buffers (reused across writes to avoid allocations) ─────────

const _scratch4 = new Uint8Array(4);
const _scratch8 = new Uint8Array(8);
const _view4 = new DataView(_scratch4.buffer);
const _view8 = new DataView(_scratch8.buffer);

// ─── PBWriter ────────────────────────────────────────────────────────────

/**
 * Push-style protobuf writer. Writes tags, then values sequentially.
 *
 * Usage:
 * ```typescript
 * const writer = new PBWriter();
 * writer.writeTag(1, WireType.VARINT);
 * writer.writeInt32(42);
 * writer.writeTag(2, WireType.LEN);
 * writer.writeString("hello");
 * const bytes = writer.finish();
 * ```
 */
export class PBWriter {
    protected _buffer: Uint8Array;
    protected _pos: number;

    public constructor(capacity: number = DEFAULT_CAPACITY) {
        this._buffer = new Uint8Array(capacity);
        this._pos = 0;
    }

    // ── Tag writing ───────────────────────────────────────────────────────

    /**
     * Write a protobuf tag (field number + wire type).
     */
    public writeTag(fieldNumber: number, wireType: WireType): void {
        this._writeVarint(((fieldNumber << 3) | wireType) >>> 0);
    }

    // ── Accessors ─────────────────────────────────────────────────────────

    /** Current number of bytes written. */
    public get length(): number {
        return this._pos;
    }

    // ── Value writers ─────────────────────────────────────────────────────

    /** Write a varint-encoded int32. */
    public writeInt32(value: number): void {
        this._writeVarint(value | 0);
    }

    /** Write a varint-encoded uint32. */
    public writeUint32(value: number): void {
        this._writeVarint(value >>> 0);
    }

    /** Write a varint-encoded int64 (from a JS number, safe up to 2^53). */
    public writeInt64(value: number): void {
        this._writeVarint64(value);
    }

    /** Write a fixed32 (little-endian 4 bytes). */
    public writeFixed32(value: number): void {
        this._ensureCapacity(4);
        _view4.setInt32(0, value, true);
        this._buffer.set(_scratch4, this._pos);
        this._pos += 4;
    }

    /** Write a fixed64 (little-endian 8 bytes, from a JS number). */
    public writeFixed64(value: number): void {
        this._ensureCapacity(8);
        const lo = value >>> 0;
        const hi = (value / 0x100000000) >>> 0;
        _view8.setUint32(0, lo, true);
        _view8.setUint32(4, hi, true);
        this._buffer.set(_scratch8, this._pos);
        this._pos += 8;
    }

    /** Write a float32 (fixed32 wire type). */
    public writeFloat(value: number): void {
        this._ensureCapacity(4);
        _view4.setFloat32(0, value, true);
        this._buffer.set(_scratch4, this._pos);
        this._pos += 4;
    }

    /** Write a float64 (fixed64 wire type). */
    public writeDouble(value: number): void {
        this._ensureCapacity(8);
        _view8.setFloat64(0, value, true);
        this._buffer.set(_scratch8, this._pos);
        this._pos += 8;
    }

    /** Write a boolean (varint wire type). */
    public writeBool(value: boolean): void {
        this._writeVarint(value ? 1 : 0);
    }

    /**
     * Write a length-delimited string.
     * Writes the length prefix followed by UTF-8 encoded bytes.
     */
    public writeString(value: string): void {
        const encoded = new TextEncoder().encode(value);
        this._writeVarint(encoded.byteLength);
        this._writeRawBytes(encoded);
    }

    /**
     * Write length-delimited raw bytes.
     * Writes the length prefix followed by the byte content.
     */
    public writeBytes(value: Uint8Array): void {
        this._writeVarint(value.byteLength);
        this._writeRawBytes(value);
    }

    // ── Packed repeated fields ────────────────────────────────────────────

    /**
     * Write packed varint int32 values.
     * Writes a length prefix followed by varint-encoded values.
     * @param values  Source array.
     * @param count   Number of elements to write from the array.
     */
    public writePackedInt32(values: Int32Array, count: number): void {
        // Measure first to compute length prefix
        const tmp = new PBWriter();
        const n = Math.min(count, values.length);
        for (let i = 0; i < n; i++) {
            tmp._writeVarint(values[i] | 0);
        }
        const packed = tmp.finish();
        this._writeVarint(packed.byteLength);
        this._writeRawBytes(packed);
    }

    /**
     * Write packed float32 values.
     * @param values  Source array.
     * @param count   Number of elements to write from the array.
     */
    public writePackedFloat32(values: Float32Array, count: number): void {
        const n = Math.min(count, values.length);
        this._writeVarint(n * 4);
        this._ensureCapacity(n * 4);
        for (let i = 0; i < n; i++) {
            _view4.setFloat32(0, values[i], true);
            this._buffer.set(_scratch4, this._pos);
            this._pos += 4;
        }
    }

    /**
     * Write packed float64 values.
     * @param values  Source array.
     * @param count   Number of elements to write from the array.
     */
    public writePackedFloat64(values: Float64Array, count: number): void {
        const n = Math.min(count, values.length);
        this._writeVarint(n * 8);
        this._ensureCapacity(n * 8);
        for (let i = 0; i < n; i++) {
            _view8.setFloat64(0, values[i], true);
            this._buffer.set(_scratch8, this._pos);
            this._pos += 8;
        }
    }

    // ── Sub-message ───────────────────────────────────────────────────────

    /**
     * Write a sub-message using a callback.
     * The callback receives a fresh writer; its output is automatically
     * length-prefixed and appended to this writer.
     *
     * Usage:
     * ```typescript
     * writer.writeTag(3, WireType.LEN);
     * writer.writeSubMessage((sub) => {
     *     sub.writeTag(1, WireType.VARINT);
     *     sub.writeInt32(42);
     * });
     * ```
     */
    public writeSubMessage(fn: (sub: PBWriter) => void): void {
        const sub = new PBWriter();
        fn(sub);
        const data = sub.finish();
        this._writeVarint(data.byteLength);
        this._writeRawBytes(data);
    }

    /**
     * Write pre-serialized sub-message bytes with a length prefix.
     */
    public writeRawSubMessage(data: Uint8Array): void {
        this._writeVarint(data.byteLength);
        this._writeRawBytes(data);
    }

    // ── Finalize ──────────────────────────────────────────────────────────

    /**
     * Return the written bytes as a compact Uint8Array.
     * After calling finish(), the writer should not be reused.
     */
    public finish(): Uint8Array {
        return this._buffer.subarray(0, this._pos);
    }

    /**
     * Reset the writer to reuse its buffer.
     */
    public reset(): void {
        this._pos = 0;
    }

    // ── Private primitives ────────────────────────────────────────────────

    /**
     * Write a varint (unsigned 32-bit).
     */
    protected _writeVarint(value: number): void {
        value = value >>> 0; // force unsigned 32-bit
        while (value > 0x7f) {
            this._writeByte((value & 0x7f) | 0x80);
            value >>>= 7;
        }
        this._writeByte(value);
    }

    /**
     * Write a 64-bit varint from a JS number (safe up to 2^53).
     */
    protected _writeVarint64(value: number): void {
        // Handle negative or values > 2^32 by splitting into lo/hi
        let lo = value >>> 0;
        let hi = (value / 0x100000000) >>> 0;

        // Write lo part (up to 4 full 7-bit groups = 28 bits)
        while (hi > 0 || lo > 0x7f) {
            this._writeByte((lo & 0x7f) | 0x80);
            lo = ((lo >>> 7) | (hi << 25)) >>> 0;
            hi >>>= 7;
        }
        this._writeByte(lo & 0x7f);
    }

    protected _writeByte(b: number): void {
        this._ensureCapacity(1);
        this._buffer[this._pos++] = b;
    }

    protected _writeRawBytes(data: Uint8Array): void {
        this._ensureCapacity(data.byteLength);
        this._buffer.set(data, this._pos);
        this._pos += data.byteLength;
    }

    protected _ensureCapacity(needed: number): void {
        const required = this._pos + needed;
        if (required <= this._buffer.byteLength) return;

        let newSize = this._buffer.byteLength;
        while (newSize < required) {
            newSize *= GROWTH_FACTOR;
        }
        const newBuf = new Uint8Array(newSize);
        newBuf.set(this._buffer);
        this._buffer = newBuf;
    }
}

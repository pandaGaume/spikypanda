// ═══════════════════════════════════════════════════════════════════════════
// Protobuf wire format reader
//
// Ported from CyanMycelium/BlueSteelLadyBug C++ implementation (lb_parser).
// Reads protobuf-encoded binary data without requiring generated code or
// external dependencies.
//
// Supports:
//   - Varint, fixed32, fixed64 wire types
//   - Length-delimited fields (strings, bytes, sub-messages)
//   - Packed repeated fields
//   - Save/restore snapshots for two-pass parsing
//   - Sub-message readers with bounded scope
// ═══════════════════════════════════════════════════════════════════════════

import { IInputStream, LB_EOF, SeekOrigin, StreamView } from "./stream";

const MAX_READER_SNAPSHOT_DEPTH = 8;

// ─── Wire types ───────────────────────────────────────────────────────────

export enum WireType {
    VARINT = 0,
    FIXED64 = 1,
    LEN = 2,
    FIXED32 = 5,
}

// ─── Internal state ───────────────────────────────────────────────────────

interface ReaderStatus {
    fieldNumber: number;
    wireType: WireType;
    depth: number;
    length: number;
    lengthRead: boolean;
}

interface ReaderSnapshot {
    position: number;
    status: ReaderStatus;
}

// ─── Scratch buffers (reused across reads to avoid allocations) ──────────

const _scratch4 = new Uint8Array(4);
const _scratch8 = new Uint8Array(8);
const _view4 = new DataView(_scratch4.buffer);
const _view8 = new DataView(_scratch8.buffer);

// ─── PBReader ─────────────────────────────────────────────────────────────

/**
 * Pull-style protobuf reader. Reads tags, then values on demand.
 *
 * Equivalent to BlueSteelLadyBug::PBReader.
 *
 * Usage:
 * ```typescript
 * const reader = new PBReader(new MemoryStream(bytes));
 * while (reader.readTag()) {
 *     switch (reader.fieldNumber) {
 *         case 1: value = reader.readInt32(); break;
 *         case 2: name = reader.readString(256); break;
 *         default: reader.skip(); break;
 *     }
 * }
 * ```
 */
export class PBReader {
    protected _input: IInputStream;
    protected _status: ReaderStatus;
    protected _snapshots: ReaderSnapshot[];
    protected _activeSnapshot: number;

    public constructor(input: IInputStream) {
        this._input = input;
        this._status = {
            fieldNumber: 0,
            wireType: WireType.VARINT,
            depth: 0,
            length: 0,
            lengthRead: false,
        };
        this._snapshots = new Array(MAX_READER_SNAPSHOT_DEPTH);
        this._activeSnapshot = -1;
    }

    // ── Tag reading ───────────────────────────────────────────────────────

    /**
     * Read the next protobuf tag from the input.
     * After this call, `fieldNumber` and `wireType` are set.
     * @returns true if a tag was read; false at end of stream.
     */
    public readTag(): boolean {
        const tag = this._readVarint();
        if (tag === null) return false;
        this._status.fieldNumber = Number(tag) >>> 3;
        this._status.wireType = (Number(tag) & 0x07) as WireType;
        this._status.lengthRead = false;
        return true;
    }

    // ── Accessors ─────────────────────────────────────────────────────────

    public get fieldNumber(): number {
        return this._status.fieldNumber;
    }

    public get wireType(): WireType {
        return this._status.wireType;
    }

    public get depth(): number {
        return this._status.depth;
    }

    public get position(): number {
        return this._input.getPosition();
    }

    public get size(): number {
        return this._input.getSize();
    }

    public get remainingBytes(): number {
        return this._input.getRemainingBytes();
    }

    public get input(): IInputStream {
        return this._input;
    }

    // ── Value readers ─────────────────────────────────────────────────────

    /** Read a length prefix (for LEN wire type). Caches the length. */
    public readLength(validate: boolean = true): number | null {
        if (this._status.wireType !== WireType.LEN) return null;

        if (this._status.lengthRead) {
            return this._status.length;
        }

        const v = this._readVarint();
        if (v === null) return null;

        this._status.length = Number(v);
        this._status.lengthRead = validate;
        return this._status.length;
    }

    /** Read an int32 (varint or fixed32 depending on wire type). */
    public readInt32(): number | null {
        if (this._status.wireType === WireType.VARINT) {
            const v = this._readVarint();
            return v !== null ? Number(v) | 0 : null;
        }
        return this._readFixed32AsInt();
    }

    /** Read an int64 as a number (varint or fixed64). */
    public readInt64(): number | null {
        if (this._status.wireType === WireType.VARINT) {
            const v = this._readVarint();
            return v !== null ? Number(v) : null;
        }
        return this._readFixed64AsNumber();
    }

    /** Read a float32 (fixed32 wire type). */
    public readFloat(): number | null {
        if (this._input.read(_scratch4, 0, 4) !== 4) return null;
        return _view4.getFloat32(0, true); // little-endian
    }

    /** Read a float64 (fixed64 wire type). */
    public readDouble(): number | null {
        if (this._input.read(_scratch8, 0, 8) !== 8) return null;
        return _view8.getFloat64(0, true); // little-endian
    }

    /** Read a boolean (varint wire type). */
    public readBool(): boolean | null {
        const v = this._readVarint();
        if (v === null) return null;
        return v !== 0;
    }

    /**
     * Read a length-delimited string with a max size bound.
     * Equivalent to readValue_s(char*, int) in C++.
     */
    public readString(maxLength: number = 256): string | null {
        const len = this.readLength();
        if (len === null) return null;
        this._invalidateLengthRead();

        const readLen = Math.min(len, maxLength);
        const buf = new Uint8Array(readLen);
        if (this._input.read(buf, 0, readLen) !== readLen) return null;

        // Skip excess bytes if string was truncated
        if (readLen < len) {
            if (!this._input.seek(len - readLen, SeekOrigin.CURRENT)) return null;
        }

        return new TextDecoder().decode(buf);
    }

    /**
     * Read length-delimited raw bytes.
     * @param maxSize  Maximum bytes to read (excess is skipped).
     */
    public readBytes(maxSize?: number): Uint8Array | null {
        const len = this.readLength();
        if (len === null) return null;
        this._invalidateLengthRead();

        const readLen = maxSize !== undefined ? Math.min(len, maxSize) : len;
        const buf = new Uint8Array(readLen);
        if (this._input.read(buf, 0, readLen) !== readLen) return null;

        if (readLen < len) {
            if (!this._input.seek(len - readLen, SeekOrigin.CURRENT)) return null;
        }

        return buf;
    }

    // ── Packed repeated fields ────────────────────────────────────────────

    /**
     * Read packed varint int32 values into a pre-allocated array.
     * @param target  Target array.
     * @param maxCount  Maximum number of elements to read.
     * @returns The number of elements actually read, or null on error.
     */
    public readPackedInt32(target: Int32Array, maxCount: number): number | null {
        if (this._status.wireType !== WireType.LEN) return null;
        const len = this.readLength();
        if (len === null) return null;
        this._invalidateLengthRead();

        const end = this.position + len;
        let i = 0;
        while (this.position < end) {
            const v = this._readVarint();
            if (v === null) return null;
            if (i < maxCount) {
                target[i++] = Number(v) | 0;
            }
        }
        return i;
    }

    /**
     * Read packed float32 values into a pre-allocated array.
     * @param target  Target array.
     * @param maxCount  Maximum number of elements to read.
     * @returns The number of elements actually read, or null on error.
     */
    public readPackedFloat32(target: Float32Array, maxCount: number): number | null {
        if (this._status.wireType !== WireType.LEN) return null;
        const len = this.readLength();
        if (len === null) return null;
        this._invalidateLengthRead();

        const end = this.position + len;
        let i = 0;
        while (this.position < end) {
            if (this._input.read(_scratch4, 0, 4) !== 4) return null;
            if (i < maxCount) {
                target[i++] = _view4.getFloat32(0, true);
            }
        }
        return i;
    }

    /**
     * Read packed float64 values into a pre-allocated array.
     */
    public readPackedFloat64(target: Float64Array, maxCount: number): number | null {
        if (this._status.wireType !== WireType.LEN) return null;
        const len = this.readLength();
        if (len === null) return null;
        this._invalidateLengthRead();

        const end = this.position + len;
        let i = 0;
        while (this.position < end) {
            if (this._input.read(_scratch8, 0, 8) !== 8) return null;
            if (i < maxCount) {
                target[i++] = _view8.getFloat64(0, true);
            }
        }
        return i;
    }

    // ── Sub-message ───────────────────────────────────────────────────────

    /**
     * Create a sub-reader scoped to the current length-delimited field.
     * The sub-reader's stream is bounded to the message bytes.
     */
    public getSubMessageReader(): PBSubReader | null {
        const len = this.readLength();
        if (len === null) return null;
        this._invalidateLengthRead();
        return new PBSubReader(this, this._status.depth + 1, this.position, len);
    }

    // ── Skip ──────────────────────────────────────────────────────────────

    /** Skip the current field value. */
    public skip(): boolean {
        switch (this._status.wireType) {
            case WireType.VARINT: {
                return this._readVarint() !== null;
            }
            case WireType.FIXED32: {
                return this._input.seek(4, SeekOrigin.CURRENT);
            }
            case WireType.FIXED64: {
                return this._input.seek(8, SeekOrigin.CURRENT);
            }
            case WireType.LEN: {
                const len = this.readLength();
                if (len === null) return false;
                this._invalidateLengthRead();
                return this._input.seek(len, SeekOrigin.CURRENT);
            }
            default:
                return false;
        }
    }

    // ── Save / restore (snapshot stack) ───────────────────────────────────

    /** Save the current parser state. Stream must support seeking. */
    public save(): void {
        if (this._input.canSeek() && this._activeSnapshot < MAX_READER_SNAPSHOT_DEPTH - 1) {
            this._activeSnapshot++;
            this._snapshots[this._activeSnapshot] = {
                position: this.position,
                status: { ...this._status },
            };
        }
    }

    /** Restore the last saved state. */
    public restore(): void {
        if (this._input.canSeek() && this._activeSnapshot >= 0) {
            const snap = this._snapshots[this._activeSnapshot];
            this._status = { ...snap.status };
            this._input.seek(snap.position, SeekOrigin.BEGIN);
            this._activeSnapshot--;
        }
    }

    /** Discard the last save without restoring. */
    public unsave(): void {
        if (this._activeSnapshot >= 0) {
            this._activeSnapshot--;
        }
    }

    // ── Private primitives ────────────────────────────────────────────────

    /**
     * Read a varint (variable-length integer) from the stream.
     * Returns null on EOF. Uses Number (safe up to 2^53).
     */
    protected _readVarint(): number | null {
        const byte0 = this._input.readByte();
        if (byte0 === LB_EOF) return null;

        // Fast path: single byte (most common for field tags and small values)
        if ((byte0 & 0x80) === 0) {
            return byte0;
        }

        // Multi-byte varint
        let lo = byte0 & 0x7f;
        let shift = 7;
        let byte: number;
        let byteCount = 1;
        do {
            byte = this._input.readByte();
            if (byte === LB_EOF) return null;
            byteCount++;
            if (shift < 32) {
                lo |= (byte & 0x7f) << shift;
            }
            shift += 7;
        } while (byte & 0x80);

        // For negative int64, protobuf uses 10-byte varints with high bits set.
        // Detect this and return as signed 32-bit (sufficient for ONNX attribute values).
        if (byteCount >= 10) {
            return lo | 0; // interpret as signed 32-bit
        }

        return lo >>> 0; // force unsigned 32-bit for positive values
    }

    protected _readFixed32AsInt(): number | null {
        if (this._input.read(_scratch4, 0, 4) !== 4) return null;
        return _view4.getInt32(0, true);
    }

    protected _readFixed64AsNumber(): number | null {
        if (this._input.read(_scratch8, 0, 8) !== 8) return null;
        // Read as two 32-bit values to avoid BigInt dependency
        const lo = _view8.getUint32(0, true);
        const hi = _view8.getUint32(4, true);
        return hi * 0x100000000 + lo;
    }

    protected _invalidateLengthRead(): void {
        this._status.lengthRead = false;
    }
}

// ─── PBSubReader ──────────────────────────────────────────────────────────

/**
 * A PBReader scoped to a sub-message via a StreamView.
 *
 * Equivalent to BlueSteelLadyBug::PBSubReader.
 */
export class PBSubReader extends PBReader {
    public constructor(parent: PBReader, depth: number, from: number, length: number) {
        super(new StreamView(parent.input, from, length));
        this._status.depth = depth;
    }
}

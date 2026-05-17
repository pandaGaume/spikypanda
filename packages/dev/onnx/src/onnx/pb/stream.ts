// ═══════════════════════════════════════════════════════════════════════════
// Protobuf stream abstraction
//
// Ported from CyanMycelium/BlueSteelLadyBug C++ implementation.
// Provides IInputStream, MemoryStream and StreamView for binary parsing.
// ═══════════════════════════════════════════════════════════════════════════

export const LB_EOF = -1;

export enum SeekOrigin {
    BEGIN = 0,
    CURRENT = 1,
    END = 2,
}

/**
 * Abstract input stream interface for sequential binary reads.
 */
export interface IInputStream {
    /** Read `count` bytes into target. Returns bytes read, or LB_EOF. */
    read(target: Uint8Array, offset: number, count: number): number;

    /** Read a single byte. Returns the byte value, or LB_EOF. */
    readByte(): number;

    canSeek(): boolean;
    seek(value: number, origin?: SeekOrigin): boolean;
    getSize(): number;
    getPosition(): number;
    getRemainingBytes(): number;
}

// ─── MemoryStream ─────────────────────────────────────────────────────────

/**
 * Reads from an in-memory byte buffer.
 *
 * Equivalent to BlueSteelLadyBug::MemoryStream.
 */
export class MemoryStream implements IInputStream {
    private _buffer: Uint8Array;
    private _size: number;
    private _pos: number;

    public constructor(buffer: Uint8Array) {
        this._buffer = buffer;
        this._size = buffer.byteLength;
        this._pos = 0;
    }

    public readByte(): number {
        if (this._pos < this._size) {
            return this._buffer[this._pos++];
        }
        return LB_EOF;
    }

    public read(target: Uint8Array, offset: number, count: number): number {
        if (this._pos >= this._size) {
            return LB_EOF;
        }
        if (count === 1) {
            target[offset] = this._buffer[this._pos++];
            return 1;
        }
        const len = Math.min(count, this._size - this._pos);
        target.set(this._buffer.subarray(this._pos, this._pos + len), offset);
        this._pos += len;
        return len;
    }

    public canSeek(): boolean {
        return true;
    }

    public seek(value: number, origin: SeekOrigin = SeekOrigin.BEGIN): boolean {
        let tmp: number;
        if (origin === SeekOrigin.BEGIN) {
            tmp = value;
        } else if (origin === SeekOrigin.END) {
            tmp = this._size - value;
        } else {
            tmp = this._pos + value;
        }
        this._pos = Math.min(Math.max(tmp, 0), this._size);
        return true;
    }

    public getSize(): number {
        return this._size;
    }

    public getPosition(): number {
        return this._pos;
    }

    public getRemainingBytes(): number {
        return this._size - this._pos;
    }
}

// ─── StreamView ───────────────────────────────────────────────────────────

/**
 * A bounded view over an underlying stream, used for reading sub-messages.
 *
 * Equivalent to BlueSteelLadyBug::StreamView.
 */
export class StreamView implements IInputStream {
    private _delegate: IInputStream;
    private _offset: number;
    private _size: number;
    private _pos: number;

    public constructor(delegate: IInputStream, offset: number, size: number) {
        this._delegate = delegate;
        this._offset = offset;
        this._size = size;
        this._pos = 0;
    }

    public readByte(): number {
        if (this._pos >= this._size) {
            return LB_EOF;
        }
        const b = this._delegate.readByte();
        if (b === LB_EOF) return LB_EOF;
        this._pos++;
        return b;
    }

    public read(target: Uint8Array, offset: number, count: number): number {
        if (this._pos >= this._size) {
            return LB_EOF;
        }
        const len = Math.min(count, this._size - this._pos);
        const r = this._delegate.read(target, offset, len);
        if (r > 0) {
            this._pos += r;
        }
        return r;
    }

    public canSeek(): boolean {
        return this._delegate.canSeek();
    }

    public seek(value: number, origin: SeekOrigin = SeekOrigin.BEGIN): boolean {
        let tmp: number;
        if (origin === SeekOrigin.BEGIN) {
            tmp = value;
        } else if (origin === SeekOrigin.END) {
            tmp = this._size - value;
        } else {
            tmp = this._pos + value;
        }
        tmp = Math.min(Math.max(tmp, 0), this._size);
        if (!this._delegate.seek(tmp + this._offset, SeekOrigin.BEGIN)) {
            return false;
        }
        this._pos = tmp;
        return true;
    }

    public getSize(): number {
        return this._size;
    }

    public getPosition(): number {
        return this._pos;
    }

    public getRemainingBytes(): number {
        return this._size - this._pos;
    }
}

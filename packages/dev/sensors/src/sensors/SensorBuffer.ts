import { Sensor } from "./Sensor";
import { ISensorReading } from "../interfaces/Sensor";

// Bounded buffer that pulls readings out of a Sensor on demand and keeps
// the most recent maxSize. It owns the simulation clock (currentTime) so
// callers can drive sampling without managing dt themselves.
//
// When the buffer is full, sampleOnce drops the oldest reading. This makes
// the buffer suitable for both fixed-window capture (sampleFor) and live
// rolling-window streaming (sampleOnce in a loop).
export class SensorBuffer {
    public readonly sensor: Sensor;
    public readonly maxSize: number;
    private _buffer: ISensorReading[];
    private _t: number;

    public constructor(sensor: Sensor, maxSize: number = 100000) {
        if (maxSize <= 0) {
            throw new Error("SensorBuffer: maxSize must be > 0");
        }
        this.sensor = sensor;
        this.maxSize = maxSize;
        this._buffer = [];
        this._t = 0;
    }

    public get data(): ReadonlyArray<ISensorReading> {
        return this._buffer;
    }

    public get currentTime(): number {
        return this._t;
    }

    // Pull one reading at the current clock value, append it, and advance
    // the clock by one sample period.
    public sampleOnce(): ISensorReading {
        const reading = this.sensor.next(this._t);
        this._buffer.push(reading);
        this._t += 1.0 / this.sensor.sampleRateHz;
        if (this._buffer.length > this.maxSize) {
            this._buffer.shift();
        }
        return reading;
    }

    // Sample N = floor(durationS * sampleRateHz) consecutive readings.
    public sampleFor(durationS: number): void {
        const n = Math.floor(durationS * this.sensor.sampleRateHz);
        for (let i = 0; i < n; i++) {
            this.sampleOnce();
        }
    }

    public clear(): void {
        this._buffer = [];
    }

    public resetTime(t: number = 0): void {
        this._t = t;
    }

    // Return the buffered values as a Float32Array, ready for FFT or for
    // pushing into a typed-array tensor input.
    public values(): Float32Array {
        const out = new Float32Array(this._buffer.length);
        for (let i = 0; i < this._buffer.length; i++) {
            out[i] = this._buffer[i].value;
        }
        return out;
    }
}

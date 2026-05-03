// Seedable pseudo-random number generator.
//
// Uses mulberry32, a small 32-bit PRNG with good statistical properties for
// non-cryptographic use. Picked over Math.random because seedability matters
// here: the same seed must produce the same noise stream so that captured
// datasets and noisy simulations can be reproduced bit-exactly.
//
// Gaussian samples come from the Box-Muller transform on two consecutive
// uniform draws, which is enough for noiseStd-driven measurement noise.
export class Rng {
    private state: number;

    public constructor(seed?: number) {
        // Default to a millisecond clock when no seed is given. Force the
        // state away from 0, which would lock the generator at 0 forever.
        const s = seed === undefined ? (Date.now() & 0xffffffff) : (seed | 0);
        this.state = s === 0 ? 1 : s;
    }

    // Uniform in [0, 1).
    public next(): number {
        let t = (this.state += 0x6d2b79f5) | 0;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    // Uniform in [min, max).
    public uniform(min: number, max: number): number {
        return min + (max - min) * this.next();
    }

    // Uniform integer in [minInclusive, maxInclusive].
    public uniformInt(minInclusive: number, maxInclusive: number): number {
        return Math.floor(this.uniform(minInclusive, maxInclusive + 1));
    }

    // Gaussian sample with given mean and standard deviation. Box-Muller
    // produces two correlated samples per call but we only return one; the
    // simplicity is worth the small overhead for our use case.
    public gaussian(mean: number = 0, std: number = 1): number {
        let u1 = this.next();
        if (u1 < 1e-12) {
            u1 = 1e-12;          // avoid log(0) when next() returns exactly 0
        }
        const u2 = this.next();
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return mean + std * z;
    }

    // Pick one item from a list with explicit weights. Items and weights
    // arrays must have the same non-zero length. Weights need not sum to 1.
    public pickWeighted<T>(items: ReadonlyArray<T>, weights: ReadonlyArray<number>): T {
        if (items.length !== weights.length || items.length === 0) {
            throw new Error("pickWeighted: items and weights must be same non-zero length");
        }
        let total = 0;
        for (const w of weights) {
            total += w;
        }
        const r = this.next() * total;
        let acc = 0;
        for (let i = 0; i < items.length; i++) {
            acc += weights[i];
            if (r <= acc) {
                return items[i];
            }
        }
        return items[items.length - 1];
    }
}

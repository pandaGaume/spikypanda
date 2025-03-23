export type STDPFunction = (deltaT: number, weight: number) => number;

export class STDP {
    public static exponential(deltaT: number, weight: number): number {
        if (deltaT > 0) {
            return weight + 0.01 * Math.exp(-deltaT / 20); // LTP (Long-term potentiation)
        } else if (deltaT < 0) {
            return weight - 0.01 * Math.exp(deltaT / 20); // LTD (Long-term depression)
        }
        return weight;
    }

    public static hebbian(deltaT: number, weight: number): number {
        return weight + 0.005 * deltaT; // Simple linear modification
    }

    public static threshold(deltaT: number, weight: number): number {
        if (Math.abs(deltaT) < 10) {
            return weight + 0.02; // Strong increase if close in time
        } else {
            return weight - 0.01; // Small decay if not closely timed
        }
    }
}

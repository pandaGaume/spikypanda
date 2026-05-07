import { ThreePhaseTransforms } from "spikypanda-sensors/sources/motor/pmsm/control/transforms";

const TWO_PI = 2 * Math.PI;
const TWO_PI_OVER_3 = TWO_PI / 3;

function near(a: number, b: number, eps: number = 1e-9): boolean {
    return Math.abs(a - b) <= eps;
}

describe("ThreePhaseTransforms.clarke / inverseClarke (amplitude-invariant)", () => {
    it("a balanced cosine triplet produces alpha = I, beta = 0 at theta = 0", () => {
        const I = 5.0;
        const theta = 0;
        const a = I * Math.cos(theta);
        const b = I * Math.cos(theta - TWO_PI_OVER_3);
        const c = I * Math.cos(theta + TWO_PI_OVER_3);
        const [alpha, beta] = ThreePhaseTransforms.clarke(a, b, c);
        expect(near(alpha, I, 1e-12)).toBe(true);
        expect(near(beta, 0, 1e-12)).toBe(true);
    });

    it("a balanced cosine triplet produces alpha = I cos(theta), beta = I sin(theta)", () => {
        const I = 7.3;
        for (const theta of [0.1, 0.7, 1.3, 2.1, 5.0]) {
            const a = I * Math.cos(theta);
            const b = I * Math.cos(theta - TWO_PI_OVER_3);
            const c = I * Math.cos(theta + TWO_PI_OVER_3);
            const [alpha, beta] = ThreePhaseTransforms.clarke(a, b, c);
            expect(near(alpha, I * Math.cos(theta), 1e-12)).toBe(true);
            expect(near(beta, I * Math.sin(theta), 1e-12)).toBe(true);
        }
    });

    it("inverse(Clarke(x)) = x for balanced inputs (zero-sequence component already zero)", () => {
        const cases: Array<[number, number, number]> = [
            [1, -0.5, -0.5],
            [0, 0.866025, -0.866025],
            [3.2, -1.6, -1.6],
        ];
        for (const [a, b, c] of cases) {
            const [alpha, beta] = ThreePhaseTransforms.clarke(a, b, c);
            const [a2, b2, c2] = ThreePhaseTransforms.inverseClarke(alpha, beta);
            expect(near(a, a2)).toBe(true);
            expect(near(b, b2)).toBe(true);
            expect(near(c, c2)).toBe(true);
        }
    });

    it("inverse Clarke composes with Clarke to identity on the alpha-beta plane", () => {
        for (const [alpha, beta] of [[1, 0], [0, 1], [3, 4], [-2.5, 1.7]]) {
            const [a, b, c] = ThreePhaseTransforms.inverseClarke(alpha, beta);
            const [alpha2, beta2] = ThreePhaseTransforms.clarke(a, b, c);
            expect(near(alpha, alpha2)).toBe(true);
            expect(near(beta, beta2)).toBe(true);
        }
    });
});

describe("ThreePhaseTransforms.park / inversePark", () => {
    it("at theta_e = 0, dq = alpha-beta", () => {
        const [d, q] = ThreePhaseTransforms.park(2.5, -1.3, 0);
        expect(near(d, 2.5)).toBe(true);
        expect(near(q, -1.3)).toBe(true);
    });

    it("inverse Park inverts Park exactly", () => {
        for (const thetaE of [0, 0.3, 1.0, 2.4, -0.8]) {
            for (const [d0, q0] of [[1, 0], [0, 1], [3, -2], [-1.5, 0.7]]) {
                const [alpha, beta] = ThreePhaseTransforms.inversePark(d0, q0, thetaE);
                const [d1, q1] = ThreePhaseTransforms.park(alpha, beta, thetaE);
                expect(near(d0, d1)).toBe(true);
                expect(near(q0, q1)).toBe(true);
            }
        }
    });

    it("rotating a constant alpha-beta vector by Park sweeps a circle in dq with radius |v|", () => {
        const alpha = 3.0;
        const beta = 4.0;
        const r = Math.sqrt(alpha * alpha + beta * beta);
        for (let k = 0; k < 16; k++) {
            const thetaE = (k * TWO_PI) / 16;
            const [d, q] = ThreePhaseTransforms.park(alpha, beta, thetaE);
            expect(near(Math.sqrt(d * d + q * q), r)).toBe(true);
        }
    });
});

describe("ThreePhaseTransforms.abcToDq / dqToAbc round trip", () => {
    it("composes to identity for balanced inputs at any theta_e", () => {
        const I = 4.2;
        for (const theta of [0, 0.3, 1.7, 4.0]) {
            for (const thetaE of [0, 0.5, 2.0, -1.0]) {
                const a = I * Math.cos(theta);
                const b = I * Math.cos(theta - TWO_PI_OVER_3);
                const c = I * Math.cos(theta + TWO_PI_OVER_3);
                const [d, q] = ThreePhaseTransforms.abcToDq(a, b, c, thetaE);
                const [a1, b1, c1] = ThreePhaseTransforms.dqToAbc(d, q, thetaE);
                expect(near(a, a1, 1e-9)).toBe(true);
                expect(near(b, b1, 1e-9)).toBe(true);
                expect(near(c, c1, 1e-9)).toBe(true);
            }
        }
    });
});

describe("ThreePhaseTransforms is a static helper", () => {
    it("rejects instantiation", () => {
        // The class wraps pure functions; instantiation would be a misuse.
        expect(() => new (ThreePhaseTransforms as unknown as { new (): unknown })()).toThrow();
    });
});

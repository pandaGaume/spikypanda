/**
 * Unit tests for `core/math/math.units.ts`. Coverage focuses on the
 * bug classes the legacy module shipped with:
 *
 *   1. SI prefix factors (`10eN` → `1eN` correction across Timespan,
 *      Length, Mass, Pressure, Frequency).
 *   2. Temperature converter sign / offset (K ↔ C ↔ F three-way,
 *      including 0 K / 0 °C / 0 °F reference points).
 *   3. `Quantity.tryConvert` consults the converter's `accept(target)`,
 *      not `accept(source)`.
 *   4. `Quantity.clone` / `add` / `subtract` allocate a proper
 *      subclass instance via `new` (the legacy code called the
 *      constructor as a function and was broken for every subclass).
 *   5. `Speed.ForParameter` returns Speed, not Length.
 *
 * The test cases are intentionally explicit (no formula reuse from
 * the module under test) so a regression in the conversion math
 * stands out on the very first failed assertion.
 */
import {
    Acceleration,
    Angle,
    Current,
    Dimensionless,
    Frequency,
    Length,
    Luminosity,
    Mass,
    Power,
    Pressure,
    Quantity,
    Speed,
    Temperature,
    Timespan,
    Voltage,
    Volume,
} from "../../dev/core/src/math/math.units";

// ─────────────────────────────────────────────────────────────────────
// SI prefix factor sanity (the `10eN → 1eN` fix)
// ─────────────────────────────────────────────────────────────────────

describe("Timespan SI prefixes", () => {
    it("base unit (second) is 1", () => {
        expect(Timespan.Units.s.value).toBe(1);
    });

    it("millisecond = 1e-3 s, not 1e-2", () => {
        expect(Timespan.Units.ms.value).toBeCloseTo(1e-3, 30);
        expect(new Timespan(1, Timespan.Units.ms).getValue(Timespan.Units.s)).toBeCloseTo(1e-3, 30);
    });

    it("microsecond, nanosecond, picosecond, femtosecond, attosecond, zeptosecond, yoctosecond", () => {
        const cases: Array<[string, number]> = [
            ["mis", 1e-6],
            ["ns", 1e-9],
            ["ps", 1e-12],
            ["fs", 1e-15],
            ["as", 1e-18],
            ["zs", 1e-21],
            ["ys", 1e-24],
        ];
        for (const [key, expected] of cases) {
            expect(Timespan.Units[key].value).toBeCloseTo(expected, 30);
        }
    });

    it("1 minute = 60 seconds, 1 hour = 3600 seconds, 1 day = 86400 seconds", () => {
        expect(new Timespan(1, Timespan.Units.Min).getValue(Timespan.Units.s)).toBe(60);
        expect(new Timespan(1, Timespan.Units.Hour).getValue(Timespan.Units.s)).toBe(3600);
        expect(new Timespan(1, Timespan.Units.Day).getValue(Timespan.Units.s)).toBe(86400);
    });

    it("tick has its own symbol (no collision with nanosecond)", () => {
        expect(Timespan.Units.tick.symbol).not.toBe(Timespan.Units.ns.symbol);
    });
});

describe("Length SI prefixes", () => {
    it("base unit (meter) is 1", () => {
        expect(Length.Units.m.value).toBe(1);
    });

    it("1 mm = 0.001 m, 1 cm = 0.01 m, 1 dm = 0.1 m", () => {
        expect(new Length(1, Length.Units.mm).getValue(Length.Units.m)).toBeCloseTo(0.001, 12);
        expect(new Length(1, Length.Units.cm).getValue(Length.Units.m)).toBeCloseTo(0.01, 12);
        expect(new Length(1, Length.Units.dm).getValue(Length.Units.m)).toBeCloseTo(0.1, 12);
    });

    it("1 km = 1000 m, 1 Mm = 1e6 m, 1 Gm = 1e9 m, 1 Tm = 1e12 m", () => {
        expect(new Length(1, Length.Units.Km).getValue(Length.Units.m)).toBe(1000);
        expect(new Length(1, Length.Units.Mm).getValue(Length.Units.m)).toBe(1e6);
        expect(new Length(1, Length.Units.Gm).getValue(Length.Units.m)).toBe(1e9);
        expect(new Length(1, Length.Units.Tm).getValue(Length.Units.m)).toBe(1e12);
    });

    it("1 mile = 1609.344 m, 1 nautical mile = 1852 m (not 1.609 / 1.852)", () => {
        expect(new Length(1, Length.Units.Mi).getValue(Length.Units.m)).toBeCloseTo(1609.344, 6);
        expect(new Length(1, Length.Units.Nmi).getValue(Length.Units.m)).toBeCloseTo(1852, 6);
    });

    it("1 inch = 0.0254 m exactly", () => {
        expect(new Length(1, Length.Units.in).getValue(Length.Units.m)).toBeCloseTo(0.0254, 12);
    });
});

// ─────────────────────────────────────────────────────────────────────
// Temperature converter (the sign-flip fix)
// ─────────────────────────────────────────────────────────────────────

describe("Temperature K ↔ C ↔ F", () => {
    it("0 °C = 273.15 K", () => {
        expect(new Temperature(0, Temperature.Units.c).getValue(Temperature.Units.k)).toBeCloseTo(273.15, 6);
    });

    it("0 K = -273.15 °C", () => {
        expect(new Temperature(0, Temperature.Units.k).getValue(Temperature.Units.c)).toBeCloseTo(-273.15, 6);
    });

    it("20 °C = 293.15 K (room temperature)", () => {
        expect(new Temperature(20, Temperature.Units.c).getValue(Temperature.Units.k)).toBeCloseTo(293.15, 6);
    });

    it("300 K = 26.85 °C", () => {
        expect(new Temperature(300, Temperature.Units.k).getValue(Temperature.Units.c)).toBeCloseTo(26.85, 6);
    });

    it("0 °C = 32 °F (water freezing)", () => {
        expect(new Temperature(0, Temperature.Units.c).getValue(Temperature.Units.f)).toBeCloseTo(32, 6);
    });

    it("100 °C = 212 °F (water boiling)", () => {
        expect(new Temperature(100, Temperature.Units.c).getValue(Temperature.Units.f)).toBeCloseTo(212, 6);
    });

    it("32 °F = 0 °C", () => {
        expect(new Temperature(32, Temperature.Units.f).getValue(Temperature.Units.c)).toBeCloseTo(0, 6);
    });

    it("0 °F = 255.372 K (≈ -17.78 °C)", () => {
        expect(new Temperature(0, Temperature.Units.f).getValue(Temperature.Units.k)).toBeCloseTo(255.372, 3);
    });

    it("K → F round-trip preserves the value within float precision", () => {
        const t = new Temperature(123.45, Temperature.Units.k);
        const fVal = t.getValue(Temperature.Units.f);
        const backToK = new Temperature(fVal, Temperature.Units.f).getValue(Temperature.Units.k);
        expect(backToK).toBeCloseTo(123.45, 6);
    });

    it("C → F round-trip preserves the value within float precision", () => {
        const t = new Temperature(42.7, Temperature.Units.c);
        const fVal = t.getValue(Temperature.Units.f);
        const backToC = new Temperature(fVal, Temperature.Units.f).getValue(Temperature.Units.c);
        expect(backToC).toBeCloseTo(42.7, 6);
    });
});

// ─────────────────────────────────────────────────────────────────────
// tryConvert checks accept(target), not accept(self)
// ─────────────────────────────────────────────────────────────────────

describe("Quantity.tryConvert", () => {
    it("converts K → C via the affine converter (was returning false because it tested accept(source))", () => {
        const t = new Temperature(293.15, Temperature.Units.k);
        const ok = t.tryConvert(Temperature.Units.c);
        expect(ok).toBe(true);
        expect(t.unit).toBe(Temperature.Units.c);
        expect(t.value).toBeCloseTo(20, 6);
    });

    it("converts m → mm via the linear formula", () => {
        const l = new Length(1, Length.Units.m);
        const ok = l.tryConvert(Length.Units.mm);
        expect(ok).toBe(true);
        expect(l.unit).toBe(Length.Units.mm);
        expect(l.value).toBeCloseTo(1000, 6);
    });

    it("is a no-op (true) when source and target are the same", () => {
        const l = new Length(42, Length.Units.m);
        expect(l.tryConvert(Length.Units.m)).toBe(true);
        expect(l.value).toBe(42);
    });

    it("returns false when the quantity has no unit", () => {
        const l = new Length(42);
        expect(l.tryConvert(Length.Units.km)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────
// clone / add / subtract instantiate the right subclass via `new`
// ─────────────────────────────────────────────────────────────────────

describe("Quantity.clone / add / subtract instantiation", () => {
    it("clone() returns a fresh instance of the SAME subclass", () => {
        const a = new Temperature(20, Temperature.Units.c);
        const b = a.clone();
        expect(b).toBeInstanceOf(Temperature);
        expect(b).not.toBe(a);
        expect(b.value).toBe(20);
        expect(b.unit).toBe(Temperature.Units.c);
    });

    it("clone(otherUnit) converts on the way out", () => {
        const a = new Temperature(20, Temperature.Units.c);
        const b = a.clone(Temperature.Units.k);
        expect(b.unit).toBe(Temperature.Units.k);
        expect(b.value).toBeCloseTo(293.15, 6);
        // The source is untouched.
        expect(a.unit).toBe(Temperature.Units.c);
        expect(a.value).toBe(20);
    });

    it("add() of same-unit values returns the right type and value", () => {
        const a = new Length(1, Length.Units.m);
        const b = new Length(2, Length.Units.m);
        const c = a.add(b);
        expect(c).toBeInstanceOf(Length);
        expect(c.value).toBeCloseTo(3, 12);
        expect(c.unit).toBe(Length.Units.m);
    });

    it("add() converts the other side into self's unit before summing", () => {
        const a = new Length(1, Length.Units.m);
        const b = new Length(500, Length.Units.mm);
        const c = a.add(b);
        expect(c.unit).toBe(Length.Units.m);
        expect(c.value).toBeCloseTo(1.5, 12);
    });

    it("subtract() honours the affine Temperature converter", () => {
        const a = new Temperature(100, Temperature.Units.c);
        const b = new Temperature(273.15, Temperature.Units.k); // = 0 °C
        const c = a.subtract(b);
        expect(c).toBeInstanceOf(Temperature);
        expect(c.unit).toBe(Temperature.Units.c);
        expect(c.value).toBeCloseTo(100, 6);
    });
});

// ─────────────────────────────────────────────────────────────────────
// Speed.ForParameter return type / Units population
// ─────────────────────────────────────────────────────────────────────

describe("Speed", () => {
    it("ForParameter returns a Speed, not a Length", () => {
        const s = Speed.ForParameter(0, 5, Speed.Units.mps);
        expect(s).toBeInstanceOf(Speed);
        expect(s.value).toBe(5);
        expect(s.unit).toBe(Speed.Units.mps);
    });

    it("1 km/h = 1000/3600 m/s", () => {
        expect(new Speed(1, Speed.Units.kph).getValue(Speed.Units.mps)).toBeCloseTo(1000 / 3600, 9);
    });

    it("1 mph ≈ 0.44704 m/s", () => {
        expect(new Speed(1, Speed.Units.mph).getValue(Speed.Units.mps)).toBeCloseTo(0.44704, 6);
    });

    it("1 knot ≈ 0.514444 m/s", () => {
        expect(new Speed(1, Speed.Units.knot).getValue(Speed.Units.mps)).toBeCloseTo(0.514444, 4);
    });
});

// ─────────────────────────────────────────────────────────────────────
// Other quantity smoke tests — anchor the contracts we'll rely on in
// SceneItem (Temperature, Pressure, Frequency, Acceleration)
// ─────────────────────────────────────────────────────────────────────

describe("Pressure", () => {
    it("1 atm = 101325 Pa", () => {
        expect(new Pressure(1, Pressure.Units.atm).getValue(Pressure.Units.Pa)).toBeCloseTo(101325, 6);
    });
    it("1 bar = 100000 Pa", () => {
        expect(new Pressure(1, Pressure.Units.bar).getValue(Pressure.Units.Pa)).toBe(1e5);
    });
    it("1 hPa = 100 Pa (used in meteorology)", () => {
        expect(new Pressure(1, Pressure.Units.hPa).getValue(Pressure.Units.Pa)).toBe(100);
    });
    it("1 torr ≈ 133.322 Pa", () => {
        expect(new Pressure(1, Pressure.Units.torr).getValue(Pressure.Units.Pa)).toBeCloseTo(133.322, 3);
    });
    it("1 psi ≈ 6894.757 Pa", () => {
        expect(new Pressure(1, Pressure.Units.psi).getValue(Pressure.Units.Pa)).toBeCloseTo(6894.757, 3);
    });
});

describe("Frequency", () => {
    it("1 kHz = 1000 Hz, 1 MHz = 1e6 Hz, 1 GHz = 1e9 Hz", () => {
        expect(new Frequency(1, Frequency.Units.kHz).getValue(Frequency.Units.Hz)).toBe(1000);
        expect(new Frequency(1, Frequency.Units.MHz).getValue(Frequency.Units.Hz)).toBe(1e6);
        expect(new Frequency(1, Frequency.Units.GHz).getValue(Frequency.Units.Hz)).toBe(1e9);
    });
    it("60 rpm = 1 Hz (one revolution per second)", () => {
        expect(new Frequency(60, Frequency.Units.rpm).getValue(Frequency.Units.Hz)).toBeCloseTo(1, 12);
    });
});

describe("Acceleration", () => {
    it("standard gravity = 9.80665 m/s²", () => {
        expect(new Acceleration(1, Acceleration.Units.g).getValue(Acceleration.Units.mps2)).toBeCloseTo(9.80665, 6);
    });
});

describe("Mass", () => {
    it("1 g = 0.001 kg, 1 mg = 1e-6 kg, 1 µg = 1e-9 kg", () => {
        expect(new Mass(1, Mass.Units.g).getValue(Mass.Units.kg)).toBeCloseTo(0.001, 12);
        expect(new Mass(1, Mass.Units.mg).getValue(Mass.Units.kg)).toBeCloseTo(1e-6, 30);
        expect(new Mass(1, Mass.Units.mug).getValue(Mass.Units.kg)).toBeCloseTo(1e-9, 30);
    });
    it("1 pound = 0.45359237 kg exactly", () => {
        expect(new Mass(1, Mass.Units.pound).getValue(Mass.Units.kg)).toBeCloseTo(0.45359237, 12);
    });
    it("1 ton = 1000 kg", () => {
        expect(new Mass(1, Mass.Units.T).getValue(Mass.Units.kg)).toBe(1000);
    });
});

describe("Angle", () => {
    it("180° = π radians", () => {
        expect(new Angle(180, Angle.Units.d).getValue(Angle.Units.r)).toBeCloseTo(Math.PI, 6);
    });
    it("1 radian ≈ 57.2958 degrees", () => {
        expect(new Angle(1, Angle.Units.r).getValue(Angle.Units.d)).toBeCloseTo(180 / Math.PI, 6);
    });
});

describe("Volume", () => {
    it("1 L = 1e-3 m³, 1 mL = 1e-6 m³", () => {
        expect(new Volume(1, Volume.Units.L).getValue(Volume.Units.m3)).toBeCloseTo(1e-3, 12);
        expect(new Volume(1, Volume.Units.mL).getValue(Volume.Units.m3)).toBeCloseTo(1e-6, 30);
    });
});

describe("Dimensionless", () => {
    it("50% = 0.5, 1000 ppm = 0.001 of base", () => {
        expect(new Dimensionless(50, Dimensionless.Units.percent).getValue(Dimensionless.Units.none)).toBeCloseTo(0.5, 12);
        expect(new Dimensionless(1000, Dimensionless.Units.ppm).getValue(Dimensionless.Units.none)).toBeCloseTo(0.001, 12);
    });
});

// ─────────────────────────────────────────────────────────────────────
// Static Quantity.Convert API
// ─────────────────────────────────────────────────────────────────────

describe("Quantity.Convert (static)", () => {
    it("identity when from === to", () => {
        expect(Quantity.Convert(42, Length.Units.m, Length.Units.m)).toBe(42);
    });
    it("dispatches via affine converter when source has one", () => {
        expect(Quantity.Convert(0, Temperature.Units.c, Temperature.Units.k)).toBeCloseTo(273.15, 6);
        expect(Quantity.Convert(0, Temperature.Units.k, Temperature.Units.c)).toBeCloseTo(-273.15, 6);
    });
    it("falls back to linear formula for purely scaled units", () => {
        expect(Quantity.Convert(2, Length.Units.Km, Length.Units.m)).toBe(2000);
        expect(Quantity.Convert(500, Length.Units.mm, Length.Units.m)).toBeCloseTo(0.5, 12);
    });
});

// ─────────────────────────────────────────────────────────────────────
// Symbol uniqueness within a Quantity subclass (sanity)
// ─────────────────────────────────────────────────────────────────────

describe("Symbol uniqueness within each Quantity", () => {
    const allQuantities = [
        ["Timespan", Timespan],
        ["Length", Length],
        ["Mass", Mass],
        ["Volume", Volume],
        ["Pressure", Pressure],
        ["Temperature", Temperature],
        ["Frequency", Frequency],
        ["Acceleration", Acceleration],
        ["Speed", Speed],
        ["Power", Power],
        ["Voltage", Voltage],
        ["Current", Current],
        ["Luminosity", Luminosity],
        ["Angle", Angle],
        ["Dimensionless", Dimensionless],
    ] as const;

    for (const [name, Klass] of allQuantities) {
        it(`${name} units have unique symbols (no accidental collision)`, () => {
            const units = (Klass as unknown as { Units: { [k: string]: { symbol: string } } }).Units;
            const symbols = Object.values(units).map((u) => u.symbol);
            const unique = new Set(symbols);
            expect(unique.size).toBe(symbols.length);
        });
    }
});

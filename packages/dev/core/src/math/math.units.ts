import { AbstractRange } from "./math";

/**
 * Strategy a `Quantity` subclass can attach to a `Unit` to handle
 * conversions that are NOT a pure linear scale of the base unit
 * (Celsius ↔ Kelvin offset, Fahrenheit ↔ Celsius affine, etc.).
 *
 * The host `Quantity.Convert` static method consults `accept(target)`
 * first; when it returns true the converter is invoked, otherwise the
 * generic linear formula `value × (from.value / to.value)` applies.
 */
export interface IUnitConverter {
    accept(u: Unit): boolean;
    convert(v: number, u: Unit): number;
}

export class Unit {
    public constructor(
        public name: string,
        public symbol: string,
        public value: number = 0,
        public converter?: IUnitConverter
    ) {}
}

const _defaultDecimalPrecision = 6;

/**
 * Base for every physical-quantity wrapper (Temperature, Pressure,
 * Length, ...). Stores a numeric `_value` interpreted in `_unit`. The
 * concrete subclasses populate a static `Units` map of named-unit
 * singletons; `getValue(unit)` and `tryConvert(unit)` route between
 * them.
 *
 * Conversion lookup:
 *   1. If both sides are the same Unit instance → identity.
 *   2. If `from.converter` accepts `to` → delegate (affine path).
 *   3. Otherwise linear: `value × (from.value / to.value)`.
 *      `from.value` MUST be the conversion factor "1 from = N base"
 *      where `base` is the subclass's reference unit.
 */
export abstract class Quantity {
    /**
     * Convert a raw scalar from one Unit to another. Used by
     * `getValue` and `tryConvert` so all three call sites share one
     * code path.
     */
    public static Convert(value: number, from: Unit, to: Unit): number {
        if (!from || !to || from === to) {
            return value;
        }
        if (from.converter && from.converter.accept(to)) {
            return from.converter.convert(value, to);
        }
        if (to.value && from.value) {
            return value * (from.value / to.value);
        }
        return value;
    }

    public _value: number;
    private _unit?: Unit;

    static round(value: number, decimalPrecision: number = _defaultDecimalPrecision): number {
        const dp: number = decimalPrecision || _defaultDecimalPrecision;
        return Math.round(value * Math.pow(10, dp)) / Math.pow(10, dp);
    }

    public constructor(value: number | Quantity, unit?: Unit) {
        if (value instanceof Quantity) {
            const q: Quantity = value;
            this._value = q.value;
            this._unit = q._unit;
        } else {
            this._value = value;
            this._unit = unit;
        }
    }

    public get unit(): Unit | undefined {
        return this._unit;
    }

    public set unit(target: Unit | undefined) {
        if (target && this._unit && this._unit !== target) {
            this.tryConvert(target);
        }
    }
    public get value(): number {
        return this._value;
    }

    public set value(value: number) {
        this._value = value;
    }

    /**
     * Convert in place to `targetUnit`. Returns true on success, false
     * when no conversion path exists (both sides have no converter and
     * one of the linear factors is zero / unset). The previous
     * implementation asked the converter `accept(this._unit)` (the
     * source); the right question is whether it accepts the TARGET.
     */
    public tryConvert(targetUnit: Unit): boolean {
        if (!this._unit) return false;
        if (this._unit === targetUnit) return true;
        if (this._unit.converter && this._unit.converter.accept(targetUnit)) {
            this._value = this._unit.converter.convert(this._value, targetUnit);
            this._unit = targetUnit;
            return true;
        }
        if (this._unit.value && targetUnit.value && targetUnit.symbol !== this._unit.symbol) {
            this._value *= this._unit.value / targetUnit.value;
            this._unit = targetUnit;
            return true;
        }
        return false;
    }

    /**
     * Return a fresh instance of the concrete subclass carrying the
     * same value+unit. The previous implementation invoked
     * `this.constructor(...)` without `new`, which throws under
     * strict mode (classes refuse function-call invocation). We
     * forward through the Quantity-copy constructor signature so
     * any subclass works without bespoke clone overrides.
     */
    public clone(unit?: Unit): Quantity {
        const Ctor = this.constructor as new (v: number | Quantity, u?: Unit) => Quantity;
        const n = new Ctor(this);
        if (unit) {
            n.tryConvert(unit);
        }
        return n;
    }

    public getValue(unit?: Unit): number {
        if (!this._unit || !unit || unit === this._unit) {
            return this._value;
        }
        return Quantity.Convert(this._value, this._unit, unit);
    }

    public equals(v: Quantity): boolean {
        if (v._unit === this._unit) {
            return this._value === v._value;
        }
        return this._value === v.getValue(this._unit);
    }

    /**
     * Arithmetic: result keeps THIS quantity's unit; the other side
     * is converted in via `getValue`. The runtime type of the result
     * mirrors `this` (a `Temperature.subtract(otherTemp)` returns a
     * Temperature). The generic parameter `T` is purely for the
     * caller's typing convenience — there is no dimensional check at
     * compile time, so subtracting cross-quantity values is a runtime
     * mistake the caller owns.
     */
    public subtract<T extends Quantity>(v: T): T {
        const other = v._unit === this._unit ? v._value : v.getValue(this._unit);
        const result = this._value - other;
        const Ctor = this.constructor as new (val: number, u?: Unit) => T;
        return new Ctor(result, this._unit);
    }

    public add<T extends Quantity>(v: T): T {
        const other = v._unit === this._unit ? v._value : v.getValue(this._unit);
        const result = this._value + other;
        const Ctor = this.constructor as new (val: number, u?: Unit) => T;
        return new Ctor(result, this._unit);
    }

    public tryParse(str: string): boolean {
        if (str) {
            const parts: string[] = str.split(" ");
            const v: number = parseFloat(str);
            if (Number.isNaN(v)) {
                return false;
            }
            this._value = v;
            if (parts.length > 1) {
                this._unit = this.unitForSymbol(parts[1]);
            } else {
                this._unit = undefined;
            }
            return true;
        }
        return false;
    }

    public abstract unitForSymbol(symbol: string): Unit | undefined;
}

export class QuantityRange<T extends Quantity> extends AbstractRange<T> {
    protected computeDelta(a: T, b: T): T {
        if (!a || !b) {
            // No defined endpoints → return a "zero" of the same
            // concrete type if we have at least one anchor.
            const Anchor = (a ?? b) as T | undefined;
            if (!Anchor) {
                return undefined as unknown as T;
            }
            const Ctor = Anchor.constructor as new (val: number, u?: Unit) => T;
            return new Ctor(0, Anchor.unit);
        }
        return b.subtract(a);
    }
}

/**
 * Timespan: base = second. SI prefix factors are `1eN`, not the
 * `10eN` pattern the original module used (which would have been
 * 10× off everywhere; e.g. `10e-3 = 0.01`, not `0.001`).
 */
export class Timespan extends Quantity {
    public static ForParameter(value: Timespan | number, defaultValue: number, defaultUnit: Unit): Timespan {
        return value ? new Timespan(value, defaultUnit) : new Timespan(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        ys: new Unit("yoctosecond", "ys", 1e-24),
        zs: new Unit("zeptosecond", "zs", 1e-21),
        as: new Unit("attosecond", "as", 1e-18),
        fs: new Unit("femtosecond", "fs", 1e-15),
        ps: new Unit("picosecond", "ps", 1e-12),
        ns: new Unit("nanosecond", "ns", 1e-9),
        // "tick" is a UE5-flavoured 100 ns sample; symbol made
        // distinct from "ns" to remove the legacy collision.
        tick: new Unit("tick", "tk", 1e-7),
        mis: new Unit("microsecond", "µs", 1e-6),
        ms: new Unit("millisecond", "ms", 1e-3),
        s: new Unit("second", "s", 1),
        Min: new Unit("minute", "m", 60),
        Hour: new Unit("hour", "h", 3600),
        Day: new Unit("day", "d", 86400),
        Week: new Unit("week", "w", 86400 * 7),
        Yr: new Unit("year", "y", 86400 * 365.25),
        Cy: new Unit("century", "c", 86400 * 36525),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Timespan.Units[str] || undefined;
    }
}

// ─────────────────────────────────────────────────────────────────────
// Temperature
//
// Temperature is the canonical affine quantity: the unit conversions
// have an offset (K ↔ C) plus a scale (C ↔ F), so the linear
// `value × (from.value / to.value)` cannot represent them. Each Unit
// declares an `IUnitConverter` that handles the conversion exactly,
// keyed off the literal 273.15 and the 1.8 scale.
//
// The `Unit.value` field is unused for the affine path; we set the
// reference unit (kelvin) to 1 so any code that bypasses the converter
// at least does not divide by zero. The previous module used -273.15
// on kelvin, with three converters all using the wrong sign (subtract
// when the formula said add and vice versa) — none of those
// conversions produced the correct result.
// ─────────────────────────────────────────────────────────────────────

class KConverter implements IUnitConverter {
    public accept(unit: Unit): boolean {
        return unit === Temperature.Units.c || unit === Temperature.Units.f;
    }
    public convert(value: number, unit: Unit): number {
        switch (unit) {
            case Temperature.Units.c:
                return value - 273.15;
            case Temperature.Units.f:
                return (value - 273.15) * 1.8 + 32;
            default:
                return value;
        }
    }
}

class CConverter implements IUnitConverter {
    public accept(unit: Unit): boolean {
        return unit === Temperature.Units.k || unit === Temperature.Units.f;
    }
    public convert(value: number, unit: Unit): number {
        switch (unit) {
            case Temperature.Units.k:
                return value + 273.15;
            case Temperature.Units.f:
                return value * 1.8 + 32;
            default:
                return value;
        }
    }
}

class FConverter implements IUnitConverter {
    public accept(unit: Unit): boolean {
        return unit === Temperature.Units.k || unit === Temperature.Units.c;
    }
    public convert(value: number, unit: Unit): number {
        switch (unit) {
            case Temperature.Units.k:
                return (value - 32) / 1.8 + 273.15;
            case Temperature.Units.c:
                return (value - 32) / 1.8;
            default:
                return value;
        }
    }
}

export class Temperature extends Quantity {
    public static ForParameter(value: Temperature | number, defaultValue: number, defaultUnit: Unit): Temperature {
        return value ? new Temperature(value, defaultUnit) : new Temperature(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        k: new Unit("kelvin", "K", 1, new KConverter()),
        c: new Unit("celsius", "°C", 1, new CConverter()),
        f: new Unit("fahrenheit", "°F", 1, new FConverter()),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Temperature.Units[str] || undefined;
    }
}

/**
 * Mass: base = kilogram. The legacy module labelled the milligram
 * row "microgram" (the value 1e-6 kg IS one milligram); fixed here.
 * `pm` retained as "planck mass" approximation; for a high-precision
 * value swap to 2.176434e-8 kg.
 */
export class Mass extends Quantity {
    public static ForParameter(value: Mass | number, defaultValue: number, defaultUnit: Unit): Mass {
        return value ? new Mass(value, defaultUnit) : new Mass(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        u: new Unit("atomic mass unit", "u", 1.66053906660e-27),
        pm: new Unit("planck mass", "pm", 2.176434e-8),
        mug: new Unit("microgram", "µg", 1e-9),
        mg: new Unit("milligram", "mg", 1e-6),
        g: new Unit("gram", "g", 1e-3),
        pound: new Unit("pound", "lb", 0.45359237),
        kg: new Unit("kilogram", "kg", 1),
        T: new Unit("metric ton", "t", 1000),
        Sm: new Unit("solar mass", "M☉", 1.98855e30),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Mass.Units[str] || undefined;
    }
}

export class Power extends Quantity {
    public static ForParameter(value: Power | number, defaultValue: number, defaultUnit: Unit): Power {
        return value ? new Power(value, defaultUnit) : new Power(defaultValue, defaultUnit);
    }
    public static Units: { [key: string]: Unit } = {
        watt: new Unit("watt", "W", 1),
        kwatt: new Unit("kilowatt", "kW", 1e3),
        Mwatt: new Unit("megawatt", "MW", 1e6),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Power.Units[str] || undefined;
    }
}

export class Voltage extends Quantity {
    public static ForParameter(value: Voltage | number, defaultValue: number, defaultUnit: Unit): Voltage {
        return value ? new Voltage(value, defaultUnit) : new Voltage(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        volt: new Unit("volt", "V", 1),
        mvolt: new Unit("millivolt", "mV", 1e-3),
        kvolt: new Unit("kilovolt", "kV", 1e3),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Voltage.Units[str] || undefined;
    }
}

export class Current extends Quantity {
    public static ForParameter(value: Current | number, defaultValue: number, defaultUnit: Unit): Current {
        return value ? new Current(value, defaultUnit) : new Current(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        amp: new Unit("ampere", "A", 1),
        mamp: new Unit("milliampere", "mA", 1e-3),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Current.Units[str] || undefined;
    }
}

export class Luminosity extends Quantity {
    public static ForParameter(value: Luminosity | number, defaultValue: number, defaultUnit: Unit): Luminosity {
        return value ? new Luminosity(value, defaultUnit) : new Luminosity(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        watt: new Unit("watt", "W", 1),
        Lsun: new Unit("solar luminosity", "L☉", 3.846e26),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Luminosity.Units[str] || undefined;
    }
}

/**
 * Volume: base = cubic metre. The original file shipped only `m3`;
 * the litre and millilitre additions cover the cases SceneItem /
 * AtmosphereStateNode will need to type tank volumes and species
 * inventories.
 */
export class Volume extends Quantity {
    public static ForParameter(value: Volume | number, defaultValue: number, defaultUnit: Unit): Volume {
        return value ? new Volume(value, defaultUnit) : new Volume(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        m3: new Unit("cubic meter", "m³", 1),
        L: new Unit("litre", "L", 1e-3),
        mL: new Unit("millilitre", "mL", 1e-6),
        cm3: new Unit("cubic centimeter", "cm³", 1e-6),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Volume.Units[str] || undefined;
    }
}

/**
 * Area: base = square metre.
 *
 * Used by `AtmosphereGateNode` (P7) to type the open-passive throat
 * area. Conversion factors are derived from the corresponding Length
 * factors (a²) — kept inline here rather than computed lazily so the
 * `Quantity.Convert` linear path stays branch-free.
 */
export class Area extends Quantity {
    public static ForParameter(value: Area | number, defaultValue: number, defaultUnit: Unit): Area {
        return value ? new Area(value, defaultUnit) : new Area(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        m2: new Unit("square meter", "m²", 1),
        cm2: new Unit("square centimeter", "cm²", 1e-4),
        mm2: new Unit("square millimeter", "mm²", 1e-6),
        km2: new Unit("square kilometer", "km²", 1e6),
        in2: new Unit("square inch", "in²", 0.00064516),
        ft2: new Unit("square foot", "ft²", 0.09290304),
        ha: new Unit("hectare", "ha", 1e4),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Area.Units[str] || undefined;
    }
}

/**
 * Volumetric flow rate: base = cubic metre per second.
 *
 * Used by `AtmosphereGateNode` (P7) to type the hvac-forced flow.
 * The catalog covers SI (m³/s, L/s, L/min, m³/h) plus the two
 * industrial-HVAC standards (cfm, US gpm) so the property panel can
 * render whatever the user thinks in.
 *
 *   1 L/s    = 1e-3 m³/s
 *   1 L/min  = 1e-3 / 60 m³/s
 *   1 m³/h   = 1/3600 m³/s
 *   1 cfm    = 0.3048³ × 0.02831685 / 60 ≈ 4.7194745e-4 m³/s
 *              (1 ft³ = 0.02831684659 m³, divided by 60 s/min)
 *   1 US gpm = 3.785411784 L / 60 s ≈ 6.30901964e-5 m³/s
 */
export class VolumetricFlow extends Quantity {
    public static ForParameter(value: VolumetricFlow | number, defaultValue: number, defaultUnit: Unit): VolumetricFlow {
        return value ? new VolumetricFlow(value, defaultUnit) : new VolumetricFlow(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        m3ps: new Unit("cubic meter per second", "m³/s", 1),
        Lps: new Unit("litre per second", "L/s", 1e-3),
        Lpmin: new Unit("litre per minute", "L/min", 1e-3 / 60),
        mLpmin: new Unit("millilitre per minute", "mL/min", 1e-6 / 60),
        m3ph: new Unit("cubic meter per hour", "m³/h", 1 / 3600),
        cfm: new Unit("cubic feet per minute", "cfm", 0.02831684659 / 60),
        gpm: new Unit("US gallon per minute", "gpm", 3.785411784e-3 / 60),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return VolumetricFlow.Units[str] || undefined;
    }
}

export class Angle extends Quantity {
    public static ForParameter(value: Angle | number, defaultValue: number, defaultUnit: Unit): Angle {
        return value ? new Angle(value, defaultUnit) : new Angle(defaultValue, defaultUnit);
    }

    public static PIBY2 = Math.PI / 2;
    public static PIBY4 = Math.PI / 4;
    public static DE2RA = Math.PI / 180;
    public static RA2DE = 180 / Math.PI;
    public static DE2RABY2 = Math.PI / 360;

    public static Units: { [key: string]: Unit } = {
        d: new Unit("degree", "°", 1),
        r: new Unit("radian", "rad", Angle.RA2DE),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Angle.Units[str] || undefined;
    }
}

/**
 * Length: base = metre. All SI prefixes corrected to `1eN` (the old
 * module had a systematic `10eN` mistake that put every prefix
 * 10× off in the same direction). `Mi` and `Nmi` were carrying the
 * factor for km-base (1.609, 1.852) but used in metre-base context;
 * fixed to 1609.344 and 1852 respectively.
 */
export class Length extends Quantity {
    public static ForParameter(value: Length | number, defaultValue: number, defaultUnit: Unit): Length {
        return value ? new Length(value, defaultUnit) : new Length(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        ym: new Unit("yoctometer", "ym", 1e-24),
        zm: new Unit("zeptometer", "zm", 1e-21),
        am: new Unit("attometer", "am", 1e-18),
        fm: new Unit("femtometer", "fm", 1e-15),
        pm: new Unit("picometer", "pm", 1e-12),
        nm: new Unit("nanometer", "nm", 1e-9),
        mim: new Unit("micrometer", "µm", 1e-6),
        mm: new Unit("millimeter", "mm", 1e-3),
        cm: new Unit("centimeter", "cm", 1e-2),
        in: new Unit("inch", "in", 0.0254),
        dm: new Unit("decimeter", "dm", 1e-1),
        m: new Unit("meter", "m", 1),
        Mi: new Unit("mile", "mi", 1609.344),
        Nmi: new Unit("nautical mile", "Nmi", 1852),
        Dam: new Unit("decameter", "dam", 10),
        Hm: new Unit("hectometer", "hm", 100),
        Km: new Unit("kilometer", "km", 1000),
        Sr: new Unit("solar radius", "R☉", 6.957e8),
        Mm: new Unit("megameter", "Mm", 1e6),
        Ls: new Unit("light second", "Ls", 299792458),
        Gm: new Unit("gigameter", "Gm", 1e9),
        Au: new Unit("astronomical unit", "AU", 1.495978707e11),
        Tm: new Unit("terameter", "Tm", 1e12),
        Pm: new Unit("petameter", "Pm", 1e15),
        Ly: new Unit("light year", "ly", 9.4607304725808e15),
        Pc: new Unit("parsec", "pc", 3.0857e16),
        Em: new Unit("exameter", "Em", 1e18),
        Zm: new Unit("zettameter", "Zm", 1e21),
        Ym: new Unit("yottameter", "Ym", 1e24),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Length.Units[str] || undefined;
    }
}

/**
 * Speed: base = metre per second. Now populated (the legacy module
 * shipped Speed with `Units = {}` and a `ForParameter` that returned
 * `Length`, both of which made the class unusable).
 */
export class Speed extends Quantity {
    public static ForParameter(value: Speed | number, defaultValue: number, defaultUnit: Unit): Speed {
        return value ? new Speed(value, defaultUnit) : new Speed(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        mps: new Unit("meter per second", "m/s", 1),
        kph: new Unit("kilometer per hour", "km/h", 1000 / 3600),
        mph: new Unit("mile per hour", "mph", 1609.344 / 3600),
        knot: new Unit("knot", "kn", 1852 / 3600),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Speed.Units[str] || undefined;
    }
}

export class Frequency extends Quantity {
    public static ForParameter(value: Frequency | number, defaultValue: number, defaultUnit: Unit): Frequency {
        return value ? new Frequency(value, defaultUnit) : new Frequency(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        Hz: new Unit("hertz", "Hz", 1),
        kHz: new Unit("kilohertz", "kHz", 1e3),
        MHz: new Unit("megahertz", "MHz", 1e6),
        GHz: new Unit("gigahertz", "GHz", 1e9),
        rps: new Unit("revolutions per second", "rps", 1),
        rpm: new Unit("revolutions per minute", "rpm", 1 / 60),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Frequency.Units[str] || undefined;
    }
}

export class Acceleration extends Quantity {
    public static ForParameter(value: Acceleration | number, defaultValue: number, defaultUnit: Unit): Acceleration {
        return value ? new Acceleration(value, defaultUnit) : new Acceleration(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        mps2: new Unit("meter per second squared", "m/s²", 1),
        g: new Unit("standard gravity", "g", 9.80665),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Acceleration.Units[str] || undefined;
    }
}

export class Pressure extends Quantity {
    public static ForParameter(value: Pressure | number, defaultValue: number, defaultUnit: Unit): Pressure {
        return value ? new Pressure(value, defaultUnit) : new Pressure(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        Pa: new Unit("pascal", "Pa", 1),
        hPa: new Unit("hectopascal", "hPa", 1e2),
        kPa: new Unit("kilopascal", "kPa", 1e3),
        MPa: new Unit("megapascal", "MPa", 1e6),
        bar: new Unit("bar", "bar", 1e5),
        mbar: new Unit("millibar", "mbar", 1e2),
        atm: new Unit("atmosphere", "atm", 101325),
        psi: new Unit("pound per square inch", "psi", 6894.757),
        torr: new Unit("torr", "Torr", 133.322368),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Pressure.Units[str] || undefined;
    }
}

export class Dimensionless extends Quantity {
    public static ForParameter(value: Dimensionless | number, defaultValue: number, defaultUnit: Unit): Dimensionless {
        return value ? new Dimensionless(value, defaultUnit) : new Dimensionless(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        none: new Unit("dimensionless", "", 1),
        ratio: new Unit("ratio", "ratio", 1),
        percent: new Unit("percent", "%", 0.01),
        ppm: new Unit("parts per million", "ppm", 1e-6),
        ppb: new Unit("parts per billion", "ppb", 1e-9),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Dimensionless.Units[str] || undefined;
    }
}

// ─────────────────────────────────────────────────────────────────────
// Chemistry quantities (P9.0)
//
// Used by `GasNode`, `PollutantNode` and `CompositionNode` in the
// chemistry plugin. Canonical SI bases throughout (kg/mol, kg/m³,
// J/(kg·K), W/(m·K), Pa·s); secondary units cover the conventions
// engineers actually write in: g/mol for molar mass, g/cm³ for
// density at STP, mg/m³ and μg/m³ for environmental concentrations,
// kJ/(kg·K) for specific heats, cP (centipoise = mPa·s) for fluid
// viscosity, μPa·s for low-pressure gas viscosity.
// ─────────────────────────────────────────────────────────────────────

/**
 * Molar mass: base = kilogram per mole. The g/mol unit is the
 * conventional one in chemistry tables, so the storage layer
 * (canonical SI) and the user-facing layer (g/mol) round-trip via
 * the Quantity API as usual.
 */
export class MolarMass extends Quantity {
    public static ForParameter(value: MolarMass | number, defaultValue: number, defaultUnit: Unit): MolarMass {
        return value ? new MolarMass(value, defaultUnit) : new MolarMass(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        kgpmol: new Unit("kilogram per mole", "kg/mol", 1),
        gpmol: new Unit("gram per mole", "g/mol", 1e-3),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return MolarMass.Units[str] || undefined;
    }
}

/**
 * Mass density: base = kilogram per cubic metre. Used for gases at
 * STP / NTP, liquids, and particulate material densities. Distinct
 * from `MassConcentration` semantically (intrinsic property of a
 * substance vs. trace-species level) even though the dimensions
 * coincide — keeping the two type-distinct guards against accidental
 * mixing in formulas where context matters.
 */
export class Density extends Quantity {
    public static ForParameter(value: Density | number, defaultValue: number, defaultUnit: Unit): Density {
        return value ? new Density(value, defaultUnit) : new Density(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        kgpm3: new Unit("kilogram per cubic meter", "kg/m³", 1),
        gpcm3: new Unit("gram per cubic centimeter", "g/cm³", 1000),
        gpL: new Unit("gram per litre", "g/L", 1),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return Density.Units[str] || undefined;
    }
}

/**
 * Mass concentration of a trace species: base = kilogram per cubic
 * metre. Environmental measurement units (mg/m³, μg/m³) dominate at
 * call sites — TWA / STEL / IDLH limits, indoor-air-quality reports.
 * Dimensionally identical to `Density` but kept separate so the
 * Quantity type carries the semantic context.
 */
export class MassConcentration extends Quantity {
    public static ForParameter(value: MassConcentration | number, defaultValue: number, defaultUnit: Unit): MassConcentration {
        return value ? new MassConcentration(value, defaultUnit) : new MassConcentration(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        kgpm3: new Unit("kilogram per cubic meter", "kg/m³", 1),
        mgpm3: new Unit("milligram per cubic meter", "mg/m³", 1e-6),
        ugpm3: new Unit("microgram per cubic meter", "µg/m³", 1e-9),
        mgpL: new Unit("milligram per litre", "mg/L", 1e-3),
        ugpL: new Unit("microgram per litre", "µg/L", 1e-6),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return MassConcentration.Units[str] || undefined;
    }
}

/**
 * Specific heat capacity at constant pressure (per unit mass): base
 * = joule per kilogram per kelvin. Engineering tables often quote
 * kJ/(kg·K) — water is ~4.184 kJ/(kg·K), air ~1.005 kJ/(kg·K).
 */
export class MassSpecificHeat extends Quantity {
    public static ForParameter(value: MassSpecificHeat | number, defaultValue: number, defaultUnit: Unit): MassSpecificHeat {
        return value ? new MassSpecificHeat(value, defaultUnit) : new MassSpecificHeat(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        JpkgK: new Unit("joule per kilogram per kelvin", "J/(kg·K)", 1),
        kJpkgK: new Unit("kilojoule per kilogram per kelvin", "kJ/(kg·K)", 1e3),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return MassSpecificHeat.Units[str] || undefined;
    }
}

/**
 * Thermal conductivity: base = watt per metre per kelvin. Air sits
 * around 0.026 W/(m·K) at room temperature; copper ~400 W/(m·K).
 * The mW/(m·K) form is the conventional one for gas tables.
 */
export class ThermalConductivity extends Quantity {
    public static ForParameter(value: ThermalConductivity | number, defaultValue: number, defaultUnit: Unit): ThermalConductivity {
        return value ? new ThermalConductivity(value, defaultUnit) : new ThermalConductivity(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        WpmK: new Unit("watt per meter per kelvin", "W/(m·K)", 1),
        mWpmK: new Unit("milliwatt per meter per kelvin", "mW/(m·K)", 1e-3),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return ThermalConductivity.Units[str] || undefined;
    }
}

/**
 * Dynamic (shear) viscosity: base = pascal-second. The conventional
 * units are the centipoise (cP ≡ mPa·s, water at 20 °C ≈ 1 cP) and
 * the micropascal-second (μPa·s, air at 20 °C ≈ 18 μPa·s).
 */
export class DynamicViscosity extends Quantity {
    public static ForParameter(value: DynamicViscosity | number, defaultValue: number, defaultUnit: Unit): DynamicViscosity {
        return value ? new DynamicViscosity(value, defaultUnit) : new DynamicViscosity(defaultValue, defaultUnit);
    }

    public static Units: { [key: string]: Unit } = {
        Pas: new Unit("pascal-second", "Pa·s", 1),
        cP: new Unit("centipoise", "cP", 1e-3),
        mPas: new Unit("millipascal-second", "mPa·s", 1e-3),
        uPas: new Unit("micropascal-second", "µPa·s", 1e-6),
    };

    public unitForSymbol(str: string): Unit | undefined {
        return DynamicViscosity.Units[str] || undefined;
    }
}

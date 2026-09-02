/**
 * `Physics.Particulate:particulate` — particulate-matter descriptor
 * stub (V1 placeholder; full V2 integration deferred).
 *
 * Particulate matter (PM2.5, PM10, dust, regolith, ...) is solid-phase
 * matter, NOT a chemical species. Its dynamics (settling under
 * gravity, drag, re-suspension, filtration) are physics — which is
 * why this descriptor lives under `Physics.Particulate` and not in
 * the chemistry plugin where it briefly lived during the P9.5 sketch.
 *
 * V1 ships a SLOT, not a full simulation. The `Physics.Scene:atmosphere-state`
 * declares `particulate_in_<k>` variadic config-link inputs; a
 * ParticulateNode wired there is recorded by the SceneBindingResolver
 * as part of the atmosphere's binding metadata. No integration logic
 * is hooked up yet (no kg-mass / count-concentration state segment,
 * no rhs contribution); the slot exists so the topology survives V2
 * without a second pass of refactoring.
 *
 * V2 (deferred) will:
 *   - Add a second state segment to AtmosphereStateNode for
 *     particulate mass-loading per size bin [kg/m³].
 *   - Define `delta_particulate_<id>_<k>` variadic input ports for
 *     producer wiring (filter unloading, dust generation).
 *   - Settle / re-suspend via gravity-dependent terms read from
 *     SceneStateView (the gravity vector — already exposed by the
 *     P1' transform refactor).
 *
 * V1 fields cover the descriptor shape only:
 *   - `particulateId`           Stable identifier ("pm2_5", "pm10",
 *                               "lunar_dust", ...). Slot suffix when
 *                               V2 wiring lands.
 *   - `displayName`             Property-panel / dashboard label.
 *   - `characteristicDiameter`  Median aerodynamic diameter [m].
 *   - `materialDensity`         Bulk material density [kg/m³].
 *   - `pmClass`                 Free-form hazard / size category
 *                               consumed by future filtering logic.
 *
 * Implements `IParticulateMetadata` (core/sim/particulate.interfaces.ts).
 */

import { Cartesian3, cloneable, editable, GraphItem } from "spikypanda-core";
import type { ICartesian, IParticulateMetadata } from "spikypanda-core";

void Cartesian3;

/** Slot constant for the particulate → atmosphere config-link. */
export const PARTICULATE_OUT_ANCHOR = "particulate_out";

export class ParticulateNode extends GraphItem implements IParticulateMetadata {
    // ── Identity ─────────────────────────────────────────────────────

    @cloneable private _particulateId: string = "pm";
    @cloneable private _displayName: string = "Particulate";

    // ── Physical descriptors (canonical SI storage) ──────────────────

    @cloneable private _characteristicDiameterM: number = 1e-5; // 10 μm
    @cloneable private _materialDensityKgPerM3: number = 1000;
    @cloneable private _pmClass: string = "pm10";

    // ── @editable accessors (snake_case for property-panel display) ──

    @editable("string")
    public get particulate_id(): string {
        return this._particulateId;
    }
    public set particulate_id(v: string) {
        const next = v && v.length > 0 ? v : "pm";
        this.setField("particulate_id", this._particulateId, next, (n) => {
            this._particulateId = n;
        });
    }
    public get particulateId(): string {
        return this._particulateId;
    }
    public set particulateId(v: string) {
        this.particulate_id = v;
    }

    @editable("string")
    public get display_name(): string {
        return this._displayName;
    }
    public set display_name(v: string) {
        this.setField("display_name", this._displayName, v, (n) => {
            this._displayName = n;
        });
    }
    public get displayName(): string {
        return this._displayName;
    }
    public set displayName(v: string) {
        this.display_name = v;
    }

    /** Characteristic (median) aerodynamic diameter in micrometres
     *  (storage in metres). The μm-scale is the engineering-natural
     *  unit for PM nomenclature (PM2.5 → 2.5 μm, PM10 → 10 μm); SI
     *  storage stays canonical so V2 settling laws can use the value
     *  directly without an extra conversion. */
    @editable("number", { unit: { quantity: "Length", unit: "mim" } })
    public get characteristic_diameter_um(): number {
        return this._characteristicDiameterM * 1e6;
    }
    public set characteristic_diameter_um(v: number) {
        const next = v >= 0 ? v * 1e-6 : this._characteristicDiameterM;
        this.setField("characteristic_diameter_um", this._characteristicDiameterM, next, (n) => {
            this._characteristicDiameterM = n;
        });
    }
    public get characteristicDiameter(): number {
        return this._characteristicDiameterM;
    }

    @editable("number", { unit: { quantity: "Density", unit: "kgpm3" } })
    public get material_density_kg_per_m3(): number {
        return this._materialDensityKgPerM3;
    }
    public set material_density_kg_per_m3(v: number) {
        const next = v >= 0 ? v : this._materialDensityKgPerM3;
        this.setField("material_density_kg_per_m3", this._materialDensityKgPerM3, next, (n) => {
            this._materialDensityKgPerM3 = n;
        });
    }
    public get density(): number {
        return this._materialDensityKgPerM3;
    }

    @editable("string")
    public get pm_class(): string {
        return this._pmClass;
    }
    public set pm_class(v: string) {
        const next = v && v.length > 0 ? v : "pm10";
        this.setField("pm_class", this._pmClass, next, (n) => {
            this._pmClass = n;
        });
    }
    public get pmClass(): string {
        return this._pmClass;
    }
    public set pmClass(v: string) {
        this.pm_class = v;
    }
}

/** Reference to `ICartesian` keeps the import tree happy when this
 *  class is instantiated with a position via the GraphItem base path. */
export type { ICartesian };

/** Default factory: a generic 10 μm particulate. */
export function createParticulateNode(): ParticulateNode {
    return new ParticulateNode();
}

/** PM2.5 factory (fine particulate, indoor air quality benchmark). */
export function createPM2_5ParticulateNode(): ParticulateNode {
    const n = new ParticulateNode();
    n.particulate_id = "pm2_5";
    n.display_name = "PM2.5";
    n.characteristic_diameter_um = 2.5;
    n.material_density_kg_per_m3 = 1500;
    n.pm_class = "pm2_5";
    return n;
}

/** PM10 factory (coarse particulate). */
export function createPM10ParticulateNode(): ParticulateNode {
    const n = new ParticulateNode();
    n.particulate_id = "pm10";
    n.display_name = "PM10";
    n.characteristic_diameter_um = 10;
    n.material_density_kg_per_m3 = 1500;
    n.pm_class = "pm10";
    return n;
}

/** Lunar regolith factory — abrasive Apollo-experience dust. */
export function createLunarDustParticulateNode(): ParticulateNode {
    const n = new ParticulateNode();
    n.particulate_id = "lunar_dust";
    n.display_name = "Lunar dust";
    n.characteristic_diameter_um = 5;
    n.material_density_kg_per_m3 = 3100;
    n.pm_class = "dust";
    return n;
}

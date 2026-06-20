/**
 * Tests for the generalized per-property Scene input ports (2026-06-08).
 *
 * Every editable on SceneItem now has a matching input port + SourceId
 * field. When a data wire lands on the input port, the SceneSourceResolver
 * is consulted at session bind to produce a live thunk; the SceneStateView
 * resolves through the publisher each tick.
 *
 * Priority at runtime (per buildStateView):
 *   1. Explicit data-wire SourceId (e.g. gravity_in publisher)
 *   2. Atmosphere binding via atmosphere_in (temperature/pressure/density)
 *   3. SceneItem editable default.
 *
 * The is_*_wired viewables surface the wiring status to the property
 * panel so the user can see at a glance which fields are externally
 * driven.
 */

import { Cartesian3, getEditorSchema, Quaternion, Temperature } from "../../dev/core/src";
import type { SceneSourceResolver } from "../../dev/plugins/physics/src/scene/scene.item";
import { SceneItem } from "../../dev/plugins/physics/src/scene/scene.item";

// ─────────────────────────────────────────────────────────────────────
// Resolver helpers
// ─────────────────────────────────────────────────────────────────────

function makeResolver(
    opts: {
        gravity?: () => Cartesian3;
        temperatureK?: () => number;
        pressurePa?: () => number;
        density?: () => number;
        timeScale?: () => number;
        localPosition?: () => Cartesian3;
        localRotation?: () => Quaternion;
        localScale?: () => Cartesian3;
    } = {}
): SceneSourceResolver {
    return {
        resolveNumberSource: (id: string) => {
            // The SceneItem's *SourceId is a publisher node UUID — we
            // route to whichever closure the test asked for based on
            // marker IDs ("temp-pub", "press-pub", etc.). Real
            // resolvers walk the graph; tests just match by string.
            if (id === "temp-pub" && opts.temperatureK) return opts.temperatureK;
            if (id === "press-pub" && opts.pressurePa) return opts.pressurePa;
            if (id === "dens-pub" && opts.density) return opts.density;
            if (id === "ts-pub" && opts.timeScale) return opts.timeScale;
            return null;
        },
        resolveCartesian3Source: (id: string) => {
            if (id === "grav-pub" && opts.gravity) return opts.gravity;
            if (id === "pos-pub" && opts.localPosition) return opts.localPosition;
            if (id === "scl-pub" && opts.localScale) return opts.localScale;
            return null;
        },
        resolveQuaternionSource: (id: string) => {
            if (id === "rot-pub" && opts.localRotation) return opts.localRotation;
            return null;
        },
        aggregateEffectiveHz: () => 60,
        resolveAtmosphere: () => null,
    };
}

// ─────────────────────────────────────────────────────────────────────
// Gravity input port
// ─────────────────────────────────────────────────────────────────────

describe("Scene gravity_in", () => {
    it("with no source: gravity falls back to the editable default", () => {
        const scene = new SceneItem();
        scene.gravity = new Cartesian3(0, 0, -9.81);
        const view = scene.buildStateView(makeResolver());
        expect(view.gravity.x).toBe(0);
        expect(view.gravity.z).toBeCloseTo(-9.81, 6);
        expect(scene.is_gravity_wired).toBe(false);
    });

    it("with a wired source: gravity reflects the live publisher value", () => {
        const scene = new SceneItem();
        scene.gravity = new Cartesian3(0, 0, -9.81);
        scene.gravitySourceId = "grav-pub";
        let g = new Cartesian3(1.62, 0, 0); // Moon gravity (radial)
        const view = scene.buildStateView(makeResolver({ gravity: () => g }));
        expect(view.gravity.x).toBeCloseTo(1.62, 6);
        // Live read: mutating the published value reflects on next access.
        g = new Cartesian3(3.71, 0, 0); // Mars
        expect(view.gravity.x).toBeCloseTo(3.71, 6);
        expect(scene.is_gravity_wired).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────
// Density input port
// ─────────────────────────────────────────────────────────────────────

describe("Scene density_in", () => {
    it("priority: density_in > atmosphere > editable default", () => {
        const scene = new SceneItem();
        scene.density = 5.0; // editable default
        // Wired density publisher overrides everything.
        scene.densitySourceId = "dens-pub";
        const view = scene.buildStateView(makeResolver({ density: () => 3.0 }));
        expect(view.density).toBe(3.0);
        expect(scene.is_density_wired).toBe(true);
    });

    it("no source: density falls back to the editable", () => {
        const scene = new SceneItem();
        scene.density = 7.5;
        const view = scene.buildStateView(makeResolver());
        expect(view.density).toBe(7.5);
        expect(scene.is_density_wired).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────
// is_*_wired viewables surface every input port's wiring status
// ─────────────────────────────────────────────────────────────────────

describe("Scene is_*_wired viewables", () => {
    it("default scene: all is_*_wired = false", () => {
        const scene = new SceneItem();
        expect(scene.is_gravity_wired).toBe(false);
        expect(scene.is_temperature_wired).toBe(false);
        expect(scene.is_pressure_wired).toBe(false);
        expect(scene.is_density_wired).toBe(false);
        expect(scene.is_time_scale_wired).toBe(false);
        expect(scene.is_local_position_wired).toBe(false);
        expect(scene.is_local_rotation_wired).toBe(false);
        expect(scene.is_local_scale_wired).toBe(false);
    });

    it("setting each SourceId flips the corresponding is_*_wired", () => {
        const scene = new SceneItem();
        scene.gravitySourceId = "g";
        scene.temperatureSourceId = "t";
        scene.pressureSourceId = "p";
        scene.densitySourceId = "d";
        scene.timeScaleSourceId = "ts";
        scene.localPositionSourceId = "pos";
        scene.localRotationSourceId = "rot";
        scene.localScaleSourceId = "scl";
        expect(scene.is_gravity_wired).toBe(true);
        expect(scene.is_temperature_wired).toBe(true);
        expect(scene.is_pressure_wired).toBe(true);
        expect(scene.is_density_wired).toBe(true);
        expect(scene.is_time_scale_wired).toBe(true);
        expect(scene.is_local_position_wired).toBe(true);
        expect(scene.is_local_rotation_wired).toBe(true);
        expect(scene.is_local_scale_wired).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────
// All 8 ports together: full coverage
// ─────────────────────────────────────────────────────────────────────

describe("Scene bindPropertyProvider (live panel-side reads)", () => {
    it("gravity getter routes through the bound provider closure", () => {
        const scene = new SceneItem();
        scene.gravity = new Cartesian3(0, 0, -9.81); // Earth default
        // Simulate the session-builder's behavior: bind a provider
        // that reads the publisher's "vec3" getter on every call.
        const publisher = { vec3: new Cartesian3(0, 0, -1.62) }; // Moon
        scene.bindPropertyProvider("gravity", () => publisher.vec3);
        expect(scene.gravity.z).toBeCloseTo(-1.62, 6);
        // Editing the publisher reflects on the next read.
        publisher.vec3 = new Cartesian3(0, 0, -3.71); // Mars
        expect(scene.gravity.z).toBeCloseTo(-3.71, 6);
    });

    it("bindPropertyProvider(null) clears the binding", () => {
        const scene = new SceneItem();
        scene.gravity = new Cartesian3(0, 0, -9.81);
        scene.bindPropertyProvider("gravity", () => new Cartesian3(0, 0, -1.62));
        expect(scene.gravity.z).toBeCloseTo(-1.62, 6);
        scene.bindPropertyProvider("gravity", null);
        expect(scene.gravity.z).toBeCloseTo(-9.81, 6); // back to editable
    });

    it("malformed provider value falls back to editable default", () => {
        const scene = new SceneItem();
        scene.gravity = new Cartesian3(0, 0, -9.81);
        // Provider returns wrong type → guard rejects, falls back.
        scene.bindPropertyProvider("gravity", () => 42 as unknown);
        expect(scene.gravity.z).toBeCloseTo(-9.81, 6);
    });

    it("temperature getter priority: provider > atmosphere > editable", () => {
        const scene = new SceneItem();
        scene.temperatureQ = new Temperature(15, Temperature.Units.c); // 288.15 K editable
        // Atmosphere mock at 350 K.
        const atmosphere = {
            sampleAggregates: () => ({ pressure: 0, temperatureK: 350, density: 0, mass: 0, volumeM3: 1 }),
        };
        scene.bindAtmosphere("atm", atmosphere);
        expect(scene.temperature).toBe(350); // atmosphere wins over editable
        // Now a provider claims 400 K — it wins over atmosphere.
        scene.bindPropertyProvider("temperature", () => 400);
        expect(scene.temperature).toBe(400);
    });

    it("is_*_wired reflects bindPropertyProvider state", () => {
        const scene = new SceneItem();
        expect(scene.is_gravity_wired).toBe(false);
        scene.bindPropertyProvider("gravity", () => new Cartesian3(0, 0, -1.62));
        expect(scene.is_gravity_wired).toBe(true);
        scene.bindPropertyProvider("gravity", null);
        expect(scene.is_gravity_wired).toBe(false);
    });
});

describe("Scene editable schema declares disabledWhen for every wired field", () => {
    /**
     * The PropertyEditor reads `options.disabledWhen` to demote an
     * @editable into a read-only row when the named viewable is
     * currently truthy. SceneItem must declare this for the 7 fields
     * that have a matching `is_X_wired` boolean. localRotation is
     * intentionally NOT @editable (no panel row), so it is excluded
     * even though its is_local_rotation_wired exists.
     */
    const EXPECTED: Record<string, string> = {
        gravity: "is_gravity_wired",
        temperature: "is_temperature_wired",
        pressure: "is_pressure_wired",
        density: "is_density_wired",
        timeScale: "is_time_scale_wired",
        localPosition: "is_local_position_wired",
        localScale: "is_local_scale_wired",
    };

    it("each declared @editable has the correct disabledWhen option", () => {
        const scene = new SceneItem();
        const schema = getEditorSchema(scene);
        for (const [propertyName, expectedDisabledWhen] of Object.entries(EXPECTED)) {
            const field = schema.fields.find((f) => f.propertyName === propertyName && f.editable);
            expect(field).toBeDefined();
            const options = field!.options as { disabledWhen?: string } | undefined;
            expect(options?.disabledWhen).toBe(expectedDisabledWhen);
        }
    });

    it("the disabledWhen target points to an existing viewable on the model", () => {
        const scene = new SceneItem();
        for (const viewableName of Object.values(EXPECTED)) {
            // Accessing the property must not throw and must return a
            // boolean — the panel reads it at render time and only
            // cares about truthiness.
            const v = (scene as unknown as Record<string, unknown>)[viewableName];
            expect(typeof v).toBe("boolean");
        }
    });

    it("wiring a property flips its disabledWhen boolean true (round-trip)", () => {
        const scene = new SceneItem();
        expect(scene.is_gravity_wired).toBe(false);
        scene.gravitySourceId = "g";
        expect(scene.is_gravity_wired).toBe(true);
        // The schema option still says is_gravity_wired (it's static
        // metadata); the panel reads the live viewable on every render.
        const field = getEditorSchema(scene).fields.find((f) => f.propertyName === "gravity");
        expect((field?.options as { disabledWhen?: string } | undefined)?.disabledWhen).toBe("is_gravity_wired");
    });
});

describe("Scene buildStateView with all per-property publishers wired", () => {
    it("every read* thunk resolves through the publisher when SourceId set", () => {
        const scene = new SceneItem();
        scene.gravitySourceId = "grav-pub";
        scene.temperatureSourceId = "temp-pub";
        scene.pressureSourceId = "press-pub";
        scene.densitySourceId = "dens-pub";
        scene.timeScaleSourceId = "ts-pub";
        scene.localPositionSourceId = "pos-pub";
        scene.localRotationSourceId = "rot-pub";
        scene.localScaleSourceId = "scl-pub";
        const view = scene.buildStateView(
            makeResolver({
                gravity: () => new Cartesian3(0, 0, -1.62),
                temperatureK: () => 310,
                pressurePa: () => 50000,
                density: () => 0.5,
                timeScale: () => 0.5,
                localPosition: () => new Cartesian3(10, 20, 30),
                localRotation: () => new Quaternion(0, 0, 0, 1),
                localScale: () => new Cartesian3(2, 2, 2),
            })
        );
        expect(view.gravity.z).toBeCloseTo(-1.62, 6);
        expect(view.temperature.getValue("K" as never)).toBe(310);
        expect(view.pressure.getValue("Pa" as never)).toBe(50000);
        expect(view.density).toBe(0.5);
        expect(view.timeScale).toBe(0.5);
        // NOTE: the local transform is no longer a SceneStateView concern. A
        // scene's pose is its IHasTransform localTransform() (composed from
        // localPosition/localRotation/localScale), and its world chains via the
        // `parent` wired at bind. So the local*SourceId resolver path is not
        // surfaced on the view; only the environmental latents above are.
    });
});

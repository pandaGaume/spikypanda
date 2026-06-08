/**
 * Unit tests for the new `Physics.Scene:scene` (SceneItem descriptor)
 * and the TransformNode.getScene() accessor which now reads from
 * `session.sceneStateView` instead of consuming a runtime `scene`
 * cable.
 *
 * Coverage:
 *   1. SceneItem editables round-trip and feed a live SceneStateView
 *      via buildStateView() with the right closures.
 *   2. SceneStateView getters reflect live SceneItem edits without
 *      rebuild (mutate temperature, view sees it next read).
 *   3. SceneStateView.worldTransform chains the parent's world via
 *      composeTransform / Matrix4 — non-trivial chain validated.
 *   4. TransformNode.getScene(session) returns the session's bound
 *      view when set; falls back to a default Earth-surface view
 *      when not set.
 *   5. Motors inherit only `local` + `parent_world` ports (no `scene`
 *      port anymore).
 */
import type { ISession } from "spikypanda-core";
import {
    buildDefaultStateView,
    Cartesian3,
    composeTransform,
    DEFAULT_GRAVITY,
    DEFAULT_TEMPERATURE,
    Frequency,
    isSceneStateView,
    makeTransform,
    MIN_EFFECTIVE_HZ,
    Pressure,
    Quaternion,
    Temperature,
} from "spikypanda-core";
import type { SceneStateView } from "spikypanda-core";
import { SceneItem, TransformNode } from "../../dev/plugins/physics/src/index";
import type { SceneSourceResolver } from "../../dev/plugins/physics/src/index";
import { DcMotorDynamicNode } from "../../dev/plugins/physics/src/electric/motor-dc/index";
import { BldcMotorDynamicNode } from "../../dev/plugins/physics/src/electric/motor-bldc/index";

// ---------------------------------------------------------------------------
// Resolver mock — the SceneItem.buildStateView contract under test
// ---------------------------------------------------------------------------

function noopResolver(effectiveHz: number = MIN_EFFECTIVE_HZ.getValue(Frequency.Units.Hz)): SceneSourceResolver {
    return {
        resolveNumberSource: () => null,
        resolveCartesian3Source: () => null,
        resolveQuaternionSource: () => null,
        resolveAtmosphere: () => null,
        aggregateEffectiveHz: () => effectiveHz,
    };
}

function emptySession(): ISession {
    return {
        graph: { links: [] },
        linkStates: [],
        sceneStateView: null,
        consume: () => undefined,
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
}

function sessionWithScene(view: SceneStateView): ISession {
    return {
        graph: { links: [] },
        linkStates: [],
        sceneStateView: view,
        consume: () => undefined,
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
}

// ---------------------------------------------------------------------------
// SceneItem constructor defaults + live view round-trip
// ---------------------------------------------------------------------------

describe("SceneItem defaults + buildStateView", () => {
    it("constructor defaults match Earth-surface (z-down)", () => {
        const s = new SceneItem();
        expect(s.gravity.x).toBe(0);
        expect(s.gravity.y).toBe(0);
        expect(s.gravity.z).toBeCloseTo(-9.81, 6);
        expect(s.temperature).toBeCloseTo(293.15, 6);
        expect(s.pressure).toBe(101325);
        expect(s.timeScale).toBe(1);
    });

    it("buildStateView yields a live view that returns the SceneItem's values as Quantity instances", () => {
        const s = new SceneItem();
        const view = s.buildStateView(noopResolver());
        expect(view.gravity.x).toBe(0);
        expect(view.gravity.z).toBeCloseTo(-9.81, 6);
        // Temperature / Pressure / Frequency are Quantity-wrapped now;
        // canonical storage in K / Pa / Hz.
        expect(view.temperature).toBeInstanceOf(Temperature);
        expect(view.temperature.getValue(Temperature.Units.k)).toBeCloseTo(293.15, 6);
        expect(view.pressure).toBeInstanceOf(Pressure);
        expect(view.pressure.getValue(Pressure.Units.Pa)).toBe(101325);
        expect(view.atmosphere).toBeNull();
    });

    it("view getters reflect live SceneItem edits without rebuild (closures)", () => {
        const s = new SceneItem();
        const view = s.buildStateView(noopResolver());
        // SceneItem editables expose raw SI scalars; the view wraps in Quantity.
        s.temperature = 250;
        s.pressure = 600;
        expect(view.temperature.getValue(Temperature.Units.k)).toBe(250);
        expect(view.pressure.getValue(Pressure.Units.Pa)).toBe(600);
        s.gravity = new Cartesian3(0, 0, -1.625);
        expect(view.gravity.z).toBeCloseTo(-1.625, 6);
    });

    it("temperatureQ / pressureQ / manualHzQ accept arbitrary units and store in canonical SI", () => {
        const s = new SceneItem();
        s.temperatureQ = new Temperature(20, Temperature.Units.c); // 293.15 K
        expect(s.temperature).toBeCloseTo(293.15, 6);
        s.temperatureQ = new Temperature(32, Temperature.Units.f); // 0 °C → 273.15 K
        expect(s.temperature).toBeCloseTo(273.15, 6);
        s.pressureQ = new Pressure(1, Pressure.Units.atm); // 101325 Pa
        expect(s.pressure).toBeCloseTo(101325, 6);
        s.pressureQ = new Pressure(1, Pressure.Units.bar); // 100000 Pa
        expect(s.pressure).toBe(1e5);
        s.manualHzQ = new Frequency(1, Frequency.Units.kHz); // 1000 Hz
        expect(s.manualHz).toBe(1000);
    });

    it("effectiveHz follows manualHz override when positive (Quantity-wrapped)", () => {
        const s = new SceneItem();
        s.manualHz = 0;
        let view = s.buildStateView(noopResolver(120));
        expect(view.effectiveHz).toBeInstanceOf(Frequency);
        expect(view.effectiveHz.getValue(Frequency.Units.Hz)).toBe(120);
        s.manualHz = 1000;
        view = s.buildStateView(noopResolver(120));
        expect(view.effectiveHz.getValue(Frequency.Units.Hz)).toBe(1000);
        expect(view.effectiveHz.getValue(Frequency.Units.kHz)).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Transform chain (composeTransform + worldTransform)
// ---------------------------------------------------------------------------

describe("SceneStateView 3D-tree chain", () => {
    it("composeTransform produces world = parent · child for a pure translation", () => {
        const parent = makeTransform(new Cartesian3(10, 0, 0), Quaternion.identity(), new Cartesian3(1, 1, 1));
        const child = makeTransform(new Cartesian3(0, 5, 0), Quaternion.identity(), new Cartesian3(1, 1, 1));
        const world = composeTransform(parent, child);
        expect(world.position.x).toBeCloseTo(10, 9);
        expect(world.position.y).toBeCloseTo(5, 9);
        expect(world.position.z).toBeCloseTo(0, 9);
    });

    it("composeTransform produces world = parent · child for a uniform scale", () => {
        const parent = makeTransform(new Cartesian3(0, 0, 0), Quaternion.identity(), new Cartesian3(2, 2, 2));
        const child = makeTransform(new Cartesian3(3, 0, 0), Quaternion.identity(), new Cartesian3(1, 1, 1));
        const world = composeTransform(parent, child);
        // Child position 3 in X gets scaled by parent's 2× → 6.
        expect(world.position.x).toBeCloseTo(6, 9);
        expect(world.scale.x).toBeCloseTo(2, 9);
    });

    it("a SceneStateView with setParent(parent) chains worldTransform automatically", () => {
        const parentItem = new SceneItem();
        parentItem.localPosition = new Cartesian3(10, 0, 0);
        const parentView = parentItem.buildStateView(noopResolver());

        const childItem = new SceneItem();
        childItem.localPosition = new Cartesian3(0, 5, 0);
        const childView = childItem.buildStateView(noopResolver());

        // SceneStateViewImpl.setParent is the public seam.
        (childView as { setParent(p: SceneStateView | null): void }).setParent(parentView);
        const w = childView.worldTransform;
        expect(w.position.x).toBeCloseTo(10, 9);
        expect(w.position.y).toBeCloseTo(5, 9);
    });

    it("worldTransform.toMatrix4 returns a 16-entry column-major Float64Array", () => {
        const item = new SceneItem();
        item.localPosition = new Cartesian3(1, 2, 3);
        const view = item.buildStateView(noopResolver());
        const m = view.worldTransform.toMatrix4().m;
        expect(m.length).toBe(16);
        // Translation in column 3.
        expect(m[12]).toBeCloseTo(1, 9);
        expect(m[13]).toBeCloseTo(2, 9);
        expect(m[14]).toBeCloseTo(3, 9);
        // Identity rotation / unit scale on the diagonal.
        expect(m[0]).toBeCloseTo(1, 9);
        expect(m[5]).toBeCloseTo(1, 9);
        expect(m[10]).toBeCloseTo(1, 9);
        expect(m[15]).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// buildDefaultStateView fallback
// ---------------------------------------------------------------------------

describe("buildDefaultStateView + isSceneStateView", () => {
    it("returns an Earth-surface view that consumers can read without crashing", () => {
        const view = buildDefaultStateView("test");
        expect(view.id).toBe("test");
        expect(view.gravity).toBe(DEFAULT_GRAVITY);
        expect(view.temperature.getValue(Temperature.Units.k)).toBe(DEFAULT_TEMPERATURE.getValue(Temperature.Units.k));
        expect(view.atmosphere).toBeNull();
        expect(view.effectiveHz.getValue(Frequency.Units.Hz)).toBe(MIN_EFFECTIVE_HZ.getValue(Frequency.Units.Hz));
    });

    it("isSceneStateView accepts a real view from buildDefaultStateView", () => {
        const view = buildDefaultStateView("test");
        expect(isSceneStateView(view)).toBe(true);
    });

    it("isSceneStateView rejects malformed payloads", () => {
        expect(isSceneStateView(null)).toBe(false);
        expect(isSceneStateView(undefined)).toBe(false);
        expect(isSceneStateView({})).toBe(false);
        expect(isSceneStateView(42)).toBe(false);
        // The legacy shape with bare-number scalars no longer passes.
        expect(isSceneStateView({
            id: "x",
            gravity: { x: 0, y: 0, z: -9.81 },
            temperature: 293.15,
            pressure: 101325,
            timeScale: 1,
            effectiveHz: 60,
            localTransform: {},
            worldTransform: {},
        })).toBe(false);
        // Same payload with Quantity-wrapped scalars passes.
        expect(isSceneStateView({
            id: "x",
            gravity: { x: 0, y: 0, z: -9.81 },
            temperature: new Temperature(293.15, Temperature.Units.k),
            pressure: new Pressure(101325, Pressure.Units.Pa),
            density: 1.225,
            timeScale: 1,
            effectiveHz: new Frequency(60, Frequency.Units.Hz),
            localTransform: {},
            worldTransform: {},
        })).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// TransformNode.getScene reads from session.sceneStateView
// ---------------------------------------------------------------------------

class TestableTransformNode extends TransformNode {
    public readScene(session: ISession): SceneStateView {
        return (this as unknown as { getScene: (s: ISession) => SceneStateView }).getScene(session);
    }
}

describe("TransformNode.getScene", () => {
    it("falls back to a default view when session.sceneStateView is null", () => {
        const node = new TestableTransformNode();
        node.reset(emptySession());
        const view = node.readScene(emptySession());
        expect(view.gravity.z).toBeCloseTo(-9.81, 6);
        expect(view.temperature.getValue(Temperature.Units.k)).toBeCloseTo(293.15, 6);
    });

    it("returns the bound session view when one is set", () => {
        const item = new SceneItem();
        item.gravity = new Cartesian3(0, 0, -1.625);
        item.temperature = 250;
        const view = item.buildStateView(noopResolver());
        const node = new TestableTransformNode();
        const session = sessionWithScene(view);
        node.reset(session);
        const got = node.readScene(session);
        expect(got).toBe(view);
        expect(got.gravity.z).toBeCloseTo(-1.625, 6);
        expect(got.temperature.getValue(Temperature.Units.k)).toBe(250);
    });

    it("a live edit on the SceneItem propagates through the bound view", () => {
        const item = new SceneItem();
        const view = item.buildStateView(noopResolver());
        const node = new TestableTransformNode();
        const session = sessionWithScene(view);
        // Mutate before second read; view returns the new value.
        item.temperature = 400;
        const got = node.readScene(session);
        expect(got.temperature.getValue(Temperature.Units.k)).toBe(400);
    });
});

// ---------------------------------------------------------------------------
// Motors inherit only local + parent_world (no scene port any more)
// ---------------------------------------------------------------------------

describe("Motor inheritance: transform ports without scene", () => {
    it("DcMotorDynamicNode exposes local + parent_world, NOT scene", () => {
        const node = new DcMotorDynamicNode();
        const slots = node.inputPorts.map((p) => p.slot);
        expect(slots).toContain("local");
        expect(slots).toContain("parent_world");
        expect(slots).not.toContain("scene");
    });

    it("BldcMotorDynamicNode exposes local + parent_world, NOT scene", () => {
        const node = new BldcMotorDynamicNode();
        const slots = node.inputPorts.map((p) => p.slot);
        expect(slots).toContain("local");
        expect(slots).toContain("parent_world");
        expect(slots).not.toContain("scene");
    });
});

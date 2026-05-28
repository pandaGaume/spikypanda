/**
 * Unit tests for `Physics.Scene` and the TransformNode.getScene()
 * accessor exposed to subclasses.
 *
 * Test layout:
 *   1. IScene + isScene guard structural tests, DEFAULT_SCENE values.
 *   2. SceneNode emits an IScene with editable defaults / per-field
 *      overrides applied.
 *   3. TransformNode.getScene() returns DEFAULT_SCENE before/without a
 *      wired scene and the consumed scene when one is provided.
 *   4. The Scene input port is exposed at the right slot index on the
 *      TransformNode + on every motor (inheritance check).
 */
import type { IChannel, IOlink, ISession } from "spikypanda-core";
import { Cartesian3 } from "spikypanda-core";
import {
    SceneNode, DEFAULT_SCENE, isScene, TransformNode,
} from "../../dev/plugins/physics/src/index";
import type { IScene } from "../../dev/plugins/physics/src/index";
import { DcMotorDynamicNode } from "../../dev/plugins/physics/src/electric/motor-dc/index";
import { BldcMotorDynamicNode } from "../../dev/plugins/physics/src/electric/motor-bldc/index";

// ---------------------------------------------------------------------------
// Session mocks (reused from faultable.test pattern, slim copy here so the
// test file is self-contained).
// ---------------------------------------------------------------------------

interface ChannelSpec {
    slot:    string;
    value:   unknown;
    ready?:  boolean;
    enabled?: boolean;
}

function bindOpsc(node: { _opsc: IOlink[] }, channels: ChannelSpec[]): {
    session: ISession;
} {
    const links: IChannel[] = channels.map((c) => ({
        slot: c.slot,
        enabled: c.enabled !== false,
    } as unknown as IChannel));
    const linkStates = channels.map((c) => ({ ready: c.ready !== false }));
    node._opsc = links as unknown as IOlink[];
    const session: ISession = {
        graph: { links },
        linkStates,
        consume: (i: number) => {
            if (!linkStates[i].ready) return undefined;
            linkStates[i].ready = false;
            return channels[i].value;
        },
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
    return { session };
}

function bindOnsc(node: { _onsc: IOlink[] }, channels: { slot: string }[]): {
    session: ISession;
    published: { idx: number; value: unknown }[];
} {
    const links: IChannel[] = channels.map((c) => ({
        slot: c.slot, enabled: true,
    } as unknown as IChannel));
    node._onsc = links as unknown as IOlink[];
    const published: { idx: number; value: unknown }[] = [];
    const session: ISession = {
        graph: { links },
        linkStates: links.map(() => ({ ready: false })),
        consume: () => undefined,
        publish: (idx: number, value: unknown) => { published.push({ idx, value }); },
        peek: () => undefined,
    } as unknown as ISession;
    return { session, published };
}

function emptySession(): ISession {
    return {
        graph: { links: [] },
        linkStates: [],
        consume: () => undefined,
        publish: () => undefined,
        peek: () => undefined,
    } as unknown as ISession;
}

// ---------------------------------------------------------------------------
// IScene / DEFAULT_SCENE / isScene
// ---------------------------------------------------------------------------

describe("IScene + DEFAULT_SCENE + isScene", () => {
    it("DEFAULT_SCENE has Earth-surface values (Z-down convention)", () => {
        expect(DEFAULT_SCENE.gravity).toEqual({ x: 0, y: 0, z: -9.81 });
        expect(DEFAULT_SCENE.temperature).toBeCloseTo(293.15, 6);
        expect(DEFAULT_SCENE.pressure).toBe(101325);
        expect(DEFAULT_SCENE.timeScale).toBe(1);
    });

    it("DEFAULT_SCENE is frozen at every level", () => {
        expect(Object.isFrozen(DEFAULT_SCENE)).toBe(true);
        expect(Object.isFrozen(DEFAULT_SCENE.gravity)).toBe(true);
    });

    it("isScene accepts the default + duck-typed equivalents", () => {
        expect(isScene(DEFAULT_SCENE)).toBe(true);
        expect(isScene({
            gravity: { x: 0, y: 0, z: -3.72 },
            temperature: 210, pressure: 600, timeScale: 1,
        })).toBe(true);
        // Cartesian3 instance for gravity is structurally fine too.
        expect(isScene({
            gravity: new Cartesian3(0, 0, -9.81),
            temperature: 293, pressure: 101325, timeScale: 1,
        })).toBe(true);
    });

    it("isScene rejects malformed payloads", () => {
        expect(isScene(null)).toBe(false);
        expect(isScene(undefined)).toBe(false);
        expect(isScene({})).toBe(false);
        expect(isScene({ gravity: { x: 0, y: 0 } /* missing z */, temperature: 1, pressure: 1, timeScale: 1 })).toBe(false);
        expect(isScene({ gravity: { x: 0, y: 0, z: 0 }, temperature: "20", pressure: 1, timeScale: 1 })).toBe(false);
        expect(isScene(42)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// SceneNode emission
// ---------------------------------------------------------------------------

describe("SceneNode", () => {
    it("publishes DEFAULT_SCENE values when no inputs wired and no editables changed", () => {
        const node = new SceneNode();
        const { session, published } = bindOnsc(node as unknown as { _onsc: IOlink[] }, [
            { slot: "scene" },
        ]);
        node.fire(session, 0);
        expect(published).toHaveLength(1);
        const scene = published[0].value as IScene;
        expect(isScene(scene)).toBe(true);
        expect(scene.gravity).toEqual({ x: 0, y: 0, z: -9.81 });
        expect(scene.temperature).toBeCloseTo(293.15, 6);
        expect(scene.pressure).toBe(101325);
        expect(scene.timeScale).toBe(1);
    });

    it("editables override DEFAULT_SCENE in the published payload (Mars surface)", () => {
        const node = new SceneNode();
        node.gravity     = new Cartesian3(0, 0, -3.72);
        node.temperature = 210;
        node.pressure    = 600;
        node.timeScale   = 0.5;
        const { session, published } = bindOnsc(node as unknown as { _onsc: IOlink[] }, [
            { slot: "scene" },
        ]);
        node.fire(session, 0);
        const scene = published[0].value as IScene;
        expect(scene.gravity).toEqual({ x: 0, y: 0, z: -3.72 });
        expect(scene.temperature).toBe(210);
        expect(scene.pressure).toBe(600);
        expect(scene.timeScale).toBe(0.5);
    });

    it("per-field input wires override the corresponding editable", () => {
        const node = new SceneNode();
        // Start from defaults; override only pressure via input.
        bindOpsc(node as unknown as { _opsc: IOlink[] }, [
            { slot: "pressure", value: 50000 },
        ]);
        // Set onsc separately (bindOpsc clobbers _opsc only).
        const { session: pubSession, published } = bindOnsc(node as unknown as { _onsc: IOlink[] }, [
            { slot: "scene" },
        ]);
        // Splice the same opsc back since bindOnsc reset _opsc only if we re-called.
        // Cleanly: rebuild a combined session.
        const combinedLinks: IChannel[] = [
            { slot: "pressure", enabled: true } as unknown as IChannel,
            { slot: "scene",    enabled: true } as unknown as IChannel,
        ];
        (node as unknown as { _opsc: IOlink[] })._opsc = [combinedLinks[0]] as unknown as IOlink[];
        (node as unknown as { _onsc: IOlink[] })._onsc = [combinedLinks[1]] as unknown as IOlink[];
        const linkStates = [{ ready: true }, { ready: false }];
        const pub: { idx: number; value: unknown }[] = [];
        const session: ISession = {
            graph: { links: combinedLinks },
            linkStates,
            consume: (i: number) => i === 0 ? 50000 : undefined,
            publish: (idx: number, value: unknown) => { pub.push({ idx, value }); },
            peek: () => undefined,
        } as unknown as ISession;
        node.fire(session, 0);
        // pubSession + published unused; assert through pub.
        void pubSession; void published;
        expect(pub).toHaveLength(1);
        const scene = pub[0].value as IScene;
        expect(scene.pressure).toBe(50000);
        // Other fields stay at the editable defaults (i.e. DEFAULT_SCENE).
        expect(scene.gravity).toEqual({ x: 0, y: 0, z: -9.81 });
        expect(scene.temperature).toBeCloseTo(293.15, 6);
    });

    it("the published scene payload is frozen (can't be mutated by consumers)", () => {
        const node = new SceneNode();
        const { session, published } = bindOnsc(node as unknown as { _onsc: IOlink[] }, [
            { slot: "scene" },
        ]);
        node.fire(session, 0);
        const scene = published[0].value as IScene;
        expect(Object.isFrozen(scene)).toBe(true);
        expect(Object.isFrozen(scene.gravity)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// TransformNode.getScene + motor inheritance
// ---------------------------------------------------------------------------

class TestableTransformNode extends TransformNode {
    public readScene(): IScene {
        return (this as unknown as { getScene: () => IScene }).getScene();
    }
}

describe("TransformNode.getScene", () => {
    it("returns DEFAULT_SCENE when no scene was wired", () => {
        const node = new TestableTransformNode();
        node.reset(emptySession());
        expect(node.readScene()).toBe(DEFAULT_SCENE);
        node.fire(emptySession(), 0);
        expect(node.readScene()).toBe(DEFAULT_SCENE);
    });

    it("captures the wired scene token after fire()", () => {
        const node = new TestableTransformNode();
        const customScene: IScene = Object.freeze({
            gravity: Object.freeze({ x: 0, y: 0, z: -1.62 }), // Moon, Z-down
            temperature: 250, pressure: 0, timeScale: 1,
        });
        const { session } = bindOpsc(node as unknown as { _opsc: IOlink[] }, [
            { slot: "scene", value: customScene },
        ]);
        node.fire(session, 0);
        const s = node.readScene();
        expect(s.gravity.z).toBeCloseTo(-1.62, 6);
        expect(s.temperature).toBe(250);
        expect(s.pressure).toBe(0);
    });

    it("falls back to DEFAULT_SCENE on the next tick when the wire stops emitting", () => {
        const node = new TestableTransformNode();
        const moon: IScene = {
            gravity: { x: 0, y: 0, z: -1.62 },
            temperature: 250, pressure: 0, timeScale: 1,
        };
        const { session: s1 } = bindOpsc(node as unknown as { _opsc: IOlink[] }, [
            { slot: "scene", value: moon },
        ]);
        node.fire(s1, 0);
        expect(node.readScene().gravity.z).toBeCloseTo(-1.62, 6);
        // Tick 2: nothing wired.
        node.fire(emptySession(), 1e-3);
        expect(node.readScene()).toBe(DEFAULT_SCENE);
    });

    it("ignores tokens on the scene slot that aren't IScene-shaped", () => {
        const node = new TestableTransformNode();
        const { session } = bindOpsc(node as unknown as { _opsc: IOlink[] }, [
            { slot: "scene", value: { temperature: 1 } /* missing gravity etc. */ },
        ]);
        node.fire(session, 0);
        expect(node.readScene()).toBe(DEFAULT_SCENE);
    });
});

// ---------------------------------------------------------------------------
// Motors inherit the scene port
// ---------------------------------------------------------------------------

describe("Motor inheritance: scene port", () => {
    it("DcMotorDynamicNode exposes the scene input port", () => {
        const node = new DcMotorDynamicNode();
        const slots = node.inputPorts.map((p) => p.slot);
        expect(slots).toContain("scene");
        // Order: local, parent_world, scene, fault_0, then motor own slots.
        expect(slots.slice(0, 4)).toEqual(["local", "parent_world", "scene", "fault_0"]);
    });

    it("BldcMotorDynamicNode exposes the scene input port", () => {
        const node = new BldcMotorDynamicNode();
        const slots = node.inputPorts.map((p) => p.slot);
        expect(slots.slice(0, 4)).toEqual(["local", "parent_world", "scene", "fault_0"]);
    });
});

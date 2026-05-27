import { EditorFactory, EditorRegistry, IEditor } from "spikypanda-nodeeditor";

function makeStubFactory(label: string): EditorFactory {
    return (_host, _model, propertyName, options, editable) => {
        const editor: IEditor & {
            label: string;
            propertyName?: string;
            options?: unknown;
            editable?: boolean;
        } = {
            label,
            propertyName,
            options,
            editable,
            dispose: () => {},
        };
        return editor;
    };
}

describe("EditorRegistry", () => {
    test("fresh registry knows no kinds", () => {
        const r = new EditorRegistry();
        expect(r.kinds()).toEqual([]);
        expect(r.has("vector3")).toBe(false);
        expect(r.getFactory("vector3")).toBeUndefined();
    });

    test("register exposes a kind via has() and getFactory()", () => {
        const r = new EditorRegistry();
        const f = makeStubFactory("vec3");
        r.register("vector3", f);

        expect(r.has("vector3")).toBe(true);
        expect(r.getFactory("vector3")).toBe(f);
        expect(r.kinds()).toEqual(["vector3"]);
    });

    test("registering the same kind twice replaces the factory (last wins)", () => {
        const r = new EditorRegistry();
        const first  = makeStubFactory("first");
        const second = makeStubFactory("second");

        r.register("vector3", first);
        r.register("vector3", second);

        expect(r.getFactory("vector3")).toBe(second);
        expect(r.kinds()).toEqual(["vector3"]);
    });

    test("unregister removes a kind and returns true on hit, false on miss", () => {
        const r = new EditorRegistry();
        r.register("vector3", makeStubFactory("v"));

        expect(r.unregister("vector3")).toBe(true);
        expect(r.has("vector3")).toBe(false);
        expect(r.unregister("vector3")).toBe(false);
    });

    test("kinds() reflects all registered entries", () => {
        const r = new EditorRegistry();
        r.register("vector3",    makeStubFactory("v3"));
        r.register("quaternion", makeStubFactory("q"));
        r.register("color",      makeStubFactory("c"));

        expect(r.kinds().slice().sort()).toEqual(["color", "quaternion", "vector3"]);
    });

    test("factory invocation receives host, model, propertyName, options, editable verbatim", () => {
        const r = new EditorRegistry();
        const captured: Array<unknown> = [];
        r.register("custom", (host, model, propertyName, options, editable) => {
            captured.push({ host, model, propertyName, options, editable });
            return { dispose: () => {} };
        });

        const fakeHost = { tagName: "div" } as unknown as HTMLElement;
        const model = { foo: 1 };
        const opts  = { min: 0, max: 1 };
        const factory = r.getFactory("custom");
        if (!factory) throw new Error("factory missing");
        const editor = factory(fakeHost, model, "speed", opts, true);

        expect(captured).toEqual([{ host: fakeHost, model, propertyName: "speed", options: opts, editable: true }]);
        expect(typeof editor.dispose).toBe("function");
        editor.dispose();
    });

    test("viewable field invocation: editable param is false", () => {
        const r = new EditorRegistry();
        let seen: { editable?: boolean } | null = null;
        r.register("matrix4", (_host, _model, _propertyName, _options, editable) => {
            seen = { editable };
            return { dispose: () => {} };
        });

        const factory = r.getFactory("matrix4");
        if (!factory) throw new Error("factory missing");
        factory({} as HTMLElement, {}, "matrix", undefined, false);

        expect(seen).toEqual({ editable: false });
    });

    test("class-level factory invocation: propertyName, options, editable are undefined", () => {
        const r = new EditorRegistry();
        let seen: { propertyName?: string; options?: unknown; editable?: boolean } | null = null;
        r.register("transform-3d", (_host, _model, propertyName, options, editable) => {
            seen = { propertyName, options, editable };
            return { dispose: () => {} };
        });

        const factory = r.getFactory("transform-3d");
        if (!factory) throw new Error("factory missing");
        factory({} as HTMLElement, {});

        expect(seen).toEqual({ propertyName: undefined, options: undefined, editable: undefined });
    });
});

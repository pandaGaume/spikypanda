import type { IFieldOptions } from "spikypanda-core";
import { editable, editor, getEditorSchema, viewable } from "spikypanda-core";

describe("editor schema decorators", () => {
    test("ad-hoc object with no decorators yields empty schema", () => {
        const adhoc = { foo: 1, bar: "x" };
        const schema = getEditorSchema(adhoc);
        expect(schema.classEditors).toEqual([]);
        expect(schema.fields).toEqual([]);
    });

    test("@editor on class only", () => {
        @editor("transform-3d")
        class Transform {}

        const schema = getEditorSchema(new Transform());
        expect(schema.classEditors).toEqual(["transform-3d"]);
        expect(schema.fields).toEqual([]);
    });

    test("multiple @editor decorators stack in source order", () => {
        // Decorator evaluation order in TS is bottom-up, so the
        // higher-listed decorator runs LAST and ends up at the tail.
        // Tests document that order rather than fight it.
        @editor("transform-3d")
        @editor("transform-table")
        class Transform {}

        const schema = getEditorSchema(new Transform());
        expect(schema.classEditors).toEqual(["transform-table", "transform-3d"]);
    });

    test("duplicate @editor kinds on the same class are deduplicated", () => {
        @editor("foo")
        @editor("foo")
        class Same {}

        expect(getEditorSchema(new Same()).classEditors).toEqual(["foo"]);
    });

    test("@editable accumulates fields in declaration order", () => {
        class Material {
            @editable("color")
            public color: string = "#ffffff";

            @editable("number", { min: 0, max: 1 })
            public roughness: number = 0.5;
        }

        const schema = getEditorSchema(new Material());
        expect(schema.classEditors).toEqual([]);
        expect(schema.fields).toEqual([
            { propertyName: "color",     kind: "color",  editable: true, options: undefined },
            { propertyName: "roughness", kind: "number", editable: true, options: { min: 0, max: 1 } },
        ]);
    });

    test("@viewable marks fields as read-only", () => {
        class Computed {
            @viewable("matrix4")
            public matrix: number[] = [];
        }

        const schema = getEditorSchema(new Computed());
        expect(schema.fields).toEqual([
            { propertyName: "matrix", kind: "matrix4", editable: false, options: undefined },
        ]);
    });

    test("@editor + @editable + @viewable mix on a single class", () => {
        @editor("transform-3d")
        class Transform {
            @editable("vector3")
            public position: [number, number, number] = [0, 0, 0];

            @editable("quaternion")
            public rotation: [number, number, number, number] = [0, 0, 0, 1];

            @viewable("matrix4")
            public matrix: number[] = [];
        }

        const schema = getEditorSchema(new Transform());
        expect(schema.classEditors).toEqual(["transform-3d"]);
        expect(schema.fields).toHaveLength(3);
        expect(schema.fields.map((f) => f.propertyName)).toEqual(["position", "rotation", "matrix"]);
        expect(schema.fields.find((f) => f.propertyName === "matrix")?.editable).toBe(false);
        expect(schema.fields.find((f) => f.propertyName === "position")?.editable).toBe(true);
    });

    test("subclass inherits parent fields and appends its own", () => {
        class Base {
            @editable("string")
            public name: string = "";
        }

        class Child extends Base {
            @editable("number")
            public count: number = 0;
        }

        const schema = getEditorSchema(new Child());
        expect(schema.fields.map((f) => f.propertyName)).toEqual(["name", "count"]);
    });

    test("subclass union with parent class editors", () => {
        @editor("base-view")
        class Base {}

        @editor("child-view")
        class Child extends Base {}

        expect(getEditorSchema(new Base()).classEditors).toEqual(["base-view"]);
        expect(getEditorSchema(new Child()).classEditors).toEqual(["base-view", "child-view"]);
    });

    test("subclass without its own @editor inherits parent's list", () => {
        @editor("base-view")
        class Base {}

        class Child extends Base {}

        expect(getEditorSchema(new Child()).classEditors).toEqual(["base-view"]);
    });

    test("subclass re-declaring the parent's editor is deduplicated", () => {
        @editor("shared")
        class Base {}

        @editor("shared")
        class Child extends Base {}

        expect(getEditorSchema(new Child()).classEditors).toEqual(["shared"]);
    });

    test("options payload is preserved verbatim", () => {
        // Same object identity out as in: core stores the payload and does
        // not normalise, copy or validate it. The editors and the
        // description layer both read the one instance the node declared.
        const opts: IFieldOptions = { unit: { quantity: "Angle", unit: "r" }, step: 3, title: "Yaw" };

        class Sensor {
            @editable("number", opts)
            public yaw: number = 0;
        }

        const field = getEditorSchema(new Sensor()).fields[0];
        expect(field.options).toBe(opts);
    });

    test("getEditorSchema does not leak metadata across unrelated classes", () => {
        class A {
            @editable("string")
            public a: string = "";
        }

        class B {
            @editable("number")
            public b: number = 0;
        }

        expect(getEditorSchema(new A()).fields.map((f) => f.propertyName)).toEqual(["a"]);
        expect(getEditorSchema(new B()).fields.map((f) => f.propertyName)).toEqual(["b"]);
    });
});

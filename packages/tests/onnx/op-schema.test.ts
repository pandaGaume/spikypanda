/**
 * Phase 6 — decorator-driven ONNX op-schema registry.
 *
 * Validates that:
 *   1. The schemas defined in op-schemas.defs.ts are populated by
 *      the `@onnxOp` decorator and accessible via getOnnxOpSchema.
 *   2. makeNode classifies attributes correctly via the schema (Gemm
 *      `alpha = 1.0` lands in FLOAT, `transA = 0` in INT).
 *   3. An op without a schema yields an informative error.
 *   4. An attribute name not declared in the schema yields an
 *      informative error.
 */
import { ITensor, Kernel } from "spikypanda-core";
import {
    DefaultOnnxExportContext,
    getOnnxOpSchema,
    getRegisteredOnnxOps,
} from "spikypanda-onnx";
// Trigger the schema decorator side-effects (the namespace import is
// only there for the registration; otherwise the file might not load
// transitively).
import "spikypanda-onnx";

describe("ONNX op schema registry", () => {
    test("getOnnxOpSchema('Gemm') returns the expected attr kinds", () => {
        const s = getOnnxOpSchema("Gemm");
        expect(s).toBeDefined();
        const byName = new Map(s!.attrs.map((a) => [a.name, a.kind]));
        expect(byName.get("alpha")).toBe("float");
        expect(byName.get("beta")).toBe("float");
        expect(byName.get("transA")).toBe("int");
        expect(byName.get("transB")).toBe("int");
    });

    test("getOnnxOpSchema('Conv') has the ints list attributes", () => {
        const s = getOnnxOpSchema("Conv");
        expect(s).toBeDefined();
        const byName = new Map(s!.attrs.map((a) => [a.name, a.kind]));
        expect(byName.get("kernel_shape")).toBe("ints");
        expect(byName.get("strides")).toBe("ints");
        expect(byName.get("pads")).toBe("ints");
    });

    test("getOnnxOpSchema('Relu') returns an attr-less schema", () => {
        const s = getOnnxOpSchema("Relu");
        expect(s).toBeDefined();
        expect(s!.attrs).toHaveLength(0);
    });

    test("the registry contains a sane subset of ops", () => {
        const ops = getRegisteredOnnxOps();
        for (const expected of ["Add", "Conv", "Gemm", "Relu", "ReduceMean", "Concat", "Transpose", "GlobalAveragePool", "Flatten"]) {
            expect(ops).toContain(expected);
        }
    });

    test("makeNode classifies Gemm alpha as FLOAT via schema", () => {
        const ctx = new DefaultOnnxExportContext();
        ctx.makeNode({
            opType: "Gemm",
            inputs: ["a", "b", "c"],
            outputs: ["y"],
            attrs: { alpha: 1.0, beta: 1.0, transA: 0, transB: 1 },
        });
        const node = ctx.nodes[0];
        expect(node.attributes.get("alpha")).toBe(1.0);
        expect(node.attributes.get("beta")).toBe(1.0);
        expect(node.attributes.get("transA")).toBe(0);
        expect(node.attributes.get("transB")).toBe(1);
        // Float-typed names are marked so the writer emits AttributeProto.FLOAT.
        expect(node.floatAttributeNames?.has("alpha")).toBe(true);
        expect(node.floatAttributeNames?.has("beta")).toBe(true);
        expect(node.floatAttributeNames?.has("transA") ?? false).toBe(false);
        expect(node.floatAttributeNames?.has("transB") ?? false).toBe(false);
    });

    test("makeNode classifies Conv kernel_shape as INTS via schema", () => {
        const ctx = new DefaultOnnxExportContext();
        ctx.makeNode({
            opType: "Conv",
            inputs: ["x", "w", "b"],
            outputs: ["y"],
            attrs: { kernel_shape: [1, 3], strides: [1, 1], pads: [0, 0, 0, 0] },
        });
        const node = ctx.nodes[0];
        expect(node.listAttributes?.get("kernel_shape")).toEqual([1, 3]);
        expect(node.listAttributes?.get("strides")).toEqual([1, 1]);
        expect(node.listAttributes?.get("pads")).toEqual([0, 0, 0, 0]);
        // Legacy scalar fallback gets the first value.
        expect(node.attributes.get("kernel_shape")).toBe(1);
        // Conv's list attributes are INTS, not FLOATS.
        expect(node.floatListAttributeNames?.has("kernel_shape") ?? false).toBe(false);
    });

    test("makeNode throws when the op has no schema and `attrs` is set", () => {
        class UnknownOpKernel extends Kernel {
            public readonly nodeType = "test_unknown_op";
            public readonly outputShapes: number[][] = [[1]];
            public execute(_in: ITensor[]): ITensor[] { return []; }
        }
        void UnknownOpKernel;  // touch
        const ctx = new DefaultOnnxExportContext();
        expect(() =>
            ctx.makeNode({
                opType: "ThisOpDoesNotExist",
                inputs: ["x"],
                outputs: ["y"],
                attrs: { foo: 1 },
            })
        ).toThrow(/no registered schema/);
    });

    test("makeNode throws when an attribute is not in the op's schema", () => {
        const ctx = new DefaultOnnxExportContext();
        expect(() =>
            ctx.makeNode({
                opType: "Gemm",
                inputs: ["a", "b", "c"],
                outputs: ["y"],
                attrs: { alpha: 1.0, bogus_attr: 42 },
            })
        ).toThrow(/attribute "bogus_attr" not declared/);
    });

    test("legacy floatAttrs bucket still works (escape hatch)", () => {
        const ctx = new DefaultOnnxExportContext();
        ctx.makeNode({
            opType: "Gemm",
            inputs: ["a", "b", "c"],
            outputs: ["y"],
            floatAttrs: { alpha: 1.0, beta: 1.0 },
            intAttrs: { transA: 0, transB: 1 },
        });
        const node = ctx.nodes[0];
        expect(node.floatAttributeNames?.has("alpha")).toBe(true);
        expect(node.floatAttributeNames?.has("transA") ?? false).toBe(false);
    });
});

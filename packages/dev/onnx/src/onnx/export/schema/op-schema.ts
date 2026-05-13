// ═══════════════════════════════════════════════════════════════════════════
// ONNX op-schema registry, populated declaratively via class decorators.
//
//   @onnxOp("Gemm")
//   class Gemm {
//       @attr.float alpha!: number;
//       @attr.float beta!: number;
//       @attr.int   transA!: number;
//       @attr.int   transB!: number;
//   }
//
// The `@attr.<kind>` property decorators stash a list of (name, kind)
// metadata on the class prototype; the `@onnxOp(opType)` class
// decorator reads that list and registers an OnnxOpSchema under
// `opType`. Subsequently, `getOnnxOpSchema(opType)` returns the
// schema so the export framework can classify attribute payloads as
// INT / FLOAT / INTS / FLOATS without manual `intAttrs/floatAttrs`
// bucketing at every call site.
//
// The classes themselves are never instantiated; they exist only as
// metadata carriers. Module load (i.e. importing the .defs file) is
// enough for the decorators to fire and populate the registry.
// ═══════════════════════════════════════════════════════════════════════════

import "reflect-metadata";

// ─── Public types ────────────────────────────────────────────────────────

export type OnnxAttrKind = "int" | "float" | "ints" | "floats" | "tensor";

export interface OnnxAttrDef {
    readonly name: string;
    readonly kind: OnnxAttrKind;
}

export interface OnnxOpSchema {
    readonly opType: string;
    readonly domain?: string;
    readonly attrs: ReadonlyArray<OnnxAttrDef>;
}

// ─── Private storage ─────────────────────────────────────────────────────

const _attrMetaKey = Symbol("spikypanda-onnx-op-attrs");
const _schemas = new Map<string, OnnxOpSchema>();

// ─── Decorators ──────────────────────────────────────────────────────────

/**
 * Class decorator: declares the decorated class as the schema for the
 * ONNX op of the given `opType`. The class's `@attr.*` decorated
 * properties are gathered into an OnnxOpSchema and stored under
 * `opType` in the module-level registry.
 */
export function onnxOp(opType: string, opts?: { domain?: string }): ClassDecorator {
    return ((target: Function): void => {
        const attrs: OnnxAttrDef[] =
            Reflect.getMetadata(_attrMetaKey, target.prototype) ?? [];
        _schemas.set(opType, {
            opType,
            domain: opts?.domain,
            attrs: Object.freeze(attrs.slice()),
        });
    }) as ClassDecorator;
}

function _attrDecorator(kind: OnnxAttrKind): PropertyDecorator {
    return (target: object, propertyKey: string | symbol): void => {
        const list: OnnxAttrDef[] =
            Reflect.getMetadata(_attrMetaKey, target) ?? [];
        list.push({ name: String(propertyKey), kind });
        Reflect.defineMetadata(_attrMetaKey, list, target);
    };
}

/**
 * Property decorators for ONNX attribute kinds. Use as
 * `@attr.int`, `@attr.float`, `@attr.ints`, `@attr.floats`, etc.
 * The decorator records the kind on the class prototype; `@onnxOp`
 * later collects the records into the op's schema.
 */
export const attr = {
    int: _attrDecorator("int"),
    float: _attrDecorator("float"),
    ints: _attrDecorator("ints"),
    floats: _attrDecorator("floats"),
    tensor: _attrDecorator("tensor"),
} as const;

// ─── Lookup ──────────────────────────────────────────────────────────────

/**
 * Get the schema for an op by name, or undefined when not registered.
 * Use this in writers / serializers to classify attribute payloads.
 */
export function getOnnxOpSchema(opType: string): OnnxOpSchema | undefined {
    return _schemas.get(opType);
}

/** Sorted list of registered op names (for diagnostics). */
export function getRegisteredOnnxOps(): string[] {
    return [..._schemas.keys()].sort();
}

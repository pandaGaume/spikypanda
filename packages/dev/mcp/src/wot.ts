/**
 * W3C Web of Things descriptions, built from what a node already declares.
 *
 * The alternative was a proprietary description format, and a standard was
 * chosen instead for a plain reason: the declarations are already shaped like
 * a Thing Description. `@editable` gives a writable property affordance,
 * `@viewable` gives `readOnly`, the options payload gives `unit`, `enum`,
 * `minimum` and `maximum`, and `INodeMeta` gives the identity and the ports.
 * Nothing here invents metadata; it renames what exists into a vocabulary
 * other tools can read.
 *
 * ---------------------------------------------------------------------------
 * TD OR THING MODEL
 * ---------------------------------------------------------------------------
 *
 * The two are emitted for two different questions and are not
 * interchangeable.
 *
 * A node *instance* in a live graph is a Thing: it exists, it is addressable,
 * and it gets a Thing Description with `id`, `security` and forms carrying an
 * `href`. TD 1.1 requires `forms` to be present and non-empty in an
 * affordance, which is a way of saying that a TD describes something a client
 * can actually reach.
 *
 * A node *type* in the catalogue is not a Thing. It has no instance, no
 * address and nothing to point a form at. Emitting a TD for it would mean
 * inventing an href, so what it gets is a Thing Model, the construct TD 1.1
 * provides for exactly this: a class-level description, marked
 * `"@type": "tm:ThingModel"`, with no forms and no security.
 *
 * ---------------------------------------------------------------------------
 * CONFORMANCE POINTS THAT BITE
 * ---------------------------------------------------------------------------
 *
 *   - `@context` is "https://www.w3.org/2022/wot/td/v1.1" for 1.1.
 *   - `title` and `security` are mandatory in a TD. A graph running in the
 *     browser has no authentication, which is still a security configuration
 *     and is spelled `nosec`, not omitted.
 *   - `forms` cannot be an empty array. Absent is invalid, `[]` is invalid.
 *   - `unit` in a DataSchema is a string, and UCUM is what the specification
 *     recommends putting in it, which is why the canonical code goes there
 *     verbatim rather than the display symbol.
 */
import { getEditorSchema, resolveQuantityKind, resolveUnit, projectUnit, type IFieldOptions, type IQudtProjection } from "spikypanda-core";
import type { NodeTypeState } from "./state.js";

/** TD 1.1 context IRI. */
export const TD_CONTEXT = "https://www.w3.org/2022/wot/td/v1.1";

/** Prefixes for the semantic annotations carried alongside the plain `unit`. */
const SEMANTIC_CONTEXT = {
    qudt: "http://qudt.org/schema/qudt/",
    unit: "http://qudt.org/vocab/unit/",
    quantitykind: "http://qudt.org/vocab/quantitykind/",
};

/** A WoT DataSchema, restricted to what a node property can express. */
export interface WotDataSchema {
    readonly type?: string;
    readonly title?: string;
    readonly description?: string;
    readonly readOnly?: boolean;
    readonly unit?: string;
    readonly enum?: ReadonlyArray<string | number>;
    readonly oneOf?: ReadonlyArray<{ readonly const: string | number; readonly title: string }>;
    readonly minimum?: number;
    readonly maximum?: number;
    readonly multipleOf?: number;
    readonly properties?: { readonly [name: string]: WotDataSchema };
    readonly "qudt:unit"?: string;
    readonly "qudt:quantityKind"?: string;
    readonly forms?: ReadonlyArray<{ readonly href: string; readonly op?: ReadonlyArray<string> }>;
}

/** A Thing Description, or a Thing Model when `security` and forms are absent. */
export interface WotThing {
    readonly "@context": ReadonlyArray<string | Record<string, string>>;
    readonly "@type"?: string;
    readonly id?: string;
    readonly title: string;
    readonly description?: string;
    readonly securityDefinitions?: { readonly [name: string]: { readonly scheme: string } };
    readonly security?: string;
    readonly properties: { readonly [name: string]: WotDataSchema };
    readonly links?: ReadonlyArray<{ readonly rel: string; readonly href: string; readonly type?: string }>;
}

/**
 * Editor kind to JSON Schema type.
 *
 * The structured kinds become an object with a named field per axis rather
 * than a bare "object": a client that receives `{ type: "object" }` and no
 * properties has been told nothing.
 */
const AXES: { readonly [kind: string]: ReadonlyArray<string> } = {
    vector3: ["x", "y", "z"],
    vector4: ["x", "y", "z", "w"],
    quaternion: ["x", "y", "z", "w"],
};

function scalarType(kind: string): string | undefined {
    switch (kind) {
        case "number":
        case "int":
        case "float":
        case "slider":
            return "number";
        case "string":
            return "string";
        case "boolean":
            return "boolean";
        default:
            return undefined;
    }
}

/**
 * One property affordance, from one declared field.
 *
 * `href` is optional so the same builder serves a Thing Model, where there is
 * nothing to point at, and a Thing Description, where a form is mandatory.
 */
function dataSchema(kind: string, editable: boolean, options: IFieldOptions | undefined, value: unknown, href?: string): WotDataSchema {
    const opts = options ?? {};
    const schema: Record<string, unknown> = {};

    const axes = AXES[kind];
    if (axes) {
        schema.type = "object";
        schema.properties = Object.fromEntries(axes.map((a) => [a, { type: "number" }]));
    } else {
        const t = scalarType(kind);
        // An enumeration of numbers is a number even when its editor kind is
        // not one of the scalar kinds.
        if (t) schema.type = t;
        else if (opts.enum) schema.type = typeof opts.enum[0] === "number" ? "number" : "string";
        else if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") schema.type = typeof value;
    }

    if (opts.title) schema.title = opts.title;
    if (opts.description) schema.description = opts.description;
    // Emitted only when true: `readOnly` defaults to false in TD 1.1, so
    // stating it on every writable property is noise.
    if (!editable) schema.readOnly = true;
    if (typeof opts.min === "number") schema.minimum = opts.min;
    if (typeof opts.max === "number") schema.maximum = opts.max;
    if (typeof opts.step === "number") schema.multipleOf = opts.step;

    if (opts.enum && opts.enum.length > 0) {
        // `oneOf` with a const and a title is how a coded enumeration keeps
        // its labels; a bare `enum` of integers would ship 0, 1, 2 and no way
        // to know that they mean hann, hamming and blackman.
        if (opts.enumTitles && opts.enumTitles.length === opts.enum.length) {
            schema.oneOf = opts.enum.map((v, i) => ({ const: v, title: opts.enumTitles![i] }));
        } else {
            schema.enum = [...opts.enum];
        }
    }

    if (opts.unit) {
        const unit = resolveUnit(opts.unit);
        if (unit?.ucum) schema.unit = unit.ucum;
        const qudt = projectUnit<IQudtProjection>(opts.unit, "qudt");
        if (qudt) {
            schema["qudt:unit"] = qudt.unit;
            if (qudt.quantityKind) schema["qudt:quantityKind"] = qudt.quantityKind;
        } else {
            // No verified QUDT equivalent. The plain `unit` still carries the
            // UCUM code, and the semantic annotation is absent rather than
            // approximated.
            const kindName = resolveQuantityKind(opts.unit.quantity);
            if (kindName) schema.description = schema.description ?? `Quantity kind: ${kindName}`;
        }
    }

    if (href) schema.forms = [{ href, op: editable ? ["readproperty", "writeproperty"] : ["readproperty"] }];
    return schema as WotDataSchema;
}

/** Every declared field of a model object, as property affordances. */
function affordances(data: object, hrefFor?: (key: string) => string): { [name: string]: WotDataSchema } {
    const out: { [name: string]: WotDataSchema } = {};
    for (const field of getEditorSchema(data).fields) {
        const value = (data as Record<string, unknown>)[field.propertyName];
        out[field.propertyName] = dataSchema(field.kind, field.editable, field.options, value, hrefFor?.(field.propertyName));
    }
    return out;
}

/**
 * Thing Description of one live node instance.
 *
 * `security` is `nosec`: the graph runs in the page that published it, and
 * saying so explicitly is required, where omitting it would be invalid.
 */
export function thingDescription(id: string, title: string, data: object, uri: string): WotThing {
    return {
        "@context": [TD_CONTEXT, SEMANTIC_CONTEXT],
        id: uri,
        title,
        description: `Node "${id}" of the running graph.`,
        securityDefinitions: { nosec_sc: { scheme: "nosec" } },
        security: "nosec_sc",
        properties: affordances(data, (key) => `${uri}/property/${key}`),
    };
}

/**
 * Thing Model of one catalogue entry.
 *
 * No `id`, no `security`, no forms: a type is not reachable, and a Thing
 * Model is the construct that says so rather than a TD with invented
 * addresses. The ports travel as links, which is where a relation to
 * something that is not a property belongs.
 */
export function thingModel(meta: NodeTypeState, instance: object | null): WotThing {
    // Ports are addressed by slot, the editor's visible name being a label
    // rather than an identifier.
    const links = [
        ...meta.inputPorts.map((p) => ({ rel: "spk:input", href: `spk://port/${p.slot}`, type: p.type ?? undefined })),
        ...meta.outputPorts.map((p) => ({ rel: "spk:output", href: `spk://port/${p.slot}`, type: p.type ?? undefined })),
    ];
    if (meta.doc) links.push({ rel: "describedby", href: meta.doc, type: "text/markdown" });

    return {
        "@context": [TD_CONTEXT, SEMANTIC_CONTEXT],
        "@type": "tm:ThingModel",
        title: meta.label,
        description: meta.category ? `Catalogue type "${meta.type}", category "${meta.category}".` : `Catalogue type "${meta.type}".`,
        properties: instance ? affordances(instance) : {},
        links,
    };
}

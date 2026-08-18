import { ApplyTo, Channel, GraphOLink } from "spikypanda-core";
import type { IChannel, ILinkRegistry, INode, IOlink } from "spikypanda-core";
import type { ConnectionLinkModel, LinkKind } from "./connection";

export const GENERIC_CHANNEL_LINK_TYPE = "Core.Execution:channel";
export const GENERIC_RELATION_LINK_TYPE = "Core.Graph:relation";
export const APPLY_TO_LINK_TYPE = "Core.Graph:apply-to";

type RestorableLink = IOlink & {
    deserialize?(blob: unknown): void;
};

/**
 * Build the unwired model held by an editor Connection.
 *
 * A registry-created instance keeps every concrete `@cloneable` property
 * available to the property panel. The instance remains unwired until a
 * session build clones it, so stopping Play cannot detach editor state.
 */
export function createConnectionLinkModel(
    registry: ILinkRegistry | null,
    sourcePortType: string,
    targetPortType: string,
    sourceSlot: string | number,
    targetSlot: string | number,
    kind: LinkKind,
    persisted?: Partial<ConnectionLinkModel>
): ConnectionLinkModel {
    const resolvedType = persisted?.typeId ?? registry?.resolve(sourcePortType, targetPortType) ?? defaultLinkType(kind);
    let link = registry?.create(resolvedType) ?? createBuiltInLink(resolvedType);

    // Preserve an unresolved custom definition verbatim. It stays visible and
    // can be rebound on a later load once the owning plugin is available.
    if (!link && persisted?.typeId) {
        return { typeId: persisted.typeId, data: persisted.data ?? {} };
    }

    link ??= createBuiltInLink(defaultLinkType(kind)) ?? new GraphOLink();
    if (persisted?.data !== undefined) {
        (link as RestorableLink).deserialize?.(persisted.data);
    }
    prepareUnwiredDefinition(link, sourceSlot, targetSlot, kind, sourcePortType);
    return { typeId: resolvedType, data: link };
}

/** Create a fresh runtime link from a Connection's unwired model. */
export function materializeConnectionLink(
    model: Partial<ConnectionLinkModel> | undefined,
    kind: LinkKind,
    from: INode,
    to: INode,
    sourceSlot: string | number,
    targetSlot: string | number
): IOlink | null {
    const candidate = model?.data as Partial<RestorableLink> | undefined;
    let link: IOlink | undefined;
    if (candidate && typeof candidate.clone === "function") {
        link = candidate.clone();
    }
    link ??= createBuiltInLink(model?.typeId ?? defaultLinkType(kind));
    link ??= createBuiltInLink(defaultLinkType(kind));
    if (!link) return null;

    // Slots must be assigned before endpoints. RuntimeNode routing caches are
    // populated by the endpoint setters and read the slot during attachment.
    if (kind === "data") {
        if (!isChannel(link)) return null;
        link.slot = sourceSlot;
        link.toSlot = targetSlot;
    }
    link.oini = null;
    link.ofin = null;
    link.oini = from;
    link.ofin = to;
    return link;
}

export function isRuntimeChannel(link: IOlink): link is IChannel {
    return isChannel(link);
}

function defaultLinkType(kind: LinkKind): string {
    if (kind === "structural") return APPLY_TO_LINK_TYPE;
    if (kind === "config") return GENERIC_RELATION_LINK_TYPE;
    return GENERIC_CHANNEL_LINK_TYPE;
}

function createBuiltInLink(typeId: string): IOlink | undefined {
    if (typeId === GENERIC_CHANNEL_LINK_TYPE) return new Channel();
    if (typeId === APPLY_TO_LINK_TYPE) return new ApplyTo();
    if (typeId === GENERIC_RELATION_LINK_TYPE) return new GraphOLink();
    return undefined;
}

function prepareUnwiredDefinition(link: IOlink, sourceSlot: string | number, targetSlot: string | number, kind: LinkKind, sourcePortType: string): void {
    link.oini = null;
    link.ofin = null;
    if (kind === "data" && isChannel(link)) {
        link.slot = sourceSlot;
        link.toSlot = targetSlot;
    }
    if (kind === "config" && link.type === undefined) {
        link.type = sourcePortType;
    }
}

function isChannel(link: IOlink): link is IChannel & { slot: string | number; toSlot?: string | number } {
    const candidate = link as Partial<IChannel>;
    return "slot" in candidate && "delayed" in candidate && "enabled" in candidate;
}

import { CloneMetadataKey, IGraphItem, IsCloneable } from "./graph.interfaces";

export class GraphItem implements IGraphItem {
    public dispose(): void {
        // Dispose logic if needed
    }

    public clone(): this {
        const ctor = this.constructor as new () => this;
        const clone = new ctor();
        const props = Reflect.getMetadata(CloneMetadataKey, this) || [];

        for (const key of props) {
            const value = (this as any)[key];
            (clone as any)[key] = IsCloneable(value) ? value.clone() : structuredClone(value);
        }

        return clone;
    }
}

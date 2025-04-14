import { CloneMetadataKey, IGraphItem, IsCloneable, ITaggable } from "./graph.interfaces";

export class GraphItem implements IGraphItem {
    private _tag?: string;

    public get tag(): string | undefined {
        return this._tag;
    }

    public withTag(tag: string): ITaggable {
        this._tag = tag;
        return this;
    }

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

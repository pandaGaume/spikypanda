import { PropertyChangedEventArgs } from "../events/events.args";
import { Observable } from "../events/events.observable";
import { CloneMetadataKey, IGraphItem, IsCloneable, ITaggable } from "./graph.interfaces";

export class GraphItem<B = unknown> implements IGraphItem<B> {
    private _id?: any;
    private _tag?: string;
    private _bag?: B;
    private _onPropertyChanged?: Observable<PropertyChangedEventArgs<unknown, unknown>>;

    public get onPropertyChanged(): Observable<PropertyChangedEventArgs<unknown, unknown>> {
        if (!this._onPropertyChanged) {
            this._onPropertyChanged = new Observable<PropertyChangedEventArgs<unknown, unknown>>();
        }
        return this._onPropertyChanged;
    }

    public get tag(): string | undefined {
        return this._tag;
    }

    public get id(): any | undefined {
        return this._id;
    }

    public set id(v: any) {
        const old = this._id;
        this._id = v;
        this.notifyPropertyChanged("id", old, v);
    }

    public get bag(): B | undefined {
        return this._bag;
    }

    public set bag(v: B | undefined) {
        const old = this._bag;
        this._bag = v;
        this.notifyPropertyChanged("bag", old, v);
    }

    public withTag(tag: string): ITaggable {
        const old = this._tag;
        this._tag = tag;
        this.notifyPropertyChanged("tag", old, tag);
        return this;
    }

    public dispose(): void {
        this._onPropertyChanged?.clear();
        this._onPropertyChanged = undefined;
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

    protected notifyPropertyChanged<T>(propertyName: string, oldValue: T, newValue: T): void {
        if (oldValue === newValue) {
            return;
        }
        const obs = this._onPropertyChanged;
        if (!obs || !obs.hasObservers()) {
            return;
        }
        obs.notifyObservers(new PropertyChangedEventArgs<unknown, unknown>(this, oldValue, newValue, propertyName));
    }
}

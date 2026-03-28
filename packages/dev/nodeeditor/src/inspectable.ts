export interface PropertyEntry {
    key: string;
    value: unknown;
}

export interface Inspectable {
    getDisplayName(): string;
    getProperties(): PropertyEntry[];
    render?: (container: HTMLElement) => void;
}

export function isInspectable(obj: unknown): obj is Inspectable {
    if (obj == null || typeof obj !== "object") return false;
    const candidate = obj as Record<string, unknown>;
    return (
        typeof candidate["getDisplayName"] === "function" &&
        typeof candidate["getProperties"] === "function"
    );
}

export class UIItemBase<T> {
    data: T;

    constructor(data: T) {
        this.data = data;
    }

    isInspectable(): this is UIItemBase<Inspectable> {
        return isInspectable(this.data);
    }

    getDisplayName(): string {
        if (this.isInspectable()) {
            return this.data.getDisplayName();
        }
        if (this.data != null && typeof this.data === "object") {
            const obj = this.data as Record<string, unknown>;
            if (typeof obj["label"] === "string") return obj["label"];
            if (typeof obj["name"] === "string") return obj["name"];
            const ctor = (this.data as object).constructor;
            if (ctor && ctor.name !== "Object") return ctor.name;
        }
        return typeof this.data;
    }

    getProperties(): PropertyEntry[] {
        if (this.isInspectable()) {
            return this.data.getProperties();
        }
        if (this.data != null && typeof this.data === "object") {
            return Object.entries(this.data as Record<string, unknown>)
                .filter(([, v]) => v !== undefined)
                .map(([key, value]) => ({ key, value }));
        }
        return [{ key: "value", value: this.data }];
    }
}

export interface PropertyEntry {
    key: string;
    value: unknown;
    editable?: boolean;
    type?: "string" | "number" | "boolean";
}

export interface Inspectable {
    getDisplayName(): string;
    getProperties(): PropertyEntry[];
    setProperty?(key: string, value: unknown): void;
    render?: (container: HTMLElement) => void;
}

export interface Serializable {
    serialize(): unknown;
    deserialize?(blob: unknown): void;
}

export function isInspectable(obj: unknown): obj is Inspectable {
    if (obj == null || typeof obj !== "object") return false;
    const candidate = obj as Record<string, unknown>;
    return (
        typeof candidate["getDisplayName"] === "function" &&
        typeof candidate["getProperties"] === "function"
    );
}

export function isSerializable(obj: unknown): obj is Serializable {
    if (obj == null || typeof obj !== "object") return false;
    return typeof (obj as Record<string, unknown>)["serialize"] === "function";
}

export class UIItemBase<T> {
    data: T;

    constructor(data: T) {
        this.data = data;
    }

    isInspectable(): this is UIItemBase<Inspectable> {
        return isInspectable(this.data);
    }

    isSerializable(): this is UIItemBase<Serializable> {
        return isSerializable(this.data);
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
                .map(([key, value]) => ({
                    key,
                    value,
                    editable: typeof value === "string" || typeof value === "number" || typeof value === "boolean",
                    type: (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
                        ? typeof value as "string" | "number" | "boolean"
                        : undefined,
                }));
        }
        return [{ key: "value", value: this.data }];
    }

    setProperty(key: string, value: unknown): void {
        if (this.isInspectable() && this.data.setProperty) {
            this.data.setProperty(key, value);
            return;
        }
        if (this.data != null && typeof this.data === "object") {
            (this.data as Record<string, unknown>)[key] = value;
        }
    }

    serialize(): unknown {
        if (this.isSerializable()) {
            return this.data.serialize();
        }
        try {
            return JSON.parse(JSON.stringify(this.data));
        } catch {
            return null;
        }
    }

    deserialize(blob: unknown): void {
        if (this.isSerializable() && this.data.deserialize) {
            this.data.deserialize(blob);
        }
    }
}

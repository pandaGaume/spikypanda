export interface SelectOption {
    value: string;
    label: string;
}

export interface PropertyEntry {
    key: string;
    value: unknown;
    editable?: boolean;
    type?: "string" | "number" | "boolean" | "select";
    /** Only meaningful when type === "select". */
    options?: SelectOption[];
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

/**
 * IRunnableNode marks a node whose runtime can be started and stopped.
 * The editor renders a play / stop toggle in the node header for any
 * data object that implements this interface. Sources (signal generators,
 * event emitters) are the typical implementers.
 *
 * The interface only mandates a getter and a setter. The implementer
 * decides where the running flag actually lives (local field, runtime
 * registry, etc.) and how setRunning propagates beyond the data object.
 */
export interface IRunnableNode {
    isRunning(): boolean;
    setRunning(running: boolean): void;
}

/**
 * IToggableNode is the binary on/off equivalent for non-running nodes:
 * faults, environment modulators, optional pre-processors. The editor
 * renders an enable / disable toggle in the node header. Same setter
 * pattern as IRunnableNode.
 */
export interface IToggableNode {
    isEnabled(): boolean;
    setEnabled(enabled: boolean): void;
}

/**
 * IStartableNode marks a processor node whose capture/recording can be
 * started and stopped independently of the graph executor. Distinct from
 * IRunnableNode (which drives signal generation sources): an IStartableNode
 * node can be live in the graph while not yet capturing.
 *
 * Typical implementer: spk.DatasetCapture.
 * The editor renders a ● / ■ record-toggle button in the node header.
 */
export interface IStartableNode {
    isStarted(): boolean;
    setStarted(started: boolean): void;
}

export function isRunnableNode(obj: unknown): obj is IRunnableNode {
    if (obj == null || typeof obj !== "object") return false;
    const c = obj as Record<string, unknown>;
    return typeof c["isRunning"] === "function" && typeof c["setRunning"] === "function";
}

export function isToggableNode(obj: unknown): obj is IToggableNode {
    if (obj == null || typeof obj !== "object") return false;
    const c = obj as Record<string, unknown>;
    return typeof c["isEnabled"] === "function" && typeof c["setEnabled"] === "function";
}

export function isStartableNode(obj: unknown): obj is IStartableNode {
    if (obj == null || typeof obj !== "object") return false;
    const c = obj as Record<string, unknown>;
    return typeof c["isStarted"] === "function" && typeof c["setStarted"] === "function";
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

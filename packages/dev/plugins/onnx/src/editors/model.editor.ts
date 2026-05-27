import type { EditorFactory, IEditor } from "spikypanda-nodeeditor";
import type { IDisposable } from "spikypanda-core";
import type { OnnxModelGraph } from "../graphs/model.graph";

const ZONE_STYLE = [
    "display:flex", "flex-direction:column", "align-items:center",
    "justify-content:center", "gap:8px", "padding:16px",
    "border:2px dashed #555", "border-radius:6px",
    "cursor:pointer", "user-select:none", "transition:border-color .15s",
    "min-height:80px", "text-align:center",
].join(";");

const STATUS_STYLE = [
    "padding:8px 0", "font-size:11px", "color:#aaa",
    "word-break:break-all",
].join(";");

const ERROR_STYLE = "color:#e05;font-size:11px;padding:4px 0;word-break:break-all;";

export const onnxModelEditor: EditorFactory = (host, model): IEditor => {
    const node = model as OnnxModelGraph;

    const wrap = document.createElement("div");
    wrap.style.cssText = "padding:8px;";

    const zone = document.createElement("div");
    zone.style.cssText = ZONE_STYLE;

    const icon = document.createElement("div");
    icon.textContent = "⬆";
    icon.style.cssText = "font-size:20px;";

    const prompt = document.createElement("div");
    prompt.style.cssText = "font-size:12px;color:#bbb;";
    prompt.textContent = "Drop .onnx file or click to browse";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".onnx";
    fileInput.style.display = "none";

    zone.appendChild(icon);
    zone.appendChild(prompt);
    zone.appendChild(fileInput);

    const status = document.createElement("div");
    status.style.cssText = STATUS_STYLE;

    wrap.appendChild(zone);
    wrap.appendChild(status);
    host.appendChild(wrap);

    function refresh(): void {
        if (node.loadError) {
            zone.style.borderColor = "#e05";
            status.style.cssText = ERROR_STYLE;
            status.textContent = node.loadError;
            return;
        }
        if (node.isLoaded) {
            zone.style.borderColor = "#4a9";
            status.style.cssText = STATUS_STYLE;
            status.textContent = `${node.modelName}  |  ${node.inputs.length} in, ${node.outputs.length} out, ${node.nodes.length} ops`;
        } else {
            zone.style.borderColor = "#555";
            status.textContent = "";
        }
    }

    function loadFile(file: File): void {
        if (!file.name.endsWith(".onnx")) return;
        file.arrayBuffer().then(bytes => node.loadModel(bytes, file.name));
    }

    zone.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (file) loadFile(file);
        fileInput.value = "";
    });

    zone.addEventListener("dragover", (e: DragEvent) => {
        e.preventDefault();
        zone.style.borderColor = "#7cf";
    });

    zone.addEventListener("dragleave", () => refresh());

    zone.addEventListener("drop", (e: DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0];
        if (file) loadFile(file);
        refresh();
    });

    let sub: IDisposable | undefined;
    const obs = (model as Record<string, unknown>)["onPropertyChanged"];
    if (obs && typeof (obs as Record<string, unknown>)["add"] === "function") {
        sub = (obs as { add: (fn: () => void) => IDisposable }).add(() => refresh());
    }

    refresh();

    return {
        dispose(): void {
            sub?.dispose();
            host.removeChild(wrap);
        },
    };
};

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3, Quaternion as BJSQuaternion } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";

import type { Quaternion as SpkQuaternion } from "spikypanda-core";
import type { EditorFactory, IEditor } from "spikypanda-nodeeditor";

type AxisKey = "yaw" | "pitch" | "roll";

interface IAttitudeModel {
    yaw: number;
    pitch: number;
    roll: number;
    rotation: SpkQuaternion;
    onPropertyChanged?: { add(cb: (args: { propertyName?: string }) => void): { dispose(): void } | null };
}

const AXES: ReadonlyArray<AxisKey> = ["yaw", "pitch", "roll"];

// One degree per pixel of horizontal drag. Tuned by feel — small enough
// to allow fine tuning, large enough that a full sweep takes a few
// hundred pixels of motion instead of thousands.
const DEG_PER_PIXEL = 0.5;

export const attitude3DEditor: EditorFactory = (host, model): IEditor => {
    const m = model as IAttitudeModel;
    let activeAxis: AxisKey = "yaw";

    // ── DOM layout ────────────────────────────────────────────────────────
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:10px;width:100%;height:100%;min-height:320px;";

    // Axis selector / value rows.
    const axisTable = document.createElement("div");
    axisTable.style.cssText = "display:flex;flex-direction:column;gap:4px;";
    wrap.appendChild(axisTable);

    const inputs: Record<AxisKey, HTMLInputElement> = {} as Record<AxisKey, HTMLInputElement>;
    const radios: Record<AxisKey, HTMLInputElement> = {} as Record<AxisKey, HTMLInputElement>;

    for (const axis of AXES) {
        const row = document.createElement("label");
        row.style.cssText =
            "display:flex;align-items:center;gap:8px;" + "font-family:var(--ne-font-family,monospace);font-size:0.78em;" + "color:var(--ne-color-text);cursor:pointer;";

        const name = document.createElement("span");
        name.textContent = axis;
        name.style.cssText = "flex:0 0 44px;color:var(--ne-color-text-muted);text-transform:uppercase;letter-spacing:0.06em;";
        row.appendChild(name);

        const input = document.createElement("input");
        input.type = "number";
        input.step = "1";
        input.value = String(m[axis] ?? 0);
        input.style.cssText =
            "flex:1;min-width:0;padding:3px 6px;font-size:0.9em;" +
            "background:var(--ne-color-surface);color:var(--ne-color-text);" +
            "border:1px solid var(--ne-color-border);border-radius:3px;";
        input.addEventListener("input", () => {
            const v = Number(input.value);
            if (Number.isFinite(v)) m[axis] = v;
        });
        inputs[axis] = input;
        row.appendChild(input);

        const unit = document.createElement("span");
        unit.textContent = "°";
        unit.style.cssText = "flex:0 0 auto;color:var(--ne-color-text-muted);";
        row.appendChild(unit);

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "attitude-axis-pick";
        radio.checked = axis === activeAxis;
        radio.title = `Drag the gizmo to rotate ${axis}`;
        radio.style.cssText = "flex:0 0 auto;margin-left:4px;accent-color:var(--ne-color-primary);cursor:pointer;";
        radio.addEventListener("change", () => {
            if (radio.checked) activeAxis = axis;
        });
        radios[axis] = radio;
        row.appendChild(radio);

        axisTable.appendChild(row);
    }

    // 3D viewport.
    const canvas = document.createElement("canvas");
    canvas.style.cssText =
        "flex:1;min-height:240px;width:100%;border:1px solid var(--ne-color-border);" + "border-radius:4px;background:#0A0A0F;outline:none;cursor:ew-resize;touch-action:none;";
    canvas.tabIndex = 0;
    wrap.appendChild(canvas);

    // Hint line.
    const hint = document.createElement("div");
    hint.textContent = "Drag horizontally on the viewport to rotate the selected axis.";
    hint.style.cssText = "font-family:var(--ne-font-family,monospace);font-size:0.65em;" + "letter-spacing:0.04em;color:var(--ne-color-text-faint);text-align:right;";
    wrap.appendChild(hint);

    host.appendChild(wrap);

    // ── Babylon scene ────────────────────────────────────────────────────
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(10 / 255, 10 / 255, 15 / 255, 1);

    // Fixed camera: ArcRotateCamera with no attached controls so the user
    // cannot orbit it. Positioned at a 3/4 view for readable axis names.
    // Fixed camera kept in the scene graph but intentionally not bound
    // to a variable: Babylon retains it via the scene; we never need to
    // touch it again after construction.
    new ArcRotateCamera("att-cam", -Math.PI / 3, Math.PI / 3.2, 4, Vector3.Zero(), scene);
    // Intentionally NOT attached to controls: camera stays fixed across the session.

    const light = new HemisphericLight("att-light", new Vector3(0.5, 1, 0.3), scene);
    light.intensity = 0.95;

    // World reference axes (muted, fixed) so the global frame is visible.
    drawAxis(scene, new Vector3(1, 0, 0), new Color3(0.55, 0.25, 0.25), "world-x");
    drawAxis(scene, new Vector3(0, 1, 0), new Color3(0.25, 0.55, 0.25), "world-y");
    drawAxis(scene, new Vector3(0, 0, 1), new Color3(0.25, 0.3, 0.65), "world-z");

    // Rotated body: parent TransformNode driven by the model quaternion.
    const body = new TransformNode("att-body", scene);

    const box = MeshBuilder.CreateBox("att-box", { width: 0.55, height: 0.3, depth: 0.18 }, scene);
    const boxMat = new StandardMaterial("att-box-mat", scene);
    boxMat.diffuseColor = new Color3(0.45, 0.45, 0.55);
    boxMat.specularColor = new Color3(0.1, 0.1, 0.12);
    box.material = boxMat;
    box.parent = body;

    drawArrow(scene, body, new Vector3(1, 0, 0), new Color3(0.93, 0.3, 0.3), "body-x");
    drawArrow(scene, body, new Vector3(0, 1, 0), new Color3(0.3, 0.85, 0.35), "body-y");
    drawArrow(scene, body, new Vector3(0, 0, 1), new Color3(0.3, 0.55, 0.95), "body-z");

    body.rotationQuaternion = BJSQuaternion.Identity();

    // Render-on-demand: an attitude editor changes rarely (model edits,
    // canvas resizes). A continuous runRenderLoop would peg one core for
    // no visual benefit, so we just schedule a single frame whenever
    // something visible changes.
    let rafPending = false;
    function requestFrame(): void {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
            rafPending = false;
            scene.render();
        });
    }

    function syncBody(): void {
        const q = m.rotation;
        body.rotationQuaternion!.set(q.x, q.y, q.z, q.w);
        requestFrame();
    }
    syncBody();

    // ── Model subscriptions ──────────────────────────────────────────────
    function syncInputs(only?: string): void {
        for (const axis of AXES) {
            if (only && only !== axis) continue;
            if (document.activeElement === inputs[axis]) continue;
            const v = m[axis];
            const formatted = Number.isFinite(v) ? roundTo(v, 2) : 0;
            inputs[axis].value = String(formatted);
        }
    }

    let modelSub: { dispose(): void } | null = null;
    if (m.onPropertyChanged && typeof m.onPropertyChanged.add === "function") {
        modelSub = m.onPropertyChanged.add((args) => {
            const p = args.propertyName;
            if (p === "yaw" || p === "pitch" || p === "roll") {
                syncBody();
                syncInputs(p);
            }
        });
    }

    // ── Drag-to-rotate ───────────────────────────────────────────────────
    let dragging = false;
    let dragStartX = 0;
    let dragStartValue = 0;

    function onPointerDown(e: PointerEvent): void {
        dragging = true;
        dragStartX = e.clientX;
        dragStartValue = m[activeAxis] ?? 0;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "ew-resize";
        e.preventDefault();
    }
    function onPointerMove(e: PointerEvent): void {
        if (!dragging) return;
        const dx = e.clientX - dragStartX;
        m[activeAxis] = roundTo(dragStartValue + dx * DEG_PER_PIXEL, 2);
    }
    function onPointerUp(e: PointerEvent): void {
        if (!dragging) return;
        dragging = false;
        try {
            canvas.releasePointerCapture(e.pointerId);
        } catch (_e) {
            /* ignore */
        }
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    // ── Resize handling ──────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
        engine.resize();
        requestFrame();
    });
    ro.observe(canvas);

    return {
        dispose: (): void => {
            if (modelSub) modelSub.dispose();
            ro.disconnect();
            canvas.removeEventListener("pointerdown", onPointerDown);
            canvas.removeEventListener("pointermove", onPointerMove);
            canvas.removeEventListener("pointerup", onPointerUp);
            canvas.removeEventListener("pointercancel", onPointerUp);
            scene.dispose();
            engine.dispose();
            if (wrap.parentNode === host) host.removeChild(wrap);
        },
    };
};

function roundTo(v: number, decimals: number): number {
    const f = Math.pow(10, decimals);
    return Math.round(v * f) / f;
}

function drawAxis(scene: Scene, dir: Vector3, color: Color3, name: string): void {
    const line = MeshBuilder.CreateLines(
        name,
        {
            points: [Vector3.Zero(), dir.scale(1.4)],
        },
        scene
    );
    line.color = color;
    line.isPickable = false;
}

function drawArrow(scene: Scene, parent: TransformNode, dir: Vector3, color: Color3, name: string): void {
    const shaft = MeshBuilder.CreateLines(
        name + "-shaft",
        {
            points: [Vector3.Zero(), dir.scale(0.85)],
        },
        scene
    );
    shaft.color = color;
    shaft.isPickable = false;
    shaft.parent = parent;

    const tip = MeshBuilder.CreateCylinder(
        name + "-tip",
        {
            diameterTop: 0,
            diameterBottom: 0.08,
            height: 0.18,
            tessellation: 12,
        },
        scene
    );
    const tipMat = new StandardMaterial(name + "-tipmat", scene);
    tipMat.diffuseColor = color;
    tipMat.emissiveColor = color.scale(0.4);
    tipMat.specularColor = new Color3(0.1, 0.1, 0.1);
    tip.material = tipMat;
    tip.isPickable = false;
    tip.parent = parent;

    const up = new Vector3(0, 1, 0);
    const axis = Vector3.Cross(up, dir);
    const angle = Math.acos(Math.min(1, Math.max(-1, Vector3.Dot(up, dir))));
    if (axis.lengthSquared() > 1e-9 && Math.abs(angle) > 1e-6) {
        tip.rotationQuaternion = BJSQuaternion.RotationAxis(axis.normalize(), angle);
    } else if (Vector3.Dot(up, dir) < 0) {
        tip.rotationQuaternion = BJSQuaternion.RotationAxis(new Vector3(1, 0, 0), Math.PI);
    }
    tip.position = dir.scale(0.93);
}

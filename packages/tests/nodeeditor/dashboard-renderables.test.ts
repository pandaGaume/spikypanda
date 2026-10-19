/**
 * Which nodes of a loaded graph are UI nodes.
 *
 * A saved document says nothing about it: nothing in `model.nodes`
 * distinguishes a chart from a physics node. The only marker is the
 * runtime instance implementing `IRenderable`, and until now only the
 * interactive add path used it. A graph produced outside the editor
 * (the document builder, a job, a hand-written file) came back with
 * `dashboards[].tiles` empty, so its chart nodes appeared in the graph
 * and drew nowhere, which is exactly the case this helper closes.
 *
 * The helper is pure on purpose: a tile needs GridStack and a DOM, the
 * rule that decides which nodes deserve one does not.
 */
import { isRenderable, unmountedRenderables } from "../../dev/nodeeditor/src";

/** A node that can draw: the five members `IRenderable` requires. */
const renderable = (type: string) => ({
    renderableType: type,
    mountInto: () => undefined,
    unmountFrom: () => undefined,
    repaint: () => undefined,
    onResize: () => undefined,
});

/** A physics node: a runtime node with a `fire`, and nothing to draw. */
const physics = () => ({ fire: () => undefined, reset: () => undefined });

const node = (id: string, data: unknown) => ({ id, item: { data } });

describe("isRenderable", () => {
    it("accepts a complete renderable and refuses a partial one", () => {
        expect(isRenderable(renderable("Viz.Plot:xy"))).toBe(true);
        // A node that has the type but not the methods cannot be mounted,
        // and claiming otherwise would throw inside GridStack.
        expect(isRenderable({ renderableType: "Viz.Plot:xy" })).toBe(false);
        expect(isRenderable(physics())).toBe(false);
        expect(isRenderable(null)).toBe(false);
        expect(isRenderable("Viz.Plot:xy")).toBe(false);
    });
});

describe("unmountedRenderables", () => {
    it("picks the UI nodes of a graph and leaves the physics nodes alone", () => {
        const nodes = [node("material", physics()), node("plasma", physics()), node("spectrometer", physics()), node("chart", renderable("Viz.Plot:xy"))];
        const picked = unmountedRenderables(nodes, () => false);
        expect(picked.map((n) => n.id)).toEqual(["chart"]);
    });

    it("skips what the saved layout already mounted, so a saved position is not overridden", () => {
        const nodes = [node("chart", renderable("Viz.Plot:xy")), node("waterfall", renderable("Viz.Plot:waterfall"))];
        const picked = unmountedRenderables(nodes, (id) => id === "chart");
        expect(picked.map((n) => n.id)).toEqual(["waterfall"]);
    });

    it("returns nothing for a graph with no UI node at all", () => {
        expect(unmountedRenderables([node("plasma", physics())], () => false)).toEqual([]);
    });

    it("ignores a node whose data is missing rather than throwing", () => {
        const nodes = [{ id: "ghost", item: { data: undefined } }, node("chart", renderable("Viz.Plot:xy"))];
        expect(unmountedRenderables(nodes, () => false).map((n) => n.id)).toEqual(["chart"]);
    });
});

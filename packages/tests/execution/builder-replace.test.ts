import { Channel, RuntimeGraphBuilder, RuntimeNode } from "spikypanda-core";

describe("RuntimeGraphBuilder graph replacement shortcuts", () => {
    test("hydrates from a graph and replaces a node in place", () => {
        const source = new RuntimeNode();
        const middle = new RuntimeNode();
        const sink = new RuntimeNode();
        const first = new Channel(source, middle, "out", false, undefined, true, "in");
        const second = new Channel(middle, sink, "out", false, undefined, true, "in");
        const graph = new RuntimeGraphBuilder()
            .withMode("static")
            .withEnabled(false)
            .withNodes(source, middle, sink)
            .withLinks(first, second)
            .withInputs(source)
            .withHiddens(middle)
            .withOutputs(sink)
            .build();
        const replacement = new RuntimeNode();

        const rebuilt = new RuntimeGraphBuilder(graph).replaceNode(middle, replacement).build();

        expect(rebuilt.mode).toBe("static");
        expect(rebuilt.enabled).toBe(false);
        expect(rebuilt.nodes).toEqual([source, replacement, sink]);
        expect(rebuilt.hiddens).toEqual([replacement]);
        expect(first.ofin).toBe(replacement);
        expect(second.oini).toBe(replacement);
        expect(middle.onsc()).toHaveLength(0);
        expect(middle.opsc()).toHaveLength(0);
    });

    test("replaces a link at the same index and detaches the previous link", () => {
        const source = new RuntimeNode();
        const sink = new RuntimeNode();
        const previous = new Channel(source, sink, "old", false, undefined, true, "in");
        const graph = new RuntimeGraphBuilder().withNodes(source, sink).withLinks(previous).build();
        const replacement = new Channel(source, sink, "new", false, undefined, true, "in");

        const rebuilt = new RuntimeGraphBuilder().withGraph(graph).replaceLink(previous, replacement).build();

        expect(rebuilt.links).toEqual([replacement]);
        expect(source.onsc()).toEqual([replacement]);
        expect(sink.opsc()).toEqual([replacement]);
        expect(previous.oini).toBeNull();
        expect(previous.ofin).toBeNull();
    });

    test("rejects ambiguous replacements", () => {
        const first = new RuntimeNode();
        const second = new RuntimeNode();
        const graph = new RuntimeGraphBuilder().withNodes(first, second).build();
        const builder = new RuntimeGraphBuilder(graph);

        expect(() => builder.replaceNode(new RuntimeNode(), new RuntimeNode())).toThrow("current node is not part");
        expect(() => builder.replaceNode(first, second)).toThrow("replacement node is already part");
    });
});

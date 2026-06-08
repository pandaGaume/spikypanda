/**
 * Unit tests for `NavigationStack` (P5b). The stack is pure data;
 * GraphViewer drill-down integration relies on a JSDOM harness and
 * is exercised by the editor's e2e suite — not here.
 *
 * Coverage:
 *   1. Initial state: depth 1, current = root, no parent snapshot.
 *   2. push / pop / popTo behave like a stack with the root pinned.
 *   3. onChanged fires on every mutation.
 *   4. reset() rebuilds a fresh root and fires onChanged.
 */
import { NavigationStack } from "../../dev/nodeeditor/src/navigation-stack";

describe("NavigationStack — initial state", () => {
    it("starts with depth 1 (just the root)", () => {
        const s = new NavigationStack();
        expect(s.depth).toBe(1);
        expect(s.current.parentNodeId).toBeNull();
        expect(s.current.parentSnapshot).toBeNull();
        expect(s.current.label).toBe("Root");
        expect(s.all).toHaveLength(1);
    });

    it("accepts a custom root label", () => {
        const s = new NavigationStack("Habitat");
        expect(s.current.label).toBe("Habitat");
    });
});

describe("NavigationStack — push / pop / popTo", () => {
    it("push adds a level on top and updates current", () => {
        const s = new NavigationStack();
        s.push({ parentNodeId: "sim1", label: "ScrubberProcess", parentSnapshot: "{root-json}" });
        expect(s.depth).toBe(2);
        expect(s.current.parentNodeId).toBe("sim1");
        expect(s.current.label).toBe("ScrubberProcess");
        expect(s.current.parentSnapshot).toBe("{root-json}");
    });

    it("pop removes the top level and returns it", () => {
        const s = new NavigationStack();
        const level = { parentNodeId: "sim1", label: "A", parentSnapshot: "{}" };
        s.push(level);
        const popped = s.pop();
        expect(popped).toBe(level);
        expect(s.depth).toBe(1);
    });

    it("pop on the root entry is a no-op (returns null, stack stays at depth 1)", () => {
        const s = new NavigationStack();
        expect(s.pop()).toBeNull();
        expect(s.depth).toBe(1);
    });

    it("popTo(N) pops down to level N (root = 0)", () => {
        const s = new NavigationStack();
        s.push({ parentNodeId: "a", label: "A", parentSnapshot: "x" });
        s.push({ parentNodeId: "b", label: "B", parentSnapshot: "y" });
        s.push({ parentNodeId: "c", label: "C", parentSnapshot: "z" });
        expect(s.depth).toBe(4);

        const popped = s.popTo(1);
        expect(popped).toHaveLength(2);
        // Oldest popped first.
        expect(popped[0].parentNodeId).toBe("b");
        expect(popped[1].parentNodeId).toBe("c");
        expect(s.depth).toBe(2);
        expect(s.current.parentNodeId).toBe("a");
    });

    it("popTo(0) pops every drill-down (returns to root)", () => {
        const s = new NavigationStack();
        s.push({ parentNodeId: "a", label: "A", parentSnapshot: "x" });
        s.push({ parentNodeId: "b", label: "B", parentSnapshot: "y" });
        s.popTo(0);
        expect(s.depth).toBe(1);
        expect(s.current.parentNodeId).toBeNull();
    });

    it("popTo with a negative or out-of-range index clamps safely", () => {
        const s = new NavigationStack();
        s.push({ parentNodeId: "a", label: "A", parentSnapshot: "x" });
        s.push({ parentNodeId: "b", label: "B", parentSnapshot: "y" });
        s.popTo(-5);
        expect(s.depth).toBe(1);

        s.push({ parentNodeId: "c", label: "C", parentSnapshot: "z" });
        s.popTo(99); // past current depth → no-op
        expect(s.depth).toBe(2);
    });
});

describe("NavigationStack — onChanged notifications", () => {
    it("fires onChanged on push", () => {
        const s = new NavigationStack();
        let count = 0;
        s.onChanged = () => count++;
        s.push({ parentNodeId: "a", label: "A", parentSnapshot: "x" });
        expect(count).toBe(1);
    });

    it("fires onChanged on pop", () => {
        const s = new NavigationStack();
        s.push({ parentNodeId: "a", label: "A", parentSnapshot: "x" });
        let count = 0;
        s.onChanged = () => count++;
        s.pop();
        expect(count).toBe(1);
    });

    it("does NOT fire onChanged on a no-op pop (already at root)", () => {
        const s = new NavigationStack();
        let count = 0;
        s.onChanged = () => count++;
        s.pop();
        expect(count).toBe(0);
    });

    it("fires onChanged once for a popTo that removes multiple levels", () => {
        const s = new NavigationStack();
        s.push({ parentNodeId: "a", label: "A", parentSnapshot: "x" });
        s.push({ parentNodeId: "b", label: "B", parentSnapshot: "y" });
        s.push({ parentNodeId: "c", label: "C", parentSnapshot: "z" });
        let count = 0;
        s.onChanged = () => count++;
        s.popTo(0);
        expect(count).toBe(1);
    });

    it("fires onChanged on reset", () => {
        const s = new NavigationStack();
        let count = 0;
        s.onChanged = () => count++;
        s.reset("New Project");
        expect(count).toBe(1);
        expect(s.current.label).toBe("New Project");
        expect(s.depth).toBe(1);
    });
});

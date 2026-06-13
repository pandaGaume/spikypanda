/**
 * PrintNode dual-mode semantics (user report: "Print prints 'Print'").
 *
 * Legacy UE5 exec mode is preserved (trigger on `in`, payload from the
 * `text` port or the static editable), plus the two tolerances that
 * close the wire-a-payload-read-an-empty-line footgun:
 *   - a non-boolean token on `in` is itself printed when no text token
 *     arrived this tick (alarm objects, numbers);
 *   - with `in` unwired, a token on `text` triggers the print alone.
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { DebugBus } from "spikypanda-nodeeditor";
import { PrintNode } from "../../dev/plugins/logic/src/nodes/debug";

class TokenSource extends RuntimeNode {
    private _cursor = 0;
    public constructor(private readonly _tokens: unknown[]) {
        super();
    }
    public override isReady(_s: ISession): boolean {
        return this.enabled && this._cursor < this._tokens.length;
    }
    public override fire(session: ISession, _t: number): void {
        const token = this._tokens[this._cursor++];
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, token);
        }
    }
}

function run(wire: "in" | "text" | "both", tokens: unknown[], staticText = ""): string[] {
    const print = new PrintNode();
    if (staticText) print.text = staticText;
    const nodes: RuntimeNode[] = [print];
    const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic");
    if (wire === "both") {
        const sIn = new TokenSource(tokens);
        const sText = new TokenSource(tokens);
        nodes.push(sIn, sText);
        builder
            .withNodes(...nodes)
            .withChannel(sIn, print, "out", "in")
            .withChannel(sText, print, "out", "text");
    } else {
        const src = new TokenSource(tokens);
        nodes.push(src);
        builder.withNodes(...nodes).withChannel(src, print, "out", wire);
    }
    const session = new Session(builder.build());
    const logged: string[] = [];
    const spy = jest.spyOn(DebugBus.instance, "log").mockImplementation(((_lvl: unknown, _label: unknown, text: unknown) => {
        logged.push(String(text));
    }) as never);
    try {
        for (let k = 0; k < tokens.length + 2; k++) session.run(k);
    } finally {
        spy.mockRestore();
    }
    return logged;
}

describe("PrintNode", () => {
    test("legacy exec mode: trigger on `in` prints the static text", () => {
        expect(run("in", [true, true], "hello")).toEqual(["hello", "hello"]);
    });

    test("a payload object arriving on `in` is itself printed (the alarm case)", () => {
        const alarm = { topic: "NEW_REGIME", severity: "warn" };
        const logged = run("in", [alarm]);
        expect(logged).toHaveLength(1);
        expect(logged[0]).toContain("NEW_REGIME");
    });

    test("data mode: with `in` unwired, a token on `text` triggers and prints itself", () => {
        expect(run("text", ["payload-A", 42])).toEqual(["payload-A", "42"]);
    });

    test("both wired: text token wins as payload, one print per trigger", () => {
        const logged = run("both", ["X"]);
        expect(logged).toEqual(["X"]);
    });
});

import {
    ActivationFunctions,
    Channel,
    IChannel,
    ISession,
    MlpGraph,
    MlpNeuron,
    MlpRunnerBuilder,
    MlpSynapse,
    NeuralRunner,
    RuntimeGraph,
    RuntimeNode,
    Session,
} from "spikypanda-core";

class VectorSource extends RuntimeNode {
    public constructor(public readonly value: number[]) {
        super();
    }
    public override isReady(_s: ISession): boolean {
        return this.enabled;
    }
    public override fire(session: ISession, _t: number): void {
        const out = this.onsc<IChannel>()[0];
        const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(out);
        session.publish(idx, this.value);
    }
}

class VectorSink extends RuntimeNode {
    public received: number[][] = [];
    public override fire(session: ISession, _t: number): void {
        const inc = this.opsc<IChannel>()[0];
        const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(inc);
        this.received.push(session.consume(idx) as number[]);
    }
    public override reset(_s: ISession): void {
        this.received = [];
    }
}

describe("NeuralRunner (unit)", () => {
    test("fire() concatenates incoming channel payloads in slot order and broadcasts the result", () => {
        const stubRuntime = { tag: "stub" };
        // evaluator returns the input doubled, so we can verify routing
        const runner = new NeuralRunner(stubRuntime, (_rt, input) => input.map((x) => x * 2));

        const srcA = new VectorSource([1, 2]);
        const srcB = new VectorSource([10, 20]);
        const sink = new VectorSink();
        const linkA = new Channel<number[]>(srcA, runner, 0);
        const linkB = new Channel<number[]>(srcB, runner, 1);
        const linkOut = new Channel<number[]>(runner, sink, 0);
        const g = new RuntimeGraph<RuntimeNode, Channel>(
            [srcA, srcB, runner, sink],
            [linkA, linkB, linkOut],
            "dynamic"
        );
        const s = new Session(g);

        s.run(0);

        // Sources publish [1,2] and [10,20]; runner concats in slot order
        // (0 then 1) then doubles, so the sink receives [2,4,20,40].
        expect(sink.received).toEqual([[2, 4, 20, 40]]);
    });

    test("exposes the wrapped runtime via .runtime for stateful access", () => {
        const stubRuntime = { counter: 0, bump() { this.counter++; } };
        const runner = new NeuralRunner(stubRuntime, (_rt, input) => input);
        expect(runner.runtime).toBe(stubRuntime);
        runner.runtime.bump();
        expect(stubRuntime.counter).toBe(1);
    });
});

describe("MlpRunnerBuilder (integration)", () => {
    test("wraps a trained MLP and produces inference outputs through a RuntimeGraph", () => {
        // Tiny MLP that maps a single-input identity-ish: bias=0, weight=1,
        // sigmoid output. Predictable enough to assert against.
        const inputNeuron = new MlpNeuron(0, ActivationFunctions.linear);
        const outputNeuron = new MlpNeuron(0, ActivationFunctions.sigmoid);
        const synapse = new MlpSynapse(inputNeuron, outputNeuron);
        synapse.weight = 4;
        const mlp = new MlpGraph([inputNeuron, outputNeuron], [synapse]);

        const runner = new MlpRunnerBuilder().withGraph(mlp).withActivation(ActivationFunctions.relu).build();

        const src = new VectorSource([1]);
        const sink = new VectorSink();
        const link1 = new Channel<number[]>(src, runner, 0);
        const link2 = new Channel<number[]>(runner, sink, 0);
        const g = new RuntimeGraph<RuntimeNode, Channel>([src, runner, sink], [link1, link2], "dynamic");
        const s = new Session(g);

        s.run(0);

        // Hand-computed: input=1 -> linear=1 -> hidden=4*1=4 + bias 0 ->
        // sigmoid(4) ~= 0.982. Expect a single output between 0.95 and 1.
        expect(sink.received.length).toBe(1);
        expect(sink.received[0].length).toBe(1);
        expect(sink.received[0][0]).toBeGreaterThan(0.95);
        expect(sink.received[0][0]).toBeLessThan(1);
    });
});

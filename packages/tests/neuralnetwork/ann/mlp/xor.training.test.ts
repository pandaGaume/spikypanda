import { ActivationFunctions, IMlpGraph, IMlpNeuron, IMlpSynapse, MLPRuntime, MLPTrainingRuntime, LossFunctions, Optimizers } from "@core";

function log(message: string) {
    process.stdout.write(message + "\n");
}

function logObject(prefix: string, o: any) {
    process.stdout.write(prefix + JSON.stringify(o, null, 2) + "\n");
}

function runTestSuite(name: string, graph: IMlpGraph, cases: { input: number[]; expected: number }[]) {
    const runtime = new MLPRuntime(graph, ActivationFunctions.sigmoid);

    describe(name, () => {
        cases.forEach(({ input, expected }) => {
            test(`${name}(${input.join(", ")}) ≈ ${expected}`, () => {
                const [output] = runtime.run(input);
                expect(Math.abs(output - expected)).toBeLessThan(0.1);
            });
        });
    });
}

// XOR dataset
const xorData = [
    { input: [0, 0], expected: 0 },
    { input: [0, 1], expected: 1 },
    { input: [1, 0], expected: 1 },
    { input: [1, 1], expected: 0 },
];

// Helper to create a 2-2-1 MLP with random weights
function createRandomXorGraph(): IMlpGraph {
    const rand = () => Math.random() * Math.sqrt(1 / 2);
    //const rand = () => Math.random() * 2 - 1;

    const i1: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.sigmoid };
    const i2: IMlpNeuron = <any>{ bias: 0, activationFn: ActivationFunctions.sigmoid };
    const h1: IMlpNeuron = <any>{ bias: rand(), activationFn: ActivationFunctions.sigmoid };
    const h2: IMlpNeuron = <any>{ bias: rand(), activationFn: ActivationFunctions.sigmoid };
    const o1: IMlpNeuron = <any>{ bias: rand(), activationFn: ActivationFunctions.sigmoid };

    const synapses: IMlpSynapse[] = [
        { oini: i1, ofin: h1, weight: rand() },
        { oini: i2, ofin: h1, weight: rand() },
        { oini: i1, ofin: h2, weight: rand() },
        { oini: i2, ofin: h2, weight: rand() },
        { oini: h1, ofin: o1, weight: rand() },
        { oini: h2, ofin: o1, weight: rand() },
    ];

    const neurons = [i1, i2, h1, h2, o1];
    neurons.forEach((n) => {
        n.onsc = () => <any>synapses.filter((s) => s.oini === n);
        n.opsc = () => <any>synapses.filter((s) => s.ofin === n);
    });

    return {
        nodes: neurons,
        links: synapses,
        inputs: [i1, i2],
        outputs: [o1],
        onsc: () => null,
        opsc: () => null,
    };
}

// Set up graph, runtime, and training
const graph = createRandomXorGraph();
const runtime = new MLPRuntime(graph, ActivationFunctions.sigmoid);
const optimizer = Optimizers.Adam(); // or .adam()
const trainer = new MLPTrainingRuntime(graph, runtime, LossFunctions.mse, 0.05, optimizer);

// Training loop
const epochs = 10000;
const losses: number[] = [];

for (let epoch = 0; epoch < epochs; epoch++) {
    let epochLoss = 0;

    for (const { input, expected } of xorData) {
        const loss = trainer.trainStep(input, [expected]);
        epochLoss += loss;
    }

    const avgLoss = epochLoss / xorData.length;
    losses.push(avgLoss);

    if (epoch % 500 === 0 || epoch === epochs - 1) {
        log(`Epoch ${epoch} — Loss: ${avgLoss.toFixed(6)}`);
        graph.nodes.forEach((n, i) => {
            logObject(`node_${i} :`, n);
        });
        graph.links.forEach((l, i) => {
            logObject(`link_${i} :`, l);
        });
    }
}

// Final evaluation
runTestSuite("XOR trained", graph, xorData);

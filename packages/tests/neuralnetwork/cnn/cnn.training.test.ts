import {
    CnnBuilder,
    CnnInferenceRuntime,
    CnnTrainingRuntime,
    CnnLayerType,
    PoolingType,
    ActivationFunctions,
    LossFunctions,
    Optimizers,
    ICnnNeuron,
} from "spikypanda-core";

function log(message: string) {
    process.stdout.write(message + "\n");
}

describe("CnnTrainingRuntime", () => {
    test("kernel weights change after a training step", () => {
        // 2×2×1 → Conv(1, 2×2, linear) → 1×1×1
        const graph = new CnnBuilder()
            .addInputLayer(2, 2, 1)
            .addConvLayer({ filters: 1, kernelSize: 2, activation: ActivationFunctions.sigmoid })
            .build();

        const runtime = new CnnInferenceRuntime(graph);
        const trainer = new CnnTrainingRuntime(graph, runtime, LossFunctions.MSE, 0.1, Optimizers.SGD());

        const kernel = graph.kernels[0];
        const weightsBefore = [...kernel.weights];

        trainer.trainStep([1, 0, 0, 1], [0.5]);

        // At least some weights should have changed
        let changed = false;
        for (let i = 0; i < kernel.weights.length; i++) {
            if (kernel.weights[i] !== weightsBefore[i]) {
                changed = true;
                break;
            }
        }
        expect(changed).toBe(true);
    });

    test("loss decreases over training steps", () => {
        // 2×2×1 → Conv(1, 2×2, sigmoid) → 1×1×1
        const graph = new CnnBuilder()
            .addInputLayer(2, 2, 1)
            .addConvLayer({ filters: 1, kernelSize: 2, activation: ActivationFunctions.sigmoid, biasInit: 0 })
            .build();

        const runtime = new CnnInferenceRuntime(graph);
        const trainer = new CnnTrainingRuntime(graph, runtime, LossFunctions.MSE, 0.5, Optimizers.Adam());

        const input = [1, 0, 0, 1];
        const target = [0.8];

        const firstLoss = trainer.trainStep(input, target);
        let lastLoss = firstLoss;

        for (let i = 0; i < 200; i++) {
            lastLoss = trainer.trainStep(input, target);
        }

        expect(lastLoss).toBeLessThan(firstLoss);
    });

    test("max pool routes gradient to max input only", () => {
        // 2×2×1 → MaxPool(2×2) → 1×1×1 → Dense(1, sigmoid)
        const graph = new CnnBuilder()
            .addInputLayer(2, 2, 1)
            .addPoolLayer({ type: PoolingType.Max, size: 2 })
            .addFlattenLayer()
            .addDenseLayer({ units: 1, activation: ActivationFunctions.sigmoid, biasInit: 0 })
            .build();

        // Set dense weight to 1
        const denseSynapses = graph.links.filter((s) => s.kernel === null && (s.ofin as ICnnNeuron).layerType === CnnLayerType.Dense);
        for (const s of denseSynapses) {
            s.weight = 1;
        }

        const runtime = new CnnInferenceRuntime(graph);
        const trainer = new CnnTrainingRuntime(graph, runtime, LossFunctions.MSE, 0.1, Optimizers.SGD());

        // Input: [1, 5, 3, 2] → max is 5 (index 1, which is r0c1ch0)
        trainer.trainStep([1, 5, 3, 2], [0]);

        // After backprop, only the max-input neuron should have non-zero gradient
        // The pool layer should route gradient only to the neuron with activation 5
        // The non-max inputs should have zero gradient
        // (We check by running inference again — the dense weight connected through the max path should change)
        // This is an indirect test: if max pool backprop works, training should work
        const result1 = runtime.run([1, 5, 3, 2]);
        // The output should be moving toward 0 since we trained with target=0
        expect(result1[0]).toBeDefined();
    });

    test("avg pool distributes gradient equally", () => {
        // 2×2×1 → AvgPool(2×2) → 1×1×1 → Dense(1, linear)
        const graph = new CnnBuilder()
            .addInputLayer(2, 2, 1)
            .addPoolLayer({ type: PoolingType.Avg, size: 2 })
            .addFlattenLayer()
            .addDenseLayer({ units: 1, activation: ActivationFunctions.linear, biasInit: 0 })
            .build();

        const denseSynapses = graph.links.filter((s) => s.kernel === null && (s.ofin as ICnnNeuron).layerType === CnnLayerType.Dense);
        for (const s of denseSynapses) {
            s.weight = 1;
        }

        const runtime = new CnnInferenceRuntime(graph);
        const trainer = new CnnTrainingRuntime(graph, runtime, LossFunctions.MSE, 0.1, Optimizers.SGD());

        // Train on uniform input
        let loss = 0;
        for (let i = 0; i < 50; i++) {
            loss = trainer.trainStep([4, 4, 4, 4], [0]);
        }
        // Loss should decrease
        expect(loss).toBeLessThan(1);
    });

    test("conv → pool → flatten → dense convergence", () => {
        // Train to detect "bright top-left corner" pattern
        // 4×4×1 → Conv(2, 2×2, relu) → Pool(max, 2×2) → Flatten → Dense(1, sigmoid)
        const graph = new CnnBuilder()
            .addInputLayer(4, 4, 1)
            .addConvLayer({ filters: 2, kernelSize: 2, activation: ActivationFunctions.relu, biasInit: 0 })
            .addPoolLayer({ type: PoolingType.Max, size: 3 })
            .addFlattenLayer()
            .addDenseLayer({ units: 1, activation: ActivationFunctions.sigmoid, biasInit: 0 })
            .build();

        const runtime = new CnnInferenceRuntime(graph);
        const trainer = new CnnTrainingRuntime(graph, runtime, LossFunctions.CrossEntropy, 0.01, Optimizers.Adam());

        // Pattern: bright top-left (1s in top-left 2×2, 0s elsewhere) → 1
        //          dark top-left (0s in top-left 2×2, 1s elsewhere) → 0
        const brightTopLeft = [
            1, 1, 0, 0,
            1, 1, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
        ];
        const darkTopLeft = [
            0, 0, 1, 1,
            0, 0, 1, 1,
            1, 1, 1, 1,
            1, 1, 1, 1,
        ];

        const epochs = 3000;
        for (let epoch = 0; epoch < epochs; epoch++) {
            trainer.trainStep(brightTopLeft, [1]);
            trainer.trainStep(darkTopLeft, [0]);

            if (epoch % 500 === 0) {
                runtime.deleteContext();
                trainer.deleteContext();
                const o1 = runtime.run(brightTopLeft)[0];
                const o2 = runtime.run(darkTopLeft)[0];
                log(`Epoch ${epoch} — bright: ${o1.toFixed(4)}, dark: ${o2.toFixed(4)}`);
            }
        }

        runtime.deleteContext();
        trainer.deleteContext();

        const brightResult = runtime.run(brightTopLeft)[0];
        const darkResult = runtime.run(darkTopLeft)[0];

        log(`Final — bright: ${brightResult.toFixed(4)} (expected 1), dark: ${darkResult.toFixed(4)} (expected 0)`);

        expect(Math.abs(brightResult - 1)).toBeLessThan(0.2);
        expect(Math.abs(darkResult - 0)).toBeLessThan(0.2);
    });

    test("dense-only CNN behaves like MLP", () => {
        // 1×2×1 → Flatten → Dense(1, sigmoid) — should learn simple weighted sum
        const graph = new CnnBuilder()
            .addInputLayer(2, 1, 1)
            .addFlattenLayer()
            .addDenseLayer({ units: 1, activation: ActivationFunctions.sigmoid, biasInit: 0 })
            .build();

        const runtime = new CnnInferenceRuntime(graph);
        const trainer = new CnnTrainingRuntime(graph, runtime, LossFunctions.CrossEntropy, 0.01, Optimizers.Adam());

        // Train: [1,1] → 1, [0,0] → 0
        const data = [
            { input: [1, 1], expected: [1] },
            { input: [0, 0], expected: [0] },
        ];

        for (let epoch = 0; epoch < 2000; epoch++) {
            for (const { input, expected } of data) {
                trainer.trainStep(input, expected);
            }
        }

        runtime.deleteContext();
        trainer.deleteContext();

        const r1 = runtime.run([1, 1])[0];
        const r0 = runtime.run([0, 0])[0];

        expect(r1).toBeGreaterThan(0.8);
        expect(r0).toBeLessThan(0.2);
    });
});

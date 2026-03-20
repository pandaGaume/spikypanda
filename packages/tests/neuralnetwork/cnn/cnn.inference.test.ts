import { CnnBuilder, CnnInferenceRuntime, CnnLayerType, PoolingType, ActivationFunctions, ICnnNeuron } from "spikypanda-core";

describe("CnnInferenceRuntime", () => {
    test("conv layer computes correct weighted sum with known weights", () => {
        // Build a minimal CNN: 2×2×1 input → Conv(1 filter, 2×2, linear activation) → 1×1×1 output
        // This way we can verify the exact convolution computation.
        const graph = new CnnBuilder().addInputLayer(2, 2, 1).addConvLayer({ filters: 1, kernelSize: 2, activation: ActivationFunctions.linear }).build();

        // Set kernel weights manually: [1, 2, 3, 4] (row-major)
        // Kernel index layout: ic*kH*kW + kr*kW + kc
        // For 1 input channel, 2×2 kernel: [0,0]=0, [0,1]=1, [1,0]=2, [1,1]=3
        const kernel = graph.kernels[0];
        kernel.weights[0] = 1;
        kernel.weights[1] = 2;
        kernel.weights[2] = 3;
        kernel.weights[3] = 4;
        kernel.bias = 0;

        // Update bias on the conv neuron too
        const convNeurons = graph.layerDescriptors[1].neurons;
        for (const n of convNeurons) {
            n.bias = 0;
        }

        const runtime = new CnnInferenceRuntime(graph);

        // Input (channel-major, row-major): [r0c0, r0c1, r1c0, r1c1] = [1, 0, 0, 1]
        // Conv output = 1*1 + 0*2 + 0*3 + 1*4 = 5
        const result = runtime.run([1, 0, 0, 1]);
        expect(result.length).toBe(1);
        expect(result[0]).toBeCloseTo(5, 5);
    });

    test("conv layer applies bias correctly", () => {
        const graph = new CnnBuilder().addInputLayer(2, 2, 1).addConvLayer({ filters: 1, kernelSize: 2, activation: ActivationFunctions.linear, biasInit: 10 }).build();

        const kernel = graph.kernels[0];
        kernel.weights[0] = 1;
        kernel.weights[1] = 1;
        kernel.weights[2] = 1;
        kernel.weights[3] = 1;

        const runtime = new CnnInferenceRuntime(graph);
        // sum = 1+1+1+1 = 4, + bias 10 = 14
        const result = runtime.run([1, 1, 1, 1]);
        expect(result[0]).toBeCloseTo(14, 5);
    });

    test("max pooling selects maximum value", () => {
        // 2×2×1 input → MaxPool(2×2) → 1×1×1
        const graph = new CnnBuilder().addInputLayer(2, 2, 1).addPoolLayer({ type: PoolingType.Max, size: 2 }).build();

        const runtime = new CnnInferenceRuntime(graph);
        const result = runtime.run([3, 7, 1, 5]);
        expect(result[0]).toBeCloseTo(7, 5);
    });

    test("avg pooling computes average", () => {
        // 2×2×1 input → AvgPool(2×2) → 1×1×1
        const graph = new CnnBuilder().addInputLayer(2, 2, 1).addPoolLayer({ type: PoolingType.Avg, size: 2 }).build();

        const runtime = new CnnInferenceRuntime(graph);
        const result = runtime.run([2, 4, 6, 8]);
        expect(result[0]).toBeCloseTo(5, 5); // (2+4+6+8)/4 = 5
    });

    test("flatten preserves values", () => {
        // 2×2×1 input → Flatten → 4 outputs
        const graph = new CnnBuilder().addInputLayer(2, 2, 1).addFlattenLayer().build();

        const runtime = new CnnInferenceRuntime(graph);
        const result = runtime.run([1, 2, 3, 4]);
        expect(result).toEqual([1, 2, 3, 4]);
    });

    test("dense layer computes weighted sum", () => {
        // 1×2×1 input → Dense(1, linear) → weighted sum
        const graph = new CnnBuilder().addInputLayer(2, 1, 1).addFlattenLayer().addDenseLayer({ units: 1, activation: ActivationFunctions.linear, biasInit: 0 }).build();

        // Manually set dense synapse weights
        const denseSynapses = graph.links.filter((s) => s.kernel === null && (s.ofin as ICnnNeuron).layerType === CnnLayerType.Dense);
        // Set weights to [3, 5]
        denseSynapses[0].weight = 3;
        denseSynapses[1].weight = 5;

        const runtime = new CnnInferenceRuntime(graph);
        // output = 2*3 + 4*5 = 6 + 20 = 26
        const result = runtime.run([2, 4]);
        expect(result[0]).toBeCloseTo(26, 5);
    });

    test("end-to-end: conv → pool → flatten → dense", () => {
        // 4×4×1 → Conv(1 filter, 2×2, linear) → 3×3×1 → MaxPool(3×3) → 1×1×1 → Flatten → Dense(1, linear)
        const graph = new CnnBuilder()
            .addInputLayer(4, 4, 1)
            .addConvLayer({ filters: 1, kernelSize: 2, activation: ActivationFunctions.linear, biasInit: 0 })
            .addPoolLayer({ type: PoolingType.Max, size: 3 })
            .addFlattenLayer()
            .addDenseLayer({ units: 1, activation: ActivationFunctions.linear, biasInit: 0 })
            .build();

        // Set all kernel weights to 1 (sum of 2×2 patch)
        const kernel = graph.kernels[0];
        for (let i = 0; i < kernel.weights.length; i++) {
            kernel.weights[i] = 1;
        }
        // Set conv neuron biases to 0
        for (const n of graph.layerDescriptors[1].neurons) {
            n.bias = 0;
        }

        // Set dense weight to 1
        const denseSynapses = graph.links.filter((s) => s.kernel === null && (s.ofin as ICnnNeuron).layerType === CnnLayerType.Dense);
        for (const s of denseSynapses) {
            s.weight = 1;
        }

        const runtime = new CnnInferenceRuntime(graph);

        // Input: 4×4 grid of all 1s
        const input = new Array(16).fill(1);
        // Conv output: each 2×2 patch sums to 4, so 3×3 grid of 4s
        // MaxPool(3×3): max of nine 4s = 4
        // Flatten: [4]
        // Dense: 4 * 1 = 4
        const result = runtime.run(input);
        expect(result[0]).toBeCloseTo(4, 5);
    });

    test("relu activation is applied in conv layer", () => {
        const graph = new CnnBuilder().addInputLayer(2, 2, 1).addConvLayer({ filters: 1, kernelSize: 2, activation: ActivationFunctions.relu, biasInit: 0 }).build();

        const kernel = graph.kernels[0];
        kernel.weights[0] = 1;
        kernel.weights[1] = 1;
        kernel.weights[2] = 1;
        kernel.weights[3] = 1;

        for (const n of graph.layerDescriptors[1].neurons) {
            n.bias = 0;
        }

        const runtime = new CnnInferenceRuntime(graph);

        // Negative sum: [-1, -1, -1, -1] → sum = -4 → relu(-4) = 0
        expect(runtime.run([-1, -1, -1, -1])[0]).toBeCloseTo(0, 5);

        // Positive sum: [1, 1, 1, 1] → sum = 4 → relu(4) = 4
        expect(runtime.run([1, 1, 1, 1])[0]).toBeCloseTo(4, 5);
    });

    test("multiple runs produce consistent results", () => {
        const graph = new CnnBuilder().addInputLayer(2, 2, 1).addPoolLayer({ type: PoolingType.Max, size: 2 }).build();

        const runtime = new CnnInferenceRuntime(graph);
        const r1 = runtime.run([1, 5, 3, 2]);
        const r2 = runtime.run([1, 5, 3, 2]);
        expect(r1[0]).toBe(r2[0]);
        expect(r1[0]).toBeCloseTo(5, 5);
    });
});

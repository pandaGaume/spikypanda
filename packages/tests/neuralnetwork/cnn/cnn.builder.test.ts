import { CnnBuilder, CnnLayerType, PoolingType, PaddingType, ActivationFunctions } from "spikypanda-core";

describe("CnnBuilder", () => {
    test("builds a simple CNN with correct neuron counts", () => {
        // Input: 4×4×1 → Conv(2 filters, 3×3) → 2×2×2 → Flatten → 8 → Dense(2)
        const graph = new CnnBuilder()
            .addInputLayer(4, 4, 1)
            .addConvLayer({ filters: 2, kernelSize: 3, activation: ActivationFunctions.relu })
            .addFlattenLayer()
            .addDenseLayer({ units: 2, activation: ActivationFunctions.linear })
            .build();

        // Input: 4×4×1 = 16 neurons
        expect(graph.inputs.length).toBe(16);

        // Conv output: floor((4-3)/1)+1 = 2 → 2×2×2 = 8 neurons
        // Flatten: 8 neurons
        // Dense: 2 neurons
        // Total: 16 + 8 + 8 + 2 = 34
        expect(graph.nodes.length).toBe(34);

        // Output layer is the dense layer with 2 neurons
        expect(graph.outputs.length).toBe(2);

        // 2 kernels (one per filter)
        expect(graph.kernels.length).toBe(2);

        // Layer descriptors
        expect(graph.layerDescriptors.length).toBe(4);
        expect(graph.layerDescriptors[0].type).toBe(CnnLayerType.Input);
        expect(graph.layerDescriptors[1].type).toBe(CnnLayerType.Conv);
        expect(graph.layerDescriptors[2].type).toBe(CnnLayerType.Flatten);
        expect(graph.layerDescriptors[3].type).toBe(CnnLayerType.Dense);
    });

    test("computes conv output dimensions correctly", () => {
        // Input: 6×6×1 → Conv(1 filter, 3×3, stride 2) → floor((6-3)/2)+1 = 2 → 2×2×1
        const graph = new CnnBuilder().addInputLayer(6, 6, 1).addConvLayer({ filters: 1, kernelSize: 3, stride: 2, activation: ActivationFunctions.relu }).build();

        const convDesc = graph.layerDescriptors[1];
        expect(convDesc.width).toBe(2);
        expect(convDesc.height).toBe(2);
        expect(convDesc.channels).toBe(1);
        expect(convDesc.neurons.length).toBe(4);
    });

    test("computes pool output dimensions correctly", () => {
        // Input: 4×4×1 → Pool(max, 2×2, stride 2) → 2×2×1
        const graph = new CnnBuilder().addInputLayer(4, 4, 1).addPoolLayer({ type: PoolingType.Max, size: 2, stride: 2 }).build();

        const poolDesc = graph.layerDescriptors[1];
        expect(poolDesc.width).toBe(2);
        expect(poolDesc.height).toBe(2);
        expect(poolDesc.channels).toBe(1);
        expect(poolDesc.neurons.length).toBe(4);
    });

    test("pool preserves channel count", () => {
        // Input: 4×4×3 → Pool(max, 2×2) → 2×2×3
        const graph = new CnnBuilder().addInputLayer(4, 4, 3).addPoolLayer({ type: PoolingType.Max, size: 2, stride: 2 }).build();

        const poolDesc = graph.layerDescriptors[1];
        expect(poolDesc.channels).toBe(3);
        expect(poolDesc.neurons.length).toBe(12); // 2×2×3
    });

    test("conv synapse count is correct", () => {
        // Input: 3×3×1, Conv(1 filter, 2×2) → 2×2×1
        // Each of 4 output neurons connects to a 2×2 receptive field → 4 synapses each → 16 total
        const graph = new CnnBuilder().addInputLayer(3, 3, 1).addConvLayer({ filters: 1, kernelSize: 2, activation: ActivationFunctions.relu }).build();

        // Conv synapses: 4 output neurons × 4 (2×2×1) = 16
        expect(graph.links.length).toBe(16);
    });

    test("kernels share weights across spatial positions", () => {
        // Input: 3×3×1, Conv(1 filter, 2×2) → 2×2×1
        const graph = new CnnBuilder().addInputLayer(3, 3, 1).addConvLayer({ filters: 1, kernelSize: 2, activation: ActivationFunctions.relu }).build();

        // All 16 synapses should reference the same kernel
        const kernel = graph.kernels[0];
        expect(kernel.weights.length).toBe(4); // 2×2×1
        const convSynapses = graph.links.filter((s) => s.kernel !== null);
        expect(convSynapses.length).toBe(16);
        for (const syn of convSynapses) {
            expect(syn.kernel).toBe(kernel);
        }
    });

    test("same-padding keeps spatial dimensions", () => {
        // Input: 5×5×1 → Conv(1 filter, 3×3, padding=same) → 5×5×1
        const graph = new CnnBuilder().addInputLayer(5, 5, 1).addConvLayer({ filters: 1, kernelSize: 3, padding: PaddingType.Same, activation: ActivationFunctions.relu }).build();

        const convDesc = graph.layerDescriptors[1];
        expect(convDesc.width).toBe(5);
        expect(convDesc.height).toBe(5);
    });

    test("flatten produces correct total units", () => {
        // Input: 4×4×2 → Flatten → 32 neurons
        const graph = new CnnBuilder().addInputLayer(4, 4, 2).addFlattenLayer().build();

        const flattenDesc = graph.layerDescriptors[1];
        expect(flattenDesc.width).toBe(32);
        expect(flattenDesc.neurons.length).toBe(32);
    });

    test("multi-channel conv uses correct kernel size", () => {
        // Input: 4×4×3, Conv(2 filters, 3×3) → kernels are 3×3×3 = 27 weights each
        const graph = new CnnBuilder().addInputLayer(4, 4, 3).addConvLayer({ filters: 2, kernelSize: 3, activation: ActivationFunctions.relu }).build();

        expect(graph.kernels.length).toBe(2);
        expect(graph.kernels[0].weights.length).toBe(27); // 3×3×3
        expect(graph.kernels[1].weights.length).toBe(27);
    });
});

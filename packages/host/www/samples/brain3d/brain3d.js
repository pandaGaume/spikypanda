// SpikyPanda — Brain 3D Visualizer
(function () {
    const S = SpikypandaCore;

    // DOM refs
    const canvas = document.getElementById("renderCanvas");
    const logEl = document.getElementById("log");
    const infoEl = document.getElementById("infoPanel");
    const outputEl = document.getElementById("outputValue");
    const btnTrain = document.getElementById("btnTrain");
    const btnRun = document.getElementById("btnRun");
    const toggle0 = document.getElementById("toggle0");
    const toggle1 = document.getElementById("toggle1");

    let graph = null;
    let runtime = null;
    let trainer = null;

    // Neuron layout positions (computed)
    const neuronPos = new Map(); // neuron -> {x, y, z}
    let neuronMeshes = []; // one mesh per neuron
    let lineSystem = null;
    let scene = null;
    let engine = null;

    // ====================== LOGGING ======================
    function log(msg) {
        logEl.textContent += msg + "\n";
        logEl.scrollTop = logEl.scrollHeight;
    }

    // ====================== BUILD GRAPH ======================
    function buildXorGraph() {
        const i1 = new S.MlpNeuron(0, S.ActivationFunctions.linear);
        const i2 = new S.MlpNeuron(0, S.ActivationFunctions.linear);
        const h1 = new S.MlpNeuron(0, S.ActivationFunctions.tanh);
        const h2 = new S.MlpNeuron(0, S.ActivationFunctions.tanh);
        const o1 = new S.MlpNeuron(0, S.ActivationFunctions.sigmoid);

        const synapses = [
            new S.Synapse(i1, h1, S.WeightInit.He(2)),
            new S.Synapse(i2, h1, S.WeightInit.He(2)),
            new S.Synapse(i1, h2, S.WeightInit.He(2)),
            new S.Synapse(i2, h2, S.WeightInit.He(2)),
            new S.Synapse(h1, o1, S.WeightInit.He(2)),
            new S.Synapse(h2, o1, S.WeightInit.He(2)),
        ];

        const neurons = [i1, i2, h1, h2, o1];
        graph = new S.MlpGraph(neurons, synapses);
        runtime = new S.MLPInferenceRuntime(graph);
        trainer = new S.MLPTrainingRuntime(
            graph, runtime, S.LossFunctions.MSE, 0.1, S.Optimizers.Adam()
        );

        // Tag neurons for display
        i1._label = "In 0"; i2._label = "In 1";
        h1._label = "Hidden 0"; h2._label = "Hidden 1";
        o1._label = "Output";

        log(`Built XOR: ${graph.nodes.length} neurons, ${graph.links.length} synapses`);
    }

    // ====================== LAYOUT ======================
    function layoutNeurons() {
        // Detect layers: inputs, hiddens, outputs
        const layers = [
            graph.inputs.slice(),
            graph.hiddens.slice(),
            graph.outputs.slice(),
        ];
        const layerNames = ["Input", "Hidden", "Output"];
        const layerSpacing = 4;

        neuronPos.clear();
        for (let l = 0; l < layers.length; l++) {
            const neurons = layers[l];
            const spread = (neurons.length - 1) * 2;
            for (let i = 0; i < neurons.length; i++) {
                neuronPos.set(neurons[i], {
                    x: (i * 2) - spread / 2,
                    y: 0,
                    z: l * layerSpacing,
                });
                neurons[i]._layerName = layerNames[l];
                neurons[i]._layerIndex = i;
            }
        }
    }

    // ====================== COLORS ======================
    function activationToColor(activation, isInput) {
        // All neurons have a minimum visible brightness
        if (isInput) {
            // Input: orange when 0, bright cyan when 1
            if (activation > 0.5) {
                return { r: 0, g: 0.85, b: 1, a: 1 };    // bright cyan = ON
            } else {
                return { r: 0.6, g: 0.3, b: 0, a: 1 };   // orange = OFF
            }
        }
        // Map activation through sigmoid-like range to get full color spread
        // tanh output is [-1, 1], sigmoid is [0, 1]
        const v = Math.max(-1, Math.min(1, activation));
        if (v >= 0) {
            // 0 → dim cyan, 1 → bright green
            const t = v;
            return { r: 0.1, g: 0.3 + t * 0.7, b: 0.4 + t * 0.2, a: 1 };
        } else {
            // 0 → dim cyan, -1 → bright red
            const t = -v;
            return { r: 0.3 + t * 0.7, g: 0.15, b: 0.2 + t * 0.1, a: 1 };
        }
    }

    function weightToColor(weight) {
        const maxW = 5;
        const t = Math.min(Math.abs(weight) / maxW, 1);
        if (weight >= 0) {
            // Cyan/green — always bright
            return new BABYLON.Color4(0.2, 0.5 + t * 0.5, 0.6 + t * 0.4, 1);
        } else {
            // Orange/yellow — always bright (NOT red on dark bg)
            return new BABYLON.Color4(0.8 + t * 0.2, 0.4 + t * 0.3, 0.1, 1);
        }
    }

    // ====================== 3D SCENE ======================
    function createScene() {
        engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
        });

        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.04, 0.04, 0.07, 1); // #0a0a12

        // Camera
        const camera = new BABYLON.ArcRotateCamera(
            "cam", -Math.PI / 2, Math.PI / 3, 14,
            new BABYLON.Vector3(0, 0, 4), scene
        );
        camera.attachControl(canvas, true);
        camera.wheelPrecision = 20;
        camera.lowerRadiusLimit = 5;
        camera.upperRadiusLimit = 40;

        // Light
        const light = new BABYLON.HemisphericLight(
            "light", new BABYLON.Vector3(0.3, 1, 0.5), scene
        );
        light.intensity = 1.2;
        light.groundColor = new BABYLON.Color3(0.1, 0.1, 0.2);

        return scene;
    }

    function buildNeuronMeshes() {
        // Dispose old meshes
        for (const m of neuronMeshes) m.dispose();
        neuronMeshes = [];

        const neurons = graph.nodes;

        for (let i = 0; i < neurons.length; i++) {
            const pos = neuronPos.get(neurons[i]);
            const mesh = BABYLON.MeshBuilder.CreateSphere("neuron_" + i, {
                diameter: 0.7,
                segments: 8,
            }, scene);

            mesh.position = new BABYLON.Vector3(pos.x, pos.y, pos.z);

            const mat = new BABYLON.StandardMaterial("neuronMat_" + i, scene);
            mat.emissiveColor = new BABYLON.Color3(0, 0.6, 0.8);
            mat.diffuseColor = new BABYLON.Color3(0, 0.6, 0.8);
            mat.backFaceCulling = false;
            mesh.material = mat;

            mesh.isPickable = true;
            mesh._neuronIndex = i;

            neuronMeshes.push(mesh);
        }
    }

    function buildSynapseMeshes() {
        if (lineSystem) lineSystem.dispose();

        const lines = [];
        const colors = [];

        for (const syn of graph.links) {
            const srcPos = neuronPos.get(syn.oini);
            const tgtPos = neuronPos.get(syn.ofin);

            const c = weightToColor(syn.weight);
            lines.push([
                new BABYLON.Vector3(srcPos.x, srcPos.y, srcPos.z),
                new BABYLON.Vector3(tgtPos.x, tgtPos.y, tgtPos.z),
            ]);
            colors.push([c, c]);
        }

        lineSystem = BABYLON.MeshBuilder.CreateLineSystem("synapses", {
            lines: lines,
            colors: colors,
            updatable: true,
        }, scene);
        lineSystem.isPickable = false;
    }

    function updateNeuronColors() {
        const neurons = graph.nodes;

        for (let i = 0; i < neurons.length; i++) {
            const n = neurons[i];
            const bag = n.bag;
            const activation = bag ? bag.activation || 0 : 0;
            const isInput = graph.inputs.includes(n);
            const c = activationToColor(activation, isInput);
            const mat = neuronMeshes[i].material;
            mat.emissiveColor = new BABYLON.Color3(c.r, c.g, c.b);
            mat.diffuseColor = new BABYLON.Color3(c.r, c.g, c.b);
        }
    }

    function updateSynapseColors() {
        const lines = [];
        const colors = [];

        for (const syn of graph.links) {
            const srcPos = neuronPos.get(syn.oini);
            const tgtPos = neuronPos.get(syn.ofin);
            const c = weightToColor(syn.weight);

            lines.push([
                new BABYLON.Vector3(srcPos.x, srcPos.y, srcPos.z),
                new BABYLON.Vector3(tgtPos.x, tgtPos.y, tgtPos.z),
            ]);
            colors.push([c, c]);
        }

        lineSystem = BABYLON.MeshBuilder.CreateLineSystem("synapses", {
            lines: lines,
            colors: colors,
            instance: lineSystem,
        });
    }

    // ====================== LABELS ======================
    function addLabels() {
        // Add text labels for each neuron using dynamic textures on planes
        const neurons = graph.nodes;
        for (const n of neurons) {
            const pos = neuronPos.get(n);
            const label = n._label || "?";

            const plane = BABYLON.MeshBuilder.CreatePlane("label_" + label, {
                width: 1.6, height: 0.4,
            }, scene);
            plane.position = new BABYLON.Vector3(pos.x, pos.y - 0.7, pos.z);
            plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

            const tex = new BABYLON.DynamicTexture("dtex_" + label, {
                width: 256, height: 64,
            }, scene, false);
            tex.hasAlpha = true;
            const texCtx = tex.getContext();
            texCtx.clearRect(0, 0, 256, 64);
            texCtx.font = "bold 28px Segoe UI";
            texCtx.fillStyle = "#aaaaaa";
            texCtx.textAlign = "center";
            texCtx.fillText(label, 128, 40);
            tex.update();

            const mat = new BABYLON.StandardMaterial("labelMat_" + label, scene);
            mat.diffuseTexture = tex;
            mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
            mat.backFaceCulling = false;
            mat.useAlphaFromDiffuseTexture = true;
            plane.material = mat;
            plane.isPickable = false;
        }
    }

    // ====================== INTERACTION ======================
    function getInputValues() {
        const v0 = toggle0.classList.contains("active") ? 1 : 0;
        const v1 = toggle1.classList.contains("active") ? 1 : 0;
        return [v0, v1];
    }

    function runInference() {
        const inputs = getInputValues();
        runtime.deleteContext();
        const outputs = runtime.run(inputs);
        const out = outputs[0];

        updateNeuronColors();
        outputEl.textContent = out.toFixed(4);

        // Color output value
        if (out > 0.5) {
            outputEl.style.color = "#4f4";
        } else {
            outputEl.style.color = "#f44";
        }

        log(`XOR(${inputs[0]}, ${inputs[1]}) = ${out.toFixed(4)}`);
    }

    async function train() {
        btnTrain.disabled = true;
        btnRun.disabled = true;

        const xorData = [
            { input: [0, 0], expected: [0] },
            { input: [0, 1], expected: [1] },
            { input: [1, 0], expected: [1] },
            { input: [1, 1], expected: [0] },
        ];

        const epochs = 5000;
        log("Training XOR...");

        for (let i = 0; i < epochs; i++) {
            let totalLoss = 0;
            for (const sample of xorData) {
                totalLoss += trainer.trainStep(sample.input, sample.expected);
            }

            if ((i + 1) % 500 === 0) {
                const avg = totalLoss / xorData.length;
                log(`  Epoch ${i + 1} - Loss: ${avg.toFixed(6)}`);
                updateSynapseColors();
                await new Promise(r => setTimeout(r, 0));
            }
        }

        // Run all XOR combinations
        log("Results:");
        for (const sample of xorData) {
            runtime.deleteContext();
            const out = runtime.run(sample.input);
            log(`  XOR(${sample.input}) = ${out[0].toFixed(4)} (expected ${sample.expected[0]})`);
        }

        updateSynapseColors();
        runInference();

        btnTrain.disabled = false;
        btnRun.disabled = false;
        log("Training complete.");
    }

    function showNeuronInfo(neuron) {
        const bag = neuron.bag;
        const activation = bag ? (bag.activation || 0).toFixed(4) : "N/A";
        const bias = neuron.bias.toFixed(4);
        const afn = neuron.activationFn ?
            Object.keys(S.ActivationFunctions).find(k => S.ActivationFunctions[k] === neuron.activationFn) || "custom"
            : "default";
        const inCount = (neuron.opsc() || []).length;
        const outCount = (neuron.onsc() || []).length;

        infoEl.textContent =
            `${neuron._label || "Neuron"} (${neuron._layerName} layer)\n` +
            `Activation: ${activation}  |  Bias: ${bias}  |  Fn: ${afn}\n` +
            `Inputs: ${inCount}  |  Outputs: ${outCount}`;
    }

    // ====================== INIT ======================
    function init() {
        buildXorGraph();
        layoutNeurons();
        createScene();
        buildNeuronMeshes();
        buildSynapseMeshes();
        addLabels();

        // Input toggles
        toggle0.addEventListener("click", () => {
            toggle0.classList.toggle("active");
            runInference();
        });
        toggle1.addEventListener("click", () => {
            toggle1.classList.toggle("active");
            runInference();
        });

        // Buttons
        btnTrain.addEventListener("click", train);
        btnRun.addEventListener("click", runInference);

        // Click to select neuron
        scene.onPointerDown = function (evt) {
            const pickResult = scene.pick(scene.pointerX, scene.pointerY);
            if (pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh._neuronIndex !== undefined) {
                showNeuronInfo(graph.nodes[pickResult.pickedMesh._neuronIndex]);
            }
        };

        // Render loop
        engine.runRenderLoop(() => scene.render());

        // Resize
        window.addEventListener("resize", () => engine.resize());

        log("Ready. Click Train to learn XOR, then toggle inputs.");
    }

    // Wait for BabylonJS to load
    if (typeof BABYLON !== "undefined") {
        init();
    } else {
        window.addEventListener("load", init);
    }
})();

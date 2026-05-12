import * as fs from "fs";
import * as path from "path";
import { OnnxParser } from "../../dev/onnx/src/onnx/onnx-parser";

const MODEL_PATH = path.resolve(
    __dirname, "../../../", "../CyanMycelium/models/imu/model_embed.onnx",
);

// External fixture (sibling CyanMycelium repo). Skip cleanly when absent.
const HAS_MODEL = fs.existsSync(MODEL_PATH);
const describeIf = HAS_MODEL ? describe : describe.skip;

describeIf("ONNX Shape Analysis", () => {
    it("should dump all shapes", () => {
        const bytes = new Uint8Array(fs.readFileSync(MODEL_PATH));
        const result = OnnxParser.parse(bytes)!;

        console.log("=== INPUTS ===");
        for (const i of result.inputs) {
            const isInit = result.initializers.some(init => init.name === i.name);
            console.log(`  ${i.name}: shape=[${i.shape}] ${isInit ? "(initializer)" : "(external)"}`);
        }

        console.log("\n=== INITIALIZERS ===");
        for (const i of result.initializers) {
            console.log(`  ${i.name}: dims=[${i.dims}] dtype=${i.dataType} bytes=${i.rawData?.length ?? 0} floats=${i.floatData?.length ?? 0}`);
        }

        console.log("\n=== NODES ===");
        for (const n of result.nodes) {
            const attrs = [...n.attributes.entries()].map(([k,v]) => `${k}=${v}`).join(", ");
            console.log(`  ${n.opType}(${n.name || "?"}) inputs=[${n.inputs}] outputs=[${n.outputs}] attrs={${attrs}}`);
        }

        console.log("\n=== OUTPUTS ===");
        for (const o of result.outputs) {
            console.log(`  ${o.name}: shape=[${o.shape}]`);
        }

        console.log("\n=== VALUE INFOS ===");
        for (const v of result.valueInfos) {
            console.log(`  ${v.name}: shape=[${v.shape}]`);
        }
    });
});

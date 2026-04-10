"""
Validate an exported motor_current_lstm.onnx model.

Loads the ONNX file, skips the custom EnvelopeRMS preprocessing op,
feeds preprocessed envelope windows directly to the LSTM, and compares
the output against the test.json data.

The custom op "com.dotvision.EnvelopeRMS" is not executed here; it is
only validated as present in the graph. On the ESP32 / CyanMycelium
runtime, the C implementation of this op handles the raw-to-envelope
conversion.

Usage:
    python validate_onnx_export.py \
        --model motor_current_lstm.onnx \
        --test-data ../../host/www/data/motor_current/test.json

Requires: pip install onnx onnxruntime numpy
"""

import os
import sys
import json
import argparse
import numpy as np


def inspect_model(model_path):
    """Print the ONNX graph structure."""
    import onnx
    model = onnx.load(model_path)
    graph = model.graph

    print(f"Model: {model_path}")
    print(f"IR version: {model.ir_version}")
    print(f"Graph: {graph.name}")
    print(f"Nodes: {len(graph.node)}")

    print("\nNodes:")
    for node in graph.node:
        attrs = {a.name: (a.i if a.type == 2 else a.f) for a in node.attribute}
        print(f"  {node.name:20s} | {node.op_type:30s} | "
              f"in={list(node.input)} out={list(node.output)}")
        if attrs:
            print(f"  {'':20s} | attrs: {attrs}")

    print("\nInputs:")
    for inp in graph.input:
        shape = [d.dim_value for d in inp.type.tensor_type.shape.dim]
        print(f"  {inp.name:20s} | shape={shape}")

    print("\nOutputs:")
    for out in graph.output:
        shape = [d.dim_value for d in out.type.tensor_type.shape.dim]
        print(f"  {out.name:20s} | shape={shape}")

    print("\nInitializers:")
    for init in graph.initializer:
        print(f"  {init.name:20s} | shape={list(init.dims)} | "
              f"dtype={init.data_type}")

    # Check for custom op
    custom_ops = [n for n in graph.node if "." in n.op_type]
    if custom_ops:
        print("\nCustom ops found:")
        for n in custom_ops:
            attrs = {a.name: (a.i if a.type == 2 else a.f) for a in n.attribute}
            print(f"  {n.op_type}: {attrs}")

    return model


def run_inference(model_path, test_data_path):
    """Run the LSTM portion of the model on test data.

    The custom EnvelopeRMS op is not supported by onnxruntime, so we
    modify the graph to remove it and feed envelope data directly to
    the LSTM input.
    """
    import onnx
    from onnx import helper, TensorProto
    import onnxruntime as ort

    model = onnx.load(model_path)
    graph = model.graph

    # Remove the custom EnvelopeRMS node and adjust inputs
    # The LSTM expects input named "envelope_seq" [64, 1, 3]
    nodes_to_keep = [n for n in graph.node if "EnvelopeRMS" not in n.op_type]

    # Also remove "raw_current" from inputs (it's the custom op's input)
    inputs_to_keep = [i for i in graph.input if i.name != "raw_current"]

    # Rebuild graph without the custom op
    new_graph = helper.make_graph(
        nodes_to_keep,
        graph.name + "_no_preprocessing",
        inputs_to_keep,
        list(graph.output),
        list(graph.initializer),
    )
    new_model = helper.make_model(new_graph)
    new_model.ir_version = model.ir_version

    # Save temp model
    temp_path = model_path.replace(".onnx", "_classifier_only.onnx")
    onnx.save(new_model, temp_path)
    print(f"\nClassifier-only model saved to: {temp_path}")

    # Load test data
    with open(test_data_path) as f:
        data = json.load(f)
    print(f"Test data: {len(data['samples'])} samples, classes={data['classes']}")

    # Run inference
    sess = ort.InferenceSession(temp_path)
    input_name = "envelope_seq"

    correct = 0
    total = 0
    class_counts = {}

    for sample in data["samples"][:50]:  # first 50 for quick validation
        seq = np.array(sample["sequence"], dtype=np.float32)
        # Reshape from [64, 3] to [64, 1, 3] (seq_len, batch, features)
        seq = seq.reshape(64, 1, 3)

        result = sess.run(None, {input_name: seq})
        probs = result[0]  # [1, NUM_CLASSES]
        predicted = np.argmax(probs)
        actual = sample["label"]

        if predicted == actual:
            correct += 1
        total += 1

        cls = data["classes"][actual]
        if cls not in class_counts:
            class_counts[cls] = {"correct": 0, "total": 0}
        class_counts[cls]["total"] += 1
        if predicted == actual:
            class_counts[cls]["correct"] += 1

    print(f"\nONNX inference results (first {total} samples):")
    print(f"  Accuracy: {correct}/{total} ({correct/total*100:.1f}%)")
    for cls in sorted(class_counts.keys()):
        c = class_counts[cls]
        print(f"  {cls:10s}: {c['correct']}/{c['total']}")

    # Show a few example outputs
    print("\nSample outputs (first 3):")
    for i in range(min(3, len(data["samples"]))):
        seq = np.array(data["samples"][i]["sequence"], dtype=np.float32).reshape(64, 1, 3)
        result = sess.run(None, {input_name: seq})
        probs = result[0][0]
        pred = np.argmax(probs)
        print(f"  Sample {i}: actual={data['classes'][data['samples'][i]['label']]}, "
              f"predicted={data['classes'][pred]}, "
              f"probs=[{', '.join(f'{p:.3f}' for p in probs)}]")

    # Clean up
    os.remove(temp_path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, help="Path to the exported .onnx file")
    parser.add_argument("--test-data", help="Path to test.json for inference validation")
    args = parser.parse_args()

    model = inspect_model(args.model)

    if args.test_data:
        run_inference(args.model, args.test_data)
    else:
        print("\nTo run inference validation, add: --test-data <path/to/test.json>")


if __name__ == "__main__":
    main()

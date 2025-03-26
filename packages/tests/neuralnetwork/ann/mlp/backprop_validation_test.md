# Classic Backpropagation Validation Test

## Overview

This test validates our implementation of a Multi-Layer Perceptron (MLP) with backpropagation against a known reference implementation using PyTorch.

We use the classic XOR example from Matt Mazur's step-by-step backpropagation walkthrough, but extended with reference data generated using PyTorch. 
The tool used for this is located int the tools/python/step_by_step jupyter notebook.
The generated CSV file `training_step_(N).csv` where N is the number of iterations, contains the expected values for each training iteration, including:

- Loss
- Weights and biases at each layer
- Hidden layer activations
- Final output predictions

## What the Test Does

- Runs a forward pass and backpropagation step for `N` iterations.
- At each iteration, it compares:
  - Output values from our MLP inference
  - Loss value from training
  - Updated weights and biases
  - Hidden activations
- The expected values are loaded from the CSV and compared with `toBeCloseTo` assertions.

## Floating Point Precision

Small differences in floating-point computations are expected between languages and runtimes:

- PyTorch (Python) and JavaScript (TypeScript) both use IEEE 754 double-precision floats, but:
  - Internal math functions may differ slightly.
  - Order of operations during matrix and scalar calculations may vary.
  - Rounding behavior can accumulate over many iterations.

As a result, after 1000+ iterations, output and loss values may begin to diverge slightly at the 6th or 7th decimal place.

### Solution

- We use `toBeCloseTo(..., 5)` or 4 (for 10000+ iterations) to allow for minor differences in the last few decimal places.
- This ensures that the test remains robust without being overly sensitive to platform-specific floating-point behavior.

## Conclusion

This test provides strong validation that our MLP implementation matches PyTorch’s behavior to within acceptable numerical precision, and confirms that weight and bias updates are applied correctly.


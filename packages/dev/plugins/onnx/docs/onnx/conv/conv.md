# Conv

`spk.onnx:conv`

Free-standing convolution op for the palette: the same ConvNode the ONNX importer instantiates for a `Conv` op, but usable WITHOUT a parent `.onnx` model. Drop it to prototype a small feature extractor by hand; the `onnx` badge advertises export compatibility. For a full trained network, prefer `spk.onnx:model`.

## Inputs (numeric slots, ONNX argument order)

| Slot | Tensor | Notes                                               |
| ---- | ------ | --------------------------------------------------- |
| 0    | X      | Required. Data tensor.                              |
| 1    | W      | Required. Weight tensor `[C_out, C_in, ...kernel]`. |
| 2    | B      | Optional bias.                                      |

Slots 0 and 1 are non-optional: the node only fires when BOTH have tokens.

## Output

| Slot | Tensor | Notes               |
| ---- | ------ | ------------------- |
| 0    | Y      | Convolution result. |

## Editables

| Field         | Default | Range           |
| ------------- | ------- | --------------- |
| `kernelShape` | 3       | 1 to 11, step 1 |
| `strides`     | 1       | 1 to 8, step 1  |
| `pads`        | 0       | 0 to 8, step 1  |

## Compute paths (simplified scope)

- X of rank <= 2 (`[batch, features]`): treated as a FULLY CONNECTED layer, `Y = X @ W^T + B`, output `[batch, C_out]`. The kernel/stride/pad editables are IGNORED on this path, and the bias broadcasts cyclically (`B[o % B.length]`).
- X of rank 3 (`[N, C_in, L]`): a true 1D convolution. Kernel length comes from `W.shape[2]` when W is rank >= 3, falling back to the `kernelShape` editable otherwise; `strides` and `pads` apply. Output `[N, C_out, outL]` with `outL = floor((L + 2*pads - kernelLength) / strides) + 1`; bias is per output channel.

## Pitfalls

- This is NOT a general ONNX Conv: 2D spatial convolution (`[N, C, H, W]`) is out of scope; rank <= 2 silently degenerates to a matmul. Check your tensor ranks when results look like a dense layer.
- On the rank-3 path with a rank >= 3 W, the `kernelShape` editable is cosmetic: the weight tensor's own kernel length wins.

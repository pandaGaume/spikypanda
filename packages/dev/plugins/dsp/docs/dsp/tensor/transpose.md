# Transpose

`DSP.Tensor:transpose`

Relayouts a rank-2 tensor `[A, B]` into `[B, A]`; with `add_batch_dim` enabled the output is `[1, B, A]` (same data, leading batch axis). This is the bridge from frame-builder layouts toward the canonical ONNX input `(1, C, T)`.

## The two canonical chains

```
Stream:buffer [T, C]  -> transpose (add_batch_dim) -> (1, C, T)            (multi-channel)
Frame:frame  [1, 64]  -> transpose                 -> [64, 1]
                      -> transpose (add_batch_dim) -> (1, 1, 64)           (head-of-block snapshot)
```

## Pitfalls

- Rank-2 input only: feeding a rank-1 `[T]` throws. Route single-channel streams through `DSP.Stream:mux` first (it provides the channel dimension).
- The output is a fresh array per frame (frame cadence, defensive-copy rationale identical to the buffer).

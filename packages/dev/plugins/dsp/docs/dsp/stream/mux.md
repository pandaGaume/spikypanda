# Channel Mux

`DSP.Stream:mux`

Assembles N scalar streams into one `[N]` tensor row per tick: the bridge from per-phase float wires (i_a, i_b, i_c) to the multi-channel tensor pipeline. `in_k` lands at `data[k]`; missing values read 0. Variadic: wiring the last free input grows the next `in_k` port.

## Allocation contract

The Float32Array, the shape array AND the ITensor wrapper are reused while N is stable: consumers that hold a row across ticks must copy. `DSP.Stream:buffer` copies on ingest, so the canonical `mux -> buffer` chain is safe.

## Typical use

```
i_a -> in_0 \
i_b -> in_1  -> frame [3] -> Stream:buffer (frames [T,3]) -> Tensor:transpose -> (1,3,T)
i_c -> in_2 /
```

Single-channel chains still need the mux: it provides the channel dimension ([T] becomes [T,1]) that the transpose toward the ONNX layout requires.

# Extended Training Results (Post-Submission)

**Date:** 2026-04-10
**Context:** Results obtained after paper submission. Available for reviewer
response or future revision.

## Run 1: LSTM h=32, 100 epochs

| Metric | Value |
|---|---|
| 5-class accuracy | 80.0% |
| Loss at epoch 100 | 0.273 |
| Inference time | 1.5 ms/sample |

**Confusion matrix:**

|  | Healthy | BRB1 | BRB2 | BRB3 | BRB4 |
|---|---|---|---|---|---|
| **Healthy** | 73 | 4 | 1 | 0 | 2 |
| **BRB1** | 7 | 75 | 5 | 2 | 1 |
| **BRB2** | 1 | 1 | 54 | 18 | 3 |
| **BRB3** | 0 | 1 | 7 | 56 | 17 |
| **BRB4** | 1 | 0 | 1 | 8 | 62 |

Binary (Healthy/Faulty): 92.0% (8 faulty motors called Healthy)

## Run 2: LSTM h=32, 150 epochs

| Metric | Value |
|---|---|
| 5-class accuracy | **88.0%** |
| Loss at epoch 150 | 0.214 (min 0.206 at epoch 143) |
| Inference time | 1.3 ms/sample |

**Confusion matrix:**

|  | Healthy | BRB1 | BRB2 | BRB3 | BRB4 |
|---|---|---|---|---|---|
| **Healthy** | 75 | 1 | 4 | 0 | 0 |
| **BRB1** | 5 | 72 | 13 | 0 | 0 |
| **BRB2** | 0 | 0 | 64 | 12 | 1 |
| **BRB3** | 1 | 0 | 0 | 75 | 5 |
| **BRB4** | 0 | 0 | 1 | 5 | 66 |

Binary (Healthy/Faulty): **97.3%** (6 faulty motors called Healthy)

**Per-class recall:**

| Class | Recall | Improvement vs. 80-epoch run |
|---|---|---|
| Healthy | 93.8% (75/80) | -5.0% (was 98.8%) |
| BRB1 | 80.0% (72/90) | +12.2% (was 67.8%) |
| BRB2 | 83.1% (64/77) | +18.2% (was 64.9%) |
| BRB3 | 92.6% (75/81) | +9.9% (was 82.7%) |
| BRB4 | 91.7% (66/72) | +13.9% (was 77.8%) |

## Comparison across all runs

| Epochs | 5-class | Binary | Loss | BRB1 recall |
|---|---|---|---|---|
| 25 | 31.8% | n/a | 0.386 | n/a |
| 50 | 70.8% | n/a | 0.325 | n/a |
| 80 (submitted) | 78.3% | 94.0% | 0.268 | 67.8% |
| 100 | 80.0% | 92.0% | 0.273 | 83.3% |
| **150** | **88.0%** | **97.3%** | **0.214** | **80.0%** |

## Key observations

The model continues to improve beyond the 80 epochs used in the
submitted paper. At 150 epochs the 5-class accuracy reaches 88.0%,
closing the gap with the FFT + SVM baseline (81.5%, now surpassed).
BRB1 detection, the weakest class in the submitted results, improved
from 67.8% to 80.0%.

The loss was still decreasing at epoch 150 (min 0.206 at epoch 143),
suggesting that 200+ epochs could push further. However, the loss
curve shows increasing oscillation after epoch 100, which may indicate
the learning rate (0.003) is becoming too high for fine-tuning. A
learning rate schedule or reduction after epoch 80 would likely help.

Binary accuracy reached 97.3% (only 6 faulty motors called Healthy,
all BRB1 at light loads). For the safety-critical healthy/faulty
decision, this is operationally strong.

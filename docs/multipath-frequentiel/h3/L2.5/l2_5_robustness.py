"""
L2.5 — the bridge from clean L2 to real MCSA. Re-enable the realism knobs and
measure WHERE the substrate breaks, predicting MCSA's hard points before touching
real data:

  - SNR sweep         : decreasing SNR at small m = BRB1 at low load (worst case).
  - A-jitter          : amplitude/scale confound (= load) -> forces ratio reading,
                        expected C3/C4 (adjacent-severity) confusion.
  - f_mod jitter      : sidebands drift off-bin = the slip confound.
  - full realism      : all knobs together (the MCSA-like scenario).

Models are trained AND tested under the same nuisance (matched) — "can it learn
under noise". Run:
  python docs/multipath-frequentiel/h3/L2.5/l2_5_robustness.py --seeds 3
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python"))

import numpy as np  # noqa: E402

from cvnn import MagnitudeMLP, SpectralCVNN  # noqa: E402
from datasets import AMConfig, band_window, make_am_dataset  # noqa: E402
from train import accuracy, confusion, per_class_recall, train_classifier  # noqa: E402

BINS, CARRIER_IDX = band_window()


def make_model(name, k):
    if name == "cvnn":
        return SpectralCVNN(BINS, CARRIER_IDX, hidden_dims=[4], num_classes=k, readout="abs", phase_reference=False)
    return MagnitudeMLP(BINS, hidden_dims=[7], num_classes=k)


def evaluate(cfg_kwargs, seeds, names=("cvnn", "mlp_magnitude")):
    """Train/test under one realism condition; return per-model accuracy + recall."""
    k = len(AMConfig().depth_centers)
    x_tr, y_tr = make_am_dataset(AMConfig(n_per_split=2000, **cfg_kwargs), seed=1)
    x_val, y_val = make_am_dataset(AMConfig(n_per_split=500, **cfg_kwargs), seed=2)
    x_te, y_te = make_am_dataset(AMConfig(n_per_split=500, **cfg_kwargs), seed=3)
    out = {}
    for name in names:
        accs, recalls, cms = [], [], []
        for s in range(seeds):
            m = make_model(name, k)
            train_classifier(m, x_tr, y_tr, x_val, y_val, seed=s)
            accs.append(accuracy(m, x_te, y_te))
            cm = confusion(m, x_te, y_te, k)
            cms.append(cm)
            recalls.append(per_class_recall(cm))
        out[name] = {
            "acc_mean": float(np.mean(accs)),
            "acc_std": float(np.std(accs)),
            "recall_mean": np.mean(recalls, axis=0).round(3).tolist(),
            "confusion_mean": np.mean(cms, axis=0).round(1).tolist(),
        }
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=3)
    ap.add_argument("--out", type=str, default=os.path.join(os.path.dirname(__file__), "results.json"))
    args = ap.parse_args()
    results = {}

    print(f"L2.5 robustness — {args.seeds} seeds/condition (train+test matched)\n")

    # 1) SNR sweep (A fixed, isolate noise). Track BRB1 recall (class index 1).
    print("SNR sweep (A=1):  CVNN vs MLP-|FFT|   [acc% | BRB1 recall]")
    snr_rows = {}
    for snr in [None, 25, 20, 15, 10, 5]:
        r = evaluate({"snr_db": snr}, args.seeds)
        snr_rows[str(snr)] = r
        tag = "clean" if snr is None else f"{snr}dB"
        print(f"  {tag:>6}   CVNN {r['cvnn']['acc_mean']*100:5.1f}% (BRB1 {r['cvnn']['recall_mean'][1]*100:4.0f}%)   "
              f"MLP {r['mlp_magnitude']['acc_mean']*100:5.1f}% (BRB1 {r['mlp_magnitude']['recall_mean'][1]*100:4.0f}%)")
    results["snr_sweep"] = snr_rows

    # 2) A-jitter (scale/load confound): expect C3/C4 confusion.
    print("\nA-jitter A in [0.8,1.2] (no noise):")
    r = evaluate({"a_range": (0.8, 1.2)}, args.seeds, names=("cvnn",))
    results["a_jitter"] = r
    rec = r["cvnn"]["recall_mean"]
    print(f"  CVNN acc {r['cvnn']['acc_mean']*100:5.1f}%   per-class recall {['%.2f' % x for x in rec]}")
    print(f"  (Healthy,BRB1,BRB2,BRB3,BRB4) — watch BRB3/BRB4 = the ratio-confusion)")

    # 3) f_mod jitter (slip confound): sidebands drift off-bin.
    print("\nf_mod jitter (A=1, no noise):")
    fmod_rows = {}
    for j in [0.0, 0.5, 1.0]:
        r = evaluate({"fmod_jitter": j}, args.seeds, names=("cvnn",))
        fmod_rows[str(j)] = r
        print(f"  ±{j:>3} Hz   CVNN acc {r['cvnn']['acc_mean']*100:5.1f}%")
    results["fmod_jitter"] = fmod_rows

    # 4) Full realism (MCSA-like): all knobs.
    print("\nFull realism (A-jitter + 15dB + f_mod ±0.5 + harmonics):")
    r = evaluate({"a_range": (0.8, 1.2), "snr_db": 15, "fmod_jitter": 0.5, "harmonics": 0.05}, args.seeds)
    results["full_realism"] = r
    print(f"  CVNN {r['cvnn']['acc_mean']*100:5.1f}±{r['cvnn']['acc_std']*100:.1f}%   "
          f"MLP-|FFT| {r['mlp_magnitude']['acc_mean']*100:5.1f}±{r['mlp_magnitude']['acc_std']*100:.1f}%")

    with open(args.out, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n(results -> {args.out})")


if __name__ == "__main__":
    main()

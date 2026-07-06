"""
L3 variant A — prep the RAW CURRENT SPECTRUM from the UFU .mat files.

Unlike variant B (the paper's RMS envelope, which discards phase), variant A
keeps the stator-current spectrum complex: the broken-bar sidebands f(1 +/- 2s)
around the 60 Hz fundamental carry AMPLITUDE and PHASE. This is where the
complex substrate's phase advantage (H6) can actually appear.

Per acquisition (rotor x torque x rep): dereference Ia/Ib/Ic, skip the 6 s
startup transient, take a few 1 s steady-state windows, FFT each, find the
fundamental peak (~60 Hz), and keep the complex carrier +/- HALF bins. Caches a
compact .npz of (n, 2*HALF+1, 3) complex features + labels + split.

Run once: python docs/multipath-frequentiel/etapeD-mcsa/mcsa_variantA_prep.py
"""

import argparse
import os

import h5py
import numpy as np

DATA = os.path.join(os.path.dirname(__file__), "..", "..", "..", "packages", "host", "www", "data", "motor_current")
FILES = [("struct_rs_R1.mat", "rs", 0), ("struct_r1b_R1.mat", "r1b", 1), ("struct_r2b_R1.mat", "r2b", 2),
         ("struct_r3b_R1.mat", "r3b", 3), ("struct_r4b_R1.mat", "r4b", 4)]

FS = 55611          # nominal sample rate (Hz)
# A 1 s window (21 bins) beat a 4 s / 81-bin one empirically: the wider bin set just
# added noise bins and diluted the tiny sidebands. Keep the compact band.
WIN = FS            # ~1 s window -> ~0.85 Hz bins (separates 60 +/- 2sf)
NFFT = 65536        # pow2 >= WIN (bin spacing = FS/NFFT ~ 0.85 Hz)
TRANSIENT = 6 * FS  # skip 6 s startup
WIN_STARTS = [6 * FS, 9 * FS, 12 * FS, 15 * FS]  # 4 steady-state windows / acquisition
# BRB is a SIDEBAND COMB at f(1 +/- 2k s), k=1,2,3... whose amplitude+phase pattern
# encodes bar count and position. In THEORY the whole comb helps. MEASURED (narrow 21
# bins vs wide 61 bins, at MATCHED weight-decay, 5 seeds): the wide comb never beats the
# narrow band at any regularization (narrow > wide everywhere). Two reasons: (a) the k>=2
# orders carry no usable class signal on this dataset -> nothing to gain (a below-noise
# signature is invisible to any classifier, so it cannot help); (b) UFU is FIXED-position
# (adjacent bars, only the COUNT varies) so the "position" info that would live in the
# higher-order phases is not even a variable here. NOTE: an earlier comment claimed the
# wide comb "adds noise below threshold and ERASES the complex advantage" -- that was
# wrong: regularization shrinks the wide-band penalty (from -6.4 to -2.1 pts as wd rises),
# so the loss was mostly OVERFITTING to the extra bins, not an actively harmful signature.
# The tight k=1 band is the sweet spot: it hands the model the ~3 high-SNR bins directly.
HALF = 10           # carrier +/- 10 bins (21 complex bins ~ +/- 8.5 Hz around 60 Hz)
F_LO, F_HI = 55.0, 66.0  # search the fundamental peak in this Hz band
TEST_REPS = {8, 9}  # hold out reps 8,9 (per rotor x torque) as test -> no acquisition leakage


def band_features(sig: np.ndarray, half: int) -> np.ndarray:
    """FFT a 1-D current window; return the complex carrier +/- half bins (aligned on the peak)."""
    X = np.fft.rfft(sig, n=NFFT)
    lo = int(F_LO * NFFT / FS)
    hi = int(F_HI * NFFT / FS)
    peak = lo + int(np.argmax(np.abs(X[lo:hi])))
    return X[peak - half : peak + half + 1].astype(np.complex64)  # (2*half+1,)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--half", type=int, default=HALF)
    ap.add_argument("--out", type=str, default=os.path.join(os.path.dirname(__file__), "variantA_features.npz"))
    args = ap.parse_args()
    half = args.half
    feats, labels, splits = [], [], []
    for fname, rotor_key, label in FILES:
        path = os.path.join(DATA, fname)
        with h5py.File(path, "r") as f:
            rotor = f[rotor_key]
            for torque in rotor.keys():
                g = rotor[torque]
                for rep in range(g["Ia"].shape[0]):
                    chans = []
                    for ch in ("Ia", "Ib", "Ic"):
                        sig = np.asarray(f[g[ch][rep, 0]]).ravel()
                        chans.append(sig)
                    split = "test" if rep in TEST_REPS else "train"
                    for start in WIN_STARTS:
                        if start + WIN > chans[0].shape[0]:
                            continue
                        cols = [band_features(c[start : start + WIN], half) for c in chans]
                        feats.append(np.stack(cols, axis=1))  # (2*half+1, 3) complex
                        labels.append(label)
                        splits.append(split)
        print(f"  {fname} done  (running total {len(feats)} windows)")

    X = np.stack(feats).astype(np.complex64)   # (n, 2*half+1, 3)
    y = np.array(labels, dtype=np.int64)
    sp = np.array(splits)
    out = args.out
    np.savez_compressed(out, X_re=X.real, X_im=X.imag, y=y, split=sp, half=half)
    tr = int((sp == "train").sum())
    te = int((sp == "test").sum())
    print(f"\nsaved {out}: X {X.shape} complex  train {tr}  test {te}  "
          f"class counts {np.bincount(y).tolist()}")


if __name__ == "__main__":
    main()

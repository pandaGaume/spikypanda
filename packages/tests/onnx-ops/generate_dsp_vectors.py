"""
Generate DSP reference test vectors for SpikyPanda custom DSP ops.

Uses numpy/scipy as reference for:
  - SpFFT: power spectrum
  - SpMelFilterbank: mel energies
  - SpLogScale: log with floor
  - SpDCT: type-II DCT
  - SpMFCC: complete MFCC pipeline
  - SpWindow: windowing functions

Requirements:
    pip install numpy scipy
"""

import json
import numpy as np
from pathlib import Path

np.random.seed(42)

OUT_PATH = Path(__file__).parent / "dsp-test-vectors.json"

SAMPLE_RATE = 16000
N_FFT = 512
N_MELS = 40
N_MFCC = 40
HOP_LENGTH = 160


def _to_list(arr):
    return arr.flatten().tolist()


# ── FFT ──────────────────────────────────────────────────────────────

def gen_fft():
    """Power spectrum of a 512-sample frame."""
    signal = np.random.randn(N_FFT).astype(np.float32)
    # numpy FFT → power spectrum
    fft_out = np.fft.rfft(signal)
    power = np.abs(fft_out) ** 2
    return {
        "op": "SpFFT",
        "input": {"shape": [N_FFT], "data": _to_list(signal)},
        "output": {"shape": [N_FFT // 2 + 1], "data": _to_list(power.astype(np.float32))},
        "attrs": {"nfft": N_FFT},
    }


# ── Window ───────────────────────────────────────────────────────────

def gen_window_hann():
    signal = np.random.randn(N_FFT).astype(np.float32)
    window = np.hanning(N_FFT).astype(np.float32)
    out = signal * window
    return {
        "op": "SpWindow",
        "input": {"shape": [N_FFT], "data": _to_list(signal)},
        "output": {"shape": [N_FFT], "data": _to_list(out)},
        "attrs": {"window_type": 0},
    }


def gen_window_hamming():
    signal = np.random.randn(N_FFT).astype(np.float32)
    window = np.hamming(N_FFT).astype(np.float32)
    out = signal * window
    return {
        "op": "SpWindow_hamming",
        "input": {"shape": [N_FFT], "data": _to_list(signal)},
        "output": {"shape": [N_FFT], "data": _to_list(out)},
        "attrs": {"window_type": 1},
    }


# ── Mel filterbank ───────────────────────────────────────────────────

def build_mel_fb(n_mels, n_fft, sr):
    """Build mel filterbank matching our TypeScript implementation."""
    n_bins = n_fft // 2 + 1
    mel_min = 2595 * np.log10(1 + 0 / 700)
    mel_max = 2595 * np.log10(1 + (sr / 2) / 700)
    mel_points = np.linspace(mel_min, mel_max, n_mels + 2)
    hz_points = 700 * (10 ** (mel_points / 2595) - 1)
    bins = np.floor((n_fft + 1) * hz_points / sr).astype(int)

    fb = np.zeros((n_mels, n_bins))
    for m in range(n_mels):
        left, center, right = bins[m], bins[m + 1], bins[m + 2]
        for k in range(left, center):
            if 0 <= k < n_bins:
                fb[m, k] = (k - left) / max(center - left, 1)
        for k in range(center, right + 1):
            if 0 <= k < n_bins:
                fb[m, k] = (right - k) / max(right - center, 1)
    return fb


def gen_mel():
    """Mel filterbank applied to a power spectrum."""
    spectrum = np.abs(np.random.randn(N_FFT // 2 + 1)).astype(np.float32) * 100
    fb = build_mel_fb(N_MELS, N_FFT, SAMPLE_RATE)
    mel_out = fb @ spectrum
    return {
        "op": "SpMelFilterbank",
        "input": {"shape": [N_FFT // 2 + 1], "data": _to_list(spectrum)},
        "output": {"shape": [N_MELS], "data": _to_list(mel_out.astype(np.float32))},
        "attrs": {"n_mels": N_MELS, "nfft": N_FFT, "sample_rate": SAMPLE_RATE},
    }


# ── Log ──────────────────────────────────────────────────────────────

def gen_log():
    data = np.abs(np.random.randn(40)).astype(np.float32) * 10 + 0.001
    out = np.log(np.maximum(data, 1e-10))
    return {
        "op": "SpLogScale",
        "input": {"shape": [40], "data": _to_list(data)},
        "output": {"shape": [40], "data": _to_list(out.astype(np.float32))},
        "attrs": {"floor": 1e-10},
    }


# ── DCT ──────────────────────────────────────────────────────────────

def gen_dct():
    """Type-II DCT."""
    from scipy.fft import dct
    data = np.random.randn(40).astype(np.float32)
    # scipy dct type 2 with ortho=None (unnormalized) matches our implementation
    # Our impl: sum(x[n] * cos(pi*k*(2n+1)/(2N))) which is DCT-II unnormalized
    out = dct(data, type=2, norm=None)
    return {
        "op": "SpDCT",
        "input": {"shape": [40], "data": _to_list(data)},
        "output": {"shape": [40], "data": _to_list(out.astype(np.float32))},
        "attrs": {"n_output": 40},
    }


# ── Full MFCC ────────────────────────────────────────────────────────

def gen_mfcc():
    """Full MFCC pipeline on a 1-second signal."""
    from scipy.fft import dct

    audio = np.random.randn(SAMPLE_RATE).astype(np.float32) * 0.1
    n_frames = (len(audio) - N_FFT) // HOP_LENGTH + 1
    fb = build_mel_fb(N_MELS, N_FFT, SAMPLE_RATE)

    mfcc = np.zeros((N_MFCC, n_frames), dtype=np.float32)
    for t in range(n_frames):
        start = t * HOP_LENGTH
        frame = audio[start:start + N_FFT] * np.hanning(N_FFT)
        power = np.abs(np.fft.rfft(frame)) ** 2
        mel_spec = fb @ power
        log_mel = np.log(np.maximum(mel_spec, 1e-10))
        # DCT-II unnormalized
        mfcc_frame = np.zeros(N_MFCC)
        for c in range(N_MFCC):
            for m in range(N_MELS):
                mfcc_frame[c] += log_mel[m] * np.cos(np.pi * c * (2 * m + 1) / (2 * N_MELS))
        mfcc[:, t] = mfcc_frame

    return {
        "op": "SpMFCC",
        "input": {"shape": [SAMPLE_RATE], "data": _to_list(audio)},
        "output": {"shape": [N_MFCC, n_frames], "data": _to_list(mfcc)},
        "attrs": {
            "sample_rate": SAMPLE_RATE,
            "n_mfcc": N_MFCC,
            "n_fft": N_FFT,
            "hop_length": HOP_LENGTH,
            "n_mels": N_MELS,
            "window_type": 0,
        },
    }


# ── Main ─────────────────────────────────────────────────────────────

ALL = [gen_fft, gen_window_hann, gen_window_hamming, gen_mel, gen_log, gen_dct, gen_mfcc]

def main():
    vectors = []
    for gen in ALL:
        name = gen.__name__
        try:
            v = gen()
            vectors.append(v)
            print(f"  OK  {v['op']}")
        except Exception as e:
            print(f" FAIL {name}: {e}")

    OUT_PATH.write_text(json.dumps(vectors, indent=2))
    print(f"\nWrote {len(vectors)} DSP vectors to {OUT_PATH}")


if __name__ == "__main__":
    main()

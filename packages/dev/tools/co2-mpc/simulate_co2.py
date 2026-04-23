"""
CO2 scrubbing simulator for a closed habitat (lunar base analog).

Physical model:
    dC/dt = (E - S(a) * (C - C0) - L * (C - C_ext)) / V_m
where:
    C       = CO2 concentration in the cabin (ppm)
    E       = CO2 emission rate from crew (ppm/min, scaled by crew activity)
    S(a)    = scrubbing rate as a function of action a (ppm/min)
    C0      = scrubber exhaust concentration (very low, ~400 ppm)
    L       = cabin leakage rate to external (ppm/min)
    C_ext   = external CO2 (0 in vacuum / lunar environment)
    V_m     = effective cabin volume scaling

Generates synthetic sequences (state, action, state_next) for training
a one-step dynamics model.

Outputs:
    co2_dataset.npz  -- training/validation data
    co2_dataset.json -- metadata (normalization stats, action encoding)
"""

import json
import numpy as np
from pathlib import Path

rng = np.random.default_rng(42)

OUT_DIR = Path(__file__).parent
OUT_DATASET = OUT_DIR / "co2_dataset.npz"
OUT_META = OUT_DIR / "co2_dataset.json"

# ---------------------------------------------------------------------------
# Physical constants
# ---------------------------------------------------------------------------

DT_MIN = 1.0  # simulation step in minutes

# Scrubber presets. Must match SCRUBBER_PRESETS in the browser demo
# (packages/host/www/samples/co2-mpc/co2-mpc.js). Training samples are
# drawn uniformly from these three regimes so the model generalises
# across brand-new, end-of-life, and degraded hardware.
SCRUBBER_PRESETS = {
    "oversized": {"rates": np.array([0.0, 0.03, 0.08, 0.20]), "tau": 0.3},
    "normal":    {"rates": np.array([0.0, 0.010, 0.025, 0.050]), "tau": 0.3},
    "degraded":  {"rates": np.array([0.0, 0.004, 0.010, 0.022]), "tau": 0.15},
}
PRESET_NAMES = list(SCRUBBER_PRESETS.keys())

# Normalization constant for scrubber_rate input to the model. Picked at the
# largest across all presets so scrubber_rate_norm always stays in [0, 1]
# regardless of which preset generated the sample.
SCRUBBER_RATE_MAX = 0.20

# Legacy globals for backward compatibility; actual values are chosen per
# sequence in generate_sequence().
SCRUBBER_RATES = SCRUBBER_PRESETS["oversized"]["rates"]
SCRUBBER_TAU = SCRUBBER_PRESETS["oversized"]["tau"]

# Energy cost per action level (arbitrary units, higher = more power)
SCRUBBER_POWER = np.array([0.0, 1.0, 3.0, 8.0])

# Crew CO2 emission rate per person (ppm/min) under different activity levels.
# Calibrated for a medium-sized habitat (~50 m3) with 3 crew. At heavy_work
# with 3 people, CO2 rises ~1200 ppm/hour uncontrolled, crossing the 4000 ppm
# safety threshold in about 2 hours from a 1500 ppm baseline.
ACTIVITY_EMISSION = {
    "sleep": 2.0,
    "rest": 3.5,
    "light_work": 5.5,
    "heavy_work": 7.0,
}

# Cabin parameters
CABIN_LEAK_RATE = 0.001   # small leak to external (vacuum, C_ext = 0)
C_EXTERNAL = 0.0

# State bounds
CO2_MIN = 300.0           # ppm, atmospheric baseline
CO2_MAX = 10000.0         # ppm, hard ceiling for simulation
CO2_INITIAL_RANGE = (500.0, 2500.0)

# Dataset parameters
N_SEQUENCES = 2000
SEQUENCE_LENGTH = 180     # 3 hours at 1 min per step
CREW_SIZE_RANGE = (1, 6)


# ---------------------------------------------------------------------------
# Simulator step
# ---------------------------------------------------------------------------

def step(co2: float, scrubber_rate: float, action: int, crew_size: int,
         activity: str, scrubber_rates: np.ndarray, tau: float,
         emission_noise: float = 0.0, dt: float = DT_MIN) -> tuple[float, float]:
    """Advance the CO2 state by one timestep.

    Models a real scrubber with first-order startup latency: commanding
    "high" does not immediately give high removal rate; the effective rate
    lags behind with time constant tau.

    Args:
        co2             current CO2 (ppm)
        scrubber_rate   current effective scrubber rate (fraction/min)
        action          scrubber command {0..3}
        crew_size       number of people
        activity        activity label from ACTIVITY_EMISSION
        scrubber_rates  action-level-to-target-rate mapping for this preset
        tau             first-order lag time constant for this preset
        emission_noise  additive noise on emission (ppm/min)
        dt              timestep (minutes)

    Returns:
        (next_co2, next_scrubber_rate) tuple.
    """
    target_rate = scrubber_rates[action]
    next_scrubber_rate = scrubber_rate + (target_rate - scrubber_rate) * tau * dt

    e_rate = ACTIVITY_EMISSION[activity] * crew_size + emission_noise
    scrub = scrubber_rate * max(co2 - 400.0, 0.0)
    leak = CABIN_LEAK_RATE * (co2 - C_EXTERNAL)

    dco2 = e_rate - scrub - leak
    next_co2 = co2 + dco2 * dt
    return (float(np.clip(next_co2, CO2_MIN, CO2_MAX)),
            float(np.clip(next_scrubber_rate, 0.0, float(SCRUBBER_RATE_MAX))))


# ---------------------------------------------------------------------------
# Sequence generator
# ---------------------------------------------------------------------------

def _sample_activity_profile(length: int) -> list:
    """Sample a plausible activity sequence with piecewise-constant phases."""
    activities = list(ACTIVITY_EMISSION.keys())
    out = []
    t = 0
    while t < length:
        phase_len = int(rng.integers(10, 45))
        act = rng.choice(activities)
        out.extend([act] * min(phase_len, length - t))
        t += phase_len
    return out[:length]


def _sample_action_sequence(length: int) -> np.ndarray:
    """Sample a plausible action trajectory.

    Uses a mix of constant policies and smooth switching to cover the
    action space without being pure noise (which the LSTM would struggle
    to generalize from).
    """
    mode = rng.random()
    if mode < 0.3:
        # Constant policy
        return np.full(length, rng.integers(0, 4), dtype=np.int32)
    elif mode < 0.6:
        # Threshold policy: alternate between two levels
        return rng.choice([0, 1, 2, 3], size=length,
                          p=[0.3, 0.3, 0.25, 0.15]).astype(np.int32)
    else:
        # Piecewise constant with longer segments
        out = np.zeros(length, dtype=np.int32)
        t = 0
        while t < length:
            seg_len = int(rng.integers(5, 30))
            lvl = int(rng.integers(0, 4))
            out[t:t + seg_len] = lvl
            t += seg_len
        return out


def generate_sequence(length: int = SEQUENCE_LENGTH) -> dict:
    """Generate one simulation run with a randomly chosen scrubber preset."""
    preset_name = str(rng.choice(PRESET_NAMES))
    preset = SCRUBBER_PRESETS[preset_name]
    scrubber_rates = preset["rates"]
    tau = preset["tau"]

    crew_size = int(rng.integers(CREW_SIZE_RANGE[0], CREW_SIZE_RANGE[1] + 1))
    activities = _sample_activity_profile(length)
    actions = _sample_action_sequence(length)
    co2_init = float(rng.uniform(*CO2_INITIAL_RANGE))
    # Initial scrubber rate within this preset's range
    scrubber_init = float(rng.uniform(0.0, float(max(scrubber_rates))))

    co2_trace = np.zeros(length + 1, dtype=np.float32)
    scrubber_trace = np.zeros(length + 1, dtype=np.float32)
    co2_trace[0] = co2_init
    scrubber_trace[0] = scrubber_init

    for t in range(length):
        noise = rng.normal(0.0, 0.5)
        next_co2, next_scrub = step(co2_trace[t], scrubber_trace[t],
                                    int(actions[t]), crew_size,
                                    activities[t], scrubber_rates, tau, noise)
        co2_trace[t + 1] = next_co2
        scrubber_trace[t + 1] = next_scrub

    return {
        "co2": co2_trace,
        "scrubber_rate": scrubber_trace,
        "actions": actions,
        "crew_size": crew_size,
        "activities": activities,
        "preset": preset_name,
    }


# ---------------------------------------------------------------------------
# Dataset assembly
# ---------------------------------------------------------------------------

def build_dataset():
    """Build training/validation tensors.

    Each sample is:
        X[i] = [co2_norm, action_onehot(4), crew_norm, scrubber_rate_norm]  (7 features)
        Y[i] = [co2_norm_next]

    The scrubber rate is a state feature. The model must know the current
    effective rate to predict CO2 evolution correctly (because commanding
    "high" now does not immediately produce "high" scrubbing).
    """
    sequences = []
    print(f"Generating {N_SEQUENCES} sequences of length {SEQUENCE_LENGTH}...")
    for i in range(N_SEQUENCES):
        sequences.append(generate_sequence())
        if (i + 1) % 500 == 0:
            print(f"  {i + 1}/{N_SEQUENCES}")

    # Use a single normalization constant across all presets so the scrubber
    # rate feature has consistent meaning regardless of which preset produced
    # the sample. Normalized rates stay in [0, 1].
    scrubber_norm = float(SCRUBBER_RATE_MAX)
    X_list, Y_list = [], []
    preset_counts = {name: 0 for name in PRESET_NAMES}
    for seq in sequences:
        preset_counts[seq["preset"]] += 1
        co2 = seq["co2"]
        scrubber = seq["scrubber_rate"]
        actions = seq["actions"]
        crew = seq["crew_size"]
        T = len(actions)

        for t in range(T):
            action_onehot = np.zeros(4, dtype=np.float32)
            action_onehot[actions[t]] = 1.0
            x = np.concatenate([
                [co2[t] / CO2_MAX],
                action_onehot,
                [crew / CREW_SIZE_RANGE[1]],
                [scrubber[t] / scrubber_norm],
            ]).astype(np.float32)
            y = np.array([co2[t + 1] / CO2_MAX], dtype=np.float32)
            X_list.append(x)
            Y_list.append(y)
    print(f"Preset distribution: {preset_counts}")

    X = np.stack(X_list)
    Y = np.stack(Y_list)
    print(f"Dataset: {X.shape[0]} samples, input_dim={X.shape[1]}, output_dim={Y.shape[1]}")

    # Simple split
    n = X.shape[0]
    idx = rng.permutation(n)
    n_val = n // 10
    val_idx, train_idx = idx[:n_val], idx[n_val:]

    np.savez_compressed(
        OUT_DATASET,
        X_train=X[train_idx],
        Y_train=Y[train_idx],
        X_val=X[val_idx],
        Y_val=Y[val_idx],
    )
    print(f"Wrote {OUT_DATASET}")

    meta = {
        "n_sequences": N_SEQUENCES,
        "sequence_length": SEQUENCE_LENGTH,
        "dt_min": DT_MIN,
        "co2_max_ppm": CO2_MAX,
        "co2_min_ppm": CO2_MIN,
        "crew_max": CREW_SIZE_RANGE[1],
        "scrubber_presets": {
            name: {"rates": p["rates"].tolist(), "tau": p["tau"]}
            for name, p in SCRUBBER_PRESETS.items()
        },
        "scrubber_power": SCRUBBER_POWER.tolist(),
        "scrubber_rate_max": float(SCRUBBER_RATE_MAX),
        "preset_distribution": preset_counts,
        "activity_emission": ACTIVITY_EMISSION,
        "cabin_leak_rate": CABIN_LEAK_RATE,
        "input_dim": int(X.shape[1]),
        "output_dim": int(Y.shape[1]),
        "input_schema": [
            "co2 / co2_max",
            "action_onehot[0] (off)",
            "action_onehot[1] (low)",
            "action_onehot[2] (medium)",
            "action_onehot[3] (high)",
            "crew_size / crew_max",
            "scrubber_rate / scrubber_rate_max",
        ],
        "output_schema": ["co2_next / co2_max"],
        "train_samples": int(len(train_idx)),
        "val_samples": int(len(val_idx)),
    }
    OUT_META.write_text(json.dumps(meta, indent=2))
    print(f"Wrote {OUT_META}")


if __name__ == "__main__":
    build_dataset()

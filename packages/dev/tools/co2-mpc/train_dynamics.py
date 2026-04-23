"""
Train a one-step CO2 dynamics model for Model Predictive Control.

Model: small MLP
    input:  [co2_norm, action_onehot(4), crew_norm]     shape [6]
    output: [delta_co2_norm]                            shape [1]

We predict the delta (next - current) rather than the absolute next state.
This biases the model toward identity + correction, which is easier to learn
and more stable under rollout (errors do not compound as badly).

Architecture kept small so the ONNX export fits comfortably on an MCU:
    Linear(6 -> 16) -> ReLU -> Linear(16 -> 16) -> ReLU -> Linear(16 -> 1)
    roughly 400 params, ~2 KB in ONNX.

Outputs:
    co2_dynamics.onnx
    co2_dynamics.pt
    co2_dynamics_training.json (loss history, val metrics)
"""

import argparse
import json
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

OUT_DIR = Path(__file__).parent
DATASET_PATH = OUT_DIR / "co2_dataset.npz"
META_PATH = OUT_DIR / "co2_dataset.json"
ONNX_PATH = OUT_DIR / "co2_dynamics.onnx"
PT_PATH = OUT_DIR / "co2_dynamics.pt"
HIST_PATH = OUT_DIR / "co2_dynamics_training.json"


class CO2Dynamics(nn.Module):
    """Predict CO2 delta over one timestep."""
    def __init__(self, input_dim: int = 6, hidden: int = 16, output_dim: int = 1):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, hidden)
        self.fc2 = nn.Linear(hidden, hidden)
        self.fc3 = nn.Linear(hidden, output_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h = torch.relu(self.fc1(x))
        h = torch.relu(self.fc2(h))
        return self.fc3(h)


def build_delta_targets(X: np.ndarray, Y: np.ndarray) -> np.ndarray:
    """Convert next-state targets to delta targets.

    X[:, 0] is the current co2 (normalized). Y is the next co2 (normalized).
    delta = Y - X[:, :1]
    """
    return Y - X[:, :1]


def train(epochs: int, batch_size: int, lr: float, device: str, seed: int):
    torch.manual_seed(seed)
    rng = np.random.default_rng(seed)

    data = np.load(DATASET_PATH)
    X_train = data["X_train"].astype(np.float32)
    Y_train = data["Y_train"].astype(np.float32)
    X_val = data["X_val"].astype(np.float32)
    Y_val = data["Y_val"].astype(np.float32)

    dY_train = build_delta_targets(X_train, Y_train)
    dY_val = build_delta_targets(X_val, Y_val)

    print(f"Train: {X_train.shape[0]} samples, Val: {X_val.shape[0]} samples")
    print(f"Target delta stats: mean={dY_train.mean():.5f}, std={dY_train.std():.5f}")

    model = CO2Dynamics(input_dim=X_train.shape[1]).to(device)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"Model parameters: {n_params}")

    opt = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.MSELoss()

    n = X_train.shape[0]
    history = {"train_loss": [], "val_loss": [], "val_mae_ppm": []}
    t0 = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        idx = rng.permutation(n)
        total = 0.0
        count = 0
        for start in range(0, n, batch_size):
            batch = idx[start:start + batch_size]
            xb = torch.from_numpy(X_train[batch]).to(device)
            yb = torch.from_numpy(dY_train[batch]).to(device)
            pred = model(xb)
            loss = loss_fn(pred, yb)
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += loss.item() * xb.size(0)
            count += xb.size(0)
        train_loss = total / count

        # Validation
        model.eval()
        with torch.no_grad():
            xv = torch.from_numpy(X_val).to(device)
            yv = torch.from_numpy(dY_val).to(device)
            pv = model(xv)
            val_loss = loss_fn(pv, yv).item()
            # MAE in ppm (un-normalize using co2_max = 10000)
            meta = json.loads(META_PATH.read_text())
            val_mae_ppm = (pv - yv).abs().mean().item() * meta["co2_max_ppm"]

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["val_mae_ppm"].append(val_mae_ppm)
        print(f"Epoch {epoch:3d}/{epochs}  train_loss={train_loss:.2e}  "
              f"val_loss={val_loss:.2e}  val_mae={val_mae_ppm:.2f} ppm")

    elapsed = time.time() - t0
    print(f"Training done in {elapsed:.1f}s")

    torch.save(model.state_dict(), PT_PATH)
    print(f"Wrote {PT_PATH}")

    # Export to ONNX
    model.eval().cpu()
    dummy = torch.randn(1, X_train.shape[1])
    torch.onnx.export(
        model, dummy, str(ONNX_PATH),
        input_names=["state_action"],
        output_names=["delta_co2"],
        dynamic_axes=None,
        opset_version=17,
        dynamo=False,
    )
    print(f"Wrote {ONNX_PATH} ({ONNX_PATH.stat().st_size / 1024:.1f} KB)")

    # Verify ONNX
    import onnx
    m = onnx.load(str(ONNX_PATH))
    onnx.checker.check_model(m)
    ops = sorted(set(n.op_type for n in m.graph.node))
    print(f"ONNX ops: {ops}")

    history_out = {
        "epochs": epochs,
        "batch_size": batch_size,
        "lr": lr,
        "final_train_loss": history["train_loss"][-1],
        "final_val_loss": history["val_loss"][-1],
        "final_val_mae_ppm": history["val_mae_ppm"][-1],
        "best_val_mae_ppm": min(history["val_mae_ppm"]),
        "n_params": n_params,
        "training_time_s": round(elapsed, 1),
        "ops_used": ops,
        "history": history,
    }
    HIST_PATH.write_text(json.dumps(history_out, indent=2))
    print(f"Wrote {HIST_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=512)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}")
    train(args.epochs, args.batch_size, args.lr, device, args.seed)

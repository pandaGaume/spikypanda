"""
Le test « anti-collapse structurel » : sur un flux MODAL, comment la STRUCTURE du
prédicteur d'un JEPA change-t-elle (a) le collapse et (b) l'utilité de la
représentation, SANS les béquilles lourdes (pas d'EMA) ?

Contexte (conjecture du soir). Le combat central d'un JEPA est le COLLAPSE :
l'encodeur sort une (quasi-)constante, le prédicteur devient trivialement parfait,
la représentation ne porte plus rien. Yann-LeCun-JEPA l'évite par EMA + termes de
variance (VICReg) ; SimSiam par « prédicteur + stop-gradient ». Question : sur un
flux réellement modal, un prédicteur de KOOPMAN (rotation quasi-unitaire, la vraie
dynamique du flux) évite-t-il le collapse ET rend-il la meilleure représentation,
face à un prédicteur générique ?

Montage (SimSiam-sans-EMA) :
  z_ctx = Enc(fenêtre_contexte)            # online, gradient
  z_tgt = Enc(fenêtre_future).detach()     # cible, stop-gradient
  loss  = || Pred(z_ctx) - z_tgt ||        # (normalisé => cosinus, régime standard)

DEUX régimes :
  norm : représentations L2-normalisées, perte cosinus (SimSiam standard, stable).
         collapse = std des features normalisées -> 0 (sain ~ 1/sqrt(d) ≈ 0.25).
  raw  : PAS de normalisation (régime « aucune béquille »). Teste la STABILITE
         d'échelle : la norme-préservation du prédicteur unitaire borne-t-elle la
         représentation là où un prédicteur contractif/libre dérive ou explose ?

Données : flux modal (r modes complexes) ; par trajectoire un sous-ensemble ALEATOIRE
de modes est actif = le label multi-faute. Une fenêtre future se prédit de la passée
par avance de phase => le VRAI prédicteur EST une rotation (Koopman unitaire).

Six prédicteurs, pour ISOLER le mécanisme :
  Identity        : pas de prédicteur (ancre de COLLAPSE ; SimSiam sans prédicteur collapse)
  MLP             : générique expressif
  Linear (free)   : K non contraint
  Koopman-damped  : diagonal complexe, |lambda|=sigmoid<=1 (peut rétrécir)
  Koopman-unitary : diagonal complexe, |lambda|=1 (rotation pure, NORME-PRESERVANT)
  MLP + var-reg   : contrôle POSITIF (VICReg) -> ne DOIT pas collapser

Lecture : COLLAPSE = std -> ~0 ET sonde ~ hasard. SAIN = std vivante ET sonde >> hasard.

Run: python docs/multipath-frequentiel/h3/mux/jepa_collapse.py --seeds 5 --epochs 400
"""

import argparse
import json
import math
import os

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


# --------------------------------------------------------------------------- data
def make_modal_jepa_data(r, M, W, seed, n_traj=600, snr_db=25.0, p_active=0.5, wins_per_traj=6):
    g = torch.Generator().manual_seed(seed)
    length = (wins_per_traj + 2) * W
    omega = (torch.arange(1, r + 1, dtype=torch.float32) / (r + 1)) * math.pi
    omega = omega + 0.02 * torch.randn(r, generator=g)
    rho = 0.99 + 0.01 * torch.rand(r, generator=g)                     # near-unitary true dynamics
    lam = torch.polar(rho, omega)
    C = (torch.randn(M, r, generator=g) + 1j * torch.randn(M, r, generator=g)) / math.sqrt(2 * r)

    active = (torch.rand(n_traj, r, generator=g) < p_active).float()   # (n_traj, r) LABELS
    amp = (torch.randn(n_traj, r, generator=g) + 1j * torch.randn(n_traj, r, generator=g)) * active

    xs, psi = [], amp.clone()
    for _ in range(length):
        xs.append((psi @ C.T).real)
        psi = psi * lam
    X = torch.stack(xs, dim=1)                                          # (n_traj, length, M)
    sp = X.pow(2).mean()
    X = X + math.sqrt((sp / (10 ** (snr_db / 10))).item()) * torch.randn(X.shape, generator=g)

    ctx, tgt, lab, traj = [], [], [], []
    stride = (length - 2 * W) // wins_per_traj
    for w in range(wins_per_traj):
        s = w * stride
        ctx.append(X[:, s : s + W, :].reshape(n_traj, -1))
        tgt.append(X[:, s + W : s + 2 * W, :].reshape(n_traj, -1))
        lab.append(active)
        traj.append(torch.arange(n_traj))
    ctx, tgt, lab, traj = torch.cat(ctx), torch.cat(tgt), torch.cat(lab), torch.cat(traj)

    is_test = (traj % 5 == 0)
    tr = ~is_test
    mu, sd = ctx[tr].mean(0, keepdim=True), ctx[tr].std(0, keepdim=True).clamp_min(1e-6)
    ctx, tgt = (ctx - mu) / sd, (tgt - mu) / sd
    return {"ctx_tr": ctx[tr], "tgt_tr": tgt[tr], "y_tr": lab[tr],
            "ctx_te": ctx[is_test], "tgt_te": tgt[is_test], "y_te": lab[is_test], "in_dim": ctx.shape[1]}


# ------------------------------------------------------------------- encoder/predictors
class Encoder(nn.Module):
    def __init__(self, in_dim, d, h=128):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(in_dim, h), nn.ReLU(), nn.Linear(h, d))

    def forward(self, x):
        return self.net(x)


class Identity(nn.Module):
    def forward(self, z):
        return z


class MLPPredictor(nn.Module):
    def __init__(self, d, h=64):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(d, h), nn.ReLU(), nn.Linear(h, d))

    def forward(self, z):
        return self.net(z)


class LinearPredictor(nn.Module):
    def __init__(self, d):
        super().__init__()
        self.f = nn.Linear(d, d, bias=False)

    def forward(self, z):
        return self.f(z)


class KoopmanPredictor(nn.Module):
    """Diagonal complex on d=2r reals. unitary=True -> |lambda|=1 (rotation, norm-preserving);
    else |lambda|=sigmoid<=1 (can shrink), initialized near-unitary to avoid a runaway start."""
    def __init__(self, d, unitary):
        super().__init__()
        assert d % 2 == 0
        self.r, self.unitary = d // 2, unitary
        self.theta = nn.Parameter(0.1 * torch.randn(self.r))
        if not unitary:
            self.rho_raw = nn.Parameter(torch.full((self.r,), 3.0))   # sigmoid(3)≈0.95, near-unitary
        self.register_buffer("_dummy", torch.zeros(1))

    def forward(self, z):
        a, b = z[:, : self.r], z[:, self.r :]
        cos, sin = torch.cos(self.theta), torch.sin(self.theta)
        na, nb = cos * a - sin * b, sin * a + cos * b
        if not self.unitary:
            rho = torch.sigmoid(self.rho_raw)
            na, nb = rho * na, rho * nb
        return torch.cat([na, nb], dim=1)


def collapse_metric(enc, x, normalize):
    enc.eval()
    with torch.no_grad():
        z = enc(x)
        if normalize:
            z = F.normalize(z, dim=1)
    return z.std(0).mean().item()


# ----------------------------------------------------------------------- train + probe
def train_jepa(enc, pred, ctx, tgt, eval_ctx, seed, epochs, normalize, lr=1e-3, batch=256, var_reg=0.0):
    torch.manual_seed(seed)
    opt = torch.optim.Adam(list(enc.parameters()) + list(pred.parameters()), lr=lr)
    n = ctx.shape[0]
    curve = [collapse_metric(enc, eval_ctx, normalize)]
    for _ in range(epochs):
        enc.train()
        perm = torch.randperm(n)
        for i in range(0, n, batch):
            idx = perm[i : i + batch]
            opt.zero_grad()
            z_ctx = enc(ctx[idx])
            z_tgt = enc(tgt[idx]).detach()
            p = pred(z_ctx)
            if normalize:
                loss = ((F.normalize(p, dim=1) - F.normalize(z_tgt, dim=1)) ** 2).sum(1).mean()
            else:
                loss = ((p - z_tgt) ** 2).mean()
            if var_reg > 0:
                loss = loss + var_reg * torch.relu(1.0 - z_ctx.std(0)).mean()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(list(enc.parameters()) + list(pred.parameters()), 5.0)
            opt.step()
        curve.append(collapse_metric(enc, eval_ctx, normalize))
    return curve


def linear_probe(enc, d, ctx_tr, y_tr, ctx_te, y_te, seed):
    enc.eval()
    with torch.no_grad():
        z_tr, z_te = enc(ctx_tr), enc(ctx_te)
    mu, sd = z_tr.mean(0, keepdim=True), z_tr.std(0, keepdim=True).clamp_min(1e-6)
    z_tr, z_te = (z_tr - mu) / sd, (z_te - mu) / sd                    # standardize probe inputs
    torch.manual_seed(seed)
    clf = nn.Linear(d, y_tr.shape[1])
    opt = torch.optim.Adam(clf.parameters(), lr=1e-2)
    bce = nn.BCEWithLogitsLoss()
    for _ in range(400):
        opt.zero_grad()
        bce(clf(z_tr), y_tr).backward()
        opt.step()
    with torch.no_grad():
        pred = (clf(z_te) > 0).float()
    return (pred == y_te).float().mean().item(), (pred == y_te).all(1).float().mean().item()


def supervised_ceiling(data, d, r, epochs=300, seed=0):
    """Upper bound: train Encoder+head END-TO-END on the labels. Tells us what the
    architecture CAN decode, so an SSL probe near chance means SSL underlearned it
    (not that the task is impossible)."""
    torch.manual_seed(seed)
    enc, head = Encoder(data["in_dim"], d), nn.Linear(d, r)
    opt = torch.optim.Adam(list(enc.parameters()) + list(head.parameters()), lr=2e-3)
    bce = nn.BCEWithLogitsLoss()
    ctx, y, n = data["ctx_tr"], data["y_tr"], data["ctx_tr"].shape[0]
    for _ in range(epochs):
        perm = torch.randperm(n)
        for i in range(0, n, 256):
            idx = perm[i : i + 256]
            opt.zero_grad(); bce(head(enc(ctx[idx])), y[idx]).backward(); opt.step()
    enc.eval()
    with torch.no_grad():
        pred = (head(enc(data["ctx_te"])) > 0).float()
    return (pred == data["y_te"]).float().mean().item(), (pred == data["y_te"]).all(1).float().mean().item()


def run_regime(regime, args, d):
    normalize = (regime == "norm")
    conditions = [
        ("Identity (collapse anchor)", lambda: Identity(), 0.0),
        ("MLP", lambda: MLPPredictor(d), 0.0),
        ("Linear (free)", lambda: LinearPredictor(d), 0.0),
        ("Koopman-damped", lambda: KoopmanPredictor(d, unitary=False), 0.0),
        ("Koopman-unitary", lambda: KoopmanPredictor(d, unitary=True), 0.0),
        ("MLP + var-reg (ctrl+)", lambda: MLPPredictor(d), 1.0),
    ]
    healthy = 1.0 / math.sqrt(d) if normalize else None
    print(f"\n===== REGIME '{regime}' "
          f"({'L2-normalized, cosine loss (SimSiam)' if normalize else 'un-normalized (no crutches)'}) =====")
    if normalize:
        print(f"  healthy std ~ 1/sqrt(d) = {healthy:.3f} ; collapse = std -> 0")
    else:
        print(f"  healthy = std stays O(1) ; collapse = std -> 0 ; instability = std explodes")
    print(f"  chance: per-fault ~0.50, exact-match ~{0.5**args.r:.4f}")

    out = {}
    for name, build_pred, var_reg in conditions:
        finals, pfs, exacts, curves = [], [], [], []
        for s in range(args.seeds):
            data = make_modal_jepa_data(args.r, args.M, args.W, seed=100 + s)
            torch.manual_seed(4242)                                    # IDENTICAL encoder init
            enc = Encoder(data["in_dim"], d)
            curve = train_jepa(enc, build_pred(), data["ctx_tr"], data["tgt_tr"], data["ctx_te"],
                               seed=s, epochs=args.epochs, normalize=normalize, var_reg=var_reg)
            pf, ex = linear_probe(enc, d, data["ctx_tr"], data["y_tr"], data["ctx_te"], data["y_te"], seed=s)
            finals.append(curve[-1]); pfs.append(pf); exacts.append(ex); curves.append(curve)
        cm = np.mean(curves, axis=0); e = len(cm) - 1
        marks = [cm[0], cm[e // 4], cm[e // 2], cm[e]]
        out[name] = {"final_std": float(np.mean(finals)), "final_std_sd": float(np.std(finals)),
                     "probe_per_fault": float(np.mean(pfs)), "probe_exact": float(np.mean(exacts)),
                     "curve_marks": [float(x) for x in marks]}
        print(f"  {name:28s} | std {np.mean(finals):8.3f}  "
              f"(@0/25/50/100%: {marks[0]:.2f} {marks[1]:.2f} {marks[2]:.2f} {marks[3]:.2f})  "
              f"| probe {np.mean(pfs)*100:4.1f}%  exact {np.mean(exacts)*100:4.1f}%")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--r", type=int, default=8)
    ap.add_argument("--M", type=int, default=24)
    ap.add_argument("--W", type=int, default=16)
    ap.add_argument("--seeds", type=int, default=5)
    ap.add_argument("--epochs", type=int, default=400)
    ap.add_argument("--regimes", type=str, nargs="+", default=["norm", "raw"])
    ap.add_argument("--out", type=str, default=os.path.join(os.path.dirname(__file__), "jepa_collapse.json"))
    args = ap.parse_args()
    d = 2 * args.r
    print(f"JEPA collapse test — r={args.r} modes, M={args.M} ch, window W={args.W}, rep dim d={d}, "
          f"{args.seeds} seeds, {args.epochs} epochs")

    # Probe-axis ceilings (regime-independent): floor = raw-input linear probe,
    # ceiling = supervised end-to-end. Frame the SSL probe numbers between them.
    data0 = make_modal_jepa_data(args.r, args.M, args.W, seed=100)
    raw_pf, raw_ex = linear_probe(nn.Identity(), data0["in_dim"], data0["ctx_tr"], data0["y_tr"],
                                  data0["ctx_te"], data0["y_te"], seed=0)
    sup_pf, sup_ex = supervised_ceiling(data0, d, args.r)
    print(f"probe ceilings: raw-input linear {raw_pf*100:.1f}%/exact {raw_ex*100:.1f}%  |  "
          f"supervised enc+head {sup_pf*100:.1f}%/exact {sup_ex*100:.1f}%  (chance per-fault ~50%)")

    all_out = {"ceilings": {"raw_input": [raw_pf, raw_ex], "supervised": [sup_pf, sup_ex]}}
    all_out.update({reg: run_regime(reg, args, d) for reg in args.regimes})
    with open(args.out, "w") as f:
        json.dump({"config": vars(args), "regimes": all_out}, f, indent=2)
    print(f"\n(results -> {args.out})")


if __name__ == "__main__":
    main()

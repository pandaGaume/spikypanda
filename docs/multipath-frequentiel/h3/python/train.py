"""Shared supervised-training + metric helpers for the CVNN experiments."""

import numpy as np
import torch
import torch.nn as nn


def accuracy(model: nn.Module, x: torch.Tensor, y: torch.Tensor) -> float:
    model.eval()
    with torch.no_grad():
        return (model(x).argmax(1) == y).float().mean().item()


def confusion(model: nn.Module, x: torch.Tensor, y: torch.Tensor, k: int) -> np.ndarray:
    model.eval()
    with torch.no_grad():
        pred = model(x).argmax(1)
    cm = np.zeros((k, k), dtype=int)
    for t, p in zip(y.tolist(), pred.tolist()):
        cm[t, p] += 1
    return cm


def per_class_recall(cm: np.ndarray) -> np.ndarray:
    totals = cm.sum(axis=1).clip(min=1)
    return cm.diagonal() / totals


def train_classifier(
    model: nn.Module,
    x_tr: torch.Tensor,
    y_tr: torch.Tensor,
    x_val: torch.Tensor,
    y_val: torch.Tensor,
    seed: int,
    batch: int = 64,
    max_epochs: int = 120,
    lr: float = 1e-2,
    patience: int = 15,
    weight_decay: float = 0.0,
) -> int:
    """Mini-batch Adam + grad-clip + early-stopping on val accuracy.

    Restores the best-val weights; returns the best epoch. ``weight_decay``
    regularizes (needed when the input has many noise dimensions).
    """
    torch.manual_seed(seed)
    opt = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    loss_fn = nn.CrossEntropyLoss()
    n = x_tr.shape[0]
    best, best_state, best_epoch, wait = -1.0, None, 0, 0
    for epoch in range(max_epochs):
        model.train()
        perm = torch.randperm(n)
        for i in range(0, n, batch):
            idx = perm[i : i + batch]
            opt.zero_grad()
            loss_fn(model(x_tr[idx]), y_tr[idx]).backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
        v = accuracy(model, x_val, y_val)
        if v > best:
            best, best_epoch, wait = v, epoch, 0
            best_state = {k: p.detach().clone() for k, p in model.state_dict().items()}
        else:
            wait += 1
            if wait >= patience:
                break
    if best_state is not None:
        model.load_state_dict(best_state)
    return best_epoch

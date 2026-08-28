from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


REPORT_DIR = Path(__file__).resolve().parent
DATA_PATH = REPORT_DIR / "data" / "scoped-pair-gradient-results.json"
OUTPUT_PATH = REPORT_DIR / "figures" / "08-scoped-pair-gradient-result.png"
CLASSES = ["Healthy", "BRB1", "BRB2", "BRB3", "BRB4"]


def draw_confusion(axis: plt.Axes, matrix: list[list[int]], title: str) -> None:
    values = np.asarray(matrix, dtype=int)
    axis.imshow(values, cmap="Blues", vmin=0, vmax=max(1, int(values.max())))
    axis.set_title(title, fontweight="bold")
    axis.set_xticks(range(len(CLASSES)), CLASSES, rotation=35, ha="right")
    axis.set_yticks(range(len(CLASSES)), CLASSES)
    axis.set_xlabel("Classe prédite")
    axis.set_ylabel("Classe réelle")
    threshold = values.max() * 0.55
    for row in range(values.shape[0]):
        for column in range(values.shape[1]):
            axis.text(column, row, str(values[row, column]), ha="center", va="center", color="white" if values[row, column] > threshold else "#17324d")


def main() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    comparisons = data["comparisons"]
    names = ["Baseline\n3 bandes", "Branche\nseule", "Loss pair\npartagée", "Gradient\nconfiné"]
    keys = ["baselineThreeBands", "specialistWithoutAuxiliary", "specialistWeightedPairLoss"]
    test_scores = [100 * comparisons[key]["testAccuracy"] for key in keys] + [100 * data["heldOutTest"]["accuracy"]]
    validation_scores = [100 * comparisons[key]["validationAccuracy"] for key in keys] + [100 * data["checkpoint"]["validationAccuracy"]]

    figure, axes = plt.subplots(1, 3, figsize=(15, 4.8), gridspec_kw={"width_ratios": [1, 1, 1.15]})
    draw_confusion(axes[0], data["checkpoint"]["validationConfusionMatrix"], "Validation, 160/200")
    draw_confusion(axes[1], data["heldOutTest"]["confusionMatrix"], "Test indépendant, 298/400")

    positions = np.arange(len(names))
    width = 0.36
    axes[2].bar(positions - width / 2, validation_scores, width, label="Validation", color="#246b9e")
    axes[2].bar(positions + width / 2, test_scores, width, label="Test", color="#d17a22")
    axes[2].axhline(test_scores[0], color="#d17a22", linestyle=":", linewidth=1)
    axes[2].set_xticks(positions, names)
    axes[2].set_ylim(65, 82)
    axes[2].set_ylabel("Exactitude (%)")
    axes[2].set_title("Comparaison contrôlée", fontweight="bold")
    axes[2].grid(axis="y", alpha=0.25)
    axes[2].legend(frameon=False)
    for bars in axes[2].containers:
        axes[2].bar_label(bars, fmt="%.2f", padding=2, fontsize=8)

    figure.suptitle("Branche Healthy/BRB1 avec gradient auxiliaire confiné", fontsize=13, fontweight="bold")
    figure.tight_layout(rect=(0, 0, 1, 0.94))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(OUTPUT_PATH, dpi=220, facecolor="white", bbox_inches="tight")
    plt.close(figure)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()

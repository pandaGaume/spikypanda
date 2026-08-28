from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


REPORT_DIR = Path(__file__).resolve().parent
DATA_PATH = REPORT_DIR / "data" / "recurrent-lif-conversion-profile-results.json"
OUTPUT_PATH = REPORT_DIR / "figures" / "11-recurrent-lif-conversion-profile.png"
CLASSES = ["Healthy", "BRB1", "BRB2", "BRB3", "BRB4"]


def label_bars(axis: plt.Axes, bars, suffix: str = "") -> None:
    for bar in bars:
        value = bar.get_height()
        axis.text(
            bar.get_x() + bar.get_width() / 2,
            value + 0.8,
            f"{value:.1f}{suffix}",
            ha="center",
            va="bottom",
            fontsize=8.5,
        )


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
            color = "white" if values[row, column] > threshold else "#17324d"
            axis.text(column, row, str(values[row, column]), ha="center", va="center", color=color)


def main() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    profile = data["conversionProfile"]
    control = data["fixedDenseControl"]
    checkpoint = data["checkpoint"]
    test = data["independentTest"]

    figure, axes = plt.subplots(2, 3, figsize=(17, 9.8))

    names = ["Dense fixe", "Récurrent sparse"]
    validation = [100 * control["validationAccuracy"], 100 * checkpoint["validationAccuracy"]]
    independent = [100 * control["independentTestAccuracy"], 100 * test["accuracy"]]
    positions = np.arange(2)
    width = 0.34
    val_bars = axes[0, 0].bar(positions - width / 2, validation, width, color="#246b9e", label="Validation")
    test_bars = axes[0, 0].bar(positions + width / 2, independent, width, color="#d17a22", label="Test indépendant")
    axes[0, 0].set_xticks(positions, names)
    axes[0, 0].set_ylim(0, 90)
    axes[0, 0].set_ylabel("Exactitude (%)")
    axes[0, 0].set_title("La récurrence dégrade le résultat", fontweight="bold")
    axes[0, 0].grid(axis="y", alpha=0.24)
    axes[0, 0].legend(frameon=False)
    label_bars(axes[0, 0], val_bars, "%")
    label_bars(axes[0, 0], test_bars, "%")

    divergence = np.asarray(profile["divergenceByTimestep"], dtype=float)
    time_ms = np.arange(len(divergence)) / data["dataset"]["sampleRateHz"] * 1000.0
    axes[0, 1].plot(time_ms, divergence, color="#b83b5e", linewidth=2)
    axes[0, 1].fill_between(time_ms, 0, divergence, color="#b83b5e", alpha=0.14)
    axes[0, 1].set_xlabel("Temps depuis le début de la fenêtre (ms)")
    axes[0, 1].set_ylabel("D(t), écart moyen de membrane")
    axes[0, 1].set_title("L'écart soft/hard s'accumule", fontweight="bold")
    axes[0, 1].grid(alpha=0.24)

    layer_names = ["32 LIF cachés", "5 LIF de sortie"]
    soft_rates = [profile["hidden"]["softFiringRateMeanHz"], profile["output"]["softFiringRateMeanHz"]]
    hard_rates = [profile["hidden"]["hardFiringRateMeanHz"], profile["output"]["hardFiringRateMeanHz"]]
    soft_bars = axes[0, 2].bar(positions - width / 2, soft_rates, width, color="#4c78a8", label="Soft attendu")
    hard_bars = axes[0, 2].bar(positions + width / 2, hard_rates, width, color="#f28e2b", label="Hard réel")
    axes[0, 2].set_xticks(positions, layer_names)
    axes[0, 2].set_ylabel("Décharges moyennes (Hz par neurone)")
    axes[0, 2].set_ylim(0, max(soft_rates) * 1.28)
    axes[0, 2].set_title("Le réseau hard décharge trop peu", fontweight="bold")
    axes[0, 2].grid(axis="y", alpha=0.24)
    axes[0, 2].legend(frameon=False)
    label_bars(axes[0, 2], soft_bars)
    label_bars(axes[0, 2], hard_bars)

    stages = profile["stages"]
    stage_names = [
        "Tous soft",
        "Cachés 0..7 hard",
        "Cachés 0..15 hard",
        "Cachés 0..23 hard",
        "Cachés 0..31 hard",
        "Sorties hard seules",
        "Tous hard",
    ]
    stage_accuracy = [100 * stage["accuracy"] for stage in stages]
    stage_margin = [stage["meanMargin"] for stage in stages]
    colors = ["#4c78a8"] + ["#8aa6c1"] * 4 + ["#59a14f", "#f28e2b"]
    y_positions = np.arange(len(stages))
    bars = axes[1, 0].barh(y_positions, stage_accuracy, color=colors)
    axes[1, 0].set_yticks(y_positions, stage_names)
    axes[1, 0].invert_yaxis()
    axes[1, 0].set_xlim(0, 80)
    axes[1, 0].set_xlabel("Exactitude validation (%)")
    axes[1, 0].set_title("Conversion progressive des couches", fontweight="bold")
    axes[1, 0].grid(axis="x", alpha=0.24)
    for bar, value in zip(bars, stage_accuracy):
        axes[1, 0].text(value + 0.8, bar.get_y() + bar.get_height() / 2, f"{value:.1f}%", va="center", fontsize=8.5)

    axes[1, 1].plot(stage_margin, marker="o", color="#7b2cbf", linewidth=2)
    axes[1, 1].axhline(0, color="#444444", linewidth=0.8)
    axes[1, 1].set_xticks(range(len(stages)), ["Soft", "H8", "H16", "H24", "H32", "O5", "Hard"])
    axes[1, 1].set_ylabel("Marge moyenne de la vraie classe")
    axes[1, 1].set_title("La marge disparaît à la conversion", fontweight="bold")
    axes[1, 1].grid(alpha=0.24)
    axes[1, 1].text(
        0.03,
        0.06,
        f"Soft: {profile['decision']['softMargin']:.3f}\nHard: {profile['decision']['hardMargin']:.3f}",
        transform=axes[1, 1].transAxes,
        fontsize=9,
    )

    draw_confusion(
        axes[1, 2],
        test["confusionMatrix"],
        f"Test indépendant, {test['correct']}/{test['total']}",
    )

    figure.suptitle("SNN LIF récurrent sparse: fidélité de la conversion soft vers hard", fontsize=15, fontweight="bold")
    figure.tight_layout(rect=(0, 0, 1, 0.96))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(OUTPUT_PATH, dpi=220, facecolor="white", bbox_inches="tight")
    plt.close(figure)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


REPORT_DIR = Path(__file__).resolve().parent
DATA_PATH = REPORT_DIR / "data" / "runtime-decoder-loss-ab-results.json"
OUTPUT_PATH = REPORT_DIR / "figures" / "12-runtime-decoder-loss-ab.png"
CLASSES = ["Healthy", "BRB1", "BRB2", "BRB3", "BRB4"]


def label_bars(axis: plt.Axes, bars, suffix: str = "") -> None:
    for bar in bars:
        value = bar.get_height()
        axis.text(
            bar.get_x() + bar.get_width() / 2,
            value + max(0.5, axis.get_ylim()[1] * 0.012),
            f"{value:.1f}{suffix}",
            ha="center",
            va="bottom",
            fontsize=9,
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
    aligned = data["alignedRuntimeDecoderCrossEntropy"]
    control = data["temporalMseControl"]

    figure, axes = plt.subplots(2, 3, figsize=(17, 9.8))

    epochs = [point["epoch"] for point in aligned["history"]]
    aligned_validation = [point["validationAccuracyPercent"] for point in aligned["history"]]
    control_validation = [point["validationAccuracyPercent"] for point in control["history"]]
    axes[0, 0].plot(epochs, control_validation, marker="o", markersize=3.5, color="#9b5966", label="MSE temporelle")
    axes[0, 0].plot(epochs, aligned_validation, marker="o", markersize=3.5, color="#246b9e", label="Loss décodeur")
    axes[0, 0].set_xlabel("Epoch")
    axes[0, 0].set_ylabel("Exactitude validation (%)")
    axes[0, 0].set_ylim(20, 90)
    axes[0, 0].set_title("Convergence sur le même forward hard", fontweight="bold")
    axes[0, 0].grid(alpha=0.24)
    axes[0, 0].legend(frameon=False)

    positions = np.arange(2)
    width = 0.34
    validation = [control["best"]["validationAccuracyPercent"], aligned["best"]["validationAccuracyPercent"]]
    independent = [control["independentTest"]["accuracyPercent"], aligned["independentTest"]["accuracyPercent"]]
    val_bars = axes[0, 1].bar(positions - width / 2, validation, width, color="#4c78a8", label="Validation")
    test_bars = axes[0, 1].bar(positions + width / 2, independent, width, color="#f28e2b", label="Test indépendant")
    axes[0, 1].set_xticks(positions, ["MSE", "Loss décodeur"])
    axes[0, 1].set_ylim(0, 95)
    axes[0, 1].set_ylabel("Exactitude (%)")
    axes[0, 1].set_title("Gain sur validation et test", fontweight="bold")
    axes[0, 1].grid(axis="y", alpha=0.24)
    axes[0, 1].legend(frameon=False)
    label_bars(axes[0, 1], val_bars, "%")
    label_bars(axes[0, 1], test_bars, "%")

    spike_bars = axes[0, 2].bar(
        ["MSE", "Loss décodeur"],
        [control["independentTest"]["neuronSpikesPerSample"], aligned["independentTest"]["neuronSpikesPerSample"]],
        color=["#9b5966", "#59a14f"],
    )
    axes[0, 2].set_ylim(0, 215)
    axes[0, 2].set_ylabel("Spikes neuronaux par fenêtre")
    axes[0, 2].set_title("Activité réduite de 33,8 %", fontweight="bold")
    axes[0, 2].grid(axis="y", alpha=0.24)
    label_bars(axes[0, 2], spike_bars)

    draw_confusion(
        axes[1, 0],
        control["independentTest"]["confusionMatrix"],
        "Test MSE, 51,0 %",
    )
    draw_confusion(
        axes[1, 1],
        aligned["independentTest"]["confusionMatrix"],
        "Test loss décodeur, 78,5 %",
    )

    class_positions = np.arange(len(CLASSES))
    output_width = 0.38
    control_rates = control["best"]["outputFiringRatesHz"]
    aligned_rates = aligned["best"]["outputFiringRatesHz"]
    axes[1, 2].bar(class_positions - output_width / 2, control_rates, output_width, color="#9b5966", label="MSE")
    axes[1, 2].bar(class_positions + output_width / 2, aligned_rates, output_width, color="#246b9e", label="Loss décodeur")
    axes[1, 2].set_xticks(class_positions, CLASSES, rotation=35, ha="right")
    axes[1, 2].set_ylabel("Décharges de sortie (Hz)")
    axes[1, 2].set_title("La loss alignée utilise surtout la membrane", fontweight="bold")
    axes[1, 2].grid(axis="y", alpha=0.24)
    axes[1, 2].legend(frameon=False)

    figure.suptitle("SNN hard-forward : effet de la loss alignée sur le décodeur natif", fontsize=15, fontweight="bold")
    figure.tight_layout(rect=(0, 0, 1, 0.96))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(OUTPUT_PATH, dpi=220, facecolor="white", bbox_inches="tight")
    plt.close(figure)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


REPORT_DIR = Path(__file__).resolve().parent
DATA_PATH = REPORT_DIR / "data" / "spike-aligned-receptive-fields-results.json"
OUTPUT_PATH = REPORT_DIR / "figures" / "10-spike-aligned-receptive-fields-result.png"
CLASSES = ["Healthy", "BRB1", "BRB2", "BRB3", "BRB4"]
SAMPLE_RATE_HZ = 120.110151


def biquad_magnitude(frequencies_hz: np.ndarray, center_hz: float, bandwidth_hz: float) -> np.ndarray:
    omega_center = 2 * np.pi * center_hz / SAMPLE_RATE_HZ
    quality = max(1e-6, center_hz / bandwidth_hz)
    alpha = np.sin(omega_center) / (2 * quality)
    a0 = 1 + alpha
    b0 = alpha / a0
    b2 = -alpha / a0
    a1 = -2 * np.cos(omega_center) / a0
    a2 = (1 - alpha) / a0
    omega = 2 * np.pi * frequencies_hz / SAMPLE_RATE_HZ
    z1 = np.exp(-1j * omega)
    return np.abs((b0 + b2 * z1**2) / (1 + a1 * z1 + a2 * z1**2))


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
    fields = data["fields"]
    learned = data["learnedModel"]
    comparisons = data["comparisons"]
    figure, axes = plt.subplots(2, 2, figsize=(13.5, 9.2))

    frequency_axis = np.linspace(0.05, 8.0, 800)
    colors = ["#1b6ca8", "#d17a22", "#368b5b"]
    for index, field in enumerate(fields):
        initial = biquad_magnitude(frequency_axis, field["initialCenterFrequencyHz"], field["initialBandwidthHz"])
        final = biquad_magnitude(frequency_axis, field["learnedCenterFrequencyHz"], field["learnedBandwidthHz"])
        axes[0, 0].plot(frequency_axis, initial, color=colors[index], linestyle=":", alpha=0.75)
        axes[0, 0].plot(
            frequency_axis,
            final,
            color=colors[index],
            linewidth=2,
            label=f"Champ {index + 1}: {field['learnedCenterFrequencyHz']:.3f} Hz, R={field['learnedRedundancy']:.2f}",
        )
    axes[0, 0].set_title("Réponse fréquentielle et redondance", fontweight="bold")
    axes[0, 0].set_xlabel("Fréquence (Hz)")
    axes[0, 0].set_ylabel("Gain relatif")
    axes[0, 0].set_xlim(0, 8)
    axes[0, 0].set_ylim(0, 1.05)
    axes[0, 0].grid(alpha=0.22)
    axes[0, 0].legend(frameon=False, fontsize=8.5)
    axes[0, 0].text(0.03, 0.04, "Pointillé: initial, trait plein: appris", transform=axes[0, 0].transAxes, fontsize=8.5)

    keys = ["fixedBaseline", "rmsReceptiveFields", "spikeAlignedReceptiveFields"]
    names = ["Bandes\nfixes", "Champs\nRMS", "Champs\nspikes"]
    validation_scores = [100 * comparisons[key]["validationAccuracy"] for key in keys]
    test_scores = [100 * comparisons[key]["testAccuracy"] for key in keys]
    positions = np.arange(len(names))
    width = 0.34
    validation_bars = axes[0, 1].bar(positions - width / 2, validation_scores, width, label="Validation", color="#246b9e")
    test_bars = axes[0, 1].bar(positions + width / 2, test_scores, width, label="Test indépendant", color="#d17a22")
    axes[0, 1].set_xticks(positions, names)
    axes[0, 1].set_ylim(60, 82)
    axes[0, 1].set_ylabel("Exactitude (%)")
    axes[0, 1].set_title("Comparaison contrôlée", fontweight="bold")
    axes[0, 1].grid(axis="y", alpha=0.25)
    axes[0, 1].legend(frameon=False)
    axes[0, 1].bar_label(validation_bars, fmt="%.2f", padding=2)
    axes[0, 1].bar_label(test_bars, fmt="%.2f", padding=2)

    draw_confusion(
        axes[1, 0],
        learned["validationConfusionMatrix"],
        f"Validation, {learned['validationCorrect']}/{learned['validationTotal']}",
    )
    draw_confusion(
        axes[1, 1],
        learned["testConfusionMatrix"],
        f"Test indépendant, {learned['testCorrect']}/{learned['testTotal']}",
    )
    figure.suptitle("Champs récepteurs réglés sur une approximation des spikes", fontsize=14, fontweight="bold")
    figure.tight_layout(rect=(0, 0, 1, 0.96))
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(OUTPUT_PATH, dpi=220, facecolor="white", bbox_inches="tight")
    plt.close(figure)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()

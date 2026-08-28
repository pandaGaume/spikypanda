from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Iterable, Sequence

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


REPORT_DIR = Path(__file__).resolve().parent
REPO_ROOT = REPORT_DIR.parents[2]
DATA_PATH = REPORT_DIR / "data" / "experiment-results.json"
CHECKPOINT_PATH = REPORT_DIR / "data" / "winner-checkpoint.json"
TEST_DATA_PATH = REPO_ROOT / "packages" / "host" / "www" / "data" / "motor_current" / "test_grouped.json"
FIGURE_DIR = REPORT_DIR / "figures"
PDF_PATH = REPO_ROOT / "output" / "pdf" / "motor-current-snn-rd-experiment-2026-08-27.pdf"

CLASSES = ["Healthy", "BRB1", "BRB2", "BRB3", "BRB4"]
DISPLAY_CLASSES = ["Sain", "BRB1", "BRB2", "BRB3", "BRB4"]
CLASS_COLORS = ["#2962ff", "#7b1fa2", "#00897b", "#f9a825", "#d32f2f"]
TRIAL_COLORS = {
    "phase-binary-dense": "#1565c0",
    "phase-amplitude-dense": "#00897b",
    "phase-multilevel-dense": "#d32f2f",
    "phase-binary-phase-fusion": "#90caf9",
    "phase-amplitude-phase-fusion": "#80cbc4",
    "phase-multilevel-phase-fusion": "#ef9a9a",
}
NAVY = colors.HexColor("#17324d")
BLUE = colors.HexColor("#246b9e")
LIGHT_BLUE = colors.HexColor("#eaf3f8")
LIGHT_GREY = colors.HexColor("#f2f4f6")
MID_GREY = colors.HexColor("#6b7785")
RED = colors.HexColor("#b3261e")
GREEN = colors.HexColor("#1b7f5a")


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def configure_plotting() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 9,
            "axes.titlesize": 10,
            "axes.labelsize": 9,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "figure.facecolor": "white",
            "axes.facecolor": "#fbfcfd",
            "grid.color": "#d9e0e6",
            "grid.alpha": 0.7,
            "savefig.bbox": "tight",
        }
    )


def save_figure(fig: plt.Figure, name: str) -> Path:
    FIGURE_DIR.mkdir(parents=True, exist_ok=True)
    path = FIGURE_DIR / name
    fig.savefig(path, dpi=220, facecolor="white")
    plt.close(fig)
    return path


def wilson_interval(correct: int, total: int, z: float = 1.959963984540054) -> tuple[float, float]:
    if total <= 0:
        return (0.0, 0.0)
    p = correct / total
    denominator = 1 + z * z / total
    centre = (p + z * z / (2 * total)) / denominator
    half = z * math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / denominator
    return centre - half, centre + half


def classification_metrics(matrix: Sequence[Sequence[int]]) -> dict:
    cmatrix = np.asarray(matrix, dtype=float)
    total = int(cmatrix.sum())
    correct = int(np.trace(cmatrix))
    per_class = []
    for index, name in enumerate(CLASSES):
        tp = cmatrix[index, index]
        support = cmatrix[index, :].sum()
        predicted = cmatrix[:, index].sum()
        recall = tp / support if support else 0.0
        precision = tp / predicted if predicted else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_class.append(
            {
                "class": name,
                "support": int(support),
                "precision": precision,
                "recall": recall,
                "f1": f1,
            }
        )
    return {
        "accuracy": correct / total,
        "correct": correct,
        "total": total,
        "balancedAccuracy": float(np.mean([item["recall"] for item in per_class])),
        "macroF1": float(np.mean([item["f1"] for item in per_class])),
        "perClass": per_class,
    }


def find_examples(samples: list[dict], load: str = "torque40") -> list[dict]:
    examples = []
    for label in range(len(CLASSES)):
        matches = [sample for sample in samples if sample["label"] == label and sample.get("sourceLoad") == load]
        if not matches:
            matches = [sample for sample in samples if sample["label"] == label]
        examples.append(matches[0])
    return examples


def figure_signal_examples(test_data: dict) -> Path:
    examples = find_examples(test_data["samples"])
    sample_rate = float(test_data["sampleRateHz"])
    time = np.arange(test_data["windowSize"]) / sample_rate
    fig, axes = plt.subplots(5, 1, figsize=(10.5, 10.5), sharex=True, sharey=True)
    for index, (axis, sample) in enumerate(zip(axes, examples)):
        sequence = np.asarray(sample["sequence"], dtype=float)
        for channel, color in enumerate(["#1565c0", "#ef6c00", "#2e7d32"]):
            axis.plot(time, sequence[:, channel], color=color, linewidth=1.25, label=["Ia", "Ib", "Ic"][channel])
        axis.set_ylim(0, 1)
        axis.set_ylabel(DISPLAY_CLASSES[index])
        axis.grid(True, axis="x")
        axis.text(
            0.995,
            0.92,
            f"{sample.get('sourceLoad', '?')} | {sample.get('sourceGroup', '?')} | start={sample.get('windowStart', '?')}",
            transform=axis.transAxes,
            ha="right",
            va="top",
            fontsize=7,
            color="#4f5b66",
        )
    axes[0].legend(loc="lower right", ncol=3, frameon=False)
    axes[-1].set_xlabel("Temps dans la fenêtre (s)")
    fig.suptitle("Signaux préparés, un exemple tenu à l'écart pour chacun des cinq états", fontsize=13, fontweight="bold")
    fig.text(0.01, 0.5, "Amplitude normalisée [0, 1]", rotation=90, va="center", fontsize=9)
    fig.tight_layout(rect=(0.025, 0.02, 1, 0.97))
    return save_figure(fig, "01-grouped-signal-examples.png")


def bandpass_coefficients(sample_rate: float, center_hz: float, bandwidth_hz: float) -> tuple[float, float, float, float, float]:
    omega = 2 * math.pi * center_hz / sample_rate
    quality = max(1e-6, center_hz / bandwidth_hz)
    alpha = math.sin(omega) / (2 * quality)
    a0 = 1 + alpha
    return alpha / a0, 0.0, -alpha / a0, (-2 * math.cos(omega)) / a0, (1 - alpha) / a0


def encode_one_band(signal: np.ndarray, sample_rate: float, band: dict) -> tuple[np.ndarray, list[dict]]:
    b0, b1, b2, a1, a2 = bandpass_coefficients(sample_rate, band["centerFrequencyHz"], band["bandwidthHz"])
    filtered = np.zeros_like(signal, dtype=float)
    x1 = float(signal[0])
    x2 = float(signal[0])
    y1 = 0.0
    y2 = 0.0
    previous_y = 0.0
    peak = 0.0
    initialized = False
    events: list[dict] = []
    thresholds = list(band["thresholds"])
    for index in range(1, len(signal)):
        value = float(signal[index])
        y = b0 * value + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        filtered[index] = y
        x2, x1 = x1, value
        y2, y1 = y1, y
        if not initialized:
            initialized = True
            previous_y = y
            peak = abs(y)
            continue
        polarity = None
        if previous_y <= 0 < y:
            polarity = "rising"
        elif previous_y >= 0 > y:
            polarity = "falling"
        if polarity is not None:
            for level, threshold in enumerate(thresholds):
                if peak >= threshold:
                    events.append(
                        {
                            "time": index / sample_rate,
                            "polarity": polarity,
                            "level": level,
                            "threshold": threshold,
                            "peak": peak,
                        }
                    )
            peak = abs(y)
        else:
            peak = max(peak, abs(y))
        previous_y = y
    return filtered, events


def figure_sensor_response(test_data: dict, checkpoint: dict) -> Path:
    samples = test_data["samples"]
    sample = next(sample for sample in samples if sample["label"] == 4 and sample.get("sourceLoad") == "torque40")
    signal = np.asarray(sample["sequence"], dtype=float)[:, 0]
    sample_rate = float(test_data["sampleRateHz"])
    time = np.arange(len(signal)) / sample_rate
    bands = [band for band in checkpoint["model"]["snn"]["sensorConfig"]["bands"] if band["channel"] == 0]
    fig, axes = plt.subplots(
        5,
        1,
        figsize=(10.5, 12.0),
        sharex=True,
        gridspec_kw={"height_ratios": [1, 1, 1, 1, 1.8]},
    )
    axes[0].plot(time, signal, color="#263238", linewidth=1.4)
    axes[0].set_ylabel("Ia norm.")
    axes[0].set_title("Entrée du capteur, défaut BRB4, charge torque40, phase Ia")
    axes[0].grid(True, axis="x")
    raster_axis = axes[-1]
    raster_tick_positions = []
    raster_tick_labels = []
    raster_row = 0
    for band_index, band in enumerate(bands):
        filtered, events = encode_one_band(signal, sample_rate, band)
        axis = axes[band_index + 1]
        axis.plot(time, filtered, color=CLASS_COLORS[band_index + 1], linewidth=1.3)
        threshold_text = ", ".join(f"{value:.3f}" for value in band["thresholds"])
        axis.set_ylabel(f"{band['centerFrequencyHz']:.3f} Hz")
        axis.text(0.99, 0.88, f"seuils de crête: {threshold_text}", transform=axis.transAxes, ha="right", va="top", fontsize=7)
        axis.axhline(0, color="#6b7785", linewidth=0.6)
        axis.grid(True, axis="x")
        for polarity in ["rising", "falling"]:
            for level in range(3):
                times = [event["time"] for event in events if event["polarity"] == polarity and event["level"] == level]
                if times:
                    raster_axis.vlines(times, raster_row - 0.35, raster_row + 0.35, color=CLASS_COLORS[band_index + 1], linewidth=1.1)
                raster_tick_positions.append(raster_row)
                direction = "M" if polarity == "rising" else "D"
                raster_tick_labels.append(f"{band['centerFrequencyHz']:.3f} {direction} N{level + 1}")
                raster_row += 1
    raster_axis.set_ylim(-1, raster_row)
    raster_axis.set_yticks(raster_tick_positions)
    raster_axis.set_yticklabels(raster_tick_labels, fontsize=6)
    raster_axis.set_ylabel("Sorties Ia")
    raster_axis.set_xlabel("Temps (s)")
    raster_axis.set_title("Chronologie des impulsions, montée et descente séparées pour chaque seuil")
    raster_axis.grid(True, axis="x")
    fig.suptitle("Réponse du capteur ondulatoire à trois seuils", fontsize=13, fontweight="bold")
    fig.tight_layout(rect=(0, 0.01, 1, 0.97))
    return save_figure(fig, "02-wave-sensor-response.png")


def trial_label(trial: dict) -> str:
    encoding = trial["sensorMode"].replace("phase-", "")
    encoding_name = {"binary": "un seuil", "amplitude": "amplitude", "multilevel": "trois seuils"}[encoding]
    topology = "connecté" if trial["topology"] == "dense" else "séparé"
    return f"{encoding_name} / {topology}"


def figure_learning_curves(results: dict) -> Path:
    fig, axes = plt.subplots(2, 1, figsize=(10.5, 8.6), sharex=True)
    for trial in results["trials"]:
        history = np.asarray(trial["history"], dtype=float)
        label = trial_label(trial)
        color = TRIAL_COLORS[trial["id"]]
        style = "-" if trial["topology"] == "dense" else "--"
        axes[0].plot(history[:, 0], history[:, 1], style, color=color, linewidth=1.7, label=label)
        axes[1].plot(history[:, 0], history[:, 2] * 100, style, color=color, linewidth=1.7, label=label)
        best_index = int(np.argmax(history[:, 2]))
        axes[1].scatter(history[best_index, 0], history[best_index, 2] * 100, color=color, s=28, zorder=4)
    axes[0].set_ylabel("Erreur quadratique pondérée")
    axes[0].set_title("Perte d'entraînement")
    axes[0].grid(True)
    axes[0].set_yscale("log")
    axes[1].set_ylabel("Fenêtres bien classées en validation (%)")
    axes[1].set_xlabel("Passage complet sur les données")
    axes[1].set_title("Résultat de validation et meilleure sauvegarde")
    axes[1].axhline(20, color="#6b7785", linestyle=":", linewidth=1, label="hasard 5 classes")
    axes[1].grid(True)
    handles, labels = axes[1].get_legend_handles_labels()
    fig.legend(handles, labels, loc="lower center", ncol=4, frameon=False, fontsize=8)
    fig.suptitle("Courbes d'apprentissage des six essais, même initialisation et mêmes données", fontsize=13, fontweight="bold")
    fig.tight_layout(rect=(0, 0.09, 1, 0.96))
    return save_figure(fig, "03-learning-curves.png")


def figure_ablation(results: dict) -> Path:
    trials = results["trials"]
    labels = [trial_label(trial) for trial in trials]
    accuracy = np.asarray([trial["bestValidationAccuracy"] * 100 for trial in trials])
    weights = np.asarray([trial["trainableWeights"] for trial in trials])
    events = np.asarray([trial["inputEventsPerSample"] for trial in trials])
    colors_list = [TRIAL_COLORS[trial["id"]] for trial in trials]
    fig, axes = plt.subplots(1, 2, figsize=(12.0, 5.3))
    positions = np.arange(len(trials))
    bars = axes[0].bar(positions, accuracy, color=colors_list, edgecolor="white")
    axes[0].axhline(20, color="#6b7785", linestyle=":", linewidth=1)
    axes[0].set_xticks(positions)
    axes[0].set_xticklabels(labels, rotation=28, ha="right")
    axes[0].set_ylabel("Meilleure validation (%)")
    axes[0].set_ylim(0, 75)
    axes[0].set_title("Effet du capteur et de l'organisation du réseau")
    for bar, value in zip(bars, accuracy):
        axes[0].text(bar.get_x() + bar.get_width() / 2, value + 1.2, f"{value:.1f}", ha="center", fontsize=8)
    for index, trial in enumerate(trials):
        marker = "o" if trial["topology"] == "dense" else "s"
        axes[1].scatter(weights[index], accuracy[index], s=55 + events[index] * 0.7, color=colors_list[index], marker=marker, edgecolor="#263238", linewidth=0.6)
        label_offsets = {
            "phase-binary-phase-fusion": (6, -12),
            "phase-amplitude-phase-fusion": (6, 7),
            "phase-multilevel-phase-fusion": (6, 7),
        }
        axes[1].annotate(
            labels[index],
            (weights[index], accuracy[index]),
            xytext=label_offsets.get(trial["id"], (5, 5)),
            textcoords="offset points",
            fontsize=7,
            bbox={"boxstyle": "round,pad=0.12", "facecolor": "white", "edgecolor": "none", "alpha": 0.75},
        )
    axes[1].set_xlabel("Poids entraînables")
    axes[1].set_ylabel("Meilleure validation (%)")
    axes[1].set_title("Précision selon le nombre de poids, taille = nombre d'impulsions")
    axes[1].grid(True)
    fig.suptitle("Comparaison contrôlée: trois seuils sont plus précis, le réseau séparé est plus petit", fontsize=12, fontweight="bold")
    fig.tight_layout(rect=(0, 0, 1, 0.94))
    return save_figure(fig, "04-ablation-and-cost-pareto.png")


def draw_confusion(axis: plt.Axes, matrix: Sequence[Sequence[int]], title: str, normalize: bool = False) -> None:
    counts = np.asarray(matrix, dtype=float)
    values = counts / np.maximum(counts.sum(axis=1, keepdims=True), 1) if normalize else counts
    image = axis.imshow(values, cmap="Blues", vmin=0, vmax=(1 if normalize else max(1, counts.max())))
    axis.set_xticks(range(len(CLASSES)))
    axis.set_xticklabels(DISPLAY_CLASSES, rotation=35, ha="right", fontsize=7)
    axis.set_yticks(range(len(CLASSES)))
    axis.set_yticklabels(DISPLAY_CLASSES, fontsize=7)
    axis.set_xlabel("Prédit", fontsize=8)
    axis.set_ylabel("Réel", fontsize=8)
    axis.set_title(title, fontsize=9, fontweight="bold")
    threshold = values.max() * 0.55
    for row in range(values.shape[0]):
        for column in range(values.shape[1]):
            label = f"{values[row, column] * 100:.1f}%" if normalize else str(int(counts[row, column]))
            axis.text(column, row, label, ha="center", va="center", fontsize=7, color="white" if values[row, column] > threshold else "#17324d")
    return image


def figure_validation_confusions(results: dict) -> Path:
    fig, axes = plt.subplots(2, 3, figsize=(12.5, 8.2))
    for axis, trial in zip(axes.flat, results["trials"]):
        draw_confusion(axis, trial["validationConfusionMatrix"], f"{trial_label(trial)} | {trial['bestValidationAccuracy'] * 100:.1f}%")
    fig.suptitle("Erreurs de classement en validation au meilleur passage, 200 fenêtres par essai", fontsize=13, fontweight="bold")
    fig.tight_layout(rect=(0, 0, 1, 0.96))
    return save_figure(fig, "05-validation-confusion-matrices.png")


def figure_final_confusion(results: dict) -> Path:
    matrix = results["winner"]["heldOutTest"]["confusionMatrix"]
    fig, axes = plt.subplots(1, 2, figsize=(11.8, 5.0))
    draw_confusion(axes[0], matrix, "Comptages, n = 400")
    draw_confusion(axes[1], matrix, "Normalisation par classe réelle", normalize=True)
    fig.suptitle("Test final: capteur à trois seuils et réseau entièrement connecté, 60,75%", fontsize=13, fontweight="bold")
    fig.tight_layout(rect=(0, 0, 1, 0.94))
    return save_figure(fig, "06-final-test-confusion-matrix.png")


def figure_topologies(results: dict) -> Path:
    fig, axes = plt.subplots(2, 1, figsize=(11.5, 6.5))
    for axis, topology in zip(axes, ["dense", "phase-fusion"]):
        axis.set_xlim(0, 11)
        axis.set_ylim(0, 4)
        axis.axis("off")
        if topology == "dense":
            boxes = [
                (0.3, 1.25, 1.6, 1.5, "Observation\n64 x 3"),
                (2.4, 1.05, 2.0, 1.9, "Capteur ondulatoire\n54 sorties\n9 cellules"),
                (5.1, 1.05, 2.0, 1.9, "32 neurones LIF\nentièrement connectés"),
                (8.0, 1.25, 1.6, 1.5, "5 LIF de sortie"),
            ]
            subtitle = "Réseau connecté, trois seuils: 1 893 poids, 1 894 liens"
        else:
            boxes = [
                (0.3, 1.25, 1.6, 1.5, "Observation\n64 x 3"),
                (2.3, 1.05, 1.7, 1.9, "Capteur ondulatoire\n54 sorties"),
                (4.5, 0.35, 1.5, 1.0, "8 LIF Ia"),
                (4.5, 1.5, 1.5, 1.0, "8 LIF Ib"),
                (4.5, 2.65, 1.5, 1.0, "8 LIF Ic"),
                (6.6, 1.25, 1.5, 1.5, "8 LIF fusion"),
                (8.8, 1.25, 1.5, 1.5, "5 LIF de sortie"),
            ]
            subtitle = "Réseau séparé, trois seuils: 669 poids, 670 liens"
        for x, y, width, height, text in boxes:
            box = FancyBboxPatch((x, y), width, height, boxstyle="round,pad=0.03,rounding_size=0.08", facecolor="#eaf3f8", edgecolor="#246b9e", linewidth=1.2)
            axis.add_patch(box)
            axis.text(x + width / 2, y + height / 2, text, ha="center", va="center", fontsize=9)
        if topology == "dense":
            connections = [((1.9, 2), (2.4, 2)), ((4.4, 2), (5.1, 2)), ((7.1, 2), (8.0, 2))]
        else:
            connections = [
                ((1.9, 2), (2.3, 2)),
                ((4.0, 2), (4.5, 0.85)),
                ((4.0, 2), (4.5, 2.0)),
                ((4.0, 2), (4.5, 3.15)),
                ((6.0, 0.85), (6.6, 2)),
                ((6.0, 2.0), (6.6, 2)),
                ((6.0, 3.15), (6.6, 2)),
                ((8.1, 2), (8.8, 2)),
            ]
        for start, end in connections:
            axis.add_patch(FancyArrowPatch(start, end, arrowstyle="-|>", mutation_scale=11, color="#4f5b66", linewidth=1.0))
        axis.text(10.8, 3.55, subtitle, ha="right", va="top", fontsize=9, color="#17324d", fontweight="bold")
    fig.suptitle("Deux organisations comparées avec les mêmes 32 neurones internes", fontsize=13, fontweight="bold")
    fig.tight_layout(rect=(0, 0, 1, 0.95))
    return save_figure(fig, "07-compared-topologies.png")


def register_fonts() -> tuple[str, str]:
    candidates = [
        (Path("C:/Windows/Fonts/arial.ttf"), Path("C:/Windows/Fonts/arialbd.ttf")),
        (Path(matplotlib.get_data_path()) / "fonts" / "ttf" / "DejaVuSans.ttf", Path(matplotlib.get_data_path()) / "fonts" / "ttf" / "DejaVuSans-Bold.ttf"),
    ]
    for regular, bold in candidates:
        if regular.exists() and bold.exists():
            pdfmetrics.registerFont(TTFont("ReportSans", str(regular)))
            pdfmetrics.registerFont(TTFont("ReportSans-Bold", str(bold)))
            return "ReportSans", "ReportSans-Bold"
    return "Helvetica", "Helvetica-Bold"


def build_styles(regular_font: str, bold_font: str) -> dict:
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("Title", parent=styles["Title"], fontName=bold_font, fontSize=23, leading=27, textColor=NAVY, alignment=TA_LEFT, spaceAfter=14),
        "subtitle": ParagraphStyle("Subtitle", parent=styles["Normal"], fontName=regular_font, fontSize=11, leading=15, textColor=MID_GREY, spaceAfter=18),
        "h1": ParagraphStyle("H1", parent=styles["Heading1"], fontName=bold_font, fontSize=16, leading=20, textColor=NAVY, spaceBefore=10, spaceAfter=8),
        "h2": ParagraphStyle("H2", parent=styles["Heading2"], fontName=bold_font, fontSize=12, leading=15, textColor=BLUE, spaceBefore=8, spaceAfter=5),
        "body": ParagraphStyle("Body", parent=styles["BodyText"], fontName=regular_font, fontSize=9.2, leading=13.2, textColor=colors.HexColor("#263238"), spaceAfter=6),
        "small": ParagraphStyle("Small", parent=styles["BodyText"], fontName=regular_font, fontSize=7.7, leading=10.2, textColor=colors.HexColor("#4f5b66"), spaceAfter=4),
        "caption": ParagraphStyle("Caption", parent=styles["BodyText"], fontName=regular_font, fontSize=7.5, leading=10, alignment=TA_CENTER, textColor=MID_GREY, spaceAfter=8),
        "equation": ParagraphStyle("Equation", parent=styles["Code"], fontName=regular_font, fontSize=8.3, leading=12.0, leftIndent=8, rightIndent=8, borderColor=colors.HexColor("#c9d8e3"), borderWidth=0.7, borderPadding=7, backColor=colors.HexColor("#f6fafc"), spaceBefore=4, spaceAfter=8),
        "callout": ParagraphStyle("Callout", parent=styles["BodyText"], fontName=bold_font, fontSize=10.5, leading=14.5, textColor=NAVY, borderColor=BLUE, borderWidth=1.0, borderPadding=9, backColor=LIGHT_BLUE, spaceBefore=5, spaceAfter=10),
        "warning": ParagraphStyle("Warning", parent=styles["BodyText"], fontName=regular_font, fontSize=9, leading=12.5, textColor=RED, borderColor=RED, borderWidth=0.8, borderPadding=8, backColor=colors.HexColor("#fff5f3"), spaceBefore=5, spaceAfter=8),
        "table": ParagraphStyle("TableText", parent=styles["BodyText"], fontName=regular_font, fontSize=7.2, leading=9.0, textColor=colors.HexColor("#263238")),
        "table_bold": ParagraphStyle("TableBold", parent=styles["BodyText"], fontName=bold_font, fontSize=7.2, leading=9.0, textColor=colors.white, alignment=TA_CENTER),
    }


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


def table(data: list[list], widths: list[float], styles: dict, header: bool = True) -> Table:
    converted: list[list] = []
    for row_index, row in enumerate(data):
        converted.append(
            [
                cell
                if hasattr(cell, "wrap")
                else p(str(cell), styles["table_bold"] if header and row_index == 0 else styles["table"])
                for cell in row
            ]
        )
    result = Table(converted, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cfd8df")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        commands.extend([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white)])
        for row in range(1, len(data)):
            if row % 2 == 0:
                commands.append(("BACKGROUND", (0, row), (-1, row), LIGHT_GREY))
    result.setStyle(TableStyle(commands))
    return result


def report_image(path: Path, width_cm: float, caption: str, styles: dict) -> list:
    with PILImage.open(path) as source:
        pixel_width, pixel_height = source.size
    width = width_cm * cm
    height = width * pixel_height / pixel_width
    maximum_height = 22.0 * cm
    if height > maximum_height:
        scale = maximum_height / height
        width *= scale
        height *= scale
    image = Image(str(path), width=width, height=height)
    return [image, p(caption, styles["caption"])]


def page_header_footer(canvas, document) -> None:
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#d9e0e6"))
    canvas.setLineWidth(0.5)
    canvas.line(1.7 * cm, 1.35 * cm, A4[0] - 1.7 * cm, 1.35 * cm)
    canvas.setFont("ReportSans", 7.3)
    canvas.setFillColor(MID_GREY)
    canvas.drawString(1.7 * cm, 0.9 * cm, "Spiky Panda | Rapport d'expérimentation R&D | 27 août 2026")
    canvas.drawRightString(A4[0] - 1.7 * cm, 0.9 * cm, f"Page {document.page}")
    canvas.restoreState()


def build_pdf(results: dict, checkpoint: dict, figures: dict[str, Path]) -> None:
    regular_font, bold_font = register_fonts()
    styles = build_styles(regular_font, bold_font)
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=1.7 * cm,
        rightMargin=1.7 * cm,
        topMargin=1.55 * cm,
        bottomMargin=1.95 * cm,
        title="Expérimentation SNN MCSA - ablation du capteur et de la topologie",
        author="Spiky Panda R&D",
        subject="Méthodologie, dynamique mathématique, ablations et test tenu à l'écart",
    )
    story: list = []
    winner = results["winner"]
    test = winner["heldOutTest"]
    metrics = classification_metrics(test["confusionMatrix"])
    val_low, val_high = wilson_interval(132, 200)
    test_low, test_high = wilson_interval(test["correct"], test["total"])

    story.extend(
        [
            Spacer(1, 1.2 * cm),
            p("Rapport d'expérimentation R&amp;D", styles["title"]),
            p("SNN pour l'analyse MCSA de défauts de barres rotoriques", styles["title"]),
            p("Ablation contrôlée du capteur ondulatoire et de la topologie LIF", styles["subtitle"]),
            Spacer(1, 0.4 * cm),
            p(
                "Résultat principal: le couple <b>phase-multilevel + dense</b> est sélectionné à 66,0% sur validation, puis obtient <b>60,75% (243/400)</b> sur le jeu de test tenu à l'écart. Le modèle compilé contient 37 neurones LIF natifs, 1 894 liens et 1 893 poids entraînés.",
                styles["callout"],
            ),
            table(
                [
                    ["Champ", "Valeur"],
                    ["Date d'exécution", "27 août 2026"],
                    ["Commit de base", results["repositoryCommit"]],
                    ["Signature gagnante", winner["architectureSignature"]],
                    ["Checkpoint SHA-256", winner["checkpointSha256"]],
                    ["Protocole", "6 ablations sur validation, test final consulté une seule fois"],
                    ["Réplicats", "1 graine déterministe, résultats exploratoires non confirmatoires"],
                ],
                [4.5 * cm, 11.6 * cm],
                styles,
            ),
            Spacer(1, 0.5 * cm),
            p("Résumé exécutif", styles["h1"]),
            p(
                "L'expérience teste deux facteurs: trois encodages du capteur ondulatoire (binary, amplitude, multilevel) et deux topologies à budget identique de 32 LIF cachés (dense, phase-fusion). Les six combinaisons reçoivent le même split groupé, la même graine, le même optimiseur et 20 époques. Les fréquences et seuils du capteur sont calculés uniquement sur les 1 400 fenêtres d'ajustement.",
                styles["body"],
            ),
            p(
                "Le multilevel apporte le gain dominant: +24,0 points dans la topologie dense face au binary. La phase-fusion réduit les poids de 1 893 à 669 pour le multilevel, soit -64,7%, mais perd 13,5 points de validation. Cette version compacte est donc sous-capacitaire dans son état actuel.",
                styles["body"],
            ),
            p(
                "Aucune consommation énergétique n'a été mesurée. Les quantités 126,05 événements d'entrée et 17,09 spikes neuronaux par fenêtre sont des proxys d'activité, pas des joules. Une mesure MCU exige un firmware, un appareil, une fréquence d'horloge, une précision numérique et un protocole de mesure électrique fixés.",
                styles["warning"],
            ),
            PageBreak(),
        ]
    )

    story.extend(
        [
            p("1. Question de recherche et hypothèses", styles["h1"]),
            p(
                "Question: un capteur ondulatoire explicite, suivi d'un petit réseau LIF remplaçant exactement ses sous-graphes continus d'entraînement, peut-il discriminer cinq niveaux de défaut MCSA avec une empreinte compatible avec une cible MCU?", styles["body"]
            ),
            p("H1. Un encodage de phase enrichi par plusieurs seuils conserve plus d'information de profondeur de modulation qu'un seul seuil binaire.", styles["body"]),
            p("H2. Une topologie phase-fusion impose un biais inductif utile aux trois phases tout en réduisant les poids, mais peut perdre de l'information interphase si sa couche de fusion est trop étroite.", styles["body"]),
            p("H3. Après entraînement surrogate, chaque motif continu contraint peut être remplacé 1:1 par un neurone LIF hard sans modification des entrées, sorties ou poids externes.", styles["body"]),
            p("Critères de décision", styles["h2"]),
            table(
                [
                    ["Niveau", "Critère", "Rôle"],
                    ["Sélection", "Exactitude hard maximale sur 200 fenêtres de validation", "Choix du mode capteur, de la topologie et de l'époque"],
                    ["Évaluation", "Exactitude et matrice sur 400 fenêtres de test", "Estimation finale après sélection"],
                    ["Ressources", "Poids, liens, événements, spikes, temps navigateur", "Proxys de coût, sans équivalence énergétique"],
                ],
                [2.5 * cm, 7.4 * cm, 6.2 * cm],
                styles,
            ),
            p("2. Données, provenance et absence de fuite", styles["h1"]),
            p(
                "La source est le jeu Broken Rotor Bar de l'Universidade Federal de Uberlândia: moteur asynchrone 1 hp, cinq états Healthy et BRB1 à BRB4, huit charges et dix répétitions par condition. Seuls Ia, Ib et Ic sont conservés. Le fichier d'entraînement groupé contient 1 600 fenêtres et le fichier de test 400 fenêtres, équilibrées à 80 par classe.", styles["body"]
            ),
            p(
                "Le split interne stratifie par paire classe-charge. Les acquisitions sont triées par hash déterministe de (strate, sourceGroup), puis 12,5% des groupes de chaque strate vont en validation. Toutes les fenêtres chevauchantes d'une acquisition restent du même côté. Le résultat est 1 400 fenêtres d'ajustement et 200 de validation, 40 par classe. Le test externe reste séparé jusqu'à la fin des six ablations.", styles["body"]
            ),
            p("Invariant de groupement", styles["equation"]),
            p("Pour toute acquisition g: {fenêtres issues de g} est inclus entièrement dans train, validation ou test. Aucune intersection de sourceGroup n'est autorisée entre partitions.", styles["equation"]),
        ]
    )
    story.extend(report_image(figures["signals"], 17.4, "Figure 1. Exemples de signaux réellement fournis au SNN. Ils proviennent du test et ne sont utilisés ici que pour la visualisation post-évaluation.", styles))

    story.extend(
        [
            PageBreak(),
            p("3. Prétraitement MCSA", styles["h1"]),
            p("3.1 Enveloppe RMS demi-cycle", styles["h2"]),
            p(
                "Pour chaque courant brut i_c[n], une RMS glissante sur W = 463 points, soit un demi-cycle à environ 55,6 kHz, retire la porteuse 60 Hz et suit sa modulation lente:", styles["body"]
            ),
            p("r_c[n] = sqrt((1/W) * sum_{k=0}^{W-1} i_c[n+k]^2), avec W = 463.", styles["equation"]),
            p("3.2 Décimation et retrait du transitoire", styles["h2"]),
            p("e_c[m] = r_c[927 m]. Les 360 premiers échantillons d'enveloppe, environ 6 s, sont supprimés. Le taux effectif est Fs = 59,990291 Hz.", styles["equation"]),
            p("3.3 Fenêtrage et centrage", styles["h2"]),
            p(
                "Des fenêtres de N = 64 pas et stride 32 sont extraites. Chaque fenêtre dure N/Fs = 1,06684 s. Pour chaque canal, la moyenne de la fenêtre est retirée, amplifiée puis ramenée dans [0,1]:", styles["body"]
            ),
            p("x_c[t] = clip(0.5 + 6 * (e_c[t] - mean_{j=0..63}(e_c[j])), 0, 1).", styles["equation"]),
            p(
                "Ce centrage supprime le niveau moyen lié à la charge. Il conserve la modulation relative recherchée. Il est appliqué avant la séparation des fenêtres dans les fichiers groupés, mais ses statistiques ne dépassent jamais la fenêtre elle-même.", styles["body"]
            ),
            p("4. Capteur ondulatoire interchangeable", styles["h1"]),
            p("4.1 Sélection supervisée des bandes, train uniquement", styles["h2"]),
            p(
                "Pour chaque bin k admissible entre 1,5 et 8 Hz, la magnitude DFT est calculée pour chaque fenêtre s et canal c. Aucune donnée de validation ou de test n'intervient:", styles["body"]
            ),
            p("M_{s,c,k} = (2/N) * sqrt((sum_t x_{s,c,t} cos(2*pi*k*t/N))^2 + (sum_t x_{s,c,t} sin(2*pi*k*t/N))^2).", styles["equation"]),
            p("mu_{q,c,k} = moyenne de M dans la classe q; mu_{c,k} = moyenne globale.", styles["equation"]),
            p("F_k = [sum_c sum_q n_q (mu_{q,c,k} - mu_{c,k})^2] / [sum_c sum_q sum_{s in q} (M_{s,c,k} - mu_{q,c,k})^2 + 1e-12].", styles["equation"]),
            p(
                "Les trois maxima espacés d'au moins deux bins sont 1,874697 Hz (F = 0,201823), 3,749393 Hz (F = 0,164461) et 5,624090 Hz (F = 0,034339). Une cellule existe par paire canal-bande, soit 3 x 3 = 9 cellules.", styles["body"]
            ),
            p("4.2 Filtre et rémanence", styles["h2"]),
            p("omega = 2*pi*fc/Fs; Q = fc/B; alpha = sin(omega)/(2Q); a0 = 1 + alpha.", styles["equation"]),
            p("b0 = alpha/a0; b1 = 0; b2 = -alpha/a0; a1 = -2*cos(omega)/a0; a2 = (1-alpha)/a0.", styles["equation"]),
            p("y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2].", styles["equation"]),
            p(
                "La mémoire de cellule est tau_s = 1/(pi B), son temps d'établissement conventionnel vaut 4 tau_s et sa fréquence maximale d'adaptation vaut 1/(2*pi*tau_s) = B/2. Pour les neuf cellules: tau_s = 113,2 à 339,6 ms et f_adapt,max = 0,469 à 1,406 Hz. Ces valeurs décrivent le phénotype du capteur, pas un paramètre entraîné.", styles["body"]
            ),
        ]
    )
    story.extend(report_image(figures["sensor"], 17.3, "Figure 2. Transformation d'une fenêtre BRB4 par les trois cellules du canal Ia. Les seuils portent sur le pic de la demi-onde terminée au passage par zéro, pas sur la valeur instantanée tracée.", styles))

    story.extend(
        [
            PageBreak(),
            p("4.3 Phase, seuils et amplitude des spikes", styles["h2"]),
            p(
                "Un passage y[n-1] <= 0 < y[n] produit une phase rising à 0 rad; y[n-1] >= 0 > y[n] produit falling à pi rad. Entre deux passages, P = max |y| et E = sum y^2 sont accumulés. Un port émet si P dépasse son seuil.", styles["body"]
            ),
            p("spike_{b,p,l}[n] = 1 si crossing_p[n] et P_b[n] >= theta_{b,l}; 0 sinon.", styles["equation"]),
            p(
                "Binary utilise le quantile 0,85 et une amplitude 1. Amplitude utilise le même seuil mais émet a = P/theta. Multilevel utilise trois quantiles 0,55, 0,75 et 0,90, chacun sur son propre port, avec amplitude 1. Les quantiles sont appris sur les pics des 1 400 fenêtres d'ajustement uniquement.", styles["body"]
            ),
            table(
                [
                    ["Encodage", "Ports", "Règle", "Événements/fenêtre train"],
                    ["phase-binary", "18", "3 canaux x 3 bandes x 2 phases x 1 niveau", "24,0"],
                    ["phase-amplitude", "18", "mêmes ports, amplitude P/theta", "24,0"],
                    ["phase-multilevel", "54", "3 canaux x 3 bandes x 2 phases x 3 niveaux", "127,77"],
                ],
                [3.2 * cm, 2.0 * cm, 7.6 * cm, 3.3 * cm],
                styles,
            ),
            p("5. Topologies et budget", styles["h1"]),
            p(
                "Dans dense, les 54 ports multilevel alimentent 32 LIF, puis 32 x 5 liens alimentent les sorties. Dans phase-fusion, les ports de chaque canal alimentent 8 LIF dédiés, les 24 neurones de phase alimentent 8 LIF de fusion, puis ces 8 alimentent 5 sorties. Cinq liens frame-end donnent un événement de décision final aux sorties.", styles["body"]
            ),
            p("Dense multilevel: 54*32 + 32*5 + 5 = 1 893 poids.", styles["equation"]),
            p("Phase-fusion multilevel: (18*8)*3 + 24*8 + 8*5 + 5 = 669 poids.", styles["equation"]),
        ]
    )
    story.extend(report_image(figures["topologies"], 17.4, "Figure 3. Les deux graphes ont 32 LIF cachés et 5 LIF de sortie. La contrainte diffère par la connectivité, pas par le nombre de neurones.", styles))

    story.extend(
        [
            PageBreak(),
            p("6. Dynamique LIF, sous-graphe surrogate et remplacement 1:1", styles["h1"]),
            p("6.1 Fuite et intégration", styles["h2"]),
            p("lambda_t = exp(-(t - t_prev)/tau); u_leak = u_rest + (u_prev - u_rest)*lambda_t.", styles["equation"]),
            p("I_t = sum_j w_j a_{j,t}; u_int = u_leak + I_t.", styles["equation"]),
            p(
                "Les paramètres communs sont u_rest = 0, u_reset = 0, seuil theta = 0,8 et réfractaire nul. Les 32 LIF cachés distribuent tau dans {66,7; 133,4; 266,7; 533,4} ms. Les cinq sorties utilisent tau_out = 64/Fs = 1,06684 s.", styles["body"]
            ),
            p("6.2 Enseignant continu", styles["h2"]),
            p("p_t = sigmoid(k*(u_int - theta)) = 1/(1 + exp(-k*(u_int-theta))), avec k = 5.", styles["equation"]),
            p("dp_t/du_int = k*p_t*(1-p_t).", styles["equation"]),
            p("u_next = (1-p_t)*u_int + p_t*u_reset.", styles["equation"]),
            p(
                "Le mini-réseau n'est pas conservé à l'inférence. Chaque enseignant contraint contient trois étapes explicites: intégration, seuil surrogate et reset avec retour d'état retardé. Après entraînement, le compilateur vérifie cette topologie, retire ses trois nœuds et ses trois liens internes, crée un seul LifNeuronNode hard avec les mêmes paramètres, puis reconnecte tous les liens externes. Les 37 enseignants deviennent exactement 37 LIF natifs.", styles["body"]
            ),
            p("6.3 Neurone déployé", styles["h2"]),
            p("z_t = 1[u_int >= theta]; u_next = u_reset si z_t = 1, sinon u_int.", styles["equation"]),
            p(
                "Le remplacement porte bien sur la dynamique interne complète, pas seulement sur une modulation des entrées ou des poids. La validation utilisée pour les checkpoints est déjà exécutée en mode hard. L'inférence finale utilise le graphe compilé natif.", styles["callout"]
            ),
            p("7. Fonction objectif, BPTT et Adam", styles["h1"]),
            p("L_t,o = 0.5*(p_t,o - y_t,o)^2; dL/dp = p_t,o - y_t,o.", styles["equation"]),
            p(
                "Les sorties cibles sont nulles aux événements sensoriels avec un poids de perte 0,05. À l'événement frame-end, la cible est one-hot et le poids vaut 1. La perte est divisée par la somme des poids sur les cinq sorties.", styles["body"]
            ),
            p("g_w = sum_t delta_int,t * a_in,t; g_w <- clip(g_w, -1, 1).", styles["equation"]),
            p("m_t = 0.9*m_{t-1} + 0.1*g_t; v_t = 0.999*v_{t-1} + 0.001*g_t^2.", styles["equation"]),
            p("mhat_t = m_t/(1-0.9^t); vhat_t = v_t/(1-0.999^t); w_t = w_{t-1} - 0.01*mhat_t/(sqrt(vhat_t)+1e-8).", styles["equation"]),
            p(
                "La rétropropagation traverse les connexions spatiales en ordre inverse puis la mémoire temporelle via delta_future*lambda_t. Les six essais utilisent batch 16, 20 époques et la graine 0x534e4e31.", styles["body"]
            ),
        ]
    )

    ablation_rows = [["Essai", "Poids", "Év./f.", "Temps", "Epoch", "Val."]]
    for trial in results["trials"]:
        ablation_rows.append(
            [
                trial_label(trial),
                f"{trial['trainableWeights']:,}".replace(",", " "),
                f"{trial['inputEventsPerSample']:.1f}",
                f"{trial['trainingSeconds']:.1f} s",
                str(trial["bestEpoch"]),
                f"{trial['bestValidationAccuracy'] * 100:.1f}%",
            ]
        )
    story.extend(
        [
            PageBreak(),
            p("8. Plan expérimental des six tests", styles["h1"]),
            p(
                "Plan factoriel 3 x 2, un seul facteur change à la fois. Les données, la graine, le budget caché, les taus, le seuil, l'optimiseur et le nombre d'époques sont identiques. Le checkpoint maximise l'exactitude hard de validation; en cas d'égalité, il conserve la perte d'entraînement la plus faible.", styles["body"]
            ),
            table(ablation_rows, [4.8 * cm, 2.1 * cm, 1.9 * cm, 2.0 * cm, 1.8 * cm, 2.0 * cm], styles),
            p(
                f"L'intervalle de Wilson à 95% autour de 132/200 vaut [{val_low * 100:.1f}%; {val_high * 100:.1f}%]. Il décrit l'incertitude binomiale conditionnelle de ce split, pas la variabilité entre graines ou acquisitions.", styles["small"]
            ),
        ]
    )
    story.extend(report_image(figures["ablation"], 17.4, "Figure 4. Résultat de l'ablation. La taille des points du panneau droit représente les événements d'entrée et non une énergie mesurée.", styles))
    story.extend(report_image(figures["learning"], 17.4, "Figure 5. Courbes complètes des 20 époques. La baisse de MSE après le meilleur score sans gain hard illustre le décalage entre objectif surrogate et décision spiking.", styles))

    story.extend(
        [
            PageBreak(),
            p("9. Matrices de validation et interprétation", styles["h1"]),
            p(
                "Binary dense identifie surtout Healthy et atteint 42,0%. L'amplitude continue améliore modérément BRB1 et BRB3, 46,5%. Multilevel dense distribue mieux les décisions sur les cinq classes, 66,0%. Dans phase-fusion, les variantes à 18 ports s'effondrent vers quelques classes; multilevel remonte à 52,5% mais reste inférieur au dense.", styles["body"]
            ),
        ]
    )
    story.extend(report_image(figures["val_confusions"], 17.5, "Figure 6. Matrices de confusion au meilleur checkpoint de chaque essai. Chaque ligne contient exactement 40 fenêtres.", styles))

    per_class_rows = [["Classe", "Support", "Précision", "Rappel", "F1"]]
    for item in metrics["perClass"]:
        per_class_rows.append([item["class"], item["support"], f"{item['precision'] * 100:.1f}%", f"{item['recall'] * 100:.1f}%", f"{item['f1'] * 100:.1f}%"])
    story.extend(
        [
            PageBreak(),
            p("10. Test final tenu à l'écart", styles["h1"]),
            p(
                f"Après sélection, le checkpoint cb96077f de l'époque 15 est restauré et compilé. Un unique passage sur les 400 fenêtres de test produit {test['correct']}/{test['total']} = {test['accuracy'] * 100:.2f}%. Intervalle de Wilson 95%: [{test_low * 100:.1f}%; {test_high * 100:.1f}%]. L'exactitude équilibrée vaut {metrics['balancedAccuracy'] * 100:.2f}% et le macro-F1 {metrics['macroF1'] * 100:.2f}%.", styles["callout"]
            ),
            table(per_class_rows, [3.4 * cm, 2.4 * cm, 3.0 * cm, 3.0 * cm, 3.0 * cm], styles),
            p(
                "Healthy et BRB1 ont les rappels les plus élevés, 63,75% et 67,50%. BRB2 reste le plus difficile, 53,75%, avec 16 erreurs vers Healthy et 15 vers BRB1. BRB4 obtient 60,0%, ses erreurs principales allant vers BRB3. Les erreurs ne sont donc pas exclusivement adjacentes, ce qui indique que la représentation ou la capacité reste insuffisante.", styles["body"]
            ),
        ]
    )
    story.extend(report_image(figures["test_confusion"], 17.4, "Figure 7. Matrice finale en comptages et rappels par classe. Ces données sont présentes dans le checkpoint exporté.", styles))

    story.extend(
        [
            PageBreak(),
            p("11. Taille, vitesse et énergie", styles["h1"]),
            table(
                [
                    ["Modèle", "Poids", "Taille f32", "Exactitude", "Inférence navigateur"],
                    ["SNN multilevel dense", "1 893", "7,40 KiB", "60,75% test", "34,37 ms/fenêtre"],
                    ["LSTM h=32, article compagnon", "4 773", "18,64 KiB", "88,0% test", "1,5 ms/fenêtre"],
                    ["FFT + MLP, article compagnon", "773", "3,02 KiB", "67,0% test", "non rapporté"],
                    ["FFT + SVM, article compagnon", "n/p", "n/p", "81,5% test", "non rapporté"],
                ],
                [4.7 * cm, 2.3 * cm, 2.5 * cm, 3.0 * cm, 3.9 * cm],
                styles,
            ),
            p(
                "Le SNN contient 60,3% moins de poids que le LSTM, mais perd 27,25 points d'exactitude dans ces exécutions. Le temps navigateur SNN inclut l'encodage événementiel, la gestion du RuntimeGraph dynamique et un code JavaScript non optimisé MCU. Il ne constitue pas une comparaison de kernels équivalents avec le LSTM de l'article.", styles["body"]
            ),
            p(
                f"Activité test observée: {test['inputEventsPerSample']:.2f} événements d'entrée et {test['neuronSpikesPerSample']:.2f} spikes de neurones par fenêtre de 1,06684 s. Temps total {test['elapsedMilliseconds'] / 1000:.3f} s, soit {test['millisecondsPerSample']:.2f} ms/fenêtre sur la machine et le navigateur de l'expérience.", styles["body"]
            ),
            p("Estimation structurelle des accumulations synaptiques", styles["h2"]),
            p(
                "Une borne simple côté entrée vaut N_event,in * fanout = 126,05 * 32 = environ 4 034 accumulations pondérées par fenêtre pour les liens capteur vers cachés. Elle exclut les propagations cachées et sorties, dépendantes des spikes internes. Une borne supérieure très conservatrice ajoute 17,09 * 5 = 85,45 opérations si tous les spikes internes provenaient de cachés denses vers les cinq sorties. Le runtime réel peut effectuer davantage de gestion de graphe.", styles["body"]
            ),
            p(
                "Une mesure énergétique valide devra rapporter E_fenêtre = integral V(t)I(t)dt, énergie par décision, puissance idle soustraite, fréquence CPU, tension, quantification, flash/RAM, compilateur et nombre de répétitions. Sans ces informations, convertir les événements en microjoules serait scientifiquement injustifié.", styles["warning"]
            ),
            p("12. Validité, limites et falsifiabilité", styles["h1"]),
            p("Validité interne", styles["h2"]),
            p(
                "Points forts: groupement par acquisition, calibration train uniquement, critères fixés, même budget et même graine, checkpoints associés à une signature d'architecture, matrice de validation sauvegardée et test consulté après les ablations.", styles["body"]
            ),
            p("Limites", styles["h2"]),
            p(
                "Un seul seed ne permet pas de séparer l'effet architectural de la variance d'initialisation. Le choix de six configurations sur la même validation crée un biais de sélection. Le jeu provient d'un seul banc moteur. Les fenêtres d'une acquisition sont corrélées même si elles ne traversent pas les partitions. Le score de fréquence Fisher est un choix supervisé qui doit être recalculé pour un nouveau capteur ou domaine. La MSE surrogate n'optimise pas directement l'argmax hard. Enfin, aucune mesure sur MCU n'a été réalisée.", styles["body"]
            ),
            p("Conditions de réfutation", styles["h2"]),
            p(
                "H1 serait affaiblie si, sur au moins 10 graines et plusieurs splits groupés, multilevel ne dépassait pas binary avec intervalle apparié positif. H2 serait réfutée comme compromis utile si l'élargissement de fusion n'améliorait ni précision ni coût de façon reproductible. H3 échouerait si les sorties hard avant et après compilation divergeaient sur une séquence identique.", styles["body"]
            ),
        ]
    )

    story.extend(
        [
            PageBreak(),
            p("13. Reproductibilité", styles["h1"]),
            table(
                [
                    ["Élément", "Valeur ou fichier"],
                    ["Données", "packages/host/www/data/motor_current/{train_grouped,test_grouped}.json"],
                    ["Page expérimentale", "packages/host/www/samples/motor_current/index.html"],
                    ["Pilotage et checkpoints", "packages/host/www/samples/motor_current/motor_current.js"],
                    ["Construction SNN", "packages/host/www/samples/motor_current/motor_current_snn.js"],
                    ["Capteur", "packages/dev/core/src/neuralnetwork/snn/wave-spike.sensor.ts"],
                    ["BPTT", "packages/dev/core/src/neuralnetwork/snn/lif-surrogate-network.training.ts"],
                    ["Compilation 1:1", "packages/dev/core/src/neuralnetwork/snn/lif-surrogate.compiler.ts"],
                    ["Résultats bruts", "docs/research/motor-current-snn-ablation-2026-08-27/data/experiment-results.json"],
                    ["Checkpoint", "docs/research/motor-current-snn-ablation-2026-08-27/data/winner-checkpoint.json"],
                ],
                [4.2 * cm, 11.9 * cm],
                styles,
            ),
            p("Procédure minimale", styles["h2"]),
            p(
                "1. Servir packages/host/www sur localhost. 2. Ouvrir /samples/motor_current/. 3. Charger Grouped acquisitions. 4. Fixer SNN, hidden 32, epochs 20, lr 0,01. 5. Pour chaque couple encodage-topologie, utiliser Reset saved avant le premier run de cette signature, puis Train. 6. Reporter le meilleur score hard et sa matrice. 7. Choisir le maximum de validation. 8. Restaurer le checkpoint gagnant et exécuter Test une seule fois. 9. Exporter les poids JSON.", styles["body"]
            ),
            p("Contrôles d'intégrité", styles["h2"]),
            p(
                "Vérifier: 1 400/200, fingerprint dcb578a0, signature cb96077f, 1 893 poids, meilleur epoch 15, validation 132/200, SHA-256 du checkpoint 5dcf0665c00662ec174a780de319815fa9826a837c79faa24b745c06076eba8a, test 243/400.", styles["equation"]
            ),
            p("14. Suite expérimentale recommandée", styles["h1"]),
            p(
                "Priorité 1: répéter les six conditions avec 10 graines et comparer par différences appariées de validation. Priorité 2: ablater les quantiles et les largeurs de bandes sans toucher au test. Priorité 3: élargir seulement la fusion (8 vers 12 ou 16) en conservant un plafond de poids. Priorité 4: essayer une fonction objectif mieux alignée sur la décision hard, par exemple marge entre classe vraie et maximum concurrent. Priorité 5: figer une version quantifiée int8/int16 et mesurer énergie et latence sur la cible MCU.", styles["body"]
            ),
            p("Conclusion", styles["h1"]),
            p(
                "Cette première expérience démontre une chaîne complète et falsifiable: observation MCSA, capteur ondulatoire explicite, entraînement surrogate d'un graphe contraint, remplacement 1:1 par des LIF natifs, sélection groupée et test final. Le résultat de 60,75% est supérieur au hasard et prometteur pour 1 893 poids, mais reste nettement inférieur au LSTM compagnon à 88,0%. La prochaine étape scientifique n'est pas d'ajouter arbitrairement des neurones: elle consiste à mesurer la robustesse multi-seed, puis à optimiser conjointement le phénotype du capteur et la capacité de fusion sous contrainte MCU.", styles["callout"]
            ),
            p("Références", styles["h1"]),
            p(
                "[R1] G. Pelletier, Envelope-Domain Preprocessing for Ultra-Compact LSTM-Based Broken Rotor Bar Severity Grading, docs/research/motor-current-mcsa-paper.pdf, 2026.", styles["small"]
            ),
            p("[R2] W. T. Thomson and M. Fenger, Current signature analysis to detect induction motor faults, IEEE Industry Applications Magazine, 7(4), 26-34, 2001. DOI 10.1109/2943.930988.", styles["small"]),
            p("[R3] Code et artefacts de l'expérience, commit de base e9a998ec6271b58a62cafe3dc405f0d38ebdfbad avec modifications expérimentales non commitées décrites dans le dépôt.", styles["small"]),
        ]
    )

    PDF_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc.build(story, onFirstPage=page_header_footer, onLaterPages=page_header_footer)


def build_readable_pdf(results: dict, checkpoint: dict, figures: dict[str, Path]) -> None:
    regular_font, bold_font = register_fonts()
    styles = build_styles(regular_font, bold_font)
    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=1.7 * cm,
        rightMargin=1.7 * cm,
        topMargin=1.55 * cm,
        bottomMargin=1.95 * cm,
        title="Réseau à impulsions pour le diagnostic de défauts du rotor",
        author="Spiky Panda R&D",
        subject="Compte rendu expérimental, méthode, résultats et équations",
    )
    story: list = []
    winner = results["winner"]
    test = winner["heldOutTest"]
    metrics = classification_metrics(test["confusionMatrix"])
    val_low, val_high = wilson_interval(132, 200)
    test_low, test_high = wilson_interval(test["correct"], test["total"])

    story.extend(
        [
            Spacer(1, 0.9 * cm),
            p("Rapport d'expérimentation R&amp;D", styles["title"]),
            p("Un petit réseau à impulsions peut-il reconnaître un défaut de rotor?", styles["title"]),
            p("Essais sur les courants triphasés d'un moteur asynchrone", styles["subtitle"]),
            p(
                "<b>Réponse courte.</b> Le meilleur réseau reconnaît correctement 243 fenêtres sur 400, soit <b>60,75%</b>. Il utilise 1 893 poids et 37 neurones à impulsions.",
                styles["callout"],
            ),
            p("Ce que l'expérience nous apprend", styles["h1"]),
            p(
                "La façon de transformer le courant en impulsions a eu l'effet le plus net. Avec trois seuils par onde, le score de validation atteint 66,0%. Avec un seul seuil, il reste à 42,0%.",
                styles["body"],
            ),
            p(
                "L'organisation la plus compacte réduit le nombre de poids de 1 893 à 669. Elle fait aussi baisser le score de 66,0% à 52,5%. Dans sa forme actuelle, elle compresse trop l'information.",
                styles["body"],
            ),
            p(
                "Le réseau récurrent LSTM étudié auparavant sur ces données atteint 88,0% avec 4 773 poids. Le réseau à impulsions est plus petit, mais il est encore beaucoup moins précis.",
                styles["body"],
            ),
            p(
                "Aucune énergie n'a été mesurée sur microcontrôleur. Le nombre d'impulsions décrit l'activité du réseau. Il ne donne pas une consommation en joules.",
                styles["warning"],
            ),
            table(
                [
                    ["Repère", "Valeur"],
                    ["Date", "27 août 2026"],
                    ["Réseau retenu", "capteur à trois seuils, réseau entièrement connecté"],
                    ["Sauvegarde", "cb96077f, passage 15 de l'entraînement"],
                    ["Données", "1 400 fenêtres pour apprendre, 200 pour choisir, 400 pour tester"],
                    ["Répétitions", "une seule initialisation des poids"],
                ],
                [4.2 * cm, 11.9 * cm],
                styles,
            ),
            PageBreak(),
            p("1. Question posée", styles["h1"]),
            p(
                "Le défaut recherché est le nombre de barres cassées dans le rotor. Cinq états sont distingués: moteur sain, puis une, deux, trois ou quatre barres cassées. Nous voulons savoir si un réseau assez petit pour être porté plus tard sur un microcontrôleur peut séparer ces cinq états.",
                styles["body"],
            ),
            p(
                "Dans les tableaux et les figures, BRB1 à BRB4 signifient respectivement une à quatre barres cassées.",
                styles["body"],
            ),
            p(
                "Le courant ne va pas directement au réseau. Il traverse d'abord un capteur logiciel qui cherche des oscillations lentes dans son enveloppe. Ce capteur décide donc quelle information sera disponible pour apprendre.",
                styles["body"],
            ),
            p("Trois questions ont été testées", styles["h2"]),
            p(
                "Faut-il une seule limite de détection ou trois niveaux? Faut-il mélanger immédiatement les trois phases électriques ou commencer par les traiter séparément? Enfin, peut-on remplacer le modèle continu utilisé pendant l'apprentissage par un vrai neurone à impulsions, sans changer les connexions apprises?",
                styles["body"],
            ),
            p("2. Données et séparation des lots", styles["h1"]),
            p(
                "Les enregistrements viennent du jeu Broken Rotor Bar de l'Universidade Federal de Uberlândia. Chaque prise contient les trois courants Ia, Ib et Ic. Le moteur est observé sous huit charges, avec plusieurs répétitions.",
                styles["body"],
            ),
            table(
                [
                    ["Lot", "Nombre", "À quoi sert-il?"],
                    ["Apprentissage", "1 400", "régler les poids, les fréquences et les seuils"],
                    ["Validation", "200", "choisir le meilleur des six essais"],
                    ["Test final", "400", "mesurer le réseau retenu"],
                ],
                [4.0 * cm, 3.0 * cm, 9.1 * cm],
                styles,
            ),
            p(
                "Une même acquisition produit plusieurs fenêtres qui se chevauchent. Elles restent toutes dans le même lot. Sans cette précaution, le réseau pourrait retrouver pendant le test un signal presque identique à un signal déjà vu pendant l'apprentissage.",
                styles["body"],
            ),
            p(
                "Les 400 fenêtres du test final n'ont servi ni à choisir les fréquences, ni à régler les seuils, ni à choisir le réseau. Elles ont été lues une fois, après les six essais.",
                styles["callout"],
            ),
        ]
    )
    story.extend(report_image(figures["signals"], 17.4, "Figure 1. Une fenêtre préparée pour chacun des cinq états. Les trois couleurs correspondent à Ia, Ib et Ic.", styles))

    story.extend(
        [
            PageBreak(),
            p("3. Du courant mesuré au signal analysé", styles["h1"]),
            p(
                "Une barre cassée modifie légèrement l'amplitude du courant. Cette variation est lente, de l'ordre de quelques hertz. Le courant secteur, lui, oscille à 60 Hz. Le prétraitement retire cette oscillation rapide pour conserver son enveloppe.",
                styles["body"],
            ),
            p("Calcul de l'enveloppe", styles["h2"]),
            p(
                "On calcule la valeur efficace du courant sur 463 mesures successives, soit environ un demi-cycle électrique. Pour chaque phase c:",
                styles["body"],
            ),
            p("r_c[n] = racine((1/463) * somme_{k=0..462} i_c[n+k]^2).", styles["equation"]),
            p("Réduction du nombre de points", styles["h2"]),
            p(
                "L'enveloppe est gardée tous les 927 points. On obtient 59,990291 mesures par seconde. Les six premières secondes sont retirées, car elles contiennent le démarrage du moteur.",
                styles["body"],
            ),
            p("Découpage en fenêtres", styles["h2"]),
            p(
                "Chaque exemple contient 64 mesures par phase, soit 1,067 seconde. Deux fenêtres consécutives se recouvrent de moitié. La moyenne de chaque fenêtre est retirée, puis la variation restante est amplifiée par 6 et limitée entre 0 et 1.",
                styles["body"],
            ),
            p("x_c[t] = limite(0,5 + 6 * (e_c[t] - moyenne(e_c)), entre 0 et 1).", styles["equation"]),
            p(
                "Le centrage retire surtout l'effet de la charge moyenne du moteur. La petite modulation liée au défaut devient plus visible.",
                styles["body"],
            ),
            p("4. Le capteur qui produit les impulsions", styles["h1"]),
            p(
                "Le capteur comporte neuf cellules: trois fréquences pour chacune des trois phases. Chaque cellule est un filtre qui réagit surtout autour de sa fréquence. Les fréquences ont été choisies sur les 1 400 fenêtres d'apprentissage seulement.",
                styles["body"],
            ),
            table(
                [
                    ["Fréquence", "Pouvoir de séparation"],
                    ["1,875 Hz", "0,2018"],
                    ["3,749 Hz", "0,1645"],
                    ["5,624 Hz", "0,0343"],
                ],
                [6.0 * cm, 10.1 * cm],
                styles,
            ),
            p(
                "Le second nombre compare l'écart entre les cinq états à la dispersion observée dans un même état. Une valeur élevée indique une fréquence plus utile pour les séparer. La formule est donnée en annexe.",
                styles["small"],
            ),
        ]
    )
    story.extend(report_image(figures["sensor"], 17.3, "Figure 2. Exemple pour la phase Ia. Les trois courbes centrales sont les sorties des filtres. Les traits du bas sont les impulsions émises. M signifie montée, D descente et N niveau.", styles))

    story.extend(
        [
            PageBreak(),
            p("5. Trois façons de produire les impulsions", styles["h1"]),
            p(
                "Chaque filtre observe une demi-onde, mesure son pic, puis décide s'il doit émettre. Le sens du passage par zéro indique si l'onde est montante ou descendante.",
                styles["body"],
            ),
            table(
                [
                    ["Nom dans le code", "Règle", "Sorties"],
                    ["phase-binary", "un seuil; chaque impulsion vaut 1", "18"],
                    ["phase-amplitude", "un seuil; la force suit la hauteur du pic", "18"],
                    ["phase-multilevel", "trois seuils; chaque niveau a sa propre sortie", "54"],
                ],
                [3.8 * cm, 8.8 * cm, 3.5 * cm],
                styles,
            ),
            p(
                "Dans le texte, ces trois options sont appelées un seuil, amplitude et trois seuils. Les noms anglais servent seulement à retrouver les options dans le code.",
                styles["body"],
            ),
            p("6. Deux organisations du réseau", styles["h1"]),
            p(
                "Les deux réseaux possèdent 32 neurones internes et cinq neurones de sortie. Ils diffèrent par leurs connexions.",
                styles["body"],
            ),
            p(
                "Dans le réseau entièrement connecté, chaque sortie du capteur est reliée aux 32 neurones internes. Ces neurones alimentent ensuite les cinq classes.",
                styles["body"],
            ),
            p(
                "Dans le réseau séparé par phase, huit neurones reçoivent Ia, huit reçoivent Ib et huit reçoivent Ic. Leurs résultats convergent vers huit autres neurones, puis vers les cinq classes. Le total reste 32 neurones internes.",
                styles["body"],
            ),
        ]
    )
    story.extend(report_image(figures["topologies"], 17.4, "Figure 3. En haut, toutes les informations sont mélangées immédiatement. En bas, les trois phases sont d'abord traitées séparément.", styles))

    story.extend(
        [
            PageBreak(),
            p("7. Comment l'apprentissage fonctionne", styles["h1"]),
            p(
                "Un vrai neurone à impulsions répond par 0 ou 1. Cette coupure nette empêche de calculer directement comment corriger les poids. Pendant l'apprentissage, chaque futur neurone LIF, c'est-à-dire un neurone à fuite et seuil, est donc représenté par un petit modèle continu en trois étapes: accumulation, seuil progressif et remise à zéro.",
                styles["body"],
            ),
            p(
                "Près du seuil, la sortie continue varie doucement entre 0 et 1. Cette zone indique dans quel sens corriger chaque poids. Sa pente vaut 5. Les corrections utilisent l'algorithme Adam, par groupes de 16 fenêtres, pendant 20 passages complets sur les données.",
                styles["body"],
            ),
            p(
                "Après l'apprentissage, le petit modèle continu disparaît. Ses trois étapes sont remplacées par un seul neurone LIF qui émet réellement 0 ou 1. Les connexions extérieures et leurs poids sont conservés. Le réseau final contient 37 LIF: 32 neurones internes et cinq sorties.",
                styles["callout"],
            ),
            p("Mémoire des neurones", styles["h2"]),
            p(
                "Entre deux événements, le potentiel revient progressivement vers zéro. Quatre vitesses de retour sont utilisées: 66,7; 133,4; 266,7 et 533,4 ms. Le seuil de déclenchement vaut 0,8. Après une impulsion, le potentiel revient à zéro.",
                styles["body"],
            ),
            p("Choix de la meilleure sauvegarde", styles["h2"]),
            p(
                "Après chaque passage d'apprentissage, le modèle est converti en vrais neurones à impulsions et évalué sur les 200 fenêtres de validation. La sauvegarde retenue est celle qui classe le plus de fenêtres correctement. En cas d'égalité, la plus faible erreur d'apprentissage départage les deux passages.",
                styles["body"],
            ),
            p(
                "La même initialisation aléatoire est utilisée pour les six essais. Cela rend leur comparaison plus propre. Une seule initialisation ne permet toutefois pas de savoir si l'écart se reproduira.",
                styles["warning"],
            ),
            p("8. Résultat des six essais", styles["h1"]),
        ]
    )

    names = {
        "phase-binary-dense": ("un seuil", "entièrement connecté"),
        "phase-amplitude-dense": ("amplitude", "entièrement connecté"),
        "phase-multilevel-dense": ("trois seuils", "entièrement connecté"),
        "phase-binary-phase-fusion": ("un seuil", "séparé par phase"),
        "phase-amplitude-phase-fusion": ("amplitude", "séparé par phase"),
        "phase-multilevel-phase-fusion": ("trois seuils", "séparé par phase"),
    }
    rows = [["Capteur", "Réseau", "Poids", "Passage", "Validation"]]
    for trial in results["trials"]:
        sensor_name, network_name = names[trial["id"]]
        rows.append(
            [
                sensor_name,
                network_name,
                f"{trial['trainableWeights']:,}".replace(",", " "),
                str(trial["bestEpoch"]),
                f"{trial['bestValidationAccuracy'] * 100:.1f}%",
            ]
        )
    story.append(table(rows, [3.1 * cm, 4.7 * cm, 2.1 * cm, 2.7 * cm, 2.7 * cm], styles))
    story.append(
        p(
            f"Le meilleur résultat est 132 réponses correctes sur 200. La marge d'incertitude statistique, calculée ici avec l'intervalle de Wilson à 95%, va de {val_low * 100:.1f}% à {val_high * 100:.1f}%. Elle ne tient pas compte d'une autre initialisation des poids.",
            styles["small"],
        )
    )
    story.extend(report_image(figures["ablation"], 16.0, "Figure 4. À gauche, les six scores. À droite, le compromis entre nombre de poids et précision.", styles))

    story.extend(
        [
            PageBreak(),
            p("9. Lecture des courbes", styles["h1"]),
            p(
                "La version à trois seuils progresse régulièrement et dépasse les autres. Son meilleur score apparaît au passage 15. L'erreur utilisée pour corriger les poids continue ensuite de baisser, alors que le nombre de bonnes réponses diminue. L'objectif continu n'est donc pas parfaitement aligné avec la décision finale à 0 ou 1.",
                styles["body"],
            ),
            p(
                "Ajouter une amplitude aux impulsions apporte 4,5 points par rapport au seuil unique dans le réseau entièrement connecté. Créer trois sorties distinctes par niveau apporte 24 points. Ici, la séparation explicite des niveaux est plus utile que la seule force de l'impulsion.",
                styles["body"],
            ),
        ]
    )
    story.extend(report_image(figures["learning"], 17.4, "Figure 5. En haut, l'erreur d'apprentissage. En bas, la part des fenêtres de validation correctement classées.", styles))

    story.extend(
        [
            PageBreak(),
            p("10. Où les réseaux se trompent", styles["h1"]),
            p(
                "Chaque matrice contient 200 fenêtres, soit 40 par état. Une ligne correspond à l'état réel et une colonne à la réponse du réseau. Les bonnes réponses sont sur la diagonale.",
                styles["body"],
            ),
            p(
                "Avec un seul seuil, le réseau répond trop souvent moteur sain. Le capteur à trois seuils répartit mieux les réponses entre les cinq états. Le traitement séparé des phases conserve cette amélioration, mais reste moins précis.",
                styles["body"],
            ),
        ]
    )
    story.extend(report_image(figures["val_confusions"], 17.5, "Figure 6. Matrices obtenues sur les 200 fenêtres de validation, au meilleur passage de chaque essai.", styles))

    matrix = np.asarray(test["confusionMatrix"], dtype=int)
    class_rows = [["État réel", "Fenêtres", "Bonnes réponses", "Taux reconnu"]]
    for index, item in enumerate(metrics["perClass"]):
        class_rows.append([DISPLAY_CLASSES[index], item["support"], int(matrix[index, index]), f"{item['recall'] * 100:.1f}%"])
    story.extend(
        [
            PageBreak(),
            p("11. Résultat sur les données tenues à l'écart", styles["h1"]),
            p(
                f"Le réseau retenu obtient {test['correct']} bonnes réponses sur {test['total']}, soit <b>{test['accuracy'] * 100:.2f}%</b>. La marge d'incertitude statistique à 95%, calculée avec l'intervalle de Wilson, va de {test_low * 100:.1f}% à {test_high * 100:.1f}%.",
                styles["callout"],
            ),
            table(class_rows, [4.3 * cm, 3.3 * cm, 4.4 * cm, 3.5 * cm], styles),
            p(
                "BRB2 est l'état le moins bien reconnu: 43 bonnes réponses sur 80. Seize fenêtres BRB2 sont classées moteur sain et quinze sont classées BRB1. BRB4 obtient 48 bonnes réponses; quatorze sont confondues avec BRB3.",
                styles["body"],
            ),
        ]
    )
    story.extend(report_image(figures["test_confusion"], 17.4, "Figure 7. Résultat final. La matrice de droite donne le pourcentage reconnu pour chaque état réel.", styles))

    story.extend(
        [
            PageBreak(),
            p("12. Comparaison avec les modèles déjà étudiés", styles["h1"]),
            table(
                [
                    ["Méthode", "Poids", "Mémoire des poids", "Score"],
                    ["Réseau à impulsions", "1 893", "7,40 Kio", "60,75%"],
                    ["LSTM, 32 unités", "4 773", "18,64 Kio", "88,0%"],
                    ["Petit réseau sur spectre FFT", "773", "3,02 Kio", "67,0%"],
                    ["Classifieur SVM sur spectre FFT", "sans objet", "non rapportée", "81,5%"],
                ],
                [5.5 * cm, 2.4 * cm, 4.0 * cm, 3.2 * cm],
                styles,
            ),
            p(
                "Le réseau à impulsions utilise 60,3% de poids en moins que le LSTM. Il perd 27,25 points de précision. Pour un diagnostic à cinq classes, cet écart est trop grand à ce stade.",
                styles["body"],
            ),
            p(
                "FFT désigne ici la décomposition du signal en fréquences. SVM désigne une machine à vecteurs de support, utilisée comme classifieur.",
                styles["small"],
            ),
            p("Temps et activité", styles["h2"]),
            p(
                f"Sur le navigateur utilisé, une fenêtre demande {test['millisecondsPerSample']:.2f} ms. Le capteur produit en moyenne {test['inputEventsPerSample']:.2f} impulsions par fenêtre. Les 37 neurones en produisent ensemble {test['neuronSpikesPerSample']:.2f}.",
                styles["body"],
            ),
            p(
                "Ces temps ne permettent pas une comparaison directe avec le LSTM, car les deux chemins de calcul sont différents. La consommation sur microcontrôleur reste inconnue.",
                styles["warning"],
            ),
            p("13. Limites de l'expérience", styles["h1"]),
            p(
                "Un seul tirage aléatoire a été utilisé. Nous ne savons donc pas quelle part de l'écart entre deux essais vient du capteur et quelle part vient de l'initialisation des poids.",
                styles["body"],
            ),
            p(
                "Les six choix ont été comparés sur le même lot de validation. Le test final réduit ce biais de sélection, mais il ne remplace pas plusieurs répétitions complètes.",
                styles["body"],
            ),
            p(
                "Toutes les données proviennent d'un seul banc moteur. Un autre moteur, une alimentation à 50 Hz ou une vitesse variable demanderont une nouvelle vérification du capteur.",
                styles["body"],
            ),
            p("Prochaine expérience", styles["h2"]),
            p(
                "Il faut d'abord répéter les six essais avec dix initialisations. Si l'avantage des trois seuils se confirme, on pourra élargir progressivement la partie qui réunit les phases, sans consulter le jeu de test. La mesure sur microcontrôleur viendra après la quantification du modèle.",
                styles["body"],
            ),
        ]
    )

    story.extend(
        [
            PageBreak(),
            p("Annexe A. Équations du capteur", styles["h1"]),
            p("Choix des fréquences", styles["h2"]),
            p("M(s,c,k) = (2/N) * racine((somme x*cos)^2 + (somme x*sin)^2).", styles["equation"]),
            p("F(k) = dispersion entre les classes / (dispersion dans les classes + 10^-12).", styles["equation"]),
            p(
                "M est l'amplitude de Fourier pour une fenêtre s, une phase c et une fréquence k. F compare les moyennes des cinq classes à leur dispersion interne.",
                styles["body"],
            ),
            p("Filtre de chaque cellule", styles["h2"]),
            p("omega = 2*pi*fc/Fs; Q = fc/B; alpha = sin(omega)/(2Q); a0 = 1 + alpha.", styles["equation"]),
            p("b0 = alpha/a0; b1 = 0; b2 = -alpha/a0; a1 = -2*cos(omega)/a0; a2 = (1-alpha)/a0.", styles["equation"]),
            p("y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2].", styles["equation"]),
            p(
                "fc est la fréquence centrale, B la largeur de bande et Fs la fréquence d'échantillonnage. La mémoire de la cellule vaut 1/(pi*B), soit 113,2 à 339,6 ms pour les cellules testées.",
                styles["body"],
            ),
            p("Règles propres aux trois capteurs", styles["h2"]),
            p("Un seuil: impulsion = 1 si pic &gt;= quantile 0,85; sinon 0.", styles["equation"]),
            p("Amplitude: impulsion = pic/seuil si pic &gt;= quantile 0,85; sinon 0.", styles["equation"]),
            p("Trois seuils: impulsion_l = 1 si pic &gt;= quantile_l, avec l dans {0,55; 0,75; 0,90}.", styles["equation"]),
            p(
                "Les seuils sont calculés séparément pour chaque phase et chaque fréquence, sur l'apprentissage seulement.",
                styles["body"],
            ),
            p("Annexe B. Équations du neurone", styles["h1"]),
            p("fuite = exp(-(t - t_précédent)/tau).", styles["equation"]),
            p("potentiel = potentiel_précédent*fuite + somme_j poids_j*entrée_j.", styles["equation"]),
            p("impulsion = 1 si potentiel &gt;= 0,8; sinon 0. Après une impulsion, potentiel = 0.", styles["equation"]),
            p("Pendant l'apprentissage: p = 1/(1 + exp(-5*(potentiel - 0,8))).", styles["equation"]),
            p("dp/dpotentiel = 5*p*(1-p); potentiel_suivant = (1-p)*potentiel.", styles["equation"]),
            p("erreur = 0,5*(sortie - cible)^2; dérivée = sortie - cible.", styles["equation"]),
            p(
                "Les événements intermédiaires comptent pour 0,05 dans l'erreur. La décision de fin de fenêtre compte pour 1. Les gradients sont limités entre -1 et 1. Adam utilise un pas de 0,01, beta1 = 0,9, beta2 = 0,999 et epsilon = 10^-8.",
                styles["body"],
            ),
        ]
    )

    story.extend(
        [
            PageBreak(),
            p("Annexe C. Reproduire l'expérience", styles["h1"]),
            p(
                "Ouvrir packages/host/www/samples/motor_current/index.html. Charger les acquisitions groupées, choisir SNN, fixer 32 neurones internes, 20 passages d'apprentissage et un pas de 0,01.",
                styles["body"],
            ),
            p(
                "Exécuter les six couples capteur-réseau du tableau de la section 8. Réinitialiser la sauvegarde avant le premier lancement de chaque architecture. Noter le meilleur résultat de validation et sa matrice. Restaurer ensuite l'architecture gagnante et lancer une seule fois le test final.",
                styles["body"],
            ),
            table(
                [
                    ["Contenu", "Fichier"],
                    ["Résultats des six essais", "docs/research/motor-current-snn-ablation-2026-08-27/data/experiment-results.json"],
                    ["Poids retenus", "docs/research/motor-current-snn-ablation-2026-08-27/data/winner-checkpoint.json"],
                    ["Capteur", "packages/dev/core/src/neuralnetwork/snn/wave-spike.sensor.ts"],
                    ["Construction du réseau", "packages/host/www/samples/motor_current/motor_current_snn.js"],
                    ["Apprentissage", "packages/dev/core/src/neuralnetwork/snn/lif-surrogate-network.training.ts"],
                    ["Remplacement par les LIF", "packages/dev/core/src/neuralnetwork/snn/lif-surrogate.compiler.ts"],
                ],
                [5.0 * cm, 11.1 * cm],
                styles,
            ),
            p("Valeurs à retrouver", styles["h2"]),
            p(
                "Partition 1 400/200; empreinte des données dcb578a0; architecture cb96077f; 1 893 poids; meilleure validation au passage 15 avec 132/200; test final 243/400.",
                styles["equation"],
            ),
            p("Conclusion", styles["h1"]),
            p(
                "L'expérience valide toute la chaîne, depuis le courant mesuré jusqu'au réseau LIF final. Elle montre surtout que le capteur doit conserver plusieurs niveaux d'intensité. Le score de 60,75% reste trop faible pour remplacer le LSTM actuel dans un diagnostic à cinq classes. La prochaine décision dépendra des répétitions avec plusieurs initialisations.",
                styles["callout"],
            ),
            p("Références", styles["h1"]),
            p(
                "[R1] G. Pelletier, Envelope-Domain Preprocessing for Ultra-Compact LSTM-Based Broken Rotor Bar Severity Grading, docs/research/motor-current-mcsa-paper.pdf, 2026.",
                styles["small"],
            ),
            p(
                "[R2] W. T. Thomson et M. Fenger, Current signature analysis to detect induction motor faults, IEEE Industry Applications Magazine, 7(4), 26-34, 2001. DOI 10.1109/2943.930988.",
                styles["small"],
            ),
        ]
    )

    PDF_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc.build(story, onFirstPage=page_header_footer, onLaterPages=page_header_footer)


def main() -> None:
    configure_plotting()
    results = load_json(DATA_PATH)
    checkpoint = load_json(CHECKPOINT_PATH)
    test_data = load_json(TEST_DATA_PATH)
    assert results["winner"]["architectureSignature"] == checkpoint["model"]["architectureSignature"]
    assert checkpoint["metric"]["validationAccuracy"] == results["winner"]["selectionAccuracy"]
    assert checkpoint["lastTest"]["confusionMatrix"] == results["winner"]["heldOutTest"]["confusionMatrix"]
    figures = {
        "signals": figure_signal_examples(test_data),
        "sensor": figure_sensor_response(test_data, checkpoint),
        "learning": figure_learning_curves(results),
        "ablation": figure_ablation(results),
        "val_confusions": figure_validation_confusions(results),
        "test_confusion": figure_final_confusion(results),
        "topologies": figure_topologies(results),
    }
    build_readable_pdf(results, checkpoint, figures)
    print(json.dumps({"pdf": str(PDF_PATH), "figures": [str(path) for path in figures.values()]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

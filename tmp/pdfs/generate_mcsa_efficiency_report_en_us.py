from __future__ import annotations

import importlib.util
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
)


HERE = Path(__file__).resolve().parent
ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "mcsa-deep-learning-gru-snn-efficiency-report-en-us-2026-08-27.pdf"

spec = importlib.util.spec_from_file_location("mcsa_report_fr", HERE / "generate_mcsa_efficiency_report.py")
m = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(m)


def P(text: str, style: str = "BodyX") -> Paragraph:
    return Paragraph(text, m.styles[style])


def make_charts_en() -> tuple[Path, Path, Path]:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.titleweight": "bold",
            "axes.labelcolor": "#17212B",
            "text.color": "#17212B",
            "xtick.color": "#536472",
            "ytick.color": "#536472",
        }
    )

    names = ["VGG-19", "NASNet-M", "CNN-LSTM", "MCSA LSTM", "GRU h=32", "SNN h=32"]
    params = [143_700_000, 5_300_000, 100_000, 4_773, 3_621, 1_893]
    accuracies = [99.4, 96.2, 92.3, 88.0, 91.0, 78.5]
    palette = ["#536472", "#536472", "#2374AB", "#1B998B", "#3A936A", "#F18F01"]

    path1 = HERE / "parameters_log_en.png"
    fig, ax = plt.subplots(figsize=(9.2, 4.6), dpi=180)
    y = list(range(len(names)))
    ax.barh(y, params, color=palette, height=0.62)
    ax.set_xscale("log")
    ax.set_yticks(y, names)
    ax.invert_yaxis()
    ax.set_xlabel("Parameter count, logarithmic scale")
    ax.set_title("Progressive reduction in model size")
    ax.grid(axis="x", alpha=0.22)
    labels = ["143.7 M", "5.3 M", "~100 k", "4,773", "3,621", "1,893"]
    for yi, value, label in zip(y, params, labels):
        ax.text(value * 1.13, yi, label, va="center", fontsize=8.5, fontweight="bold")
    ax.spines[["top", "right", "left"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(path1, bbox_inches="tight", facecolor="white")
    plt.close(fig)

    path2 = HERE / "accuracy_vs_parameters_en.png"
    fig, ax = plt.subplots(figsize=(9.2, 4.8), dpi=180)
    for name, x, yv, color in zip(names, params, accuracies, palette):
        size = 90 if name in ("GRU h=32", "SNN h=32") else 60
        ax.scatter(x, yv, s=size, color=color, edgecolor="white", linewidth=0.8, zorder=3)
        offset = (7, -12) if name == "SNN h=32" else (7, 6)
        weight = "bold" if name in ("GRU h=32", "SNN h=32") else "normal"
        ax.annotate(name, (x, yv), xytext=offset, textcoords="offset points", fontsize=7.8, fontweight=weight)
    ax.set_xscale("log")
    ax.set_xlim(1_000, 400_000_000)
    ax.set_ylim(60, 102)
    ax.set_xlabel("Parameter count, logarithmic scale")
    ax.set_ylabel("Published or observed accuracy (%)")
    ax.set_title("Accuracy and compactness, indicative comparison")
    ax.grid(alpha=0.22)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(path2, bbox_inches="tight", facecolor="white")
    plt.close(fig)

    path3 = HERE / "weighted_work_en.png"
    labels = ["GRU\nMACs", "SNN\npropagation", "SNN\nsensor + network"]
    values = [225_280, 5_305, 22_000]
    colors_bar = ["#3A936A", "#F18F01", "#2374AB"]
    fig, ax = plt.subplots(figsize=(8.8, 4.6), dpi=180)
    bars = ax.bar(labels, values, color=colors_bar, width=0.58)
    ax.set_yscale("log")
    ax.set_ylabel("Operations per window, logarithmic scale")
    ax.set_title("Compute load after envelope extraction")
    ax.grid(axis="y", alpha=0.22)
    ax.spines[["top", "right", "left"]].set_visible(False)
    for bar, value, label in zip(bars, values, ["225,280", "5,305", "~22,000"]):
        ax.text(bar.get_x() + bar.get_width() / 2, value * 1.18, label, ha="center", va="bottom", fontsize=9, fontweight="bold")
    fig.tight_layout()
    fig.savefig(path3, bbox_inches="tight", facecolor="white")
    plt.close(fig)

    return path1, path2, path3


def page_decoration_en(canvas, doc) -> None:
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(m.NAVY)
    canvas.rect(0, height - 13 * mm, width, 13 * mm, stroke=0, fill=1)
    canvas.setFont("Arial-Bold", 7.8)
    canvas.setFillColor(colors.white)
    canvas.drawString(18 * mm, height - 8.5 * mm, "SpikyPanda | Compact, physics-informed MCSA diagnosis")
    canvas.setFont("Arial", 7.2)
    canvas.setFillColor(m.MID)
    canvas.drawString(18 * mm, 10 * mm, "Comparative R&D report - August 27, 2026")
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.setStrokeColor(m.GRID)
    canvas.setLineWidth(0.4)
    canvas.line(18 * mm, 14 * mm, width - 18 * mm, 14 * mm)
    canvas.restoreState()


def build_report() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    chart_params, chart_accuracy, chart_work = make_charts_en()

    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
        title="From 143.7 Million Parameters to 1,893 Weights",
        author="SpikyPanda R&D",
        subject="Physics-informed MCSA, compact recurrent networks, and hard-forward SNN inference",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="report", frames=[frame], onPage=page_decoration_en)])

    story = []
    story.extend(
        [
            Spacer(1, 11 * mm),
            P("FROM 143.7 MILLION PARAMETERS TO 1,893 WEIGHTS", "ReportTitle"),
            P(
                "A physics-informed path toward compact, event-driven, MCU-ready motor diagnosis",
                "ReportSubtitle",
            ),
            m.AccentRule(17 * cm, m.TEAL, 3),
            Spacer(1, 5 * mm),
            P(
                "This report places three reductions on the same quantitative trajectory: large deep networks from the literature, the compact recurrent model developed in the MCSA study, and the current hard-forward spiking neural network. Model size, compute load, memory, and estimated energy are treated as separate quantities.",
            ),
            Spacer(1, 3 * mm),
            Table(
                [[
                    m.metric_box("75,900x", "fewer parameters than VGG-19", m.LIGHT_BLUE),
                    m.metric_box("1.9x", "fewer weights than the GRU", m.LIGHT_GREEN),
                    m.metric_box("42.5x", "fewer weighted propagations", m.LIGHT_ORANGE),
                ]],
                colWidths=[5.55 * cm, 5.55 * cm, 5.55 * cm],
                hAlign="LEFT",
            ),
            Spacer(1, 6 * mm),
            m.callout(
                "Central result: the main advance is not compression alone. A physically aligned signal representation first removes unnecessary model capacity. Event-driven inference then removes most of the remaining dense weighted computation.",
                m.LIGHT_GREEN,
                m.TEAL,
            ),
            Spacer(1, 7 * mm),
            P("Reference figures", "H2x"),
            m.styled_table(
                [
                    ["Stage", "Architecture", "Parameters", "Accuracy", "Primary result"],
                    ["Literature", "VGG-19", "143.7 M", "99.4%", "High accuracy, GPU-scale cost"],
                    ["MCSA paper", "LSTM h=32", "4,773", "88.0%", "19.1 KB float32"],
                    ["SpikyPanda experiment", "GRU h=32", "3,621", "91.0% test", "364/400"],
                    ["SpikyPanda experiment", "SNN 32+5 LIF", "1,893", "78.5% test", "314/400, grouped split"],
                ],
                [2.5 * cm, 3.0 * cm, 2.2 * cm, 2.4 * cm, 6.5 * cm],
            ),
            Spacer(1, 3 * mm),
            P(
                "Terminology note: the million-parameter models in the MCSA paper are deep CNN architectures, mainly VGG-19 and NASNet-Mobile, rather than conventional MLPs. The explicitly evaluated MLP is a 773-parameter FFT+MLP baseline that reaches 67.0%.",
                "SmallX",
            ),
            Spacer(1, 4 * mm),
            P("Technical synthesis | SpikyPanda | August 27, 2026", "SmallX"),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("1. Why this comparison matters", "H1x"),
            P(
                "Accuracy alone does not establish deployability. A 143.7-million-parameter network can reach 99.4%, yet its float32 weights require approximately 574.8 MB and the cited execution environment is GPU-based. An MCU-oriented solution must fit in kilobytes while limiting memory traffic, multiplications, nonlinear functions, and active time.",
            ),
            P(
                "The research question is therefore stricter than peak accuracy: <b>what is the smallest representation and compute budget that can retain useful broken-rotor-bar severity information?</b>",
            ),
            Image(str(chart_params), width=16.5 * cm, height=8.25 * cm),
            P(
                "Figure 1. Parameter counts for the cited architectures and the SpikyPanda models. A logarithmic axis is required to make the compact models visible.",
                "CaptionX",
            ),
            P("Correct interpretation of the reduction factors", "H2x"),
            m.styled_table(
                [
                    ["Comparison", "Ratio", "Meaning"],
                    ["VGG-19 / SNN", "143,700,000 / 1,893 = 75,909x", "Parameter count reduction"],
                    ["NASNet-M / SNN", "5,300,000 / 1,893 = 2,800x", "Parameter count reduction"],
                    ["MCSA LSTM / SNN", "4,773 / 1,893 = 2.52x", "Parameter count reduction"],
                    ["GRU / SNN", "3,621 / 1,893 = 1.91x", "Parameter count reduction"],
                    ["GRU compute / SNN propagation", "225,280 / 5,305 = 42.47x", "Weighted operation reduction"],
                ],
                [4.0 * cm, 5.4 * cm, 7.1 * cm],
            ),
            Spacer(1, 3 * mm),
            m.callout(
                "The factor close to 45 does not describe GRU-to-SNN model size. It describes weighted propagations per observed window. Weight storage is reduced by 1.9x.",
                m.LIGHT_ORANGE,
                m.ORANGE,
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("2. First breakthrough: understand the signal before scaling the network", "H1x"),
            P(
                "The MCSA paper starts from the fault physics. A broken rotor bar creates sidebands around the supply frequency. For supply frequency f and slip s, the principal components occur near f(1 - 2s) and f(1 + 2s). In the time domain, they appear as a slow amplitude modulation, typically between 2 and 6 Hz on the studied test bench.",
            ),
            P("Approximate modulation frequency:  f_mod = 2 s f", "Formula"),
            P(
                "Large CNNs operating on raw current or spectrograms have enough capacity to learn an implicit envelope detector. The MCSA work makes that operation explicit with a half-cycle moving RMS:",
            ),
            P("env(t) = sqrt[ (1/W) * sum(i=0..W-1) x(t+i)^2 ]", "Formula"),
            P(
                "After transient removal, decimation to approximately 60 Hz, and per-window centering, 256 high-frequency values are replaced by 64 envelope samples. The slow fault signature becomes directly accessible to the recurrent network.",
            ),
            P("Ablation reported in the paper", "H2x"),
            m.styled_table(
                [
                    ["Representation", "Accuracy", "Observed failure or gain"],
                    ["Raw, per-trace normalization, 64 steps", "26.8%", "Amplitude normalization removes the signature"],
                    ["Raw, global normalization, 256 steps", "16.0%", "Insufficient recurrent gradient through the long sequence"],
                    ["Envelope, global min/max", "35.0%", "Load level remains dominant"],
                    ["Centered envelope", "88.0%", "The useful modulation becomes visible"],
                ],
                [6.2 * cm, 2.2 * cm, 8.1 * cm],
            ),
            Spacer(1, 4 * mm),
            m.callout(
                "The decisive gain is not another layer. It is the removal of irrelevant carrier structure and the load-dependent baseline. This physics-informed representation reduces the capacity requirement by several orders of magnitude.",
                m.LIGHT_GREEN,
                m.TEAL,
            ),
            P("What the small MLP demonstrates", "H2x"),
            P(
                "The FFT+MLP baseline contains only 773 parameters, fewer than the current SNN, but reaches 67.0%. A small parameter count is therefore not sufficient. The architecture must match the temporal structure of the phenomenon. The LSTM, GRU, and SNN each provide a form of memory that the small MLP lacks.",
            ),
            P("MCSA paper result", "H2x"),
            P(
                "The LSTM h=32 contains 4,773 parameters, requires 19.1 KB in float32, and reaches 88.0% on five severity levels. Binary healthy/fault accuracy reaches 97.3%. The result establishes that explicit physical representation can replace a large fraction of deep-network capacity.",
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("3. Second breakthrough: from LSTM to a compact GRU", "H1x"),
            P(
                "The GRU retains recurrent memory while using three weight groups instead of the four LSTM gates. With 3 inputs, 32 hidden units, and 5 outputs, the exact count is:",
            ),
            P(
                "GRU input: 3 x 3 x 32 = 288\n"
                "GRU recurrence: 3 x 32 x 32 = 3,072\n"
                "GRU biases: 3 x 32 = 96\n"
                "Output: 32 x 5 + 5 = 165\n"
                "Total: 3,621 parameters",
                "Formula",
            ),
            P(
                "The best recorded checkpoint reaches 93.5% validation accuracy and 91.0% on 400 test windows, with 364 correct classifications. Its weights occupy exactly 14,484 bytes in float32, or 14.14 KiB.",
            ),
            m.callout(
                "Relative to the paper's LSTM, the GRU reduces parameter count by 24.1% while moving from 88.0% to 91.0% on the observed test. This is encouraging but not a controlled ablation, because the protocol and pipeline version also changed.",
                m.LIGHT_BLUE,
                m.BLUE,
            ),
            Spacer(1, 4 * mm),
            P("GRU compute cost", "H2x"),
            P(
                "The current runtime computes all three GRU weight groups and five outputs at each of 64 time steps:",
            ),
            P(
                "MACs per step = 3 x 32 x (3 + 32) + 32 x 5 = 3,520\n"
                "MACs per window = 3,520 x 64 = 225,280",
                "Formula",
            ),
            P(
                "The runtime also evaluates 6,464 sigmoid or tanh functions. On an MCU, these can cost more than a multiply-accumulate unless replaced by lookup tables or dedicated approximations.",
            ),
            P("Accuracy and compactness", "H2x"),
            Image(str(chart_accuracy), width=16.3 * cm, height=8.5 * cm),
            P(
                "Figure 2. Each point must be interpreted with its experimental protocol. Literature results, the historical GRU, and the grouped SNN do not all use the same acquisition split.",
                "CaptionX",
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("4. Third breakthrough: from dense computation to event-driven computation", "H1x"),
            P(
                "The current SNN does not simply replace GRU activations with zeros and ones. It changes the interface between the signal and the network. Nine sensor cells filter the three current envelopes around three frequency fields. Phase crossings and three intensity levels produce 54 binary spike ports.",
            ),
            P(
                "Compiled topology: observation -> 9 IIR cells -> 54 ports -> 32 hidden LIF -> 5 class LIF",
                "Formula",
            ),
            P("Exact weight count", "H2x"),
            P(
                "Sensor to hidden: 54 x 32 = 1,728\n"
                "Hidden to classes: 32 x 5 = 160\n"
                "Frame-end signal to classes: 5\n"
                "Total: 1,893 trainable weights",
                "Formula",
            ),
            P(
                "The training forward pass is strictly identical to native LIF inference: binary thresholding, hard reset, and no fractional values transmitted over neural links. The surrogate derivative is used only for gradient computation. The loss is aligned with the score read by the deployed runtime:",
            ),
            P("score[c] = 2 x spike_count[c] + final_membrane[c] / threshold[c]", "Formula"),
            P(
                "This objective change raised the best hard-forward SNN from 51.0% to 78.5% on the independent test while reducing activity from 179.2 to 118.6 neuron spikes per window.",
            ),
            P("Measured event-driven work", "H2x"),
            m.styled_table(
                [
                    ["Source", "Computation", "Average weighted operations"],
                    ["Sensor -> 32 LIF", "147.24 events x 32", "4,712 weight additions"],
                    ["32 LIF -> 5 classes", "117.64 hidden spikes x 5", "588 weight additions"],
                    ["Frame end", "1 event x 5", "5 weight additions"],
                    ["Network total", "", "approximately 5,305 additions"],
                ],
                [5.2 * cm, 5.0 * cm, 6.3 * cm],
            ),
            Spacer(1, 3 * mm),
            P(
                "Because spike amplitude is exactly 1, synaptic propagation can reduce to <b>membrane += weight</b>. Multiplications remain in the nine IIR filters and membrane decay, but the full dense matrix is no longer evaluated at every time step.",
            ),
            m.callout(
                "The measured window requires 225,280 GRU MACs versus approximately 5,305 SNN synaptic additions, a 42.5x reduction in weighted propagation.",
                m.LIGHT_ORANGE,
                m.ORANGE,
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("5. Memory, CPU load, and estimated energy", "H1x"),
            P("Weight storage", "H2x"),
            m.styled_table(
                [
                    ["Model", "Parameters", "Float32 weights", "Int8 weights", "Context"],
                    ["VGG-19", "143.7 M", "574.8 MB", "143.7 MB", "GPU in cited work"],
                    ["NASNet-M", "5.3 M", "21.2 MB", "5.3 MB", "GPU in cited work"],
                    ["CNN-LSTM", "~100 k", "~400 KB", "~100 KB", "Deep hybrid"],
                    ["MCSA LSTM", "4,773", "19.1 KB", "4.8 KB", "MCSA paper"],
                    ["GRU h=32", "3,621", "14.5 KB", "3.6 KB", "Observed checkpoint"],
                    ["SNN h=32", "1,893", "7.6 KB", "1.9 KB", "Weights only"],
                ],
                [3.1 * cm, 2.3 * cm, 2.5 * cm, 2.3 * cm, 6.3 * cm],
            ),
            Spacer(1, 3 * mm),
            P(
                "SNN deployment must also store coefficients for nine filters, thresholds, LIF constants, and possibly routing indices. A specialized float32 layout is estimated at 8 to 9 KiB. A generic sparse graph is more likely to require 10 to 13 KiB. With int8 weights, routing metadata can cost more than the weights themselves, so dense blocks should compile into contiguous arrays.",
            ),
            P("Compute load", "H2x"),
            Image(str(chart_work), width=15.6 * cm, height=7.7 * cm),
            P(
                "Figure 3. The SNN sensor adds 1,152 biquad updates. Including filters, thresholds, LIF dynamics, and routing, useful arithmetic is estimated at 17,000 to 30,000 simple operations per window.",
                "CaptionX",
            ),
            P("Illustrative MCU estimate, model only", "H2x"),
            m.styled_table(
                [
                    ["Illustrative assumption", "GRU", "Specialized SNN"],
                    ["Cycles per window", "0.5 to 1.5 million", "50,000 to 150,000"],
                    ["80 MHz MCU", "6.25 to 18.75 ms", "0.63 to 1.88 ms"],
                    ["At 10 mW active power", "approximately 60 to 190 µJ", "approximately 6 to 20 µJ"],
                    ["Expected energy ratio", "reference 1", "approximately 5x to 15x lower"],
                ],
                [6.2 * cm, 5.1 * cm, 5.2 * cm],
            ),
            P(
                "The microjoule values are not measurements. They illustrate a plausible range. The ratio is more robust than the absolute value, which depends on the MCU, numeric format, memory, and compiler.",
                "SmallX",
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("6. What the estimate includes, and what it excludes", "H1x"),
            P("Shared envelope cost", "H2x"),
            P(
                "The current GRU and SNN consume a precomputed RMS envelope. On the target device, this envelope must be produced from three current channels sampled near 55.6 kHz. A 1.066-second window contains close to 60,000 samples per phase, approximately 178,000 squares, and 356,000 additions or subtractions for a basic moving RMS.",
            ),
            P(
                "If the same MCU performs this stage, it becomes a significant shared cost and narrows the end-to-end energy advantage to an estimated 1.5x to 3x. If a sensor, DSP, or existing acquisition stage provides the envelope, the neural-engine advantage remains closer to 5x to 15x.",
            ),
            P("Software representation matters", "H2x"),
            P(
                "The current SNN checkpoint takes approximately 13.5 ms per window in the browser. This does not represent MCU potential. The TypeScript runtime uses a dynamic graph, event objects, channels, and generic exponentials. The projected gain requires contiguous arrays, implicit fanouts, no allocation per spike, and precomputed decay coefficients.",
            ),
            P("Working RAM", "H2x"),
            m.styled_table(
                [
                    ["Element", "GRU h=32", "SNN with 9 sensors and 37 LIF"],
                    ["Primary state", "32 hidden values and gate buffers", "9 IIR states and 37 membranes"],
                    ["Estimated optimized RAM", "0.6 to 1.2 KiB", "1 to 3 KiB"],
                    ["Primary risk", "Buffers not reused", "Event queues and graph metadata"],
                ],
                [5.0 * cm, 5.6 * cm, 5.9 * cm],
            ),
            Spacer(1, 4 * mm),
            m.callout(
                "The SNN clearly reduces weights and weight traffic, but it does not automatically reduce RAM. An overly generic event scheduler can use more state than a compact GRU kernel.",
                m.LIGHT_ORANGE,
                m.ORANGE,
            ),
            P("Accuracy comparability", "H2x"),
            P(
                "The 91.0% GRU uses the historical dataset fingerprint dcb578a0 with 64 steps. The 78.5% SNN uses fingerprint ec00f5c3, 128 steps at 120.110 Hz, and an acquisition-grouped split. The grouped protocol prevents an acquisition, or overlapping windows from that acquisition, from appearing in both training and testing.",
            ),
            P(
                "It would therefore be incorrect to claim an exact 12.5-point loss for the SNN under identical conditions. A scientific comparison requires training the GRU h=32 on ec00f5c3 with the same training, validation, and 400 independent test windows.",
            ),
            P("Load-stratified robustness", "H2x"),
            P(
                "The test set covers eight load levels from 12.5% to 100%. The aggregate checkpoint confusion matrix does not identify the loads at which errors occur. The paper must therefore avoid attributing Healthy/BRB1 errors to light load until inference is replayed and every prediction is linked to its source acquisition.",
            ),
            m.styled_table(
                [
                    ["Measurement to report at each load", "Scientific purpose"],
                    ["Window count and accuracy", "Verify representativeness and overall stability"],
                    ["Healthy recall and BRB1 recall", "Locate the detection limit for mild faults"],
                    ["Healthy to BRB1 and BRB1 to Healthy errors", "Separate false alarms from missed faults"],
                    ["Classification margin and event rate", "Relate uncertainty to physical signal visibility"],
                ],
                [7.5 * cm, 9.0 * cm],
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("7. R&amp;D interpretation", "H1x"),
            P("Observed progression", "H2x"),
            m.styled_table(
                [
                    ["Stage", "Question addressed", "Result"],
                    ["Large deep networks", "Can very high accuracy be reached?", "Yes, 96% to 99.4%, with 5.3 M to 143.7 M parameters"],
                    ["MCSA preprocessing", "What physical information is actually useful?", "2 to 6 Hz envelope, 4,773-parameter LSTM"],
                    ["Compact GRU", "Can recurrent memory be reduced?", "3,621 parameters, 91.0% on historical test"],
                    ["Hard-forward SNN", "Can dense computation become event-driven?", "1,893 weights, 5,305 propagations, 78.5% grouped test"],
                ],
                [3.5 * cm, 6.1 * cm, 6.9 * cm],
            ),
            Spacer(1, 5 * mm),
            P("What the SNN already demonstrates", "H2x"),
            P(
                "The current SNN demonstrates that a network with strictly binary neural communication can learn five-level classification without forward pseudo-spikes. It reaches 78.5% on an independent grouped test using 1,893 weights, 147.2 sensor events, and 118.6 neuron spikes per window. Its main advantage is not yet accuracy. It is the transition from systematic dense evaluation to signal-conditioned activity.",
            ),
            P("What remains to be demonstrated", "H2x"),
            m.styled_table(
                [
                    ["Validation", "Required measurement"],
                    ["GRU on grouped split", "Accuracy, MACs, time, and energy on ec00f5c3"],
                    ["Compact MCU SNN kernel", "Exact cycles, flash, RAM, and absence of allocation"],
                    ["Quantization", "Float32 accuracy compared with int8/int16"],
                    ["Physical energy", "µJ per window measured with a shunt or power analyzer"],
                    ["Complete preprocessing", "Separate shared RMS, wave sensor, and network costs"],
                    ["Robustness by load", "Accuracy, Healthy/BRB1 recall, margin, and event rate for each of the eight loads"],
                ],
                [6.1 * cm, 10.4 * cm],
            ),
            Spacer(1, 5 * mm),
            m.callout(
                "Conclusion: this trajectory does not show that an SNN is merely a smaller network. Physics-informed representation first removes millions of unnecessary parameters. Event-driven representation then removes approximately 42x of the remaining weighted propagation. The architecture is credible for MCU deployment, provided that its cost is confirmed on a compact embedded kernel.",
                m.LIGHT_GREEN,
                m.TEAL,
            ),
            Spacer(1, 5 * mm),
            P("References and data provenance", "H2x"),
            P(
                "[1] G. Pelletier, <i>Envelope-Domain Preprocessing for Ultra-Compact LSTM-Based Broken Rotor Bar Severity Grading</i>, local document motor-current-mcsa-paper.pdf, 5 pages.",
                "SmallX",
            ),
            P(
                "[2] GRU checkpoint motor_current_best_val_93p5.json: GRU h=32, 3,621 parameters, 93.5% validation, 91.0% test (364/400), fingerprint dcb578a0.",
                "SmallX",
            ),
            P(
                "[3] SNN checkpoint motor_current_snn_h32_5a83490c_best_val_82p5.json: 1,893 weights, 82.5% validation, 78.5% test (314/400), fingerprint ec00f5c3.",
                "SmallX",
            ),
            P(
                "[4] Local experiment report runtime-decoder-loss-experiment.md: hard-forward protocol, neural activity, native runtime identity, and loss comparison.",
                "SmallX",
            ),
            P(
                "[5] VGG-19, NASNet-Mobile, and CNN-LSTM figures are reproduced from the MCSA paper's comparison table, which cites Barrera-Llanga et al. and Jakaria et al. Published protocols are not necessarily identical.",
                "SmallX",
            ),
        ]
    )

    doc.build(story)


if __name__ == "__main__":
    build_report()
    print(OUTPUT)

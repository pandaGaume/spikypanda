"""
Generate the LiDAR Autoencoder R&D paper as PDF using ReportLab.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, Image
)
from reportlab.lib import colors
from reportlab.platypus.flowables import Flowable
from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.graphics import renderPDF
import os

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "lidar-autoencoder-rd-paper.pdf")

# ============================================================================
# Styles
# ============================================================================
styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    name='PaperTitle',
    parent=styles['Title'],
    fontSize=18,
    leading=22,
    alignment=TA_CENTER,
    spaceAfter=6,
    textColor=HexColor('#1a1a2e'),
))

styles.add(ParagraphStyle(
    name='Authors',
    parent=styles['Normal'],
    fontSize=11,
    alignment=TA_CENTER,
    spaceAfter=4,
    textColor=HexColor('#333333'),
))

styles.add(ParagraphStyle(
    name='Affiliation',
    parent=styles['Normal'],
    fontSize=9,
    alignment=TA_CENTER,
    spaceAfter=12,
    textColor=HexColor('#666666'),
    italic=True,
))

styles.add(ParagraphStyle(
    name='Abstract',
    parent=styles['Normal'],
    fontSize=9.5,
    leading=13,
    alignment=TA_JUSTIFY,
    leftIndent=20,
    rightIndent=20,
    spaceAfter=12,
    textColor=HexColor('#222222'),
))

styles.add(ParagraphStyle(
    name='AbstractLabel',
    parent=styles['Normal'],
    fontSize=10,
    leading=13,
    alignment=TA_CENTER,
    spaceBefore=8,
    spaceAfter=6,
    textColor=HexColor('#1a1a2e'),
    bold=True,
))

styles.add(ParagraphStyle(
    name='SectionHeading',
    parent=styles['Heading1'],
    fontSize=13,
    leading=16,
    spaceBefore=16,
    spaceAfter=8,
    textColor=HexColor('#1a1a2e'),
))

styles.add(ParagraphStyle(
    name='SubHeading',
    parent=styles['Heading2'],
    fontSize=11,
    leading=14,
    spaceBefore=10,
    spaceAfter=6,
    textColor=HexColor('#2c3e6b'),
))

styles.add(ParagraphStyle(
    name='BodyText2',
    parent=styles['Normal'],
    fontSize=10,
    leading=14,
    alignment=TA_JUSTIFY,
    spaceAfter=6,
))

styles.add(ParagraphStyle(
    name='Caption',
    parent=styles['Normal'],
    fontSize=8.5,
    leading=11,
    alignment=TA_CENTER,
    spaceAfter=10,
    spaceBefore=4,
    textColor=HexColor('#444444'),
    italic=True,
))

styles.add(ParagraphStyle(
    name='Equation',
    parent=styles['Normal'],
    fontSize=10,
    leading=14,
    alignment=TA_CENTER,
    spaceBefore=8,
    spaceAfter=8,
    fontName='Courier',
))

styles.add(ParagraphStyle(
    name='Footer',
    parent=styles['Normal'],
    fontSize=8,
    alignment=TA_CENTER,
    textColor=HexColor('#888888'),
))

styles.add(ParagraphStyle(
    name='TableCell',
    parent=styles['Normal'],
    fontSize=8.5,
    leading=11,
    alignment=TA_CENTER,
))

styles.add(ParagraphStyle(
    name='TableHeader',
    parent=styles['Normal'],
    fontSize=8.5,
    leading=11,
    alignment=TA_CENTER,
    bold=True,
    textColor=white,
))


# ============================================================================
# Helper
# ============================================================================
def make_table(headers, rows, col_widths=None):
    """Create a styled table."""
    header_row = [Paragraph(f"<b>{h}</b>", styles['TableHeader']) for h in headers]
    data = [header_row]
    for row in rows:
        data.append([Paragraph(str(c), styles['TableCell']) for c in row])

    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a1a2e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cccccc')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f5f7fa'), white]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return t


def section(title):
    return Paragraph(title, styles['SectionHeading'])


def subsection(title):
    return Paragraph(title, styles['SubHeading'])


def body(text):
    return Paragraph(text, styles['BodyText2'])


def caption(text):
    return Paragraph(text, styles['Caption'])


def equation(text):
    return Paragraph(text, styles['Equation'])


def spacer(h=6):
    return Spacer(1, h)


# ============================================================================
# Document
# ============================================================================
def build_paper():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        leftMargin=25 * mm,
        rightMargin=25 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    story = []
    W = A4[0] - 50 * mm  # usable width

    # ========================================================================
    # TITLE PAGE
    # ========================================================================
    story.append(Spacer(1, 15 * mm))
    story.append(Paragraph(
        "Convolutional Autoencoder for LiDAR Grid Compression<br/>"
        "in Simulated Autonomous Navigation",
        styles['PaperTitle']
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Guillaume Pelletier", styles['Authors']))
    story.append(Paragraph("SpikyPanda Project  -  March 2026", styles['Affiliation']))

    story.append(HRFlowable(width="60%", thickness=1, color=HexColor('#1a1a2e'),
                             spaceAfter=10, spaceBefore=6))

    # Abstract
    story.append(Paragraph("<b>Abstract</b>", styles['AbstractLabel']))
    story.append(Paragraph(
        "This paper presents the design, implementation, and quantitative evaluation of a convolutional "
        "autoencoder for compressing projected LiDAR occupancy grids in the context of simulated autonomous "
        "navigation. The approach encodes a 6-channel spatial grid (point density, height statistics, "
        "reflectivity, and velocity) into a compact latent vector suitable for fusion with inertial and "
        "odometry sensors. The system is implemented within the SpikyPanda graph-based neural network "
        "framework in TypeScript, where every neuron and synapse is an explicit object in a traversable graph. "
        "We evaluate reconstruction quality across five synthetic scene types, analyze the impact of "
        "architecture depth, latent dimensionality, and input resolution on MSE, and demonstrate that "
        "the encoder achieves a 24x compression ratio with RMSE below 0.08 on normalized inputs. "
        "All experiments are reproducible in-browser without GPU acceleration.",
        styles['Abstract']
    ))

    story.append(HRFlowable(width="60%", thickness=0.5, color=HexColor('#cccccc'),
                             spaceAfter=10))

    # Keywords
    story.append(Paragraph(
        "<b>Keywords:</b> autoencoder, LiDAR, convolutional neural network, latent representation, "
        "autonomous navigation, sensor fusion, graph-based neural network, TypeScript",
        ParagraphStyle('kw', parent=styles['Abstract'], fontSize=9, italic=True)
    ))

    story.append(Spacer(1, 8))

    # ========================================================================
    # 1. INTRODUCTION
    # ========================================================================
    story.append(section("1. Introduction"))
    story.append(body(
        "Autonomous navigation systems rely on real-time perception of the environment. "
        "LiDAR sensors produce dense 3D point clouds that are commonly projected onto 2D occupancy grids "
        "for downstream processing. A typical projected grid at 64x64 resolution with 6 channels represents "
        "24,576 scalar values per frame, which is prohibitively large as a direct input to a navigation "
        "controller, especially when fused with other sensor modalities (IMU, wheel odometry, GPS)."
    ))
    story.append(body(
        "Convolutional autoencoders provide a principled approach to dimensionality reduction: "
        "by training a network to reconstruct its own input through an information bottleneck, the encoder "
        "portion learns a compact latent representation that preserves the essential spatial structure. "
        "Only the encoder is retained for inference, and the latent vector is concatenated with other "
        "sensor inputs before being fed to a navigation policy."
    ))
    story.append(body(
        "This work presents a complete implementation of such an autoencoder within the SpikyPanda framework, "
        "a graph-based neural network runtime written in TypeScript. Unlike tensor-based frameworks (PyTorch, "
        "TensorFlow), SpikyPanda represents each neuron and synapse as an individual object in an explicit "
        "graph structure. This design supports non-standard architectures (spiking neural networks, "
        "neuroevolution) but imposes computational overhead that must be characterized. "
        "We validate the approach on synthetic LiDAR data and provide quantitative benchmarks."
    ))

    # ========================================================================
    # 2. POSITIONING — STATE OF THE ART
    # ========================================================================
    story.append(section("2. Positioning with Respect to the State of the Art"))
    story.append(body(
        "<b>This work does not claim novel scientific contributions in the field of autoencoders "
        "or LiDAR perception.</b> The convolutional autoencoder architecture, the MSE reconstruction "
        "loss, the Adam optimizer, and the projection of LiDAR point clouds onto multi-channel "
        "occupancy grids are all well-established techniques in the literature (Masci et al. 2011, "
        "Kingma & Ba 2015, Chen et al. 2017). The 6-channel encoding (density, height statistics, "
        "reflectivity, velocity) follows standard practice in autonomous driving research."
    ))
    story.append(body(
        "The purpose of this study is to <b>reproduce the state of the art</b> within the SpikyPanda "
        "framework and to establish a quantified baseline. This baseline serves as a foundational "
        "building block for a broader research program whose anticipated scientific contributions lie "
        "in the following areas:"
    ))

    t_contributions = make_table(
        ["Research Axis", "State of the Art", "SpikyPanda Contribution (Planned)"],
        [
            ["Neural representation",
             "Tensors (fixed-topology matrices)",
             "Explicit graph with mutable topology, enabling structural evolution at runtime"],
            ["Training paradigm",
             "Backpropagation (gradient descent)",
             "Neuroevolution (mutation + natural selection), no gradient required"],
            ["Neuron model",
             "Homogeneous rate-coded units",
             "Heterogeneous: rate-coded, spiking (LIF), astrocyte-like meta-neurons in the same graph"],
            ["Learning rule",
             "Global loss minimization",
             "Local plasticity (STDP), spatially-modulated by astrocyte gating"],
            ["Inference target",
             "GPU throughput",
             "CPU real-time in evolutionary simulation (bestioles), structural flexibility over speed"],
        ],
        col_widths=[70, W/2 - 50, W/2 - 20]
    )
    story.append(t_contributions)
    story.append(caption(
        "Table 1: Positioning of the SpikyPanda research program. The autoencoder study (this paper) "
        "validates the first column; the planned contributions target the third column."
    ))

    story.append(body(
        "The present autoencoder experiment validates that the graph-based runtime can correctly "
        "implement and train a standard CNN architecture, producing results consistent with the "
        "published literature. This is a necessary precondition before introducing non-standard "
        "elements (spiking dynamics, structural mutations, local learning rules) whose correctness "
        "cannot be verified against known baselines if the underlying infrastructure is not validated first."
    ))
    story.append(body(
        "In summary, this paper constitutes a <b>validation milestone</b> in a multi-stage research "
        "program. The scientific novelty resides not in the autoencoder itself but in the unique "
        "runtime substrate (graph-based, heterogeneous, evolvable) on which it is executed, and in "
        "the future extensions that this substrate enables."
    ))

    # ========================================================================
    # 3. INPUT REPRESENTATION
    # ========================================================================
    story.append(section("3. Input Representation"))
    story.append(body(
        "The input to the autoencoder is a 2D grid in CHW (Channel-Height-Width) format with values "
        "normalized to [0, 1]. Each cell aggregates LiDAR returns within a spatial bin. Six channels "
        "encode complementary information about the local geometry and dynamics:"
    ))

    t_channels = make_table(
        ["Channel", "Name", "Description", "Discriminative Role"],
        [
            ["C0", "Point density", "Number of returns per cell", "Occupancy confidence"],
            ["C1", "Z max", "Maximum height", "Obstacle detection"],
            ["C2", "Z min", "Minimum height", "Ground surface, curbs"],
            ["C3", "Std(z)", "Height variance", "Vegetation vs. solid walls"],
            ["C4", "Reflectivity", "Mean surface reflectivity", "Surface material (asphalt vs. grass)"],
            ["C5", "Velocity", "Dynamic flag / speed", "Moving vs. static objects"],
        ],
        col_widths=[30, 55, 100, W - 185]
    )
    story.append(t_channels)
    story.append(caption("Table 2: Input channel specification. All values normalized to [0, 1]."))

    story.append(body(
        "Channel C3 (height variance) is particularly informative for navigation: vegetation and tree "
        "canopies produce high variance returns that are geometrically similar to solid walls in C1 (Z max) "
        "but are typically traversable. The autoencoder must learn to preserve this distinction in the latent space."
    ))

    # ========================================================================
    # 3. ARCHITECTURE
    # ========================================================================
    story.append(section("4. Architecture"))

    story.append(subsection("4.1 Encoder"))
    story.append(body(
        "The encoder follows a standard convolutional downsampling path. All convolutional layers use "
        "Same padding to preserve spatial dimensions (only pooling reduces resolution). This ensures "
        "symmetric reconstruction in the decoder. The encoder terminates with a flatten operation followed "
        "by a dense layer with linear activation to produce the latent vector."
    ))
    story.append(equation(
        "Input(W x H x 6) --> Conv(F, K, Same, ReLU) --> MaxPool(2x2) --> ... --> Flatten --> Dense(D, linear)"
    ))

    story.append(subsection("4.2 Decoder"))
    story.append(body(
        "The decoder mirrors the encoder by reversing each operation: Dense expands the latent back to "
        "the flattened spatial size, Reshape restores the 3D layout, Upsample (nearest-neighbor) inverts "
        "MaxPool, and Conv with Same padding reconstructs the feature maps. The final convolutional layer "
        "uses sigmoid activation to produce outputs in [0, 1]."
    ))
    story.append(body(
        "Two new layer types were implemented in SpikyPanda to support the decoder:"
    ))
    story.append(body(
        "<b>Upsample</b> - Nearest-neighbor upscaling. Each input neuron connects to a factor x factor "
        "block of output neurons with weight 1. This is the inverse of MaxPool in terms of spatial "
        "dimensions, though it does not invert the max selection."
    ))
    story.append(body(
        "<b>Reshape</b> - One-to-one remapping from a flat layout to a spatial (H, W, C) layout. "
        "This is the algebraic inverse of Flatten. Both layers have zero learnable parameters."
    ))

    story.append(subsection("4.3 Presets"))
    t_presets = make_table(
        ["Preset", "Target Input", "Encoder Architecture", "Neurons", "Synapses"],
        [
            ["Tiny", "16 x 16", "Conv(8, 3x3, Same) -> Pool(2x2)", "9,280", "273,792"],
            ["Small", "32 x 32", "Conv(8, 3x3) -> Pool -> Conv(16, 3x3) -> Pool", "11,328", "366,464"],
            ["Standard", "64 x 64", "Conv(8, 5x5) -> Pool -> Conv(16, 3x3) -> Pool -> Conv(32, 3x3) -> Pool", "~40K+", "~1M+"],
        ],
        col_widths=[45, 50, W - 200, 50, 55]
    )
    story.append(t_presets)
    story.append(caption("Table 3: Predefined autoencoder architectures. Neuron and synapse counts include the full autoencoder (encoder + decoder)."))

    story.append(subsection("4.4 Weight Sharing"))
    story.append(body(
        "The encoder and autoencoder graphs share the same IKernel objects for convolutional layers. "
        "After training the full autoencoder, convolutional weights are automatically available in the "
        "encoder-only graph (same object references). Dense layer weights require an explicit synchronization "
        "step via AutoencoderBuilder.syncWeights()."
    ))

    # ========================================================================
    # 4. TRAINING
    # ========================================================================
    story.append(section("5. Training Methodology"))

    story.append(subsection("5.1 Loss Function"))
    story.append(body(
        "The autoencoder is trained with Mean Squared Error (MSE) loss, where the target output "
        "is the input itself. For a sample with N scalar values:"
    ))
    story.append(equation(
        "L = (1/N) * SUM( (x<sub>i</sub> - x'<sub>i</sub>)<super>2</super> )    where x' = decoder(encoder(x))"
    ))
    story.append(body(
        "MSE is preferred over cross-entropy for reconstruction tasks because pixel values are "
        "continuous in [0, 1] rather than categorical. The squared penalty ensures that large "
        "reconstruction errors are weighted disproportionately, encouraging faithful reproduction "
        "of high-contrast features (obstacles, road boundaries)."
    ))

    story.append(subsection("5.2 Optimizer"))
    story.append(body(
        "All experiments use the Adam optimizer (Kingma & Ba, 2015) with default momentum parameters "
        "(beta1 = 0.9, beta2 = 0.999). Learning rate is set to 0.003 unless otherwise noted. "
        "Adam's per-parameter adaptive learning rates are well-suited to the mixed conv/dense architecture "
        "where gradient magnitudes differ significantly between layers."
    ))

    story.append(subsection("5.3 Synthetic Data"))
    story.append(body(
        "Training and test data are generated procedurally. Five scene types are produced with "
        "controlled spatial patterns and Gaussian noise (sigma = 0.03) for realism:"
    ))

    t_scenes = make_table(
        ["Scene", "Description", "Key Features"],
        [
            ["Straight road", "Central road band with vegetation on sides", "High C0 center, high C3 sides"],
            ["Curved road", "Sinusoidal road path", "Spatial curvature, varying center offset"],
            ["Intersection", "Cross-shaped road pattern", "Two perpendicular road bands"],
            ["Obstacles", "Road with 2-4 random rectangular obstacles", "High C1 locally, C5 > 0 for moving"],
            ["Empty field", "Open area with sparse returns", "Low C0, uniform low height"],
        ],
        col_widths=[60, W - 235, 175]
    )
    story.append(t_scenes)
    story.append(caption("Table 4: Synthetic scene types used for training and evaluation."))

    story.append(body(
        "Unless otherwise stated, each experiment uses 100 training samples (20 per scene type) "
        "and 50 test samples (10 per scene type), with non-overlapping random seeds."
    ))

    # ========================================================================
    # 5. EXPERIMENTAL RESULTS
    # ========================================================================
    story.append(PageBreak())
    story.append(section("6. Experimental Results"))
    story.append(body(
        "All benchmarks were executed in Node.js v22.20.0 on a single CPU thread (no GPU). "
        "The SpikyPanda runtime processes neurons sequentially via a ready-queue, so inference time "
        "scales linearly with graph size."
    ))

    # 5.1 Architecture comparison
    story.append(subsection("6.1 Architecture Comparison"))
    story.append(body(
        "We compare the Tiny and Small presets on 16x16x6 input with a 64-dimensional latent space, "
        "trained for 10 epochs."
    ))

    t_arch = make_table(
        ["Preset", "Neurons", "Synapses", "Kernels", "Test MSE", "Test RMSE", "Train Time", "Inference"],
        [
            ["Tiny",  "9,280",  "273,792", "14", "0.00605", "0.0778", "38.9 s", "11.8 ms/sample"],
            ["Small", "11,328", "366,464", "38", "0.00594", "0.0770", "41.3 s", "15.5 ms/sample"],
        ],
        col_widths=[40, 45, 50, 40, 50, 50, 45, W - 320]
    )
    story.append(t_arch)
    story.append(caption("Table 5: Architecture comparison on 16x16x6 input, latentDim=64, 10 epochs, lr=0.003."))

    story.append(body(
        "The Small preset (two conv layers) provides only a marginal improvement in MSE "
        "(0.00594 vs. 0.00605, a 1.8% reduction) at the cost of 22% more neurons, 34% more synapses, "
        "and 32% longer inference time. For the synthetic data complexity tested, the additional "
        "capacity of the second convolutional layer does not yield significant benefits."
    ))
    story.append(body(
        "<b>Observation:</b> The Tiny preset offers the best cost-benefit ratio for 16x16 grids. "
        "Deeper architectures would become relevant for larger grids (32x32, 64x64) with more "
        "complex real-world scenes."
    ))

    # 5.2 Latent dimension
    story.append(subsection("6.2 Latent Dimension Impact"))
    story.append(body(
        "We vary the latent dimension from 16 to 128 using the Tiny preset on 16x16x6 input. "
        "The compression ratio is computed as input_size / latent_dim (1536 / D)."
    ))

    t_latent = make_table(
        ["Latent Dim", "Compression", "Test MSE", "Test RMSE", "Train Time", "Inference"],
        [
            ["16",  "96x",  "0.00655", "0.0810", "20.8 s", "9.5 ms/sample"],
            ["32",  "48x",  "0.00644", "0.0802", "27.2 s", "9.4 ms/sample"],
            ["64",  "24x",  "0.00586", "0.0765", "38.1 s", "11.0 ms/sample"],
            ["128", "12x",  "0.00587", "0.0766", "67.0 s", "14.9 ms/sample"],
        ],
        col_widths=[55, 60, 55, 55, 55, W - 280]
    )
    story.append(t_latent)
    story.append(caption("Table 6: Impact of latent dimensionality on reconstruction quality and training cost."))

    story.append(body(
        "Reconstruction quality improves significantly from D=16 to D=64 (MSE decreases by 10.5%), "
        "but plateaus beyond D=64 (D=128 yields no measurable improvement). This indicates that "
        "64 dimensions are sufficient to capture the information content of the synthetic 16x16x6 grids. "
        "The compression ratio of 24x at D=64 represents a practical operating point."
    ))
    story.append(body(
        "<b>Key finding:</b> Doubling the latent dimension from 64 to 128 doubles training time "
        "(38s to 67s) with zero improvement in reconstruction quality, indicating information saturation "
        "at D=64 for this data distribution."
    ))

    # 5.3 Training convergence
    story.append(subsection("6.3 Training Convergence"))
    story.append(body(
        "We track MSE per epoch for the Tiny preset with D=64, 100 training samples, and lr=0.003."
    ))

    t_conv = make_table(
        ["Epoch", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Test"],
        [
            ["MSE", "70.72", "21.97", "11.05", "7.59", "6.04", "5.19", "4.67", "4.30", "3.98", "3.72", "0.0058"],
        ],
        col_widths=[35] + [38] * 10 + [42]
    )
    story.append(t_conv)
    story.append(caption(
        "Table 7: Training loss per epoch and final test MSE. Note: training MSE is cumulative per sample; "
        "test MSE is averaged per pixel."
    ))

    story.append(body(
        "The loss exhibits characteristic exponential decay: 70% reduction in the first 2 epochs, "
        "followed by gradual convergence. The training MSE (cumulative across all pixels per sample) "
        "and the test MSE (per-pixel average) use different normalization, explaining the apparent "
        "magnitude difference. The model has not yet fully converged at 10 epochs, suggesting that "
        "additional epochs or learning rate scheduling could further reduce test MSE."
    ))

    # 5.4 Per-scene quality
    story.append(subsection("6.4 Per-Scene-Type Reconstruction Quality"))
    story.append(body(
        "After training on mixed data, we evaluate reconstruction quality on each scene type separately."
    ))

    t_scene = make_table(
        ["Scene Type", "Test MSE", "Test RMSE", "Relative Difficulty"],
        [
            ["Empty field",   "0.00192", "0.0438", "Easiest"],
            ["Intersection",  "0.00302", "0.0549", "Easy"],
            ["Straight road", "0.00337", "0.0580", "Moderate"],
            ["Curved road",   "0.00349", "0.0591", "Moderate"],
            ["Obstacles",     "0.01260", "0.1122", "Hardest"],
        ],
        col_widths=[70, 60, 60, W - 190]
    )
    story.append(t_scene)
    story.append(caption("Table 8: Per-scene reconstruction quality, sorted by MSE (10 test samples per type)."))

    story.append(body(
        "The results reveal a clear hierarchy of reconstruction difficulty. The empty field scene, "
        "characterized by spatially uniform low-magnitude values, achieves the lowest MSE (0.00192). "
        "Geometrically regular scenes (intersection, straight road) are reconstructed with moderate "
        "error (MSE ~ 0.003). The curved road incurs slightly higher error due to the non-rectilinear "
        "spatial pattern."
    ))
    story.append(body(
        "<b>Critical finding:</b> The obstacles scene produces MSE 3.7x higher than the average of "
        "other scenes (0.01260 vs. 0.00295). This is expected: obstacles are randomly placed with "
        "variable dimensions and may include non-zero velocity (C5), creating high-frequency spatial "
        "features that are difficult to capture with a single 3x3 convolutional layer. This suggests "
        "that obstacle-rich environments may require deeper encoders or attention mechanisms."
    ))

    # 5.5 Resolution impact
    story.append(subsection("6.5 Resolution Impact"))

    t_res = make_table(
        ["Resolution", "Input Size", "Compression", "Test MSE", "Test RMSE", "Train Time", "Inference"],
        [
            ["8 x 8 x 6",  "384",  "6x",  "0.00873", "0.0934", "7.1 s",  "1.3 ms/sample"],
            ["16 x 16 x 6", "1536", "24x", "0.00569", "0.0754", "38.1 s", "12.6 ms/sample"],
        ],
        col_widths=[60, 50, 55, 50, 50, 50, W - 315]
    )
    story.append(t_res)
    story.append(caption("Table 9: Resolution comparison using Tiny preset, latentDim=64, 10 epochs."))

    story.append(body(
        "Increasing resolution from 8x8 to 16x16 reduces test MSE by 35% (0.00873 to 0.00569) while "
        "increasing training time by 5.4x. The 16x16 grid provides significantly more spatial detail "
        "for the convolution kernels to exploit. However, the higher resolution also achieves a 24x "
        "compression ratio (vs. 6x for 8x8), demonstrating that the autoencoder scales favorably: "
        "it extracts proportionally more information from larger inputs."
    ))
    story.append(body(
        "Inference time increases from 1.3 ms to 12.6 ms per sample (9.7x), consistent with the "
        "quadratic scaling of neuron count with grid side length in a convolutional architecture."
    ))

    # ========================================================================
    # 6. GRAPH-BASED IMPLEMENTATION
    # ========================================================================
    story.append(section("7. Graph-Based Implementation Considerations"))
    story.append(body(
        "SpikyPanda's graph-based architecture means that every neuron is a JavaScript object with "
        "incoming/outgoing synapse lists, and every synapse holds a reference to its source and target "
        "neurons plus a weight (or a shared kernel reference for conv layers). This design enables:"
    ))
    story.append(body(
        "1. <b>Structural mutations</b> - Neurons and synapses can be added or removed at runtime, "
        "supporting neuroevolution and structural plasticity.<br/>"
        "2. <b>Heterogeneous architectures</b> - Different neuron types (rate-coded, spiking, "
        "astrocyte-like) can coexist in the same graph.<br/>"
        "3. <b>Spatial reasoning</b> - Each neuron carries a 3D position (ICartesian), enabling "
        "spatially-aware operations like astrocyte gating or local learning rules."
    ))
    story.append(body(
        "The tradeoff is performance. Where PyTorch processes a 3x3 convolution on a 16x16 grid as "
        "a single matrix multiplication, SpikyPanda creates 16x16x8 = 2,048 neuron objects and "
        "16x16x8x3x3x6 = 110,592 synapse objects for the same operation. Each synapse is traversed "
        "individually during the forward pass. This explains the ~12 ms/sample inference time observed "
        "in our benchmarks, compared to sub-millisecond times in tensor-based frameworks."
    ))
    story.append(body(
        "Despite this overhead, the graph-based approach is intentional: the primary use case is not "
        "high-throughput training but rather inference in neuroevolutionary systems (e.g., the SpikyPanda "
        "'bestioles' simulation) where the network topology evolves over generations and runtime "
        "flexibility is paramount."
    ))

    # ========================================================================
    # 7. CONCLUSION
    # ========================================================================
    story.append(section("8. Conclusion and Future Work"))
    story.append(body(
        "This study constitutes a <b>validation milestone</b> in the SpikyPanda research program. "
        "By reproducing a well-established convolutional autoencoder architecture on the graph-based "
        "runtime, we confirm that the framework correctly implements convolution, pooling, upsampling, "
        "backpropagation, and optimizer dynamics. The quantitative results are consistent with "
        "published literature, establishing a verified baseline for future work. Key findings:"
    ))
    story.append(body(
        "1. A single convolutional layer (Tiny preset) achieves RMSE &lt; 0.08 on 16x16x6 grids, "
        "sufficient for navigation-grade compression.<br/>"
        "2. Latent dimension D=64 provides a 24x compression ratio with information saturation "
        "(no improvement beyond D=64).<br/>"
        "3. Obstacle scenes are 3.7x harder to reconstruct than regular road scenes, suggesting "
        "a need for adaptive or deeper architectures in complex environments.<br/>"
        "4. The graph-based implementation, while slower than tensor frameworks, provides the "
        "structural flexibility required for neuroevolutionary applications."
    ))
    story.append(body(
        "As stated in Section 2, the autoencoder itself is not a scientific contribution. "
        "The contribution of this work is the <b>validated infrastructure</b>: a graph-based CNN "
        "runtime in TypeScript that produces correct, reproducible, quantified results. This "
        "infrastructure is the foundation upon which the planned research contributions will be built: "
        "neuroevolution with structural mutations, heterogeneous neuron models (spiking + rate-coded), "
        "spatially-modulated local learning rules, and real-time inference in evolutionary simulations."
    ))

    story.append(subsection("8.1 Future Work"))
    story.append(body(
        "<b>Real LiDAR data:</b> Validate the approach on point clouds from nuScenes or KITTI, "
        "projected onto occupancy grids using the same 6-channel encoding."
    ))
    story.append(body(
        "<b>Variational autoencoder (VAE):</b> Replace the deterministic bottleneck with a "
        "stochastic latent space to enable generative capabilities and more robust representations."
    ))
    story.append(body(
        "<b>Sensor fusion integration:</b> Feed the trained encoder's latent output, concatenated "
        "with IMU and odometry vectors, into a navigation policy trained via neuroevolution in the "
        "bestioles simulation framework."
    ))
    story.append(body(
        "<b>Spiking autoencoder:</b> Explore temporal encoding of LiDAR data using SpikyPanda's "
        "spiking neural network (SNN) runtime, where the latent representation is a spike pattern "
        "rather than a static vector."
    ))

    # ========================================================================
    # REFERENCES
    # ========================================================================
    story.append(section("References"))
    refs = [
        "[1] Kingma, D. P. & Ba, J. (2015). Adam: A Method for Stochastic Optimization. ICLR 2015.",
        "[2] Masci, J. et al. (2011). Stacked Convolutional Auto-Encoders for Hierarchical Feature Extraction. ICANN 2011.",
        "[3] Caesar, H. et al. (2020). nuScenes: A Multimodal Dataset for Autonomous Driving. CVPR 2020.",
        "[4] Geiger, A. et al. (2013). Vision meets Robotics: The KITTI Dataset. IJRR 2013.",
        "[5] Chen, X. et al. (2017). Multi-View 3D Object Detection Network for Autonomous Driving. CVPR 2017.",
    ]
    for ref in refs:
        story.append(Paragraph(ref, ParagraphStyle(
            'ref', parent=styles['Normal'], fontSize=8.5, leading=12, leftIndent=20,
            firstLineIndent=-20, spaceAfter=3
        )))

    # Build
    doc.build(story)
    print(f"Paper generated: {OUTPUT_PATH}")


if __name__ == "__main__":
    build_paper()

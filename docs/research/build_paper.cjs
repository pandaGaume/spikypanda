// Generate two-column research paper DOCX for MCSA broken rotor bar paper
// Usage: node build_paper.js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, SectionType, PageBreak, Footer, PageNumber,
  LevelFormat, TabStopType, TabStopPosition,
} = require("docx");

const FIG_DIR = path.join(__dirname, "figures");
const OUT = path.join(__dirname, "motor-current-mcsa-paper.docx");

// ── helpers ──────────────────────────────────────────────────────────
function txt(t, opts = {}) { return new TextRun({ text: t, font: "Times New Roman", size: 20, ...opts }); }
function txtB(t, opts = {}) { return txt(t, { bold: true, ...opts }); }
function txtI(t, opts = {}) { return txt(t, { italics: true, ...opts }); }
function txtSup(t) { return new TextRun({ text: t, font: "Times New Roman", size: 20, superScript: true }); }

function para(children, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 264 },
    alignment: AlignmentType.JUSTIFIED,
    ...opts,
    children: Array.isArray(children) ? children : [children],
  });
}
function heading(level, text) {
  return new Paragraph({
    heading: level,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, font: "Times New Roman", bold: true,
      size: level === HeadingLevel.HEADING_1 ? 24 : level === HeadingLevel.HEADING_2 ? 22 : 20,
    })],
  });
}

function img(filename, w, h, caption) {
  const data = fs.readFileSync(path.join(FIG_DIR, filename));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 60 },
      children: [new ImageRun({ type: "png", data, transformation: { width: w, height: h },
        altText: { title: caption, description: caption, name: filename } })],
    }),
    para([txtI(caption, { size: 18 })], { alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
  ];
}

const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const thinBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const cellMar = { top: 40, bottom: 40, left: 80, right: 80 };

function tableRow(cells, header = false) {
  return new TableRow({
    children: cells.map((c, i) => new TableCell({
      borders: thinBorders, margins: cellMar,
      width: { size: c.w || 1500, type: WidthType.DXA },
      shading: header ? { fill: "E8EEF4", type: ShadingType.CLEAR } : undefined,
      children: [para(typeof c.t === "string" ? [header ? txtB(c.t, { size: 15 }) : txt(c.t, { size: 15 })] : c.t,
        { spacing: { after: 0, line: 220 }, alignment: c.a || AlignmentType.LEFT })],
    })),
  });
}

// ── content sections ─────────────────────────────────────────────────

// Title page section (single column)
const titleSection = {
  properties: {
    page: {
      size: { width: 12240, height: 15840 },
      margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
    },
    type: SectionType.NEXT_PAGE,
  },
  children: [
    // Title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({
        text: "Envelope-Domain Preprocessing for Ultra-Compact LSTM-Based",
        font: "Times New Roman", size: 32, bold: true,
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({
        text: "Broken Rotor Bar Severity Grading",
        font: "Times New Roman", size: 32, bold: true,
      })],
    }),
    // Author
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [txt("Guillaume Pelletier", { size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [txtI("DotVision, Houston TX, USA", { size: 20 })],
    }),
    // AI disclosure
    para([
      txtI("AI-assisted tools were used for language refinement and clarity. " +
           "All technical content, experiments, and conclusions are the authors\u2019 own.", { size: 18 }),
    ], { alignment: AlignmentType.CENTER, spacing: { before: 100, after: 300 } }),
    // Abstract
    heading(HeadingLevel.HEADING_1, "Abstract"),
    para([txtI(
      "We present a 4,773-parameter LSTM classifier for 5-class broken rotor bar severity grading " +
      "from three-phase stator currents. On the public Universidade Federal de Uberl\u00e2ndia dataset " +
      "(IEEE DataPort), it reaches 88.0% accuracy and trains in under 3 minutes on a laptop CPU, " +
      "entirely in a web browser."
    )]),
    para([txtI(
      "A preprocessing pipeline extracts the amplitude envelope of the stator current via half-cycle " +
      "moving RMS, decimates it to 60 Hz, and removes the load-dependent baseline by per-window mean " +
      "subtraction. This collapses the input from 256 high-frequency samples to 64 slowly-varying " +
      "envelope samples. Without it, the same LSTM fails to train due to vanishing gradients through " +
      "the longer sequence."
    )]),
    para([txtI(
      "Broken rotor bars produce sidebands at f \u00b1 2sf in the stator current spectrum. In the time " +
      "domain these appear as slow amplitude modulation at 2\u20136 Hz, which the moving RMS captures " +
      "directly. The envelope captures the discriminative information relevant to BRB severity, " +
      "while the carrier primarily contributes redundant high-frequency structure. " +
      "An ablation across four pipeline variants (26.8% to 88.0%) confirms that each preprocessing " +
      "step contributes measurably."
    )]),
    para([txtI(
      "Accuracy is below the 95\u201399% reported by large CNN models on the same data, but surpasses " +
      "the FFT+SVM baseline (81.5%). Collapsing to a binary healthy/faulty " +
      "decision gives 97.3% accuracy; only 6 faulty motors are misclassified as Healthy " +
      "(5 BRB1 + 1 BRB3), concentrated at light loads where the modulation " +
      "is near the noise floor."
    )]),
    para([
      txtB("Keywords: ", { size: 18 }),
      txt("Motor Current Signature Analysis, broken rotor bar, LSTM, TinyML, envelope extraction, " +
          "edge computing, predictive maintenance", { size: 18 }),
    ], { spacing: { before: 200, after: 200 } }),
  ],
};

// Two-column body
const bodyChildren = [];

// ── I. INTRODUCTION ──────────────────────────────────────────────────
bodyChildren.push(heading(HeadingLevel.HEADING_1, "I. Introduction"));

bodyChildren.push(para([
  txt("The broken rotor bar fault signature is a low-frequency amplitude modulation (2\u20136 Hz) of the " +
      "stator current carrier (50/60 Hz). Rotor asymmetry creates sidebands at "),
  txtI("f"),
  txt("(1 \u00b1 2"),
  txtI("s"),
  txt(") in the current spectrum, which manifest as a slow envelope oscillation. " +
      "The envelope is therefore empirically sufficient for fault detection on this task."),
]));
bodyChildren.push(para([
  txt("The mainstream approach uses large neural networks (CNNs, ResNets, VGGs) operating on spectrograms " +
      "or raw waveforms to implicitly learn this envelope extraction. We show that making the extraction " +
      "explicit via a simple moving-RMS filter reduces the need for model capacity by three orders of magnitude."),
]));

bodyChildren.push(heading(HeadingLevel.HEADING_2, "A. Prior Art"));
bodyChildren.push(para([
  txt("Table I compares published neural-network approaches for broken rotor bar detection. " +
      "The top-performing approaches (VGG-19, ResNet-152) use 60\u2013144 M parameters to solve a 5-class " +
      "signal processing problem. They achieve 98\u201399% accuracy but require GPU hardware and are " +
      "impractical for MCU deployment. Decision trees on FFT features achieve 95\u201398% with fewer parameters " +
      "but require explicit sideband identification, which is fragile under variable speed and noise."),
]));

// Table I - Prior art
bodyChildren.push(para([txtB("Table I. ", { size: 18 }), txtI("Comparison with published approaches.", { size: 16 })],
  { alignment: AlignmentType.CENTER, spacing: { before: 160 } }));

const tIcw = [1000, 900, 600, 400, 500, 700, 600];
const tIw = tIcw.reduce((a,b) => a+b, 0);
bodyChildren.push(new Table({
  width: { size: tIw, type: WidthType.DXA },
  columnWidths: tIcw,
  rows: [
    tableRow([{t:"Reference",w:tIcw[0]},{t:"Architecture",w:tIcw[1]},{t:"Params",w:tIcw[2]},{t:"Cls",w:tIcw[3]},{t:"Acc",w:tIcw[4]},{t:"Input",w:tIcw[5]},{t:"Runtime",w:tIcw[6]}], true),
    tableRow([{t:"Chisedzi [1]",w:tIcw[0]},{t:"DT / ANN",w:tIcw[1]},{t:"~1\u201310 K",w:tIcw[2]},{t:"3",w:tIcw[3]},{t:"95\u201398%",w:tIcw[4]},{t:"FFT feat.",w:tIcw[5]},{t:"Desktop",w:tIcw[6]}]),
    tableRow([{t:"Barrera [2]",w:tIcw[0]},{t:"VGG-19",w:tIcw[1]},{t:"143.7 M",w:tIcw[2]},{t:"5",w:tIcw[3]},{t:"99.4%",w:tIcw[4]},{t:"Spectro.",w:tIcw[5]},{t:"GPU",w:tIcw[6]}]),
    tableRow([{t:"Barrera [2]",w:tIcw[0]},{t:"NASNet-M",w:tIcw[1]},{t:"5.3 M",w:tIcw[2]},{t:"5",w:tIcw[3]},{t:"96.2%",w:tIcw[4]},{t:"Spectro.",w:tIcw[5]},{t:"GPU",w:tIcw[6]}]),
    tableRow([{t:"Jakaria [3]",w:tIcw[0]},{t:"CNN-LSTM",w:tIcw[1]},{t:"~100 K",w:tIcw[2]},{t:"5",w:tIcw[3]},{t:"92.3%",w:tIcw[4]},{t:"Raw I",w:tIcw[5]},{t:"GPU",w:tIcw[6]}]),
    tableRow([{t:"Baseline",w:tIcw[0]},{t:"FFT+SVM",w:tIcw[1]},{t:"n/p",w:tIcw[2]},{t:"5",w:tIcw[3]},{t:"81.5%",w:tIcw[4]},{t:"18 FFT feat.",w:tIcw[5]},{t:"Desktop",w:tIcw[6]}]),
    tableRow([{t:"Baseline",w:tIcw[0]},{t:"FFT+MLP",w:tIcw[1]},{t:"773",w:tIcw[2]},{t:"5",w:tIcw[3]},{t:"67.0%",w:tIcw[4]},{t:"18 FFT feat.",w:tIcw[5]},{t:"Desktop",w:tIcw[6]}]),
    tableRow([{t:[txtB("This work",{size:15})],w:tIcw[0]},{t:[txtB("LSTM h=32",{size:15})],w:tIcw[1]},{t:[txtB("4,773",{size:15})],w:tIcw[2]},{t:[txtB("5",{size:15})],w:tIcw[3]},{t:[txtB("88.0%",{size:15})],w:tIcw[4]},{t:[txtB("Envelope",{size:15})],w:tIcw[5]},{t:[txtB("Browser",{size:15})],w:tIcw[6]}]),
  ],
}));
bodyChildren.push(para([], { spacing: { after: 80 } })); // spacer

// ── II. DATASET ──────────────────────────────────────────────────────
bodyChildren.push(heading(HeadingLevel.HEADING_1, "II. Dataset"));
bodyChildren.push(para([
  txt("The Broken Rotor Bar dataset, published by the Universidade Federal de Uberl\u00e2ndia on IEEE DataPort, " +
      "contains electrical and vibration recordings from a 1 hp, 220/380 V, 4-pole, 60 Hz squirrel-cage " +
      "induction motor (rated 1715 rpm, 4.1 Nm, 34 rotor bars)."),
]));
bodyChildren.push(para([
  txt("Five rotor states are tested: Healthy (no defect), BRB1\u2013BRB4 (1\u20134 adjacent broken bars). " +
      "Each state is tested at 8 load levels (12.5\u2013100% of rated torque) with 10 repetitions per " +
      "condition. Each acquisition is 18 s long, sampled at ~55.6 kHz, covering startup transient to " +
      "steady state. Only the three phase currents (Ia, Ib, Ic) are used; voltages and vibration channels " +
      "are discarded."),
]));

// ── III. PROPOSED METHOD ─────────────────────────────────────────────
bodyChildren.push(heading(HeadingLevel.HEADING_1, "III. Proposed Method"));

bodyChildren.push(heading(HeadingLevel.HEADING_2, "A. Physics of Broken Rotor Bars"));
bodyChildren.push(para([
  txt("Broken rotor bars introduce sidebands in the stator current at frequencies "),
  txtI("f"),
  txt("(1 \u00b1 2"),
  txtI("s"),
  txt("), where "),
  txtI("f"),
  txt(" is the line frequency and "),
  txtI("s"),
  txt(" is the slip. For the test motor ("),
  txtI("f"),
  txt(" = 60 Hz, "),
  txtI("s"),
  txt(" \u2248 0.047 at rated load), this gives sidebands at 54.4 Hz and 65.6 Hz. In the time domain, " +
      "these manifest as amplitude modulation at 2"),
  txtI("sf"),
  txt(" \u2248 5.6 Hz. The modulation depth is proportional to "),
  txtI("k/N"),
  txt(", where "),
  txtI("k"),
  txt(" is the number of broken bars and "),
  txtI("N"),
  txt(" = 34 is the total bar count: ~2.9% for BRB1, ~11.8% for BRB4. " +
      "The classification task thus reduces to estimating modulation depth, which can be " +
      "inferred directly from the envelope signal."),
]));

bodyChildren.push(heading(HeadingLevel.HEADING_2, "B. Envelope Extraction"));
bodyChildren.push(para([
  txt("The 60 Hz carrier is removed by computing the moving root-mean-square over one half-cycle " +
      "(463 samples at 55.6 kHz):"),
]));
bodyChildren.push(para([
  txtI("env(t) = \u221a[ (1/W) \u2211 x(t+i)\u00b2 ],   i = 0..W\u22121", { size: 20 }),
], { alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 } }));
bodyChildren.push(para([
  txt("For a pure sinusoid "),
  txtI("x(t) = A\u00b7sin(\u03c9t)"),
  txt(", the half-cycle RMS equals "),
  txtI("A/\u221a2"),
  txt(". For an amplitude-modulated signal "),
  txtI("x(t) = A(t)\u00b7sin(\u03c9t)"),
  txt(" where "),
  txtI("A(t)"),
  txt(" varies slowly, the RMS tracks the envelope "),
  txtI("A(t)/\u221a2"),
  txt("."),
]));

// Fig 1 - Pipeline
bodyChildren.push(...img("fig1_pipeline.png", 250, 287,
  "Fig. 1. Processing pipeline: (a) raw current, (b) moving-RMS envelope, (c) decimated, (d) centered."));

bodyChildren.push(heading(HeadingLevel.HEADING_2, "C. Decimation and Transient Removal"));
bodyChildren.push(para([
  txt("The envelope is decimated by 927\u00d7 to reach ~60 Hz (one sample per fundamental cycle). " +
      "The first 360 samples (~6 s) are discarded to exclude the startup transient (inrush peaks of " +
      "\u00b117 A that contaminate normalization statistics)."),
]));

bodyChildren.push(heading(HeadingLevel.HEADING_2, "D. Per-Window Centering"));
bodyChildren.push(para([
  txt("The envelope mean encodes load level, which is a confound (all classes appear at all loads). " +
      "For each 64-step window and each channel:"),
]));
bodyChildren.push(para([
  txtI("out(t) = clamp[ (env(t) \u2212 mean(env)) \u00b7 G + 0.5,  0,  1 ]", { size: 20 }),
], { alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 } }));
bodyChildren.push(para([
  txt("with gain "),
  txtI("G"),
  txt(" = 6.0. This removes the load baseline and maps the \u00b10.05 A modulation into \u00b10.3 of the " +
      "[0, 1] dynamic range, giving the LSTM a 10\u00d7 increase in the relative magnitude of the " +
      "fault signature."),
]));

// Fig 2 - Before/after
bodyChildren.push(...img("fig2_before_after.png", 250, 177,
  "Fig. 2. Raw current (top) vs. centered envelope (bottom) for Healthy and BRB4 at full load."));

bodyChildren.push(heading(HeadingLevel.HEADING_2, "E. LSTM Architecture"));
bodyChildren.push(para([
  txt("A single-layer LSTM with 3 inputs (Ia, Ib, Ic envelopes), 32 hidden units, and 5 sigmoid " +
      "outputs. Total: 4,773 parameters (19.1 KB at float32). The model is trained with MSE loss and " +
      "Adam optimizer (lr = 0.003) for 150 epochs, with one-hot targets applied at every timestep. " +
      "Sigmoid + MSE was chosen for compatibility with the runtime; softmax + cross-entropy would " +
      "be standard and is expected to improve results near decision boundaries."),
]));

// Parameter table
bodyChildren.push(para([txtB("Table II. ", { size: 18 }), txtI("Parameter count breakdown.", { size: 16 })],
  { alignment: AlignmentType.CENTER, spacing: { before: 160 } }));
const tIIcw = [1800, 2200, 1000];
bodyChildren.push(new Table({
  width: { size: 5000, type: WidthType.DXA },
  columnWidths: tIIcw,
  rows: [
    tableRow([{t:"Component",w:tIIcw[0]},{t:"Formula",w:tIIcw[1]},{t:"Count",w:tIIcw[2],a:AlignmentType.RIGHT}], true),
    tableRow([{t:"LSTM input\u2192hidden",w:tIIcw[0]},{t:"4 \u00d7 32 \u00d7 3",w:tIIcw[1]},{t:"384",w:tIIcw[2],a:AlignmentType.RIGHT}]),
    tableRow([{t:"LSTM hidden\u2192hidden",w:tIIcw[0]},{t:"4 \u00d7 32 \u00d7 32",w:tIIcw[1]},{t:"4,096",w:tIIcw[2],a:AlignmentType.RIGHT}]),
    tableRow([{t:"LSTM biases",w:tIIcw[0]},{t:"4 \u00d7 32",w:tIIcw[1]},{t:"128",w:tIIcw[2],a:AlignmentType.RIGHT}]),
    tableRow([{t:"Output weights",w:tIIcw[0]},{t:"32 \u00d7 5",w:tIIcw[1]},{t:"160",w:tIIcw[2],a:AlignmentType.RIGHT}]),
    tableRow([{t:"Output biases",w:tIIcw[0]},{t:"5",w:tIIcw[1]},{t:"5",w:tIIcw[2],a:AlignmentType.RIGHT}]),
    tableRow([{t:[txtB("Total",{size:15})],w:tIIcw[0]},{t:"",w:tIIcw[1]},{t:[txtB("4,773",{size:15})],w:tIIcw[2],a:AlignmentType.RIGHT}]),
  ],
}));
bodyChildren.push(para([], { spacing: { after: 80 } }));

// ── IV. RESULTS ──────────────────────────────────────────────────────
bodyChildren.push(heading(HeadingLevel.HEADING_1, "IV. Results"));

bodyChildren.push(heading(HeadingLevel.HEADING_2, "A. Ablation Study"));
bodyChildren.push(para([
  txt("Table III and Fig. 3 show the impact of each preprocessing step. The full envelope + centering " +
      "pipeline achieves 3\u00d7 the accuracy of the best raw-signal variant. Each step contributes " +
      "measurably: removing any one causes a regression."),
]));

// Table III - Ablation
bodyChildren.push(para([txtB("Table III. ", { size: 18 }), txtI("Ablation: preprocessing impact on accuracy.", { size: 16 })],
  { alignment: AlignmentType.CENTER, spacing: { before: 160 } }));
const tIIIcw = [2000, 800, 2200];
bodyChildren.push(new Table({
  width: { size: 5000, type: WidthType.DXA },
  columnWidths: tIIIcw,
  rows: [
    tableRow([{t:"Pipeline variant",w:tIIIcw[0]},{t:"Accuracy",w:tIIIcw[1],a:AlignmentType.RIGHT},{t:"Dominant failure",w:tIIIcw[2]}], true),
    tableRow([{t:"Raw, per-trace norm, 64-step",w:tIIIcw[0]},{t:"26.8%",w:tIIIcw[1],a:AlignmentType.RIGHT},{t:"Signature erased by normalization",w:tIIIcw[2]}]),
    tableRow([{t:"Raw, global norm, 256-step",w:tIIIcw[0]},{t:"16.0%",w:tIIIcw[1],a:AlignmentType.RIGHT},{t:"Vanishing gradient (256 BPTT steps)",w:tIIIcw[2]}]),
    tableRow([{t:"Envelope, global min/max",w:tIIIcw[0]},{t:"35.0%",w:tIIIcw[1],a:AlignmentType.RIGHT},{t:"Load confound (75% dynamic range)",w:tIIIcw[2]}]),
    tableRow([{t:[txtB("Env. centered",{size:15})],w:tIIIcw[0]},{t:[txtB("88.0%",{size:15})],w:tIIIcw[1],a:AlignmentType.RIGHT},{t:[txtB("Full pipeline",{size:15})],w:tIIIcw[2]}]),
    tableRow([{t:"FFT + SVM (baseline)",w:tIIIcw[0]},{t:"81.5%",w:tIIIcw[1],a:AlignmentType.RIGHT},{t:"Requires hand-crafted features",w:tIIIcw[2]}]),
    tableRow([{t:"FFT + MLP (baseline)",w:tIIIcw[0]},{t:"67.0%",w:tIIIcw[1],a:AlignmentType.RIGHT},{t:"Small parametric model on FFT features",w:tIIIcw[2]}]),
  ],
}));
bodyChildren.push(para([], { spacing: { after: 80 } }));

// Fig 3 - Ablation
bodyChildren.push(...img("fig3_ablation.png", 250, 140,
  "Fig. 3. Ablation: accuracy at each preprocessing stage. Dashed line = chance (20%)."));

// Fig 6 - Training curves
bodyChildren.push(...img("fig6_training_curves.png", 250, 122,
  "Fig. 4. Training loss across 4 attempts. Only the envelope + centering pipeline (green) converges."));

bodyChildren.push(heading(HeadingLevel.HEADING_2, "B. Comparison with Classical MCSA"));
bodyChildren.push(para([
  txt("An FFT + SVM baseline using 18 hand-crafted spectral features (sideband amplitudes at " +
      "f(1 \u00b1 2s) for five slip values, harmonic ratios, RMS, crest factor, THD) reaches " +
      "81.5% on the same data split. The LSTM now surpasses the SVM by 6.5 percentage points, " +
      "but requires explicit sideband identification and slip estimation, which depend on " +
      "prior knowledge of the operating conditions. An FFT + MLP with 773 parameters (comparable " +
      "to our model size) drops to 67.0%, suggesting that FFT features alone are insufficient " +
      "for a small parametric model without additional structure. The LSTM learns directly from the time-domain envelope " +
      "without any frequency-domain computation."),
]));

bodyChildren.push(heading(HeadingLevel.HEADING_2, "C. Classification Performance"));
bodyChildren.push(para([
  txt("The final model (LSTM h=32, 150 epochs) achieves 88.0% overall 5-class accuracy. " +
      "Collapsing to binary healthy/faulty gives 97.3%. Healthy recall is 93.8% (75/80). " +
      "BRB1 recall improved to 80.0% (72/90). Only 6 faulty motors are misclassified as " +
      "Healthy (5 BRB1 + 1 BRB3), concentrated at light loads."),
]));

// Fig 5 - Confusion
bodyChildren.push(...img("fig5_confusion.png", 240, 195,
  "Fig. 5. Confusion matrix. Errors are concentrated between adjacent severities."));

bodyChildren.push(para([
  txt("Confusions occur only between adjacent severities (BRB2\u2194BRB3, BRB3\u2194BRB4). " +
      "This is the expected MCSA failure mode: the modulation difference between "),
  txtI("k"),
  txt(" and "),
  txtI("k"),
  txt("+1 broken bars is only 1/"),
  txtI("N"),
  txt(" = 2.9% additional depth. BRB1 is the hardest class (80.0%), mostly confused with BRB2 at " +
      "light loads where the modulation differences between adjacent severities are subtle."),
]));

bodyChildren.push(heading(HeadingLevel.HEADING_2, "D. Efficiency"));

// Fig 4 - Pareto
bodyChildren.push(...img("fig4_pareto.png", 250, 165,
  "Fig. 6. Accuracy vs. model size. This work (red diamond) occupies the TinyML-feasible region."));

bodyChildren.push(para([txtB("Table IV. ", { size: 18 }), txtI("Efficiency comparison.", { size: 16 })],
  { alignment: AlignmentType.CENTER, spacing: { before: 160 } }));
const tIVcw = [900, 700, 650, 600, 700, 850];
const tIVw = tIVcw.reduce((a,b)=>a+b,0);
bodyChildren.push(new Table({
  width: { size: tIVw, type: WidthType.DXA },
  columnWidths: tIVcw,
  rows: [
    tableRow([{t:"Model",w:tIVcw[0]},{t:"Params",w:tIVcw[1]},{t:"Size",w:tIVcw[2]},{t:"Acc",w:tIVcw[3]},{t:"Acc/10K",w:tIVcw[4]},{t:"Inference",w:tIVcw[5]}], true),
    tableRow([{t:"VGG-19 [2]",w:tIVcw[0]},{t:"143.7 M",w:tIVcw[1]},{t:"574 MB",w:tIVcw[2]},{t:"99.4%",w:tIVcw[3]},{t:"0.007",w:tIVcw[4]},{t:"~500ms GPU",w:tIVcw[5]}]),
    tableRow([{t:"NASNet-M [2]",w:tIVcw[0]},{t:"5.3 M",w:tIVcw[1]},{t:"21 MB",w:tIVcw[2]},{t:"96.2%",w:tIVcw[3]},{t:"0.18",w:tIVcw[4]},{t:"~50ms GPU",w:tIVcw[5]}]),
    tableRow([{t:"CNN-LSTM [3]",w:tIVcw[0]},{t:"~100 K",w:tIVcw[1]},{t:"400 KB",w:tIVcw[2]},{t:"92.3%",w:tIVcw[3]},{t:"9.2",w:tIVcw[4]},{t:"~10ms GPU",w:tIVcw[5]}]),
    tableRow([{t:[txtB("This work",{size:15})],w:tIVcw[0]},{t:[txtB("4,773",{size:15})],w:tIVcw[1]},{t:[txtB("19 KB",{size:15})],w:tIVcw[2]},{t:[txtB("88.0%",{size:15})],w:tIVcw[3]},{t:[txtB("184.4",{size:15})],w:tIVcw[4]},{t:[txtB("1.5ms JS",{size:15})],w:tIVcw[5]}]),
  ],
}));
bodyChildren.push(para([], { spacing: { after: 80 } }));

bodyChildren.push(para([
  txt("The proposed model achieves 184.4 accuracy points per 10K parameters, vs. 0.007\u20139.2 for " +
      "published approaches. At 19.1 KB (float32), it fits in the SRAM of a Cortex-M0+ MCU."),
]));

// ── V. DISCUSSION ────────────────────────────────────────────────────
bodyChildren.push(heading(HeadingLevel.HEADING_1, "V. Discussion"));

bodyChildren.push(heading(HeadingLevel.HEADING_2, "A. Preprocessing Failure Modes"));
bodyChildren.push(para([
  txt("The development process uncovered 7 compounding preprocessing bugs (Table V) across 5 iterative " +
      "attempts. Each has a distinct physical cause and a general principle that prevents it. These failure " +
      "modes are directly transferable to any time-series fault classification system."),
]));

bodyChildren.push(para([txtB("Table V. ", { size: 18 }), txtI("Documented preprocessing failure modes.", { size: 16 })],
  { alignment: AlignmentType.CENTER, spacing: { before: 160 } }));
const tVcw = [300, 1200, 1500, 2000];
const tVw = tVcw.reduce((a,b)=>a+b,0);
bodyChildren.push(new Table({
  width: { size: tVw, type: WidthType.DXA },
  columnWidths: tVcw,
  rows: [
    tableRow([{t:"#",w:tVcw[0]},{t:"Failure mode",w:tVcw[1]},{t:"Effect",w:tVcw[2]},{t:"Prevention principle",w:tVcw[3]}], true),
    tableRow([{t:"A",w:tVcw[0]},{t:"Per-trace normalization",w:tVcw[1]},{t:"Amplitude signature erased",w:tVcw[2]},{t:"Normalize globally when amplitude matters",w:tVcw[3]}]),
    tableRow([{t:"B",w:tVcw[0]},{t:"Transient in stats",w:tVcw[1]},{t:"Inrush dominates range",w:tVcw[2]},{t:"Skip transients before computing stats",w:tVcw[3]}]),
    tableRow([{t:"C",w:tVcw[0]},{t:"Window too short",w:tVcw[1]},{t:"Fault not visible",w:tVcw[2]},{t:"Window \u2265 1/f_discriminative",w:tVcw[3]}]),
    tableRow([{t:"D",w:tVcw[0]},{t:"Neutral-target trap",w:tVcw[1]},{t:"Loss stuck at 1/C",w:tVcw[2]},{t:"Avoid trivial minima in loss landscape",w:tVcw[3]}]),
    tableRow([{t:"E",w:tVcw[0]},{t:"Vanishing gradient",w:tVcw[1]},{t:"Model learns only bias",w:tVcw[2]},{t:"Shorten sequence via preprocessing",w:tVcw[3]}]),
    tableRow([{t:"F",w:tVcw[0]},{t:"Decimation 46\u00d7 off",w:tVcw[1]},{t:"Transient skip failed",w:tVcw[2]},{t:"Derive from named target rate",w:tVcw[3]}]),
    tableRow([{t:"G",w:tVcw[0]},{t:"Load confound",w:tVcw[1]},{t:"75% range wasted",w:tVcw[2]},{t:"Remove nuisance variables first",w:tVcw[3]}]),
  ],
}));
bodyChildren.push(para([], { spacing: { after: 80 } }));

bodyChildren.push(heading(HeadingLevel.HEADING_2, "B. Limitations"));
bodyChildren.push(para([
  txt("The 88.0% accuracy surpasses the FFT+SVM baseline (81.5%) but is below the 95\u201399% of large models. " +
      "The gap comes from model capacity (4,773 vs. millions of parameters), suboptimal loss function " +
      "(sigmoid + MSE vs. softmax + cross-entropy), and no data augmentation. Binary healthy/faulty " +
      "accuracy is 97.3%. BRB1 recall improved to 80.0% (72/90); only 5 BRB1 samples remain " +
      "misclassified as Healthy, concentrated at light loads."),
]));
bodyChildren.push(para([
  txt("Results are reported on a single dataset (1 motor, 34 bars, 60 Hz). Generalization requires " +
      "validation on different line frequencies (50 Hz), bar counts, and variable-speed drives."),
]));

bodyChildren.push(heading(HeadingLevel.HEADING_2, "C. Browser-Native Training"));
bodyChildren.push(para([
  txt("The complete pipeline runs in a single HTML page using a custom JavaScript runtime: " +
      "~150 s training, 1.5 ms/sample inference, no server or GPU. This enables on-premise learning " +
      "where raw currents never leave the device, interactive educational use, and rapid prototyping " +
      "without ML framework installation."),
]));

// ── VI. DEPLOYMENT CONTEXT ────────────────────────────────────────────
bodyChildren.push(heading(HeadingLevel.HEADING_1, "VI. Deployment Context"));

bodyChildren.push(para([
  txt("The target platform is an ESP32-class MCU. It continuously tracks the frequency spectrum " +
      "and harmonic signature of the stator current, comparing against a learned baseline. The " +
      "monitoring stage does not attempt fault identification. It only detects "),
  txtI("change"),
  txt("."),
]));
bodyChildren.push(para([
  txt("When a spectral shift is flagged, the device enters a diagnostic phase. Connected to a " +
      "supervisory policy engine, it can receive ONNX models pushed at runtime and run them over " +
      "a defined observation period. Several tiny classifiers may be loaded in sequence, each " +
      "targeting a different fault family. The broken rotor bar classifier presented here is one " +
      "of them. In standalone mode (no connectivity), the MCU runs whatever models are stored in " +
      "flash and queues results until the link is restored."),
]));
bodyChildren.push(para([
  txt("The graph-native runtime can load and modify ONNX model topology at runtime " +
      "without recompilation. This structural plasticity is what makes the architecture practical: " +
      "a single MCU can host different diagnostic models depending on what the monitoring stage " +
      "observed, rather than being hard-wired to one fault type."),
]));

// ── VII. CONCLUSION ──────────────────────────────────────────────────
bodyChildren.push(heading(HeadingLevel.HEADING_1, "VII. Conclusion"));
bodyChildren.push(para([
  txt("Extracting the stator current envelope before classification reduced the required model size " +
      "from hundreds of thousands of parameters to 4,773. The preprocessing is straightforward " +
      "(half-cycle moving RMS, decimation, mean subtraction) and each step has a measurable effect " +
      "on accuracy, as shown in the ablation. The resulting 19 KB LSTM reaches 88.0% on 5-class " +
      "severity grading and 97.3% on binary fault detection, surpassing the FFT+SVM baseline " +
      "(81.5%). BRB1 at light load remains the hardest case."),
]));
bodyChildren.push(para([
  txt("On an ESP32, this classifier would run as one module in a larger pipeline: the MCU monitors " +
      "harmonic signatures for spectral change, then loads the appropriate ONNX model to investigate. " +
      "The 4,773 parameters fit comfortably in SRAM at any precision. For MCSA, careful signal " +
      "representation can substitute for model scale."),
]));

// ── REFERENCES ───────────────────────────────────────────────────────
bodyChildren.push(heading(HeadingLevel.HEADING_1, "References"));

const refs = [
  'L.P. Chisedzi and M. Muteba, \u201cDetection of Broken Rotor Bars in Cage Induction Motors Using Machine Learning Methods,\u201d Sensors, vol. 23, no. 22, art. 9079, 2023. DOI: 10.3390/s23229079',
  'K. Barrera-Llanga, J. Burriel-Valencia, \u00c1. Sapena-Ba\u00f1\u00f3, and J. Mart\u00ednez-Rom\u00e1n, \u201cA Comparative Analysis of Deep Learning CNN Architectures for Fault Diagnosis of Broken Rotor Bars in Induction Motors,\u201d Sensors, vol. 23, no. 19, art. 8196, 2023. DOI: 10.3390/s23198196',
  'J.M. Jakaria, J. Sabir, Md.Z. Rahman, and Md.F. Ali, \u201cHybrid deep learning framework for real-time fault detection in squirrel-cage induction motors,\u201d PLOS ONE, vol. 20, no. 11, 2025. DOI: 10.1371/journal.pone.0336323',
  'S. K\u0131l\u0131\u00e7kaya, \u201cMicrocontroller-based real-time motor bearing fault detection and diagnosis using 1D convolutional neural networks,\u201d M.Sc. thesis, Izmir University of Economics, 2022. Available: https://gcris.ieu.edu.tr/handle/20.500.14365/175',
  'L.Y. Imamura, S.L. Avila, F.S. Pacheco et al., \u201cDiagnosis of Unbalance in Lightweight Rotating Machines Using a Recurrent Neural Network Suitable for an Edge-Computing Framework,\u201d J. Control Autom. Electr. Syst., vol. 33, pp. 1190\u20131201, 2022. DOI: 10.1007/s40313-021-00893-9',
  'Texas Instruments, \u201cNew TI MCUs enable edge AI and industry-leading real-time control,\u201d News release, Nov. 11, 2024. Available: https://www.ti.com/about-ti/newsroom/news-releases/2024/2024-11-11-new-ti-mcus-enable-edge-ai-and-industry-leading-real-time-control-to-advance-system-efficiency--safety-and-sustainability.html',
  'E. Njor, J. Madsen, and X. Fafoutis, \u201cA Primer for tinyML Predictive Maintenance: Input and Model Optimisation,\u201d in Proc. IFIP AIAI, Springer LNCS, vol. 647, pp. 59\u201373, 2022. DOI: 10.1007/978-3-031-08337-2_6',
  'W.T. Thomson and M. Fenger, \u201cCurrent signature analysis to detect induction motor faults,\u201d IEEE Ind. Appl. Mag., vol. 7, no. 4, pp. 26\u201334, Jul./Aug. 2001. DOI: 10.1109/2943.930988',
];
refs.forEach((r, i) => {
  bodyChildren.push(para([txt(`[${i+1}] ${r}`, { size: 18 })], { spacing: { after: 60 } }));
});

const bodySection = {
  properties: {
    page: {
      size: { width: 12240, height: 15840 },
      margin: { top: 1080, right: 720, bottom: 1080, left: 720 },
    },
    column: { count: 2, space: 360, equalWidth: true },
    type: SectionType.NEXT_PAGE,
  },
  footers: {
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], font: "Times New Roman", size: 18 })],
      })],
    }),
  },
  children: bodyChildren,
};

// ── build document ───────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Times New Roman", size: 20 } },
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Times New Roman" },
        paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Times New Roman", italics: true },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 1 } },
    ],
  },
  sections: [titleSection, bodySection],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log(`Written: ${OUT} (${(buf.length / 1024).toFixed(0)} KB)`);
});

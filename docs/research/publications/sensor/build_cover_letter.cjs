const fs = require("fs");
const { Document, Packer, Paragraph, TextRun } = require("docx");

const FONT = "Palatino Linotype";
const OUT = __dirname + "/cover-letter-sensors.docx";

function t(text, opts = {}) { return new TextRun({ text, font: FONT, size: 22, ...opts }); }
function p(children, opts = {}) {
  return new Paragraph({ spacing: { after: 160, line: 300 }, ...opts, children: Array.isArray(children) ? children : [children] });
}

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children: [
      p([t("Subject: Submission of manuscript to Sensors", { bold: true })], { spacing: { after: 400 } }),

      p([t("Dear Editor,")], { spacing: { after: 240 } }),

      p([
        t("Please find enclosed our manuscript "),
        t("\u201cEnvelope-Domain Preprocessing for Ultra-Compact LSTM-Based Broken Rotor Bar Severity Classification\u201d", { italics: true }),
        t(" for consideration in "),
        t("Sensors", { italics: true }),
        t("."),
      ]),

      p([t(
        "Detecting broken rotor bars in induction motors typically requires either large convolutional " +
        "networks operating on spectrograms or explicit frequency-domain feature engineering with prior " +
        "knowledge of slip and operating conditions. Both approaches are difficult to deploy on " +
        "resource-constrained sensing nodes. This paper takes a different route: a half-cycle moving " +
        "RMS extracts the current envelope, per-window centering removes the load baseline, and a " +
        "4,773-parameter LSTM classifies the result into five severity levels."
      )]),

      p([t(
        "On the public Universidade Federal de Uberl\u00e2ndia dataset, this reaches 78.3% on " +
        "5-class classification and 94.0% on binary fault detection. The full model fits in 19 KB. " +
        "Training runs in a web browser in under three minutes, with no server or GPU."
      )]),

      p([t(
        "The paper includes an ablation across four pipeline variants (16% to 78%) showing that " +
        "each preprocessing step contributes measurably, and a classical FFT + SVM baseline at " +
        "81.5%. The SVM scores higher but requires hand-crafted spectral features; the LSTM " +
        "works directly from the time-domain envelope."
      )]),

      p([t(
        "The target deployment is an ESP32-class sensing node that monitors harmonic signatures " +
        "for change, then loads specialized ONNX classifiers at runtime to identify specific faults. " +
        "The work sits at the intersection of signal processing for condition monitoring and " +
        "embedded AI for industrial sensing, which we believe fits the scope of "),
        t("Sensors", { italics: true }),
        t("."),
      ]),

      p([t("This manuscript is original and is not under consideration elsewhere.")]),

      p([t("Sincerely,")], { spacing: { before: 320, after: 80 } }),
      p([t("Guillaume Pelletier")], { spacing: { after: 40 } }),
      p([t("DotVision, 75008 Paris, France", { size: 20 })], { spacing: { after: 40 } }),
      p([t("guillaume.pelletier@dotvision.com", { size: 20 })]),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log("Written: " + OUT + " (" + (buf.length/1024).toFixed(0) + " KB)"); });

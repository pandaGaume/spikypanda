#!/usr/bin/env node
// MDPI Sensors journal DOCX generator
// Usage: NODE_PATH=<global-node-modules> node build_sensors_paper.cjs content.json output.docx [--figures-dir dir]

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, BorderStyle, WidthType, ShadingType,
  Footer, PageNumber,
} = require("docx");

const args = process.argv.slice(2);
if (args.length < 2) { console.error("Usage: node build_sensors_paper.cjs <content.json> <output.docx> [--figures-dir <dir>]"); process.exit(1); }
const contentPath = args[0], outputPath = args[1];
let figuresDir = ".";
const fIdx = args.indexOf("--figures-dir");
if (fIdx !== -1 && args[fIdx + 1]) figuresDir = args[fIdx + 1];
const content = JSON.parse(fs.readFileSync(contentPath, "utf-8"));

const FONT = "Palatino Linotype";
const BODY_INDENT = 2608;
const LINE_SPACING = 280;

function mdpiRun(text, opts = {}) { return new TextRun({ text, font: FONT, size: opts.size || 20, ...opts }); }
function mdpiBold(text, opts = {}) { return mdpiRun(text, { bold: true, ...opts }); }
function mdpiItalic(text, opts = {}) { return mdpiRun(text, { italics: true, ...opts }); }

function mdpiPara(styleId, children, extra = {}) {
  return new Paragraph({ style: styleId, spacing: { line: LINE_SPACING }, children: Array.isArray(children) ? children : [children], ...extra });
}
function bodyText(text) { return mdpiPara("MDPI31text", [mdpiRun(text)]); }
function bodyTextNoIndent(text) { return mdpiPara("MDPI32textnoindent", [mdpiRun(text)]); }

const dc = [];

// Front matter
dc.push(mdpiPara("MDPI11articletype", [mdpiRun(content.article_type || "Article")]));
dc.push(mdpiPara("MDPI12title", [mdpiBold(content.title || "Title", { size: 36 })]));
dc.push(mdpiPara("MDPI13authornames", [mdpiBold(content.authors || "")]));
if (content.affiliations) content.affiliations.forEach(a => dc.push(mdpiPara("MDPI16affiliation", [mdpiRun(a, { size: 16 })])));
if (content.correspondence) dc.push(mdpiPara("MDPI16affiliation", [mdpiRun("* Correspondence: " + content.correspondence, { size: 16 })]));
if (content.ai_disclosure) dc.push(mdpiPara("MDPI16affiliation", [mdpiItalic(content.ai_disclosure, { size: 16 })]));

// Highlights
if (content.highlights) {
  dc.push(mdpiPara("MDPI17abstract", [mdpiBold("Highlights")]));
  if (content.highlights.findings) {
    dc.push(mdpiPara("MDPI31text", [mdpiRun("What are the main findings?")]));
    content.highlights.findings.forEach(i => dc.push(mdpiPara("MDPI38bullet", [mdpiRun(i)])));
  }
  if (content.highlights.implications) {
    dc.push(mdpiPara("MDPI31text", [mdpiRun("What are the implications of the main findings?")]));
    content.highlights.implications.forEach(i => dc.push(mdpiPara("MDPI38bullet", [mdpiRun(i)])));
  }
}

// Abstract + Keywords
dc.push(mdpiPara("MDPI17abstract", [mdpiBold("Abstract")]));
dc.push(mdpiPara("MDPI17abstract", [mdpiRun(content.abstract || "")]));
if (content.keywords) dc.push(mdpiPara("MDPI18keywords", [mdpiBold("Keywords: "), mdpiRun(content.keywords)]));
dc.push(mdpiPara("MDPI19line", []));

// Process content items
function processContent(items) {
  for (const item of items) {
    switch (item.type) {
      case "paragraph": dc.push(bodyText(item.text)); break;
      case "paragraph_no_indent": dc.push(bodyTextNoIndent(item.text)); break;
      case "heading2": dc.push(mdpiPara("MDPI22heading2", [mdpiItalic(item.text)])); break;
      case "heading3": dc.push(mdpiPara("MDPI23heading3", [mdpiRun(item.text)])); break;
      case "equation": dc.push(mdpiPara("MDPI39equation", [mdpiItalic(item.text)])); break;
      case "bullet":
        if (item.items) item.items.forEach(bi => dc.push(mdpiPara("MDPI38bullet", [mdpiRun(bi)])));
        break;
      case "table_caption":
        dc.push(mdpiPara("MDPI41tablecaption", [mdpiRun(item.text, { size: 18 })]));
        break;
      case "table": {
        const brd = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
        const nbs = { top: brd, bottom: brd, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } };
        const cm = { top: 40, bottom: 40, left: 80, right: 80 };
        const nc = item.headers ? item.headers.length : (item.rows[0] || []).length;
        const cw = Math.floor(7000 / nc);
        const rows = [];
        if (item.headers) {
          rows.push(new TableRow({ children: item.headers.map(h => new TableCell({
            borders: nbs, margins: cm, width: { size: cw, type: WidthType.DXA },
            children: [new Paragraph({ style: "MDPI42tablebody", children: [mdpiBold(h, { size: 18 })] })],
          })) }));
        }
        for (const row of (item.rows || [])) {
          rows.push(new TableRow({ children: row.map(cell => new TableCell({
            borders: nbs, margins: cm, width: { size: cw, type: WidthType.DXA },
            children: [new Paragraph({ style: "MDPI42tablebody", children: [mdpiRun(String(cell), { size: 18 })] })],
          })) }));
        }
        dc.push(new Table({ width: { size: 7000, type: WidthType.DXA }, columnWidths: new Array(nc).fill(cw), indent: { size: BODY_INDENT, type: WidthType.DXA }, rows }));
        break;
      }
      case "figure": {
        const imgPath = path.resolve(figuresDir, item.file);
        if (fs.existsSync(imgPath)) {
          const ext = path.extname(item.file).replace(".", "").toLowerCase();
          dc.push(new Paragraph({
            style: "MDPI52figure", alignment: AlignmentType.CENTER, indent: { left: BODY_INDENT },
            children: [new ImageRun({
              type: ext === "jpg" ? "jpeg" : ext, data: fs.readFileSync(imgPath),
              transformation: { width: item.width || 400, height: item.height || 300 },
              altText: { title: item.caption || "", description: item.caption || "", name: item.file },
            })],
          }));
        }
        if (item.caption) dc.push(mdpiPara("MDPI51figurecaption", [mdpiRun(item.caption, { size: 18 })]));
        break;
      }
      default: dc.push(bodyText(item.text || JSON.stringify(item)));
    }
  }
}

// Sections
if (content.sections) {
  for (const s of content.sections) {
    dc.push(mdpiPara("MDPI21heading1", [mdpiBold(s.heading, { size: 24 })]));
    if (s.content) processContent(s.content);
  }
}

// Back matter
if (content.back_matter) {
  for (const bm of content.back_matter) {
    dc.push(mdpiPara("MDPI21heading1", [mdpiBold(bm.heading, { size: 24 })]));
    dc.push(mdpiPara("MDPI62backmatter", [mdpiRun(bm.text, { size: 18 })]));
  }
}

// References
if (content.references && content.references.length > 0) {
  dc.push(mdpiPara("MDPI21heading1", [mdpiBold("References", { size: 24 })]));
  content.references.forEach((ref, i) => {
    dc.push(mdpiPara("MDPI81references", [mdpiRun((i + 1) + ".\t" + ref, { size: 18 })]));
  });
}

// Build
const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 20 }, paragraph: { spacing: { line: LINE_SPACING } } } },
    paragraphStyles: [
      { id: "MDPI11articletype", name: "MDPI_1.1_article_type", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 20 }, paragraph: { spacing: { line: LINE_SPACING } } },
      { id: "MDPI12title", name: "MDPI_1.2_title", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 36, bold: true }, paragraph: { spacing: { after: 240, line: 240 } } },
      { id: "MDPI13authornames", name: "MDPI_1.3_authornames", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 20, bold: true }, paragraph: { spacing: { after: 360, line: 260 } } },
      { id: "MDPI16affiliation", name: "MDPI_1.6_affiliation", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 16 }, paragraph: { spacing: { line: LINE_SPACING } } },
      { id: "MDPI17abstract", name: "MDPI_1.7_abstract", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 20 }, paragraph: { spacing: { before: 240, after: 120, line: LINE_SPACING }, indent: { left: BODY_INDENT }, alignment: AlignmentType.JUSTIFIED } },
      { id: "MDPI18keywords", name: "MDPI_1.8_keywords", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 20 }, paragraph: { spacing: { line: LINE_SPACING }, indent: { left: BODY_INDENT }, alignment: AlignmentType.JUSTIFIED } },
      { id: "MDPI19line", name: "MDPI_1.9_line", basedOn: "Normal", quickFormat: true, paragraph: { spacing: { line: LINE_SPACING }, indent: { left: BODY_INDENT }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } } } },
      { id: "MDPI21heading1", name: "MDPI_2.1_heading1", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 24, bold: true }, paragraph: { spacing: { before: 240, after: 60, line: LINE_SPACING }, indent: { left: BODY_INDENT } } },
      { id: "MDPI22heading2", name: "MDPI_2.2_heading2", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 20, italics: true }, paragraph: { spacing: { before: 60, after: 60, line: LINE_SPACING }, indent: { left: BODY_INDENT } } },
      { id: "MDPI23heading3", name: "MDPI_2.3_heading3", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 20 }, paragraph: { spacing: { before: 60, after: 60, line: LINE_SPACING }, indent: { left: BODY_INDENT } } },
      { id: "MDPI31text", name: "MDPI_3.1_text", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 20 }, paragraph: { spacing: { line: LINE_SPACING }, indent: { left: BODY_INDENT, firstLine: 425 }, alignment: AlignmentType.JUSTIFIED } },
      { id: "MDPI32textnoindent", name: "MDPI_3.2_text_no_indent", basedOn: "MDPI31text", quickFormat: true, paragraph: { indent: { left: BODY_INDENT, firstLine: 0 } } },
      { id: "MDPI38bullet", name: "MDPI_3.8_bullet", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 20 }, paragraph: { spacing: { line: LINE_SPACING }, indent: { left: BODY_INDENT + 425, hanging: 425 }, alignment: AlignmentType.JUSTIFIED } },
      { id: "MDPI39equation", name: "MDPI_3.9_equation", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 20 }, paragraph: { spacing: { line: LINE_SPACING }, indent: { left: BODY_INDENT }, alignment: AlignmentType.CENTER } },
      { id: "MDPI41tablecaption", name: "MDPI_4.1_table_caption", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 18 }, paragraph: { spacing: { before: 240, after: 120, line: LINE_SPACING }, indent: { left: BODY_INDENT }, alignment: AlignmentType.JUSTIFIED } },
      { id: "MDPI42tablebody", name: "MDPI_4.2_table_body", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 20 }, paragraph: { spacing: { line: LINE_SPACING }, alignment: AlignmentType.CENTER } },
      { id: "MDPI51figurecaption", name: "MDPI_5.1_figure_caption", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 18 }, paragraph: { spacing: { before: 120, after: 240, line: LINE_SPACING }, indent: { left: BODY_INDENT }, alignment: AlignmentType.JUSTIFIED } },
      { id: "MDPI52figure", name: "MDPI_5.2_figure", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 20 }, paragraph: { spacing: { line: LINE_SPACING }, indent: { left: BODY_INDENT }, alignment: AlignmentType.CENTER } },
      { id: "MDPI62backmatter", name: "MDPI_6.2_back_matter", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 18 }, paragraph: { spacing: { line: LINE_SPACING }, indent: { left: BODY_INDENT }, alignment: AlignmentType.JUSTIFIED } },
      { id: "MDPI81references", name: "MDPI_8.1_references", basedOn: "Normal", quickFormat: true, run: { font: FONT, size: 18 }, paragraph: { spacing: { line: LINE_SPACING }, indent: { left: BODY_INDENT + 425, hanging: 425 }, alignment: AlignmentType.JUSTIFIED } },
    ],
  },
  sections: [{
    properties: {
      page: { size: { width: 11906, height: 16838 }, margin: { top: 1417, right: 720, bottom: 907, left: 720, header: 720, footer: 612 } },
    },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 })] })] }) },
    children: dc,
  }],
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(outputPath, buf); console.log("Written: " + outputPath + " (" + (buf.length / 1024).toFixed(0) + " KB)"); });

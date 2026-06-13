// Assemblage du cahier de reference motorwatch (meme pipeline que DriverV2).
// Lancement : node build.cjs   (avec NODE_PATH pointant sur le npm global si
// le paquet docx n'est pas resolu localement).
const fs = require("fs");
const path = require("path");
const h = require("./helpers.cjs");
const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    TableOfContents, Header, Footer, PageNumber, LevelFormat, BorderStyle,
} = h.docx;

const children = [];

// ---- Page de titre ----------------------------------------------------------
children.push(
    new Paragraph({ spacing: { before: 3200 }, children: [] }),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "motorwatch", bold: true, size: 72 })],
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [new TextRun({ text: "Surveillance open-set des régimes machine par signature de courant : du capteur au central, du central aux sites", size: 32 })],
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: "Cahier de référence : conception, journal de réalisation, décisions et reconstruction", italics: true, size: 26 })],
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: "Portage industriel du cahier DriverV2 (partie V.2.1)", size: 22 })],
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 2000 },
        children: [new TextRun({ text: "Projet SpikyPanda / CyanMycelium", size: 24 })],
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "11 juin 2026 : version 1.0", size: 24 })],
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [new TextRun({ text: "Document de travail confidentiel", size: 20, italics: true })],
    }),
    h.PB()
);

// ---- Abstract ---------------------------------------------------------------
children.push(...require("./c1_abstract.cjs")(h));

// ---- Table des matieres -----------------------------------------------------
children.push(
    new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [new TextRun("Table des matières")] }),
    new TableOfContents("Table des matières", { hyperlink: true, headingStyleRange: "1-2" })
);

// ---- Corps ------------------------------------------------------------------
children.push(...require("./c2_systeme.cjs")(h));
children.push(...require("./c3_journal.cjs")(h));
children.push(...require("./c4_reconstruction.cjs")(h));
children.push(...require("./c5_annexes.cjs")(h));

// ---- Document ---------------------------------------------------------------
const doc = new Document({
    creator: "SpikyPanda",
    title: "motorwatch : cahier de référence",
    styles: {
        default: { document: { run: { font: "Arial", size: 21 } } },
        paragraphStyles: [
            { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
              run: { size: 34, bold: true, font: "Arial", color: "1F3864" },
              paragraph: { spacing: { before: 320, after: 240 }, outlineLevel: 0 } },
            { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
              run: { size: 27, bold: true, font: "Arial", color: "2E5395" },
              paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
            { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
              run: { size: 23, bold: true, font: "Arial", color: "404040" },
              paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 2 } },
        ],
    },
    numbering: {
        config: [
            { reference: "puces",
              levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 460, hanging: 260 } } } }] },
            ...["nums", "numcadr", "numsp2"].map((ref) => ({
                reference: ref,
                levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 460, hanging: 260 } } } }],
            })),
        ],
    },
    features: { updateFields: true },
    sections: [
        {
            properties: {
                page: {
                    size: { width: 11906, height: 16838 },          // A4
                    margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
                },
            },
            headers: {
                default: new Header({
                    children: [
                        new Paragraph({
                            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "9CB3D4", space: 2 } },
                            tabStops: [{ type: "right", position: 9638 }],
                            children: [
                                new TextRun({ text: "motorwatch : cahier de référence", size: 17, color: "666666" }),
                                new TextRun({ text: "\tSpikyPanda / CyanMycelium", size: 17, color: "666666" }),
                            ],
                        }),
                    ],
                }),
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({ text: "Page ", size: 17, color: "666666" }),
                                new TextRun({ children: [PageNumber.CURRENT], size: 17, color: "666666" }),
                                new TextRun({ text: " / ", size: 17, color: "666666" }),
                                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 17, color: "666666" }),
                            ],
                        }),
                    ],
                }),
            },
            children,
        },
    ],
});

const out = path.resolve(__dirname, "..", "Motorwatch_Cahier_Reference.docx");
Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(out, buffer);
    console.log("OK ->", out, Math.round(buffer.length / 1024) + " Ko");
});

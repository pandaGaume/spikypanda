// Aides de construction docx pour le cahier de reference motorwatch (clone du pipeline DriverV2).
const docx = require("docx");
const {
    Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
    WidthType, BorderStyle, ShadingType, AlignmentType, PageBreak,
} = docx;

// A4 : largeur 11906, marges 1134 (2 cm) -> contenu 9638 DXA
const CW = 9638;

function runs(content, base = {}) {
    if (typeof content === "string") return [new TextRun({ text: content, ...base })];
    if (Array.isArray(content)) {
        return content.map((c) =>
            typeof c === "string" ? new TextRun({ text: c, ...base }) : new TextRun({ ...base, ...c })
        );
    }
    return [new TextRun({ ...base, ...content })];
}

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: runs(t) });
const H1n = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: runs(t) });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs(t) });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: runs(t) });

const P = (content, opts = {}) =>
    new Paragraph({
        spacing: { after: 120, line: 300 },
        alignment: AlignmentType.JUSTIFIED,
        ...opts,
        children: runs(content),
    });

// Texte en gras au fil d'un paragraphe : P([ "debut ", B("important"), " suite" ])
const B = (text) => ({ text, bold: true });
const I = (text) => ({ text, italics: true });
const CODEIN = (text) => ({ text, font: "Consolas", size: 19 });

const BUL = (items) =>
    items.map(
        (t) =>
            new Paragraph({
                numbering: { reference: "puces", level: 0 },
                spacing: { after: 80, line: 300 },
                alignment: AlignmentType.JUSTIFIED,
                children: runs(t),
            })
    );

const NUM = (items, ref = "nums") =>
    items.map(
        (t) =>
            new Paragraph({
                numbering: { reference: ref, level: 0 },
                spacing: { after: 80, line: 300 },
                alignment: AlignmentType.JUSTIFIED,
                children: runs(t),
            })
    );

// Bloc "code" : police a chasse fixe, fond gris clair, interligne serre.
const CODE = (lines) =>
    lines.map(
        (l, i) =>
            new Paragraph({
                shading: { fill: "F2F2F2", type: ShadingType.CLEAR },
                spacing: { after: i === lines.length - 1 ? 160 : 0, line: 240 },
                indent: { left: 240, right: 240 },
                children: runs(l, { font: "Consolas", size: 18 }),
            })
    );

// Formule centree, chasse fixe legerement plus grande.
const FORMULE = (t) =>
    new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 160 },
        children: runs(t, { font: "Consolas", size: 20 }),
    });

// Encadre "Decision" ou "Note" : bordure gauche epaisse.
const ENCADRE = (titre, contenu, couleur = "2E75B6") =>
    [
        new Paragraph({
            border: { left: { style: BorderStyle.SINGLE, size: 24, color: couleur, space: 8 } },
            indent: { left: 240 },
            spacing: { before: 120, after: 40 },
            children: runs([B(titre)]),
        }),
        ...(Array.isArray(contenu) ? contenu : [contenu]).map(
            (c, i, a) =>
                new Paragraph({
                    border: { left: { style: BorderStyle.SINGLE, size: 24, color: couleur, space: 8 } },
                    indent: { left: 240 },
                    spacing: { after: i === a.length - 1 ? 160 : 60, line: 300 },
                    alignment: AlignmentType.JUSTIFIED,
                    children: runs(c),
                })
        ),
    ];

const cellBorder = { style: BorderStyle.SINGLE, size: 2, color: "BBBBBB" };
const CELL_BORDERS = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function TBL(header, rows, colWidths) {
    const n = header.length;
    const widths = colWidths || Array(n).fill(Math.floor(CW / n));
    const total = widths.reduce((a, b) => a + b, 0);
    const mkCell = (content, isHeader) =>
        new TableCell({
            borders: CELL_BORDERS,
            width: { size: 0, type: WidthType.AUTO },
            shading: isHeader ? { fill: "DCE6F1", type: ShadingType.CLEAR } : undefined,
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [
                new Paragraph({
                    spacing: { line: 260 },
                    children: runs(content, isHeader ? { bold: true, size: 19 } : { size: 19 }),
                }),
            ],
        });
    const table = new Table({
        width: { size: total, type: WidthType.DXA },
        columnWidths: widths,
        rows: [
            new TableRow({ tableHeader: true, children: header.map((h) => mkCell(h, true)) }),
            ...rows.map((r) => new TableRow({ children: r.map((c) => mkCell(c, false)) })),
        ],
    });
    // re-applique les largeurs cellule par cellule (regle dual width)
    table.root
        .filter((x) => x instanceof TableRow)
        .forEach((row) => {
            row.root
                .filter((x) => x instanceof TableCell)
                .forEach((cell, i) => {
                    cell.options && (cell.options.width = { size: widths[i], type: WidthType.DXA });
                });
        });
    return table;
}

// Variante simple : reconstruit les cellules avec largeur correcte directement.
function TABLE(header, rows, colWidths) {
    const n = header.length;
    const widths = colWidths || Array(n).fill(Math.floor(CW / n));
    const total = widths.reduce((a, b) => a + b, 0);
    const mkCell = (content, w, isHeader) =>
        new TableCell({
            borders: CELL_BORDERS,
            width: { size: w, type: WidthType.DXA },
            shading: isHeader ? { fill: "DCE6F1", type: ShadingType.CLEAR } : undefined,
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [
                new Paragraph({
                    spacing: { line: 260 },
                    children: runs(content, isHeader ? { bold: true, size: 19 } : { size: 19 }),
                }),
            ],
        });
    return new Table({
        width: { size: total, type: WidthType.DXA },
        columnWidths: widths,
        rows: [
            new TableRow({ tableHeader: true, children: header.map((h, i) => mkCell(h, widths[i], true)) }),
            ...rows.map((r) => new TableRow({ children: r.map((c, i) => mkCell(c, widths[i], false)) })),
        ],
    });
}

const SPACER = () => new Paragraph({ spacing: { after: 120 }, children: [] });
const PB = () => new Paragraph({ children: [new PageBreak()] });

module.exports = { docx, CW, H1, H1n, H2, H3, P, B, I, CODEIN, BUL, NUM, CODE, FORMULE, ENCADRE, TABLE, SPACER, PB };

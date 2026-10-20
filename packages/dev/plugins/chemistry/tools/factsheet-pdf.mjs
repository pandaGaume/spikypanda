/**
 * Reading the text out of a simulant fact sheet.
 *
 * The manufacturer's fact sheets are PowerPoint slides exported to PDF,
 * which is the least convenient shape a composition table can take and
 * the only one it is published in. There is no table structure left in
 * the file: every cell is a separate text object placed by a matrix,
 * and a cell's bytes are glyph indices of an embedded subset font, so
 * "51.2" is stored as three 16-bit numbers that mean nothing without
 * the font's own translation table.
 *
 * So this does three things, and all three are needed before a single
 * number can be read:
 *
 * 1. **Decode the glyphs.** The fonts are `/Type0` with `/Identity-H`
 *    encoding, so a string is a sequence of big-endian 16-bit glyph
 *    indices into one subset font. Each font carries a `/ToUnicode`
 *    CMap that maps those indices back to characters, in `beginbfchar`
 *    and `beginbfrange` blocks. A page uses several fonts, so the
 *    active one has to be tracked through the content stream: decoding
 *    everything with one merged table would silently garble it, because
 *    two subsets number their glyphs independently.
 *
 * 2. **Place every run.** Drawing order in a PowerPoint export is shape
 *    order, which is not reading order, so the runs are positioned
 *    rather than taken as they come: the graphics state stack, the `cm`
 *    transforms and the text matrix are all tracked so each run gets a
 *    point on the page. Sorting those points into rows and columns is
 *    what turns forty loose runs back into "SiO2 51.2".
 *
 * 3. **Nothing else.** No images, no shading, no annotations: this is
 *    not a PDF renderer and it will not become one. It handles what
 *    these nine files use, which is PDF 1.4 with flate-compressed
 *    streams and no object streams, and it throws rather than guess
 *    anywhere else.
 *
 * It takes bytes and returns text runs. Which runs are a composition
 * table is a different question, and it belongs to the caller.
 */

import { inflateSync } from "node:zlib";

/**
 * The objects of a PDF, by number.
 *
 * Scanning for `N 0 obj ... endobj` rather than walking the cross
 * reference table is deliberate: the xref of a rewritten file can point
 * at superseded objects, while a scan picks up whatever is physically
 * there, and these files have no incremental updates for it to confuse.
 */
function readObjects(bytes) {
    const objects = new Map();
    const text = bytes.toString("latin1");
    const header = /(\d+)\s+0\s+obj\b/g;
    let match;
    while ((match = header.exec(text)) !== null) {
        const start = header.lastIndex;
        const end = text.indexOf("endobj", start);
        if (end < 0) continue;
        objects.set(Number(match[1]), { start, end, text: text.slice(start, end) });
    }
    return { objects, text };
}

/**
 * An object's stream, inflated when it is flate-compressed.
 *
 * The length comes from the dictionary's `/Length`, not from the
 * distance to `endstream`. Compressed bytes are binary and routinely
 * end in a newline, so trimming the end-of-line that precedes the
 * keyword would eat real data; `/Length` is exact and these files all
 * carry it directly rather than as a reference.
 */
function streamOf(bytes, objects, object) {
    const marker = object.text.indexOf("stream");
    if (marker < 0) return null;
    const dictionary = object.text.slice(0, marker);

    // `/Length` is a direct integer here and an indirect reference
    // there, in the same file, so both are handled. A reference is
    // tried first: `/Length 83 0 R` also matches the direct pattern,
    // and reading 83 bytes of a 12 KB stream fails as a corrupt file
    // rather than as a wrong guess.
    let length = null;
    const indirect = /\/Length\s+(\d+)\s+0\s+R/.exec(dictionary);
    if (indirect) {
        const held = objects.get(Number(indirect[1]));
        const value = held ? /^\s*(\d+)/.exec(held.text) : null;
        if (value) length = Number(value[1]);
    } else {
        const direct = /\/Length\s+(\d+)(?!\d)/.exec(dictionary);
        if (direct) length = Number(direct[1]);
    }
    if (length === null) throw new Error("a stream has no readable /Length");

    // The keyword is followed by CRLF or LF, never by CR alone.
    let from = object.start + marker + "stream".length;
    if (bytes[from] === 0x0d) from++;
    if (bytes[from] === 0x0a) from++;

    const raw = bytes.subarray(from, from + length);
    if (!/\/FlateDecode/.test(dictionary)) return raw;
    return inflateSync(raw);
}

/** The indirect reference a named key points at, or null. */
function reference(objectText, key) {
    const m = new RegExp(`/${key}\\s+(\\d+)\\s+0\\s+R`).exec(objectText);
    return m ? Number(m[1]) : null;
}

/**
 * A font's `/ToUnicode` CMap, as glyph index to string.
 *
 * `beginbfchar` lists single glyphs, `beginbfrange` lists runs of
 * consecutive glyphs whose characters are consecutive too. A bfrange
 * may also give an explicit array of destinations, which these files do
 * not use; it is handled anyway, because getting it wrong would shift
 * every character after it.
 */
function parseToUnicode(cmapText) {
    const map = new Map();

    for (const block of cmapText.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
        for (const pair of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
            map.set(parseInt(pair[1], 16), fromUtf16Hex(pair[2]));
        }
    }

    for (const block of cmapText.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
        const body = block[1];
        for (const row of body.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]+>|\[[\s\S]*?\])/g)) {
            const low = parseInt(row[1], 16);
            const high = parseInt(row[2], 16);
            if (row[3].startsWith("[")) {
                const destinations = [...row[3].matchAll(/<([0-9a-fA-F]+)>/g)].map((d) => fromUtf16Hex(d[1]));
                for (let g = low; g <= high && g - low < destinations.length; g++) map.set(g, destinations[g - low]);
                continue;
            }
            const base = row[3].slice(1, -1);
            // A range's destination is a UTF-16BE string whose LAST code
            // unit is incremented, which matters for anything outside the
            // basic plane; these sheets stay inside it.
            const baseCode = parseInt(base, 16);
            for (let g = low; g <= high; g++) map.set(g, fromUtf16Hex((baseCode + (g - low)).toString(16).padStart(base.length, "0")));
        }
    }

    return map;
}

/** A UTF-16BE hex string as JavaScript text. */
function fromUtf16Hex(hex) {
    let out = "";
    for (let i = 0; i + 3 < hex.length + 1; i += 4) out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
    return out;
}

/** The fonts a page's resources name, each with its glyph table. */
function pageFonts(bytes, objects, resourcesText) {
    const fonts = new Map();
    const dictionary = /\/Font\s*<<([\s\S]*?)>>/.exec(resourcesText);
    if (!dictionary) return fonts;
    for (const entry of dictionary[1].matchAll(/\/([^\s/<>]+)\s+(\d+)\s+0\s+R/g)) {
        const fontObject = objects.get(Number(entry[2]));
        if (!fontObject) continue;
        const toUnicode = reference(fontObject.text, "ToUnicode");
        if (toUnicode === null) continue;
        const cmap = streamOf(bytes, objects, objects.get(toUnicode));
        if (cmap === null) continue;
        fonts.set(entry[1], parseToUnicode(cmap.toString("latin1")));
    }
    return fonts;
}

// ── the content stream ───────────────────────────────────────────────

/** `a` then `b`, as PDF matrices [a b c d e f]. */
function concat(a, b) {
    return [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3], a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]];
}

/** Where the origin of a matrix lands. */
function origin(m) {
    return { x: m[4], y: m[5] };
}

/**
 * Tokenise a content stream into operands and operators.
 *
 * Strings are kept as byte arrays rather than text, because their bytes
 * are glyph indices and turning them into characters here would mean
 * guessing the font before the stream has said which one is active.
 */
function tokenise(stream) {
    const tokens = [];
    let i = 0;
    const n = stream.length;

    const isWhite = (c) => c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09 || c === 0x0c || c === 0x00;
    const isDelimiter = (c) => c === 0x28 || c === 0x29 || c === 0x3c || c === 0x3e || c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d || c === 0x2f || c === 0x25;

    while (i < n) {
        const c = stream[i];
        if (isWhite(c)) {
            i++;
            continue;
        }
        if (c === 0x25) {
            // A comment runs to the end of the line.
            while (i < n && stream[i] !== 0x0a && stream[i] !== 0x0d) i++;
            continue;
        }
        if (c === 0x28) {
            const bytes = [];
            let depth = 1;
            i++;
            while (i < n) {
                const b = stream[i];
                if (b === 0x5c) {
                    // An escape: the named ones, an octal code, or a
                    // line continuation that contributes nothing.
                    const next = stream[i + 1];
                    i += 2;
                    if (next === 0x6e) bytes.push(0x0a);
                    else if (next === 0x72) bytes.push(0x0d);
                    else if (next === 0x74) bytes.push(0x09);
                    else if (next === 0x62) bytes.push(0x08);
                    else if (next === 0x66) bytes.push(0x0c);
                    else if (next >= 0x30 && next <= 0x37) {
                        let octal = String.fromCharCode(next);
                        while (octal.length < 3 && stream[i] >= 0x30 && stream[i] <= 0x37) octal += String.fromCharCode(stream[i++]);
                        bytes.push(parseInt(octal, 8) & 0xff);
                    } else if (next === 0x0a) {
                        /* continuation */
                    } else if (next === 0x0d) {
                        if (stream[i] === 0x0a) i++;
                    } else bytes.push(next);
                    continue;
                }
                if (b === 0x28) depth++;
                if (b === 0x29) {
                    depth--;
                    if (depth === 0) {
                        i++;
                        break;
                    }
                }
                bytes.push(b);
                i++;
            }
            tokens.push({ kind: "string", bytes });
            continue;
        }
        if (c === 0x3c && stream[i + 1] !== 0x3c) {
            let hex = "";
            i++;
            while (i < n && stream[i] !== 0x3e) {
                const ch = String.fromCharCode(stream[i++]);
                if (/[0-9a-fA-F]/.test(ch)) hex += ch;
            }
            i++;
            if (hex.length % 2 === 1) hex += "0";
            const bytes = [];
            for (let k = 0; k < hex.length; k += 2) bytes.push(parseInt(hex.slice(k, k + 2), 16));
            tokens.push({ kind: "string", bytes });
            continue;
        }
        if (c === 0x2f) {
            let name = "";
            i++;
            while (i < n && !isWhite(stream[i]) && !isDelimiter(stream[i])) name += String.fromCharCode(stream[i++]);
            tokens.push({ kind: "name", name });
            continue;
        }
        if (c === 0x5b || c === 0x5d || (c === 0x3c && stream[i + 1] === 0x3c) || (c === 0x3e && stream[i + 1] === 0x3e)) {
            // Array and dictionary brackets are structure, not operands
            // this reader uses; TJ reads its strings off the token list
            // directly, so they can simply be skipped.
            i += c === 0x3c || c === 0x3e ? 2 : 1;
            tokens.push({ kind: "bracket" });
            continue;
        }
        let word = "";
        while (i < n && !isWhite(stream[i]) && !isDelimiter(stream[i])) word += String.fromCharCode(stream[i++]);
        if (word.length === 0) {
            i++;
            continue;
        }
        if (/^[-+.\d]/.test(word) && Number.isFinite(Number(word))) tokens.push({ kind: "number", value: Number(word) });
        else tokens.push({ kind: "operator", operator: word });
    }
    return tokens;
}

/**
 * The placed text runs of one content stream.
 *
 * Only the operators that move text or change the font are interpreted.
 * Everything else, and there is a great deal of it in a slide export,
 * is skipped: a run's point comes out of the graphics state, so the
 * paths and images in between cannot shift it.
 */
function runsOf(stream, fonts) {
    const tokens = tokenise(stream);
    const runs = [];

    let ctm = [1, 0, 0, 1, 0, 0];
    const stack = [];
    let textMatrix = [1, 0, 0, 1, 0, 0];
    let lineMatrix = [1, 0, 0, 1, 0, 0];
    let font = null;
    let size = 0;
    let leading = 0;
    const operands = [];

    const numbers = (count) => {
        const out = operands.slice(-count).map((t) => (t.kind === "number" ? t.value : 0));
        return out.length === count ? out : null;
    };

    const emit = (bytes) => {
        if (font === null || bytes.length === 0) return;
        let text = "";
        for (let k = 0; k + 1 < bytes.length; k += 2) {
            const glyph = (bytes[k] << 8) | bytes[k + 1];
            text += font.get(glyph) ?? "";
        }
        if (text.trim().length === 0) return;
        const placed = origin(concat(textMatrix, ctm));
        runs.push({ text, x: placed.x, y: placed.y, size });
    };

    for (const token of tokens) {
        if (token.kind !== "operator") {
            operands.push(token);
            if (operands.length > 16) operands.shift();
            continue;
        }
        switch (token.operator) {
            case "q":
                stack.push(ctm);
                break;
            case "Q":
                ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
                break;
            case "cm": {
                const m = numbers(6);
                if (m) ctm = concat(m, ctm);
                break;
            }
            case "BT":
                textMatrix = [1, 0, 0, 1, 0, 0];
                lineMatrix = textMatrix;
                break;
            case "Tm": {
                const m = numbers(6);
                if (m) {
                    textMatrix = m;
                    lineMatrix = m;
                }
                break;
            }
            case "Td": {
                const d = numbers(2);
                if (d) {
                    lineMatrix = concat([1, 0, 0, 1, d[0], d[1]], lineMatrix);
                    textMatrix = lineMatrix;
                }
                break;
            }
            case "TD": {
                const d = numbers(2);
                if (d) {
                    leading = -d[1];
                    lineMatrix = concat([1, 0, 0, 1, d[0], d[1]], lineMatrix);
                    textMatrix = lineMatrix;
                }
                break;
            }
            case "TL": {
                const l = numbers(1);
                if (l) leading = l[0];
                break;
            }
            case "T*":
                lineMatrix = concat([1, 0, 0, 1, 0, -leading], lineMatrix);
                textMatrix = lineMatrix;
                break;
            case "Tf": {
                const name = [...operands].reverse().find((t) => t.kind === "name");
                const s = numbers(1);
                if (name) font = fonts.get(name.name) ?? null;
                if (s) size = s[0];
                break;
            }
            case "Tj":
            case "'":
            case '"': {
                const last = [...operands].reverse().find((t) => t.kind === "string");
                if (token.operator !== "Tj") {
                    lineMatrix = concat([1, 0, 0, 1, 0, -leading], lineMatrix);
                    textMatrix = lineMatrix;
                }
                if (last) emit(last.bytes);
                break;
            }
            case "TJ": {
                // Every string of the array belongs to the same run: the
                // numbers between them are kerning, which moves the pen
                // by less than a character and never starts a new cell.
                const bytes = [];
                for (const t of operands) if (t.kind === "string") bytes.push(...t.bytes);
                emit(bytes);
                break;
            }
            default:
                break;
        }
        operands.length = 0;
    }

    return runs;
}

/**
 * The text runs of a fact sheet, page by page, in reading order.
 *
 * Reading order here means rows top to bottom and, inside a row, left to
 * right. The row tolerance is a fraction of the glyph size rather than a
 * fixed number of points, because these slides are drawn through a 381x
 * scaling transform and an absolute tolerance would mean nothing.
 */
export function readFactsheetRuns(bytes) {
    const { objects, text } = readObjects(bytes);
    const pages = [];

    // Pages in the order the page tree lists them, so a sheet whose
    // chemistry sits on its second page is still read second.
    const kids = /\/Type\s*\/Pages[\s\S]*?\/Kids\s*\[([\s\S]*?)\]/.exec(text);
    const order = kids ? [...kids[1].matchAll(/(\d+)\s+0\s+R/g)].map((m) => Number(m[1])) : [];
    const pageNumbers = order.length > 0 ? order : [...objects.keys()].filter((n) => /\/Type\s*\/Page\b/.test(objects.get(n).text));

    for (const number of pageNumbers) {
        const page = objects.get(number);
        if (!page || !/\/Type\s*\/Page\b/.test(page.text)) continue;
        const resources = reference(page.text, "Resources");
        const contents = reference(page.text, "Contents");
        if (resources === null || contents === null) continue;
        const fonts = pageFonts(bytes, objects, objects.get(resources).text);
        const stream = streamOf(bytes, objects, objects.get(contents));
        if (stream === null) continue;

        const runs = runsOf(stream, fonts);
        // Page space has y growing upward, and the export's own flip is
        // undone by the flip it nests inside, so descending y is top to
        // bottom. Reading order is rows down the page, left to right.
        runs.sort((a, b) => b.y - a.y || a.x - b.x);
        const rows = [];
        for (const run of runs) {
            const tolerance = Math.max(run.size * 0.6, 1e-6);
            const row = rows[rows.length - 1];
            if (row && Math.abs(row.y - run.y) <= tolerance) {
                row.runs.push(run);
                continue;
            }
            rows.push({ y: run.y, runs: [run] });
        }
        for (const row of rows) row.runs.sort((a, b) => a.x - b.x);
        pages.push({ number, rows, runs: rows.flatMap((r) => r.runs) });
    }

    return pages;
}

// ── the bulk chemistry table ─────────────────────────────────────────

/**
 * The bulk chemistry of a fact sheet: the oxide column of its "Bulk
 * Chemistry" panel, as oxide formula to weight per cent.
 *
 * The panel is found by its own header rather than by a position, since
 * the nine sheets lay their slides out differently. The run that says
 * "Oxide" fixes the left edge of the panel and the first "Wt" run to
 * its right fixes the figures column; everything further left on the
 * same rows is the mineralogy and geotechnical panels, and that single
 * x filter is what keeps them out.
 *
 * Rows are then found from the FIGURES, not from the page's own row
 * bands, and this is the one subtlety worth stating. A subscript is
 * drawn as a text object of its own, lowered by most of a line, so
 * `Al2O3` is four runs spread over two line bands and no banding of the
 * page can keep it together without also merging two oxides. A figure
 * never has a subscript: one figure is one row, and the formula that
 * belongs to it is whatever sits to its left within a line below and a
 * third of a line above. Joined in x order and with nothing between
 * them, `Al`, `2`, `O`, `3` come back as `Al2O3`, which is correct
 * precisely because a subscript carries no separator.
 *
 * Loss on ignition and the declared total are rows of the same panel
 * and are not oxides, so they come back separately; the asterisks that
 * mark them are runs of their own and are stripped.
 *
 * Returns null where the sheet has no bulk chemistry panel at all. One
 * of the nine has none, which is a fact about the data set rather than
 * a failure to read it.
 */
export function readBulkChemistry(pages) {
    for (const page of pages) {
        const header = page.runs.find((r) => r.text.trim() === "Oxide");
        if (!header) continue;
        const figures = page.runs.find((r) => r.y === header.y && r.x > header.x && /^Wt/.test(r.text.trim()));
        if (!figures) continue;

        const size = header.size;
        const split = figures.x - 0.6 * size;
        // The panel is bounded on the right as well as on the left. Two
        // of the nine sheets put the table on the left half of the slide
        // and a spectrum caption on the right, and a caption line sits
        // in the figures column as surely as a figure does unless the
        // column is given a width.
        const right = figures.x + 2.5 * size;
        const inPanel = page.runs.filter((r) => r.x >= header.x - 0.5 * size && r.x <= right && r.y < header.y - 0.1 * size);

        // One cluster of figure runs is one row of the panel.
        const rows = [];
        for (const run of inPanel.filter((r) => r.x >= split).sort((a, b) => b.y - a.y || a.x - b.x)) {
            const last = rows[rows.length - 1];
            if (last && Math.abs(last.y - run.y) <= 0.35 * size) {
                last.runs.push(run);
                continue;
            }
            rows.push({ y: run.y, runs: [run] });
        }

        const oxidesWeightPercent = {};
        const order = [];
        const problems = [];
        let lossOnIgnition = null;
        let declaredTotal = null;

        for (const row of rows) {
            const figure = row.runs
                .map((r) => r.text.trim())
                .join("")
                .trim();
            const number = Number(figure.replace(/[^0-9.+-]/g, ""));
            if (!Number.isFinite(number)) continue;

            const name = inPanel
                .filter((r) => r.x < split && r.y >= row.y - 0.95 * size && r.y <= row.y + 0.35 * size)
                .sort((a, b) => a.x - b.x)
                .map((r) => r.text.trim())
                .join("")
                .replace(/\*+/g, "")
                .trim();
            if (name.length === 0) continue;

            if (/^LOI$/i.test(name)) {
                lossOnIgnition = number;
                continue;
            }
            if (/^Total$/i.test(name)) {
                declaredTotal = number;
                break; // The total closes the panel; what follows is footnotes.
            }
            // A formula read twice means two figures claimed one row, so
            // the geometry was misread; that has to be said rather than
            // resolved by whichever row came last.
            if (name in oxidesWeightPercent) {
                problems.push(`${name} read twice, as ${oxidesWeightPercent[name]} and as ${number}`);
                continue;
            }
            oxidesWeightPercent[name] = number;
            order.push(name);
        }

        if (order.length === 0) continue;
        return { oxidesWeightPercent, order, problems, lossOnIgnition, declaredTotal, page: page.number };
    }
    return null;
}

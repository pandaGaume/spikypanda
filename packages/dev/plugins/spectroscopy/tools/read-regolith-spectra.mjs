/**
 * Pulls one sample's spectra out of the regolith simulant archive.
 *
 * The data set of V1-B (`internals/libs/data/README.md` section 2 bis)
 * ships one text file per sample per condition: tab-separated, the
 * first column the wavelength and every column after it one shot, a
 * hundred of them. This reads one such file out of the archive without
 * extracting 2.25 GB, and reduces it to what a first look needs: the
 * mean over the shots, the standard deviation across them, and the
 * grid it all sits on.
 *
 * It prints rather than asserts. The protocol says to fit and look at
 * ONE spectrum by hand before automating anything
 * (`internals/libs/08-V1B-PROTOCOL.md` section 7, step 5), and a batch
 * over four thousand spectra nobody has looked at one of measures
 * nothing.
 *
 * Usage, from the repository root:
 *
 *     node packages/dev/plugins/spectroscopy/tools/read-regolith-spectra.mjs \
 *          <archive.zip> [--list] [--sample NAME] [--out FILE]
 *
 * `--list` prints what the archive holds, which is the first thing to
 * do since the layout is only described in prose. With `--sample` it
 * reduces that sample and, with `--out`, writes the reduction as a
 * three-column TSV: wavelength, mean, standard deviation.
 *
 * The archive is read with Node's own zlib through a minimal zip
 * reader: the entries are deflated or stored, which is all a zip from
 * a data repository uses, and pulling in a dependency to read sixteen
 * bytes of header would be worse.
 *
 * It reads through a file descriptor at offsets rather than loading the
 * file. That is not an optimisation, it is the only way: this archive
 * is 2.25 GB and a Node buffer stops at 2 GiB, so `readFileSync` throws
 * on it. Reading the central directory and then one entry touches a few
 * megabytes whatever the archive weighs.
 */

import { closeSync, fstatSync, openSync, readSync, writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

// ── a minimal zip reader ─────────────────────────────────────────────

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;

/** `length` bytes at `position`, straight from the descriptor. */
function readAt(fd, position, length) {
    const buffer = Buffer.allocUnsafe(length);
    let read = 0;
    while (read < length) {
        const n = readSync(fd, buffer, read, length - read, position + read);
        if (n === 0) break;
        read += n;
    }
    return read === length ? buffer : buffer.subarray(0, read);
}

/**
 * The central directory of a zip: name, compression method, compressed
 * and uncompressed sizes, and where the local header sits. Reading the
 * directory rather than scanning for local headers is what makes it
 * possible to touch one entry of a multi-gigabyte archive.
 */
function readDirectory(fd, size) {
    // The end-of-central-directory record is at the end, after a
    // comment of at most 64 KiB, so only the tail is read and it is
    // searched backwards.
    const tailLength = Math.min(size, 65557);
    const tail = readAt(fd, size - tailLength, tailLength);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
        if (tail.readUInt32LE(i) === EOCD) {
            eocd = i;
            break;
        }
    }
    if (eocd < 0) throw new Error("not a zip: no end-of-central-directory record");

    const count = tail.readUInt16LE(eocd + 10);
    const directorySize = tail.readUInt32LE(eocd + 12);
    const directoryOffset = tail.readUInt32LE(eocd + 16);
    if (directoryOffset === 0xffffffff || directorySize === 0xffffffff) throw new Error("zip64 central directory, not supported here");

    const directory = readAt(fd, directoryOffset, directorySize);
    const entries = [];
    let offset = 0;
    for (let k = 0; k < count; k++) {
        if (directory.readUInt32LE(offset) !== CENTRAL) throw new Error(`central directory entry ${k} is malformed`);
        const method = directory.readUInt16LE(offset + 10);
        const compressedSize = directory.readUInt32LE(offset + 20);
        const uncompressedSize = directory.readUInt32LE(offset + 24);
        const nameLength = directory.readUInt16LE(offset + 28);
        const extraLength = directory.readUInt16LE(offset + 30);
        const commentLength = directory.readUInt16LE(offset + 32);
        const localOffset = directory.readUInt32LE(offset + 42);
        const name = directory.toString("utf8", offset + 46, offset + 46 + nameLength);
        entries.push({ name, method, compressedSize, uncompressedSize, localOffset });
        offset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
}

/** One entry's bytes, read and inflated on its own. */
function readEntry(fd, entry) {
    // The local header repeats the name and extra field, whose lengths
    // are the only thing needed to find where the data starts; the
    // extra field may differ from the central directory's, so it is
    // read here rather than assumed.
    const header = readAt(fd, entry.localOffset, 30);
    const nameLength = header.readUInt16LE(26);
    const extraLength = header.readUInt16LE(28);
    const raw = readAt(fd, entry.localOffset + 30 + nameLength + extraLength, entry.compressedSize);
    if (entry.method === 0) return raw;
    if (entry.method === 8) return inflateRawSync(raw);
    throw new Error(`${entry.name}: compression method ${entry.method} is not stored or deflate`);
}

// ── the spectra ──────────────────────────────────────────────────────

/**
 * One file reduced: the grid, the mean over the shots, and the spread
 * across them.
 *
 * The spread is kept because it is a measurement in its own right. A
 * hundred shots at one point is the shot-to-shot fluctuation the
 * protocol lists as an open item, and it arrives free with every
 * spectrum here.
 */
function reduce(text) {
    const wavelength = [];
    const mean = [];
    const deviation = [];
    let shots = 0;
    let skipped = 0;

    for (const line of text.split(/\r?\n/)) {
        if (line.trim().length === 0) continue;
        const cells = line.split("\t");
        const nm = Number(cells[0]);
        if (!Number.isFinite(nm)) {
            skipped++; // a header line, or a stray label
            continue;
        }
        let n = 0;
        let sum = 0;
        let sumOfSquares = 0;
        for (let k = 1; k < cells.length; k++) {
            const v = Number(cells[k]);
            if (!Number.isFinite(v)) continue;
            n++;
            sum += v;
            sumOfSquares += v * v;
        }
        if (n === 0) continue;
        shots = Math.max(shots, n);
        const m = sum / n;
        // The two-pass formula is not worth a second pass here: the
        // counts are of order 1e4 and n of order 100, so the one-pass
        // variance stays far from its cancellation regime.
        const variance = Math.max(0, sumOfSquares / n - m * m);
        wavelength.push(nm);
        mean.push(m);
        deviation.push(Math.sqrt(variance));
    }
    return { wavelength, mean, deviation, shots, skipped };
}

/** Where a reduced spectrum sits and what it looks like, in one line. */
function describe(r) {
    const n = r.wavelength.length;
    if (n === 0) return "no numeric row";
    const steps = [];
    for (let i = 1; i < n; i++) steps.push(r.wavelength[i] - r.wavelength[i - 1]);
    steps.sort((a, b) => a - b);
    const median = steps[Math.floor(steps.length / 2)];
    // A single spectrometer gives one step; several concatenated give
    // several, and a gap between channels shows as a large jump.
    const gaps = steps.filter((s) => s > 5 * median).length;
    let peak = 0;
    for (let i = 0; i < n; i++) if (r.mean[i] > r.mean[peak]) peak = i;
    const relative = r.mean[peak] > 0 ? r.deviation[peak] / r.mean[peak] : NaN;
    return (
        `${n} points, ${r.wavelength[0].toFixed(3)} to ${r.wavelength[n - 1].toFixed(3)} nm, ` +
        `median step ${median.toFixed(4)} nm, ${gaps} gap(s) between channels, ${r.shots} shots` +
        `\n    strongest point ${r.wavelength[peak].toFixed(3)} nm at ${r.mean[peak].toPrecision(5)}, ` +
        `shot-to-shot spread there ${(relative * 100).toFixed(1)} %`
    );
}

/**
 * The strongest local maxima of a reduced spectrum, as a first look at
 * where the lines actually are. A peak is a point higher than its
 * neighbours and above a floor, and the floor is a fraction of the
 * strongest point rather than an absolute count, because the counts
 * vary by a factor ten between the conditions.
 */
function peaks(r, count, floor = 0.01) {
    let max = 0;
    for (const v of r.mean) max = Math.max(max, v);
    const found = [];
    for (let i = 1; i < r.mean.length - 1; i++) {
        if (r.mean[i] < max * floor) continue;
        if (r.mean[i] <= r.mean[i - 1] || r.mean[i] < r.mean[i + 1]) continue;
        found.push({ nm: r.wavelength[i], height: r.mean[i], relative: r.mean[i] / max, spread: r.mean[i] > 0 ? r.deviation[i] / r.mean[i] : NaN });
    }
    found.sort((a, b) => b.height - a.height);
    return found.slice(0, count);
}

// ── the command ──────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const archivePath = argv.find((a) => !a.startsWith("--"));
const flag = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i < 0 ? null : (argv[i + 1] ?? "");
};

if (!archivePath) {
    console.error("Usage: node read-regolith-spectra.mjs <archive.zip> [--list] [--sample NAME] [--out FILE]");
    console.error("The archive is not in the repository: it is gigabytes of data, so only its manifest is versioned.");
    process.exit(1);
}

const fd = openSync(archivePath, "r");
const archiveSize = fstatSync(fd).size;
const entries = readDirectory(fd, archiveSize).filter((e) => !e.name.endsWith("/"));
console.log(`${archivePath}: ${entries.length} files, ${(archiveSize / 1e9).toFixed(2)} GB`);

if (argv.includes("--list")) {
    // The layout is only described in prose, so the directories and the
    // names are printed before anything is read.
    const byDirectory = new Map();
    for (const e of entries) {
        const directory = e.name.includes("/") ? e.name.slice(0, e.name.lastIndexOf("/")) : ".";
        byDirectory.set(directory, (byDirectory.get(directory) ?? 0) + 1);
    }
    console.log("\ndirectories:");
    for (const [directory, n] of [...byDirectory].sort()) console.log(`  ${n.toString().padStart(5)}  ${directory}`);
    console.log("\nfirst names in each directory:");
    for (const directory of [...byDirectory.keys()].sort()) {
        const names = entries.filter((e) => e.name.startsWith(directory === "." ? "" : `${directory}/`)).slice(0, 4);
        for (const e of names) console.log(`  ${e.name}  ${(e.uncompressedSize / 1e6).toFixed(2)} MB`);
    }
}

const sample = flag("sample");
if (sample) {
    const matches = entries.filter((e) => e.name.toLowerCase().includes(sample.toLowerCase()));
    if (matches.length === 0) {
        console.error(`\nno entry whose name contains "${sample}"`);
        process.exit(1);
    }
    console.log(`\n${matches.length} entr(ies) matching "${sample}":`);
    for (const e of matches) {
        const r = reduce(readEntry(fd, e).toString("utf8"));
        console.log(`  ${e.name}\n    ${describe(r)}`);
        if (r.skipped > 0) console.log(`    ${r.skipped} non-numeric row(s) skipped`);

        const wanted = Number(flag("peaks") ?? 0);
        if (wanted > 0) {
            for (const p of peaks(r, wanted)) {
                console.log(`      ${p.nm.toFixed(3)} nm  ${p.height.toPrecision(5).padStart(11)}  ${(p.relative * 100).toFixed(1).padStart(5)} % of the strongest  spread ${(p.spread * 100).toFixed(0)} %`);
            }
        }

        const out = flag("out");
        if (out && e === matches[0]) {
            const lines = ["# " + e.name, "# from " + archivePath, "wavelength_nm\tmean_counts\tshot_standard_deviation"];
            for (let i = 0; i < r.wavelength.length; i++) lines.push(`${r.wavelength[i]}\t${r.mean[i]}\t${r.deviation[i]}`);
            writeFileSync(out, `${lines.join("\n")}\n`, "utf8");
            console.log(`    written to ${out}`);
        }
    }
}

closeSync(fd);

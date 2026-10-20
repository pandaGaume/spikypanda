/**
 * Reading the regolith simulant archive, for the tools that measure on it.
 *
 * The archive of V1-B is 2.25 GB and lives in the private research
 * repository, so no test and no bundle may depend on it: everything
 * here takes its path as an argument and nothing here is imported by
 * the plugin itself. What the plugin owns is the physics, in
 * `src/libs/` and `src/instrument/`; what this owns is one data set's
 * file layout.
 *
 * It reads one entry at a time through a file descriptor, because the
 * archive is larger than a Node buffer and `readFileSync` throws on it.
 */

import { closeSync, fstatSync, openSync, readSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;

/** An open archive: the central directory, read once. */
export function openArchive(path) {
    const fd = openSync(path, "r");
    const size = fstatSync(fd).size;

    const readAt = (position, length) => {
        const buffer = Buffer.allocUnsafe(length);
        let read = 0;
        while (read < length) {
            const n = readSync(fd, buffer, read, length - read, position + read);
            if (n === 0) break;
            read += n;
        }
        return read === length ? buffer : buffer.subarray(0, read);
    };

    // The end-of-central-directory record sits after a comment of at
    // most 64 KiB, so only the tail is read and it is searched backwards.
    const tailLength = Math.min(size, 65557);
    const tail = readAt(size - tailLength, tailLength);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
        if (tail.readUInt32LE(i) === EOCD) {
            eocd = i;
            break;
        }
    }
    if (eocd < 0) {
        closeSync(fd);
        throw new Error(`${path} is not a zip: no end-of-central-directory record`);
    }

    const count = tail.readUInt16LE(eocd + 10);
    const directorySize = tail.readUInt32LE(eocd + 12);
    const directoryOffset = tail.readUInt32LE(eocd + 16);
    if (directoryOffset === 0xffffffff) {
        closeSync(fd);
        throw new Error(`${path} has a zip64 central directory, which this reader does not handle`);
    }

    const directory = readAt(directoryOffset, directorySize);
    const entries = [];
    let offset = 0;
    for (let k = 0; k < count; k++) {
        if (directory.readUInt32LE(offset) !== CENTRAL) throw new Error(`central directory entry ${k} of ${path} is malformed`);
        const nameLength = directory.readUInt16LE(offset + 28);
        entries.push({
            name: directory.toString("utf8", offset + 46, offset + 46 + nameLength),
            method: directory.readUInt16LE(offset + 10),
            compressedSize: directory.readUInt32LE(offset + 20),
            localOffset: directory.readUInt32LE(offset + 42),
        });
        offset += 46 + nameLength + directory.readUInt16LE(offset + 30) + directory.readUInt16LE(offset + 32);
    }

    return {
        entries,
        sizeBytes: size,
        /** One entry's text. */
        read(name) {
            const entry = entries.find((e) => e.name === name);
            if (!entry) throw new Error(`no entry ${name} in ${path}`);
            // The local header repeats the name and extra field, and its
            // extra field may differ from the directory's, so it is read
            // rather than assumed.
            const header = readAt(entry.localOffset, 30);
            const raw = readAt(entry.localOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28), entry.compressedSize);
            if (entry.method === 0) return raw.toString("utf8");
            if (entry.method === 8) return inflateRawSync(raw).toString("utf8");
            throw new Error(`${name}: compression method ${entry.method} is neither stored nor deflate`);
        },
        close() {
            closeSync(fd);
        },
    };
}

/** The sample names of one condition and one set, references excluded. */
export function sampleNames(archive, condition, set = "Moon") {
    const prefix = `Data/${condition}/${set} samples/`;
    return archive.entries
        .filter((e) => e.name.startsWith(prefix) && e.name.endsWith(".txt") && !e.name.includes("Reference_") && !e.name.endsWith("Sample_Information.txt"))
        .map((e) => e.name.slice(prefix.length, -4))
        .sort();
}

/** Two tab-separated columns into a sampled curve. */
export function twoColumns(text) {
    const wavelengthNm = [];
    const values = [];
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        const [a, b] = trimmed.split("\t");
        const x = Number(a);
        const y = Number(b);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            wavelengthNm.push(x);
            values.push(y);
        }
    }
    return { wavelengthNm, values };
}

/**
 * One sample's spectrum: the grid, the mean over its hundred shots, and
 * the standard error of that mean.
 *
 * The standard error rather than the spread, because what a fit needs
 * is how well the MEAN is known, and the spread itself is a separate
 * measurement of the plasma's repeatability.
 */
export function sampleSpectrum(archive, condition, sample, set = "Moon") {
    const wavelengthNm = [];
    const values = [];
    const standardError = [];
    const shotSpread = [];
    for (const line of archive.read(`Data/${condition}/${set} samples/${sample}.txt`).split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        const cells = trimmed.split("\t");
        const nm = Number(cells[0]);
        if (!Number.isFinite(nm)) continue;
        let sum = 0;
        let sumSquares = 0;
        let n = 0;
        for (let k = 1; k < cells.length; k++) {
            const v = Number(cells[k]);
            if (!Number.isFinite(v)) continue;
            sum += v;
            sumSquares += v * v;
            n++;
        }
        if (n === 0) continue;
        const mean = sum / n;
        const spread = Math.sqrt(Math.max(0, sumSquares / n - mean * mean));
        wavelengthNm.push(nm);
        values.push(mean);
        shotSpread.push(spread);
        standardError.push(spread / Math.sqrt(n));
    }
    return { wavelengthNm, values, standardError, shotSpread };
}

/**
 * The instrument response of this archive, from its lamp files.
 *
 * The certificate covers the deuterium-halogen assembly with both
 * sources running, so the two measured spectra SUM to what it
 * describes. `12-INSTRUMENT-RESPONSE.md` has the measurement and the
 * band it can be trusted in.
 */
export function archiveResponse(archive, spectro) {
    const certificate = twoColumns(archive.read("Data/Deuterium_Halogen_lamp/Manufacturer-Deuterium-Halogen CC-VISNIR.txt"));
    const both = spectro.combine(
        twoColumns(archive.read("Data/Deuterium_Halogen_lamp/Measured_Deuterium.txt")),
        twoColumns(archive.read("Data/Deuterium_Halogen_lamp/Measured_Halogen.txt"))
    );
    return spectro.instrumentResponse(both, certificate, "uW/cm^2/nm");
}

/** Molar masses of the elements the catalogue covers, kg/mol. */
export const MOLAR_MASS = {
    C: 0.0120107,
    O: 0.0159994,
    F: 0.018998403,
    Na: 0.02298977,
    Mg: 0.024305,
    Al: 0.0269815,
    Si: 0.0280855,
    S: 0.032065,
    K: 0.0390983,
    Ca: 0.040078,
    Ti: 0.047867,
    Fe: 0.055845,
};

export const STAGE_NUMERAL = ["I", "II", "III"];

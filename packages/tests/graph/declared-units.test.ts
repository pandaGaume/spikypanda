/**
 * Repository guard on the units declared by `@editable` / `@viewable`.
 *
 * This one deliberately reads the source tree rather than instantiating
 * nodes. The point is coverage of every declaration in the repository,
 * including the plugins the test workspace does not alias and the nodes that
 * need a live context to construct. A unit reference that resolves to nothing
 * is invisible at runtime, it simply renders no symbol and projects to no
 * standard, and that is exactly the failure mode this file exists to make
 * loud.
 *
 * It is also what stops the previous situation from re-forming: the
 * declarations drifted into free display strings once, with the same quantity
 * spelled two ways, seven enumerations living in `unit`, and one property
 * declaring a property name as its unit.
 */
import * as fs from "fs";
import * as path from "path";
import { resolveUnit } from "spikypanda-core";

const DEV = path.resolve(process.cwd(), "packages", "dev");

function sources(dir: string, acc: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "dist" || entry.name === "node_modules") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) sources(full, acc);
        else if (entry.name.endsWith(".ts")) acc.push(full);
    }
    return acc;
}

interface Declaration {
    readonly file: string;
    readonly line: number;
    readonly text: string;
}

/** Lines carrying a decorator call, doc-comment examples excluded. */
function declarations(): Declaration[] {
    const out: Declaration[] = [];
    for (const file of sources(DEV)) {
        const lines = fs.readFileSync(file, "utf-8").split("\n");
        lines.forEach((text, i) => {
            if (text.trimStart().startsWith("*")) return;
            if (!/@(editable|viewable)\(/.test(text)) return;
            out.push({ file: path.relative(DEV, file), line: i + 1, text });
        });
    }
    return out;
}

describe("declared units", () => {
    const all = declarations();

    it("finds the declarations at all, so a silent zero cannot pass the suite", () => {
        expect(all.length).toBeGreaterThan(400);
    });

    it("resolves every declared unit tag", () => {
        const orphans: string[] = [];
        for (const d of all) {
            const re = /unit:\s*\{\s*quantity:\s*"([^"]+)",\s*unit:\s*"([^"]+)"\s*\}/g;
            let m: RegExpExecArray | null;
            while ((m = re.exec(d.text)) !== null) {
                if (!resolveUnit({ quantity: m[1], unit: m[2] })) {
                    orphans.push(`${d.file}:${d.line} -> ${m[1]}.${m[2]}`);
                }
            }
        }
        expect(orphans).toEqual([]);
    });

    it("declares no unit as a bare display string", () => {
        // `unit: "Hz"` instead of `unit: { quantity: "Frequency", unit: "Hz" }`.
        // The type system rejects it, so this only catches a declaration that
        // reached the tree through a cast or a JavaScript call site.
        const untyped = all
            .filter((d) => /unit:\s*"/.test(d.text.replace(/unit:\s*\{[^}]*\}/g, "")))
            .map((d) => `${d.file}:${d.line}`);
        expect(untyped).toEqual([]);
    });

    it("holds no enumeration in a unit, which is what the enum field is for", () => {
        const legends = all.filter((d) => /unit:\s*\{[^}]*unit:\s*"[^"]*[|=][^"]*"/.test(d.text)).map((d) => `${d.file}:${d.line}`);
        expect(legends).toEqual([]);
    });
});

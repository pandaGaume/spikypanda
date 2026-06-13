/**
 * Unit-level motorwatch coverage:
 *
 *   - RegimeCatalog: applyLabel / lookup / near-duplicate update /
 *     export-import round trip;
 *   - mergeCatalogs: cross-site label propagation, count-weighted
 *     majority vote (and its lexicographic tie-break), k preservation,
 *     site union, purity (inputs untouched);
 *   - protocol: CONFIRM_REQUIRED on unconfirmed device_reset, the
 *     validated diagnostic push (wrong sha256 leaves the previous bank
 *     active), catalog_apply_label / capture_set_profile plumbing;
 *   - CentralStation loop against a stub device server: diagnostic
 *     push on alarm, margin-gated labeling, catalog fast path.
 */
import { MCP_ERROR, CentralStation, InProcessDeviceServer, MotorwatchDevice, RegimeCatalog, isMcpError, mergeCatalogs } from "spikypanda-applications-motorwatch";
import type { IDeviceServer, IDiagnosticLoadModelResult, IDiagnosticResultNotification, McpNotification, McpNotificationHandler } from "spikypanda-applications-motorwatch";
import { sha256Hex } from "spikypanda-plugin-onnx";
import { ENCODER_DIM, buildDiagnosticBytes, buildEncoderBytes } from "./helpers";

// ─── Synthetic centroids ────────────────────────────────────────────────────

const DIM = 8;

/** Unit vector along axis `axis`. */
function oneHot(axis: number): number[] {
    const v = new Array(DIM).fill(0);
    v[axis] = 1;
    return v;
}

/** Perturbed copy of `c`: cosine distance ~ eps^2 / 2 (small for 0.3). */
function near(c: number[], eps: number, axis: number): number[] {
    const v = [...c];
    v[axis] += eps;
    return v;
}

// ─── RegimeCatalog ──────────────────────────────────────────────────────────

describe("RegimeCatalog", () => {
    it("applyLabel + lookup resolve within the match threshold and reject beyond it", () => {
        const catalog = new RegimeCatalog("site-A");
        catalog.applyLabel(oneHot(0), "baseline", "nominal load", "site-A");
        catalog.applyLabel(oneHot(1), "overload", "load step", "site-A");
        expect(catalog.size).toBe(2);

        // Near-by embedding resolves (cos dist ~ 0.043 < 0.06)...
        const hit = catalog.lookup(near(oneHot(1), 0.3, 5));
        expect(hit).not.toBeNull();
        expect(hit!.label).toBe("overload");
        expect(hit!.distance).toBeLessThan(0.06);
        expect(hit!.entry.diagnosis).toBe("load step");

        // ...an orthogonal one does not (cos dist 1).
        expect(catalog.lookup(oneHot(5))).toBeNull();
    });

    it("a near-duplicate applyLabel updates the entry instead of forking it", () => {
        const catalog = new RegimeCatalog("site-A");
        const first = catalog.applyLabel(oneHot(0), "regime_2_unlabeled");
        expect(first.count).toBe(1);
        const firstStamp = first.updatedAt;

        const updated = catalog.applyLabel(near(oneHot(0), 0.2, 3), "overload", "operator confirmed");
        expect(catalog.size).toBe(1);
        expect(updated).toBe(first);
        expect(updated.label).toBe("overload");
        expect(updated.diagnosis).toBe("operator confirmed");
        expect(updated.count).toBe(2);
        expect(updated.updatedAt).toBeGreaterThan(firstStamp);
    });

    it("export/import is a plain-JSON round trip with deep-copied entries", () => {
        const catalog = new RegimeCatalog("site-A", { matchThr: 0.08 });
        catalog.applyLabel(oneHot(0), "baseline");
        catalog.applyLabel(oneHot(2), "overload", "load step");

        const json = catalog.export();
        // Snapshot must be plain data (survives JSON serialization).
        const rehydrated = RegimeCatalog.import(JSON.parse(JSON.stringify(json)));

        expect(rehydrated.site).toBe("site-A");
        expect(rehydrated.matchThr).toBe(0.08);
        expect(rehydrated.size).toBe(2);
        expect(rehydrated.lookup(oneHot(2))!.label).toBe("overload");

        // Deep copy: mutating the import never reaches the original.
        rehydrated.applyLabel(oneHot(2), "renamed");
        expect(catalog.lookup(oneHot(2))!.label).toBe("overload");
    });
});

// ─── mergeCatalogs ──────────────────────────────────────────────────────────

describe("mergeCatalogs", () => {
    it("propagates a label learned at site A onto site B's near centroid", () => {
        const siteA = new RegimeCatalog("site-A");
        siteA.applyLabel(oneHot(0), "overload", "load step");
        siteA.applyLabel(oneHot(0), "overload"); // count 2: A's evidence wins
        siteA.applyLabel(oneHot(3), "fan_law");

        const siteB = new RegimeCatalog("site-B");
        const bCentroid = near(oneHot(0), 0.25, 6);
        siteB.applyLabel(bCentroid, "regime_2_unlabeled");
        siteB.applyLabel(oneHot(5), "idle");

        const merged = mergeCatalogs([siteA, siteB]);

        // k respected: the two near-duplicates collapse, the rest stay.
        expect(merged.size).toBe(3);

        // The label propagates: a site-B-near-A embedding now resolves
        // to A's label, with the counts summed.
        const hit = merged.lookup(near(bCentroid, 0.1, 7));
        expect(hit).not.toBeNull();
        expect(hit!.label).toBe("overload");
        expect(hit!.entry.count).toBe(3);
        expect(hit!.entry.diagnosis).toBe("load step");
        expect(hit!.entry.site).toBe("site-A,site-B");

        // Disjoint regimes keep their site and label untouched.
        expect(merged.lookup(oneHot(3))!.entry.site).toBe("site-A");
        expect(merged.lookup(oneHot(5))!.label).toBe("idle");

        // Pure function: the sources are intact.
        expect(siteA.size).toBe(2);
        expect(siteB.size).toBe(2);
        expect(siteB.lookup(bCentroid)!.label).toBe("regime_2_unlabeled");
    });

    it("breaks count ties lexicographically (stable winner)", () => {
        const siteA = new RegimeCatalog("site-A");
        siteA.applyLabel(oneHot(0), "beta");
        const siteB = new RegimeCatalog("site-B");
        siteB.applyLabel(near(oneHot(0), 0.2, 4), "alpha");

        const merged = mergeCatalogs([siteA, siteB]);
        expect(merged.size).toBe(1);
        expect(merged.entries[0].label).toBe("alpha");
        expect(merged.entries[0].count).toBe(2);
    });
});

// ─── Protocol: device server ────────────────────────────────────────────────

const CAUSES = ["overload_step", "fan_quadratic", "load_shed"];

/** Tiny 3-cause diagnostic over a 4-d embedding (weights irrelevant here). */
function tinyDiagnosticBytes(): Uint8Array {
    // prettier-ignore
    return buildDiagnosticBytes(4, 3, [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
        0, 0, 0,
    ], [0, 0, 0]);
}

/** 3-cause diagnostic weights over the real 5-d encoder embedding. */
// prettier-ignore
const DIAG_W5x3 = [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
    0, 0, 0,
    0, 0, 0,
];

/**
 * Device with a REAL encoder and one buffered gated window (constant
 * level 0.4 opens the gate after `settle` and fills one frame), so the
 * push-triggers-run path of diagnostic_load_model actually runs.
 */
function deviceWithWindow(): { device: MotorwatchDevice; server: InProcessDeviceServer } {
    const device = new MotorwatchDevice({ frameSize: 16, deviceId: "edge-diag" });
    expect(device.loadEncoder(buildEncoderBytes(16)).ok).toBe(true);
    const server = new InProcessDeviceServer(device);
    device.feedSamples(new Array<number>(60).fill(0.4));
    expect(device.hasEmbedding).toBe(true);
    return { device, server };
}

describe("InProcessDeviceServer", () => {
    it("device_reset without confirm fails with CONFIRM_REQUIRED and erases nothing", () => {
        const device = new MotorwatchDevice({ deviceId: "edge-test" });
        device.applyLabel("overload", oneHot(0));
        const server = new InProcessDeviceServer(device);

        const denied = server.callTool("device_reset", { scope: "all" });
        expect(isMcpError(denied)).toBe(true);
        if (isMcpError(denied)) {
            expect(denied.code).toBe(MCP_ERROR.CONFIRM_REQUIRED);
            expect(denied.data).toMatchObject({ tool: "device_reset" });
        }
        expect(device.labelCount).toBe(1);

        const confirmed = server.callTool("device_reset", { scope: "all", confirm: true });
        expect(confirmed).toMatchObject({ state: "cold_start" });
        expect(device.labelCount).toBe(0);
    });

    it("rejects an invalid reset scope and unknown tools with JSON-RPC codes", () => {
        const server = new InProcessDeviceServer(new MotorwatchDevice());
        const badScope = server.callTool("device_reset", { scope: "everything", confirm: true });
        expect(isMcpError(badScope) && badScope.code === MCP_ERROR.INVALID_PARAMS).toBe(true);

        const unknown = server.callTool("frobnicate", {});
        expect(isMcpError(unknown) && unknown.code === MCP_ERROR.METHOD_NOT_FOUND).toBe(true);
    });

    it("diagnostic_load_model with a wrong sha256 returns ok:false and keeps the previous bank active", () => {
        const device = new MotorwatchDevice();
        const server = new InProcessDeviceServer(device);
        const bytes = tinyDiagnosticBytes();

        const good = server.callTool("diagnostic_load_model", {
            model_bytes: bytes,
            sha256: sha256Hex(bytes),
            causes: CAUSES,
            name: "diag-v1.onnx",
        }) as IDiagnosticLoadModelResult;
        expect(good.ok).toBe(true);
        // No gated window has been produced yet: load ok, no run.
        expect(good.ran).toBe(false);
        expect(device.status().diagnostic).toMatchObject({ loaded: true, name: "diag-v1.onnx", causes: CAUSES });

        const evil = server.callTool("diagnostic_load_model", {
            model_bytes: bytes,
            sha256: "0".repeat(64),
            causes: ["tampered"],
            name: "diag-v2.onnx",
        }) as IDiagnosticLoadModelResult;
        expect(evil.ok).toBe(false);
        expect(evil.error).toMatch(/SHA-256 mismatch/);
        expect(evil.sha256).toBe(sha256Hex(bytes));

        // Previous diagnostic model fully intact: name AND causes.
        expect(device.status().diagnostic).toMatchObject({ loaded: true, name: "diag-v1.onnx", causes: CAUSES });
    });

    it("catalog_apply_label references the label locally and emits catalog_updated", () => {
        const device = new MotorwatchDevice();
        const server = new InProcessDeviceServer(device);
        const notifications: McpNotification[] = [];
        server.subscribe((n) => notifications.push(n));

        const missing = server.callTool("catalog_apply_label", { label: "overload" });
        expect(isMcpError(missing) && missing.code === MCP_ERROR.INVALID_PARAMS).toBe(true);

        const applied = server.callTool("catalog_apply_label", { label: "overload", centroid: oneHot(1) });
        expect(applied).toMatchObject({ applied: true, labels: 1 });
        expect(device.labelFor(near(oneHot(1), 0.2, 0))!.label).toBe("overload");
        expect(notifications).toContainEqual({ method: "catalog_updated", params: { label: "overload", labels: 1 } });
    });

    it("diagnostic_load_model rejects a score-dimension mismatch atomically: previous bank AND causes stay active", () => {
        const { device, server } = deviceWithWindow();
        const good = buildDiagnosticBytes(ENCODER_DIM, 3, DIAG_W5x3, [0, 0, 0]);
        const first = server.callTool("diagnostic_load_model", { model_bytes: good, causes: CAUSES, name: "diag-v1.onnx" }) as IDiagnosticLoadModelResult;
        expect(first.ok).toBe(true);
        expect(first.ran).toBe(true); // a gated window was buffered

        // FOUR scores pushed for THREE causes: the declared output
        // shape gate must reject BEFORE the bank swap.
        // prettier-ignore
        const fourScores = buildDiagnosticBytes(ENCODER_DIM, 4, [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
            0, 0, 0, 0,
        ], [0, 0, 0, 0]);
        const evil = server.callTool("diagnostic_load_model", { model_bytes: fourScores, causes: ["a", "b", "c"], name: "diag-v2.onnx" }) as IDiagnosticLoadModelResult;
        expect(isMcpError(evil)).toBe(false); // a rejected push is a report, not a protocol error
        expect(evil.ok).toBe(false);
        expect(evil.error).toMatch(/Output shape mismatch/);

        // Previous bank, name AND causes fully intact (atomic promise)...
        expect(device.status().diagnostic).toMatchObject({ loaded: true, name: "diag-v1.onnx", causes: CAUSES });
        // ...and a later alarm still diagnoses with the old bank.
        const outcome = device.runDiagnostic();
        expect(Object.keys(outcome.scores).sort()).toEqual([...CAUSES].sort());
        expect(CAUSES).toContain(outcome.topCause);
    });

    it("diagnostic_load_model reports a post-load diagnosis failure as ok:true / ran:false, not as a rejected push", () => {
        const { server } = deviceWithWindow();
        // Declared output [1, 0]: the dynamic dim is a wildcard, so the
        // static gate cannot catch the 3-scores-vs-4-causes mismatch;
        // the bank swap is legitimate and only the RUN fails.
        const dynamicOut = buildDiagnosticBytes(ENCODER_DIM, 3, DIAG_W5x3, [0, 0, 0], 0);
        const result = server.callTool("diagnostic_load_model", { model_bytes: dynamicOut, causes: ["a", "b", "c", "d"], name: "diag-dyn.onnx" }) as IDiagnosticLoadModelResult;
        expect(isMcpError(result)).toBe(false);
        expect(result.ok).toBe(true); // the LOAD succeeded
        expect(result.ran).toBe(false); // the diagnosis did not run to completion
        expect(result.error).toMatch(/3 scores for 4 causes/);
    });

    it("counts encoder-less frames as dropped, exposes them on status(), and clears them on reset all", () => {
        // NO encoder loaded: gated frames reach the adapter and are
        // swallowed; the loss must be observable.
        const device = new MotorwatchDevice({ frameSize: 16, deviceId: "edge-dropped" });
        device.feedSamples(new Array<number>(60).fill(0.4));
        expect(device.status().windowsSeen).toBeGreaterThanOrEqual(1);
        expect(device.status().encoder.dropped).toBeGreaterThanOrEqual(1);

        device.reset("all", true);
        expect(device.status().encoder.dropped).toBe(0);
    });

    it('device_reset scope "profiles" also erases the buffered window and embedding', () => {
        const { device, server } = deviceWithWindow();
        expect(device.lastWindow).not.toBeNull();

        const result = server.callTool("device_reset", { scope: "profiles", confirm: true });
        expect(result).toMatchObject({ erased: ["profiles", "windows"], state: "cold_start" });
        expect(device.status().k).toBe(0);
        expect(device.hasEmbedding).toBe(false);
        expect(device.lastWindow).toBeNull();
    });

    it("diagnostic_run diagnoses the buffered window with the loaded bank, no byte transfer", () => {
        const { server } = deviceWithWindow();
        const notifications: McpNotification[] = [];
        server.subscribe((n) => notifications.push(n));

        // No bank yet: not a protocol error, just a no-run report.
        const noBank = server.callTool("diagnostic_run", {});
        expect(noBank).toMatchObject({ ok: true, ran: false });
        expect((noBank as { error?: string }).error).toMatch(/no diagnostic model/);

        const bytes = buildDiagnosticBytes(ENCODER_DIM, 3, DIAG_W5x3, [0, 0, 0]);
        expect((server.callTool("diagnostic_load_model", { model_bytes: bytes, causes: CAUSES, name: "diag-v1.onnx" }) as IDiagnosticLoadModelResult).ok).toBe(true);

        const rerun = server.callTool("diagnostic_run", {});
        expect(rerun).toMatchObject({ ok: true, ran: true });
        expect(notifications.filter((n) => n.method === "diagnostic_result")).toHaveLength(2); // push-triggered + on-demand

        const badParams = server.callTool("diagnostic_run", { causes: [] });
        expect(isMcpError(badParams) && badParams.code === MCP_ERROR.INVALID_PARAMS).toBe(true);
    });

    it("capture_set_profile applies presets with explicit overrides", () => {
        const device = new MotorwatchDevice();
        const server = new InProcessDeviceServer(device);

        const effective = server.callTool("capture_set_profile", { preset: "nominal", break_hold: 5 });
        expect(effective).toEqual({ epsilon: 0.03, settle: 40, break_hold: 5, ema_alpha: 0.05 });
        expect(device.captureProfile()).toEqual({ epsilon: 0.03, settle: 40, breakHold: 5, emaAlpha: 0.05 });

        const bad = server.callTool("capture_set_profile", { preset: "turbo" });
        expect(isMcpError(bad) && bad.code === MCP_ERROR.INVALID_PARAMS).toBe(true);
    });
});

// ─── CentralStation against a stub device server ────────────────────────────

class StubDeviceServer implements IDeviceServer {
    public readonly calls: Array<{ name: string; params: Record<string, unknown> }> = [];
    private readonly _subscribers: McpNotificationHandler[] = [];
    private readonly _diagnostic: IDiagnosticResultNotification["params"];

    public constructor(diagnostic: IDiagnosticResultNotification["params"]) {
        this._diagnostic = diagnostic;
    }

    public subscribe(handler: McpNotificationHandler): () => void {
        this._subscribers.push(handler);
        return () => {
            const i = this._subscribers.indexOf(handler);
            if (i >= 0) this._subscribers.splice(i, 1);
        };
    }

    public emit(notification: McpNotification): void {
        for (const handler of [...this._subscribers]) handler(notification);
    }

    public callTool(name: string, params: Record<string, unknown> = {}): unknown {
        this.calls.push({ name, params });
        if (name === "diagnostic_load_model") {
            // Mirror the device contract: the push triggers the run and
            // the verdict travels as a synchronous notification.
            this.emit({ method: "diagnostic_result", params: this._diagnostic });
            return { ok: true, sha256: "stub", ran: true };
        }
        if (name === "diagnostic_run") {
            // Same run-and-notify leg, no byte transfer.
            this.emit({ method: "diagnostic_result", params: this._diagnostic });
            return { ok: true, ran: true };
        }
        if (name === "catalog_apply_label") {
            return { applied: true, labels: 1 };
        }
        return { code: MCP_ERROR.METHOD_NOT_FOUND, message: `unknown tool "${name}"` };
    }
}

function alarmFor(centroid: number[], k: number): McpNotification {
    return { method: "alarm", params: { code: "NEW_REGIME", severity: "warn", detail: { k, label: k - 1, distance: 0.2, centroid } } };
}

describe("CentralStation (stub device server)", () => {
    const centroid = oneHot(2);
    const diagnostic: IDiagnosticResultNotification["params"] = {
        top_cause: "bearing_wear",
        score: 2.1,
        runner_up: "imbalance",
        margin: 1.4,
        scores: { bearing_wear: 2.1, imbalance: 0.7, looseness: -0.3 },
        k: 2,
        label: 1,
        centroid,
    };

    it("pushes the diagnostic on NEW_REGIME, labels by top cause, applies on both sides", () => {
        const station = new CentralStation("site-A");
        station.registerDiagnostic("default", { bytes: tinyDiagnosticBytes(), sha256: "stub", causes: CAUSES });
        const stub = new StubDeviceServer(diagnostic);
        station.connect(stub);

        stub.emit(alarmFor(centroid, 2));

        expect(stub.calls.map((c) => c.name)).toEqual(["diagnostic_load_model", "catalog_apply_label"]);
        expect(stub.calls[1].params).toMatchObject({ label: "bearing_wear", centroid });

        expect(station.history).toHaveLength(1);
        expect(station.history[0].label).toBe("bearing_wear");
        expect(station.history[0].diagnostic).toBe(diagnostic);
        expect(station.catalog.lookup(centroid)!.label).toBe("bearing_wear");
        expect(station.catalog.lookup(centroid)!.entry.diagnosis).toBe("bearing_wear");
    });

    it("labels regime_<k>_unlabeled when the margin is below the threshold", () => {
        const station = new CentralStation("site-A", { labelMargin: 2.0 });
        station.registerDiagnostic("default", { bytes: tinyDiagnosticBytes(), causes: CAUSES });
        const stub = new StubDeviceServer(diagnostic); // margin 1.4 < 2.0
        station.connect(stub);

        stub.emit(alarmFor(centroid, 2));

        expect(station.history[0].label).toBe("regime_2_unlabeled");
        expect(station.catalog.lookup(centroid)!.label).toBe("regime_2_unlabeled");
    });

    it("fast path: a centroid the catalog already knows skips the diagnostic push", () => {
        const station = new CentralStation("site-A");
        station.registerDiagnostic("default", { bytes: tinyDiagnosticBytes(), causes: CAUSES });
        station.catalog.applyLabel(centroid, "bearing_wear", "confirmed", "site-B");
        const stub = new StubDeviceServer(diagnostic);
        station.connect(stub);

        stub.emit(alarmFor(near(centroid, 0.2, 6), 2));

        expect(stub.calls.map((c) => c.name)).toEqual(["catalog_apply_label"]);
        expect(stub.calls[0].params).toMatchObject({ label: "bearing_wear" });
        expect(station.history[0].fromCatalog).toBe(true);
        expect(station.history[0].label).toBe("bearing_wear");
    });

    it("dedups the byte push: a repeated alarm with the same bank sha runs the diagnosis without re-sending bytes", () => {
        const station = new CentralStation("site-A");
        station.registerDiagnostic("default", { bytes: tinyDiagnosticBytes(), sha256: "stub", causes: CAUSES });
        const stub = new StubDeviceServer(diagnostic);
        station.connect(stub);

        stub.emit(alarmFor(oneHot(3), 2));
        stub.emit(alarmFor(oneHot(4), 3));

        // Second alarm: same bank already on the device -> diagnostic_run.
        expect(stub.calls.map((c) => c.name)).toEqual(["diagnostic_load_model", "catalog_apply_label", "diagnostic_run", "catalog_apply_label"]);
        expect(station.pushedCount).toBe(1);
        expect(station.history).toHaveLength(2);
        expect(station.history[1].label).toBe("bearing_wear");
        expect(station.history[1].error).toBeUndefined();
    });

    it("re-pushes when the registered bank changes (different sha)", () => {
        const station = new CentralStation("site-A");
        station.registerDiagnostic("default", { bytes: tinyDiagnosticBytes(), sha256: "stub", causes: CAUSES });
        const stub = new StubDeviceServer(diagnostic);
        station.connect(stub);

        stub.emit(alarmFor(oneHot(3), 2));
        station.registerDiagnostic("default", { bytes: tinyDiagnosticBytes(), sha256: "stub-v2", causes: CAUSES });
        stub.emit(alarmFor(oneHot(4), 3));

        expect(stub.calls.map((c) => c.name)).toEqual(["diagnostic_load_model", "catalog_apply_label", "diagnostic_load_model", "catalog_apply_label"]);
        expect(station.pushedCount).toBe(2);
    });

    it("caps the alarm history as a ring (editable, default 256)", () => {
        expect(new CentralStation("site-X").historyMax).toBe(256);

        const station = new CentralStation("site-A", { historyMax: 2 });
        station.registerDiagnostic("default", { bytes: tinyDiagnosticBytes(), sha256: "stub", causes: CAUSES });
        const stub = new StubDeviceServer(diagnostic);
        station.connect(stub);

        stub.emit(alarmFor(oneHot(3), 2));
        stub.emit(alarmFor(oneHot(4), 3));
        stub.emit(alarmFor(oneHot(5), 4));

        // Oldest entry evicted, the two newest survive in order.
        expect(station.history).toHaveLength(2);
        expect(station.history[0].alarm.detail.centroid).toEqual(oneHot(4));
        expect(station.history[1].alarm.detail.centroid).toEqual(oneHot(5));
    });
});

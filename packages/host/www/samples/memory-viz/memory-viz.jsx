// ============================================================
// MemoryViz — top-level component
// ============================================================
const { useState: useStateMV, useMemo: useMemoMV, useEffect: useEffectMV, useCallback: useCallbackMV, useRef: useRefMV } = React;

function MemoryViz() {
  const [theme, setTheme] = useStateMV("dark");
  const [loaded, setLoaded] = useStateMV(false);
  const [loading, setLoading] = useStateMV(false);
  const [loadError, setLoadError] = useStateMV(null);
  const [policy, setPolicy] = useStateMV("no-recycling");
  const [order, setOrder] = useStateMV("kahn-fifo");
  const [step, setStep] = useStateMV(0);
  const [hoveredTensor, setHoveredTensor] = useStateMV(null);
  const [hoveredOpNode, setHoveredOpNode] = useStateMV(null);

  const dark = theme === "dark";

  useEffectMV(() => {
    document.body.style.background = dark ? "#0a0a0a" : "#fafafa";
    document.body.style.color = dark ? "#e5e5e5" : "#262626";
  }, [dark]);

  const runLoad = useCallbackMV(async (loaderFn, label) => {
    if (loading) return;
    setLoading(true);
    setLoadError(null);
    try {
      const summary = await loaderFn();
      setStep(Math.min(5, Math.max(0, summary.nodes - 1)));
      setLoaded(true);
    } catch (err) {
      console.error(`${label} failed:`, err);
      setLoadError(err && err.message ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleLoadKws = useCallbackMV(() => {
    runLoad(() => loadKwsData(), "loadKwsData");
  }, [runLoad]);

  const handleLoadFile = useCallbackMV((file) => {
    runLoad(() => loadOnnxFile(file), `loadOnnxFile(${file.name})`);
  }, [runLoad]);

  // Data for current policy/order
  const tensors = useMemoMV(() => loaded ? getAllocation(policy, order) : [], [loaded, policy, order]);
  const peak = useMemoMV(() => computePeak(tensors), [tensors]);
  const peakInfo = useMemoMV(() => peakStep(tensors, NODES.length), [tensors]);
  const liveCountInfo = useMemoMV(() => maxLiveCount(tensors, NODES.length), [tensors]);
  const memoryOverTime = useMemoMV(() => computeMemoryOverTime(tensors, NODES.length), [tensors]);
  const currentMem = useMemoMV(() => computeCurrentMemory(tensors, Math.round(step)), [tensors, step]);
  const frag = useMemoMV(() => fragmentationAt(tensors, NODES.length), [tensors]);

  // All policy peaks for the comparator (use same order). `loaded` is
  // in the deps so the memo re-runs once the async fetch populates
  // ALLOCATIONS (otherwise the first computation sees the empty arrays
  // and the comparator gets stuck at 0 KB).
  const policyPeaks = useMemoMV(() => {
    const out = {};
    for (const p of POLICIES) {
      const t = getAllocation(p, order);
      out[p] = computePeak(t);
    }
    return out;
  }, [order, loaded]);

  // Ops actually present in current allocation
  const usedOps = useMemoMV(() => {
    const set = new Set();
    tensors.forEach(t => set.add(t.op));
    return Array.from(set);
  }, [tensors]);

  if (!loaded) {
    return (
      <div className="h-full w-full flex flex-col">
        <Header
          loaded={false}
          onLoad={handleLoadKws}
          policy={policy} setPolicy={setPolicy}
          order={order} setOrder={setOrder}
          theme={theme} setTheme={setTheme}
        />
        <EmptyState
          onLoadExample={handleLoadKws}
          onFile={handleLoadFile}
          loading={loading}
          error={loadError}
          theme={theme}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col" style={{ background: dark ? "#0a0a0a" : "#fafafa" }}>
      <Header
        loaded={true}
        onLoad={handleLoadKws}
        policy={policy} setPolicy={setPolicy}
        order={order} setOrder={setOrder}
        theme={theme} setTheme={setTheme}
      />
      <Timeline
        step={step}
        setStep={setStep}
        hoveredOp={hoveredOpNode}
        setHoveredOp={setHoveredOpNode}
        theme={theme}
      />
      <div className="flex-1 flex min-h-0">
        {/* Arena */}
        <div className="relative flex-1 min-w-0">
          <Arena
            tensors={tensors}
            step={step}
            hovered={hoveredTensor}
            setHovered={setHoveredTensor}
            peak={peak}
            peakStepInfo={peakInfo}
            theme={theme}
            onHoverProducer={setHoveredOpNode}
          />
          <ArenaLegend usedOps={usedOps} theme={theme} />
        </div>
        <Metrics
          policy={policy} order={order} step={step}
          tensors={tensors}
          peak={peak}
          peakInfo={peakInfo}
          liveCountInfo={liveCountInfo}
          memoryOverTime={memoryOverTime}
          currentMem={currentMem}
          frag={frag}
          policyPeaks={policyPeaks}
          flashBytes={FLASH_BYTES}
          target={TARGET}
          onSetPolicy={setPolicy}
          theme={theme}
        />
      </div>
    </div>
  );
}

function EmptyState({ onLoadExample, onFile, loading, error, theme }) {
  const dark = theme === "dark";
  const fileInputRef = useRefMV(null);
  const [dragHover, setDragHover] = useStateMV(false);

  const onPickFile = useCallbackMV((e) => {
    const f = e.target.files && e.target.files[0];
    if (f) onFile(f);
    if (e.target) e.target.value = "";  // allow re-selecting same file
  }, [onFile]);

  const onDrop = useCallbackMV((e) => {
    e.preventDefault();
    setDragHover(false);
    if (loading) return;
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile, loading]);

  const onDragOver = useCallbackMV((e) => {
    e.preventDefault();
    if (!loading) setDragHover(true);
  }, [loading]);

  const onDragLeave = useCallbackMV(() => {
    setDragHover(false);
  }, []);

  const onMainClick = useCallbackMV(() => {
    if (loading) return;
    fileInputRef.current?.click();
  }, [loading]);

  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ background: dark ? "#0a0a0a" : "#fafafa" }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".onnx,application/octet-stream"
        style={{ display: "none" }}
        onChange={onPickFile}
      />
      <div className="max-w-lg w-full text-center">
        <div className={`mx-auto mb-6 w-14 h-14 grid place-items-center rounded-lg border ${
          dark ? "bg-[#0f0f0f] border-[#1f1f1f]" : "bg-white border-neutral-200"
        }`}>
          <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2"  width="6" height="4" rx="1" fill="#7c9eb2" />
            <rect x="8" y="2"  width="7" height="4" rx="1" fill="#a9c46c" />
            <rect x="1" y="7"  width="9" height="3" rx="1" fill="#d4a373" />
            <rect x="11" y="7" width="4" height="3" rx="1" fill="#c08497" />
            <rect x="1" y="11" width="5" height="3" rx="1" fill="#9f86c0" />
            <rect x="7" y="11" width="8" height="3" rx="1" fill="#f4a261" />
          </svg>
        </div>
        <h1 className={`text-xl font-semibold mb-2 ${dark ? "text-neutral-100" : "text-neutral-900"}`}>
          Visualisez la mémoire de votre modèle ONNX
        </h1>
        <p className={`text-sm mb-8 leading-relaxed ${dark ? "text-neutral-500" : "text-neutral-500"}`}>
          Memory Viz analyse l'ordre d'exécution des nœuds et le mapping mémoire des tenseurs intermédiaires
          pour un déploiement sur microcontrôleur (ESP32).
          Comparez politiques d'allocation et ordonnancement avant flashage.
        </p>
        <button
          onClick={onMainClick}
          disabled={loading}
          className={`mx-auto h-12 px-5 flex items-center gap-3 rounded-md border border-dashed transition-all ${
            dragHover
              ? (dark ? "border-amber-400 bg-[#101010] text-amber-300" : "border-amber-500 bg-amber-50 text-amber-700")
              : loading
                ? (dark ? "border-amber-400/40 text-amber-400 cursor-wait" : "border-amber-500/60 text-amber-600 cursor-wait")
                : (dark
                    ? "border-[#2a2a2a] hover:border-amber-400/40 hover:bg-[#101010] text-neutral-300"
                    : "border-neutral-300 hover:border-amber-500/60 hover:bg-white text-neutral-700")
          }`}
        >
          <IconUpload size={16} className={dark ? "text-neutral-500" : "text-neutral-400"} />
          <div className="flex flex-col items-start">
            <span className="text-sm">
              {loading
                ? "Chargement du modèle..."
                : dragHover
                  ? "Déposez le .onnx ici"
                  : "Charger un modèle ou glisser-déposer"}
            </span>
            <span className={`text-[11px] font-mono ${dark ? "text-neutral-600" : "text-neutral-500"}`}>
              {loading ? "fetch + parse + plan" : ".onnx (≤ 4 MB recommandé)"}
            </span>
          </div>
        </button>
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={onLoadExample}
            disabled={loading}
            className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-colors ${
              loading
                ? (dark ? "bg-[#0f0f0f] border-[#1f1f1f] text-neutral-600 cursor-wait" : "bg-white border-neutral-200 text-neutral-400 cursor-wait")
                : (dark ? "bg-[#0f0f0f] border-[#1f1f1f] hover:border-[#2f2f2f] text-neutral-400" : "bg-white border-neutral-200 hover:border-neutral-300 text-neutral-600")
            }`}
          >
            <span className={dark ? "text-neutral-600" : "text-neutral-500"}>charger l'exemple →</span> kws_conv_tiny.onnx
          </button>
        </div>
        {error && (
          <div
            className={`mt-6 mx-auto max-w-md text-[11px] font-mono rounded border px-3 py-2 text-left ${
              dark ? "bg-red-950/30 border-red-900/40 text-red-300" : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <div className={`text-[10px] uppercase tracking-wider mb-1 ${dark ? "text-red-500" : "text-red-500"}`}>load error</div>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MemoryViz, EmptyState });

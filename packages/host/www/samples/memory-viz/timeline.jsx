// ============================================================
// Timeline strip + scrubber
// ============================================================
const { useState: useStateT, useRef: useRefT, useMemo: useMemoT, useEffect: useEffectT, useCallback: useCallbackT } = React;

function Timeline({ step, setStep, hoveredOp, setHoveredOp, theme }) {
  const dark = theme === "dark";
  const ref = useRefT(null);
  const [dragging, setDragging] = useStateT(false);
  const [hoverNode, setHoverNode] = useStateT(null);

  const totalDur = useMemoT(() => NODES.reduce((s, n) => s + n.duration, 0), []);
  const segments = useMemoT(() => {
    let acc = 0;
    return NODES.map((n) => {
      const start = acc / totalDur;
      acc += n.duration;
      const end = acc / totalDur;
      return { ...n, start, end, width: (end - start) };
    });
  }, [totalDur]);

  const current = NODES[Math.round(step)] || NODES[0];
  const currentSeg = segments[Math.round(step)];

  // Convert step -> normalized x using segments (since segments have variable widths)
  const stepToFrac = (s) => {
    const i = Math.floor(s);
    const f = s - i;
    if (i >= segments.length) return 1;
    if (i < 0) return 0;
    return segments[i].start + segments[i].width * f;
  };
  const fracToStep = (frac) => {
    for (let i = 0; i < segments.length; i++) {
      if (frac <= segments[i].end) {
        const local = (frac - segments[i].start) / Math.max(1e-9, segments[i].width);
        return i + Math.max(0, Math.min(1, local));
      }
    }
    return segments.length - 1;
  };

  const onPointerMove = useCallbackT((e) => {
    if (!dragging || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setStep(fracToStep(frac));
  }, [dragging, setStep]);

  useEffectT(() => {
    if (!dragging) return;
    const up = () => setDragging(false);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, onPointerMove]);

  const onBarClick = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    setStep(fracToStep(frac));
    setDragging(true);
  };

  // Tensor counts per node (for live count chip)
  const liveCounts = useMemoT(() => {
    return NODES.map((_, i) => BASE_TENSORS.filter(t => t.birthStep <= i && t.deathStep >= i).length);
  }, []);

  // Find tensors produced at the current node, and tensors consumed from
  // OTHER nodes (self-produced scratch buffers are excluded from IN to avoid
  // listing them on both sides).
  const producedAtCurrent = BASE_TENSORS.filter(t => t.producer === current.id);
  const consumedAtCurrent = BASE_TENSORS.filter(t =>
    t.consumers.includes(current.id) && t.producer !== current.id
  );

  return (
    <div
      className={`border-b ${dark ? "border-[#1f1f1f] bg-[#0a0a0a]" : "border-neutral-200 bg-white"}`}
      style={{ flex: "0 0 140px" }}
    >
      <div className="h-full flex flex-col">
        {/* Strip */}
        <div className="px-4 pt-2 pb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconLayers size={11} className={dark ? "text-neutral-500" : "text-neutral-400"} />
            <span className={`text-[10px] uppercase tracking-wider font-medium ${dark ? "text-neutral-500" : "text-neutral-500"}`}>
              Execution Timeline
            </span>
            <span className={`text-[10px] font-mono ${dark ? "text-neutral-600" : "text-neutral-400"}`}>
              {NODES.length} nodes · {totalDur.toFixed(1)} ms total
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-mono ${dark ? "text-neutral-500" : "text-neutral-500"}`}>
              step <span className={dark ? "text-amber-400" : "text-amber-600"}>{Math.round(step).toString().padStart(2, "0")}</span> / {NODES.length - 1}
            </span>
          </div>
        </div>

        {/* The bar */}
        <div
          ref={ref}
          className="relative mx-4 select-none cursor-pointer"
          style={{ height: 28 }}
          onPointerDown={onBarClick}
        >
          {/* Segments */}
          <div className="absolute inset-0 flex rounded overflow-hidden"
               style={{ background: dark ? "#0d0d0d" : "#f5f5f5", border: `1px solid ${dark ? "#1f1f1f" : "#e5e5e5"}` }}>
            {segments.map((seg, i) => {
              const isCurrent = Math.round(step) === i;
              const isOpHover = hoveredOp === i;
              const c = OP_COLORS[seg.op] || "#525252";
              return (
                <div
                  key={seg.id}
                  className="relative h-full transition-all"
                  style={{
                    width: `${seg.width * 100}%`,
                    background: isCurrent
                      ? c
                      : isOpHover
                        ? c + "cc"
                        : c + "33",
                    borderRight: i < segments.length - 1 ? `1px solid ${dark ? "#0a0a0a" : "#ffffff"}` : "none",
                    opacity: isCurrent ? 1 : 0.85,
                  }}
                  onMouseEnter={() => setHoverNode(seg)}
                  onMouseLeave={() => setHoverNode(null)}
                  onPointerDown={(e) => { e.stopPropagation(); setStep(i); }}
                >
                  {/* node id label, visible if wide enough */}
                  {seg.width > 0.06 && (
                    <span
                      className="absolute inset-0 grid place-items-center text-[9px] font-mono pointer-events-none"
                      style={{
                        color: isCurrent ? "#0a0a0a" : (dark ? "#e5e5e5" : "#262626"),
                        opacity: isCurrent ? 0.9 : 0.7,
                        textShadow: !isCurrent && !dark ? "0 0 2px rgba(255,255,255,0.6)" : "none",
                        fontWeight: isCurrent ? 600 : 500,
                      }}
                    >
                      {seg.name}
                    </span>
                  )}
                  {/* live tensor count micro-dot */}
                  <div
                    className="absolute bottom-0.5 right-1 text-[8px] font-mono pointer-events-none"
                    style={{ color: isCurrent ? "#0a0a0a" : (dark ? "#737373" : "#a3a3a3") }}
                  >
                    {liveCounts[i]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrubber playhead */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: `${stepToFrac(step) * 100}%`,
              transform: "translateX(-50%)",
              transition: dragging ? "none" : "left 120ms ease-out",
            }}
          >
            <div className="absolute top-0 bottom-0 w-px" style={{ background: "#fde047" }} />
            <div
              className="scrubber-handle absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-auto"
              onPointerDown={(e) => { e.stopPropagation(); setDragging(true); }}
              style={{ width: 14, height: 30 }}
            >
              <div className="scrubber-grip absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-sm" style={{ background: "#fde047" }} />
            </div>
          </div>

          {/* Hover tooltip */}
          {hoverNode && (
            <div
              className={`absolute -top-1 -translate-y-full pointer-events-none z-30 rounded px-2 py-1.5 text-[11px] font-mono whitespace-nowrap shadow-xl ${
                dark ? "bg-[#1a1a1a] border border-[#2f2f2f] text-neutral-200" : "bg-white border border-neutral-200 text-neutral-800"
              }`}
              style={{
                left: `${(hoverNode.start + hoverNode.width / 2) * 100}%`,
                transform: "translate(-50%, -100%)",
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm" style={{ background: OP_COLORS[hoverNode.op] }} />
                <span className="font-semibold">{hoverNode.name}</span>
                <span className={dark ? "text-neutral-500" : "text-neutral-500"}>{hoverNode.op}</span>
              </div>
              <div className={dark ? "text-neutral-500" : "text-neutral-500"}>
                step {hoverNode.id} · {hoverNode.duration.toFixed(2)} ms · {liveCounts[hoverNode.id]} live tensors
              </div>
            </div>
          )}
        </div>

        {/* Current node info card */}
        <div className="px-4 pt-1.5 pb-2 flex-1">
          <div className={`h-full flex items-center gap-3 rounded px-2.5 py-1.5 ${
            dark ? "bg-[#0f0f0f] border border-[#1f1f1f]" : "bg-neutral-50 border border-neutral-200"
          }`}>
            <div className="flex items-center gap-2 pr-3 border-r" style={{ borderColor: dark ? "#1f1f1f" : "#e5e5e5" }}>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                    style={{ background: (OP_COLORS[current.op] || "#525252") + "22", color: OP_COLORS[current.op] || "#a3a3a3" }}>
                {current.op}
              </span>
              <span className={`text-xs font-mono font-semibold ${dark ? "text-neutral-100" : "text-neutral-900"}`}>{current.name}</span>
              <span className={`text-[10px] font-mono ${dark ? "text-neutral-500" : "text-neutral-500"}`}>node #{current.id}</span>
            </div>
            {/* Inputs */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className={`text-[9px] uppercase tracking-wider ${dark ? "text-neutral-600" : "text-neutral-500"}`}>in</span>
              <div className="flex items-center gap-1 min-w-0 flex-wrap">
                {consumedAtCurrent.length === 0 ? (
                  <span className={`text-[10px] font-mono ${dark ? "text-neutral-600" : "text-neutral-400"}`}>—</span>
                ) : consumedAtCurrent.map((t) => (
                  <span key={t.id} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    dark ? "bg-[#141414] border-[#1f1f1f] text-neutral-300" : "bg-white border-neutral-200 text-neutral-700"
                  }`}>
                    {t.name} <span className={dark ? "text-neutral-500" : "text-neutral-500"}>{fmtBytes(t.bytes)}</span>
                  </span>
                ))}
              </div>
            </div>
            <IconArrowRight size={11} className={dark ? "text-neutral-600" : "text-neutral-400"} />
            {/* Outputs */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[9px] uppercase tracking-wider ${dark ? "text-neutral-600" : "text-neutral-500"}`}>out</span>
              <div className="flex items-center gap-1 flex-wrap">
                {producedAtCurrent.length === 0 ? (
                  <span className={`text-[10px] font-mono ${dark ? "text-neutral-600" : "text-neutral-400"}`}>—</span>
                ) : producedAtCurrent.map((t) => (
                  <span key={t.id} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    dark ? "bg-[#141414] border-[#1f1f1f] text-neutral-300" : "bg-white border-neutral-200 text-neutral-700"
                  }`}>
                    {t.name} <span className={dark ? "text-neutral-500" : "text-neutral-500"}>{fmtBytes(t.bytes)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Timeline });

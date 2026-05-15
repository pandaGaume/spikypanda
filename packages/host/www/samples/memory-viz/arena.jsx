// ============================================================
// Arena — Gantt 2D of tensor lifetimes × memory offsets
// ============================================================
const { useState: useStateA, useRef: useRefA, useMemo: useMemoA, useEffect: useEffectA, useLayoutEffect } = React;

function useElementSize(ref) {
  const [size, setSize] = useStateA({ w: 800, h: 500 });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function Arena({ tensors, step, hovered, setHovered, peak, peakStepInfo, theme, onHoverProducer }) {
  const dark = theme === "dark";
  const wrapRef = useRefA(null);
  const { w, h } = useElementSize(wrapRef);

  // Layout
  const padding = { top: 24, right: 16, bottom: 28, left: 64 };
  const innerW = Math.max(100, w - padding.left - padding.right);
  const innerH = Math.max(100, h - padding.top - padding.bottom);
  const N = NODES.length;

  // X scale: step → px (0 .. N, inclusive)
  const xScale = (s) => padding.left + (s / N) * innerW;
  const stepWidthPx = innerW / N;

  // Y scale: bytes → px (0 at bottom, peak at top)
  // Use peak with 8% headroom for label space
  const yMax = peak * 1.08;
  const yScale = (bytes) => padding.top + innerH - (bytes / yMax) * innerH;

  // Memory ticks (Y axis)
  const yTicks = useMemoA(() => {
    const ticks = [];
    const niceStep = (() => {
      const target = peak / 5;
      const pow = Math.pow(2, Math.floor(Math.log2(target)));
      return [1, 2, 4, 8].map(m => m * pow).find(v => v >= target / 1.5) || pow;
    })();
    for (let y = 0; y <= peak; y += niceStep) {
      ticks.push(y);
    }
    if (ticks[ticks.length - 1] < peak) ticks.push(peak);
    return ticks;
  }, [peak]);

  // X axis ticks (step labels every node)
  const xTicks = useMemoA(() => NODES.map((_, i) => i), []);

  // Step boundary (current step) for vertical cursor (clamp to N-1)
  const stepClamped = Math.max(0, Math.min(N - 1, step));

  // Tooltip
  const [tip, setTip] = useStateA(null);

  // Tensors highlighted by hovered producer node from arena (sync)
  const hoveredProducerStep = hovered && tensors.find(t => t.id === hovered)?.producer;

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-hidden">
      <svg width={w} height={h} className="block">
        {/* Background */}
        <rect x={0} y={0} width={w} height={h} fill={dark ? "#0a0a0a" : "#fafafa"} />

        {/* Plot bg */}
        <rect
          x={padding.left}
          y={padding.top}
          width={innerW}
          height={innerH}
          fill={dark ? "#070707" : "#ffffff"}
          stroke={dark ? "#161616" : "#e5e5e5"}
        />

        {/* X grid */}
        {xTicks.map((i) => (
          <line
            key={`gx-${i}`}
            x1={xScale(i)} x2={xScale(i)}
            y1={padding.top} y2={padding.top + innerH}
            stroke={dark ? "#141414" : "#f0f0f0"}
            strokeWidth={1}
          />
        ))}

        {/* Y grid + labels */}
        {yTicks.map((b, i) => (
          <g key={`gy-${i}`}>
            <line
              x1={padding.left} x2={padding.left + innerW}
              y1={yScale(b)} y2={yScale(b)}
              stroke={dark ? "#141414" : "#f0f0f0"}
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={yScale(b) + 3}
              textAnchor="end"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
              fill={dark ? "#525252" : "#737373"}
            >
              {b === 0 ? "0" : (b / 1024).toFixed(b >= 10240 ? 0 : 1) + "K"}
            </text>
          </g>
        ))}

        {/* Y axis label */}
        <text
          x={14}
          y={padding.top + innerH / 2}
          textAnchor="middle"
          fontSize={10}
          fontFamily="JetBrains Mono, monospace"
          fill={dark ? "#525252" : "#737373"}
          transform={`rotate(-90, 14, ${padding.top + innerH / 2})`}
        >
          MEMORY OFFSET (KB)
        </text>

        {/* X axis labels (every other if crowded) */}
        {NODES.map((n, i) => {
          const x = xScale(i + 0.5);
          const showLabel = N <= 20 || i % 2 === 0;
          return (
            <g key={`xt-${i}`}>
              <line
                x1={xScale(i)} x2={xScale(i)}
                y1={padding.top + innerH}
                y2={padding.top + innerH + 4}
                stroke={dark ? "#262626" : "#d4d4d4"}
              />
              {showLabel && (
                <text
                  x={x}
                  y={padding.top + innerH + 16}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                  fill={dark ? "#525252" : "#737373"}
                >
                  {i}
                </text>
              )}
            </g>
          );
        })}
        <text
          x={padding.left + innerW / 2}
          y={h - 6}
          textAnchor="middle"
          fontSize={10}
          fontFamily="JetBrains Mono, monospace"
          fill={dark ? "#525252" : "#737373"}
        >
          EXECUTION STEP
        </text>

        {/* Peak line */}
        <g>
          <line
            x1={padding.left} x2={padding.left + innerW}
            y1={yScale(peak)} y2={yScale(peak)}
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.7}
          />
          <rect
            x={padding.left + innerW - 130}
            y={yScale(peak) - 18}
            width={126}
            height={14}
            rx={2}
            fill={dark ? "#0a0a0a" : "#fafafa"}
            stroke="#ef4444"
            strokeOpacity={0.5}
          />
          <text
            x={padding.left + innerW - 6}
            y={yScale(peak) - 7}
            textAnchor="end"
            fontSize={10}
            fontFamily="JetBrains Mono, monospace"
            fill="#ef4444"
            fontWeight={600}
          >
            PEAK {(peak / 1024).toFixed(1)} KB
          </text>
        </g>

        {/* Tensor rects */}
        {tensors.map((t) => {
          const x = xScale(t.birthStep);
          const x2 = xScale(t.deathStep + 1);
          const wRect = Math.max(2, x2 - x - 1);
          const y = yScale(t.offset + t.bytes);
          const hRect = Math.max(1.5, yScale(t.offset) - y);
          const color = OP_COLORS[t.op] || "#525252";
          const isHover = hovered === t.id;
          const isProducerHovered = hoveredProducerStep != null && t.id === hovered;
          const isOnCurrentStep = t.birthStep <= stepClamped && t.deathStep >= stepClamped;
          return (
            <g key={`t-${t.id}`}>
              <rect
                className="tensor-rect"
                x={x}
                y={y}
                width={wRect}
                height={hRect}
                rx={2}
                fill={color}
                fillOpacity={isHover ? 1 : isOnCurrentStep ? 0.92 : 0.65}
                stroke={isHover ? "#ffffff" : (dark ? "#0a0a0a" : "#ffffff")}
                strokeWidth={isHover ? 1.5 : 0.6}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => {
                  setHovered(t.id);
                  onHoverProducer?.(t.producer);
                  const rect = wrapRef.current.getBoundingClientRect();
                  setTip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    t,
                  });
                }}
                onMouseMove={(e) => {
                  const rect = wrapRef.current.getBoundingClientRect();
                  setTip((p) => p ? { ...p, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
                }}
                onMouseLeave={() => { setHovered(null); onHoverProducer?.(null); setTip(null); }}
              />
              {/* Label inside if rect is large enough */}
              {wRect > 50 && hRect > 14 && (
                <text
                  x={x + 4}
                  y={y + 10}
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                  fill={dark ? "#0a0a0a" : "#0a0a0a"}
                  fillOpacity={0.85}
                  fontWeight={600}
                  pointerEvents="none"
                >
                  {t.name}
                </text>
              )}
              {wRect > 80 && hRect > 26 && (
                <text
                  x={x + 4}
                  y={y + 21}
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                  fill={dark ? "#0a0a0a" : "#0a0a0a"}
                  fillOpacity={0.6}
                  pointerEvents="none"
                >
                  {(t.bytes / 1024).toFixed(1)}K
                </text>
              )}
            </g>
          );
        })}

        {/* Current step cursor */}
        <g pointerEvents="none">
          <rect
            x={xScale(stepClamped) - 1}
            y={padding.top}
            width={stepWidthPx}
            height={innerH}
            fill="#fde047"
            fillOpacity={0.07}
          />
          <line
            x1={xScale(stepClamped + 0.5)} x2={xScale(stepClamped + 0.5)}
            y1={padding.top} y2={padding.top + innerH}
            stroke="#fde047"
            strokeWidth={1}
            strokeOpacity={0.7}
          />
          <rect
            x={xScale(stepClamped + 0.5) - 14}
            y={padding.top - 18}
            width={28}
            height={14}
            rx={2}
            fill="#fde047"
          />
          <text
            x={xScale(stepClamped + 0.5)}
            y={padding.top - 8}
            textAnchor="middle"
            fontSize={9}
            fontFamily="JetBrains Mono, monospace"
            fill="#0a0a0a"
            fontWeight={700}
          >
            t={Math.round(stepClamped)}
          </text>
        </g>
      </svg>

      {/* Tooltip */}
      {tip && (
        <div
          className={`absolute pointer-events-none z-40 rounded text-[11px] font-mono shadow-2xl border min-w-[220px] ${
            dark ? "bg-[#0f0f0f] border-[#2a2a2a] text-neutral-200" : "bg-white border-neutral-200 text-neutral-800"
          }`}
          style={{
            left: Math.min(tip.x + 14, w - 240),
            top: Math.min(tip.y + 14, h - 160),
            padding: "8px 10px",
          }}
        >
          <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b" style={{ borderColor: dark ? "#1f1f1f" : "#e5e5e5" }}>
            <div className="w-2 h-2 rounded-sm" style={{ background: OP_COLORS[tip.t.op] }} />
            <span className="font-semibold">{tip.t.name}</span>
            <span className={`ml-auto text-[10px] ${dark ? "text-neutral-500" : "text-neutral-500"}`}>#{tip.t.id}</span>
          </div>
          <Row dark={dark} k="shape"   v={fmtShape(tip.t.shape)} />
          <Row dark={dark} k="dtype"   v={tip.t.dtype} />
          <Row dark={dark} k="bytes"   v={`${tip.t.bytes.toLocaleString()} (${(tip.t.bytes/1024).toFixed(2)} KB)`} />
          <Row dark={dark} k="offset"  v={`0x${tip.t.offset.toString(16).padStart(5, "0")} (+${(tip.t.offset/1024).toFixed(1)} KB)`} />
          <Row dark={dark} k="op"      v={tip.t.op} colorChip={OP_COLORS[tip.t.op]} />
          <Row dark={dark} k="producer" v={`node #${tip.t.producer} · ${NODES[tip.t.producer]?.name ?? "?"}`} />
          <Row dark={dark} k="consumers" v={tip.t.consumers.length === 0 ? "—" : tip.t.consumers.map(c => `#${c}`).join(", ")} />
          <Row dark={dark} k="lifespan" v={`step ${tip.t.birthStep} → ${tip.t.deathStep} (${tip.t.deathStep - tip.t.birthStep + 1} steps)`} />
        </div>
      )}
    </div>
  );
}

function Row({ k, v, dark, colorChip }) {
  return (
    <div className="flex items-baseline gap-2 leading-tight py-[1px]">
      <span className={`text-[9px] uppercase tracking-wider ${dark ? "text-neutral-500" : "text-neutral-500"}`} style={{ width: 64 }}>{k}</span>
      <span className="flex items-center gap-1.5">
        {colorChip && <span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ background: colorChip }} />}
        <span>{v}</span>
      </span>
    </div>
  );
}

// Op color legend
function ArenaLegend({ usedOps, theme }) {
  const dark = theme === "dark";
  return (
    <div className={`absolute right-3 bottom-9 flex items-center gap-1 px-2 py-1 rounded ${
      dark ? "bg-[#0f0f0f]/95 border border-[#1f1f1f]" : "bg-white/95 border border-neutral-200"
    }`}>
      <span className={`text-[9px] uppercase tracking-wider mr-1 ${dark ? "text-neutral-500" : "text-neutral-500"}`}>ops</span>
      {usedOps.map((op) => (
        <span key={op} className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-mono"
              style={{ color: dark ? "#d4d4d4" : "#262626" }}>
          <span className="w-2 h-2 rounded-sm" style={{ background: OP_COLORS[op] || "#525252" }} />
          {op.toLowerCase()}
        </span>
      ))}
    </div>
  );
}

Object.assign(window, { Arena, ArenaLegend });

// ============================================================
// Metrics panel (right rail, 320px sticky)
// ============================================================
const { useMemo: useMemoM } = React;

function Sparkline({ data, currentIdx, peak, theme, height = 56, color = "#a9c46c" }) {
  const dark = theme === "dark";
  const max = Math.max(peak, 1);
  const w = 280;
  const path = useMemoM(() => {
    if (data.length === 0) return "";
    return data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - (v / max) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
  }, [data, max, height]);
  const areaPath = useMemoM(() => {
    if (data.length === 0) return "";
    const top = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - (v / max) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
    return `${top} L ${w} ${height} L 0 ${height} Z`;
  }, [data, max, height]);
  const cx = (currentIdx / (data.length - 1)) * w;
  const cy = height - (data[currentIdx] / max) * (height - 4) - 2;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="block">
      <defs>
        <linearGradient id="spark-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-grad)" />
      <path d={path} fill="none" stroke={color} strokeWidth={1.25} />
      {/* current marker */}
      <line x1={cx} x2={cx} y1={0} y2={height} stroke="#fde047" strokeOpacity={0.5} strokeWidth={1} />
      <circle cx={cx} cy={cy} r={3} fill="#fde047" stroke={dark ? "#0a0a0a" : "#ffffff"} strokeWidth={1.5} />
    </svg>
  );
}

function MetricCard({ icon, label, children, theme, accent }) {
  const dark = theme === "dark";
  return (
    <div className={`rounded-md border ${
      dark ? "bg-[#0d0d0d] border-[#1c1c1c]" : "bg-white border-neutral-200"
    }`}>
      <div className={`px-3 pt-2.5 pb-1.5 flex items-center gap-1.5`}>
        <span className={`opacity-70 ${dark ? "text-neutral-500" : "text-neutral-500"}`}>{icon}</span>
        <span className={`text-[10px] uppercase tracking-wider ${dark ? "text-neutral-500" : "text-neutral-500"}`}>{label}</span>
        {accent}
      </div>
      <div className="px-3 pb-3">{children}</div>
    </div>
  );
}

function Metrics({
  policy, order, step,
  tensors, peak, peakInfo, liveCountInfo,
  memoryOverTime, currentMem, frag,
  policyPeaks, flashBytes, target,
  onSetPolicy, theme,
}) {
  const dark = theme === "dark";
  const stepIdx = Math.round(step);
  const baseline = policyPeaks["no-recycling"];
  const savedPct = baseline > 0 ? (baseline - peak) / baseline : 0;
  const isBaseline = policy === "no-recycling";

  const sramBudget  = target?.sramBytes  ?? 520 * 1024;
  const flashBudget = target?.flashBytes ?? 4 * 1024 * 1024;
  const sramPctUsed   = peak        > 0 ? peak        / sramBudget  : 0;
  const flashPctUsed  = flashBytes  > 0 ? flashBytes  / flashBudget : 0;

  return (
    <aside
      className={`flex flex-col gap-2 p-3 overflow-y-auto ${
        dark ? "bg-[#0a0a0a] border-l border-[#1f1f1f]" : "bg-neutral-50 border-l border-neutral-200"
      }`}
      style={{ width: 320, flex: "0 0 320px" }}
    >
      {/* SRAM Peak (the metric that decides on-chip viability) */}
      <MetricCard
        theme={theme}
        icon={<IconZap size={11} />}
        label="Pic SRAM"
        accent={
          <span className={`ml-auto text-[10px] font-mono ${dark ? "text-neutral-600" : "text-neutral-500"}`}>
            @ step {peakInfo.step}
          </span>
        }
      >
        <div className="flex items-baseline gap-1.5">
          <span className={`font-mono font-semibold tabular-nums ${dark ? "text-neutral-50" : "text-neutral-900"}`} style={{ fontSize: 32, lineHeight: 1 }}>
            {(peak / 1024).toFixed(1)}
          </span>
          <span className={`text-xs font-mono ${dark ? "text-neutral-500" : "text-neutral-500"}`}>KB</span>
          <span className={`ml-auto text-[10px] font-mono ${dark ? "text-neutral-500" : "text-neutral-500"}`}>
            {fmtPct(sramPctUsed)} of {(sramBudget/1024).toFixed(0)}KB
          </span>
        </div>
        <div className="mt-1.5">
          {isBaseline ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: dark ? "#1f1f1f" : "#f5f5f5", color: dark ? "#a3a3a3" : "#525252" }}>
              baseline
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(34, 197, 94, 0.12)", color: "#22c55e" }}>
              −{fmtPct(savedPct)} vs no-recycling
              <span className={dark ? "text-emerald-700" : "text-emerald-700"}>
                ({((baseline - peak)/1024).toFixed(1)} KB saved)
              </span>
            </span>
          )}
        </div>
      </MetricCard>

      {/* Flash budget (constant across policies; weights live there read-only) */}
      <MetricCard
        theme={theme}
        icon={<IconHash size={11} />}
        label="Flash (weights)"
        accent={
          <span className={`ml-auto text-[10px] font-mono ${dark ? "text-neutral-600" : "text-neutral-500"}`}>
            read-only
          </span>
        }
      >
        <div className="flex items-baseline gap-1.5">
          <span className={`font-mono font-semibold tabular-nums ${dark ? "text-neutral-50" : "text-neutral-900"}`} style={{ fontSize: 22, lineHeight: 1 }}>
            {(flashBytes / 1024).toFixed(1)}
          </span>
          <span className={`text-[11px] font-mono ${dark ? "text-neutral-500" : "text-neutral-500"}`}>KB</span>
          <span className={`ml-auto text-[10px] font-mono ${dark ? "text-neutral-500" : "text-neutral-500"}`}>
            {fmtPct(flashPctUsed)} of {(flashBudget/1024/1024).toFixed(0)}MB
          </span>
        </div>
        <div className={`mt-2 h-1.5 rounded overflow-hidden ${dark ? "bg-[#161616]" : "bg-neutral-100"}`}>
          <div
            className="h-full rounded transition-all duration-300"
            style={{
              width: `${Math.min(100, flashPctUsed * 100)}%`,
              background: "#7c9eb2",
            }}
          />
        </div>
      </MetricCard>

      {/* Current memory + sparkline */}
      <MetricCard
        theme={theme}
        icon={<IconActivity size={11} />}
        label="Mémoire courante"
        accent={
          <span className={`ml-auto text-[10px] font-mono ${dark ? "text-neutral-600" : "text-neutral-500"}`}>
            step {stepIdx}
          </span>
        }
      >
        <div className="flex items-baseline gap-1.5">
          <span className={`font-mono font-semibold tabular-nums ${dark ? "text-neutral-50" : "text-neutral-900"}`} style={{ fontSize: 22, lineHeight: 1 }}>
            {(currentMem / 1024).toFixed(1)}
          </span>
          <span className={`text-[11px] font-mono ${dark ? "text-neutral-500" : "text-neutral-500"}`}>KB</span>
          <span className={`ml-auto text-[10px] font-mono ${dark ? "text-neutral-500" : "text-neutral-500"}`}>
            {fmtPct(currentMem / peak)} of peak
          </span>
        </div>
        <div className="mt-2 -mx-1">
          <Sparkline
            data={memoryOverTime}
            currentIdx={stepIdx}
            peak={peak}
            theme={theme}
            color={isBaseline ? "#7c9eb2" : "#a9c46c"}
          />
        </div>
      </MetricCard>

      {/* Live tensor count */}
      <MetricCard
        theme={theme}
        icon={<IconBox size={11} />}
        label="# tenseurs vivants"
      >
        <div className="flex items-baseline gap-2">
          <span className={`font-mono font-semibold tabular-nums ${dark ? "text-neutral-50" : "text-neutral-900"}`} style={{ fontSize: 22, lineHeight: 1 }}>
            {tensors.filter(t => t.birthStep <= stepIdx && t.deathStep >= stepIdx).length}
          </span>
          <span className={`text-[10px] font-mono ${dark ? "text-neutral-500" : "text-neutral-500"}`}>
            tensors @ step {stepIdx}
          </span>
        </div>
        <div className={`mt-1 text-[10px] font-mono ${dark ? "text-neutral-500" : "text-neutral-500"}`}>
          max: <span className={dark ? "text-neutral-300" : "text-neutral-700"}>{liveCountInfo.count}</span> at step <span className={dark ? "text-amber-400" : "text-amber-600"}>{liveCountInfo.step}</span>
        </div>
      </MetricCard>

      {/* Overhead vs theoretical minimum */}
      <MetricCard
        theme={theme}
        icon={<IconHash size={11} />}
        label="Overhead"
        accent={
          <span className={`ml-auto text-[10px] font-mono ${dark ? "text-neutral-600" : "text-neutral-500"}`}>
            vs min bound
          </span>
        }
      >
        <div className="flex items-baseline gap-1.5">
          <span className={`font-mono font-semibold tabular-nums ${dark ? "text-neutral-50" : "text-neutral-900"}`} style={{ fontSize: 22, lineHeight: 1 }}>
            {fmtPct(frag)}
          </span>
          <span className={`ml-auto text-[10px] font-mono ${dark ? "text-neutral-500" : "text-neutral-500"}`}>
            above max live set
          </span>
        </div>
        <div className={`mt-2 h-1.5 rounded overflow-hidden ${dark ? "bg-[#161616]" : "bg-neutral-100"}`}>
          <div
            className="h-full rounded transition-all duration-300"
            style={{
              width: `${Math.min(100, frag * 100)}%`,
              background: frag < 0.1 ? "#22c55e" : frag < 0.25 ? "#eab308" : "#f97316",
            }}
          />
        </div>
      </MetricCard>

      {/* Policy comparator */}
      <MetricCard
        theme={theme}
        icon={<IconGitBranch size={11} />}
        label="Comparatif politiques"
      >
        <div className="flex flex-col">
          {POLICIES.map((p) => {
            const v = policyPeaks[p];
            const active = p === policy;
            const ratio = baseline > 0 ? v / baseline : 1;
            const delta = baseline > 0 ? (baseline - v) / baseline : 0;
            return (
              <button
                key={p}
                onClick={() => onSetPolicy(p)}
                className={`group flex items-center gap-2 py-1 -mx-1 px-1.5 rounded transition-colors ${
                  active
                    ? (dark ? "bg-[#1a1a1a]" : "bg-neutral-100")
                    : (dark ? "hover:bg-[#141414]" : "hover:bg-white")
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${active ? "" : "opacity-30"}`}
                      style={{ background: active ? "#fde047" : (dark ? "#737373" : "#a3a3a3") }} />
                <span className={`text-[10px] font-mono flex-1 text-left truncate ${
                  active ? (dark ? "text-neutral-50 font-semibold" : "text-neutral-900 font-semibold") : (dark ? "text-neutral-400" : "text-neutral-600")
                }`}>{p}</span>
                {/* mini bar */}
                <div className={`h-1 w-12 rounded-sm overflow-hidden ${dark ? "bg-[#161616]" : "bg-neutral-200"}`}>
                  <div className="h-full rounded-sm"
                       style={{
                         width: `${ratio * 100}%`,
                         background: active ? "#fde047" : (p === "no-recycling" ? "#ef4444" : "#22c55e"),
                         opacity: active ? 1 : 0.6,
                       }} />
                </div>
                <span className={`text-[10px] font-mono tabular-nums w-12 text-right ${
                  active ? (dark ? "text-neutral-50" : "text-neutral-900") : (dark ? "text-neutral-400" : "text-neutral-600")
                }`}>
                  {(v / 1024).toFixed(0)} KB
                </span>
                <span className={`text-[9px] font-mono tabular-nums w-10 text-right ${
                  p === "no-recycling" ? (dark ? "text-neutral-600" : "text-neutral-400") :
                  (dark ? "text-emerald-500" : "text-emerald-600")
                }`}>
                  {p === "no-recycling" ? "base" : `−${Math.round(delta * 100)}%`}
                </span>
              </button>
            );
          })}
        </div>
      </MetricCard>

      {/* Run info footer */}
      <div className={`mt-auto pt-2 pb-1 px-1 text-[10px] font-mono leading-relaxed ${
        dark ? "text-neutral-600" : "text-neutral-500"
      }`}>
        <div className="flex justify-between">
          <span>policy</span><span className={dark ? "text-neutral-400" : "text-neutral-700"}>{policy}</span>
        </div>
        <div className="flex justify-between">
          <span>order</span><span className={dark ? "text-neutral-400" : "text-neutral-700"}>{order}</span>
        </div>
        <div className="flex justify-between">
          <span>tensors</span><span className={dark ? "text-neutral-400" : "text-neutral-700"}>{tensors.length}</span>
        </div>
        <div className="flex justify-between">
          <span>target</span><span className={dark ? "text-neutral-400" : "text-neutral-700"}>ESP32 / SRAM 520K</span>
        </div>
      </div>
    </aside>
  );
}

Object.assign(window, { Metrics });

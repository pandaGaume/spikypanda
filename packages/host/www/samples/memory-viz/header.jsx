// ============================================================
// Header / Timeline / Arena / Metrics — Memory Viz UI
// ============================================================

const { useState, useMemo, useRef, useEffect, useCallback } = React;

const fmtBytes = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(b < 10240 ? 2 : 1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};
const fmtPct = (p) => `${(p * 100).toFixed(1)}%`;
const fmtShape = (s) => `[${s.join("×")}]`;

// ----------------------------------------------------------------
// Custom dropdown (replaces native select for dark theming consistency)
// ----------------------------------------------------------------
function Dropdown({ label, value, options, onChange, width = 200, theme }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const dark = theme === "dark";
  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full h-8 px-2.5 flex items-center justify-between gap-2 rounded border text-xs font-mono transition-colors ${
          dark
            ? "bg-[#0f0f0f] border-[#262626] hover:border-[#404040] text-neutral-200"
            : "bg-white border-neutral-300 hover:border-neutral-400 text-neutral-800"
        }`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span className={dark ? "text-neutral-500" : "text-neutral-500"}>{label}</span>
          <span className="truncate">{value}</span>
        </span>
        <IconChevronDown size={12} className={dark ? "text-neutral-500" : "text-neutral-400"} />
      </button>
      {open && (
        <div
          className={`absolute right-0 top-9 z-50 rounded border shadow-2xl overflow-hidden ${
            dark ? "bg-[#141414] border-[#262626]" : "bg-white border-neutral-200"
          }`}
          style={{ minWidth: width }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-2.5 py-1.5 text-xs font-mono flex items-center justify-between gap-2 transition-colors ${
                dark
                  ? "hover:bg-[#1f1f1f] text-neutral-200"
                  : "hover:bg-neutral-100 text-neutral-800"
              } ${opt === value ? (dark ? "bg-[#1a1a1a]" : "bg-neutral-50") : ""}`}
            >
              <span>{opt}</span>
              {opt === value && <IconCheck size={12} className="text-amber-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Header
// ----------------------------------------------------------------
function Header({ loaded, onLoad, policy, setPolicy, order, setOrder, theme, setTheme }) {
  const dark = theme === "dark";
  return (
    <header
      className={`h-14 px-4 flex items-center gap-4 border-b ${
        dark ? "bg-[#0a0a0a] border-[#1f1f1f]" : "bg-white border-neutral-200"
      }`}
      style={{ flex: "0 0 56px" }}
    >
      {/* Logo + title */}
      <div className="flex items-center gap-2.5 select-none">
        <div className="relative w-7 h-7 grid place-items-center rounded-md"
             style={{ background: dark ? "#181818" : "#f5f5f5", border: `1px solid ${dark ? "#262626" : "#e5e5e5"}` }}>
          {/* tiny memory block glyph */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2"  width="6" height="4" rx="1" fill="#7c9eb2" />
            <rect x="8" y="2"  width="7" height="4" rx="1" fill="#a9c46c" />
            <rect x="1" y="7"  width="9" height="3" rx="1" fill="#d4a373" />
            <rect x="11" y="7" width="4" height="3" rx="1" fill="#c08497" />
            <rect x="1" y="11" width="5" height="3" rx="1" fill="#9f86c0" />
            <rect x="7" y="11" width="8" height="3" rx="1" fill="#f4a261" />
          </svg>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-sm font-semibold tracking-tight ${dark ? "text-neutral-100" : "text-neutral-900"}`}>Memory Viz</span>
          <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
            dark ? "text-neutral-500 bg-[#141414] border border-[#1f1f1f]" : "text-neutral-500 bg-neutral-50 border border-neutral-200"
          }`}>esp32 · ONNX</span>
        </div>
      </div>

      {/* File area */}
      <div className="flex-1 flex justify-center px-6">
        {!loaded ? (
          <button
            onClick={onLoad}
            className={`group h-9 px-3 flex items-center gap-2.5 rounded-md border border-dashed transition-all ${
              dark
                ? "border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#101010] text-neutral-400"
                : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 text-neutral-600"
            }`}
            style={{ minWidth: 360 }}
          >
            <IconUpload size={14} className={dark ? "text-neutral-500 group-hover:text-amber-400" : "text-neutral-400 group-hover:text-amber-500"} />
            <span className="text-xs">Charger un modèle</span>
            <span className={`text-[11px] font-mono ${dark ? "text-neutral-600" : "text-neutral-400"}`}>ou glisser-déposer .onnx</span>
          </button>
        ) : (
          <div className={`h-9 px-3 flex items-center gap-3 rounded-md border ${
            dark ? "bg-[#0f0f0f] border-[#1f1f1f]" : "bg-neutral-50 border-neutral-200"
          }`}>
            <IconFile size={13} className="text-emerald-400" />
            <span className={`text-xs font-mono ${dark ? "text-neutral-100" : "text-neutral-900"}`}>{FILE_META.name}</span>
            <span className={`text-[11px] font-mono ${dark ? "text-neutral-500" : "text-neutral-500"}`}>
              · {FILE_META.nodes} nodes · {FILE_META.tensors} tensors
            </span>
            <div className={`w-1.5 h-1.5 rounded-full bg-emerald-400`} />
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <Dropdown
          label="politique"
          value={policy}
          options={POLICIES}
          onChange={setPolicy}
          width={232}
          theme={theme}
        />
        <Dropdown
          label="ordre"
          value={order}
          options={ORDER_KEYS}
          onChange={setOrder}
          width={210}
          theme={theme}
        />
        <button
          onClick={() => setTheme(dark ? "light" : "dark")}
          className={`w-8 h-8 grid place-items-center rounded border transition-colors ${
            dark
              ? "bg-[#0f0f0f] border-[#262626] hover:border-[#404040] text-neutral-300"
              : "bg-white border-neutral-300 hover:border-neutral-400 text-neutral-700"
          }`}
          title={dark ? "Passer en thème clair" : "Passer en thème sombre"}
        >
          {dark ? <IconSun size={13} /> : <IconMoon size={13} />}
        </button>
      </div>
    </header>
  );
}

Object.assign(window, { Header, Dropdown, fmtBytes, fmtPct, fmtShape });

// Sample-side sub-editor factory for the "transform-3d" kind.
// Domain-specific viewer (SVG isometric, no 3D engine) so it stays
// here rather than in the generic nodeeditor package. Apps that want
// a Babylon / Three.js viewer ship their own factory under the same
// "transform-3d" kind name; the registry handles last-wins.
//
// Exported on window as `__spkEditorFactories.transform3D` so
// nodeeditor.js can pick it up after script load order without
// needing an ES module setup in the sample.
(function () {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const SCALE = 5;

    function projX(x, _y, z) { return x * Math.cos(Math.PI / 6) - z * Math.cos(Math.PI / 6); }
    function projY(x, y, z)  { return -y + (x + z) * Math.sin(Math.PI / 6); }

    function addAxis(svg, dx, dy, dz, color, label) {
        const L = 18;
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", "0");
        line.setAttribute("y1", "0");
        line.setAttribute("x2", String(projX(dx * L, dy * L, dz * L)));
        line.setAttribute("y2", String(projY(dx * L, dy * L, dz * L)));
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", "0.6");
        svg.appendChild(line);
        const t = document.createElementNS(SVG_NS, "text");
        t.setAttribute("x", String(projX(dx * (L + 4), dy * (L + 4), dz * (L + 4))));
        t.setAttribute("y", String(projY(dx * (L + 4), dy * (L + 4), dz * (L + 4))));
        t.setAttribute("font-size", "5");
        t.setAttribute("fill", color);
        t.textContent = label;
        svg.appendChild(t);
    }

    function transform3DFactory(host, model, _propertyName, _options, editable) {
        const wrap = document.createElement("div");
        wrap.style.cssText = "padding:8px;display:flex;flex-direction:column;gap:8px;";

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "-50 -50 100 100");
        svg.style.cssText = "width:100%;aspect-ratio:1;background:rgba(0,0,0,0.2);border-radius:4px;";
        addAxis(svg, 1, 0, 0, "#f88", "X");
        addAxis(svg, 0, 1, 0, "#8f8", "Y");
        addAxis(svg, 0, 0, 1, "#88f", "Z");

        const dot = document.createElementNS(SVG_NS, "circle");
        dot.setAttribute("r", "3.5");
        dot.setAttribute("fill", "var(--ne-color-primary)");
        svg.appendChild(dot);
        wrap.appendChild(svg);

        const row = document.createElement("div");
        row.style.cssText = "display:flex;gap:6px;";
        const inputs = {};
        ["x", "y", "z"].forEach(function (ax) {
            const grp = document.createElement("label");
            grp.style.cssText = "display:flex;flex-direction:column;align-items:flex-start;font-size:0.68em;color:var(--ne-color-text-muted);gap:2px;flex:1;";
            grp.textContent = ax.toUpperCase();
            const inp = document.createElement("input");
            inp.type = "number";
            inp.step = "0.1";
            inp.style.cssText = "width:100%;font-size:0.85em;padding:2px 4px;";
            inp.value = String(model.translation[ax]);
            inp.readOnly = (editable === false);
            inp.addEventListener("input", function () {
                const t = model.translation;
                const Ctor = t.constructor;
                model.translation = new Ctor(
                    ax === "x" ? Number(inp.value) : t.x,
                    ax === "y" ? Number(inp.value) : t.y,
                    ax === "z" ? Number(inp.value) : t.z,
                );
            });
            grp.appendChild(inp);
            row.appendChild(grp);
            inputs[ax] = inp;
        });
        wrap.appendChild(row);
        host.appendChild(wrap);

        function refresh() {
            const p = model.translation;
            dot.setAttribute("cx", String(projX(p.x * SCALE, p.y * SCALE, p.z * SCALE)));
            dot.setAttribute("cy", String(projY(p.x * SCALE, p.y * SCALE, p.z * SCALE)));
            ["x", "y", "z"].forEach(function (k) {
                if (document.activeElement !== inputs[k]) {
                    inputs[k].value = String(p[k]);
                }
            });
        }
        refresh();

        let sub = null;
        if (model.onPropertyChanged && typeof model.onPropertyChanged.add === "function") {
            sub = model.onPropertyChanged.add(function (args) {
                if (args && args.propertyName === "translation") refresh();
            });
        }

        return {
            dispose: function () {
                if (sub) sub.dispose();
                host.removeChild(wrap);
            },
        };
    }

    window.__spkEditorFactories = window.__spkEditorFactories || {};
    window.__spkEditorFactories.transform3D = transform3DFactory;
}());

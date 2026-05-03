// PwmWidget — live slider controls for spk.PWM nodes in Play mode.
// Renders inside a play-panel tab body (same pattern as ScopeWidget).
//
// opts:
//   label         {string}   node label shown in the widget header
//   dutyCycle     {number}   initial duty cycle value (0-1)
//   frequencyHz   {number}   initial PWM frequency in Hz
//   onDutyCycle   {function} called with new value when slider moves
//   onFrequency   {function} called with new value when slider moves

export class PwmWidget {
    constructor(container, opts) {
        this._container = container;
        this._opts       = opts || {};
        this._duty       = opts.dutyCycle   != null ? opts.dutyCycle   : 1.0;
        this._freq       = opts.frequencyHz != null ? opts.frequencyHz : 10000;
        this._el         = null;
        this._dutySlider = null;
        this._freqSlider = null;
        this._dutyVal    = null;
        this._freqVal    = null;
        this._build();
    }

    _build() {
        const el = document.createElement("div");
        el.className = "spk-pwm-widget";

        // Header
        const hdr = document.createElement("div");
        hdr.className = "spk-pwm-header";
        hdr.textContent = this._opts.label || "PWM Driver";
        el.appendChild(hdr);

        // Duty cycle row
        el.appendChild(this._makeRow(
            "Duty cycle",
            0, 1, 0.01,
            this._duty,
            (v) => v.toFixed(3),
            (slider, valEl) => {
                this._dutySlider = slider;
                this._dutyVal    = valEl;
            },
            (v) => {
                this._duty = v;
                if (this._opts.onDutyCycle) this._opts.onDutyCycle(v);
            },
        ));

        // Frequency row
        el.appendChild(this._makeRow(
            "Frequency",
            100, 20000, 100,
            this._freq,
            (v) => Math.round(v) + " Hz",
            (slider, valEl) => {
                this._freqSlider = slider;
                this._freqVal    = valEl;
            },
            (v) => {
                this._freq = v;
                if (this._opts.onFrequency) this._opts.onFrequency(v);
            },
        ));

        this._el = el;
        this._container.appendChild(el);
    }

    _makeRow(label, min, max, step, init, fmt, ref, onChange) {
        const row = document.createElement("div");
        row.className = "spk-pwm-row";

        const lbl = document.createElement("span");
        lbl.className = "spk-pwm-label";
        lbl.textContent = label;

        const slider = document.createElement("input");
        slider.type      = "range";
        slider.className = "spk-pwm-slider";
        slider.min       = String(min);
        slider.max       = String(max);
        slider.step      = String(step);
        slider.value     = String(init);

        const valEl = document.createElement("span");
        valEl.className = "spk-pwm-value";
        valEl.textContent = fmt(init);

        slider.addEventListener("input", () => {
            const v = parseFloat(slider.value);
            valEl.textContent = fmt(v);
            onChange(v);
        });

        ref(slider, valEl);

        row.appendChild(lbl);
        row.appendChild(slider);
        row.appendChild(valEl);
        return row;
    }

    // No-op so the generic `w.widget.setSampleRateHz(fs)` loop in
    // nodeeditor.js doesn't throw when iterating mixed widget types.
    setSampleRateHz(_fs) {}

    destroy() {
        if (this._el && this._el.parentNode) {
            this._el.parentNode.removeChild(this._el);
        }
        this._el = null;
    }
}

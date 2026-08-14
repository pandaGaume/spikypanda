import { isoSeveritySubPlugin } from "./severity/index.js";

export * from "./severity/index.js";

/**
 * @spikypanda/plugin-iso
 *
 * ISO condition-monitoring standards as graph nodes, under the `ISO.*`
 * namespace. These give a learned/edge pipeline a standards-anchored,
 * auditable corroboration channel beside its learned scores.
 *
 *   ISO.Severity   ISO 20816-3 broadband vibration-severity (zone A/B/C/D
 *                  from the 10-1000 Hz velocity RMS). Reads the signal's
 *                  physical unit (unit-tag convention) and REFUSES rather
 *                  than guess when the unit is undeclared, the sample rate
 *                  is too low, or the machine is out of ISO scope.
 *
 * Type ids follow the canonical `<Theme>.<Sub>:<node>` convention, e.g.
 * `ISO.Severity:iso20816` -> palette `ISO > Severity > ISO 20816-3 Severity`.
 */
export default {
    subPlugins: {
        "ISO.Severity": isoSeveritySubPlugin,
    },
};

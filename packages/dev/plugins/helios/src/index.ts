/**
 * @spikypanda/plugin-helios — V0.1 (deliberately empty)
 *
 * The previous V0.1 sub-plugins shipped generic primitives (RNG, snapshot,
 * rate-divider, conservation-monitor, alert-bus, arbitrator, transducer,
 * setpoint, emergency-shutdown) that turned out to be cross-cutting
 * infrastructure, not Helios-specific. They've been relocated to their
 * natural homes:
 *
 *   Logic.Sim:rng-seed                  was Helios.Sim:rng-seed
 *   Logic.Sim:snapshot / :restore       was Helios.Sim:snapshot / :restore
 *   Logic.Sim:rate-divider              was Helios.Sim:rate-divider
 *   Logic.Sim:conservation-monitor      was Helios.Sim:conservation-monitor
 *   Logic.Event:alert-bus               was Helios.Agent:alert-bus
 *   Logic.Event:arbitrator              was Helios.Agent:arbitrator
 *   DSP.Sensor:transducer               was Helios.Sensor:transducer
 *   Control.Actuator:setpoint           was Helios.Actuator:setpoint
 *   Control.Safety:emergency-shutdown   was Helios.Actuator:emergency-shutdown
 *
 * V0.2 refills this plugin with the genuinely Helios-specific bits:
 *
 *   Helios.Process    chemistry plant nodes (PEM electrolyzer, CO2 capture,
 *                     Sabatier reactor, gas compressor, mixer, condenser,
 *                     KO drum, PSA purifier, ...) — depend on the F1
 *                     IIntegrable trait + F4 IChemicalStream port type
 *                     from sim-framework-api-v2.draft.md
 *
 *   Helios.Agent      ECLSS-specific subsumption observer / advisor /
 *                     controller / safety wrappers + manifest loader for
 *                     the agent-manifest-v1 JSON
 *
 *   Helios.Comm       Mars-latency comm channel, MCP scenario-director
 *                     surface, MQTT telemetry pub/sub
 *
 *   Helios.Sim        Hierarchical multi-rate scheduler, RK4-adaptive
 *                     solver as a host node, conservation-hook validator,
 *                     sub-graph → ONNX export pipeline.
 *
 * Subscribe to the design doc for sequencing.
 */
export default {
    subPlugins: {},
};

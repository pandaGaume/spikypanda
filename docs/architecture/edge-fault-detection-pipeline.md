# Edge Fault Detection Pipeline — Architecture Vision

**Date:** 2026-04-10
**Author:** Guillaume Pelletier
**Context:** Extension of the [MCSA broken rotor bar work](../research/motor-current-mcsa-novelty.md)
into a full embedded predictive maintenance architecture.

---

## 1. Problem statement

Industrial motors degrade over time. Today, fault detection is either:

- **Offline:** a technician runs a diagnostic tool during scheduled
  maintenance. Faults between visits go undetected.
- **Cloud-based:** raw sensor data is streamed to a remote server for
  analysis. This requires bandwidth, introduces latency, and exposes
  sensitive operational data to third parties.

Neither approach scales to a factory floor with hundreds of motors, each
needing continuous monitoring at sub-second response times with zero
cloud dependency.

## 2. Proposed architecture

The system uses a **three-tier hierarchy** where intelligence is
distributed across the edge device, a local supervisor, and an optional
cloud layer. The key design principle is: **only alarms travel up, never
raw data.**

```
                       ┌────────────────────────────┐
                       │    Tier 3: Cloud / SCADA    │
                       │    (optional, historical)   │
                       └─────────────┬──────────────┘
                                     │ aggregated reports
                                     │ (daily / weekly)
                       ┌─────────────▼──────────────┐
                       │   Tier 2: Supervisor AI     │
                       │   (gateway / edge server)   │
                       │                             │
                       │   Policy engine             │
                       │   Fleet-level correlation   │
                       │   Maintenance scheduling    │
                       │                             │
                       │   ◄── MCP server ──►        │
                       └───┬─────────┬─────────┬────┘
                           │         │         │
                   MCP     │   MCP   │   MCP   │
                           │         │         │
                       ┌───▼──┐  ┌───▼──┐  ┌───▼──┐
                       │MCU 1 │  │MCU 2 │  │MCU N │
                       │Motor │  │Motor │  │Motor │
                       │  A   │  │  B   │  │  N   │
                       └──────┘  └──────┘  └──────┘

                       ─────── Tier 1: Edge ────────
```

### Tier 1 — Edge MCU (per motor)

A low-power microcontroller (Cortex-M0+ to M4 class) mounted on or
near the motor, connected to current clamps and/or accelerometers.

**What it does:**

1. **Listen** — Continuously samples stator currents (and optionally
   vibration) at the raw sensor rate.

2. **Detect change** — Runs a lightweight anomaly detector (baseline
   RMS envelope tracker + threshold) that costs ~0 parameters and
   near-zero compute. This is the "wake-up" trigger. While the motor
   is healthy and stable, the MCU is in low-power listen mode.

3. **Classify** — When a change is detected, the MCU wakes up the
   classification pipeline and runs a cascade of tiny models:

   ```
   Change detected
       │
       ▼
   Stage 1: Binary classifier (Healthy / Fault)
             ~500 parameters, <1 KB
             Result: 98.8% accuracy
       │
       ├─ Healthy → return to listen mode
       │
       ▼
   Stage 2: Severity grader (BRB1..BRB4)
             ~4,773 parameters, 19 KB
             Result: 78.3% accuracy on 5-class
       │
       ▼
   Stage 3 (optional): Multi-fault classifier
             Vibration LSTM for mechanical faults
             (imbalance, bearing, misalignment)
             ~1,280 parameters, 5 KB
       │
       ▼
   Combine electrical + mechanical diagnosis
   ```

4. **Report** — Send a structured alarm to the Supervisor via MCP
   (or MQTT, Modbus, CAN, etc.):

   ```json
   {
     "motor_id": "pump-3A-east",
     "timestamp": "2026-04-10T14:23:07Z",
     "electrical": {
       "class": "BRB2",
       "confidence": 0.82,
       "envelope_std": 0.031
     },
     "mechanical": {
       "class": "Normal",
       "confidence": 0.95
     },
     "action": "request_detailed_scan"
   }
   ```

**Why this architecture works on an MCU:**

| Resource | Available (Cortex-M0+) | Required |
|---|---|---|
| SRAM | 16–32 KB | 19 KB (LSTM weights) + 2 KB (buffers) |
| Flash | 64–256 KB | 20 KB (model) + 10 KB (firmware) |
| Compute | 48 MHz, no FPU | 1.5 ms/sample (demonstrated in browser JS, MCU would be similar with int8) |
| Power | ~5 mW active, ~5 uW sleep | Listen mode: sleep. Classify: <100 ms burst. |

The MCSA paper demonstrated that the **envelope preprocessing is the
key enabler**: it reduces 55 kHz 3-phase current to 60 Hz envelope,
which a 4,773-parameter LSTM classifies in 1.5 ms. Without this
preprocessing, the model would need 100K+ parameters and could not fit
on the target MCU.

### Tier 2 — Supervisor AI (gateway)

A more capable edge computer (Raspberry Pi class, or an industrial
gateway) running a policy engine that orchestrates the fleet of MCUs.

**What it does:**

1. **Receive alarms** from all MCUs via MCP (Model Context Protocol)
   or any lightweight transport.

2. **Correlate** — Cross-motor analysis. If 3 motors on the same drive
   report BRB1 simultaneously, the fault is likely in the VFD, not
   the motors. If one motor degrades gradually over weeks, schedule
   maintenance. If one motor goes from Healthy to BRB3 in one hour,
   trigger an emergency stop.

3. **Request more data** — The Supervisor can ask an MCU to run
   additional diagnostics via MCP tool calls:

   ```
   Supervisor → MCU (via MCP):
     tool: "run_detailed_scan"
     params: {
       "duration_s": 10,
       "include_vibration": true,
       "include_voltage": true,
       "sample_rate": "full"
     }
   ```

   The MCU responds with a richer feature vector (not raw data —
   extracted features only) that the Supervisor uses for a more
   confident diagnosis.

4. **Decide** — Based on the alarm severity, fleet state, and
   operational context, the policy engine takes action:

   | Alarm | Policy action |
   |---|---|
   | BRB1, single motor, low load | Log. Monitor trend. |
   | BRB2, single motor, high load | Schedule maintenance within 2 weeks. |
   | BRB3+, any load | Alert operator. Reduce load. Schedule urgent maintenance. |
   | BRB4 + vibration fault | Emergency: shut down motor, alert operator immediately. |
   | 3+ motors alarming simultaneously | Investigate upstream (VFD, power quality, cooling). |

5. **Learn** — The Supervisor can retrain or fine-tune the MCU models
   using federated learning: collect envelope features (not raw data)
   from multiple MCUs, retrain a better model on the gateway, and push
   updated weights back to the MCUs. SpikyPanda's structural plasticity
   (add/prune neurons at runtime) makes this possible without a full
   model rebuild.

### Tier 3 — Cloud / SCADA (optional)

The Supervisor forwards aggregated reports (daily summaries, trend
lines, maintenance logs) to the plant SCADA system or a cloud
dashboard. No raw sensor data leaves the plant. The cloud layer is
optional — the Tier 1 + Tier 2 system is fully self-contained.

---

## 3. The role of MCP (Model Context Protocol)

MCP provides a standardized way for the Supervisor to interact with
MCU-based agents as if they were tool-equipped AI assistants. Each MCU
exposes a set of **tools** via MCP:

| MCP Tool | Description | Triggered by |
|---|---|---|
| `get_status` | Return current fault class + confidence | Periodic poll |
| `get_envelope` | Return last N envelope windows (features, not raw) | Supervisor request |
| `run_detailed_scan` | Run extended multi-model diagnosis | On alarm escalation |
| `update_model` | Accept new LSTM weights (int8 quantized) | After federated retraining |
| `set_threshold` | Adjust anomaly detection threshold | Calibration |
| `get_health` | MCU temperature, uptime, buffer usage | Fleet monitoring |

The Supervisor's policy engine is itself an AI agent that reasons about
the fleet state and decides which tools to call on which MCUs. This is
the same pattern as a Claude Code session calling tools — but the
"tools" are physical sensors and classifiers on MCUs, not file system
operations.

**Why MCP and not just MQTT?**

MQTT is a transport (pub/sub messaging). MCP is a **capability
protocol** — it lets the Supervisor discover what each MCU can do,
call specific tools with typed parameters, and receive structured
responses. The two are complementary: MCP messages can travel over
MQTT, HTTP, serial, CAN, or any other transport.

The critical advantage of MCP for this use case is **interactive
diagnosis**: the Supervisor can have a multi-turn "conversation" with
an MCU, where each turn's tool call depends on the previous result.
Example:

```
Supervisor: get_status(motor="pump-3A")
MCU:        { "class": "BRB2", "confidence": 0.72 }

Supervisor: [confidence is low — request more data]
            run_detailed_scan(motor="pump-3A", duration_s=10)
MCU:        { "class": "BRB2", "confidence": 0.89,
              "vibration": "Normal", "envelope_features": [...] }

Supervisor: [BRB2 confirmed at 89%, vibration OK]
            → Schedule maintenance within 2 weeks
            → Log to SCADA
```

This interactive pattern is impossible with a simple threshold + alert
system. It requires the kind of tool-use reasoning that MCP was
designed for.

---

## 4. Model cascade: why multiple tiny models beat one large model

The cascade architecture (listen → binary classify → severity grade →
multi-fault combine) is more efficient than a single monolithic model
because:

### 4.1 Power efficiency

Most of the time the motor is healthy. The listener (thresholding on
RMS envelope, ~0 parameters) catches this case in microseconds and
keeps the MCU in sleep mode. The LSTM (19 KB) only activates on
detected changes — which on a healthy motor might be once per hour or
less.

**Energy budget:**

| Mode | Duration | Power | Energy per hour |
|---|---|---|---|
| Sleep (listen) | 3599.9 s | 5 uW | 18 mJ |
| Classify (wake) | 0.1 s | 5 mW | 0.5 mJ |
| **Total** | | | **18.5 mJ/hour** |

A CR2032 coin cell (660 mAh, 3V = 7.1 kJ) would last **>10 years**
at this duty cycle. This makes battery-powered wireless sensor nodes
feasible.

### 4.2 Accuracy cascading

The binary stage (Healthy vs. Fault) runs at **98.8% accuracy** — it
almost never misses a fault. The severity stage then only needs to
discriminate between fault types, not between healthy and faulty. This
conditional architecture has higher effective accuracy than a single
5-class model because the hardest decision (Healthy vs. BRB1) is
isolated in a dedicated binary classifier that can be optimized
specifically for that boundary.

### 4.3 Graceful degradation

If the severity model fails or is unavailable (e.g., memory
corruption, new fault type not in training data), the binary stage
still works. The MCU reports "Fault detected, type unknown" and the
Supervisor can request a detailed scan or dispatch a technician. The
system never goes fully blind.

### 4.4 Multi-modal fusion

The electrical LSTM (current envelope → BRB1..BRB4) and the
mechanical LSTM (vibration → imbalance/bearing/misalignment) run
independently. Their outputs are combined at the decision level:

```
Electrical diagnosis:  BRB2 (82%)
Mechanical diagnosis:  Normal (95%)
Combined:              Electrical fault only → likely broken bars,
                       not mechanical damage.
                       Action: schedule electrical maintenance,
                       no immediate mechanical concern.
```

If both modalities agree (e.g., electrical says BRB3 + vibration says
imbalance), the fault is likely more severe than either model alone
would suggest, and the alarm priority is escalated.

---

## 5. SpikyPanda's role in this architecture

SpikyPanda provides three capabilities that make this architecture
implementable:

### 5.1 Graph-native runtime for tiny models

The SpikyPanda compute graph represents each neuron and synapse as an
explicit object. This means:

- Models can be serialized and deserialized at the individual-weight
  level (no need for monolithic tensor checkpoints)
- A 4,773-parameter LSTM is literally 4,773 synapse objects — trivial
  to transfer over a low-bandwidth link
- The ONNX parser (`packages/dev/runtime/src/onnx/`) maps standard
  ONNX models to SpikyPanda graphs, so models trained in any
  framework can be deployed

### 5.2 Structural plasticity for online adaptation

The Supervisor can push topology changes (not just weight updates) to
MCUs at runtime:

- **Add a neuron** to the hidden layer when a new fault type is
  discovered (e.g., stator inter-turn short circuit)
- **Prune connections** that are no longer relevant after the motor is
  replaced
- **Adjust the output layer** from 5 classes to 6 without rebuilding
  the entire model

This is the structural plasticity described in
[`docs/architecture/plasticity-vision.md`](plasticity-vision.md) —
and it is exactly what biological neural systems do when adapting to
new environments.

### 5.3 Browser-native training for rapid deployment

The MCSA paper demonstrated that a working classifier can be trained
from real industrial data in a web browser in under 3 minutes. In the
deployment scenario this means:

- A field engineer can train a motor-specific model on-site by
  connecting a laptop to the current clamps, opening the SpikyPanda
  web sample, training for a few minutes, and exporting the weights
  to the MCU
- No Python environment, no GPU server, no cloud API required
- The model is validated visually (confusion matrix, signal plot)
  before deployment

---

## 6. Implementation roadmap

| Phase | Deliverable | Status |
|---|---|---|
| 1. Prove the classifier | 5-class LSTM on UFU data, 78.3% accuracy | **Done** (this work) |
| 2. ONNX export | Export trained LSTM to .onnx, load via CyanMycelium C++ runtime | Next |
| 3. MCU port | Run int8-quantized LSTM on Cortex-M0+ (STM32L0 or similar) | Planned |
| 4. Anomaly listener | Envelope-threshold wake-up trigger on MCU | Planned |
| 5. MCP agent on MCU | Expose get_status / run_detailed_scan as MCP tools | Planned |
| 6. Supervisor policy | Policy engine on gateway that orchestrates MCU fleet via MCP | Planned |
| 7. Vibration fusion | Add the Motor Vibration LSTM as a second modality on MCU | Planned |
| 8. Federated retraining | Supervisor collects features, retrains, pushes weights via MCP | Research |

Phase 1 is the foundation. The MCSA paper established that:

- Envelope preprocessing makes the classification task tractable for
  a sub-5K-parameter model
- The model fits in MCU SRAM at any precision (19 KB float32, 4.8 KB
  int8)
- Training can happen in a browser without infrastructure
- The accuracy is operationally useful (98.8% binary Healthy/Fault)

Everything else builds on this foundation.

---

## 7. References

- [MCSA paper draft](../research/motor-current-mcsa-novelty.md) —
  the 4,773-parameter LSTM and envelope preprocessing pipeline
- [Technical principles](../research/motor-current-mcsa-principles.md) —
  physics of broken rotor bars and signal processing math
- [Debugging trace](../research/motor-current-mcsa-debugging.md) —
  7 preprocessing bugs and 10 general principles
- [Structural plasticity](plasticity-vision.md) — why graph-native
  topology changes matter for online adaptation
- [ONNX parser](onnx-parser.md) — zero-dependency ONNX loader for
  cross-framework model deployment
- [Motor Vibration sample](../../packages/host/www/samples/motor/) —
  the companion mechanical fault classifier
- [Motor Current sample](../../packages/host/www/samples/motor_current/) —
  the electrical fault classifier (this work)

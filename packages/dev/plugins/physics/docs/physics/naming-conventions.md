# Physics naming conventions + rename dictionary

Canonical, explicit names for every physics node port slot and editable
parameter. Rule (memory `feedback_node_authoring`): **full words, camelCase, no
initials / single letters / acronyms**; axes as `X/Y/Z` suffixes; keep a `Hz`
suffix only where the unit is part of the meaning. Config-link slots
(`scene` / `atmosphere` / `solver` / `shared` / `layer*` / `*_in` / `*_out`)
are already descriptive and stay as-is (out of scope).

This file is the spec for the coordinated rename (no backward compatibility:
old save-files are rewritten, not migrated).

## Ports — electrical signals

| old | new |
|---|---|
| `V` | `armatureVoltage` |
| `V_cmd` | `voltageCommand` |
| `V_a` / `V_b` / `V_c` | `phaseVoltageA` / `phaseVoltageB` / `phaseVoltageC` |
| `v_a` / `v_b` / `v_c` (power meter) | `phaseVoltageA` / `phaseVoltageB` / `phaseVoltageC` |
| `V_alpha` / `V_beta` | `voltageAlpha` / `voltageBeta` |
| `V_dc` / `v_bus` | `dcBusVoltage` |
| `v_d` / `v_q` (power meter) | `directAxisVoltage` / `quadratureAxisVoltage` |
| `i` | `armatureCurrent` |
| `i_a` / `i_b` / `i_c` | `phaseCurrentA` / `phaseCurrentB` / `phaseCurrentC` |
| `i_d` / `i_q` | `directAxisCurrent` / `quadratureAxisCurrent` |
| `i_ref` | `currentReference` |
| `iq_ref` | `quadratureCurrentReference` |
| `i_measured` | `measuredCurrent` |
| `a` / `b` / `c` (Clarke in) | `phaseA` / `phaseB` / `phaseC` |
| `alpha` / `beta` (Clarke out) | `alphaComponent` / `betaComponent` |
| `d` / `q` (Park out) | `directAxis` / `quadratureAxis` |
| `back_emf` | `backEmf` |
| `duty` | `dutyCycle` |
| `duty_a` / `duty_b` / `duty_c` | `dutyCycleA` / `dutyCycleB` / `dutyCycleC` |
| `switching` | `switchingState` |
| `sector` | `commutationSector` |
| `slip` | `slip` (kept) |

## Ports — mechanical / rotational / vibration

| old | new |
|---|---|
| `omega` | `angularVelocity` |
| `omega_ref` | `angularVelocityReference` |
| `omega_measured` | `measuredAngularVelocity` |
| `theta_m` | `rotorAngle` |
| `theta_e` | `electricalAngle` |
| `theta` (shaft out) | `shaftAngle` |
| `tau_load` | `loadTorque` |
| `tau_em` | `electromagneticTorque` |
| `tau` (DC steady out) | `developedTorque` |
| `tau_c` / `tau_s` (friction in) | `coulombTorque` / `stribeckTorque` |
| `tau_friction` | `frictionTorque` |
| `force_x` / `force_y` / `force_z` | `forceX` / `forceY` / `forceZ` |
| `force_axial` / `force_radial` | `axialForce` / `radialForce` |
| `accel_x` / `accel_y` / `accel_z` | `accelerationX` / `accelerationY` / `accelerationZ` |
| `vibration` | `vibration` (kept) |
| `vibration_measured` | `measuredVibration` |
| `signal_in` / `signal_out` | `inputSignal` / `outputSignal` |
| `freq` (modulator in) | `frequency` |
| `flux` (fault descriptor out) | `fluxFault` |
| `dt` | `timeStep` |
| `speed_target` | `speedTarget` |
| `world` / `local` | `world` / `local` (kept) |
| `parent_world` | `parentWorld` |

## Ports — power meter + diagnostics

| old | new |
|---|---|
| `P` / `Q` / `S` | `activePower` / `reactivePower` / `apparentPower` |
| `P_dq` / `Q_dq` | `activePowerDq` / `reactivePowerDq` |
| `power_factor` | `powerFactor` |
| `E_active` / `E_reactive` | `activeEnergy` / `reactiveEnergy` |
| `bpfo_hz` / `bpfi_hz` / `bsf_hz` / `ftf_hz` | `outerRaceDefectFrequencyHz` / `innerRaceDefectFrequencyHz` / `ballSpinFrequencyHz` / `cageFrequencyHz` |
| `mesh_hz` | `meshFrequencyHz` |

## Editables — machine electrical

| old | new |
|---|---|
| `R` | `armatureResistance` |
| `Rs` / `Rr` | `statorResistance` / `rotorResistance` |
| `L` | `armatureInductance` |
| `Ls` / `Lr` / `Lm` | `statorInductance` / `rotorInductance` / `magnetizingInductance` |
| `Ld` / `Lq` | `directAxisInductance` / `quadratureAxisInductance` |
| `Kt` | `torqueConstant` |
| `Ke` | `backEmfConstant` |
| `lambdaM` | `magnetFluxLinkage` |
| `P` | `polePairs` |
| `f_supply` | `supplyFrequency` |

## Editables — machine mechanical / mass

| old | new |
|---|---|
| `J` | `rotorInertia` |
| `b` (machine) | `viscousFriction` |
| `i0` | `initialArmatureCurrent` |
| `omega0` | `initialAngularVelocity` |
| `theta0` | `initialRotorAngle` |
| `id0` / `iq0` | `initialDirectAxisCurrent` / `initialQuadratureAxisCurrent` |
| `ia0` / `ib0` / `ic0` | `initialPhaseCurrentA` / `initialPhaseCurrentB` / `initialPhaseCurrentC` |
| `required_hz` | `requiredSampleRateHz` |
| mass block (Phase 1, already explicit) | `motorMass` / `rotorMass` / `rotorGyrationRadius` / `comOffset` / `comPhase` / `inertiaFromMass` (kept) |

## Editables — controllers / inverters / sensors

| old | new |
|---|---|
| `Kp` / `Ki` | `proportionalGain` / `integralGain` |
| `speedKp` / `speedKi` | `speedProportionalGain` / `speedIntegralGain` |
| `currentKp` / `currentKi` | `currentProportionalGain` / `currentIntegralGain` |
| `Vmax` | `maxVoltage` |
| `vMaxPerAxis` | `maxVoltagePerAxis` |
| `iMax` | `maxCurrent` |
| `idRef` | `directAxisCurrentReference` |
| `vBus` / `Vdc` | `dcBusVoltage` |
| `V_dc_default` | `defaultDcBusVoltage` |
| `fPwm` / `pwmFrequencyHz` | `pwmFrequencyHz` |
| `strategy` | `modulationStrategy` |
| `deadTime` | `deadTime` (kept) |
| `dutyMax` | `maxDutyCycle` |
| `minDuty` / `maxDuty` | `minDutyCycle` / `maxDutyCycle` |
| `torqueMode` | `torqueMode` (kept) |
| `noiseStd` | `noiseStdDev` |
| `resolution` / `bandwidthHz` / `seed` | kept |
| `averagingHz` | `averagingFrequencyHz` |
| `broken_bars` / `total_bars` / `bar_severity` | `brokenBarCount` / `totalBarCount` / `barFaultSeverity` |

## Editables — mechanical (load / bearing / shaft / gear / friction / housing / fault)

| old | new |
|---|---|
| Load `tau0` / `tau1` | `baseTorque` / `targetTorque` |
| Load `tStep` / `rampRate` / `k` | `stepTime` / `rampRate` (kept) / `quadraticCoefficient` |
| Load `amplitude` / `frequency` / `profile` | kept |
| Bearing `nBalls` | `ballCount` |
| Bearing `ballDiameter` / `pitchDiameter` / `contactAngle` | kept |
| Bearing `bpfoAmp` / `bpfiAmp` / `bsfAmp` / `ftfAmp` | `outerRaceAmplitude` / `innerRaceAmplitude` / `ballSpinAmplitude` / `cageAmplitude` |
| Shaft `amplitude` / `phase` | kept |
| Gear `nTeeth` | `toothCount` |
| Gear `meshAmp` / `toothAmp` | `meshAmplitude` / `toothFaultAmplitude` |
| Gear `faultAngle` / `pulseWidth` | kept |
| Friction `tauC` / `tauS` / `omegaS` | `coulombTorque` / `stribeckTorque` / `stribeckVelocity` |
| Friction `b` / `opposesMotion` | `viscousFriction` / `opposesMotion` (kept) |
| Housing `massX/Y/Z` | kept |
| Housing `fnX/Y/Z` | `naturalFrequencyX` / `naturalFrequencyY` / `naturalFrequencyZ` |
| Housing `zetaX/Y/Z` | `dampingRatioX` / `dampingRatioY` / `dampingRatioZ` |
| Modulator `freqHz` | `frequencyHz` |
| Eccentricity `epsilonMax` / `thetaOffset` | `maxEccentricity` / `eccentricityPhase` |
| Imbalance `kImbalanceMax` | `maxUnbalanceProduct` |
| `severity` (faults) | `severity` (kept) |

## Borderline decisions (folded in, change at review)

- **Bearing defect frequencies** (`bpfo/bpfi/bsf/ftf`): spelled out
  (`outerRaceDefectFrequencyHz`, …) with the standard acronym kept in each
  node's doc. Same for the amplitude params.
- **`dt` → `timeStep`** everywhere.
- **`required_hz` → `requiredSampleRateHz`** (backing `_requiredHzValue` etc.
  stay internal).
- **Config-link / scene slots kept** (`scene`, `atmosphere_*`, `solver_in_*`,
  `shared_in_*`, `layer_*`, `gravity_in`, `*_in/_out`, `particulate_in_*`).
- **`world` / `local` kept** (descriptive, transform vocabulary).

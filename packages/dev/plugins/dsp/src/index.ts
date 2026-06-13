import { dspTransformSubPlugin } from "./transform/index.js";
import { dspWindowSubPlugin } from "./window/index.js";
import { dspFrameSubPlugin } from "./frame/index.js";
import { dspFeatureSubPlugin } from "./feature/index.js";
import { dspFilterSubPlugin } from "./filter/index.js";
import { dspStatsSubPlugin } from "./stats/index.js";
import { dspStreamSubPlugin } from "./stream/index.js";
import { dspGeneratorSubPlugin } from "./generator/index.js";
import { dspSensorSubPlugin } from "./sensor/index.js";
import { dspDetectSubPlugin } from "./detect/index.js";
import { dspTensorSubPlugin } from "./tensor/index.js";
import { dspAcquireSubPlugin } from "./acquire/index.js";

export * from "./nodes/factories.js";
export { dspTransformSubPlugin } from "./transform/index.js";
export { dspWindowSubPlugin } from "./window/index.js";
export { dspFrameSubPlugin } from "./frame/index.js";
export { dspFeatureSubPlugin } from "./feature/index.js";
export { dspFilterSubPlugin } from "./filter/index.js";
export { dspStatsSubPlugin } from "./stats/index.js";
export { dspStreamSubPlugin, ScalarBufferNode, createScalarBufferNode, ChannelMuxNode, createChannelMuxNode } from "./stream/index.js";
export { dspGeneratorSubPlugin, OscillatorNode, createOscillatorNode } from "./generator/index.js";
export { dspSensorSubPlugin, TransducerNode, createTransducerNode } from "./sensor/index.js";
export { dspDetectSubPlugin, SteadyStateGateNode, createSteadyStateGateNode } from "./detect/index.js";
export { dspTensorSubPlugin, TransposeNode, createTransposeNode } from "./tensor/index.js";
export { dspAcquireSubPlugin, DaqNode, createDaqNode } from "./acquire/index.js";

/**
 * @spikypanda/plugin-dsp
 *
 * Time-series DSP fundamentals organized as thematic sub-plugins
 * under the `DSP.*` namespace:
 *
 *   DSP.Generator   Signal sources (Oscillator: amplitude·sin/cos(2π·f·t + φ))
 *   DSP.Transform   FFT, IFFT, Magnitude, Phase, DCT
 *   DSP.Window      Hann/Hamming/Blackman/Bartlett/Rectangular/Tukey
 *   DSP.Frame       signal slicing with hop / pad mode
 *   DSP.Feature     Mel filterbank, LogScale, MFCC, DTW
 *   DSP.Filter      Biquad (LP/HP/BP/Notch), Kalman 1D
 *   DSP.Stats       RMS, ZCR, MovingAverage, Detrend
 *   DSP.Stream      Scalar↔tensor adapters (Buffer: float or [C] stream
 *                   → 1D/2D Float32Array tensor; Mux: N float streams
 *                   → one [N] tensor per tick)
 *   DSP.Detect      Regime detection (Steady-State Gate: hysteresis
 *                   detector that forwards only established-regime
 *                   samples and closes during transients)
 *   DSP.Tensor      Tensor layout utilities (Transpose: [A,B] → [B,A],
 *                   optional leading batch dim for ONNX encoders)
 *   DSP.Sensor      Generic transducer (LPF + Gaussian noise +
 *                   quantization + drift) for sensor-conditioning models
 *   DSP.Acquire     Block-based data acquisition (DAQ: own sim-time
 *                   sampling clock decoupled from the tick rate, 1-pole
 *                   anti-alias stage, fixed-size block tensor + block
 *                   RMS outputs)
 *
 * Most nodes are implemented as SpFx ONNX kernels (see
 * `@spiky-panda/onnx`'s `ops/dsp.ts`) and so carry the `onnx` standard.
 * A handful also have UE5 Audio counterparts and carry the `ue5` tag.
 * The DSP.Stream, DSP.Detect, DSP.Tensor, DSP.Acquire and
 * DSP.Generator sub-plugins are the exceptions: their nodes are pure
 * runtime computations (not ONNX-backed) since they're concerned with
 * streaming-vs-batch impedance matching or pure time-domain math
 * from `t`.
 *
 * Type ids follow the canonical `<Theme>.<Sub>:<node>` convention,
 * e.g. `DSP.Transform:fft` produces the palette path
 * `DSP > Transform > FFT`.
 */
export default {
    subPlugins: {
        "DSP.Generator": dspGeneratorSubPlugin,
        "DSP.Transform": dspTransformSubPlugin,
        "DSP.Window": dspWindowSubPlugin,
        "DSP.Frame": dspFrameSubPlugin,
        "DSP.Feature": dspFeatureSubPlugin,
        "DSP.Filter": dspFilterSubPlugin,
        "DSP.Stats": dspStatsSubPlugin,
        "DSP.Stream": dspStreamSubPlugin,
        "DSP.Detect": dspDetectSubPlugin,
        "DSP.Tensor": dspTensorSubPlugin,
        "DSP.Sensor": dspSensorSubPlugin,
        "DSP.Acquire": dspAcquireSubPlugin,
    },
};

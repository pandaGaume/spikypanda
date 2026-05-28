import { dspTransformSubPlugin } from "./transform/index.js";
import { dspWindowSubPlugin }    from "./window/index.js";
import { dspFrameSubPlugin }     from "./frame/index.js";
import { dspFeatureSubPlugin }   from "./feature/index.js";
import { dspFilterSubPlugin }    from "./filter/index.js";
import { dspStatsSubPlugin }     from "./stats/index.js";

export * from "./nodes/factories.js";
export { dspTransformSubPlugin } from "./transform/index.js";
export { dspWindowSubPlugin }    from "./window/index.js";
export { dspFrameSubPlugin }     from "./frame/index.js";
export { dspFeatureSubPlugin }   from "./feature/index.js";
export { dspFilterSubPlugin }    from "./filter/index.js";
export { dspStatsSubPlugin }     from "./stats/index.js";

/**
 * @spikypanda/plugin-dsp
 *
 * Time-series DSP fundamentals organized as 6 thematic sub-plugins
 * under the `DSP.*` namespace:
 *
 *   DSP.Transform   FFT, IFFT, Magnitude, Phase, DCT
 *   DSP.Window      Hann/Hamming/Blackman/Bartlett/Rectangular/Tukey
 *   DSP.Frame       signal slicing with hop / pad mode
 *   DSP.Feature     Mel filterbank, LogScale, MFCC, DTW
 *   DSP.Filter      Biquad (LP/HP/BP/Notch), Kalman 1D
 *   DSP.Stats       RMS, ZCR, MovingAverage, Detrend
 *
 * Every node is implemented as a SpFx ONNX kernel (see
 * `@spiky-panda/onnx`'s `ops/dsp.ts`) and so carries the `onnx` standard.
 * A handful also have UE5 Audio counterparts and carry the `ue5` tag.
 *
 * Type ids follow the canonical `<Theme>.<Sub>:<node>` convention,
 * e.g. `DSP.Transform:fft` produces the palette path
 * `DSP > Transform > FFT`.
 */
export default {
    subPlugins: {
        "DSP.Transform": dspTransformSubPlugin,
        "DSP.Window":    dspWindowSubPlugin,
        "DSP.Frame":     dspFrameSubPlugin,
        "DSP.Feature":   dspFeatureSubPlugin,
        "DSP.Filter":    dspFilterSubPlugin,
        "DSP.Stats":     dspStatsSubPlugin,
    },
};

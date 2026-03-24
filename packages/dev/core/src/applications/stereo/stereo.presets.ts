import { IStereoConfig, IStereoCnnGraph, MergeStrategy } from "./stereo.interfaces";
import { StereoCnnBuilder } from "./stereo.builder";

/// <summary>
/// Pre-configured stereo CNN architectures.
/// </summary>

export enum StereoPreset {
    /// <summary>
    /// Minimal stereo architecture for testing and rapid prototyping.
    /// 16x16 input, 1 conv layer with 8 filters, maxDisparity=8, cross at layer 0.
    /// </summary>
    Tiny = "tiny",

    /// <summary>
    /// Small stereo architecture with two conv layers.
    /// 32x32 input, filters [8, 16], maxDisparity=16, cross at layers 0 and 1.
    /// </summary>
    Small = "small",
}

export interface StereoPresetConfig {
    channels?: number;
    outputWidth?: number;
    outputHeight?: number;
    mergeStrategy?: MergeStrategy;
}

/// <summary>
/// Builds a stereo CNN graph from a preset and optional configuration overrides.
/// </summary>
export function buildStereoFromPreset(preset: StereoPreset, overrides?: StereoPresetConfig): IStereoCnnGraph {
    const channels = overrides?.channels ?? 1;
    const mergeStrategy = overrides?.mergeStrategy ?? MergeStrategy.Diff;

    let config: IStereoConfig;

    switch (preset) {
        case StereoPreset.Tiny: {
            const width = 16;
            const height = 16;
            // After conv 3x3 valid: 14x14
            const outW = overrides?.outputWidth ?? 14;
            const outH = overrides?.outputHeight ?? 14;
            config = {
                width,
                height,
                channels,
                maxDisparity: 8,
                filters: [8],
                kernelSizes: [3],
                crossLayers: [0],
                mergeStrategy,
                outputWidth: outW,
                outputHeight: outH,
            };
            break;
        }

        case StereoPreset.Small: {
            const width = 32;
            const height = 32;
            // After conv 3x3 valid: 30x30, then conv 3x3 valid: 28x28
            const outW = overrides?.outputWidth ?? 28;
            const outH = overrides?.outputHeight ?? 28;
            config = {
                width,
                height,
                channels,
                maxDisparity: 16,
                filters: [8, 16],
                kernelSizes: [3, 3],
                crossLayers: [0, 1],
                mergeStrategy,
                outputWidth: outW,
                outputHeight: outH,
            };
            break;
        }
    }

    const builder = new StereoCnnBuilder(config);
    return builder.build();
}

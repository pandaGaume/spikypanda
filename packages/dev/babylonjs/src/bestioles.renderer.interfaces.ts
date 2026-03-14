export interface IBestiolesRendererOptions {
    /** Distance of the ArcRotateCamera from target (default: 300) */
    cameraDistance?: number;
    /** Particle size (default: 1.5) */
    particleSize?: number;
    /** Low-fitness color as [r,g,b] 0-1 (default: [1, 0.2, 0.1] red) */
    colorLow?: [number, number, number];
    /** High-fitness color as [r,g,b] 0-1 (default: [0.1, 1, 0.3] green) */
    colorHigh?: [number, number, number];
    /** Show wireframe bounding box (default: true) */
    showBounds?: boolean;
    /** Background clear color as [r,g,b,a] 0-1 (default: [0.05, 0.05, 0.12, 1]) */
    clearColor?: [number, number, number, number];
    /**
     * When true, the camera target follows the centroid of all alive creatures
     * each frame instead of staying fixed at the world center.
     * Essential for large worlds where the flock occupies a tiny fraction of
     * the volume — keeps the action centered in view. (default: false)
     */
    trackGroupCenter?: boolean;
}

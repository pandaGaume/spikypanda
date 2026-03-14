import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { SolidParticleSystem } from "@babylonjs/core/Particles/solidParticleSystem";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

import { IBestiolesRendererOptions } from "./bestioles.renderer.interfaces";
import type { CreatureWorld } from "@spikypanda/bestioles";

/**
 * BabylonJS renderer for the bestioles simulation.
 *
 * Uses a **Solid Particle System (SPS)** to render all creatures as a single
 * draw call — far more efficient than individual meshes. Each creature gets
 * one SPS particle (icosphere) whose position, rotation, and color are
 * updated every frame from the simulation state.
 *
 * **Why SPS over instanced meshes?**
 * - SPS allows per-particle color without extra vertex buffers
 * - Built-in support for hiding particles (scaling to 0) when creatures die
 * - All particles share one material and one draw call
 *
 * **Coordinate mapping (simulation → BabylonJS):**
 * The simulation uses Z-up internally (x=width, y=height, z=depth),
 * but BabylonJS uses Y-up. So we remap:
 *   - Simulation x → BJS x (unchanged)
 *   - Simulation z → BJS y (sim's vertical becomes BJS's vertical)
 *   - Simulation y → BJS z (sim's depth becomes BJS's depth)
 *
 * **Render loop:**
 * 1. `world.updateWorld()` — advance simulation by one tick
 * 2. `sps.setParticles()` — calls updateParticle() for each particle,
 *    syncing position/rotation/color from creature state
 * 3. `scene.render()` — BabylonJS draws the frame
 */
export class BestiolesRenderer {
    private _engine: Engine;
    private _scene: Scene;
    private _camera: ArcRotateCamera;
    private _sps: SolidParticleSystem;
    private _world: CreatureWorld;
    private _options: Required<IBestiolesRendererOptions>;
    private _running: boolean = false;
    /** Smoothed group center for camera tracking (avoids jitter) */
    private _smoothTarget: Vector3 = Vector3.Zero();
    /** True until the first tracking update snaps the camera to the group */
    private _firstTrackingFrame: boolean = true;

    /**
     * @param canvas   The HTML canvas element BabylonJS will render into.
     * @param world    The simulation world instance — the renderer reads
     *                 creature state from this each frame (positions, headings,
     *                 fitness values) and calls updateWorld() each tick.
     * @param options  Optional rendering configuration (camera distance,
     *                 particle size, colors, etc.). See IBestiolesRendererOptions.
     */
    constructor(canvas: HTMLCanvasElement, world: CreatureWorld, options?: IBestiolesRendererOptions) {
        this._world = world;
        this._options = {
            cameraDistance: options?.cameraDistance ?? 300,
            particleSize: options?.particleSize ?? 1.5,
            colorLow: options?.colorLow ?? [1, 0.2, 0.1], // red-orange for low fitness
            colorHigh: options?.colorHigh ?? [0.1, 1, 0.3], // green for high fitness
            showBounds: options?.showBounds ?? true,
            clearColor: options?.clearColor ?? [0.05, 0.05, 0.12, 1], // dark blue-black background
            trackGroupCenter: options?.trackGroupCenter ?? false,
        };

        // ── Engine & Scene ──
        // preserveDrawingBuffer: needed for screenshots/toDataURL
        // stencil: enables outline/highlight effects if added later
        this._engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
        this._scene = new Scene(this._engine);
        const cc = this._options.clearColor;
        this._scene.clearColor = new Color4(cc[0], cc[1], cc[2], cc[3]);

        // ── Compute initial camera target ──
        // For tracking mode: use the actual creature centroid, not world center.
        // This avoids the camera starting far from the cluster in huge worlds.
        const bounds = this._world.bounds;
        const maxDim = Math.max(bounds.width, bounds.height, bounds.depth);

        let initialTarget: Vector3;
        if (this._options.trackGroupCenter) {
            // Compute actual creature centroid (in BJS Y-up coords)
            let cx = 0,
                cy = 0,
                cz = 0,
                n = 0;
            for (const c of this._world.creatures) {
                if (!c.alive) continue;
                cx += c.position.x;
                cy += c.position.y;
                cz += c.position.z;
                n++;
            }
            if (n > 0) {
                cx /= n;
                cy /= n;
                cz /= n;
                // Remap: sim x→BJS x, sim z→BJS y, sim y→BJS z
                initialTarget = new Vector3(cx, cz, cy);
            } else {
                initialTarget = new Vector3(bounds.width / 2, bounds.depth / 2, bounds.height / 2);
            }
        } else {
            // Center of the bounding box (with Y-up remapping: z→y, y→z)
            initialTarget = new Vector3(bounds.width / 2, bounds.depth / 2, bounds.height / 2);
        }

        // ── Camera: arc-rotate (orbit) around creature cluster ──
        // ArcRotateCamera orbits a target point — perfect for watching a swarm.
        // Instead of guessing alpha/beta (which vary with BJS version and
        // coordinate handedness), we create the camera then explicitly set
        // its position relative to the target.
        this._camera = new ArcRotateCamera(
            "cam",
            0,
            0, // alpha/beta: will be overridden by setPosition
            this._options.cameraDistance,
            initialTarget,
            this._scene
        );
        // Place camera: offset from target in +Y (up) and -Z (toward viewer)
        // so the cluster is centered and slightly below eye level.
        const d = this._options.cameraDistance;
        this._camera.setPosition(
            new Vector3(
                initialTarget.x,
                initialTarget.y + d * 0.4, // slightly above
                initialTarget.z - d * 0.9 // in front (−Z = toward viewer in BJS)
            )
        );
        this._camera.attachControl(canvas, true);

        // Camera zoom limits: allow getting very close (10 units) while still
        // being able to zoom out to see the whole world.
        this._camera.lowerRadiusLimit = 10;
        this._camera.upperRadiusLimit = maxDim * 4;

        // Scroll zoom speed: fast for large worlds (default ~3 is way too slow
        // for traversing 10000→100), moderate for small worlds.
        this._camera.wheelPrecision = maxDim > 1000 ? 0.1 : maxDim > 500 ? 0.5 : 3;

        // Clipping planes: near=1, far proportional to world size.
        // No logarithmic depth (can cause SPS render issues on some GPUs).
        this._camera.minZ = 1;
        this._camera.maxZ = maxDim * 10;

        // Initialize smooth target for tracking (snapped to actual centroid)
        this._smoothTarget = initialTarget.clone();
        this._firstTrackingFrame = true;

        // ── Light ──
        // Hemispheric light: illuminates from above (Y=1) with slight forward
        // tilt (Z=0.3). The "ground color" (automatic) fills in from below
        // so no surface is completely black.
        new HemisphericLight("light", new Vector3(0, 1, 0.3), this._scene);

        // ── Bounding box wireframe ──
        // Visual guide showing the simulation boundaries.
        // Uses wireframe material so it doesn't occlude the particles.
        if (this._options.showBounds) {
            const boxCenter = new Vector3(bounds.width / 2, bounds.depth / 2, bounds.height / 2);
            this._createBoundsBox(bounds.width, bounds.height, bounds.depth, boxCenter);
        }

        // ── Solid Particle System ──
        // One particle per creature — all rendered in a single draw call.
        this._sps = this._createSPS();

        // Re-layout when the browser window resizes
        window.addEventListener("resize", () => this._engine.resize());
    }

    /**
     * Create a wireframe box showing the simulation boundaries.
     * Dimensions are remapped from simulation coords (Z-up) to BJS (Y-up):
     * BJS width = sim width, BJS height = sim depth, BJS depth = sim height.
     */
    private _createBoundsBox(w: number, h: number, d: number, center: Vector3): void {
        const box = MeshBuilder.CreateBox("bounds", { width: w, height: d, depth: h }, this._scene);
        box.position = center;
        const mat = new StandardMaterial("boundsMat", this._scene);
        mat.wireframe = true; // lines only, no filled faces
        mat.emissiveColor = new Color3(0.3, 0.3, 0.5); // blue-ish glow (ignores lighting)
        mat.disableLighting = true; // constant color regardless of light direction
        box.material = mat;
    }

    /**
     * Create the SPS with one icosphere particle per creature.
     *
     * **Why icosphere?** Looks spherical but with only ~42 vertices at
     * subdivision=1, keeping the vertex count low (100 creatures × 42 verts
     * = 4,200 total — trivial for the GPU).
     *
     * **Material setup for visibility from all angles:**
     * - `backFaceCulling = false`: renders both sides of each triangle.
     *   Without this, triangles facing away from the camera are invisible.
     * - `twoSidedLighting = true`: applies lighting to back faces too.
     *   Without this, back faces would be lit as if they face the camera,
     *   creating visual artifacts.
     * - `emissiveColor = (0.3, 0.3, 0.3)`: adds a base glow to all surfaces.
     *   Without this, faces perpendicular to the light direction receive no
     *   illumination and appear completely black — making particles vanish
     *   when the camera orbits to certain angles.
     */
    private _createSPS(): SolidParticleSystem {
        const sps = new SolidParticleSystem("sps", this._scene, {
            isPickable: false, // no need for mouse hit testing — saves CPU
        });

        // Template mesh: low-poly icosphere. Disposed after SPS copies its geometry.
        const model = MeshBuilder.CreateIcoSphere(
            "model",
            {
                radius: this._options.particleSize, // 1.5 world-units — visible but not huge
                subdivisions: 1, // lowest detail (42 vertices)
            },
            this._scene
        );

        // Create one SPS particle per creature
        sps.addShape(model, this._world.creatures.length);
        model.dispose(); // template no longer needed — SPS has copied the geometry

        const mesh = sps.buildMesh();
        mesh.hasVertexAlpha = false; // no transparency — avoids sorting overhead

        // CRITICAL: disable frustum culling on the SPS mesh.
        // The mesh's bounding box is computed at buildMesh() from particle
        // positions (all at origin). When particles move to their real world
        // positions (e.g., 25000,25000,25000), the tiny bounding box at origin
        // gets frustum-culled as soon as the camera looks away from (0,0,0).
        // alwaysSelectAsActiveMesh bypasses the bounding-box check entirely.
        mesh.alwaysSelectAsActiveMesh = true;

        // Material: double-sided + emissive glow (see JSDoc above)
        const mat = new StandardMaterial("spsMat", this._scene);
        mat.backFaceCulling = false;
        mat.twoSidedLighting = true;
        mat.diffuseColor = new Color3(1, 1, 1); // full white diffuse — per-particle color comes from SPS
        mat.emissiveColor = new Color3(0.8, 0.8, 0.8); // 80% self-illumination — bright particles against dark background
        mesh.material = mat;

        // ── Per-particle update function ──
        // Called by sps.setParticles() each frame, once per particle.
        // Syncs the SPS particle's visual state with the simulation creature.
        sps.updateParticle = (particle) => {
            const creature = this._world.creatures[particle.idx];

            // Dead or missing creature → hide particle by scaling to zero.
            // This is more efficient than removing/re-adding particles.
            if (!creature || !creature.alive) {
                particle.scaling.setAll(0);
                return particle;
            }

            // Alive creature → show at full scale
            particle.scaling.setAll(1);

            // ── Position mapping (simulation Z-up → BJS Y-up) ──
            // Simulation: x = width axis, y = height axis, z = depth axis (up)
            // BabylonJS:  x = right,      y = up,          z = forward
            const pos = creature.position;
            particle.position.x = pos.x; // sim x → BJS x (horizontal)
            particle.position.y = pos.z; // sim z → BJS y (vertical / up)
            particle.position.z = pos.y; // sim y → BJS z (depth / forward)

            // ── Rotation from heading (yaw) and pitch ──
            // BJS rotation order is YXZ by default.
            // creature.heading = yaw (horizontal rotation around Y axis)
            // creature.pitch = vertical tilt (rotation around X axis, negated
            //   because BJS X rotation is opposite to our pitch convention)
            particle.rotation.x = -creature.pitch;
            particle.rotation.y = creature.heading;
            particle.rotation.z = 0;

            // ── Color by fitness: linear interpolation from red → green ──
            // fitness is a running average in [0,1].
            // t=0 → colorLow (red/orange), t=1 → colorHigh (green).
            // This gives an instant visual indication of each creature's
            // evolutionary success.
            const t = Math.max(0, Math.min(1, creature.fitness));
            const cL = this._options.colorLow;
            const cH = this._options.colorHigh;
            particle.color!.r = cL[0] + (cH[0] - cL[0]) * t;
            particle.color!.g = cL[1] + (cH[1] - cL[1]) * t;
            particle.color!.b = cL[2] + (cH[2] - cL[2]) * t;
            particle.color!.a = 1; // fully opaque

            return particle;
        };

        // ── Initialize all particles with a neutral gray ──
        // Prevents a flash of white/undefined color on the first frame.
        sps.initParticles = () => {
            for (let i = 0; i < sps.nbParticles; i++) {
                const p = sps.particles[i];
                p.color = new Color4(0.5, 0.5, 0.5, 1);
            }
        };
        sps.initParticles();
        sps.setParticles(); // apply initial state to GPU buffers

        return sps;
    }

    /**
     * Start the render loop.
     *
     * Each frame (targeting 60fps):
     * 1. Advance the simulation by one tick (world.updateWorld)
     * 2. Sync all SPS particles from creature state (sps.setParticles)
     * 3. Render the BabylonJS scene to the canvas
     *
     * The simulation and rendering are coupled 1:1 — one sim tick per
     * rendered frame. At 60fps this means 60 sim ticks/sec. If the frame
     * rate drops (heavy load), the simulation also slows down, which
     * keeps the physics stable (no variable delta-time issues).
     */
    public start(): void {
        if (this._running) return;
        this._running = true;

        this._engine.runRenderLoop(() => {
            this._world.updateWorld(); // advance simulation
            this._sps.setParticles(); // sync visuals from creature state

            // ── Camera tracking: follow the group centroid ──
            if (this._options.trackGroupCenter) {
                const creatures = this._world.creatures;
                let cx = 0,
                    cy = 0,
                    cz = 0,
                    count = 0;
                for (const c of creatures) {
                    if (!c.alive) continue;
                    cx += c.position.x;
                    cy += c.position.y;
                    cz += c.position.z;
                    count++;
                }
                if (count > 0) {
                    cx /= count;
                    cy /= count;
                    cz /= count;
                    // BJS Y-up remapping: sim x→x, sim z→y(up), sim y→z(fwd)
                    const targetX = cx;
                    const targetY = cz;
                    const targetZ = cy;

                    if (this._firstTrackingFrame) {
                        // Snap immediately on first frame — no lag at startup
                        this._smoothTarget.set(targetX, targetY, targetZ);
                        this._firstTrackingFrame = false;
                    } else {
                        // Exponential smoothing: 0.3 = fast follow, keeps
                        // the group centered even at speed 8/tick.
                        // Steady-state lag = speed / smoothing = 8/0.3 ≈ 27 units
                        // (tiny compared to camera distance of ~480).
                        const k = 0.3;
                        this._smoothTarget.x += (targetX - this._smoothTarget.x) * k;
                        this._smoothTarget.y += (targetY - this._smoothTarget.y) * k;
                        this._smoothTarget.z += (targetZ - this._smoothTarget.z) * k;
                    }
                    this._camera.setTarget(this._smoothTarget);
                }
            }

            this._scene.render(); // draw frame
        });
    }

    /** Stop the render loop. Can be resumed with start(). */
    public stop(): void {
        this._running = false;
        this._engine.stopRenderLoop();
    }

    /** Access the BabylonJS Scene for external hooks (e.g., onAfterRender). */
    public get scene(): Scene {
        return this._scene;
    }

    /** Access the BabylonJS Engine for resize/performance monitoring. */
    public get engine(): Engine {
        return this._engine;
    }

    /**
     * Fully dispose of the renderer: stops the render loop, disposes the
     * BabylonJS scene and engine, and removes the resize listener.
     * After calling dispose(), the canvas can be reused with a new renderer.
     */
    public dispose(): void {
        this.stop();
        this._scene.dispose();
        this._engine.dispose();
    }
}

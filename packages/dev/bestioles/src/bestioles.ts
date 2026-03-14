import { CreatureBrain } from "./bestioles.brain";
import { SimConfig } from "./bestioles.config";
import { ICreatureBrain, IWorldBounds } from "./bestioles.interfaces";

/**
 * A single creature in the simulation.
 *
 * **Movement model**: spherical coordinates (yaw + pitch + speed).
 *   - Yaw (heading): horizontal angle, full 360° (0 to 2π)
 *   - Pitch: vertical angle, clamped to ±π/2 (straight up/down)
 *   - Speed: scalar, 0 to SimConfig.maxSpeed
 *
 * Each tick, the brain's neural network maps 16 sensor inputs to
 * 3 motor outputs (speed, yaw turn, pitch turn). The creature then:
 *   1. Applies brain-decided turning
 *   2. Applies wall avoidance steering (overrides brain near walls)
 *   3. Moves in the direction of (heading, pitch) at current speed
 *   4. Computes fitness from boid-style social metrics
 *
 * **Lifecycle**: creatures have a random max age (500–1500 ticks).
 * When they die, the world replaces them with mutated offspring
 * of the fittest survivors — this drives evolution.
 */
export class Creature {
    /** The neural network controlling this creature's behavior. */
    public brain: ICreatureBrain;

    /** Running average fitness over the creature's lifetime (0–1 range).
     *  Used by the world to select parents for reproduction. */
    public fitness: number = 0;

    /** Set to false when the creature dies (age > maxAge).
     *  Dead creatures are replaced by offspring in the next tick. */
    public alive: boolean = true;

    private _age: number = 0;
    private _maxAge: number;

    /** Yaw angle in radians — horizontal direction the creature faces.
     *  Unbounded (wraps naturally via sin/cos in movement equations). */
    private _heading: number;

    /** Pitch angle in radians — vertical tilt. Clamped to [−π/2, +π/2].
     *  0 = horizontal, +π/2 = straight up, −π/2 = straight down. */
    private _pitch: number = 0;

    /** Current speed in world-units per tick (0 to maxSpeed). */
    private _speed: number = 0;

    /** Smoothed yaw turn rate (used for turn damping / inertia).
     *  When turnDamping > 0, the actual yaw change is a low-pass filtered
     *  version of the brain's requested turn rate. This prevents instant
     *  direction changes and makes spinning physically impossible at
     *  high damping values. */
    private _smoothYawRate: number = 0;

    /** Smoothed pitch turn rate (same concept as _smoothYawRate). */
    private _smoothPitchRate: number = 0;

    /** Position in 3D world space (x=width axis, y=height axis, z=depth axis). */
    private _position: { x: number; y: number; z: number };

    /** Accumulated raw fitness over lifetime — divided by age to get
     *  the running average (this.fitness). Using an accumulator avoids
     *  storing the entire history. */
    private _fitnessAccum: number = 0;

    /** Consecutive ticks with zero neighbors within vision range.
     *  When this exceeds SimConfig.isolationDeathTicks, the creature
     *  dies — preventing isolated individuals from drifting forever.
     *  Reset to 0 as soon as at least one neighbor is detected. */
    private _isolationTicks: number = 0;

    /**
     * @param startX, startY, startZ  Initial position in world space.
     * @param brain   Optional brain to clone from (used during reproduction).
     *                If omitted, a new randomly-initialized brain is created.
     * @param maxAge  Ticks before natural death. Staggered randomly (500–1500)
     *                so creatures don't all die at once, which would collapse
     *                the population and lose evolved behaviors.
     */
    constructor(startX: number, startY: number, startZ: number, brain?: ICreatureBrain, maxAge: number = 1000) {
        this.brain = brain ? brain : new CreatureBrain();
        this._maxAge = maxAge;
        this._heading = Math.random() * 2 * Math.PI;
        this._pitch = (Math.random() - 0.5) * Math.PI;
        this._position = { x: startX, y: startY, z: startZ };
    }

    public get position(): { x: number; y: number; z: number } {
        return this._position;
    }

    public get heading(): number {
        return this._heading;
    }

    public get pitch(): number {
        return this._pitch;
    }

    public get speed(): number {
        return this._speed;
    }

    /**
     * Main per-tick update. Called by CreatureWorld for each alive creature.
     *
     * @param sensors       16-float array of normalized sensor values
     *                      (see CreatureWorld._buildSensors for layout).
     * @param neighborInfo  Pre-computed social metrics from the world:
     *   - avgDist:        Average distance to neighbors, normalized by
     *                     neighborRadius. 0 = on top of them, 1 = at edge of vision.
     *   - alignmentDot:   Average dot product of heading vectors with neighbors.
     *                     +1 = same direction, −1 = opposite, 0 = perpendicular.
     *   - tooCloseCount:  Number of neighbors within separationDist.
     * @param bounds        World bounding box dimensions.
     */
    public update(
        sensors: number[],
        neighborInfo: { avgDist: number; alignmentDot: number; tooCloseCount: number; neighborCount: number },
        bounds: IWorldBounds
    ) {
        // ── Step 1: Brain inference ──
        // Feed 18 sensors through the 18→10→3 neural network.
        // Outputs are sigmoid [0,1]:
        //   [0] = speed factor, [1] = yaw turn factor, [2] = pitch turn factor
        const [speedOut, yawOut, pitchOut] = this.brain.evaluate(sensors);

        // Map sigmoid [0,1] outputs to physical movement values:
        //   speed: 0→0, 1→maxSpeed (always forward, never negative)
        //   yaw:   0.5→0 (straight), 0→−maxTurnRate (left), 1→+maxTurnRate (right)
        //   pitch: 0.5→0 (level), 0→−maxPitchRate (dive), 1→+maxPitchRate (climb)
        this._speed = speedOut * SimConfig.maxSpeed;
        const yawRate = (yawOut - 0.5) * 2 * SimConfig.maxTurnRate;
        const pitchRate = (pitchOut - 0.5) * 2 * SimConfig.maxPitchRate;

        // ── Step 2: Apply turn damping (inertia) ──
        // Turn damping smooths angular velocity: the actual turn rate is a
        // weighted blend of the previous rate and the brain's new request.
        //   smoothed = previous × damping + brain × (1 − damping)
        // At damping=0: instant turns (original behavior).
        // At damping=0.9: turn rate responds 10× slower → only gradual arcs.
        const damping = SimConfig.turnDamping;

        this._smoothYawRate = this._smoothYawRate * damping + yawRate * (1 - damping);
        this._smoothPitchRate = this._smoothPitchRate * damping + pitchRate * (1 - damping);

        this._heading += this._smoothYawRate;
        this._pitch += this._smoothPitchRate;

        // ── Step 3: Wall avoidance (overrides brain near boundaries) ──
        // This runs AFTER brain turning so the wall steering can correct
        // the heading/pitch before movement is computed. Wall avoidance
        // is a soft force — it nudges the heading proportionally to how
        // close the creature is to each wall face.
        this._avoidWalls(bounds);

        // ── Step 4: Clamp pitch to ±π/2 ──
        // Beyond ±90° would flip the creature upside-down, causing
        // discontinuous behavior (cos(pitch) goes negative → reverses
        // horizontal direction). Clamping keeps the coordinate system sane.
        this._pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this._pitch));

        // ── Step 5: Compute 3D velocity from spherical coordinates ──
        // Direction vector = (cos(pitch)·cos(yaw), cos(pitch)·sin(yaw), sin(pitch))
        // This is a unit vector, scaled by speed.
        // Note: cos(pitch) naturally reduces horizontal speed at steep pitch
        // angles — a creature pointing straight up moves only in Z.
        const cosPitch = Math.cos(this._pitch);
        const dx = cosPitch * Math.cos(this._heading) * this._speed;
        const dy = cosPitch * Math.sin(this._heading) * this._speed;
        const dz = Math.sin(this._pitch) * this._speed;
        this._position.x += dx;
        this._position.y += dy;
        this._position.z += dz;

        // ── Step 6: Hard clamp to world bounds (safety net) ──
        // Wall avoidance should prevent reaching the edges, but if a
        // creature is moving too fast or wall steering is too weak,
        // this prevents escaping the box. The 1-unit margin avoids
        // placing creatures exactly on the boundary (which would make
        // wall sensors report 0 distance → division issues).
        this._position.x = Math.max(1, Math.min(bounds.width - 1, this._position.x));
        this._position.y = Math.max(1, Math.min(bounds.height - 1, this._position.y));
        this._position.z = Math.max(1, Math.min(bounds.depth - 1, this._position.z));

        this._age++;

        // ── Step 7: Compute boid-style fitness ──
        // Fitness determines which creatures survive and reproduce.
        // Four independent scores, each in [0,1], weighted by SimConfig:

        // Cohesion: reward being close to neighbors.
        // avgDist is normalized to [0,1] by neighborRadius, so
        // (1 − avgDist) = 1 when right on top of neighbors, 0 at edge of vision.
        const cohesionScore = Math.max(0, 1 - neighborInfo.avgDist);

        // Alignment: reward heading in the same direction as neighbors.
        // alignmentDot is a dot product in [−1,+1]; map to [0,1] so
        // opposite headings = 0, same heading = 1.
        const alignmentScore = (neighborInfo.alignmentDot + 1) / 2;

        // Separation: reward NOT being too close (within separationDist).
        // tooCloseCount = 0 → perfect score (1.0).
        // score = 1 / (1 + count), so 1 neighbor too close = 0.5, etc.
        const separationScore = 1 / (1 + neighborInfo.tooCloseCount);

        // Movement: reward speed. speedOut is already [0,1] but we use
        // actual _speed/maxSpeed in case wall avoidance modified it.
        // This prevents creatures from evolving to sit still (which
        // would maximize cohesion without doing anything interesting).
        const movementScore = this._speed / SimConfig.maxSpeed;

        // Wall penalty: penalize being near any wall.
        // This is a MULTIPLIER (0.5 to 1.0) applied to total fitness,
        // not a separate weighted component. This prevents the group from
        // "settling" against a wall — even if cohesion pulls them there,
        // creatures near the wall have lower fitness and are less likely
        // to be selected as parents, so the group naturally drifts inward.
        // The penalty only activates within wallMargin distance.
        const wallMargin = SimConfig.wallMargin;
        const nearestWall = Math.min(
            this._position.x, bounds.width - this._position.x,
            this._position.y, bounds.height - this._position.y,
            this._position.z, bounds.depth - this._position.z
        );
        // wallPenalty = 1.0 when far from walls (no penalty),
        // drops to 0.5 when right at the wall.
        // The curve is linear within the margin: penalty = 0.5 + 0.5*(dist/margin)
        const wallPenalty = nearestWall >= wallMargin
            ? 1.0
            : 0.5 + 0.5 * (nearestWall / wallMargin);

        // Weighted sum — the four SimConfig.fitness* weights control
        // which behavior the evolutionary process selects for.
        // The wall penalty multiplier reduces total fitness near boundaries
        // without needing an extra UI slider (it's always active).
        const frameFitness = (
            cohesionScore * SimConfig.fitnessCohesion +
            alignmentScore * SimConfig.fitnessAlignment +
            separationScore * SimConfig.fitnessSeparation +
            movementScore * SimConfig.fitnessMovement
        ) * wallPenalty;

        // Running average: accumulate total fitness, divide by age.
        // This smooths out frame-to-frame noise and gives a stable
        // lifetime score for parent selection.
        this._fitnessAccum += frameFitness;
        this.fitness = this._fitnessAccum / this._age;

        // ── Step 8: Age-based death ──
        if (this._age > this._maxAge) {
            this.alive = false;
        }

        // ── Step 9: Isolation death ──
        // If the creature has ZERO neighbors in vision range, increment the
        // isolation counter. After isolationDeathTicks consecutive ticks
        // completely alone, it dies. This catches true stragglers only.
        //
        // Sub-group prevention is handled by the density fitness factor
        // (Step 7), NOT by death — death-based mechanisms cause cascade
        // extinction (killing creatures reduces neighbor counts, causing
        // more deaths, causing total collapse).
        //
        // Grace period: first 100 ticks are immune (newborns need time
        // to find the group after spawning near the center).
        const isoThreshold = SimConfig.isolationDeathTicks;
        if (isoThreshold > 0 && this._age > 100) {
            if (neighborInfo.neighborCount === 0) {
                this._isolationTicks++;
                if (this._isolationTicks > isoThreshold) {
                    this.alive = false;
                }
            } else {
                this._isolationTicks = 0;
            }
        }
    }

    /**
     * Soft wall avoidance — steers heading and pitch away from nearby walls.
     *
     * **How it works:**
     * 1. Compute distance to each of the 6 box faces (±x, ±y, ±z).
     * 2. For each face within wallMargin, compute a QUADRATIC repulsion force:
     *    force = (1 − distance/margin)². Quadratic means the force is weak at
     *    the margin edge but grows rapidly near the wall — this prevents the
     *    old problem where creatures could "fight" the linear wall force and
     *    ride along the boundary.
     * 3. Sum all repulsion forces into a 3D steer vector.
     * 4. Convert the steer vector to a desired yaw and pitch.
     * 5. Rotate the creature's heading/pitch toward the desired direction.
     *    The rotation strength scales with proximity² × wallSteerStrength,
     *    and is UNCAPPED when very close — so near a wall the avoidance
     *    completely overrides the brain's turning decision.
     *
     * **Why quadratic instead of linear?**
     * With linear ramp, a creature at half the margin distance got 50% force.
     * The brain's max turn rate (0.18 rad) could easily oppose the wall
     * avoidance force (0.15 × 0.5 = 0.075 rad), so creatures evolved to
     * hug walls. With quadratic: at half margin → force = 0.25 (gentle),
     * at 1/4 margin → force = 0.56 (strong), at 1/10 margin → force = 0.81
     * (overwhelming). The brain can still steer normally at the margin edge
     * but can NOT fight the avoidance close to the wall.
     *
     * **Why soft steering instead of hard wrapping?**
     * Wrapping (teleporting to the opposite side) breaks group cohesion —
     * creatures near the edge suddenly appear far from their neighbors,
     * killing the swarm. Soft avoidance keeps the group intact.
     *
     * **Why applied BEFORE movement?**
     * If applied after movement, the creature would already be at the wall.
     * By steering before moving, we redirect the velocity vector and the
     * creature curves away smoothly.
     */
    private _avoidWalls(bounds: IWorldBounds): void {
        const pos = this._position;
        const margin = SimConfig.wallMargin;

        // Distance to each of the 6 faces
        const dLeft = pos.x;                  // distance to x=0 face
        const dRight = bounds.width - pos.x;  // distance to x=width face
        const dFront = pos.y;                 // distance to y=0 face
        const dBack = bounds.height - pos.y;  // distance to y=height face
        const dBottom = pos.z;                // distance to z=0 face
        const dTop = bounds.depth - pos.z;    // distance to z=depth face

        // Accumulate repulsion vector — points away from nearby walls.
        // Uses QUADRATIC ramp: force = (1 − d/margin)² so it's gentle at the
        // margin boundary but overwhelming near the wall.
        // Example: dLeft=10, margin=35 → t = 1−(10/35) = 0.71 → force = 0.71² = 0.51
        // Example: dLeft=5, margin=35  → t = 1−(5/35)  = 0.86 → force = 0.86² = 0.73
        let steerX = 0, steerY = 0, steerZ = 0;

        if (dLeft < margin)   { const t = 1 - dLeft / margin;   steerX += t * t; }  // push toward +x
        if (dRight < margin)  { const t = 1 - dRight / margin;  steerX -= t * t; }  // push toward −x
        if (dFront < margin)  { const t = 1 - dFront / margin;  steerY += t * t; }  // push toward +y
        if (dBack < margin)   { const t = 1 - dBack / margin;   steerY -= t * t; }  // push toward −y
        if (dBottom < margin) { const t = 1 - dBottom / margin;  steerZ += t * t; } // push toward +z
        if (dTop < margin)    { const t = 1 - dTop / margin;    steerZ -= t * t; }  // push toward −z

        const steerLen = Math.sqrt(steerX * steerX + steerY * steerY + steerZ * steerZ);
        if (steerLen < 0.001) return; // not near any wall — no correction needed

        // Normalize to unit vector (direction only)
        steerX /= steerLen;
        steerY /= steerLen;
        steerZ /= steerLen;

        // Convert desired steer direction to yaw and pitch angles
        const desiredYaw = Math.atan2(steerY, steerX);
        const desiredPitch = Math.atan2(steerZ, Math.sqrt(steerX * steerX + steerY * steerY));

        // Compute angular errors (how far we need to turn)
        // Yaw error: wrapped to [−π, +π] for shortest-path rotation
        let yawError = desiredYaw - this._heading;
        yawError = ((yawError + Math.PI) % (2 * Math.PI)) - Math.PI;
        if (yawError < -Math.PI) yawError += 2 * Math.PI;
        const pitchError = desiredPitch - this._pitch;

        // Apply steering — strength scales with proximity² × wallSteerStrength.
        // steerLen is already quadratic from the per-face forces, so this
        // effectively gives cubic falloff. Near a wall, strength can exceed
        // the brain's max turn rate — this is intentional: wall avoidance
        // MUST win over the brain to prevent wall-hugging.
        // The 3× multiplier ensures wall avoidance is at least 3× stronger
        // than the brain's max turn rate when right at the wall.
        const strength = steerLen * SimConfig.wallSteerStrength * 3;
        this._heading += Math.sign(yawError) * Math.min(Math.abs(yawError), strength);
        this._pitch += Math.sign(pitchError) * Math.min(Math.abs(pitchError), strength);
    }

    /**
     * Create a child creature from this parent.
     *
     * The child inherits the parent's brain (all weights + biases are copied),
     * then random mutations are applied. The child is placed at the given
     * position (typically near the current group center) with a new random
     * heading and pitch.
     *
     * @param startX, startY, startZ  Spawn position for the child.
     * @param maxAge  Optional lifespan. If omitted, randomly chosen between
     *                500–1500 ticks to stagger deaths across the population.
     */
    public cloneAndMutate(startX: number, startY: number, startZ: number, maxAge?: number): Creature {
        // Use SimConfig.creatureMaxAge with 50%–150% stagger (same as initial spawn)
        const base = SimConfig.creatureMaxAge;
        const age = maxAge ?? Math.floor(base * 0.5 + Math.random() * base);

        const clone = new Creature(startX, startY, startZ, new CreatureBrain(this.brain), age);
        clone.brain.mutate();
        return clone;
    }
}

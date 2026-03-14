import { Creature } from "./bestioles";
import { SimConfig } from "./bestioles.config";
import { IWorldBounds } from "./bestioles.interfaces";

/**
 * The simulation world — manages all creatures, their sensors,
 * social metrics, and the evolutionary reproduction cycle.
 *
 * **Tick pipeline** (called every frame by the renderer):
 *   1. Filter alive creatures
 *   2. For each alive creature:
 *      a. Build 16 sensor inputs (self-state + social + wall proximity)
 *      b. Compute neighbor info (distance, alignment, crowding)
 *      c. Call creature.update(sensors, neighborInfo, bounds)
 *   3. Replace dead creatures with mutated offspring of the fittest
 *
 * **Coordinate system**: right-handed, x=width, y=height, z=depth.
 * The BabylonJS renderer remaps: world.x→BJS.x, world.z→BJS.y, world.y→BJS.z
 * (because BabylonJS uses Y-up, while our simulation uses Z-up internally).
 *
 * **Performance note**: neighbor search is O(N²) per tick. With 100 creatures
 * this is ~10,000 distance checks × 2 passes (sensors + neighborInfo).
 * At 60fps this is ~1.2M checks/sec — fast enough for real-time on modern
 * hardware. For 1000+ creatures, a spatial hash or octree would be needed.
 */
export class CreatureWorld {
    private _creatures: Creature[] = [];
    private _bounds: IWorldBounds;

    /**
     * @param _creatureCount  Target population size. Maintained by replacing
     *                        dead creatures with offspring each tick.
     * @param bounds          3D bounding box dimensions (width × height × depth).
     *                        Typically 200×200×200, giving 8 million cubic units.
     */
    constructor(
        private _creatureCount: number,
        bounds: IWorldBounds
    ) {
        this._bounds = bounds;
        this._spawnInitialCreatures();
    }

    public get creatures(): Array<Creature> {
        return this._creatures;
    }

    public get bounds(): IWorldBounds {
        return this._bounds;
    }

    /**
     * Spawn the initial population at the center of the world.
     *
     * All creatures start in a 80-unit cube centered in the bounding box.
     * This tight cluster ensures they can "see" each other immediately
     * (neighborRadius = 50 covers the cluster) and begin forming social
     * behaviors from tick 1. If they started randomly across the whole
     * 200³ box, most would be alone and cohesion couldn't evolve.
     *
     * Ages are staggered (500–1500 ticks) so deaths happen gradually
     * rather than all at once — this prevents population crashes that
     * would erase evolved behaviors.
     */
    private _spawnInitialCreatures() {
        const cx = this._bounds.width / 2;
        const cy = this._bounds.height / 2;
        const cz = this._bounds.depth / 2;
        // Spawn spread: creatures must start close enough to see each other.
        // Capped at 2× neighborRadius so every creature has neighbors from tick 1.
        // In a 200³ world with radius 50: spread = min(80, 100) = 80.
        // In a 1000³ world with radius 100: spread = min(400, 200) = 200.
        // Without this cap, large worlds would spawn creatures so far apart
        // that they'd never find each other and the group would never form.
        const spread = Math.min(
            Math.min(this._bounds.width, this._bounds.height, this._bounds.depth) * 0.4,
            SimConfig.neighborRadius * 2
        );
        // Ages are staggered (500–1500 ticks) so deaths happen gradually
        // rather than all at once — this prevents population crashes that
        // would erase evolved behaviors.
        this._creatures = Array.from({ length: this._creatureCount }, () => {
            const age = 500 + Math.floor(Math.random() * 1000);
            return new Creature(cx + (Math.random() - 0.5) * spread, cy + (Math.random() - 0.5) * spread, cz + (Math.random() - 0.5) * spread, undefined, age);
        });
    }

    /**
     * Main simulation tick — called once per render frame by the renderer.
     *
     * We pre-filter alive creatures once and pass the list to each
     * creature's sensor/neighbor computations to avoid redundant filtering.
     */
    public updateWorld() {
        const aliveCreatures = this._creatures.filter((c) => c.alive);

        for (const creature of this._creatures) {
            if (!creature.alive) continue;

            // Build the 16-float sensor array the brain needs as input
            const sensors = this._buildSensors(creature, aliveCreatures);

            // Compute social metrics used for fitness scoring
            const neighborInfo = this._computeNeighborInfo(creature, aliveCreatures);

            // Let the creature think, move, and score itself
            creature.update(sensors, neighborInfo, this._bounds);
        }

        // Replace dead creatures with offspring of the fittest
        this._replaceDeadCreatures();
    }

    /**
     * Compute social metrics for a single creature relative to all others.
     * These metrics are used directly in the creature's fitness function
     * (not as brain inputs — those come from _buildSensors).
     *
     * @returns
     *   - avgDist: average distance to neighbors within vision range,
     *     normalized by neighborRadius. 0 = right on top, 1 = at edge.
     *     If no neighbors: 1 (maximum, penalizes isolation via cohesion).
     *   - alignmentDot: average dot product of this creature's heading
     *     vector with each neighbor's heading vector. Range [−1, +1].
     *     +1 = all going same way, −1 = all going opposite, 0 = random.
     *     If no neighbors: 0 (neutral).
     *   - tooCloseCount: how many neighbors are within separationDist.
     *     Used for the separation fitness score.
     */
    private _computeNeighborInfo(creature: Creature, allCreatures: Creature[]): { avgDist: number; alignmentDot: number; tooCloseCount: number; neighborCount: number } {
        const pos = creature.position;
        const radius = SimConfig.neighborRadius;
        const sepDist = SimConfig.separationDist;

        // Compute this creature's 3D direction vector from yaw + pitch.
        // This is a unit vector pointing where the creature is facing.
        const cosPitch = Math.cos(creature.pitch);
        const myDirX = cosPitch * Math.cos(creature.heading);
        const myDirY = cosPitch * Math.sin(creature.heading);
        const myDirZ = Math.sin(creature.pitch);

        let totalDist = 0;
        let dotSum = 0;
        let neighborCount = 0;
        let tooCloseCount = 0;

        for (const other of allCreatures) {
            if (other === creature || !other.alive) continue;

            // 3D Euclidean distance
            const dx = other.position.x - pos.x;
            const dy = other.position.y - pos.y;
            const dz = other.position.z - pos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < radius) {
                neighborCount++;
                totalDist += dist;

                // Dot product of heading vectors for alignment measurement.
                // Both are unit vectors, so dot ∈ [−1, +1].
                const oCos = Math.cos(other.pitch);
                const oDirX = oCos * Math.cos(other.heading);
                const oDirY = oCos * Math.sin(other.heading);
                const oDirZ = Math.sin(other.pitch);
                dotSum += myDirX * oDirX + myDirY * oDirY + myDirZ * oDirZ;

                // Count neighbors that are dangerously close
                if (dist < sepDist) {
                    tooCloseCount++;
                }
            }
        }

        if (neighborCount === 0) {
            // No neighbors visible — return worst-case for cohesion (avgDist=1),
            // neutral for alignment (0), and perfect for separation (0).
            return { avgDist: 1, alignmentDot: 0, tooCloseCount: 0, neighborCount: 0 };
        }

        return {
            avgDist: totalDist / neighborCount / radius, // normalized to [0,1]
            alignmentDot: dotSum / neighborCount, // average dot product [−1,+1]
            tooCloseCount,
            neighborCount,
        };
    }

    /**
     * Build the 16-float sensor array for the brain's input layer.
     *
     * All values are normalized to approximately [−1, +1] or [0, 1] so the
     * neural network can process them without scale issues. Angles are
     * encoded as sin/cos pairs to avoid the discontinuity at ±π (where
     * a raw angle would jump from +3.14 to −3.14, confusing the network).
     *
     * **Sensor layout (18 sensors):**
     *
     * | Index | Sensor                     | Range   | Purpose                                          |
     * |-------|----------------------------|---------|--------------------------------------------------|
     * |   0   | own speed / maxSpeed        | [0, 1]  | Self-awareness of velocity                       |
     * |   1   | sin(own yaw)                | [−1,+1] | Own horizontal heading (sin component)           |
     * |   2   | cos(own yaw)                | [−1,+1] | Own horizontal heading (cos component)           |
     * |   3   | sin(own pitch)              | [−1,+1] | Own vertical tilt (sin component)                |
     * |   4   | cos(own pitch)              | [−1,+1] | Own vertical tilt (cos component)                |
     * |   5   | dist to group center / rad  | [0, 1]  | How far from the local group center               |
     * |   6   | sin(yaw to group)           | [−1,+1] | Horizontal direction to group (sin, ego-centric) |
     * |   7   | cos(yaw to group)           | [−1,+1] | Horizontal direction to group (cos, ego-centric) |
     * |   8   | sin(pitch to group)         | [−1,+1] | Vertical direction to group (sin, ego-centric)   |
     * |   9   | cos(pitch to group)         | [−1,+1] | Vertical direction to group (cos, ego-centric)   |
     * |  10   | dist to nearest / radius    | [0, 1]  | Proximity to nearest neighbor                    |
     * |  11   | sin(yaw to nearest)         | [−1,+1] | Horizontal direction to nearest (ego-centric)    |
     * |  12   | cos(yaw to nearest)         | [−1,+1] | Horizontal direction to nearest (ego-centric)    |
     * |  13   | sin(pitch to nearest)       | [−1,+1] | Vertical direction to nearest (ego-centric)      |
     * |  14   | neighbor alignment dot      | [−1,+1] | How aligned neighbors' headings are with mine     |
     * |  15   | neighbor heading → my right | [−1,+1] | Avg neighbor heading projected on my RIGHT axis  |
     * |  16   | neighbor heading → my up    | [−1,+1] | Avg neighbor heading projected on my UP axis     |
     * |  17   | dist to nearest wall / ref  | [0, 1]  | Proximity to closest wall face                   |
     *
     * **Sensors 15-16 are critical for murmuration behavior.**
     * They tell the brain the DIRECTION to steer to match neighbor headings:
     *   - Sensor 15 > 0 → neighbors heading to my RIGHT → turn right to align
     *   - Sensor 15 < 0 → neighbors heading to my LEFT → turn left to align
     *   - Sensor 16 > 0 → neighbors heading ABOVE me → pitch up to align
     *   - Sensor 16 < 0 → neighbors heading BELOW me → pitch down to align
     * Without these, the brain only knows HOW aligned it is (sensor 14) but
     * not WHICH WAY to turn — making murmuration nearly impossible to learn.
     *
     * **Ego-centric angles**: directions to targets (group center, nearest
     * neighbor) are relative to the creature's own heading/pitch. This means
     * "group is to my left" is the same sensor value regardless of absolute
     * world orientation — crucial for the brain to learn generalizable steering.
     */
    private _buildSensors(creature: Creature, allCreatures: Creature[]): number[] {
        const pos = creature.position;
        const yaw = creature.heading;
        const pitch = creature.pitch;
        const radius = SimConfig.neighborRadius;

        // Maximum possible distance in the world (diagonal of bounding box).
        // Used as the initial value for nearest-neighbor search.
        const maxDist = Math.sqrt(this._bounds.width ** 2 + this._bounds.height ** 2 + this._bounds.depth ** 2);

        // Sensor 0: own speed, normalized by maxSpeed → [0, 1]
        const ownSpeed = creature.speed / SimConfig.maxSpeed;

        // --- Pass 1: scan all other creatures to find ---
        //   - Local group center (average position of neighbors within radius)
        //   - Nearest neighbor (closest creature, regardless of radius)
        //   - Average neighbor heading direction (for alignment sensor)
        let gx = 0,
            gy = 0,
            gz = 0,
            gCount = 0; // group center accumulator
        let nearestDist = maxDist; // distance to closest creature
        let nearestYaw = 0; // ego-centric yaw angle to nearest
        let nearestPitch = 0; // ego-centric pitch angle to nearest
        let avgNDirX = 0,
            avgNDirY = 0,
            avgNDirZ = 0; // average neighbor heading vector

        for (const other of allCreatures) {
            if (other === creature || !other.alive) continue;

            const dxn = other.position.x - pos.x;
            const dyn = other.position.y - pos.y;
            const dzn = other.position.z - pos.z;
            const dn = Math.sqrt(dxn * dxn + dyn * dyn + dzn * dzn);

            // Neighbor within vision range — contributes to group center and alignment
            if (dn < radius) {
                gx += other.position.x;
                gy += other.position.y;
                gz += other.position.z;
                gCount++;

                // Accumulate neighbor heading as a 3D direction vector
                const oCos = Math.cos(other.pitch);
                avgNDirX += oCos * Math.cos(other.heading);
                avgNDirY += oCos * Math.sin(other.heading);
                avgNDirZ += Math.sin(other.pitch);
            }

            // Track the single nearest creature (any distance)
            if (dn < nearestDist) {
                nearestDist = dn;
                // Ego-centric yaw: subtract own heading so 0 = directly ahead
                nearestYaw = Math.atan2(dyn, dxn) - yaw;
                // Ego-centric pitch: vertical angle to neighbor minus own pitch
                const horizDn = Math.sqrt(dxn * dxn + dyn * dyn);
                nearestPitch = Math.atan2(dzn, horizDn) - pitch;
            }
        }

        // If no neighbors in range, fall back to world center as "group center".
        // This gives isolated creatures a direction to head toward, increasing
        // their chance of finding the group.
        if (gCount === 0) {
            gx = this._bounds.width / 2;
            gy = this._bounds.height / 2;
            gz = this._bounds.depth / 2;
        } else {
            gx /= gCount;
            gy /= gCount;
            gz /= gCount;
        }

        // --- Compute ego-centric direction to group center ---
        const dxG = gx - pos.x;
        const dyG = gy - pos.y;
        const dzG = gz - pos.z;
        const distGroup = Math.sqrt(dxG * dxG + dyG * dyG + dzG * dzG);
        // Yaw to group: horizontal angle relative to own heading
        const yawToGroup = Math.atan2(dyG, dxG) - yaw;
        // Pitch to group: vertical angle relative to own pitch
        const horizDistG = Math.sqrt(dxG * dxG + dyG * dyG);
        const pitchToGroup = Math.atan2(dzG, horizDistG) - pitch;

        // --- Compute alignment dot product and steering cues ---
        // Sensor 14: How well is this creature's heading aligned with the average
        // neighbor heading? (scalar dot product, [−1,+1])
        // Sensors 15-16: Project the average neighbor heading onto this creature's
        // local RIGHT and UP axes. These give DIRECTIONAL info — the brain knows
        // which way to turn to align with neighbors (critical for murmuration).
        let neighborAlignDot = 0;
        let neighborHeadingRight = 0; // sensor 15: avg neighbor heading → my right axis
        let neighborHeadingUp = 0;    // sensor 16: avg neighbor heading → my up axis
        if (gCount > 0) {
            // Average neighbor heading (normalize the accumulated vector)
            avgNDirX /= gCount;
            avgNDirY /= gCount;
            avgNDirZ /= gCount;

            // Own heading as a 3D direction vector
            const cosPitch2 = Math.cos(pitch);
            const sinPitch2 = Math.sin(pitch);
            const cosYaw = Math.cos(yaw);
            const sinYaw = Math.sin(yaw);
            const myDirX = cosPitch2 * cosYaw;
            const myDirY = cosPitch2 * sinYaw;
            const myDirZ = sinPitch2;

            // Dot product: +1 = same direction, −1 = opposite, 0 = perpendicular
            neighborAlignDot = myDirX * avgNDirX + myDirY * avgNDirY + myDirZ * avgNDirZ;
            neighborAlignDot = Math.max(-1, Math.min(1, neighborAlignDot));

            // Local RIGHT axis: perpendicular to heading in horizontal plane.
            // Right = (-sin(yaw), cos(yaw), 0)
            // Projecting the avg neighbor heading onto this tells the brain:
            //   positive → neighbors heading to my RIGHT → turn right to align
            //   negative → neighbors heading to my LEFT → turn left to align
            neighborHeadingRight = avgNDirX * (-sinYaw) + avgNDirY * cosYaw;

            // Local UP axis: perpendicular to both forward and right.
            // Up = (-sin(pitch)*cos(yaw), -sin(pitch)*sin(yaw), cos(pitch))
            // Projecting tells the brain:
            //   positive → neighbors heading ABOVE me → pitch up to align
            //   negative → neighbors heading BELOW me → pitch down to align
            neighborHeadingUp =
                avgNDirX * (-sinPitch2 * cosYaw) +
                avgNDirY * (-sinPitch2 * sinYaw) +
                avgNDirZ * cosPitch2;
        }

        // --- Wall proximity sensor ---
        // Distance to the closest of the 6 box faces.
        // Normalized by 25% of world width so the sensor saturates at 1.0
        // when the creature is far from all walls.
        const distLeft = pos.x;
        const distRight = this._bounds.width - pos.x;
        const distTop = pos.y;
        const distBottom = this._bounds.height - pos.y;
        const distFloor = pos.z;
        const distCeil = this._bounds.depth - pos.z;
        const wallDist = Math.min(distLeft, distRight, distTop, distBottom, distFloor, distCeil);

        // --- Assemble the 18-float sensor array ---
        // See the table in the JSDoc above for the full layout.
        return [
            ownSpeed, // [0]  own speed / maxSpeed
            Math.sin(yaw), // [1]  own heading (sin)
            Math.cos(yaw), // [2]  own heading (cos)
            Math.sin(pitch), // [3]  own pitch (sin)
            Math.cos(pitch), // [4]  own pitch (cos)
            Math.min(1, distGroup / radius), // [5]  dist to group center, capped at 1
            Math.sin(yawToGroup), // [6]  yaw to group center (sin, ego)
            Math.cos(yawToGroup), // [7]  yaw to group center (cos, ego)
            Math.sin(pitchToGroup), // [8]  pitch to group center (sin, ego)
            Math.cos(pitchToGroup), // [9]  pitch to group center (cos, ego)
            Math.min(1, nearestDist / radius), // [10] dist to nearest neighbor, capped
            Math.sin(nearestYaw), // [11] yaw to nearest (sin, ego)
            Math.cos(nearestYaw), // [12] yaw to nearest (cos, ego)
            Math.sin(nearestPitch), // [13] pitch to nearest (sin, ego)
            neighborAlignDot, // [14] avg alignment dot product
            neighborHeadingRight, // [15] avg neighbor heading → my RIGHT axis (steer cue)
            neighborHeadingUp, // [16] avg neighbor heading → my UP axis (steer cue)
            Math.min(1, wallDist / (this._bounds.width * 0.25)), // [17] nearest wall distance, normalized
        ];
    }

    /**
     * Evolutionary reproduction: replace dead creatures with offspring.
     *
     * **Selection strategy**: tournament / truncation hybrid.
     * - Sort all alive creatures by fitness (descending).
     * - Select the top 25% as the "breeding pool".
     * - Each dead slot picks a random parent from the pool.
     * - Child = parent brain (copied weights) + random mutation.
     *
     * **Spawn location**: near the current group center (±30 units).
     * This keeps offspring close to the swarm so they immediately have
     * neighbors and can begin learning social behaviors. If spawned
     * randomly across the world, they'd be isolated and waste their
     * entire lifespan trying to find the group.
     *
     * **Edge case**: if ALL creatures are dead (e.g., after a manual
     * "Kill All" or if maxAge is set very low), we reset the entire
     * population with fresh random brains via _spawnInitialCreatures().
     */
    private _replaceDeadCreatures() {
        const alive = this._creatures.filter((c) => c.alive);
        if (alive.length === 0) {
            // Total extinction — start over with random brains
            this._spawnInitialCreatures();
            return;
        }

        // Select top 25% as parents (minimum 1)
        const sorted = [...alive].sort((a, b) => b.fitness - a.fitness);
        const best = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 4)));
        const groupCenter = this._getGroupCenter();
        // Offspring spawn spread: 30% of world size, or neighborRadius, whichever is smaller.
        // This keeps children near the group but not all on top of each other.
        const spread = Math.min(
            Math.min(this._bounds.width, this._bounds.height, this._bounds.depth) * 0.3,
            SimConfig.neighborRadius * 1.5
        );

        for (let i = 0; i < this._creatures.length; i++) {
            if (!this._creatures[i].alive) {
                // Pick a random parent from the elite pool
                const parent = best[Math.floor(Math.random() * best.length)];
                // Create child: copy parent brain, mutate, place near group
                this._creatures[i] = parent.cloneAndMutate(
                    groupCenter.x + (Math.random() - 0.5) * spread,
                    groupCenter.y + (Math.random() - 0.5) * spread,
                    groupCenter.z + (Math.random() - 0.5) * spread
                );
            }
        }
    }

    /**
     * Compute the centroid of all alive creatures.
     * Used for spawning offspring near the group and for camera tracking.
     * Falls back to the world center if no creatures are alive.
     */
    private _getGroupCenter(): { x: number; y: number; z: number } {
        const aliveCreatures = this._creatures.filter((c) => c.alive);
        if (aliveCreatures.length === 0) {
            return {
                x: this._bounds.width / 2,
                y: this._bounds.height / 2,
                z: this._bounds.depth / 2,
            };
        }

        let sumX = 0,
            sumY = 0,
            sumZ = 0;
        for (const creature of aliveCreatures) {
            sumX += creature.position.x;
            sumY += creature.position.y;
            sumZ += creature.position.z;
        }

        return {
            x: sumX / aliveCreatures.length,
            y: sumY / aliveCreatures.length,
            z: sumZ / aliveCreatures.length,
        };
    }
}

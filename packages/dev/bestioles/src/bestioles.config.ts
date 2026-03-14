/**
 * Runtime-configurable simulation parameters.
 * All values can be changed live via the UI panel (bestioles3d.html).
 *
 * **Architecture**: this is a plain mutable object (not a class).
 * Every simulation class (`Creature`, `CreatureWorld`, `CreatureBrain`)
 * imports it and reads values *each frame*, so slider changes take effect
 * immediately — no restart required.
 *
 * **Default preset: "Swarm Orbit"**
 * Creatures stay together as a cohesive spinning group that moves
 * through 3D space. High cohesion + high movement + low alignment
 * means they cluster but don't fly in formation — they orbit around
 * the group center instead.
 */
export const SimConfig = {
    // ──────────────────────────────────────────────────────────────
    // Fitness weights — these control *what the evolutionary process
    // selects for*. Each creature's per-frame fitness is a weighted
    // sum of four boid-style scores. The weights should ideally sum
    // to ~1.0 so fitness stays in the [0,1] range, but the system
    // works with any sum (the UI has an auto-normalize checkbox).
    //
    // Changing these dramatically alters emergent behavior:
    //   - High cohesion → tight swarms
    //   - High alignment → flocking / schooling
    //   - High separation → spread-out exploration
    //   - High movement → fast, energetic creatures
    // ──────────────────────────────────────────────────────────────

    /** Cohesion weight: rewards being close to nearby neighbors.
     *  0.55 is dominant — makes the group stick together strongly.
     *  Score = 1 − (avgNeighborDist / neighborRadius), so creatures
     *  near the center of the group score highest. */
    fitnessCohesion: 0.55,

    /** Alignment weight: rewards matching heading direction with neighbors.
     *  0.05 is very low — allows orbiting behavior. If this were high
     *  (>0.3), creatures would fly in the same direction (flocking)
     *  instead of circling. Score = (dot product + 1) / 2. */
    fitnessAlignment: 0.05,

    /** Separation weight: rewards *not* being too close to neighbors.
     *  0.10 is mild — prevents total collapse into one point but
     *  doesn't push creatures far apart. Score = 1/(1+tooCloseCount),
     *  so 0 nearby creatures = perfect score of 1. */
    fitnessSeparation: 0.1,

    /** Movement weight: rewards speed proportional to maxSpeed.
     *  0.30 is high — drives the swirling motion. Without this,
     *  creatures would evolve to sit still near the group center
     *  (because cohesion alone doesn't require movement). */
    fitnessMovement: 0.3,

    // ──────────────────────────────────────────────────────────────
    // Movement — physical limits on how fast/far a creature can
    // move or turn each simulation tick.
    // ──────────────────────────────────────────────────────────────

    /** Maximum speed in world-units per tick.
     *  2.5 is moderate — in a 200×200×200 world, a creature crosses
     *  the box in ~80 ticks at full speed. Higher values make the
     *  swarm more dynamic but harder to keep together. The brain's
     *  first sigmoid output [0,1] is multiplied by this value. */
    maxSpeed: 2.5,

    /** Maximum yaw (horizontal turn) rate in radians per tick.
     *  0.18 rad ≈ 10.3° — allows a full 360° turn in ~35 ticks.
     *  This is high enough for tight orbits but low enough to look
     *  smooth. The brain's second output (sigmoid, centered at 0.5)
     *  maps to [−maxTurnRate, +maxTurnRate]. */
    maxTurnRate: 0.18,

    /** Maximum pitch (vertical turn) rate in radians per tick.
     *  Set EQUAL to maxTurnRate (0.18) to avoid flat-orbit bias.
     *  Previously this was 0.10, which meant creatures could barely
     *  steer vertically — causing all orbits to collapse into the
     *  horizontal XY plane. Equal rates give the brain the same
     *  ability to explore vertical movement as horizontal. */
    maxPitchRate: 0.18,

    /** Turn damping: smooths angular velocity changes over time (inertia).
     *  0 = no damping (instant turns, current behavior for orbiting presets).
     *  0.9 = high inertia (turn rate changes slowly, prevents spinning).
     *
     *  The actual turn rate each tick is:
     *    smoothedRate = previousRate × damping + brainRate × (1 − damping)
     *
     *  High damping is critical for murmuration: it makes rapid direction
     *  changes impossible, forcing creatures to fly in long sweeping arcs.
     *  Without damping, "align with neighbors" can be satisfied by spinning
     *  together — with damping, only straight/gently-curving flight works. */
    turnDamping: 0,

    // ──────────────────────────────────────────────────────────────
    // Perception — how far a creature can "see" and what counts
    // as "too close". These define the social interaction range.
    // ──────────────────────────────────────────────────────────────

    /** Vision range: creatures only see neighbors within this radius
     *  (in world-units). 50 in a 200³ world means each creature
     *  interacts with ~25% of the space. Smaller values = tighter
     *  groups (creatures can't track far-away members); larger values
     *  = looser groups but more global awareness. Also used to
     *  normalize the distance sensor to [0,1]. */
    neighborRadius: 50,

    /** Personal space: distance below which another creature is
     *  counted as "too close" for the separation fitness score.
     *  5 world-units is small — allows dense packing. Increase
     *  to 15+ for more spacing between individuals. */
    separationDist: 5,

    // ──────────────────────────────────────────────────────────────
    // Wall avoidance — soft steering to keep creatures inside the
    // bounding box. This replaces hard wrapping, which caused
    // creatures to teleport and break group cohesion.
    // ──────────────────────────────────────────────────────────────

    /** Detection distance from each wall (6 faces: ±x, ±y, ±z).
     *  When a creature is within this margin, a repulsion force
     *  is applied. 35 in a 200³ world = 17.5% of the box size.
     *  Larger values → earlier turning → smoother paths near walls.
     *  Too small → creatures slam into walls before turning. */
    wallMargin: 35,

    /** Steering strength when near a wall. Controls how aggressively
     *  the creature's heading/pitch are rotated toward the interior.
     *  0.15 is strong enough to reliably prevent escapes while
     *  keeping movement natural. The actual rotation applied is
     *  min(angularError, strength * proximity). */
    wallSteerStrength: 0.15,

    // ──────────────────────────────────────────────────────────────
    // Mutation — controls how much a child's neural network differs
    // from its parent. Applied to all synaptic weights and node
    // biases during reproduction.
    // ──────────────────────────────────────────────────────────────

    // ──────────────────────────────────────────────────────────────
    // Lifecycle — controls creature lifespan and generational turnover.
    // ──────────────────────────────────────────────────────────────

    /** Maximum age in ticks before a creature dies of old age.
     *  Actual maxAge per creature is randomized between 50% and 150%
     *  of this value to stagger deaths and prevent mass extinction events.
     *
     *  For murmuration: set HIGH (e.g., 5000+) so the group has time
     *  to develop coherent directional movement before members die.
     *  At 60fps with maxAge=1000, creatures live ~17 seconds — too short
     *  for slow-turning flocks to evolve flight patterns.
     *
     *  For orbiting presets: 1000 is fine because fast turns allow
     *  behaviors to emerge quickly. */
    creatureMaxAge: 1000,

    /** Ticks of insufficient neighbors before a creature is killed.
     *  A creature must have at least `minNeighborsForSurvival` neighbors
     *  within its vision range (neighborRadius) on each tick. If it has
     *  fewer, the isolation counter increments. After `isolationDeathTicks`
     *  consecutive ticks below the threshold, it dies.
     *  Set to 0 to disable isolation death entirely.
     *  This is THE key mechanism that keeps the flock together:
     *  creatures that wander off OR form tiny sub-groups die quickly,
     *  so evolution strongly selects for brains that stay in the dense
     *  part of the flock. */
    isolationDeathTicks: 150,

    /** Standard deviation of weight perturbation.
     *  Each synapse weight gets += random(−1,+1) × this value.
     *  0.1 gives moderate exploration — enough to discover new
     *  behaviors but not so much that good strategies are destroyed.
     *  Higher values → more exploration, lower convergence.
     *  Lower values → slower adaptation, stronger inheritance. */
    mutationWeightScale: 0.1,

    /** Standard deviation of bias perturbation.
     *  Same idea as weight mutation but for neuron biases. Kept
     *  lower (0.05) because biases have outsized influence on
     *  neuron activation — a small bias change can flip a tanh
     *  neuron from active to inactive. */
    mutationBiasScale: 0.05,
};

export type SimConfigKey = keyof typeof SimConfig;

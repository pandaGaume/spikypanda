import { ICartesian } from "spikypanda-core";
import { Creature } from "./bestioles";

export class CreatureWorld {
    private _creatures: Creature[] = [];

    constructor(private creatureCount: number, private simulationEngine: { generateInputs: () => number[][] }) {
        this.spawnInitialCreatures();
    }

    public get creatures(): Array<Creature> {
        return this._creatures;
    }

    private spawnInitialCreatures() {
        this._creatures = Array.from({ length: this.creatureCount }, () => new Creature());
    }

    public updateWorld() {
        const inputs = this.simulationEngine.generateInputs();
        const groupCenter = this.getGroupCenter();

        for (const creature of this._creatures) {
            if (creature.alive) {
                creature.update(inputs, groupCenter);
            }
        }

        this.replaceDeadCreatures();
    }

    private replaceDeadCreatures() {
        const sorted = [...this._creatures].sort((a, b) => b.fitness - a.fitness);
        const best = sorted.slice(0, Math.max(1, this.creatureCount / 4)); // top 25%

        for (let i = 0; i < this._creatures.length; i++) {
            if (!this._creatures[i].alive) {
                const parent = best[Math.floor(Math.random() * best.length)];
                this._creatures[i] = parent.cloneAndMutate();
            }
        }
    }

    private getGroupCenter(): ICartesian {
        const aliveCreatures = this.creatures.filter((c) => c.alive);
        if (aliveCreatures.length === 0) return { x: 0, y: 0 };

        let sumX = 0,
            sumY = 0;

        for (const creature of aliveCreatures) {
            const pos = creature.position;
            sumX += pos.x;
            sumY += pos.y;
        }

        return {
            x: sumX / aliveCreatures.length,
            y: sumY / aliveCreatures.length,
        };
    }
}

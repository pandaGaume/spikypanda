import { ICartesian } from "spikypanda-core";
import { CreatureBrain } from "./bestioles.brain";
import { ICreatureBrain } from "./bestioles.interfaces";

export class Creature {
    public brain: ICreatureBrain;
    public fitness: number = 0;
    public alive: boolean = true;

    private age: number = 0;
    private maxAge: number;
    private isolationCounter: number = 0;

    private lastTrajectory: Array<ICartesian> = [];
    private lastPosition: ICartesian = { x: 0, y: 0 };

    constructor(brain?: ICreatureBrain, maxAge: number = 1000) {
        this.brain = brain ? brain : new CreatureBrain();
        this.maxAge = maxAge;
    }

    public update(inputs: number[][], groupCenter: { x: number; y: number }) {
        const { trajectory, fitness } = this.brain.evaluateAndTrack(inputs);

        this.fitness = fitness;
        this.lastTrajectory = trajectory;
        this.lastPosition = trajectory.length > 0 ? trajectory[trajectory.length - 1] : { x: 0, y: 0 };
        this.age++;

        const distanceToGroup = Math.sqrt(Math.pow(this.lastPosition.x - groupCenter.x, 2) + Math.pow(this.lastPosition.y - groupCenter.y, 2));

        if (distanceToGroup > 5) {
            this.isolationCounter++;
        } else {
            this.isolationCounter = Math.max(0, this.isolationCounter - 1);
        }

        const deathProbability = Math.min(1, this.isolationCounter * 0.01);
        if (Math.random() < deathProbability || this.age > this.maxAge) {
            this.alive = false;
        }
    }

    public get position(): ICartesian {
        return this.lastPosition;
    }

    public get trajectory(): Array<ICartesian> {
        return this.lastTrajectory;
    }

    public cloneAndMutate(): Creature {
        const clone = new Creature(this.cloneBrain());
        clone.brain.mutate();
        return clone;
    }

    public computePosition(inputSequence: number[][]): { x: number; y: number } {
        let position = { x: 0, y: 0 };

        for (const inputs of inputSequence) {
            const [tx, ty, theta] = this.brain.evaluate(inputs);
            const dx = Math.cos(theta * 2 * Math.PI - Math.PI) * tx;
            const dy = Math.sin(theta * 2 * Math.PI - Math.PI) * ty;
            position.x += dx;
            position.y += dy;
        }
        return position;
    }

    protected cloneBrain(): CreatureBrain {
        return new CreatureBrain(this.brain);
    }
}

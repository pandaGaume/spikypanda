import { ICartesian2, ICartesian3, ICartesian4 } from "./geometry.interfaces";

export class Cartesian2 implements ICartesian2 {
    public static Zero(): ICartesian2 {
        return new Cartesian2();
    }

    public static One(): ICartesian2 {
        return new Cartesian2(1, 1);
    }

    public static Infinity(): ICartesian2 {
        return new Cartesian2(Infinity, Infinity);
    }

    public constructor(public x: number = 0, public y: number = 0) {}

    public toString() {
        return `x:${this.x}, y:${this.y}`;
    }
}

export class Cartesian3 extends Cartesian2 implements ICartesian3 {
    public static Zero(): ICartesian3 {
        return new Cartesian3();
    }

    public static One(): ICartesian3 {
        return new Cartesian3(1, 1, 1);
    }

    public static Infinity(): ICartesian3 {
        return new Cartesian3(Infinity, Infinity, Infinity);
    }

    public constructor(x: number = 0, y: number = 0, public z: number = 0) {
        super(x, y);
    }

    public toString() {
        return `${super.toString()}, z:${this.z}`;
    }
}

export class Cartesian4 extends Cartesian3 implements ICartesian4 {
    public static Zero(): ICartesian4 {
        return new Cartesian4();
    }

    public static One(): ICartesian4 {
        return new Cartesian4(1, 1, 1);
    }

    public static Infinity(): ICartesian4 {
        return new Cartesian4(Infinity, Infinity, Infinity);
    }

    public constructor(x: number = 0, y: number = 0, z: number = 0, public w: number = 1) {
        super(x, y, y);
    }

    public toString() {
        return `${super.toString()}, w:${this.w}`;
    }
}


export interface ICartesian {
    distance(b:ICartesian) : number; 
    subtract(b:ICartesian) : this;
    add(b:ICartesian) : this;
    addInPlace(b:ICartesian) :this;
    multiplyByScalar(n:number):this;
    divideByScalar(n:number):this;
    magnitude():number;
    toString(): string;
    clone(): this;
}

export interface ICartesian2 extends ICartesian {
    x: number;
    y: number;
}

export interface ICartesian3 extends ICartesian2 {
    z: number;
}

export interface ICartesian4 extends ICartesian3 {
    w: number;
}

/**
 * Type guard for ICartesian (ICartesian2 | ICartesian3 | ICartesian4)
 */
export function isCartesian(obj: unknown): obj is ICartesian {
    return isCartesian2(obj) || isCartesian3(obj) || isCartesian4(obj);
}

/**
 * Type guard for ICartesian2
 */
export function isCartesian2(b: unknown): b is ICartesian2 | ICartesian3 | ICartesian4 {
    if (typeof b !== "object" || b === null) return false;
    return "x" in b && "y" in b;
}

/**
 * Type guard for ICartesian3
 */
export function isCartesian3(b: unknown): b is ICartesian3 | ICartesian4 {
    if (!isCartesian2(b)) return false;
    return "z" in b;
}

/**
 * Type guard for ICartesian4
 */
export function isCartesian4(b: unknown): b is ICartesian4 {
    if (!isCartesian3(b)) return false;
    return "w" in b;
}

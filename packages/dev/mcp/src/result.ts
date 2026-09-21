/** Outcome of an operation. Neutral so a controller stays transport-free, and shared by the studio's and the runtime's. */
export type ControllerResult = { readonly ok: true; readonly data: unknown } | { readonly ok: false; readonly error: string };

export function ok(data: unknown): ControllerResult {
    return { ok: true, data };
}

export function fail(error: string): ControllerResult {
    return { ok: false, error };
}

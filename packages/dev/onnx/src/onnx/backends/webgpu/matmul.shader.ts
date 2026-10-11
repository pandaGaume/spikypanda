/** Tiled FP32 ONNX MatMul. One 8x8 workgroup shares both input tiles. */
export const MATMUL_WGSL = `
struct Params { m: u32, n: u32, k: u32, batches: u32 }
@group(0) @binding(0) var<storage, read> a: array<f32>;
@group(0) @binding(1) var<storage, read> b: array<f32>;
@group(0) @binding(2) var<storage, read_write> out: array<f32>;
@group(0) @binding(3) var<uniform> p: Params;
@group(0) @binding(4) var<storage, read> offsets: array<u32>;
var<workgroup> atile: array<f32, 64>;
var<workgroup> btile: array<f32, 64>;
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let row = gid.y;
    let col = gid.x;
    let batch = gid.z;
    let local = lid.y * 8u + lid.x;
    let abase = offsets[batch * 2u];
    let bbase = offsets[batch * 2u + 1u];
    var sum = 0.0;
    for (var base = 0u; base < p.k; base += 8u) {
        atile[local] = 0.0;
        btile[local] = 0.0;
        if (row < p.m && base + lid.x < p.k) { atile[local] = a[abase + row * p.k + base + lid.x]; }
        if (col < p.n && base + lid.y < p.k) { btile[local] = b[bbase + (base + lid.y) * p.n + col]; }
        workgroupBarrier();
        for (var j = 0u; j < 8u; j++) { sum += atile[lid.y * 8u + j] * btile[j * 8u + lid.x]; }
        workgroupBarrier();
    }
    if (row < p.m && col < p.n) { out[(batch * p.m + row) * p.n + col] = sum; }
}
`;

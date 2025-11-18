const std = @import("std");
const math = std.math;

// ============================================================================
// Vec2 Operations
// ============================================================================

export fn vec2_create(x: f32, y: f32, out: [*]f32) void {
    out[0] = x;
    out[1] = y;
}

export fn vec2_add(a: [*]const f32, b: [*]const f32, out: [*]f32) void {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
}

export fn vec2_sub(a: [*]const f32, b: [*]const f32, out: [*]f32) void {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
}

export fn vec2_mul(a: [*]const f32, scalar: f32, out: [*]f32) void {
    out[0] = a[0] * scalar;
    out[1] = a[1] * scalar;
}

export fn vec2_dot(a: [*]const f32, b: [*]const f32) f32 {
    return a[0] * b[0] + a[1] * b[1];
}

export fn vec2_length(v: [*]const f32) f32 {
    return @sqrt(v[0] * v[0] + v[1] * v[1]);
}

export fn vec2_normalize(v: [*]const f32, out: [*]f32) void {
    const len = vec2_length(v);
    if (len > 0) {
        out[0] = v[0] / len;
        out[1] = v[1] / len;
    } else {
        out[0] = 0;
        out[1] = 0;
    }
}

export fn vec2_distance(a: [*]const f32, b: [*]const f32) f32 {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return @sqrt(dx * dx + dy * dy);
}

export fn vec2_lerp(a: [*]const f32, b: [*]const f32, t: f32, out: [*]f32) void {
    out[0] = a[0] + (b[0] - a[0]) * t;
    out[1] = a[1] + (b[1] - a[1]) * t;
}

// ============================================================================
// Vec3 Operations
// ============================================================================

export fn vec3_create(x: f32, y: f32, z: f32, out: [*]f32) void {
    out[0] = x;
    out[1] = y;
    out[2] = z;
}

export fn vec3_add(a: [*]const f32, b: [*]const f32, out: [*]f32) void {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
}

export fn vec3_sub(a: [*]const f32, b: [*]const f32, out: [*]f32) void {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
}

export fn vec3_mul(a: [*]const f32, scalar: f32, out: [*]f32) void {
    out[0] = a[0] * scalar;
    out[1] = a[1] * scalar;
    out[2] = a[2] * scalar;
}

export fn vec3_dot(a: [*]const f32, b: [*]const f32) f32 {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export fn vec3_cross(a: [*]const f32, b: [*]const f32, out: [*]f32) void {
    const x = a[1] * b[2] - a[2] * b[1];
    const y = a[2] * b[0] - a[0] * b[2];
    const z = a[0] * b[1] - a[1] * b[0];
    out[0] = x;
    out[1] = y;
    out[2] = z;
}

export fn vec3_length(v: [*]const f32) f32 {
    return @sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export fn vec3_normalize(v: [*]const f32, out: [*]f32) void {
    const len = vec3_length(v);
    if (len > 0) {
        out[0] = v[0] / len;
        out[1] = v[1] / len;
        out[2] = v[2] / len;
    } else {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
    }
}

export fn vec3_distance(a: [*]const f32, b: [*]const f32) f32 {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return @sqrt(dx * dx + dy * dy + dz * dz);
}

export fn vec3_lerp(a: [*]const f32, b: [*]const f32, t: f32, out: [*]f32) void {
    out[0] = a[0] + (b[0] - a[0]) * t;
    out[1] = a[1] + (b[1] - a[1]) * t;
    out[2] = a[2] + (b[2] - a[2]) * t;
}

// ============================================================================
// Vec4 Operations
// ============================================================================

export fn vec4_create(x: f32, y: f32, z: f32, w: f32, out: [*]f32) void {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
}

export fn vec4_add(a: [*]const f32, b: [*]const f32, out: [*]f32) void {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
}

export fn vec4_sub(a: [*]const f32, b: [*]const f32, out: [*]f32) void {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
}

export fn vec4_mul(a: [*]const f32, scalar: f32, out: [*]f32) void {
    out[0] = a[0] * scalar;
    out[1] = a[1] * scalar;
    out[2] = a[2] * scalar;
    out[3] = a[3] * scalar;
}

export fn vec4_dot(a: [*]const f32, b: [*]const f32) f32 {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

export fn vec4_length(v: [*]const f32) f32 {
    return @sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2] + v[3] * v[3]);
}

export fn vec4_normalize(v: [*]const f32, out: [*]f32) void {
    const len = vec4_length(v);
    if (len > 0) {
        out[0] = v[0] / len;
        out[1] = v[1] / len;
        out[2] = v[2] / len;
        out[3] = v[3] / len;
    } else {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
    }
}

// ============================================================================
// Mat4 Operations (Column-Major, OpenGL style)
// ============================================================================

export fn mat4_identity(out: [*]f32) void {
    out[0] = 1; out[4] = 0; out[8] = 0;  out[12] = 0;
    out[1] = 0; out[5] = 1; out[9] = 0;  out[13] = 0;
    out[2] = 0; out[6] = 0; out[10] = 1; out[14] = 0;
    out[3] = 0; out[7] = 0; out[11] = 0; out[15] = 1;
}

export fn mat4_multiply(a: [*]const f32, b: [*]const f32, out: [*]f32) void {
    var result: [16]f32 = undefined;

    var i: usize = 0;
    while (i < 4) : (i += 1) {
        var j: usize = 0;
        while (j < 4) : (j += 1) {
            result[j * 4 + i] =
                a[i] * b[j * 4] +
                a[i + 4] * b[j * 4 + 1] +
                a[i + 8] * b[j * 4 + 2] +
                a[i + 12] * b[j * 4 + 3];
        }
    }

    i = 0;
    while (i < 16) : (i += 1) {
        out[i] = result[i];
    }
}

export fn mat4_translate(mat: [*]const f32, x: f32, y: f32, z: f32, out: [*]f32) void {
    var translation: [16]f32 = undefined;
    mat4_identity(&translation);
    translation[12] = x;
    translation[13] = y;
    translation[14] = z;
    mat4_multiply(mat, &translation, out);
}

export fn mat4_scale(mat: [*]const f32, x: f32, y: f32, z: f32, out: [*]f32) void {
    var scale: [16]f32 = undefined;
    mat4_identity(&scale);
    scale[0] = x;
    scale[5] = y;
    scale[10] = z;
    mat4_multiply(mat, &scale, out);
}

export fn mat4_rotate_x(mat: [*]const f32, angle: f32, out: [*]f32) void {
    const c = @cos(angle);
    const s = @sin(angle);

    var rotation: [16]f32 = undefined;
    mat4_identity(&rotation);
    rotation[5] = c;
    rotation[6] = s;
    rotation[9] = -s;
    rotation[10] = c;

    mat4_multiply(mat, &rotation, out);
}

export fn mat4_rotate_y(mat: [*]const f32, angle: f32, out: [*]f32) void {
    const c = @cos(angle);
    const s = @sin(angle);

    var rotation: [16]f32 = undefined;
    mat4_identity(&rotation);
    rotation[0] = c;
    rotation[2] = -s;
    rotation[8] = s;
    rotation[10] = c;

    mat4_multiply(mat, &rotation, out);
}

export fn mat4_rotate_z(mat: [*]const f32, angle: f32, out: [*]f32) void {
    const c = @cos(angle);
    const s = @sin(angle);

    var rotation: [16]f32 = undefined;
    mat4_identity(&rotation);
    rotation[0] = c;
    rotation[1] = s;
    rotation[4] = -s;
    rotation[5] = c;

    mat4_multiply(mat, &rotation, out);
}

export fn mat4_perspective(fovy: f32, aspect: f32, near: f32, far: f32, out: [*]f32) void {
    const f = 1.0 / @tan(fovy / 2.0);
    const nf = 1.0 / (near - far);

    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;

    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;

    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;

    out[12] = 0;
    out[13] = 0;
    out[14] = 2 * far * near * nf;
    out[15] = 0;
}

export fn mat4_ortho(left: f32, right: f32, bottom: f32, top: f32, near: f32, far: f32, out: [*]f32) void {
    const lr = 1.0 / (left - right);
    const bt = 1.0 / (bottom - top);
    const nf = 1.0 / (near - far);

    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;

    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;

    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;

    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
}

export fn mat4_look_at(eye_x: f32, eye_y: f32, eye_z: f32,
                       center_x: f32, center_y: f32, center_z: f32,
                       up_x: f32, up_y: f32, up_z: f32, out: [*]f32) void {
    var z: [3]f32 = undefined;
    z[0] = eye_x - center_x;
    z[1] = eye_y - center_y;
    z[2] = eye_z - center_z;
    vec3_normalize(&z, &z);

    var up: [3]f32 = .{ up_x, up_y, up_z };
    var x: [3]f32 = undefined;
    vec3_cross(&up, &z, &x);
    vec3_normalize(&x, &x);

    var y: [3]f32 = undefined;
    vec3_cross(&z, &x, &y);

    out[0] = x[0];
    out[1] = y[0];
    out[2] = z[0];
    out[3] = 0;

    out[4] = x[1];
    out[5] = y[1];
    out[6] = z[1];
    out[7] = 0;

    out[8] = x[2];
    out[9] = y[2];
    out[10] = z[2];
    out[11] = 0;

    out[12] = -(x[0] * eye_x + x[1] * eye_y + x[2] * eye_z);
    out[13] = -(y[0] * eye_x + y[1] * eye_y + y[2] * eye_z);
    out[14] = -(z[0] * eye_x + z[1] * eye_y + z[2] * eye_z);
    out[15] = 1;
}

export fn mat4_invert(mat: [*]const f32, out: [*]f32) bool {
    var inv: [16]f32 = undefined;

    inv[0] = mat[5] * mat[10] * mat[15] - mat[5] * mat[11] * mat[14] -
             mat[9] * mat[6] * mat[15] + mat[9] * mat[7] * mat[14] +
             mat[13] * mat[6] * mat[11] - mat[13] * mat[7] * mat[10];

    inv[4] = -mat[4] * mat[10] * mat[15] + mat[4] * mat[11] * mat[14] +
             mat[8] * mat[6] * mat[15] - mat[8] * mat[7] * mat[14] -
             mat[12] * mat[6] * mat[11] + mat[12] * mat[7] * mat[10];

    inv[8] = mat[4] * mat[9] * mat[15] - mat[4] * mat[11] * mat[13] -
             mat[8] * mat[5] * mat[15] + mat[8] * mat[7] * mat[13] +
             mat[12] * mat[5] * mat[11] - mat[12] * mat[7] * mat[9];

    inv[12] = -mat[4] * mat[9] * mat[14] + mat[4] * mat[10] * mat[13] +
              mat[8] * mat[5] * mat[14] - mat[8] * mat[6] * mat[13] -
              mat[12] * mat[5] * mat[10] + mat[12] * mat[6] * mat[9];

    inv[1] = -mat[1] * mat[10] * mat[15] + mat[1] * mat[11] * mat[14] +
             mat[9] * mat[2] * mat[15] - mat[9] * mat[3] * mat[14] -
             mat[13] * mat[2] * mat[11] + mat[13] * mat[3] * mat[10];

    inv[5] = mat[0] * mat[10] * mat[15] - mat[0] * mat[11] * mat[14] -
             mat[8] * mat[2] * mat[15] + mat[8] * mat[3] * mat[14] +
             mat[12] * mat[2] * mat[11] - mat[12] * mat[3] * mat[10];

    inv[9] = -mat[0] * mat[9] * mat[15] + mat[0] * mat[11] * mat[13] +
             mat[8] * mat[1] * mat[15] - mat[8] * mat[3] * mat[13] -
             mat[12] * mat[1] * mat[11] + mat[12] * mat[3] * mat[9];

    inv[13] = mat[0] * mat[9] * mat[14] - mat[0] * mat[10] * mat[13] -
              mat[8] * mat[1] * mat[14] + mat[8] * mat[2] * mat[13] +
              mat[12] * mat[1] * mat[10] - mat[12] * mat[2] * mat[9];

    inv[2] = mat[1] * mat[6] * mat[15] - mat[1] * mat[7] * mat[14] -
             mat[5] * mat[2] * mat[15] + mat[5] * mat[3] * mat[14] +
             mat[13] * mat[2] * mat[7] - mat[13] * mat[3] * mat[6];

    inv[6] = -mat[0] * mat[6] * mat[15] + mat[0] * mat[7] * mat[14] +
             mat[4] * mat[2] * mat[15] - mat[4] * mat[3] * mat[14] -
             mat[12] * mat[2] * mat[7] + mat[12] * mat[3] * mat[6];

    inv[10] = mat[0] * mat[5] * mat[15] - mat[0] * mat[7] * mat[13] -
              mat[4] * mat[1] * mat[15] + mat[4] * mat[3] * mat[13] +
              mat[12] * mat[1] * mat[7] - mat[12] * mat[3] * mat[5];

    inv[14] = -mat[0] * mat[5] * mat[14] + mat[0] * mat[6] * mat[13] +
              mat[4] * mat[1] * mat[14] - mat[4] * mat[2] * mat[13] -
              mat[12] * mat[1] * mat[6] + mat[12] * mat[2] * mat[5];

    inv[3] = -mat[1] * mat[6] * mat[11] + mat[1] * mat[7] * mat[10] +
             mat[5] * mat[2] * mat[11] - mat[5] * mat[3] * mat[10] -
             mat[9] * mat[2] * mat[7] + mat[9] * mat[3] * mat[6];

    inv[7] = mat[0] * mat[6] * mat[11] - mat[0] * mat[7] * mat[10] -
             mat[4] * mat[2] * mat[11] + mat[4] * mat[3] * mat[10] +
             mat[8] * mat[2] * mat[7] - mat[8] * mat[3] * mat[6];

    inv[11] = -mat[0] * mat[5] * mat[11] + mat[0] * mat[7] * mat[9] +
              mat[4] * mat[1] * mat[11] - mat[4] * mat[3] * mat[9] -
              mat[8] * mat[1] * mat[7] + mat[8] * mat[3] * mat[5];

    inv[15] = mat[0] * mat[5] * mat[10] - mat[0] * mat[6] * mat[9] -
              mat[4] * mat[1] * mat[10] + mat[4] * mat[2] * mat[9] +
              mat[8] * mat[1] * mat[6] - mat[8] * mat[2] * mat[5];

    var det = mat[0] * inv[0] + mat[1] * inv[4] + mat[2] * inv[8] + mat[3] * inv[12];

    if (det == 0) {
        return false;
    }

    det = 1.0 / det;

    var i: usize = 0;
    while (i < 16) : (i += 1) {
        out[i] = inv[i] * det;
    }

    return true;
}

export fn mat4_transpose(mat: [*]const f32, out: [*]f32) void {
    var result: [16]f32 = undefined;

    var i: usize = 0;
    while (i < 4) : (i += 1) {
        var j: usize = 0;
        while (j < 4) : (j += 1) {
            result[j * 4 + i] = mat[i * 4 + j];
        }
    }

    i = 0;
    while (i < 16) : (i += 1) {
        out[i] = result[i];
    }
}

// ============================================================================
// Quaternion Operations
// ============================================================================

export fn quat_identity(out: [*]f32) void {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
}

export fn quat_from_axis_angle(axis_x: f32, axis_y: f32, axis_z: f32, angle: f32, out: [*]f32) void {
    const half_angle = angle * 0.5;
    const s = @sin(half_angle);

    out[0] = axis_x * s;
    out[1] = axis_y * s;
    out[2] = axis_z * s;
    out[3] = @cos(half_angle);
}

export fn quat_multiply(a: [*]const f32, b: [*]const f32, out: [*]f32) void {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];

    const bx = b[0];
    const by = b[1];
    const bz = b[2];
    const bw = b[3];

    out[0] = aw * bx + ax * bw + ay * bz - az * by;
    out[1] = aw * by + ay * bw + az * bx - ax * bz;
    out[2] = aw * bz + az * bw + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
}

export fn quat_to_mat4(quat: [*]const f32, out: [*]f32) void {
    const x = quat[0];
    const y = quat[1];
    const z = quat[2];
    const w = quat[3];

    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;

    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;

    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
}

export fn quat_slerp(a: [*]const f32, b: [*]const f32, t: f32, out: [*]f32) void {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];

    var bx = b[0];
    var by = b[1];
    var bz = b[2];
    var bw = b[3];

    var cosom = ax * bx + ay * by + az * bz + aw * bw;

    if (cosom < 0) {
        cosom = -cosom;
        bx = -bx;
        by = -by;
        bz = -bz;
        bw = -bw;
    }

    var scale0: f32 = undefined;
    var scale1: f32 = undefined;

    if (1 - cosom > 0.000001) {
        const omega = @acos(cosom);
        const sinom = @sin(omega);
        scale0 = @sin((1 - t) * omega) / sinom;
        scale1 = @sin(t * omega) / sinom;
    } else {
        scale0 = 1 - t;
        scale1 = t;
    }

    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;
}

// ============================================================================
// Utility Functions
// ============================================================================

export fn deg_to_rad(degrees: f32) f32 {
    return degrees * (math.pi / 180.0);
}

export fn rad_to_deg(radians: f32) f32 {
    return radians * (180.0 / math.pi);
}

export fn clamp(value: f32, min: f32, max: f32) f32 {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

export fn lerp(a: f32, b: f32, t: f32) f32 {
    return a + (b - a) * t;
}

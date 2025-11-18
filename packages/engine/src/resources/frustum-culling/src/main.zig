const std = @import("std");

/// Frustum plane representation (ax + by + cz + d = 0)
const Plane = struct {
    a: f32,
    b: f32,
    c: f32,
    d: f32,

    /// Normalize the plane equation
    fn normalize(self: *Plane) void {
        const length = @sqrt(self.a * self.a + self.b * self.b + self.c * self.c);
        if (length > 0.0) {
            self.a /= length;
            self.b /= length;
            self.c /= length;
            self.d /= length;
        }
    }

    /// Calculate signed distance from point to plane
    fn distanceToPoint(self: Plane, x: f32, y: f32, z: f32) f32 {
        return self.a * x + self.b * y + self.c * z + self.d;
    }
};

/// Frustum representation with 6 planes (left, right, bottom, top, near, far)
const Frustum = struct {
    planes: [6]Plane,
};

/// Extract frustum planes from view-projection matrix (column-major order)
/// Matrix format: Float32Array[16] in column-major order (WebGL/WebGPU standard)
export fn extractFrustumPlanes(matrixPtr: [*]const f32, planesPtr: [*]f32) void {
    const m = matrixPtr;
    var frustum: Frustum = undefined;

    // Left plane: m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]
    frustum.planes[0] = Plane{
        .a = m[3] + m[0],
        .b = m[7] + m[4],
        .c = m[11] + m[8],
        .d = m[15] + m[12],
    };

    // Right plane: m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]
    frustum.planes[1] = Plane{
        .a = m[3] - m[0],
        .b = m[7] - m[4],
        .c = m[11] - m[8],
        .d = m[15] - m[12],
    };

    // Bottom plane: m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]
    frustum.planes[2] = Plane{
        .a = m[3] + m[1],
        .b = m[7] + m[5],
        .c = m[11] + m[9],
        .d = m[15] + m[13],
    };

    // Top plane: m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]
    frustum.planes[3] = Plane{
        .a = m[3] - m[1],
        .b = m[7] - m[5],
        .c = m[11] - m[9],
        .d = m[15] - m[13],
    };

    // Near plane: m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]
    frustum.planes[4] = Plane{
        .a = m[3] + m[2],
        .b = m[7] + m[6],
        .c = m[11] + m[10],
        .d = m[15] + m[14],
    };

    // Far plane: m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]
    frustum.planes[5] = Plane{
        .a = m[3] - m[2],
        .b = m[7] - m[6],
        .c = m[11] - m[10],
        .d = m[15] - m[14],
    };

    // Normalize all planes
    for (&frustum.planes) |*plane| {
        plane.normalize();
    }

    // Write planes to output buffer (24 floats total: 6 planes * 4 components)
    var i: usize = 0;
    while (i < 6) : (i += 1) {
        planesPtr[i * 4 + 0] = frustum.planes[i].a;
        planesPtr[i * 4 + 1] = frustum.planes[i].b;
        planesPtr[i * 4 + 2] = frustum.planes[i].c;
        planesPtr[i * 4 + 3] = frustum.planes[i].d;
    }
}

/// Test if an AABB (Axis-Aligned Bounding Box) intersects the frustum
/// Returns: 1 if visible, 0 if culled
/// Parameters:
///   - planesPtr: pointer to 24 floats (6 planes * 4 components)
///   - minX, minY, minZ: AABB minimum corner
///   - maxX, maxY, maxZ: AABB maximum corner
export fn testAABB(
    planesPtr: [*]const f32,
    minX: f32,
    minY: f32,
    minZ: f32,
    maxX: f32,
    maxY: f32,
    maxZ: f32,
) u32 {
    // Reconstruct frustum from planes buffer
    var frustum: Frustum = undefined;
    var i: usize = 0;
    while (i < 6) : (i += 1) {
        frustum.planes[i] = Plane{
            .a = planesPtr[i * 4 + 0],
            .b = planesPtr[i * 4 + 1],
            .c = planesPtr[i * 4 + 2],
            .d = planesPtr[i * 4 + 3],
        };
    }

    // Test AABB against each plane using the p-vertex/n-vertex method
    for (frustum.planes) |plane| {
        // Calculate the positive vertex (furthest point in direction of plane normal)
        const px = if (plane.a >= 0.0) maxX else minX;
        const py = if (plane.b >= 0.0) maxY else minY;
        const pz = if (plane.c >= 0.0) maxZ else minZ;

        // If the positive vertex is behind the plane, the entire AABB is outside
        if (plane.distanceToPoint(px, py, pz) < 0.0) {
            return 0; // Culled
        }
    }

    return 1; // Visible (at least partially inside frustum)
}

/// Test if a sphere intersects the frustum
/// Returns: 1 if visible, 0 if culled
/// Parameters:
///   - planesPtr: pointer to 24 floats (6 planes * 4 components)
///   - centerX, centerY, centerZ: sphere center
///   - radius: sphere radius
export fn testSphere(
    planesPtr: [*]const f32,
    centerX: f32,
    centerY: f32,
    centerZ: f32,
    radius: f32,
) u32 {
    // Reconstruct frustum from planes buffer
    var frustum: Frustum = undefined;
    var i: usize = 0;
    while (i < 6) : (i += 1) {
        frustum.planes[i] = Plane{
            .a = planesPtr[i * 4 + 0],
            .b = planesPtr[i * 4 + 1],
            .c = planesPtr[i * 4 + 2],
            .d = planesPtr[i * 4 + 3],
        };
    }

    // Test sphere against each plane
    for (frustum.planes) |plane| {
        const distance = plane.distanceToPoint(centerX, centerY, centerZ);

        // If sphere center is more than radius distance behind the plane, it's completely outside
        if (distance < -radius) {
            return 0; // Culled
        }
    }

    return 1; // Visible (at least partially inside frustum)
}

/// Batch test multiple AABBs against frustum
/// Returns: number of visible AABBs
/// Parameters:
///   - planesPtr: pointer to 24 floats (6 planes * 4 components)
///   - aabbsPtr: pointer to AABBs (6 floats each: minX, minY, minZ, maxX, maxY, maxZ)
///   - visibilityPtr: output pointer to visibility results (1 byte per AABB: 1=visible, 0=culled)
///   - count: number of AABBs to test
export fn batchTestAABB(
    planesPtr: [*]const f32,
    aabbsPtr: [*]const f32,
    visibilityPtr: [*]u8,
    count: u32,
) u32 {
    var visibleCount: u32 = 0;
    var i: u32 = 0;

    while (i < count) : (i += 1) {
        const baseIdx = i * 6;
        const result = testAABB(
            planesPtr,
            aabbsPtr[baseIdx + 0], // minX
            aabbsPtr[baseIdx + 1], // minY
            aabbsPtr[baseIdx + 2], // minZ
            aabbsPtr[baseIdx + 3], // maxX
            aabbsPtr[baseIdx + 4], // maxY
            aabbsPtr[baseIdx + 5], // maxZ
        );

        visibilityPtr[i] = @intCast(result);
        visibleCount += result;
    }

    return visibleCount;
}

/// Batch test multiple spheres against frustum
/// Returns: number of visible spheres
/// Parameters:
///   - planesPtr: pointer to 24 floats (6 planes * 4 components)
///   - spheresPtr: pointer to spheres (4 floats each: centerX, centerY, centerZ, radius)
///   - visibilityPtr: output pointer to visibility results (1 byte per sphere: 1=visible, 0=culled)
///   - count: number of spheres to test
export fn batchTestSphere(
    planesPtr: [*]const f32,
    spheresPtr: [*]const f32,
    visibilityPtr: [*]u8,
    count: u32,
) u32 {
    var visibleCount: u32 = 0;
    var i: u32 = 0;

    while (i < count) : (i += 1) {
        const baseIdx = i * 4;
        const result = testSphere(
            planesPtr,
            spheresPtr[baseIdx + 0], // centerX
            spheresPtr[baseIdx + 1], // centerY
            spheresPtr[baseIdx + 2], // centerZ
            spheresPtr[baseIdx + 3], // radius
        );

        visibilityPtr[i] = @intCast(result);
        visibleCount += result;
    }

    return visibleCount;
}

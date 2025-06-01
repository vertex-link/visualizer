
// src/engine/resources/GeometryUtils.ts - Complete Geometry Utility

import { MeshDescriptor, VertexAttribute } from './MeshResource.ts';

export class GeometryUtils {
    /**
     * Create a box geometry with position, normal, and UV coordinates
     */
    static createBox(
        width: number = 1.0,
        height: number = 1.0,
        depth: number = 1.0,
        includeNormals: boolean = true,
        includeUVs: boolean = true
    ): MeshDescriptor {
        const w = width * 0.5;
        const h = height * 0.5;
        const d = depth * 0.5;

        // Define vertices with position, normal, and UV data
        const positions = [
            // Front face
            -w, -h,  d,  // 0
            w, -h,  d,  // 1
            w,  h,  d,  // 2
            -w,  h,  d,  // 3

            // Back face
            -w, -h, -d,  // 4
            -w,  h, -d,  // 5
            w,  h, -d,  // 6
            w, -h, -d,  // 7

            // Top face
            -w,  h, -d,  // 8
            -w,  h,  d,  // 9
            w,  h,  d,  // 10
            w,  h, -d,  // 11

            // Bottom face
            -w, -h, -d,  // 12
            w, -h, -d,  // 13
            w, -h,  d,  // 14
            -w, -h,  d,  // 15

            // Right face
            w, -h, -d,  // 16
            w,  h, -d,  // 17
            w,  h,  d,  // 18
            w, -h,  d,  // 19

            // Left face
            -w, -h, -d,  // 20
            -w, -h,  d,  // 21
            -w,  h,  d,  // 22
            -w,  h, -d,  // 23
        ];

        const normals = includeNormals ? [
            // Front face
            0,  0,  1,   0,  0,  1,   0,  0,  1,   0,  0,  1,
            // Back face
            0,  0, -1,   0,  0, -1,   0,  0, -1,   0,  0, -1,
            // Top face
            0,  1,  0,   0,  1,  0,   0,  1,  0,   0,  1,  0,
            // Bottom face
            0, -1,  0,   0, -1,  0,   0, -1,  0,   0, -1,  0,
            // Right face
            1,  0,  0,   1,  0,  0,   1,  0,  0,   1,  0,  0,
            // Left face
            -1,  0,  0,  -1,  0,  0,  -1,  0,  0,  -1,  0,  0,
        ] : [];

        const uvs = includeUVs ? [
            // Front face
            0, 0,  1, 0,  1, 1,  0, 1,
            // Back face
            1, 0,  1, 1,  0, 1,  0, 0,
            // Top face
            0, 1,  0, 0,  1, 0,  1, 1,
            // Bottom face
            1, 1,  0, 1,  0, 0,  1, 0,
            // Right face
            1, 0,  1, 1,  0, 1,  0, 0,
            // Left face
            0, 0,  1, 0,  1, 1,  0, 1,
        ] : [];

        // Indices for triangles
        const indices = [
            0,  1,  2,    0,  2,  3,    // front
            4,  5,  6,    4,  6,  7,    // back
            8,  9, 10,    8, 10, 11,    // top
            12, 13, 14,   12, 14, 15,   // bottom
            16, 17, 18,   16, 18, 19,   // right
            20, 21, 22,   20, 22, 23    // left
        ];

        // Interleave vertex data
        const vertexData: number[] = [];
        const vertexCount = 24; // 6 faces * 4 vertices per face

        for (let i = 0; i < vertexCount; i++) {
            // Position
            vertexData.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);

            // Normal
            if (includeNormals) {
                vertexData.push(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
            }

            // UV
            if (includeUVs) {
                vertexData.push(uvs[i * 2], uvs[i * 2 + 1]);
            }
        }

        // Create vertex attributes
        const attributes: VertexAttribute[] = [];
        let offset = 0;

        // Position attribute
        attributes.push({
            name: 'position',
            size: 3,
            type: 'float32',
            offset: offset
        });
        offset += 3 * 4; // 3 floats * 4 bytes

        // Normal attribute
        if (includeNormals) {
            attributes.push({
                name: 'normal',
                size: 3,
                type: 'float32',
                offset: offset
            });
            offset += 3 * 4;
        }

        // UV attribute
        if (includeUVs) {
            attributes.push({
                name: 'uv',
                size: 2,
                type: 'float32',
                offset: offset
            });
            offset += 2 * 4;
        }

        const vertexStride = offset;

        return {
            vertices: new Float32Array(vertexData),
            indices: new Uint16Array(indices),
            vertexAttributes: attributes,
            vertexStride: vertexStride,
            primitiveTopology: 'triangle-list'
        };
    }

    /**
     * Create a plane geometry
     */
    static createPlane(
        width: number = 1.0,
        height: number = 1.0,
        includeNormals: boolean = true,
        includeUVs: boolean = true
    ): MeshDescriptor {
        const w = width * 0.5;
        const h = height * 0.5;

        const positions = [
            -w, -h, 0,  // bottom-left
            w, -h, 0,  // bottom-right
            w,  h, 0,  // top-right
            -w,  h, 0   // top-left
        ];

        const normals = includeNormals ? [
            0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1
        ] : [];

        const uvs = includeUVs ? [
            0, 0,  1, 0,  1, 1,  0, 1
        ] : [];

        const indices = [0, 1, 2, 0, 2, 3];

        // Interleave vertex data
        const vertexData: number[] = [];
        const vertexCount = 4;

        for (let i = 0; i < vertexCount; i++) {
            // Position
            vertexData.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);

            // Normal
            if (includeNormals) {
                vertexData.push(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
            }

            // UV
            if (includeUVs) {
                vertexData.push(uvs[i * 2], uvs[i * 2 + 1]);
            }
        }

        // Create vertex attributes
        const attributes: VertexAttribute[] = [];
        let offset = 0;

        attributes.push({
            name: 'position',
            size: 3,
            type: 'float32',
            offset: offset
        });
        offset += 3 * 4;

        if (includeNormals) {
            attributes.push({
                name: 'normal',
                size: 3,
                type: 'float32',
                offset: offset
            });
            offset += 3 * 4;
        }

        if (includeUVs) {
            attributes.push({
                name: 'uv',
                size: 2,
                type: 'float32',
                offset: offset
            });
            offset += 2 * 4;
        }

        return {
            vertices: new Float32Array(vertexData),
            indices: new Uint16Array(indices),
            vertexAttributes: attributes,
            vertexStride: offset,
            primitiveTopology: 'triangle-list'
        };
    }

    /**
     * Create a sphere geometry (simplified)
     */
    static createSphere(
        radius: number = 0.5,
        segments: number = 16,
        includeNormals: boolean = true,
        includeUVs: boolean = true
    ): MeshDescriptor {
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        // Generate vertices
        for (let lat = 0; lat <= segments; lat++) {
            const theta = lat * Math.PI / segments;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= segments; lon++) {
                const phi = lon * 2 * Math.PI / segments;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;

                positions.push(radius * x, radius * y, radius * z);

                if (includeNormals) {
                    normals.push(x, y, z);
                }

                if (includeUVs) {
                    const u = 1 - (lon / segments);
                    const v = 1 - (lat / segments);
                    uvs.push(u, v);
                }
            }
        }

        // Generate indices
        for (let lat = 0; lat < segments; lat++) {
            for (let lon = 0; lon < segments; lon++) {
                const first = (lat * (segments + 1)) + lon;
                const second = first + segments + 1;

                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        // Interleave vertex data
        const vertexData: number[] = [];
        const vertexCount = (segments + 1) * (segments + 1);

        for (let i = 0; i < vertexCount; i++) {
            // Position
            vertexData.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);

            // Normal
            if (includeNormals) {
                vertexData.push(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
            }

            // UV
            if (includeUVs) {
                vertexData.push(uvs[i * 2], uvs[i * 2 + 1]);
            }
        }

        // Create vertex attributes
        const attributes: VertexAttribute[] = [];
        let offset = 0;

        attributes.push({
            name: 'position',
            size: 3,
            type: 'float32',
            offset: offset
        });
        offset += 3 * 4;

        if (includeNormals) {
            attributes.push({
                name: 'normal',
                size: 3,
                type: 'float32',
                offset: offset
            });
            offset += 3 * 4;
        }

        if (includeUVs) {
            attributes.push({
                name: 'uv',
                size: 2,
                type: 'float32',
                offset: offset
            });
            offset += 2 * 4;
        }

        return {
            vertices: new Float32Array(vertexData),
            indices: new Uint16Array(indices),
            vertexAttributes: attributes,
            vertexStride: offset,
            primitiveTopology: 'triangle-list'
        };
    }
}
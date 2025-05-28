// src/engine/resources/GeometryUtils.ts

import { MeshDescriptor, VertexAttribute } from "./MeshResource.ts";

/**
 * Utility class for generating procedural geometry.
 * Provides common primitive shapes with proper vertex data.
 */
export class GeometryUtils {

    /**
     * Create a box mesh with position, normal, and UV coordinates.
     * @param width Width along X axis
     * @param height Height along Y axis
     * @param depth Depth along Z axis
     * @param includeNormals Whether to include normal vectors
     * @param includeUVs Whether to include texture coordinates
     */
    static createBox(
        width: number = 2,
        height: number = 2,
        depth: number = 2,
        includeNormals: boolean = true,
        includeUVs: boolean = true
    ): MeshDescriptor {
        const w = width * 0.5;
        const h = height * 0.5;
        const d = depth * 0.5;

        // Determine vertex format
        const attributes: VertexAttribute[] = [
            { name: 'position', size: 3, type: 'float32', offset: 0 }
        ];
        let stride = 12; // 3 floats for position

        let normalOffset = 0;
        let uvOffset = 0;

        if (includeNormals) {
            normalOffset = stride;
            attributes.push({ name: 'normal', size: 3, type: 'float32', offset: normalOffset });
            stride += 12; // 3 floats for normal
        }

        if (includeUVs) {
            uvOffset = stride;
            attributes.push({ name: 'uv', size: 2, type: 'float32', offset: uvOffset });
            stride += 8; // 2 floats for UV
        }

        // Box vertices (24 vertices, 4 per face for proper normals/UVs)
        const positions = [
            // Front face
            -w, -h,  d,   w, -h,  d,   w,  h,  d,  -w,  h,  d,
            // Back face  
            -w, -h, -d,  -w,  h, -d,   w,  h, -d,   w, -h, -d,
            // Top face
            -w,  h, -d,  -w,  h,  d,   w,  h,  d,   w,  h, -d,
            // Bottom face
            -w, -h, -d,   w, -h, -d,   w, -h,  d,  -w, -h,  d,
            // Right face
            w, -h, -d,   w,  h, -d,   w,  h,  d,   w, -h,  d,
            // Left face
            -w, -h, -d,  -w, -h,  d,  -w,  h,  d,  -w,  h, -d
        ];

        const normals = [
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
            -1,  0,  0,  -1,  0,  0,  -1,  0,  0,  -1,  0,  0
        ];

        const uvs = [
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
            0, 0,  1, 0,  1, 1,  0, 1
        ];

        // Pack vertex data
        const vertexCount = 24;
        const vertices = new Float32Array(vertexCount * stride / 4);

        for (let i = 0; i < vertexCount; i++) {
            const vertexIndex = i * stride / 4;

            // Position
            vertices[vertexIndex + 0] = positions[i * 3 + 0];
            vertices[vertexIndex + 1] = positions[i * 3 + 1];
            vertices[vertexIndex + 2] = positions[i * 3 + 2];

            // Normal
            if (includeNormals) {
                const normalIndex = vertexIndex + normalOffset / 4;
                vertices[normalIndex + 0] = normals[i * 3 + 0];
                vertices[normalIndex + 1] = normals[i * 3 + 1];
                vertices[normalIndex + 2] = normals[i * 3 + 2];
            }

            // UV
            if (includeUVs) {
                const uvIndex = vertexIndex + uvOffset / 4;
                vertices[uvIndex + 0] = uvs[i * 2 + 0];
                vertices[uvIndex + 1] = uvs[i * 2 + 1];
            }
        }

        // Box indices (12 triangles, 2 per face)
        const indices = new Uint16Array([
            // Front face
            0, 1, 2,  2, 3, 0,
            // Back face
            4, 5, 6,  6, 7, 4,
            // Top face
            8, 9, 10,  10, 11, 8,
            // Bottom face
            12, 13, 14,  14, 15, 12,
            // Right face
            16, 17, 18,  18, 19, 16,
            // Left face
            20, 21, 22,  22, 23, 20
        ]);

        return {
            vertices,
            indices,
            vertexAttributes: attributes,
            vertexStride: stride,
            primitiveTopology: 'triangle-list'
        };
    }

    /**
     * Create a simple quad mesh (useful for UI or screen-space effects).
     * @param width Width of the quad
     * @param height Height of the quad
     * @param includeUVs Whether to include texture coordinates
     */
    static createQuad(
        width: number = 2,
        height: number = 2,
        includeUVs: boolean = true
    ): MeshDescriptor {
        const w = width * 0.5;
        const h = height * 0.5;

        const attributes: VertexAttribute[] = [
            { name: 'position', size: 3, type: 'float32', offset: 0 }
        ];
        let stride = 12; // 3 floats for position

        if (includeUVs) {
            attributes.push({ name: 'uv', size: 2, type: 'float32', offset: stride });
            stride += 8; // 2 floats for UV
        }

        const vertexData = includeUVs ? [
            // Bottom-left
            -w, -h, 0,  0, 0,
            // Bottom-right
            w, -h, 0,  1, 0,
            // Top-right
            w,  h, 0,  1, 1,
            // Top-left
            -w,  h, 0,  0, 1
        ] : [
            // Bottom-left
            -w, -h, 0,
            // Bottom-right
            w, -h, 0,
            // Top-right
            w,  h, 0,
            // Top-left
            -w,  h, 0
        ];

        const vertices = new Float32Array(vertexData);
        const indices = new Uint16Array([0, 1, 2, 2, 3, 0]);

        return {
            vertices,
            indices,
            vertexAttributes: attributes,
            vertexStride: stride,
            primitiveTopology: 'triangle-list'
        };
    }

    /**
     * Create a sphere mesh with position, normal, and UV coordinates.
     * @param radius Radius of the sphere
     * @param segments Number of horizontal segments
     * @param rings Number of vertical rings
     * @param includeNormals Whether to include normal vectors
     * @param includeUVs Whether to include texture coordinates
     */
    static createSphere(
        radius: number = 1,
        segments: number = 16,
        rings: number = 12,
        includeNormals: boolean = true,
        includeUVs: boolean = true
    ): MeshDescriptor {
        const attributes: VertexAttribute[] = [
            { name: 'position', size: 3, type: 'float32', offset: 0 }
        ];
        let stride = 12; // 3 floats for position

        let normalOffset = 0;
        let uvOffset = 0;

        if (includeNormals) {
            normalOffset = stride;
            attributes.push({ name: 'normal', size: 3, type: 'float32', offset: normalOffset });
            stride += 12; // 3 floats for normal
        }

        if (includeUVs) {
            uvOffset = stride;
            attributes.push({ name: 'uv', size: 2, type: 'float32', offset: uvOffset });
            stride += 8; // 2 floats for UV
        }

        const vertexCount = (rings + 1) * (segments + 1);
        const vertices = new Float32Array(vertexCount * stride / 4);
        const indices: number[] = [];

        let vertexIndex = 0;

        for (let ring = 0; ring <= rings; ring++) {
            const phi = ring * Math.PI / rings;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            for (let segment = 0; segment <= segments; segment++) {
                const theta = segment * 2 * Math.PI / segments;
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);

                // Position
                const x = cosTheta * sinPhi;
                const y = cosPhi;
                const z = sinTheta * sinPhi;

                const baseIndex = vertexIndex * stride / 4;

                vertices[baseIndex + 0] = x * radius;
                vertices[baseIndex + 1] = y * radius;
                vertices[baseIndex + 2] = z * radius;

                // Normal (same as normalized position for a sphere)
                if (includeNormals) {
                    const normalIndex = baseIndex + normalOffset / 4;
                    vertices[normalIndex + 0] = x;
                    vertices[normalIndex + 1] = y;
                    vertices[normalIndex + 2] = z;
                }

                // UV
                if (includeUVs) {
                    const uvIndex = baseIndex + uvOffset / 4;
                    vertices[uvIndex + 0] = segment / segments;
                    vertices[uvIndex + 1] = ring / rings;
                }

                vertexIndex++;
            }
        }

        // Generate indices
        for (let ring = 0; ring < rings; ring++) {
            for (let segment = 0; segment < segments; segment++) {
                const current = ring * (segments + 1) + segment;
                const next = current + segments + 1;

                // First triangle
                indices.push(current, next, current + 1);
                // Second triangle
                indices.push(current + 1, next, next + 1);
            }
        }

        return {
            vertices,
            indices: new Uint16Array(indices),
            vertexAttributes: attributes,
            vertexStride: stride,
            primitiveTopology: 'triangle-list'
        };
    }

    /**
     * Create a plane mesh with position, normal, and UV coordinates.
     * @param width Width along X axis
     * @param depth Depth along Z axis
     * @param widthSegments Number of segments along width
     * @param depthSegments Number of segments along depth
     * @param includeNormals Whether to include normal vectors
     * @param includeUVs Whether to include texture coordinates
     */
    static createPlane(
        width: number = 2,
        depth: number = 2,
        widthSegments: number = 1,
        depthSegments: number = 1,
        includeNormals: boolean = true,
        includeUVs: boolean = true
    ): MeshDescriptor {
        const attributes: VertexAttribute[] = [
            { name: 'position', size: 3, type: 'float32', offset: 0 }
        ];
        let stride = 12; // 3 floats for position

        let normalOffset = 0;
        let uvOffset = 0;

        if (includeNormals) {
            normalOffset = stride;
            attributes.push({ name: 'normal', size: 3, type: 'float32', offset: normalOffset });
            stride += 12; // 3 floats for normal
        }

        if (includeUVs) {
            uvOffset = stride;
            attributes.push({ name: 'uv', size: 2, type: 'float32', offset: uvOffset });
            stride += 8; // 2 floats for UV
        }

        const vertexCount = (widthSegments + 1) * (depthSegments + 1);
        const vertices = new Float32Array(vertexCount * stride / 4);
        const indices: number[] = [];

        const halfWidth = width * 0.5;
        const halfDepth = depth * 0.5;

        let vertexIndex = 0;

        for (let z = 0; z <= depthSegments; z++) {
            for (let x = 0; x <= widthSegments; x++) {
                const baseIndex = vertexIndex * stride / 4;

                // Position
                vertices[baseIndex + 0] = (x / widthSegments - 0.5) * width;
                vertices[baseIndex + 1] = 0;
                vertices[baseIndex + 2] = (z / depthSegments - 0.5) * depth;

                // Normal (pointing up)
                if (includeNormals) {
                    const normalIndex = baseIndex + normalOffset / 4;
                    vertices[normalIndex + 0] = 0;
                    vertices[normalIndex + 1] = 1;
                    vertices[normalIndex + 2] = 0;
                }

                // UV
                if (includeUVs) {
                    const uvIndex = baseIndex + uvOffset / 4;
                    vertices[uvIndex + 0] = x / widthSegments;
                    vertices[uvIndex + 1] = z / depthSegments;
                }

                vertexIndex++;
            }
        }

        // Generate indices
        for (let z = 0; z < depthSegments; z++) {
            for (let x = 0; x < widthSegments; x++) {
                const topLeft = z * (widthSegments + 1) + x;
                const topRight = topLeft + 1;
                const bottomLeft = (z + 1) * (widthSegments + 1) + x;
                const bottomRight = bottomLeft + 1;

                // First triangle
                indices.push(topLeft, bottomLeft, topRight);
                // Second triangle
                indices.push(topRight, bottomLeft, bottomRight);
            }
        }

        return {
            vertices,
            indices: new Uint16Array(indices),
            vertexAttributes: attributes,
            vertexStride: stride,
            primitiveTopology: 'triangle-list'
        };
    }

    /**
     * Create triangle mesh (useful for testing).
     * @param size Size of the triangle
     * @param includeUVs Whether to include texture coordinates
     */
    static createTriangle(size: number = 1, includeUVs: boolean = false): MeshDescriptor {
        const attributes: VertexAttribute[] = [
            { name: 'position', size: 3, type: 'float32', offset: 0 }
        ];
        let stride = 12; // 3 floats for position

        if (includeUVs) {
            attributes.push({ name: 'uv', size: 2, type: 'float32', offset: stride });
            stride += 8; // 2 floats for UV
        }

        const height = size * Math.sqrt(3) / 2;

        const vertexData = includeUVs ? [
            // Bottom-left
            -size * 0.5, -height / 3, 0,  0, 0,
            // Bottom-right
            size * 0.5, -height / 3, 0,  1, 0,
            // Top
            0, height * 2 / 3, 0,  0.5, 1
        ] : [
            // Bottom-left
            -size * 0.5, -height / 3, 0,
            // Bottom-right
            size * 0.5, -height / 3, 0,
            // Top
            0, height * 2 / 3, 0
        ];

        const vertices = new Float32Array(vertexData);
        const indices = new Uint16Array([0, 1, 2]);

        return {
            vertices,
            indices,
            vertexAttributes: attributes,
            vertexStride: stride,
            primitiveTopology: 'triangle-list'
        };
    }
}
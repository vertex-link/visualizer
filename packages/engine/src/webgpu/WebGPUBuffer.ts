import {BufferDescriptor, BufferUsage, IBuffer} from "../rendering/interfaces/IBuffer";

/**
 * WebGPU implementation of the IBuffer interface.
 * Manages GPU buffer resources and data transfers.
 */
export class WebGPUBuffer implements IBuffer {
    public readonly id: string;
    public readonly size: number;
    public readonly usage: BufferUsage;

    private device: GPUDevice;
    private gpuBuffer: GPUBuffer;
    private label: string;

    constructor(device: GPUDevice, descriptor: BufferDescriptor, mappedAtCreation: boolean = false) { // Added mappedAtCreation
        this.id = generateUUID();
        this.size = descriptor.size;
        this.usage = descriptor.usage;
        this.device = device;
        this.label = descriptor.label || `Buffer_${this.usage}_${this.id}`;

        // Create GPU buffer with appropriate usage flags
        const gpuUsage = this.getGPUUsageFlags(descriptor.usage);

        this.gpuBuffer = device.createBuffer({
            size: descriptor.size,
            usage: gpuUsage,
            label: this.label,
            mappedAtCreation: mappedAtCreation // Use the parameter
        });
    }

    /**
     * Update buffer data.
     */
    setData(data: ArrayBuffer | ArrayBufferView, offset: number = 0): void {
        if (!this.gpuBuffer) {
            throw new Error('Buffer has been destroyed');
        }

        // Convert ArrayBufferView to ArrayBuffer if needed
        const arrayBuffer = data instanceof ArrayBuffer ? data : data.buffer;

        if (offset + arrayBuffer.byteLength > this.size) {
            throw new Error(`Data size (${arrayBuffer.byteLength}) + offset (${offset}) exceeds buffer size (${this.size})`);
        }

        // Write data to GPU buffer
        this.device.queue.writeBuffer(this.gpuBuffer, offset, arrayBuffer);
    }

    /**
     * Get a portion of buffer data (if supported).
     * Note: This is primarily for debugging - reading GPU data is expensive.
     */
    async getData(offset: number = 0, length?: number): Promise<ArrayBuffer> {
        if (!this.gpuBuffer) {
            throw new Error('Buffer has been destroyed');
        }

        const readLength = length ?? (this.size - offset);

        if (offset + readLength > this.size) {
            throw new Error(`Read range exceeds buffer size`);
        }

        // Create a staging buffer for reading
        const stagingBuffer = this.device.createBuffer({
            size: readLength,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            label: `${this.label}_staging`
        });

        // Copy from GPU buffer to staging buffer
        const encoder = this.device.createCommandEncoder({
            label: `${this.label}_read_encoder`
        });

        encoder.copyBufferToBuffer(
            this.gpuBuffer, offset,
            stagingBuffer, 0,
            readLength
        );

        this.device.queue.submit([encoder.finish()]);

        // Map and read the staging buffer
        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const mappedRange = stagingBuffer.getMappedRange();
        const result = mappedRange.slice(0); // Copy the data

        stagingBuffer.unmap();
        stagingBuffer.destroy();

        return result;
    }

    /**
     * Get the underlying GPU buffer (for WebGPU-specific operations).
     */
    getGPUBuffer(): GPUBuffer {
        if (!this.gpuBuffer) {
            throw new Error('Buffer has been destroyed');
        }
        return this.gpuBuffer;
    }

    /**
     * Destroy the buffer and free its resources.
     */
    destroy(): void {
        if (this.gpuBuffer) {
            this.gpuBuffer.destroy();
            // @ts-ignore - Ensure we don't accidentally use destroyed buffer
            this.gpuBuffer = null;
        }
    }

    /**
     * Convert our BufferUsage enum to WebGPU usage flags.
     */
    private getGPUUsageFlags(usage: BufferUsage): GPUBufferUsageFlags {
        switch (usage) {
            case BufferUsage.VERTEX:
                return GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;

            case BufferUsage.INDEX:
                return GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST;

            case BufferUsage.UNIFORM:
                return GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;

            case BufferUsage.STORAGE:
                return GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;

            default:
                throw new Error(`Unsupported buffer usage: ${usage}`);
        }
    }

    /**
     * Static factory method to create a buffer.
     */
    static create(device: GPUDevice, descriptor: BufferDescriptor): WebGPUBuffer {
        return new WebGPUBuffer(device, descriptor);
    }

    /**
     * Static helper to create a vertex buffer with data.
     */
    static createVertex(device: GPUDevice, data: Float32Array, label?: string): WebGPUBuffer {
        const buffer = new WebGPUBuffer(device, {
            size: data.byteLength,
            usage: BufferUsage.VERTEX,
            label: label || 'Vertex Buffer'
        });

        buffer.setData(data);
        return buffer;
    }

    /**
     * Static helper to create an index buffer with data.
     */
    static createIndex(device: GPUDevice, data: Uint16Array, label?: string): WebGPUBuffer {
        const buffer = new WebGPUBuffer(device, {
            size: data.byteLength,
            usage: BufferUsage.INDEX,
            label: label || 'Index Buffer'
        });

        buffer.setData(data);
        return buffer;
    }

    /**
     * Static helper to create a uniform buffer with data.
     */
    static createUniform(device: GPUDevice, data: ArrayBuffer, label?: string): WebGPUBuffer {
        const buffer = new WebGPUBuffer(device, {
            size: data.byteLength,
            usage: BufferUsage.UNIFORM,
            label: label || 'Uniform Buffer'
        });

        buffer.setData(data);
        return buffer;
    }
}
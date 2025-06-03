/**
 * Supported buffer usage types.
 */
export enum BufferUsage {
    VERTEX = "vertex",
    INDEX = "index",
    UNIFORM = "uniform",
    STORAGE = "storage"
}

/**
 * Buffer creation descriptor.
 */
export interface BufferDescriptor {
    /** Size of the buffer in bytes */
    size: number;
    /** Usage type of the buffer */
    usage: BufferUsage;
    /** Optional label for debugging */
    label?: string;
}

/**
 * Abstract buffer interface for GPU data storage.
 * Designed to be simple now but extensible for streaming later.
 */
export interface IBuffer {
    /** Unique identifier for this buffer */
    readonly id: string;

    /** Size of the buffer in bytes */
    readonly size: number;

    /** Usage type of this buffer */
    readonly usage: BufferUsage;

    /**
     * Update buffer data.
     * @param data The data to write to the buffer
     * @param offset Byte offset to start writing (default: 0)
     */
    setData(data: ArrayBuffer | ArrayBufferView, offset?: number): void;

    /**
     * Get a portion of buffer data (if supported).
     * @param offset Byte offset to start reading (default: 0)
     * @param length Number of bytes to read (default: entire buffer)
     * @returns Promise that resolves to the buffer data
     */
    getData(offset?: number, length?: number): Promise<ArrayBuffer>;

    /**
     * Destroy the buffer and free its resources.
     */
    destroy(): void;
}
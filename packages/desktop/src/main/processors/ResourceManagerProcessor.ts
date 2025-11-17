import { Processor, Context, generateUUID } from "@vertex-link/space";
import {
  ResourceImportRequestedEvent,
  ResourceRegisteredEvent,
  type ResourceDescriptor,
} from "../events/EditorEvents";
import { stat } from "fs/promises";

/**
 * Manages resource imports and metadata
 */
export class ResourceManagerProcessor extends Processor {
  private resources = new Map<string, ResourceDescriptor>();

  constructor() {
    super("resource-manager");
  }

  async initialize(): Promise<void> {
    const eventBus = Context.current().eventBus;

    // Listen for resource import requests
    eventBus.on(ResourceImportRequestedEvent, async (event) => {
      await this.importResource(event.payload.path, event.payload.type);
    }, this);
  }

  async importResource(path: string, type: string): Promise<ResourceDescriptor> {
    // Extract metadata
    const metadata = await this.extractMetadata(path, type);

    const descriptor: ResourceDescriptor = {
      id: generateUUID(),
      name: path.split("/").pop() || "unknown",
      path,
      type,
      metadata,
    };

    this.resources.set(descriptor.id, descriptor);

    // Emit event - all windows receive it
    const eventBus = Context.current().eventBus;
    eventBus.emit(new ResourceRegisteredEvent({ descriptor }));

    console.log(`📦 Resource imported: ${descriptor.name} (${type})`);

    return descriptor;
  }

  private async extractMetadata(path: string, type: string): Promise<Record<string, any>> {
    try {
      const stats = await stat(path);

      const metadata: Record<string, any> = {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };

      // Type-specific metadata
      if (type === "texture" || type === "image") {
        // Could extract image dimensions here
        metadata.dimensions = { width: 0, height: 0 };
      }

      if (type === "gltf" || type === "model") {
        // Could extract model info here
        metadata.triangles = 0;
      }

      return metadata;
    } catch (error) {
      console.error(`Failed to extract metadata for ${path}:`, error);
      return {};
    }
  }

  /**
   * Get all registered resources
   */
  getAll(): ResourceDescriptor[] {
    return Array.from(this.resources.values());
  }

  /**
   * Get resource by ID
   */
  get(id: string): ResourceDescriptor | undefined {
    return this.resources.get(id);
  }
}

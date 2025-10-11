import type Actor from "../Actor";
import type { Resource } from "../resources/Resource";
import Component from "./Component";

export class ResourceComponent extends Component {
  private resources = new Set<Resource>();

  constructor(actor: Actor, resources: Resource[] = []) {
    super(actor);

    // Add initial resources
    for (const resource of resources) {
      this.resources.add(resource);
    }
  }

  /**
   * Add a resource
   */
  add(resource: Resource): void {
    this.resources.add(resource);
  }

  /**
   * Get first resource of specific type
   */
  get<T extends Resource>(type: new (...args: unknown[]) => T): T | undefined {
    for (const resource of this.resources) {
      if (resource instanceof type) {
        return resource as T;
      }
    }
    return undefined;
  }

  /**
   * Get all resources of specific type
   */
  getAll<T extends Resource>(type: new (...args: unknown[]) => T): T[] {
    const results: T[] = [];
    for (const resource of this.resources) {
      if (resource instanceof type) {
        results.push(resource as T);
      }
    }
    return results;
  }

  /**
   * Get all resources
   */
  getResources(): ReadonlySet<Resource> {
    return this.resources;
  }
}

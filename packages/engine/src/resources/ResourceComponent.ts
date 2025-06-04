import { Actor, Component } from "@vertex-link/acs";
import { Resource } from "@vertex-link/engine";

class ResourceComponent extends Component {
  private resources: Set<Resource>;

  constructor(actor: Actor, ...resources: Resource[]) {
    super(actor);
    this.resources = new Set(resources);
  }

  // Get by class type - super clean!
  get<T extends Resource>(type: new (...args: any[]) => T): T | undefined {
    for (const resource of this.resources) {
      if (resource instanceof type) return resource;
    }
    return undefined;
  }

  // Get all of a type
  getAll<T extends Resource>(type: new (...args: any[]) => T): T[] {
    return Array.from(this.resources)
      .filter(r => r instanceof type) as T[];
  }
}

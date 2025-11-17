import { Processor, Tickers, Context, EntityCreatedEvent, EntityDestroyedEvent } from "@vertex-link/space";
import type Loki from "lokijs";

/**
 * Handles auto-saving project state to LokiDB
 */
export class PersistenceProcessor extends Processor {
  private isDirty = false;
  private projectPath: string;

  constructor(private db: Loki, projectPath: string) {
    // Auto-save every 5 seconds when dirty
    super("persistence", Tickers.fixedInterval(5000));
    this.projectPath = projectPath;
  }

  async initialize(): Promise<void> {
    const eventBus = Context.current().eventBus;

    // Mark dirty on any scene change
    eventBus.on(EntityCreatedEvent, () => {
      this.isDirty = true;
    }, this);

    eventBus.on(EntityDestroyedEvent, () => {
      this.isDirty = true;
    }, this);
  }

  protected executeTasks(deltaTime: number): void {
    if (this.isDirty) {
      this.saveProject();
      this.isDirty = false;
    }
  }

  private saveProject(): void {
    const scene = Context.current().scene;

    // Get or create project metadata collection
    let projectCollection = this.db.getCollection("project");
    if (!projectCollection) {
      projectCollection = this.db.addCollection("project");
    }

    // Save basic project info
    const projectData = projectCollection.findOne({ id: "main" });
    if (projectData) {
      projectData.lastModified = Date.now();
      projectData.actorCount = scene.getActorCount();
      projectCollection.update(projectData);
    } else {
      projectCollection.insert({
        id: "main",
        name: "Untitled Project",
        version: "0.1.0",
        lastModified: Date.now(),
        actorCount: scene.getActorCount(),
      });
    }

    console.log("💾 Project auto-saved");
  }

  /**
   * Force immediate save
   */
  forceSave(): void {
    this.saveProject();
    this.isDirty = false;
  }
}

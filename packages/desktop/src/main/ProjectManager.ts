import Loki from "lokijs";
import { Context, EventBus, Scene } from "@vertex-link/space";
import { SelectionProcessor } from "./processors/SelectionProcessor";
import { PersistenceProcessor } from "./processors/PersistenceProcessor";
import { ResourceManagerProcessor } from "./processors/ResourceManagerProcessor";
import { IPCBridgeProcessor } from "./processors/IPCBridgeProcessor";
import type { WindowManager } from "./WindowManager";

/**
 * Manages editor project lifecycle
 */
export class ProjectManager {
  private db?: Loki;
  private context?: Context;
  private projectPath?: string;

  /**
   * Open a project from a directory
   */
  async openProject(
    projectPath: string,
    windowManager: WindowManager,
  ): Promise<Context> {
    console.log(`📂 Opening project: ${projectPath}`);

    // Create editor context
    this.context = new Context();
    this.context.eventBus = new EventBus();
    this.projectPath = projectPath;

    // Load or create LokiDB
    this.db = await this.loadDatabase(`${projectPath}/.editor/project.db`);

    // Create initial scene (will load from file later)
    const scene = new Scene("MainScene", this.context.eventBus);
    this.context.setScene(scene);

    // Add editor processors
    this.context.addProcessor(new SelectionProcessor());
    this.context.addProcessor(new PersistenceProcessor(this.db, projectPath));
    this.context.addProcessor(new ResourceManagerProcessor());
    this.context.addProcessor(new IPCBridgeProcessor(windowManager));

    // Initialize and start all processors
    for (const processor of this.context.processors) {
      await processor.initialize();
    }

    for (const processor of this.context.processors) {
      processor.start();
    }

    console.log(`✅ Project opened with ${this.context.processors.length} processors`);

    return this.context;
  }

  /**
   * Create a new project
   */
  async createProject(projectPath: string, projectName: string): Promise<void> {
    console.log(`🆕 Creating new project: ${projectName} at ${projectPath}`);

    // Create project structure
    const { mkdir, exists } = require("fs/promises");

    if (!(await exists(projectPath))) {
      await mkdir(projectPath, { recursive: true });
    }

    // Create .editor directory
    const editorDir = `${projectPath}/.editor`;
    if (!(await exists(editorDir))) {
      await mkdir(editorDir);
    }

    // Create scenes directory
    const scenesDir = `${projectPath}/scenes`;
    if (!(await exists(scenesDir))) {
      await mkdir(scenesDir);
    }

    // Create initial project file
    const projectFile = {
      name: projectName,
      version: "0.1.0",
      entry: "./src/main.ts",
      scenes: ["./scenes/main.json"],
    };

    await Bun.write(`${projectPath}/project.json`, JSON.stringify(projectFile, null, 2));

    // Create initial scene file
    const initialScene = {
      name: "MainScene",
      actors: [],
    };

    await Bun.write(`${scenesDir}/main.json`, JSON.stringify(initialScene, null, 2));

    console.log(`✅ Project created: ${projectName}`);
  }

  /**
   * Load LokiDB database
   */
  private loadDatabase(path: string): Promise<Loki> {
    return new Promise((resolve, reject) => {
      const db = new Loki(path, {
        autoload: true,
        autoloadCallback: (err) => {
          if (err) {
            console.error("Failed to load database:", err);
            reject(err);
            return;
          }

          // Initialize collections if they don't exist
          if (!db.getCollection("project")) {
            db.addCollection("project");
          }
          if (!db.getCollection("window_layouts")) {
            db.addCollection("window_layouts");
          }
          if (!db.getCollection("resources")) {
            db.addCollection("resources");
          }

          resolve(db);
        },
        autosave: true,
        autosaveInterval: 4000,
      });
    });
  }

  /**
   * Close the current project
   */
  async closeProject(): Promise<void> {
    if (!this.context) return;

    // Stop all processors
    for (const processor of this.context.processors) {
      processor.stop();
    }

    // Close database
    if (this.db) {
      await new Promise<void>((resolve) => {
        this.db!.close(() => resolve());
      });
    }

    this.context = undefined;
    this.db = undefined;
    this.projectPath = undefined;

    console.log("📁 Project closed");
  }

  /**
   * Get the current editor context
   */
  getContext(): Context | undefined {
    return this.context;
  }

  /**
   * Get the current project path
   */
  getProjectPath(): string | undefined {
    return this.projectPath;
  }
}
